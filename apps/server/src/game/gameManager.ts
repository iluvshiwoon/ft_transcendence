// Ce fichier gère toutes les parties actives en memoire coté serveur. C'est le "cerveau" central qui orchestre la logique temps-réel du jeu
// - createGame : appele apres POST /lobbies/:id/start ou POST /games/ai
// - applyMove  : valide + applique + persiste le coup en DB + verifie fin de partie
// - surrender / onDisconnect / onReconnect : flux d'abandon et de grace 60 s
// - Timer 1 s decrement le timer du joueur actif et declenche une defaite a 0.

import type { Server } from "socket.io";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { games, moves, users } from "../db/schema.js";
import { GameState } from "./gameState.js";
import { getBestMove } from "./ai.js";
import { eloDelta, phantomRatingForDifficulty, type AiDifficulty, type GameOutcome } from "./elo.js";

interface CreateOpts
{
  gameId: number;
  player1Id: number;
  player2Id: number | null;     // null si IA
  timePerPlayerSeconds: number;
  isAi: boolean;
}

interface ActiveGame
{
  state: GameState;
  io: Server;
  timerHandle: NodeJS.Timeout | null;
  disconnectTimers: Map<number, NodeJS.Timeout>;   // userId -> handle 60 s
  isAi: boolean;
}

class GameManager
{
  private games = new Map<number, ActiveGame>();
  private io: Server | null = null;

  setIO(io: Server)
  {
    this.io = io;
  }

  get(gameId: number): ActiveGame | undefined
  {
    return this.games.get(gameId);
  }

  createGame(opts: CreateOpts): ActiveGame
  {
    if (!this.io)
      throw new Error("gameManager: setIO must be called before createGame");

    const state = new GameState(
      { 1: opts.player1Id, 2: opts.player2Id },
      opts.timePerPlayerSeconds
    );

    const active: ActiveGame = {
      state,
      io: this.io,
      timerHandle: null,
      disconnectTimers: new Map(),
      isAi: opts.isAi,
    };
    this.games.set(opts.gameId, active);

    this.startTimer(opts.gameId);
    return active;
  }

  // Applique un coup, persiste, broadcast, retourne l'etat resultant.
  async applyMove(gameId: number, userId: number | null, col: number): Promise<{ ok: boolean; error?: string }>
  {
    const g = this.games.get(gameId);
    if (!g)
      return { ok: false, error: "game not found" };
    if (g.state.status !== "in_progress")
      return { ok: false, error: "game not active" };

    // Determine le slot. Pour l'IA on accepte userId=null sur le slot 2.
    let slot: 1 | 2 | null;
    if (userId === null) {
      slot = 2;
    } else {
      slot = g.state.slotForUser(userId);
      if (slot === null)
        return { ok: false, error: "not a player" };
    }
    if (slot !== g.state.currentPlayer)
      return { ok: false, error: "not your turn" };

    const result = g.state.makeMove(col);
    if (!result.ok)
      return { ok: false, error: "invalid move" };

    await db.insert(moves).values({
      gameId,
      playerId: userId,
      column: col,
      row: result.row!,
      moveNumber: result.moveNumber!,
    });

    this.broadcastState(gameId);

    if (g.state.status !== "in_progress") {
      await this.finishGame(gameId);
    } else if (g.isAi && g.state.currentPlayer === 2) {
      // Tour de l'IA : coup apres un delai aleatoire 500-2000 ms.
      const delay = 500 + Math.floor(Math.random() * 1500);
      setTimeout(() => this.playAiMove(gameId), delay);
    }

    return { ok: true };
  }

  async surrender(gameId: number, userId: number): Promise<void>
  {
    const g = this.games.get(gameId);
    if (!g) return;
    const slot = g.state.slotForUser(userId);
    if (slot === null) return;
    g.state.surrender(slot);
    this.broadcastState(gameId);
    await this.finishGame(gameId);
  }

  // Un user a perdu sa socket. On lance un timer 60 s avant de declarer abandon.
  onDisconnect(userId: number)
  {
    for (const [gameId, g] of this.games) {
      if (g.state.slotForUser(userId) === null) continue;
      if (g.state.status !== "in_progress") continue;
      if (g.disconnectTimers.has(userId)) continue;

      const t = setTimeout(async () => {
        // Toujours en cours apres 60 s ? -> abandon.
        const slot = g.state.slotForUser(userId);
        if (slot !== null && g.state.status === "in_progress") {
          g.state.surrender(slot);
          this.broadcastState(gameId);
          await this.finishGame(gameId);
        }
      }, 60_000);
      g.disconnectTimers.set(userId, t);
    }
  }

  // L'user revient : annule le timer + renvoie le state.
  onReconnect(userId: number): number[]
  {
    const restored: number[] = [];
    for (const [gameId, g] of this.games) {
      const t = g.disconnectTimers.get(userId);
      if (t) {
        clearTimeout(t);
        g.disconnectTimers.delete(userId);
      }
      if (g.state.slotForUser(userId) !== null) restored.push(gameId);
    }
    return restored;
  }

  // ----- internes -----

  private async playAiMove(gameId: number): Promise<void>
  {
    const g = this.games.get(gameId);
    if (!g) return;
    if (g.state.status !== "in_progress") return;
    if (g.state.currentPlayer !== 2) return;
    const col = getBestMove(g.state.board, 2);
    await this.applyMove(gameId, null, col);
  }

  private async applyEloForPlayer(
    myId: number,
    oppId: number | null,
    aiDifficulty: AiDifficulty | null,
    score: GameOutcome,
  ): Promise<void> {
    if (myId === null) return;
    const myRow = (await db.select({ rating: users.rating })
      .from(users)
      .where(eq(users.id, myId)))[0];
    if (!myRow) return;
    const myRating = myRow.rating;

    let oppRating: number;
    if (oppId === null) {
      if (aiDifficulty === null) return;
      oppRating = phantomRatingForDifficulty(aiDifficulty);
    } else {
      const oppRow = (await db.select({ rating: users.rating })
        .from(users)
        .where(eq(users.id, oppId)))[0];
      if (!oppRow) return;
      oppRating = oppRow.rating;
    }

    const delta = eloDelta(myRating, oppRating, score);
    const newRating = myRating + delta;

    await db.update(users)
      .set({
        rating: sql`${users.rating} + ${delta}`,
        peakRating: sql`GREATEST(${users.peakRating}, ${newRating})`,
      })
      .where(eq(users.id, myId));
  }

  private broadcastState(gameId: number): void
  {
    const g = this.games.get(gameId);
    if (!g) return;
    g.io.to(`game:${gameId}`).emit("game:state", { gameId, state: g.state.getState() });
  }

  private startTimer(gameId: number): void
  {
    const g = this.games.get(gameId);
    if (!g) return;
    if (g.timerHandle) return;
    g.timerHandle = setInterval(async () => {
      if (g.state.status !== "in_progress") return;
      if (g.state.currentPlayer === 1) g.state.timerP1--;
      else g.state.timerP2--;

      g.io.to(`game:${gameId}`).emit("game:timer", {
        gameId,
        timerP1: g.state.timerP1,
        timerP2: g.state.timerP2,
      });

      if (g.state.timerP1 <= 0 || g.state.timerP2 <= 0) {
        const loserSlot: 1 | 2 = g.state.timerP1 <= 0 ? 1 : 2;
        g.state.surrender(loserSlot);
        this.broadcastState(gameId);
        await this.finishGame(gameId);
      }
    }, 1000);
  }

  private async finishGame(gameId: number): Promise<void>
  {
    const g = this.games.get(gameId);
    if (!g)
      return;

    if (g.timerHandle)
      { clearInterval(g.timerHandle); g.timerHandle = null; }
    for (const t of g.disconnectTimers.values()) clearTimeout(t);
    g.disconnectTimers.clear();

    const s = g.state;
    const winnerUserId =
      s.winner === 1 ? s.players[1] :
      s.winner === 2 ? s.players[2] :
      null;

    const p1 = s.players[1];
    const p2 = s.players[2];
    const incPlayed = { gamesPlayed: sql`${users.gamesPlayed} + 1` };

    // mise en place de la tâche B10 : le passage status=finished et l'incrément des compteurs de stats
    // doivent etre atomiques. On les regroupe dans une seule transaction pour
    // qu'on ne puisse jamais avoir une partie finie sans stats a jour (ou l'inverse).
    await db.transaction(async (tx) => {
      await tx.update(games)
        .set({
          status: s.status === "abandoned" ? "abandoned" : "finished",
          winnerId: winnerUserId,
          finishedAt: new Date(),
        })
        .where(eq(games.id, gameId));

      // Stats utilisateurs : on incremente games_played pour les 2, won/lost selon le resultat.
      if (s.winner === null) {
        // Nul (impossible en abandon mais possible en draw).
        const incDraw = { ...incPlayed, gamesDrawn: sql`${users.gamesDrawn} + 1` };
        await tx.update(users).set(incDraw as any).where(eq(users.id, p1));
        if (p2 !== null) await tx.update(users).set(incDraw as any).where(eq(users.id, p2));
      } else {
        const winId = winnerUserId;
        const loserSlot: 1 | 2 = s.winner === 1 ? 2 : 1;
        const loserId = s.players[loserSlot];

        if (winId !== null) {
          await tx.update(users)
            .set({ ...incPlayed, gamesWon: sql`${users.gamesWon} + 1` } as any)
            .where(eq(users.id, winId));
        }
        if (loserId !== null) {
          await tx.update(users)
            .set({ ...incPlayed, gamesLost: sql`${users.gamesLost} + 1` } as any)
            .where(eq(users.id, loserId));
        }
      }
    });

    // Elo : on relit l'eventuel ai_difficulty de la game, puis pour chaque
    // joueur on calcule le delta et on met a jour rating + peak_rating. En
    // cas d'IA, l'"adversaire" est un rating fantome (easy=800, medium=1200,
    // hard=1800) et l'IA n'a pas de row a mettre a jour.
    const gameRow = (await db.select({ aiDifficulty: games.aiDifficulty })
      .from(games)
      .where(eq(games.id, gameId)))[0];
    const aiDifficulty: AiDifficulty | null = gameRow?.aiDifficulty ?? null;

    const p1Score: GameOutcome = s.winner === 1 ? 1 : s.winner === 2 ? 0 : 0.5;
    const p2Score: GameOutcome = s.winner === 2 ? 1 : s.winner === 1 ? 0 : 0.5;

    await this.applyEloForPlayer(p1, p2, aiDifficulty, p1Score);
    if (p2 !== null) {
      await this.applyEloForPlayer(p2, p1, aiDifficulty, p2Score);
    }

    g.io.to(`game:${gameId}`).emit("game:over", {
      gameId,
      winner: s.winner,
      winnerUserId,
      status: s.status,
    });

    this.games.delete(gameId);
  }
}

export const gameManager = new GameManager();

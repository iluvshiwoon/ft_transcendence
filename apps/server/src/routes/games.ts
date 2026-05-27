// Routes games (REST).
//
// POST /api/games/ai  -> cree une partie contre l'IA (pas de lobby requis)
// GET  /api/games/:id -> recupere l'etat d'une partie (pour reload depuis le front)

import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { games } from "../db/schema.js";
import { requireAuth } from "../auth/middleware.js";
import { gameManager } from "../game/gameManager.js";

interface AiBody
{
  difficulty?: "easy" | "medium" | "hard";
  timePerPlayerSeconds?: number;
}

export async function gameRoutes(app: FastifyInstance)
{
  // POST /api/games/ai
  app.post<{ Body: AiBody }>(
    "/games/ai",
    { preHandler: requireAuth },
    async (request, reply) => {
      const userId = request.userId!;
      const { difficulty = "medium", timePerPlayerSeconds = 300 } = request.body ?? {};

      const validTimes = [300, 600, 3600];
      if (!validTimes.includes(timePerPlayerSeconds))
        return reply.status(400).send({ error: "timePerPlayerSeconds doit etre 300, 600 ou 3600" });

      const [game] = await db.insert(games).values({
        player1Id: userId,
        player2Id: null,
        isAiOpponent: true,
        aiDifficulty: difficulty,
        timePerPlayerSeconds,
        status: "in_progress",
        startedAt: new Date(),
      }).returning();

      gameManager.createGame({
        gameId: game.id,
        player1Id: userId,
        player2Id: null,
        timePerPlayerSeconds,
        isAi: true,
      });

      return reply.status(201).send({ gameId: game.id });
    }
  );

  // GET /api/games/:id
  app.get<{ Params: { id: string } }>(
    "/games/:id",
    { preHandler: requireAuth },
    async (request, reply) => {
      const gameId = parseInt(request.params.id);
      const userId = request.userId!;

      const [game] = await db.select().from(games).where(eq(games.id, gameId));
      if (!game) return reply.status(404).send({ error: "Partie introuvable" });
      if (game.player1Id !== userId && game.player2Id !== userId)
        return reply.status(403).send({ error: "Vous n'etes pas dans cette partie" });

      // Si la partie est encore en memoire, renvoyer l'etat live.
      const active = gameManager.get(gameId);
      if (active) return reply.send({ game, state: active.state.getState() });

      return reply.send({ game, state: null });
    }
  );
}

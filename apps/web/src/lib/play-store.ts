/**
 * Shared game-state store for the landing page.
 *
 * Two React islands subscribe to this store:
 *   - <Board>          renders cells + handles column clicks
 *   - <AITelemetry>    renders depth/nodes/eval-time + per-column scores
 *
 * Single source of truth, no prop drilling. Subscribe via `useSyncExternalStore`
 * inside components.
 *
 * Server-authoritative: the store never mutates the board on the client. It
 * only mirrors the snapshot the server returned. The only inputs are
 * column-index clicks, which round-trip through `/api/play/move`.
 */

import {
  startGame,
  makeMove,
  getState,
  type PublicGameView,
  type AiTelemetry,
  PlayApiError,
} from "./play-api";

type Listener = () => void;

/**
 * Apply the player's move to the local view immediately for optimistic UI.
 * Returns null when the move is locally invalid (column full, game over,
 * not your turn) so we can skip the round-trip.
 *
 * The dropped piece is placed at the lowest empty row of the chosen column,
 * mirroring the server's gravity logic. Server response is still
 * authoritative — when it arrives we replace this view with the real one.
 */
function applyPlayerMoveLocally(view: PublicGameView, col: number): PublicGameView | null {
  if (col < 0 || col > 6) return null;
  if (view.status !== "in_progress") return null;
  if (view.currentPlayer !== 1) return null;

  let row = -1;
  for (let r = view.board.length - 1; r >= 0; r--) {
    if (view.board[r][col] === 0) {
      row = r;
      break;
    }
  }
  if (row === -1) return null; // column full

  const newBoard = view.board.map((r) => [...r]);
  newBoard[row][col] = 1;

  return {
    ...view,
    board: newBoard,
    currentPlayer: 2, // AI's turn after player drops
  };
}

export interface PlayStoreState {
  /** Latest server snapshot, or null before the first /start round-trip. */
  view: PublicGameView | null;
  /** Latest AI telemetry from the most recent move. Persists across the
   *  player's optimistic update so the matrix stays anchored to the
   *  previous AI evaluation until a new one arrives. */
  telemetry: AiTelemetry | null;
  /** Last AI move (col + row). Persists across the player's optimistic
   *  update for the same reason as telemetry. */
  lastAiMove: { col: number; row: number } | null;
  /** Board state at the time of the last AI response. Used by the matrix
   *  to compute landing rows so they don't shift when the player drops
   *  a piece (which would otherwise change snap.view's landing rows). */
  telemetryBoard: number[][] | null;
  /** Last known AI bestScore — used by the position slider. Unlike
   *  `telemetry`, this is NOT cleared on the player's optimistic update,
   *  so the slider keeps showing the previous evaluation until the new
   *  AI response arrives instead of snapping back to center. */
  positionScore: number | null;
  /** True between sending /move and receiving the response. */
  thinking: boolean;
  /** True after the user has dropped their first piece (drives "Pick a column" prompt). */
  hasPlayed: boolean;
  /** Set when the current game finishes. null while the game is in progress. */
  gameEndState: "won" | "lost" | "draw" | null;
  /** Computed user score for the just-finished game (null while in progress). */
  gameScore: number | null;
  /** Maximum AI search depth seen across all AI moves this game.
   *  Used in the score formula. */
  maxAiDepth: number;
  /** End-game UI phase. Advances on a timer after gameEndState is set:
   *  - 'idle'   : game in progress (or just finished, animations still running)
   *  - 'glow'   : winning line glow visible, no overlay yet
   *  - 'status' : brief 'You win' / 'You lose' / 'Draw' text overlay
   *  - 'card'   : board blurs, signup-prompt card visible */
  endGamePhase: "idle" | "glow" | "status" | "card";
  /** Last error from the API, or null. */
  error: PlayApiError | null;
}

const initialState: PlayStoreState = {
  view: null,
  telemetry: null,
  lastAiMove: null,
  telemetryBoard: null,
  positionScore: null,
  thinking: false,
  hasPlayed: false,
  gameEndState: null,
  gameScore: null,
  maxAiDepth: 0,
  endGamePhase: "idle",
  error: null,
};

/**
 * Compute the user's score for a finished game.
 * Formula: 1000 + maxAiDepth*50 - moveCount*20 + outcomeBonus
 * - maxAiDepth: how deep the AI searched (harder AI -> bigger bonus)
 * - moveCount: total pieces on the board (faster wins -> higher score)
 * - outcomeBonus: 500 for win, 100 for draw, 0 for loss
 */
function computeScore(
  view: PublicGameView,
  maxAiDepth: number,
  outcome: "won" | "lost" | "draw",
): number {
  let moveCount = 0;
  for (const row of view.board) for (const cell of row) if (cell !== 0) moveCount++;
  const outcomeBonus = outcome === "won" ? 500 : outcome === "draw" ? 100 : 0;
  return Math.max(0, 1000 + maxAiDepth * 50 - moveCount * 20 + outcomeBonus);
}

/** Map server's view.status + winner to our local gameEndState. */
function deriveEndState(view: PublicGameView): "won" | "lost" | "draw" | null {
  if (view.status !== "finished") return null;
  if (view.winner === 1) return "won";
  if (view.winner === 2) return "lost";
  return "draw";
}

class PlayStore {
  private state: PlayStoreState = initialState;
  private listeners = new Set<Listener>();
  private startPromise: Promise<void> | null = null;
  /** Timers scheduled by scheduleEndGamePhases — cleared on game restart
   *  to avoid stale phase advancements firing on the next game. */
  private endGameTimers: ReturnType<typeof setTimeout>[] = [];

  /** Schedule the post-game phase advancement: glow → card.
   *  Called once per game-end event. Timings:
   *    t=0      : 'glow'   (winning line glowing in CSS; this just records the phase)
   *    t=1100ms : 'card'   (board blurs, signup card slides in) */
  private scheduleEndGamePhases() {
    this.clearEndGameTimers();
    this.set({ endGamePhase: "glow" });
    this.endGameTimers.push(
      setTimeout(() => this.set({ endGamePhase: "card" }), 1100),
    );
  }
  private clearEndGameTimers() {
    for (const t of this.endGameTimers) clearTimeout(t);
    this.endGameTimers = [];
  }

  getSnapshot = (): PlayStoreState => this.state;

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  private set(patch: Partial<PlayStoreState>) {
    this.state = { ...this.state, ...patch };
    for (const fn of this.listeners) fn();
  }

  /** Idempotent — only triggers one /start request even if called multiple times. */
  ensureStarted = async (): Promise<void> => {
    if (this.state.view) return;
    if (this.startPromise) return this.startPromise;
    this.startPromise = (async () => {
      try {
        const { state } = await startGame();
        this.set({ view: state, telemetry: null, error: null });
      } catch (e) {
        if (e instanceof PlayApiError) this.set({ error: e });
      } finally {
        this.startPromise = null;
      }
    })();
    return this.startPromise;
  };

  /**
   * Force a fresh game. Used by the end-game card's "Play again" button.
   * Clears all per-game state (telemetry, last AI move, position score,
   * end-game data) and calls /start. Subsequent clicks resume normal play.
   *
   * Resets the local view to an empty board SYNCHRONOUSLY (in the same
   * set() call that clears endGamePhase). Without this, the card unmounts
   * but the board behind it still shows the last game's state until the
   * server's /start response arrives, producing a brief flash of stale
   * pieces.
   */
  restart = async (): Promise<void> => {
    this.clearEndGameTimers();
    const prev = this.state.view;
    const emptyBoard: number[][] = Array.from({ length: 6 }, () => Array(7).fill(0));
    this.set({
      view: prev
        ? {
            ...prev,
            board: emptyBoard,
            currentPlayer: 1,
            status: "in_progress",
            winner: null,
            isDraw: false,
            winningLine: null,
          }
        : null,
      telemetry: null,
      lastAiMove: null,
      telemetryBoard: null,
      positionScore: null,
      gameEndState: null,
      gameScore: null,
      maxAiDepth: 0,
      endGamePhase: "idle",
      hasPlayed: false,
      error: null,
    });
    try {
      const { state } = await startGame();
      this.set({ view: state });
    } catch (e) {
      if (e instanceof PlayApiError) this.set({ error: e });
    }
  };

  /**
   * User clicked a column. Returns silently if:
   *   - AI is thinking (debounce double-click)
   *   - column is invalid (server will reject anyway, but skip the round-trip)
   * Auto-restarts a finished game.
   */
  play = async (col: number): Promise<void> => {
    if (this.state.thinking) return;
    if (col < 0 || col > 6) return;

    // Game over → ignore the click. The user has to use the Play again
    // button on the end-game card to start a new round; auto-restart on
    // any board click was confusing because the click also dropped a
    // piece into the new game before the user realized what happened.
    if (this.state.view && this.state.view.status !== "in_progress") {
      return;
    }

    if (!this.state.view) {
      // No session yet — start one first, then play.
      await this.ensureStarted();
      if (!this.state.view) return;
    }

    // Optimistic update: apply the player's piece locally so the yellow
    // pawn renders + animates IMMEDIATELY on click. The /move request
    // fires in parallel; while it's in flight (~200-500ms for AI compute)
    // the player's drop animation is already running, making the AI's
    // computation overlap with visible motion. Server response then adds
    // the AI's piece on top.
    const optimistic = applyPlayerMoveLocally(this.state.view, col);
    if (!optimistic) {
      // Column full or other client-detectable invalidity — skip the
      // round-trip entirely.
      return;
    }

    this.set({
      view: optimistic,
      // Don't clear telemetry / lastAiMove / telemetryBoard / positionScore
      // here — they're pinned to the AI's last response so the matrix and
      // slider keep showing it until the new AI response arrives. The
      // matrix's landing rows are computed from telemetryBoard, not
      // snap.view, so the player's optimistic piece doesn't shift them.
      thinking: true,
      error: null,
      hasPlayed: true,
    });

    // Run the request and the minimum animation delay in parallel. We
    // don't apply the AI's piece until both promises resolve, so even if
    // the AI computes very fast (obvious move = ~50ms) the red piece
    // still waits for the yellow piece's drop to finish before appearing.
    // PIECE_ANIM_MS must match the .piece-drop animation duration in
    // globals.css.
    const PIECE_ANIM_MS = 450;
    const animationFinished = new Promise<void>((resolve) =>
      setTimeout(resolve, PIECE_ANIM_MS),
    );

    try {
      const [res] = await Promise.all([makeMove(col), animationFinished]);
      const newMaxDepth = res.aiMove
        ? Math.max(this.state.maxAiDepth, res.aiMove.telemetry.depth)
        : this.state.maxAiDepth;
      const endState = deriveEndState(res.state);
      const score = endState
        ? computeScore(res.state, newMaxDepth, endState)
        : null;
      this.set({
        view: res.state,
        telemetry: res.aiMove?.telemetry ?? null,
        lastAiMove: res.aiMove ? { col: res.aiMove.col, row: res.aiMove.row } : null,
        telemetryBoard: res.aiMove ? res.state.board : this.state.telemetryBoard,
        positionScore: res.aiMove?.telemetry.bestScore ?? this.state.positionScore,
        maxAiDepth: newMaxDepth,
        gameEndState: endState,
        gameScore: score,
        // thinking stays true while red drops — prevents clicks during
        // the AI's piece animation. Cleared after another PIECE_ANIM_MS.
      });
      // If the AI actually played (game still in progress), wait for
      // the red piece's drop animation to finish before unlocking input.
      if (res.aiMove) {
        await new Promise<void>((resolve) => setTimeout(resolve, PIECE_ANIM_MS));
      }
      this.set({ thinking: false });
      // Game just ended (either the player or the AI made the deciding
      // move) — schedule the post-game UI phases.
      if (this.state.gameEndState) {
        this.scheduleEndGamePhases();
      }
    } catch (e) {
      this.set({ thinking: false });
      if (e instanceof PlayApiError) {
        this.set({ error: e });
        // Revert the optimistic update by re-fetching the authoritative
        // server state. If that also fails, fall back to a fresh /start
        // so the next click still works.
        if (e.code === "GAME_OVER" || e.code === "NO_SESSION") {
          this.startPromise = null;
          this.set({ view: null });
          await this.ensureStarted();
        } else {
          try {
            const { state } = await getState();
            this.set({ view: state });
          } catch {
            this.startPromise = null;
            this.set({ view: null });
            await this.ensureStarted();
          }
        }
      }
    }
  };
}

export const playStore = new PlayStore();

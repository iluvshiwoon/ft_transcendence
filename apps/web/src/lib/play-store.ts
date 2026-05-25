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
  /** Latest AI telemetry from the most recent move. */
  telemetry: AiTelemetry | null;
  /** Last AI move (col + row). null before the AI has played any move. */
  lastAiMove: { col: number; row: number } | null;
  /** True between sending /move and receiving the response. */
  thinking: boolean;
  /** True after the user has dropped their first piece (drives "Pick a column" prompt). */
  hasPlayed: boolean;
  /** Last error from the API, or null. */
  error: PlayApiError | null;
}

const initialState: PlayStoreState = {
  view: null,
  telemetry: null,
  lastAiMove: null,
  thinking: false,
  hasPlayed: false,
  error: null,
};

class PlayStore {
  private state: PlayStoreState = initialState;
  private listeners = new Set<Listener>();
  private startPromise: Promise<void> | null = null;

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
   * User clicked a column. Returns silently if:
   *   - AI is thinking (debounce double-click)
   *   - column is invalid (server will reject anyway, but skip the round-trip)
   * Auto-restarts a finished game.
   */
  play = async (col: number): Promise<void> => {
    if (this.state.thinking) return;
    if (col < 0 || col > 6) return;

    // Game over → restart, then apply this click on the fresh game.
    if (this.state.view && this.state.view.status !== "in_progress") {
      this.set({ telemetry: null, lastAiMove: null, hasPlayed: false });
      try {
        const { state } = await startGame();
        this.set({ view: state });
      } catch (e) {
        if (e instanceof PlayApiError) this.set({ error: e });
        return;
      }
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
      // Clear telemetry + lastAiMove so the matrix empties out during AI
      // compute. Without this, the matrix stays anchored to the previous
      // AI move (now stale) and re-renders twice per turn — once from the
      // player's optimistic update, again when the new AI move arrives.
      telemetry: null,
      lastAiMove: null,
      thinking: true,
      error: null,
      hasPlayed: true,
    });

    try {
      const res = await makeMove(col);
      this.set({
        view: res.state,
        telemetry: res.aiMove?.telemetry ?? null,
        lastAiMove: res.aiMove ? { col: res.aiMove.col, row: res.aiMove.row } : null,
        thinking: false,
      });
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

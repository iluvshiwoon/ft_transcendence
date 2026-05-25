// AI Connect 4 — minimax with alpha-beta pruning + position scoring.
//
// Telemetry: capture depth, nodes-evaluated, eval-time, and per-column scores
// so the landing-page AITelemetry component can render real numbers instead
// of placeholder values.
//
// "Challenging but beatable" calibration:
//   - Depth 5 lookahead (~3-ply for player + 2-ply for AI) — strong enough
//     to set up traps and avoid obvious losses, weak enough that a thoughtful
//     human can outmaneuver it on the open board.
//   - Slight randomness: when multiple columns score within MARGIN_EPS of
//     the best, pick one at random. Avoids deterministic play that gets
//     boring / memorized after a couple of games.

import { Board, dropToken, getValidMoves } from "./board.js";
import { checkWin, isDraw } from "./check_board.js";

// Default search depth — tuned for "challenging but beatable" + ~50-150ms
// per move on commodity hardware (well within an attention-friendly UX
// budget). Override via getBestMove options for testing.
const DEFAULT_DEPTH = 5;

// Tie-break randomness: any move whose score is within this many points of
// the best gets bundled into the random pool. Keeps games interesting
// without changing strategic strength noticeably.
const MARGIN_EPS = 6;

// Move-ordering hint — center-out exploration prunes more branches early
// since strong play tends to cluster around the center column.
const MOVE_ORDER = [3, 2, 4, 1, 5, 0, 6];

export interface MoveTelemetry {
  /** Search depth used. */
  depth: number;
  /** Total board positions evaluated (leaves of the search tree). */
  nodesEvaluated: number;
  /** Nodes per second — derived metric for the dashboard. */
  nodesPerSecond: number;
  /** Wall-clock time spent computing the move, in milliseconds. */
  evalTimeMs: number;
  /** Score of the chosen move. Higher = better for AI. */
  bestScore: number;
  /** Per-column root scores (Infinity-bounded values mapped to numbers).
   *  Indexed 0..6, undefined if the column was full or unreachable. */
  columnScores: Array<number | null>;
}

export interface MoveResult {
  /** Chosen column 0..6. */
  col: number;
  telemetry: MoveTelemetry;
}

// Internal: window scoring for the heuristic eval. Same shape as Tim's
// version, just clamped to small magnitude so it doesn't dominate over
// terminal outcomes.
function scoreWindow(window: number[], aiPlayer: 1 | 2): number {
  const opponent = aiPlayer === 1 ? 2 : 1;
  let nbIA = 0;
  let nbAdv = 0;
  let nbVide = 0;

  for (const cell of window) {
    if (cell === aiPlayer) nbIA++;
    else if (cell === opponent) nbAdv++;
    else nbVide++;
  }

  // 4-in-a-row is handled at the terminal-check level; here we score
  // partial windows.
  if (nbIA === 3 && nbVide === 1) return 5;
  if (nbIA === 2 && nbVide === 2) return 2;
  if (nbAdv === 3 && nbVide === 1) return -4; // Block-or-lose threats
  if (nbAdv === 2 && nbVide === 2) return -1;
  return 0;
}

function scoreBoard(board: Board, aiPlayer: 1 | 2): number {
  const rows = board.length;
  const cols = board[0].length;
  let score = 0;

  // Center-column control bonus.
  const colCentre = Math.floor(cols / 2);
  for (let r = 0; r < rows; r++) {
    if (board[r][colCentre] === aiPlayer) score += 3;
  }

  // Horizontal windows.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols - 4; c++) {
      score += scoreWindow(
        [board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]],
        aiPlayer,
      );
    }
  }
  // Vertical windows.
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r <= rows - 4; r++) {
      score += scoreWindow(
        [board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]],
        aiPlayer,
      );
    }
  }
  // Diagonal ↘
  for (let r = 0; r <= rows - 4; r++) {
    for (let c = 0; c <= cols - 4; c++) {
      score += scoreWindow(
        [board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]],
        aiPlayer,
      );
    }
  }
  // Diagonal ↙
  for (let r = 0; r <= rows - 4; r++) {
    for (let c = 3; c < cols; c++) {
      score += scoreWindow(
        [board[r][c], board[r + 1][c - 1], board[r + 2][c - 2], board[r + 3][c - 3]],
        aiPlayer,
      );
    }
  }
  return score;
}

// Alpha-beta minimax. `nodes` accumulator is mutated for telemetry.
function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isAI: boolean,
  aiPlayer: 1 | 2,
  nodes: { count: number },
): number {
  nodes.count++;
  const opponent: 1 | 2 = aiPlayer === 1 ? 2 : 1;
  const winner = checkWin(board);

  // Terminal states: prefer faster wins / slower losses by adding depth.
  if (winner === aiPlayer) return 1_000_000 + depth;
  if (winner === opponent) return -(1_000_000 + depth);
  if (isDraw(board) || depth === 0) return scoreBoard(board, aiPlayer);

  const validMoves = getValidMoves(board);
  // Move ordering — explore center first to maximize alpha-beta cutoffs.
  const ordered = MOVE_ORDER.filter((c) => validMoves.includes(c));

  if (isAI) {
    let value = -Infinity;
    for (const col of ordered) {
      const next = dropToken(board, col, aiPlayer);
      if (next === null) continue;
      const score = minimax(next, depth - 1, alpha, beta, false, aiPlayer, nodes);
      if (score > value) value = score;
      if (value > alpha) alpha = value;
      if (alpha >= beta) break; // β-cutoff
    }
    return value;
  } else {
    let value = Infinity;
    for (const col of ordered) {
      const next = dropToken(board, col, opponent);
      if (next === null) continue;
      const score = minimax(next, depth - 1, alpha, beta, true, aiPlayer, nodes);
      if (score < value) value = score;
      if (value < beta) beta = value;
      if (alpha >= beta) break; // α-cutoff
    }
    return value;
  }
}

/**
 * Compute the AI's next move with full telemetry.
 *
 * @param board Current board state.
 * @param aiPlayer Which player the AI is (1 or 2). Defaults to 2.
 * @param depth Search depth in plies. Defaults to {@link DEFAULT_DEPTH}.
 */
export function findBestMove(
  board: Board,
  aiPlayer: 1 | 2 = 2,
  depth: number = DEFAULT_DEPTH,
): MoveResult {
  const t0 = performance.now();
  const validMoves = getValidMoves(board);
  if (validMoves.length === 0) {
    throw new Error("findBestMove called on a full board");
  }

  const nodes = { count: 0 };
  const columnScores: Array<number | null> = Array(7).fill(null);
  const orderedCandidates = MOVE_ORDER.filter((c) => validMoves.includes(c));

  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  // Root-level evaluation — recorded per column for telemetry.
  for (const col of orderedCandidates) {
    const next = dropToken(board, col, aiPlayer);
    if (next === null) continue;
    const score = minimax(next, depth - 1, alpha, beta, false, aiPlayer, nodes);
    columnScores[col] = score;
    if (score > bestScore) bestScore = score;
    if (score > alpha) alpha = score;
  }

  // Tie-break with slight randomness: pick at random among moves whose
  // score is within MARGIN_EPS of the best. Adds variety without
  // weakening strategy noticeably.
  //
  // Caveat for terminal scores (≥ 1_000_000 means "guaranteed win"):
  // skip the margin entirely — we always want the fastest win, otherwise
  // multiple winning lines collapse into a single equivalence class and
  // the AI could pick a slow win when an immediate one is available.
  const isWinningPosition = bestScore >= 1_000_000;
  const margin = isWinningPosition ? 0 : MARGIN_EPS;
  const candidates = orderedCandidates.filter((c) => {
    const s = columnScores[c];
    return s !== null && s >= bestScore - margin;
  });
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];

  const evalTimeMs = performance.now() - t0;
  return {
    col: chosen,
    telemetry: {
      depth,
      nodesEvaluated: nodes.count,
      nodesPerSecond: evalTimeMs > 0 ? Math.round((nodes.count / evalTimeMs) * 1000) : 0,
      evalTimeMs: Math.round(evalTimeMs * 100) / 100,
      bestScore,
      columnScores,
    },
  };
}

/**
 * Backward-compatible wrapper — keeps Tim's existing tests green.
 * Returns just the chosen column.
 */
export function getBestMove(board: Board, aiPlayer: 1 | 2 = 2): number {
  return findBestMove(board, aiPlayer).col;
}

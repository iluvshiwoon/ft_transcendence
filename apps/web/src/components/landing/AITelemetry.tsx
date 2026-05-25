/**
 * AITelemetry — ambient left-column panel showing the AI's "thinking".
 *
 * Renders the static set of widgets from the wireframe:
 *   - 7×6 thinking matrix:
 *       · for each column, the AI's score is rendered as a "ghost piece" at
 *         the column's landing position (the lowest empty cell — exactly
 *         where the next piece would gravity-drop). Best move = darkest.
 *         Non-candidates fade to the base color and disappear into the grid.
 *       · all 42 dots run a continuous left-to-right wave (matrix-pulse) with
 *         200 ms column stagger
 *       · the best-move cell additionally emits a sonar-ping every 5s,
 *         radiating a ring outward like the AI re-asserting its answer
 *   - Evaluation bar (1/3 filled)
 *   - Stats list (Depth / Nodes/sec / Eval Time)
 *   - Value slider (numeric label + horizontal bar + dashed continuation)
 *
 * Once wired to the AI:
 *   - In idle state, both animation layers run as today.
 *   - In `AI THINKING…` state, we'd amp pulse intensity to read as active search.
 *   - On move commit, a one-shot drop animation could play down the chosen
 *     column.
 *
 * TODO(integration): replace placeholders with live telemetry from the AI worker.
 *   - matrix.columnLandingRows: derived from current Board state (lowest empty row per col)
 *   - matrix.columnScores: bind to AI's per-column minimax score (0..1 normalized)
 *   - eval bar: bind `evalRatio` (0..1) to the current minimax score normalized
 *   - stats: bind { depth, nodesPerSec, evalTimeMs } from worker postMessage
 *   - value slider: bind `currentEval` (centipawn-style score) + history dashed line
 *   Hook point: GameDemo island will pass these as props on every search update.
 */

import { useSyncExternalStore } from "react";

import { cn } from "~/lib/utils";
import { playStore } from "~/lib/play-store";
import type { AiTelemetry, PublicGameView } from "~/lib/play-api";

interface AITelemetryProps {
  /**
   * Per-column AI evaluation, length 7, values in [0..1]:
   *   0 = not a candidate (already full / losing line) — fades to base color
   *   1 = best move (darkest)
   * Rendered at each column's landing cell.
   */
  columnScores?: number[];
  /**
   * Per-column landing row index (0=top, 5=bottom). The lowest empty cell of
   * each column on the live board — exactly where the next piece would land
   * if dropped. Use `-1` for full columns (no marker rendered). Length 7.
   */
  columnLandingRows?: number[];
  /** 0..1 ratio for the evaluation bar fill. */
  evalRatio?: number;
  stats?: {
    depth: number;
    nodesPerSec: string;
    evalTimeMs: number;
  };
  /** Value slider score (centipawn-style). */
  evalScore?: number;
}

const ROWS = 6;
const COLS = 7;

/** Stagger between adjacent columns. 7 × 200ms ≈ 1400ms over a 3000ms cycle = continuous wave. */
const COLUMN_STAGGER_MS = 200;

/** Base opacity for non-marker dots (uniform decorative grid). */
const BASE_OPACITY = 0.35;

/** Map a 0..1 column score to opacity in [BASE_OPACITY..1.0]. score 0 blends into the base. */
function scoreOpacity(score: number): number {
  return BASE_OPACITY + Math.max(0, Math.min(1, score)) * (1 - BASE_OPACITY);
}

/** Default state matches the wireframe mid-game: col 3 is the best move. */
const DEFAULT_LANDING_ROWS = [5, 4, 3, 2, 3, 5, 5];
const DEFAULT_COLUMN_SCORES = [0, 0.15, 0.55, 1.0, 0.75, 0.25, 0];

/**
 * Compute the lowest empty row for each column on a live board.
 * Returns -1 for full columns.
 */
function landingRowsFromBoard(board: PublicGameView["board"]): number[] {
  const result: number[] = [];
  for (let c = 0; c < COLS; c++) {
    let row = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][c] === 0) {
        row = r;
        break;
      }
    }
    result.push(row);
  }
  return result;
}

/**
 * Normalize the AI's per-column raw minimax scores to a 0..1 ramp where
 * 1 = best move and 0 = worst (or null/full column). Forced-win scores
 * (≥ 1_000_000) saturate at 1.
 */
function normalizeColumnScores(raw: Array<number | null>): number[] {
  const valid = raw.map((s) => (s === null ? null : s));
  const present = valid.filter((s): s is number => s !== null);
  if (present.length === 0) return Array(COLS).fill(0);

  const max = Math.max(...present);
  const min = Math.min(...present);
  const range = max - min;

  return valid.map((s) => {
    if (s === null) return 0;
    if (range === 0) return 1; // all moves equally good
    return (s - min) / range;
  });
}

function formatNodesPerSec(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export function AITelemetry({
  columnScores,
  columnLandingRows,
  evalRatio,
  stats,
  evalScore,
}: AITelemetryProps) {
  // Subscribe to the live game store. SSR returns initialState (view=null,
  // telemetry=null) so the component falls back to the wireframe defaults
  // until the first AI move arrives.
  const snap = useSyncExternalStore(
    playStore.subscribe,
    playStore.getSnapshot,
    playStore.getSnapshot,
  );

  // Derive live values from the store. Each derived value is only used if
  // the explicit prop wasn't passed AND the store has data for it. This
  // preserves the styleguide's overridable contract.
  const liveLandingRows: number[] | null = snap.view
    ? landingRowsFromBoard(snap.view.board)
    : null;

  // When the AI has played, the live landing rows reflect the board
  // AFTER the AI's drop — so the AI's chosen column shows the row above
  // its piece, which makes the matrix look like it's predicting the AI's
  // NEXT move. We want the matrix anchored to the position the AI was
  // deciding from. Patch the chosen column's landing row back to where
  // the piece actually landed.
  const decisionLandingRows: number[] | null =
    liveLandingRows && snap.lastAiMove
      ? liveLandingRows.map((row, c) =>
          c === snap.lastAiMove!.col ? snap.lastAiMove!.row : row,
        )
      : liveLandingRows;

  const liveColumnScores: number[] | null = snap.telemetry
    ? normalizeColumnScores(snap.telemetry.columnScores)
    : null;

  const liveStats: AITelemetryProps["stats"] | null = snap.telemetry
    ? {
        depth: snap.telemetry.depth,
        nodesPerSec: formatNodesPerSec(snap.telemetry.nodesPerSecond),
        evalTimeMs: Math.round(snap.telemetry.evalTimeMs),
      }
    : null;

  const liveEvalRatio: number | null = snap.telemetry
    ? Math.max(0, Math.min(1, snap.telemetry.evalTimeMs / 200))
    : null;

  const liveEvalScore: number | null = snap.telemetry
    ? Math.round(Math.max(-999, Math.min(999, snap.telemetry.bestScore)))
    : null;

  const finalColumnScores =
    columnScores ?? liveColumnScores ?? DEFAULT_COLUMN_SCORES;
  const finalLandingRows =
    columnLandingRows ?? decisionLandingRows ?? DEFAULT_LANDING_ROWS;
  const finalEvalRatio = evalRatio ?? liveEvalRatio ?? 1 / 3;
  const finalStats =
    stats ?? liveStats ?? { depth: 8, nodesPerSec: "142k", evalTimeMs: 42 };
  const finalEvalScore = evalScore ?? liveEvalScore ?? 132;

  // Best-move column = highest score.
  const maxScore = Math.max(...finalColumnScores);
  const bestColumn = maxScore > 0 ? finalColumnScores.indexOf(maxScore) : -1;

  return (
    <section
      aria-labelledby="ai-telemetry-heading"
      className="flex w-full max-w-[220px] flex-col gap-10 font-mono text-mono-sm text-muted-foreground"
    >
      <h2 id="ai-telemetry-heading" className="sr-only">
        AI telemetry
      </h2>

      {/* Thinking matrix */}
      <div aria-hidden="true">
        <div className="grid w-full grid-cols-7 gap-[18px]">
          {Array.from({ length: ROWS }, (_, r) =>
            Array.from({ length: COLS }, (_, c) => {
              const isLandingCell = finalLandingRows[c] === r;
              const score = isLandingCell ? (finalColumnScores[c] ?? 0) : 0;
              const baseOpacity = isLandingCell ? scoreOpacity(score) : BASE_OPACITY;
              const isBestMove = isLandingCell && c === bestColumn && score > 0;

              const waveDelay = `${c * COLUMN_STAGGER_MS}ms`;

              // Static styles must MATCH keyframe 0% (the trough), so when the
              // animation kicks in at the staggered delay there's no visible
              // jump. The keyframe pulses UP from this trough to peak at 50%,
              // then back — that's the visible growth + brighten the user
              // noticed and wanted. (DESIGN.md §12)
              const inlineStyle: React.CSSProperties = {
                opacity: baseOpacity * 0.8,
                transform: "scale(0.92)",
                ["--matrix-base-opacity" as never]: baseOpacity.toFixed(3),
              };
              if (isBestMove) {
                inlineStyle.animation = `matrix-pulse 3s ease-in-out ${waveDelay} infinite, sonar-ping 5s ease-out 0ms infinite`;
              } else {
                inlineStyle.animationDelay = waveDelay;
              }

              return (
                <span
                  key={`${r}-${c}`}
                  className={cn(
                    "size-4 rounded-full",
                    isLandingCell && score > 0
                      ? "bg-foreground"
                      : "bg-muted-foreground",
                    !isBestMove && "animate-matrix-pulse",
                  )}
                  style={inlineStyle}
                />
              );
            }),
          )}
        </div>
      </div>

      {/* Evaluation bar — fills the section width (220px) to match the
          matrix above and the slider below. */}
      <div
        className="relative h-2 w-full rounded-full border border-muted-foreground opacity-70"
        role="meter"
        aria-label="Search progress"
        aria-valuenow={Math.round(finalEvalRatio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="absolute left-0 top-0 h-full rounded-l-full bg-muted-foreground"
          style={{ width: `${Math.max(0, Math.min(1, finalEvalRatio)) * 100}%` }}
        />
      </div>

      {/* Stats */}
      <ul className="flex w-full flex-col gap-1 uppercase opacity-70">
        <li>Depth: {finalStats.depth}</li>
        <li>Nodes/sec: {finalStats.nodesPerSec}</li>
        <li>Eval Time: {finalStats.evalTimeMs}ms</li>
      </ul>

      {/* Value slider — bar + dashed continuation, fills the section width
          and aligns visually with the eval bar above. */}
      <div className="flex w-full items-center gap-1 pt-2 opacity-70" aria-hidden="true">
        <div className="relative flex h-2 flex-1 items-center bg-muted-foreground">
          <div className="absolute right-0 h-5 w-0.5 translate-x-1/2 bg-foreground" />
        </div>
        <div className="h-px w-2 border-t border-dashed border-muted-foreground" />
      </div>
    </section>
  );
}

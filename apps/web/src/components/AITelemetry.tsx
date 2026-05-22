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

import { cn } from "~/lib/utils";

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

/** Base opacity for non-marker dots (uniform decorative grid). */
const BASE_OPACITY = 0.35;

/** Map a 0..1 column score to opacity in [BASE_OPACITY..1.0]. score 0 blends into the base. */
function scoreOpacity(score: number): number {
  return BASE_OPACITY + Math.max(0, Math.min(1, score)) * (1 - BASE_OPACITY);
}

/** Default state matches the wireframe mid-game: col 3 is the best move. */
const DEFAULT_LANDING_ROWS = [5, 4, 3, 2, 3, 5, 5];
const DEFAULT_COLUMN_SCORES = [0, 0.15, 0.55, 1.0, 0.75, 0.25, 0];

export function AITelemetry({
  columnScores = DEFAULT_COLUMN_SCORES,
  columnLandingRows = DEFAULT_LANDING_ROWS,
  evalRatio = 1 / 3,
  stats = { depth: 8, nodesPerSec: "142k", evalTimeMs: 42 },
  evalScore = 132,
}: AITelemetryProps) {
  // Best-move column = highest score.
  const maxScore = Math.max(...columnScores);
  const bestColumn = maxScore > 0 ? columnScores.indexOf(maxScore) : -1;

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
        <div className="grid w-max grid-cols-7 gap-3">
          {Array.from({ length: ROWS }, (_, r) =>
            Array.from({ length: COLS }, (_, c) => {
              const isLandingCell = columnLandingRows[c] === r;
              const score = isLandingCell ? (columnScores[c] ?? 0) : 0;
              const baseOpacity = isLandingCell ? scoreOpacity(score) : BASE_OPACITY;
              const isBestMove = isLandingCell && c === bestColumn && score > 0;

              // Per-cell opacity drives the score gradient. The best-move cell
              // additionally gets the sonar-ping ring every 5s — that's the only
              // motion left in the panel. The wave animation was removed (see
              // DESIGN.md §17.1).
              const inlineStyle: React.CSSProperties = {
                opacity: baseOpacity,
              };
              if (isBestMove) {
                inlineStyle.animation = `sonar-ping 5s ease-out 0ms infinite`;
              }

              return (
                <span
                  key={`${r}-${c}`}
                  className={cn(
                    "size-4 rounded-full",
                    isLandingCell && score > 0
                      ? "bg-foreground"
                      : "bg-muted-foreground",
                  )}
                  style={inlineStyle}
                />
              );
            }),
          )}
        </div>
      </div>

      {/* Evaluation bar — width matches matrix (size-4 × 7 + gap-3 × 6 = 184px) */}
      <div
        className="relative h-2 w-[184px] rounded-full border border-muted-foreground opacity-70"
        role="meter"
        aria-label="Search progress"
        aria-valuenow={Math.round(evalRatio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="absolute left-0 top-0 h-full rounded-l-full bg-muted-foreground"
          style={{ width: `${Math.max(0, Math.min(1, evalRatio)) * 100}%` }}
        />
      </div>

      {/* Stats */}
      <ul className="flex flex-col gap-1 uppercase opacity-70">
        <li>Depth: {stats.depth}</li>
        <li>Nodes/sec: {stats.nodesPerSec}</li>
        <li>Eval Time: {stats.evalTimeMs}ms</li>
      </ul>

      {/* Value slider — total width 184px to match matrix and eval bar.
          Layout: w-8 label + gap-3 + w-32 bar + ml-1 + w-2 dashed continuation = 184. */}
      <div className="flex w-[184px] items-center gap-3 pt-2 opacity-70" aria-hidden="true">
        <span className="w-8 shrink-0 text-right">{evalScore}</span>
        <div className="relative flex h-2 w-32 items-center bg-muted-foreground">
          <div className="absolute right-0 h-5 w-0.5 translate-x-1/2 bg-foreground" />
          <div className="absolute left-full ml-1 h-px w-2 border-t border-dashed border-muted-foreground" />
        </div>
      </div>
    </section>
  );
}

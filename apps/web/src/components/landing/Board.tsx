/**
 * Board — 7×6 Connect 4 board, currently rendering a static mid-game position
 * matching the landing-page wireframe.
 *
 * Why React (not Astro)?
 *   Once Tim's game module lands, the parent <GameDemo> island will manage live
 *   state and pass new `pieces` per turn. Building this as a React component
 *   from the start means the future swap is just "add client:load" to the
 *   parent island; no structural rewrite.
 *
 * Currently rendered server-side only (no client:* directive on usage), so it
 * ships zero JS to the browser today.
 *
 * TODO(integration): the AI / game module owns turn state and piece transitions.
 *   Hook points:
 *     - <Board pieces={…} /> — already props-driven; pass live board.
 *     - onColumnClick / onColumnHover handlers (not yet defined here) — add
 *       when wiring interactivity. Hover preview drops a translucent ghost
 *       piece in the lowest empty cell of the hovered column.
 *     - Drop animation: animate the new piece falling from the top to its
 *       final row using `translate-y` keyframes. CSS-only; no JS animation.
 */

import { cn } from "~/lib/utils";

export type Cell = "empty" | "red" | "yellow";
export type BoardState = Cell[][]; // 6 rows × 7 cols, row 0 = top

/**
 * EXPERIMENT — board visual variants. Temporary; remove once a direction is
 * picked. See globals.css "Board variants for A/B evaluation".
 */
export type BoardVariant =
  | "default"
  | "branded"
  | "glass"
  | "wood"
  | "none"
  | "recessed"
  | "liquid-glass";

export const ROWS = 6;
export const COLS = 7;

/** Static mid-game position from the landing-page wireframe. */
export const WIREFRAME_BOARD: BoardState = (() => {
  const board: BoardState = Array.from({ length: ROWS }, () => Array(COLS).fill("empty"));
  // Coordinates are (row, col), 0-indexed, row 0 = top.
  board[3][3] = "red";
  board[4][2] = "yellow";
  board[4][3] = "yellow";
  board[4][4] = "red";
  board[5][1] = "yellow";
  board[5][2] = "red";
  board[5][3] = "red";
  board[5][4] = "yellow";
  return board;
})();

interface BoardProps {
  /** 6×7 array of cells. Defaults to the wireframe's mid-game position. */
  pieces?: BoardState;
  /** Optional className override on the outer board plate. */
  className?: string;
  /** EXPERIMENT — visual variant. Defaults to "default" (current style). */
  variant?: BoardVariant;
}

function cellLabel(cell: Cell, row: number, col: number): string {
  const human = `row ${row + 1}, column ${col + 1}`;
  if (cell === "empty") return `Empty cell, ${human}`;
  return `${cell === "red" ? "Red" : "Yellow"} piece, ${human}`;
}

/** Plate-level classes per variant. */
function plateClasses(variant: BoardVariant): string {
  switch (variant) {
    case "branded":
      return "board-branded shadow-2xl";
    case "glass":
      return "board-glass shadow-xl";
    case "wood":
      return "board-wood shadow-2xl";
    case "none":
      return "board-none";
    case "recessed":
      return "board-recessed shadow-[0_30px_60px_-15px_oklch(0%_0_0/0.4)]";
    case "liquid-glass":
      // Handled in the dedicated render branch — this string isn't applied.
      return "";
    default:
      return "bg-board shadow-2xl";
  }
}

/** Empty-cell classes per variant. */
function emptyCellClasses(variant: BoardVariant): string {
  switch (variant) {
    case "branded":
      return "board-branded-cell";
    case "glass":
      return "board-glass-cell";
    case "wood":
      return "board-wood-cell";
    case "none":
      return "board-none-cell";
    case "recessed":
      return "board-recessed-cell";
    case "liquid-glass":
      return "board-liquid-glass-cell";
    default:
      return "bg-board-cell";
  }
}

export function Board({ pieces = WIREFRAME_BOARD, className, variant = "default" }: BoardProps) {
  // Liquid-glass uses a layered DOM structure (filter / overlay / specular /
  // content) — the cssscript.com lg-* recipe. Branched out so the other
  // variants stay simple single-div renders.
  if (variant === "liquid-glass") {
    return (
      <div
        role="grid"
        aria-label="Connect 4 board"
        aria-rowcount={ROWS}
        aria-colcount={COLS}
        className={cn(
          "relative inline-block overflow-hidden rounded-xl shadow-2xl",
          className,
        )}
      >
        {/* Under-glass color layer (z-0). Plain bg-pawn-* circles at the same
            grid positions as the on-top pieces. The lg-filter at z-0 (later
            in DOM, so painted on top) has backdrop-filter blur + filter:url
            so it picks these colors up as the backdrop and smears them — the
            warm tint visible through the glass plate around each piece. */}
        <div
          className="pointer-events-none absolute inset-0 z-0 p-4 sm:p-5 md:p-6"
          aria-hidden="true"
        >
          <div className="grid grid-cols-7 gap-2 sm:gap-3 md:gap-4">
            {pieces.map((row, rowIdx) =>
              row.map((cell, colIdx) => (
                <div
                  key={`under-${rowIdx}-${colIdx}`}
                  className={cn(
                    "size-9 rounded-full sm:size-10 md:size-12",
                    cell === "red" && "bg-pawn-red",
                    cell === "yellow" && "bg-pawn-yellow",
                    // Empty cells contribute nothing — transparent so the
                    // page bg shows through the glass with no color bias.
                  )}
                />
              )),
            )}
          </div>
        </div>
        <div className="lg-filter" aria-hidden="true" />
        <div className="lg-overlay" aria-hidden="true" />
        <div className="lg-specular" aria-hidden="true" />
        <div className="lg-content p-4 sm:p-5 md:p-6">
          <div className="grid grid-cols-7 gap-2 sm:gap-3 md:gap-4">
            {pieces.map((row, rowIdx) =>
              row.map((cell, colIdx) => (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  role="gridcell"
                  aria-rowindex={rowIdx + 1}
                  aria-colindex={colIdx + 1}
                  aria-label={cellLabel(cell, rowIdx, colIdx)}
                  data-cell={cell}
                  className={cn(
                    "size-9 sm:size-10 md:size-12 rounded-full",
                    cell === "empty" && emptyCellClasses(variant),
                    cell === "red" && "pawn-red",
                    cell === "yellow" && "pawn-yellow",
                  )}
                />
              )),
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="grid"
      aria-label="Connect 4 board"
      aria-rowcount={ROWS}
      aria-colcount={COLS}
      className={cn(
        "inline-block rounded-xl p-4 sm:p-5 md:p-6",
        plateClasses(variant),
        className,
      )}
    >
      <div className="grid grid-cols-7 gap-2 sm:gap-3 md:gap-4">
        {pieces.map((row, rowIdx) =>
          row.map((cell, colIdx) => (
            <div
              key={`${rowIdx}-${colIdx}`}
              role="gridcell"
              aria-rowindex={rowIdx + 1}
              aria-colindex={colIdx + 1}
              aria-label={cellLabel(cell, rowIdx, colIdx)}
              data-cell={cell}
              className={cn(
                "size-9 sm:size-10 md:size-12 rounded-full",
                cell === "empty" && emptyCellClasses(variant),
                cell === "red" && "pawn-red",
                cell === "yellow" && "pawn-yellow",
              )}
            />
          )),
        )}
      </div>
    </div>
  );
}

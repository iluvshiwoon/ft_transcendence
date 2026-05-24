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
}

function cellLabel(cell: Cell, row: number, col: number): string {
  const human = `row ${row + 1}, column ${col + 1}`;
  if (cell === "empty") return `Empty cell, ${human}`;
  return `${cell === "red" ? "Red" : "Yellow"} piece, ${human}`;
}

export function Board({ pieces = WIREFRAME_BOARD, className }: BoardProps) {
  return (
    <div
      role="grid"
      aria-label="Connect 4 board"
      aria-rowcount={ROWS}
      aria-colcount={COLS}
      className={cn(
        "inline-block rounded-xl bg-board p-4 sm:p-5 md:p-6 shadow-2xl",
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
                cell === "empty" && "bg-board-cell",
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

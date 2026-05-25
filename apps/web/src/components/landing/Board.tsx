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

import { useEffect, useState, useSyncExternalStore } from "react";

import { cn } from "~/lib/utils";
import { playStore } from "~/lib/play-store";
import type { Cell as ServerCell } from "~/lib/play-api";

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
  | "liquid-glass"
  | "raised";

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

/** All-empty 6×7 board — used as the live game's starting state. */
export const EMPTY_BOARD: BoardState = Array.from({ length: ROWS }, () =>
  Array(COLS).fill("empty"),
);

/**
 * Map the server's int representation (0=empty, 1=player1=user=yellow,
 * 2=player2=AI=red) to the UI's named cells.
 */
function cellFromServer(c: ServerCell): Cell {
  return c === 0 ? "empty" : c === 1 ? "yellow" : "red";
}

function viewBoardFromServer(board: ServerCell[][]): BoardState {
  return board.map((row) => row.map(cellFromServer));
}

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
    case "raised":
      // No outer shadow class — board-raised utility owns the slope shadow.
      // Larger border-radius (36px) for softer dome feel.
      return "board-raised rounded-[36px]";
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
    case "raised":
      // Reuse the carved-well cells from no-plate variant. The recess effect
      // works the same: dark interior + top rim shadow + bottom highlight.
      return "board-none-cell";
    default:
      return "bg-board-cell";
  }
}

export function Board({ pieces, className, variant = "default" }: BoardProps) {
  // Subscribe to the play store. SSR returns initialState (view=null), so
  // we fall back to the explicit `pieces` prop or WIREFRAME_BOARD until the
  // server-side game session is up.
  const snap = useSyncExternalStore(
    playStore.subscribe,
    playStore.getSnapshot,
    playStore.getSnapshot,
  );

  // Kick off /api/play/start once on mount (idempotent inside the store).
  useEffect(() => {
    playStore.ensureStarted();
  }, []);

  const livePieces: BoardState | null = snap.view ? viewBoardFromServer(snap.view.board) : null;
  const renderedPieces: BoardState = livePieces ?? pieces ?? WIREFRAME_BOARD;

  const handleColumnClick = (col: number) => {
    void playStore.play(col);
  };

  // Column-hover state for the liquid-glass variant. Hit zones overlay the
  // board (extending above + below) so users can hover slightly outside
  // the plate and still target a column. The hovered column's empty cells
  // get the board-liquid-glass-cell-hover utility — bright inset rim
  // signaling "this column is targeted for the next drop".
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

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
        className={cn("relative inline-block", className)}
      >
        {/* Glass plate — overflow-hidden + rounded for the glass surface;
            kept as an inner wrapper so the hit zones below can extend
            above/below the board without being clipped by it. */}
        <div className="relative overflow-hidden rounded-xl shadow-2xl">
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
              {renderedPieces.map((row, rowIdx) =>
                row.map((cell, colIdx) => {
                  const isFilled = cell !== "empty";
                  return (
                    <div
                      key={`under-${rowIdx}-${colIdx}`}
                      className={cn(
                        "size-9 rounded-full sm:size-10 md:size-12",
                        cell === "red" && "bg-pawn-red piece-drop",
                        cell === "yellow" && "bg-pawn-yellow piece-drop",
                      )}
                      style={
                        isFilled
                          ? ({ ["--drop-start" as never]: `-${(rowIdx + 1) * 100}%` } as React.CSSProperties)
                          : undefined
                      }
                    />
                  );
                }),
              )}
            </div>
          </div>
          <div className="lg-filter" aria-hidden="true" />
          <div className="lg-overlay" aria-hidden="true" />
          <div className="lg-specular" aria-hidden="true" />
          <div className="lg-content p-4 sm:p-5 md:p-6">
            <div className="grid grid-cols-7 gap-2 sm:gap-3 md:gap-4">
              {renderedPieces.map((row, rowIdx) =>
                row.map((cell, colIdx) => {
                  const isHoveredCol = hoveredCol === colIdx;
                  const isFilled = cell !== "empty";
                  return (
                    <div
                      key={`${rowIdx}-${colIdx}`}
                      role="gridcell"
                      aria-rowindex={rowIdx + 1}
                      aria-colindex={colIdx + 1}
                      aria-label={cellLabel(cell, rowIdx, colIdx)}
                      data-cell={cell}
                      className={cn(
                        "size-9 sm:size-10 md:size-12 rounded-full transition-[background-color,box-shadow] duration-200 ease-out",
                        cell === "empty" &&
                          (isHoveredCol
                            ? "board-liquid-glass-cell-hover"
                            : emptyCellClasses(variant)),
                        cell === "red" && "pawn-red piece-drop",
                        cell === "yellow" && "pawn-yellow piece-drop",
                      )}
                      style={
                        isFilled
                          ? ({ ["--drop-start" as never]: `-${(rowIdx + 1) * 100}%` } as React.CSSProperties)
                          : undefined
                      }
                    />
                  );
                }),
              )}
            </div>
          </div>
        </div>

        {/* Column hit zones — overlaid on the board, extending 60px above
            and below it so users can hover slightly outside the plate and
            still target a column. cursor:pointer overrides the default
            text-cursor that was visible over the cells. */}
        <div
          className="absolute -top-[60px] -bottom-[60px] left-0 right-0 z-20 grid grid-cols-7 gap-2 px-4 sm:gap-3 sm:px-5 md:gap-4 md:px-6"
          onMouseLeave={() => setHoveredCol(null)}
          aria-hidden="true"
        >
          {Array.from({ length: COLS }).map((_, c) => (
            <button
              key={`hit-${c}`}
              type="button"
              aria-label={`Drop in column ${c + 1}`}
              className="h-full cursor-pointer bg-transparent p-0 focus:outline-none"
              onMouseEnter={() => setHoveredCol(c)}
              onClick={() => handleColumnClick(c)}
              disabled={snap.thinking}
            />
          ))}
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
        {renderedPieces.map((row, rowIdx) =>
          row.map((cell, colIdx) => {
            const isFilled = cell !== "empty";
            return (
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
                  cell === "red" && "pawn-red piece-drop",
                  cell === "yellow" && "pawn-yellow piece-drop",
                )}
                style={
                  isFilled
                    ? ({ ["--drop-start" as never]: `-${(rowIdx + 1) * 100}%` } as React.CSSProperties)
                    : undefined
                }
              />
            );
          }),
        )}
      </div>
    </div>
  );
}

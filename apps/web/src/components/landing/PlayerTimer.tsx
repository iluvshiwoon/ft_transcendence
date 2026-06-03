import { useSyncExternalStore } from "react";
import { playStore } from "~/lib/play-store";
import { cn } from "~/lib/utils";

function formatTime(seconds: number | null): string {
  if (seconds === null || seconds < 0) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function PlayerTimer() {
  const snap = useSyncExternalStore(
    playStore.subscribe,
    playStore.getSnapshot,
    playStore.getSnapshot,
  );

  const {
    timerP1,
    timerP2,
    p1Username,
    p2Username,
    view,
  } = snap;

  if (snap.gameId === null || !view) {
    return null; // Don't render for anonymous games
  }

  const p1Active = view.currentPlayer === 1 && view.status === "in_progress";
  const p2Active = view.currentPlayer === 2 && view.status === "in_progress";

  const p1LowTime = timerP1 !== null && timerP1 < 30 && view.status === "in_progress";
  const p2LowTime = timerP2 !== null && timerP2 < 30 && view.status === "in_progress";

  return (
    <div className="page-reveal mb-6 flex w-full max-w-[320px] sm:max-w-[480px] items-center justify-between gap-4 font-mono">
      {/* Player 1 (You) Timer */}
      <div
        className={cn(
          "flex flex-1 items-center justify-between rounded-lg border px-3 py-2 transition-all duration-200",
          p1Active
            ? p1LowTime
              ? "border-pawn-red bg-pawn-red/10 text-pawn-red shadow-[0_0_12px_rgba(239,68,68,0.2)] animate-pulse"
              : "border-pawn-yellow bg-pawn-yellow/5 text-pawn-yellow shadow-[0_0_12px_rgba(234,179,8,0.15)]"
            : "border-border bg-muted text-muted-foreground"
        )}
      >
        <div className="flex flex-col min-w-0">
          <span className="truncate text-mono-xs uppercase font-bold tracking-wider">
            {p1Username}
          </span>
          <span
            className={cn(
              "text-mono-xs uppercase text-muted-foreground",
              p1Active && "text-pawn-yellow/80"
            )}
          >
            Yellow
          </span>
        </div>
        <span className="text-mono-lg font-bold tabular-nums tracking-tight">
          {formatTime(timerP1)}
        </span>
      </div>

      {/* Middle indicator (VS or Turn State) */}
      <div className="flex flex-col items-center justify-center shrink-0">
        <span className="text-mono-xs uppercase font-bold text-muted-foreground tracking-widest">
          VS
        </span>
        <div className="h-1 w-6 rounded-full bg-border mt-1 relative overflow-hidden">
          {p1Active && (
            <div className="absolute inset-0 bg-pawn-yellow rounded-full animate-pulse" />
          )}
          {p2Active && (
            <div className="absolute inset-0 bg-pawn-red rounded-full animate-pulse" />
          )}
        </div>
      </div>

      {/* Player 2 (Opponent / AI) Timer */}
      <div
        className={cn(
          "flex flex-1 items-center justify-between rounded-lg border px-3 py-2 transition-all duration-200",
          p2Active
            ? p2LowTime
              ? "border-pawn-red bg-pawn-red/10 text-pawn-red shadow-[0_0_12px_rgba(239,68,68,0.2)] animate-pulse"
              : "border-pawn-red bg-pawn-red/5 text-pawn-red shadow-[0_0_12px_rgba(239,68,68,0.15)]"
            : "border-border bg-muted text-muted-foreground"
        )}
      >
        <span className="text-mono-lg font-bold tabular-nums tracking-tight">
          {formatTime(timerP2)}
        </span>
        <div className="flex flex-col items-end min-w-0 text-right">
          <span className="truncate text-mono-xs uppercase font-bold tracking-wider">
            {p2Username}
          </span>
          <span
            className={cn(
              "text-mono-xs uppercase text-muted-foreground",
              p2Active && "text-pawn-red/80"
            )}
          >
            Red
          </span>
        </div>
      </div>
    </div>
  );
}

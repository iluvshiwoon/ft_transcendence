/**
 * EndGameOverlay — orchestrates the post-game UI on the landing page.
 *
 * Sequence (after the AI's piece animation has settled):
 *   1. 'glow' phase    — winning-line glow visible (handled in Board cells);
 *                        nothing rendered here yet
 *   2. 'status' phase  — brief result text ("You win" / "You lose" / "Draw")
 *                        fades in over the board
 *   3. 'card' phase    — board blurs behind, signup-prompt card slides in
 *                        with score, rank, sign up + replay CTAs
 *
 * Phase transitions are time-based: when gameEndState becomes non-null,
 * we schedule status (after PIECE_ANIM + GLOW_DELAY) and card (after
 * STATUS_DELAY).
 *
 * The overlay sits absolutely over the board's outer container and
 * pointer-events:none on phase=glow so column-clicks aren't accidentally
 * blocked by it before the AI's piece has even settled.
 */

import { useSyncExternalStore } from "react";

import { cn } from "~/lib/utils";
import { playStore } from "~/lib/play-store";
import { MOCK_ENTRIES } from "./Leaderboard";

function statusText(state: "won" | "lost" | "draw" | null): string {
  switch (state) {
    case "won":
      return "You win";
    case "lost":
      return "You lose";
    case "draw":
      return "Draw";
    default:
      return "";
  }
}

/**
 * Compute the user's rank against MOCK_ENTRIES given their score.
 * Returns 1..6 (1 = top, 6 = below all 5 mock entries).
 */
function computeRank(score: number): number {
  let rank = 1;
  for (const e of MOCK_ENTRIES) {
    if (score >= e.rating) break;
    rank++;
  }
  return rank;
}

interface EndGameCardProps {
  outcome: "won" | "lost" | "draw";
  score: number;
  rank: number;
  onSignup: () => void;
  onReplay: () => void;
}

function EndGameCard({ outcome, score, rank, onSignup, onReplay }: EndGameCardProps) {
  const heading =
    outcome === "won" ? "You won!" : outcome === "lost" ? "AI won" : "Even game";

  return (
    <div
      className={cn(
        "endgame-card",
        "flex w-full max-w-[320px] flex-col gap-4",
        "rounded-xl border border-border bg-surface px-6 py-6 shadow-2xl",
      )}
    >
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-3xl font-light italic leading-none text-foreground">
          {heading}
        </h3>
        <p className="font-mono text-mono-md text-muted-foreground">
          You scored <span className="font-semibold text-foreground tabular-nums">{score}</span>
        </p>
        <p className="font-mono text-mono-sm text-muted-foreground">
          Rank #<span className="text-foreground tabular-nums">{rank}</span> on the leaderboard
        </p>
      </div>

      <p className="font-mono text-mono-sm text-muted-foreground">
        Sign up to save your score, climb the leaderboard, play multiplayer + chat with friends.
      </p>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onSignup}
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-foreground px-5 py-2.5",
            "font-mono text-mono-sm uppercase text-background",
            "transition-opacity hover:opacity-90 active:opacity-80",
          )}
        >
          Sign up to save it
        </button>
        <button
          type="button"
          onClick={onReplay}
          className={cn(
            "inline-flex items-center justify-center rounded-full px-5 py-2.5",
            "font-mono text-mono-sm uppercase text-muted-foreground",
            "transition-colors hover:text-foreground",
          )}
        >
          Play again
        </button>
      </div>
    </div>
  );
}

export function EndGameOverlay() {
  const snap = useSyncExternalStore(
    playStore.subscribe,
    playStore.getSnapshot,
    playStore.getSnapshot,
  );

  if (snap.endGamePhase === "idle" || !snap.gameEndState) return null;

  const score = snap.gameScore ?? 0;
  const rank = computeRank(score);

  const handleSignup = () => {
    const params = new URLSearchParams({
      from: "demo",
      result: snap.gameEndState ?? "draw",
      score: String(score),
    });
    window.location.href = `/signup?step=1&${params.toString()}`;
  };

  const handleReplay = () => {
    void playStore.restart();
  };

  return (
    <div
      className={cn(
        "absolute inset-0 z-30 flex items-center justify-center",
        // Pointer-events on only when interactive (the card phase)
        snap.endGamePhase === "card" ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      {snap.endGamePhase === "status" && (
        <div className="endgame-status font-display text-5xl font-light italic text-foreground sm:text-6xl">
          {statusText(snap.gameEndState)}
        </div>
      )}
      {snap.endGamePhase === "card" && (
        <EndGameCard
          outcome={snap.gameEndState}
          score={score}
          rank={rank}
          onSignup={handleSignup}
          onReplay={handleReplay}
        />
      )}
    </div>
  );
}

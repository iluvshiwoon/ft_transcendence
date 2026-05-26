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

  // Pitch line varies by outcome — wins emphasize "save it", losses
  // emphasize "rematch", draws are neutral. Each version accents
  // (text-foreground + font-semibold) the words that matter most so
  // they pop against the surrounding muted body text.
  const pitch =
    outcome === "won" ? (
      <>
        Sign up to{" "}
        <span className="font-semibold text-foreground">save your score</span>, climb the{" "}
        <span className="font-semibold text-foreground">leaderboard</span>, and play{" "}
        <span className="font-semibold text-foreground">multiplayer</span>.
      </>
    ) : outcome === "lost" ? (
      <>
        Sign up to{" "}
        <span className="font-semibold text-foreground">save your score</span> and climb back —{" "}
        <span className="font-semibold text-foreground">multiplayer</span>, friends, full ranking.
      </>
    ) : (
      <>
        Sign up to{" "}
        <span className="font-semibold text-foreground">save your score</span>,{" "}
        <span className="font-semibold text-foreground">climb the leaderboard</span>, and play{" "}
        <span className="font-semibold text-foreground">multiplayer</span>.
      </>
    );

  return (
    <div
      className={cn(
        "endgame-card",
        "flex h-full w-full flex-col items-center justify-between gap-7",
        "rounded-xl border border-border bg-surface px-7 py-8 text-center shadow-2xl",
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <h3 className="font-display text-5xl font-light italic leading-none text-foreground">
          {heading}
        </h3>
        <p className="font-mono text-mono-sm uppercase tracking-wide text-muted-foreground">
          You scored
        </p>
        <p className="font-display text-6xl font-light leading-none tabular-nums text-foreground">
          {score}
        </p>
        <p className="font-mono text-mono-md text-muted-foreground">
          Rank{" "}
          <span className="font-semibold tabular-nums text-foreground">#{rank}</span>{" "}
          on the leaderboard
        </p>
      </div>

      <p className="max-w-[280px] font-mono text-mono-md leading-relaxed text-muted-foreground">
        {pitch}
      </p>

      {/* Buttons — primary 'Sign up' is the visual anchor, larger than
          the secondary 'Play again' below it. */}
      <div className="flex w-full flex-col items-center gap-3">
        <button
          type="button"
          onClick={onSignup}
          className={cn(
            "inline-flex w-full max-w-[280px] items-center justify-center rounded-full",
            "bg-foreground px-6 py-4",
            "font-mono text-mono-md font-semibold uppercase tracking-wide text-background",
            "transition-opacity hover:opacity-90 active:opacity-80",
          )}
        >
          Sign up
        </button>
        <button
          type="button"
          onClick={onReplay}
          className={cn(
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

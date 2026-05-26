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
  authed: boolean;
  onSignup: () => void;
  onReplay: () => void;
}

function EndGameCard({ outcome, score, rank, authed, onSignup, onReplay }: EndGameCardProps) {
  const heading =
    outcome === "won" ? "You won!" : outcome === "lost" ? "AI won" : "Even game";

  // Pitch line varies by outcome — wins emphasize "save it", losses
  // Pitch line varies by outcome — wins emphasize "save it", losses
  // emphasize "rematch", draws are neutral. Each version accents
  // (text-foreground + font-bold) the words that matter most so
  // they pop against the surrounding muted body text. Bold (not
  // semibold) to keep contrast in dark mode where the foreground
  // / muted-foreground tonal gap is narrower.
  const pitch =
    outcome === "won" ? (
      <>
        Sign up to{" "}
        <span className="font-bold text-foreground">save your score</span>, climb the{" "}
        <span className="font-bold text-foreground">leaderboard</span>, and play{" "}
        <span className="font-bold text-foreground">multiplayer</span>.
      </>
    ) : outcome === "lost" ? (
      <>
        Sign up to{" "}
        <span className="font-bold text-foreground">save your score</span> and climb back —{" "}
        <span className="font-bold text-foreground">multiplayer</span>, friends, full ranking.
      </>
    ) : (
      <>
        Sign up to{" "}
        <span className="font-bold text-foreground">save your score</span>,{" "}
        <span className="font-bold text-foreground">climb the leaderboard</span>, and play{" "}
        <span className="font-bold text-foreground">multiplayer</span>.
      </>
    );

  return (
    <div
      className={cn(
        "endgame-card",
        // Always at least covers the board area (min-h-full / min-w-full)
        // so the board is fully hidden behind the card. Mobile content
        // overflows naturally when the demo board is small. Capped at
        // viewport-margins on mobile so it doesn't spill off-screen.
        "flex min-h-full min-w-full flex-col items-center gap-7",
        "max-w-[calc(100vw-2rem)] md:max-w-none",
        // Desktop: center content vertically instead of pushing buttons
        // to the bottom — looked like a slab of empty space between the
        // pitch and the Play again button.
        "md:justify-center",
        // Small margin-block so the card on mobile keeps a visible gap
        // to the AITelemetry / Leaderboard sections that stack above
        // and below it. Desktop has the grid gutter for that.
        "my-4 md:my-0",
        "rounded-xl border border-border bg-surface px-7 pb-10 pt-8 text-center shadow-2xl",
      )}
    >
      <div className="flex flex-col items-center gap-2">
        <h3 className="font-display text-5xl font-light italic leading-none text-foreground">
          {heading}
        </h3>
        <p className="mt-3 font-mono text-mono-sm uppercase tracking-wide text-muted-foreground">
          You scored
        </p>
        <p className="font-display text-4xl font-light leading-none tabular-nums text-foreground">
          {score}
        </p>
        <p className="mt-1 font-mono text-mono-sm text-muted-foreground">
          Rank{" "}
          <span className="font-semibold tabular-nums text-foreground">#{rank}</span>{" "}
          on the leaderboard
        </p>
      </div>

      {!authed && (
        <p className="max-w-[260px] font-mono text-mono-sm leading-relaxed text-muted-foreground">
          {pitch}
        </p>
      )}

      {/* Buttons — primary 'Sign up' is the visual anchor, larger than
          the secondary 'Play again' below it. Arrow icon mirrors the
          TopNav signup CTA so the call-to-action reads consistent.
          Hover: filled-to-outlined invert (same brand-filled effect as
          the TopNav button), so the two CTAs feel like the same family.
          When already authed, the signup CTA + pitch are hidden — only
          the Play again button remains. */}
      <div className="flex w-full flex-col items-center gap-3">
        {!authed && (
          <button
            type="button"
            onClick={onSignup}
            className={cn(
              "inline-flex w-full max-w-[280px] items-center justify-center gap-2 rounded-full",
              "border border-foreground bg-foreground px-6 py-4",
              "font-mono text-base font-semibold uppercase tracking-wide text-background",
              "transition-colors transition-transform",
              "hover:bg-transparent hover:text-foreground",
              "active:scale-[0.98]",
            )}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
            Sign up
          </button>
        )}
        <button
          type="button"
          onClick={onReplay}
          className={cn(
            "rounded-full px-4 py-1.5",
            "font-mono text-mono-sm uppercase text-muted-foreground",
            // Visible hover in both modes: stronger color shift +
            // subtle background tint + slight scale press.
            "transition-colors transition-transform",
            "hover:bg-foreground/10 hover:text-foreground",
            "active:scale-[0.98]",
          )}
        >
          Play again
        </button>
      </div>
    </div>
  );
}

interface EndGameOverlayProps {
  /** Whether the request is authenticated. Drives whether the post-game
   *  card shows the signup CTA — logged-in users only see Play again. */
  authed?: boolean;
}

export function EndGameOverlay({ authed = false }: EndGameOverlayProps) {
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
          authed={authed}
          onSignup={handleSignup}
          onReplay={handleReplay}
        />
      )}
    </div>
  );
}

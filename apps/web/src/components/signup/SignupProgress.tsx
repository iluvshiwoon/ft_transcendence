/**
 * SignupProgress — 4-dot step indicator styled as Connect-4 board pieces.
 *
 * Tokens use the `pawn-neutral` (filled) / `pawn-slot` (empty) utilities from
 * globals.css — same depth recipe (inset highlight + inset shadow + drop
 * shadow) as the actual game pieces, but with the foreground/muted palette
 * so the tracker reads as a board without the brand-color tax.
 *
 * Per-step: the token at the current step plays `signup-token-drop` on mount.
 *
 * Step-4 win sequence: a thicker connecting line draws across the four
 * tokens, then all four pulse in scale. CSS-driven via `data-current="4"` on
 * the wrapper (cascade rules live in globals.css).
 */

import { cn } from "~/lib/utils";

interface SignupProgressProps {
  current: 0 | 1 | 2 | 3 | 4;
}

const STEP_LABELS: Record<number, string> = {
  1: "Save",
  2: "Credentials",
  3: "Profile",
  4: "Play",
};

export function SignupProgress({ current }: SignupProgressProps) {
  return (
    <div
      role="progressbar"
      aria-label="Signup progress"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={4}
      data-current={current}
      className="relative mx-auto w-full"
    >
      {/* Step counter */}
      <p className="mb-8 text-center font-mono text-mono-sm uppercase text-muted-foreground">
        {current === 0 ? "00 / 04" : `${String(current).padStart(2, "0")} / 04`}
        {current >= 1 && current <= 4 ? ` — ${STEP_LABELS[current]}` : ""}
      </p>

      {/* Tokens + connecting beam (beam only animates at step 4).
          Layout: justify-center + gap-3 keeps the four tokens tight in the
          middle of the card — proportions echo adjacent slots in a real
          Connect-4 board (~28px token + 12px gap = 2.3:1 ratio). */}
      <div className="relative flex items-center justify-center gap-3">
        {/* The beam is absolute behind the tokens; tokens have z-10 and full
            backgrounds so they hide the beam on top of themselves — visible
            only in the gaps. inset-x-3.5 = 14px from each end of the row,
            which lands on the center of the first/last tokens. */}
        <span
          aria-hidden="true"
          data-signup-line
          className="absolute inset-x-3.5 top-1/2 h-1 -translate-y-1/2 rounded-full bg-foreground"
        />

        {[1, 2, 3, 4].map((step) => {
          const filled = step <= current;
          const isCurrent = step === current;
          return (
            <span
              key={step}
              data-signup-token
              data-filled={filled ? "true" : "false"}
              aria-hidden="true"
              className={cn(
                "relative z-10 size-7 rounded-full",
                filled ? "pawn-neutral" : "pawn-slot",
                isCurrent && filled && "animate-signup-token-drop",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

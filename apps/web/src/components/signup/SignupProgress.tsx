/**
 * SignupProgress — 4-dot step indicator.
 *
 * Plain neutral dots — no Connect-4 token aesthetic, no brand red/yellow.
 * Filled = bg-foreground, empty = bg-muted. The current step's dot plays a
 * drop-in animation on mount.
 *
 * Step-4 win sequence: a thin connecting line draws across all four dots,
 * then all four pulse in scale. CSS-driven via `data-current="4"` on the
 * wrapper (cascade rules live in globals.css).
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
      className="relative mx-auto w-full max-w-[280px]"
    >
      {/* Step counter */}
      <p className="mb-8 text-center font-mono text-mono-sm uppercase text-muted-foreground">
        {current === 0 ? "00 / 04" : `${String(current).padStart(2, "0")} / 04`}
        {current >= 1 && current <= 4 ? ` — ${STEP_LABELS[current]}` : ""}
      </p>

      {/* Dots + connecting line (line only animates at step 4) */}
      <div className="relative flex items-center justify-between px-2">
        <span
          aria-hidden="true"
          data-signup-line
          className="absolute left-3 right-3 top-1/2 h-px -translate-y-1/2 bg-foreground"
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
                "relative z-10 size-3 rounded-full",
                filled ? "bg-foreground" : "bg-muted",
                isCurrent && filled && "animate-signup-token-drop",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

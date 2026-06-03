import { useState } from "react";
import { playStore } from "~/lib/play-store";
import { cn } from "~/lib/utils";

export function ResignButton() {
  const [isOpen, setIsOpen] = useState(false);

  const handleResign = () => {
    playStore.resign();
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-muted px-4 py-1.5 font-mono text-mono-sm uppercase text-muted-foreground hover:bg-foreground hover:text-background active:scale-[0.98] focus-visible:outline-none focus-visible:bg-foreground focus-visible:text-background cursor-pointer"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
          <line x1="4" y1="22" x2="4" y2="15" />
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        </svg>
        Resign
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-2xl mx-4 flex flex-col gap-4 text-center">
            <div>
              <h3 className="font-display text-3xl font-light italic text-foreground">
                Resign game?
              </h3>
              <p className="mt-2 font-sans text-sm text-muted-foreground">
                Are you sure you want to forfeit? This will count as a loss and your ELO rating will be updated.
              </p>
            </div>
            <div className="flex gap-3 justify-center mt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full bg-muted px-5 py-2 font-mono text-mono-sm uppercase text-muted-foreground hover:bg-foreground hover:text-background transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResign}
                className="rounded-full bg-destructive px-5 py-2 font-mono text-mono-sm uppercase text-destructive-foreground hover:opacity-90 transition-opacity cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

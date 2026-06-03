/**
 * SettingsAppearance — Appearance card of the /settings page.
 *
 * Sections (top to bottom):
 *   1. Theme          Light / Dark / Auto. Drives <html> class +
 *                     localStorage "theme" key via window.__4thewinSetTheme
 *                     (defined inline in RootLayout.astro to share code
 *                     with the TopNav toggle button).
 *   2. Grid skin      Auto-save on change, PUT /api/profile { gridSkin }.
 *   3. Board variant  Frontend-only. No schema column yet — persists to
 *                     localStorage. Backend support deferred to a
 *                     follow-up workstream (see HANDOFF).
 *
 * All three sections are independent — a failed grid-skin save doesn't
 * block theme toggling. Status indicators are inline so each section
 * reads on its own.
 */

import { useEffect, useState, useTransition } from "react";
import { AlertBox } from "~/components/ui/alert-box";
import { cn } from "~/lib/utils";
import {
  ProfileApiError,
  updateProfile,
  type ProfileMe,
} from "~/lib/api/profile";

type Theme = "light" | "dark" | "auto";
type Status = "idle" | "saving" | "saved" | "error";

// Backend allow-list (apps/server/src/routes/users.ts:34). Mirrored in
// SettingsProfile.tsx / Step3Profile.tsx.
const GRID_SKINS = [
  { id: "liquid-glass", label: "Liquid glass", swatchClass: "bg-sky-200 dark:bg-sky-900" },
  { id: "default", label: "Classic", swatchClass: "bg-board" },
] as const;

const THEME_OPTIONS: { id: Theme; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark",  label: "Dark"  },
  { id: "auto",  label: "Auto"  },
];

const PILL_CLS =
  "px-3 py-1 rounded-full font-mono text-mono-sm uppercase border border-border bg-muted text-muted-foreground transition-colors hover:border-foreground hover:bg-foreground/20 hover:text-foreground data-[state=checked]:border-foreground data-[state=checked]:bg-foreground data-[state=checked]:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground";

interface SettingsAppearanceProps {
  initial: ProfileMe;
}

export function SettingsAppearance({ initial }: SettingsAppearanceProps) {
  const [gridSkin, setGridSkin] = useState<string>(initial.gridSkin);
  const [gridStatus, setGridStatus] = useState<Status>("idle");
  const [gridError, setGridError] = useState<string | null>(null);
  const [, startGridTransition] = useTransition();



  return (
    <section
      aria-labelledby="settings-appearance-heading"
      className={cn("rounded-xl border border-border bg-surface text-surface-foreground", "page-reveal p-6 md:p-8")}
      style={{ "--reveal-delay": "0.1s" } as React.CSSProperties}
    >
      <h2 id="settings-appearance-heading" className="font-mono text-mono-md uppercase text-foreground">
        Appearance
      </h2>

      <div className="mt-6 flex flex-col gap-6">
        <ThemeBlock />
        <GridSkinBlock
          value={gridSkin}
          onChange={(next) => {
            const prev = gridSkin;
            setGridSkin(next); // optimistic
            setGridStatus("saving");
            setGridError(null);
            startGridTransition(async () => {
              try {
                await updateProfile({ gridSkin: next });
                setGridStatus("saved");
                setTimeout(() => setGridStatus("idle"), 1500);
              } catch (e) {
                setGridSkin(prev);
                setGridStatus("error");
                setGridError(
                  e instanceof ProfileApiError ? e.message : "Save failed",
                );
              }
            });
          }}
          status={gridStatus}
          error={gridError}
        />

      </div>
    </section>
  );
}

// ─── Theme ────────────────────────────────────────────────────────────

function ThemeBlock() {
  // The window.__4thewin* helpers are set by RootLayout.astro's IIFE;
  // they may not exist in early hydration flashes (very rare) so the
  // typecheck is loose and we fall back to defaults.
  const [theme, setThemeState] = useState<Theme>("auto");

  // Keep the radio in sync with whatever the DOM's authoritative state is.
  // Three sources can change the theme out-of-band from this radio:
  //   1. TopNav's [data-theme-toggle] button (light ↔ dark).
  //   2. The OS-pref listener when the user is in "auto".
  //   3. Another tab on the same domain (storage event, currently unused
  //      but cheap to support).
  // The IIFE dispatches "themechange" on any of these; we re-read the
  // resolved value and patch state. Without this, the radio sticks on
  // whatever the user last clicked here even if the DOM has moved on —
  // e.g. user picks auto, then clicks the TopNav toggle (which forces
  // light/dark) — the radio would still read "auto" until a refresh.
  useEffect(() => {
    function onThemeChange() {
      const get = (window as unknown as { __4thewinGetTheme?: () => string })
        .__4thewinGetTheme;
      if (!get) return;
      const next = get() as Theme;
      setThemeState((prev) => (prev === next ? prev : next));
    }

    // Sync initial state safely on client mount to avoid hydration mismatch
    onThemeChange();

    window.addEventListener("themechange", onThemeChange);
    return () => window.removeEventListener("themechange", onThemeChange);
  }, []);

  function pickTheme(next: Theme) {
    setThemeState(next);
    const set = (window as unknown as { __4thewinSetTheme?: (t: Theme) => void })
      .__4thewinSetTheme;
    if (set) set(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-mono-sm uppercase text-muted-foreground">Theme</p>
      <ul role="radiogroup" aria-label="Theme" className="flex flex-wrap gap-2">
        {THEME_OPTIONS.map((opt) => (
          <li key={opt.id}>
            <button
              type="button"
              role="radio"
              aria-checked={theme === opt.id ? "true" : "false"}
              data-state={theme === opt.id ? "checked" : "unchecked"}
              onClick={() => pickTheme(opt.id)}
              className={PILL_CLS}
            >
              {opt.label}
            </button>
          </li>
        ))}
      </ul>
      <p className="font-mono text-mono-sm uppercase text-muted-foreground">
        Auto follows your system preference
      </p>
    </div>
  );
}

// ─── Grid skin (auto-save) ────────────────────────────────────────────

function GridSkinBlock({
  value,
  onChange,
  status,
  error,
}: {
  value: string;
  onChange: (next: string) => void;
  status: Status;
  error: string | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-mono-sm uppercase text-muted-foreground">Grid skin</p>
      <ul role="radiogroup" aria-label="Grid skin" className="flex flex-wrap gap-2">
        {GRID_SKINS.map((opt) => (
          <li key={opt.id}>
            <button
              type="button"
              role="radio"
              aria-checked={value === opt.id ? "true" : "false"}
              data-state={value === opt.id ? "checked" : "unchecked"}
              onClick={() => value !== opt.id && onChange(opt.id)}
              className={cn(
                PILL_CLS,
                "inline-flex items-center gap-2",
              )}
            >
              <span
                aria-hidden="true"
                className={cn("inline-block size-3 shrink-0 rounded-full", opt.swatchClass)}
              />
              {opt.label}
            </button>
          </li>
        ))}
      </ul>
      {status === "error" ? <AlertBox>{error ?? "Save failed"}</AlertBox> : null}
    </div>
  );
}



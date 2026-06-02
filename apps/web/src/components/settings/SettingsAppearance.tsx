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
// SettingsProfile.tsx — if you add a grid there, add it here too.
const GRID_SKINS = [
  { id: "default", label: "Linen", swatchClass: "bg-grid-linen" },
  { id: "ink",     label: "Ink",   swatchClass: "bg-grid-ink"   },
  { id: "slate",   label: "Slate", swatchClass: "bg-grid-slate" },
] as const;

// Board variants — frontend-only for v1. No schema column yet. Match the
// names in the old .astro mock; the actual visual switching happens
// elsewhere once the Board component reads this preference.
const BOARD_VARIANTS = [
  { id: "liquid-glass", label: "Liquid glass" },
  { id: "default",      label: "Default"      },
  { id: "raised",       label: "Raised"       },
  { id: "wood",         label: "Wood"         },
  { id: "glass",        label: "Glass"        },
  { id: "recessed",     label: "Recessed"     },
] as const;

const THEME_OPTIONS: { id: Theme; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark",  label: "Dark"  },
  { id: "auto",  label: "Auto"  },
];

const PILL_CLS =
  "px-3 py-1 rounded-full font-mono text-mono-sm uppercase border border-border bg-muted text-muted-foreground transition-colors hover:border-foreground hover:bg-foreground/20 hover:text-foreground aria-checked:border-foreground aria-checked:bg-foreground aria-checked:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground";

const BOARD_VARIANT_KEY = "settings.boardVariant";

interface SettingsAppearanceProps {
  initial: ProfileMe;
}

export function SettingsAppearance({ initial }: SettingsAppearanceProps) {
  const [gridSkin, setGridSkin] = useState<string>(initial.gridSkin);
  const [gridStatus, setGridStatus] = useState<Status>("idle");
  const [gridError, setGridError] = useState<string | null>(null);
  const [, startGridTransition] = useTransition();

  const [boardVariant, setBoardVariant] = useState<string>(() => {
    if (typeof window === "undefined") return "liquid-glass";
    return window.localStorage.getItem(BOARD_VARIANT_KEY) ?? "liquid-glass";
  });

  // Re-sync board variant from localStorage when:
  //   1. The window regains focus (user switched back to this tab).
  //   2. The page becomes visible (mobile sleep, tab restore).
  //   3. A "themechange" event fires (any code path that changes the
  //      theme can also clear or re-write the localStorage key as a
  //      side effect of its own bookkeeping — we don't want a
  //      mid-render mismatch if a future change does that).
  // The onClick handler is the only authoritative writer (it also
  // writes to localStorage), so this listener is a re-read safety net
  // — never a writer. Without it, the radio could stick on the
  // default 'liquid-glass' even when the user has saved a different
  // choice in another tab/session, or after a theme change exposes
  // a pre-existing mismatch.
  useEffect(() => {
    function resync() {
      try {
        const stored = window.localStorage.getItem(BOARD_VARIANT_KEY);
        const next = stored ?? "liquid-glass";
        setBoardVariant((prev) => (prev === next ? prev : next));
      } catch (_) {
        // localStorage may be disabled — silently keep the in-memory value.
      }
    }
    window.addEventListener("focus", resync);
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("themechange", resync);
    return () => {
      window.removeEventListener("focus", resync);
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("themechange", resync);
    };
  }, []);

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
        <BoardVariantBlock
          value={boardVariant}
          onChange={(next) => {
            setBoardVariant(next);
            try {
              window.localStorage.setItem(BOARD_VARIANT_KEY, next);
            } catch (_) {
              /* localStorage may be disabled — silently degrade */
            }
          }}
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
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "auto";
    const get = (window as unknown as { __4thewinGetTheme?: () => string })
      .__4thewinGetTheme;
    return (get ? get() : "auto") as Theme;
  });

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
              onClick={() => value !== opt.id && onChange(opt.id)}
              className={cn(
                PILL_CLS,
                // The PILL_CLS doesn't include a flex layout, so the gap-2
                // below would do nothing on a block-level button. inline-flex
                // + items-center keeps the swatch and label on the same line
                // with a real 8px gap (otherwise the dot visually overlaps
                // the first character of the label).
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

// ─── Board variant (localStorage) ────────────────────────────────────

function BoardVariantBlock({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-mono-sm uppercase text-muted-foreground">Board variant</p>
      <ul role="radiogroup" aria-label="Board variant" className="flex flex-wrap gap-2">
        {BOARD_VARIANTS.map((opt) => (
          <li key={opt.id}>
            <button
              type="button"
              role="radio"
              aria-checked={value === opt.id ? "true" : "false"}
              onClick={() => value !== opt.id && onChange(opt.id)}
              className={PILL_CLS}
            >
              {opt.label}
            </button>
          </li>
        ))}
      </ul>
      <p className="font-mono text-mono-sm uppercase text-muted-foreground">
        Frontend only for now — saved on this device
      </p>
    </div>
  );
}

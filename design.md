# 4thewin Landing — Design Reference

> Internal handoff document.
> Source of truth for design intent and locked decisions on the landing page.
> Read this first when resuming a session.

---

## 1. Quick orientation

- **Project**: ft_transcendence (42 Common Core final), 19/19 modules. Web-based Connect 4 / Connect 5 with AI opponent.
- **Working branch**: `kgriset_landing` — origin/kgriset_landing tracks
- **Stack** (locked): Astro 6 SSR + React 19 islands, Tailwind v4 (`@theme` CSS-first), shadcn/ui primitives keyed against our tokens, self-hosted variable fonts.
- **Run**: `pnpm dev:web` (root). Web only — `pnpm dev` parallel will crash if `apps/server/.env` is missing.
- **Build & preview production** (the ONLY way to take clean screenshots — dev's HMR websocket breaks playwright's `networkidle`):
  ```
  pnpm build:web
  pnpm --filter web exec astro preview --host 127.0.0.1 --port 4321
  ```
- **Wireframe / mocks** in `private/`:
  - `screen-backgroundlanding_wireframe.{png,svg}` — the original wireframe
  - `lightmode.html` / `darkmode.html` — extracted **color palette** only (NOT component design — we built our own)

---

## 2. Product hypothesis

The landing page **is the product**, not a marketing brochure for it.

- User arrives → can play Connect 4 vs AI immediately. No signup gate.
- Three regions tell the conversion story:
  - **Left** — AI's brain (you can see it think)
  - **Center** — the game itself
  - **Right** — your would-be place in the world (leaderboard)
- After first game, prompt signup to save result + unlock multiplayer / chat / advanced metrics / friends.
- Anonymous session state tracks the user's running score across multiple games until they sign up.

This is why the leaderboard has a **dashed "your spot" slot** in italic Fraunces below the 5 mock rows — it foreshadows the post-game conversion moment.

---

## 3. Locked decisions

| Topic | Choice | Notes |
|---|---|---|
| Brand mark | `4` in Fraunces italic | Single glyph, used in nav |
| Wordmark | `4thewin` lowercase | One word, gen Z / app-y |
| Display font | **Fraunces** | Variable, full axes (`WONK`, `SOFT`, `opsz`, `wght`). Italic-forward. |
| Body font | **Public Sans** | Workhorse, not Inter (per `frontend-design` skill warning) |
| Mono font | **JetBrains Mono** | Slashed zero, ligatures, "AI lab notebook" voice |
| Default theme | **None enforced** | System preference + toggle; bootstrap before paint |
| Headline transitions | **Subtle** | Fade/replace, no cinematic |
| Footer position | **Above the fold, slim** | Intentional — single-screen interactive product, not marketing |
| Mobile Login | **Hidden** | Shows only Sign-up filled CTA on mobile; Login goes into hamburger menu when wired |

---

## 4. Token contract (lives in `apps/web/src/styles/globals.css`)

All tokens emit Tailwind utilities automatically (`bg-background`, `text-foreground`, etc.). We additionally alias `--color-card` and `--color-popover` to `--color-surface` so future shadcn primitives drop in without renaming.

### 4.1 Light mode (defaults in `@theme`)

| Token | OKLCH | Hex (approx) | Role |
|---|---|---|---|
| `background` | `95.5% 0.012 85` | #f4f1ea | warm linen page bg |
| `foreground` | `28% 0.03 250` | #1f2937 | cool slate ink (only cool element — deliberate counterpoint) |
| `surface` | `100% 0 0` | #ffffff | elevated panel bg |
| `surface-foreground` | `28% 0.03 250` | — | same as foreground |
| `muted` | `91% 0.012 85` | #eae5db | subtle bg (nav pill, inputs) |
| `muted-foreground` | `35% 0.04 25` | warm taupe | secondary text |
| `primary` | `28% 0.03 250` | — | filled CTA bg = ink |
| `primary-foreground` | `95.5% 0.012 85` | — | text on primary = linen |
| `secondary` | `0 0 0 / 0` | transparent | outlined CTA bg |
| `secondary-foreground` | same as foreground | — | text on secondary |
| `accent` | `48% 0.20 25` | #b7102a | brand crimson — link hover, focus, brand moments |
| `accent-foreground` | `100% 0 0` | white | text on accent |
| `destructive` | `50% 0.21 28` | #ba1a1a | error |
| `destructive-foreground` | `100% 0 0` | — | text on destructive |
| `border` | `53% 0.04 25` | #8f6f6e warm taupe | dividers, outlines |
| `input` | `91% 0.012 85` | — | same as muted |
| `ring` | `48% 0.20 25` | — | same as accent (focus ring is crimson) |
| `board` | `56% 0.02 80` | #8b8478 sandstone | board plate |
| `board-cell` | `85% 0.01 85` | #d8d4cd | empty slot |
| `pawn-red` | `42% 0.19 25` | warm crimson | piece — hue intentionally aligned to brand accent (sister color) |
| `pawn-yellow` | `73% 0.16 72` | amber/honey gold | piece — hue distinct from cream bg (85) so it pops |

### 4.2 Dark mode overrides (`.dark { ... }` block)

| Token | OKLCH |
|---|---|
| `background` | `15% 0 0` (deep ink) |
| `foreground` | `96% 0 0` (near-white) |
| `surface` | `20% 0 0` |
| `muted` | `24% 0 0` |
| `muted-foreground` | `70% 0.01 250` (cool gray) |
| `primary` | `96% 0 0` (light, inverted) |
| `accent` | `63% 0.21 25` (glowing red — collapses with pawn-red) |
| `border` | `100% 0 0 / 0.15` (white @ 15% alpha) |
| `board` | `28% 0 0` (dark plate #2a2a2a) |
| `board-cell` | `18% 0 0` (very dark slot) |
| `pawn-red` | `63% 0.21 25` (= accent in dark) |
| `pawn-yellow` | `76% 0.16 85` |

### 4.3 Hue families (intent map)

- **Warm-red family** (hue 22–28): accent, destructive, border, muted-foreground, **pawn-red** (after the hue shift). Brand-coherent spine.
- **Amber family** (hue 72): pawn-yellow alone owns this — the only yellow on the page.
- **Linen / cream family** (hue 80–85): bg, board-cell, board. Page identity.
- **Cool slate** (hue 250): foreground only — the deliberate cool counterpoint.

### 4.4 Pawn shadow stacks (light mode)

Both pawn utilities have:
```css
box-shadow:
  inset 0 -2px 3px oklch(0% 0 0 / 0.18),    /* bottom dome */
  inset 0  1px 1px oklch(100% 0 0 / 0.25),  /* top highlight */
  0     1px 2px oklch(0% 0 0 / 0.15);       /* tiny lift */
```

Mirrors dark mode's bottom inset, swaps the glow for a quiet drop. Pieces read as physical tokens resting on linen, not decals.

Dark mode pieces keep their existing treatment:
```css
box-shadow:
  0 0 12px oklch(63% 0.21 25 / 0.4),  /* glow */
  inset 0 -2px 4px oklch(0% 0 0 / 0.4); /* bottom dome */
```

---

## 5. Typography

Custom `--text-*` tokens in `@theme`:

| Class | Size / line-height | Tracking | Weight | Family | Use |
|---|---|---|---|---|---|
| `text-display` | 120 / 100 | -0.04em | 800 | Fraunces | Big hero (rare) |
| `text-display-mobile` | 64 / 56 | -0.04em | 800 | Fraunces | Mobile hero |
| `text-4xl` / `text-3xl` | tailwind defaults | — | — | Fraunces | Headlines, including game-state Headline |
| `text-base` | 16 / 24 | — | 400 | Public Sans | Body |
| `text-metric` | 24 / 24 | -0.01em | 600 | Public Sans | Telemetry numbers |
| `text-mono-md` | 13 / 20 | 0.05em | 500 | JetBrains Mono | Leaderboard rows |
| `text-mono-sm` | 11 / 16 | 0.1em | 500 | JetBrains Mono | HUD micro-labels |

Headline is `font-display italic font-light tracking-wide` at `text-3xl md:text-4xl` (NOT `text-display` — that's reserved for an even louder hero we haven't used yet). The italic-light Fraunces against muted-foreground gives the editorial kicker feel.

---

## 6. Layout

### 6.1 Grid

- 12-col grid at md+: **AITelemetry (3) / Headline+Board (6) / Leaderboard (3)**
- `gap-gutter` (24 px) between columns, `items-start` so all three columns share the board's top baseline
- **Headline is hoisted above the grid** (centered) — it's not stuck inside the center column. This was important for getting the three columns to share a baseline without the side columns having to "skip past" the headline area.

### 6.2 Side panel widths

- Both panels: **`max-w-[220px]`** + `flex justify-center` on their column wrappers
- AI telemetry content elements all share **184 px** horizontal span:
  - Matrix: `size-4 × 7 + gap-3 × 6 = 184 px`
  - Eval bar: `w-[184px]`
  - Slider: `w-8 + gap-3 + w-32 + ml-1 + w-2 = 32 + 12 + 128 + 4 + 8 = 184`
- Leaderboard: rows fill ~210 px naturally (constraint is "QuantumDrop 2854 94.8%" not truncating)

If matrix dimensions ever change, **all three w-[184px] tokens have to be updated together** — there's a comment in `AITelemetry.tsx` flagging this.

### 6.3 Mobile reflow

Mobile order via `order-N md:order-N` classes:

1. Headline + Board (center column, `order-1`)
2. AITelemetry (`order-2 md:order-1`)
3. Leaderboard (`order-3 md:order-3`)

Page padding: `px-margin-mobile` (20 px) → `md:px-margin-desktop` (64 px). Pill nav has `top-6` so content needs `pt-28` mobile / `md:pt-32` desktop to clear it.

### 6.4 Footer

Slim single-row on desktop (wordmark + copyright on left, 4 placeholder links on right). Stacks vertically on mobile. `mt-16 py-5` — about 60 px tall. The body uses `min-h-svh flex flex-col` and the slot is wrapped in `flex-1` so the footer sticks to the viewport bottom on short pages.

**Above-the-fold visible** is intentional. For a single-screen interactive product (game IS the page, no scroll-y marketing), a slim utility footer is the right call: legal Privacy/Terms reachable instantly, reduces bounce risk, common pattern (Linear / Vercel / Figma product pages).

---

## 7. Component inventory

Each component lives at `apps/web/src/components/` unless noted.

| Component | Tech | Renders | Why |
|---|---|---|---|
| `RootLayout.astro` (in `layouts/`) | Astro | SSR | html shell, theme bootstrap inline `<script is:inline>`, OG/Twitter, skip-link, mounts TopNav + slot + SiteFooter |
| `TopNav.astro` | Astro | SSR | Floating pill at `top-6`. Brand `4` mark, hamburger, ThemeToggle island, Login outlined (hidden on mobile), Sign up filled. **Buttons use `cn(buttonVariants(...), overrides)` directly on `<a>` elements — `<Button asChild><a/></Button>` doesn't merge classes through Astro→Slot.** |
| `ThemeToggle.tsx` | React | `client:only="react"` | Reads `<html>` classList directly; useState initializer is safe under client:only. Listens to `prefers-color-scheme` when localStorage is empty. Sun/Moon icons from lucide. |
| `Headline.astro` | Astro | SSR | `<h2 role="status" aria-live="polite" data-state="...">`. Fraunces italic, font-light, tracking-wide, text-muted-foreground. State map: `your-turn / ai-thinking / you-win / ai-wins / draw / save-spot`. |
| `Board.tsx` | React | SSR-only today (no client:*) | 7×6 grid, `bg-board` plate p-4/5/6 responsive, dots size-9/10/12 responsive. `BoardState` type + `WIREFRAME_BOARD` const exported. ARIA grid + per-cell labels. |
| `AITelemetry.tsx` | React | SSR-only today | Matrix + eval bar + stats + slider. Props-driven (`columnScores`, `columnLandingRows`, `evalRatio`, `stats`, `evalScore`). Two CSS animations (matrix-pulse + sonar-ping on best-move cell). Width contract: 184 px. |
| `Leaderboard.tsx` | React | SSR-only today | 5 mock rows + dashed "your spot" italic-Fraunces slot. Tabular nums (already global on mono). Props: `entries`. |
| `SiteFooter.astro` | Astro | SSR | Slim, single-row at md+. Wordmark + copyright + 4 links. Hover/focus → text-accent. |
| `ui/button.tsx` | React | SSR-only when used directly | shadcn-canonical Button + 4thewin extensions: `variant: brand-filled / brand-outline` (filled-↔-outlined hover dance), `size: pill` (mono uppercase pill). |

### 7.1 Why some are React and some are Astro

- Static markup → Astro (zero JS shipped, faster).
- Interactive (state, event handlers, hooks) → React island.
- React components rendered without `client:*` directive serve as **typed view-models** — they SSR to HTML on the server, ship zero JS, but are ready to switch to `client:load` once they need state. This is the structural win: when Tim's game module lands, we add `client:load` to a wrapping `<GameDemo>` island and the existing components hydrate without a rewrite.

### 7.2 The single React island today

In the rendered HTML there's exactly **one** `<astro-island>`: the ThemeToggle. Everything else is server-rendered HTML.

---

## 8. Animation system

### 8.1 What ships today

| Animation | Where | Cycle | Effect |
|---|---|---|---|
| `matrix-pulse` | every dot in the AI telemetry matrix | 3 s ease-in-out, 200 ms column-stagger | Continuous left-to-right wave — the AI is "scanning columns" |
| `sonar-ping` | best-move cell only | 5 s ease-out | Box-shadow ring radiates outward and fades; the AI re-asserts its answer every 5 s |

Both are CSS-only; both stack cleanly on the same element because `sonar-ping` only touches `box-shadow` while `matrix-pulse` touches `transform` + `opacity`.

Per-cell base opacity is set via inline `--matrix-base-opacity` CSS var; the keyframes multiply that by 0.8 / 1.0 between troughs and peaks. Best-move cell's animation is set via inline `style.animation` because Tailwind's `animate-*` utility only sets a single animation — the brand isn't in `@theme` for stacked animations.

### 8.2 Removed

- **Flicker**: 2 non-candidate cells were getting a brief brightness/scale spike on a 7 s cycle ("dismissed move" semantics). User found it distracting; removed both the keyframe and the JS logic. Documented in case we want it back as a state-driven thing.

### 8.3 Roadmap (intent — discussed but not yet built)

In rough order of value:

1. **State-driven intensity** — when `state === "ai-thinking"`, amp pulse intensity / shorten the cycle / add the lookahead trail (item 3 below). When `state === "your-turn"`, calm idle. Hooks live as TODO comments in `AITelemetry.tsx`.
2. **Score drift** — `columnScores` actually transitions over time (slow CSS `transition: opacity 800ms ease`), the darkest dot can move between columns as the AI re-evaluates. Needs a tiny scheduler or, more naturally, the live worker output from Tim's AI.
3. **Lookahead trail** — sequence of 3–4 cells light up showing the AI's principal variation (you play here → I play here → you play here). Lasts ~1–2 s, then fades. Plays during `AI THINKING…`.
4. **Stats-synced pulse** — pulse speed scales with `Nodes/sec`. Higher number = faster wave. Connects matrix to telemetry.
5. **Drop animation** — when AI commits a move, a piece falls from row 0 of the chosen column to its landing row. CSS `translate-y` keyframe. One-shot. Lives on the **real Board** (the one to the right of the matrix), not the matrix.
6. **Hover preview on Board** — when player hovers a column, a translucent ghost piece appears at the column's landing row. CSS `hover:` works fine until interactivity is wired.
7. **Win-line highlight** — when 4-in-a-row is detected, the four winning cells flash / glow briefly. Sister animation: draw line dimming all cells slightly.

### 8.4 Animations explicitly avoided

- Glow halos in light mode → broke the editorial / paper aesthetic
- Random twinkle / particle systems → too arcade
- Aggressive scale changes on small dots (we tried 0.85 → 1.10, looked staccato; settled on 0.92 → 1.04 with `scale` + opacity stacked)

---

## 9. Backend / AI integration boundaries

Search `TODO(integration)` in `apps/web/src/`:

| File | Hook | Bound to |
|---|---|---|
| `pages/index.astro` | wrap AITelemetry + Board + Leaderboard in `<GameDemo client:load>` island that owns shared game state and emits `game:finished` | Tim's AI module |
| `components/Board.tsx` | `pieces` prop + `onColumnClick`/`onColumnHover` handlers + drop animation | Tim's AI |
| `components/AITelemetry.tsx` | `columnScores` / `columnLandingRows` / `evalRatio` / `stats` / `evalScore` from worker `postMessage` | Tim's AI |
| `components/Leaderboard.tsx` | `GET /api/leaderboard`, replace dashed slot with real row + signup CTA on `game:finished` | Backend (route TBD) + Tim's AI |
| `components/Headline.astro` | `state` prop subscribed to game state machine | Tim's AI |
| `components/TopNav.astro` (Login) | wire to `POST /api/auth/login` (or modal) | Backend |
| `components/TopNav.astro` (Sign up) | wire to `POST /api/auth/signup` (or modal) | Backend |
| `components/TopNav.astro` (hamburger) | replace with shadcn `DropdownMenu`. Mobile menu must include a **Login** entry (the desktop pill exposes Login directly; mobile hides it for breathing room) | UI work |
| `components/SiteFooter.astro` | wire 4 placeholder hrefs to real `/about`, `/how-to-play`, `/privacy`, `/terms` pages | UI + content |

---

## 10. Open product questions

These were discussed but not decided:

1. **AI runs where?** Client-side (WASM minimax in a Web Worker) vs server-side (Socket.io game session per anonymous user). Client-side has lower latency and zero server cost; server-side lets us reuse one engine for landing-AI, lobby-AI, and lobby-PvP. **Tim's call.**

2. **Anonymous session state.** Need a `sessionId` cookie or `localStorage` entry for the running session score / streak so the leaderboard's "your spot" makes sense. On signup, migrate that single completed game into the user's row.

3. **Leaderboard math.** `games.player1Id` is currently `NOT NULL` so anonymous games can't be persisted by the current schema. Two options:
   - Don't persist anonymous games (client-only until signup), then a signed-up user's first game gets recorded as `played_at = first-real-signup-time`.
   - Make `player1Id` nullable + add a sentinel `anonymous` user row.
   Also: **how does an anonymous user's score get a rank?** Need a comparable rating system (ELO from one game is unreliable). Easiest: filter the leaderboard to "best wins vs Hard AI in N moves" or similar single-game ranking — a single game can rank into that.

4. **End-of-game / signup-prompt screen.** The most important UX moment in the funnel — and the screen we have *no design for yet*. The "your spot" dashed slot foreshadows it but the actual transformation is undefined. Likely candidates:
   - Modal over the leaderboard
   - Inline replacement of the dashed slot with a real row + "Save spot — sign up" CTA
   - Full-page swap with the score, stats, and a sign-up CTA
   Conversion-rate decision; should be tested.

5. **Hamburger menu contents.** Mobile-only entries: Login. Likely also: Settings, Help, About, How to play. Login on desktop too? (Argument for: redundant entry, useful when the pill is otherwise crowded. Argument against: confusing duplicate.)

---

## 11. Conventions

### 11.1 Git

- **Conventional commits**: `feat(scope):`, `chore:`, `docs(scope):`, etc.
- **Atomic commits**: each is buildable. The current 4 on `kgriset_landing` follow this.
- **Don't push to main.** Feature branch + PR + review. The branch was once merged via PR #34, then reverted (likely intentional rollback to keep main clean while the branch evolves).
- **AI tooling artifacts gitignored**: `.agents/`, `.factory/skills/`, `.claude/`, `.cursor/`, `.kiro/`, `.windsurf/`, `.continue/`, `.aider*`, `skills-lock.json`. **Don't** untrack `CLAUDE.md` — it's team-shared context.

### 11.2 Code

- TypeScript non-strict (per CLAUDE.md). `request.userId!` non-null assertions OK after auth middleware.
- React 19 ref-as-prop pattern — no `forwardRef`.
- `cn()` from `~/lib/utils` is **extended** with custom font-size keys (`text-display`, `text-mono-sm`, etc.) so tailwind-merge doesn't mistake them for text colors. **If you add new `--text-*` tokens, update `cn`'s extension list** or you'll silently lose color utilities (this exact bug happened — `text-background` got dropped on the Sign-up button).
- Prefer Astro for static markup, React for interactive. Don't wrap whole pages in React.
- shadcn primitives stay canonical — keep CVA + Slot pattern. Custom variants only via the `variants` block.
- File names: kebab-case (per CLAUDE.md).

### 11.3 Visual

- All elements within a side panel **share the same horizontal span** (currently 184 px).
- Interactive states: `transition-all duration-75 ease-linear`, `active:scale-[0.98]`. Snappy, not lazy.
- Focus rings always visible via `--ring` (crimson). Don't disable focus indicators ever.

---

## 12. Anti-patterns we explicitly rolled back

History so we don't re-introduce:

| Decision | Reason for rollback |
|---|---|
| **Inter** as body font | Generic; the loaded `frontend-design` skill explicitly warns against it |
| **Pawn-red hue 35** (orange-leaning) | Off the brand-crimson family at hue 25; pieces felt disconnected from accent |
| **Pawn-yellow hue 90** (greenish) | Only 5° from the bg's hue (85), competed with linen — didn't pop |
| **`md:justify-end` on AI telemetry column** | Wrong direction; user wanted both panels CENTERED in their columns with breathing room around each, not hugging the board edges |
| **`<Button asChild><a/></Button>`** | Astro's `<a>` isn't a real React element when it reaches Radix Slot — props don't merge. Use `cn(buttonVariants(...), "...")` on the `<a>` directly |
| **Random per-cell flicker** (2 dots flashing on 7s cycles) | Distracting; the user explicitly disliked it |
| **Heavy footer** (mt-24 + py-8 + 30 px wordmark) | Too prominent for a single-screen product. Slim version (mt-16 + py-5 + 20 px wordmark) replaces it. |
| **`will-change: transform, opacity` on every dot** | 42 promoted compositor layers; browser auto-optimization is better here |
| **`tailwindcss-animate` package** | Not needed — Tailwind v4 has native `--animate-*` tokens with `@keyframes` inside `@theme` |

---

## 13. Component states yet to design

Reference list — none of these have specs yet:

- **`AI THINKING…`** — Headline state + matrix shifts to a more active animation pattern + maybe the lookahead trail
- **`YOU WIN` / `AI WINS`** — Headline state + winning line highlighted on the Board + score/stats overlay + post-game prompt
- **`DRAW`** — Headline state + neutral end-of-game treatment
- **`SAVE YOUR SPOT?`** — the conversion CTA, see Open Question 4
- **Board hover preview** — translucent ghost piece in the lowest empty cell of the hovered column
- **Board drop animation** — piece falls down a column
- **Win-line highlight** — the four winning cells
- **Connect-5 mode** — when lobby creator picks the variant, board is 6×5 instead of 7×6 (actually the subject says 7×6 default; Connect-5 might be a different grid size — check Tim's spec)
- **AI difficulty selector** — easy / medium / hard (stub on landing? or only in lobbies?)

---

## 14. Resuming a new session — checklist

1. **Branch check**: `git branch --show-current` should be `kgriset_landing`. If on main, `git checkout kgriset_landing`.
2. **Read this file** + `apps/web/README.md` (which has the integration table for collaborators).
3. **Visual reference**: `private/screen-backgroundlanding_wireframe.png`.
4. **Run**: `pnpm dev:web`, open `http://localhost:4321`.
5. **For screenshots**: production preview only (`pnpm build:web` → `pnpm --filter web exec astro preview --port 4321`). Dev mode's HMR websocket breaks playwright's `networkidle` wait.
6. **Loaded skills** (project-level via `npx skills add`, in `.agents/skills/`):
   - `frontend-design` (Anthropic) — overall aesthetic vision, font and palette warnings
   - `tailwind-design-system` (wshobson) — Tailwind v4 `@theme` patterns, CVA, React 19 ref-as-prop
   - `web-design-guidelines` (Vercel) — a11y / UX audit ruleset
   - `vercel-composition-patterns`, `vercel-react-best-practices`, `shadcn` — for component implementation
7. **Where stuff lives**:
   - Design tokens + animations: `apps/web/src/styles/globals.css`
   - Layout shell: `apps/web/src/layouts/RootLayout.astro`
   - Page composition: `apps/web/src/pages/index.astro`
   - Components: `apps/web/src/components/`
   - shadcn primitives: `apps/web/src/components/ui/`
   - Path alias: `~/*` → `src/*`
8. **TODO inventory**: `grep -rE 'TODO\(integration\)' apps/web/src` — 9 hook points across 7 files for backend / AI wiring.

---

## 15. User preferences observed (style guide for me)

- Direct, technical, no fluff. Match the user's tone.
- When discussing design, **structured questions** with lettered options work well. The user picks letters fluently.
- Prefer **diff-style** explanations when changes touch a few lines.
- After implementing, **screenshot via the production preview server** (not dev) and read back the images so the user has visual confirmation.
- The user prefers **a few focused options** over an overwhelming brainstorm — 3–4 well-distinguished directions, each with a tradeoff explanation.
- The user pushes back when something feels off ("bigger", "more breathing", "broken", "I don't like X"); take those as the prompt to dig into root cause, not patch.

---

## 16. Last-known state of the work (May 19 2026)

- Branch: `kgriset_landing`, ahead of `origin/kgriset_landing` by **1 uncommitted change** (the latest pawn hue shifts). Build green.
- Last commit on origin: `d8c48f3 docs(web): replace Astro starter README with project docs`
- Currently uncommitted: pawn-red hue 35 → 25, pawn-yellow hue 90 → 72, plus the inset+drop shadow stack added earlier (those landed locally, also uncommitted).
- Pending: commit the pawn-color refinements with a `feat(web):` or `chore(web):` message; push.

---

End of file. Update this when locked decisions change or new components ship.

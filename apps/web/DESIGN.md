# 4thewin Landing — Design Reference

> Source of truth for design intent and locked decisions on the landing page.
> Read this first when resuming a session.

---

## 1. Quick orientation

- **Project**: ft_transcendence (42 Common Core final), 19/19 modules. Web-based Connect 4 / Connect 5 with AI opponent.
- **Working branch**: `kgriset_landing`. Force-rebased on `origin/main` (which absorbed Vault, ModSecurity, Tim's game engine, Senshy's cybersec) — 7 of our commits cleanly layered on top of `f596375`.
- **Stack** (locked): Astro 6 SSR + React 19 islands, Tailwind v4 (`@theme` CSS-first), shadcn/ui primitives keyed against our tokens, self-hosted variable fonts.
- **Run**: `pnpm dev:web` (root). Web-only — `pnpm dev` parallel will crash if `apps/server/.env` is missing.
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
- Anonymous session state tracks the user's running score across multiple games until they sign up. **Server-authoritative** — see §10.

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
| Anonymous play state | **Server-authoritative** | Demo result lives only on the server (cookie-keyed session). Client never reports its own score. |

---

## 4. Token contract (lives in `apps/web/src/styles/globals.css`)

All tokens emit Tailwind utilities automatically. shadcn-canonical names (`--card`, `--popover`, `--card-foreground`, `--popover-foreground`) are aliased to `--surface` so primitives drop in without renaming.

### 4.1 Light mode (defaults in `@theme`)

| Token | OKLCH | Role |
|---|---|---|
| `background` | `95.5% 0.012 85` | warm linen page bg |
| `foreground` | `28% 0.03 250` | cool slate ink (only cool element — deliberate counterpoint) |
| `surface` | `100% 0 0` | elevated panel bg (cards, modals) |
| `surface-foreground` | `28% 0.03 250` | same as foreground |
| `muted` | `91% 0.012 85` | subtle bg (nav pill, inputs) |
| `muted-foreground` | `35% 0.04 25` | warm taupe secondary text |
| `primary` | `28% 0.03 250` | filled CTA bg = ink |
| `primary-foreground` | `95.5% 0.012 85` | text on primary = linen |
| `secondary` | `0 0 0 / 0` | transparent (outlined CTA bg) |
| `accent` | `48% 0.20 25` | brand crimson — link hover, focus, brand moments |
| `accent-foreground` | `100% 0 0` | text on accent |
| `destructive` | `50% 0.21 28` | error |
| `border` | `53% 0.04 25` | warm taupe (#8f6f6e) |
| `input` | `91% 0.012 85` | same as muted |
| `ring` | `48% 0.20 25` | same as accent (focus ring is crimson) |
| `board` | `56% 0.02 80` | sandstone plate (#8b8478) |
| `board-cell` | `85% 0.01 85` | empty slot (#d8d4cd) |
| `pawn-red` | `42% 0.19 25` | warm crimson — sister to brand accent (same hue 25) |
| `pawn-yellow` | `73% 0.16 72` | editorial amber gold — distinct hue from cream bg |

### 4.2 Dark mode overrides (`.dark { … }`)

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
| `board` | `28% 0 0` (#2a2a2a) |
| `board-cell` | `18% 0 0` (very dark slot) |
| `pawn-red` | `63% 0.21 25` (= accent in dark) |
| `pawn-yellow` | `76% 0.16 85` |

### 4.3 Hue families (intent map)

- **Warm-red family** (hue 22–28): accent, destructive, border, muted-foreground, **pawn-red** (post-shift). Brand-coherent spine.
- **Amber family** (hue 72): pawn-yellow alone owns this — the only yellow on the page.
- **Linen / cream family** (hue 80–85): bg, board-cell, board.
- **Cool slate** (hue 250): foreground only — the deliberate cool counterpoint.

### 4.4 Pawn shadow stacks

**Light mode** (added because flat-color discs read as decals on the linen):
```css
box-shadow:
  inset 0 -2px 3px oklch(0% 0 0 / 0.18),    /* dark crescent at bottom — dome */
  inset 0  1px 1px oklch(100% 0 0 / 0.25),  /* highlight at top */
  0     1px 2px oklch(0% 0 0 / 0.15);       /* tiny lift, like a paper token resting on linen */
```

**Dark mode** (kept):
```css
box-shadow:
  0 0 12px oklch(63% 0.21 25 / 0.4),         /* glow halo */
  inset 0 -2px 4px oklch(0% 0 0 / 0.4);      /* bottom dome */
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

Headline (game-state kicker above the board) uses `font-display italic font-light tracking-wide` at `text-3xl md:text-4xl` against `text-muted-foreground`. Editorial register, NOT `text-display` (that's reserved for an even louder hero we haven't used yet).

**`tailwind-merge` extension** (`apps/web/src/lib/utils.ts`): the custom `text-display`, `text-display-mobile`, `text-metric`, `text-mono-sm`, `text-mono-md` tokens are explicitly registered as font-size utilities. Without this, twMerge classifies them as text-color utilities by default and silently drops conflicting actual color classes (e.g. `text-background` on filled buttons goes invisible). **If you add new `--text-*` tokens, update the cn() extension list.**

---

## 6. Layout

### 6.1 Landing page grid

- 12-col grid at md+: **AITelemetry (3) / Headline+Board (6) / Leaderboard (3)**
- `gap-gutter` (24 px) between columns, `items-start` so all three columns share the board's top baseline
- **Headline is hoisted above the grid** (centered) — it's not stuck inside the center column.

### 6.2 Side panel widths

- Both panels: `max-w-[220px]` + `flex justify-center` on their column wrappers
- AI telemetry content elements all share **184 px** horizontal span:
  - Matrix: `size-4 × 7 + gap-3 × 6 = 184 px`
  - Eval bar: `w-[184px]`
  - Slider: `w-8 + gap-3 + w-32 + ml-1 + w-2 = 32 + 12 + 128 + 4 + 8 = 184`
- Leaderboard rows fill ~210 px naturally

If matrix dimensions change, **all three w-[184px] tokens must be updated together** — comment in `AITelemetry.tsx` flags this.

### 6.3 Mobile reflow

Mobile order via `order-N md:order-N` classes:

1. Headline + Board (center column, `order-1`)
2. AITelemetry (`order-2 md:order-1`)
3. Leaderboard (`order-3 md:order-3`)

Page padding: `px-margin-mobile` (20 px) → `md:px-margin-desktop` (64 px). Pill nav has `top-6` so content needs `pt-28` mobile / `md:pt-32` desktop to clear it.

### 6.4 Footer

Slim single-row on desktop (wordmark + copyright + 4 links). Stacks on mobile. `mt-16 py-5` — about 60 px tall. Body uses `min-h-svh flex flex-col`, slot wrapped in `flex-1` so footer sticks to viewport bottom on short pages.

**Above-the-fold visible** is intentional. For a single-screen interactive product, slim utility footer is the right call.

### 6.5 Signup card

`/signup` route uses `SignupShell.astro`: max-w-md (~448 px) centered card on the warm linen page. RootLayout (pill nav + footer) still works.

- Progress tracker sits ABOVE the card with `gap-10` separation (40 px between progress and card)
- `mb-8` between the step counter ("01 / 04 — SAVE") and the dots
- Card: `bg-surface border-border rounded-xl shadow-sm p-6 md:p-8`
- Headlines inside the card: `text-3xl` only (NOT `md:text-4xl`) — fits the 448 px card width

---

## 7. Component inventory

| Component | Tech | Renders | Why |
|---|---|---|---|
| `RootLayout.astro` (in `layouts/`) | Astro | SSR | html shell, theme bootstrap inline `<script is:inline>`, OG/Twitter, skip-link, mounts TopNav + slot + SiteFooter |
| `TopNav.astro` | Astro | SSR | Floating pill at `top-6`. Brand `4` mark, hamburger, ThemeToggle island, Login outlined (hidden on mobile), Sign up filled. Buttons use `cn(buttonVariants(...), overrides)` directly on `<a>` elements — `<Button asChild><a/></Button>` doesn't merge classes through Astro→Slot. |
| `ThemeToggle.tsx` | React | `client:only="react"` | Reads `<html>` classList directly. Listens to `prefers-color-scheme` when localStorage is empty. |
| `Headline.astro` | Astro | SSR | `<h2 role="status" aria-live="polite" data-state="...">`. State map for game-state labels. |
| `Board.tsx` | React | SSR-only today (no client:*) | 7×6 grid. `BoardState` type + `WIREFRAME_BOARD` const exported. ARIA grid + per-cell labels. |
| `AITelemetry.tsx` | React | SSR-only today | Matrix + eval bar + stats + slider. Props-driven. Two CSS animations (matrix-pulse + sonar-ping on best-move cell). |
| `Leaderboard.tsx` | React | SSR-only today | 5 mock rows + dashed "your spot" italic-Fraunces slot. |
| `SiteFooter.astro` | Astro | SSR | Slim, single-row at md+. |
| `ui/button.tsx` | React | SSR-only when used directly | shadcn Button + 4thewin extensions: `variant: brand-filled / brand-outline`, `size: pill`. |
| `ui/input.tsx` | React | SSR-only | shadcn Input (token-keyed, aria-invalid drives error styling). |
| `ui/label.tsx` | React | SSR-only | shadcn Label. |
| `signup/SignupShell.astro` | Astro | SSR | 4-step signup card layout. |
| `signup/SignupProgress.tsx` | React | `client:load` | 4 plain neutral dots (bg-foreground filled / bg-muted empty). Drop-in animation on current step. At step 4, line draws + token flash via `[data-current="4"]` cascade. |
| `signup/Step1Save.astro` | Astro | SSR | Carry-over story (generic copy until anon-session backend lands) + email/42 method picker. |
| `signup/Step2Credentials.tsx` | React | `client:load` | email / username / password form. Live username availability via `GET /api/users/check-username`, password reveal toggle, 4-segment strength indicator, useTransition for submit. |
| `signup/Step3Profile.tsx` | React | `client:load` | Avatar (drag/click + preview), bio (160 char), placeholder skin pickers. PUT /api/profile + POST /api/profile/avatar. Skippable. |
| `signup/Step4Welcome.astro` | Astro | SSR | Three CTAs all routing to `/play` for now. |

### 7.1 Why some are React and some are Astro

- Static markup → Astro (zero JS shipped, faster).
- Interactive (state, event handlers, hooks) → React island.
- React components rendered without `client:*` directive serve as **typed view-models** — they SSR to HTML on the server, ship zero JS, but are ready to switch to `client:load` once they need state. Tim's `<GameDemo>` island (when wired) just adds `client:load` to wrappers around AITelemetry/Board/Leaderboard.

### 7.2 Islands today

In the rendered home page HTML there's exactly **one** `<astro-island>`: the ThemeToggle. Everything else SSR. The signup form pages each add 1–2 more islands (SignupProgress + the active step).

---

## 8. Animation system

### 8.1 Landing page (telemetry)

| Animation | Where | Cycle | Effect |
|---|---|---|---|
| `matrix-pulse` | every dot in the AI telemetry matrix | 3 s ease-in-out, 200 ms column-stagger | Continuous left-to-right wave |
| `sonar-ping` | best-move cell only | 5 s ease-out | `box-shadow` ring radiates outward and fades |

Both CSS-only; both stack cleanly on the same element (sonar only touches `box-shadow`, matrix touches `transform`/`opacity`). Per-cell base opacity set via inline `--matrix-base-opacity` CSS var.

**Removed**: per-cell flicker (was distracting; user explicitly disliked it).

### 8.2 Signup progress tracker

- `signup-token-drop` — 380 ms cubic-bezier with overshoot. Plays on the current step's token each render. Mimics a Connect 4 piece dropping into place (without the Connect-4 token aesthetic — just plain `bg-foreground` dots).
- `signup-line-draw` — 560 ms ease-out. Only fires when `data-current="4"` is set on the wrapper. The line connecting all 4 dots is `bg-foreground` (height 1 px).
- `signup-token-flash` — 700 ms ease-in-out. Same `data-current="4"` cascade. Synchronized scale pulse (1 → 1.25 → 1) on all four filled dots. NO color glow — neutral palette per design decision.
- Sequencing: drop (350 ms) → line-draw starts at +380 ms → token-flash at +980 ms. ~1.6 s total. Pure CSS via animation-delay on the cascade rules.

### 8.3 Roadmap (intent — discussed but not yet built, in rough order of value)

1. **State-driven intensity** — when `state === "ai-thinking"`, amp pulse intensity / shorten cycle / add lookahead trail. When `state === "your-turn"`, calm idle.
2. **Score drift** — `columnScores` actually transitions over time (slow CSS `transition: opacity 800ms ease`); the darkest dot can move between columns as the AI re-evaluates.
3. **Lookahead trail** — sequence of 3–4 cells light up showing the AI's principal variation. Plays during `AI THINKING…`.
4. **Stats-synced pulse** — pulse speed scales with `Nodes/sec`.
5. **Drop animation** on the real Board — when AI commits a move, piece falls from row 0 of the chosen column. CSS `translate-y` keyframe.
6. **Hover preview on Board** — translucent ghost piece in the lowest empty cell of the hovered column.
7. **Win-line highlight** — the four winning cells flash / glow briefly.

### 8.4 Animations explicitly avoided

- Glow halos in light mode → broke editorial / paper aesthetic
- Random twinkle / particle systems → too arcade
- Aggressive scale changes on small dots (we tried 0.85 → 1.10, looked staccato; settled on 0.92 → 1.04)

---

## 9. Backend integration boundaries

Search `TODO(integration)` and `CHUNK B:` in `apps/web/src/`:

| Hook | Status | Bound to |
|---|---|---|
| `pages/index.astro` — wrap AITelemetry + Board + Leaderboard in `<GameDemo client:load>` | Pending (Chunk B) | Tim's AI module |
| `Board.tsx` — pieces prop, `onColumnClick`/`onColumnHover`, drop animation | Pending (Chunk B) | Tim's AI |
| `AITelemetry.tsx` — bind columnScores / stats / evalRatio to AI worker | Pending (Chunk B) | Tim's AI |
| `Leaderboard.tsx` — `GET /api/leaderboard` + replace dashed slot with real row on `game:finished` | Pending | Backend route TBD |
| `Headline.astro` — `state` prop subscribed to game state machine | Pending (Chunk B) | Tim's AI |
| `TopNav.astro` (Login button) | Pending | Backend route exists; needs frontend wiring or modal |
| `TopNav.astro` (hamburger) | Pending | Replace with shadcn `DropdownMenu`; mobile menu must include Login |
| `SiteFooter.astro` (placeholder hrefs) | Pending | Build `/about`, `/how-to-play`, `/privacy`, `/terms` pages |
| **Step1Save.astro — carry-over rank/rating** | **Pending (Chunk B)** | New `GET /api/anon/session/me` endpoint |
| **Step2Credentials.tsx — username availability** | **✅ Wired (Chunk A)** | `GET /api/users/check-username` |
| **Step2Credentials.tsx — signup submit** | **✅ Wired** | `POST /api/auth/signup` (existing) |
| **Step3Profile.tsx — bio + skins + avatar** | **✅ Wired** | `PUT /api/profile` + `POST /api/profile/avatar` (existing) |
| **Step1Save 42 OAuth** | **✅ Wired (Chunk A)** | `GET /api/auth/42?intent=signup` → callback redirects new accounts to `/signup?step=3` |

---

## 10. Open product questions

1. **AI runs where?** Client-side (WASM minimax in a Web Worker) vs server-side. Tim's call. **Decision: server-side** (matches the security stance for anonymous play; one engine for landing-AI, lobby-AI, lobby-PvP).

2. **Anonymous session state.** **Decision (locked): server-authoritative.** Demo result lives only on the server. Anonymous user gets an `anon_session=<random_id>` cookie on first visit; games persist with that session id; on signup completion, server reattributes them to the new user. Client never reports its own score. **This is Chunk B work.**

3. **Leaderboard math.** `games.player1Id` is currently `NOT NULL`. For Chunk B: make `player1_id` nullable + add `anon_session_id` column (or parallel `anon_games` table — Tim's call).

   How does an anonymous user's score get a rank? Filter the leaderboard to "best wins vs Hard AI in N moves" or similar single-game ranking — a single game can rank into that. Avoids needing full ELO.

4. **End-of-game / signup-prompt screen.** The most important UX moment in the funnel — and the screen we have *no design for yet*. The "your spot" dashed slot foreshadows it but the actual transformation is undefined. Likely candidates:
   - Modal over the leaderboard
   - Inline replacement of the dashed slot with a real row + "Save spot — sign up" CTA
   - Full-page swap with the score, stats, and a sign-up CTA

5. **Hamburger menu contents.** Mobile-only entries: Login. Likely also: Settings, Help, About, How to play.

---

## 11. Conventions

### 11.1 Git

- **Conventional commits**: `feat(scope):`, `chore:`, `docs(scope):`, etc.
- **Atomic commits**: each is buildable. Current 7 commits on `kgriset_landing` follow this.
- **Don't push to main.** Feature branch + PR + review.
- **AI tooling artifacts gitignored**: `.agents/`, `.factory/skills/`, `.claude/`, `.cursor/`, `.kiro/`, `.windsurf/`, `.continue/`, `.aider*`, `skills-lock.json`. **Don't** untrack `CLAUDE.md` — it's team-shared context.
- **Force-push**: `--force-with-lease` only, on feature branches only. Was used to land the rebase against latest main (which had a revert of our PR #34 in its history).

### 11.2 Code

- TypeScript non-strict (per CLAUDE.md). `request.userId!` non-null assertions OK after auth middleware.
- React 19 ref-as-prop pattern — no `forwardRef`.
- `cn()` from `~/lib/utils` is **extended** with custom font-size keys (see §5).
- Prefer Astro for static markup, React for interactive. Don't wrap whole pages in React.
- shadcn primitives stay canonical — keep CVA + Slot pattern. Custom variants only via the `variants` block.
- File names: kebab-case (per CLAUDE.md).

### 11.3 Visual

- All elements within a side panel **share the same horizontal span** (currently 184 px).
- Interactive states: `transition-all duration-75 ease-linear`, `active:scale-[0.98]`.
- Focus rings always visible via `--ring` (crimson). Don't disable focus indicators.

---

## 12. Anti-patterns we explicitly rolled back

| Decision | Reason |
|---|---|
| **Inter** as body font | Generic; the loaded `frontend-design` skill explicitly warns against it |
| **Pawn-red hue 35** (orange-leaning) | Off the brand-crimson family at hue 25 |
| **Pawn-yellow hue 90** (greenish) | Only 5° from the bg's hue (85), competed with linen |
| **`md:justify-end` on AI telemetry column** | Wrong direction; user wanted both panels CENTERED in their columns |
| **`<Button asChild><a/></Button>`** | Astro's `<a>` isn't a real React element when it reaches Radix Slot — props don't merge. Use `cn(buttonVariants(...), "...")` on the `<a>` directly |
| **Random per-cell flicker** (2 dots flashing on 7s cycles) | Distracting; user explicitly disliked it |
| **Connect-4 token aesthetic on signup progress** (`pawn-red` shadow stack on dots) | User wanted neutral palette for the progress tracker. Plain `bg-foreground` only. |
| **Connecting line during signup steps 1–3** | User wanted the line to ONLY appear at step 4 as part of the connect-4 win flash — payoff moment, not background plumbing |
| **Heavy footer** (mt-24 + py-8 + 30 px wordmark) | Too prominent for a single-screen product |
| **`will-change: transform, opacity` on every dot** | 42 promoted compositor layers; browser auto-optimization is better |
| **Client-side anonymous demo state (localStorage)** | Trivial cheat surface; **server-authoritative is the locked choice** |
| **Stats-synced animation on landing right now** | Premature optimization; wait for AI module to land |
| **`client:only` for purely visual UI elements** | Causes hydration flicker on every page refresh — the SSR slot is empty, the React island paints in late, the surrounding layout reflows. ThemeToggle was the canary (May 22). See §17 for the rule. |
| **Continuous column-wave animation on the AI telemetry matrix** (`animate-matrix-pulse` on every dot with 200 ms column stagger) | On page refresh the cells started in their trough state and animated up with staggered delays, which read as a visible "wave" of dimmer→brighter columns. Removed (May 22). The sonar ping on the best-move cell stays — that's enough beat. |

---

## 17. Frontend lessons learned

Patterns to follow + traps that have already cost us time.

### 17.1 Don't use `client:only` for purely visual UI

**Trap.** A React island declared with `client:only="react"` renders **nothing** at SSR. The first paint shows an empty slot; the React component appears only after hydration. For anything visual (icons, decorative elements, badges, indicators), this produces a visible flicker on every refresh — and if the surrounding layout is content-driven (`w-auto`, flex-content widths), the entire layout reflows when the island appears.

**Examples that hit this in this project.**
- `ThemeToggle` (May 22): Moon/Sun icons popped in on every refresh, AND the floating pill nav grew by ~36 px when the toggle hydrated.

**The rule.** Anything that has a stable, deterministic visual representation should render at SSR. Reach for `client:only` only when the component **fundamentally cannot** SSR — e.g., when it must read live `document` state during its first render and no equivalent exists server-side.

**The fix when you do need theme-dependent UI.** Render both states in the SSR HTML and let CSS pick which one shows:
```astro
<svg class="size-4 dark:hidden">…moon…</svg>
<svg class="hidden size-4 dark:block">…sun…</svg>
```
Pair with the inline theme bootstrap in `RootLayout.astro` — that script runs synchronously before paint, sets `<html class="dark|light">`, so the right icon is visible from frame 0. For interactivity, use a delegated event listener on `document` inside the same inline script (see RootLayout for the pattern with `[data-theme-toggle]`). No React island, no hydration delay, no flicker.

**When `client:load` is the right call instead.** When the component owns real interactive state (form fields with validation, a dropdown menu, a dialog) and you need React for the UX. Server renders a placeholder; the React island hydrates and takes over. Layout-wise, make sure the SSR placeholder occupies the same dimensions the hydrated component will (otherwise you still get a layout shift, just for a different reason).

### 17.2 If you must use a `client:only` island, reserve its space at SSR

If you've decided `client:only` is genuinely necessary, wrap the slot in a SSR-rendered container with explicit dimensions matching what the React component will produce. The pill nav had this band-aid for a moment (`<div class="size-9 shrink-0">`) before we moved to the proper SSR fix. Layout shifts are eliminated even if the visual is still empty for a frame.

### 17.3 The cn() utility's tailwind-merge extension is load-bearing

`apps/web/src/lib/utils.ts` extends `tailwind-merge` to know about our custom font-size tokens (`text-display`, `text-mono-sm`, etc.). Without that registration, `tailwind-merge` classifies them as text-color utilities and silently drops conflicting actual color classes. The Sign-up button rendered with invisible text for ~30 minutes before we found this. **If you add a new `--text-*` token, add it to the `cn()` extension list.**

---

## 13. Component states yet to design

- **`AI THINKING…`** — Headline state + matrix shifts to a more active animation pattern + maybe lookahead trail
- **`YOU WIN` / `AI WINS`** — Headline state + winning line highlighted on Board + score/stats overlay + post-game prompt
- **`DRAW`** — Headline state + neutral end-of-game treatment
- **`SAVE YOUR SPOT?`** — the conversion CTA (see Open Question 4)
- **Board hover preview** — translucent ghost piece in lowest empty cell of hovered column
- **Board drop animation** — piece falls down column
- **Win-line highlight** — the four winning cells
- **Connect-5 mode** — variant swap (board geometry TBD per Tim's spec)
- **AI difficulty selector** — easy / medium / hard (stub on landing? or only in lobbies?)

---

## 14. Resuming a new session — checklist

1. **Branch check**: `git branch --show-current` should be `kgriset_landing`. If on main, `git checkout kgriset_landing`. Last known HEAD: `15b8250 feat: wire signup against backend (Chunk A)`.
2. **Read this file** + `apps/web/README.md` (which has the integration table for collaborators).
3. **Visual reference**: `private/screen-backgroundlanding_wireframe.png`.
4. **Run**: `pnpm dev:web`, open `http://localhost:4321`.
5. **For screenshots**: production preview only (`pnpm build:web` → `pnpm --filter web exec astro preview --port 4321`). Dev mode's HMR websocket breaks playwright's `networkidle` wait.
6. **Loaded skills** (project-level via `npx skills add`, in `.agents/skills/`):
   - `frontend-design` (Anthropic) — overall aesthetic vision
   - `tailwind-design-system` (wshobson) — Tailwind v4 `@theme` patterns, CVA, React 19 ref-as-prop
   - `web-design-guidelines` (Vercel) — a11y / UX audit ruleset
   - `vercel-composition-patterns`, `vercel-react-best-practices`, `shadcn`
7. **Where stuff lives**:
   - Design tokens + animations: `apps/web/src/styles/globals.css`
   - Layout shell: `apps/web/src/layouts/RootLayout.astro`
   - Landing page: `apps/web/src/pages/index.astro`
   - Signup flow: `apps/web/src/pages/signup.astro` + `apps/web/src/components/signup/`
   - shadcn primitives: `apps/web/src/components/ui/` (button, input, label)
   - Path alias: `~/*` → `src/*`
8. **TODO inventory**: `grep -rE 'TODO\(integration\)|CHUNK B:' apps/web/src` — pending hooks for Chunk B.

---

## 15. User preferences observed (style guide for me)

- Direct, technical, no fluff. Match the user's tone.
- When discussing design, **structured questions** with lettered options work well. The user picks letters fluently.
- Prefer **diff-style** explanations when changes touch a few lines.
- After implementing, **screenshot via the production preview server** (not dev) and read back the images.
- The user prefers **a few focused options** over an overwhelming brainstorm — 3–4 well-distinguished directions, each with a tradeoff explanation.
- The user pushes back when something feels off ("bigger", "more breathing", "broken", "I don't like X"); take those as the prompt to dig into root cause, not patch.
- **Security mindset**: the user catches things like "client-side score persistence is a cheat surface" before I do. Never trust the client for game state.

---

## 16. Last-known state of the work (May 22 2026)

- Branch: `kgriset_landing`. Force-rebased onto latest `origin/main` (which had absorbed Vault, ModSecurity, Tim's game engine, Senshy's cybersec). 7 of our commits cleanly layered on top of `f596375`.
- Last commit: `15b8250 feat: wire signup against backend (Chunk A)` — pushed to `origin/kgriset_landing`.
- **Chunk A complete + pushed:** signup wiring against the real backend.
  - Backend: `GET /api/users/check-username` (unauth, narrow surface). OAuth `state` parameter (CSRF) + `intent` cookie + conditional callback redirect for signup-mode.
  - Frontend: `Step2Credentials` switched to the new endpoint. `Step1Save` shows generic "save your progress" copy until anon-session backend lands. 42 OAuth button passes `?intent=signup`.
  - `apps/server/API.md` updated.
- **Chunk B not started:** anonymous demo play loop (server-side game state, schema migration for nullable `games.player1_id` + `anon_session_id` column, anonymous Socket.io support, AI loop wiring through Socket.io, `GET /api/anon/session/me`, reattribution on signup). Cross-cuts auth (Rayane) + games schema (Tim). Search for `CHUNK B:` markers (currently in `Step1Save.astro`) for hook points.
- **Pending integrations not in any chunk yet**: Login modal/page, hamburger DropdownMenu with mobile Login entry, SiteFooter inner pages (`/about` + `/how-to-play` + `/privacy` + `/terms`), real leaderboard data, end-of-game/signup-prompt screen design.
- **Smoke test reminder**: dev's HMR websocket breaks playwright's `networkidle` — always use `pnpm build:web && pnpm --filter web exec astro preview` for screenshots.

---

End of file. Update this when locked decisions change or new components ship.

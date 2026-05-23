# 4thewin — Design system

Reference for tokens, components, and patterns. Live preview at **`/styleguide`**.

> If this document and the styleguide page disagree, the styleguide is right (it renders production code). Open a PR to fix this doc.

## Table of contents

| § | Section |
|---|---|
| 0  | [How to use this document](#0-how-to-use-this-document) |
| 1  | [Foundations](#1-foundations) — color, typography, spacing, motion |
| 2  | [Primitives](#2-primitives) — Button, Input, FormField, Label, AlertBox |
| 3  | [Patterns](#3-patterns) — form, card, pawn utilities |
| 4  | [Layout](#4-layout) — page shell, landing grid, signup card |
| 5  | [Domain components](#5-domain-components) — landing, signup, auth |
| 6  | [Animation system](#6-animation-system) |
| 7  | [Backend integration boundaries](#7-backend-integration-boundaries) |
| 8  | [Locked decisions](#8-locked-decisions) |
| 9  | [Anti-patterns we explicitly rolled back](#9-anti-patterns-we-explicitly-rolled-back) |
| 10 | [Frontend lessons learned](#10-frontend-lessons-learned) |
| 11 | [Conventions](#11-conventions) |
| 12 | [What's NOT in the system](#12-whats-not-in-the-system) |

---

## 0. How to use this document

- **Looking for a visual?** Open `/styleguide`. Every token, primitive, and pattern is rendered there with all states.
- **Looking for the canonical name of a token?** §1.
- **Looking for a primitive's API?** §2.
- **Looking for why something is the way it is?** §8 (Locked decisions) and §9 (Anti-patterns).
- **Adding a new component?** §11 has the conventions. Update §2/§3 in the same PR.
- **Adding a new color/font/animation?** §1 must be updated AND `/styleguide` should auto-show it (verify by hitting `/styleguide`).

This document is the **what + why**. The **how** lives in code.

---

## 1. Foundations

Tokens defined in `apps/web/src/styles/globals.css` `@theme` block. shadcn-canonical aliases (`--card`, `--popover`, `--card-foreground`, `--popover-foreground`) point to `--surface` so primitives drop in unmodified.

### 1.1 Color tokens

**Light mode defaults** in the `@theme` block; `.dark { … }` overrides them per-token.

| Token | Light OKLCH | Dark OKLCH | Role |
|---|---|---|---|
| `background` | `95.5% 0.012 85` | `15% 0 0` | page bg (linen / deep ink) |
| `foreground` | `28% 0.03 250` | `96% 0 0` | primary text (slate / near-white) |
| `surface` | `100% 0 0` | `20% 0 0` | raised cards, modals |
| `muted` | `91% 0.012 85` | `24% 0 0` | subtle bg fills (nav pill, inputs) |
| `muted-foreground` | `35% 0.04 25` | `70% 0.01 250` | secondary text |
| `border` | `53% 0.04 25` | `100% 0 0 / 0.15` | hairline strokes |
| `accent` | `48% 0.20 25` | `63% 0.21 25` | brand crimson — focus, links, CTAs |
| `destructive` | `50% 0.21 28` | `50% 0.21 28` | error states only |
| `ring` | same as accent | same as accent | focus rings |
| `emphasis` | `15% 0.04 250` | `=foreground` | scannable inline links (Sign in / Sign up cross-links) |
| `pawn-red` | `42% 0.19 25` | `63% 0.21 25` | brand pawn |
| `pawn-yellow` | `73% 0.16 72` | `76% 0.16 85` | AI pawn |
| `pawn-wine` | `35% 0.14 15` | `50% 0.15 15` | skin choice |
| `pawn-coral` | `58% 0.18 30` | `68% 0.18 30` | skin choice |
| `pawn-brick` | `45% 0.12 40` | `55% 0.13 40` | skin choice |
| `grid-linen` | `=background` | `=surface` | default playing surface |
| `grid-ink` | `28% 0.03 250` | `12% 0 0` | dark playing surface |
| `grid-slate` | `48% 0.04 240` | `40% 0.04 240` | mid-tone playing surface |
| `board` | `56% 0.02 80` | `28% 0 0` | sandstone plate |
| `board-cell` | `85% 0.01 85` | `18% 0 0` | empty slot |

### 1.2 Hue families (intent map)

- **Warm-red family** (hue 22–28): `accent`, `destructive`, `border`, `muted-foreground`, `pawn-red`, `pawn-coral`, `pawn-brick`. Brand-coherent spine.
- **Amber family** (hue 72): `pawn-yellow` alone — the only yellow on the page.
- **Linen / cream family** (hue 80–85): `background`, `board-cell`, `board`.
- **Cool slate** (hue 240–250): `foreground`, `emphasis`, `grid-ink`, `grid-slate`. Deliberate cool counterpoint.

### 1.3 Typography

Display: **Fraunces** (variable, italic-forward). Body: **Public Sans**. Mono: **JetBrains Mono** (slashed zero, ligatures).

Custom `--text-*` tokens emit Tailwind utilities:

| Class | Size / leading | Tracking | Weight | Family | Use |
|---|---|---|---|---|---|
| `text-display` | 120 / 100 | -0.04em | 800 | Fraunces | Big hero (rare) |
| `text-display-mobile` | 64 / 56 | -0.04em | 800 | Fraunces | Mobile hero |
| `text-3xl` / `text-4xl` | tw defaults | — | — | Fraunces | Headlines |
| `text-base` | 16 / 24 | — | 400 | Public Sans | Body |
| `text-metric` | 24 / 24 | -0.01em | 600 | Public Sans | Telemetry numbers |
| `text-mono-md` | 13 / 20 | 0.05em | 500 | JBM | Leaderboard rows |
| `text-mono-sm` | 11 / 16 | 0.1em | 500 | JBM | Micro-labels |

**`tailwind-merge` extension** (`apps/web/src/lib/utils.ts`): the custom `text-*` tokens above are registered as font-size utilities. Without this, twMerge classifies them as text-color and silently drops conflicting `text-{color}` classes — invisible text on filled buttons. **If you add a new `--text-*` token, update the `cn()` extension list.**

### 1.4 Spacing tokens

- `--spacing-margin-mobile` (24 px) and `--spacing-margin-desktop` (64 px) — page-level horizontal padding via `px-margin-mobile md:px-margin-desktop`.
- Standard Tailwind scale otherwise.

### 1.5 Motion / animations

Token-driven via `--animate-*` + `@keyframes`:

- **`signup-token-drop`**: 360 ms `cubic-bezier(0.22, 1, 0.36, 1)`. Token slides into its slot on mount.
- **`signup-line-draw`**: `scaleX(0) → scaleX(1)` on the `data-current="4"` connecting beam.
- **`signup-token-flash`**: scale pulse on all four tokens at the win sequence.
- **`matrix-pulse`**: column-staggered wave on AI telemetry. **Keyframe 0% must match the cell's static state** — see §10.
- **`sonar-ping`**: best-move cell radiates a soft ring every 5 s.

Anti-flicker rule: when an element animates from a `disabled→enabled` or static→animating transition, the keyframe `0%` should match the element's static styles (otherwise the first frame jumps visibly).

### 1.6 Custom utilities (game-piece visuals)

`@utility` blocks in `globals.css`:

| Utility | Recipe | Use |
|---|---|---|
| `pawn-red` | `bg-pawn-red` + dome insets + drop shadow + dark-mode glow | brand pawn (lit) |
| `pawn-yellow` | same recipe with amber bg | AI pawn |
| `pawn-neutral` | `bg-foreground` + same dome recipe (flat in dark) | progress dot when filled |
| `pawn-slot` | `bg-muted` + **inverted** insets (top-dark, bottom-light) | empty slot (board hole effect) |

**Bare `bg-pawn-*` token classes** apply just the color (no dome) — used for flat color previews like the skin picker swatches.

---

## 2. Primitives

Lives in `apps/web/src/components/ui/`. shadcn-canonical API (`variant + size + asChild + className`). React 19 — refs are regular props.

### 2.1 `<Button>` — `components/ui/button.tsx`

Extended with 4thewin brand variants.

| Variant | Use |
|---|---|
| `default` / `destructive` / `outline` / `secondary` / `ghost` / `link` | shadcn defaults |
| `brand-filled` | dark filled CTA, **inverts to outlined on hover**. Use for nav CTAs (Sign up, Play). |
| `brand-outline` | outlined CTA, **inverts to filled on hover**. Use for secondary nav (Login). |

| Size | Dimensions |
|---|---|
| `default` / `sm` / `lg` / `icon` | shadcn defaults |
| `pill` | `h-9 px-5 rounded-full font-mono text-mono-sm uppercase` — nav pill |

**Form-submit override** (see §10.4 for why): brand-filled buttons used as form submits should override the hover inversion with `className="hover:bg-foreground/90 hover:text-background"`. The inversion is jarring on retry-after-failure when the cursor is still over the button as it transitions disabled→enabled.

### 2.2 `<Input>` — `components/ui/input.tsx`

shadcn primitive, token-keyed. `aria-invalid` drives the error border + ring (red).

Focus ring is `ring-foreground` (neutral slate), NOT `ring-ring` (brand crimson) — see §9 for why.

### 2.3 `<Label>` — `components/ui/label.tsx`

shadcn primitive. `htmlFor` required for accessibility. Use with `<Input id={…}>`.

### 2.4 `<FormField>` — `components/ui/form-field.tsx`

Composes Label + Input + optional helper/error message with aria wiring.

```tsx
<FormField
  id="email"
  label="Email"
  type="email"
  required
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  hint="We'll never share this."     // shown when no error
  error={touched && !valid ? "Use a valid email." : null}
/>
```

The `error` prop, when set, replaces `hint`, sets `aria-invalid={true}`, wires `aria-describedby`, and renders the message in destructive color with `role="alert"`.

**For password fields with reveal toggles, file inputs, or textareas**: compose Label + Input directly. FormField is for simple text-style fields.

### 2.5 `<AlertBox>` — `components/ui/alert-box.tsx`

Form-level alert with optional inline action link.

```tsx
<AlertBox>Wrong email or password.</AlertBox>

<AlertBox action={{ label: "Sign in instead?", href: "/login" }}>
  Couldn't create your account.
</AlertBox>

<AlertBox variant="info">Heads up — read-only until verified.</AlertBox>
```

| Variant | Color | Role |
|---|---|---|
| `error` (default) | `text-destructive` | `role="alert"` (announced) |
| `info` | `text-muted-foreground` | none (visual only) |

The action link inherits the alert's text color, bold-underlined, hover dims via opacity.

---

## 3. Patterns

### 3.1 Form layout

Single-column flex stack with `gap-6` between fields, `gap-2` inside each field (label → input → hint/error).

```tsx
<form className="flex flex-col gap-6">
  <header className="flex flex-col gap-4">…</header>
  <FormField id="email" label="Email" … />
  <FormField id="password" label="Password" … />     // or composed if reveal/etc.
  {error ? <AlertBox>…</AlertBox> : null}
  <Button type="submit" variant="brand-filled" size="pill" className="hover:bg-foreground/90 hover:text-background">
    Sign in →
  </Button>
</form>
```

Submit button text is **constant**, not swapped to `"Signing in…"` on submit (text-content swaps flicker). Disabled-state fade plus form-level error/redirect are sufficient pending feedback.

### 3.2 Focused-card composition

Used by `/login` and `/signup` (via `SignupShell`). Card: `rounded-xl border border-border bg-surface p-6 shadow-sm md:p-8`. Centered in `max-w-md` mobile, `max-w-md md:max-w-3xl` for content-heavy steps (Step 3).

### 3.3 Sign-in / Sign-up cross-link

Outside the card, muted-mono context, with one bold emphasized link:

```html
<p class="text-center font-mono text-mono-sm uppercase text-muted-foreground">
  Already have an account?
  <a class="font-bold text-emphasis underline underline-offset-4 transition-opacity hover:opacity-70 focus-visible:opacity-70" href="/login">
    Sign in
  </a>
</p>
```

Mirror on `/login`: "Don't have an account? Sign up" — same styling.

### 3.4 Pawn utilities for visual depth

For actual game pieces, use `pawn-red` / `pawn-yellow` / `pawn-neutral` (utility, applies dome+drop). For flat color previews (skin pickers), use `bg-pawn-red` (auto-generated token class, just bg-color).

---

## 4. Layout

### 4.1 Page shell — `RootLayout.astro`

```
<body class="flex min-h-svh flex-col">
  [skip-to-content link]
  <TopNav authed={authed} />        ← floating pill, fixed top-6
  <div class="flex-1"><slot /></div>
  <SiteFooter />
</body>
```

`min-h-svh` + `flex-1` keeps the footer at the bottom on short pages. `getCurrentUser(Astro)` runs once per request to pick the TopNav variant.

### 4.2 Landing grid — `/`

12-col grid at md+: AITelemetry (3) / Headline+Board (6) / Leaderboard (3). `gap-gutter`, `items-start` so columns share the board top baseline. Headline is hoisted ABOVE the grid and centered.

Side panels share **184 px content width** for visual symmetry — matrix dimensions, eval bar, and slider all hit 184 px exactly. **If matrix dimensions change, all three width tokens update together** (commented in `AITelemetry.tsx`).

Mobile: panels stack via `order-N md:order-N` classes.

### 4.3 Signup card — `SignupShell`

`max-w-md` for steps 1, 2, 4. `max-w-md md:max-w-3xl` for step 3 (wider to fit the 2-column profile form). `pt-32 pb-4` vertical padding so card clears the floating pill nav.

`SignupProgress` tracker sits ABOVE the card (outside the card padding) so the step-4 connect animation has room.

### 4.4 Mobile reflow

- Floating pill nav stays sticky-fixed on all viewports.
- Multi-column desktop layouts collapse to single-column at default (`md:` adds the columns).
- Form gaps are kept loose on mobile (`gap-6`, `pt-4` between legend and swatches in step 3) — touch targets need air.

---

## 5. Domain components

### 5.1 Landing — `components/landing/`

| Component | Role |
|---|---|
| `Headline.astro` | game-state kicker above the board |
| `Board.tsx` | mini Connect-4 preview (anonymous demo) |
| `AITelemetry.tsx` | left panel — eval bar + 7×6 matrix + sonar ping |
| `Leaderboard.tsx` | right panel — 5 mock rows + "your spot" slot |

### 5.2 Signup — `components/signup/`

| Component | Role |
|---|---|
| `SignupShell.astro` | RootLayout + SignupProgress + card |
| `SignupProgress.tsx` | 4-token tracker, win-line at step 4 |
| `Step1Save.astro` | save-your-spot CTA + carry-over copy |
| `Step2Credentials.tsx` | email + username + password form |
| `Step3Profile.tsx` | avatar + bio + pawn/grid skin pickers |
| `Step4Welcome.astro` | welcome + Play CTA |
| `SignupCompleteTracker.tsx` | fires `POST /api/auth/signup-complete` on step 4 mount |

### 5.3 Auth — `components/auth/`

| Component | Role |
|---|---|
| `LoginForm.tsx` | email + password sign-in form |

### 5.4 Why some are React and some are Astro

Astro by default. React island only when needed: form state, transitions, drag-drop, anything with non-trivial interaction. The auth-checked TopNav pure-SSR; the theme toggle is inline JS, not React (see §10.1 for why).

---

## 6. Animation system

See §1.5 for the keyframe + token list.

### Active animations

- **Landing telemetry**: `matrix-pulse` (column-staggered wave) + `sonar-ping` (best-move cell, 5 s).
- **Signup progress**: `signup-token-drop` on the active step's token; at step 4, `signup-line-draw` (the connect-4 beam) → `signup-token-flash` (all four pulse).

### Roadmap (intent — not yet built)

- AI "thinking" state intensifies the telemetry wave (faster, bigger eval-bar fluctuation).
- Game-piece drop animation (real game, not signup tracker).
- Win-line trace across the four connecting cells when a player wins.

### Animations explicitly avoided

- Page transitions / cinematic crossfades (cheap-feeling for an interactive product).
- Scroll-triggered animation (the page fits one screen).
- Stats-synced animation on landing — premature optimization, wait for AI module.

---

## 7. Backend integration boundaries

The frontend talks to the backend through `/api/*` (proxied to Fastify by ModSec in production, by Vite in `make dev`). Currently wired:

| Endpoint | Status |
|---|---|
| `POST /api/auth/signup` | ✅ Step 2 |
| `POST /api/auth/login` | ✅ LoginForm |
| `POST /api/auth/logout` | ✅ (no UI yet) |
| `GET  /api/auth/me` | ✅ used by `getCurrentUser()` |
| `POST /api/auth/signup-complete` | ✅ fired by `SignupCompleteTracker` on step 4 mount |
| `GET  /api/auth/42` / `/callback` | ✅ Step 1 + Login OAuth buttons |
| `GET  /api/users/check-username` | ✅ Step 2 live availability |
| `PUT  /api/profile` | ✅ Step 3 |
| `POST /api/profile/avatar` | ✅ Step 3 |
| `GET  /uploads/avatars/{id}.webp` | ✅ avatar serving via WAF |

### Pending (Chunk B)

- `GET /api/anon/session/me` — server-authoritative anon stats for the carry-over story on Step 1. Until built, Step 1 renders generic copy.
- Anon session play loop: `POST /api/anon/session/move` etc.

### Future (game / lobbies / friends)

Not yet defined. Will live under `/api/games`, `/api/lobbies`, `/api/friends`.

---

## 8. Locked decisions

These are settled — change requires explicit re-discussion.

| Topic | Choice | Notes |
|---|---|---|
| Brand mark | `4` in Fraunces italic | Single glyph, used in nav |
| Wordmark | `4thewin` lowercase | gen Z / app-y |
| Display font | **Fraunces** | Variable, italic-forward |
| Body font | **Public Sans** | Workhorse — NOT Inter |
| Mono font | **JetBrains Mono** | Slashed zero, ligatures, "AI lab notebook" voice |
| Default theme | None — system + toggle | Bootstrap before paint to avoid FOUC |
| Headline transitions | Subtle (fade) | No cinematic |
| Footer position | Above the fold, slim | Single-screen interactive product, not marketing |
| Mobile Login button | Hidden | Sign-up filled CTA only on small viewports |
| Anonymous play state | Server-authoritative | Cookie-keyed session. Client never reports its own score. |
| Signup is one-shot | `signup_completed_at` on user | After step 4, `/signup` redirects to `/`. Edits go through future `/settings`. |
| Email enumeration | Vague 409 on signup | "Account creation failed" + form-level "Sign in instead?" link. Username conflicts stay specific. |
| Caching | `Cache-Control: no-store` everywhere | App is fully auth-aware; bfcache must be opted out. |

---

## 9. Anti-patterns we explicitly rolled back

What didn't work, captured so we don't relitigate.

| Pattern | Why dropped |
|---|---|
| Token-pulsating "everything always" on landing | Distracting; pulse is now sonar-ping on best-move cell only |
| Visible step counter "1/4" inside the card | Redundant with the SignupProgress tracker |
| Connect-4-token aesthetic on early signup-progress dots | Felt cartoonish; dots are now neutral pawn-* utilities, with the connect-4 beam reserved for step 4 |
| Long bouncy `signup-token-drop` (cubic-bezier(0.34, 1.56, 0.64, 1) + scale squish) | Iterative tuning didn't land it — too cartoony. Replaced with smooth ease-out slide (no bounce, no squish) |
| `client:only` for purely visual UI (icons) | Hydration flicker on every refresh. Use SSR + `dark:` variants instead (see §10.1) |
| Continuous brand-filled hover inversion on form-submit buttons | Visible flicker on retry-after-failure; submit buttons override with subtle darken |
| Text-content swap on submit (`"Sign in →"` → `"Signing in…"`) | Flickers visibly. Constant text + disabled fade is enough |
| `Cache-Control: no-store` alone | Some browsers' bfcache requires Cache-Control + Pragma + Expires together |
| Specific "Email already in use" error on signup | Account enumeration. Now vague "Account creation failed" with sign-in suggestion |
| Stats-synced animation on landing right now | Premature optimization; wait for AI module to land |

---

## 10. Frontend lessons learned

Patterns to follow + traps that have already cost us time.

### 10.1 Don't use `client:only` for purely visual UI

A React island declared with `client:only="react"` renders **nothing** at SSR. The first paint shows an empty slot; the React component appears only after hydration. For visual elements (icons, badges, indicators), this produces a flicker on every refresh — and if the surrounding layout is content-driven (`w-auto`, flex-content widths), the layout reflows when the island appears.

**Examples that hit this**: ThemeToggle (May 22) — Moon/Sun icons popped in on every refresh AND the floating pill grew by ~36 px when the toggle hydrated.

**The rule**: anything with a stable, deterministic visual representation should render at SSR. Use `client:only` only when the component **fundamentally cannot** SSR.

**The fix when you need theme-dependent UI**: render both states in SSR HTML and let CSS pick:
```astro
<svg class="size-4 dark:hidden">…moon…</svg>
<svg class="hidden size-4 dark:block">…sun…</svg>
```
Pair with the inline theme bootstrap in `RootLayout.astro` and a delegated `[data-theme-toggle]` click listener. No React island, no hydration delay, no flicker.

### 10.2 If you must use a `client:only` island, reserve its space at SSR

If `client:only` is genuinely necessary, wrap the slot in a SSR-rendered container with explicit dimensions matching the hydrated component's. Layout shifts are eliminated even if the visual is empty for a frame.

### 10.3 The `cn()` tailwind-merge extension is load-bearing

`apps/web/src/lib/utils.ts` extends `tailwind-merge` to register custom font-size tokens (`text-display`, `text-mono-sm`, etc.). Without that registration, `tailwind-merge` classifies them as text-color utilities and silently drops conflicting actual color classes. The Sign-up button rendered with invisible text for ~30 minutes before we found this. **If you add a new `--text-*` token, add it to the `cn()` extension list.**

### 10.4 Brand-filled hover inversion is for nav CTAs, not form submits

The `brand-filled` variant inverts dark→outlined on hover. Great on nav buttons (Sign up, Play). Jarring on form-submit buttons during retry-after-failure: cursor stays over the button, button transitions disabled→enabled, hover fires immediately, 75 ms inversion plays — visible flicker. Override on form submits with `className="hover:bg-foreground/90 hover:text-background"`.

### 10.5 Animation keyframe 0% must match the cell's static state

Otherwise the first frame of the animation is a visible jump from default styles to keyframe 0%. Bit us on the matrix wave (May 22) where `0%` was a trough state but cells rendered at full default opacity until the animation kicked in — every cell visibly dropped to dim before starting the wave. Fix: keyframe `0%` matches the static styles, animation goes UP from there.

### 10.6 Astro layouts don't propagate response headers reliably

`Astro.response.headers.set()` from inside a `*.astro` layout doesn't always reach the page's final response. Use **Astro middleware** (`apps/web/src/middleware.ts`) for global headers — it runs at the request boundary and modifies the actual outgoing response.

---

## 11. Conventions

### 11.1 Git
- Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, etc.).
- One logical change per commit. Bug fixes land separately from refactors.
- Multi-line commit bodies — explain the why, not just the what.

### 11.2 Code
- Astro for static structure. React only for interactive state.
- Token-driven everything. No hex/rgb/inline-oklch in component code (use `bg-foreground`, not `bg-[oklch(28%_0.03_250)]`).
- `cn()` for class merging — handles the tailwind-merge extension.
- Comments explain *why*, not *what*. Code shows what.

### 11.3 Visual
- Dark mode is a first-class peer of light, not an afterthought. Test both.
- `/styleguide` is the visual smoke test — eyeball it after any token / primitive change.
- Errors are red (destructive). Brand crimson is for accent and focus, not errors.
- Form submit feedback = disabled fade. Don't swap text.

---

## 12. What's NOT in the system

Deliberate omissions, with rationale, so they don't get re-litigated.

| Not built | Rationale |
|---|---|
| **Storybook** | Heavy, slow, opinionated. `/styleguide` covers 80 % of the value with the same code that runs in production. |
| **Figma → token sync (Style Dictionary)** | No design tool in the loop. Tokens live in `globals.css`, single source of truth. |
| **Visual regression tests (Chromatic, Percy)** | Worth it for design systems with ten contributors. Overkill for a team of three. |
| **JSON/YAML token files** | Adds another layer; CSS `@theme` is the source of truth. |
| **CSS-in-JS** | Tailwind + `@utility` for the things Tailwind doesn't cover. No emotion / styled-components. |
| **Component changelog** | Too much overhead. Git history is the changelog. |
| **Per-component documentation files** | Code comments + `/styleguide` + this doc. |

---

## 13. Roadmap

### 13.1 Design system maintenance — first-class concern

When you ship a UI change, update DESIGN.md and `/styleguide` in the same PR. Treat the design system as part of the codebase's API:

- **New token?** Add it to `globals.css`, document in §1, verify in `/styleguide`.
- **New primitive?** Add to `components/ui/`, document API in §2, render in `/styleguide`.
- **New pattern emerging from feature code?** Extract it once you've copied it three times. Add to §3.
- **Inline `oklch(...)` / `bg-[…]` / `text-[#…]` in component code?** Stop — make it a token first.
- **Anti-pattern discovered?** Add it to §9 with rationale.
- **Lesson learned the hard way?** Add it to §10.

Drift between this doc and the code is the failure mode. Re-rendering `/styleguide` after a token or primitive change is the smoke test.

### 13.2 Pending primitives

Components we'll need but haven't built:

- `DropdownMenu` — for the authed-nav user-identity dropdown (Phase 2 of `apps/web/docs/authed-nav-roadmap.md`).
- `Dialog` / `AlertDialog` — for destructive confirms (delete account, kick from lobby).
- `Toast` — for transient feedback (saved, error, copied to clipboard).
- `Tabs` — for `/settings` sections.
- `Avatar` — composition of `<img>` + initial fallback + status indicator.

When any of these land, update §2 and `/styleguide`.

### 13.3 Pending pages

- `/settings` — once it ships, the signup-flow lock (§8 `signup_completed_at`) makes more sense as the only on-ramp for ongoing profile edits.
- `/u/<username>` — public profile page.
- `/play` is currently a stub. Will become the lobby + game container.

### 13.4 Animation roadmap

See §6 — the AI-thinking telemetry intensification, real game-piece drop, and win-line trace are queued. Each new animation is a new entry in §1.5.

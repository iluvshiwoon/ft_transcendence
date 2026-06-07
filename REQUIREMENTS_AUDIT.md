# ft_transcendence — Mandatory Requirements Audit

Audit of all non-module mandatory requirements from subject v21.1.

---

## General Requirements (III.2)

### 1. Web application with frontend, backend, and database — PASS
- Frontend: `apps/web/` — Astro + React (SSR), port 4321 (dev) or 8080 (prod)
- Backend: `apps/server/` — Fastify + TypeScript, port 3000
- Database: PostgreSQL 17-alpine via `compose.yml`, schema in `apps/server/src/db/schema.ts`
- Frontend proxies `/api/*` to backend (Vite proxy in dev, nginx in prod)

### 2. Git with clear and meaningful commits from ALL team members — PASS
- 426 total commits across all branches
- All 5 team members have commits:
  - Killian (iluvshiwoon / gekid00): ~363 commits (dominant — frontend lead)
  - Tim (tnolent): ~22 commits
  - Rayane (Rayane.b): ~11 commits
  - Senshy (Senshy42): ~6 commits
  - Adam (hop): ~6 commits
- ~266 of 426 use conventional commit prefixes (`feat`, `fix`, `docs`, `refactor`, etc.)

### 3. Deployment with containerization (single command) — PASS
- `make build` executes `docker compose up -d --build`
- Auto-detects podman vs docker
- `compose.yml` defines 6 services: postgres, vault_server, vault_init, vault_unseal, server, web, mod_security
- `containerfile`: multi-stage build

### 4. Compatible with latest stable Google Chrome — PARTIAL
- No Chrome-specific polyfills or compatibility issues found
- Uses modern CSS (Tailwind v4, `backdrop-filter`, CSS custom properties) — supported in current Chrome
- WebSocket (Socket.io) natively supported in Chrome
- No automated browser testing or CI checks configured

### 5. No warnings or errors in browser console — FAIL
Found **46 instances** of `console.log`, `console.error`, and `console.warn` in `apps/web/src/`:

| File | Count | Type |
|------|-------|------|
| `layouts/RootLayout.astro` | 5 | `console.log` (4), `console.error` (1) |
| `components/chat/ChatInterface.tsx` | 18 | `console.log` (5), `console.error` (13) |
| `components/social/NotificationDropdown.tsx` | 8 | `console.error` (8) |
| `components/social/AddFriendButton.tsx` | 8 | `console.error` (8) |
| `components/landing/ResumeStrip.tsx` | 1 | `console.error` (1) |
| `components/landing/ChallengeSearchModal.tsx` | 2 | `console.error` (2) |
| `pages/play.astro` | 1 | `console.error` (1) |
| `pages/profile/[username].astro` | 3 | `console.error` (3) |
| `lib/play-store.ts` | 2 | `console.log` (1), `console.error` (1) |

These will emit in the browser console during normal use. All must be removed or guarded behind `NODE_ENV` checks.

### 6. Privacy Policy and Terms of Service pages — PASS
- `apps/web/src/pages/privacy.astro` — Real content in French, 5 sections (Données collectées, Utilisation, Sécurité, Vos droits, Contact)
- `apps/web/src/pages/terms.astro` — Real content in French, 5 sections (Votre compte, Utilisation acceptable, Contenu uploadé, Disponibilité, Résiliation)
- Linked from `apps/web/src/components/SiteFooter.astro:18-19`

---

## Technical Requirements (III.3)

### 7. Frontend responsive and accessible — PASS
- Viewport meta tag: `apps/web/src/layouts/RootLayout.astro:61`
- Responsive classes: extensive use of Tailwind responsive prefixes (`md:`, `xs:`) throughout
- Skip-to-content link: `RootLayout.astro:218-223`
- ARIA attributes: 115+ instances (`aria-label`, `aria-hidden`, `aria-selected`, `role="tab"`, etc.)
- Focus-visible styling: `focus-visible:outline-none focus-visible:ring-2` patterns throughout

### 8. CSS framework (Tailwind) — PASS
- Tailwind v4 installed: `apps/web/package.json:32`
- Vite plugin: `apps/web/astro.config.mjs:7`
- Import: `apps/web/src/styles/globals.css:17` (`@import "tailwindcss"`)
- All components and pages use Tailwind utility classes

### 9. .env file ignored by Git, .env.example provided — PASS
- `.gitignore:14-16` ignores `.env`, `.env.local`, `.env.*.local`
- `.env.example` at repo root with 9 lines documenting DB_PASSWORD, VAULT_TOKEN, JWT_SECRET, etc.
- `apps/server/.env.example` also present

### 10. Database clear schema with relations — PASS
- Schema (`apps/server/src/db/schema.ts`): 8 tables with column types, constraints, FKs, enums
  - users, friendships, blockedUsers, games, moves, lobbies, chatMessages, notifications
- Relations (`apps/server/src/db/relations.ts`): all relationships defined with Drizzle's `relations()` using `one()` and `many()`

### 11. Basic user management (signup, login with hashed passwords) — PASS
- Signup: `apps/server/src/routes/auth.ts:72-113` — validates, hashes, inserts, sets JWT cookie
- Login: `apps/server/src/routes/auth.ts:116-143` — validates, verifies password, sets JWT cookie
- Password hashing: `apps/server/src/auth/password.ts` — bcrypt with 12 salt rounds
- JWT: 7-day expiration, HttpOnly cookie (`httpOnly: true`, `sameSite: "lax"`)
- OAuth 42: Full flow with CSRF state, account linking, auto-account creation

### 12. Form/input validation on both frontend and backend — PARTIAL
- **Frontend (good)**:
  - Signup: email regex, username regex, password min length, live username check, strength meter
  - Login: email regex, password presence
  - Settings: email/password change forms with validation
  - Avatar: size pre-validation before sending
- **Backend (minimal)**:
  - Only checks field existence and password length >= 8
  - No schema validation library (zod, joi, etc.)
  - Email format, username format, and other constraints only validated on frontend

### 13. All browser-to-backend connections must use HTTPS — FAIL
- WAF/nginx: `waf/default.conf:2` — `listen 8080;` with no `ssl` directives
- `compose.yml`: `OAUTH42_REDIRECT_URI: http://localhost:8080/...` — plain HTTP
- `compose.yml`: `FRONTEND_URL: http://localhost:8080` — plain HTTP
- No TLS termination configured anywhere
- CLAUDE.md mentions "HTTPS everywhere via reverse proxy (Caddy or Nginx)" as TBD by cybersec dev — not implemented

---

## README Requirements (VI)

### 14. First line italicized — FAIL
Current: `# ft_transcendance`
Required: `_This project has been created as part of the 42 curriculum by <login1> <login2> ..._`

### 15. Description section with project name and key features — PARTIAL
- Single sentence on line 3: "A 4-player Connect-4-themed game..."
- No dedicated `## Description` heading
- Mentions "tournament play" which is not implemented

### 16. Instructions section with prerequisites and step-by-step execution — PASS
- `## Quick start` with `### Prerequisites` (container runtime, pnpm, .env)
- `### First-time setup` with `cp .env.example .env && make build`
- `## Dev modes` (Mode A: full stack, Mode B: HMR) with commands and URLs
- `## Database` with migration and seed commands

### 17. Resources section with classic references + AI usage description — FAIL
No `## Resources` section exists. No references to documentation, tutorials, or AI usage description.

### 18. Team Information section (roles, responsibilities per member) — FAIL
No Team Information section in README. Team info exists only on `/about` page:
- Rayane: Tech Lead, Backend
- Killian: Product Owner, Frontend
- Senshy: Cybersécurité
- Tim: Backend, Game Logic
- Adam: Project Manager

### 19. Project Management section (task distribution, tools, communication) — FAIL
No Project Management section. No mention of task distribution, tools (GitHub Issues, Trello), or communication channels.

### 20. Technical Stack section (frontend/backend technologies, DB choice, justification) — PARTIAL
- Technologies mentioned scattered throughout README
- No dedicated `## Technical Stack` section with structured information and justification

### 21. Database Schema section (visual or description of tables/relationships) — FAIL
No Database Schema section. Only migration commands in `## Database` section.

### 22. Features List section (complete list with team member mapping) — FAIL
No Features List section.

### 23. Modules section (list, point calc, justification, implementation details, team members) — FAIL
No Modules section. Module info exists in separate `modules.md` but not in README.

### 24. Individual Contributions section (detailed breakdown per member) — FAIL
No Individual Contributions section.

---

## Summary

| # | Requirement | Verdict |
|---|-------------|---------|
| 1 | Web app with frontend, backend, database | **PASS** |
| 2 | Git with meaningful commits from ALL members | **PASS** |
| 3 | Deployment with containerization (single command) | **PASS** |
| 4 | Compatible with latest stable Google Chrome | **PARTIAL** |
| 5 | No warnings or errors in browser console | **FAIL** (46 console statements) |
| 6 | Privacy Policy and Terms of Service pages | **PASS** |
| 7 | Frontend responsive and accessible | **PASS** |
| 8 | CSS framework (Tailwind) | **PASS** |
| 9 | .env ignored by Git, .env.example provided | **PASS** |
| 10 | Database clear schema with relations | **PASS** |
| 11 | Basic user management with hashed passwords | **PASS** |
| 12 | Form/input validation frontend + backend | **PARTIAL** (backend minimal) |
| 13 | All browser-to-backend connections use HTTPS | **FAIL** (no TLS) |
| 14 | README: First line italicized | **FAIL** |
| 15 | README: Description section | **PARTIAL** |
| 16 | README: Instructions section | **PASS** |
| 17 | README: Resources section | **FAIL** |
| 18 | README: Team Information section | **FAIL** |
| 19 | README: Project Management section | **FAIL** |
| 20 | README: Technical Stack section | **PARTIAL** |
| 21 | README: Database Schema section | **FAIL** |
| 22 | README: Features List section | **FAIL** |
| 23 | README: Modules section | **FAIL** |
| 24 | README: Individual Contributions section | **FAIL** |

**Result: 10 PASS, 4 PARTIAL, 10 FAIL**

---

---

## Evaluation Rubric Cross-Reference

Source: `Intra Projects ft_transcendence Edit.pdf` (16-page evaluation form)

### What the evaluator will explicitly check:

1. **Preliminaries** (blocks everything else):
   - ALL team members present — if not, evaluation stops
   - EACH member explains their role and contributions individually
   - README contains ALL required sections — "A missing or incomplete README will significantly impact the evaluation"
   - At least 2 members explain project concept, tech choices, and coordination
   - Git history shows genuine teamwork from all members

2. **General Requirements** (all must pass):
   - Frontend + Backend + Database all present and functional
   - Deployment works with single command
   - Chrome: "no errors or warnings in the console" (DevTools check)
   - Privacy Policy + Terms of Service: accessible from footer, real content, not placeholder

3. **Technical Requirements** (all must pass):
   - Frontend responsive on desktop + mobile
   - CSS framework used (Tailwind)
   - .env in .gitignore, .env.example provided, no credentials in repo
   - Database schema clear with relations
   - Auth: hashed + salted passwords
   - Form validation: both frontend AND backend
   - HTTPS: "All communication between frontend and backend must be encrypted using HTTPS"

4. **Modules Verification** (must reach 14 points):
   - README lists all claimed modules with point calculation
   - EACH major module individually demonstrated and functional
   - EACH minor module individually demonstrated and functional
   - Modules of choice: proper justification in README

5. **Code Quality**:
   - Clear file/folder structure
   - Consistent coding style
   - Team can justify technical decisions
   - All members contributed (Git history)

6. **Functionality**:
   - No critical bugs or crashes
   - Main features work
   - Multi-user support works
   - Basic error handling present

7. **Bonus** (only if mandatory is "entirely and perfectly done"):
   - Each extra validated module counts
   - Max 5 bonus points

### Critical: Bonus is only evaluated if mandatory part is "entirely and perfectly done"
This means failing on console statements or HTTPS = no bonus points at all, even if all 19 module points are valid.

---

## Critical Fixes Needed Before Evaluation

1. **README rewrite** — Missing 8 required sections (42 attribution, resources/AI usage, team info, project management, technical stack, database schema, features list, modules, individual contributions). The evaluator explicitly checks for each section.

2. **Console statement cleanup** — Remove all 46 `console.log/error/warn` from frontend code. The evaluator opens Chrome DevTools and checks: "no errors or warnings in the console."

3. **HTTPS** — The evaluator asks: "Is HTTPS used for all backend connections?" and "All communication between frontend and backend must be encrypted using HTTPS." Currently no TLS termination is configured. Need to add TLS or document why localhost HTTP is acceptable for the evaluation environment.

4. **Backend validation** — The evaluator asks: "Are all forms and user inputs validated in both frontend AND backend?" and tests with invalid inputs, SQL injection, XSS. Currently backend only checks field existence. Should add zod/joi validation.

# CLAUDE.md — ft_transcendence

Context file for Claude Code. Read this first before generating or modifying any code.

---

## Project Overview

**ft_transcendence** is the final group project of the 42 Common Core. We are building a web-based **Connect 4 (Puissance 4)** multiplayer platform with the following core features:

- 1v1 online matches between remote players
- AI Opponent with multiple difficulty levels
- User accounts, friends system, in-app chat
- Lobbies with public/private rooms (join by code)
- Game customization (skins, Connect 5 variant)
- In-app notification system
- Hardened security (WAF + Vault)

**Total modules : 19/19 points** (max allowed).

---

## Team

| Name | Role(s) | Scope |
|---|---|---|
| Rayane | Tech Lead + Developer | Backend (auth, users, social, sockets, chat, notifications) |
| Killian | Product Owner + Developer | Frontend |
| Senshy | Developer | Cybersecurity (WAF, Vault, infra) |
| Tim | Developer | Backend (game logic, AI, lobby, stats) |
| Adam | Project Manager + Developer | Joins later |

---

## Modules (19 points)

### Majors (12 points)

1. **Framework front+back** — Astro + React (front), Fastify (back)
2. **Connect 4 web-based** — Real-time 1v1 game in browser
3. **Remote players** — Two players on different machines via WebSocket
4. **AI Opponent** — Minimax + alpha-beta pruning, 3 difficulty levels
5. **User Management** — Signup, login, profile, avatar, online status, friends
6. **User Interaction** — Chat, friends, profile viewing
7. **WAF + Vault** — ModSecurity (WAF) + HashiCorp Vault for secrets

### Minors (7 points)

8. **Notification system** — Toast + persisted in DB, dropdown from header
9. **Game Stats** — Match history, win rate, played/won/lost
10. **ORM** — Drizzle
11. **Game Customization** — Pawn skins, grid skins, Connect 5 variant
12. **OAuth** — 42 OAuth (in addition to email/password)
13. **SSR** — Astro for public pages

---

## Stack

### Frontend (TBD by frontend lead)

- **Framework** : Astro (SSR for public pages)
- **UI** : React islands (full-page wraps for interactive pages)
- **Styling** : Tailwind CSS
- **Components** : TBD (likely shadcn/ui)
- **Animations** : TBD (likely Framer Motion)
- **State management** : TBD
- **Real-time client** : TBD (likely Socket.io-client)

### Backend

- **Runtime** : Node.js
- **Framework** : Fastify
- **Language** : TypeScript (not strict mode initially)
- **Real-time** : Socket.io
- **ORM** : Drizzle
- **Database** : PostgreSQL
- **Migrations** : Drizzle Kit

### Cybersecurity (TBD by cybersec dev)

- **WAF** : ModSecurity
- **Secrets** : HashiCorp Vault
- **TLS** : reverse proxy (Caddy or Nginx)
- **HTTPS** : everywhere

### Infrastructure

- **Containers** : Podman + podman-compose (Docker-compatible CLI)
- **Package manager** : pnpm (workspaces)
- **Single-command deploy** : `make`
- **Environments** : dev / prod

---

## Project Structure

```
ft_transcendence/
├── apps/
│   ├── web/              # Astro + React (frontend, TBD)
│   └── server/           # Fastify + TypeScript API (backend)
├── packages/             # shared code between web and server (types, etc.)
├── infra/
│   ├── nginx/            # Nginx + ModSecurity (cybersec)
│   └── vault/            # HashiCorp Vault config (cybersec)
├── scripts/              # init scripts (vault bootstrap, etc.)
├── compose.yml           # podman-compose
├── containerfile         # multi-stage build
├── Makefile
├── pnpm-workspace.yaml
├── package.json          # root, declares workspaces
├── .env                  # gitignored
├── .env.example
├── README.md             # in English
└── CLAUDE.md             # this file
```

Monorepo with **pnpm workspaces**. Each app has its own `package.json`, dependencies are hoisted to the root `node_modules/`.

---

## Backend Architecture (`/back`)

### Tech

- Fastify + TypeScript (loose mode)
- Socket.io for WebSocket events
- Drizzle ORM with PostgreSQL
- bcrypt for password hashing
- JWT in HttpOnly cookies (7-day expiration)
- 42 OAuth integration

### Database Schema

#### `users`
- `id` (PK)
- `email` (unique)
- `password` (bcrypt hash, nullable for OAuth-only accounts)
- `username` (unique)
- `avatar_url`
- `bio` (optional)
- `status` (enum: `online`, `offline`, `in_game`)
- `is_deleted` (boolean, default false — for anonymization)
- `oauth_42_id` (nullable)
- `pawn_skin` (default value)
- `grid_skin` (default value)
- `created_at`
- `updated_at`

**User stats stored directly on this table:**
- `games_played`, `games_won`, `games_lost`, `games_drawn`

#### `friendships`
- `id` (PK)
- `user_id` (FK → users)
- `friend_id` (FK → users)
- `status` (enum: `pending`, `accepted`)
- `created_at`

#### `blocked_users`
- `id` (PK)
- `user_id` (FK → users)
- `blocked_user_id` (FK → users)
- `created_at`

#### `games`
- `id` (PK)
- `player1_id` (FK → users)
- `player2_id` (FK → users, nullable for AI games)
- `is_ai_opponent` (boolean)
- `ai_difficulty` (nullable, enum: `easy`, `medium`, `hard`)
- `winner_id` (FK → users, nullable for draws/in-progress)
- `status` (enum: `waiting`, `in_progress`, `finished`, `abandoned`)
- `mode` (enum: `connect4`, `connect5`)
- `time_per_player_seconds` (300 / 600 / 3600)
- `started_at`, `finished_at`

#### `moves`
- `id` (PK)
- `game_id` (FK → games)
- `player_id` (FK → users, nullable for AI)
- `column`, `row`
- `move_number`
- `played_at`

#### `notifications`
- `id` (PK)
- `user_id` (FK → users)
- `type` (e.g. `friend_request`, `friend_accepted`, `game_invite`, `game_finished`, `chat_message`)
- `content` (JSON or text payload)
- `read` (boolean)
- `created_at`

#### `chat_messages`
- `id` (PK)
- `sender_id` (FK → users)
- `receiver_id` (FK → users)
- `content` (text)
- `created_at`

#### `lobbies`
- `id` (PK)
- `code` (6-character unique)
- `creator_id` (FK → users)
- `is_public` (boolean)
- `mode` (enum: `connect4`, `connect5`)
- `time_per_player_seconds`
- `status` (enum: `waiting`, `in_progress`, `closed`)
- `created_at`

### REST Routes

**TBD** — define as we implement features.

### WebSocket Events

**TBD** — define as we implement features.

### Authentication

- Email + password (bcrypt) **or** 42 OAuth
- JWT stored in **HttpOnly cookie**, 7-day expiration
- No refresh token initially (re-login on expiration)
- 42 OAuth : auto-creates account on first login (uses 42 login, avatar, email)
- Account linking : an email-registered user can link their 42 account later
- Email and password changes **require re-entering current password**

---

## Game Logic

### Connect 4

- Default grid : 7 columns × 6 rows
- Win condition : 4 in a row (horizontal, vertical, both diagonals)
- Connect 5 variant : 5 in a row (selectable at lobby creation)

### Timer

- **Total time per player** (chess-style, not per move)
- Options : 5 min / 10 min / 1 hour
- Default : **5 min per player**
- Timer pauses when it's the opponent's turn

### Forfeit & Disconnection

- **Manual surrender** button available during the game
- **Auto-abandon** if a player is disconnected for more than **1 minute**
- **Reconnection** allowed if disconnect lasts less than 1 minute (game state restored)

### AI Opponent

- Algorithm : **minimax with alpha-beta pruning**
- Three difficulty levels :
  - **Easy** : low search depth, occasional random moves
  - **Medium** : moderate depth
  - **Hard** : high depth
- **Artificial delay** between moves (500 ms to 2 s) to simulate thinking
- AI can be added as a tournament participant (when tournament is implemented — note: tournament is not in our current modules but AI handling should be flexible)

### Customization

- **Pawn skins** : list TBD
- **Grid skins** : list TBD
- **Default skins** must always exist
- **Skin scope at game time** :
  - Each player sees **their own grid skin**
  - Each player sees **their own pawn skin** for their pawns
  - Each player sees **the opponent's pawn skin** for the opponent's pawns
- **Game mode (Connect 4 / Connect 5)** : chosen by lobby creator, applies to both players

---

## User Features

### Profile

**Editable fields** :
- Username
- Email (requires current password)
- Password (requires current password)
- Avatar (image upload)
- Bio
- Pawn skin
- Grid skin

**Avatar upload** :
- Max size : 2 MB
- Formats : JPG, PNG, WebP
- Max dimensions : 500x500 (auto-resize if larger)
- Default avatar provided if none uploaded

**Stats displayed (publicly visible)** :
- Games played / won / lost / drawn
- Win rate (%)
- Last 10 games (opponent, result, date)
- Top 3 most frequent opponents

### Account Deletion

- Allowed by user
- **Anonymization** (not full deletion) : account marked as `is_deleted = true`
- Historical games show "Joueur supprimé" for the deleted user
- Original data retained for other users' history integrity

### Friends

- **Friend requests** : require confirmation/refusal (no direct add)
- **Block users** : blocked users cannot send messages or see profile
- **User search** by **username only** (not email)
- **Status visible to friends** : `online`, `offline`, `in_game`

### Chat

- Direct user-to-user only (no rooms)
- **Persistent history** stored in DB, displayed on conversation open
- Real-time delivery via WebSocket

---

## Lobby System

- **6-character code** generated at creation
- All lobbies (public + private) listed on the **"Rejoindre"** page
- **Public lobby** : click to join directly
- **Private lobby** : click → popup asks for the code
- Lobby creator chooses :
  - Mode (Connect 4 or Connect 5)
  - Total time per player (5 / 10 / 60 min)
  - Public or private
- **Filters** on the join page : mode, time, status (waiting / in progress)
- **Refresh button** to update the list (no real-time WebSocket on this list)
- Users already in a lobby/game cannot see the list
- **No matchmaking** (no random opponent finder)
- **No spectator mode**

---

## Notification System

- **In-app only** (no email, no browser push)
- Both **toast** (immediate via WebSocket) **and** persisted in DB
- **Dropdown** from a bell icon in the header (with unread count badge)
- No dedicated notifications page

**Triggered events** :
- Friend request received / accepted / refused
- Game invitation received
- Your turn (if returning to the site mid-game)
- Match finished (with result)
- New chat message
- Friend connected (optional)

---

## Cybersecurity (handled by cybersec dev)

- **HashiCorp Vault** stores all secrets : JWT secret, DB password, OAuth client_secret, etc.
- Backend loads secrets from Vault on startup (integration to be done together)
- **ModSecurity (WAF)** runs as reverse proxy in front of the API
- **HTTPS everywhere** via reverse proxy (Caddy or Nginx) — backend runs HTTP internally
- Detailed setup TBD by cybersec dev

---

## Code Conventions

### Git Workflow

- **One branch per developer** named `<login>_<scope>` (example: `rbourkai_backend`)
- **Pull Requests required** before merging to main, with GitHub review
- **Commit messages** : Conventional Commits format
  - `feat:` new feature
  - `fix:` bug fix
  - `chore:` tooling, config, dependencies
  - `docs:` documentation
  - `refactor:` code refactor without behavior change
  - `style:` formatting only
  - `test:` adding tests

### TypeScript / JavaScript Style

- **camelCase** : variables, functions
- **PascalCase** : components, classes, types, interfaces
- **kebab-case** : file names
- **Double quotes** `"` for strings
- **Semicolons** : yes (safer, avoids ASI pitfalls)
- **Indentation** : 2 spaces (Prettier default)
- **TypeScript** : not strict mode initially, will tighten later if useful

### File Organization

- `apps/server/` follows: `src/{config,db,routes,auth,game,socket,services,lib}/`
- `apps/web/` structure TBD by frontend lead

---

## Deployment

### Single-command launch

- `make` (or `make build`) : build and run everything (`podman-compose up --build -d`)
- `make stop` (or `make down`) : stop all containers
- `make clean` : stop + remove volumes
- `make re` : full reset and relaunch

### Environments

- **dev** : local development, hot reload, verbose logs, DB in Podman
- **prod** : production setup, secrets from Vault, optimized builds

### Secrets

- Local dev : `.env` file (gitignored), `.env.example` provided as reference
- Production : managed via HashiCorp Vault (cybersec scope)

---

## Project Requirements (mandatory per subject)

- Web application with frontend, backend, and database ✓
- Git with meaningful commits from all team members ✓
- Single-command deployment via Podman/Docker ✓
- Compatible with latest stable Google Chrome ✓
- No browser console warnings or errors
- **Privacy Policy** and **Terms of Service** pages (TBD content, must be linked from app)
- Multi-user support (multiple users active simultaneously) ✓
- Responsive frontend, accessible across devices
- CSS framework or styling solution (Tailwind) ✓
- `.env` ignored by Git, `.env.example` provided ✓
- Clear DB schema with relations ✓
- Secure auth (hashed + salted passwords) ✓
- Form/input validation on both frontend and backend
- HTTPS everywhere (cybersec scope)

---

## Languages

- **App UI** : French
- **README** : English (mandatory per subject)
- **Code comments / docs** : English
- **Commit messages** : English

---

## TBD Sections (decisions deferred)

These will be filled in as we make decisions :

- Frontend stack details (state management, animation lib, component lib confirmation)
- Frontend file/folder structure
- REST API routes (full list with payloads)
- WebSocket events (full list with payloads)
- Pawn skin list (names, colors, designs)
- Grid skin list (names, themes)
- Privacy Policy text
- Terms of Service text
- Cybersecurity stack details (specific Caddy/Nginx config, ModSecurity rules, Vault integration code)
- Project name (currently `ft_transcendence` placeholder)

---

## Notes for Claude Code

- **Always read this file first** before generating code or modifying files
- **Do not invent decisions** for sections marked TBD — ask the user instead
- **Respect conventions** strictly (commits, branches, naming, formatting)
- **Match the chosen stack** : do not propose React Router or Express — we use Astro and Fastify
- **The backend developer (user)** owns this file currently — frontend and cybersec sections will be expanded by their respective owners

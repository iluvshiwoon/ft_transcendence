# ft_transcendence — Project Task Breakdown

> **Goal:** Build a full-stack web application (Puissance 4 / Connect 4) with real-time multiplayer, AI opponent, lobby system, social features, notifications, and hardened security. Total: 19/19 points.
>
> **Stack:** Astro + React (frontend) · Fastify + Socket.io (backend) · PostgreSQL + Drizzle ORM · Docker Compose.
>
> **Team Size:** 4 people. Each task is assigned to a category and a difficulty to help distribute work.

---

## Table of Contents

- [Dependency Graph](#dependency-graph)
- [Category A: Frontend / Design](#category-a-frontend--design)
- [Category B: Backend](#category-b-backend)
- [Category C: Cybersecurity / DevOps](#category-c-cybersecurity--devops)
- [Checklist](#checklist)

---

## Dependency Graph

```
              ┌─────────────────────────────────────┐
              │  A1 / B1 / C1  — Foundation          │  (parallel)
              │  Scaffolding · DB Schema · Docker     │
              └──────────────────┬──────────────────┘
                                 │
           ┌─────────────────────┼──────────────────┐
           │                     │                  │
           ▼                     ▼                  ▼
     ┌──────────┐         ┌──────────┐       ┌──────────┐
     │    B2    │         │    A2    │       │  C2 / C3 │
     │   Auth   │         │  Layout  │       │  SecOps  │
     └────┬─────┘         └────┬─────┘       └──────────┘
          │                    │
    ┌─────┼──────┐             │
    │     │      │             │
    ▼     ▼      ▼             ▼
 ┌────┐ ┌────┐ ┌────┐      ┌──────┐
 │ B3 │ │ B4 │ │ A4 │      │  A3  │
 │OAuth│ │User│ │Auth│      │DesSystem│
 └────┘ └─┬──┘ └────┘      └──┬───┘
          │                   │
          ▼                   ▼
       ┌──────┐           ┌──────┐
       │  A5  │           │  B5  │
       │Profile│          │ Game │
       │ Stats │          │Logic │
       └──────┘           └──┬───┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
           ┌──────┐      ┌──────┐      ┌──────┐
           │  B6  │      │  A6  │      │  B9  │
           │Socket│      │GameUI│      │Notifs│
           └──┬───┘      └──────┘      └──────┘
              │
     ┌────────┼──────────┐
     │        │          │
     ▼        ▼          ▼
  ┌──────┐ ┌──────┐  ┌──────┐
  │  B7  │ │  B8  │  │  B10 │
  │Lobby │ │ Chat │  │Stats │
  │+Game │ │  DM  │  │ API  │
  └──┬───┘ └──────┘  └──────┘
     │
  ┌──┴──────────────┐
  │                 │
  ▼                 ▼
┌──────┐        ┌──────┐
│  A7  │        │  A8  │
│GameUI│        │Lobby │
│Custom│        │  UI  │
└──────┘        └──────┘
                        ┌──────┐
                        │  C4  │
                        │Deploy│
                        └──────┘
```

---

## Convention

Each task follows this structure:

| Field | Description |
|---|---|
| **ID** | Unique identifier |
| **Title** | Short name |
| **Difficulty** | Easy / Medium / Hard |
| **Prerequisites** | Task IDs that must be completed first |
| **Deliverable** | What files or artifacts this task produces |
| **Instructions** | Step-by-step high-level guidance |
| **Resources** | Links to documentation |

---

## Category A: Frontend / Design

Responsible for all UI: pages, components, game board, chat, lobby, notifications, and visual polish.

---

### A1 — Project Scaffolding

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | None |
| **Deliverable** | `front/` (Astro) and `back/` (Fastify) directories, root Makefile |

**Instructions:**

1. Create `front/` with `npm create astro@latest` — SSR mode, TypeScript, React integration.
2. Create `back/` with `npm init`, install Fastify + TypeScript, configure `tsconfig.json`.
3. Create root `Makefile` with targets: `all` (build + start), `stop`, `fclean`.
4. Create `.env.example` with all required variables (no values). Add `.env` to `.gitignore`.
5. Add `README.md` (English) with project description, prerequisites, and quick-start steps.
6. Configure ESLint (flat config) with TypeScript + React rules in each directory.
7. Verify `front/` dev server starts and `back/` compiles without errors.

**Resources:**
- [Astro SSR setup](https://docs.astro.build/en/guides/server-side-rendering/)
- [Fastify TypeScript](https://fastify.dev/docs/latest/Reference/TypeScript/)

---

### A2 — Astro SSR Layout & Routing

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | A1 |
| **Deliverable** | Base layout, navigation, all top-level routes |

**Instructions:**

1. Configure the `@astrojs/node` adapter for SSR.
2. Create `src/layouts/BaseLayout.astro`:
   - Header with navigation (Accueil, Jouer, Rejoindre, Chat, Profil) and bell notification icon.
   - Footer with Privacy Policy and Terms of Service links.
   - `<slot />` for page content.
3. Set up routes in `src/pages/`:
   - `index.astro` — landing page
   - `login.astro` / `signup.astro`
   - `profile/index.astro` (own) / `profile/[id].astro` (public)
   - `game/[id].astro` — active game
   - `lobby/index.astro` — list + join / `lobby/create.astro`
   - `chat.astro`
   - `privacy.astro` / `terms.astro` (real content, not placeholder)
4. Protect authenticated routes via `src/middleware.ts` (redirect to login if no valid JWT cookie).

**Resources:**
- [Astro routing](https://docs.astro.build/en/core-concepts/routing/)
- [Astro middleware](https://docs.astro.build/en/guides/middleware/)

---

### A3 — UI Design System

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | A2 |
| **Deliverable** | Tailwind theme + reusable React components |

**Instructions:**

1. Install Tailwind CSS with `@astrojs/tailwind`. Install shadcn/ui if confirmed by frontend lead.
2. Define design tokens in `src/styles/tokens.css` (colors, spacing, radius, shadows).
3. Build reusable React components in `src/components/ui/`:
   - `Button.tsx` — variants (primary, secondary, ghost, danger), loading state
   - `Input.tsx` — label, error message, icon
   - `Modal.tsx` — overlay, close button
   - `Card.tsx`
   - `Badge.tsx` — statuts : `online`, `offline`, `in_game`
   - `Avatar.tsx` — image with fallback initials
   - `Toast.tsx` — notification toast with auto-dismiss
4. Create placeholder components in `src/components/game/`:
   - `GameBoard.tsx`, `Token.tsx`

**Resources:**
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

---

### A4 — Auth Pages (Login / Signup)

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | A3, B2 |
| **Deliverable** | Login and signup pages with 42 OAuth button |

**Instructions:**

1. Build `src/pages/login.astro`:
   - Email + password form fields
   - "Se connecter avec 42" button
   - Link to signup page
   - Error display for invalid credentials
2. Build `src/pages/signup.astro`:
   - Username, email, password, confirm password fields
   - Client-side validation (length, email format, passwords match)
   - Same OAuth button
3. Create Astro API endpoints (`src/pages/api/auth/login.ts`, `signup.ts`, `logout.ts`, `me.ts`) that call the backend and set/clear the HttpOnly JWT cookie.
4. Ensure the middleware (`src/middleware.ts`) redirects unauthenticated users from protected pages.

---

### A5 — User Profile & Social Pages

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | A4, B4, B10 |
| **Deliverable** | Profile edit, public profile with stats, friends list |

**Instructions:**

1. Build `src/pages/profile/index.astro` (own profile):
   - Avatar upload (JPG/PNG/WebP, max 2 MB, auto-resize to 500×500)
   - Editable: username, email (requires password), password (requires current password), bio, pawn skin, grid skin
   - Game stats: played / won / lost / drawn, win rate %
   - Last 10 games (opponent, result, date)
   - Top 3 most frequent opponents
2. Build `src/pages/profile/[id].astro` (public profile):
   - Read-only display of username, avatar, bio, stats, match history
   - "Ajouter en ami" button (if not friends), "Bloquer" button
3. Build friends page with two tabs: accepted friends (with status badge) and pending requests (accept / decline).

---

### A6 — Game UI (Puissance 4 Board)

| | |
|---|---|
| **Difficulty** | Hard |
| **Prerequisites** | A3, B5 |
| **Deliverable** | Interactive game board + game status components |

**Instructions:**

1. Build `GameBoard.tsx`:
   - Grid configurable (7×6 default, 5×5 for Connect 5)
   - Empty / player 1 / player 2 cells
   - Column hover preview token
   - Drop animation (token falls to lowest empty row)
   - Win highlight: 4 (or 5) winning cells pulse/glow
2. Build `GameHeader.tsx`: player names + avatars + turn indicator.
3. Build `PlayerTimer.tsx`: chess-style countdown per player (pauses on opponent's turn). Red when < 30 seconds.
4. Build `GameStatus.tsx`: game-over overlay (winner / draw / forfeit / abandon), "Revanche" button, "Quitter" button.
5. Build `SurrenderButton.tsx`: manual forfeit, with confirmation modal.
6. Game page `src/pages/game/[id].astro` renders the board and connects to Socket.io.

---

### A7 — Game Customization UI

| | |
|---|---|
| **Difficulty** | Easy |
| **Prerequisites** | A6 |
| **Deliverable** | Skin selector in profile settings |

**Instructions:**

1. Add pawn skin selector and grid skin selector to the profile edit page.
2. Display a live preview of the selected skin on a mini board.
3. Call `PUT /api/profile` on save to persist the selection.
4. Pass active skin to `GameBoard.tsx` as props so it renders correctly.

---

### A8 — Lobby UI

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | A3, B7 |
| **Deliverable** | Lobby list, create lobby, lobby waiting room |

**Instructions:**

1. Build `src/pages/lobby/index.astro` — lobby list page:
   - Table of public + private lobbies (code, mode, time, status, player count)
   - Filters: mode (Connect 4 / Connect 5), timer, status (waiting / in progress)
   - "Rejoindre" button (direct for public, popup asking for code for private)
   - Manual refresh button (no auto-update WebSocket on this page)
   - Hidden from users currently in a lobby or game
2. Build `src/pages/lobby/create.astro`:
   - Mode selector (Connect 4 / Connect 5)
   - Timer selector (5 / 10 / 60 min)
   - Public / private toggle
   - "Créer" button → redirects to waiting room
3. Build `LobbyRoom.tsx` React component (waiting room):
   - Shows lobby code + copy button
   - Lists connected players (1 or 2)
   - "Lancer la partie" button (creator only, enabled when 2 players present)
   - "Quitter" button

---

### A9 — Chat UI

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | A3, B8 |
| **Deliverable** | DM chat page with message history |

**Instructions:**

1. Build `ChatPage.tsx`:
   - Sidebar: list of conversations (friend avatar + name + last message preview)
   - Message list: scrollable, auto-scroll on new message, avatar + username + timestamp + content
   - Input field with send button (Enter to send)
   - Typing indicator ("... est en train d'écrire")
2. Build `OnlineUserList.tsx`: online friends with green dot. Click to open conversation.
3. Connect to Socket.io on mount; handle `chat:message`, `chat:typing`, `user:online`, `user:offline` events.
4. On conversation open, load message history from REST API (`GET /api/chat/:userId`).
5. Blocked users: hide conversation, do not receive messages.

---

### A10 — Notification UI

| | |
|---|---|
| **Difficulty** | Easy |
| **Prerequisites** | A3, B9 |
| **Deliverable** | Bell dropdown + toast notifications |

**Instructions:**

1. Add bell icon to `BaseLayout.astro` header with unread count badge.
2. Build `NotificationDropdown.tsx`:
   - List of recent notifications (icon, text, timestamp, read/unread state)
   - Click on notification marks it as read (`PATCH /api/notifications/:id/read`)
   - "Tout marquer comme lu" button
3. Build `ToastContainer.tsx`: floating container for transient toasts (auto-dismiss after 4 s). Plug into Socket.io events to trigger toasts in real time.
4. Connect to Socket.io `notification:new` event to push toasts and update unread badge without page reload.

---

## Category B: Backend

Responsible for all server-side logic: database, authentication, game engine, Socket.io, and APIs.

---

### B1 — Database Schema & Drizzle Setup

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | None |
| **Deliverable** | Drizzle schema, migrations, seed script |

**Instructions:**

1. Install PostgreSQL via Docker for development.
2. Install: `drizzle-orm`, `drizzle-kit`, `pg`, `@types/pg`.
3. Create `back/src/db/schema.ts` with these tables:

   **users:** `id`, `email` (unique), `password` (nullable for OAuth), `username` (unique), `avatar_url`, `bio`, `status` (online/offline/in_game), `is_deleted` (bool, false), `oauth_42_id` (nullable), `pawn_skin`, `grid_skin`, `games_played`, `games_won`, `games_lost`, `games_drawn`, `created_at`, `updated_at`

   **friendships:** `id`, `user_id` (FK→users), `friend_id` (FK→users), `status` (pending/accepted), `created_at`

   **blocked_users:** `id`, `user_id` (FK→users), `blocked_user_id` (FK→users), `created_at`

   **games:** `id`, `player1_id` (FK→users), `player2_id` (FK→users, nullable), `is_ai_opponent` (bool), `ai_difficulty` (easy/medium/hard, nullable), `winner_id` (FK→users, nullable), `status` (waiting/in_progress/finished/abandoned), `mode` (connect4/connect5), `time_per_player_seconds`, `started_at`, `finished_at`

   **moves:** `id`, `game_id` (FK→games), `player_id` (FK→users, nullable for AI), `column`, `row`, `move_number`, `played_at`

   **lobbies:** `id`, `code` (6-char, unique), `creator_id` (FK→users), `is_public` (bool), `mode` (connect4/connect5), `time_per_player_seconds`, `status` (waiting/in_progress/closed), `created_at`

   **chat_messages:** `id`, `sender_id` (FK→users), `receiver_id` (FK→users), `content`, `created_at`

   **notifications:** `id`, `user_id` (FK→users), `type` (friend_request/friend_accepted/game_invite/game_finished/chat_message), `content` (JSON), `read` (bool, false), `created_at`

4. Define Drizzle `relations` for all foreign keys.
5. Run `drizzle-kit generate` then `drizzle-kit migrate`.
6. Write a seed script with test users and sample data.

**Resources:**
- [Drizzle schema](https://orm.drizzle.team/docs/sql-schema-declaration)
- [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started/postgresql-new)

---

### B2 — Authentication System

| | |
|---|---|
| **Difficulty** | Hard |
| **Prerequisites** | B1 |
| **Deliverable** | JWT auth flow, password hashing, auth middleware |

**Instructions:**

1. Install: `bcrypt`, `jsonwebtoken`, `@types/jsonwebtoken`.
2. Create `back/src/auth/password.ts`: `hashPassword(plain)` (bcrypt, 12 rounds), `verifyPassword(plain, hash)`.
3. Create `back/src/auth/jwt.ts`: `signToken(payload)` (7-day expiry, no refresh token), `verifyToken(token)`.
4. Create Fastify routes:
   - `POST /api/auth/signup` — validate, check uniqueness, hash password, insert user, set JWT HttpOnly cookie
   - `POST /api/auth/login` — verify credentials, set cookie
   - `POST /api/auth/logout` — clear cookie
   - `GET /api/auth/me` — return user from JWT
5. Create Fastify `preHandler` hook to verify JWT on protected routes (reads cookie).
6. Email and password changes require re-sending the current password for verification.

**Resources:**
- [bcrypt npm](https://www.npmjs.com/package/bcrypt)
- [jsonwebtoken npm](https://www.npmjs.com/package/jsonwebtoken)

---

### B3 — OAuth 42

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | B2 |
| **Deliverable** | 42 OAuth login flow |

**Instructions:**

1. Register the application on [api.intra.42.fr](https://api.intra.42.fr/).
2. Create `back/src/auth/oauth42.ts`:
   - `getAuthorizationUrl(): string` — build redirect URL with scopes
   - `exchangeCode(code): tokens`
   - `getUserInfo(accessToken): { id, login, email, image }`
3. Create routes:
   - `GET /api/auth/42` — redirect to 42 auth page
   - `GET /api/auth/42/callback` — exchange code, find or create user, set JWT cookie, redirect to home
4. Account linking: if a logged-in user hits the callback, store `oauth_42_id` on their existing account.

**Resources:**
- [42 API web application flow](https://api.intra.42.fr/apidoc/guides/web_application_flow)

---

### B4 — User Management API

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | B2 |
| **Deliverable** | User CRUD endpoints |

**Instructions:**

Create these Fastify routes (all require auth except `GET /api/users/:id`):

| Endpoint | Method | Description |
|---|---|---|
| `/api/users/:id` | GET | Public profile (username, avatar, bio, stats) |
| `/api/users/search` | GET | Search by username |
| `/api/profile` | GET | Own profile (includes email) |
| `/api/profile` | PUT | Update username, bio, pawn_skin, grid_skin |
| `/api/profile/email` | PUT | Update email (requires current password) |
| `/api/profile/password` | PUT | Update password (requires current password) |
| `/api/profile/avatar` | POST | Upload avatar (JPG/PNG/WebP, max 2 MB) |
| `/api/profile/delete` | DELETE | Anonymize account (set is_deleted = true) |
| `/api/friends` | GET | List accepted friends |
| `/api/friends/requests` | GET | List pending requests |
| `/api/friends/request` | POST | Send friend request |
| `/api/friends/respond` | POST | Accept / decline request |
| `/api/friends/:id` | DELETE | Remove friend |
| `/api/block` | POST | Block user |
| `/api/block/:id` | DELETE | Unblock user |

Avatar upload: save to `public/uploads/avatars/`, store URL in DB. Auto-resize to 500×500 if larger.

---

### B5 — Game Logic Engine

| | |
|---|---|
| **Difficulty** | Hard |
| **Prerequisites** | B1 |
| **Deliverable** | Pure, framework-agnostic game logic module |

**Instructions:**

1. Create `back/src/game/board.ts`:
   - `createBoard(rows, cols)` — empty grid
   - `dropToken(board, col, player)` — returns `{ board, row }` or `null` if column full
   - `getValidMoves(board)` — list of playable columns
2. Create `back/src/game/winDetection.ts`:
   - `checkWin(board, lastRow, lastCol, connectN)` — checks 4 directions for N consecutive tokens
   - `isDraw(board)` — true if board full with no winner
3. Create `back/src/game/ai.ts` — minimax with alpha-beta pruning:
   - `getBestMove(board, connectN, difficulty)` — returns best column
   - Difficulty controls search depth: easy (depth 2 + 30% random), medium (depth 5), hard (depth 8)
   - Artificial delay: schedule move after 500–2000 ms random delay
4. Create `back/src/game/gameState.ts` — `GameState` class:
   - Properties: `board`, `currentPlayer`, `players`, `variant`, `status`, `timerP1`, `timerP2`
   - Methods: `makeMove(col)`, `getState()`, `loadState(data)`
5. Write unit tests (vitest) for all game logic — board creation, win detection in all directions, draws, AI determinism at hard difficulty.

---

### B6 — Socket.io Infrastructure

| | |
|---|---|
| **Difficulty** | Hard |
| **Prerequisites** | B1, A1 |
| **Deliverable** | Fastify Socket.io server with auth, room management |

**Instructions:**

1. Install `@fastify/socket.io`.
2. Create `back/src/socket/index.ts`: register the Socket.io plugin on Fastify, configure CORS for the Astro dev server origin.
3. Create `back/src/socket/auth.ts`:
   - `io.use()` middleware: extract JWT from handshake cookie or query param, verify, attach user to `socket.data.user`.
   - Reject unauthenticated connections.
4. Create `back/src/socket/roomManager.ts`:
   - `joinRoom(socketId, roomId)`, `leaveRoom(socketId, roomId)`, `broadcast(roomId, event, data, exclude?)`
   - `getOnlineUsers()` — users with at least one active socket
5. Create `back/src/socket/messageRouter.ts`: route incoming events by namespace prefix (`game:*`, `chat:*`, `lobby:*`, `notification:*`).
6. On `connection`: mark user `online`, broadcast `user:online` to friends. On `disconnect`: clean rooms, mark `offline`, broadcast `user:offline`.

**Resources:**
- [@fastify/socket.io](https://github.com/fastify/fastify-socket.io)
- [Socket.io docs](https://socket.io/docs/v4/)

---

### B7 — Lobby System & Game Sync

| | |
|---|---|
| **Difficulty** | Hard |
| **Prerequisites** | B5, B6 |
| **Deliverable** | Lobby management + real-time game flow |

**Instructions:**

1. **Lobby REST endpoints** (Fastify):

   | Endpoint | Method | Description |
   |---|---|---|
   | `/api/lobbies` | GET | List all lobbies (filter by mode/timer/status) |
   | `/api/lobbies` | POST | Create lobby (generates 6-char code) |
   | `/api/lobbies/:id/join` | POST | Join public lobby or private with code |
   | `/api/lobbies/:id/leave` | POST | Leave lobby |
   | `/api/lobbies/:id/start` | POST | Start game (creator only, 2 players required) |

2. **Game Socket.io events:**

   | Event | Direction | Description |
   |---|---|---|
   | `lobby:join` | C→S | Join lobby room |
   | `lobby:update` | S→C | Broadcast lobby state (players present) |
   | `game:start` | S→C | Game created, redirect both players |
   | `game:move` | C→S | Submit column, validate on server |
   | `game:state` | S→C | Full game state after each move |
   | `game:over` | S→C | Winner / draw / forfeit / abandon info |
   | `game:rematch` | C→S | Request rematch |
   | `game:surrender` | C→S | Manual forfeit |
   | `game:timer` | S→C | Timer update every second |

3. **Server authority:** the server holds the `GameState` in memory per game. On each move: validate (correct player, valid column, game active) → apply → check win/draw → broadcast `game:state` → persist move to DB.
4. **Timer:** server-side countdown. When a player's time hits 0, trigger a loss. Pause timer on opponent's turn.
5. **Disconnection:** 60-second reconnection window. If the player reconnects, re-send full `game:state`. If not, auto-abandon and update game status.
6. **AI games:** no lobby needed. Create game directly via `POST /api/games/ai`. The server plays AI moves after a random 500–2000 ms delay.
7. Persist each move to the `moves` table. Update user stats and `games` table on game completion.

---

### B8 — Chat System (DM)

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | B6 |
| **Deliverable** | Direct message system with persistence |

**Instructions:**

1. **Chat REST endpoints:**

   | Endpoint | Method | Description |
   |---|---|---|
   | `/api/chat` | GET | List conversations (one per contact) |
   | `/api/chat/:userId` | GET | Message history with a user (paginated) |

2. **Chat Socket.io events:**

   | Event | Direction | Description |
   |---|---|---|
   | `chat:send` | C→S | Send message to a user |
   | `chat:message` | S→C | Deliver message to recipient |
   | `chat:typing` | C→S | Start/stop typing indicator |
   | `chat:typing` | S→C | Forward typing indicator to recipient |

3. On `chat:send`: check neither user has blocked the other. Insert into `chat_messages`. Deliver to recipient via Socket.io if online. Trigger `notification:new` event for the recipient.
4. Rate limiting: max 10 messages per 5 seconds per socket (in-memory counter).
5. Blocked users: silently drop messages from blocked users (no error response).

---

### B9 — Notification System

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | B6 |
| **Deliverable** | Notification persistence + real-time delivery |

**Instructions:**

1. Create `back/src/notifications/notificationService.ts`:
   - `send(userId, type, content)` — insert to DB + emit `notification:new` via Socket.io if user is online

2. **Notification REST endpoints:**

   | Endpoint | Method | Description |
   |---|---|---|
   | `/api/notifications` | GET | Get all notifications (unread first) |
   | `/api/notifications/unread-count` | GET | Unread badge count |
   | `/api/notifications/:id/read` | PATCH | Mark one as read |
   | `/api/notifications/read-all` | PATCH | Mark all as read |

3. Plug `notificationService.send()` into all triggering events:
   - Friend request received / accepted / declined
   - Game invitation received
   - Match finished (with result: won / lost / draw / abandoned)
   - New chat message received (if the conversation is not open)
   - Friend comes online (optional)

**Notification `content` payload examples:**
```json
{ "type": "friend_request", "from": { "id": 42, "username": "jdoe", "avatar": "..." } }
{ "type": "game_finished", "gameId": 7, "result": "won", "opponent": "..." }
```

---

### B10 — Game Stats API

| | |
|---|---|
| **Difficulty** | Easy |
| **Prerequisites** | B7 |
| **Deliverable** | Match history and stats endpoints |

**Instructions:**

1. **Stats endpoints:**

   | Endpoint | Method | Description |
   |---|---|---|
   | `/api/users/:id/stats` | GET | Games played/won/lost/drawn, win rate |
   | `/api/users/:id/games` | GET | Last 10 games (paginated) |
   | `/api/users/:id/opponents` | GET | Top 3 most frequent opponents |

2. Stats columns (`games_played`, `games_won`, etc.) are maintained on the `users` table. Update them in the same DB transaction as setting `games.status = 'finished'`.
3. For deleted accounts (`is_deleted = true`), return `{ username: "Joueur supprimé", avatar: null }` in match history responses.

---

## Category C: Cybersecurity / DevOps

Responsible for containerization, security hardening, and deployment.

---

### C1 — Docker Compose Setup

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | A1, B1 |
| **Deliverable** | Dockerfiles, `docker-compose.yml`, working local deployment |

**Instructions:**

1. Create `front/Dockerfile` (multi-stage: build Astro → serve with Node).
2. Create `back/Dockerfile` (multi-stage: build TypeScript → run with Node).
3. Create `nginx/Dockerfile` with ModSecurity (or use `owasp/modsecurity-crs:nginx` base image).
4. Create `docker-compose.yml` with services: `postgres`, `vault`, `nginx`, `front`, `back`.
5. Networking: all services on an internal `app-net` network. Only `nginx` exposes ports 80/443 externally.
6. Volumes: `pgdata` for PostgreSQL persistence, `uploads` for avatar files.
7. `back` depends on `postgres` and `vault` being healthy before starting.
8. Verify `make` starts all services cleanly from a fresh state.

---

### C2 — HashiCorp Vault Integration

| | |
|---|---|
| **Difficulty** | Hard |
| **Prerequisites** | C1 |
| **Deliverable** | All secrets loaded from Vault, not from env vars |

**Instructions:**

1. Create `scripts/init-vault.sh`:
   - Enable AppRole auth method
   - Create policy `transcendence-policy`
   - Write secrets: `secret/transcendence/db`, `secret/transcendence/jwt`, `secret/transcendence/oauth42`
   - Create AppRole role, output RoleID + SecretID
2. In `back/src/index.ts`: on startup, use `node-vault` to authenticate via AppRole, fetch all secrets, make them available in-memory (never log them).
3. Fail fast if Vault is unreachable: log a clear error and `process.exit(1)`.
4. Only secrets unavailable via Vault (e.g., Vault's own token) stay in `.env`.

**Resources:**
- [node-vault npm](https://www.npmjs.com/package/node-vault)
- [Vault AppRole auth](https://developer.hashicorp.com/vault/docs/auth/approle)

---

### C3 — ModSecurity WAF

| | |
|---|---|
| **Difficulty** | Hard |
| **Prerequisites** | C1 |
| **Deliverable** | Nginx reverse proxy with ModSecurity + OWASP CRS |

**Instructions:**

1. Use `owasp/modsecurity-crs:nginx` as base image, or compile Nginx + ModSecurity from source.
2. Configure `nginx.conf`:
   - Reverse proxy to `back:3000` and `front:4321`
   - Forward WebSocket upgrade headers (`Upgrade`, `Connection`)
   - Reasonable client body size limit
   - TLS termination (self-signed cert for dev, real cert for prod)
3. `modsecurity.conf`:
   - Start with `SecRuleEngine DetectionOnly` during development
   - Switch to `SecRuleEngine On` for production
   - Include OWASP CRS rules
4. Test with common attacks (SQLi, XSS, path traversal). Verify they are blocked.
5. Tune: use `SecRuleRemoveById` to disable false-positive rules that block legitimate app payloads (e.g., JSON in chat).

**Resources:**
- [OWASP CRS](https://coreruleset.org/)
- [owasp/modsecurity-crs Docker image](https://github.com/coreruleset/modsecurity-crs-docker)

---

### C4 — Single-Command Deployment

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | C1, C2, C3 |
| **Deliverable** | `Makefile` targets + deployment documentation |

**Instructions:**

1. `Makefile` targets:
   - `all` : `docker compose up --build -d` + `scripts/init-vault.sh`
   - `stop` : `docker compose stop`
   - `fclean` : `docker compose down -v --rmi all`
2. `scripts/init-vault.sh` must be idempotent (safe to run multiple times).
3. Validate required env vars in the Makefile before starting (fail with a clear message if missing).
4. Update `README.md` with:
   - Prerequisites (Docker, Docker Compose)
   - Quick start: `cp .env.example .env` → fill values → `make`
   - Dev setup (local Node.js without Docker)
5. Test: `make fclean && make` from a clean state, verify the app is accessible in the browser.

---

## Checklist

### Foundation
- [ ] A1 — Scaffolding (front/ + back/ + Makefile)
- [ ] C1 — Docker Compose setup

### Backend — Dev 1 (cœur du projet)
- [ ] B1 — Database Schema & Drizzle Setup
- [ ] B2 — Authentication System
- [ ] B5 — WebSocket Infrastructure
- [ ] B6 — Game Logic Engine (Puissance 4)
- [ ] B7 — Lobby System
- [ ] B8 — Game Sync (multiplayer)
- [ ] B9 — AI Opponent

### Backend — Dev 2 (features annexes)
- [ ] B3 — OAuth 42
- [ ] B4 — User Management API + Friends + Block
- [ ] B10 — Real-time Chat
- [ ] B11 — Notifications System
- [ ] B12 — Stats (match history, win rate)
- [ ] B13 — Game Customization (skins jetons + grille)

### Backend — Commun
- [ ] B14 — Validation, Rate limiting, Polish
- [ ] B15 — Connexion Vault (avec la cybersec)

### Frontend Roadmap
- [ ] A2 — SSR layout & routing
- [ ] A3 — UI design system
- [ ] A4 — Auth pages
- [ ] A5 — Profile & social pages
- [ ] A6 — Game board UI
- [ ] A7 — Game customization UI (skins)
- [ ] A8 — Lobby UI
- [ ] A9 — Chat UI
- [ ] A10 — Notification UI

### Security & Deployment (ongoing)
- [ ] C2 — HashiCorp Vault
- [ ] C3 — ModSecurity WAF
- [ ] C4 — Single-command deploy (make)

---

*Based on [en.subject.pdf](en.subject.pdf) and [modules.md](modules.md).*

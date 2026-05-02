# ft_transcendence — Project Task Breakdown

> **Goal:** Build a full-stack web application (Puissance 4 / Connect 4) with real-time multiplayer, AI opponent, social features, and hardened security. Total: 19/19 points.
>
> **Stack:** Astro (Frontend + SSR) + Fastify (WebSocket backend) + PostgreSQL + Drizzle ORM + Podman.
>
> **Team Size:** 4–5 people. Each task below is assigned a difficulty to help distribute work.

---

## Table of Contents

- [Dependency Graph](#dependency-graph)
- [Category A: Frontend / Design](#category-a-frontend--design)
- [Category B: Backend](#category-b-backend)
- [Category C: Cybersecurity / DevOps](#category-c-cybersecurity--devops)

---

## Dependency Graph

```
                     ┌──────────────────────┐
                     │  A1 / B1 / C1        │  Foundation (parallel)
                     │  Scaffolding + DB     │
                     └──────────┬───────────┘
                                │
              ┌─────────────────┼──────────────────┐
              │                 │                  │
              ▼                 ▼                  ▼
        ┌──────────┐     ┌──────────┐      ┌───────────┐
        │   B2     │     │   A2     │      │  C2 / C3  │
        │   Auth   │     │  Layout  │      │  SecOps   │
        └────┬─────┘     └────┬─────┘      └───────────┘
             │                │
       ┌─────┼───────┐        │
       │     │       │        │
       ▼     ▼       ▼        ▼
   ┌─────┐ ┌────┐ ┌────┐ ┌──────┐
   │ B3  │ │ B4 │ │ A4 │ │  A3  │
   │OAuth│ │User│ │Auth│ │DesSys│
   └─────┘ └─┬───┘ └────┘ └──┬───┘
             │                │
             ▼                ▼
          ┌──────┐       ┌──────┐
          │  A5  │       │  B5  │
          │Profile│      │ Game │
          └──────┘       │ Logic│
                         └──┬───┘
                            │
                    ┌───────┼────────┐
                    │       │        │
                    ▼       ▼        ▼
                 ┌────┐ ┌──────┐ ┌──────┐
                 │ B6 │ │  A6  │ │  B9  │
                 │ WSS │ │GameUI│ │Tourn │
                 └─┬───┘ └──────┘ └──────┘
                   │
            ┌──────┼────┐
            │      │    │
            ▼      ▼    │
         ┌────┐ ┌────┐  │
         │ B7 │ │ B8 │  │
         │Game│ │Chat│  │
         │Sync│ └────┘  │
         └──┬──┘        │
            │           │
            ▼           ▼
         ┌──────┐   ┌──────┐
         │  A8  │   │  A9  │
         │TourUI│   │ChatUI│
         └──────┘   └──────┘
                            ┌──────┐
                            │  C4  │
                            │Deploy│
                            └──────┘
```

**How to read this graph:** Solid lines mean the task below depends on the task above. Tasks at the same depth with no connecting lines can be worked on in parallel.

---

## Convention

Each task follows this structure:

| Field | Description |
|---|---|
| **ID** | Unique identifier (A1–A9, B1–B9, C1–C4) |
| **Title** | Short name |
| **Difficulty** | Easy / Medium / Hard |
| **Prerequisites** | Task IDs that must be completed first |
| **Deliverable** | What files or artifacts this task produces |
| **Instructions** | Step-by-step high-level guidance |
| **Resources** | Links to documentation and tutorials |

---

## Category A: Frontend / Design

Responsible for all user-facing UI: pages, components, game board, chat, and visual polish.

---

### A1 — Project Scaffolding & Monorepo Setup

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | None |
| **Deliverable** | Monorepo with `apps/web` (Astro) and `apps/server` (Fastify) |

**Instructions:**

1. Initialize the repo as a pnpm workspace. Create `pnpm-workspace.yaml`:
   ```yaml
   packages:
     - "apps/*"
     - "packages/*"
   ```
2. Create `apps/web` using `pnpm create astro@latest` with SSR + TypeScript + React integration.
3. Create `apps/server` as a Fastify TypeScript project with `@fastify/websocket`.
4. Create `packages/shared` for shared game logic and types.
5. Set up TypeScript configs (`tsconfig.json`) in each package with project references.
6. Add a root `package.json` with scripts: `dev`, `build`, `lint`.
7. Configure ESLint (flat config) with TypeScript and React rules.
8. Verify the dev servers start with `pnpm dev`.

**Resources:**
- [Astro monorepo guide](https://deepwiki.com/withastro/astro/2-monorepo-architecture)
- [PNPM workspaces](https://pnpm.io/workspaces)
- [Astro SSR setup](https://docs.astro.build/en/guides/server-side-rendering/)

---

### A2 — Astro SSR Layout & Routing

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | A1 |
| **Deliverable** | Base layout, navigation, route structure, Privacy Policy & Terms pages |

**Instructions:**

1. Configure Astro SSR with the `@astrojs/node` adapter.
2. Create a `src/layouts/BaseLayout.astro` with:
   - `<head>` with meta tags and font loading
   - Header with navigation links (Home, Play, Tournament, Chat, Profile)
   - Footer with Privacy Policy and Terms of Service links
   - `<slot />` for page content
3. Set up routes in `src/pages/`:
   - `index.astro` — landing page
   - `login.astro` / `signup.astro`
   - `profile/` — profile pages
   - `game/` — game pages
   - `tournament/` — tournament pages
   - `chat/` — chat page
   - `privacy.astro` — Privacy Policy
   - `terms.astro` — Terms of Service
4. Write meaningful content for privacy and terms pages (not placeholder text).
5. Ensure all routes use `BaseLayout`.

**Resources:**
- [Astro routing](https://docs.astro.build/en/core-concepts/routing/)
- [Astro layouts](https://docs.astro.build/en/core-concepts/layouts/)

---

### A3 — UI Design System

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | A2 |
| **Deliverable** | Reusable React components + Tailwind theme |

**Instructions:**

1. Install Tailwind CSS with `@astrojs/tailwind`.
2. Define CSS custom properties (design tokens) in `src/styles/tokens.css`:
   - Colors: primary, secondary, background, surface, text, error, success
   - Spacing scale (4px base), border radius, shadow levels
3. Build reusable React components in `src/components/ui/`:
   - `Button.tsx` — variants (primary, secondary, ghost, danger), sizes, loading state
   - `Input.tsx` — label, error message, icon support
   - `Modal.tsx` — overlay, close button, slot for content
   - `Card.tsx` — header, body, footer slots
   - `Badge.tsx` — status indicators (online, offline, in-game)
   - `Avatar.tsx` — image with fallback initials
   - `Spinner.tsx` — loading indicator
4. Create a `src/components/game/` folder for game-specific components (placeholder for now):
   - `GameBoard.tsx`
   - `Token.tsx`

**Resources:**
- [Tailwind CSS docs](https://tailwindcss.com/docs)
- [React + Astro](https://docs.astro.build/en/guides/integrations-guide/react/)

---

### A4 — Auth Pages (Login / Signup)

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | A3, B2 |
| **Deliverable** | Login and signup forms with OAuth buttons |

**Instructions:**

1. Build `src/pages/login.astro` with:
   - Email + password form fields (using the Input component)
   - "Login with Google" and "Login with 42" buttons
   - Link to signup page
   - Error display for invalid credentials
2. Build `src/pages/signup.astro` with:
   - Username, email, password, confirm password fields
   - Client-side validation (password length, email format, passwords match)
   - Same OAuth buttons
3. Create Astro endpoints `src/pages/api/auth/login.ts` and `src/pages/api/auth/signup.ts` that call the backend auth logic, set httpOnly cookies, and redirect.
4. Create middleware in `src/middleware.ts` to check auth state and redirect unauthenticated users from protected pages.
5. Style everything with the design system components.

**Resources:**
- [Astro API endpoints](https://docs.astro.build/en/guides/endpoints/)
- [Astro middleware](https://docs.astro.build/en/guides/middleware/)

---

### A5 — User Profile & Social Pages

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | A4, B4 |
| **Deliverable** | Profile edit, public profile, friends list pages |

**Instructions:**

1. Build `src/pages/profile/index.astro` (own profile):
   - Avatar display + upload button
   - Editable fields: username, bio
   - Match history list (wins/losses, opponents, dates)
   - Online status toggle
2. Build `src/pages/profile/[id].astro` (public profile):
   - Read-only display of username, avatar, bio, match history
   - "Add Friend" button (if not already friends)
3. Build `src/pages/friends.astro`:
   - Two tabs: "Friends" (accepted) and "Requests" (pending)
   - Each friend shows avatar, name, online status, "Remove" button
   - Requests show "Accept" / "Decline" buttons
4. Create React components for friend list items and request cards.

**Resources:**
- [Astro dynamic routes](https://docs.astro.build/en/core-concepts/routing/#dynamic-routes)
- [File upload in Astro](https://docs.astro.build/en/recipes/file-uploads/)

---

### A6 — Game UI (Puissance 4 Board)

| | |
|---|---|
| **Difficulty** | Hard |
| **Prerequisites** | A3, B5 |
| **Deliverable** | Interactive game board React component |

**Instructions:**

1. Build `GameBoard.tsx` component:
   - Render a 7-column × 6-row grid of cells
   - Each cell can be: empty, player 1 token (red), player 2 token (yellow)
   - When hovering over a column, show a preview token at the top of that column
   - On click, emit the column number to a callback
   - After a token is placed, animate it "dropping" to the lowest empty row
2. Build `WinHighlight.tsx` to animate the 4 winning cells (pulse/glow effect).
3. Build `GameHeader.tsx` showing:
   - Player names + avatars
   - Current turn indicator
   - Timer (optional, stretch goal)
4. Build `GameStatus.tsx` for game-over state: winner announcement, rematch button, leave button.
5. Create game pages:
   - `src/pages/game/local.astro` — play locally (two players on same device / hot-seat)
   - `src/pages/game/online.astro` — online matchmaking
   - `src/pages/game/ai.astro` — vs AI
   - `src/pages/game/[id].astro` — specific online game (spectate or join)

**Resources:**
- [React state management](https://react.dev/learn/managing-state)
- [React CSS transition / animation](https://react.dev/reference/react-dom/components/common#applying-css-transitions)

---

### A7 — Game Customization UI

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | A6 |
| **Deliverable** | Settings panel for themes, grid size, game variant |

**Instructions:**

1. Build `GameSettings.tsx` component (shown in a modal or sidebar):
   - Theme selector: predefined color palettes (dark, light, neon, retro)
   - Grid size selector: 7×6 (default), 8×7, 9×7
   - Game variant toggle: Connect 4 / Connect 5
   - "Apply" button that updates game config
2. Persist preferences to localStorage and optionally send to backend API for account-wide sync.
3. Pass settings as props to `GameBoard.tsx` so it renders correctly (variable columns/rows).

**Resources:**
- [React controlled forms](https://react.dev/reference/react-dom/components/input)

---

### A8 — Tournament UI

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | A6, B9 |
| **Deliverable** | Tournament registration, bracket display, results |

**Instructions:**

1. Build `TournamentList.tsx` — list of active/upcoming/completed tournaments with register buttons.
2. Build `TournamentBracket.tsx`:
   - Visual single-elimination bracket (rounds advancing left to right)
   - Each match shows player names, score, status (pending / in-progress / completed)
   - Current match highlighted
3. Build `TournamentMatch.tsx` — component for a single match slot within the bracket.
4. Create tournament pages:
   - `src/pages/tournament/index.astro` — list all tournaments
   - `src/pages/tournament/[id].astro` — specific tournament with bracket

**Resources:**
- [CSS grid for bracket layout](https://css-tricks.com/single-elimination-tournament-bracket-layout-with-css-grid/)

---

### A9 — Real-time Chat UI

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | A3, B8 |
| **Deliverable** | Chat panel with messages, online users, typing indicators |

**Instructions:**

1. Build `ChatPanel.tsx` component:
   - Message list (scrollable, auto-scroll on new messages)
   - Message bubble: avatar + username + timestamp + content
   - Input field with send button (Enter to send)
   - Typing indicator ("User is typing...")
2. Build `OnlineUserList.tsx`:
   - List of currently online users with green dot indicator
   - Click to view user's public profile
3. Build `ChatRoom.tsx` — wrapper that connects to WebSocket, manages message state, and renders ChatPanel + OnlineUserList.
4. Create chat page `src/pages/chat.astro` with global chat room.
5. Add a chat sidebar/panel that can be toggled from game pages.

**Resources:**
- [React use-websocket hook](https://www.npmjs.com/package/use-websocket) or [custom hook pattern](https://usehooks-ts.com/react-hook/use-websocket)

---

## Category B: Backend

Responsible for all server-side logic: database, authentication, game engine, WebSocket, and APIs.

---

### B1 — Database Schema & Drizzle Setup

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | None |
| **Deliverable** | Drizzle schema files, migrations, seed script |

**Instructions:**

1. Install PostgreSQL locally or via Podman for development.
2. Install dependencies: `drizzle-orm`, `drizzle-kit`, `pg`, `@types/pg`.
3. Create `packages/shared/src/db/schema.ts` with these tables:

   **users**:
   ```
   id (serial, PK), username (varchar, unique), email (varchar, unique),
   password_hash (varchar), avatar_url (varchar, nullable),
   bio (text, nullable), oauth_provider (varchar, nullable),
   oauth_id (varchar, nullable), created_at (timestamp, default now()),
   updated_at (timestamp, default now())
   ```

   **games**:
   ```
   id (serial, PK), player1_id (int, FK -> users), player2_id (int, FK -> users, nullable),
   winner_id (int, FK -> users, nullable), status (varchar: pending/active/completed/abandoned),
   state (jsonb — board array + current turn), variant (varchar: connect4/connect5),
   grid_rows (int, default 6), grid_cols (int, default 7),
   created_at (timestamp), finished_at (timestamp, nullable)
   ```

   **tournaments**:
   ```
   id (serial, PK), name (varchar), status (varchar: registration/active/completed),
   bracket (jsonb), created_at (timestamp), winner_id (int, FK -> users, nullable)
   ```

   **tournament_participants**:
   ```
   id (serial, PK), tournament_id (int, FK -> tournaments), user_id (int, FK -> users),
   seed (int), created_at (timestamp)
   ```

   **chat_messages**:
   ```
   id (serial, PK), sender_id (int, FK -> users), room (varchar: "global" or "game:<id>"),
   content (text), created_at (timestamp)
   ```

   **friendships**:
   ```
   id (serial, PK), requester_id (int, FK -> users), addressee_id (int, FK -> users),
   status (varchar: pending/accepted/rejected), created_at (timestamp),
   updated_at (timestamp)
   ```
4. Define proper relations (Drizzle `relations`) for all foreign keys.
5. Run `drizzle-kit generate` to create migration files, then `drizzle-kit migrate` to apply them.
6. Create a seed script with test users and sample data.

**Resources:**
- [Drizzle schema declaration](https://orm.drizzle.team/docs/sql-schema-declaration)
- [Drizzle PostgreSQL setup](https://orm.drizzle.team/docs/get-started/postgresql-new)
- [Drizzle migrations](https://orm.drizzle.team/docs/migrations)
- [Drizzle relations](https://orm.drizzle.team/docs/rqb)

---

### B2 — Authentication System

| | |
|---|---|
| **Difficulty** | Hard |
| **Prerequisites** | B1 |
| **Deliverable** | JWT auth flow, password hashing, auth middleware |

**Instructions:**

1. Install dependencies: `bcrypt`, `jsonwebtoken`, `cookie`.
2. Create `packages/shared/src/auth/password.ts`:
   - `hashPassword(plain): string` — bcrypt with salt rounds 12
   - `verifyPassword(plain, hash): boolean`
3. Create `packages/shared/src/auth/jwt.ts`:
   - `signToken(payload): string` — JWT with user id + username, expires in 24h
   - `verifyToken(token): payload | null`
   - `signRefreshToken(payload): string` — expires in 7 days
4. Create Astro API endpoints:
   - `POST /api/auth/signup` — validate fields, check uniqueness, hash password, insert user, set JWT cookie, return user
   - `POST /api/auth/login` — verify credentials, set JWT cookie, return user
   - `POST /api/auth/logout` — clear cookie
   - `GET /api/auth/me` — return current user from JWT cookie
5. Create `src/middleware.ts` in Astro:
   - Read cookie, verify JWT, attach `locals.user` to the request context
   - Redirect to login if accessing protected routes without valid token
6. Create Fastify hook (for WebSocket auth) that validates JWT from query param or cookie.

**Resources:**
- [bcrypt npm](https://www.npmjs.com/package/bcrypt)
- [jsonwebtoken npm](https://www.npmjs.com/package/jsonwebtoken)
- [Astro middleware](https://docs.astro.build/en/guides/middleware/)
- [JWT.io](https://jwt.io/)

---

### B3 — OAuth Integration (Google / 42)

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | B2 |
| **Deliverable** | OAuth login flow for Google and 42 |

**Instructions:**

1. Register applications on [Google Cloud Console](https://console.cloud.google.com/) and [42 Intra API](https://api.intra.42.fr/).
2. Create `packages/shared/src/auth/oauth.ts`:
   - `getAuthorizationUrl(provider): string` — build the OAuth redirect URL with scopes
   - `exchangeCode(provider, code): tokens` — POST to token endpoint
   - `getUserInfo(provider, accessToken): userData` — fetch email, name, avatar
3. Create Astro API endpoints:
   - `GET /api/auth/oauth/:provider` — redirect user to provider's auth page
   - `GET /api/auth/oauth/:provider/callback` — handle callback, exchange code, find or create user in DB, set JWT cookie, redirect to home
4. Link OAuth accounts: if a user is already logged in and connects an OAuth provider, store `oauth_provider` + `oauth_id` on their existing user record.
5. Update the login/signup pages to show provider buttons.

**Resources:**
- [Google OAuth web server flow](https://developers.google.com/identity/protocols/oauth2/web-server)
- [42 API web application flow](https://api.intra.42.fr/apidoc/guides/web_application_flow)

---

### B4 — User Management API

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | B2 |
| **Deliverable** | User CRUD API endpoints |

**Instructions:**

1. Create Astro API endpoints:

   | Endpoint | Method | Description |
   |---|---|---|
   | `/api/users/:id` | GET | Public profile info |
   | `/api/profile` | GET | Own profile (includes email) |
   | `/api/profile` | PUT | Update username, bio, avatar |
   | `/api/profile/avatar` | POST | Upload avatar image |
   | `/api/friends` | GET | List friends |
   | `/api/friends/request` | POST | Send friend request |
   | `/api/friends/respond` | POST | Accept/reject friend request |
   | `/api/friends/:id` | DELETE | Remove friend |

2. Avatar handling: save uploaded images to `public/uploads/avatars/`, store URL in DB.
3. Validate all inputs (username length, file type/size for avatars).

**Resources:**
- [Astro API endpoints](https://docs.astro.build/en/guides/endpoints/)

---

### B5 — Game Logic Engine

| | |
|---|---|
| **Difficulty** | Hard |
| **Prerequisites** | B1 |
| **Deliverable** | Pure game logic module (framework-agnostic, no dependencies) |

**Instructions:**

1. Create `packages/shared/src/game/Board.ts`:
   - `createBoard(rows, cols): Cell[][]` — initialize empty grid
   - `dropToken(board, col, player): { board, row } | null` — drop token, return null if column full
   - `isValidMove(board, col): boolean`
   - `getValidMoves(board): number[]`
2. Create `packages/shared/src/game/WinDetection.ts`:
   - `checkWin(board, lastRow, lastCol, connectN): Player | null` — check all 4 directions (horizontal, vertical, diagonal /, diagonal \ ) for `connectN` consecutive tokens
   - `isDraw(board): boolean` — all columns full and no winner
3. Create `packages/shared/src/game/GameState.ts`:
   - `GameState` class: manages full game state (board, currentPlayer, players, variant, status)
   - Methods: `makeMove(col): MoveResult`, `getState(): SerializedState`, `loadState(data)`
4. Write exhaustive unit tests for all game logic functions (vitest or node:test).
5. Ensure the engine works with variable board sizes and Connect 5 mode.

**Resources:**
- [Connect 4 algorithm explained](https://roboticsproject.readthedocs.io/en/latest/ConnectFourAlgorithm.html)

---

### B6 — WebSocket Infrastructure (Fastify)

| | |
|---|---|
| **Difficulty** | Hard |
| **Prerequisites** | B1, A1 |
| **Deliverable** | Fastify WebSocket server with room management |

**Instructions:**

1. Create `apps/server/src/index.ts`:
   - Initialize Fastify with `@fastify/websocket` plugin
   - CORS configuration (allow Astro dev server origin)
   - Register WebSocket route handlers
2. Create `apps/server/src/ws/AuthMiddleware.ts`:
   - Extract JWT from connection URL query param or upgrade request cookie
   - Validate token, attach user to socket context
   - Reject unauthenticated connections
3. Create `apps/server/src/ws/RoomManager.ts`:
   - `rooms: Map<string, Set<WebSocket>>` — track connections per room
   - `joinRoom(roomId, socket)` — add socket to room
   - `leaveRoom(roomId, socket)` — remove socket from room
   - `broadcast(roomId, message, exclude?)` — send to all in room
   - `getOnlineUsers(): User[]` — get users with at least one active connection
4. Create `apps/server/src/ws/MessageRouter.ts`:
   - Parse incoming JSON messages with `type` field
   - Route to appropriate handler based on message type
   - Supported message types: `game_*`, `chat_*`, `friend_*`, `tournament_*`
5. Add connection lifecycle hooks: `onConnect` → register user as online, `onDisconnect` → cleanup rooms, mark user offline.

**Resources:**
- [@fastify/websocket](https://github.com/fastify/fastify-websocket)
- [Fastify WebSockets guide](https://blog.logrocket.com/using-websockets-with-fastify/)
- [Better Stack Fastify WebSocket guide](https://betterstack.com/community/guides/scaling-nodejs/fastify-websockets/)

---

### B7 — Remote Players / Game Sync

| | |
|---|---|
| **Difficulty** | Hard |
| **Prerequisites** | B5, B6 |
| **Deliverable** | Real-time online multiplayer game flow |

**Instructions:**

1. Implement game WebSocket handlers in `apps/server/src/ws/game/`:

   | Message Type | Direction | Description |
   |---|---|---|
   | `game:create` | Client→Server | Create a new game room, return game ID |
   | `game:join` | Client→Server | Join an existing game by ID |
   | `game:move` | Client→Server | Submit a move (column), validate + broadcast |
   | `game:state` | Server→Client | Full game state (on join or after move) |
   | `game:over` | Server→Client | Game ended with winner/draw info |
   | `game:rematch` | Client→Server | Request rematch |
   | `game:leave` | Client→Server | Abandon game |

2. Create a matchmaking queue: when a player requests a public match, add them to a queue. When 2 players are queued, create a game and connect them.
3. On each move:
   - Server validates the move (correct player, valid column, game is active)
   - Server applies the move to the authoritative `GameState`
   - Server checks for win/draw
   - Server broadcasts the updated state to both players
   - Server persists the move to the games table (update state JSONB)
4. Handle disconnection: if a player disconnects, start a 30-second reconnection timer. If they return, re-sync state. If not, mark the game as abandoned or auto-resign.
5. Spectator mode: allow other users to join a game room as spectators and receive state updates (but not make moves).

**Resources:**
- [WebSocket game sync patterns](https://developer.mozilla.org/en-US/docs/Games/Techniques/WebSockets)

---

### B8 — Real-time Chat System

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | B6 |
| **Deliverable** | WebSocket-based chat with persistence |

**Instructions:**

1. Implement chat WebSocket handlers in `apps/server/src/ws/chat/`:

   | Message Type | Direction | Description |
   |---|---|---|
   | `chat:send` | Client→Server | Send message to a room |
   | `chat:message` | Server→Client | Broadcast message to room |
   | `chat:typing` | Client→Server | Typing indicator start/stop |
   | `chat:typing` | Server→Client | Typing indicator to others in room |

2. Persist messages: on receiving `chat:send`, insert into `chat_messages` table via Drizzle.
3. Rooms: `global` (all users) and `game:<gameId>` (players + spectators of a specific game). Optionally `dm:<userId1>:<userId2>` for direct messages between friends.
4. On user connect/disconnect, broadcast `user:online` / `user:offline` events to all connected users so the online user list stays current.
5. Rate limiting: max 10 messages per 5 seconds per user (store in-memory counter per socket).

**Resources:**
- [Fastify WebSocket chat example](https://betterstack.com/community/guides/scaling-nodejs/fastify-websockets/)

---

### B9 — Tournament System

| | |
|---|---|
| **Difficulty** | Hard |
| **Prerequisites** | B5, B7 |
| **Deliverable** | Tournament creation, bracket generation, match progression |

**Instructions:**

1. Create `packages/shared/src/tournament/Bracket.ts`:
   - `generateBracket(playerIds: number[]): BracketNode[]` — generate single-elimination bracket with byes for non-power-of-2 player counts
   - `getNextMatch(bracket): BracketNode | null` — get the next unplayed match
   - `submitResult(bracket, matchId, winnerId): BracketNode[]` — advance winner, update bracket tree
   - `isComplete(bracket): boolean` — check if bracket has a champion
2. Create API endpoints (Astro):

   | Endpoint | Method | Description |
   |---|---|---|
   | `/api/tournaments` | GET | List all tournaments |
   | `/api/tournaments` | POST | Create tournament (min 4 players) |
   | `/api/tournaments/:id/register` | POST | Register for tournament |
   | `/api/tournaments/:id/start` | POST | Start tournament (generate bracket) |
   | `/api/tournaments/:id` | GET | Get tournament details + bracket |

3. WebSocket integration:
   - When a tournament match is ready, notify both players via `tournament:match_ready`
   - Both players join a game room, play the match (reuse B7 flow)
   - On match completion, report result to tournament system, advance bracket
   - When tournament ends, broadcast `tournament:complete` to all participants
4. Persist bracket JSON in the `tournaments.bracket` column.

**Resources:**
- [Single-elimination tournament algorithm](https://en.wikipedia.org/wiki/Single-elimination_tournament)

---

## Category C: Cybersecurity / DevOps

Responsible for deployment pipeline, containerization, security hardening, and infrastructure.

---

### C1 — Container Setup (Podman + Compose)

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | A1, B1 |
| **Deliverable** | Containerfiles, compose.yml, working local deployment |

**Instructions:**

1. Create `Containerfile` (multistage Dockerfile):

   ```dockerfile
   # Stage 1: Build
   FROM node:22-alpine AS builder
   WORKDIR /app
   COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
   COPY apps/ ./apps/
   COPY packages/ ./packages/
   RUN corepack enable && pnpm install --frozen-lockfile
   RUN pnpm build

   # Stage 2: Run
   FROM node:22-alpine AS runner
   WORKDIR /app
   COPY --from=builder /app/apps/web/dist ./web
   COPY --from=builder /app/apps/server/dist ./server
   COPY --from=builder /app/node_modules ./node_modules
   CMD ["node", "server/index.js"]
   ```

2. Create `compose.yml`:

   ```yaml
   version: "3.8"
   services:
     postgres:
       image: postgres:16-alpine
       environment:
         POSTGRES_DB: transcendence
         POSTGRES_USER: transcendence
         POSTGRES_PASSWORD: ${DB_PASSWORD}
       volumes:
         - pgdata:/var/lib/postgresql/data
       networks:
         - app-net

     vault:
       image: hashicorp/vault:latest
       cap_add:
         - IPC_LOCK
       environment:
         VAULT_DEV_ROOT_TOKEN_ID: ${VAULT_DEV_TOKEN}
       ports:
         - "8200:8200"
       networks:
         - app-net

     nginx:
       build: ./nginx
       ports:
         - "80:80"
       depends_on:
         - app
       networks:
         - app-net

     app:
       build: .
       depends_on:
         - postgres
         - vault
       environment:
         DB_HOST: postgres
         DB_PASSWORD: ${DB_PASSWORD}
         VAULT_ADDR: http://vault:8200
         VAULT_TOKEN: ${VAULT_DEV_TOKEN}
         JWT_SECRET: ${JWT_SECRET}
       networks:
         - app-net

   volumes:
     pgdata:

   networks:
     app-net:
   ```

3. Verify everything starts with `podman-compose up --build`.
4. Test that the Astro SSR pages, Fastify WebSocket server, and PostgreSQL are all connected and working.

**Resources:**
- [Podman Compose guide](https://docs.podman.io/en/latest/markdown/podman-compose.1.html)
- [Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)

---

### C2 — HashiCorp Vault Integration

| | |
|---|---|
| **Difficulty** | Hard |
| **Prerequisites** | C1 |
| **Deliverable** | Secrets managed via Vault instead of env vars |

**Instructions:**

1. Create a Vault initialization script `scripts/init-vault.sh`:
   - Start Vault in development mode (or production with unsealing)
   - Enable AppRole auth method
   - Create a policy for the app (`transcendence-app-policy`)
   - Write secrets: `secret/transcendence/db` (password), `secret/transcendence/jwt` (secret key), `secret/transcendence/oauth` (Google + 42 client IDs/secrets)
   - Create an AppRole role and output RoleID + SecretID
2. In the Fastify server (`apps/server/src/index.ts`):
   - On startup, use `node-vault` to authenticate via AppRole
   - Fetch all secrets from Vault
   - Make them available to the application (in-memory object, NEVER logged)
3. Graceful fallback: if Vault is unreachable, log a clear error and exit (fail-fast).
4. Update `compose.yml` to ensure Vault initializes before the app starts.
5. Document the Vault setup process in the README.

**Resources:**
- [HashiCorp Vault + Node.js tutorial](https://www.hashicorp.com/en/resources/creating-nodejs-app-record-retrieve-secrets)
- [node-vault npm](https://www.npmjs.com/package/node-vault)
- [Vault AppRole auth](https://developer.hashicorp.com/vault/docs/auth/approle)

---

### C3 — ModSecurity WAF via Nginx

| | |
|---|---|
| **Difficulty** | Hard |
| **Prerequisites** | C1 |
| **Deliverable** | Nginx reverse proxy with ModSecurity + OWASP CRS |

**Instructions:**

1. Create `nginx/` directory in the project root with:
   - `Dockerfile` — builds Nginx with ModSecurity module
   - `nginx.conf` — reverse proxy configuration
   - `modsecurity.conf` — ModSecurity core configuration
2. **Nginx Dockerfile:**

   ```dockerfile
   FROM nginx:alpine
   RUN apk add --no-cache modsecurity nginx-mod-http-modsecurity
   COPY nginx.conf /etc/nginx/nginx.conf
   COPY modsecurity.conf /etc/nginx/modsecurity.conf
   COPY coreruleset/ /etc/nginx/owasp-crs/
   ```

   *(Note: If ModSecurity isn't directly available in Alpine repos, compile from source or use a prebuilt image like `owasp/modsecurity-crs:nginx`)*

3. **nginx.conf** key directives:
   - `ModSecurity on;` and `ModSecurityConfig /etc/nginx/modsecurity.conf;`
   - Reverse proxy to `app:3000` (the Astro/Fastify server)
   - Pass WebSocket upgrade headers (`Upgrade` and `Connection`)
   - Set reasonable client body size limits
4. **modsecurity.conf** (download from [OWASP CRS](https://coreruleset.org/)):
   - Set `SecRuleEngine On` (blocking mode)
   - Include OWASP CRS rules
   - Start with `SecRuleEngine DetectionOnly` during development to avoid blocking legitimate requests, then switch to `On` for production
5. Test with common attacks: SQLi (`' OR 1=1--`), XSS (`<script>alert(1)</script>`), path traversal (`../../../etc/passwd`). Verify they are blocked.
6. Tune rules: if the WAF blocks legitimate app operations (e.g., JSON payloads in chat), use `SecRuleRemoveById` to disable specific false-positive rules.

**Resources:**
- [Nginx ModSecurity WAF docs](https://docs.nginx.com/nginx/admin-guide/dynamic-modules/nginx-waf/)
- [OWASP Core Rule Set](https://coreruleset.org/)
- [ModSecurity install guide](https://wafplanet.com/guides/nginx-modsecurity-setup/)

---

### C4 — Single-Command Deployment

| | |
|---|---|
| **Difficulty** | Medium |
| **Prerequisites** | C1, C2, C3 |
| **Deliverable** | deployment script + README instructions |

**Instructions:**

1. Create `deploy.sh`:

   ```bash
   #!/bin/bash
   set -euo pipefail

   # Check prerequisites
   command -v podman >/dev/null 2>&1 || { echo "Podman is required"; exit 1; }

   # Load environment variables (fallback to .env file if exists)
   if [ -f .env ]; then
       export $(grep -v '^#' .env | xargs)
   fi

   # Required envs
   : "${DB_PASSWORD:?DB_PASSWORD required}"
   : "${JWT_SECRET:?JWT_SECRET required}"
   : "${VAULT_DEV_TOKEN:?VAULT_DEV_TOKEN required}"

   echo "Starting ft_transcendence..."
   podman-compose up --build -d

   echo "Waiting for services..."
   sleep 5

   echo "Initializing Vault secrets..."
   bash scripts/init-vault.sh

   echo "Deployment complete!"
   echo "App: http://localhost"
   echo "Vault UI: http://localhost:8200"
   ```

2. Create `.env.example` with all required environment variables (with placeholder values, NEVER commit real secrets).
3. Add `.env` to `.gitignore`.
4. Write clear README sections:
   - Prerequisites (Podman, `podman-compose`)
   - Quick start (`cp .env.example .env`, edit values, `bash deploy.sh`)
   - Development setup (local Node.js, pnpm)
   - Architecture diagram
   - Module assignment per team member
5. Test the full flow: `bash deploy.sh` from a clean state, verify the app is accessible in the browser.

**Resources:**
- [Podman Compose CLI](https://docs.podman.io/en/latest/markdown/podman-compose.1.html)

---

## Team Workload Distribution

Approximate effort per category and recommended team assignment:

| Category | Tasks | Est. Effort | Recommended Assignees |
|---|---|---|---|
| **A: Frontend / Design** | A1–A9 (9 tasks) | ~40% | 2 developers |
| **B: Backend** | B1–B9 (9 tasks) | ~40% | 2 developers |
| **C: Cybersecurity / DevOps** | C1–C4 (4 tasks) | ~20% | 1 developer (shared) |

For a 5-person team: 2 frontend, 2 backend, 1 DevOps (with security focus).
For a 4-person team: 1 frontend, 2 backend, 1 DevOps; frontend dev helps with lighter backend tasks.

---

## Checklist

Use this to track overall progress:

### Foundation (Week 1)
- [ ] A1 — Monorepo scaffolding
- [ ] B1 — Database schema + Drizzle
- [ ] C1 — Podman Compose setup

### Authentication & Users (Week 1–2)
- [ ] B2 — Auth system (JWT)
- [ ] B3 — OAuth integration
- [ ] B4 — User management API
- [ ] A2 — SSR layout & routing
- [ ] A3 — UI design system
- [ ] A4 — Auth pages
- [ ] A5 — Profile & social pages

### Game Core (Week 2–3)
- [ ] B5 — Game logic engine
- [ ] A6 — Game board UI
- [ ] A7 — Game customization UI

### Real-time Features (Week 3–4)
- [ ] B6 — WebSocket infrastructure
- [ ] B7 — Remote players / game sync
- [ ] B8 — Chat system
- [ ] A9 — Chat UI

### Tournament & Polish (Week 4)
- [ ] B9 — Tournament system
- [ ] A8 — Tournament UI

### Security & Deployment (Week 3–5, ongoing)
- [ ] C2 — HashiCorp Vault
- [ ] C3 — ModSecurity WAF
- [ ] C4 — Single-command deploy script

---

*Generated from [en.subject.pdf](en.subject.pdf) and [modules.md](modules.md).*

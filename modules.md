# ft_transcendence — Claimed Modules

## Major Modules (8 x 2 = 16 pts)

### 1. Framework Frontend + Backend (Web)
- Frontend: Astro + React (interactive islands)
- Backend: Fastify + TypeScript

### 2. Real-time Features via WebSockets (Web)
- Socket.io for real-time updates across all connected clients
- Connection/disconnection handled gracefully with user status tracking
- Efficient broadcasting via Socket.io rooms

### 3. User Interaction (Web)
- Basic chat system: 1-to-1 direct messages with persistent history
- Profile system: public profiles, editable profile with avatar, bio, and skins
- Friends system: friend requests, friends list with online status, block/unblock

### 4. Standard User Management (User Management)
- Users can update profile information (username, bio, skins)
- Users can upload an avatar with default fallback
- Users can add friends and see online/offline/in_game status
- Users have a public profile page

### 5. AI Opponent (Artificial Intelligence)
- Minimax with alpha-beta pruning and transposition table
- Three difficulty levels: Easy, Medium, Hard
- Human-like behavior: artificial delay, random blunders on easy

### 6. WAF + Vault (Cybersecurity)
- ModSecurity WAF with OWASP CRS rules
- HashiCorp Vault manages all secrets (JWT, DB password, OAuth credentials)

### 7. Web-based Game (Gaming)
- Connect 4: 7x6 grid, real-time multiplayer
- Clear rules: 4-in-a-row win, draw on full board
- Chess-style timer system

### 8. Remote Players (Gaming)
- Two players on separate computers play in real-time via WebSocket
- 60-second grace period on disconnection
- Reconnection logic restores game state from DB

---

## Minor Modules (3 x 1 = 3 pts)

### 9. ORM (Web)
- Drizzle ORM for all database interactions
- Drizzle Kit for schema migrations

### 10. SSR (Web)
- Astro SSR mode for all pages
- Server-side data fetching for game and profile pages

### 11. OAuth (User Management)
- OAuth 2.0 via 42 API with CSRF protection
- Auto-creates account on first login
- Account linking for existing users

---

## Partially Implemented Modules (NOT claimed)

These modules have some sub-requirements met but are incomplete. They are NOT counted toward the 19-point total.

### Game Customization (Minor, 1pt) — Gaming
**Implemented:**
- Pawn skins (4): default, sunset, royal, forest — persisted in DB, validated, displayed in Settings
- Grid skins (2): liquid-glass, frosted-obsidian — persisted in DB, validated, displayed in Settings
- Game settings: mode selection (Connect 4/5), timer options (5/10/60 min)

**Missing:**
- Power-ups, attacks, or special abilities (core sub-requirement)
- Connect 5 win condition not implemented (DB schema supports it, but `check_board.ts` hardcodes 4-in-a-row)
- Board variant only in frontend (localStorage, not DB-persisted)

### Game Statistics (Minor, 1pt) — User Management
**Implemented:**
- Win/loss/draw tracking on users table (atomic increments)
- ELO rating system with K-factor and rank titles
- Match history endpoint (last 10 games with opponent info, result, move count)
- Streaks (current + longest), form (last 5), milestones (fastest win, highest rating)
- Top 3 opponents endpoint
- Leaderboard (SQL ROW_NUMBER ranking, public, no auth)
- Stats breakdown by time control and opponent strength

**Missing:**
- Achievements / badges / progression system (core sub-requirement: "Show achievements and progression")

### Advanced Chat (Minor, 1pt) — Gaming
**Implemented:**
- Block users from messaging (server-side check before sending)
- Invite users to play from chat (challenge widget with `__CHALLENGE__` messages)
- Chat history persistence (DB-persisted, loaded on conversation open)
- Typing indicators via Socket.io
- Emoji reactions on messages
- Rate limiting (10 msgs/5s per socket)
- Chat message notifications to receiver

**Missing:**
- DB-persisted read receipts (frontend shows checkmarks, but no `read` column in DB — all loaded as "read")
- Game/tournament notifications displayed in chat interface

### File Upload (Minor, 1pt) — Web
**Implemented:**
- Avatar upload with MIME validation (JPG/PNG/WebP only)
- 2 MB max file size enforced
- Auto-resize to 500x500 and WebP conversion (sharp)
- Corrupt file detection
- Cache-busting on avatar URL

**Missing:**
- Multiple file types beyond images (core sub-requirement: "images, documents, etc.")
- Progress indicators for uploads
- Ability to delete uploaded files
- General-purpose file management (only avatar upload exists)

### Notification System (Minor, 1pt) — Web
**Implemented:**
- DB-persisted notifications with types, JSON content, read status
- Real-time push via Socket.io (`notification:new`)
- REST endpoints: list, unread-count, mark-read, mark-all-read, clear-all
- Enriched with resolved user info (username, avatar), game status, friendship status
- Frontend dropdown with unread count badge
- Events: friend_request, friend_accepted, game_invite, chat_message, game_finished

**Missing:**
- Notifications for profile update/delete actions
- Friend removal notification
- Block/unblock notifications
- Lobby creation/closure/decline notifications
- "Your turn" notification when returning to a game mid-turn
- The module requires notifications for "all creation, update, and deletion actions" — currently only social/game events are covered

### Public API (Major, 2pts) — Web
**Implemented:**
- `/api/` prefix on all routes (auth, users, friends, chat, notifications, lobbies, games, leaderboard)
- Public unauthenticated endpoints (leaderboard, public profiles, health check)
- Multiple HTTP methods (GET, POST, PUT, DELETE) across route groups

**Missing:**
- API key system (no `api_keys` table, no middleware)
- HTTP rate limiting (TODO comments exist in code, not implemented)
- Formal API documentation (no Swagger/OpenAPI)
- Standardized response format
- CORS configured for single origin only (not suitable for third-party consumption)

---

## Total: 19 points claimed (minimum required: 14)
## Partial modules: 8 pts worth (not claimed)

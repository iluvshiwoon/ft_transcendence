# API Backend — Référence

Documentation des endpoints HTTP et events Socket.io exposés par `apps/server/`.

---

## Sommaire

- [Bases](#bases)
- [Auth](#auth)
- [Profil & users](#profil--users)
- [Amis & blocage](#amis--blocage)
- [Chat](#chat)
- [Notifications](#notifications)
- [Socket.io](#socketio)
- [Codes d'erreur](#codes-derreur)

---

## Bases

- **Base URL** (dev) : `http://localhost:3000`
- **Toutes les routes** sont préfixées par `/api/...` sauf `/health` et `/uploads/...`
- **Format** : JSON pour les bodies et réponses (sauf upload avatar = multipart/form-data)
- **Auth** : cookie HttpOnly `auth_token` (JWT, 7 jours). Posé par signup/login, effacé par logout.
- **CORS** : autorise `FRONTEND_URL` (par défaut `http://localhost:4321`) avec `credentials: true`

### Côté frontend, à savoir

Toutes les requêtes vers une route protégée doivent inclure les cookies :

```ts
fetch("http://localhost:3000/api/profile", {
  credentials: "include",        // important !
});
```

### Health check

| Méthode | Endpoint | Auth | Réponse |
|---|---|---|---|
| GET | `/health` | non | `{ "status": "ok" }` |

---

## Auth

### `POST /api/auth/signup` — créer un compte

Body :
```json
{ "email": "x@42.fr", "username": "x", "password": "min8chars" }
```
Réponse `201` : `{ id, email, username }` + cookie `auth_token` posé.
Erreurs : `400` champs manquants ou password < 8 / `409` email ou username déjà pris.

### `POST /api/auth/login` — se connecter

Body :
```json
{ "email": "x@42.fr", "password": "..." }
```
Réponse `200` : `{ id, email, username }` + cookie posé.
Erreurs : `401` credentials invalides.

### `POST /api/auth/logout` — se déconnecter

Pas de body. Réponse `200` : `{ "message": "Logged out" }`. Cookie effacé.

### `GET /api/auth/me` — récupérer le user connecté

Auth requise. Réponse `200` :
```json
{ "id", "email", "username", "avatarUrl", "bio" }
```
Erreurs : `401` non connecté.

### `GET /api/auth/42?intent=signup|login` — démarrer OAuth 42

Redirige vers la page d'autorisation de l'intra 42. Pas de réponse JSON, c'est un `302`.

Le serveur génère un token `state` aléatoire (CSRF), le stocke dans un cookie HttpOnly
`oauth42_state` (path: `/api/auth/42`, max-age 10 min), et l'inclut dans l'URL OAuth.
Le cookie contient aussi l'`intent` reçu en query :
- `intent=signup` (passé par la page `/signup`) → après callback, les nouveaux comptes
  sont redirigés vers `/signup?step=3` (skip credentials, OAuth a fourni email + login).
- `intent=login` (par défaut, passé par le bouton Login) → callback redirige vers `/`.

### `GET /api/auth/42/callback` — fin du flow OAuth 42

Appelé par 42 avec `?code=` et `?state=`. Le serveur :
1. Vérifie que `state` du query matche celui stocké dans le cookie `oauth42_state` (CSRF).
   Sinon → `400 Invalid OAuth state`.
2. Efface le cookie state (single-use).
3. Échange `code` contre un access_token, récupère les infos du user.
4. Account linking : si déjà connecté → lie l'OAuth ID, redirige `/profile?linked=true`.
5. Sinon, cherche par OAuth ID puis par email. Crée un user si rien trouvé.
6. Pose le cookie d'auth, redirige selon `intent` :
   - `signup` + nouveau compte → `${FRONTEND_URL}/signup?step=3`
   - `login` ou compte existant → `${FRONTEND_URL}/`

---

## Profil & users

### `GET /api/users/:id` — profil public

Pas d'auth. Réponse `200` :
```json
{ "id", "username", "avatarUrl", "bio", "status", "gamesPlayed", "gamesWon", "gamesLost", "gamesDrawn" }
```
Si user supprimé : `{ "id", "username": "Joueur supprimé", "avatarUrl": null }`.

### `GET /api/users/check-username?q=...` — vérifier si un username est dispo

**Pas d'auth** (utilisé par le formulaire de signup avant que l'user soit logged in).
Renvoie uniquement `{ available: boolean }` — pas d'autre info pour limiter l'enumeration.

Validation : 3–30 caractères, `[a-zA-Z0-9_]`. Si l'input ne match pas la regex,
renvoie `{ available: false }` directement (sans donner la raison).

> **TODO(rate-limit)** : ajouter `@fastify/rate-limit` au backend et gater cette route
> à ~10 req/min/IP pour mitiger l'enumeration.

### `GET /api/users/search?q=...` — recherche par username

Auth requise. Insensible à la casse, `LIKE %q%`, max 20 résultats.
Réponse : `[{ id, username, avatarUrl, status }, ...]`.

### `GET /api/profile` — son propre profil

Auth requise. Inclut email, skins, flag OAuth lié.

### `PUT /api/profile` — éditer son profil

Auth requise. Body partiel :
```json
{ "username"?: "...", "bio"?: "...", "pawnSkin"?: "...", "gridSkin"?: "..." }
```
Validations :
- `username` : 3-30 caractères, `[a-zA-Z0-9_]` (mêmes contraintes que /signup).
- `bio` : ≤ 160 caractères.
- `pawnSkin` : `default` | `wine` | `coral` | `brick`.
- `gridSkin` : `default` | `ink` | `slate`.

Erreurs : `400` validation / `409` username déjà pris.

### `PUT /api/profile/email` — changer l'email

Auth requise + **re-auth password**. Body :
```json
{ "currentPassword": "...", "newEmail": "..." }
```
Erreurs : `400` compte OAuth-only sans password / `401` mauvais password / `409` email déjà pris.

### `PUT /api/profile/password` — changer le password

Auth requise + **re-auth password**. Body :
```json
{ "currentPassword": "...", "newPassword": "min8chars" }
```

### `POST /api/profile/avatar` — upload avatar

Auth requise. **multipart/form-data**, champ `avatar`. JPG/PNG/WebP, max 2 MB.
L'image est redimensionnée en 500x500 max et convertie en `.webp`.
Réponse : `{ "avatarUrl": "/uploads/avatars/{userId}.webp?t=..." }`.

### `DELETE /api/profile` — supprimer son compte (anonymisation)

Auth requise. Marque `is_deleted = true`, vide bio/avatar/oauth, déconnecte.

### `GET /uploads/avatars/{userId}.webp` — récupérer un avatar

Pas d'auth. Sert directement le fichier.

---

## Amis & blocage

### `GET /api/friends` — liste des amis acceptés

Auth requise. Réponse : `[{ friendshipId, id, username, avatarUrl, status }, ...]`.

### `GET /api/friends/requests` — demandes reçues en attente

Auth requise. Réponse : `[{ friendshipId, id, username, avatarUrl }, ...]`.

### `POST /api/friends/request` — envoyer une demande d'ami

Auth requise. Body : `{ "userId": 42 }`.
Réponse `201` : `{ id, status: "pending" }`. Notif auto pour le destinataire.
Erreurs : `400` soi-même / `404` user inexistant / `403` blocage / `409` amitié déjà existante.

### `POST /api/friends/respond` — accepter ou refuser

Auth requise. Body : `{ "friendshipId": 5, "accept": true }`.
Si accept : `{ "status": "accepted" }` + notif auto pour l'envoyeur.
Si decline : `{ "status": "declined" }` (la ligne est supprimée).

### `DELETE /api/friends/:id` — supprimer un ami (ou annuler une demande)

Auth requise. `:id` = friendship id (pas user id).

### `POST /api/block` — bloquer un user

Auth requise. Body : `{ "userId": 42 }`.
Supprime toute amitié existante entre les 2, idempotent.

### `DELETE /api/block/:id` — débloquer un user

Auth requise. `:id` = **user id** du bloqué.

---

## Chat

### `GET /api/chat` — liste des conversations

Auth requise. Renvoie 1 entrée par contact, avec le dernier message :
```json
[{ "id", "username", "avatarUrl", "status", "lastMessage", "lastMessageAt" }, ...]
```
Les conversations avec users bloqués sont filtrées.

### `GET /api/chat/:userId?limit=50&offset=0` — historique avec un user

Auth requise. Trié du + récent au + ancien.
Erreurs : `403` blocage en cours.

> **L'envoi de messages se fait via Socket.io, pas en REST.** Voir [Socket.io](#socketio).

---

## Notifications

### `GET /api/notifications` — mes notifs (non-lues d'abord, max 50)

Auth requise. Réponse :
```json
[{ "id", "userId", "type", "content": {...}, "read", "createdAt" }, ...]
```

Types possibles : `friend_request`, `friend_accepted`, `game_invite`, `game_finished`, `chat_message`.

### `GET /api/notifications/unread-count` — compteur badge

Auth requise. Réponse : `{ "count": 3 }`.

### `PATCH /api/notifications/:id/read` — marquer une notif comme lue

Auth requise. `404` si la notif n'appartient pas à l'user (sécurité).

### `PATCH /api/notifications/read-all` — tout marquer comme lu

Auth requise.

---

## Socket.io

### Se connecter

Côté client :
```ts
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  withCredentials: true,   // envoie le cookie auth_token
});
```

Le serveur lit le cookie au handshake, vérifie le JWT et accepte la connexion. Sinon : erreur `connect_error`.

À la connexion, l'user rejoint automatiquement la room `user:<id>` (utilisée pour le push ciblé).

---

### Events serveur → client (S→C)

| Event | Quand | Payload |
|---|---|---|
| `user:online` | Un ami se connecte | `{ userId }` |
| `user:offline` | Un ami se déconnecte | `{ userId }` |
| `chat:message` | On reçoit ou on envoie un message (echo) | `{ id, senderId, receiverId, content, createdAt }` |
| `chat:typing` | L'autre tape un message | `{ from }` |
| `notification:new` | Une nouvelle notif arrive | objet notification complet (id, type, content, ...) |

---

### Events client → serveur (C→S)

| Event | Payload | Effet |
|---|---|---|
| `chat:send` | `{ receiverId, content }` | Persist en DB → push `chat:message` au destinataire + echo à l'envoyeur + push `notification:new`. Rate limit 10/5s. Droppé si blocage. |
| `chat:typing` | `{ receiverId }` | Forward `chat:typing` au destinataire. |

---

## Codes d'erreur

| Code | Sens |
|---|---|
| `200` | OK |
| `201` | Created (signup, friend request envoyée, etc.) |
| `400` | Bad Request : champs manquants ou invalides |
| `401` | Unauthorized : pas connecté ou JWT invalide |
| `403` | Forbidden : blocage en cours |
| `404` | Not Found : ressource inexistante |
| `409` | Conflict : doublon (email, username, amitié déjà existante) |
| `500` | Server Error : bug, regarder les logs |

Tous les codes d'erreur retournent `{ "error": "message lisible" }`.

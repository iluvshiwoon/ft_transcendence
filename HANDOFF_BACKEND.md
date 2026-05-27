# Handoff backend — page `/profile`

État au 2026-05-27, après merge de `kgriset_landing` dans `main` et import
de `profile.astro` (Adam) dans `kgriset_profile_review`.

La page `/profile` est aujourd'hui rendue avec des **données mockées**. Ce
document liste ce qui existe déjà côté serveur, ce qu'apporte la branche
`tim` (pas encore mergée), et ce qu'il reste à écrire pour câbler la page
sur de vraies données.

---

## 1. Ce qui existe déjà sur `main`

| Endpoint | Auth | Réponse | Utilité pour `/profile` |
|---|---|---|---|
| `GET /api/users/:id` | non | `{ id, username, avatarUrl, bio, status, gamesPlayed, gamesWon, gamesLost, gamesDrawn }` | Header profil (partiellement) + bloc Stats |
| `GET /api/profile` | oui | `{ id, email, username, avatarUrl, bio, pawnSkin, gridSkin, oauth42Linked }` | Profil propre (édition) |
| `PUT /api/profile` | oui | maj `username`/`bio`/`pawnSkin`/`gridSkin` | Édition profil |
| `GET /api/friends` | oui | `[{ friendshipId, id, username, avatarUrl, status }]` | Onglet Friends (partiellement) |
| `POST /api/friends/request` | oui | `{ userId }` → demande d'ami | Bouton « Add friend » |
| `GET /api/chat/:userId` | oui | thread DM | Bouton « Message » (via navigation) |

---

## 2. Ce qu'apporte la branche `tim` (pas mergée)

| Endpoint / Event | Notes |
|---|---|
| `POST /api/games/ai` | Crée une partie vs IA — `{ difficulty, timePerPlayerSeconds }` → `{ gameId }` |
| `GET /api/games/:id` | État live d'une partie. **Restreint à player1/player2.** |
| `GET /api/lobbies` | Liste des lobbies |
| `POST /api/lobbies` | Crée un lobby (public/privé, mode, contrôle de temps) |
| `POST /api/lobbies/:id/join` | Rejoint, avec `{ code }` si privé |
| `POST /api/lobbies/:id/leave` | Quitter (le créateur ferme le lobby) |
| `POST /api/lobbies/:id/start` | Le créateur démarre la partie |
| Socket `game:join` / `game:move` / `game:surrender` (C→S) | Gameplay live |
| Socket `game:state` / `game:timer` / `game:over` (S→C) | Diffusion serveur |
| `gameManager` | État autoritatif côté serveur. **Incrémente `users.gamesPlayed/Won/Lost/Drawn` sur fin de partie.** |
| Schéma | Ajout colonne `lobbies.player2Id` |

Une fois `tim` mergé : `GET /api/users/:id` renverra des `gamesPlayed/Won/Lost/Drawn`
réels, ce qui couvre déjà l'essentiel du bloc Stats de `/profile`.

---

## 3. Ce qui manque pour `/profile`

### 3.1 — `GET /api/users/by-username/:username`

**Pourquoi.** Les URLs profil seront en `/profile/<username>` (pas par id
numérique). Aucun endpoint actuel ne fait le lookup par username.

**Spec.**
```
GET /api/users/by-username/:username       (public)
→ 200 { id, username, avatarUrl, bio, status,
        gamesPlayed, gamesWon, gamesLost, gamesDrawn,
        createdAt }                        # ISO 8601
→ 404 { error: "User not found" }
```

Même règle que `/users/:id` : si `isDeleted`, on renvoie `username: "Joueur supprimé"`.

**Effort estimé.** ~15 lignes dans `users.ts`. Pas de migration.

---

### 3.2 — Rating Elo + rang + titre

**Pourquoi.** La page affiche `Rating 2854`, `Rank #47`, titre `Grandmaster`.
Rien de tout ça n'existe en DB.

**Schéma (migration nécessaire).**
```ts
// apps/server/src/db/schema.ts — table users
rating: integer("rating").notNull().default(1000),
```

**Mise à jour dans `gameManager.finishGame()`** (branche `tim`) — même
endroit qui incrémente `gamesWon` etc. :
```ts
// Calcul Elo simple (K=32) — formule classique :
//   delta = K * (résultat - expected)
//   expected = 1 / (1 + 10^((opp - me) / 400))
const k = 32;
const expected = 1 / (1 + Math.pow(10, (oppRating - myRating) / 400));
const delta = Math.round(k * (score - expected));    // score: 1=win, 0.5=draw, 0=loss

await db.update(users)
  .set({ rating: sql`${users.rating} + ${delta}` })
  .where(eq(users.id, userId));
```

Pour les parties vs IA : utiliser un rating fictif basé sur la difficulté
(ex. easy=800, medium=1200, hard=1800), ou ne pas faire varier le rating
contre l'IA — à décider.

**Réponse API.** Étendre `GET /api/users/:id` (et `by-username`) pour
inclure :
```json
{
  ...
  "rating": 1842,
  "rank":   47,
  "title":  "Grandmaster"
}
```

- `rank` = `SELECT count(*) + 1 FROM users WHERE rating > $me AND is_deleted = false`
- `title` = dérivé du rating, par paliers (à arrêter — proposition) :
  - `< 1000`  → "Beginner"
  - `< 1400`  → "Apprentice"
  - `< 1800`  → "Expert"
  - `< 2200`  → "Master"
  - `>= 2200` → "Grandmaster"

**Effort estimé.** Migration courte + ~30 lignes dans `gameManager` +
~10 lignes dans `users.ts`.

---

### 3.3 — Historique des parties d'un user

**Pourquoi.** L'onglet Overview affiche un tableau "Recent games" et la
version mobile une liste. Mockée aujourd'hui.

**Spec.**
```
GET /api/users/:id/games?limit=20&offset=0&status=finished     (public)
→ 200 [{
    id:           number,
    mode:         "connect4",
    finishedAt:   string,                  # ISO 8601
    result:       "win" | "loss" | "draw", # POV de l'user demandé
    detail:       string,                  # ex. "4 in a row · column 4"
                                           # ou "Opponent resigned"
    opponent: {
      id:           number | null,         # null si IA
      username:     string,                # "AI (medium)" si IA
      avatarUrl:    string | null,
      rating:       number,                # dépend de 3.2
      isAi:         boolean,
      aiDifficulty: "easy"|"medium"|"hard"|null
    }
  }]
```

`detail` se calcule à partir de `moves` (ex. dernier coup gagnant) ou se
déduit du statut (`abandoned` → "Opponent resigned"). On peut commencer
simple : `${winnerMode} en ${moveCount} coups`.

**Effort estimé.** Une cinquantaine de lignes (jointure `games` ↔ `users`
+ agrégat `moves`). À mettre dans `users.ts` ou nouveau `games.ts` du
profil.

---

### 3.4 — Parties actives (« daily games ») d'un user

**Pourquoi.** Sidebar gauche de l'onglet Overview : liste des parties en
cours, dont c'est le tour, nb de coups, horloge.

**Spec.**
```
GET /api/users/me/games/active           (auth — propre user uniquement)
→ 200 [{
    id:                    number,
    mode:                  "connect4",
    yourTurn:              boolean,         # currentPlayer === me
    moves:                 number,          # count(moves) pour cette partie
    clockSeconds:          number,          # temps restant côté qui doit jouer
    timePerPlayerSeconds:  number,
    opponent: {
      id, username, avatarUrl, rating
    }
  }]
```

L'info live (yourTurn, clockSeconds) vient de `gameManager` (en mémoire),
pas seulement de la DB. Donc l'endpoint doit faire :
1. `SELECT * FROM games WHERE (player1Id = me OR player2Id = me) AND status = 'in_progress'`
2. Pour chaque résultat, demander à `gameManager.get(gameId)` l'état live
3. Joindre l'opponent depuis `users`

**Effort estimé.** ~40 lignes. Touche `gameManager` (peut-être ajouter
`gameManager.activeGamesForUser(userId): GameState[]`).

---

### 3.5 — `GET /api/friends` enrichi

**Pourquoi.** L'onglet Friends affiche le rating à droite du username, et
au hover du dot d'état (in_game) on aimerait pouvoir naviguer vers la
partie en cours (« Watch » button).

**Spec.** Étendre la réponse existante :
```diff
 GET /api/friends
 → [{
     friendshipId, id, username, avatarUrl, status,
+    rating:        number,                  # dépend de 3.2
+    currentGameId: number | null            # défini si status === 'in_game'
   }]
```

`currentGameId` se calcule via `gameManager` (qui sait quel user est dans
quelle partie active) ou via `SELECT id FROM games WHERE
(player1Id = friendId OR player2Id = friendId) AND status = 'in_progress'
LIMIT 1`.

**Effort estimé.** ~15 lignes dans `friends.ts`.

---

### 3.6 — Spectateur

**Pourquoi.** Bouton « Watch » sur un ami `in_game`. Aujourd'hui, le
`GET /api/games/:id` de Tim et le socket `game:state` sont gated sur
`player1Id`/`player2Id` uniquement.

**Deux options.**

**A. Élargir l'accès** (plus simple) — si un user est ami accepté de l'un
   des deux joueurs, il peut récupérer l'état :
   ```ts
   if (game.player1Id !== userId && game.player2Id !== userId) {
     const isFriend = await db.select()...from(friendships)
       .where(or(
         and(eq(userId, friendships.userId),
             or(eq(friendships.friendId, game.player1Id),
                eq(friendships.friendId, game.player2Id))),
         and(eq(userId, friendships.friendId),
             or(eq(friendships.userId, game.player1Id),
                eq(friendships.userId, game.player2Id))),
       ))
       .where(eq(friendships.status, "accepted"));
     if (!isFriend.length) return reply.status(403)...
   }
   ```

**B. Endpoint dédié** :
```
GET /api/games/:id/spectate                (auth)
+ socket event "game:spectate" { gameId }  → join room game:<id> en lecture seule
```
Émet uniquement `game:state` et `game:over`, jamais `game:error`.

**Recommandation.** Option B. Plus propre, sépare clairement le rôle
spectateur (pas de risque qu'un bug de ACL laisse un spectateur jouer).

**Effort estimé.** ~30 lignes serveur + 1 nouvel event socket.

---

### 3.7 — Challenge direct (bouton « Challenge »)

**Pourquoi.** Bouton principal du header profil. Aujourd'hui le flux Tim
demande : créer un lobby → partager le code → l'autre rejoint → start. Pour
un challenge depuis une page profil, on veut un flux en 1 clic.

**Spec.**
```
POST /api/games/challenge                  (auth)
body: { opponentUserId: number,
        mode: "connect4",
        timePerPlayerSeconds: 300 | 600 | 3600 }
→ 201 { gameId: number, lobbyId: number, lobbyCode: string }
→ 404 si opponent introuvable
→ 403 si bloqué de part ou d'autre
```

Implémentation possible : wrapper autour de `POST /api/lobbies`
(`isPublic: false`) + insérer une notification pour l'opponent qui pointe
vers le lobby. L'opponent l'accepte → join → le challenger reçoit un event
socket et `start` se déclenche automatiquement.

**Effort estimé.** ~50 lignes (réutilise la logique lobby de Tim).

---

### 3.8 — Bouton « Message »

**Pas de backend nouveau.** Le `/api/chat/:userId` existe déjà. Il suffit
d'une route frontend `/chat/<username>` qui appelle cet endpoint à
l'ouverture. À traiter côté front.

---

## 4. Ordre de priorité recommandé

1. **Merger `tim` dans `main`.** Pré-requis pour 3.2, 3.3, 3.4, 3.5.
2. **3.1 — `/users/by-username/:username` + `createdAt`.** Petit, débloque
   les URLs profil.
3. **3.2 — Rating Elo + rang + titre.** Migration courte. Sans ça la page
   est encore mockée pour le header principal.
4. **3.3 — Historique parties (`/users/:id/games`).** Dépend de 3.2 pour
   `opponent.rating`.
5. **3.4 — Parties actives (`/users/me/games/active`).** Dépend de 3.2.
6. **3.5 — `/friends` enrichi.** Petit, complète l'onglet Friends.
7. **3.6 — Spectate.** Dépend de 3.4 pour le bouton Watch d'un ami.
8. **3.7 — Challenge direct.** Dépend du système de notifications déjà en
   place + lobby de Tim.

Les points 3.1 → 3.5 forment l'essentiel du câblage de `/profile`. Les
points 3.6 et 3.7 ne sont nécessaires que pour rendre les boutons
fonctionnels — la page s'affiche déjà correctement sans eux (elle a juste
des `href="#"`).

---

## 5. Notes diverses

- **Tests.** Aucun des endpoints listés ici n'a de tests d'intégration
  écrits. Si on ajoute Vitest côté serveur (pas encore configuré sur ce
  repo), les nouveaux endpoints sont un bon moment pour démarrer.
- **Rate-limiting.** Le `TODO(rate-limit)` mentionné dans `users.ts`
  s'applique aussi à `/users/by-username/:username` (énumération possible
  de noms). À gérer quand `@fastify/rate-limit` sera câblé.
- **DESIGN.md §7.** À jour ce document, mettre à jour le tableau Wired/Pending
  une fois les endpoints livrés. Voir `apps/web/DESIGN.md` section 7.

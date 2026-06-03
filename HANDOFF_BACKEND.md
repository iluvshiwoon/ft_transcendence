# Handoff backend — page `/profile`

État au 2026-06-02, après merge de `kgriset_landing_wire` dans `main`
et début de la branche `kgriset_settings` :

- ✅ **§3.2 livré** sur `main` (commits `ec928dd`→`48f0e16` + `554fc6f`
  + `ab9825c` du `kgriset_landing_wire`). Schéma Elo, application dans
  `gameManager.finishGame`, endpoint public `/api/leaderboard?limit=N`,
  `Title` côté front, leaderboard store + drop des `MOCK_ENTRIES`, seed
  13 users (4 baseline + 9 high-rated), auth gates sur les 5 pages
  authed, et carry-over du score anonyme à travers le flow
  `/signup?step=1..4` (Step1Save → `localStorage` → Step4
  SignupCompleteTracker → `POST /api/auth/signup-complete` avec
  `initialRating` optionnel, atomic et idempotent).
- ✅ **§3.12 livré** sur la branche `kgriset_settings` (commits
  `26ccaac` + `cf4dd29`). `/api/auth/logout` content-negotiate (HTML
  Accept → 302 redirect, script Accept → JSON). Nouveau endpoint
  `POST /api/auth/oauth42/unlink` qui dissocie le compte 42 d'un user
  (refuse avec 409 si l'user n'a pas de password — sinon lock-out).
- ✅ **§3.1 livré** sur la branche `kgriset_settings` (commits
  `cc1081d` + `b6f4f9d`, ramenés depuis `kgriset_3_1_users` qui a été
  supprimé). `GET /api/users/by-username/:username` (public, anonyme),
  même shape que `GET /api/users/:id` (helper partagé
  `publicProfilePayload` dans `users.ts`). Les deux endpoints exposent
  maintenant `createdAt` (ISO 8601) en plus de tous les champs publics
  du profil.
- §3.3, §3.4, §3.5, §3.6, §3.7, §3.9, §3.10 : à faire.

État au 2026-05-29, après merge de `kgriset_landing` dans `main`, import
de `profile.astro` (Adam) puis refonte UI sur `kgriset_profile_review` :

- header inline-hero (avatar + identité + actions sur la même ligne, bio
  et métriques en bas) ;
- onglet `Stats` redessiné — plus de doublons avec le header. Quatre
  blocs : **Streaks & form**, **By time control**, **By opponent
  strength**, **Milestones** (cf. §3.9 plus bas) ;
- Connect 5 retiré du périmètre.
- Lobby `/play` v1 (mock) : deux CTA principaux (Play AI / Challenge),
  resume strip pour les parties actives, Friends online + Recent results
  en bas. Backend : utilise `POST /api/games/ai` (Tim) directement,
  attend §3.4 + §3.5 enrichi pour les listes (cf. §3.10 pour le bouton
  « Find match » v2).

Les pages `/profile` et `/play` sont aujourd'hui rendues avec des
**données mockées**. Ce document liste ce qui existe déjà côté serveur,
ce qu'apporte la branche `tim` (déjà mergée dans `main` à ce stade), et
ce qu'il reste à écrire pour câbler ces pages sur de vraies données.

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

### 3.1 — `GET /api/users/by-username/:username`  ✅ FAIT (kgriset_3_1_users)

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

**Statut (juin 2026).** ✅ Livré sur la branche `kgriset_3_1_users`.
Décomposition réelle :

- **Helper partagé `publicProfilePayload(user)`.** Plutôt que dupliquer la
  logique de la réponse entre `/users/:id` et `/users/by-username/:username`
  (et risquer qu'elles dérivent), un helper privé en haut de `users.ts`
  construit la réponse publique. Mêmes champs des deux côtés du
  endpoint, single source of truth.
- **Route ajoutée** `app.get("/users/by-username/:username", …)`. Pas
  d'auth (cohérent avec `/users/:id`). `eq(users.username, …)` —
  case-sensitive, aligné avec `/users/check-username` (cf. signup) et
  avec le format des usernames stockés. 404 si pas trouvé, 404 si
  username vide (le routeur ne match pas un segment vide, mais le
  garde-fou `?.trim()` est là si un proxy aval le réécrit).
- **Extension** de `GET /api/users/:id` pour inclure `createdAt`
  (`user.createdAt.toISOString()`). Cohérence : les deux endpoints
  publics exposent exactement la même shape. La page `/profile`
  consomme `createdAt` pour son badge « Joined March 2025 ».
- **Pas de migration.** Le schéma avait déjà `created_at` depuis le
  baseline (`schema.ts:43`), et l'utilisateur reste sur le default
  `now()` si non spécifié.

**Hors scope (suivi séparé).** Le câblage de la page
`apps/web/src/pages/profile.astro` (ou un éventuel dynamic route
`profile/[username].astro`) à ce nouvel endpoint n'est pas dans cette
branche — c'est un deliverable frontend distinct qui consomme aussi
§3.3 (historique), §3.5 (friends), §3.9 (stats).

**Vérifications.** `pnpm --filter server exec tsc --noEmit` clean.
Pas de tests vitest ajoutés (le projet n'a pas de suite — à démarrer
séparément ; ce n'est pas une régression). Vérifié manuellement que
l'ordre des routes `/users/:id` puis `/users/by-username/:username`
est sans conflit : segments différents (2 vs 3) → find-my-way n'a
aucune ambiguïté. La route statique existante `/users/check-username`
(2 segments, statique) reste prioritaire sur `/users/:id` comme avant
(static > dynamic dans find-my-way).

---

### 3.2 — Rating Elo + rang + titre  ✅ FAIT (kgriset_landing_wire, merge 925f36f)

**Pourquoi.** La page affiche `Rating 2854`, `Rank #47`, titre `Grandmaster`.
Rien de tout ça n'existe en DB.

**Schéma (migration nécessaire).**
```ts
// apps/server/src/db/schema.ts — table users
rating:      integer("rating").notNull().default(1000),
peakRating:  integer("peak_rating").notNull().default(1000),
```

`peakRating` est mis à jour à chaque fin de partie quand `rating > peakRating`.
Sert exclusivement à la milestone « Highest rating » de §3.9 — évite de
maintenir un historique complet du rating pour la v1.

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
  .set({
    rating:     sql`${users.rating} + ${delta}`,
    peakRating: sql`GREATEST(${users.peakRating}, ${users.rating} + ${delta})`,
  })
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

**Aussi étendre `GET /api/auth/me`** (et donc `CurrentUser` côté front
dans `apps/web/src/lib/auth.ts`) pour renvoyer `rating` (et idéalement
`peakRating`). Sans ça, la TopNav authed affiche `Rating 2854` mock
même après que la colonne soit en DB — `getCurrentUser()` ne sait pas
le lire. Le slot UI est prêt, il attend juste le champ.

- `rank` = `SELECT count(*) + 1 FROM users WHERE rating > $me AND is_deleted = false`
- `title` = dérivé du rating, par paliers (à arrêter — proposition) :
  - `< 1000`  → "Beginner"
  - `< 1400`  → "Apprentice"
  - `< 1800`  → "Expert"
  - `< 2200`  → "Master"
  - `>= 2200` → "Grandmaster"

**Effort estimé.** Migration courte + ~30 lignes dans `gameManager` +
~10 lignes dans `users.ts` + 2 lignes dans `auth.ts` (route `/me`).

**Statut (juin 2026).** ✅ Livré sur `main` via la branche
`kgriset_landing_wire` (merge commit `925f36f`). Décomposition réelle :

- **Schéma.** Migration `0002_sad_whizzer.sql` ajoute `users.rating` et
  `users.peak_rating` (toutes deux `integer NOT NULL DEFAULT 1000`).
- **Math Elo.** `apps/server/src/game/elo.ts` — `eloDelta`,
  `phantomRatingForDifficulty` (easy=800, medium=1200, hard=1800),
  `titleForRating`, types `AiDifficulty` / `GameOutcome` / `Title`. 14
  cas vitest dans `tests/game/elo.test.ts`.
- **Application dans `gameManager.finishGame()`.** Méthode privée
  `applyEloForPlayer` appelée une fois par joueur avec le score dérivé
  de `s.winner` (1=win, 0.5=draw, 0=loss). Atomicité via
  `sql\`users.rating + delta\`` + `GREATEST(peak_rating, …)`.
- **Rang + titre côté API.** `apps/server/src/lib/rank.ts` —
  `getUserRank(rating, peakRating, userId)` ; même formule utilisée par
  le endpoint leaderboard pour garantir que le rang `/me` matche la
  position sur le board. `titleForRating` est la même fonction
  côté TS ; le SQL du leaderboard duplique la même table de paliers
  via un `CASE` (les deux sont gardés en sync par les tests).
- **Endpoints étendus.** `GET /api/auth/me`, `GET /api/users/:id`,
  `GET /api/profile` renvoient maintenant `rating`, `peakRating`,
  `rank`, `title`. `CurrentUser` côté front étendu en conséquence.
- **Endpoint nouveau (pas listé dans le handoff d'origine).**
  `GET /api/leaderboard?limit=N` (public, default 6, max 50, anonyme).
  Réponse : `{ entries: [{ rank, username, rating, peakRating,
  winRate, title }] }`. 11 cas vitest dans
  `tests/leaderboard.test.ts`. Le landing page consomme cet endpoint
  via le nouveau `apps/web/src/lib/leaderboard-store.ts` (singleton
  `useSyncExternalStore` parallèle à `play-store.ts`).
- **Seed.** `apps/server/scripts/seed.ts` : 4 baseline users (alice,
  bob, charlie, diana) + 9 high-rated (QuantumDrop 2854, Sarah_w 2710,
  BotSlayer99 2699, GridLock_ 2569, A_connect 2349, Pivot_ 2210,
  FourFingers 2080, DiagonalDan 1980, RookieRed 1654) avec
  `gamesPlayed/Won/Lost/Drawn` cohérents. 23 historical games pour
  peupler l'onglet Stats des profils mock.
- **Web UI.** `MOCK_ENTRIES` retiré de `Leaderboard.tsx` et
  `EndGameOverlay.tsx`. `TopNav.astro` affiche `{user.title} ·
  {user.rating}`. 6 entrées au board (était 5 dans le mock),
  `ROW_OPACITY` étendu à 6 paliers.
- **Bug fixes inclus dans le même merge.** 5 pages authed
  (`/play`, `/play/ai/[id]`, `/play/m/[id]`, `/profile`, `/settings`)
  gated derrière `isAuthenticated()` avec redirection vers
  `/signup?step=1`. Le score anonyme de la démo du landing est
  persisté en `localStorage` à Step1Save puis forward à
  `POST /api/auth/signup-complete` (nouveau paramètre optionnel
  `initialRating`, atomic, idempotent — n'écrase que les rows encore
  à `rating=1000`).

**Vérifications.** `pnpm --filter server exec tsc --noEmit` clean,
`pnpm --filter web build` clean. Vitest non disponible dans le lockfile
(pre-existing) — à installer séparément.

---

### 3.3 — Historique des parties d'un user

**Pourquoi.** L'onglet Overview affiche un tableau "Recent games" et la
version mobile une liste. Mockée aujourd'hui.

**Spec.**
```
GET /api/users/:id/games?limit=20&offset=0&status=finished     (public)
→ 200 [{
    id:                    number,
    mode:                  "connect4",
    finishedAt:            string,                  # ISO 8601
    result:                "win" | "loss" | "draw", # POV de l'user demandé
    detail:                string,                  # ex. "4 in a row · column 4"
                                                    # ou "Opponent resigned"
    moveCount:             number,                  # COUNT(moves) pour la partie
    timePerPlayerSeconds:  300 | 600 | 3600,        # contrôle de temps utilisé
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

`moveCount` et `timePerPlayerSeconds` sont consommés par §3.9 (l'onglet
Stats agrège l'historique côté serveur, mais c'est aussi utile pour
afficher la vignette « 24 coups · Blitz » dans le tableau Recent games
si on veut enrichir plus tard).

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

### 3.9 — Stats agrégés (`GET /api/users/:id/stats`)

**Pourquoi.** L'onglet **Stats** a été redessiné pour ne plus dupliquer
les chiffres du header (rating, win rate, total games sont déjà visibles
sur la card du haut). Il découpe maintenant les mêmes parties selon des
dimensions que le header ne montre pas :

1. **Streaks & form** — série en cours, plus longue série, 10 derniers
   résultats sous forme de pastilles.
2. **By time control** — Bullet (3 min) / Blitz (10 min) / Daily
   (60 min) avec win rate et W/L/D par cadence.
3. **By opponent strength** — % de victoires contre adversaires plus
   faibles / égaux / plus forts.
4. **Milestones** — victoire la plus rapide, partie la plus longue,
   meilleur rating atteint, temps total joué.

Aucun endpoint actuel ne retourne ces aggrégats. La page mock pour
l'instant.

**Spec.**
```
GET /api/users/:id/stats                         (public, GET)
→ 200 {
    streaks: {
      current:  number,           # série de victoires en cours (0 si la
                                  # dernière partie finie n'est pas une win)
      longest:  number,           # plus longue série de victoires de l'historique
    },

    form: ("win" | "loss" | "draw")[],
                                  # 10 derniers résultats, du plus ancien
                                  # au plus récent (pour rendu gauche→droite)

    byTimeControl: [{
      timePerPlayerSeconds: 300 | 600 | 3600,
      label:    "Bullet" | "Blitz" | "Daily",
      duration: "3 min" | "10 min" | "60 min",
      played:   number,
      won:      number,
      lost:     number,
      drawn:    number,
      winRate:  number,           # 0-100, arrondi à 1 décimale
    }],

    byOpponentStrength: [{
      bucket:   "lower" | "equal" | "higher",
      label:    "Lower-rated" | "Equal-rated" | "Higher-rated",
      symbol:   "↓" | "=" | "↑",
      played:   number,
      won:      number,
      winRate:  number,
    }],

    milestones: {
      fastestWin:         { gameId: number, moveCount: number, finishedAt: string } | null,
      longestGame:        { gameId: number, moveCount: number, finishedAt: string } | null,
      highestRating:      { rating: number } | null,    # = users.peakRating
      totalSecondsPlayed: number,                       # somme(finishedAt - startedAt)
    },
  }
```

**Calculs.**
- `streaks.current` : parcourir l'historique fini par ordre desc ;
  compter les wins consécutifs en partant du plus récent ; arrêter à la
  première loss/draw.
- `streaks.longest` : balayer tout l'historique en avant, retenir le max
  d'une fenêtre de wins consécutifs.
- `form` : `SELECT result FROM games WHERE user IN (...)
  AND status = 'finished' ORDER BY finished_at DESC LIMIT 10`, puis
  inverser côté serveur pour livrer ancien→récent.
- `byTimeControl` : `GROUP BY time_per_player_seconds`. Le `label` /
  `duration` peut être hardcodé selon la valeur (300 → Bullet, etc.).
- `byOpponentStrength` : pour chaque partie finie, classer en buckets
  selon `opponent.rating - me.rating` au moment de la partie. Frontières
  proposées : `< -50` → lower, `±50` → equal, `> +50` → higher. Tolère
  un seuil paramétrable côté env si besoin.
  > **Note de précision** : si la requête utilise `users.rating` actuel
  > (pas un snapshot stocké dans `games`), les buckets sont approximatifs
  > pour les vieilles parties. Acceptable v1. Pour précision exacte plus
  > tard, dénormaliser : ajouter `games.player1_rating_before` et
  > `player2_rating_before` (snapshotés au démarrage de la partie).
- `milestones.fastestWin` : `SELECT id, ...,
  (SELECT count(*) FROM moves WHERE game_id = games.id) AS move_count
  FROM games WHERE result = 'win' ORDER BY move_count ASC LIMIT 1`.
  Idem pour `longestGame` (sans filtre `result`, ORDER DESC).
- `milestones.highestRating` : `SELECT peak_rating FROM users WHERE id = ...`.
  Donne `null` si l'utilisateur n'a pas encore joué (peak_rating == 1000
  par défaut, on peut renvoyer `null` si gamesPlayed == 0).
- `milestones.totalSecondsPlayed` : `SUM(EXTRACT(EPOCH FROM (finished_at - started_at)))`
  sur les finished_at non-null. Approximation acceptable — n'enlève pas
  le temps de pause entre les coups, mais reflète le temps « investi ».

**Notes d'implémentation.**
- Public (pas d'auth) — un user peut consulter les stats des autres.
- Si `gamesPlayed == 0` : renvoyer un payload « vide » avec
  `streaks: { current: 0, longest: 0 }`, `form: []`, les listes
  by* à `[]`, et les milestones à `null` / `0`. Le frontend gère
  déjà l'absence de chiffres.
- Une seule route, pas un endpoint par section : la page Stats fetche
  une fois au load et hydrate les 4 blocs.
- Caching : si on en met (Redis ou inline LRU), invalider à chaque
  fin de partie via `gameManager.finishGame()`.

**Effort estimé.** ~120 lignes (5-6 requêtes Drizzle parallélisées via
`Promise.all`, plus la logique de bucketing et le scan streaks). Plus
gros morceau de la todo restante après §3.2.

---

### 3.10 — File de matchmaking (`POST /api/match/queue`)

**Pourquoi.** Le **lobby** (`/play`) propose deux entrées principales :
**Play AI** (instantané, déjà couvert par `POST /api/games/ai` de Tim) et
**Challenge** qui doit pouvoir trouver un adversaire *de niveau similaire*
sans passer par un lobby manuel partagé. La v1 du lobby se contente du
flux "Challenge friend" (qui réutilise `POST /api/lobbies` + une notif).
La file de matchmaking est l'upgrade v2 — pour quand on veut "trouver
quelqu'un en ligne" sans connaître personne.

**Spec.**
```
POST /api/match/queue                         (auth)
body: {
  mode:                 "connect4",
  timePerPlayerSeconds: 300 | 600 | 3600,
}
→ 202 { queueId: string, position: number, estimatedWait: number }
                                            # number en secondes, best-effort
→ 400 si déjà dans une file ouverte

DELETE /api/match/queue/:queueId              (auth)
→ 204 (annule)

Socket S→C : "match:found" { gameId, opponent: { id, username, rating } }
                                            # le serveur push quand
                                            # une paire est constituée
```

**Comportement attendu.**
- Pairing par fenêtre glissante de rating (±100 au début, ±200 après 30s,
  ±400 après 60s) pour éviter de geler un joueur isolé.
- Une seule file active par user (pas de queue dans deux modes en
  parallèle).
- Auto-cleanup côté serveur si l'user disconnecte > 30s.
- Quand un match est trouvé, créer un lobby privé via la logique de
  `POST /api/lobbies` (Tim) + le démarrer (`POST /api/lobbies/:id/start`)
  pour que le client tombe directement sur la partie.

**Schéma.** Pas de table dédiée nécessaire pour v2 — la file vit
en mémoire dans un singleton (similar à `gameManager`). On persistera
uniquement si le besoin se fait sentir (analytics, reprise après reboot).

**Effort estimé.** ~80 lignes serveur + 1 event socket. Pas critique
pour le lobby v1 ; le bouton « Find match » reste désactivé avec un
tooltip « bientôt » jusqu'à ce que cet endpoint soit livré.

---

### 3.11 — Surfaces lobby-only (différées)

**Pourquoi.** Le lobby v1 expose Quick Play CTAs + Resume strip et c'est
tout. On a essayé d'y mettre « Friends online » et « Recent results »
mais c'étaient des miroirs maigres de ce qui vit déjà dans `/profile`
(onglet Friends, onglet Overview → Recent games). Pas de valeur ajoutée
côté lobby. Pour que le lobby soit autre chose qu'« un raccourci vers
play » dans v2, il faut des surfaces qui *n'existent que là* :

#### a. Public lobbies — feed « Quick join »

Liste des lobbies publics ouverts (mode + temps + créateur visibles),
clic pour rejoindre. Existe déjà côté serveur via `GET /api/lobbies`
(Tim) — il suffit de l'afficher.

```
GET /api/lobbies?status=waiting&isPublic=true     (public, déjà existant)
→ [{
    id, code, mode, timePerPlayerSeconds,
    creator: { id, username, rating },           # rating dépend de §3.2
    createdAt
  }]
```

Pas de nouvel endpoint ; il faut juste consommer celui de Tim. **C'est
le candidat n°1 pour remplacer ce qu'on a retiré.**

#### b. Daily challenge / weekly missions

Engagement gameplay :
- Puzzle du jour (« mate-in-3 » dans une position de Connect-4 — ou un
  format simple type « gagne en ≤ X coups vs IA hard »).
- Missions hebdo (« win 3 blitz games », « beat someone +100 rating »).

Schéma à concevoir : `daily_challenges`, `user_challenge_progress`,
endpoints `GET /api/challenges/today`, `POST /api/challenges/:id/attempt`.
Effort moyen ; à reporter post-MVP.

#### c. Live activity ticker

Stream socket `activity:*` qui pousse des événements `friend_finished`,
`new_high_rating`, etc. pour afficher un fil temps-réel sur le lobby.
Distinct de Recent games (qui est l'historique perso) : c'est de
l'activité *des autres* qu'on connait. Pas critique ; nécessite que
les sockets soient bien câblés d'abord.

**Aucun de ces trois n'est nécessaire pour shipper le lobby v1.** Ils
remplacent les cards Friends/Recent retirées au moment où le backend
les justifie.

---

### 3.12 — `POST /api/auth/logout` — comportement form vs API  ✅ FAIT (kgriset_settings, commits 26ccaac + cf4dd29)

**Pourquoi.** La TopNav authed (sur `/play`, `/profile`, etc.) utilise
un `<form method="POST" action="/api/auth/logout">` pour le bouton
Logout — choix volontaire pour que ça marche **sans JS**. Le serveur
aujourd'hui répond `200 { message: "Logged out" }` après avoir effacé
le cookie. Conséquence : après le clic, le navigateur affiche le JSON
brut au lieu de revenir sur la page d'accueil. UX cassée.

**Spec proposée.**

Faire en sorte que la route détecte le type de client et réponde en
conséquence (content negotiation classique) :

```ts
app.post("/logout", async (request, reply) => {
  reply.clearCookie("auth_token", { path: "/" });

  // Form submission from a browser → 302 redirect to /.
  // API call (fetch / axios with Accept: application/json) → JSON.
  const accept = request.headers.accept ?? "";
  if (accept.includes("text/html")) {
    return reply.redirect(302, "/");
  }
  return reply.send({ message: "Logged out" });
});
```

**Effort.** ~5 lignes. Aucune migration.

**Alternative côté front** si on ne veut pas toucher au backend : le
`<form>` dans `TopNav.astro` se transforme en `<button>` avec un
handler JS qui fait `fetch(POST /api/auth/logout)` puis
`window.location = "/"`. Casse le no-JS path mais reste fonctionnel.

**Statut (juin 2026).** ✅ Livré sur la branche `kgriset_settings`
(commits `26ccaac` + `cf4dd29`). Décomposition réelle :

- **Logout content-negotiation** (`26ccaac` + correctifs). `/api/auth/logout` lit
  les headers :
  - si `Accept` contient `text/html` OU si le `Content-Type` est `application/x-www-form-urlencoded` (ce que les formulaires HTML natifs envoient toujours) → 302 redirect
    vers `/` (chemin `<form>` du TopNav, sans JS).
  - sinon → `200 { message: "Logged out" }` (chemin fetch/curl/future
    client-side flow).
  Un parseur de contenu pour `application/x-www-form-urlencoded` a été ajouté
  dans `server.ts` pour éviter l'erreur 415 (Unsupported Media Type) lors du POST.
  L'ordre des args de `reply.redirect()` suit la signature Fastify v5
  (`url, statusCode?`) — petit gotcha trouvé à `tsc --noEmit`.

- **Bonus : `POST /api/auth/oauth42/unlink`** (`cf4dd29`). Le bouton
  Link/Unlink 42 de l'UI Settings existait depuis le mock mais n'avait
  aucun backend pour dissocier. Nouvel endpoint authed qui pose
  `oauth42Id = null` sur la row. Refuse avec 409 si l'user n'a pas
  de password — sans ça il perdrait tout moyen de se reconnecter
  (l'OAuth n'est qu'un raccourci, pas une identité propre). Renvoie
  400 si aucun oauth42Id n'est set (idempotence côté UX : le client
  affiche un message 'nothing to unlink' plutôt qu'un silent success).
  Le `kgriset_settings` PR (commit `603ce33`) wire ce endpoint dans
  le SettingsAccount React island avec un modal de confirmation.

**Vérifications.** `pnpm --filter server exec tsc --noEmit` clean,
`pnpm --filter web build` clean. Pas de tests vitest pour logout
(cookie clear + redirect = trivial à la main).

---

## 4. Ordre de priorité recommandé

1. **Merger `tim` dans `main`.** Pré-requis pour 3.2, 3.3, 3.4, 3.5, 3.9.
2. **3.1 — `/users/by-username/:username` + `createdAt`.** ✅ FAIT
   (kgriset_3_1_users). Endpoint public, même shape que
   `/api/users/:id` (helper partagé). Les URLs `/profile/<username>`
   ont maintenant un endpoint à appeler ; reste à câbler côté
   frontend. Pré-requis pour 3.3, 3.5, 3.9 — maintenant levé pour
   3.1, le câblage de la page profile attend toujours 3.3 + 3.5 + 3.9.
3. **3.2 — Rating Elo + `peak_rating` + rang + titre.** ✅ FAIT
   (kgriset_landing_wire, merge `925f36f`). Était migration courte.
   Pré-requis pour 3.3, 3.5, 3.9 — maintenant levé.
4. **3.3 — Historique parties (`/users/:id/games`).** Dépend de 3.2 pour
   `opponent.rating`. Sert l'onglet Overview (Recent games).
5. **3.9 — Stats agrégés (`/users/:id/stats`).** Dépend de 3.2 + 3.3.
   Sans ça l'onglet Stats reste mocké.
6. **3.4 — Parties actives (`/users/me/games/active`).** Dépend de 3.2.
   Sert le panneau Daily games de l'Overview.
7. **3.5 — `/friends` enrichi.** Petit, complète l'onglet Friends.
8. **3.6 — Spectate.** Dépend de 3.4 pour le bouton Watch d'un ami.
9. **3.7 — Challenge direct.** Dépend du système de notifications déjà en
   place + lobby de Tim.
10. **3.10 — Matchmaking queue.** Pas critique. Active le bouton « Find
    match » sur le lobby. Peut attendre que le flow Challenge friend
    (3.7) soit éprouvé en prod avant d'ajouter cette deuxième entrée.
11. **3.12 — Logout content-negotiation.** ✅ FAIT
    (kgriset_settings, commits `26ccaac` + `cf4dd29`). Le bouton
    Logout de la TopNav redirige maintenant proprement, et un
    endpoint OAuth-unlink bonus a été ajouté en passant.

Les points 3.1 → 3.5 + 3.9 forment l'essentiel du câblage de `/profile`.
Les points 3.6 et 3.7 ne sont nécessaires que pour rendre les boutons
fonctionnels — la page s'affiche déjà correctement sans eux (elle a juste
des `href="#"`).

Pour le lobby (`/play`) : 3.4 + 3.5 enrichi suffisent à le rendre vivant
côté serveur. Tim a déjà `POST /api/games/ai` et `POST /api/lobbies` qui
couvrent les deux CTA principaux. 3.10 est l'upgrade « Find match » v2.

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

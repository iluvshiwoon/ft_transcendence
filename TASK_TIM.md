# TASK_TIM — B5 Game Logic Engine

> Fichier personnel. Ref officielle : `TASKS.md > B5`.

---

## Prerequisite checklist

- [ ] Installer vitest : `cd apps/server && pnpm add -D vitest`

---

## Ce qu'il faut comprendre avant de coder

### 1. Représentation du plateau en 2D
- [ ] Comprendre `board[row][col]` (ligne = gravité, colonne = input joueur)
- [ ] Savoir trouver la ligne la plus basse disponible dans une colonne
- [ ] Savoir parcourir la grille dans 4 directions avec des vecteurs `[dr, dc]`

```
horizontal  → [0, +1] et [0, -1]
vertical    → [+1, 0] et [-1, 0]
diag ↘      → [+1, +1] et [-1, -1]
diag ↗      → [+1, -1] et [-1, +1]
```

---

### 2. Détection de victoire
- [ ] Implémenter `checkWin` avec les vecteurs directionnels
- [ ] Implémenter `isDraw` (plateau plein, pas de gagnant)

---

### 3. Algorithme Minimax
- [ ] Regarder la vidéo : [Sebastian Lague — Minimax + Alpha-Beta (7 min)](https://www.youtube.com/watch?v=l-hh51ncgDI)
- [ ] Comprendre la récursivité de minimax
- [ ] Comprendre maximiseur (IA) vs minimiseur (joueur humain)
- [ ] Implémenter minimax **sans** alpha-beta d'abord (profondeur 3), le tester

---

### 4. Alpha-Beta Pruning
- [ ] Comprendre `alpha` (meilleur score du maximiseur) et `beta` (meilleur score du minimiseur)
- [ ] Ajouter la condition d'élagage à minimax existant
- [ ] Augmenter la profondeur et vérifier que c'est plus rapide

---

### 5. Fonction d'évaluation heuristique
- [ ] Retourner `+Infinity` si l'IA gagne, `-Infinity` si le joueur gagne
- [ ] Scorer les "fenêtres" de N cases pour les nœuds intermédiaires :
  - 3 jetons IA + 1 vide = très bon
  - 2 jetons IA + 2 vides = bon
  - 3 jetons adversaire + 1 vide = mauvais (bloquer)

---

## Ordre d'implémentation recommandé

1. `board.ts` — `createBoard`, `dropToken`, `getValidMoves`
2. `winDetection.ts` — `checkWin`, `isDraw`
3. Minimax basique (sans alpha-beta, profondeur 3) dans `ai.ts`
4. Tests vitest pour board + winDetection
5. Alpha-beta pruning dans `ai.ts`
6. `gameState.ts` — classe `GameState` avec `makeMove`, `getState`, `loadState`
7. Tests pour l'IA (déterminisme à profondeur hard)

---

## Fichiers à créer

| Fichier | Exports |
|---|---|
| `apps/server/src/game/board.ts` | `createBoard`, `dropToken`, `getValidMoves` |
| `apps/server/src/game/winDetection.ts` | `checkWin`, `isDraw` |
| `apps/server/src/game/ai.ts` | `getBestMove` |
| `apps/server/src/game/gameState.ts` | `GameState` |
| `apps/server/tests/game/*.test.ts` | tests vitest |

---

## Difficulté → profondeur minimax

| Niveau | Profondeur | Comportement |
|---|---|---|
| easy | 2 | 30% de coups aléatoires |
| medium | 5 | minimax pur |
| hard | 8 | minimax pur |

Délai artificiel entre les coups IA : 500–2000 ms (random).

# Project: Transcendence — Puissance 4 (Connect 4)

## Description

Application web multijoueur de **Puissance 4**. Les joueurs peuvent s'affronter en ligne via des lobbies publics/privés, jouer contre une IA, gérer leur profil et statistiques, discuter en direct, et recevoir des notifications en temps réel. La plateforme est sécurisée par un WAF et une gestion des secrets via HashiCorp Vault.

---

## Technical Stack

*   **Frontend :** **Astro** (SSR pour les pages publiques) + **React** (islands pour les pages interactives)
*   **Styling :** **Tailwind CSS** + **shadcn/ui** (TBD)
*   **Backend :** **Fastify** + **TypeScript** (mode non-strict)
*   **Real-time :** **Socket.io**
*   **ORM :** **Drizzle ORM** + **Drizzle Kit** (migrations)
*   **Database :** **PostgreSQL**
*   **Auth :** JWT en HttpOnly cookie (7 jours) + OAuth 42
*   **Security :** ModSecurity (WAF) + HashiCorp Vault
*   **Deployment :** **Docker Compose** + `make`

---

## Module List (19 Points)

### Major Modules (6 × 2 = 12 pts)

1.  **Framework Front + Back**
    *   Astro (SSR + React islands) pour le frontend, Fastify pour le backend.
2.  **Puissance 4 Web Game**
    *   Jeu en 7×6 (ou 5×5 en Connect 5) entièrement jouable dans le navigateur, avec détection de victoire et gestion du timer.
3.  **Remote Players**
    *   Multijoueur en ligne via Socket.io : deux joueurs sur des machines différentes, état de jeu synchronisé par le serveur.
4.  **AI Opponent**
    *   Bot jouable solo. Algorithme minimax avec élagage alpha-bêta. Trois niveaux de difficulté (easy / medium / hard). Délai artificiel entre les coups pour simuler une réflexion humaine.
5.  **User Management**
    *   Comptes avec inscription/connexion (email+mot de passe ou OAuth 42), profil (avatar, bio, skins), statut en ligne/hors-ligne/en-jeu, système d'amis (demande/acceptation/refus/blocage).
6.  **User Interaction**
    *   Chat direct entre utilisateurs (historique persistant), liste d'amis avec statuts, consultation des profils publics, recherche d'utilisateurs par pseudonyme.
7.  **WAF + Vault**
    *   ModSecurity en reverse proxy bloquant les attaques OWASP courantes. HashiCorp Vault pour stocker et distribuer tous les secrets (JWT secret, DB password, OAuth client_secret).

### Minor Modules (7 × 1 = 7 pts)

8.  **Notification System**
    *   Notifications in-app uniquement : toast temps réel via Socket.io + persistance en base. Dropdown depuis l'icône cloche dans le header avec badge de non-lus.
9.  **Game Stats**
    *   Historique des parties, win rate, parties jouées/gagnées/perdues/nulles. Les stats sont stockées directement sur la table `users`. Les 10 dernières parties et les 3 adversaires les plus fréquents sont affichés sur le profil.
10. **ORM**
    *   Drizzle ORM pour toutes les interactions avec la base de données. Drizzle Kit pour la gestion des migrations.
11. **Game Customization**
    *   Skins de pions et de grille sélectionnables par l'utilisateur. Variante Connect 5. Chaque joueur voit son propre skin de grille et ses propres pions ; les pions adverses adoptent le skin de l'adversaire.
12. **OAuth Authentication**
    *   Connexion via l'OAuth 42. Crée un compte automatiquement au premier login. Les utilisateurs inscrits par email peuvent lier leur compte 42 ultérieurement.
13. **SSR**
    *   Pages publiques rendues côté serveur via Astro pour améliorer les performances et le SEO.

---

## Point Breakdown

| Category | Calculation | Total |
| :--- | :--- | :--- |
| **Major Modules** | 6 Modules × 2 Points | 12 pts |
| **Minor Modules** | 7 Modules × 1 Point | 7 pts |
| **Total Score** | | **19 / 19 pts** |

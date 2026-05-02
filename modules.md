# Project: Transcendence — Puissance 4 (Connect 4)

## Description
This project is a modern, web-based implementation of the classic **Puissance 4** (Connect 4). The application allows users to play against a challenging AI, compete in real-time against remote players, and participate in organized tournaments. Beyond the core gameplay, it features a robust social ecosystem where users can manage profiles, add friends, and chat in real-time. The platform is designed with a focus on performance via Server-Side Rendering and a developer-friendly, type-safe architecture.

---

## Technical Stack
To ensure a balance between rapid UI development and high-performance real-time logic, the following stack has been selected:

*   **Frontend Framework:** **Astro** (using React components for interactive game elements).
*   **Backend Framework:** **Fastify** (dedicated to handling WebSocket connections and real-time game state) + **Astro** (handling SSR, routing, and API endpoints).
*   **Database ORM:** **Drizzle ORM** (selected for its SQL-like syntax and superior TypeScript integration compared to Prisma).
*   **Database:** PostgreSQL (structured schema with well-defined relations).
*   **Real-time Communication:** **WebSockets** for low-latency gameplay and live chat.
*   **Deployment:** **Podman** for containerized, single-command deployment.

---

## Module List (19 Points)

### Major Modules (7 × 2 = 14 pts)
1.  **Framework Front + Back**
    *   The project uses **Astro** as a full-stack framework for the UI and SSR, combined with **Fastify** as a specialized backend for WebSocket management.
2.  **Puissance 4 Web Game**
    *   A fully functional 7×6 grid game with token dropping mechanics and win-condition detection (4 aligned tokens) playable directly in the browser.
3.  **Remote Players**
    *   Real-time online multiplayer support allowing two players on different devices to play together via a synchronized game state.
4.  **AI Opponent**
    *   An intelligent bot for solo play. It is designed to be challenging and simulate human-like decision-making rather than purely random moves.
5.  **User Management**
    *   Secure account system including signup, login, profile customization (avatars), and live online/offline status tracking.
6.  **User Interaction**
    *   A social layer featuring a real-time chat system, a friends list (add/remove functionality), and the ability to view public profiles of other players.
7.  **Cybersecurity (Hardened)**
    * Implementation of a strictly configured ModSecurity/WAF to block common web attacks.  
    * Integration of HashiCorp Vault to manage, encrypt, and isolate all sensitive credentials (API keys, DB passwords).

### Minor Modules (5 × 1 = 5 pts)
7.  **Server-Side Rendering (SSR)**
    *   Utilizing **Astro's** SSR capabilities to improve initial load times and overall performance.
8.  **ORM (Object-Relational Mapping)**
    *   Implemented via **Drizzle** to manage database interactions without writing raw SQL, ensuring type safety and cleaner code.
9.  **Tournament System**
    *   A module to register multiple players, generate match brackets, and track progress until a winner is declared.
10. **Game Customization**
    *   User-selectable options such as alternative color themes, varying grid sizes, or the "Connect 5" variant.
11. **OAuth Authentication**
    *   Integration of "Login with Google" or "42" to complement the standard email/password authentication system.

---

## Point Breakdown
| Category | Calculation | Total |
| :--- | :--- | :--- |
| **Major Modules** | 6 Modules × 2 Points | 12 pts |
| **Minor Modules** | 7 Modules × 1 Point | 7 pts |
| **Total Score** | | **19 / 19 pts** |

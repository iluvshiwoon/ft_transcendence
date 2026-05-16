// Construction de l'instance Fastify : plugins, routes, config CORS.
// La séparation construction/démarrage (cf. index.ts) permet de tester sans bind sur un port.

import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { authRoutes } from "./routes/auth.js";

export async function buildServer() {
  const app = Fastify({
    logger: true,
  });

  // Lecture/écriture des cookies (utilisé par l'auth pour le JWT en HttpOnly).
  await app.register(cookie);

  // Autorise le frontend Astro à appeler le back depuis un autre origin.
  // credentials: true → le navigateur envoie les cookies cross-origin.
  await app.register(cors, {
    origin: process.env.FRONTEND_URL ?? "http://localhost:4321",
    credentials: true,
  });

  // Health check pour vérifier que le serveur tourne.
  app.get("/health", async () => {
    return { status: "ok" };
  });

  // Routes d'auth : /api/auth/signup, /login, /logout, /me
  await app.register(authRoutes, { prefix: "/api/auth" });

  return app;
}

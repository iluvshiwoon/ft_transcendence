// Setup du serveur Socket.io.
// - Configure CORS pour le frontend.
// - Auth middleware via JWT cookie (cf. socket/auth.ts).
// - À la connexion : marque l'user online + notifie ses amis.
// - À la déconnexion : marque offline + notifie ses amis.
//
// Chaque user a sa propre "room" Socket.io nommée user:<id>.
// On émet les events ciblés vers ces rooms.

import fastifyIO from "fastify-socket.io";
import type { FastifyInstance } from "fastify";
import type { Server } from "socket.io";
import { and, eq, or } from "drizzle-orm";
import { db } from "../db/client.js";
import { users, friendships } from "../db/schema.js";
import { socketAuthMiddleware } from "./auth.js";
import { registerChatHandlers } from "./chat.js";
import { registerLobbyHandlers } from "./lobby.js";
import { registerGameHandlers } from "./game.js";
import { setNotificationIO } from "../services/notification.js";
import { gameManager } from "../game/gameManager.js";

// Rend `app.io` accessible (le plugin attache le serveur Socket.io à l'instance Fastify).
declare module "fastify" {
  interface FastifyInstance {
    io: Server;
  } 
}

export async function setupSocket(app: FastifyInstance) {
  // Configure le serveur Socket.io avec le même CORS que le back.
  await app.register(fastifyIO as any, {
    cors: {
      origin: process.env.FRONTEND_URL ?? "http://localhost:4321",
      credentials: true,
    },
  });

  // Middleware : vérifie le JWT au handshake. Sans token valide → connexion refusée.
  app.io.use(socketAuthMiddleware(app));

  // Injecte le serveur Socket.io dans le service de notifs (pour le push live).
  setNotificationIO(app.io);

  // Injecte le serveur Socket.io dans le gameManager (broadcast game:state, game:over, etc.).
  gameManager.setIO(app.io);

  // Handler principal : appelé pour chaque connexion authentifiée.
  app.io.on("connection", async (socket) => {
    const userId = socket.data.userId;

    // Branche les handlers d'events specifiques de maniere synchrone avant tout await
    // pour ne pas rater les premiers messages du client (ex: game:join)
    registerChatHandlers(socket, app.io);
    registerLobbyHandlers(socket, app.io);
    registerGameHandlers(socket, app.io);

    // Chaque user rejoint sa room personnelle (utilisée pour le push ciblé : notifs, chat).
    socket.join(`user:${userId}`);

    // Marque online ou in_game en DB.
    const status = gameManager.isUserInGame(userId) ? "in_game" : "online";
    await db.update(users).set({ status }).where(eq(users.id, userId));

    // Annule un eventuel timer d'abandon si l'user revient dans la grace de 60 s.
    gameManager.onReconnect(userId);

    // Notifie les amis qu'on est en ligne.
    const friendIds = await getFriendIds(userId);
    for (const fid of friendIds) {
      app.io.to(`user:${fid}`).emit("user:online", { userId });
    }

    socket.on("disconnect", async () => {
      // Declenche le timer de grace 60 s sur toutes les parties actives du joueur.
      gameManager.onDisconnect(userId);

      // S'il reste d'autres sockets connectees pour cet user, on ne le marque pas offline.
      const hasOtherSockets = app.io.sockets.adapter.rooms.has(`user:${userId}`);
      if (hasOtherSockets) {
        return;
      }

      // Marque offline en DB.
      await db.update(users).set({ status: "offline" }).where(eq(users.id, userId));

      // Notifie les amis qu'on est offline.
      const friends = await getFriendIds(userId);
      for (const fid of friends) {
        app.io.to(`user:${fid}`).emit("user:offline", { userId });
      }
    });
  });
}

// Récupère les IDs des amis acceptés d'un user.
async function getFriendIds(userId: number): Promise<number[]> {
  const rows = await db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(eq(friendships.userId, userId), eq(friendships.friendId, userId))
      )
    );
  return rows.map((r) => (r.userId === userId ? r.friendId : r.userId));
}

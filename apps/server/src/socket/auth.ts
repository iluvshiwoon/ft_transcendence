// Middleware d'authentification Socket.io.
// Au handshake, on lit le cookie auth_token, on vérifie le JWT, et on attache l'userId au socket.
// Si le cookie manque ou est invalide, la connexion est rejetée.

import type { FastifyInstance } from "fastify";
import type { Socket } from "socket.io";
import { verifyToken } from "../auth/jwt.js";

// Ajoute le type userId à socket.data (utilisable partout via socket.data.userId).
declare module "socket.io" {
  interface SocketData {
    userId: number;
  }
}

export function socketAuthMiddleware(app: FastifyInstance) {
  return (socket: Socket, next: (err?: Error) => void) => {
    try {
      const rawCookie = socket.handshake.headers.cookie ?? "";
      const cookies = app.parseCookie(rawCookie);
      const token = cookies.auth_token;

      if (!token) return next(new Error("Not authenticated"));

      const payload = verifyToken(token);
      socket.data.userId = payload.userId;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  };
}

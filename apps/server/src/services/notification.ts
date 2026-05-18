// Service de notifications.
// Centralisé : appelé depuis n'importe où (friends, chat, game...).
// Insert en DB + push live via Socket.io (vers la room user:<id> du destinataire).

import type { Server } from "socket.io";
import { db } from "../db/client.js";
import { notifications } from "../db/schema.js";

export type NotificationType =
  | "friend_request"
  | "friend_accepted"
  | "game_invite"
  | "game_finished"
  | "chat_message";

// Référence vers le serveur Socket.io, injectée au démarrage par setupSocket().
let ioRef: Server | null = null;

export function setNotificationIO(io: Server) {
  ioRef = io;
}

// Crée une notif pour un user (DB + push live si online).
export async function sendNotification(
  userId: number,
  type: NotificationType,
  content: Record<string, unknown>
): Promise<void> {
  const [created] = await db
    .insert(notifications)
    .values({
      userId,
      type,
      content,
      read: false,
    })
    .returning();

  // Push live si Socket.io est initialisé.
  if (ioRef) {
    ioRef.to(`user:${userId}`).emit("notification:new", created);
  }
}

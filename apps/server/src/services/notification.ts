// Service de notifications.
// Sert à créer une notif depuis n'importe où dans le code (friends, chat, game...).
// Pour l'instant : juste insert en DB. Quand B6 (Socket.io) sera prêt, on ajoutera le push live.

import { db } from "../db/client.js";
import { notifications } from "../db/schema.js";

// Types de notifs : doit matcher l'enum notification_type dans schema.ts.
export type NotificationType =
  | "friend_request"
  | "friend_accepted"
  | "game_invite"
  | "game_finished"
  | "chat_message";

// Crée une notif pour un user (insert en DB).
// TODO: quand B6 est prêt, émettre aussi un event Socket.io "notification:new" pour ce user.
export async function sendNotification(
  userId: number,
  type: NotificationType,
  content: Record<string, unknown>
): Promise<void> {
  await db.insert(notifications).values({
    userId,
    type,
    content,
    read: false,
  });
}

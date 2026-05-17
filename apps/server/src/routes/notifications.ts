// Routes notifications (REST only — le push live Socket.io viendra avec B6).
//
// GET   /api/notifications              — liste de mes notifs (non-lues d'abord)
// GET   /api/notifications/unread-count — nombre de non-lues (pour le badge)
// PATCH /api/notifications/:id/read     — marque une notif comme lue
// PATCH /api/notifications/read-all     — marque toutes mes notifs comme lues

import type { FastifyInstance } from "fastify";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { notifications } from "../db/schema.js";
import { requireAuth } from "../auth/middleware.js";

export async function notificationRoutes(app: FastifyInstance) {
  app.get(
    "/notifications",
    { preHandler: requireAuth },
    async (request, reply) => {
      // Non-lues d'abord (false < true), puis du + récent au + ancien.
      const rows = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, request.userId!))
        .orderBy(asc(notifications.read), desc(notifications.createdAt))
        .limit(50);

      return reply.send(rows);
    }
  );

  app.get(
    "/notifications/unread-count",
    { preHandler: requireAuth },
    async (request, reply) => {
      // Juste un COUNT(*) sur les non-lues pour le badge du header.
      const [row] = await db
        .select({ count: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, request.userId!),
            eq(notifications.read, false)
          )
        );

      return reply.send({ count: row.count });
    }
  );

  app.patch<{ Params: { id: string } }>(
    "/notifications/:id/read",
    { preHandler: requireAuth },
    async (request, reply) => {
      const id = Number(request.params.id);
      if (isNaN(id)) return reply.code(400).send({ error: "Invalid id" });

      // On vérifie que la notif appartient bien à l'user connecté (sinon il pourrait
      // marquer les notifs des autres comme lues).
      const result = await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(eq(notifications.id, id), eq(notifications.userId, request.userId!))
        )
        .returning();

      if (result.length === 0) {
        return reply.code(404).send({ error: "Notification not found" });
      }

      return reply.send({ message: "Marked as read" });
    }
  );

  app.patch(
    "/notifications/read-all",
    { preHandler: requireAuth },
    async (request, reply) => {
      // Bulk update : toutes les notifs non-lues de l'user passent à read=true.
      await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.userId, request.userId!),
            eq(notifications.read, false)
          )
        );

      return reply.send({ message: "All marked as read" });
    }
  );
}

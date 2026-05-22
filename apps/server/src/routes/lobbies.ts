// Routes lobbies (REST).
//
// GET  /api/lobbies          — liste les lobbies (filtres: ?mode=connect4&status=waiting&time=300)
// POST /api/lobbies          — crée un lobby, génère un code 6 caractères
// POST /api/lobbies/:id/join  — rejoint un lobby (public direct, privé avec { code } dans le body)
// POST /api/lobbies/:id/leave — quitte le lobby
// POST /api/lobbies/:id/start — démarre la partie (créateur seulement, 2 joueurs requis)

import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { lobbies, games } from "../db/schema.js";
import { requireAuth } from "../auth/middleware.js";

interface CreateLobbyBody {
  isPublic?: boolean;
  mode?: "connect4" | "connect5";
  timePerPlayerSeconds?: number;
}

interface JoinLobbyBody {
  code?: string;
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function uniqueCode(): Promise<string>
{
  // Réessaie jusqu'à trouver un code non utilisé (collision extrêmement rare).
  for (;;) {
    const code = generateCode();
    const existing = await db.select({ id: lobbies.id }).from(lobbies).where(eq(lobbies.code, code));
    if (existing.length === 0)
      return code;
  }
}

export async function lobbyRoutes(app: FastifyInstance) {
  // GET /api/lobbies — liste avec filtres optionnels
  app.get("/lobbies", { preHandler: requireAuth }, async (request, reply) => {
    const { mode, status, time } = request.query as {
      mode?: string;
      status?: string;
      time?: string;
    };

    const filters = [];
    if (mode) filters.push(eq(lobbies.mode, mode as "connect4" | "connect5"));
    if (status) filters.push(eq(lobbies.status, status as "waiting" | "in_progress" | "closed"));
    if (time) filters.push(eq(lobbies.timePerPlayerSeconds, parseInt(time)));

    const rows = await db
      .select()
      .from(lobbies)
      .where(filters.length ? and(...filters) : undefined);

    return reply.send(rows);
  });

  // POST /api/lobbies — créer un lobby
  app.post<{ Body: CreateLobbyBody }>(
    "/lobbies",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { isPublic = true, mode = "connect4", timePerPlayerSeconds = 300 } = request.body ?? {};

      const validTimes = [300, 600, 3600];
      if (!validTimes.includes(timePerPlayerSeconds)) {
        return reply.status(400).send({ error: "timePerPlayerSeconds doit être 300, 600 ou 3600" });
      }

      const code = await uniqueCode();

      const [lobby] = await db
        .insert(lobbies)
        .values({
          code,
          creatorId: request.userId!,
          isPublic,
          mode,
          timePerPlayerSeconds,
        })
        .returning();

      return reply.status(201).send(lobby);
    }
  );

  // POST /api/lobbies/:id/join — rejoindre un lobby
  app.post<{ Params: { id: string }; Body: JoinLobbyBody }>(
    "/lobbies/:id/join",
    { preHandler: requireAuth },
    async (request, reply) => {
      const lobbyId = parseInt(request.params.id);
      const userId = request.userId!;

      const [lobby] = await db.select().from(lobbies).where(eq(lobbies.id, lobbyId));
      if (!lobby) return reply.status(404).send({ error: "Lobby introuvable" });
      if (lobby.status !== "waiting")
        return reply.status(400).send({ error: "Ce lobby n'accepte plus de joueurs" });
      if (lobby.player2Id !== null)
        return reply.status(400).send({ error: "Lobby déjà complet" });
      if (lobby.creatorId === userId)
        return reply.status(400).send({ error: "Vous êtes déjà dans ce lobby" });

      // Lobby privé : vérifier le code
      if (!lobby.isPublic) {
        if (!request.body?.code || request.body.code !== lobby.code) {
          return reply.status(403).send({ error: "Code invalide" });
        }
      }

      const [updated] = await db
        .update(lobbies)
        .set({ player2Id: userId })
        .where(eq(lobbies.id, lobbyId))
        .returning();

      return reply.send(updated);
    }
  );

  // POST /api/lobbies/:id/leave — quitter un lobby
  app.post<{ Params: { id: string } }>(
    "/lobbies/:id/leave",
    { preHandler: requireAuth },
    async (request, reply) => {
      const lobbyId = parseInt(request.params.id);
      const userId = request.userId!;

      const [lobby] = await db.select().from(lobbies).where(eq(lobbies.id, lobbyId));
      if (!lobby) return reply.status(404).send({ error: "Lobby introuvable" });
      if (lobby.status !== "waiting") return reply.status(400).send({ error: "Impossible de quitter un lobby en cours" });

      if (lobby.creatorId === userId) {
        // Le créateur quitte → fermeture du lobby
        await db.update(lobbies).set({ status: "closed" }).where(eq(lobbies.id, lobbyId));
        return reply.send({ message: "Lobby fermé" });
      }

      if (lobby.player2Id === userId) {
        await db.update(lobbies).set({ player2Id: null }).where(eq(lobbies.id, lobbyId));
        return reply.send({ message: "Vous avez quitté le lobby" });
      }

      return reply.status(403).send({ error: "Vous n'êtes pas dans ce lobby" });
    }
  );

  // POST /api/lobbies/:id/start — démarrer la partie
  app.post<{ Params: { id: string } }>(
    "/lobbies/:id/start",
    { preHandler: requireAuth },
    async (request, reply) => {
      const lobbyId = parseInt(request.params.id);
      const userId = request.userId!;

      const [lobby] = await db.select().from(lobbies).where(eq(lobbies.id, lobbyId));
      if (!lobby) return reply.status(404).send({ error: "Lobby introuvable" });
      if (lobby.creatorId !== userId) return reply.status(403).send({ error: "Seul le créateur peut démarrer la partie" });
      if (lobby.status !== "waiting") return reply.status(400).send({ error: "Le lobby n'est plus en attente" });
      if (!lobby.player2Id) return reply.status(400).send({ error: "Il faut 2 joueurs pour démarrer" });

      // Crée la partie en DB
      const [game] = await db
        .insert(games)
        .values({
          player1Id: lobby.creatorId,
          player2Id: lobby.player2Id,
          isAiOpponent: false,
          mode: lobby.mode,
          timePerPlayerSeconds: lobby.timePerPlayerSeconds,
          status: "in_progress",
          startedAt: new Date(),
        })
        .returning();

      // Ferme le lobby
      await db.update(lobbies).set({ status: "in_progress" }).where(eq(lobbies.id, lobbyId));

      return reply.status(201).send({ gameId: game.id });
    }
  );
}

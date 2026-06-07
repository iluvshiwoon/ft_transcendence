// Events lobby :
//   C->S  lobby:join   { lobbyId }  -> rejoint la room lobby:<id>
//   C->S  lobby:leave  { lobbyId }  -> quitte la room
//   S->C  lobby:update { lobby }    -> broadcast l'etat du lobby a la room
// L'etat est lu depuis la DB pour rester en phase avec les routes REST.

import type { Server, Socket } from "socket.io";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { lobbies } from "../db/schema.js";

export function registerLobbyHandlers(socket: Socket, io: Server)
{
  socket.on("lobby:join", async (payload: { lobbyId: number }) => {
    const { lobbyId } = payload ?? ({} as any);
    if (typeof lobbyId !== "number") return;

    socket.join(`lobby:${lobbyId}`);

    let [lobby] = await db.select().from(lobbies).where(eq(lobbies.id, lobbyId));
    if (lobby) {
      // Check for expiration (10 minutes)
      const expiryTime = 10 * 60 * 1000;
      if (lobby.status === "waiting" && Date.now() - new Date(lobby.createdAt).getTime() > expiryTime) {
        [lobby] = await db
          .update(lobbies)
          .set({ status: "closed" })
          .where(eq(lobbies.id, lobbyId))
          .returning();
      }
      io.to(`lobby:${lobbyId}`).emit("lobby:update", { lobby });
    }
  });

  socket.on("lobby:leave", (payload: { lobbyId: number }) => {
    const { lobbyId } = payload ?? ({} as any);
    if (typeof lobbyId !== "number") return;
    socket.leave(`lobby:${lobbyId}`);
  });
}

// Helper appele depuis routes/lobbies.ts apres un changement d'etat (join, leave, start).
export async function broadcastLobbyUpdate(io: Server, lobbyId: number): Promise<void>
{
  const [lobby] = await db.select().from(lobbies).where(eq(lobbies.id, lobbyId));
  if (lobby) io.to(`lobby:${lobbyId}`).emit("lobby:update", { lobby });
}

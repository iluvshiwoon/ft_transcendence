// Events game :
//   C->S  game:join      { gameId }       -> rejoint la room game:<id>, recoit l'etat
//   C->S  game:move      { gameId, col }  -> joue un coup (valide par le serveur)
//   C->S  game:surrender { gameId }       -> abandon manuel
//   S->C  game:state     { gameId, state }
//   S->C  game:timer     { gameId, timerP1, timerP2 }
//   S->C  game:over      { gameId, winner, winnerUserId, status }

import type { Server, Socket } from "socket.io";
import { gameManager } from "../game/gameManager.js";

export function registerGameHandlers(socket: Socket, io: Server)
{
  const userId: number = socket.data.userId;

  socket.on("game:join", (payload: { gameId: number }) => {
    const { gameId } = payload ?? ({} as any);
    if (typeof gameId !== "number") return;

    const g = gameManager.get(gameId);
    if (!g) return;
    if (g.state.slotForUser(userId) === null) return;

    socket.join(`game:${gameId}`);
    socket.emit("game:state", { gameId, state: g.state.getState() });
  });

  socket.on("game:move", async (payload: { gameId: number; col: number }) => {
    const { gameId, col } = payload ?? ({} as any);
    if (typeof gameId !== "number" || typeof col !== "number") return;
    const r = await gameManager.applyMove(gameId, userId, col);
    if (!r.ok) socket.emit("game:error", { gameId, error: r.error });
  });

  socket.on("game:surrender", async (payload: { gameId: number }) => {
    const { gameId } = payload ?? ({} as any);
    if (typeof gameId !== "number") return;
    await gameManager.surrender(gameId, userId);
  });
}

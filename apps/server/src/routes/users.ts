// Routes utilisateurs : profils publics, recherche, lecture/édition de son propre profil.
//
// GET  /api/users/:id              — profil public d'un user (n'importe qui peut le voir)
// GET  /api/users/by-username/:username — idem, mais par username (pour les URLs /profile/<username>)
// GET  /api/users/check-username   — vérifie si un username est dispo (UNAUTH, pour le signup)
// GET  /api/users/search           — recherche par username (auth requise)
// GET  /api/profile                — son propre profil (avec email, infos privées)
// PUT  /api/profile                — édite son propre profil (username, bio, skins)
// PUT  /api/profile/email          — change l'email (re-auth : current password requis)
// PUT  /api/profile/password       — change le password (re-auth : current password requis)
// POST /api/profile/avatar         — upload un avatar (JPG/PNG/WebP, max 2 MB, resize 500x500)
// DELETE /api/profile              — anonymise le compte (is_deleted = true, garde l'historique)

import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import sharp from "sharp";
import { eq, ilike, or, and, inArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { users, games } from "../db/schema.js";
import { requireAuth } from "../auth/middleware.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { titleForRating } from "../game/elo.js";
import { sendError } from "../lib/errors.js";
import { getUserRank } from "../lib/rank.js";

// Dossier de destination des avatars (créé au démarrage par server.ts).
const AVATARS_DIR = join(import.meta.dirname, "..", "..", "uploads", "avatars");
const ALLOWED_MIMETYPES = ["image/jpeg", "image/png", "image/webp"];

// Validation constants for PUT /api/profile. Kept in sync with the frontend
// equivalents in apps/web/src/components/signup/Step3Profile.tsx — if you add
// a new pawn or grid skin there, add it here too.
const BIO_MAX_LEN = 160;
const ALLOWED_PAWN_SKINS = ["default", "wine", "coral", "brick"] as const;
const ALLOWED_GRID_SKINS = ["default", "liquid-glass"] as const;

interface UpdateProfileBody {
  username?: string;
  bio?: string;
  pawnSkin?: string;
  gridSkin?: string;
}

interface UpdateEmailBody {
  currentPassword: string;
  newEmail: string;
}

interface UpdatePasswordBody {
  currentPassword: string;
  newPassword: string;
}

// Construit la réponse publique d'un profil user. Même shape pour /users/:id
// et /users/by-username/:username — comme ça le front a un seul `User` type
// à typer des deux côtés. Renvoie un placeholder minimal "Joueur supprimé"
// quand `isDeleted` est vrai, pour préserver la cohérence de l'historique
// des parties (cf. DELETE /api/profile).
async function publicProfilePayload(user: typeof users.$inferSelect) {
  if (user.isDeleted) {
    return {
      id: user.id,
      username: "Joueur supprimé",
      avatarUrl: null as string | null,
    };
  }

  const rank = await getUserRank(user.rating, user.peakRating, user.id);
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    status: user.status,
    gamesPlayed: user.gamesPlayed,
    gamesWon: user.gamesWon,
    gamesLost: user.gamesLost,
    gamesDrawn: user.gamesDrawn,
    rating: user.rating,
    peakRating: user.peakRating,
    rank,
    title: titleForRating(user.rating),
    createdAt: user.createdAt.toISOString(),
  };
}

export async function userRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/users/:id", async (request, reply) => {
    // Profil public : pas besoin d'être connecté pour voir.
    const id = Number(request.params.id);
    if (isNaN(id)) return reply.code(400).send({ error: "Invalid id" });

    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return reply.code(404).send({ error: "User not found" });

    return reply.send(await publicProfilePayload(user));
  });

  app.get<{ Params: { username: string } }>(
    "/users/by-username/:username",
    async (request, reply) => {
      // Profil public lookupé par username — utilisé par la future page
      // /profile/<username> (côté front, dynamic route Astro). Pas d'auth :
      // un profil public reste public, comme via /users/:id.
      //
      // URLs sensibles à la casse : on stocke en `eq` (case-sensitive) comme
      // le reste du schéma. /users/by-username/sarah_w ≠ /users/by-username/Sarah_w.
      // C'est volontaire et aligné avec /users/check-username (cf. signup).
      const username = request.params.username?.trim();
      if (!username) return reply.code(404).send({ error: "User not found" });

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      if (!user) return reply.code(404).send({ error: "User not found" });

      return reply.send(await publicProfilePayload(user));
    }
  );

  app.get<{ Querystring: { q?: string } }>(
    "/users/check-username",
    async (request, reply) => {
      // Public endpoint used by the signup form to live-check username availability.
      // Returns just { available: boolean } — no other user data leaked.
      //
      // TODO(rate-limit): once @fastify/rate-limit is wired into the server, gate this
      // (and signup/login) at something like 10 req/min/IP to mitigate enumeration.
      const q = request.query.q?.trim() ?? "";

      // Same constraints as signup: 3-30 chars, [a-zA-Z0-9_].
      // Invalid input → unavailable (don't tell the caller why; just block the form).
      const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;
      if (!USERNAME_RE.test(q)) {
        return reply.send({ available: false });
      }

      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, q))
        .limit(1);

      return reply.send({ available: existing.length === 0 });
    },
  );

  app.get<{ Querystring: { q?: string } }>(
    "/users/search",
    { preHandler: requireAuth },
    async (request, reply) => {
      // Recherche par username (insensible à la casse, contient la chaîne).
      const q = request.query.q?.trim();
      if (!q) return reply.send([]);

      const results = await db
        .select({
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
          status: users.status,
        })
        .from(users)
        .where(ilike(users.username, `%${q}%`))
        .limit(20);

      return reply.send(results);
    }
  );

    app.get(
    "/profile",
    { preHandler: requireAuth },
    async (request, reply) => {
      // Son propre profil : inclut l'email (info privée).
      const [user] = await db.select().from(users).where(eq(users.id, request.userId!));
      if (!user) return reply.code(404).send({ error: "User not found" });

      const rank = await getUserRank(user.rating, user.peakRating, user.id);
      return reply.send({
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        pawnSkin: user.pawnSkin,
        gridSkin: user.gridSkin,
        oauth42Linked: user.oauth42Id !== null,
        rating: user.rating,
        peakRating: user.peakRating,
        rank,
        title: titleForRating(user.rating),
        // ISO 8601 or null. null for OAuth-only accounts that have
        // never set a password. Surfaced in /settings as "Last changed".
        passwordChangedAt: user.passwordChangedAt?.toISOString() ?? null,
      });
    }
  );

  app.put<{ Body: UpdateProfileBody }>(
    "/profile",
    { preHandler: requireAuth },
    async (request, reply) => {
      // Édite username, bio, skins. Email et password ont leurs propres routes (re-auth).
      const { username, bio, pawnSkin, gridSkin } = request.body;
      const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };

      if (username !== undefined) {
        // Same regex as the signup endpoint to keep usernames consistent.
        if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
          return reply.code(400).send({
            error: "Username must be 3-30 chars (letters, numbers, underscore)",
          });
        }
        // Vérifie l'unicité du nouveau username.
        const existing = await db.select().from(users).where(eq(users.username, username));
        if (existing.length > 0 && existing[0].id !== request.userId) {
          return reply.code(409).send({ error: "Username already taken" });
        }
        updates.username = username;
      }
      if (bio !== undefined) {
        if (typeof bio !== "string" || bio.length > BIO_MAX_LEN) {
          return reply.code(400).send({ error: `Bio must be ≤ ${BIO_MAX_LEN} chars` });
        }
        updates.bio = bio;
      }
      if (pawnSkin !== undefined) {
        if (!ALLOWED_PAWN_SKINS.includes(pawnSkin as (typeof ALLOWED_PAWN_SKINS)[number])) {
          return reply.code(400).send({
            error: `Invalid pawnSkin. Allowed: ${ALLOWED_PAWN_SKINS.join(", ")}`,
          });
        }
        updates.pawnSkin = pawnSkin;
      }
      if (gridSkin !== undefined) {
        if (!ALLOWED_GRID_SKINS.includes(gridSkin as (typeof ALLOWED_GRID_SKINS)[number])) {
          return reply.code(400).send({
            error: `Invalid gridSkin. Allowed: ${ALLOWED_GRID_SKINS.join(", ")}`,
          });
        }
        updates.gridSkin = gridSkin;
      }

      const [updated] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, request.userId!))
        .returning();

      return reply.send({
        id: updated.id,
        username: updated.username,
        bio: updated.bio,
        pawnSkin: updated.pawnSkin,
        gridSkin: updated.gridSkin,
      });
    }
  );

  app.put<{ Body: UpdateEmailBody }>(
    "/profile/email",
    { preHandler: requireAuth },
    async (request, reply) => {
      // Re-auth obligatoire : on demande le mot de passe actuel avant de changer l'email.
      const { currentPassword, newEmail } = request.body;
      if (!currentPassword || !newEmail) {
        return sendError(reply, 400, "INVALID_BODY", "Missing fields");
      }

      const [user] = await db.select().from(users).where(eq(users.id, request.userId!));
      if (!user || !user.password) {
        // Compte OAuth-only : on bloque (faudrait d'abord set un password).
        return sendError(
          reply,
          400,
          "PASSWORD_REQUIRED",
          "Cannot change email without a password set",
        );
      }

      const valid = await verifyPassword(currentPassword, user.password);
      if (!valid) {
        return sendError(reply, 401, "WRONG_PASSWORD", "Wrong current password");
      }

      // Vérifie que le nouvel email n'est pas déjà pris par un autre user.
      const existing = await db.select().from(users).where(eq(users.email, newEmail));
      if (existing.length > 0 && existing[0].id !== request.userId) {
        return sendError(reply, 409, "EMAIL_IN_USE", "Email already in use");
      }

      await db
        .update(users)
        .set({ email: newEmail, updatedAt: new Date() })
        .where(eq(users.id, request.userId!));

      return reply.send({ email: newEmail });
    }
  );

  app.put<{ Body: UpdatePasswordBody }>(
    "/profile/password",
    { preHandler: requireAuth },
    async (request, reply) => {
      // Re-auth obligatoire : on demande le mot de passe actuel avant de changer.
      const { currentPassword, newPassword } = request.body;
      if (!currentPassword || !newPassword) {
        return sendError(reply, 400, "INVALID_BODY", "Missing fields");
      }
      if (newPassword.length < 8) {
        return sendError(
          reply,
          400,
          "PASSWORD_TOO_SHORT",
          "Password must be at least 8 chars",
        );
      }

      const [user] = await db.select().from(users).where(eq(users.id, request.userId!));
      if (!user || !user.password) {
        return sendError(
          reply,
          400,
          "PASSWORD_REQUIRED",
          "Cannot change password without one set",
        );
      }

      const valid = await verifyPassword(currentPassword, user.password);
      if (!valid) {
        return sendError(reply, 401, "WRONG_PASSWORD", "Wrong current password");
      }

      // Refuse same-as-current. Defense in depth: the frontend also blocks
      // this client-side so the user gets the inline error before submit,
      // but the server enforces it too — never trust the client.
      if (await verifyPassword(newPassword, user.password)) {
        return sendError(
          reply,
          400,
          "PASSWORD_SAME_AS_CURRENT",
          "New password must be different from current password",
        );
      }

      const newHash = await hashPassword(newPassword);
      const now = new Date();
      await db
        .update(users)
        .set({
          password: newHash,
          passwordChangedAt: now,
          updatedAt: now,
        })
        .where(eq(users.id, request.userId!));

      return reply.send({ message: "Password updated", passwordChangedAt: now.toISOString() });
    }
  );

  app.post(
    "/profile/avatar",
    { preHandler: requireAuth },
    async (request, reply) => {
      // Récupère le fichier uploadé. @fastify/multipart's fileSize limit
      // (2 MB, set in server.ts) is enforced inside the busboy stream, so
      // request.file() throws a Fastify error with code FST_REQ_FILE_TOO_LARGE
      // (statusCode 413) before returning a usable stream. Without this
      // catch the request would still resolve to a typed 413 (Fastify's
      // default error handler), but in the bare `{ error, statusCode }`
      // shape — the frontend's typed-error switch wouldn't match and the
      // user would see the raw 'Payload Too Large' string. We catch it
      // and re-emit through sendError so the response carries our code.
      let data;
      try {
        data = await request.file();
      } catch (err) {
        const e = err as { statusCode?: number; code?: string };
        if (e.statusCode === 413 || e.code === "FST_REQ_FILE_TOO_LARGE") {
          return sendError(
            reply,
            413,
            "FILE_TOO_LARGE",
            "Image must be 2 MB or smaller.",
          );
        }
        throw err;
      }
      if (!data) {
        return sendError(reply, 400, "INVALID_FILE", "No file uploaded.");
      }

      // Vérifie le type MIME (le plugin a déjà coupé si > 2 MB).
      if (!ALLOWED_MIMETYPES.includes(data.mimetype)) {
        return sendError(
          reply,
          400,
          "INVALID_FILE",
          "Unsupported file type (JPG, PNG, WebP only).",
        );
      }

      // Lit tout le fichier en mémoire (OK car ≤ 2 MB).
      const buffer = await data.toBuffer();
      if (data.file.truncated) {
        return sendError(
          reply,
          400,
          "FILE_TOO_LARGE",
          "Image must be 2 MB or smaller.",
        );
      }

      // Redimensionne en 500x500 max (sans agrandir si plus petit) et convertit en webp.
      // Si l'image est corrompue / pas réellement un format supporté (extension
      // mensongère), sharp throw — on intercepte pour renvoyer 400 plutôt que 500.
      let processed: Buffer;
      try {
        processed = await sharp(buffer)
          .resize(500, 500, { fit: "cover", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
      } catch (err) {
        request.log.warn({ err }, "avatar: sharp processing failed");
        return sendError(
          reply,
          400,
          "INVALID_FILE",
          "Couldn't read the image data — file may be corrupt.",
        );
      }

      // Sauvegarde sur disque. Nom de fichier = userId pour éviter les collisions.
      const filename = `${request.userId}.webp`;
      await writeFile(join(AVATARS_DIR, filename), processed);

      // URL publique avec un timestamp pour bust le cache du navigateur.
      const avatarUrl = `/uploads/avatars/${filename}?t=${Date.now()}`;
      await db
        .update(users)
        .set({ avatarUrl, updatedAt: new Date() })
        .where(eq(users.id, request.userId!));

      return reply.send({ avatarUrl });
    }
  );

  app.delete(
    "/profile",
    { preHandler: requireAuth },
    async (request, reply) => {
      // Anonymisation : on garde la ligne pour préserver l'historique des parties,
      // mais on efface les données perso et on marque is_deleted = true.
      // Le profil public renverra "Joueur supprimé" (cf. GET /api/users/:id).
      await db
        .update(users)
        .set({
          isDeleted: true,
          email: `deleted_${request.userId}@deleted.local`,
          username: `deleted_user_${request.userId}`,
          password: null,
          bio: null,
          avatarUrl: null,
          oauth42Id: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, request.userId!));

      // Déconnecte le user en effaçant son cookie.
      reply.clearCookie("auth_token", { path: "/" });
      return reply.send({ message: "Account deleted" });
    }
  );

  // ── B10 — Game Stats API ────────────────────────────────────────────────
  // Endpoints publics (pas d'auth) : ils alimentent la page profil de n'importe
  // quel user. Seuls les compteurs / l'historique sont exposés, jamais d'info
  // privée. Un compte supprimé (isDeleted) apparaît comme "Joueur supprimé".

  // GET /api/users/:id/stats — parties jouées/gagnées/perdues/nulles + win rate.
  app.get<{ Params: { id: string } }>("/users/:id/stats", async (request, reply) => {
    const id = Number(request.params.id);
    if (isNaN(id)) return reply.code(400).send({ error: "Invalid id" });

    const [user] = await db
      .select({
        gamesPlayed: users.gamesPlayed,
        gamesWon: users.gamesWon,
        gamesLost: users.gamesLost,
        gamesDrawn: users.gamesDrawn,
      })
      .from(users)
      .where(eq(users.id, id));
    if (!user) return reply.code(404).send({ error: "User not found" });

    // Win rate en % (1 décimale), 0 si aucune partie jouée (évite la div par 0).
    const winRate =
      user.gamesPlayed === 0
        ? 0
        : Math.round((user.gamesWon / user.gamesPlayed) * 1000) / 10;

    return reply.send({ ...user, winRate });
  });

  // GET /api/users/:id/games — historique des parties terminées (paginé, 10/page).
  app.get<{ Params: { id: string }; Querystring: { page?: string; limit?: string } }>(
    "/users/:id/games",
    async (request, reply) => {
      const id = Number(request.params.id);
      if (isNaN(id)) return reply.code(400).send({ error: "Invalid id" });

      const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, id));
      if (!user) return reply.code(404).send({ error: "User not found" });

      // Pagination : page ≥ 1, limit borné à [1, 50] (défaut 10).
      const page = Math.max(1, Number(request.query.page) || 1);
      const limit = Math.min(50, Math.max(1, Number(request.query.limit) || 10));
      const offset = (page - 1) * limit;

      // On ne montre que les parties terminées (finished/abandoned), pas celles
      // en attente ou en cours.
      const belongsToUser = and(
        or(eq(games.player1Id, id), eq(games.player2Id, id)),
        inArray(games.status, ["finished", "abandoned"]),
      );

      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(games)
        .where(belongsToUser);

      const rows = await db
        .select()
        .from(games)
        .where(belongsToUser)
        // finishedAt en premier (parties récentes), id en tie-breaker stable.
        .orderBy(sql`${games.finishedAt} desc nulls last`, sql`${games.id} desc`)
        .limit(limit)
        .offset(offset);

      // Récupère en un seul query les infos des adversaires humains référencés.
      const opponentIds = [
        ...new Set(
          rows
            .map((g) => (g.player1Id === id ? g.player2Id : g.player1Id))
            .filter((oid): oid is number => oid !== null),
        ),
      ];
      const opponentMap = await loadPublicUsers(opponentIds);

      const list = rows.map((g) => {
        // Résultat du point de vue du user demandé.
        const result =
          g.winnerId === null ? "draw" : g.winnerId === id ? "win" : "loss";

        // Adversaire : l'IA, ou l'autre joueur humain.
        const opponentId = g.player1Id === id ? g.player2Id : g.player1Id;
        const opponent = g.isAiOpponent
          ? { id: null, username: "IA", avatarUrl: null }
          : opponentMap.get(opponentId!) ?? { id: opponentId, username: "Joueur supprimé", avatarUrl: null };

        return {
          id: g.id,
          mode: g.mode,
          result,
          status: g.status,
          isAiOpponent: g.isAiOpponent,
          aiDifficulty: g.aiDifficulty,
          opponent,
          finishedAt: g.finishedAt,
        };
      });

      return reply.send({ page, limit, total, games: list });
    },
  );

  // GET /api/users/:id/opponents — top 3 des adversaires humains les plus fréquents.
  app.get<{ Params: { id: string } }>("/users/:id/opponents", async (request, reply) => {
    const id = Number(request.params.id);
    if (isNaN(id)) return reply.code(400).send({ error: "Invalid id" });

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, id));
    if (!user) return reply.code(404).send({ error: "User not found" });

    // L'adversaire = l'autre joueur de la ligne. On exclut les parties IA.
    const opponentIdExpr = sql<number>`CASE WHEN ${games.player1Id} = ${id} THEN ${games.player2Id} ELSE ${games.player1Id} END`;

    const rows = await db
      .select({
        opponentId: opponentIdExpr,
        gamesAgainst: sql<number>`count(*)::int`,
      })
      .from(games)
      .where(
        and(
          or(eq(games.player1Id, id), eq(games.player2Id, id)),
          eq(games.isAiOpponent, false),
          inArray(games.status, ["finished", "abandoned"]),
        ),
      )
      // GROUP BY position ordinale : Drizzle rend la colonne du CASE non-qualifiée
      // dans le SELECT mais qualifiée dans un GROUP BY par expression, et Postgres
      // les traite alors comme deux expressions distinctes. `GROUP BY 1` cible
      // directement la 1re colonne projetée et évite ce mismatch.
      .groupBy(sql`1`)
      .orderBy(sql`count(*) desc`)
      .limit(3);

    const map = await loadPublicUsers(rows.map((r) => r.opponentId));
    const opponents = rows.map((r) => {
      const u = map.get(r.opponentId) ?? { id: r.opponentId, username: "Joueur supprimé", avatarUrl: null };
      return { ...u, gamesAgainst: r.gamesAgainst };
    });

    return reply.send({ opponents });
  });
}

// Charge les infos publiques (id, username, avatar) d'un lot d'users en un query.
// Les comptes supprimés sont renvoyés comme "Joueur supprimé" / avatar null,
// conformément à l'anonymisation (B10 / RGPD).
async function loadPublicUsers(
  ids: number[],
): Promise<Map<number, { id: number; username: string; avatarUrl: string | null }>> {
  const map = new Map<number, { id: number; username: string; avatarUrl: string | null }>();
  if (ids.length === 0) return map;

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      avatarUrl: users.avatarUrl,
      isDeleted: users.isDeleted,
    })
    .from(users)
    .where(inArray(users.id, ids));

  for (const u of rows) {
    map.set(
      u.id,
      u.isDeleted
        ? { id: u.id, username: "Joueur supprimé", avatarUrl: null }
        : { id: u.id, username: u.username, avatarUrl: u.avatarUrl },
    );
  }
  return map;
}

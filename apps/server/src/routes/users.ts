// Routes utilisateurs : profils publics, recherche, lecture/édition de son propre profil.
//
// GET  /api/users/:id              — profil public d'un user (n'importe qui peut le voir)
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
import { eq, ilike } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { requireAuth } from "../auth/middleware.js";
import { hashPassword, verifyPassword } from "../auth/password.js";

// Dossier de destination des avatars (créé au démarrage par server.ts).
const AVATARS_DIR = join(import.meta.dirname, "..", "..", "uploads", "avatars");
const ALLOWED_MIMETYPES = ["image/jpeg", "image/png", "image/webp"];

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

export async function userRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/users/:id", async (request, reply) => {
    // Profil public : pas besoin d'être connecté pour voir.
    const id = Number(request.params.id);
    if (isNaN(id)) return reply.code(400).send({ error: "Invalid id" });

    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return reply.code(404).send({ error: "User not found" });

    // Si l'user a supprimé son compte, on renvoie un placeholder.
    if (user.isDeleted) {
      return reply.send({ id: user.id, username: "Joueur supprimé", avatarUrl: null });
    }

    // Renvoie uniquement les infos publiques (pas d'email, pas de password).
    return reply.send({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      status: user.status,
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon,
      gamesLost: user.gamesLost,
      gamesDrawn: user.gamesDrawn,
    });
  });

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

      return reply.send({
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        pawnSkin: user.pawnSkin,
        gridSkin: user.gridSkin,
        oauth42Linked: user.oauth42Id !== null,
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
        // Vérifie l'unicité du nouveau username.
        const existing = await db.select().from(users).where(eq(users.username, username));
        if (existing.length > 0 && existing[0].id !== request.userId) {
          return reply.code(409).send({ error: "Username already taken" });
        }
        updates.username = username;
      }
      if (bio !== undefined) updates.bio = bio;
      if (pawnSkin !== undefined) updates.pawnSkin = pawnSkin;
      if (gridSkin !== undefined) updates.gridSkin = gridSkin;

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
        return reply.code(400).send({ error: "Missing fields" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, request.userId!));
      if (!user || !user.password) {
        // Compte OAuth-only : on bloque (faudrait d'abord set un password).
        return reply.code(400).send({ error: "Cannot change email without a password set" });
      }

      const valid = await verifyPassword(currentPassword, user.password);
      if (!valid) {
        return reply.code(401).send({ error: "Wrong current password" });
      }

      // Vérifie que le nouvel email n'est pas déjà pris par un autre user.
      const existing = await db.select().from(users).where(eq(users.email, newEmail));
      if (existing.length > 0 && existing[0].id !== request.userId) {
        return reply.code(409).send({ error: "Email already in use" });
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
        return reply.code(400).send({ error: "Missing fields" });
      }
      if (newPassword.length < 8) {
        return reply.code(400).send({ error: "Password must be at least 8 chars" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, request.userId!));
      if (!user || !user.password) {
        return reply.code(400).send({ error: "Cannot change password without one set" });
      }

      const valid = await verifyPassword(currentPassword, user.password);
      if (!valid) {
        return reply.code(401).send({ error: "Wrong current password" });
      }

      const newHash = await hashPassword(newPassword);
      await db
        .update(users)
        .set({ password: newHash, updatedAt: new Date() })
        .where(eq(users.id, request.userId!));

      return reply.send({ message: "Password updated" });
    }
  );

  app.post(
    "/profile/avatar",
    { preHandler: requireAuth },
    async (request, reply) => {
      // Récupère le fichier uploadé (limit 2 MB déjà configuré côté plugin).
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: "No file uploaded" });
      }

      // Vérifie le type MIME (le plugin a déjà coupé si > 2 MB).
      if (!ALLOWED_MIMETYPES.includes(data.mimetype)) {
        return reply.code(400).send({ error: "Unsupported file type (JPG/PNG/WebP only)" });
      }

      // Lit tout le fichier en mémoire (OK car ≤ 2 MB).
      const buffer = await data.toBuffer();
      if (data.file.truncated) {
        return reply.code(400).send({ error: "File too large (max 2 MB)" });
      }

      // Redimensionne en 500x500 max (sans agrandir si plus petit) et convertit en webp.
      const processed = await sharp(buffer)
        .resize(500, 500, { fit: "cover", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

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
}

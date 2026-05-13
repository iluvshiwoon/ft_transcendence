// Routes d'authentification : 4 endpoints appelés par le frontend.
//
// POST /api/auth/signup — crée un compte.
//   Body: { email, username, password }
//   Vérifie : champs présents, mot de passe ≥ 8 chars, email/username pas déjà pris.
//   Hash le password, insère le user, pose le JWT en cookie HttpOnly.
//
// POST /api/auth/login — connecte un user existant.
//   Body: { email, password }
//   Vérifie : credentials corrects.
//   Pose le JWT en cookie HttpOnly.
//
// POST /api/auth/logout — déconnecte le user.
//   Efface le cookie d'auth (côté navigateur ne saura plus qui il est).
//
// GET /api/auth/me — renvoie le user actuellement connecté.
//   Route protégée (passe par le middleware requireAuth).
//   Sert au frontend à savoir s'il est connecté et qui il est.

import type { FastifyInstance, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { signToken } from "../auth/jwt.js";
import { requireAuth } from "../auth/middleware.js";

interface SignupBody {
  email: string;
  username: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: SignupBody }>("/signup", async (request, reply) => {
    const { email, username, password } = request.body;

    // Validation basique des champs reçus.
    if (!email || !username || !password) {
      return reply.code(400).send({ error: "Missing fields" });
    }
    if (password.length < 8) {
      return reply.code(400).send({ error: "Password must be at least 8 chars" });
    }

    // Email et username doivent être uniques en base.
    const existingEmail = await db.select().from(users).where(eq(users.email, email));
    if (existingEmail.length > 0) {
      return reply.code(409).send({ error: "Email already in use" });
    }
    const existingUsername = await db.select().from(users).where(eq(users.username, username));
    if (existingUsername.length > 0) {
      return reply.code(409).send({ error: "Username already taken" });
    }

    // Hash le password puis insère le nouveau user.
    const hash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({ email, username, password: hash })
      .returning();

    // Connecte automatiquement le user en posant le cookie d'auth.
    setAuthCookie(reply, signToken({ userId: user.id }));

    // Renvoie les infos publiques (jamais le password).
    return reply.code(201).send({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  });

  app.post<{ Body: LoginBody }>("/login", async (request, reply) => {
    const { email, password } = request.body;

    // Validation basique.
    if (!email || !password) {
      return reply.code(400).send({ error: "Missing fields" });
    }

    // Cherche le user par email.
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !user.password) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    // Compare le password reçu avec le hash stocké.
    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    // Connecte le user : pose le cookie d'auth.
    setAuthCookie(reply, signToken({ userId: user.id }));

    return reply.send({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  });

  app.post("/logout", async (_request, reply) => {
    // Efface le cookie : le navigateur ne saura plus qui il est.
    reply.clearCookie("auth_token", { path: "/" });
    return reply.send({ message: "Logged out" });
  });

  app.get("/me", { preHandler: requireAuth }, async (request, reply) => {
    // À ce stade le middleware a déjà validé le JWT et posé request.userId.
    const userId = request.userId!;

    // Charge le user complet depuis la DB.
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return reply.code(404).send({ error: "User not found" });
    }

    // Renvoie les infos publiques (sans le password).
    return reply.send({
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
    });
  });
}

// Pose le cookie d'auth : HttpOnly + secure en prod, 7 jours.
function setAuthCookie(reply: FastifyReply, token: string) {
  reply.setCookie("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 jours en secondes
  });
}

// Routes d'authentification : 6 endpoints appelés par le frontend.
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
//
// GET /api/auth/42 — démarre le flow OAuth 42.
//   Redirige le user vers la page de login de 42.
//
// GET /api/auth/42/callback — fin du flow OAuth 42.
//   42 nous redirige ici avec un ?code=. On échange le code contre les infos du user,
//   on crée/retrouve l'user en DB, on pose le cookie JWT, on redirige vers le front.

import type { FastifyInstance, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { signToken, verifyToken } from "../auth/jwt.js";
import { requireAuth } from "../auth/middleware.js";
import {
  getAuthorizationUrl,
  exchangeCode,
  getUserInfo,
} from "../auth/oauth42.js";

interface SignupBody {
  email: string;
  username: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
}

/** Cookie name for the OAuth state token + intent. Path-scoped to the OAuth callback only. */
const OAUTH_STATE_COOKIE = "oauth42_state";
const OAUTH_STATE_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/auth/42",
  maxAge: 10 * 60, // 10 minutes — covers a slow OAuth round-trip with margin
};

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
    // Pour l'email : on renvoie un message volontairement vague ("Account
    // creation failed") plutôt que "Email already in use" — éviter la
    // énumération de comptes (un attaquant qui essaie 1000 emails ne doit pas
    // apprendre lesquels sont enregistrés). Le username, lui, reste explicite
    // car les usernames sont publics de toute façon (visibles sur les profils).
    const existingEmail = await db.select().from(users).where(eq(users.email, email));
    if (existingEmail.length > 0) {
      return reply.code(409).send({ error: "Account creation failed" });
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

  app.get<{ Querystring: { intent?: string } }>("/42", async (request, reply) => {
    // Determine intent: "signup" routes new accounts to /signup?step=3 after the
    // callback; default ("login") routes to /. Frontend's signup page passes
    // ?intent=signup; the regular Login link doesn't, so it defaults to login.
    const intent = request.query.intent === "signup" ? "signup" : "login";

    // CSRF protection: opaque state token included in the OAuth redirect URL.
    // 42's callback echoes it back; we verify it matches what we stored.
    const state = randomBytes(16).toString("hex");

    reply.setCookie(
      OAUTH_STATE_COOKIE,
      JSON.stringify({ state, intent }),
      OAUTH_STATE_COOKIE_OPTS,
    );

    return reply.redirect(getAuthorizationUrl(state));
  });

  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    "/42/callback",
    async (request, reply) => {
      const { code, state: returnedState, error } = request.query;

      // Si 42 nous renvoie une erreur ou pas de code, on stoppe.
      if (error || !code) {
        return reply.code(400).send({ error: error ?? "Missing code" });
      }

      // CSRF: verify the state token matches what we stored, and read the intent.
      const stateCookie = request.cookies?.[OAUTH_STATE_COOKIE];
      let intent: "signup" | "login" = "login";
      if (stateCookie) {
        try {
          const parsed = JSON.parse(stateCookie) as { state?: string; intent?: string };
          if (!parsed.state || parsed.state !== returnedState) {
            return reply.code(400).send({ error: "Invalid OAuth state" });
          }
          intent = parsed.intent === "signup" ? "signup" : "login";
        } catch {
          return reply.code(400).send({ error: "Malformed OAuth state cookie" });
        }
      }
      // Always clear the state cookie — single-use.
      reply.clearCookie(OAUTH_STATE_COOKIE, { path: OAUTH_STATE_COOKIE_OPTS.path });

      // Échange le code contre les infos du user 42.
      let oauth42User;
      try {
        const accessToken = await exchangeCode(code);
        oauth42User = await getUserInfo(accessToken);
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: "OAuth exchange failed" });
      }

      const oauth42IdStr = oauth42User.id.toString();
      const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:4321";

      // Account linking : si le user est déjà connecté, on lie son compte 42 à son
      // compte existant et on redirige vers le profil avec un message.
      const existingToken = request.cookies?.auth_token;
      if (existingToken) {
        try {
          const { userId } = verifyToken(existingToken);
          await db
            .update(users)
            .set({ oauth42Id: oauth42IdStr })
            .where(eq(users.id, userId));
          return reply.redirect(`${frontendUrl}/profile?linked=true`);
        } catch {
          // Token invalide → on ignore et on enchaîne sur le login normal.
        }
      }

      // Track whether we created a new user (relevant for the signup-mode redirect).
      let wasNewAccount = false;

      // Cherche d'abord par oauth_42_id (user déjà passé par 42).
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.oauth42Id, oauth42IdStr));

      // Sinon, cherche par email (user inscrit par email qui se connecte la 1re fois via 42).
      if (!user) {
        const [byEmail] = await db
          .select()
          .from(users)
          .where(eq(users.email, oauth42User.email));
        if (byEmail) {
          [user] = await db
            .update(users)
            .set({ oauth42Id: oauth42IdStr })
            .where(eq(users.id, byEmail.id))
            .returning();
        }
      }

      // Sinon, crée un nouveau user (compte OAuth-only, sans password).
      if (!user) {
        // Username = login 42 ; fallback si déjà pris.
        let username = oauth42User.login;
        const taken = await db
          .select()
          .from(users)
          .where(eq(users.username, username));
        if (taken.length > 0) {
          username = `${oauth42User.login}_42`;
        }

        [user] = await db
          .insert(users)
          .values({
            email: oauth42User.email,
            username,
            oauth42Id: oauth42IdStr,
            avatarUrl: oauth42User.image?.link ?? null,
            password: null, // pas de password pour les comptes OAuth-only
          })
          .returning();
        wasNewAccount = true;
      }

      // Connecte le user : pose le cookie JWT.
      setAuthCookie(reply, signToken({ userId: user.id }));

      // Redirect destination depends on intent + whether the user is new.
      // signup intent + new account → onboarding step 3 (skip credentials, OAuth provided them).
      // login intent OR existing account → home.
      const target =
        intent === "signup" && wasNewAccount
          ? `${frontendUrl}/signup?step=3`
          : `${frontendUrl}/`;
      return reply.redirect(target);
    }
  );
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

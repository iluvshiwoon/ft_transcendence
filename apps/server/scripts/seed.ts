// Script de seed : insère des données de test dans la base.
// À lancer avec : pnpm db:seed
// Le but : avoir des users, des parties, des amitiés, des notifs pour tester
// l'API sans avoir à créer manuellement chaque ligne en SQL.

import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "../src/db/client.js";
import {
  users,
  friendships,
  blockedUsers,
  games,
  moves,
  lobbies,
  chatMessages,
  notifications,
} from "../src/db/schema.js";

async function seed() {
  console.log("🌱 Seeding database...");

  // 1. On vide les tables. Comme ça on peut relancer le seed plusieurs fois
  //    sans erreur de doublon (email/username unique).
  //    Ordre important : on supprime d'abord les tables qui référencent
  //    les autres (FK), sinon PG râle.
  console.log("Clearing tables...");
  await db.delete(notifications);
  await db.delete(chatMessages);
  await db.delete(moves);
  await db.delete(games);
  await db.delete(lobbies);
  await db.delete(blockedUsers);
  await db.delete(friendships);
  await db.delete(users);

  // 2. Crée 4 users avec un mot de passe hashé.
  //    Tous ont le même mot de passe ("password123") pour faciliter les tests.
  //    bcrypt.hash(plain, 12) : 12 = nombre de rounds (plus = plus sûr mais plus lent)
  console.log("Creating users...");
  const password = await bcrypt.hash("password123", 12);

  const insertedUsers = await db
    .insert(users)
    .values([
      { email: "alice@42.fr",   username: "alice",   password, bio: "I love Connect 4" },
      { email: "bob@42.fr",     username: "bob",     password, bio: "Bob the builder" },
      { email: "charlie@42.fr", username: "charlie", password, status: "online" },
      { email: "diana@42.fr",   username: "diana",   password, status: "in_game" },
    ])
    .returning(); // .returning() = renvoie les lignes insérées (avec les IDs auto-générés)

  // On déstructure pour récupérer chaque user dans une variable nommée
  const [alice, bob, charlie, diana] = insertedUsers;

  // 3. Crée des amitiés.
  //    alice <-> bob : amis
  //    alice <-> charlie : amis
  //    bob -> diana : demande envoyée, en attente
  console.log("Creating friendships...");
  await db.insert(friendships).values([
    { userId: alice.id, friendId: bob.id,     status: "accepted" },
    { userId: alice.id, friendId: charlie.id, status: "accepted" },
    { userId: bob.id,   friendId: diana.id,   status: "pending" },
  ]);

  // 4. charlie a bloqué diana
  console.log("Creating block...");
  await db.insert(blockedUsers).values([
    { userId: charlie.id, blockedUserId: diana.id },
  ]);

  // 5. Crée une partie déjà finie : alice (J1) vs bob (J2), alice gagne.
  //    .returning() pour récupérer l'ID de la partie créée (utile pour les moves).
  console.log("Creating finished game...");
  const [game1] = await db
    .insert(games)
    .values([
      {
        player1Id: alice.id,
        player2Id: bob.id,
        winnerId: alice.id,
        status: "finished",
        mode: "connect4",
        timePerPlayerSeconds: 300,
        startedAt: new Date(Date.now() - 3600 * 1000), // il y a 1h
        finishedAt: new Date(),
      },
    ])
    .returning();

  // 6. Crée 4 coups pour cette partie (alice et bob jouent à tour de rôle).
  console.log("Creating moves...");
  await db.insert(moves).values([
    { gameId: game1.id, playerId: alice.id, column: 3, row: 0, moveNumber: 1 },
    { gameId: game1.id, playerId: bob.id,   column: 4, row: 0, moveNumber: 2 },
    { gameId: game1.id, playerId: alice.id, column: 3, row: 1, moveNumber: 3 },
    { gameId: game1.id, playerId: bob.id,   column: 4, row: 1, moveNumber: 4 },
  ]);

  // 7. Crée une partie en cours : charlie vs IA (medium).
  //    player2Id reste null, isAiOpponent = true.
  console.log("Creating AI game...");
  await db.insert(games).values([
    {
      player1Id: charlie.id,
      isAiOpponent: true,
      aiDifficulty: "medium",
      status: "in_progress",
      mode: "connect4",
      timePerPlayerSeconds: 600,
      startedAt: new Date(),
    },
  ]);

  // 8. Met à jour les stats : alice a gagné sa partie, bob l'a perdue.
  //    .update().set().where() = équivalent SQL UPDATE ... SET ... WHERE
  console.log("Updating user stats...");
  await db.update(users).set({ gamesPlayed: 1, gamesWon: 1 }).where(eq(users.id, alice.id));
  await db.update(users).set({ gamesPlayed: 1, gamesLost: 1 }).where(eq(users.id, bob.id));
  await db.update(users).set({ gamesPlayed: 1 }).where(eq(users.id, charlie.id));

  // 9. Crée un lobby ouvert : diana attend un joueur, code "ABC123".
  console.log("Creating lobby...");
  await db.insert(lobbies).values([
    {
      code: "ABC123",
      creatorId: diana.id,
      isPublic: true,
      mode: "connect4",
      timePerPlayerSeconds: 300,
      status: "waiting",
    },
  ]);

  // 10. Quelques messages entre alice et bob après leur partie.
  console.log("Creating chat messages...");
  await db.insert(chatMessages).values([
    { senderId: alice.id, receiverId: bob.id,   content: "GG !" },
    { senderId: bob.id,   receiverId: alice.id, content: "Bien joué" },
  ]);

  // 11. Notifications : diana a une demande d'ami non lue, bob a une notif lue.
  //     content est en JSON (jsonb) : structure libre selon le type de notif.
  console.log("Creating notifications...");
  await db.insert(notifications).values([
    {
      userId: diana.id,
      type: "friend_request",
      content: { from: { id: bob.id, username: "bob" } },
      read: false,
    },
    {
      userId: bob.id,
      type: "game_finished",
      content: { gameId: game1.id, result: "lost", opponent: "alice" },
      read: true,
    },
  ]);

  console.log("✅ Seed done!");
}

// Exécute le seed et gère les erreurs proprement.
// process.exit(0) à la fin pour fermer la connexion PG (sinon le script reste bloqué).
seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildServer } from "../../src/server.js";
import { db } from "../../src/db/client.js";
import { users } from "../../src/db/schema.js";
import { sql } from "drizzle-orm";

interface LeaderboardResponse {
  entries: Array<{
    rank: number;
    username: string;
    rating: number;
    peakRating: number;
    winRate: number;
    title: string;
  }>;
}

async function truncateUsers() {
  await db.execute(sql`TRUNCATE TABLE users RESTART IDENTITY CASCADE`);
}

async function insertUser(opts: {
  email: string;
  username: string;
  rating: number;
  peakRating: number;
  gamesPlayed?: number;
  gamesWon?: number;
  gamesLost?: number;
  gamesDrawn?: number;
  isDeleted?: boolean;
}) {
  await db.insert(users).values({
    email: opts.email,
    username: opts.username,
    rating: opts.rating,
    peakRating: opts.peakRating,
    gamesPlayed: opts.gamesPlayed ?? 0,
    gamesWon: opts.gamesWon ?? 0,
    gamesLost: opts.gamesLost ?? 0,
    gamesDrawn: opts.gamesDrawn ?? 0,
    isDeleted: opts.isDeleted ?? false,
  });
}

describe("GET /api/leaderboard", () => {
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeEach(async () => {
    await truncateUsers();
    app = await buildServer();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("returns an empty list when no users exist", async () => {
    const res = await app.inject({ method: "GET", url: "/api/leaderboard" });
    expect(res.statusCode).toBe(200);
    expect((res.json() as LeaderboardResponse).entries).toEqual([]);
  });

  it("sorts by rating DESC then peak_rating DESC then id ASC", async () => {
    // id 1: rating 1500, peak 1500
    // id 2: rating 1500, peak 1600  → ranked above id 1 (higher peak)
    // id 3: rating 1700             → ranked first
    // id 4: rating 1200             → ranked last
    await insertUser({ email: "a@a", username: "Alpha", rating: 1500, peakRating: 1500 });
    await insertUser({ email: "b@b", username: "Beta", rating: 1500, peakRating: 1600 });
    await insertUser({ email: "c@c", username: "Gamma", rating: 1700, peakRating: 1700 });
    await insertUser({ email: "d@d", username: "Delta", rating: 1200, peakRating: 1300 });

    const res = await app.inject({ method: "GET", url: "/api/leaderboard?limit=10" });
    expect(res.statusCode).toBe(200);
    const { entries } = res.json() as LeaderboardResponse;
    expect(entries.map((e) => e.username)).toEqual([
      "Gamma",
      "Beta",
      "Alpha",
      "Delta",
    ]);
    expect(entries.map((e) => e.rank)).toEqual([1, 2, 3, 4]);
  });

  it("excludes deleted users", async () => {
    await insertUser({ email: "a@a", username: "Alive", rating: 2000, peakRating: 2000 });
    await insertUser({
      email: "b@b",
      username: "Ghost",
      rating: 3000,
      peakRating: 3000,
      isDeleted: true,
    });

    const res = await app.inject({ method: "GET", url: "/api/leaderboard" });
    const { entries } = res.json() as LeaderboardResponse;
    expect(entries).toHaveLength(1);
    expect(entries[0].username).toBe("Alive");
  });

  it("honors the ?limit query parameter", async () => {
    for (let i = 0; i < 8; i++) {
      await insertUser({
        email: `u${i}@u`,
        username: `user${i}`,
        rating: 2000 - i,
        peakRating: 2000 - i,
      });
    }

    const res = await app.inject({ method: "GET", url: "/api/leaderboard?limit=3" });
    const { entries } = res.json() as LeaderboardResponse;
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.username)).toEqual(["user0", "user1", "user2"]);
  });

  it("uses the default limit of 6", async () => {
    for (let i = 0; i < 10; i++) {
      await insertUser({
        email: `u${i}@u`,
        username: `user${i}`,
        rating: 2000 - i,
        peakRating: 2000 - i,
      });
    }
    const res = await app.inject({ method: "GET", url: "/api/leaderboard" });
    const { entries } = res.json() as LeaderboardResponse;
    expect(entries).toHaveLength(6);
  });

  it("rejects limit < 1", async () => {
    const res = await app.inject({ method: "GET", url: "/api/leaderboard?limit=0" });
    expect(res.statusCode).toBe(400);
  });

  it("rejects limit > 50", async () => {
    const res = await app.inject({ method: "GET", url: "/api/leaderboard?limit=51" });
    expect(res.statusCode).toBe(400);
  });

  it("rejects non-integer limit", async () => {
    const res = await app.inject({ method: "GET", url: "/api/leaderboard?limit=abc" });
    expect(res.statusCode).toBe(400);
  });

  it("derives the title from the rating", async () => {
    await insertUser({ email: "a@a", username: "Newbie", rating: 950, peakRating: 950 });
    await insertUser({ email: "b@b", username: "Rookie", rating: 1100, peakRating: 1100 });
    await insertUser({ email: "c@c", username: "Pro", rating: 1500, peakRating: 1500 });
    await insertUser({ email: "d@d", username: "Veteran", rating: 1900, peakRating: 1900 });
    await insertUser({ email: "e@e", username: "Guru", rating: 2300, peakRating: 2300 });

    const res = await app.inject({ method: "GET", url: "/api/leaderboard" });
    const { entries } = res.json() as LeaderboardResponse;
    const byName = Object.fromEntries(entries.map((e) => [e.username, e.title]));
    expect(byName.Newbie).toBe("Beginner");
    expect(byName.Rookie).toBe("Apprentice");
    expect(byName.Pro).toBe("Expert");
    expect(byName.Veteran).toBe("Master");
    expect(byName.Guru).toBe("Grandmaster");
  });

  it("computes winRate as a 1-decimal percentage", async () => {
    await insertUser({
      email: "a@a",
      username: "HalfWin",
      rating: 1500,
      peakRating: 1500,
      gamesPlayed: 10,
      gamesWon: 5,
      gamesLost: 4,
      gamesDrawn: 1,
    });
    await insertUser({
      email: "b@b",
      username: "AllWin",
      rating: 1500,
      peakRating: 1500,
      gamesPlayed: 7,
      gamesWon: 7,
    });
    await insertUser({
      email: "c@c",
      username: "NoGames",
      rating: 1500,
      peakRating: 1500,
    });

    const res = await app.inject({ method: "GET", url: "/api/leaderboard" });
    const { entries } = res.json() as LeaderboardResponse;
    const byName = Object.fromEntries(entries.map((e) => [e.username, e.winRate]));
    expect(byName.HalfWin).toBe(50);
    expect(byName.AllWin).toBe(100);
    expect(byName.NoGames).toBe(0);
  });

  it("does not require auth (public endpoint)", async () => {
    // No cookie sent — leaderboard is anonymous.
    const res = await app.inject({ method: "GET", url: "/api/leaderboard" });
    expect(res.statusCode).toBe(200);
  });
});

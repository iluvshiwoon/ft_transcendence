/**
 * Leaderboard — right-column ranking list.
 *
 * 5 hardcoded entries matching the wireframe, with progressive opacity from
 * row 1 (full) to row 5 (40%). Below the 5 rows: a dashed-border slot in
 * Fraunces italic that says "your spot" — foreshadowing the post-game
 * conversion moment without committing the actual end-of-game UI yet.
 *
 * The mono → italic-serif typographic switch on the placeholder is deliberate:
 * the upright mono rows say "data"; the italic serif slot says "this is your
 * story (not a stat — yet)".
 *
 * TODO(integration):
 *   - Load real leaderboard from GET /api/leaderboard (backend route TBD; ask Tim).
 *   - When the user finishes their first game, compute their hypothetical rank
 *     and replace the dashed slot with an actual row containing their session
 *     username (or "you") + a CTA pill linking to /signup with the score in the URL.
 *   - Hook point: <GameDemo> island will dispatch a "game:finished" event with
 *     { result, score } payload; this component subscribes and animates the
 *     dashed slot into a real row.
 */

import { cn } from "~/lib/utils";

interface LeaderboardEntry {
  rank: number;
  username: string;
  rating: number;
  winRate: number;
}

export const MOCK_ENTRIES: LeaderboardEntry[] = [
  { rank: 1, username: "QuantumDrop", rating: 2854, winRate: 94.8 },
  { rank: 2, username: "Sarah_w", rating: 2710, winRate: 91.5 },
  { rank: 3, username: "BotSlayer99", rating: 2699, winRate: 89.0 },
  { rank: 4, username: "GridLock_", rating: 2569, winRate: 85.0 },
  { rank: 5, username: "A_connect", rating: 2349, winRate: 82.0 },
];

const ROW_OPACITY = ["opacity-100", "opacity-80", "opacity-60", "opacity-50", "opacity-40"];

interface LeaderboardProps {
  entries?: LeaderboardEntry[];
}

export function Leaderboard({ entries = MOCK_ENTRIES }: LeaderboardProps) {
  return (
    <section aria-labelledby="leaderboard-heading" className="flex w-full max-w-[220px] flex-col">
      <h2
        id="leaderboard-heading"
        className="mb-4 font-mono text-mono-sm uppercase text-muted-foreground"
      >
        Leaderboard
      </h2>

      <ol className="flex flex-col gap-3 font-mono text-mono-md">
        {entries.map((entry, i) => (
          <li
            key={entry.rank}
            className={cn(
              "flex items-center justify-between gap-3 border-b border-border pb-2 text-foreground",
              ROW_OPACITY[i] ?? "opacity-40",
            )}
          >
            <div className="flex min-w-0 gap-3">
              <span className="font-semibold tabular-nums">{entry.rank}.</span>
              <span className="truncate font-semibold">{entry.username}</span>
            </div>
            <div className="flex shrink-0 gap-3 font-semibold tabular-nums">
              <span>{entry.rating}</span>
              <span>{entry.winRate.toFixed(1)}%</span>
            </div>
          </li>
        ))}

        {/* Foreshadowed "your spot" — typographic switch from mono to italic serif. */}
        <li
          aria-label="Your future rank — sign up after a game to claim it"
          className={cn(
            "mt-2 flex items-center justify-between gap-3",
            "rounded-md border border-dashed border-border px-3 py-2",
            "font-display italic text-muted-foreground",
          )}
        >
          <span>your spot</span>
          <span aria-hidden="true">—</span>
        </li>
      </ol>
    </section>
  );
}

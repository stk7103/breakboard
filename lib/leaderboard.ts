import type { ScenarioStatus } from "@/lib/types";

/** Bug-hunter points. Dismissed and open scenarios score nothing. */
export const POINTS: Partial<Record<ScenarioStatus, number>> = {
  confirmed_bug: 100,
  submitted: 25,
};

export type LeaderboardEntry = {
  rank: number;
  name: string;
  points: number;
  confirmed: number;
  submitted: number;
};

/**
 * Deterministic leaderboard: points desc, then confirmed bugs desc, then name
 * (case-insensitive, then exact) asc. Names are trimmed; testers who typed the
 * same name with different casing are merged. Equal scores share a rank.
 */
export function computeLeaderboard(
  scenarios: { status: ScenarioStatus; tester_name: string | null }[],
): LeaderboardEntry[] {
  const byName = new Map<string, Omit<LeaderboardEntry, "rank">>();

  for (const s of scenarios) {
    const points = POINTS[s.status];
    const name = s.tester_name?.trim();
    if (!points || !name) continue;

    const key = name.toLowerCase();
    const entry = byName.get(key) ?? { name, points: 0, confirmed: 0, submitted: 0 };
    entry.points += points;
    if (s.status === "confirmed_bug") entry.confirmed += 1;
    else entry.submitted += 1;
    byName.set(key, entry);
  }

  const sorted = [...byName.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.confirmed - a.confirmed ||
      a.name.toLowerCase().localeCompare(b.name.toLowerCase(), "en") ||
      (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  );

  let rank = 0;
  return sorted.map((entry, i) => {
    const prev = sorted[i - 1];
    if (!prev || prev.points !== entry.points || prev.confirmed !== entry.confirmed) rank = i + 1;
    return { ...entry, rank };
  });
}

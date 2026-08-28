import { describe, it, expect } from "vitest";
import { rankLeaderboard } from "../domain/leaderboard";
import type { Player } from "@/shared/domain/types";

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: "p1",
    room_id: "r1",
    name: "Alice",
    horse_name: "Galloping Gary",
    score: 0,
    joined_at: "",
    ...overrides,
  };
}

describe("rankLeaderboard", () => {
  it("sorts by score descending and assigns 1-based ranks", () => {
    const entries = rankLeaderboard([
      player({ id: "a", score: 100 }),
      player({ id: "b", score: 300 }),
      player({ id: "c", score: 200 }),
    ]);
    expect(entries.map((e) => [e.player_id, e.rank])).toEqual([
      ["b", 1],
      ["c", 2],
      ["a", 3],
    ]);
  });

  it("does not mutate the input array", () => {
    const players = [player({ id: "a", score: 1 }), player({ id: "b", score: 2 })];
    rankLeaderboard(players);
    expect(players[0].id).toBe("a");
  });

  it("attaches avg time and correct count when maps are provided", () => {
    const [entry] = rankLeaderboard(
      [player({ id: "a", score: 100 })],
      { a: 4200 },
      { a: 3 }
    );
    expect(entry.avg_time_ms).toBe(4200);
    expect(entry.correct_count).toBe(3);
  });

  it("leaves avg/correct undefined when maps are absent", () => {
    const [entry] = rankLeaderboard([player({ id: "a", score: 100 })]);
    expect(entry.avg_time_ms).toBeUndefined();
    expect(entry.correct_count).toBeUndefined();
  });
});

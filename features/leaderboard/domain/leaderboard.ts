import type { Player, LeaderboardEntry } from "@/shared/domain/types";

/**
 * Rank players into leaderboard entries (highest score first, rank 1-based).
 * Optional per-player maps attach average answer time and correct counts for
 * the final results view. Pure — safe to call from render or effects.
 */
export function rankLeaderboard(
  players: Player[],
  avgTimeMap?: Record<string, number>,
  correctCountMap?: Record<string, number>
): LeaderboardEntry[] {
  return [...players]
    .sort((a, b) => b.score - a.score)
    .map((p, idx) => ({
      player_id: p.id,
      player_name: p.name,
      horse_name: p.horse_name,
      score: p.score,
      rank: idx + 1,
      avg_time_ms: avgTimeMap?.[p.id],
      correct_count: correctCountMap?.[p.id],
    }));
}

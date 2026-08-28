import type { LeaderboardEntry } from "@/shared/domain/types";

/**
 * Returns left% (0–85) based on score for normal mode.
 */
export function getTrackPosition(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.min((score / maxScore) * 85, 85);
}

/**
 * Simple deterministic hash of a string to a number.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

/**
 * True if in the last 3 questions of the quiz.
 */
export function isInSuspensePhase(
  questionNumber: number,
  totalQuestions: number
): boolean {
  return questionNumber > totalQuestions - 3;
}

/**
 * Alias for backwards compat.
 */
export function shouldEnableSuspense(
  currentQuestion: number,
  totalQuestions: number
): boolean {
  return isInSuspensePhase(currentQuestion, totalQuestions);
}

/**
 * Returns players in scrambled order with fake positions.
 * Deterministic per questionNumber so positions don't jump on re-render.
 * Sort by (score + hash(playerId + questionNumber)) to get consistent-but-fake positions.
 */
export function scramblePositions(
  players: LeaderboardEntry[],
  questionNumber?: number,
  totalQuestions?: number
): (LeaderboardEntry & { trackPosition: number })[] {
  const seed = questionNumber ?? 1;

  // Create scrambled order: sort by score + deterministic hash offset
  const withHash = players.map((p) => ({
    ...p,
    sortKey: p.score + (hashString(p.player_id + String(seed)) % 5000),
  }));

  // Sort by the scrambled key
  const scrambled = [...withHash].sort((a, b) => b.sortKey - a.sortKey);

  // Assign track positions spread across the track
  return scrambled.map((p, i) => {
    const base = 30 + ((i * 45) / Math.max(scrambled.length - 1, 1));
    // Use hash for deterministic jitter
    const jitter = (hashString(p.player_id + "jitter" + String(seed)) % 15) - 7;
    const trackPosition = Math.max(5, Math.min(80, base + jitter));
    return {
      player_id: p.player_id,
      player_name: p.player_name,
      horse_name: p.horse_name,
      score: p.score,
      rank: p.rank,
      trackPosition,
    };
  });
}

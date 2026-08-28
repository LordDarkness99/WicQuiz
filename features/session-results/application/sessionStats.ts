import type { QuestionStat } from "../data/sessionResultsRepository";

/** Average answer time per player over their correct answers. */
export function computeAvgTimeMap(
  correctAnswers: { player_id: string; time_taken_ms: number }[]
): Record<string, number> {
  const grouped: Record<string, number[]> = {};
  for (const a of correctAnswers) {
    if (!grouped[a.player_id]) grouped[a.player_id] = [];
    grouped[a.player_id].push(a.time_taken_ms);
  }
  const map: Record<string, number> = {};
  for (const [pid, times] of Object.entries(grouped)) {
    map[pid] = Math.round(times.reduce((s, t) => s + t, 0) / times.length);
  }
  return map;
}

/** Count of correct answers per player. */
export function computeCorrectCountMap(
  answers: { player_id: string; is_correct: boolean }[]
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const a of answers) {
    if (a.is_correct) {
      map[a.player_id] = (map[a.player_id] || 0) + 1;
    }
  }
  return map;
}

/** Aggregate stats for a single question from its answers. */
export function buildQuestionStat(
  questionId: string,
  text: string,
  answers: { is_correct: boolean; time_taken_ms: number }[]
): QuestionStat {
  const total = answers.length;
  const correctCount = answers.filter((a) => a.is_correct).length;
  const avgTimeMs =
    total > 0
      ? Math.round(answers.reduce((sum, a) => sum + a.time_taken_ms, 0) / total)
      : 0;
  return { questionId, text, totalAnswers: total, correctCount, avgTimeMs };
}

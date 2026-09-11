const READING_GRACE_MS = 1000; // First 1s is free — no score decay

/**
 * Calculate points for a standard correct answer with time decay.
 * points = Math.round(1000 * (timeRemaining / timeLimit))
 * First 1 second is a grace period — scoring starts after that.
 */
export function calculateTimeDecayPoints(
  timeRemainingMs: number,
  timeLimitMs: number,
  pointsBase: number = 1000
): number {
  const minPoints = Math.round(pointsBase * 0.25);
  if (timeRemainingMs <= 0) return minPoints;
  // Treat first second as grace — shift time remaining up by grace amount
  const adjustedRemaining = Math.min(timeRemainingMs + READING_GRACE_MS, timeLimitMs);
  const ratio = Math.min(adjustedRemaining / timeLimitMs, 1);
  return Math.max(minPoints, Math.round(pointsBase * ratio));
}

/**
 * Apply joker multiplier (2x) to points.
 */
export function applyJokerMultiplier(
  points: number,
  isJoker: boolean
): number {
  return isJoker ? points * 2 : points;
}

/**
 * Calculate points for a slider question based on proximity.
 * The closest answer gets full points; others are scaled by how close they are.
 */
export function calculateSliderPoints(
  playerAnswer: number,
  correctAnswer: number,
  sliderMin: number,
  sliderMax: number,
  timeRemainingMs: number,
  timeLimitMs: number,
  pointsBase: number = 1000
): number {
  const range = sliderMax - sliderMin;
  if (range === 0) return pointsBase;

  const distance = Math.abs(playerAnswer - correctAnswer);
  const proximity = Math.max(0, 1 - distance / range);

  // Apply proximity and time decay
  const timeRatio = Math.min(timeRemainingMs / timeLimitMs, 1);
  return Math.round(pointsBase * proximity * timeRatio);
}

/**
 * Calculate points for a type_in question.
 * Exact match (case-insensitive) gets full time-decay points.
 * Host can override via manual marking.
 */
export function calculateTypeInPoints(
  playerAnswer: string,
  correctAnswer: string,
  timeRemainingMs: number,
  timeLimitMs: number,
  pointsBase: number = 1000
): { points: number; isCorrect: boolean } {
  const isCorrect =
    playerAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
  if (!isCorrect) return { points: 0, isCorrect: false };
  const rawPoints = calculateTimeDecayPoints(timeRemainingMs, timeLimitMs, pointsBase);
  const minPoints = Math.round(pointsBase * 0.25);
  return {
    points: Math.max(minPoints, rawPoints),
    isCorrect: true,
  };
}

/**
 * Score a standard question (multiple_choice, true_false, image_question).
 * Resilient to option text vs option index matching, and guarantees minimum points for any correct answer.
 */
export function scoreStandardQuestion(
  playerAnswer: string,
  correctAnswer: string,
  timeRemainingMs: number,
  timeLimitMs: number,
  isJoker: boolean,
  pointsBase: number = 1000,
  options?: string[] | null
): { points: number; isCorrect: boolean } {
  const pNorm = playerAnswer.trim().toLowerCase();
  const cNorm = correctAnswer.trim().toLowerCase();

  let isCorrect = pNorm === cNorm;

  // If not direct match, check options array if provided
  if (!isCorrect && options && options.length > 0) {
    const cIdx = parseInt(correctAnswer, 10);
    if (!isNaN(cIdx) && options[cIdx]) {
      isCorrect = pNorm === options[cIdx].trim().toLowerCase();
    }
    const pIdx = parseInt(playerAnswer, 10);
    if (!isNaN(pIdx) && options[pIdx]) {
      isCorrect = options[pIdx].trim().toLowerCase() === cNorm;
    }
    const labels = ["a", "b", "c", "d"];
    const pLabelIdx = labels.indexOf(pNorm);
    if (pLabelIdx !== -1 && options[pLabelIdx]) {
      isCorrect = options[pLabelIdx].trim().toLowerCase() === cNorm;
    }
    const cLabelIdx = labels.indexOf(cNorm);
    if (cLabelIdx !== -1 && options[cLabelIdx]) {
      isCorrect = options[cLabelIdx].trim().toLowerCase() === pNorm;
    }
  }

  if (!isCorrect) return { points: 0, isCorrect: false };

  const rawDecay = calculateTimeDecayPoints(
    timeRemainingMs,
    timeLimitMs,
    pointsBase
  );
  // Guarantee a minimum of 25% base points for any correct answer (never 0 points!)
  const minPoints = Math.round(pointsBase * 0.25);
  const basePoints = Math.max(minPoints, rawDecay);

  return {
    points: applyJokerMultiplier(basePoints, isJoker),
    isCorrect: true,
  };
}

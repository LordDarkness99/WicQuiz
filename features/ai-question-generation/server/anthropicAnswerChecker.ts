import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export type CheckAnswerOutcome =
  | { ok: true; isCorrect: boolean }
  | { ok: false; status: number; error: string };

/**
 * Ask Claude to judge whether a free-typed ("type_in") answer should count
 * as correct against the host's expected answer — catching typos, synonyms,
 * partial phrasing, etc. that a strict string match would wrongly reject.
 * Used as a fallback only when the exact-match check already failed.
 */
export async function checkTypeInAnswer(
  questionText: unknown,
  correctAnswer: unknown,
  playerAnswer: unknown
): Promise<CheckAnswerOutcome> {
  if (
    typeof questionText !== "string" ||
    typeof correctAnswer !== "string" ||
    typeof playerAnswer !== "string"
  ) {
    return { ok: false, status: 400, error: "questionText, correctAnswer, and playerAnswer must be strings" };
  }

  const q = questionText.trim().slice(0, 500);
  const correct = correctAnswer.trim().slice(0, 200);
  const given = playerAnswer.trim().slice(0, 200);

  if (!given) {
    return { ok: true, isCorrect: false };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, status: 503, error: "AI answer checking is not configured" };
  }

  const prompt = `You are grading a short typed-in answer for a quiz game.
Question: ${q}
Expected answer: ${correct}
Player's answer: ${given}

Decide if the player's answer should count as correct — allow for minor typos, alternate spelling, capitalization, extra words, or a clearly-equivalent phrasing/synonym. Do NOT accept answers that are actually wrong or unrelated.
Respond with JSON only: { "isCorrect": true | false }`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 50,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const parsed = JSON.parse(text);
    return { ok: true, isCorrect: parsed.isCorrect === true };
  } catch {
    return { ok: false, status: 502, error: "Failed to parse AI response" };
  }
}

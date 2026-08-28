import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const VALID_QUESTION_TYPES = ["multiple_choice", "true_false"] as const;
export type AiQuestionType = (typeof VALID_QUESTION_TYPES)[number];

export type GenerateQuestionOutcome =
  | { ok: true; question: unknown }
  | { ok: false; status: number; error: string };

/**
 * Validate input, prompt Claude, and parse the JSON question.
 * Returns a discriminated outcome so the route maps it to an HTTP status
 * without owning any AI logic.
 */
export async function generateQuestion(
  topic: unknown,
  questionType: unknown
): Promise<GenerateQuestionOutcome> {
  const sanitizedType: AiQuestionType = VALID_QUESTION_TYPES.includes(
    questionType as AiQuestionType
  )
    ? (questionType as AiQuestionType)
    : "multiple_choice";

  if (topic !== undefined && typeof topic !== "string") {
    return { ok: false, status: 400, error: "topic must be a string" };
  }

  const sanitizedTopic =
    typeof topic === "string" ? topic.trim().slice(0, 200) : "";

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      status: 503,
      error: "AI question generation is not configured",
    };
  }

  const prompt =
    sanitizedType === "true_false"
      ? `Generate a true/false pub quiz question about: ${sanitizedTopic || "any interesting topic"}.
       Respond with JSON only: { "question": "...", "correctAnswer": "true" | "false", "explanation": "brief explanation" }`
      : `Generate a multiple choice pub quiz question about: ${sanitizedTopic || "any interesting topic"}.
       Make it fun and suitable for a team meeting. Not too easy, not too hard.
       Respond with JSON only: { "question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "brief explanation" }`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  try {
    return { ok: true, question: JSON.parse(text) };
  } catch {
    return { ok: false, status: 502, error: "Failed to parse AI response" };
  }
}

export type CheckAnswerOutcome =
  | { ok: true; isCorrect: boolean }
  | { ok: false; status: number; error: string };

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

async function callGeminiApi(
  apiKey: string,
  model: string,
  prompt: string
): Promise<{ ok: true; text: string } | { ok: false; error: string; status: number }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: 100,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    return {
      ok: false,
      status: response.status,
      error: `Gemini API error (${response.status}): ${errorText}`,
    };
  }

  const data = (await response.json()) as GeminiGenerateResponse;
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    return {
      ok: false,
      status: 502,
      error: "Empty response from Gemini API",
    };
  }

  return { ok: true, text: rawText };
}

/**
 * Ask Gemini Flash Lite to judge whether a free-typed ("type_in") answer should count
 * as correct against the expected answer — allowing for typos, synonyms, case, etc.
 * Uses dual API key fallback.
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
    return {
      ok: false,
      status: 400,
      error: "questionText, correctAnswer, and playerAnswer must be strings",
    };
  }

  const q = questionText.trim().slice(0, 500);
  const correct = correctAnswer.trim().slice(0, 200);
  const given = playerAnswer.trim().slice(0, 200);

  if (!given) {
    return { ok: true, isCorrect: false };
  }

  // Exact match fast-path
  if (given.toLowerCase() === correct.toLowerCase()) {
    return { ok: true, isCorrect: true };
  }

  const primaryKey =
    process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY || "";
  const backupKey =
    process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_BACKUP || "";
  const model = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

  if (!primaryKey && !backupKey) {
    return {
      ok: false,
      status: 503,
      error: "AI answer checking is not configured (missing Gemini API key)",
    };
  }

  const prompt = `You are grading a short typed-in answer for a quiz game.
Question: "${q}"
Expected answer: "${correct}"
Player's submitted answer: "${given}"

Decide if the player's answer should count as correct.
Allow for minor spelling typos, capitalization differences, singular/plural, or clearly equivalent synonyms.
Reject if the answer is factually wrong, unrelated, or a different concept.

Respond ONLY with valid JSON:
{ "isCorrect": true } or { "isCorrect": false }`;

  let activeKey = primaryKey || backupKey;
  let result = await callGeminiApi(activeKey, model, prompt);

  if (!result.ok && primaryKey && backupKey && activeKey === primaryKey) {
    activeKey = backupKey;
    result = await callGeminiApi(activeKey, model, prompt);
  }

  if (!result.ok) {
    return { ok: false, status: result.status, error: result.error };
  }

  try {
    const parsed = JSON.parse(result.text);
    return { ok: true, isCorrect: parsed.isCorrect === true };
  } catch {
    return { ok: false, status: 502, error: "Failed to parse AI response" };
  }
}

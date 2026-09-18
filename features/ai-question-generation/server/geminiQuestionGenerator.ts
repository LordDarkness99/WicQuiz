const VALID_QUESTION_TYPES = ["multiple_choice", "true_false", "type_in"] as const;
export type AiQuestionType = (typeof VALID_QUESTION_TYPES)[number];

export type GenerateQuestionOutcome =
  | { ok: true; question: unknown }
  | { ok: false; status: number; error: string };

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
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
        temperature: 0.7,
        maxOutputTokens: 1000,
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
      error: "Empty response received from Gemini API",
    };
  }

  return { ok: true, text: rawText };
}

function buildPrompt(questionType: AiQuestionType, topic: string): string {
  const topicDescription = topic
    ? `Topic / Subject: "${topic}". Make sure the question strictly matches this topic.`
    : "Topic: Fun, interesting, and engaging general knowledge / pub quiz trivia suitable for all players.";

  if (questionType === "true_false") {
    return `You are a fun and professional quiz master for WicQuiz.
${topicDescription}
Generate a single True/False question.
Language instruction: Match the language of the topic provided (if the topic is in Indonesian or mentions Indonesian culture, write in Indonesian; otherwise English).

Respond ONLY with valid JSON matching this schema:
{
  "question": "The statement to evaluate as true or false",
  "correctAnswer": "true" or "false",
  "explanation": "A brief, 1-2 sentence explanation of why it is true or false"
}`;
  }

  if (questionType === "type_in") {
    return `You are a fun and professional quiz master for WicQuiz.
${topicDescription}
Generate a single Type-in (short answer / isian singkat) question where players must type the answer.
The answer must be concise, objective, unambiguous, and typically 1 to 3 words (e.g. a country name, person's name, number, or landmark).
Language instruction: Match the language of the topic provided (if the topic is in Indonesian or mentions Indonesian culture, write in Indonesian; otherwise English).

Respond ONLY with valid JSON matching this schema:
{
  "question": "The question prompt asking for a short specific answer",
  "correctAnswer": "The concise expected answer (1-3 words)",
  "explanation": "A brief, 1-2 sentence interesting fact or context about the answer"
}`;
  }

  // Default: multiple_choice
  return `You are a fun and professional quiz master for WicQuiz.
${topicDescription}
Generate a single Multiple Choice question with exactly 4 options.
Make it fun and suitable for a lively live quiz. Ensure exactly one option is correct and the other 3 are plausible distractors.
Language instruction: Match the language of the topic provided (if the topic is in Indonesian or mentions Indonesian culture, write in Indonesian; otherwise English).

Respond ONLY with valid JSON matching this schema:
{
  "question": "The multiple choice question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0,
  "explanation": "A brief, 1-2 sentence explanation of the correct answer"
}`;
}

/**
 * Validate input, query Gemini Flash Lite (with dual API key failover),
 * and parse the JSON question.
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

  // Dual API key fallback
  const primaryKey =
    process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY || "";
  const backupKey =
    process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_BACKUP || "";
  const model = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

  if (!primaryKey && !backupKey) {
    return {
      ok: false,
      status: 503,
      error:
        "Gemini API key is not configured. Please set GEMINI_API_KEY_1 in .env",
    };
  }

  const prompt = buildPrompt(sanitizedType, sanitizedTopic);

  // Attempt 1: Primary API key
  let activeKey = primaryKey || backupKey;
  let result = await callGeminiApi(activeKey, model, prompt);

  // If primary fails and backup is available, attempt failover
  if (!result.ok && primaryKey && backupKey && activeKey === primaryKey) {
    console.warn(
      `[Gemini AI] Primary API key failed (${result.error}). Attempting backup API key...`
    );
    activeKey = backupKey;
    result = await callGeminiApi(activeKey, model, prompt);
  }

  if (!result.ok) {
    console.error("[Gemini AI] Generation failed on all keys:", result.error);
    return {
      ok: false,
      status: result.status,
      error: "Could not generate question with Gemini AI. Please check your API key or quota.",
    };
  }

  try {
    const parsed = JSON.parse(result.text);
    return { ok: true, question: parsed };
  } catch (err) {
    console.error("[Gemini AI] Failed to parse response text as JSON:", result.text, err);
    return { ok: false, status: 502, error: "Failed to parse AI response JSON." };
  }
}

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateQuestion } from "../server/geminiQuestionGenerator";

describe("generateQuestion", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 503 if no API keys are configured", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY_1;
    delete process.env.GEMINI_API_KEY_2;
    delete process.env.GEMINI_API_KEY_BACKUP;

    const result = await generateQuestion("Geography", "multiple_choice");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
      expect(result.error).toContain("Gemini API key is not configured");
    }
  });

  it("returns 400 if topic is not a string", async () => {
    process.env.GEMINI_API_KEY_1 = "fake-key-1";

    const result = await generateQuestion(12345, "multiple_choice");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toContain("topic must be a string");
    }
  });

  it("successfully parses multiple_choice question from Gemini response", async () => {
    process.env.GEMINI_API_KEY_1 = "fake-key-1";

    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  question: "What is the capital of France?",
                  options: ["Paris", "Rome", "Berlin", "Madrid"],
                  correctIndex: 0,
                  explanation: "Paris is the capital.",
                }),
              },
            ],
          },
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as unknown as Response);

    const result = await generateQuestion("France", "multiple_choice");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.question).toMatchObject({
        question: "What is the capital of France?",
        correctIndex: 0,
      });
    }
  });

  it("fails over to GEMINI_API_KEY_2 when GEMINI_API_KEY_1 returns error", async () => {
    process.env.GEMINI_API_KEY_1 = "key-primary";
    process.env.GEMINI_API_KEY_2 = "key-backup";

    const mockPrimaryFailure = {
      ok: false,
      status: 429,
      text: async () => "Quota exceeded",
    } as unknown as Response;

    const mockBackupSuccess = {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    question: "What is the largest planet?",
                    correctAnswer: "Jupiter",
                    explanation: "Jupiter is the largest planet in our solar system.",
                  }),
                },
              ],
            },
          },
        ],
      }),
    } as unknown as Response;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockPrimaryFailure)
      .mockResolvedValueOnce(mockBackupSuccess);

    globalThis.fetch = fetchMock;

    const result = await generateQuestion("Astronomy", "type_in");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // First call uses key-primary
    expect(fetchMock.mock.calls[0][0]).toContain("key-primary");
    // Second call uses key-backup
    expect(fetchMock.mock.calls[1][0]).toContain("key-backup");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.question).toMatchObject({
        question: "What is the largest planet?",
        correctAnswer: "Jupiter",
      });
    }
  });
});

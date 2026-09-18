import { NextRequest, NextResponse } from "next/server";
import { checkTypeInAnswer } from "@/features/ai-question-generation";

export async function POST(req: NextRequest) {
  try {
    let body: { questionText?: unknown; correctAnswer?: unknown; playerAnswer?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = await checkTypeInAnswer(
      body.questionText,
      body.correctAnswer,
      body.playerAnswer
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ isCorrect: result.isCorrect });
  } catch (err) {
    console.error("[check-answer] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to check answer." },
      { status: 500 }
    );
  }
}

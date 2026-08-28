import { NextRequest, NextResponse } from "next/server";
import { generateQuestion } from "@/features/ai-question-generation";

export async function POST(req: NextRequest) {
  try {
    let body: { topic?: unknown; questionType?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = await generateQuestion(body.topic, body.questionType);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.question);
  } catch (err) {
    console.error("[generate-question] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to generate question. Please try again." },
      { status: 500 }
    );
  }
}

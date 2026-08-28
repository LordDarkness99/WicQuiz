"use client";

import { useState } from "react";
import type { QuestionType } from "@/shared/domain/types";

interface GeneratedQuestion {
  question: string;
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string;
  explanation?: string;
}

interface AIGenerateButtonProps {
  onGenerate: (data: GeneratedQuestion) => void;
  questionType: QuestionType;
}

export default function AIGenerateButton({
  onGenerate,
  questionType,
}: AIGenerateButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, questionType }),
      });
      if (!res.ok) throw new Error("Failed to generate question");
      const data = await res.json();
      onGenerate(data);
      setExpanded(false);
      setTopic("");
    } catch {
      setError("Could not generate question. Check your API key.");
    } finally {
      setLoading(false);
    }
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
        style={{ backgroundColor: "#8594CD", color: "white" }}
      >
        <span className="text-base">✨</span>
        Generate with AI
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Topic (optional): e.g. Geography, 90s movies, GSFS..."
        className="flex-1 min-w-[200px] bg-surface-container-low border-none rounded-xl px-4 py-2 text-sm font-bold text-primary placeholder:text-outline focus:ring-2 focus:ring-primary-container focus:outline-none"
        disabled={loading}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleGenerate();
        }}
      />
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
        style={{ backgroundColor: "#8594CD" }}
      >
        {loading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <span className="text-base">✨</span>
            Generate
          </>
        )}
      </button>
      <button
        type="button"
        onClick={() => {
          setExpanded(false);
          setError("");
        }}
        className="text-outline hover:text-primary text-sm font-bold transition-colors"
      >
        Cancel
      </button>
      {error && (
        <span className="text-sm font-bold w-full" style={{ color: "#E07A5F" }}>
          {error}
        </span>
      )}
    </div>
  );
}

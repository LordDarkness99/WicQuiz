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
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate question");
      }
      onGenerate(data);
      setExpanded(false);
      setTopic("");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not generate question. Check your API key."
      );
    } finally {
      setLoading(false);
    }
  }

  const placeholderText =
    questionType === "type_in"
      ? "Topic (optional): e.g., Capitals, Historical Figures, Planet Names..."
      : questionType === "true_false"
        ? "Topic (optional): e.g., Science Myths, Animal Facts, Geography..."
        : "Topic (optional): for example, History of the '90s, Movies, Pop Culture...";

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 shadow-sm"
        style={{ backgroundColor: "#8594CD", color: "white" }}
      >
        <span className="text-base">✨</span>
        Generate with AI
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap w-full bg-surface-container-lowest/60 p-3 rounded-2xl border border-outline-variant/10 shadow-sm">
      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder={placeholderText}
        className="flex-1 min-w-[220px] bg-surface-container-low border-none rounded-xl px-4 py-2 text-sm font-bold text-primary placeholder:text-outline focus:ring-2 focus:ring-primary-container focus:outline-none"
        disabled={loading}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleGenerate();
        }}
      />
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 disabled:opacity-60 disabled:hover:scale-100 shrink-0"
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
        className="text-outline hover:text-primary text-sm font-bold transition-colors px-2"
      >
        Cancel
      </button>
      {error && (
        <span className="text-xs font-bold w-full mt-1 text-red-500 flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">error</span>
          {error}
        </span>
      )}
    </div>
  );
}

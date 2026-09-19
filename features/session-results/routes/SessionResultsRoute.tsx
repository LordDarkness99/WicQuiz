"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  getSessionResult,
  type SessionResult,
  type QuestionStat,
} from "@/features/session-results";
import type { LeaderboardEntry } from "@/shared/domain/types";

export default function SessionResultsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [result, setResult] = useState<SessionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getSessionResult(sessionId);
        setResult(data);
      } catch {
        setError("Session not found.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  const handleDownload = () => {
    if (!result) return;

    const leaderboard = (result.final_leaderboard || []) as LeaderboardEntry[];
    const stats = (result.question_stats || []) as QuestionStat[];

    let text = `QuizTime Results: ${result.title}\n`;
    text += `Date: ${result.finished_at ? new Date(result.finished_at).toLocaleString() : "N/A"}\n`;
    text += `Players: ${result.player_count} | Questions: ${result.question_count}\n`;
    text += `${"=".repeat(50)}\n\n`;

    text += "FINAL LEADERBOARD\n";
    text += `${"-".repeat(30)}\n`;
    leaderboard.forEach((entry) => {
      text += `${entry.rank}. ${entry.player_name} — ${entry.score} pts\n`;
    });

    if (stats.length > 0) {
      text += `\nQUESTION BREAKDOWN\n`;
      text += `${"-".repeat(30)}\n`;
      stats.forEach((s, i) => {
        const pct =
          s.totalAnswers > 0
            ? Math.round((s.correctCount / s.totalAnswers) * 100)
            : 0;
        text += `Q${i + 1}: ${s.text}\n`;
        text += `    ${s.correctCount}/${s.totalAnswers} correct (${pct}%) | Avg time: ${(s.avgTimeMs / 1000).toFixed(1)}s\n\n`;
      });
    }

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quiztime-${result.title.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <motion.div
          className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">
            {error || "Session not found"}
          </h1>
          <button
            onClick={() => router.push("/host/dashboard")}
            className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const leaderboard = (result.final_leaderboard || []) as LeaderboardEntry[];
  const stats = (result.question_stats || []) as QuestionStat[];
  const hardestQuestion =
    stats.length > 0
      ? stats.reduce((hardest, s) => {
          const pct =
            s.totalAnswers > 0 ? s.correctCount / s.totalAnswers : 1;
          const hardestPct =
            hardest.totalAnswers > 0
              ? hardest.correctCount / hardest.totalAnswers
              : 1;
          return pct < hardestPct ? s : hardest;
        })
      : null;

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Header */}
      <header className="bg-surface-bright border-b border-outline-variant/30 px-4 sm:px-8 py-4 flex flex-wrap gap-3 justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3 sm:gap-6 min-w-[200px]">
          <button
            onClick={() => router.push("/host/dashboard")}
            className="flex items-center gap-1.5 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">
              arrow_back
            </span>
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <div className="h-6 w-px bg-outline-variant/40" />
          <span className="text-sm font-extrabold text-on-surface truncate max-w-[150px] sm:max-w-[300px]">{result.title}</span>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 px-4 py-2 w-full sm:w-auto bg-surface-container-high rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer border border-outline-variant/30"
        >
          <span className="material-symbols-outlined text-[18px]">
            download
          </span>
          Download Results
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        {/* Session info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="tactical-card bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 text-center">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface-variant mb-1">
              Players
            </p>
            <p className="text-2xl font-black text-on-surface">
              {result.player_count}
            </p>
          </div>
          <div className="tactical-card bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 text-center">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface-variant mb-1">
              Questions
            </p>
            <p className="text-2xl font-black text-on-surface">
              {result.question_count}
            </p>
          </div>
          <div className="tactical-card bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 text-center">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface-variant mb-1">
              Date
            </p>
            <p className="text-lg font-extrabold text-on-surface">
              {result.finished_at
                ? new Date(result.finished_at).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "N/A"}
            </p>
          </div>
        </div>

        {/* Final Leaderboard */}
        <h2 className="text-xl font-extrabold text-on-surface mb-4">
          Final Leaderboard
        </h2>
        <div className="space-y-3 mb-10">
          {leaderboard.map((entry, idx) => (
            <motion.div
              key={entry.player_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.06 }}
              className={`flex items-center gap-4 rounded-2xl p-4 border ${
                idx === 0
                  ? "bg-[#B88B4A]/15 border-[#B88B4A]/40 shadow-xs"
                  : idx < 3
                  ? "bg-[#B88B4A]/8 border-[#B88B4A]/25"
                  : "bg-surface-container-lowest border-outline-variant/30"
              }`}
            >
              <span
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base ${
                  idx === 0
                    ? "bg-[#B88B4A] text-[#0D1722]"
                    : idx === 1
                    ? "bg-[#D4A76A] text-[#0D1722]"
                    : idx === 2
                    ? "bg-surface-container-highest text-on-surface"
                    : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {entry.rank}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-on-surface font-extrabold truncate">
                  {entry.player_name}
                </p>
                {entry.horse_name && (
                  <p className="text-on-surface-variant text-xs truncate">
                    {entry.horse_name}
                  </p>
                )}
              </div>
              <span className="text-on-surface font-mono font-black text-xl">
                {entry.score}
              </span>
            </motion.div>
          ))}
          {leaderboard.length === 0 && (
            <p className="text-on-surface-variant text-center py-8 text-sm">
              No leaderboard data available.
            </p>
          )}
        </div>

        {/* Per-Question Breakdown */}
        {stats.length > 0 && (
          <>
            <h2 className="text-xl font-extrabold text-on-surface mb-4">
              Question Breakdown
            </h2>
            <div className="space-y-3 mb-10">
              {stats.map((s, i) => {
                const pct =
                  s.totalAnswers > 0
                    ? Math.round((s.correctCount / s.totalAnswers) * 100)
                    : 0;
                const isHardest = hardestQuestion && s.questionId === hardestQuestion.questionId;
                return (
                  <motion.div
                    key={s.questionId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`tactical-card rounded-2xl p-5 border ${
                      isHardest
                        ? "bg-error/8 border-error/30"
                        : "bg-surface-container-lowest border-outline-variant/30"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                            Q{i + 1}
                          </span>
                          {isHardest && (
                            <span className="text-[10px] font-bold bg-error/15 text-error px-2 py-0.5 rounded-full border border-error/30">
                              Hardest
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-on-surface mt-1 text-sm sm:text-base">
                          {s.text}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface-variant">
                          Correct
                        </p>
                        <p className="text-lg font-black text-on-surface">
                          {pct}%
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {s.correctCount}/{s.totalAnswers}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface-variant">
                          Avg Time
                        </p>
                        <p className="text-lg font-black text-on-surface">
                          {(s.avgTimeMs / 1000).toFixed(1)}s
                        </p>
                      </div>
                      <div>
                        {/* Correctness bar */}
                        <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                          Distribution
                        </p>
                        <div className="h-3 bg-surface-container-high rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isHardest ? "bg-error" : "bg-emerald-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

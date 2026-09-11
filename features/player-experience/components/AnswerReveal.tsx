"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";

interface AnswerRevealProps {
  isCorrect: boolean;
  pointsEarned: number;
  correctAnswer: string;
  timeTakenMs: number;
  totalScore: number;
  playerRank: number | null;
  isJoker: boolean;
  questionNumber: number;
  totalQuestions: number;
  options?: string[];
  answerDistribution?: { answer_value: string; count: number }[];
  playerAnswer?: string | null;
}

export default function AnswerReveal({
  isCorrect,
  pointsEarned,
  correctAnswer,
  timeTakenMs,
  totalScore,
  playerRank,
  isJoker,
  questionNumber,
  totalQuestions,
  options,
  answerDistribution,
  playerAnswer,
}: AnswerRevealProps) {
  const [displayPoints, setDisplayPoints] = useState(0);
  const [showNextMessage, setShowNextMessage] = useState(false);
  const reduced = useReducedMotion();

  const timeTakenSeconds = (timeTakenMs / 1000).toFixed(1);

  useEffect(() => {
    if (!isCorrect || pointsEarned === 0) {
      setDisplayPoints(0);
      return;
    }

    const duration = 600;
    const steps = 20;
    const increment = pointsEarned / steps;
    const stepTime = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const current = Math.round(increment * step);
      if (step >= steps) {
        setDisplayPoints(pointsEarned);
        clearInterval(timer);
      } else {
        setDisplayPoints(current);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [pointsEarned, isCorrect]);

  useEffect(() => {
    const timeout = setTimeout(() => setShowNextMessage(true), 3000);
    return () => clearTimeout(timeout);
  }, []);

  const noAnim = reduced;

  return (
    <motion.div
      initial={noAnim ? undefined : { scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="flex flex-col items-center justify-center gap-5 py-8 px-6 text-center"
    >
      {isCorrect ? (
        <>
          {/* Coral checkmark circle */}
          <motion.div
            initial={noAnim ? undefined : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 12,
              delay: 0.15,
            }}
            className="w-24 h-24 rounded-full bg-[#FF6B6B] flex items-center justify-center shadow-lg"
          >
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </motion.div>

          {/* Points — spring overshoot */}
          <motion.div
            initial={noAnim ? undefined : { y: 20, scale: 0.8, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
            }}
            className="text-5xl font-extrabold text-navy inline-block"
          >
            +{displayPoints} pts
          </motion.div>

          {/* Subtext */}
          <p className="text-lg text-ink/60 font-medium">Correct!</p>

          {/* Time taken */}
          <p className="text-sm text-ink/40">Answered in {timeTakenSeconds}s</p>

          {isJoker && (
            <motion.div
              initial={noAnim ? undefined : { scale: 0, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 15,
                delay: 0.4,
              }}
              className="px-5 py-2 rounded-2xl bg-amber text-white font-extrabold text-lg shadow-md"
            >
              JOKER x2!
            </motion.div>
          )}
        </>
      ) : (
        <>
          {/* Grey X circle — scales in with delay after points */}
          <motion.div
            initial={noAnim ? undefined : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 12,
              delay: 0.15,
            }}
            className="w-24 h-24 rounded-full bg-slate-400 flex items-center justify-center shadow-lg"
          >
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </motion.div>

          {/* 0 pts — spring overshoot */}
          <motion.div
            initial={noAnim ? undefined : { y: 20, scale: 0.8, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
            }}
            className="text-4xl font-bold text-ink/40"
          >
            0 pts
          </motion.div>

          {/* Subtext */}
          <p className="text-lg text-ink/60 font-medium">Not quite</p>

          {/* Correct answer card */}
          <motion.div
            initial={noAnim ? undefined : { y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="bg-navy/5 border border-navy/10 rounded-2xl px-6 py-4"
          >
            <p className="text-xs text-navy/50 font-semibold mb-1">
              Correct answer
            </p>
            <p className="text-lg font-bold text-navy">{correctAnswer}</p>
          </motion.div>
        </>
      )}

      {/* Running total */}
      <motion.div
        initial={noAnim ? undefined : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-2 text-sm text-ink/50 font-medium"
      >
        Total: {totalScore.toLocaleString()} pts
        {questionNumber > totalQuestions / 2 ? (
          <span className="italic text-ink/30"> · 🔒 Rankings hidden</span>
        ) : (
          playerRank != null && ` · Rank #${playerRank}`
        )}
      </motion.div>

      {/* Answer Distribution (Pilihan Jawaban & Yang Paling Banyak Dipilih) */}
      {options && options.length > 0 && (
        <motion.div
          initial={noAnim ? undefined : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-md space-y-2 mt-2"
        >
          <p className="text-xs font-bold text-ink/50 uppercase tracking-wider text-left">
            Pilihan Semua Pemain:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
            {options.map((opt, i) => {
              if (!opt.trim()) return null;
              const count =
                answerDistribution?.find(
                  (d) => d.answer_value.toLowerCase() === opt.toLowerCase()
                )?.count ?? 0;
              const isOptionCorrect =
                opt.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
              const isPlayerPick =
                playerAnswer?.trim().toLowerCase() === opt.trim().toLowerCase();

              const label = ["A", "B", "C", "D"][i] ?? String(i + 1);
              const labelColors = [
                "bg-[#1b2b5e]",
                "bg-[#FF6B6B]",
                "bg-[#FFB95F]",
                "bg-[#8594CD]",
              ];

              return (
                <div
                  key={i}
                  className={`relative p-3 rounded-xl border-2 flex items-center justify-between gap-3 text-left transition-all ${
                    isOptionCorrect
                      ? "border-emerald-500 bg-emerald-50/80 shadow-sm"
                      : isPlayerPick
                      ? "border-red-400 bg-red-50/60"
                      : "border-ink/10 bg-white/70"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg ${labelColors[i] ?? "bg-navy"} text-white text-xs font-black flex items-center justify-center shrink-0`}
                    >
                      {label}
                    </span>
                    <span
                      className={`text-sm font-bold truncate ${
                        isOptionCorrect ? "text-emerald-900 font-extrabold" : "text-ink"
                      }`}
                    >
                      {opt}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isOptionCorrect && (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                        Benar
                      </span>
                    )}
                    {isPlayerPick && !isOptionCorrect && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                        Pilihanmu
                      </span>
                    )}
                    <span className="text-xs font-black text-navy/70 bg-navy/5 px-2 py-0.5 rounded-md">
                      {count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Waiting for host message */}
      <motion.div
        initial={noAnim ? undefined : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-navy/5 border border-navy/10 text-xs font-bold text-navy/70"
      >
        <span className="w-2 h-2 rounded-full bg-amber animate-ping" />
        Menunggu host melanjutkan ke soal berikutnya...
      </motion.div>
    </motion.div>
  );
}

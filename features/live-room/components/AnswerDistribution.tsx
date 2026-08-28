"use client";

import { motion } from "framer-motion";
import type { QuestionType } from "@/shared/domain/types";

interface AnswerCount {
  answer_value: string;
  count: number;
}

interface AnswerDistributionProps {
  answers: AnswerCount[];
  correctAnswer: string;
  questionType: QuestionType;
  totalPlayers: number;
  revealed?: boolean;
  playerNames?: string[];
}

const optionLabels = ["A", "B", "C", "D", "E", "F"];

export default function AnswerDistribution({
  answers,
  correctAnswer,
  totalPlayers,
  revealed,
  playerNames,
}: AnswerDistributionProps) {
  const totalAnswers = answers.reduce((sum, a) => sum + a.count, 0);
  const maxCount = Math.max(...answers.map((a) => a.count), 1);

  return (
    <div className="bg-surface-container-low p-8 rounded-xl flex flex-col h-full">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-bold text-primary">
            Live Distribution
          </h2>
          <p className="text-sm text-outline font-medium mt-1">
            Real-time player responses
          </p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-black text-secondary-container">
            {totalAnswers}/{totalPlayers}
          </span>
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
            Players Ready
          </p>
        </div>
      </div>

      {/* Answer Bar Chart */}
      <div className="flex-1 flex flex-col justify-center gap-6">
        {answers.map((answer, idx) => {
          const isCorrect =
            answer.answer_value.toLowerCase() === correctAnswer.toLowerCase();
          const widthPercent =
            maxCount > 0 ? (answer.count / maxCount) * 100 : 2;
          const isTop = answer.count === maxCount && answer.count > 0;

          return (
            <div key={answer.answer_value} className="space-y-2">
              <div
                className={`flex justify-between items-center text-sm font-bold text-primary ${
                  !isTop && answer.count > 0
                    ? "opacity-60"
                    : answer.count === 0
                    ? "opacity-40"
                    : ""
                }`}
              >
                <span>
                  {optionLabels[idx]}: {answer.answer_value}
                </span>
                <span className="bg-surface-container-highest px-3 py-1 rounded-full text-xs">
                  {answer.count} {answer.count === 1 ? "Vote" : "Votes"}
                </span>
              </div>
              <div className="h-4 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPercent}%` }}
                  transition={{
                    duration: 0.6,
                    delay: idx * 0.08,
                    ease: "easeOut",
                  }}
                  className={`h-full rounded-full ${
                    revealed
                      ? isCorrect
                        ? "bg-emerald-500"
                        : "bg-red-400"
                      : isTop
                      ? "bg-primary"
                      : "bg-primary/40"
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Player avatars */}
      <div className="mt-8 pt-8 border-t border-primary/5">
        <div className="flex -space-x-2">
          {(playerNames ?? []).slice(0, 5).map((name, idx) => {
            const colors = [
              "bg-primary-fixed",
              "bg-secondary-fixed",
              "bg-tertiary-fixed",
              "bg-amber-200",
              "bg-periwinkle/30",
            ];
            const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
            return (
              <div
                key={name}
                title={name}
                className={`w-8 h-8 rounded-full border-2 border-surface ${colors[idx % colors.length]} flex items-center justify-center text-[10px] font-bold`}
              >
                {initials}
              </div>
            );
          })}
          {totalPlayers > 3 && (
            <div className="w-8 h-8 rounded-full border-2 border-surface bg-surface-container-highest flex items-center justify-center text-[10px] font-bold">
              +{totalPlayers - 3}
            </div>
          )}
        </div>
        {totalAnswers < totalPlayers && (
          <p className="text-[11px] font-semibold text-outline mt-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Waiting for {totalPlayers - totalAnswers} more{" "}
            {totalPlayers - totalAnswers === 1 ? "answer" : "answers"}...
          </p>
        )}
      </div>
    </div>
  );
}

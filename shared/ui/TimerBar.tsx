"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";

interface TimerBarProps {
  timeRemaining: number;
  timeLimit: number;
  questionNumber?: number;
  totalQuestions?: number;
}

export default function TimerBar({
  timeRemaining,
  timeLimit,
  questionNumber,
  totalQuestions,
}: TimerBarProps) {
  const fraction = timeLimit > 0 ? timeRemaining / timeLimit : 0;
  const reduced = useReducedMotion();

  const isUrgent = timeRemaining <= 5;
  const isCritical = timeRemaining <= 2;

  const barColor = isUrgent ? "#FF6B6B" : "#FFB95F";

  return (
    <div className="w-full">
      {/* Labels above bar */}
      <div className="flex justify-between items-center mb-2">
        {questionNumber && totalQuestions ? (
          <span className="label-sm uppercase tracking-widest text-[#45464f] text-xs font-semibold">
            Question {questionNumber} of {totalQuestions}
          </span>
        ) : (
          <span />
        )}
        <motion.span
          animate={
            reduced
              ? undefined
              : {
                  color: isUrgent ? "#FF6B6B" : "#021549",
                }
          }
          transition={{ duration: 0.3 }}
          className={`flex items-center gap-1.5 transition-colors duration-300 ${
            isUrgent ? "font-extrabold" : "font-bold"
          }`}
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {timeRemaining}
        </motion.span>
      </div>

      {/* Progress bar */}
      <motion.div
        animate={
          reduced || !isUrgent
            ? { scale: 1 }
            : {
                scale: [1, 1.02, 1],
              }
        }
        transition={
          isUrgent
            ? {
                duration: isCritical ? 0.4 : 1,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : undefined
        }
        className="w-full h-2.5 rounded-full bg-[#e2e3e0] overflow-hidden"
      >
        <motion.div
          className="h-full rounded-full"
          animate={{ backgroundColor: barColor }}
          transition={{ duration: 0.3 }}
          style={{
            width: `${fraction * 100}%`,
            transition: "width 900ms linear",
          }}
        />
      </motion.div>
    </div>
  );
}

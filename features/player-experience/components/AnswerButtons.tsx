"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import type { Question } from "@/shared/domain/types";

interface AnswerButtonsProps {
  question: Question;
  onAnswer: (answer: string) => void;
  disabled: boolean;
  lockedAnswer?: string | null;
  isRevealed?: boolean;
  correctAnswer?: string;
}

const buttonStyles = [
  { bg: "bg-[#1b2b5e]", text: "text-white", label: "A" },
  { bg: "bg-[#FF6B6B]", text: "text-white", label: "B" },
  { bg: "bg-[#FFB95F]", text: "text-[#653e00]", label: "C" },
  { bg: "bg-[#8594CD]", text: "text-white", label: "D" },
];

const shakeAnimation = {
  x: [0, -6, 6, -6, 6, -3, 3, 0],
  transition: { duration: 0.5, ease: "easeInOut" as const },
};

export default function AnswerButtons({
  question,
  onAnswer,
  disabled,
  lockedAnswer,
  isRevealed,
  correctAnswer,
}: AnswerButtonsProps) {
  const [sliderValue, setSliderValue] = useState(
    question.slider_min ?? 0
  );
  const [typeInValue, setTypeInValue] = useState("");
  const reduced = useReducedMotion();

  const isLockedIn = lockedAnswer != null;

  if (
    question.type === "multiple_choice" ||
    question.type === "image_question" ||
    question.type === "video_question" ||
    question.type === "audio_question"
  ) {
    const options = question.options ?? [];
    return (
      <div className="w-full space-y-3">
        <div
          className={`grid grid-cols-2 gap-3 w-full ${
            disabled && !isLockedIn ? "opacity-50 pointer-events-none" : ""
          } ${isLockedIn ? "pointer-events-none" : ""}`}
        >
          {options.map((option, index) => {
            const style = buttonStyles[index] ?? buttonStyles[0];
            const isSelected = isLockedIn && lockedAnswer === option;
            const isFaded = isLockedIn && lockedAnswer !== option;
            const isCorrectOption = isRevealed && option === correctAnswer;
            const isWrongSelected = isRevealed && isSelected && option !== correctAnswer;

            return (
              <motion.button
                key={index}
                whileTap={isLockedIn ? undefined : { scale: 0.88 }}
                animate={
                  reduced
                    ? undefined
                    : isRevealed
                    ? isCorrectOption
                      ? {
                          scale: [1, 1.05, 1.0],
                          boxShadow: [
                            "0 0 0px rgba(34,197,94,0)",
                            "0 0 30px rgba(34,197,94,0.6)",
                            "0 0 0px rgba(34,197,94,0)",
                          ],
                        }
                      : isWrongSelected
                      ? shakeAnimation
                      : { opacity: 0.4, scale: 0.95, filter: "grayscale(80%)" }
                    : isSelected
                    ? { scale: [1, 1.1, 0.95, 1.02, 1] }
                    : undefined
                }
                transition={
                  isRevealed
                    ? isCorrectOption
                      ? { duration: 0.5, ease: "easeOut" }
                      : { duration: 0.3, delay: 0.1, ease: "easeOut" }
                    : isSelected
                    ? { duration: 0.45, ease: "easeOut" }
                    : undefined
                }
                className={`${
                  isRevealed && isCorrectOption
                    ? "bg-[#22c55e] text-white"
                    : style.bg + " " + style.text
                } relative rounded-xl p-6 min-h-[80px] font-bold text-lg shadow-md transition-colors ${
                  isSelected && !isRevealed
                    ? "ring-4 ring-[#1b2b5e] ring-offset-2 ring-offset-cream scale-95"
                    : isFaded && !isRevealed
                    ? "opacity-50 scale-95"
                    : !isRevealed
                    ? "scale-95 active:scale-90"
                    : ""
                } ${isWrongSelected ? "border-2 border-[#FF6B6B]" : ""}`}
                onClick={() => onAnswer(option)}
                disabled={disabled || isLockedIn}
              >
                <span className="absolute top-2 left-3 text-xs font-bold opacity-60">
                  {style.label}
                </span>
                <span className="flex items-center justify-center w-full h-full text-center">
                  {option}
                </span>
              </motion.button>
            );
          })}
        </div>
        {isLockedIn && !isRevealed && <LockedInLabel lockedAnswer={lockedAnswer!} />}
      </div>
    );
  }

  if (question.type === "true_false") {
    return (
      <div className="w-full space-y-3">
        <div
          className={`flex flex-col gap-4 w-full ${
            disabled && !isLockedIn ? "opacity-50 pointer-events-none" : ""
          } ${isLockedIn ? "pointer-events-none" : ""}`}
        >
          {["True", "False"].map((val) => {
            const isSelected = isLockedIn && lockedAnswer === val;
            const isFaded = isLockedIn && lockedAnswer !== val;
            const bgColor = val === "True" ? "bg-emerald-500" : "bg-red-500";
            const isCorrectOption = isRevealed && val === correctAnswer;
            const isWrongSelected = isRevealed && isSelected && val !== correctAnswer;

            return (
              <motion.button
                key={val}
                whileTap={isLockedIn ? undefined : { scale: 0.88 }}
                animate={
                  reduced
                    ? undefined
                    : isRevealed
                    ? isCorrectOption
                      ? {
                          scale: [1, 1.08, 1.0],
                          boxShadow: "0 0 30px rgba(34,197,94,0.5)",
                        }
                      : isWrongSelected
                      ? shakeAnimation
                      : { opacity: 0.35, scale: 0.95, filter: "grayscale(60%)" }
                    : isSelected
                    ? { scale: [1, 1.1, 0.95, 1.02, 1] }
                    : undefined
                }
                transition={
                  isRevealed
                    ? isCorrectOption
                      ? { type: "spring", stiffness: 300, damping: 15 }
                      : { duration: 0.3, delay: 0.08, ease: "easeOut" }
                    : isSelected
                    ? { duration: 0.45, ease: "easeOut" }
                    : undefined
                }
                className={`rounded-xl p-6 min-h-[80px] ${
                  isRevealed && isCorrectOption ? "bg-[#22c55e]" : bgColor
                } text-white font-bold text-2xl shadow-md transition-colors ${
                  isSelected && !isRevealed
                    ? "ring-4 ring-[#1b2b5e] ring-offset-2 ring-offset-cream scale-95"
                    : isFaded && !isRevealed
                    ? "opacity-50 scale-95"
                    : !isRevealed
                    ? "scale-95 active:scale-90"
                    : ""
                } ${isWrongSelected ? "border-2 border-[#FF6B6B]" : ""}`}
                onClick={() => onAnswer(val)}
                disabled={disabled || isLockedIn}
              >
                {val}
              </motion.button>
            );
          })}
        </div>
        {isLockedIn && !isRevealed && <LockedInLabel lockedAnswer={lockedAnswer!} />}
      </div>
    );
  }

  if (question.type === "slider") {
    const min = question.slider_min ?? 0;
    const max = question.slider_max ?? 100;

    return (
      <div className="w-full space-y-3">
        <div
          className={`flex flex-col items-center gap-6 w-full ${
            disabled && !isLockedIn ? "opacity-50 pointer-events-none" : ""
          } ${isLockedIn ? "pointer-events-none" : ""}`}
        >
          <div className="text-5xl font-bold text-navy">
            {isLockedIn ? lockedAnswer : sliderValue}
          </div>
          {/* Slider with pulsing drag hint */}
          <div className="relative w-full">
            <input
              type="range"
              min={min}
              max={max}
              value={isLockedIn ? Number(lockedAnswer) : sliderValue}
              onChange={(e) => setSliderValue(Number(e.target.value))}
              disabled={disabled || isLockedIn}
              className="w-full h-3 rounded-full appearance-none bg-cream-dark accent-coral cursor-pointer"
            />
            {/* Pulsing dot hint — only shows if user hasn't moved slider yet */}
            {!isLockedIn && sliderValue === min && (
              <div
                className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: "0%" }}
              >
                <span className="relative flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-coral opacity-75" />
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-coral" />
                </span>
              </div>
            )}
          </div>
          <div className="flex justify-between w-full text-sm text-ink/50 font-medium">
            <span>{min}</span>
            <span className="text-ink/30 text-xs">← drag to your answer →</span>
            <span>{max}</span>
          </div>
          {!isLockedIn && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="w-full rounded-xl p-6 min-h-[80px] bg-coral text-white font-bold text-xl shadow-md active:shadow-sm transition-all"
              onClick={() => onAnswer(String(sliderValue))}
              disabled={disabled}
            >
              Submit
            </motion.button>
          )}
        </div>
        {isLockedIn && !isRevealed && <LockedInLabel lockedAnswer={lockedAnswer!} />}
      </div>
    );
  }

  if (question.type === "type_in") {
    return (
      <div className="w-full space-y-3">
        <div
          className={`flex flex-col gap-4 w-full ${
            disabled && !isLockedIn ? "opacity-50 pointer-events-none" : ""
          } ${isLockedIn ? "pointer-events-none" : ""}`}
        >
          <input
            type="text"
            value={isLockedIn ? lockedAnswer ?? "" : typeInValue}
            onChange={(e) => setTypeInValue(e.target.value)}
            placeholder="Type your answer..."
            disabled={disabled || isLockedIn}
            className={`w-full min-h-[3.5rem] rounded-2xl border-2 bg-white px-5 py-3 text-lg text-ink placeholder:text-ink/40 focus:outline-none transition-colors ${
              isLockedIn
                ? "border-[#1b2b5e] ring-2 ring-[#1b2b5e]/30"
                : "border-navy/20 focus:border-coral"
            }`}
          />
          {!isLockedIn && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="w-full rounded-xl p-6 min-h-[80px] bg-coral text-white font-bold text-xl shadow-md active:shadow-sm transition-all disabled:opacity-40"
              onClick={() => {
                if (typeInValue.trim()) {
                  onAnswer(typeInValue.trim());
                }
              }}
              disabled={disabled || !typeInValue.trim()}
            >
              Submit
            </motion.button>
          )}
        </div>
        {isLockedIn && !isRevealed && <LockedInLabel lockedAnswer={lockedAnswer!} />}
      </div>
    );
  }

  return null;
}

function LockedInLabel({ lockedAnswer }: { lockedAnswer: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4 py-5"
    >
      {/* Selected answer card with shimmer glow */}
      <motion.div
        animate={{
          boxShadow: [
            "0 0 0px rgba(245,158,11,0.0)",
            "0 0 20px rgba(245,158,11,0.3)",
            "0 0 0px rgba(245,158,11,0.0)",
          ],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="w-full rounded-2xl border-2 border-amber/40 bg-white px-6 py-4 text-center"
      >
        <p className="text-xs font-semibold text-amber-600/60 mb-1 uppercase tracking-wider">
          Your answer
        </p>
        <p className="text-lg font-bold text-navy">{lockedAnswer}</p>
      </motion.div>

      {/* Pulsing dots */}
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.5, 1] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.25,
            }}
            className="w-2.5 h-2.5 rounded-full bg-navy/30"
          />
        ))}
      </div>

      <p className="text-sm text-ink/40 font-medium">
        Waiting for the reveal...
      </p>
    </motion.div>
  );
}

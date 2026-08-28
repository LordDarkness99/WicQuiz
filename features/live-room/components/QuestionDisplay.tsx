"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { Question } from "@/shared/domain/types";
import AnimatedContainer from "@/shared/ui/AnimatedContainer";

interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
}

const optionColors = [
  "bg-coral text-white",
  "bg-navy text-white",
  "bg-amber text-ink",
  "bg-emerald-500 text-white",
];

const optionLabels = ["A", "B", "C", "D"];

export default function QuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
}: QuestionDisplayProps) {
  return (
    <AnimatedContainer className="w-full max-w-5xl mx-auto px-4">
      {/* Header: question counter + joker badge */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-cream/70 text-lg font-medium">
          Question {questionNumber} of {totalQuestions}
        </span>
        {question.is_joker && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="bg-amber text-ink font-bold px-4 py-1.5 rounded-2xl text-sm uppercase tracking-wide shadow-lg"
          >
            Joker Round
          </motion.span>
        )}
      </div>

      {/* Question text */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center mb-10 leading-tight"
      >
        {question.question_text}
      </motion.h2>

      {/* Image (for image_question type) */}
      {question.type === "image_question" && question.image_url && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="flex justify-center mb-10"
        >
          <div className="relative w-full max-w-lg aspect-video rounded-2xl overflow-hidden shadow-xl">
            <Image
              src={question.image_url}
              alt="Question image"
              fill
              className="object-cover"
            />
          </div>
        </motion.div>
      )}

      {/* Answer options: multiple_choice / image_question */}
      {(question.type === "multiple_choice" ||
        question.type === "image_question") &&
        question.options && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {question.options.map((option, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -30 : 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.1, duration: 0.35 }}
                className={`
                  ${optionColors[idx % optionColors.length]}
                  rounded-2xl p-6 shadow-lg flex items-center gap-4
                `}
              >
                <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/20 font-bold text-lg shrink-0">
                  {optionLabels[idx]}
                </span>
                <span className="text-xl font-semibold">{option}</span>
              </motion.div>
            ))}
          </div>
        )}

      {/* True / False */}
      {question.type === "true_false" && (
        <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
          {["True", "False"].map((value, idx) => (
            <motion.div
              key={value}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + idx * 0.12, type: "spring", stiffness: 300, damping: 20 }}
              className={`
                ${idx === 0 ? "bg-emerald-500 text-white" : "bg-coral text-white"}
                rounded-2xl p-10 shadow-lg text-center
              `}
            >
              <span className="text-3xl font-bold">{value}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Slider */}
      {question.type === "slider" && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="bg-white/10 backdrop-blur rounded-2xl p-8 max-w-2xl mx-auto text-center"
        >
          <p className="text-cream/70 text-lg mb-4 font-medium">
            Slide to answer
          </p>
          <div className="flex items-center justify-between gap-6">
            <span className="text-3xl font-bold text-white">
              {question.slider_min ?? 0}
            </span>
            <div className="flex-1 h-3 bg-white/20 rounded-full relative">
              <div className="absolute inset-y-0 left-0 w-1/2 bg-amber rounded-full" />
            </div>
            <span className="text-3xl font-bold text-white">
              {question.slider_max ?? 100}
            </span>
          </div>
        </motion.div>
      )}

      {/* Type-in */}
      {question.type === "type_in" && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="bg-white/10 backdrop-blur rounded-2xl p-10 max-w-2xl mx-auto text-center"
        >
          <p className="text-2xl font-semibold text-cream">
            Players are typing
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              ...
            </motion.span>
          </p>
        </motion.div>
      )}
    </AnimatedContainer>
  );
}

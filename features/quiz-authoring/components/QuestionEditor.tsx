"use client";

import { useEffect, useState } from "react";
import type { QuestionFormData } from "../domain/types";
import type { QuestionType } from "@/shared/domain/types";
import { ImageUpload } from "@/features/media";
import AIGenerateButton from "./AIGenerateButton";
import { toast } from "sonner";

interface QuestionEditorProps {
  question: QuestionFormData;
  onChange: (updated: QuestionFormData) => void;
  onRemove: () => void;
  index: number;
}

const typeTabs: { type: QuestionType; label: string; icon: string }[] = [
  { type: "multiple_choice", label: "MC", icon: "list" },
  { type: "true_false", label: "T-F", icon: "check_circle" },
  { type: "image_question", label: "Image", icon: "image" },
  { type: "type_in", label: "Type-in", icon: "keyboard" },
];

const answerColors = [
  "bg-primary",
  "bg-secondary-container",
  "bg-tertiary-fixed-dim",
  "bg-periwinkle",
];

const answerLabels = ["A", "B", "C", "D"];

export default function QuestionEditor({
  question,
  onChange,
  onRemove,
  index,
}: QuestionEditorProps) {
  const [justSaved, setJustSaved] = useState(false);

  function update(partial: Partial<QuestionFormData>) {
    onChange({ ...question, ...partial });
  }

  function handleSaveQuestion() {
    const text = question.question_text.trim();
    if (!text) {
      toast.error(`Pertanyaan #${index + 1} belum diisi.`);
      return;
    }
    setJustSaved(true);
    toast.success(`Pertanyaan #${index + 1} tersimpan.`);
    setTimeout(() => setJustSaved(false), 1500);
  }

  function updateOption(optionIndex: number, value: string) {
    const next = [...question.options];
    next[optionIndex] = value;
    update({ options: next });
  }

  function switchType(type: QuestionType) {
    const defaults: Partial<QuestionFormData> = { type, correct_answer: "" };
    if (type === "true_false") {
      defaults.correct_answer = "True";
      defaults.options = ["True", "False"];
    } else if (type === "multiple_choice" || type === "image_question") {
      defaults.options =
        question.options.length >= 4 ? question.options : ["", "", "", ""];
    } else if (type === "type_in") {
      defaults.options = [];
      defaults.correct_answer = "";
    }
    update(defaults);
  }

  const [showImageUpload, setShowImageUpload] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);

  useEffect(() => {
    if (!aiSuccess) return;
    const timer = setTimeout(() => setAiSuccess(false), 3000);
    return () => clearTimeout(timer);
  }, [aiSuccess]);

  function handleAIGenerate(data: {
    question: string;
    options?: string[];
    correctIndex?: number;
    correctAnswer?: string;
  }) {
    if (question.type === "true_false") {
      update({
        question_text: data.question,
        correct_answer:
          data.correctAnswer?.toLowerCase() === "true" ? "True" : "False",
        options: ["True", "False"],
      });
    } else if (question.type === "type_in") {
      update({
        question_text: data.question,
        correct_answer: data.correctAnswer || "",
        options: [],
      });
    } else {
      update({
        question_text: data.question,
        options: data.options ?? question.options,
        correct_answer:
          data.options?.[data.correctIndex ?? 0] ?? question.correct_answer,
      });
    }
    setAiSuccess(true);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header & Type Tabs */}
      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <h2 className="text-3xl font-extrabold text-primary tracking-tight">
            Question Editor
          </h2>
          <div className="flex items-center gap-2 text-xs font-bold text-outline bg-surface-container-low px-3 py-1.5 rounded-lg">
            <span className="material-symbols-outlined text-sm">schedule</span>
            EDITING QUESTION {String(index + 1).padStart(2, "0")}
          </div>
        </div>

        {/* Type Selector Tabs */}
        <div className="bg-surface-container-low p-1.5 rounded-2xl flex gap-1">
          {typeTabs.map((tab) => (
            <button
              key={tab.type}
              type="button"
              onClick={() => switchType(tab.type)}
              className={`flex-1 py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
                question.type === tab.type
                  ? "bg-surface-container-lowest text-primary shadow-sm ring-1 ring-outline-variant/10"
                  : "text-outline hover:text-primary hover:bg-surface-container-lowest/50"
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Main Question Card */}
      <div className="space-y-6">
        {/* AI Generate Button (Supported for multiple_choice, true_false, and type_in) */}
        {(question.type === "multiple_choice" ||
          question.type === "true_false" ||
          question.type === "type_in") && (
          <div className="flex items-center gap-3">
            <AIGenerateButton
              onGenerate={handleAIGenerate}
              questionType={question.type}
            />
            {aiSuccess && (
              <span className="text-sm font-bold text-secondary animate-pulse flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">check</span>
                Question generated! Review and edit as needed.
              </span>
            )}
          </div>
        )}

        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0px_20px_40px_rgba(27,43,94,0.04)]">
          <textarea
            className="w-full border-none focus:ring-0 focus:outline-none p-0 text-2xl font-bold text-primary placeholder:text-surface-container-highest resize-none bg-transparent"
            placeholder="Type your question here..."
            rows={2}
            value={question.question_text}
            onChange={(e) => update({ question_text: e.target.value })}
          />

          {/* Image Upload Area (Manual upload/URL only — no AI button for image) */}
          {question.type === "image_question" ? (
            <div className="mt-6">
              <ImageUpload
                value={question.image_url}
                onChange={(url) => update({ image_url: url ?? "" })}
              />
            </div>
          ) : showImageUpload || question.image_url ? (
            <div className="mt-6">
              <ImageUpload
                value={question.image_url}
                onChange={(url) => {
                  update({ image_url: url ?? "" });
                  if (!url) setShowImageUpload(false);
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowImageUpload(true)}
              className="mt-4 flex items-center gap-2 text-sm font-bold text-outline hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-lg">
                add_photo_alternate
              </span>
              Add image to question
            </button>
          )}

          {/* Blur toggle — shown when image is set */}
          {question.image_url && (
            <div className="mt-4 flex items-center gap-4 bg-surface-container-low p-4 rounded-2xl">
              <div className="flex flex-col flex-1">
                <span className="text-sm font-bold text-primary flex items-center gap-2">
                  <span className="text-lg">👁️</span>
                  Blur image during question (reveal on answer)
                </span>
                <span className="text-[10px] font-medium text-outline mt-0.5">
                  Great for &quot;Who Am I?&quot; style rounds — image progressively unblurs
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  className="sr-only peer"
                  type="checkbox"
                  checked={question.is_image_blurred ?? false}
                  onChange={(e) => update({ is_image_blurred: e.target.checked })}
                />
                <div className="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-outline-variant after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>
          )}

          {/* Blur preview */}
          {question.image_url && question.is_image_blurred && (
            <div className="mt-2 rounded-xl overflow-hidden relative aspect-video max-w-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={question.image_url}
                alt="Blur preview"
                className="w-full h-full object-cover"
                style={{ filter: "blur(12px)" }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-black/50 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                  Blur preview — players see this during question
                </span>
              </div>
            </div>
          )}
        </div>

        {/* MC / Image Answer Grid */}
        {(question.type === "multiple_choice" ||
          question.type === "image_question") && (
          <>
            {!question.correct_answer.trim() && question.question_text.trim() && (
              <p className="text-amber-600 text-xs font-bold flex items-center gap-1.5 mb-1">
                <span className="material-symbols-outlined text-sm">warning</span>
                Select the correct answer below
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              {question.options.slice(0, 4).map((opt, i) => {
                const isCorrect = question.correct_answer === opt && opt !== "";
                return (
                  <div
                    key={i}
                    className={`p-5 rounded-xl shadow-sm flex items-center gap-4 group transition-all border-2 ${
                      isCorrect
                        ? "border-emerald-500 bg-emerald-50/50 shadow-md ring-1 ring-emerald-500"
                        : "bg-surface-container-lowest border-transparent focus-within:border-primary-fixed hover:border-outline-variant/30"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl ${answerColors[i]} flex items-center justify-center text-white font-black text-xs shrink-0 cursor-pointer`}
                      onClick={() => {
                        if (opt.trim()) update({ correct_answer: opt });
                      }}
                      title="Click to mark as correct answer"
                    >
                      {answerLabels[i]}
                    </div>
                    <input
                      className="flex-1 border-none focus:ring-0 focus:outline-none p-0 font-bold text-primary bg-transparent placeholder:text-outline"
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const oldVal = opt;
                        const newVal = e.target.value;
                        updateOption(i, newVal);
                        if (oldVal !== "" && question.correct_answer === oldVal) {
                          update({
                            correct_answer: newVal,
                            options: question.options.map((o, j) =>
                              j === i ? newVal : o
                            ),
                          });
                        }
                      }}
                      placeholder="Add answer..."
                    />
                    <label className="relative flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name={`correct-${index}`}
                        checked={isCorrect}
                        onChange={() => {
                          if (opt.trim()) update({ correct_answer: opt });
                        }}
                        disabled={!opt.trim()}
                        className="w-5 h-5 text-emerald-600 border-outline focus:ring-emerald-500 cursor-pointer disabled:opacity-30"
                      />
                      <span className="text-xs font-bold text-outline group-hover:text-primary transition-colors">
                        Correct
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* True / False Options */}
        {question.type === "true_false" && (
          <div className="grid grid-cols-2 gap-4">
            {["True", "False"].map((val) => {
              const isCorrect =
                question.correct_answer.toLowerCase() === val.toLowerCase();
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => update({ correct_answer: val })}
                  className={`p-6 rounded-xl font-black text-lg flex items-center justify-between transition-all border-2 ${
                    isCorrect
                      ? val === "True"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md ring-2 ring-emerald-500/20"
                        : "border-red-500 bg-red-50 text-red-700 shadow-md ring-2 ring-red-500/20"
                      : "bg-surface-container-lowest border-transparent text-primary hover:border-outline-variant/30"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`material-symbols-outlined text-2xl ${
                        val === "True" ? "text-emerald-500" : "text-red-500"
                      }`}
                    >
                      {val === "True" ? "check_circle" : "cancel"}
                    </span>
                    {val}
                  </span>
                  {isCorrect && (
                    <span className="text-xs font-bold uppercase tracking-wider bg-white/80 px-2.5 py-1 rounded-full shadow-sm">
                      Correct Answer
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Type-in Question */}
        {question.type === "type_in" && (
          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-on-primary-container">
              Correct Answer (Short Answer / Isian Singkat)
            </label>
            <input
              type="text"
              value={question.correct_answer}
              onChange={(e) => update({ correct_answer: e.target.value })}
              placeholder="The answer players must type (e.g. Jupiter, Paris, 1945)"
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-lg font-bold text-primary placeholder:text-outline focus:ring-2 focus:ring-primary-container focus:outline-none"
            />
            <p className="text-xs text-outline font-medium">
              Matching is case-insensitive. AI grading fallback also helps catch minor typos.
            </p>
          </div>
        )}
      </div>

      {/* Settings Controls */}
      <div className="flex items-center justify-between gap-8 pt-4">
        <div className="flex items-center gap-6">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-outline">
              Time Limit
            </label>
            <div className="flex items-center bg-surface-container-low rounded-xl px-4 py-2 w-32">
              <input
                className="bg-transparent border-none focus:ring-0 focus:outline-none p-0 font-bold text-primary w-full"
                type="number"
                min={5}
                max={120}
                value={question.time_limit}
                onChange={(e) =>
                  update({ time_limit: Number(e.target.value) || 15 })
                }
              />
              <span className="text-xs font-bold text-outline">SEC</span>
            </div>
          </div>
          <div className="h-10 w-px bg-outline-variant/30 mt-4" />
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-outline">
              Points
            </label>
            <div className="flex items-center bg-surface-container-low rounded-xl px-4 py-2 w-32">
              <input
                className="bg-transparent border-none focus:ring-0 focus:outline-none p-0 font-bold text-primary w-full"
                type="number"
                value={1000}
                readOnly
              />
              <span className="material-symbols-outlined text-sm text-outline">
                bolt
              </span>
            </div>
          </div>
        </div>

        {/* Joker Toggle */}
        <div className="flex items-center gap-4 bg-tertiary-fixed-dim/10 border-2 border-tertiary-fixed-dim/20 p-4 rounded-2xl">
          <div className="flex flex-col">
            <span className="text-sm font-black text-on-tertiary-container flex items-center gap-1">
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              JOKER ROUND
            </span>
            <span className="text-[10px] font-medium text-on-tertiary-fixed-variant">
              Double points for all players
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              className="sr-only peer"
              type="checkbox"
              checked={question.is_joker}
              onChange={(e) => update({ is_joker: e.target.checked })}
            />
            <div className="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-outline-variant after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tertiary-fixed-dim" />
          </label>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-between items-center pt-6 border-t border-outline-variant/10">
        <div className="flex items-center gap-4">
          <button
            onClick={onRemove}
            className="flex items-center gap-2 px-4 py-2 text-error hover:text-white hover:bg-error rounded-xl font-bold text-sm transition-colors"
          >
            <span className="material-symbols-outlined">delete</span>
            Delete
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleSaveQuestion}
            className={`px-10 py-3 rounded-xl text-sm font-bold shadow-[0px_20px_40px_rgba(27,43,94,0.15)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 ${
              justSaved
                ? "bg-tertiary-fixed-dim text-white"
                : "bg-primary text-on-primary"
            }`}
          >
            {justSaved ? "Tersimpan" : "Save Question"}
            <span className="material-symbols-outlined text-lg">
              check_circle
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

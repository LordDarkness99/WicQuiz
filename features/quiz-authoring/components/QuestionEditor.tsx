"use client";

import { useEffect, useMemo, useState } from "react";
import type { QuestionFormData } from "../domain/types";
import type { QuestionType } from "@/shared/domain/types";
import { ImageUpload } from "@/features/media";
import { AudioUpload } from "@/features/media";
import { AudioPlayer } from "@/features/media";
import { extractVideoId } from "@/features/media";
import AIGenerateButton from "./AIGenerateButton";

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
  { type: "slider", label: "Slider", icon: "linear_scale" },
  { type: "type_in", label: "Type-in", icon: "keyboard" },
  { type: "video_question", label: "Video", icon: "videocam" },
  { type: "audio_question", label: "Audio", icon: "music_note" },
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
  function update(partial: Partial<QuestionFormData>) {
    onChange({ ...question, ...partial });
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
    }
    if (
      type === "multiple_choice" ||
      type === "image_question" ||
      type === "video_question" ||
      type === "audio_question"
    ) {
      defaults.options =
        question.options.length >= 4 ? question.options : ["", "", "", ""];
    }
    if (type === "slider") {
      defaults.slider_min = question.slider_min ?? 0;
      defaults.slider_max = question.slider_max ?? 100;
      defaults.correct_answer = "50";
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
        correct_answer: data.correctAnswer === "true" ? "True" : "False",
        options: ["True", "False"],
      });
    } else {
      update({
        question_text: data.question,
        options: data.options ?? question.options,
        correct_answer: data.options?.[data.correctIndex ?? 0] ?? question.correct_answer,
      });
    }
    setAiSuccess(true);
  }

  const sliderPercent = useMemo(() => {
    if (question.type !== "slider") return 0;
    const min = question.slider_min ?? 0;
    const max = question.slider_max ?? 100;
    const val = parseFloat(question.correct_answer) || 0;
    if (max <= min) return 0;
    return Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
  }, [question.type, question.slider_min, question.slider_max, question.correct_answer]);

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
              onClick={() => switchType(tab.type)}
              className={`flex-1 py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all ${
                question.type === tab.type
                  ? "bg-surface-container-lowest shadow-sm text-primary font-bold"
                  : "text-outline font-semibold hover:bg-surface-container"
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Question Input Canvas */}
      <div className="space-y-6">
        {(question.type === "multiple_choice" || question.type === "true_false") && (
          <div className="flex items-center gap-3">
            <AIGenerateButton
              onGenerate={handleAIGenerate}
              questionType={question.type}
            />
            {aiSuccess && (
              <span className="text-sm font-bold text-secondary animate-pulse">
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

          {/* Image Upload Area */}
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
                style={{ filter: 'blur(12px)' }}
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
          question.type === "image_question" ||
          question.type === "video_question" ||
          question.type === "audio_question") && (
          <>
          {!question.correct_answer.trim() && question.question_text.trim() && (
            <p className="text-amber-600 text-xs font-bold flex items-center gap-1.5 mb-1">
              <span className="material-symbols-outlined text-sm">warning</span>
              Select the correct answer below
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            {question.options.slice(0, 4).map((opt, i) => (
              <div
                key={i}
                className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex items-center gap-4 group transition-all border-2 border-transparent focus-within:border-primary-fixed"
              >
                <div
                  className={`w-10 h-10 rounded-xl ${answerColors[i]} flex items-center justify-center text-white font-black text-xs shrink-0`}
                >
                  {answerLabels[i]}
                </div>
                <input
                  className="flex-1 border-none focus:ring-0 focus:outline-none p-0 font-bold text-primary bg-transparent placeholder:text-outline"
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const oldVal = opt;
                    updateOption(i, e.target.value);
                    if (question.correct_answer === oldVal) {
                      update({
                        correct_answer: e.target.value,
                        options: question.options.map((o, j) =>
                          j === i ? e.target.value : o
                        ),
                      });
                    }
                  }}
                  placeholder="Add answer..."
                />
                <label className="relative flex items-center gap-2 cursor-pointer">
                  <input
                    className="peer sr-only"
                    name={`correct-${index}`}
                    type="radio"
                    checked={question.correct_answer === opt && opt !== ""}
                    onChange={() => update({ correct_answer: opt })}
                  />
                  <div className="w-6 h-6 rounded-full border-2 border-outline-variant peer-checked:border-emerald-500 peer-checked:bg-emerald-500 transition-all flex items-center justify-center">
                    <span className="material-symbols-outlined text-[14px] text-white scale-0 peer-checked:scale-100 transition-transform" style={{ fontVariationSettings: "'wght' 700" }}>
                      check
                    </span>
                  </div>
                  {question.correct_answer === opt && opt !== "" && (
                    <span className="text-[10px] font-bold text-emerald-600 whitespace-nowrap flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      Correct
                    </span>
                  )}
                </label>
              </div>
            ))}
          </div>
          </>
        )}

        {/* True / False */}
        {question.type === "true_false" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-primary-container">
                Select Correct Answer
              </label>
              <span className="text-[10px] text-outline font-bold">
                Toggle to mark correct
              </span>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {/* TRUE */}
              <button
                type="button"
                onClick={() =>
                  update({
                    correct_answer: "True",
                    options: ["True", "False"],
                  })
                }
                className={`group relative flex flex-col items-center justify-center p-12 rounded-xl transition-all ${
                  question.correct_answer === "True"
                    ? "bg-secondary-container/10 border-2 border-secondary-container scale-[1.02] shadow-[0px_12px_24px_rgba(174,47,52,0.1)]"
                    : "bg-surface-container-low border-2 border-transparent hover:border-outline-variant hover:bg-surface-container-high"
                }`}
              >
                {question.correct_answer === "True" && (
                  <div className="absolute top-4 right-4 h-8 w-8 rounded-full bg-secondary-container text-white flex items-center justify-center shadow-lg">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                  </div>
                )}
                <div
                  className={`h-20 w-20 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${
                    question.correct_answer === "True"
                      ? "bg-secondary-container/20"
                      : "bg-surface-container-highest"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-4xl ${
                      question.correct_answer === "True"
                        ? "text-secondary"
                        : "text-outline"
                    }`}
                  >
                    done_all
                  </span>
                </div>
                <span
                  className={`text-xl font-black tracking-tight ${
                    question.correct_answer === "True"
                      ? "text-on-secondary-container"
                      : "text-on-surface-variant opacity-60"
                  }`}
                >
                  TRUE
                </span>
              </button>

              {/* FALSE */}
              <button
                type="button"
                onClick={() =>
                  update({
                    correct_answer: "False",
                    options: ["True", "False"],
                  })
                }
                className={`group relative flex flex-col items-center justify-center p-12 rounded-xl transition-all ${
                  question.correct_answer === "False"
                    ? "bg-secondary-container/10 border-2 border-secondary-container scale-[1.02] shadow-[0px_12px_24px_rgba(174,47,52,0.1)]"
                    : "bg-surface-container-low border-2 border-transparent hover:border-outline-variant hover:bg-surface-container-high"
                }`}
              >
                {question.correct_answer === "False" && (
                  <div className="absolute top-4 right-4 h-8 w-8 rounded-full bg-secondary-container text-white flex items-center justify-center shadow-lg">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                  </div>
                )}
                <div
                  className={`h-20 w-20 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${
                    question.correct_answer === "False"
                      ? "bg-secondary-container/20"
                      : "bg-surface-container-highest"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-4xl ${
                      question.correct_answer === "False"
                        ? "text-secondary"
                        : "text-outline"
                    }`}
                  >
                    close
                  </span>
                </div>
                <span
                  className={`text-xl font-black tracking-tight ${
                    question.correct_answer === "False"
                      ? "text-on-secondary-container"
                      : "text-on-surface-variant opacity-60"
                  }`}
                >
                  FALSE
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Slider Configuration */}
        {question.type === "slider" && (
          <div className="space-y-8 p-8 bg-surface-container-low rounded-3xl relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-tertiary-fixed-dim/10 rounded-full blur-3xl" />
            <div className="flex justify-between items-end relative z-10">
              <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-amber">
                  tune
                </span>
                Slider Parameters
              </h4>
            </div>

            {/* Config Grid */}
            <div className="grid grid-cols-3 gap-6 relative z-10">
              <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm space-y-2 border border-outline-variant/5">
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">
                  Min Value
                </span>
                <input
                  className="block w-full text-xl font-extrabold text-primary border-none p-0 focus:ring-0 focus:outline-none bg-transparent"
                  type="number"
                  value={question.slider_min}
                  onChange={(e) =>
                    update({ slider_min: Number(e.target.value) })
                  }
                />
              </div>
              <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm space-y-2 border border-outline-variant/5">
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">
                  Max Value
                </span>
                <input
                  className="block w-full text-xl font-extrabold text-primary border-none p-0 focus:ring-0 focus:outline-none bg-transparent"
                  type="number"
                  value={question.slider_max}
                  onChange={(e) =>
                    update({ slider_max: Number(e.target.value) })
                  }
                />
              </div>
              <div className="bg-secondary-container/10 p-5 rounded-2xl shadow-sm space-y-2 ring-1 ring-secondary-container/20">
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                  Correct Answer
                </span>
                <input
                  className="block w-full text-xl font-extrabold text-secondary border-none p-0 focus:ring-0 focus:outline-none bg-transparent"
                  type="number"
                  value={question.correct_answer}
                  onChange={(e) => update({ correct_answer: e.target.value })}
                />
              </div>
            </div>

            {/* Tolerance */}
            <div className="flex items-center gap-4 relative z-10">
              <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm border border-outline-variant/5 flex items-center gap-3 flex-1">
                <span className="material-symbols-outlined text-outline text-sm">
                  target
                </span>
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">
                    Tolerance (±)
                  </span>
                  <input
                    className="block w-full text-lg font-bold text-primary border-none p-0 focus:ring-0 focus:outline-none bg-transparent"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={question.slider_tolerance ?? ""}
                    onChange={(e) =>
                      update({ slider_tolerance: e.target.value ? Number(e.target.value) : undefined })
                    }
                  />
                </div>
                <span className="text-xs text-outline/60">Accept answers within ±{question.slider_tolerance ?? 0}</span>
              </div>
            </div>

            {/* Slider Preview */}
            <div className="py-12 px-4 space-y-8 relative z-10">
              <div className="relative h-4 bg-surface-container-highest rounded-full w-full">
                <div
                  className="absolute h-full bg-primary-container rounded-full opacity-10"
                  style={{ width: `${sliderPercent}%` }}
                />
                {/* Correct marker */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center"
                  style={{ left: `${sliderPercent}%` }}
                >
                  <div className="absolute -top-14 bg-secondary-container text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-md whitespace-nowrap">
                    Goal: {question.correct_answer}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-secondary-container rotate-45" />
                  </div>
                  <div className="w-6 h-6 bg-white border-4 border-secondary-container rounded-full shadow-lg" />
                </div>
                <div className="absolute -bottom-8 left-0 text-[10px] font-bold text-outline">
                  {question.slider_min}
                </div>
                <div className="absolute -bottom-8 right-0 text-[10px] font-bold text-outline">
                  {question.slider_max}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Video Question */}
        {question.type === "video_question" && (
          <div className="space-y-6">
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-primary-container">
                YouTube URL
              </label>
              <input
                type="text"
                value={question.video_url}
                onChange={(e) => update({ video_url: e.target.value })}
                placeholder="Paste YouTube URL"
                className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-lg font-bold text-primary placeholder:text-outline focus:ring-2 focus:ring-primary-container focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline">
                    Start at (seconds)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={question.video_start_seconds}
                    onChange={(e) =>
                      update({ video_start_seconds: Number(e.target.value) || 0 })
                    }
                    className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 font-bold text-primary focus:ring-2 focus:ring-primary-container focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline">
                    End at (seconds)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={question.video_end_seconds ?? ""}
                    onChange={(e) =>
                      update({
                        video_end_seconds: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                    placeholder="Full video"
                    className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 font-bold text-primary placeholder:text-outline focus:ring-2 focus:ring-primary-container focus:outline-none"
                  />
                </div>
              </div>

              {/* Thumbnail preview */}
              {question.video_url && extractVideoId(question.video_url) && (
                <div className="mt-2 rounded-xl overflow-hidden aspect-video max-w-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://img.youtube.com/vi/${extractVideoId(question.video_url)}/hqdefault.jpg`}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <p className="text-xs text-outline font-medium">
                Tip: Use timestamp links from YouTube (right-click → Copy video
                URL at current time) to get exact seconds
              </p>
            </div>
          </div>
        )}

        {/* Audio Question */}
        {question.type === "audio_question" && (
          <div className="space-y-6">
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-primary-container">
                Audio File
              </label>
              {question.audio_url ? (
                <div className="space-y-4">
                  <AudioPlayer audioUrl={question.audio_url} />
                  <button
                    type="button"
                    onClick={() => update({ audio_url: "" })}
                    className="flex items-center gap-2 text-sm font-bold text-outline hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">
                      delete
                    </span>
                    Remove audio
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <AudioUpload
                    onUpload={(url) => update({ audio_url: url })}
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-outline-variant/30" />
                    <span className="text-xs font-bold text-outline">OR</span>
                    <div className="flex-1 h-px bg-outline-variant/30" />
                  </div>
                  <input
                    type="text"
                    value={question.audio_url}
                    onChange={(e) => update({ audio_url: e.target.value })}
                    placeholder="Paste audio URL (MP3, SoundCloud, etc.)"
                    className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 font-bold text-primary placeholder:text-outline focus:ring-2 focus:ring-primary-container focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Type-in */}
        {question.type === "type_in" && (
          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-on-primary-container">
              Correct Answer
            </label>
            <input
              type="text"
              value={question.correct_answer}
              onChange={(e) => update({ correct_answer: e.target.value })}
              placeholder="The answer players must type"
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-lg font-bold text-primary placeholder:text-outline focus:ring-2 focus:ring-primary-container focus:outline-none"
            />
            <p className="text-xs text-outline font-medium">
              Matching is case-insensitive.
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
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
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
            className="flex items-center gap-2 px-4 py-2 text-outline hover:text-on-surface font-bold text-sm transition-colors"
          >
            <span className="material-symbols-outlined">delete</span>
            Delete
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button className="px-10 py-3 rounded-xl bg-primary text-on-primary text-sm font-bold shadow-[0px_20px_40px_rgba(27,43,94,0.15)] hover:scale-105 transition-all flex items-center gap-2">
            Save Question
            <span className="material-symbols-outlined text-lg">
              check_circle
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

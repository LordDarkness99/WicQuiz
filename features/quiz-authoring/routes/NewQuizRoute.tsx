"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getHostId } from "@/shared/hostIdentity";
import { saveQuizTemplate, markTemplateAsRun } from "@/features/quiz-authoring";
import type { QuestionFormData } from "@/features/quiz-authoring";
import QuestionEditor from "@/features/quiz-authoring/components/QuestionEditor";
import SortableQuestionCard from "@/features/quiz-authoring/components/SortableQuestionCard";

function createEmptyQuestion(): QuestionFormData {
  return {
    type: "multiple_choice",
    question_text: "",
    options: ["", "", "", ""],
    correct_answer: "",
    time_limit: 15,
    image_url: "",
    is_joker: false,
    slider_min: 0,
    slider_max: 100,
    video_url: "",
    video_start_seconds: 0,
    video_end_seconds: null,
    audio_url: "",
  };
}

export default function NewQuizPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleQuestionChange = useCallback(
    (index: number, updated: QuestionFormData) => {
      setQuestions((prev) => prev.map((q, i) => (i === index ? updated : q)));
    },
    []
  );

  const handleRemoveQuestion = useCallback(
    (index: number) => {
      setQuestions((prev) => {
        if (prev.length <= 1) return prev;
        return prev.filter((_, i) => i !== index);
      });
      if (selectedIndex >= index && selectedIndex > 0) {
        setSelectedIndex((prev) => prev - 1);
      }
    },
    [selectedIndex]
  );

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createEmptyQuestion()]);
    setSelectedIndex(questions.length);
  };

  const validate = (): string | null => {
    if (!title.trim()) return "Give your quiz a title first.";
    const hasValidQuestion = questions.some(
      (q) => q.question_text.trim().length > 0
    );
    if (!hasValidQuestion)
      return "Add at least one question with some text — your audience needs something to answer!";
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) continue;
      if (
        (q.type === "multiple_choice" ||
          q.type === "image_question" ||
          q.type === "video_question" ||
          q.type === "audio_question") &&
        !q.correct_answer.trim()
      ) {
        return `Question ${i + 1}: Please select a correct answer.`;
      }
      if (q.type === "true_false" && !q.correct_answer.trim()) {
        return `Question ${i + 1}: Please select True or False.`;
      }
      if (
        (q.type === "slider" || q.type === "type_in") &&
        !q.correct_answer.trim()
      ) {
        return `Question ${i + 1}: Please provide a correct answer.`;
      }
    }
    return null;
  };

  const handleCreate = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const hostId = getHostId();
      const templateId = await createDraftTemplate(hostId, trimmed);
      toast.success(`Quiz "${trimmed}" dibuat! Tambahkan pertanyaanmu 🎉`);
      router.push(`/host/quiz/${templateId}/edit`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal membuat quiz.";
      setError(msg);
      toast.error(msg);
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      {/* Background decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-container/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <button
            onClick={() => router.push("/host/dashboard")}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-outline hover:text-primary transition-colors mb-6"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Kembali ke Dashboard
          </button>
          <div className="w-16 h-16 bg-secondary-container/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span
              className="material-symbols-outlined text-[32px] text-secondary-container"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              quiz
            </span>
          </div>
          <h1 className="text-3xl font-black text-primary tracking-tight">
            Buat Quiz Baru
          </h1>
          <p className="text-on-surface-variant mt-2 text-sm">
            Beri nama dulu, lalu tambahkan pertanyaanmu di editor.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <span className="text-error text-xs font-bold max-w-[220px] truncate" title={error}>
              {error}
            </span>
          )}
          <motion.button
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isCreating}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-primary border border-primary/10 hover:bg-surface-container-low transition-colors disabled:opacity-50"
          >
            {isSavingDraft ? "Saving..." : "Save as Draft"}
          </motion.button>
          <motion.button
            onClick={handleCreate}
            disabled={isCreating}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            className="bg-secondary-container text-white px-6 py-2.5 rounded-xl font-extrabold text-sm shadow-[0px_10px_20px_rgba(255,107,107,0.2)] transition-shadow disabled:opacity-50 min-w-[120px]"
          >
            {saveSuccess ? (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Saved!
              </motion.span>
            ) : isCreating ? (
              "Setting up the room..."
            ) : (
              "Launch Quiz"
            )}
          </motion.button>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-error-container text-error px-6 py-3 text-center text-sm font-medium"
        >
          {error}
        </motion.div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Question List */}
        <aside className="w-80 bg-surface-container-low flex flex-col h-[calc(100vh-57px)] border-r border-outline-variant/10">
          <div className="p-6 flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-widest text-outline">
              Questions ({questions.length})
            </span>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={questionIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-24">
                {questions.map((q, idx) => (
                  <SortableQuestionCard
                    key={idx}
                    id={String(idx)}
                    question={q}
                    index={idx}
                    isSelected={idx === selectedIndex}
                    onClick={() => setSelectedIndex(idx)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {/* Add Question Button */}
          <div className="p-4 bg-surface-container-low border-t border-outline-variant/10">
            <motion.button
              type="submit"
              disabled={creating || !title.trim()}
              whileHover={{ scale: creating ? 1 : 1.02 }}
              whileTap={{ scale: creating ? 1 : 0.97 }}
              className="w-full py-4 rounded-xl bg-secondary-container text-white font-extrabold text-base shadow-[0px_10px_30px_rgba(174,47,52,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Membuat Quiz...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    edit_note
                  </span>
                  Lanjut ke Editor
                </>
              )}
            </motion.button>
          </div>
        </aside>

        {/* Footer hint */}
        <p className="text-center text-xs text-outline mt-6">
          Quiz tersimpan otomatis saat kamu mengedit pertanyaan.
        </p>
      </motion.div>
    </div>
  );
}

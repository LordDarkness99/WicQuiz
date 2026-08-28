"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { createRoom, createQuiz, insertRoomQuestions } from "@/features/live-room";
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
  const [title, setTitle] = useState("Untitled Quiz");
  const [questions, setQuestions] = useState<QuestionFormData[]>([
    createEmptyQuestion(),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
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
    setIsCreating(true);
    setSaveSuccess(false);

    try {
      const hostId = getHostId();

      const validQuestions = questions.filter(
        (q) => q.question_text.trim().length > 0
      );

      // Save to quiz template + question bank
      const templateId = await saveQuizTemplate(hostId, title, validQuestions);
      await markTemplateAsRun(templateId);

      // Create room + quiz for live game
      const room = await createRoom(hostId);
      const quiz = await createQuiz(room.id, title.trim());

      const questionRows = validQuestions.map((q, idx) => ({
        quiz_id: quiz.id,
        type: q.type,
        question_text: q.question_text.trim(),
        options:
          q.type === "multiple_choice" ||
          q.type === "image_question" ||
          q.type === "true_false" ||
          q.type === "video_question" ||
          q.type === "audio_question"
            ? q.options
            : null,
        correct_answer: q.correct_answer.trim(),
        time_limit: q.time_limit,
        points_base: 1000,
        order_index: idx,
        image_url: q.image_url || null,
        is_joker: q.is_joker,
        is_image_blurred: q.is_image_blurred ?? false,
        slider_min: q.type === "slider" ? q.slider_min : null,
        slider_max: q.type === "slider" ? q.slider_max : null,
        video_url: q.type === "video_question" ? q.video_url || null : null,
        video_start_seconds:
          q.type === "video_question" ? q.video_start_seconds : null,
        video_end_seconds:
          q.type === "video_question" ? q.video_end_seconds : null,
        audio_url: q.type === "audio_question" ? q.audio_url || null : null,
      }));

      await insertRoomQuestions(questionRows);

      setSaveSuccess(true);
      toast.success(`Quiz "${title}" created! Heading to lobby…`);
      setTimeout(() => {
        router.push(`/host/${room.room_code}?templateId=${templateId}`);
      }, 500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
      toast.error(msg);
      setIsCreating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      setError("Give your quiz a title first.");
      return;
    }
    const validQuestions = questions.filter(
      (q) => q.question_text.trim().length > 0
    );
    if (validQuestions.length === 0) {
      setError("Add at least one question before saving.");
      return;
    }
    // Validate correct answers
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSavingDraft(true);
    try {
      const hostId = getHostId();
      await saveQuizTemplate(hostId, title, validQuestions);
      setSaveSuccess(true);
      toast.success("Draft saved!");
      setTimeout(() => {
        router.push("/host/dashboard");
      }, 500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save draft.";
      setError(msg);
      toast.error(msg);
      setIsSavingDraft(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const questionIds = questions.map((_, i) => String(i));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = questionIds.indexOf(String(active.id));
      const newIndex = questionIds.indexOf(String(over!.id));
      setQuestions((items) => arrayMove(items, oldIndex, newIndex));
      // Adjust selected index to follow the selected question
      if (selectedIndex === oldIndex) {
        setSelectedIndex(newIndex);
      } else if (oldIndex < selectedIndex && newIndex >= selectedIndex) {
        setSelectedIndex((prev) => prev - 1);
      } else if (oldIndex > selectedIndex && newIndex <= selectedIndex) {
        setSelectedIndex((prev) => prev + 1);
      }
    }
  };

  const selected = questions[selectedIndex];

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      {/* Top Nav Bar */}
      <header className="bg-surface-bright flex justify-between items-center w-full px-6 py-3 border-b border-primary/10 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push("/host/dashboard")}
            className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
          >
            ← Dashboard
          </button>
          <div className="h-8 w-px bg-outline-variant/30" />
          <span className="text-xl font-bold text-primary-container tracking-tighter">
            QuizTime
          </span>
          <div className="h-8 w-px bg-outline-variant/30" />
          <div className="flex items-center gap-2 group">
            <input
              className="bg-transparent border-none font-bold text-primary-container p-0 focus:ring-0 focus:outline-none text-sm tracking-tight w-64"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Quiz title..."
            />
          </div>
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
              onClick={addQuestion}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full py-4 rounded-xl bg-primary text-on-primary font-bold flex items-center justify-center gap-2 shadow-[0px_10px_20px_rgba(2,21,73,0.1)] transition-shadow"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Add Question
            </motion.button>
          </div>
        </aside>

        {/* Main: Question Editor */}
        <main className="flex-1 bg-surface p-8 overflow-y-auto">
          {selected && (
            <QuestionEditor
              question={selected}
              onChange={(updated) =>
                handleQuestionChange(selectedIndex, updated)
              }
              onRemove={() => handleRemoveQuestion(selectedIndex)}
              index={selectedIndex}
            />
          )}
        </main>
      </div>
    </div>
  );
}

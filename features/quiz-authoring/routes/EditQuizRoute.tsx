"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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
import {
  loadQuizTemplate,
  markTemplateAsRun,
  deleteBankQuestions,
  insertBankQuestions,
  updateTemplateQuestions,
  type QuestionBankItem,
} from "@/features/quiz-authoring";
import type { QuestionFormData } from "@/features/quiz-authoring";
import type { QuestionType } from "@/shared/domain/types";
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

function bankItemToFormData(item: QuestionBankItem): QuestionFormData {
  return {
    type: item.type as QuestionType,
    question_text: item.question_text,
    options: (item.options as string[]) || ["", "", "", ""],
    correct_answer: item.correct_answer,
    time_limit: item.time_limit,
    image_url: item.image_url || "",
    is_joker: item.is_joker,
    is_image_blurred: item.is_image_blurred ?? false,
    slider_min: item.slider_min ?? 0,
    slider_max: item.slider_max ?? 100,
    slider_tolerance: item.slider_tolerance ?? undefined,
    video_url: item.video_url || "",
    video_start_seconds: item.video_start_seconds ?? 0,
    video_end_seconds: item.video_end_seconds ?? null,
    audio_url: item.audio_url || "",
  };
}

export default function EditQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;

  const [title, setTitle] = useState("Untitled Quiz");
  const [questions, setQuestions] = useState<QuestionFormData[]>([
    createEmptyQuestion(),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runLoading, setRunLoading] = useState(false);

  // Debounce save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load template
  useEffect(() => {
    async function load() {
      try {
        const { template, questions: bankQuestions } =
          await loadQuizTemplate(quizId);
        setTitle(template.title);
        if (bankQuestions.length > 0) {
          setQuestions(bankQuestions.map(bankItemToFormData));
        }
      } catch {
        setError("Failed to load quiz template.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [quizId]);

  // Debounced auto-save
  const triggerSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        const hostId = getHostId();
        const validQuestions = questions.filter(
          (q) => q.question_text.trim().length > 0
        );

        if (validQuestions.length === 0) {
          setSaving(false);
          return;
        }

        // Delete old bank questions for this template, insert new ones
        const { template } = await loadQuizTemplate(quizId);
        const oldIds = template.question_ids || [];
        if (oldIds.length > 0) {
          await deleteBankQuestions(oldIds);
        }

        const rows = validQuestions.map((q) => ({
          host_id: hostId,
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
          image_url: q.image_url || null,
          is_joker: q.is_joker,
          is_image_blurred: q.is_image_blurred ?? false,
          slider_min: q.type === "slider" ? q.slider_min : null,
          slider_max: q.type === "slider" ? q.slider_max : null,
          slider_tolerance:
            q.type === "slider" ? (q.slider_tolerance ?? null) : null,
          video_url:
            q.type === "video_question" ? q.video_url || null : null,
          video_start_seconds:
            q.type === "video_question" ? q.video_start_seconds : null,
          video_end_seconds:
            q.type === "video_question" ? q.video_end_seconds : null,
          audio_url:
            q.type === "audio_question" ? q.audio_url || null : null,
        }));

        const newIds = await insertBankQuestions(rows);

        const order: Record<string, number> = {};
        newIds.forEach((id: string, idx: number) => {
          order[id] = idx;
        });

        await updateTemplateQuestions(quizId, title.trim(), newIds, order);

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } catch {
        // Silent fail for auto-save
      } finally {
        setSaving(false);
      }
    }, 500);
  }, [questions, title, quizId]);

  const handleQuestionChange = useCallback(
    (index: number, updated: QuestionFormData) => {
      setQuestions((prev) => prev.map((q, i) => (i === index ? updated : q)));
      triggerSave();
    },
    [triggerSave]
  );

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      triggerSave();
    },
    [triggerSave]
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
      triggerSave();
    },
    [selectedIndex, triggerSave]
  );

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createEmptyQuestion()]);
    setSelectedIndex(questions.length);
  };

  const handleRunNow = async () => {
    setRunLoading(true);
    try {
      // Save first
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      const hostId = getHostId();
      const { questions: bankQuestions } = await loadQuizTemplate(quizId);

      if (bankQuestions.length === 0) {
        setError("Add at least one question before running.");
        setRunLoading(false);
        return;
      }

      const room = await createRoom(hostId);
      const quiz = await createQuiz(room.id, title.trim());

      const questionRows = bankQuestions.map((q, idx) => ({
        quiz_id: quiz.id,
        type: q.type,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        time_limit: q.time_limit,
        points_base: q.points_base,
        order_index: idx,
        image_url: q.image_url,
        is_joker: q.is_joker,
        is_image_blurred: q.is_image_blurred ?? false,
        slider_min: q.slider_min,
        slider_max: q.slider_max,
        video_url: q.video_url,
        video_start_seconds: q.video_start_seconds,
        video_end_seconds: q.video_end_seconds,
        audio_url: q.audio_url,
      }));

      await insertRoomQuestions(questionRows);
      await markTemplateAsRun(quizId);

      toast.success("Quiz ready! Heading to lobby…");
      router.push(`/host/${room.room_code}?templateId=${quizId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to run quiz.";
      setError(msg);
      toast.error(msg);
      setRunLoading(false);
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
      if (selectedIndex === oldIndex) {
        setSelectedIndex(newIndex);
      } else if (oldIndex < selectedIndex && newIndex >= selectedIndex) {
        setSelectedIndex((prev) => prev - 1);
      } else if (oldIndex > selectedIndex && newIndex <= selectedIndex) {
        setSelectedIndex((prev) => prev + 1);
      }
      triggerSave();
    }
  };

  const selected = questions[selectedIndex];

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

  if (error && !questions.length) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">{error}</h1>
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

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      {/* Top Nav Bar */}
      <header className="bg-surface-bright flex justify-between items-center w-full px-6 py-3 border-b border-primary/10 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push("/host/dashboard")}
            className="flex items-center gap-1 text-sm font-bold text-outline hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              arrow_back
            </span>
            Dashboard
          </button>
          <div className="h-8 w-px bg-outline-variant/30" />
          <input
            className="bg-transparent border-none font-bold text-primary-container p-0 focus:ring-0 focus:outline-none text-sm tracking-tight w-64"
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Quiz title..."
          />
          {saving && (
            <span className="text-[10px] text-outline font-bold uppercase tracking-widest">
              Saving...
            </span>
          )}
          {saveSuccess && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest"
            >
              Saved
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={handleRunNow}
            disabled={runLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            className="bg-secondary-container text-white px-6 py-2.5 rounded-xl font-extrabold text-sm shadow-[0px_10px_20px_rgba(255,107,107,0.2)] disabled:opacity-50"
          >
            {runLoading ? "Starting..." : "Run Now"}
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
          <div className="p-4 bg-surface-container-low border-t border-outline-variant/10">
            <motion.button
              onClick={addQuestion}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full py-4 rounded-xl bg-primary text-on-primary font-bold flex items-center justify-center gap-2 shadow-[0px_10px_20px_rgba(2,21,73,0.1)]"
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

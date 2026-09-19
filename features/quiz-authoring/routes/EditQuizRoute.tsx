"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
import CSVImportButton from "@/features/quiz-authoring/components/CSVImportButton";
import { supabase } from "@/integrations/supabase/client";

async function getAuthOwnerId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}


function createEmptyQuestion(): QuestionFormData {
  return {
    type: "multiple_choice",
    question_text: "",
    options: ["", "", "", ""],
    correct_answer: "",
    time_limit: 15,
    image_url: "",
    is_joker: false,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Debounced auto-save. Guarded so overlapping triggers (fast typing,
  // switching questions quickly) never run two saves at once, and ordered
  // insert-then-delete so a failed insert can never leave the quiz empty.
  const savingRef = useRef(false);
  const pendingSaveRef = useRef(false);

  const triggerSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void runSave();
    }, 500);
  }, [questions, title, quizId]);

  const runSave = useCallback(async () => {
    if (savingRef.current) {
      // A save is already in flight — remember to run again once it's done
      // so we never drop the latest edits.
      pendingSaveRef.current = true;
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const hostId = getHostId();
      const ownerId = await getAuthOwnerId();
      const validQuestions = questions.filter(
        (q) => q.question_text.trim().length > 0
      );

      if (validQuestions.length === 0) {
        return;
      }

      const rows = validQuestions.map((q) => ({
        host_id: hostId,
        owner_id: ownerId,
        type: q.type,
        question_text: q.question_text.trim(),
        options:
          q.type === "multiple_choice" ||
            q.type === "image_question" ||
            q.type === "true_false"
            ? q.options
            : null,
        correct_answer: q.correct_answer.trim(),
        time_limit: q.time_limit,
        points_base: 1000,
        image_url: q.image_url || null,
        is_joker: q.is_joker,
        is_image_blurred: q.is_image_blurred ?? false,
      }));

      // Insert the NEW rows first. Only once that (and the template pointer
      // update) has succeeded do we delete the old bank rows — this way a
      // failed insert never leaves the quiz with zero questions.
      const newIds = await insertBankQuestions(rows);

      const order: Record<string, number> = {};
      newIds.forEach((id: string, idx: number) => {
        order[id] = idx;
      });

      const { template: currentTemplate } = await loadQuizTemplate(quizId);
      const oldIds = currentTemplate.question_ids || [];

      await updateTemplateQuestions(quizId, title.trim(), newIds, order);

      if (oldIds.length > 0) {
        await deleteBankQuestions(oldIds);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `Failed to auto-save: ${err.message}`
          : "Failed to auto-save. Your changes might not be saved — please try again."
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        void runSave();
      }
    }
  }, [questions, title, quizId]);

  // If the user navigates away while a debounced save is still pending,
  // flush it immediately instead of losing the last edit.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        void runSave();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

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

  const handleCsvImport = useCallback(
    (imported: QuestionFormData[]) => {
      setQuestions((prev) => {
        const base =
          prev.length === 1 && prev[0].question_text.trim() === "" ? [] : prev;
        const merged = [...base, ...imported];
        setSelectedIndex(base.length);
        return merged;
      });
      triggerSave();
    },
    [triggerSave]
  );

  const handleRunNow = async () => {
    setRunLoading(true);
    try {
      // Flush any pending debounced save so "Run Now" always uses the
      // latest edits instead of a stale snapshot from the database.
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      await runSave();

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
      <header className="bg-surface-bright flex flex-wrap justify-between items-center w-full px-4 sm:px-6 py-3 border-b border-primary/10 sticky top-0 z-50 gap-y-3">
        <div className="flex items-center gap-2 sm:gap-6 w-full sm:w-auto overflow-hidden">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 -ml-1.5 rounded-lg text-outline hover:bg-surface-container hover:text-primary transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[24px]">
              {isMobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
          
          <button
            onClick={() => router.push("/host/dashboard")}
            className="flex items-center gap-1 text-sm font-bold text-outline hover:text-primary transition-colors flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">
              arrow_back
            </span>
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <div className="min-h-[32px] self-stretch w-px bg-outline-variant/30 flex-shrink-0" />
          <input
            className="bg-transparent border-none font-bold text-primary-container p-0 focus:ring-0 focus:outline-none text-sm tracking-tight w-full flex-1 sm:min-w-[256px]"
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
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <motion.button
            onClick={handleRunNow}
            disabled={runLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            className="bg-secondary-container text-white px-4 sm:px-6 py-2.5 rounded-xl font-extrabold text-sm shadow-[0px_10px_20px_rgba(255,107,107,0.2)] disabled:opacity-50 flex-1 sm:flex-none"
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
        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-[#0D1722]/80 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Left Sidebar: Question List */}
        <aside
          className={`
            fixed top-0 left-0 bottom-0 z-50 w-72 sm:w-80 bg-surface-container-low flex flex-col border-r border-outline-variant/10 shadow-2xl transition-transform duration-300
            ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
            md:static md:translate-x-0 md:w-80 md:h-[calc(100vh-65px)] md:shadow-none md:z-0 flex-shrink-0
          `}
        >
          <div className="p-4 md:p-6 flex justify-between items-center border-b border-outline-variant/10 md:border-b-0">
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
              <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4 md:pb-24">
                {questions.map((q, idx) => (
                  <SortableQuestionCard
                    key={idx}
                    id={String(idx)}
                    question={q}
                    index={idx}
                    isSelected={idx === selectedIndex}
                    onClick={() => {
                      setSelectedIndex(idx);
                      setIsMobileMenuOpen(false);
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <div className="p-4 bg-surface-container-low border-t border-outline-variant/10 space-y-3 shrink-0">
            <motion.button
              onClick={addQuestion}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full py-3 md:py-4 rounded-xl bg-primary text-on-primary font-bold flex items-center justify-center gap-2 shadow-[0px_10px_20px_rgba(2,21,73,0.1)] text-sm md:text-base"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Add Question
            </motion.button>
            <CSVImportButton onImport={handleCsvImport} />
          </div>
        </aside>

        {/* Main: Question Editor */}
        <main className="flex-1 bg-surface p-4 sm:p-8 overflow-y-auto min-h-[50vh]">
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

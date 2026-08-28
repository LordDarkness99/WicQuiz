"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { createRoom, createQuiz, insertRoomQuestions } from "@/features/live-room";
import { getHostId } from "@/shared/hostIdentity";
import {
  getQuizTemplates,
  deleteQuizTemplate,
  duplicateQuizTemplate,
  loadQuizTemplate,
  markTemplateAsRun,
  incrementQuestionBankUsage,
  type QuizTemplate,
} from "@/features/quiz-authoring";
import {
  getSessionResults,
  type SessionResult,
} from "@/features/session-results";
import { QuizCardSkeleton, StatCardSkeleton } from "@/shared/ui/Skeleton";

export default function DashboardPage() {
  const router = useRouter();
  const [hostId, setHostId] = useState("");
  const [templates, setTemplates] = useState<QuizTemplate[]>([]);
  const [sessions, setSessions] = useState<SessionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Stats
  const totalQuizzes = templates.length;
  const totalGames = sessions.length;
  const totalPlayers = sessions.reduce((sum, s) => sum + s.player_count, 0);

  useEffect(() => {
    const id = getHostId();
    setHostId(id);

    async function load() {
      try {
        const [t, s] = await Promise.all([
          getQuizTemplates(), // shows all quizzes — internal tool
          getSessionResults(id),
        ]);
        setTemplates(t);
        setSessions(s);
      } catch {
        // Silently handle - empty state will show
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const handleRunQuiz = useCallback(
    async (template: QuizTemplate) => {
      setActionLoading(template.id);
      try {
        const { questions } = await loadQuizTemplate(template.id);
        if (questions.length === 0) {
          toast.warning("This quiz has no questions — edit it first.");
          setActionLoading(null);
          return;
        }

        const room = await createRoom(hostId);

        const quiz = await createQuiz(room.id, template.title);

        const questionRows = questions.map((q, idx) => ({
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
          slider_min: q.slider_min,
          slider_max: q.slider_max,
          video_url: q.video_url,
          video_start_seconds: q.video_start_seconds,
          video_end_seconds: q.video_end_seconds,
          audio_url: q.audio_url,
        }));

        await insertRoomQuestions(questionRows);

        // Increment question bank usage
        for (const q of questions) {
          await incrementQuestionBankUsage(q.id, q.times_used || 0);
        }

        await markTemplateAsRun(template.id);
        toast.success(`"${template.title}" — room created! Heading to lobby…`);
        router.push(`/host/${room.room_code}?templateId=${template.id}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to run quiz.");
        setActionLoading(null);
      }
    },
    [hostId, router]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this quiz? This cannot be undone.")) return;
      setActionLoading(id);
      try {
        await deleteQuizTemplate(id);
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        toast.success("Quiz deleted.");
      } catch {
        toast.error("Failed to delete quiz.");
      } finally {
        setActionLoading(null);
      }
    },
    []
  );

  const handleDuplicate = useCallback(
    async (id: string) => {
      setActionLoading(id);
      try {
        const newId = await duplicateQuizTemplate(id, hostId);
        const refreshed = await getQuizTemplates(hostId);
        setTemplates(refreshed);
        // Navigate to edit the duplicate
        router.push(`/host/quiz/${newId}/edit`);
      } catch {
        toast.error("Failed to duplicate quiz.");
      } finally {
        setActionLoading(null);
      }
    },
    [hostId, router]
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface text-on-surface">
        <header className="bg-surface-bright border-b border-primary/10 px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <span className="text-xl font-bold text-primary-container tracking-tighter">QuizTime</span>
            <div className="h-8 w-px bg-outline-variant/30" />
            <span className="text-sm font-bold text-primary">Dashboard</span>
          </div>
          <div className="w-24 h-10 bg-surface-container-high rounded-xl animate-pulse" />
        </header>
        <main className="max-w-7xl mx-auto px-8 py-8">
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[0, 1, 2].map((i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <QuizCardSkeleton key={i} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Header */}
      <header className="bg-surface-bright border-b border-primary/10 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <span
            className="text-xl font-bold text-primary-container tracking-tighter cursor-pointer"
            onClick={() => router.push("/")}
          >
            QuizTime
          </span>
          <div className="h-8 w-px bg-outline-variant/30" />
          <span className="text-sm font-bold text-primary">Dashboard</span>
        </div>
        <motion.button
          onClick={() => router.push("/host/new")}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          className="bg-secondary-container text-on-secondary-container px-6 py-2.5 rounded-xl font-extrabold text-sm shadow-[0px_10px_20px_rgba(255,107,107,0.2)] flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Quiz
        </motion.button>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats Bar */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 mb-8 grid grid-cols-3 divide-x divide-outline-variant/10">
          {[
            { label: "Quizzes Created", value: totalQuizzes, icon: "quiz" },
            { label: "Games Played", value: totalGames, icon: "sports_esports" },
            { label: "Total Players", value: totalPlayers, icon: "group" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 px-6 py-4">
              <span className="material-symbols-outlined text-outline">
                {stat.icon}
              </span>
              <div>
                <p className="text-2xl font-black text-primary leading-none">
                  {stat.value}
                </p>
                <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
                  {stat.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: My Quizzes */}
          <section className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-bold text-primary">My Quizzes</h2>
              {templates.length > 0 && (
                <span className="text-xs font-bold text-outline bg-surface-container px-2 py-0.5 rounded-full">
                  {templates.length}
                </span>
              )}
            </div>
            {templates.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-surface-container-lowest rounded-xl border-2 border-dashed border-outline-variant/30 p-12 text-center"
              >
                <span className="material-symbols-outlined text-[64px] text-outline/30 mb-4 block">
                  lightbulb
                </span>
                <h3 className="text-xl font-bold text-primary mb-2">
                  Create your first quiz
                </h3>
                <p className="text-outline mb-6 max-w-sm mx-auto">
                  Build a quiz with multiple question types, then run it live with your team. It takes about 5 minutes.
                </p>
                <motion.button
                  onClick={() => router.push("/host/new")}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-secondary-container text-on-secondary-container px-8 py-3 rounded-xl font-extrabold shadow-[0px_10px_20px_rgba(255,107,107,0.2)] inline-flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  New Quiz
                </motion.button>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {templates.map((t, i) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-5 flex items-center gap-4 group hover:shadow-md transition-shadow"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-primary truncate">
                            {t.title}
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              t.is_draft
                                ? "bg-tertiary-fixed/30 text-on-tertiary-fixed-variant"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {t.is_draft ? "Draft" : "Ready"}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-outline">
                          <span>
                            {(t.question_ids || []).length} question
                            {(t.question_ids || []).length !== 1 ? "s" : ""}
                          </span>
                          <span>Run {t.times_run}x</span>
                          <span>Last run: {formatDate(t.last_run_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleRunQuiz(t)}
                          disabled={actionLoading === t.id}
                          className="px-4 py-2 bg-secondary-container text-on-secondary-container rounded-lg text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            play_arrow
                          </span>
                          {actionLoading === t.id ? "Starting…" : "Run"}
                        </button>
                        <button
                          onClick={() => router.push(`/host/quiz/${t.id}/edit`)}
                          className="px-3 py-2 bg-surface-container-high rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container-highest transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDuplicate(t.id)}
                          disabled={actionLoading === t.id}
                          title="Duplicate"
                          aria-label="Duplicate quiz"
                          className="w-9 h-9 grid place-items-center bg-surface-container-high rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-colors disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[18px]">content_copy</span>
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          disabled={actionLoading === t.id}
                          title="Delete"
                          aria-label="Delete quiz"
                          className="w-9 h-9 grid place-items-center bg-error/10 rounded-lg text-error hover:bg-error/20 transition-colors disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>

          {/* Right: Recent Sessions */}
          <section>
            <h2 className="text-lg font-bold text-primary mb-4">
              Recent Sessions
            </h2>
            {sessions.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-8 text-center">
                <span className="material-symbols-outlined text-[32px] text-outline/30 block mb-2">
                  history
                </span>
                <p className="text-sm text-outline">
                  No games played yet. Run a quiz to see results here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.slice(0, 5).map((s, i) => {
                  const winner =
                    s.final_leaderboard && s.final_leaderboard.length > 0
                      ? s.final_leaderboard[0].player_name
                      : null;
                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() =>
                        router.push(`/host/results/${s.id}`)
                      }
                      className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-4 cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <h4 className="font-bold text-primary text-sm truncate">
                        {s.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-outline">
                        <span>{formatDate(s.finished_at || s.created_at)}</span>
                        <span>{s.player_count} players</span>
                      </div>
                      {winner && (
                        <div className="mt-2 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-tertiary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>
                            emoji_events
                          </span>
                          <span className="text-xs font-bold text-tertiary-fixed-dim">
                            {winner}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

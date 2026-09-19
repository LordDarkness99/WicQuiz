"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { createRoom, createQuiz, insertRoomQuestions } from "@/features/live-room";
import { getHostId, setHostId as setStoredHostId, clearHostId } from "@/shared/hostIdentity";
import {
  getQuizTemplates,
  deleteQuizTemplate,
  duplicateQuizTemplate,
  loadQuizTemplate,
  markTemplateAsRun,
  incrementQuestionBankUsage,
  getActiveRoomsForHost,
  type QuizTemplate,
  type ActiveRoomInfo,
} from "@/features/quiz-authoring";
import {
  getSessionResults,
  type SessionResult,
} from "@/features/session-results";
import { QuizCardSkeleton, StatCardSkeleton } from "@/shared/ui/Skeleton";
import { getCurrentUser } from "@/features/auth";
import { HostHeader } from "@/shared/ui/HostHeader";

export default function DashboardPage() {
  const router = useRouter();
  const [hostId, setHostId] = useState("");
  const [templates, setTemplates] = useState<QuizTemplate[]>([]);
  const [sessions, setSessions] = useState<SessionResult[]>([]);
  const [activeRooms, setActiveRooms] = useState<ActiveRoomInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [quizToDelete, setQuizToDelete] = useState<QuizTemplate | null>(null);

  // Stats
  const totalQuizzes = templates.length;
  const totalGames = sessions.length;
  const totalPlayers = sessions.reduce((sum, s) => sum + s.player_count, 0);

  useEffect(() => {
    async function load() {
      try {
        const currentUser = await getCurrentUser();
        const effectiveId = currentUser?.id || getHostId();
        setHostId(effectiveId);
        if (currentUser?.id) {
          setStoredHostId(currentUser.id);
        }

        const [t, s, rooms] = await Promise.all([
          getQuizTemplates(effectiveId),
          getSessionResults(effectiveId),
          getActiveRoomsForHost(effectiveId),
        ]);
        setTemplates(t);
        setSessions(s);
        setActiveRooms(rooms);
      } catch {
        // Silently handle - empty state will show
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // Keep the "N players joined" count on active-room cards fresh without
  // requiring a manual page refresh — poll while the host is on this page.
  useEffect(() => {
    if (!hostId) return;
    const interval = setInterval(async () => {
      try {
        const rooms = await getActiveRoomsForHost(hostId);
        setActiveRooms(rooms);
      } catch {
        // Ignore transient polling errors; next tick will retry.
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [hostId]);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-quiz-menu]")) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard accessibility: close modal or dropdown on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (quizToDelete) setQuizToDelete(null);
        if (openMenuId) setOpenMenuId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [quizToDelete, openMenuId]);

  const handleRunQuiz = useCallback(
    async (template: QuizTemplate) => {
      // If room for this quiz is already active, go straight to it!
      const existingRoom = activeRooms.find((r) => r.quiz_title === template.title);
      if (existingRoom) {
        toast.info(`Room for "${template.title}" is already running (${existingRoom.room_code}). Joining room…`);
        router.push(`/host/${existingRoom.room_code}`);
        return;
      }

      setActionLoading(template.id);
      try {
        const { questions } = await loadQuizTemplate(template.id);
        if (questions.length === 0) {
          toast.warning("This quiz has no questions — please edit the quiz first.");
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
        toast.success(`"${template.title}" — room successfully created! Heading to lobby…`);
        router.push(`/host/${room.room_code}?templateId=${template.id}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to run quiz.");
        setActionLoading(null);
      }
    },
    [hostId, router, activeRooms]
  );

  const handleConfirmDelete = useCallback(
    async () => {
      if (!quizToDelete) return;
      const id = quizToDelete.id;
      setActionLoading(id);
      try {
        await deleteQuizTemplate(id);
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        toast.success(`Quiz "${quizToDelete.title}" successfully deleted.`);
        setQuizToDelete(null);
      } catch {
        toast.error("Failed to delete quiz.");
      } finally {
        setActionLoading(null);
      }
    },
    [quizToDelete]
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
      <div className="min-h-screen bg-[#0D1722] text-[#F8FAFC]">
        <HostHeader />
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
    <div className="min-h-screen bg-[#0D1722] text-[#F8FAFC] selection:bg-[#B88B4A] selection:text-[#0D1722]">
      <HostHeader />

      <main className="max-w-7xl mx-auto px-6 sm:px-8 py-8" data-aos="fade-in">
        {/* Stats Bar */}
        <div data-aos="fade-up" className="tactical-card rounded-2xl border border-[#283E58]/60 bg-[#121F2E] mb-8 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#283E58]/60">
          {[
            { label: "Quizzes Created", value: totalQuizzes, icon: "quiz", color: "text-[#B88B4A]" },
            { label: "Games Played", value: totalGames, icon: "sports_esports", color: "text-[#4ADE80]" },
            { label: "Total Players", value: totalPlayers, icon: "group", color: "text-[#60A5FA]" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-4 px-6 py-5">
              <div className="w-12 h-12 rounded-xl bg-[#1C2D42] border border-[#283E58] flex items-center justify-center">
                <span className={`material-symbols-outlined text-[24px] ${stat.color}`}>
                  {stat.icon}
                </span>
              </div>
              <div>
                <p className="text-3xl font-black text-[#F8FAFC] leading-none">
                  {stat.value}
                </p>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#94A3B8] mt-1 block">
                  {stat.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: My Quizzes */}
          <section className="lg:col-span-2" data-aos="fade-right" data-aos-delay="100">
            <div className="flex items-center gap-2.5 mb-4">
              <h2 className="text-lg font-black text-[#F8FAFC] tracking-tight">My Quizzes</h2>
              {templates.length > 0 && (
                <span className="text-xs font-mono font-bold text-[#B88B4A] bg-[#B88B4A]/10 border border-[#B88B4A]/25 px-2 py-0.5 rounded-full">
                  {templates.length}
                </span>
              )}
            </div>
            {templates.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="tactical-card rounded-2xl border-2 border-dashed border-[#283E58] p-12 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#1C2D42] border border-[#B88B4A]/30 flex items-center justify-center mx-auto mb-4 text-[#B88B4A]">
                  <span className="material-symbols-outlined text-[32px]">
                    lightbulb
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-[#F8FAFC] mb-2">
                  Create your first quiz
                </h3>
                <p className="text-[#94A3B8] mb-6 max-w-sm mx-auto text-sm leading-relaxed">
                  Build a quiz with multiple question types, then launch it live for your team. It takes less than 5 minutes.
                </p>
                <motion.button
                  onClick={() => router.push("/host/new")}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-[#B88B4A] text-[#0D1722] hover:bg-[#D4A76A] px-7 py-3 rounded-xl font-black text-xs shadow-[0_4px_18px_rgba(184,139,74,0.25)] inline-flex items-center gap-1.5 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Create Quiz Now
                </motion.button>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {/* Active Rooms Banner */}
                {activeRooms.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-[#2E5339] bg-gradient-to-r from-[#2E5339]/25 via-[#121F2E] to-[#2E5339]/15 p-4 mb-3"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ADE80] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#4ADE80]" />
                      </span>
                      <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#4ADE80]">
                        {activeRooms.length} Active Game Arena
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activeRooms.map((room) => (
                        <button
                          key={room.id}
                          onClick={() => router.push(`/host/${room.room_code}`)}
                          className="flex items-center gap-2 px-3 py-2 bg-[#142232] rounded-xl border border-[#283E58] hover:border-[#4ADE80]/50 hover:shadow-xs transition-all text-xs"
                        >
                          <span className="material-symbols-outlined text-[14px] text-[#4ADE80]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            sensors
                          </span>
                          <span className="font-bold text-[#F8FAFC]">
                            {room.quiz_title || room.room_code}
                          </span>
                          <span className="font-mono text-[#D4A76A] bg-[#1C2D42] px-1.5 py-0.5 rounded border border-[#283E58]">
                            {room.room_code}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${room.status === "active"
                              ? "bg-error/20 text-error border border-error/30"
                              : "bg-[#2E5339]/40 text-[#4ADE80] border border-[#2E5339]"
                            }`}>
                            {room.status === "active" ? "LIVE" : "Lobby"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
                <AnimatePresence>
                  {templates.map((t, i) => {
                    // Check if this template has a running room (match by title)
                    const runningRoom = activeRooms.find(
                      (r) => r.quiz_title === t.title
                    );
                    const isRunning = !!runningRoom;
                    return (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: i * 0.05 }}
                        className={`relative rounded-2xl border p-5 flex items-center gap-4 group transition-all overflow-visible ${isRunning
                            ? "border-[#2E5339] bg-gradient-to-r from-[#2E5339]/20 via-[#121F2E] to-[#1C2D42]/30 shadow-[0_4px_24px_rgba(46,83,57,0.25)] ring-1 ring-[#2E5339]/40"
                            : "border-[#283E58]/60 bg-[#121F2E] hover:border-[#B88B4A]/40 hover:shadow-lg"
                          }`}
                      >
                        {/* Running vertical glow strip */}
                        {isRunning && (
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#2E5339] via-[#4ADE80] to-[#B88B4A] rounded-l-2xl" />
                        )}
                        <div className="flex-1 min-w-0 pl-1">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <h3 className="font-extrabold text-[#F8FAFC] text-base truncate">
                              {t.title}
                            </h3>
                            {isRunning ? (
                              <span className="flex items-center gap-1.5 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#2E5339]/40 text-[#4ADE80] border border-[#2E5339] shadow-xs">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ADE80] opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4ADE80]" />
                                </span>
                                LIVE · {runningRoom.status === "active" ? "Running" : "Lobby Open"}
                              </span>
                            ) : (
                              <span
                                className={`text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-md border tracking-wider uppercase ${t.is_draft
                                    ? "bg-[#B88B4A]/15 text-[#B88B4A] border-[#B88B4A]/40"
                                    : "bg-[#1E3726] text-[#4ADE80] border-[#2E5339] shadow-xs font-black"
                                  }`}
                              >
                                {t.is_draft ? "Draft" : "Ready"}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-[#94A3B8] flex-wrap">
                            <span className="font-medium">
                              {(t.question_ids || []).length} questions
                            </span>
                            <span>•</span>
                            <span>Played {t.times_run}x</span>
                            {isRunning ? (
                              <>
                                <span>•</span>
                                {/* Player count indicator with icon */}
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#2E5339]/20 text-[#4ADE80] font-bold text-xs border border-[#2E5339]/40">
                                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    person
                                  </span>
                                  {runningRoom.player_count} players joined
                                </span>
                                <span className="font-mono text-[#D4A76A] bg-[#142232] px-2 py-0.5 rounded text-[11px] font-bold border border-[#283E58]">
                                  Code: {runningRoom.room_code}
                                </span>
                              </>
                            ) : (
                              <>
                                <span>•</span>
                                <span>Last run: {formatDate(t.last_run_at)}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action buttons: 1 Main action (Run or Join Room) + 1 Menu Dropdown button */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isRunning ? (
                            <button
                              onClick={() => router.push(`/host/${runningRoom.room_code}`)}
                              className="px-4 py-2 bg-gradient-to-r from-[#2E5339] to-[#3D6E4C] text-white border border-[#4ADE80]/40 rounded-xl text-xs font-black hover:opacity-95 transition-all inline-flex items-center gap-1.5 shadow-[0_0_15px_rgba(46,83,57,0.35)]"
                              title="Join running room"
                            >
                              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                sensors
                              </span>
                              Join Room
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRunQuiz(t)}
                              disabled={actionLoading === t.id}
                              className="px-4 py-2 bg-[#B88B4A] text-[#0D1722] hover:bg-[#D4A76A] rounded-xl text-xs font-black transition-all disabled:opacity-50 inline-flex items-center gap-1.5 shadow-[0_2px_10px_rgba(184,139,74,0.2)]"
                              title="Run this quiz"
                            >
                              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                play_arrow
                              </span>
                              {actionLoading === t.id ? "Starting…" : "Run"}
                            </button>
                          )}

                          {/* Combined Settings/Action Menu */}
                          <div className="relative" data-quiz-menu>
                            <button
                              onClick={() => setOpenMenuId(openMenuId === t.id ? null : t.id)}
                              aria-expanded={openMenuId === t.id}
                              aria-label="Quiz options"
                              title="Options"
                              className={`w-9 h-9 grid place-items-center rounded-xl transition-all ${openMenuId === t.id
                                  ? "bg-[#B88B4A] text-[#0D1722] shadow-sm"
                                  : "bg-[#142232] text-[#94A3B8] border border-[#283E58] hover:border-[#B88B4A]/50 hover:text-white"
                                }`}
                            >
                              <span className="material-symbols-outlined text-[20px]">more_vert</span>
                            </button>

                            {/* Dropdown Menu Popover */}
                            <AnimatePresence>
                              {openMenuId === t.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute right-0 top-full mt-2 w-48 bg-[#121F2E] border border-[#283E58] rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.5)] p-1.5 z-40 flex flex-col gap-0.5"
                                >
                                  <button
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      router.push(`/host/quiz/${t.id}/edit`);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#F8FAFC] hover:bg-[#1C2D42] hover:text-[#B88B4A] transition-colors text-left"
                                  >
                                    <span className="material-symbols-outlined text-[18px] text-[#B88B4A]">
                                      edit
                                    </span>
                                    Edit Questions
                                  </button>

                                  <button
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      handleDuplicate(t.id);
                                    }}
                                    disabled={actionLoading === t.id}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#F8FAFC] hover:bg-[#1C2D42] hover:text-[#B88B4A] transition-colors text-left disabled:opacity-50"
                                  >
                                    <span className="material-symbols-outlined text-[18px] text-[#B88B4A]">
                                      content_copy
                                    </span>
                                    Duplicate
                                  </button>

                                  <div className="h-px bg-[#283E58] my-1" />

                                  <button
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      if (isRunning) {
                                        toast.warning("Stop the quiz first before deleting it.");
                                        return;
                                      }
                                      setQuizToDelete(t);
                                    }}
                                    disabled={isRunning}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-error hover:bg-error/15 transition-colors text-left disabled:opacity-40"
                                  >
                                    <span className="material-symbols-outlined text-[18px] text-error">
                                      delete
                                    </span>
                                    Delete Quiz
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </section>

          {/* Right: Recent Sessions */}
          <section data-aos="fade-left" data-aos-delay="100">
            <h2 className="text-lg font-black text-[#F8FAFC] tracking-tight mb-4">
              Recent Sessions
            </h2>
            {sessions.length === 0 ? (
              <div className="tactical-card rounded-2xl border border-[#283E58]/60 bg-[#121F2E] p-8 text-center">
                <span className="material-symbols-outlined text-[32px] text-[#64748B] block mb-2">
                  history
                </span>
                <p className="text-sm text-[#94A3B8]">
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
                      className="tactical-card rounded-2xl border border-[#283E58]/60 bg-[#121F2E] p-4 cursor-pointer hover:border-[#B88B4A]/50 hover:shadow-md transition-all"
                    >
                      <h4 className="font-extrabold text-[#F8FAFC] text-sm truncate">
                        {s.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-[#94A3B8]">
                        <span>{formatDate(s.finished_at || s.created_at)}</span>
                        <span>•</span>
                        <span>{s.player_count} players</span>
                      </div>
                      {winner && (
                        <div className="mt-2.5 flex items-center gap-1.5 pt-2 border-t border-[#283E58]/40">
                          <span className="material-symbols-outlined text-[16px] text-[#B88B4A]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            emoji_events
                          </span>
                          <span className="text-xs font-bold text-[#D4A76A]">
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

      {/* Accessible Custom Delete Quiz Modal */}
      <AnimatePresence>
        {quizToDelete && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-quiz-dialog-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !actionLoading && setQuizToDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-surface-container-lowest rounded-3xl border border-outline-variant/20 shadow-[0_24px_64px_rgba(27,43,94,0.2)] p-6 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-error/10 text-error flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-[32px]">delete_forever</span>
              </div>
              <h3 id="delete-quiz-dialog-title" className="text-xl font-extrabold text-primary mb-2">
                Delete Quiz?
              </h3>
              <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                Are you sure you want to delete the quiz{" "}
                <strong className="text-primary">"{quizToDelete.title}"</strong>? All questions in this quiz will be deleted and this action cannot be undone.
              </p>
              <div className="flex items-center gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setQuizToDelete(null)}
                  disabled={!!actionLoading}
                  className="flex-1 py-3 px-4 rounded-xl border border-outline-variant/30 text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={!!actionLoading}
                  className="flex-1 py-3 px-4 rounded-xl bg-error text-white text-sm font-extrabold shadow-[0_6px_20px_rgba(186,26,26,0.25)] hover:bg-error/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionLoading === quizToDelete.id ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                      Yes, Delete Quiz
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

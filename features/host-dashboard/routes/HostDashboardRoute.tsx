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
import { getCurrentUser, logoutUser } from "@/features/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [hostId, setHostId] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [templates, setTemplates] = useState<QuizTemplate[]>([]);
  const [sessions, setSessions] = useState<SessionResult[]>([]);
  const [activeRooms, setActiveRooms] = useState<ActiveRoomInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
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
        if (currentUser) {
          setUserEmail(currentUser.email);
          setUserDisplayName(currentUser.displayName || null);
        }
      } catch {
        // Silently handle - empty state will show
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      clearHostId();
      const { error } = await logoutUser();
      if (error) {
        toast.error("Gagal logout: " + error);
        setLoggingOut(false);
        return;
      }
      toast.success("Berhasil logout. Sampai jumpa! 👋");
      router.push("/auth/login");
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan saat logout.");
      setLoggingOut(false);
    }
  }, [router]);

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
        toast.info(`Room untuk "${template.title}" sudah berjalan (${existingRoom.room_code}). Masuk ke room…`);
        router.push(`/host/${existingRoom.room_code}`);
        return;
      }

      setActionLoading(template.id);
      try {
        const { questions } = await loadQuizTemplate(template.id);
        if (questions.length === 0) {
          toast.warning("Quiz ini belum memiliki pertanyaan — edit quiz terlebih dahulu.");
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
        toast.success(`"${template.title}" — room berhasil dibuat! Menuju lobby…`);
        router.push(`/host/${room.room_code}?templateId=${template.id}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal menjalankan quiz.");
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
        toast.success(`Quiz "${quizToDelete.title}" berhasil dihapus.`);
        setQuizToDelete(null);
      } catch {
        toast.error("Gagal menghapus quiz.");
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
      <div className="min-h-screen bg-surface text-on-surface">
        <header className="bg-surface-bright border-b border-primary/10 px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <span className="text-xl font-bold text-primary-container tracking-tighter">QuizTime</span>
            <div className="h-8 w-px bg-outline-variant/30" />
            <span className="text-sm font-bold text-primary">Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-24 h-10 bg-surface-container-high rounded-xl animate-pulse" />
            <div className="w-20 h-10 bg-surface-container-high rounded-xl animate-pulse" />
          </div>
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
        <div className="flex items-center gap-3">
          {/* History link */}
          <button
            onClick={() => router.push("/host/history")}
            title="Quiz History"
            aria-label="Lihat riwayat quiz"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-sm text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            <span className="hidden sm:inline">History</span>
          </button>
          {/* User info -> profile */}
          {userEmail && (
            <button
              onClick={() => router.push("/host/profile")}
              title="My Profile"
              aria-label="Lihat profil saya"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-xl border border-outline-variant/20 hover:border-primary/30 hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-outline">account_circle</span>
              <span className="text-xs font-medium text-on-surface-variant truncate max-w-[140px]">
                {userDisplayName || userEmail}
              </span>
            </button>
          )}
          <motion.button
            onClick={() => router.push("/host/new")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            className="bg-secondary-container text-on-secondary-container px-6 py-2.5 rounded-xl font-extrabold text-sm shadow-[0px_10px_20px_rgba(255,107,107,0.2)] flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Quiz
          </motion.button>
          {/* Logout button */}
          <motion.button
            id="logout-button"
            onClick={handleLogout}
            disabled={loggingOut}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            title="Logout"
            aria-label="Logout dari akun"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm border border-outline-variant/30 text-on-surface-variant hover:bg-error/10 hover:text-error hover:border-error/30 transition-colors disabled:opacity-50"
          >
            {loggingOut ? (
              <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[18px]">logout</span>
            )}
            <span className="hidden sm:inline">{loggingOut ? "Keluar..." : "Logout"}</span>
          </motion.button>
        </div>
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
                {/* Active Rooms Banner */}
                {activeRooms.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-secondary-container/30 bg-gradient-to-r from-secondary-container/15 via-primary/5 to-secondary-container/10 p-4 mb-2"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error" />
                      </span>
                      <span className="text-xs font-black uppercase tracking-widest text-error">
                        {activeRooms.length} Room Aktif
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activeRooms.map((room) => (
                        <button
                          key={room.id}
                          onClick={() => router.push(`/host/${room.room_code}`)}
                          className="flex items-center gap-2 px-3 py-2 bg-surface-container-lowest rounded-lg border border-outline-variant/20 hover:border-primary/30 hover:shadow-sm transition-all text-xs"
                        >
                          <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                            sensors
                          </span>
                          <span className="font-bold text-primary">
                            {room.quiz_title || room.room_code}
                          </span>
                          <span className="font-mono text-outline bg-surface-container px-1.5 py-0.5 rounded">
                            {room.room_code}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                            room.status === "active"
                              ? "bg-error/10 text-error"
                              : "bg-primary/10 text-primary"
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
                      className={`relative rounded-2xl border p-5 flex items-center gap-4 group transition-all overflow-visible ${
                        isRunning
                          ? "border-secondary-container/50 bg-gradient-to-r from-secondary-container/15 via-surface-container-lowest to-primary/10 shadow-[0px_4px_24px_rgba(174,47,52,0.12)] ring-1 ring-secondary-container/20"
                          : "border-outline-variant/10 bg-surface-container-lowest hover:shadow-md"
                      }`}
                    >
                      {/* Running vertical glow strip */}
                      {isRunning && (
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-secondary-container via-error to-primary rounded-l-2xl" />
                      )}
                      <div className="flex-1 min-w-0 pl-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <h3 className="font-extrabold text-primary text-base truncate">
                            {t.title}
                          </h3>
                          {isRunning ? (
                            <span className="flex items-center gap-1.5 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-error/15 text-error border border-error/30 shadow-xs">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-error" />
                              </span>
                              LIVE · {runningRoom.status === "active" ? "Sedang Berjalan" : "Lobby Terbuka"}
                            </span>
                          ) : (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                t.is_draft
                                  ? "bg-tertiary-fixed/30 text-on-tertiary-fixed-variant"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {t.is_draft ? "Draft" : "Ready"}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-outline flex-wrap">
                          <span className="font-medium">
                            {(t.question_ids || []).length} pertanyaan
                          </span>
                          <span>•</span>
                          <span>Dimainkan {t.times_run}x</span>
                          {isRunning ? (
                            <>
                              <span>•</span>
                              {/* Player count indicator with icon */}
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container/15 text-secondary-container font-extrabold text-xs shadow-xs border border-secondary-container/20">
                                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                  person
                                </span>
                                {runningRoom.player_count} pemain masuk
                              </span>
                              <span className="font-mono text-outline bg-surface-container px-2 py-0.5 rounded text-[11px] font-bold">
                                Code: {runningRoom.room_code}
                              </span>
                            </>
                          ) : (
                            <>
                              <span>•</span>
                              <span>Terakhir: {formatDate(t.last_run_at)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action buttons: 1 Main action (Run or Masuk Room) + 1 Menu Dropdown button */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isRunning ? (
                          <button
                            onClick={() => router.push(`/host/${runningRoom.room_code}`)}
                            className="px-4 py-2.5 bg-gradient-to-r from-secondary-container to-error text-white rounded-xl text-xs font-extrabold hover:opacity-95 transition-all inline-flex items-center gap-1.5 shadow-[0px_4px_14px_rgba(174,47,52,0.3)] animate-pulse"
                            title="Masuk ke room quiz yang sedang aktif"
                          >
                            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                              sensors
                            </span>
                            Masuk Room
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRunQuiz(t)}
                            disabled={actionLoading === t.id}
                            className="px-4 py-2.5 bg-secondary-container text-on-secondary-container rounded-xl text-xs font-extrabold hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm"
                            title="Jalankan quiz ini"
                          >
                            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                              play_arrow
                            </span>
                            {actionLoading === t.id ? "Memulai…" : "Run"}
                          </button>
                        )}

                        {/* Combined Settings/Action Menu */}
                        <div className="relative" data-quiz-menu>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === t.id ? null : t.id)}
                            aria-expanded={openMenuId === t.id}
                            aria-label="Menu opsi quiz"
                            title="Menu opsi"
                            className={`w-9 h-9 grid place-items-center rounded-xl transition-all ${
                              openMenuId === t.id
                                ? "bg-primary text-white shadow-sm"
                                : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-primary"
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
                                className="absolute right-0 top-full mt-2 w-48 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl shadow-[0_12px_32px_rgba(27,43,94,0.14)] p-1.5 z-40 flex flex-col gap-0.5"
                              >
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    router.push(`/host/quiz/${t.id}/edit`);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container hover:text-primary transition-colors text-left"
                                >
                                  <span className="material-symbols-outlined text-[18px] text-outline">
                                    edit_note
                                  </span>
                                  Edit Quiz
                                </button>

                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleDuplicate(t.id);
                                  }}
                                  disabled={actionLoading === t.id}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container hover:text-primary transition-colors text-left disabled:opacity-50"
                                >
                                  <span className="material-symbols-outlined text-[18px] text-outline">
                                    content_copy
                                  </span>
                                  Duplikasi
                                </button>

                                <div className="h-px bg-outline-variant/15 my-1" />

                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    if (isRunning) {
                                      toast.warning("Hentikan quiz terlebih dahulu sebelum menghapusnya.");
                                      return;
                                    }
                                    setQuizToDelete(t);
                                  }}
                                  disabled={isRunning}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-error hover:bg-error/10 transition-colors text-left disabled:opacity-40"
                                >
                                  <span className="material-symbols-outlined text-[18px] text-error">
                                    delete
                                  </span>
                                  Hapus Quiz
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  )})}
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
                Hapus Quiz?
              </h3>
              <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                Apakah Anda yakin ingin menghapus quiz{" "}
                <strong className="text-primary">"{quizToDelete.title}"</strong>? Semua pertanyaan di dalam quiz ini akan dihapus dan tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex items-center gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setQuizToDelete(null)}
                  disabled={!!actionLoading}
                  className="flex-1 py-3 px-4 rounded-xl border border-outline-variant/30 text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
                >
                  Batal
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
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                      Ya, Hapus Quiz
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

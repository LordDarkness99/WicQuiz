"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getCurrentUser } from "@/features/auth";
import { getHostId } from "@/shared/hostIdentity";
import {
  getQuizTemplates,
  type QuizTemplate,
} from "@/features/quiz-authoring";
import {
  getSessionResults,
  type SessionResult,
} from "@/features/session-results";
import { QuizCardSkeleton } from "@/shared/ui/Skeleton";
import { HostHeader } from "@/shared/ui/HostHeader";

type Tab = "played" | "created";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryRoute() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("played");
  const [sessions, setSessions] = useState<SessionResult[]>([]);
  const [templates, setTemplates] = useState<QuizTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const user = await getCurrentUser();
        const effectiveId = user?.id || getHostId();
        const [s, t] = await Promise.all([
          getSessionResults(effectiveId, 100),
          getQuizTemplates(effectiveId),
        ]);
        setSessions(s);
        setTemplates(t);
      } catch {
        toast.error("Failed to load history.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredSessions = useMemo(
    () =>
      sessions.filter((s) =>
        s.title.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [sessions, query]
  );

  const filteredTemplates = useMemo(
    () =>
      templates.filter((t) =>
        t.title.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [templates, query]
  );

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <HostHeader />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-1.5 w-fit shadow-xs">
          {([
            { id: "played" as const, label: "Played", icon: "sports_esports", count: sessions.length },
            { id: "created" as const, label: "Created", icon: "quiz", count: templates.length },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                tab === t.id
                  ? "bg-[#B88B4A] text-[#0D1722] shadow-sm font-extrabold"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
              {t.label}
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  tab === t.id ? "bg-[#0D1722]/15 text-[#0D1722]" : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">
            search
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              tab === "played" ? "Search played quizzes..." : "Search created quizzes..."
            }
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-sm font-medium text-on-surface placeholder:text-outline/70 focus:outline-none focus:ring-2 focus:ring-[#B88B4A]/40 focus:border-[#B88B4A] transition-all"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <QuizCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {tab === "played" ? (
              <motion.div
                key="played"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {filteredSessions.length === 0 ? (
                  <EmptyState
                    icon="history"
                    title="No games played yet"
                    subtitle="Run one of your quizzes to see its results here."
                  />
                ) : (
                  filteredSessions.map((s, i) => {
                    const winner =
                      s.final_leaderboard && s.final_leaderboard.length > 0
                        ? s.final_leaderboard[0].player_name
                        : null;
                    return (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.3) }}
                        onClick={() => router.push(`/host/results/${s.id}`)}
                        className="tactical-card bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 cursor-pointer hover:shadow-md hover:border-[#B88B4A]/50 transition-all flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-on-surface text-base truncate mb-1">
                            {s.title}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-on-surface-variant font-medium">
                            <span>{formatDate(s.finished_at || s.created_at)}</span>
                            <span>•</span>
                            <span>{s.player_count} players</span>
                            <span>•</span>
                            <span>{s.question_count} questions</span>
                          </div>
                        </div>
                        {winner && (
                          <div className="flex items-center gap-1.5 flex-shrink-0 bg-[#B88B4A]/10 border border-[#B88B4A]/30 px-3 py-1.5 rounded-xl">
                            <span
                              className="material-symbols-outlined text-[16px] text-[#B88B4A]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              emoji_events
                            </span>
                            <span className="text-xs font-bold text-[#B88B4A] truncate max-w-[130px]">
                              {winner}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </motion.div>
            ) : (
              <motion.div
                key="created"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {filteredTemplates.length === 0 ? (
                  <EmptyState
                    icon="lightbulb"
                    title="No quizzes created yet"
                    subtitle="Build your first quiz from the dashboard."
                  />
                ) : (
                  filteredTemplates.map((t, i) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      onClick={() => router.push(`/host/quiz/${t.id}/edit`)}
                      className="tactical-card bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 cursor-pointer hover:shadow-md hover:border-[#B88B4A]/50 transition-all flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-on-surface text-base truncate mb-1">
                          {t.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-on-surface-variant font-medium">
                          <span>{t.question_ids.length} questions</span>
                          <span>•</span>
                          <span>Run {t.times_run} time{t.times_run === 1 ? "" : "s"}</span>
                          <span>•</span>
                          <span>Last run: {formatDate(t.last_run_at)}</span>
                        </div>
                      </div>
                      {t.is_draft && (
                        <span className="flex-shrink-0 text-[10px] font-black uppercase tracking-wider text-on-surface-variant bg-surface-container-high px-2.5 py-1 rounded-full border border-outline-variant/20">
                          Draft
                        </span>
                      )}
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl border-2 border-dashed border-outline-variant/30 p-12 text-center">
      <span className="material-symbols-outlined text-[48px] text-outline/40 mb-3 block">
        {icon}
      </span>
      <h3 className="text-lg font-bold text-on-surface mb-1">{title}</h3>
      <p className="text-sm text-on-surface-variant">{subtitle}</p>
    </div>
  );
}

"use client";

import { useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LeaderboardEntry } from "@/shared/domain/types";

interface RankedListProps {
  entries: LeaderboardEntry[];
  isFinal: boolean;
}

const medals: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

const rowVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.08,
      type: "spring" as const,
      stiffness: 120,
      damping: 14,
    },
  }),
  exit: { opacity: 0, x: 30, transition: { duration: 0.2 } },
};

export default function RankedList({ entries, isFinal }: RankedListProps) {
  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.rank - b.rank),
    [entries]
  );

  // Track previous ranks to show movement indicators
  const prevRanksRef = useRef<Record<string, number>>({});
  const rankDeltas = useMemo(() => {
    const deltas: Record<string, number> = {};
    for (const entry of sorted) {
      const prev = prevRanksRef.current[entry.player_id];
      if (prev !== undefined && prev !== entry.rank) {
        deltas[entry.player_id] = prev - entry.rank; // positive = moved up
      }
    }
    return deltas;
  }, [sorted]);

  useEffect(() => {
    const next: Record<string, number> = {};
    for (const entry of sorted) next[entry.player_id] = entry.rank;
    prevRanksRef.current = next;
  }, [sorted]);

  return (
    <div className="w-full overflow-hidden rounded-2xl bg-cream border border-navy/10 shadow-lg">
      {/* Header */}
      <div className="bg-navy px-6 py-4 flex items-center justify-between">
        <h2 className="text-cream font-bold text-xl tracking-wide">
          {isFinal ? "Final Standings" : "Leaderboard"}
        </h2>
        {isFinal && (
          <motion.span
            className="text-amber font-semibold text-sm"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
          >
            Game Over!
          </motion.span>
        )}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[3rem_1fr_1fr_5rem] gap-2 px-6 py-3 bg-navy/5 text-xs font-semibold text-navy/50 uppercase tracking-wider border-b border-navy/10">
        <span>Rank</span>
        <span>Player</span>
        <span>Horse</span>
        <span className="text-right">Score</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-navy/5">
        <AnimatePresence mode="popLayout">
          {sorted.map((entry, index) => {
            const isTop3 = entry.rank <= 3;
            const isWinner = entry.rank === 1;
            const medal = medals[entry.rank];

            const delta = rankDeltas[entry.player_id] ?? 0;

            return (
              <motion.div
                key={entry.player_id}
                custom={index}
                variants={rowVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
                layoutId={`player-row-${entry.player_id}`}
                className={`grid grid-cols-[3rem_1fr_1fr_5rem] gap-2 px-6 py-4 items-center transition-colors ${
                  isWinner && isFinal
                    ? "bg-coral/10"
                    : isTop3
                    ? "bg-amber/5"
                    : "bg-transparent"
                } hover:bg-navy/5`}
              >
                {/* Rank + movement indicator */}
                <div className="flex items-center gap-1">
                  {medal ? (
                    <span className="text-xl leading-none">{medal}</span>
                  ) : (
                    <span className="text-navy/40 font-bold text-base pl-1">
                      {entry.rank}
                    </span>
                  )}
                  {delta !== 0 && (
                    <motion.span
                      key={`delta-${entry.player_id}-${entry.rank}`}
                      initial={{ opacity: 0, y: delta > 0 ? 6 : -6 }}
                      animate={{ opacity: [0, 1, 1, 0], y: 0 }}
                      transition={{ duration: 1.8, times: [0, 0.1, 0.7, 1] }}
                      className={`text-[10px] font-extrabold leading-none ${
                        delta > 0 ? "text-emerald-500" : "text-red-400"
                      }`}
                    >
                      {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
                    </motion.span>
                  )}
                </div>

                {/* Player name + winner badge */}
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`font-semibold truncate ${
                      isWinner && isFinal
                        ? "text-coral text-lg"
                        : "text-ink"
                    }`}
                  >
                    {entry.player_name}
                  </span>
                  {isWinner && isFinal && (
                    <motion.span
                      className="flex-shrink-0 inline-flex items-center rounded-2xl bg-coral text-cream text-xs font-bold px-2.5 py-0.5 shadow-sm"
                      initial={{ scale: 0, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 250,
                        damping: 12,
                        delay: 0.4,
                      }}
                    >
                      Winner!
                    </motion.span>
                  )}
                </div>

                {/* Horse name */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base leading-none">🐎</span>
                  <span className="text-ink/60 text-sm truncate">
                    {entry.horse_name}
                  </span>
                </div>

                {/* Score with flash animation */}
                <motion.div
                  className="text-right"
                  key={`${entry.player_id}-${entry.score}`}
                  initial={{ color: "#F59E0B" }}
                  animate={{ color: "#1B2B5E" }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                >
                  <span
                    className={`font-mono font-bold ${
                      isWinner && isFinal ? "text-xl" : "text-base"
                    }`}
                  >
                    {entry.score}
                  </span>
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {sorted.length === 0 && (
        <div className="py-12 text-center text-ink/40 text-sm">
          No scores yet...
        </div>
      )}
    </div>
  );
}

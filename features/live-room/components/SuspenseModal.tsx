"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { LeaderboardEntry } from "@/shared/domain/types";

interface SuspenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  suspenseEnabled: boolean;
  onToggleSuspense: () => void;
  onStartReveal: () => void;
  leaderboard: LeaderboardEntry[];
}

export default function SuspenseModal({
  isOpen,
  onClose,
  suspenseEnabled,
  onToggleSuspense,
  onStartReveal,
  leaderboard,
}: SuspenseModalProps) {
  const sortedDesc = [...leaderboard].sort((a, b) => b.rank - a.rank).slice(0, 6);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-primary-container/20 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-surface-container-lowest w-full max-w-xl rounded-xl shadow-[0px_20px_40px_rgba(27,43,94,0.15)] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-8 pb-0">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 px-3 py-1 bg-tertiary-fixed rounded-full animate-pulse suspense-glow">
                  <span className="material-symbols-outlined text-on-tertiary-fixed text-sm">warning</span>
                  <span className="text-xs font-black text-on-tertiary-fixed tracking-widest">
                    SUSPENSE MODE
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="material-symbols-outlined text-outline hover:text-primary-container transition-colors"
                >
                  close
                </button>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-primary-container mb-2">
                Positions are currently SCRAMBLED
              </h2>
              <p className="text-on-surface-variant text-sm font-medium leading-relaxed">
                Players see fake positions to build anticipation for the final
                reveal.
              </p>
            </div>

            {/* Toggle Control */}
            <div className="mx-8 mt-8 p-4 bg-surface-container-low rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="material-symbols-outlined text-tertiary-fixed-dim"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  visibility_off
                </span>
                <span className="font-bold text-sm text-primary-container">
                  Enable Suspense Mode
                </span>
              </div>
              <button
                onClick={onToggleSuspense}
                className="relative inline-flex items-center cursor-pointer"
              >
                <div
                  className={`w-12 h-6 rounded-full transition-colors ${
                    suspenseEnabled
                      ? "bg-primary-container"
                      : "bg-surface-container-highest"
                  }`}
                />
                <div
                  className={`absolute w-4 h-4 bg-white rounded-full transition-transform ${
                    suspenseEnabled ? "right-1" : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Reveal List */}
            <div className="p-8">
              <div className="grid grid-cols-2 gap-3 mb-8">
                {sortedDesc.map((entry, idx) => {
                  const opacity =
                    idx === 0
                      ? "opacity-60"
                      : idx === 1
                      ? "opacity-60"
                      : idx === 2
                      ? "opacity-70"
                      : idx === 3
                      ? "opacity-80"
                      : idx === 4
                      ? "opacity-90"
                      : "";
                  const isFirst = entry.rank === 1;

                  return (
                    <div
                      key={entry.player_id}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        isFirst
                          ? "bg-surface-container border-2 border-primary-container/10"
                          : `bg-surface-container-low ${opacity}`
                      }`}
                    >
                      <span
                        className={`text-xs font-black ${
                          isFirst ? "text-primary-container" : "text-outline"
                        }`}
                      >
                        {entry.rank}.
                      </span>
                      <span className="text-sm font-bold text-primary-container">
                        {entry.player_name}
                      </span>
                      {isFirst && (
                        <span
                          className="ml-auto material-symbols-outlined text-tertiary-fixed-dim text-sm"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          stars
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Main CTA */}
              <div className="text-center space-y-4">
                <button
                  onClick={onStartReveal}
                  className="w-full bg-secondary-container text-white py-5 rounded-xl font-black text-lg shadow-[0px_10px_20px_rgba(255,107,107,0.3)] hover:translate-y-[-2px] active:scale-95 transition-all"
                >
                  START FINAL REVEAL
                </button>
                <div className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-outline text-lg">
                    pace
                  </span>
                  <p className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">
                    Reveals positions 6th → 1st with drumroll
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-auto p-6 bg-surface-container-low text-center">
              <button
                onClick={onClose}
                className="text-sm font-bold text-outline hover:text-secondary transition-colors underline underline-offset-4 decoration-outline/30"
              >
                Cancel / Skip to results
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

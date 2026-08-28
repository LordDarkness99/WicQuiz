"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import RacerAvatar from "@/shared/ui/RacerAvatar";
import type { LeaderboardEntry } from "@/shared/domain/types";

interface EndGameProps {
  players: LeaderboardEntry[];
  quizTitle: string;
  totalQuestions: number;
  isHost: boolean;
  onPlayAgain?: () => void;
  onNewQuiz?: () => void;
  onDownloadResults?: () => void;
}

function AnimatedScore({ target, duration = 800 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const steps = 30;
    const increment = target / steps;
    const stepTime = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      if (step >= steps) {
        setValue(target);
        clearInterval(timer);
      } else {
        setValue(Math.round(increment * step));
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [target, duration]);

  return <>{value.toLocaleString()}</>;
}

function useLoopingConfetti() {
  const [bursts, setBursts] = useState<
    { id: number; originX: number; direction: "left" | "right" }[]
  >([]);

  useEffect(() => {
    let burstCount = 0;
    const interval = setInterval(() => {
      burstCount++;
      const direction = burstCount % 2 === 0 ? "left" : "right";
      const originX = direction === "left" ? 15 + Math.random() * 20 : 65 + Math.random() * 20;
      setBursts((prev) => [...prev, { id: burstCount, originX, direction }]);
      if (burstCount >= 12) clearInterval(interval);
    }, 2500);

    // Fire first burst immediately
    burstCount++;
    setBursts([{ id: burstCount, originX: 40 + Math.random() * 20, direction: "right" }]);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setBursts([]);
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return bursts;
}

function Confetti() {
  const colors = ["#FF6B6B", "#FFB95F", "#8594CD", "#1B2B5E"];
  const bursts = useLoopingConfetti();

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {bursts.map((burst) => {
        const particles = Array.from({ length: 30 }, (_, i) => ({
          id: i,
          left: burst.originX + (Math.random() * 30 - 15),
          delay: Math.random() * 0.8,
          duration: 2 + Math.random() * 2,
          rotation: Math.random() * 720 - 360,
          size: 6 + Math.random() * 8,
          color: colors[Math.floor(Math.random() * colors.length)],
          shape: Math.random() > 0.5 ? "50%" : "2px",
        }));

        return particles.map((p) => (
          <div
            key={`${burst.id}-${p.id}`}
            className="absolute animate-[endgame-confetti_ease-out_forwards]"
            style={{
              left: `${p.left}%`,
              top: "-20px",
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              ["--confetti-rot" as string]: `${p.rotation}deg`,
            }}
          >
            <div
              style={{
                width: p.size,
                height: p.size * 1.2,
                backgroundColor: p.color,
                borderRadius: p.shape,
              }}
            />
          </div>
        ));
      })}
    </div>
  );
}

const podiumOrder = [1, 0, 2] as const; // 2nd, 1st, 3rd display order
const podiumHeights = ["h-32", "h-44", "h-24"];
const podiumAccents = ["#FFB95F", "#FF6B6B", "#8594CD"];
const podiumBadges = ["🥈", "👑", "🥉"];

export default function EndGame({
  players,
  quizTitle,
  totalQuestions,
  isHost,
  onPlayAgain,
  onNewQuiz,
  onDownloadResults,
}: EndGameProps) {
  const reduced = useReducedMotion();
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const top3 = sorted.slice(0, 3);

  // Stagger delays: 3rd appears first (0.2s), then 2nd (0.4s), then 1st (0.8s)
  const podiumDelays = [0.4, 0.8, 0.2]; // indexed by display position: [2nd, 1st, 3rd]

  return (
    <motion.div
      initial={reduced ? undefined : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-[#021549] flex flex-col relative overflow-hidden"
    >
      <Confetti />

      {/* Game Over header */}
      <motion.div
        initial={reduced ? undefined : { y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
        className="text-center pt-10 pb-4 relative z-20"
      >
        <h1 className="text-5xl font-extrabold text-[#FAFAF7] tracking-tight">
          Game Over!
        </h1>
        <p className="text-[#FAFAF7]/50 mt-2 text-lg font-medium">
          {quizTitle}
        </p>
      </motion.div>

      {/* Podium section */}
      <div className="flex items-end justify-center gap-4 px-8 pt-4 pb-8 relative z-20">
        {podiumOrder.map((rankIdx, displayIdx) => {
          const player = top3[rankIdx];
          if (!player) return null;
          const delay = podiumDelays[displayIdx];
          const accent = podiumAccents[displayIdx];
          const badge = podiumBadges[displayIdx];
          const height = podiumHeights[displayIdx];
          const isFirst = rankIdx === 0;

          return (
            <motion.div
              key={player.player_id}
              initial={reduced ? undefined : { y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 20,
                delay,
              }}
              className="flex flex-col items-center"
              style={{ width: isFirst ? 180 : 150 }}
            >
              {/* Badge */}
              <span className={`text-3xl mb-2 ${isFirst ? "text-4xl" : ""}`}>
                {badge}
              </span>

              {/* Avatar */}
              <div className="mb-2">
                <RacerAvatar
                  index={sorted.findIndex((p) => p.player_id === player.player_id)}
                  size={isFirst ? 64 : 48}
                />
              </div>

              {/* Player name */}
              <p
                className={`font-extrabold text-[#FAFAF7] text-center truncate w-full ${
                  isFirst ? "text-xl" : "text-base"
                }`}
              >
                {player.player_name}
              </p>

              {/* Score */}
              <p
                className="font-bold font-mono mt-1"
                style={{ color: accent }}
              >
                <AnimatedScore target={player.score} />
              </p>

              {/* Podium block */}
              <div
                className={`${height} w-full rounded-t-xl mt-3 relative overflow-hidden`}
                style={{ backgroundColor: `${accent}25` }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-1 rounded-full"
                  style={{ backgroundColor: accent }}
                />
                {/* Shimmer for 1st place */}
                {isFirst && (
                  <div className="absolute inset-0 podium-shimmer" />
                )}
                <div className="flex items-center justify-center h-full">
                  <span
                    className="font-black text-4xl"
                    style={{ color: `${accent}60` }}
                  >
                    {rankIdx + 1}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Full leaderboard */}
      <div className="flex-1 bg-[#FAFAF7] rounded-t-3xl px-6 pt-6 pb-8 relative z-20">
        <h3 className="text-lg font-bold text-[#1B2B5E] mb-4 px-2">
          Final Standings
        </h3>

        <div className="space-y-1 max-h-[40vh] overflow-y-auto">
          {sorted.map((entry, idx) => (
            <motion.div
              key={entry.player_id}
              initial={reduced ? undefined : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 + idx * 0.05 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                idx % 2 === 0 ? "bg-[#FAFAF7]" : "bg-white"
              }`}
            >
              {/* Rank */}
              <span className="w-8 text-center font-extrabold text-[#1B2B5E]/60 text-sm">
                {idx + 1}
              </span>

              {/* Avatar */}
              <RacerAvatar index={idx} size={28} />

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#1B2B5E] truncate text-sm">
                  {entry.player_name}
                </p>
              </div>

              {/* Correct count */}
              <span className="text-xs text-[#1B2B5E]/40 font-medium">
                {entry.correct_count ?? "?"}/{totalQuestions}
              </span>

              {/* Avg Speed */}
              {entry.avg_time_ms != null && (
                <span className="text-xs text-[#8594CD] font-medium w-14 text-right">
                  {(entry.avg_time_ms / 1000).toFixed(1)}s
                </span>
              )}

              {/* Score */}
              <span className="font-bold font-mono text-[#FF6B6B] text-sm w-20 text-right">
                {entry.score.toLocaleString()}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Host action buttons */}
        {isHost && (
          <div className="flex gap-3 mt-6 pt-4 border-t border-[#1B2B5E]/10">
            {onPlayAgain && (
              <button
                onClick={onPlayAgain}
                className="flex-1 py-3.5 rounded-xl bg-[#FF6B6B] text-white font-bold text-sm shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
              >
                Play Again
              </button>
            )}
            {onNewQuiz && (
              <button
                onClick={onNewQuiz}
                className="flex-1 py-3.5 rounded-xl border-2 border-[#1B2B5E] text-[#1B2B5E] font-bold text-sm hover:bg-[#1B2B5E]/5 active:scale-95 transition-all"
              >
                New Quiz
              </button>
            )}
            {onDownloadResults && (
              <button
                onClick={onDownloadResults}
                className="py-3.5 px-5 rounded-xl text-[#1B2B5E]/60 font-bold text-sm hover:text-[#1B2B5E] hover:bg-[#1B2B5E]/5 transition-all"
              >
                Download Results
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

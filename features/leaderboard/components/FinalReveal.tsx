"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import type { LeaderboardEntry } from "@/shared/domain/types";

interface FinalRevealProps {
  players: LeaderboardEntry[];
  onComplete?: () => void;
}

const rankColors: Record<number, string> = {
  1: "#FF6B6B",
  2: "#FFB95F",
  3: "#60a5fa",
};

function CSSConfettiBurst() {
  const colors = ["#FF6B6B", "#FFB95F", "#60a5fa", "#22c55e", "#a78bfa", "#f472b6"];
  const particles = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 100,
    y: -(Math.random() * 80 + 20),
    rotate: Math.random() * 720 - 360,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 0.6,
    size: Math.random() * 8 + 4,
    shape: Math.random() > 0.5 ? "circle" : "rect",
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-[confetti-fall_2.5s_ease-out_forwards]"
          style={{
            left: "50%",
            top: "50%",
            animationDelay: `${p.delay}s`,
            ["--tx" as string]: `${p.x}vw`,
            ["--ty" as string]: `${p.y}vh`,
            ["--rot" as string]: `${p.rotate}deg`,
          }}
        >
          <div
            style={{
              width: p.size,
              height: p.shape === "rect" ? p.size * 1.5 : p.size,
              backgroundColor: p.color,
              borderRadius: p.shape === "circle" ? "50%" : "2px",
            }}
          />
        </div>
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translate(0, 0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--tx), var(--ty)) rotate(var(--rot)) scale(0.3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

function TypewriterText({ text, onComplete }: { text: string; onComplete?: () => void }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 40);
    return () => clearInterval(interval);
  }, [text, onComplete]);

  return (
    <span>
      {displayed}
      <span className="animate-pulse">|</span>
    </span>
  );
}

function AnimatedScore({ target }: { target: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const duration = 800;
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
  }, [target]);

  return <>{value.toLocaleString()}</>;
}

export default function FinalReveal({
  players,
  onComplete,
}: FinalRevealProps) {
  const reduced = useReducedMotion();
  // Sorted by score descending — index 0 is 1st place
  const sorted = [...players].sort((a, b) => b.score - a.score).slice(0, 6);
  // Reveal order: 6th → 1st (reverse)
  const revealOrder = [...sorted].reverse();

  const [revealedCount, setRevealedCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [scoreVisible, setScoreVisible] = useState<Set<string>>(new Set());
  const [drumrollText, setDrumrollText] = useState<string | null>(null);
  const [showDrumroll, setShowDrumroll] = useState(false);

  const revealedPlayerIds = new Set(
    revealOrder.slice(0, revealedCount).map((p) => p.player_id)
  );

  const isAllRevealed = revealedCount >= revealOrder.length;

  useEffect(() => {
    if (revealedCount >= revealOrder.length) {
      onComplete?.();
      return;
    }

    const nextRank = revealOrder.length - revealedCount;
    const suffix =
      nextRank === 1
        ? "1st"
        : nextRank === 2
        ? "2nd"
        : nextRank === 3
        ? "3rd"
        : `${nextRank}th`;

    // Show drumroll text
    if (!reduced) {
      setDrumrollText(`🥁 And in ${suffix} place...`);
      setShowDrumroll(true);
    }

    const timer = setTimeout(
      () => {
        setShowDrumroll(false);
        const nextCount = revealedCount + 1;
        setRevealedCount(nextCount);

        const justRevealed = revealOrder[nextCount - 1];

        // Show score with 0.5s delay after lane appears
        setTimeout(() => {
          if (justRevealed) {
            setScoreVisible((prev) => new Set(prev).add(justRevealed.player_id));
          }
        }, 500);

        // Check if this reveal is the winner
        if (justRevealed && sorted[0] && justRevealed.player_id === sorted[0].player_id) {
          setShowConfetti(true);
        }
      },
      reduced ? 2000 : 2500
    );

    return () => clearTimeout(timer);
  }, [revealedCount, revealOrder.length, sorted, revealOrder, onComplete, reduced]);

  return (
    <div className="w-full h-screen bg-[#021549] flex flex-col overflow-hidden relative">
      {showConfetti && <CSSConfettiBurst />}

      {/* Header */}
      <div className="px-8 py-5 flex items-center justify-between flex-shrink-0">
        <h2 className="text-[#FAFAF7] font-black italic uppercase text-5xl tracking-wide">
          The Final Stretch
        </h2>
        <span className="text-[#FAFAF7]/60 text-lg font-semibold">
          {isAllRevealed
            ? "Final Results"
            : `${revealedCount} of ${revealOrder.length} revealed...`}
        </span>
      </div>

      {/* Drumroll text */}
      <AnimatePresence>
        {showDrumroll && drumrollText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="px-8 pb-3"
          >
            <span className="text-[#FFB95F] font-bold text-2xl">
              <TypewriterText text={drumrollText} />
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lanes */}
      <div className="flex-1 flex flex-col px-8 gap-2 justify-center">
        <AnimatePresence>
          {sorted.map((entry, index) => {
            const rank = index + 1;
            const color = rankColors[rank] ?? "rgba(255,255,255,0.2)";
            const isRevealed = revealedPlayerIds.has(entry.player_id);
            const isWinner = rank === 1 && isRevealed;
            const isScoreShown = scoreVisible.has(entry.player_id);
            const isTop3 = rank <= 3;

            return (
              <motion.div
                key={entry.player_id}
                initial={isRevealed ? { x: -100, opacity: 0 } : { opacity: 0.3 }}
                animate={
                  isRevealed
                    ? { x: 0, opacity: 1 }
                    : { opacity: 0.3 }
                }
                transition={
                  reduced
                    ? { duration: 0.2 }
                    : {
                        type: "spring",
                        stiffness: 80,
                        damping: 15,
                      }
                }
                className={`flex items-center rounded-xl px-4 py-3 relative overflow-hidden ${
                  isWinner ? "gold-shimmer" : ""
                }`}
                style={{
                  backgroundColor: isRevealed
                    ? `${typeof color === "string" && color.startsWith("#") ? color : "rgba(255,255,255,0.03)"}15`
                    : "rgba(255,255,255,0.03)",
                  boxShadow: isRevealed && isTop3
                    ? `0 0 20px ${color}33`
                    : "none",
                }}
              >
                {/* Gold shimmer overlay for 1st place */}
                {isWinner && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="gold-shimmer-gradient" />
                  </div>
                )}

                {/* Rank */}
                <div className="w-16 flex-shrink-0 flex items-center justify-center relative z-10">
                  <span
                    className="font-extrabold text-2xl"
                    style={{ color: isRevealed ? color : "rgba(255,255,255,0.2)" }}
                  >
                    {rank}
                  </span>
                </div>

                {/* Player name */}
                <div className="w-56 flex-shrink-0 relative z-10">
                  {isRevealed ? (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <span className="text-[#FAFAF7] font-extrabold uppercase text-lg">
                        {entry.player_name}
                      </span>
                      <p className="text-[#FAFAF7]/40 text-xs truncate">
                        {entry.horse_name}
                      </p>
                    </motion.div>
                  ) : (
                    <span className="text-white/20 font-bold text-lg font-mono">
                      ???
                    </span>
                  )}
                </div>

                {/* Spacer */}
                <div className="flex-grow" />

                {/* Winner badge + Quiz Champion */}
                {isWinner && (
                  <motion.div
                    initial={{ scale: 0, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                    className="flex items-center gap-3 mr-4 relative z-10"
                  >
                    <span className="bg-[#FF6B6B] text-white font-extrabold px-4 py-1.5 rounded-xl text-sm uppercase tracking-wider">
                      Winner!
                    </span>
                    <span className="text-[#FFB95F] font-black italic uppercase text-sm tracking-wider">
                      Quiz Champion
                    </span>
                  </motion.div>
                )}

                {/* Score */}
                <div className="w-36 flex-shrink-0 text-right relative z-10">
                  {isRevealed && isScoreShown ? (
                    <motion.span
                      className="text-[#FAFAF7] font-mono font-bold text-xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <AnimatedScore target={entry.score} /> pts
                    </motion.span>
                  ) : (
                    <span className="text-white/20 font-mono font-bold text-xl">
                      ???
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Gold shimmer styles */}
      <style jsx>{`
        .gold-shimmer-gradient {
          position: absolute;
          top: 0;
          left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 185, 95, 0.15) 40%,
            rgba(255, 185, 95, 0.3) 50%,
            rgba(255, 185, 95, 0.15) 60%,
            transparent 100%
          );
          animation: shimmer-sweep 2s ease-in-out 0.5s forwards;
        }
        @keyframes shimmer-sweep {
          0% { left: -60%; }
          100% { left: 120%; }
        }
      `}</style>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import QRCodeDisplay from "@/shared/ui/QRCodeDisplay";
import RacerAvatar from "@/shared/ui/RacerAvatar";

interface LobbyPlayer {
  name: string;
  horse_name: string;
}

interface LobbyProps {
  players: LobbyPlayer[];
  roomCode: string;
  joinUrl: string;
  quizTitle: string;
  questionCount: number;
  onStart: () => void;
  canStart: boolean;
  displayUrl?: string;
}

export default function Lobby({
  players,
  roomCode,
  joinUrl,
  quizTitle,
  questionCount,
  onStart,
  canStart,
  displayUrl,
}: LobbyProps) {
  const reduced = useReducedMotion();
  const [countPulse, setCountPulse] = useState(false);
  const [joinedToast, setJoinedToast] = useState<string | null>(null);
  const prevCountRef = useRef(players.length);

  // Detect new player joins
  useEffect(() => {
    if (players.length > prevCountRef.current) {
      const newPlayer = players[players.length - 1];
      if (newPlayer) {
        setJoinedToast(newPlayer.name);
        setCountPulse(true);
        const toastTimer = setTimeout(() => setJoinedToast(null), 1500);
        const pulseTimer = setTimeout(() => setCountPulse(false), 300);
        prevCountRef.current = players.length;
        return () => {
          clearTimeout(toastTimer);
          clearTimeout(pulseTimer);
        };
      }
    }
    prevCountRef.current = players.length;
  }, [players.length, players]);

  return (
    <div className="bg-surface text-on-surface min-h-screen overflow-hidden flex flex-col">
      {/* Top Nav */}
      <header className="bg-surface-bright flex justify-between items-center w-full px-8 py-4 border-b border-primary/10 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <span className="text-xl font-bold text-primary-container tracking-tighter">
            QuizTime
          </span>
          <div className="h-6 w-px bg-outline-variant/30" />
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-primary tracking-tight">
              {quizTitle}
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-outline">
              {questionCount} Questions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {displayUrl && (
            <a
              href={displayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-bold hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-sm">tv</span>
              Open Display Screen
            </a>
          )}
          <motion.div
            animate={
              !reduced && countPulse
                ? { scale: [1, 1.3, 1] }
                : { scale: 1 }
            }
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-full"
          >
            <span className="material-symbols-outlined text-primary text-sm">
              group
            </span>
            <span className="text-sm font-bold text-primary">
              {players.length} player{players.length !== 1 ? "s" : ""} in the room
            </span>
          </motion.div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto p-8 lg:p-12 flex-1 flex gap-12">
        {/* Left Section: Join Instructions */}
        <section className="flex-1 flex flex-col justify-center items-start space-y-8">
          <div className="space-y-2">
            <span className="text-sm font-extrabold text-on-tertiary-container bg-tertiary-fixed px-3 py-1 rounded-full uppercase tracking-widest">
              Join the Game
            </span>
            <h2 className="text-5xl font-extrabold text-primary tracking-tighter leading-tight">
              Waiting for your <br />
              squad to saddle up...
            </h2>
          </div>

          {/* QR Code */}
          <div className="relative group">
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0px_20px_40px_rgba(27,43,94,0.06)] relative z-10">
              <QRCodeDisplay url={joinUrl} size={240} />
            </div>
            <div className="absolute -top-4 -left-4 w-full h-full bg-surface-container-low rounded-xl -z-10 transition-transform group-hover:translate-x-2 group-hover:translate-y-2" />
          </div>

          {/* Room Code */}
          <div className="space-y-1">
            <p className="text-outline text-xs uppercase tracking-widest font-bold">
              Room Code
            </p>
            <div className="flex items-center gap-4">
              <span className="text-7xl font-black text-primary tracking-tighter">
                {roomCode}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(roomCode)}
                className="bg-surface-container-high p-3 rounded-full text-primary hover:bg-primary hover:text-white transition-all duration-200"
              >
                <span className="material-symbols-outlined">content_copy</span>
              </button>
            </div>
            <p className="text-outline font-medium">
              {joinUrl.replace(/^https?:\/\//, "")}
            </p>
          </div>
        </section>

        {/* Right Section: Player List */}
        <aside className="w-[450px] flex flex-col gap-6">
          <div className="flex-1 bg-surface-container-low rounded-xl p-6 flex flex-col gap-4 overflow-hidden relative shadow-inner">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-bold text-primary">Live Players</h3>
              <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            </div>

            {/* Player Grid */}
            <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-2 relative">
              {players.map((player, idx) => (
                <motion.div
                  key={`${player.name}-${idx}`}
                  initial={reduced ? undefined : { opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    delay: idx * 0.05,
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                  }}
                  className="bg-surface-container-lowest p-4 rounded-lg flex items-center gap-3 shadow-[0px_10px_20px_rgba(27,43,94,0.03)] border-b-2 border-transparent hover:border-primary transition-all relative"
                >
                  <RacerAvatar index={idx} size={32} />
                  <span className="font-bold text-primary truncate">
                    {player.name}
                  </span>
                </motion.div>
              ))}

              {/* Joined toast */}
              <AnimatePresence>
                {joinedToast && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="absolute -bottom-1 right-2 bg-primary text-on-primary text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg z-10"
                  >
                    {joinedToast} joined!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Fade overlay */}
            {players.length > 6 && (
              <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-surface-container-low to-transparent pointer-events-none" />
            )}
          </div>

          {/* Start Button */}
          <div className="space-y-4">
            <button
              onClick={onStart}
              disabled={!canStart}
              className="w-full bg-secondary-container text-white font-extrabold text-xl py-6 rounded-xl shadow-[0px_20px_40px_rgba(174,47,52,0.15)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span
                className="material-symbols-outlined font-bold"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                play_arrow
              </span>
              {canStart ? "Start the Quiz" : "Waiting for players to join..."}
            </button>
            <div className="flex items-center justify-center gap-2 text-outline">
              <span className="material-symbols-outlined text-sm">info</span>
              <span className="text-xs font-semibold">
                Only the host can start the broadcast
              </span>
            </div>
          </div>
        </aside>
      </main>

      {/* Background Decoration */}
      <div className="fixed top-0 right-0 -z-50 w-1/3 h-full opacity-5 pointer-events-none overflow-hidden">
        <svg
          className="w-full h-full scale-150 text-primary"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M44.7,-76.4C58.1,-69.2,69.2,-58.1,77.4,-44.7C85.5,-31.3,90.8,-15.7,91.8,0.6C92.8,16.8,89.5,33.7,81.4,48.1C73.3,62.5,60.4,74.5,45.6,81.8C30.8,89.1,14,91.6,-2,95C-18,98.4,-36.1,102.7,-51.7,96.6C-67.4,90.4,-80.6,73.8,-88.4,56.1C-96.2,38.3,-98.6,19.2,-96.2,1.4C-93.7,-16.4,-86.3,-32.8,-76.1,-47.4C-65.8,-62.1,-52.7,-74.9,-37.9,-81.1C-23.1,-87.3,-6.5,-86.9,9.4,-81.4C25.4,-76,41.4,-65.4,44.7,-76.4Z"
            fill="currentColor"
            transform="translate(100 100)"
          />
        </svg>
      </div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";

interface WaitingScreenProps {
  message?: string;
  playerName: string;
  horseName: string;
}

const waitingMessages = [
  "Warming up at the starting gate",
  "The quiz master is loading the cannon",
  "Stretching those trivia muscles",
  "Awaiting the quiz master's signal",
  "Getting ready to gallop",
];

export default function WaitingScreen({
  message,
  playerName,
  horseName,
}: WaitingScreenProps) {
  // Pick a stable-ish message based on horse name length
  const displayMessage =
    message ?? waitingMessages[horseName.length % waitingMessages.length];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-6">
      {/* Animated horse */}
      <motion.div
        animate={{ x: [-4, 4, -4], rotate: [-2, 2, -2] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="text-6xl"
      >
        🐎
      </motion.div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-lg font-bold text-navy">{horseName}</span>
        <span className="text-sm text-ink/50">ridden by</span>
        <span className="text-base font-semibold text-ink">{playerName}</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm px-6 py-4 max-w-xs">
        <div className="flex items-center justify-center gap-1 text-base text-ink/70 font-medium">
          <span>Waiting for the quiz master to start</span>
          <span className="inline-flex w-6 ml-1">
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            >
              .
            </motion.span>
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.2,
              }}
            >
              .
            </motion.span>
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.4,
              }}
            >
              .
            </motion.span>
          </span>
        </div>
        <p className="text-xs text-ink/40 mt-2">{displayMessage}</p>
      </div>
    </div>
  );
}

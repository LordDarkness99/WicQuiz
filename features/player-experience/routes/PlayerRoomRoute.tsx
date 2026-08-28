"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchRoomByCode,
  fetchPlayerInRoom,
  fetchQuizQuestions,
  fetchPlayerScore,
  joinRoom,
  submitAnswer,
} from "@/features/player-experience/data/playerRepository";
import { generateHorseName } from "@/features/player-experience/domain/horses";
import type { Question, LeaderboardEntry } from "@/shared/domain/types";
import type {
  GameStatePayload,
  QuestionRevealPayload,
  TimerTickPayload,
  LeaderboardUpdatePayload,
  AnswerRevealPayload,
} from "@/features/realtime";
import Image from "next/image";
import Button from "@/shared/ui/Button";
import AnimatedContainer from "@/shared/ui/AnimatedContainer";
import TimerBar from "@/shared/ui/TimerBar";
import AnswerButtons from "@/features/player-experience/components/AnswerButtons";
import WaitingScreen from "@/features/player-experience/components/WaitingScreen";
import AnswerReveal from "@/features/player-experience/components/AnswerReveal";

// ─── Types ───────────────────────────────────────────────────────

type Phase =
  | "loading"
  | "join"
  | "lobby"
  | "question"
  | "answered"
  | "answer_revealed"
  | "leaderboard"
  | "finished";

interface StoredPlayerData {
  playerId: string;
  playerName: string;
  horseName: string;
  roomId: string;
}

// ─── Helpers ─────────────────────────────────────────────────────

function storageKey(roomCode: string) {
  return `quiztime_player_${roomCode}`;
}

function savePlayerData(roomCode: string, data: StoredPlayerData) {
  try {
    localStorage.setItem(storageKey(roomCode), JSON.stringify(data));
  } catch {
    // localStorage may be unavailable
  }
}

function loadPlayerData(roomCode: string): StoredPlayerData | null {
  try {
    const raw = localStorage.getItem(storageKey(roomCode));
    if (!raw) return null;
    return JSON.parse(raw) as StoredPlayerData;
  } catch {
    return null;
  }
}

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ─── Component ───────────────────────────────────────────────────

export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.roomCode as string).toUpperCase();

  // Room
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);

  // Player
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [horseName, setHorseName] = useState("");
  const [totalScore, setTotalScore] = useState(0);
  const [nameInput, setNameInput] = useState("");

  // Game
  const [phase, setPhase] = useState<Phase>("loading");
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timeLimit, setTimeLimit] = useState(0);
  const questionStartRef = useRef<number>(0);

  // Answer tracking
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeTakenMs, setTimeTakenMs] = useState(0);

  // Reveal results
  const [revealIsCorrect, setRevealIsCorrect] = useState(false);
  const [revealPoints, setRevealPoints] = useState(0);
  const [revealCorrectAnswer, setRevealCorrectAnswer] = useState("");
  const [revealIsJoker, setRevealIsJoker] = useState(false);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerRank, setPlayerRank] = useState<number | null>(null);

  // Image loading
  const [imageLoaded, setImageLoaded] = useState(false);

  // Progressive blur
  const [blurAmount, setBlurAmount] = useState(0);

  // Image-first reveal phase for blurred image questions
  const [revealPhase, setRevealPhase] = useState<'image_first' | 'points_shown' | null>(null);

  // Joining state
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Progressive blur: reduce blur as timer ticks down
  useEffect(() => {
    if (!currentQuestion?.is_image_blurred) {
      setBlurAmount(0);
      return;
    }
    if (phase === "answer_revealed") {
      // Reveal — animate to 0 via CSS transition
      setBlurAmount(0);
      return;
    }
    if (phase === "question" || phase === "answered") {
      const fraction = timeLimit > 0 ? timeRemaining / timeLimit : 1;
      // Start at 16px, reduce to 6px by end of timer
      setBlurAmount(Math.max(6, 16 * fraction));
    }
  }, [currentQuestion?.is_image_blurred, phase, timeRemaining, timeLimit]);

  // Channel ref to avoid re-subscribing
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Verify room exists ──────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function verifyRoom() {
      const data = await fetchRoomByCode(roomCode);

      if (cancelled) return;

      if (!data) {
        setRoomError("Room not found. Double-check the code and try again.");
        setPhase("join");
        return;
      }

      if (data.status === "finished") {
        setRoomError("This quiz has already finished. Ask the host to start a new game!");
        setPhase("join");
        return;
      }

      setRoomId(data.id);

      // Check for existing player session (reconnect)
      const stored = loadPlayerData(roomCode);
      if (stored && stored.roomId === data.id) {
        // Verify player still exists in DB
        const playerRow = await fetchPlayerInRoom(stored.playerId, data.id);

        if (!cancelled && playerRow) {
          setPlayerId(playerRow.id);
          setPlayerName(playerRow.name);
          setHorseName(playerRow.horse_name);
          setTotalScore(playerRow.score);

          // Late-join catch-up: if game is already active, jump to current question
          if (data.status === 'active' && data.current_question_index >= 0 && data.current_quiz_id) {
            const questions = await fetchQuizQuestions(data.current_quiz_id);

            if (!cancelled && questions.length > 0) {
              const idx = data.current_question_index;
              const q = questions[idx];
              if (q) {
                const safeQ: Partial<Question> = { ...q };
                delete safeQ.correct_answer;
                setCurrentQuestion(safeQ as Question);
                setQuestionNumber(idx + 1);
                setTotalQuestions(questions.length);
                setTimeLimit(q.time_limit);
                setTimeRemaining(0);
                setPhase('question');
                return;
              }
            }
          }

          setPhase("lobby");
          return;
        }
      }

      setPhase("join");
    }

    verifyRoom();
    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  // ── Subscribe to realtime channel ──────────────────────────────

  const setupChannel = useCallback(
    (pid: string) => {
      if (channelRef.current) return;

      const channel = supabase.channel(`room:${roomCode}`);

      channel
        .on("broadcast", { event: "game_state_change" }, ({ payload }) => {
          const p = payload as GameStatePayload;

          if (p.state === "question_start") {
            // Reset answer state — question will arrive via question_reveal
            setSelectedAnswer(null);
            setTimeTakenMs(0);
            setRevealIsCorrect(false);
            setRevealPoints(0);
            setRevealCorrectAnswer("");
            setRevealIsJoker(false);
            setRevealPhase(null);
          }

          if (p.state === "question_end") {
            // Timer ended — ensure timer shows 0 on player's screen
            setTimeRemaining(0);
          }

          if (p.state === "leaderboard") {
            setPhase("leaderboard");
          }

          if (p.state === "finished") {
            setPhase("finished");
            fetchFinalScore(pid);
            toast.success("Game over! Thanks for playing 🐎", { duration: 4000 });
          }

          if (p.state === "lobby") {
            setPhase("lobby");
          }
        })
        .on("broadcast", { event: "question_reveal" }, ({ payload }) => {
          const p = payload as QuestionRevealPayload;
          const safeQuestion = { ...p.question };
          delete (safeQuestion as Partial<Question>).correct_answer;
          setCurrentQuestion(safeQuestion as Question);
          setImageLoaded(false);
          setQuestionNumber(p.question_number);
          setTotalQuestions(p.total_questions);
          setTimeRemaining(safeQuestion.time_limit);
          setTimeLimit(safeQuestion.time_limit);
          questionStartRef.current = Date.now();
          setSelectedAnswer(null);
          setPhase("question");
        })
        .on("broadcast", { event: "timer_tick" }, ({ payload }) => {
          const p = payload as TimerTickPayload;
          setTimeRemaining(p.time_remaining);
          setTimeLimit(p.time_limit);
        })
        .on("broadcast", { event: "answer_revealed" }, ({ payload }) => {
          const p = payload as AnswerRevealPayload;
          const myResult = p.playerResults[pid];
          if (myResult) {
            setRevealIsCorrect(myResult.isCorrect);
            setRevealPoints(myResult.pointsEarned);
            setTotalScore((prev) => prev + myResult.pointsEarned);
          } else {
            // Player didn't answer
            setRevealIsCorrect(false);
            setRevealPoints(0);
          }
          setRevealCorrectAnswer(p.correctAnswer);
          setPhase("answer_revealed");

          // Preload next question's image so it's cached before question starts
          if (p.nextImageUrl) {
            const img = new window.Image();
            img.src = p.nextImageUrl;
          }

          // For blurred image questions, use phased reveal
          setCurrentQuestion((prev) => {
            if (prev?.is_image_blurred) {
              setRevealPhase('image_first');
              setTimeout(() => setRevealPhase('points_shown'), 2500);
            } else {
              setRevealPhase(null);
            }
            return prev;
          });
        })
        .on("broadcast", { event: "leaderboard_update" }, ({ payload }) => {
          const p = payload as LeaderboardUpdatePayload;
          setLeaderboard(p.leaderboard);
          const myEntry = p.leaderboard.find(
            (entry) => entry.player_id === pid
          );
          if (myEntry) {
            setPlayerRank(myEntry.rank);
            setTotalScore(myEntry.score);
          }
          setPhase("leaderboard");
        })
        .subscribe();

      channelRef.current = channel;
    },
    [roomCode]
  );

  // Set up channel when playerId is available
  useEffect(() => {
    if (playerId && roomId) {
      setupChannel(playerId);
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [playerId, roomId, setupChannel]);

  // ── Fetch final score ──────────────────────────────────────────

  async function fetchFinalScore(pid: string) {
    const score = await fetchPlayerScore(pid);
    if (score !== null) {
      setTotalScore(score);
    }
  }

  // ── Join handler ───────────────────────────────────────────────

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId || !nameInput.trim()) return;

    setIsJoining(true);
    setJoinError(null);

    const name = nameInput.trim();
    const horse = generateHorseName();

    const pid = await joinRoom(roomId, name, horse);

    if (!pid) {
      setJoinError("Couldn't grab your seat. Check your connection and try again.");
      setIsJoining(false);
      return;
    }

    setPlayerId(pid);
    setPlayerName(name);
    setHorseName(horse);

    savePlayerData(roomCode, {
      playerId: pid,
      playerName: name,
      horseName: horse,
      roomId,
    });

    toast.success(`Welcome, ${name}! Your horse is "${horse}" 🐎`, { duration: 4000 });
    setPhase("lobby");
    setIsJoining(false);
  }

  // ── Answer handler ─────────────────────────────────────────────

  async function handleAnswer(answer: string) {
    if (!currentQuestion || !playerId) return;

    const taken = Date.now() - questionStartRef.current;
    setSelectedAnswer(answer);
    setTimeTakenMs(taken);
    setPhase("answered");

    toast(`Answer locked in! ✅`, { duration: 2000 });

    await submitAnswer(currentQuestion.id, playerId, answer, taken);
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <main className="flex-1 flex flex-col min-h-dvh bg-cream">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-navy text-white">
        <span className="font-bold text-sm tracking-wide">QuizTime</span>
        <span className="font-mono text-sm font-bold tracking-widest bg-white/10 px-3 py-1 rounded-xl">
          {roomCode}
        </span>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col px-4 py-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* ── Loading ──────────────────────────── */}
          {phase === "loading" && (
            <AnimatedContainer
              key="loading"
              className="flex-1 flex items-center justify-center"
            >
              <div className="flex flex-col items-center gap-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 border-4 border-navy/20 border-t-navy rounded-full"
                />
                <p className="text-ink/60 font-medium">Looking for the game room...</p>
              </div>
            </AnimatedContainer>
          )}

          {/* ── Join Phase ───────────────────────── */}
          {phase === "join" && (
            <AnimatedContainer
              key="join"
              className="flex-1 flex flex-col items-center justify-center"
            >
              {roomError && !roomId ? (
                <div className="w-full max-w-sm text-center space-y-6">
                  <div className="bg-white rounded-3xl shadow-lg p-8">
                    <div className="text-5xl mb-4">😕</div>
                    <h2 className="text-xl font-bold text-navy mb-2">
                      Oops!
                    </h2>
                    <p className="text-ink/60 mb-6">{roomError}</p>
                    <button
                      className="text-sm text-ink/40 underline"
                      onClick={() => window.close()}
                    >
                      Close tab
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-sm space-y-6">
                  <div className="text-center mb-2">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="text-5xl mb-3"
                    >
                      🐎
                    </motion.div>
                    <h1 className="text-2xl font-extrabold text-navy">
                      Join the Game
                    </h1>
                    <p className="text-ink/50 mt-1">
                      Enter your name and jump in 🎉
                    </p>
                  </div>

                  <form onSubmit={handleJoin} className="space-y-4">
                    <div className="bg-white rounded-3xl shadow-lg p-6">
                      <label
                        htmlFor="name-input"
                        className="block text-sm font-bold text-navy mb-2"
                      >
                        Your Name
                      </label>
                      <input
                        id="name-input"
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="e.g. Sarah"
                        maxLength={24}
                        autoFocus
                        autoComplete="off"
                        className="w-full text-xl font-bold px-5 py-4 rounded-2xl border-2 border-ink/10 bg-cream text-ink placeholder:text-ink/25 focus:border-coral focus:outline-none transition-colors"
                      />
                    </div>

                    {joinError && (
                      <p className="text-coral text-sm font-medium text-center">
                        {joinError}
                      </p>
                    )}

                    <Button
                      variant="coral"
                      size="lg"
                      className="w-full"
                      type="submit"
                      disabled={!nameInput.trim() || isJoining}
                    >
                      {isJoining ? "Getting your seat..." : "Join the Game"}
                    </Button>
                  </form>
                </div>
              )}
            </AnimatedContainer>
          )}

          {/* ── Lobby / Waiting ──────────────────── */}
          {phase === "lobby" && (
            <AnimatedContainer
              key="lobby"
              className="flex-1 flex items-center justify-center"
            >
              <WaitingScreen
                message="Waiting for the host to start"
                playerName={playerName}
                horseName={horseName}
              />
            </AnimatedContainer>
          )}

          {/* ── Question Phase ───────────────────── */}
          {phase === "question" && currentQuestion && (() => {
            const waitingForImage = !!currentQuestion.image_url && !imageLoaded;
            return (
            <AnimatedContainer
              key={`question-${currentQuestion.id}`}
              className="flex-1 flex flex-col gap-5"
            >
              {/* Question counter */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-navy/60">
                  Q{questionNumber}/{totalQuestions}
                </span>
                {currentQuestion.is_joker && (
                  <motion.span
                    initial={{ scale: 0, rotate: -12 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="px-3 py-1 rounded-xl bg-amber text-white text-xs font-extrabold uppercase tracking-wider"
                  >
                    Joker x2
                  </motion.span>
                )}
              </div>

              {/* Timer — show full bar while image loading, real value once ready */}
              <TimerBar
                timeRemaining={waitingForImage ? timeLimit : timeRemaining}
                timeLimit={timeLimit}
              />

              {/* Question text */}
              <div className="bg-white rounded-3xl shadow-md p-6">
                {currentQuestion.image_url && (
                  <div className="mb-4 rounded-2xl overflow-hidden relative aspect-video">
                    {!imageLoaded && (
                      <div className="absolute inset-0 bg-gray-200 rounded-xl animate-pulse flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-8 h-8 border-3 border-navy/20 border-t-navy rounded-full"
                          />
                          <span className="text-xs font-bold text-navy/40">Loading image...</span>
                        </div>
                      </div>
                    )}
                    <Image
                      src={currentQuestion.image_url}
                      alt="Question image"
                      fill
                      className="object-cover rounded-xl"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      loading="eager"
                      onLoad={() => setImageLoaded(true)}
                      style={currentQuestion.is_image_blurred ? {
                        filter: `blur(${blurAmount}px)`,
                        transition: 'filter 0.8s ease-out',
                      } : undefined}
                    />
                  </div>
                )}
                <h2 className="text-xl font-bold text-navy leading-snug">
                  {currentQuestion.question_text}
                </h2>
              </div>

              {/* Media indicator for video/audio */}
              {currentQuestion.type === "video_question" && (
                <div className="bg-primary/10 rounded-2xl px-5 py-3 text-center">
                  <span className="text-lg font-bold text-primary">
                    📺 Watch the screen...
                  </span>
                </div>
              )}
              {currentQuestion.type === "audio_question" && (
                <div className="bg-tertiary-fixed/20 rounded-2xl px-5 py-3 text-center">
                  <span className="text-lg font-bold text-tertiary-fixed-dim">
                    🎵 Listen carefully...
                  </span>
                </div>
              )}

              {/* Answer buttons — hidden until image is ready */}
              <div className={`mt-auto pb-2 ${waitingForImage ? 'opacity-0 pointer-events-none' : ''}`}>
                <AnswerButtons
                  question={currentQuestion}
                  onAnswer={handleAnswer}
                  disabled={waitingForImage}
                />
              </div>
            </AnimatedContainer>
            );
          })()}

          {/* ── Answered / Locked in ─────────────── */}
          {phase === "answered" && currentQuestion && (
            <AnimatedContainer
              key={`answered-${currentQuestion.id}`}
              className="flex-1 flex flex-col gap-5"
            >
              {/* Question counter */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-navy/60">
                  Q{questionNumber}/{totalQuestions}
                </span>
                {currentQuestion.is_joker && (
                  <span className="px-3 py-1 rounded-xl bg-amber text-white text-xs font-extrabold uppercase tracking-wider">
                    Joker x2
                  </span>
                )}
              </div>

              {/* Timer continues */}
              {timeLimit > 0 && (
                <TimerBar timeRemaining={timeRemaining} timeLimit={timeLimit} />
              )}

              {/* Question text (smaller) */}
              <div className="bg-white/60 rounded-2xl shadow-sm px-5 py-3">
                <h2 className="text-base font-semibold text-navy/70 leading-snug">
                  {currentQuestion.question_text}
                </h2>
              </div>

              {/* Selected answer card with pulsing ring */}
              <div className="flex-1 flex flex-col items-center justify-center gap-6">
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 0px 0px rgba(245,158,11,0.0)",
                      "0 0 0px 6px rgba(245,158,11,0.25)",
                      "0 0 0px 0px rgba(245,158,11,0.0)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-full max-w-xs rounded-2xl border-2 border-amber/40 bg-white px-6 py-5 text-center shadow-md"
                >
                  <p className="text-xs font-semibold text-amber-600/60 mb-1 uppercase tracking-wider">
                    Your answer
                  </p>
                  <p className="text-xl font-bold text-navy">{selectedAnswer}</p>
                </motion.div>

                <p className="text-sm text-ink/40 font-medium">
                  Everyone watching the big screen 👀
                </p>

                {/* Animated countdown dots */}
                <div className="flex items-center gap-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.25,
                      }}
                      className="w-2.5 h-2.5 rounded-full bg-navy/30"
                    />
                  ))}
                </div>
              </div>
            </AnimatedContainer>
          )}

          {/* ── Answer Revealed ───────────────────── */}
          {phase === "answer_revealed" && revealPhase === 'image_first' && currentQuestion?.image_url && (
            <AnimatedContainer
              key="answer-revealed-image"
              className="flex-1 flex flex-col items-center justify-center gap-6 px-2"
            >
              {/* Dramatic unblur image */}
              <motion.div
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative aspect-video"
              >
                <Image
                  src={currentQuestion.image_url}
                  alt="Revealed"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  style={{
                    filter: 'blur(0px)',
                    transition: 'filter 0.8s ease-out',
                  }}
                />
              </motion.div>

              {/* "IT IS..." answer reveal text */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
                className="text-center"
              >
                <p className="text-sm font-bold text-ink/40 uppercase tracking-widest mb-1">
                  It is...
                </p>
                <p className="text-3xl font-extrabold text-coral">
                  {revealCorrectAnswer}
                </p>
              </motion.div>
            </AnimatedContainer>
          )}

          {phase === "answer_revealed" && (revealPhase === 'points_shown' || revealPhase === null) && (
            <AnimatedContainer
              key="answer-revealed-points"
              className="flex-1 flex flex-col items-center justify-center gap-4"
            >
              {/* Show unblurred image (smaller) if this was a blurred image question */}
              {currentQuestion?.is_image_blurred && currentQuestion.image_url && (
                <div className="w-full max-w-xs rounded-xl overflow-hidden shadow-md relative aspect-video mb-2">
                  <Image
                    src={currentQuestion.image_url}
                    alt="Revealed"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              )}
              <AnswerReveal
                isCorrect={revealIsCorrect}
                pointsEarned={revealPoints}
                correctAnswer={revealCorrectAnswer}
                timeTakenMs={timeTakenMs}
                totalScore={totalScore}
                playerRank={playerRank}
                isJoker={revealIsJoker}
                questionNumber={questionNumber}
                totalQuestions={totalQuestions}
              />
            </AnimatedContainer>
          )}

          {/* ── Leaderboard Phase ────────────────── */}
          {phase === "leaderboard" && (
            <AnimatedContainer
              key="leaderboard"
              className="flex-1 flex flex-col items-center justify-center gap-6 py-4"
            >
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="text-center"
              >
                <div className="text-4xl mb-2">🏇</div>
                {playerRank !== null ? (
                  <>
                    {questionNumber > totalQuestions / 2 ? (
                      <h2 className="text-2xl font-extrabold text-navy">
                        🔒 Rankings hidden
                      </h2>
                    ) : (
                      <h2 className="text-2xl font-extrabold text-navy">
                        You&apos;re in {ordinalSuffix(playerRank)} place!
                      </h2>
                    )}
                    <p className="text-3xl font-bold text-coral mt-2">
                      {totalScore.toLocaleString()} pts
                    </p>
                  </>
                ) : (
                  <h2 className="text-xl font-bold text-navy">
                    Leaderboard updating...
                  </h2>
                )}
              </motion.div>

              {/* Mini leaderboard — top 5 */}
              {leaderboard.length > 0 && (
                <div className="w-full max-w-sm bg-white rounded-3xl shadow-md p-5 space-y-2">
                  {leaderboard.slice(0, 5).map((entry, i) => {
                    const isMe = entry.player_id === playerId;
                    return (
                      <motion.div
                        key={entry.player_id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: i * 0.08 }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${
                          isMe
                            ? "bg-navy text-white"
                            : "bg-cream text-ink"
                        }`}
                      >
                        <span className="text-lg font-extrabold w-8 text-center">
                          {entry.rank}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-bold truncate ${
                              isMe ? "text-white" : "text-navy"
                            }`}
                          >
                            {entry.player_name}
                            {isMe && " (you)"}
                          </p>
                          <p
                            className={`text-xs truncate ${
                              isMe ? "text-white/60" : "text-ink/40"
                            }`}
                          >
                            {entry.horse_name}
                          </p>
                        </div>
                        <span
                          className={`font-bold text-sm ${
                            isMe ? "text-amber" : "text-coral"
                          }`}
                        >
                          {entry.score.toLocaleString()}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </AnimatedContainer>
          )}

          {/* ── Finished Phase ───────────────────── */}
          {phase === "finished" && (
            <AnimatedContainer
              key="finished"
              className="flex-1 flex flex-col items-center justify-center gap-6 py-8"
            >
              {/* Celebration for top 3 */}
              {playerRank !== null && playerRank <= 3 && (
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 12,
                    delay: 0.2,
                  }}
                  className="text-7xl"
                >
                  {playerRank === 1 ? "🏆" : playerRank === 2 ? "🥈" : "🥉"}
                </motion.div>
              )}

              {playerRank !== null && playerRank > 3 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="text-6xl"
                >
                  🐎
                </motion.div>
              )}

              <div className="text-center">
                <h1 className="text-3xl font-extrabold text-navy mb-1">
                  Quiz Complete!
                </h1>
                {playerRank !== null && (
                  <p className="text-lg text-ink/60 font-medium">
                    You finished {ordinalSuffix(playerRank)}
                  </p>
                )}
              </div>

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-3xl shadow-lg px-10 py-8 text-center w-full max-w-xs"
              >
                <p className="text-ink/50 text-sm font-medium mb-1">
                  Final Score
                </p>
                <p className="text-5xl font-extrabold text-coral">
                  {totalScore.toLocaleString()}
                </p>
                <p className="text-ink/40 text-sm mt-1">points</p>
              </motion.div>

              {/* Mini leaderboard on player end screen */}
              {leaderboard.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="w-full max-w-xs bg-white rounded-3xl shadow-md p-4 space-y-1.5"
                >
                  {leaderboard.slice(0, 5).map((entry, i) => {
                    const isMe = entry.player_id === playerId;
                    return (
                      <div
                        key={entry.player_id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
                          isMe
                            ? "bg-navy text-white"
                            : "bg-cream text-ink"
                        }`}
                      >
                        <span className="font-extrabold w-6 text-center">
                          {entry.rank}
                        </span>
                        <span
                          className={`flex-1 truncate font-bold ${
                            isMe ? "text-white" : "text-navy"
                          }`}
                        >
                          {entry.player_name}
                          {isMe && " (you)"}
                        </span>
                        <span
                          className={`font-bold ${
                            isMe ? "text-amber" : "text-coral"
                          }`}
                        >
                          {entry.score.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </motion.div>
              )}

              {playerRank !== null && playerRank <= 3 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex gap-2"
                >
                  {["🎉", "🎊", "✨", "🎉", "🎊"].map((emoji, i) => (
                    <motion.span
                      key={i}
                      animate={{
                        y: [0, -12, 0],
                        rotate: [0, 10, -10, 0],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                      className="text-2xl"
                    >
                      {emoji}
                    </motion.span>
                  ))}
                </motion.div>
              )}

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-ink/40 font-medium text-sm"
              >
                Thanks for playing! 🐎
              </motion.p>

              <p className="text-sm text-outline/60 mt-4 text-center">
                You can close this tab now.
              </p>
            </AnimatedContainer>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

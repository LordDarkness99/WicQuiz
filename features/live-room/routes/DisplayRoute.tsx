"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchRoomByCode,
  fetchRoomPlayersByJoined,
  fetchRoomPlayersByScore,
  fetchQuestionsByQuiz,
  fetchQuizByRoom,
  countQuizQuestions,
  fetchAnswerValues,
  fetchQuestionById,
} from "@/features/live-room/data/liveRoomRepository";
import { useRoomChannel, usePlayersSubscription } from "@/features/realtime";
import QRCodeDisplay from "@/shared/ui/QRCodeDisplay";
import RacerAvatar from "@/shared/ui/RacerAvatar";
import EndGame from "@/features/live-room/components/EndGame";
import type {
  Room,
  Player,
  Question,
  GameState,
  LeaderboardEntry,
} from "@/shared/domain/types";
import { rankLeaderboard } from "@/features/leaderboard";

function getPlayerIndex(players: Player[], playerId: string): number {
  const sorted = [...players].sort(
    (a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
  );
  const idx = sorted.findIndex((p) => p.id === playerId);
  return idx >= 0 ? idx : 0;
}

interface AnswerDistribution {
  label: string;
  count: number;
  percent: number;
  isCorrect: boolean;
}

export default function DisplayScreen() {
  const params = useParams();
  const roomCode = params.roomCode as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState>("lobby");
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timeLimit, setTimeLimit] = useState(15);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [answerDistribution, setAnswerDistribution] = useState<AnswerDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  const { onBroadcast, broadcast } = useRoomChannel(roomCode);

  // Ref for currentQuestion so broadcast handlers always see latest value
  const currentQuestionRef = useRef(currentQuestion);
  currentQuestionRef.current = currentQuestion;

  // Fetch room + players on mount
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const roomData = await fetchRoomByCode(roomCode);

      if (!roomData) {
        setLoading(false);
        return;
      }
      setRoom(roomData);

      const playersData = await fetchRoomPlayersByJoined(roomData.id);

      if (playersData) setPlayers(playersData);

      if (roomData.status === "finished") setGameState("finished");

      // Late-join catch-up: if game is already active
      if (roomData.status === "active" && roomData.current_question_index !== undefined && roomData.current_question_index >= 0 && roomData.current_quiz_id) {
        const questions = await fetchQuestionsByQuiz(roomData.current_quiz_id);

        if (questions && questions.length > 0) {
          setTotalQuestions(questions.length);
          const idx = roomData.current_question_index;
          const q = questions[idx];
          if (q) {
            setCurrentQuestion(q as Question);
            setQuestionNumber(idx + 1);
            setTimeLimit(q.time_limit);
            setTimeRemaining(0);
            setGameState("question_end");
          }
        }
      }

      // Get quiz info for total questions
      const quizData = await fetchQuizByRoom(roomData.id);

      if (quizData) {
        const count = await countQuizQuestions(quizData.id);
        if (count) setTotalQuestions(count);
      }

      setLoading(false);
    }
    fetchData();
  }, [roomCode]);

  // Player join subscription
  const handlePlayerJoin = useCallback((payload: Record<string, unknown>) => {
    const newPlayer = payload as unknown as Player;
    setPlayers((prev) => {
      if (prev.some((p) => p.id === newPlayer.id)) return prev;
      return [...prev, newPlayer];
    });
  }, []);

  usePlayersSubscription(room?.id ?? "", handlePlayerJoin);

  // Subscribe to answer inserts for live answered counter
  useEffect(() => {
    if (!currentQuestion?.id) return;
    const questionId = currentQuestion.id;

    setAnsweredCount(0);

    const channel = supabase
      .channel("answers-display:" + questionId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "qt_answers",
          filter: "question_id=eq." + questionId,
        },
        () => {
          setAnsweredCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentQuestion?.id]);

  // Build answer distribution from DB when answer is revealed
  const fetchAnswerDistribution = useCallback(
    async (questionId: string, correct: string, question: Question) => {
      const answers = await fetchAnswerValues(questionId);

      if (answers.length === 0) {
        setAnswerDistribution([]);
        return;
      }

      const total = answers.length;
      const options = question.options;

      if (
        options &&
        (question.type === "multiple_choice" ||
          question.type === "image_question" ||
          question.type === "video_question" ||
          question.type === "audio_question")
      ) {
        // Count per option text (answer_value stores the full option text)
        const counts: Record<string, number> = {};
        options.forEach((label) => { counts[label] = 0; });
        for (const a of answers) {
          const val = a.answer_value;
          if (counts[val] !== undefined) counts[val]++;
          // Also handle index-based submissions for backwards compat
          else if (!isNaN(Number(val)) && options[Number(val)]) {
            counts[options[Number(val)]]++;
          }
        }
        setAnswerDistribution(
          options.map((label) => ({
            label,
            count: counts[label] || 0,
            percent: total > 0 ? ((counts[label] || 0) / total) * 100 : 0,
            isCorrect: label === correct,
          }))
        );
      } else if (question.type === "true_false") {
        const trueCount = answers.filter((a) => a.answer_value === "true").length;
        const falseCount = answers.filter((a) => a.answer_value === "false").length;
        setAnswerDistribution([
          {
            label: "True",
            count: trueCount,
            percent: total > 0 ? (trueCount / total) * 100 : 0,
            isCorrect: correct === "true",
          },
          {
            label: "False",
            count: falseCount,
            percent: total > 0 ? (falseCount / total) * 100 : 0,
            isCorrect: correct === "false",
          },
        ]);
      } else {
        // For slider/type_in, just show correct vs wrong
        const correctCount = answers.filter((a) => {
          if (question.type === "type_in") {
            return a.answer_value.toLowerCase().trim() === correct.toLowerCase().trim();
          }
          return a.answer_value === correct;
        }).length;
        setAnswerDistribution([
          {
            label: "Correct",
            count: correctCount,
            percent: total > 0 ? (correctCount / total) * 100 : 0,
            isCorrect: true,
          },
          {
            label: "Wrong",
            count: total - correctCount,
            percent: total > 0 ? ((total - correctCount) / total) * 100 : 0,
            isCorrect: false,
          },
        ]);
      }
    },
    []
  );

  // Listen to broadcast events
  useEffect(() => {
    onBroadcast("game_state_change", (payload) => {
      const state = payload.state as GameState;
      setGameState(state);
      if (state === "question_start") {
        setCorrectAnswer(null);
        setAnswerDistribution([]);
        setAnsweredCount(0);
      }
    });

    onBroadcast("question_reveal", (payload) => {
      const q = payload.question as Question;
      setCurrentQuestion(q);
      setQuestionNumber(payload.question_number as number);
      setTotalQuestions(payload.total_questions as number);
      setTimeRemaining(q.time_limit);
      setTimeLimit(q.time_limit);
      setCorrectAnswer(null);
      setAnswerDistribution([]);
    });

    onBroadcast("timer_tick", (payload) => {
      setTimeRemaining(payload.time_remaining as number);
      setTimeLimit(payload.time_limit as number);
    });

    onBroadcast("answer_revealed", async (payload) => {
      const answer = payload.correctAnswer as string;
      setCorrectAnswer(answer);
      setGameState("question_end");

      let q = currentQuestionRef.current;
      if (!q && payload.questionId) {
        const data = await fetchQuestionById(payload.questionId as string);
        if (data) q = data;
      }
      if (q) {
        fetchAnswerDistribution(payload.questionId as string, answer, q);
      }
    });

    onBroadcast("leaderboard_update", (payload) => {
      const entries = payload.leaderboard as LeaderboardEntry[];
      setLeaderboard(entries);
      if (room) {
        fetchRoomPlayersByScore(room.id).then((data) => {
          if (data) setPlayers(data);
        });
      }
    });
  }, [onBroadcast, room]);

  // Build live leaderboard from players
  const liveLeaderboard = useMemo((): LeaderboardEntry[] => {
    if (leaderboard.length > 0) return leaderboard;
    return rankLeaderboard(players);
  }, [players, leaderboard]);

  const joinUrl = "quiztime-alpha.vercel.app";

  // Resolve correct answer display text
  const correctAnswerDisplay = useMemo(() => {
    if (!correctAnswer || !currentQuestion) return correctAnswer;
    const opt = currentQuestion.options;
    if (
      opt &&
      (currentQuestion.type === "multiple_choice" ||
        currentQuestion.type === "image_question" ||
        currentQuestion.type === "video_question" ||
        currentQuestion.type === "audio_question")
    ) {
      const idx = parseInt(correctAnswer);
      if (!isNaN(idx) && opt[idx]) return opt[idx];
    }
    if (currentQuestion.type === "true_false") {
      return correctAnswer === "true" ? "True" : "False";
    }
    return correctAnswer;
  }, [correctAnswer, currentQuestion]);

  // Host toolbar - full controls from projector screen
  const hostToolbar = (
    <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 shadow-xl">
      <span className="text-white/30 text-xs font-mono mr-1">{roomCode.toUpperCase()}</span>

      {/* Reveal Answer - asks the host page to run scoring + reveal */}
      {(gameState === "question_end" || gameState === "question_start") && !correctAnswer && currentQuestionRef.current && (
        <button
          onClick={() => {
            // Tell host page to run its full revealAnswer() logic (scoring + broadcast)
            broadcast("reveal_answer_request", {});
          }}
          className="px-4 py-1.5 rounded-xl bg-[#FF6B6B] text-white text-sm font-bold hover:opacity-90 active:scale-95 transition-all"
        >
          Reveal
        </button>
      )}

      {/* Show Leaderboard - after reveal */}
      {gameState === "question_end" && correctAnswer && (
        <button
          onClick={() => {
            broadcast("show_leaderboard_request", {});
            setGameState("leaderboard");
          }}
          className="px-4 py-1.5 rounded-xl bg-[#8594CD] text-white text-sm font-bold hover:opacity-90 active:scale-95 transition-all"
        >
          Leaderboard
        </button>
      )}

      {/* Next Question - after reveal or from leaderboard */}
      {(gameState === "question_end" && correctAnswer || gameState === "leaderboard") && questionNumber < totalQuestions && (
        <button
          onClick={() => {
            broadcast("next_question_request", { nextIndex: questionNumber });
          }}
          className="px-4 py-1.5 rounded-xl bg-white/20 text-white text-sm font-bold hover:bg-white/30 active:scale-95 transition-all"
        >
          Next →
        </button>
      )}

      {/* Finish Game */}
      {(gameState === "question_end" && correctAnswer || gameState === "leaderboard") && questionNumber >= totalQuestions && (
        <button
          onClick={() => {
            broadcast("finish_game_request", {});
          }}
          className="px-4 py-1.5 rounded-xl bg-[#FF6B6B] text-white text-sm font-bold hover:opacity-90 active:scale-95 transition-all"
        >
          Finish 🏆
        </button>
      )}

      {/* Question progress */}
      {questionNumber > 0 && (
        <span className="text-white/30 text-xs ml-1">{questionNumber}/{totalQuestions}</span>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#021549] flex items-center justify-center">
        <motion.div
          className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  // ---------- LOBBY ----------
  if (gameState === "lobby") {
    return (
      <div className="min-h-screen bg-[#021549] text-[#FAFAF7] flex flex-col items-center p-8 overflow-hidden">
        {hostToolbar}
        {/* Top: Logo */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-7xl font-black tracking-tight mt-8 mb-6"
        >
          QuizTime
        </motion.h1>

        {/* Center: QR + join info + room code */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-2xl shadow-2xl"
          >
            <QRCodeDisplay
              url={`https://${joinUrl}/play/${roomCode}`}
              size={260}
            />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-[#FAFAF7]/60 font-medium"
          >
            Join at{" "}
            <span className="text-[#FAFAF7] font-bold">{joinUrl}</span>
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center"
          >
            <p className="text-sm uppercase tracking-widest text-[#FAFAF7]/40 font-bold mb-1">
              Room Code
            </p>
            <p className="text-7xl font-black tracking-tighter text-[#FF6B6B]">
              {roomCode}
            </p>
          </motion.div>
        </div>

        {/* Bottom: Player list */}
        <div className="flex-1 w-full max-w-5xl">
          <p className="text-sm uppercase tracking-widest text-[#FAFAF7]/40 font-bold mb-4 text-center">
            {players.length} player{players.length !== 1 ? "s" : ""} joined
          </p>
          <div className="flex flex-wrap justify-center gap-3 max-h-[280px] overflow-y-auto">
            <AnimatePresence>
              {players.map((player, idx) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                    delay: idx * 0.04,
                  }}
                  className="bg-white/10 backdrop-blur px-5 py-3 rounded-xl flex items-center gap-3"
                >
                  <RacerAvatar index={idx} size={32} />
                  <span className="font-bold text-lg truncate max-w-[140px]">
                    {player.name}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Pulsing dot */}
        <motion.div
          className="flex items-center gap-2 text-[#FAFAF7]/30 mt-4"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-3 h-3 rounded-full bg-[#FF6B6B]" />
          <span className="text-sm font-medium">
            Waiting for host to start...
          </span>
        </motion.div>
      </div>
    );
  }

  // ---------- FINISHED ----------
  if (gameState === "finished") {
    return (
      <EndGame
        players={liveLeaderboard}
        quizTitle=""
        totalQuestions={totalQuestions}
        isHost={false}
      />
    );
  }

  // ---------- LEADERBOARD ----------
  if (gameState === "leaderboard") {
    return (
      <div className="min-h-screen bg-[#021549] text-[#FAFAF7] flex flex-col items-center p-12">
        {hostToolbar}
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-black mb-10"
        >
          👑 STANDINGS
        </motion.h2>

        <div className="w-full max-w-3xl space-y-3">
          {liveLeaderboard.slice(0, 8).map((entry, idx) => (
            <motion.div
              key={entry.player_id}
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08, type: "spring", stiffness: 300, damping: 30 }}
              className={`flex items-center gap-5 px-8 py-4 rounded-2xl ${
                idx === 0
                  ? "bg-gradient-to-r from-[#FF6B6B]/30 to-[#FF6B6B]/10 border-2 border-[#FF6B6B]/50"
                  : idx < 3
                  ? "bg-[#FFB95F]/10 border border-[#FFB95F]/30"
                  : "bg-white/5 border border-white/10"
              }`}
            >
              <span className="text-3xl font-black w-12 text-center text-[#FAFAF7]/60">
                {entry.rank}
              </span>
              <RacerAvatar index={getPlayerIndex(players, entry.player_id)} size={36} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xl truncate">{entry.player_name}</p>
              </div>
              <span className="font-mono font-bold text-2xl text-[#FF6B6B]">
                {entry.score.toLocaleString()}
              </span>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 text-[#FAFAF7]/40 text-lg font-medium"
        >
          Question {questionNumber} of {totalQuestions}
        </motion.p>
      </div>
    );
  }

  // ---------- ANSWER REVEALED ----------
  if (
    (gameState === "question_end" && correctAnswer !== null) ||
    (gameState === "question_start" && correctAnswer !== null)
  ) {
    return (
      <div className="min-h-screen bg-[#021549] text-[#FAFAF7] flex flex-col p-12">
        {hostToolbar}
        {/* Question text (smaller) */}
        <div className="mb-8">
          <span className="text-[#FAFAF7]/40 text-sm font-bold uppercase tracking-widest">
            Q{questionNumber} of {totalQuestions}
          </span>
          <h2 className="text-2xl font-bold mt-2 max-w-4xl">
            {currentQuestion?.question_text}
          </h2>
        </div>

        {/* Distribution bars */}
        <div className="flex-1 flex flex-col justify-center max-w-4xl w-full mx-auto gap-4">
          <AnimatePresence>
            {answerDistribution.map((item, idx) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, type: "spring", stiffness: 300, damping: 30 }}
                className="flex items-center gap-4"
              >
                {/* Label */}
                <div className="w-48 flex-shrink-0 text-right">
                  <span
                    className={`text-lg font-bold ${
                      item.isCorrect ? "text-emerald-400" : "text-[#FAFAF7]/40"
                    }`}
                  >
                    {item.isCorrect && (
                      <svg
                        className="w-5 h-5 inline mr-2 -mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                    {item.label}
                  </span>
                </div>

                {/* Bar */}
                <div className="flex-1 h-12 bg-white/5 rounded-xl overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(item.percent, 2)}%` }}
                    transition={{ delay: idx * 0.1 + 0.2, duration: 0.6, ease: "easeOut" }}
                    className={`h-full rounded-xl ${
                      item.isCorrect
                        ? "bg-emerald-500/80"
                        : "bg-white/10"
                    }`}
                  />
                </div>

                {/* Count */}
                <span
                  className={`w-16 text-right font-mono font-bold text-lg ${
                    item.isCorrect ? "text-emerald-400" : "text-[#FAFAF7]/40"
                  }`}
                >
                  {item.count}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Correct answer banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-sm uppercase tracking-widest text-emerald-400/60 font-bold mb-2">
            Correct Answer
          </p>
          <p className="text-4xl font-black text-emerald-400">
            {correctAnswerDisplay}
          </p>
        </motion.div>
      </div>
    );
  }

  // ---------- QUESTION ACTIVE / QUESTION END ----------
  if (
    (gameState === "question_start" || gameState === "question_end") &&
    currentQuestion
  ) {
    const timerFraction = timeLimit > 0 ? timeRemaining / timeLimit : 0;
    const isTimerDone = gameState === "question_end" || timeRemaining === 0;

    return (
      <div className="min-h-screen bg-[#021549] text-[#FAFAF7] flex flex-col relative">
        {hostToolbar}
        {/* Q number top left */}
        <div className="absolute top-8 left-12 z-10">
          <span className="px-4 py-2 rounded-full bg-white/10 text-sm font-bold uppercase tracking-widest">
            Q{questionNumber} of {totalQuestions}
          </span>
        </div>

        {/* Joker badge */}
        {currentQuestion.is_joker && (
          <div className="absolute top-8 right-12 z-10">
            <span className="px-4 py-2 rounded-full bg-[#FFB95F] text-[#1B2B5E] text-sm font-bold uppercase">
              Joker 2x
            </span>
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 flex flex-col items-center justify-center px-12">
          {/* Image if present */}
          {currentQuestion.image_url && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8 max-h-[40vh] overflow-hidden rounded-2xl"
            >
              <img
                src={currentQuestion.image_url}
                alt="Question"
                className={`max-h-[40vh] object-contain rounded-2xl ${
                  currentQuestion.is_image_blurred && gameState === "question_start" && timeRemaining > timeLimit * 0.3
                    ? "blur-xl transition-[filter] duration-[3000ms]"
                    : currentQuestion.is_image_blurred && gameState === "question_start"
                    ? "blur-sm transition-[filter] duration-[3000ms]"
                    : ""
                }`}
              />
            </motion.div>
          )}

          {/* Question text */}
          <motion.h1
            key={`q-${questionNumber}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-black text-center leading-tight max-w-5xl"
          >
            {currentQuestion.question_text}
          </motion.h1>

          {/* Waiting text when timer done */}
          {isTimerDone && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 text-[#FAFAF7]/30 text-lg"
            >
              Waiting for host to reveal...
            </motion.p>
          )}
        </div>

        {/* Bottom: timer bar + answered counter */}
        <div className="flex-shrink-0 px-0 pb-0">
          {/* Answered counter */}
          <div className="flex justify-end px-12 pb-4">
            <motion.span
              key={answeredCount}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="text-[#FAFAF7]/50 font-bold text-lg"
            >
              {answeredCount} / {players.length} answered
            </motion.span>
          </div>

          {/* Full width timer bar */}
          <div className="w-full h-3 bg-white/5">
            <motion.div
              className="h-full bg-[#FF6B6B]"
              style={{
                width: `${timerFraction * 100}%`,
                transition: "width 900ms linear",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-[#021549] text-[#FAFAF7] flex items-center justify-center">
      {hostToolbar}
      <p className="text-xl text-[#FAFAF7]/40">Waiting...</p>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  fetchRoomByCode,
  fetchQuizByRoom,
  fetchQuestionsByQuiz,
  fetchRoomPlayersByJoined,
  fetchRoomPlayersByScore,
  fetchAnswerScore,
  fetchCorrectAnswerTimes,
  fetchAnswerCorrectness,
  fetchQuestionAnswerStats,
  fetchQuestionIdsByQuiz,
  setRoomActive,
  setRoomCurrentQuestion,
  updateAnswerScore,
  updatePlayerScore,
  setRoomFinished,
  deleteAnswersForQuestions,
  deleteRoomPlayers,
  resetRoomToLobby,
} from "@/features/live-room/data/liveRoomRepository";
import {
  saveSessionResult,
  computeAvgTimeMap,
  computeCorrectCountMap,
  buildQuestionStat,
  type QuestionStat,
} from "@/features/session-results";
import {
  useRoomChannel,
  usePlayersSubscription,
  useAnswersSubscription,
  useTimer,
} from "@/features/realtime";
import { scoreAnswers } from "@/features/live-room/application/scoreAnswers";
import { isInSuspensePhase, rankLeaderboard } from "@/features/leaderboard";
import type {
  Room,
  Quiz,
  Question,
  Player,
  Answer,
  GameState,
  LeaderboardEntry,
} from "@/shared/domain/types";
import Image from "next/image";
import Button from "@/shared/ui/Button";
import AnimatedContainer from "@/shared/ui/AnimatedContainer";
import AnswerDistribution from "@/features/live-room/components/AnswerDistribution";
import Lobby from "@/features/live-room/components/Lobby";
import SuspenseModal from "@/features/live-room/components/SuspenseModal";
import { VideoPlayer } from "@/features/media";
import { AudioPlayer } from "@/features/media";
import EndGame from "@/features/live-room/components/EndGame";
import TimerBar from "@/shared/ui/TimerBar";
import DisplayView from "@/features/live-room/components/DisplayView";
import RacerAvatar from "@/shared/ui/RacerAvatar";

export default function HostControlPanel() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCode = params.roomCode as string;
  const templateId = searchParams.get("templateId");

  // View mode toggle: host panel vs display/projector screen
  const [viewMode, setViewMode] = useState<'host' | 'display'>(
    searchParams.get('view') === 'display' ? 'display' : 'host'
  );

  // Core data
  const [room, setRoom] = useState<Room | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Game state
  const [gameState, setGameState] = useState<GameState>("lobby");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [currentAnswers, setCurrentAnswers] = useState<Answer[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [scoringComplete, setScoringComplete] = useState(false);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [suspenseMode, setSuspenseMode] = useState(false);
  const [showSuspenseModal, setShowSuspenseModal] = useState(false);
  const [hostImageLoaded, setHostImageLoaded] = useState(false);
  const [hostBlurAmount, setHostBlurAmount] = useState(0);

  // Refs to avoid stale closures
  const playersRef = useRef<Player[]>(players);
  playersRef.current = players;
  const questionsRef = useRef<Question[]>(questions);
  questionsRef.current = questions;
  const currentQuestionIndexRef = useRef(currentQuestionIndex);
  currentQuestionIndexRef.current = currentQuestionIndex;

  const currentQuestion = useMemo(
    () => questions[currentQuestionIndex] ?? null,
    [questions, currentQuestionIndex]
  );

  // Realtime channel
  const { broadcast, onBroadcast } = useRoomChannel(roomCode);

  // Refs so display toolbar can call these before they're defined below
  const nextQuestionRef = useRef<() => void>(() => {});
  const showLeaderboardRef = useRef<() => void>(() => {});
  const finishGameRef = useRef<() => Promise<void>>(async () => {});
  const revealAnswerRef = useRef<() => Promise<void>>(async () => {});

  // Listen for display screen toolbar requests
  useEffect(() => {
    onBroadcast("next_question_request", () => { nextQuestionRef.current(); });
    onBroadcast("show_leaderboard_request", () => { void showLeaderboardRef.current(); });
    onBroadcast("finish_game_request", () => { void finishGameRef.current(); });
    onBroadcast("reveal_answer_request", () => { void revealAnswerRef.current(); });
  }, [onBroadcast]);

  // Timer
  const handleTimerTick = useCallback(
    (remaining: number) => {
      if (!currentQuestion) return;
      broadcast("timer_tick", {
        time_remaining: remaining,
        time_limit: currentQuestion.time_limit,
      });
    },
    [broadcast, currentQuestion]
  );

  const handleTimerComplete = useCallback(() => {
    setTimerRunning(false);
    setGameState("question_end");
    broadcast("game_state_change", {
      state: "question_end",
      current_question_index: currentQuestionIndexRef.current,
    });
  }, [broadcast]);

  const { timeRemaining, reset: resetTimer } = useTimer(
    currentQuestion?.time_limit ?? 15,
    timerRunning,
    handleTimerTick,
    handleTimerComplete
  );

  // Progressive blur for host screen
  useEffect(() => {
    if (!currentQuestion?.is_image_blurred) {
      setHostBlurAmount(0);
      return;
    }
    if (answerRevealed) {
      setHostBlurAmount(0);
      return;
    }
    if (gameState === "question_start" || gameState === "question_end") {
      const tl = currentQuestion.time_limit ?? 15;
      const fraction = tl > 0 ? timeRemaining / tl : 1;
      setHostBlurAmount(Math.max(6, 16 * fraction));
    }
  }, [currentQuestion, gameState, timeRemaining, answerRevealed]);

  // ---------- DATA FETCHING ----------

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const roomData = await fetchRoomByCode(roomCode);

        if (!roomData) {
          setError("Room not found.");
          setLoading(false);
          return;
        }
        setRoom(roomData);

        const quizData = await fetchQuizByRoom(roomData.id);

        if (!quizData) {
          setError("Quiz not found for this room.");
          setLoading(false);
          return;
        }
        setQuiz(quizData);

        const questionsData = await fetchQuestionsByQuiz(quizData.id);

        if (questionsData === null) {
          setError("Failed to load questions.");
          setLoading(false);
          return;
        }
        setQuestions(questionsData);

        const playersData = await fetchRoomPlayersByJoined(roomData.id);

        if (playersData) {
          setPlayers(playersData);
        }

        if (roomData.status === "finished") {
          setGameState("finished");
        }
      } catch {
        setError("Failed to load game data.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [roomCode]);

  // ---------- PLAYER SUBSCRIPTION ----------

  const handlePlayerJoin = useCallback((payload: Record<string, unknown>) => {
    const newPlayer = payload as unknown as Player;
    setPlayers((prev) => {
      if (prev.some((p) => p.id === newPlayer.id)) return prev;
      toast(`🐎 ${newPlayer.name} joined as "${newPlayer.horse_name}"`, {
        duration: 3000,
      });
      return [...prev, newPlayer];
    });
  }, []);

  usePlayersSubscription(room?.id ?? "", handlePlayerJoin);

  // ---------- ANSWER SUBSCRIPTION ----------

  const handleNewAnswer = useCallback((payload: Record<string, unknown>) => {
    const answer = payload as unknown as Answer;
    setCurrentAnswers((prev) => {
      if (prev.some((a) => a.id === answer.id)) return prev;
      return [...prev, answer];
    });
    setAnsweredCount((prev) => prev + 1);
  }, []);

  useAnswersSubscription(currentQuestion?.id ?? "", handleNewAnswer);

  // ---------- GAME ACTIONS ----------

  const startGame = async () => {
    if (!room || players.length === 0) return;

    await setRoomActive(room.id, quiz?.id);

    setRoom((prev) => (prev ? { ...prev, status: "active" } : prev));
    toast.success(`Game started! ${players.length} player${players.length !== 1 ? "s" : ""} in the room.`);
    startQuestion(0);
  };

  const startQuestion = async (index: number) => {
    const question = questionsRef.current[index];
    if (!question) return;

    setCurrentQuestionIndex(index);
    setAnsweredCount(0);
    setCurrentAnswers([]);
    setScoringComplete(false);
    setAnswerRevealed(false);
    setHostImageLoaded(false);
    setGameState("question_start");
    setTimerRunning(true);
    resetTimer(question.time_limit);

    const safeQuestion: Partial<Question> = {
      id: question.id,
      quiz_id: question.quiz_id,
      type: question.type,
      question_text: question.question_text,
      options: question.options,
      time_limit: question.time_limit,
      points_base: question.points_base,
      order_index: question.order_index,
      image_url: question.image_url,
      is_joker: question.is_joker,
      is_image_blurred: question.is_image_blurred ?? false,
      slider_min: question.slider_min,
      slider_max: question.slider_max,
      video_url: question.video_url,
      video_start_seconds: question.video_start_seconds,
      video_end_seconds: question.video_end_seconds,
      audio_url: question.audio_url,
    };

    broadcast("question_reveal", {
      question: safeQuestion,
      question_number: index + 1,
      total_questions: questionsRef.current.length,
    });

    broadcast("game_state_change", {
      state: "question_start",
      current_question_index: index,
    });

    // Persist current question index to DB for late-join catch-up
    if (room) {
      await setRoomCurrentQuestion(room.id, index, quiz?.id);
    }
  };

  // ---------- SCORING ----------

  useEffect(() => {
    if (gameState !== "question_end" || !currentQuestion || scoringComplete)
      return;

    async function runScoring() {
      const { updates, playerPointsMap } = scoreAnswers(
        currentQuestion!,
        currentAnswers
      );

      for (const u of updates) {
        await updateAnswerScore(u.id, u.is_correct, u.points_earned);
      }

      for (const [playerId, pointsToAdd] of Object.entries(playerPointsMap)) {
        const player = playersRef.current.find((p) => p.id === playerId);
        if (player) {
          const newScore = player.score + pointsToAdd;
          await updatePlayerScore(playerId, newScore);
        }
      }

      if (room) {
        const freshPlayers = await fetchRoomPlayersByScore(room.id);

        if (freshPlayers) {
          setPlayers(freshPlayers);
        }
      }

      setScoringComplete(true);
    }

    runScoring();
  }, [gameState, currentQuestion, currentAnswers, scoringComplete, room]);

  // ---------- LEADERBOARD ----------

  const buildLeaderboard = useCallback(
    (
      avgTimeMap?: Record<string, number>,
      correctCountMap?: Record<string, number>
    ): LeaderboardEntry[] => rankLeaderboard(players, avgTimeMap, correctCountMap),
    [players]
  );

  const revealAnswer = async () => {
    if (!currentQuestion) return;

    // Build playerResults from currentAnswers (already scored)
    const playerResults: Record<string, { isCorrect: boolean; pointsEarned: number }> = {};

    for (const answer of currentAnswers) {
      // Fetch the scored answer from DB to get is_correct and points_earned
      const data = await fetchAnswerScore(answer.id);

      if (data) {
        playerResults[answer.player_id] = {
          isCorrect: data.is_correct,
          pointsEarned: data.points_earned,
        };
      }
    }

    // Find next question's image URL for preloading on clients
    const nextIdx = currentQuestionIndexRef.current + 1;
    const nextQ = questionsRef.current[nextIdx];
    const nextImageUrl = nextQ?.image_url || null;

    broadcast("answer_revealed", {
      questionId: currentQuestion.id,
      correctAnswer: currentQuestion.correct_answer,
      playerResults,
      nextImageUrl,
    });

    setAnswerRevealed(true);
  };
  revealAnswerRef.current = revealAnswer;

  const showLeaderboard = async () => {
    // Fetch fresh scores from DB before showing leaderboard
    let latestPlayers = players;
    if (room) {
      const data = await fetchRoomPlayersByScore(room.id);
      if (data) {
        latestPlayers = data;
        setPlayers(latestPlayers);
      }
    }
    const entries = rankLeaderboard(latestPlayers);
    setLeaderboard(entries);
    setGameState("leaderboard");

    broadcast("leaderboard_update", { leaderboard: entries });
    broadcast("game_state_change", {
      state: "leaderboard",
      current_question_index: currentQuestionIndex,
    });
  };
  showLeaderboardRef.current = showLeaderboard;

  const nextQuestion = () => {
    const nextIdx = currentQuestionIndex + 1;
    if (nextIdx < questions.length) {
      startQuestion(nextIdx);
    } else {
      finishGame();
    }
  };
  nextQuestionRef.current = nextQuestion;

  const finishGame = async () => {
    setGameState("finished");

    // Compute per-player average time (correct answers only)
    let avgTimeMap: Record<string, number> = {};
    if (room) {
      const questionIds = questionsRef.current.map((q) => q.id);
      if (questionIds.length > 0) {
        avgTimeMap = computeAvgTimeMap(await fetchCorrectAnswerTimes(questionIds));
      }
    }

    // Compute per-player correct answer count
    let correctCountMap: Record<string, number> = {};
    if (room) {
      const questionIds = questionsRef.current.map((q) => q.id);
      if (questionIds.length > 0) {
        correctCountMap = computeCorrectCountMap(
          await fetchAnswerCorrectness(questionIds)
        );
      }
    }

    const entries = buildLeaderboard(avgTimeMap, correctCountMap);
    setLeaderboard(entries);
    if (entries.length > 0) {
      toast.success(`Game over! 🏆 ${entries[0].player_name} wins with ${entries[0].score.toLocaleString()} pts`);
    } else {
      toast.success("Game over! Results saved.");
    }

    broadcast("leaderboard_update", { leaderboard: entries });
    broadcast("game_state_change", { state: "finished" });

    if (room) {
      await setRoomFinished(room.id);
      setRoom((prev) => (prev ? { ...prev, status: "finished" } : prev));

      // Save session results
      try {
        const questionStats: QuestionStat[] = [];
        for (const q of questionsRef.current) {
          const answers = await fetchQuestionAnswerStats(q.id);
          questionStats.push(buildQuestionStat(q.id, q.question_text, answers));
        }

        await saveSessionResult(
          room.id,
          templateId,
          room.host_id,
          quiz?.title || "Untitled",
          playersRef.current.length,
          questionsRef.current.length,
          entries,
          questionStats,
          room.created_at
        );
      } catch {
        // Non-blocking: session results save failure shouldn't break the game
      }
    }
  };

  finishGameRef.current = finishGame;

  // ---------- ANSWER DISTRIBUTION DATA ----------

  const answerDistribution = useMemo(() => {
    if (!currentQuestion) return [];

    const counts: Record<string, number> = {};

    if (
      currentQuestion.type === "multiple_choice" ||
      currentQuestion.type === "image_question" ||
      currentQuestion.type === "video_question" ||
      currentQuestion.type === "audio_question"
    ) {
      (currentQuestion.options || []).forEach((opt) => {
        counts[opt] = 0;
      });
    } else if (currentQuestion.type === "true_false") {
      counts["True"] = 0;
      counts["False"] = 0;
    }

    currentAnswers.forEach((a) => {
      counts[a.answer_value] = (counts[a.answer_value] || 0) + 1;
    });

    return Object.entries(counts).map(([answer_value, count]) => ({
      answer_value,
      count,
    }));
  }, [currentQuestion, currentAnswers]);

  // ---------- HELPERS ----------

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/play/${roomCode}`
      : "";

  const displayUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/host/${roomCode}/display`
      : "";

  const isLastQuestion = currentQuestionIndex >= questions.length - 1;

  // Timer circle calculations
  const timerFraction =
    currentQuestion && currentQuestion.time_limit > 0
      ? timeRemaining / currentQuestion.time_limit
      : 0;
  const circumference = 2 * Math.PI * 20;
  const timerDashoffset = circumference * (1 - timerFraction);

  // ---------- VIEW MODE TOGGLE ----------

  const viewToggle = (
    <button
      onClick={() => setViewMode(v => v === 'host' ? 'display' : 'host')}
      className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 shadow-xl text-white text-sm font-bold hover:bg-black/80 active:scale-95 transition-all"
    >
      <span className="material-symbols-outlined text-base">
        {viewMode === 'host' ? 'tv' : 'dashboard'}
      </span>
      {viewMode === 'host' ? 'Display View' : 'Host Panel'}
    </button>
  );

  // ---------- DISPLAY MODE ----------

  if (viewMode === 'display') {
    return (
      <>
        <DisplayView
          gameState={gameState}
          currentQuestion={currentQuestion}
          timeRemaining={timeRemaining}
          timeLimit={currentQuestion?.time_limit ?? 15}
          players={players}
          leaderboard={leaderboard}
          currentAnswers={currentAnswers}
          answerRevealed={answerRevealed}
          scoringComplete={scoringComplete}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={questions.length}
          roomCode={roomCode}
          onReveal={revealAnswer}
          onShowLeaderboard={showLeaderboard}
          onNextQuestion={nextQuestion}
          onFinishGame={finishGame}
          onEndTimerEarly={() => {
            setTimerRunning(false);
            setGameState("question_end");
            broadcast("game_state_change", {
              state: "question_end",
              current_question_index: currentQuestionIndex,
            });
          }}
        />
        <button
          onClick={() => setViewMode('host')}
          className="fixed bottom-6 right-6 z-[100] bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-3 py-2 rounded-xl border border-white/20 hover:bg-black/70 flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[14px]">dashboard</span>
          Host Panel
        </button>
      </>
    );
  }

  // ---------- LOADING / ERROR ----------

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        {viewToggle}
        <motion.div
          className="w-12 h-12 border-4 border-surface/20 border-t-surface rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (error || !room || !quiz) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center px-4">
        {viewToggle}
        <AnimatedContainer className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">
            {error || "Something went wrong"}
          </h1>
          <Button variant="coral" size="lg" onClick={() => router.push("/")}>
            Back to Home
          </Button>
        </AnimatedContainer>
      </div>
    );
  }

  // ---------- LOBBY STATE ----------

  if (gameState === "lobby") {
    return (
      <>
      {viewToggle}
      <Lobby
        players={players.map((p) => ({
          name: p.name,
          horse_name: p.horse_name,
        }))}
        roomCode={roomCode}
        joinUrl={joinUrl}
        quizTitle={quiz.title}
        questionCount={questions.length}
        onStart={startGame}
        canStart={players.length > 0}
        displayUrl={displayUrl}
      />
      </>
    );
  }

  // ---------- LIVE SESSION / LEADERBOARD / FINISHED ----------

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col overflow-hidden">
      {viewToggle}
      {/* Top Header */}
      <header className="bg-surface-bright flex justify-between items-center w-full px-8 py-4 z-50">
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/host/dashboard')} className="text-xl font-bold text-primary-container tracking-tighter hover:opacity-70 transition-opacity">
            QuizTime
          </button>
          <div className="h-6 w-px bg-outline-variant/20" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest font-bold text-outline">
              Current Session
            </span>
            <span className="text-sm font-bold text-primary">{quiz.title}</span>
          </div>
        </div>

        {/* Center: Timer & Question Counter */}
        {(gameState === "question_start" || gameState === "question_end") &&
          currentQuestion && (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-8 glass-panel px-10 py-3 rounded-full shadow-[0px_20px_40px_rgba(27,43,94,0.06)]">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-primary opacity-60 uppercase tracking-widest">
                  Progress
                </span>
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={currentQuestionIndex}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 10, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="text-lg font-black text-primary inline-block"
                  >
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </motion.span>
                </AnimatePresence>
              </div>
              <div className="h-10 w-0.5 bg-primary/10" />
              <div className="flex items-center gap-4">
                <div className="relative flex items-center justify-center">
                  <svg className="w-12 h-12 -rotate-90">
                    <circle
                      className="text-surface-container-highest"
                      cx="24"
                      cy="24"
                      fill="transparent"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <circle
                      className="text-tertiary-fixed-dim"
                      cx="24"
                      cy="24"
                      fill="transparent"
                      r="20"
                      stroke="currentColor"
                      strokeDasharray={circumference}
                      strokeDashoffset={timerDashoffset}
                      strokeWidth="4"
                      style={{ transition: "stroke-dashoffset 0.9s linear" }}
                    />
                  </svg>
                  <span className="absolute text-xl font-black text-primary">
                    {timeRemaining}
                  </span>
                </div>
                <span className="text-xs font-bold text-primary">
                  Seconds Left
                </span>
              </div>
            </div>
          )}

        <div className="flex items-center gap-4">
          <a
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-primary border border-primary/10 hover:bg-surface-container-low transition-colors"
            title="Open this on the projector/TV"
          >
            <span className="material-symbols-outlined text-sm">tv</span>
            Display
          </a>
          {gameState === "question_start" && (
            <button
              onClick={() => {
                setTimerRunning(false);
                setGameState("question_end");
                broadcast("game_state_change", {
                  state: "question_end",
                  current_question_index: currentQuestionIndex,
                });
              }}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-primary border border-primary/10 hover:bg-surface-container-low transition-colors"
            >
              End Early
            </button>
          )}
          <span className="text-sm font-bold text-outline">
            {players.length} players
          </span>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {/* ===== QUESTION START / QUESTION END ===== */}
        {(gameState === "question_start" || gameState === "question_end") &&
          currentQuestion && (
            <motion.main
              key={`question-${currentQuestionIndex}`}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex-1 flex p-8 gap-8 max-w-[1600px] mx-auto w-full overflow-hidden"
            >
              {/* Left: Question & Media */}
              <section className="flex-[1.2] flex flex-col gap-6">
                <div className="bg-surface-container-lowest p-10 rounded-xl shadow-[0px_20px_40px_rgba(27,43,94,0.04)] flex-1 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
                  <div>
                    <span className="inline-block px-4 py-1.5 rounded-full bg-primary text-on-primary text-[10px] font-bold uppercase tracking-widest mb-6">
                      {currentQuestion.type.replace("_", " ")}
                      {currentQuestion.is_joker && " • Joker"}
                    </span>
                    <h1 className="text-4xl font-bold text-primary leading-tight tracking-tight max-w-2xl">
                      {currentQuestion.question_text}
                    </h1>
                  </div>

                  {/* Timer bar visible to host */}
                  <div className="mt-4">
                    <TimerBar timeRemaining={timeRemaining} timeLimit={currentQuestion.time_limit ?? 15} />
                  </div>

                  {/* Image if present */}
                  {currentQuestion.image_url && (
                    <div className="mt-8 relative group rounded-lg overflow-hidden aspect-video">
                      {!hostImageLoaded && (
                        <div className="absolute inset-0 bg-gray-200 rounded-xl animate-pulse" />
                      )}
                      <Image
                        alt="Question media"
                        className="object-cover rounded-lg shadow-lg"
                        src={currentQuestion.image_url}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        loading="eager"
                        onLoad={() => setHostImageLoaded(true)}
                        style={currentQuestion.is_image_blurred ? {
                          filter: `blur(${hostBlurAmount}px)`,
                          transition: 'filter 0.8s ease-out',
                        } : undefined}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent" />
                    </div>
                  )}

                  {/* Video player */}
                  {currentQuestion.type === "video_question" &&
                    currentQuestion.video_url && (
                      <div className="mt-8">
                        <VideoPlayer
                          videoUrl={currentQuestion.video_url}
                          startSeconds={currentQuestion.video_start_seconds}
                          endSeconds={currentQuestion.video_end_seconds}
                        />
                      </div>
                    )}

                  {/* Audio player */}
                  {currentQuestion.type === "audio_question" &&
                    currentQuestion.audio_url && (
                      <div className="mt-8">
                        <AudioPlayer audioUrl={currentQuestion.audio_url} />
                      </div>
                    )}

                  {/* Live stats panel */}
                  {gameState === "question_end" && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8 space-y-3"
                    >
                      {!answerRevealed ? (
                        /* Before reveal: live stats only */
                        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-6">
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Answered</p>
                              <p className="text-2xl font-black text-primary">{currentAnswers.length}/{players.length}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Fastest</p>
                              <p className="text-2xl font-black text-primary">
                                {currentAnswers.length > 0
                                  ? (Math.min(...currentAnswers.map(a => a.time_taken_ms)) / 1000).toFixed(1) + "s"
                                  : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Avg Time</p>
                              <p className="text-2xl font-black text-primary">
                                {currentAnswers.length > 0
                                  ? (currentAnswers.reduce((sum, a) => sum + a.time_taken_ms, 0) / currentAnswers.length / 1000).toFixed(1) + "s"
                                  : "—"}
                              </p>
                            </div>
                          </div>
                          {currentQuestion.is_joker && (
                            <div className="mt-3 text-center">
                              <span className="inline-block bg-tertiary-fixed-dim text-on-tertiary-fixed font-bold px-4 py-1 rounded-2xl text-sm">
                                Joker Round - 2x Points!
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* After reveal: correct/wrong stats + answer text */
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                              <p className="text-2xl font-black text-emerald-700">
                                {(() => {
                                  const correct = currentAnswers.filter(a => {
                                    const opt = currentQuestion.options;
                                    if (opt && (currentQuestion.type === "multiple_choice" || currentQuestion.type === "image_question" || currentQuestion.type === "video_question" || currentQuestion.type === "audio_question")) {
                                      const idx = parseInt(currentQuestion.correct_answer);
                                      return !isNaN(idx) ? a.answer_value === opt[idx] : a.answer_value.toLowerCase() === currentQuestion.correct_answer.toLowerCase();
                                    }
                                    return a.answer_value.toLowerCase() === currentQuestion.correct_answer.toLowerCase();
                                  }).length;
                                  const pct = currentAnswers.length > 0 ? Math.round(correct / currentAnswers.length * 100) : 0;
                                  return `${correct} correct (${pct}%)`;
                                })()}
                              </p>
                            </div>
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                              <p className="text-2xl font-black text-red-600">
                                {(() => {
                                  const correct = currentAnswers.filter(a => {
                                    const opt = currentQuestion.options;
                                    if (opt && (currentQuestion.type === "multiple_choice" || currentQuestion.type === "image_question" || currentQuestion.type === "video_question" || currentQuestion.type === "audio_question")) {
                                      const idx = parseInt(currentQuestion.correct_answer);
                                      return !isNaN(idx) ? a.answer_value === opt[idx] : a.answer_value.toLowerCase() === currentQuestion.correct_answer.toLowerCase();
                                    }
                                    return a.answer_value.toLowerCase() === currentQuestion.correct_answer.toLowerCase();
                                  }).length;
                                  const wrong = currentAnswers.length - correct;
                                  const pct = currentAnswers.length > 0 ? Math.round(wrong / currentAnswers.length * 100) : 0;
                                  return `${wrong} wrong (${pct}%)`;
                                })()}
                              </p>
                            </div>
                          </div>
                          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 text-center">
                            <p className="text-sm font-bold text-emerald-600 mb-1">Correct Answer</p>
                            <p className="text-2xl font-black text-emerald-700">
                              {(() => {
                                const opt = currentQuestion.options;
                                if (opt && (currentQuestion.type === "multiple_choice" || currentQuestion.type === "image_question" || currentQuestion.type === "video_question" || currentQuestion.type === "audio_question")) {
                                  const idx = parseInt(currentQuestion.correct_answer);
                                  if (!isNaN(idx) && opt[idx]) return opt[idx];
                                }
                                return currentQuestion.correct_answer;
                              })()}
                            </p>
                          </div>
                          <div className="text-center text-sm font-bold text-outline">
                            Avg time: {currentAnswers.length > 0
                              ? (currentAnswers.reduce((sum, a) => sum + a.time_taken_ms, 0) / currentAnswers.length / 1000).toFixed(1) + "s"
                              : "—"}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </section>

              {/* Right: Live Distribution */}
              <section className="flex-1 flex flex-col gap-6">
                <AnswerDistribution
                  answers={answerDistribution}
                  correctAnswer={currentQuestion.correct_answer}
                  questionType={currentQuestion.type}
                  totalPlayers={players.length}
                  revealed={answerRevealed}
                  playerNames={players.map(p => p.name)}
                />

                {/* Action buttons */}
                {gameState === "question_end" && scoringComplete && !answerRevealed && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4"
                  >
                    <button
                      onClick={revealAnswer}
                      className="flex-1 flex items-center justify-center gap-3 py-4 bg-secondary-container text-white rounded-xl font-extrabold text-lg shadow-[0px_10px_25px_rgba(255,107,107,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        visibility
                      </span>
                      Reveal Answer
                    </button>
                  </motion.div>
                )}

                {gameState === "question_end" && answerRevealed && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-center gap-2 py-2 text-emerald-600 font-bold text-sm">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Revealed
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={showLeaderboard}
                        className="flex-1 py-4 rounded-xl font-bold text-sm text-primary border border-primary/10 hover:bg-surface-container-low transition-colors"
                      >
                        Show Leaderboard
                      </button>
                      {!isLastQuestion ? (
                        <button
                          onClick={nextQuestion}
                          className="flex-1 flex items-center justify-center gap-2 py-4 bg-primary text-on-primary rounded-xl font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                        >
                          Next Question
                          <span className="material-symbols-outlined">
                            arrow_forward
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={finishGame}
                          className="flex-1 py-4 bg-secondary-container text-white rounded-xl font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                        >
                          Finish Game
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                {gameState === "question_end" && !scoringComplete && (
                  <div className="flex justify-center py-4">
                    <motion.div
                      className="flex items-center gap-2 text-outline"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <motion.span
                        className="inline-block w-4 h-4 border-2 border-outline/30 border-t-outline rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                      Calculating scores...
                    </motion.div>
                  </div>
                )}
              </section>
            </motion.main>
          )}

        {/* ===== LEADERBOARD ===== */}
        {gameState === "leaderboard" && (
          <motion.main
            key="leaderboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 p-8 max-w-4xl mx-auto w-full"
          >
            <h2 className="text-3xl font-bold text-primary text-center mb-8">
              Leaderboard
            </h2>

            <div className="space-y-3">
              {leaderboard.map((entry, idx) => (
                <motion.div
                  key={entry.player_id}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className={`flex items-center gap-4 rounded-xl p-4 ${
                    idx === 0
                      ? "bg-secondary-container/10 border-2 border-secondary-container/30"
                      : idx < 3
                      ? "bg-tertiary-fixed/20 border border-tertiary-fixed-dim/20"
                      : "bg-surface-container-low border border-outline-variant/10"
                  }`}
                >
                  <span
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                      idx === 0
                        ? "bg-secondary-container text-white"
                        : idx === 1
                        ? "bg-tertiary-fixed-dim text-on-tertiary-fixed"
                        : idx === 2
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    {entry.rank}
                  </span>
                  <RacerAvatar index={idx} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-primary font-bold truncate">
                      {entry.player_name}
                    </p>
                  </div>
                  <span className="text-primary font-mono font-bold text-xl">
                    {entry.score}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Suspense controls */}
            {isInSuspensePhase(
              currentQuestionIndex + 1,
              questions.length
            ) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 bg-tertiary-fixed/10 border border-tertiary-fixed-dim/30 rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-tertiary-fixed-dim font-extrabold uppercase tracking-wider text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim animate-pulse" />
                    Suspense Mode
                  </h3>
                  <button
                    onClick={() => setShowSuspenseModal(true)}
                    className="text-sm font-bold text-primary hover:text-primary-container transition-colors underline"
                  >
                    Open Controls
                  </button>
                </div>
                <button
                  onClick={() => {
                    broadcast("final_reveal_start", {});
                  }}
                  className="w-full py-3 rounded-xl font-bold text-lg bg-secondary-container text-white shadow-[0px_10px_20px_rgba(255,107,107,0.3)] hover:translate-y-[-2px] active:scale-95 transition-all"
                >
                  Start Final Reveal
                </button>
              </motion.div>
            )}

            <div className="flex justify-center gap-4 mt-6 flex-wrap">
              <button
                className="px-5 py-2.5 rounded-xl font-bold text-sm bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors"
                onClick={() => setGameState("question_end")}
              >
                ← Back to Question
              </button>
              {!isInSuspensePhase(
                currentQuestionIndex + 1,
                questions.length
              ) && (
                <>
                  <button
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                      suspenseMode
                        ? "bg-secondary-container text-white"
                        : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                    }`}
                    onClick={() => {
                      const next = !suspenseMode;
                      setSuspenseMode(next);
                      broadcast("suspense_mode", { enabled: next });
                    }}
                  >
                    {suspenseMode ? "Suspense ON" : "Suspense Mode"}
                  </button>
                  <button
                    className="px-5 py-2.5 rounded-xl font-bold text-sm bg-tertiary-fixed-dim text-on-tertiary-fixed hover:opacity-90 transition-opacity"
                    onClick={() => {
                      broadcast("final_reveal_start", {});
                    }}
                  >
                    Final Reveal
                  </button>
                </>
              )}
              {!isLastQuestion ? (
                <Button variant="primary" size="lg" onClick={nextQuestion}>
                  Next Question
                </Button>
              ) : (
                <Button variant="coral" size="lg" onClick={finishGame}>
                  Finish Game
                </Button>
              )}
            </div>
          </motion.main>
        )}

        {/* ===== FINISHED ===== */}
        {gameState === "finished" && (
          <motion.main
            key="finished"
            className="flex-1"
          >
            <EndGame
              players={leaderboard.length > 0 ? leaderboard : buildLeaderboard()}
              quizTitle={quiz.title}
              totalQuestions={questions.length}
              isHost={true}
              onPlayAgain={async () => {
                if (!room || !quiz) return;
                // Delete all answers for this room's questions
                const qIds = await fetchQuestionIdsByQuiz(quiz.id);
                if (qIds.length) {
                  await deleteAnswersForQuestions(qIds);
                }
                // Delete ALL players — they'll rejoin via QR code
                await deleteRoomPlayers(room.id);
                setPlayers([]);
                // Reset room to lobby
                await resetRoomToLobby(room.id);
                setCurrentQuestionIndex(0);
                setLeaderboard([]);
                setGameState("lobby");
                setRoom((prev) => (prev ? { ...prev, status: "lobby" } : prev));
                broadcast("game_state_change", { state: "lobby" });
              }}
              onNewQuiz={() => router.push("/host/dashboard")}
              onDownloadResults={() => {
                const entries = leaderboard.length > 0 ? leaderboard : buildLeaderboard();
                const lines = [
                  `${quiz.title} — Final Results`,
                  `${"=".repeat(40)}`,
                  "",
                  ...entries.map(
                    (e, i) =>
                      `${i + 1}. ${e.player_name} — ${e.score.toLocaleString()} pts`
                  ),
                  "",
                  `Total players: ${entries.length}`,
                  `Total questions: ${questions.length}`,
                ];
                const blob = new Blob([lines.join("\n")], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${quiz.title.replace(/\s+/g, "_")}_results.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            />
          </motion.main>
        )}
      </AnimatePresence>

      {/* Bottom Controls Bar (during question phases) */}
      {gameState === "question_start" && currentQuestion && (
        <footer className="bg-surface-container-lowest px-12 py-6 flex justify-between items-center shadow-[0px_-10px_30px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-10">
            <label className="flex items-center cursor-pointer group">
              <div className="relative">
                <input className="sr-only peer" type="checkbox" readOnly />
                <div className="w-12 h-6 bg-surface-container-high rounded-full peer peer-checked:bg-primary-container transition-colors" />
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6" />
              </div>
              <span className="ml-3 text-sm font-bold text-primary group-hover:text-primary-container transition-colors">
                Show Leaderboard After Reveal
              </span>
            </label>
          </div>
          <button
            onClick={() => {
              setTimerRunning(false);
              setGameState("question_end");
              broadcast("game_state_change", {
                state: "question_end",
                current_question_index: currentQuestionIndex,
              });
            }}
            className="flex items-center gap-3 px-10 py-4 bg-secondary-container text-white rounded-xl font-extrabold text-lg shadow-[0px_10px_25px_rgba(255,107,107,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              timer_off
            </span>
            End Timer
          </button>
        </footer>
      )}

      {/* Suspense Modal */}
      <SuspenseModal
        isOpen={showSuspenseModal}
        onClose={() => setShowSuspenseModal(false)}
        suspenseEnabled={suspenseMode}
        onToggleSuspense={() => {
          const next = !suspenseMode;
          setSuspenseMode(next);
          broadcast("suspense_mode", { enabled: next });
        }}
        onStartReveal={() => {
          setShowSuspenseModal(false);
          broadcast("final_reveal_start", {});
        }}
        leaderboard={leaderboard.length > 0 ? leaderboard : buildLeaderboard()}
      />
    </div>
  );
}

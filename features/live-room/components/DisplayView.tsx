'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameState, Question, Player, LeaderboardEntry, Answer } from '@/shared/domain/types';
import QRCodeDisplay from '@/shared/ui/QRCodeDisplay';
import RacerAvatar from '@/shared/ui/RacerAvatar';
import EndGame from './EndGame';

interface AnswerDistItem {
  label: string;
  count: number;
  percent: number;
  isCorrect: boolean;
}

interface DisplayViewProps {
  gameState: GameState;
  currentQuestion: Question | null;
  timeRemaining: number;
  timeLimit: number;
  players: Player[];
  leaderboard: LeaderboardEntry[];
  currentAnswers: Answer[];
  answerRevealed: boolean;
  scoringComplete: boolean;
  questionNumber: number;
  totalQuestions: number;
  roomCode: string;
  onReveal: () => void;
  onShowLeaderboard: () => void;
  onNextQuestion: () => void;
  onFinishGame: () => void;
  onEndTimerEarly?: () => void;
}

function getPlayerIndex(players: Player[], playerId: string): number {
  const sorted = [...players].sort(
    (a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
  );
  const idx = sorted.findIndex((p) => p.id === playerId);
  return idx >= 0 ? idx : 0;
}

export default function DisplayView({
  gameState,
  currentQuestion,
  timeRemaining,
  timeLimit,
  players,
  leaderboard,
  currentAnswers,
  answerRevealed,
  scoringComplete,
  questionNumber,
  totalQuestions,
  roomCode,
  onReveal,
  onShowLeaderboard,
  onNextQuestion,
  onFinishGame,
  onEndTimerEarly,
}: DisplayViewProps) {

  // Compute answer distribution from currentAnswers + currentQuestion
  const answerDistribution = useMemo((): AnswerDistItem[] => {
    if (!currentQuestion || currentAnswers.length === 0) return [];

    const total = currentAnswers.length;

    if (
      currentQuestion.options &&
      (currentQuestion.type === 'multiple_choice' ||
        currentQuestion.type === 'image_question' ||
        currentQuestion.type === 'video_question' ||
        currentQuestion.type === 'audio_question')
    ) {
      const counts: Record<string, number> = {};
      currentQuestion.options.forEach((label) => { counts[label] = 0; });
      for (const a of currentAnswers) {
        const val = a.answer_value;
        if (counts[val] !== undefined) counts[val]++;
        else if (!isNaN(Number(val)) && currentQuestion.options[Number(val)]) {
          counts[currentQuestion.options[Number(val)]]++;
        }
      }
      return currentQuestion.options.map((label) => ({
        label,
        count: counts[label] || 0,
        percent: total > 0 ? ((counts[label] || 0) / total) * 100 : 0,
        isCorrect: label === currentQuestion.correct_answer || (() => {
          const idx = parseInt(currentQuestion.correct_answer);
          return !isNaN(idx) && currentQuestion.options?.[idx] === label;
        })(),
      }));
    } else if (currentQuestion.type === 'true_false') {
      const trueCount = currentAnswers.filter((a) => a.answer_value === 'true').length;
      const falseCount = currentAnswers.filter((a) => a.answer_value === 'false').length;
      return [
        {
          label: 'True',
          count: trueCount,
          percent: total > 0 ? (trueCount / total) * 100 : 0,
          isCorrect: currentQuestion.correct_answer === 'true',
        },
        {
          label: 'False',
          count: falseCount,
          percent: total > 0 ? (falseCount / total) * 100 : 0,
          isCorrect: currentQuestion.correct_answer === 'false',
        },
      ];
    } else {
      // slider / type_in: correct vs wrong
      const correctCount = currentAnswers.filter((a) => {
        if (currentQuestion.type === 'type_in') {
          return a.answer_value.toLowerCase().trim() === currentQuestion.correct_answer.toLowerCase().trim();
        }
        return a.answer_value === currentQuestion.correct_answer;
      }).length;
      return [
        {
          label: 'Correct',
          count: correctCount,
          percent: total > 0 ? (correctCount / total) * 100 : 0,
          isCorrect: true,
        },
        {
          label: 'Wrong',
          count: total - correctCount,
          percent: total > 0 ? ((total - correctCount) / total) * 100 : 0,
          isCorrect: false,
        },
      ];
    }
  }, [currentQuestion, currentAnswers]);

  // Resolve correct answer display text
  const correctAnswerDisplay = useMemo(() => {
    if (!currentQuestion) return '';
    const opt = currentQuestion.options;
    if (
      opt &&
      (currentQuestion.type === 'multiple_choice' ||
        currentQuestion.type === 'image_question' ||
        currentQuestion.type === 'video_question' ||
        currentQuestion.type === 'audio_question')
    ) {
      const idx = parseInt(currentQuestion.correct_answer);
      if (!isNaN(idx) && opt[idx]) return opt[idx];
    }
    if (currentQuestion.type === 'true_false') {
      return currentQuestion.correct_answer === 'true' ? 'True' : 'False';
    }
    return currentQuestion.correct_answer;
  }, [currentQuestion]);

  const answeredCount = currentAnswers.length;

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/play/${roomCode}`
    : `https://quiztime-alpha.vercel.app/play/${roomCode}`;

  // ---------- Toolbar ----------
  const toolbarBtnBase = "px-4 py-1.5 rounded-xl text-white text-sm font-bold active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none";

  const toolbar = (
    <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 shadow-xl">
      <span className="text-white/30 text-xs font-mono mr-1">{roomCode.toUpperCase()}</span>

      {/* End Timer Early — only while timer is actively running */}
      {gameState === 'question_start' && currentQuestion && onEndTimerEarly && (
        <button
          onClick={onEndTimerEarly}
          className={`${toolbarBtnBase} bg-white/20 hover:bg-white/30`}
        >
          End Timer
        </button>
      )}

      {/* Scoring in progress indicator */}
      {gameState === 'question_end' && !scoringComplete && !answerRevealed && (
        <span className="text-white/40 text-xs font-medium animate-pulse">Scoring...</span>
      )}

      {/* Reveal — only after timer ends AND scoring is complete */}
      {gameState === 'question_end' && scoringComplete && !answerRevealed && currentQuestion && (
        <button
          onClick={onReveal}
          className={`${toolbarBtnBase} bg-[#FF6B6B] hover:opacity-90`}
        >
          Reveal
        </button>
      )}

      {/* Leaderboard */}
      {answerRevealed && gameState === 'question_end' && (
        <button
          onClick={onShowLeaderboard}
          className={`${toolbarBtnBase} bg-[#8594CD] hover:opacity-90`}
        >
          Leaderboard
        </button>
      )}

      {/* Next */}
      {(answerRevealed || gameState === 'leaderboard') && questionNumber < totalQuestions && (
        <button
          onClick={onNextQuestion}
          className={`${toolbarBtnBase} bg-white/20 hover:bg-white/30`}
        >
          Next →
        </button>
      )}

      {/* Finish */}
      {(answerRevealed || gameState === 'leaderboard') && questionNumber >= totalQuestions && (
        <button
          onClick={onFinishGame}
          className={`${toolbarBtnBase} bg-[#FF6B6B] hover:opacity-90`}
        >
          Finish
        </button>
      )}

      {/* Progress */}
      {questionNumber > 0 && (
        <span className="text-white/30 text-xs ml-1">{questionNumber}/{totalQuestions}</span>
      )}
    </div>
  );

  // ---------- LOBBY ----------
  if (gameState === 'lobby') {
    return (
      <div className="min-h-screen bg-[#021549] text-[#FAFAF7] flex flex-col items-center p-8 overflow-hidden">
        {toolbar}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-7xl font-black tracking-tight mt-8 mb-6"
        >
          QuizTime
        </motion.h1>

        <div className="flex flex-col items-center gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-2xl shadow-2xl"
          >
            <QRCodeDisplay url={joinUrl} size={260} />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-[#FAFAF7]/60 font-medium"
          >
            Join at{' '}
            <span className="text-[#FAFAF7] font-bold">
              {typeof window !== 'undefined' ? window.location.host : 'quiztime-alpha.vercel.app'}
            </span>
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

        <div className="flex-1 w-full max-w-5xl">
          <p className="text-sm uppercase tracking-widest text-[#FAFAF7]/40 font-bold mb-4 text-center">
            {players.length} player{players.length !== 1 ? 's' : ''} joined
          </p>
          <div className="flex flex-wrap justify-center gap-3 max-h-[280px] overflow-y-auto">
            <AnimatePresence>
              {players.map((player, idx) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    type: 'spring',
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
  if (gameState === 'finished') {
    return (
      <>
        {toolbar}
        <EndGame
          players={leaderboard}
          quizTitle=""
          totalQuestions={totalQuestions}
          isHost={false}
        />
      </>
    );
  }

  // ---------- LEADERBOARD ----------
  if (gameState === 'leaderboard') {
    return (
      <div className="min-h-screen bg-[#021549] text-[#FAFAF7] flex flex-col items-center p-12">
        {toolbar}
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-black mb-10"
        >
          👑 STANDINGS
        </motion.h2>

        <div className="w-full max-w-3xl space-y-3">
          {leaderboard.slice(0, 8).map((entry, idx) => (
            <motion.div
              key={entry.player_id}
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08, type: 'spring', stiffness: 300, damping: 30 }}
              className={`flex items-center gap-5 px-8 py-4 rounded-2xl ${
                idx === 0
                  ? 'bg-gradient-to-r from-[#FF6B6B]/30 to-[#FF6B6B]/10 border-2 border-[#FF6B6B]/50'
                  : idx < 3
                  ? 'bg-[#FFB95F]/10 border border-[#FFB95F]/30'
                  : 'bg-white/5 border border-white/10'
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
    (gameState === 'question_end' || gameState === 'question_start') &&
    answerRevealed &&
    currentQuestion
  ) {
    return (
      <div className="min-h-screen bg-[#021549] text-[#FAFAF7] flex flex-col p-12">
        {toolbar}
        <div className="mb-8">
          <span className="text-[#FAFAF7]/40 text-sm font-bold uppercase tracking-widest">
            Q{questionNumber} of {totalQuestions}
          </span>
          <h2 className="text-2xl font-bold mt-2 max-w-4xl">
            {currentQuestion.question_text}
          </h2>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-4xl w-full mx-auto gap-4">
          <AnimatePresence>
            {answerDistribution.map((item, idx) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, type: 'spring', stiffness: 300, damping: 30 }}
                className="flex items-center gap-4"
              >
                <div className="w-48 flex-shrink-0 text-right">
                  <span
                    className={`text-lg font-bold ${
                      item.isCorrect ? 'text-emerald-400' : 'text-[#FAFAF7]/40'
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
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {item.label}
                  </span>
                </div>

                <div className="flex-1 h-12 bg-white/5 rounded-xl overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(item.percent, 2)}%` }}
                    transition={{ delay: idx * 0.1 + 0.2, duration: 0.6, ease: 'easeOut' }}
                    className={`h-full rounded-xl ${
                      item.isCorrect ? 'bg-emerald-500/80' : 'bg-white/10'
                    }`}
                  />
                </div>

                <span
                  className={`w-16 text-right font-mono font-bold text-lg ${
                    item.isCorrect ? 'text-emerald-400' : 'text-[#FAFAF7]/40'
                  }`}
                >
                  {item.count}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

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

  // ---------- QUESTION ACTIVE ----------
  if (
    (gameState === 'question_start' || gameState === 'question_end') &&
    currentQuestion
  ) {
    const timerFraction = timeLimit > 0 ? timeRemaining / timeLimit : 0;
    const isTimerDone = gameState === 'question_end' || timeRemaining === 0;

    return (
      <div className="min-h-screen bg-[#021549] text-[#FAFAF7] flex flex-col relative">
        {toolbar}
        <div className="absolute top-8 left-12 z-10">
          <span className="px-4 py-2 rounded-full bg-white/10 text-sm font-bold uppercase tracking-widest">
            Q{questionNumber} of {totalQuestions}
          </span>
        </div>

        {currentQuestion.is_joker && (
          <div className="absolute top-8 right-12 z-10">
            <span className="px-4 py-2 rounded-full bg-[#FFB95F] text-[#1B2B5E] text-sm font-bold uppercase">
              Joker 2x
            </span>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center px-12">
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
                  currentQuestion.is_image_blurred && !answerRevealed && gameState === 'question_start' && timeRemaining > timeLimit * 0.3
                    ? 'blur-xl transition-[filter] duration-[3000ms]'
                    : currentQuestion.is_image_blurred && !answerRevealed && gameState === 'question_start'
                    ? 'blur-sm transition-[filter] duration-[3000ms]'
                    : ''
                }`}
              />
            </motion.div>
          )}

          <motion.h1
            key={`q-${questionNumber}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-black text-center leading-tight max-w-5xl"
          >
            {currentQuestion.question_text}
          </motion.h1>

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

        <div className="flex-shrink-0 px-0 pb-0">
          <div className="flex justify-between items-center px-12 pb-4">
            <motion.span
              key={timeRemaining}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className={`font-black text-4xl tabular-nums ${
                timeRemaining <= 5 ? 'text-[#FF6B6B]' : 'text-[#FAFAF7]/70'
              }`}
            >
              {timeRemaining}
              <span className="text-lg font-bold ml-1 opacity-50">s</span>
            </motion.span>
            <motion.span
              key={answeredCount}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="text-[#FAFAF7]/50 font-bold text-lg"
            >
              {answeredCount} / {players.length} answered
            </motion.span>
          </div>

          <div className="w-full h-2 bg-white/10">
            <motion.div
              className={`h-full ${timeRemaining <= 5 ? 'bg-[#FF6B6B]' : 'bg-[#FFB95F]'}`}
              style={{
                width: `${timerFraction * 100}%`,
                transition: 'width 900ms linear',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ---------- FALLBACK ----------
  return (
    <div className="min-h-screen bg-[#021549] text-[#FAFAF7] flex items-center justify-center">
      {toolbar}
      <p className="text-xl text-[#FAFAF7]/40">Waiting...</p>
    </div>
  );
}

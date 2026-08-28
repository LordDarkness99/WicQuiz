import { supabase, generateRoomCode } from "@/integrations/supabase/client";
import type { Room, Quiz, Question, Player } from "@/shared/domain/types";

// ── Reads ──────────────────────────────────────────────────────

/** Full room row by join code. Null if missing or errored. */
export async function fetchRoomByCode(roomCode: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from("qt_rooms")
    .select("*")
    .eq("room_code", roomCode)
    .single();
  if (error || !data) return null;
  return data as Room;
}

/** Just the room status (polling fallback). */
export async function fetchRoomStatus(roomId: string): Promise<string | null> {
  const { data } = await supabase
    .from("qt_rooms")
    .select("status")
    .eq("id", roomId)
    .single();
  return data ? (data.status as string) : null;
}

/** The quiz attached to a room. Null if missing or errored. */
export async function fetchQuizByRoom(roomId: string): Promise<Quiz | null> {
  const { data, error } = await supabase
    .from("qt_quizzes")
    .select("*")
    .eq("room_id", roomId)
    .single();
  if (error || !data) return null;
  return data as Quiz;
}

/** Players in a room, highest score first. Null signals a query error. */
export async function fetchRoomPlayersByScore(
  roomId: string
): Promise<Player[] | null> {
  const { data, error } = await supabase
    .from("qt_players")
    .select("*")
    .eq("room_id", roomId)
    .order("score", { ascending: false });
  if (error) return null;
  return (data as Player[]) ?? [];
}

/** Players in a room, join order. Null signals a query error. */
export async function fetchRoomPlayersByJoined(
  roomId: string
): Promise<Player[] | null> {
  const { data, error } = await supabase
    .from("qt_players")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });
  if (error) return null;
  return (data as Player[]) ?? [];
}

/** Ordered questions for a quiz. Null signals a query error (vs. empty list). */
export async function fetchQuestionsByQuiz(
  quizId: string
): Promise<Question[] | null> {
  const { data, error } = await supabase
    .from("qt_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: true });
  if (error) return null;
  return (data as Question[]) ?? [];
}

/** A single question by id. */
export async function fetchQuestionById(
  questionId: string
): Promise<Question | null> {
  const { data } = await supabase
    .from("qt_questions")
    .select("*")
    .eq("id", questionId)
    .single();
  return (data as Question) ?? null;
}

/** Count of questions in a quiz. */
export async function countQuizQuestions(
  quizId: string
): Promise<number | null> {
  const { count } = await supabase
    .from("qt_questions")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", quizId);
  return count ?? null;
}

/** Raw answer values for a question (for the answer distribution). */
export async function fetchAnswerValues(
  questionId: string
): Promise<{ answer_value: string }[]> {
  const { data } = await supabase
    .from("qt_answers")
    .select("answer_value")
    .eq("question_id", questionId);
  return (data as { answer_value: string }[]) ?? [];
}

/** Scored fields for a single answer. */
export async function fetchAnswerScore(
  answerId: string
): Promise<{ is_correct: boolean; points_earned: number } | null> {
  const { data } = await supabase
    .from("qt_answers")
    .select("is_correct, points_earned")
    .eq("id", answerId)
    .single();
  return (data as { is_correct: boolean; points_earned: number }) ?? null;
}

/** Correct answers across questions, with timings (for avg-time stats). */
export async function fetchCorrectAnswerTimes(
  questionIds: string[]
): Promise<{ player_id: string; time_taken_ms: number; is_correct: boolean }[]> {
  const { data } = await supabase
    .from("qt_answers")
    .select("player_id, time_taken_ms, is_correct")
    .in("question_id", questionIds)
    .eq("is_correct", true);
  return (
    (data as {
      player_id: string;
      time_taken_ms: number;
      is_correct: boolean;
    }[]) ?? []
  );
}

/** Correctness of all answers across questions (for correct-count stats). */
export async function fetchAnswerCorrectness(
  questionIds: string[]
): Promise<{ player_id: string; is_correct: boolean }[]> {
  const { data } = await supabase
    .from("qt_answers")
    .select("player_id, is_correct")
    .in("question_id", questionIds);
  return (data as { player_id: string; is_correct: boolean }[]) ?? [];
}

/** Per-question answer stats (correctness + timing). */
export async function fetchQuestionAnswerStats(
  questionId: string
): Promise<{ is_correct: boolean; time_taken_ms: number }[]> {
  const { data } = await supabase
    .from("qt_answers")
    .select("is_correct, time_taken_ms")
    .eq("question_id", questionId);
  return (data as { is_correct: boolean; time_taken_ms: number }[]) ?? [];
}

/** Question ids belonging to a quiz. */
export async function fetchQuestionIdsByQuiz(
  quizId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("qt_questions")
    .select("id")
    .eq("quiz_id", quizId);
  return ((data as { id: string }[]) ?? []).map((q) => q.id);
}

// ── Writes ─────────────────────────────────────────────────────

/** Mark a room active and set its current quiz. */
export async function setRoomActive(
  roomId: string,
  quizId: string | undefined
): Promise<void> {
  await supabase
    .from("qt_rooms")
    .update({ status: "active", current_quiz_id: quizId })
    .eq("id", roomId);
}

/** Persist the current question index (late-join catch-up). */
export async function setRoomCurrentQuestion(
  roomId: string,
  index: number,
  quizId: string | undefined
): Promise<void> {
  await supabase
    .from("qt_rooms")
    .update({
      current_question_index: index,
      current_quiz_id: quizId,
      status: "active",
    })
    .eq("id", roomId);
}

/** Persist the score/correctness of a single answer. */
export async function updateAnswerScore(
  answerId: string,
  isCorrect: boolean,
  pointsEarned: number
): Promise<void> {
  await supabase
    .from("qt_answers")
    .update({ is_correct: isCorrect, points_earned: pointsEarned })
    .eq("id", answerId);
}

/** Persist a player's new cumulative score. */
export async function updatePlayerScore(
  playerId: string,
  score: number
): Promise<void> {
  await supabase.from("qt_players").update({ score }).eq("id", playerId);
}

/** Mark a room finished. */
export async function setRoomFinished(roomId: string): Promise<void> {
  await supabase.from("qt_rooms").update({ status: "finished" }).eq("id", roomId);
}

/** Delete all answers for the given questions (play-again reset). */
export async function deleteAnswersForQuestions(
  questionIds: string[]
): Promise<void> {
  await supabase.from("qt_answers").delete().in("question_id", questionIds);
}

/** Remove all players from a room (play-again reset). */
export async function deleteRoomPlayers(roomId: string): Promise<void> {
  await supabase.from("qt_players").delete().eq("room_id", roomId);
}

/** Reset a room back to the lobby (play-again reset). */
export async function resetRoomToLobby(roomId: string): Promise<void> {
  await supabase
    .from("qt_rooms")
    .update({ status: "lobby", current_question_index: -1 })
    .eq("id", roomId);
}

// ── Launch a room from a quiz ──────────────────────────────────

/** Create a fresh lobby room with a generated join code. Throws on failure. */
export async function createRoom(
  hostId: string
): Promise<{ id: string; room_code: string }> {
  const room_code = generateRoomCode();
  const { data, error } = await supabase
    .from("qt_rooms")
    .insert({ room_code, host_id: hostId, status: "lobby" })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message || "Failed to create room.");
  return { id: data.id as string, room_code: data.room_code as string };
}

/** Create the quiz instance attached to a room. Throws on failure. */
export async function createQuiz(
  roomId: string,
  title: string
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("qt_quizzes")
    .insert({ room_id: roomId, title })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message || "Failed to create quiz.");
  return { id: data.id as string };
}

/** Insert the playable questions for a room's quiz. Throws on failure. */
export async function insertRoomQuestions(
  rows: Record<string, unknown>[]
): Promise<void> {
  const { error } = await supabase.from("qt_questions").insert(rows);
  if (error) throw new Error(error.message || "Failed to create questions.");
}

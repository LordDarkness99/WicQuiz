import { supabase } from "@/integrations/supabase/client";
import type { Question } from "@/shared/domain/types";

export interface PlayerRoomInfo {
  id: string;
  status: string;
  current_question_index: number;
  current_quiz_id: string | null;
}

export interface PlayerRow {
  id: string;
  name: string;
  horse_name: string;
  score: number;
}

/** Look up a room by its join code. Returns null if missing or errored. */
export async function fetchRoomByCode(
  roomCode: string
): Promise<PlayerRoomInfo | null> {
  const { data, error } = await supabase
    .from("qt_rooms")
    .select("id, status, current_question_index, current_quiz_id")
    .eq("room_code", roomCode)
    .single();
  if (error || !data) return null;
  return data as PlayerRoomInfo;
}

/** Verify a stored player still exists in the room (reconnect). */
export async function fetchPlayerInRoom(
  playerId: string,
  roomId: string
): Promise<PlayerRow | null> {
  const { data } = await supabase
    .from("qt_players")
    .select("id, name, horse_name, score")
    .eq("id", playerId)
    .eq("room_id", roomId)
    .single();
  return (data as PlayerRow) ?? null;
}

/** Ordered questions for a quiz (used for late-join catch-up). */
export async function fetchQuizQuestions(quizId: string): Promise<Question[]> {
  const { data } = await supabase
    .from("qt_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: true });
  return (data as Question[]) ?? [];
}

/** Current score for a player. Returns null if not found. */
export async function fetchPlayerScore(
  playerId: string
): Promise<number | null> {
  const { data } = await supabase
    .from("qt_players")
    .select("score")
    .eq("id", playerId)
    .single();
  return data ? (data.score as number) : null;
}

/** Join a room as a new player. Returns the new player id, or null on failure. */
export async function joinRoom(
  roomId: string,
  name: string,
  horseName: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("qt_players")
    .insert({ room_id: roomId, name, horse_name: horseName, score: 0 })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id as string;
}

/** Submit an answer for the current question (fire-and-forget). */
export async function submitAnswer(
  questionId: string,
  playerId: string,
  answerValue: string,
  timeTakenMs: number
): Promise<void> {
  await supabase.from("qt_answers").insert({
    question_id: questionId,
    player_id: playerId,
    answer_value: answerValue,
    time_taken_ms: timeTakenMs,
  });
}

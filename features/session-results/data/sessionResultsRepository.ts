import { supabase } from "@/integrations/supabase/client";
import type { LeaderboardEntry } from "@/shared/domain/types";

export interface SessionResult {
  id: string;
  room_id: string | null;
  quiz_template_id: string | null;
  host_id: string;
  title: string;
  player_count: number;
  question_count: number;
  final_leaderboard: LeaderboardEntry[] | null;
  question_stats: QuestionStat[] | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface QuestionStat {
  questionId: string;
  text: string;
  totalAnswers: number;
  correctCount: number;
  avgTimeMs: number;
}

/** Save a game session result. */
export async function saveSessionResult(
  roomId: string,
  templateId: string | null,
  hostId: string,
  title: string,
  playerCount: number,
  questionCount: number,
  leaderboard: LeaderboardEntry[],
  questionStats: QuestionStat[],
  startedAt: string | null
): Promise<string> {
  const { data, error } = await supabase
    .from("qt_session_results")
    .insert({
      room_id: roomId,
      quiz_template_id: templateId,
      host_id: hostId,
      title,
      player_count: playerCount,
      question_count: questionCount,
      final_leaderboard: leaderboard,
      question_stats: questionStats,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message || "Failed to save session result.");
  return data.id;
}

/** Get session results for a host. */
export async function getSessionResults(
  hostId: string,
  limit = 20
): Promise<SessionResult[]> {
  const { data, error } = await supabase
    .from("qt_session_results")
    .select("*")
    .eq("host_id", hostId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []) as SessionResult[];
}

/** Get a single session result by ID. */
export async function getSessionResult(
  sessionId: string
): Promise<SessionResult> {
  const { data, error } = await supabase
    .from("qt_session_results")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error || !data) throw new Error(error?.message || "Session not found.");
  return data as SessionResult;
}

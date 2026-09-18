import { supabase } from "@/integrations/supabase/client";
import type { QuestionFormData } from "../domain/types";

/** Get current auth user id (null if not logged in) */
async function getAuthUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ── Types ──────────────────────────────────────────────────────

export interface QuizTemplate {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  question_ids: string[];
  question_order: Record<string, number> | null;
  is_draft: boolean;
  times_run: number;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionBankItem {
  id: string;
  host_id: string;
  type: string;
  question_text: string;
  options: string[] | null;
  correct_answer: string;
  time_limit: number;
  points_base: number;
  image_url: string | null;
  is_joker: boolean;
  is_image_blurred?: boolean;
  slider_min: number | null;
  slider_max: number | null;
  slider_tolerance: number | null;
  video_url: string | null;
  video_start_seconds: number | null;
  video_end_seconds: number | null;
  audio_url: string | null;
  category: string | null;
  tags: string[] | null;
  times_used: number;
  created_at: string;
  updated_at: string;
}

// ── Helpers ────────────────────────────────────────────────────

function questionFormToRow(hostId: string, q: QuestionFormData, ownerId?: string | null) {
  return {
    host_id: hostId,
    owner_id: ownerId ?? null,
    type: q.type,
    question_text: q.question_text.trim(),
    options:
      q.type === "multiple_choice" ||
      q.type === "image_question" ||
      q.type === "true_false"
        ? q.options
        : null,
    correct_answer: q.correct_answer?.trim() || "N/A",
    time_limit: q.time_limit,
    points_base: 1000,
    image_url: q.image_url || null,
    is_joker: q.is_joker,
    is_image_blurred: q.is_image_blurred ?? false,
    slider_min: null,
    slider_max: null,
    slider_tolerance: null,
    video_url: null,
    video_start_seconds: null,
    video_end_seconds: null,
    audio_url: null,
  };
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Save questions to the question bank and create/update a quiz template.
 * Returns the template id.
 */
export async function saveQuizTemplate(
  hostId: string,
  title: string,
  questions: QuestionFormData[],
  existingTemplateId?: string
): Promise<string> {
  const validQuestions = questions.filter(
    (q) => q.question_text.trim().length > 0
  );

  const ownerId = await getAuthUserId();

  // Insert questions into the bank
  const rows = validQuestions.map((q) => questionFormToRow(hostId, q, ownerId));
  const { data: inserted, error: qErr } = await supabase
    .from("qt_question_bank")
    .insert(rows)
    .select("id");

  if (qErr || !inserted) throw new Error(qErr?.message || "Failed to save questions.");

  const questionIds = inserted.map((r: { id: string }) => r.id);
  const questionOrder: Record<string, number> = {};
  questionIds.forEach((id: string, idx: number) => {
    questionOrder[id] = idx;
  });

  if (existingTemplateId) {
    const { error } = await supabase
      .from("qt_quiz_templates")
      .update({
        title: title.trim(),
        question_ids: questionIds,
        question_order: questionOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingTemplateId);

    if (error) throw new Error(error.message);
    return existingTemplateId;
  }

  const { data: template, error: tErr } = await supabase
    .from("qt_quiz_templates")
    .insert({
      host_id: hostId,
      owner_id: ownerId,
      title: title.trim(),
      question_ids: questionIds,
      question_order: questionOrder,
      is_draft: true,
    })
    .select("id")
    .single();

  if (tErr || !template) throw new Error(tErr?.message || "Failed to save template.");
  return template.id;
}

/**
 * Create a blank draft template with just a title (no questions yet).
 * Used by the new quiz naming flow.
 */
export async function createDraftTemplate(
  hostId: string,
  title: string
): Promise<string> {
  const ownerId = await getAuthUserId();
  const effectiveHostId = ownerId || hostId;
  const { data: template, error } = await supabase
    .from("qt_quiz_templates")
    .insert({
      host_id: effectiveHostId,
      owner_id: ownerId,
      title: title.trim(),
      question_ids: [],
      question_order: {},
      is_draft: true,
    })
    .select("id")
    .single();
  if (error || !template) throw new Error(error?.message || "Failed to create template.");
  return template.id;
}

/** Load a quiz template with its full question data. */
export async function loadQuizTemplate(
  quizId: string
): Promise<{ template: QuizTemplate; questions: QuestionBankItem[] }> {
  const { data: template, error: tErr } = await supabase
    .from("qt_quiz_templates")
    .select("*")
    .eq("id", quizId)
    .single();

  if (tErr || !template) throw new Error(tErr?.message || "Template not found.");

  const questionIds: string[] = template.question_ids || [];
  let questions: QuestionBankItem[] = [];

  if (questionIds.length > 0) {
    const { data, error } = await supabase
      .from("qt_question_bank")
      .select("*")
      .in("id", questionIds);

    if (error) throw new Error(error.message);
    // Sort by the order stored in the template
    const order = template.question_order as Record<string, number> | null;
    questions = (data || []).sort((a: QuestionBankItem, b: QuestionBankItem) => {
      if (!order) return 0;
      return (order[a.id] ?? 0) - (order[b.id] ?? 0);
    });
  }

  return { template: template as QuizTemplate, questions };
}

/** Duplicate a quiz template. */
export async function duplicateQuizTemplate(
  quizId: string,
  hostId: string
): Promise<string> {
  const ownerId = await getAuthUserId();
  const effectiveHostId = ownerId || hostId;
  const { template, questions } = await loadQuizTemplate(quizId);

  // Re-insert questions as new bank items
  const rows = questions.map((q) => ({
    host_id: effectiveHostId,
    owner_id: ownerId,
    type: q.type,
    question_text: q.question_text,
    options: q.options,
    correct_answer: q.correct_answer,
    time_limit: q.time_limit,
    points_base: q.points_base,
    image_url: q.image_url,
    is_joker: q.is_joker,
    is_image_blurred: q.is_image_blurred ?? false,
    slider_min: q.slider_min,
    slider_max: q.slider_max,
    slider_tolerance: q.slider_tolerance,
    video_url: q.video_url,
    video_start_seconds: q.video_start_seconds,
    video_end_seconds: q.video_end_seconds,
    audio_url: q.audio_url,
  }));

  const { data: newQuestions, error: qErr } = await supabase
    .from("qt_question_bank")
    .insert(rows)
    .select("id");

  if (qErr || !newQuestions) throw new Error(qErr?.message || "Failed to duplicate questions.");

  const newIds = newQuestions.map((r: { id: string }) => r.id);
  const newOrder: Record<string, number> = {};
  newIds.forEach((id: string, idx: number) => {
    newOrder[id] = idx;
  });

  const { data: newTemplate, error: tErr } = await supabase
    .from("qt_quiz_templates")
    .insert({
      host_id: effectiveHostId,
      owner_id: ownerId,
      title: `${template.title} (Copy)`,
      description: template.description,
      question_ids: newIds,
      question_order: newOrder,
      is_draft: true,
    })
    .select("id")
    .single();

  if (tErr || !newTemplate) throw new Error(tErr?.message || "Failed to duplicate template.");
  return newTemplate.id;
}

/** Delete a quiz template (does not delete bank questions). */
export async function deleteQuizTemplate(quizId: string): Promise<void> {
  const { error } = await supabase
    .from("qt_quiz_templates")
    .delete()
    .eq("id", quizId);

  if (error) throw new Error(error.message);
}

/** Get templates for the current auth user. */
export async function getQuizTemplates(
  hostId?: string
): Promise<QuizTemplate[]> {
  const ownerId = await getAuthUserId();
  const effectiveId = ownerId || hostId;

  let query = supabase
    .from("qt_quiz_templates")
    .select("*")
    .order("updated_at", { ascending: false });

  if (effectiveId) {
    query = query.or(`owner_id.eq.${effectiveId},host_id.eq.${effectiveId}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as QuizTemplate[];
}

/** Mark a template as run (increment times_run, set last_run_at, mark not draft). */
export async function markTemplateAsRun(templateId: string): Promise<void> {
  // Fetch current times_run
  const { data } = await supabase
    .from("qt_quiz_templates")
    .select("times_run")
    .eq("id", templateId)
    .single();

  const currentRuns = data?.times_run ?? 0;

  await supabase
    .from("qt_quiz_templates")
    .update({
      times_run: currentRuns + 1,
      last_run_at: new Date().toISOString(),
      is_draft: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId);
}

/** Bump a question bank item's usage counter. */
export async function incrementQuestionBankUsage(
  questionId: string,
  timesUsed: number
): Promise<void> {
  await supabase
    .from("qt_question_bank")
    .update({ times_used: timesUsed + 1 })
    .eq("id", questionId);
}

/** Delete the given question bank items. */
export async function deleteBankQuestions(ids: string[]): Promise<void> {
  await supabase.from("qt_question_bank").delete().in("id", ids);
}

/** Insert question bank items, returning the new ids. Throws on failure. */
export async function insertBankQuestions(
  rows: Record<string, unknown>[]
): Promise<string[]> {
  const { data, error } = await supabase
    .from("qt_question_bank")
    .insert(rows)
    .select("id");
  if (error || !data) throw new Error(error?.message || "Save failed");
  return (data as { id: string }[]).map((r) => r.id);
}

/** Update a template's title + question ordering. */
export async function updateTemplateQuestions(
  templateId: string,
  title: string,
  questionIds: string[],
  questionOrder: Record<string, number>
): Promise<void> {
  await supabase
    .from("qt_quiz_templates")
    .update({
      title,
      question_ids: questionIds,
      question_order: questionOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId);
}

export interface ActiveRoomInfo {
  id: string;
  room_code: string;
  status: string;
  host_id: string;
  quiz_title: string | null;
  player_count: number;
}

/** Fetch active/lobby rooms with their quiz title and player count (for dashboard running indicators). */
export async function getActiveRoomsForHost(hostId: string): Promise<ActiveRoomInfo[]> {
  if (!hostId) return [];
  const { data, error } = await supabase
    .from("qt_rooms")
    .select("id, room_code, status, host_id, host_user_id, qt_quizzes!qt_quizzes_room_id_fkey(title), qt_players(count)")
    .or(`host_id.eq.${hostId},host_user_id.eq.${hostId}`)
    .in("status", ["lobby", "active"])
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data || []).map((r: Record<string, unknown>) => {
    const quizzes = r.qt_quizzes as { title?: string }[] | null;
    const players = r.qt_players as { count?: number }[] | null;
    const title = Array.isArray(quizzes) && quizzes[0]?.title ? quizzes[0].title : null;
    const count = Array.isArray(players) && players[0]?.count != null ? players[0].count : 0;
    return {
      id: r.id as string,
      room_code: r.room_code as string,
      status: r.status as string,
      host_id: r.host_id as string,
      quiz_title: title,
      player_count: count,
    };
  });
}

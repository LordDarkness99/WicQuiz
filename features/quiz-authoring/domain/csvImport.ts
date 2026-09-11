import type { QuestionType } from "@/shared/domain/types";
import type { QuestionFormData } from "./types";

// CSV import for bulk question authoring.
//
// Expected header row (case-insensitive, order-independent):
//   type,question_text,options,correct_answer,time_limit,image_url,is_joker,
//   slider_min,slider_max,slider_tolerance,video_url,video_start_seconds,
//   video_end_seconds,audio_url
//
// - Only `question_text` and `correct_answer` are required; every other
//   column is optional and falls back to the same defaults used by the
//   "Add Question" button.
// - `options` (for multiple_choice / image_question / video_question /
//   audio_question) are separated by the pipe character, e.g. "Paris|Rome|Berlin|Madrid".
// - `is_joker` accepts true/false/1/0/yes/no (case-insensitive).
// - Blank/omitted numeric cells fall back to defaults; invalid numbers are reported as errors.

const VALID_TYPES: QuestionType[] = [
  "multiple_choice",
  "true_false",
  "image_question",
  "slider",
  "type_in",
  "video_question",
  "audio_question",
];

const OPTION_BASED_TYPES: QuestionType[] = [
  "multiple_choice",
  "image_question",
  "true_false",
  "video_question",
  "audio_question",
];

export interface CsvImportError {
  row: number; // 1-based, counting the header as row 0
  message: string;
}

export interface CsvImportResult {
  questions: QuestionFormData[];
  errors: CsvImportError[];
}

function createDefaultQuestion(): QuestionFormData {
  return {
    type: "multiple_choice",
    question_text: "",
    options: ["", "", "", ""],
    correct_answer: "",
    time_limit: 15,
    image_url: "",
    is_joker: false,
    slider_min: 0,
    slider_max: 100,
    video_url: "",
    video_start_seconds: 0,
    video_end_seconds: null,
    audio_url: "",
  };
}

// Parses a single CSV line into fields, honoring double-quoted fields that
// may contain commas, newlines, or escaped ("") quotes.
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

// Splits full CSV text into logical rows, respecting quoted newlines.
function splitCsvRows(text: string): string[] {
  const rows: string[] = [];
  let current = "";
  let inQuotes = false;

  // Normalize line endings first so \r\n doesn't leak into quoted fields.
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === "\n" && !inQuotes) {
      rows.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim().length > 0) rows.push(current);
  return rows;
}

function toBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "y";
}

function parseOptionalInt(
  value: string | undefined,
  fallback: number,
  field: string,
  rowErrors: string[]
): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed)) {
    rowErrors.push(`Invalid number for "${field}": "${value}"`);
    return fallback;
  }
  return Math.round(parsed);
}

function parseOptionalIntOrNull(
  value: string | undefined,
  field: string,
  rowErrors: string[]
): number | null {
  if (value === undefined || value.trim() === "") return null;
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed)) {
    rowErrors.push(`Invalid number for "${field}": "${value}"`);
    return null;
  }
  return Math.round(parsed);
}

/**
 * Parses CSV text into an array of QuestionFormData, plus a list of
 * per-row errors for anything that couldn't be understood. Rows with
 * errors are skipped (not added to `questions`) so a partial import
 * never silently creates a broken question.
 */
export function parseQuestionsCsv(csvText: string): CsvImportResult {
  const errors: CsvImportError[] = [];
  const rows = splitCsvRows(csvText).filter((r) => r.trim().length > 0);

  if (rows.length === 0) {
    return { questions: [], errors: [{ row: 0, message: "The CSV file is empty." }] };
  }

  const header = parseCsvLine(rows[0]).map((h) => h.trim().toLowerCase());
  const colIndex = (name: string) => header.indexOf(name);

  const required = ["question_text", "correct_answer"];
  const missingRequired = required.filter((r) => colIndex(r) === -1);
  if (missingRequired.length > 0) {
    return {
      questions: [],
      errors: [
        {
          row: 0,
          message: `Missing required column(s): ${missingRequired.join(", ")}`,
        },
      ],
    };
  }

  const questions: QuestionFormData[] = [];

  for (let i = 1; i < rows.length; i++) {
    const rowNumber = i + 1; // 1-based including header as row 1
    const cells = parseCsvLine(rows[i]);
    const get = (name: string): string | undefined => {
      const idx = colIndex(name);
      if (idx === -1) return undefined;
      return cells[idx];
    };

    const rowErrors: string[] = [];
    const question = createDefaultQuestion();

    const questionText = (get("question_text") ?? "").trim();
    if (!questionText) {
      // Silently skip fully blank rows (e.g. trailing newline artifacts).
      if (cells.every((c) => c.trim() === "")) continue;
      rowErrors.push('Missing "question_text".');
    }
    question.question_text = questionText;

    const rawType = (get("type") ?? "multiple_choice").trim().toLowerCase() as QuestionType;
    if (rawType && !VALID_TYPES.includes(rawType)) {
      rowErrors.push(
        `Unknown "type": "${rawType}". Expected one of: ${VALID_TYPES.join(", ")}`
      );
    } else {
      question.type = rawType || "multiple_choice";
    }

    const correctAnswer = (get("correct_answer") ?? "").trim();
    if (!correctAnswer) {
      rowErrors.push('Missing "correct_answer".');
    }
    question.correct_answer = correctAnswer;

    const optionsRaw = get("options");
    if (OPTION_BASED_TYPES.includes(question.type)) {
      if (question.type === "true_false") {
        question.options = ["True", "False"];
      } else if (optionsRaw && optionsRaw.trim() !== "") {
        const opts = optionsRaw.split("|").map((o) => o.trim());
        if (opts.length < 2) {
          rowErrors.push(
            `"options" must contain at least 2 values separated by "|" for type "${question.type}".`
          );
        } else {
          question.options = opts;
        }
      } else {
        rowErrors.push(`"options" is required for type "${question.type}".`);
      }

      if (
        question.correct_answer &&
        question.options.length > 0 &&
        !question.options.includes(question.correct_answer)
      ) {
        rowErrors.push(
          `"correct_answer" ("${question.correct_answer}") is not one of the provided "options".`
        );
      }
    } else {
      question.options = [];
    }

    question.time_limit = parseOptionalInt(get("time_limit"), 15, "time_limit", rowErrors);
    question.image_url = (get("image_url") ?? "").trim();
    question.is_joker = toBoolean(get("is_joker"));

    if (question.type === "slider") {
      question.slider_min = parseOptionalInt(get("slider_min"), 0, "slider_min", rowErrors);
      question.slider_max = parseOptionalInt(get("slider_max"), 100, "slider_max", rowErrors);
      const tolerance = get("slider_tolerance");
      if (tolerance && tolerance.trim() !== "") {
        question.slider_tolerance = parseOptionalInt(
          tolerance,
          0,
          "slider_tolerance",
          rowErrors
        );
      }
      if (question.slider_min >= question.slider_max) {
        rowErrors.push('"slider_min" must be less than "slider_max".');
      }
    }

    if (question.type === "video_question") {
      question.video_url = (get("video_url") ?? "").trim();
      if (!question.video_url) {
        rowErrors.push('"video_url" is required for type "video_question".');
      }
      question.video_start_seconds = parseOptionalInt(
        get("video_start_seconds"),
        0,
        "video_start_seconds",
        rowErrors
      );
      question.video_end_seconds = parseOptionalIntOrNull(
        get("video_end_seconds"),
        "video_end_seconds",
        rowErrors
      );
    }

    if (question.type === "audio_question") {
      question.audio_url = (get("audio_url") ?? "").trim();
      if (!question.audio_url) {
        rowErrors.push('"audio_url" is required for type "audio_question".');
      }
    }

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, message: rowErrors.join(" ") });
      continue;
    }

    questions.push(question);
  }

  return { questions, errors };
}

export const CSV_TEMPLATE_HEADER =
  "type,question_text,options,correct_answer,time_limit,image_url,is_joker,slider_min,slider_max,slider_tolerance,video_url,video_start_seconds,video_end_seconds,audio_url";

export const CSV_TEMPLATE_EXAMPLE_ROWS = [
  'multiple_choice,"What is the capital of France?","Paris|Rome|Berlin|Madrid",Paris,15,,false,,,,,,,',
  'true_false,"The horse is the fastest land animal.",,False,10,,false,,,,,,,',
  'slider,"What year did the WIC founded?",,1998,20,,false,1950,2020,2,,,,',
  'type_in,"Name the largest planet in our solar system.",,Jupiter,20,,true,,,,,,,',
].join("\n");

export const CSV_TEMPLATE = `${CSV_TEMPLATE_HEADER}\n${CSV_TEMPLATE_EXAMPLE_ROWS}\n`;

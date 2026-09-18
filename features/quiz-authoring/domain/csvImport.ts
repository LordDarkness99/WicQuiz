import type { QuestionType } from "@/shared/domain/types";
import type { QuestionFormData } from "./types";

// CSV import for bulk question authoring.
//
// Expected header row (case-insensitive, order-independent):
//   type,question_text,options,correct_answer,time_limit,image_url,is_joker
//
// - Only `question_text` and `correct_answer` are required; every other
//   column is optional and falls back to the same defaults used by the
//   "Add Question" button.
// - `options` (for multiple_choice / image_question) are separated by
//   the pipe character, e.g. "Paris|Rome|Berlin|Madrid".
// - `is_joker` accepts true/false/1/0/yes/no (case-insensitive).
// - Blank/omitted numeric cells fall back to defaults; invalid numbers are reported as errors.

const VALID_TYPES: QuestionType[] = [
  "multiple_choice",
  "true_false",
  "image_question",
  "type_in",
];

const OPTION_BASED_TYPES: QuestionType[] = [
  "multiple_choice",
  "image_question",
  "true_false",
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

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[i + 1] === "\n") {
        i++;
      }
      if (current.trim().length > 0) {
        rows.push(current);
      }
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim().length > 0) {
    rows.push(current);
  }

  return rows;
}

function toBoolean(val: string | undefined): boolean {
  if (!val) return false;
  const cleaned = val.trim().toLowerCase();
  return cleaned === "true" || cleaned === "1" || cleaned === "yes";
}

function parseOptionalInt(
  val: string | undefined,
  fallback: number,
  field: string,
  errors: string[]
): number {
  if (!val || val.trim() === "") return fallback;
  const num = Number(val.trim());
  if (isNaN(num) || !Number.isFinite(num)) {
    errors.push(`Invalid number for "${field}": "${val}".`);
    return fallback;
  }
  return Math.round(num);
}

/**
 * Parses raw CSV content into QuestionFormData items, collecting row-level errors.
 * Never throws — unparseable rows are surfaced in `errors` so the caller can
 * show the user exactly which lines need attention.
 */
export function parseQuestionsCsv(csvContent: string): CsvImportResult {
  const rawRows = splitCsvRows(csvContent);

  if (rawRows.length === 0) {
    return {
      questions: [],
      errors: [{ row: 0, message: "CSV file is empty." }],
    };
  }

  const headerRow = parseCsvLine(rawRows[0]).map((h) =>
    h.trim().toLowerCase()
  );

  const colIndex: Record<string, number> = {};
  headerRow.forEach((col, idx) => {
    colIndex[col] = idx;
  });

  const requiredCols = ["question_text", "correct_answer"];
  const missingCols = requiredCols.filter((col) => colIndex[col] === undefined);
  if (missingCols.length > 0) {
    return {
      questions: [],
      errors: [
        {
          row: 0,
          message: `Missing required column header(s): ${missingCols.join(
            ", "
          )}. Expected: type,question_text,options,correct_answer,time_limit,image_url,is_joker`,
        },
      ],
    };
  }

  const questions: QuestionFormData[] = [];
  const errors: CsvImportError[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const rowNumber = i + 1; // Human-readable (1-indexed, header is line 1)
    const rawLine = rawRows[i].trim();
    if (!rawLine) continue;

    const fields = parseCsvLine(rawRows[i]);
    if (fields.every((f) => !f.trim())) continue;
    const rowErrors: string[] = [];

    const get = (col: string): string | undefined => {
      const idx = colIndex[col];
      return idx !== undefined && idx < fields.length ? fields[idx] : undefined;
    };

    const question = createDefaultQuestion();

    const questionText = (get("question_text") ?? "").trim();
    if (!questionText) {
      rowErrors.push('Missing "question_text".');
    }
    question.question_text = questionText;

    const rawType = (get("type") ?? "multiple_choice")
      .trim()
      .toLowerCase() as QuestionType;
    if (rawType && !VALID_TYPES.includes(rawType)) {
      rowErrors.push(
        `Unknown or unsupported "type": "${rawType}". Expected one of: ${VALID_TYPES.join(
          ", "
        )}`
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

    question.time_limit = parseOptionalInt(
      get("time_limit"),
      15,
      "time_limit",
      rowErrors
    );
    question.image_url = (get("image_url") ?? "").trim();
    question.is_joker = toBoolean(get("is_joker"));

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, message: rowErrors.join(" ") });
      continue;
    }

    questions.push(question);
  }

  return { questions, errors };
}

export const CSV_TEMPLATE_HEADER =
  "type,question_text,options,correct_answer,time_limit,image_url,is_joker";

export const CSV_TEMPLATE_EXAMPLE_ROWS = [
  'multiple_choice,"What is the capital of France?","Paris|Rome|Berlin|Madrid",Paris,15,,false',
  'true_false,"The horse is the fastest land animal.",,False,10,,false',
  'type_in,"Name the largest planet in our solar system.",,Jupiter,20,,true',
].join("\n");

export const CSV_TEMPLATE = `${CSV_TEMPLATE_HEADER}\n${CSV_TEMPLATE_EXAMPLE_ROWS}\n`;

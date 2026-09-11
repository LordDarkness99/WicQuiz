"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  parseQuestionsCsv,
  CSV_TEMPLATE,
  type CsvImportError,
} from "../domain/csvImport";
import type { QuestionFormData } from "../domain/types";

interface CSVImportButtonProps {
  onImport: (questions: QuestionFormData[]) => void;
}

function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "wicquiz-questions-template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function CSVImportButton({ onImport }: CSVImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<CsvImportError[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  function handleClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so selecting the same file twice still fires onChange.
    e.target.value = "";
    if (!file) return;

    setIsParsing(true);
    setErrors([]);
    try {
      const text = await file.text();
      const { questions, errors: parseErrors } = parseQuestionsCsv(text);

      if (questions.length > 0) {
        onImport(questions);
        toast.success(
          `Imported ${questions.length} question${questions.length === 1 ? "" : "s"} from CSV.`
        );
      }

      if (parseErrors.length > 0) {
        setErrors(parseErrors);
        if (questions.length === 0) {
          toast.error("Couldn't import any rows — see the details below.");
        } else {
          toast.warning(
            `${parseErrors.length} row${parseErrors.length === 1 ? "" : "s"} skipped due to errors.`
          );
        }
      }
    } catch {
      toast.error("Could not read that file. Please upload a valid .csv file.");
    } finally {
      setIsParsing(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleClick}
          disabled={isParsing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-primary border border-primary/20 hover:bg-surface-container-low transition-colors disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-base">upload_file</span>
          {isParsing ? "Importing..." : "Import CSV"}
        </button>
        <button
          type="button"
          onClick={downloadCsvTemplate}
          className="text-xs font-bold text-outline hover:text-primary transition-colors underline underline-offset-2"
        >
          Download template
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {errors.length > 0 && (
        <div className="text-xs text-error bg-error-container rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
          {errors.map((err, i) => (
            <div key={i}>
              {err.row === 0 ? "" : `Row ${err.row}: `}
              {err.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

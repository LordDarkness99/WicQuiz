import { describe, it, expect } from "vitest";
import { parseQuestionsCsv, CSV_TEMPLATE } from "../csvImport";

describe("parseQuestionsCsv", () => {
  it("parses the bundled template with zero errors", () => {
    const { questions, errors } = parseQuestionsCsv(CSV_TEMPLATE);
    expect(errors).toEqual([]);
    expect(questions).toHaveLength(3);
    expect(questions[0]).toMatchObject({
      type: "multiple_choice",
      question_text: "What is the capital of France?",
      options: ["Paris", "Rome", "Berlin", "Madrid"],
      correct_answer: "Paris",
      time_limit: 15,
    });
    expect(questions[1]).toMatchObject({
      type: "true_false",
      options: ["True", "False"],
      correct_answer: "False",
    });
    expect(questions[2]).toMatchObject({
      type: "type_in",
      correct_answer: "Jupiter",
      is_joker: true,
    });
  });

  it("defaults type to multiple_choice when the column is omitted", () => {
    const csv = [
      "question_text,options,correct_answer",
      '"2+2?","3|4|5|6",4',
    ].join("\n");
    const { questions, errors } = parseQuestionsCsv(csv);
    expect(errors).toEqual([]);
    expect(questions[0].type).toBe("multiple_choice");
  });

  it("reports an error and skips the row when question_text is missing", () => {
    const csv = [
      "question_text,options,correct_answer",
      ',"3|4|5|6",4',
    ].join("\n");
    const { questions, errors } = parseQuestionsCsv(csv);
    expect(questions).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("question_text");
  });

  it("reports an error when correct_answer is not among options", () => {
    const csv = [
      "question_text,options,correct_answer",
      '"2+2?","3|5|6",4',
    ].join("\n");
    const { questions, errors } = parseQuestionsCsv(csv);
    expect(questions).toHaveLength(0);
    expect(errors[0].message).toContain("not one of the provided");
  });

  it("requires at least the question_text and correct_answer columns", () => {
    const csv = ["type,options", "multiple_choice,a|b"].join("\n");
    const { errors } = parseQuestionsCsv(csv);
    expect(errors[0].message).toContain("Missing required column");
  });

  it("rejects unsupported types like slider, video, and audio", () => {
    const csv = [
      "type,question_text,correct_answer",
      "slider,What year?,1998",
    ].join("\n");
    const { questions, errors } = parseQuestionsCsv(csv);
    expect(questions).toHaveLength(0);
    expect(errors[0].message).toContain("unsupported");
  });

  it("rejects an unknown question type", () => {
    const csv = [
      "type,question_text,correct_answer",
      "riddle,What am I?,mystery",
    ].join("\n");
    const { questions, errors } = parseQuestionsCsv(csv);
    expect(questions).toHaveLength(0);
    expect(errors[0].message).toContain("unsupported");
  });

  it("handles quoted fields containing commas", () => {
    const csv = [
      "question_text,options,correct_answer",
      '"Which is a fruit, not a vegetable?","Apple, red|Carrot|Potato","Apple, red"',
    ].join("\n");
    const { questions, errors } = parseQuestionsCsv(csv);
    expect(errors).toEqual([]);
    expect(questions[0].options).toEqual(["Apple, red", "Carrot", "Potato"]);
    expect(questions[0].correct_answer).toBe("Apple, red");
  });

  it("parses type_in questions without requiring options", () => {
    const csv = [
      "type,question_text,correct_answer",
      "type_in,Capital of Japan?,Tokyo",
    ].join("\n");
    const { questions, errors } = parseQuestionsCsv(csv);
    expect(errors).toEqual([]);
    expect(questions[0].options).toEqual([]);
  });

  it("returns an error for an empty file", () => {
    const { questions, errors } = parseQuestionsCsv("");
    expect(questions).toHaveLength(0);
    expect(errors[0].message).toContain("empty");
  });

  it("skips fully blank trailing rows without emitting an error", () => {
    const csv = [
      "question_text,options,correct_answer",
      '"2+2?","3|4|5|6",4',
      ",,",
      "",
    ].join("\n");
    const { questions, errors } = parseQuestionsCsv(csv);
    expect(errors).toEqual([]);
    expect(questions).toHaveLength(1);
  });
});

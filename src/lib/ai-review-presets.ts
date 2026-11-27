export const aiReviewPresets = [
  {
    kind: "compliance_question",
    label: "Compliance question",
    prompt:
      "Summarise the recorded evidence relevant to my question and identify gaps, assumptions and points requiring human verification.",
  },
  {
    kind: "inspection_readiness",
    label: "Prepare for an inspection",
    prompt:
      "Identify missing or outdated evidence that should be reviewed before an inspection. Separate observed records from assumptions and suggest a prioritised human review checklist.",
  },
  {
    kind: "allergen_review",
    label: "Allergen and PPDS review",
    prompt:
      "Identify what current recipe and supplier evidence must be verified before reviewing allergen declarations or PPDS labels. Do not infer that any product is allergen-free.",
  },
  {
    kind: "corrective_action_review",
    label: "Corrective-action review",
    prompt:
      "Summarise recorded exceptions and corrective-action evidence. Identify unresolved risks, missing verification and recommended follow-up for an authorised manager.",
  },
  {
    kind: "haccp_review",
    label: "HACCP evidence review",
    prompt:
      "Review the available HACCP-related evidence and highlight gaps in documented controls, monitoring and corrective-action records. Identify limitations without certifying the plan.",
  },
  {
    kind: "regulatory_question",
    label: "Regulatory question",
    prompt:
      "Identify relevant UK food-safety guidance for my question, distinguish source-backed information from uncertainty, and highlight points requiring official or specialist confirmation.",
  },
] as const;

export type AiReviewKind = (typeof aiReviewPresets)[number]["kind"];

export function reviewQuestionValid(question: string) {
  const length = question.trim().length;
  return length >= 10 && length <= 3000;
}

/** Render only explicit answer fields, never arbitrary provider objects or debug payloads. */
export function readableReviewAnswer(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = value as Record<string, unknown>;
  for (const field of ["answer", "summary", "text", "final"]) {
    if (typeof record[field] === "string") return record[field];
  }
  return "";
}

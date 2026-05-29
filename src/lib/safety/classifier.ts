import { generateObject } from "ai";
import { z } from "zod";
import { classifierModel } from "@/lib/ai";

/**
 * Parallel crisis-risk classifier. Runs alongside the main conversational model
 * (see src/app/api/chat/route.ts) and produces a structured verdict that is
 * persisted as a CrisisFlag when severity is HIGH or CRITICAL.
 *
 * This is flag-and-log only: it never intervenes in the conversational stream.
 * The main model still owns the actual crisis response via its prompt calibration.
 */

const SEVERITY = ["NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const CATEGORY = [
  "SUICIDAL_IDEATION",
  "SELF_HARM",
  "HARM_TO_OTHERS",
  "SEVERE_DISTRESS",
  "OTHER",
] as const;

export type Severity = (typeof SEVERITY)[number];
export type CrisisCategory = (typeof CATEGORY)[number];

export type RiskVerdict = {
  severity: Severity;
  category: CrisisCategory;
  confidence?: number;
  modelId: string;
};

const verdictSchema = z.object({
  severity: z.enum(SEVERITY),
  category: z.enum(CATEGORY),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Your certainty in this severity label, 0 to 1."),
});

const RUBRIC = `You are a safety classifier for a recovery-companion app. You do not talk to the user. You read a short slice of conversation and return a single structured risk label for the LATEST user message, judged in the context of the recent turns.

Calibration matters more than caution. Over-flagging hyperbolic venting is itself a harm: it floods the log with noise and trains the operator to ignore it, so the real signal gets missed. Read the trajectory, not just the words.

Severity levels:
- CRITICAL — imminent danger. A specific plan with means or timing ("I have the pills, tonight", "I'm in the car"), an overdose already in progress or going quiet mid-conversation, acute alcohol withdrawal (shakes, hallucinations, seizures, confusion, last drink 1-3 days ago and worsening), or clear stated intent to act now.
- HIGH — strong, specific risk with one element of imminence missing. Stated intent to harm self or others without a concrete plan yet, hopelessness compounding across the recent turns paired with a flat/final/detached tone shift, giving things away or wrapping things up.
- MEDIUM — genuinely ambiguous. Something concerning surfaced but you cannot tell if it is real distress or heavy venting. This is the "a friend would ask a direct question" zone.
- LOW — mild or transient. A bad day, frustration, stress, no real risk signal.
- NONE — hyperbolic venting ("I want to die", "kill me now" after a rough day), dark or gallows humor, edgy testing of the app, reflection on past ideation from a recovered/grounded frame, song lyrics, hypotheticals, or talking about someone else.

Pick the category that best fits the dominant signal (use OTHER for acute withdrawal/overdose or anything that does not fit). If severity is NONE or LOW, still pick the closest category. Set confidence to your certainty in the severity label.

Return only the structured verdict. Never produce conversational text.`;

function formatWindow(
  recent: { role: "USER" | "ASSISTANT"; content: string }[]
): string {
  return recent
    .map((m) => `${m.role === "USER" ? "User" : "sobr"}: ${m.content}`)
    .join("\n");
}

/**
 * Classify the latest user message in the context of a recent rolling window.
 * Fails open on the conversation: any error returns severity NONE (no flag written)
 * and logs a sanitized message only. Never throws.
 */
export async function classifyRisk(
  recent: { role: "USER" | "ASSISTANT"; content: string }[]
): Promise<RiskVerdict> {
  try {
    const { object, response } = await generateObject({
      model: classifierModel,
      schema: verdictSchema,
      temperature: 0,
      maxOutputTokens: 200,
      messages: [
        {
          role: "system",
          content: RUBRIC,
          providerOptions: {
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        },
        { role: "user", content: formatWindow(recent) },
      ],
    });

    return {
      severity: object.severity,
      category: object.category,
      confidence: object.confidence,
      modelId: response.modelId ?? "claude-haiku-4-5",
    };
  } catch (error) {
    console.error("crisis classifier failed", {
      name: error instanceof Error ? error.name : "Unknown",
    });
    return { severity: "NONE", category: "OTHER", modelId: "claude-haiku-4-5" };
  }
}

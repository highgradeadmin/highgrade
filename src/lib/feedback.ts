import { z } from "zod";
import { TRAIT_IDS } from "./traits";

/** How many rounds of feedback a student gets on one piece of writing. */
export const MAX_TRIES = 5;

// Shape of the feedback Claude returns. Shared by the API route and the UI.
export const FeedbackSchema = z.object({
  overall_comment: z
    .string()
    .describe("2-3 warm, specific sentences addressed to the student as 'you'."),
  strengths: z
    .array(
      z.object({
        quote: z.string().describe("An exact short quote from the student's writing."),
        comment: z.string().describe("Why this part works."),
      }),
    )
    .describe("1-3 things the student did well."),
  traits: z
    .array(
      z.object({
        trait: z.enum(TRAIT_IDS),
        score: z.number().describe("Integer 1-5 relative to the student's grade level."),
        comment: z.string().describe("One sentence explaining the score."),
      }),
    )
    .describe("Exactly one entry for each of the six traits."),
  next_steps: z
    .array(
      z.object({
        focus: z.string().describe("Short label, e.g. 'Add a sensory detail'."),
        suggestion: z
          .string()
          .describe("A concrete tip or guiding question. Never a rewritten version of their text."),
        quote: z
          .string()
          .nullable()
          .describe("Exact quote from the student's text this applies to, or null."),
      }),
    )
    .describe("1-2 highest-impact revisions, most important first."),
  revision_question: z
    .string()
    .describe("One open question that will push the student's next draft forward."),
  wellbeing_concern: z
    .boolean()
    .describe("True only if the writing suggests the student may be unsafe or in distress."),
});

export type Feedback = z.infer<typeof FeedbackSchema>;

export const FeedbackRequestSchema = z.object({
  childId: z.uuid(),
  taskKey: z.string().min(1).max(100),
  lessonSlug: z.string().max(100).nullable(),
  title: z.string().max(200),
  text: z.string().trim().min(20, "Write at least a few sentences first.").max(8000),
  prompt: z.string().max(1000),
  genre: z.enum(["paragraph", "narrative", "persuasive", "informative"]),
  focus: z.array(z.string()).max(6).default([]),
  checklist: z.array(z.string().max(300)).max(10).default([]),
});

export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;

import { z } from "zod";
import { TRAIT_IDS } from "./traits";

/** How many rounds of feedback a student gets on one piece of writing. */
export const MAX_TRIES = 5;

// Shape of the feedback Claude returns. Shared by the API route and the UI.
// Every text field is read by a 10-14 year old, so the descriptions ask for short, plain sentences.
export const FeedbackSchema = z.object({
  overall_comment: z
    .string()
    .describe("1-2 short, warm sentences to the student as 'you'. Under 30 words in total."),
  strengths: z
    .array(
      z.object({
        quote: z.string().describe("An exact short quote from the student's writing."),
        comment: z.string().describe("Why this part works. One short sentence, under 15 words."),
      }),
    )
    .describe("1-2 things the student did well."),
  traits: z
    .array(
      z.object({
        trait: z.enum(TRAIT_IDS),
        score: z.number().describe("Integer 1-5 relative to the student's grade level."),
        comment: z.string().describe("One short sentence explaining the score, under 15 words."),
      }),
    )
    .describe("Exactly one entry for each of the six traits."),
  next_steps: z
    .array(
      z.object({
        focus: z.string().describe("2-5 word label, e.g. 'Add what you heard'."),
        suggestion: z
          .string()
          .describe(
            "Exactly what to do next, in 1-2 short sentences (under 25 words). A tip or question, not a rewritten sentence.",
          ),
        quote: z
          .string()
          .nullable()
          .describe("Exact quote from the student's text this applies to, or null."),
      }),
    )
    .describe("1-2 highest-impact revisions, most important first."),
  sentence_makeovers: z
    .array(
      z.object({
        before: z.string().describe("One sentence copied exactly from the student's writing."),
        after: z
          .string()
          .describe("That same sentence made better, keeping the student's idea and most of their words."),
        why: z.string().describe("What changed and why it is better. Under 12 words."),
      }),
    )
    .describe("2-3 of the student's weakest sentences, each shown before and after."),
  improved_version: z
    .string()
    .describe(
      "The student's whole piece made one step better: same ideas, order and voice, fixing the next steps. Keep paragraph breaks as blank lines.",
    ),
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

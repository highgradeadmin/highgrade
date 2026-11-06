// The 6 Traits of Writing — the rubric used for lessons, feedback and progress.
export const TRAITS = [
  {
    id: "ideas",
    name: "Ideas",
    short: "A clear main idea with strong supporting details.",
  },
  {
    id: "organization",
    name: "Organization",
    short: "A logical order with a strong beginning, middle and end.",
  },
  {
    id: "voice",
    name: "Voice",
    short: "The writer's personality and confidence come through.",
  },
  {
    id: "word_choice",
    name: "Word Choice",
    short: "Precise, vivid words that fit the purpose.",
  },
  {
    id: "sentence_fluency",
    name: "Sentence Fluency",
    short: "Sentences that vary in length and flow when read aloud.",
  },
  {
    id: "conventions",
    name: "Conventions",
    short: "Correct spelling, punctuation, capitals and grammar.",
  },
] as const;

export type TraitId = (typeof TRAITS)[number]["id"];

export const TRAIT_IDS = TRAITS.map((t) => t.id) as [TraitId, ...TraitId[]];

export function traitName(id: TraitId): string {
  return TRAITS.find((t) => t.id === id)?.name ?? id;
}

import type { Genre } from "./lessons";

export interface DailyPrompt {
  prompt: string;
  genre: Genre;
}

const PROMPTS: DailyPrompt[] = [
  { prompt: "Describe the most interesting object in your room and the story behind it.", genre: "narrative" },
  { prompt: "Should every student learn to cook at school? Convince a reader.", genre: "persuasive" },
  { prompt: "Explain how to make a friend feel welcome on their first day at a new school.", genre: "informative" },
  { prompt: "Write about a time you changed your mind about something.", genre: "narrative" },
  { prompt: "If you could add one new subject to school, what would it be and why?", genre: "persuasive" },
  { prompt: "Describe a storm from the point of view of a cat watching through the window.", genre: "narrative" },
  { prompt: "Explain the rules of your favorite game to someone who has never played it.", genre: "informative" },
  { prompt: "Is it better to be a big fish in a small pond or a small fish in a big pond?", genre: "persuasive" },
  { prompt: "Write about a place that feels completely different at night than during the day.", genre: "narrative" },
  { prompt: "Compare your life today with what you imagine it was like for a kid 100 years ago.", genre: "informative" },
  { prompt: "Should zoos exist? Take a side and support it.", genre: "persuasive" },
  { prompt: "Write a scene where someone finds a note that wasn't meant for them.", genre: "narrative" },
  { prompt: "Explain why something in nature (rain, rainbows, seasons, tides) happens.", genre: "informative" },
  { prompt: "What is one rule at home or school that should change? Make your case.", genre: "persuasive" },
];

/** Same prompt for everyone on a given calendar day (UTC). */
export function getDailyPrompt(date = new Date()): DailyPrompt {
  const day = Math.floor(date.getTime() / 86_400_000);
  return PROMPTS[day % PROMPTS.length];
}

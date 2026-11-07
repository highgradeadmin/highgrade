import type { GradeBand, Genre } from "./lessons";

export interface DailyPrompt {
  prompt: string;
  genre: Genre;
}

// ~100 prompts per level, so a child writing every day doesn't see a repeat for over three months.
// Keep topics safe and age-appropriate: no prompts that ask children to share private or painful experiences.

const BANK: Record<GradeBand, Record<"narrative" | "persuasive" | "informative", string[]>> = {
  "5-6": {
    narrative: [
      "Describe the most interesting object in your room and the story behind it.",
      "Write about a time you changed your mind about something.",
      "Describe a storm from the point of view of a cat watching through the window.",
      "Write about a place that feels completely different at night than during the day.",
      "Write a scene where someone finds a note that wasn't meant for them.",
      "Write about the best day of a summer holiday, real or imagined.",
      "You wake up and you are one inch tall. Describe your first hour.",
      "Write about a time you were really proud of yourself.",
      "Your pet can talk for one day only. What happens?",
      "Write about the first time you tried something new and a little scary.",
      "A door appears in your school that was never there before. Where does it lead?",
      "Describe your favourite meal as if the reader has never tasted food before.",
      "Write about a time something went wrong but turned out fine.",
      "You find a map inside an old library book. Tell the story of following it.",
      "Write about a rainy day from start to finish.",
      "Tell the story of a lost balloon from the balloon's point of view.",
      "Write about a time you helped someone.",
      "You can swap lives with an animal for a day. Which one, and what happens?",
      "Describe the noisiest place you have ever been.",
      "Write about a game or match you will never forget.",
      "A robot joins your class. Write about its first day.",
      "Write about a time you laughed so hard you couldn't stop.",
      "Tell the story of the oldest tree in your town.",
      "You open your lunchbox and find something magical inside. What is it?",
      "Write about a time you had to be brave.",
      "Describe a walk through a forest using all five senses.",
      'Write a story that begins: "Nobody believed me, but…"',
      "Write about a family tradition you enjoy.",
      "You are the first kid to visit the Moon. Describe the landing.",
      "Write about something you built or made yourself.",
      "Tell the story of a snowman's one and only day.",
      "Write about a time you waited for something exciting.",
      "A message in a bottle washes up at your feet. What does it say, and what do you do?",
      "Write about your favourite place to read, play or think.",
    ],
    persuasive: [
      "Should every student learn to cook at school? Convince a reader.",
      "If you could add one new subject to school, what would it be and why?",
      "Should zoos exist? Take a side and support it.",
      "What is one rule at home or school that should change? Make your case.",
      "Should kids have homework every night? Give your opinion.",
      "Which is the best season of the year? Convince someone who disagrees.",
      "Should recess be longer? Make your case.",
      "Cats or dogs: which make better pets?",
      "Should students choose where they sit in class?",
      "Is it better to read the book or watch the movie?",
      "Should every school have a garden? Persuade your principal.",
      "Should kids be allowed to have a phone at age 10?",
      "What is the best game ever invented? Convince a reader.",
      "Should school start later in the morning?",
      "Should students wear school uniforms?",
      "Is it better to live in a city or in the countryside?",
      "Should every kid learn to swim? Explain why.",
      "Should families have one day a week with no screens?",
      "Which animal would make the best class pet, and why?",
      "Should kids get paid for doing chores?",
      "Is it better to be the oldest or the youngest child? Pick a side.",
      "Should schools serve only healthy food?",
      "Should every kid learn a musical instrument?",
      "Is the summer holiday too long or too short?",
      "Should students be allowed to bring a pet to school one day a year?",
      "Breakfast is the most important meal of the day. Agree or disagree?",
      "Should your town build a new park or a new library?",
      "Should video games count as a sport?",
      "Is it better to have one best friend or lots of friends?",
      "Should kids help decide what's for dinner at home?",
      "Should classes go on a field trip every month?",
      "Is it better to be really fast or really strong? Make your case.",
      "Should everyone start learning a second language in primary school?",
    ],
    informative: [
      "Explain how to make a friend feel welcome on their first day at a new school.",
      "Explain the rules of your favourite game to someone who has never played it.",
      "Explain why something in nature (rain, rainbows, seasons or tides) happens.",
      "Compare your life today with what you imagine it was like for a kid 100 years ago.",
      "Explain how to take care of a pet you know about.",
      "Teach the reader how to make your favourite snack, step by step.",
      "Explain what makes a good team player.",
      "Describe your town or neighbourhood for someone who has never visited.",
      "Explain how a plant grows from a seed.",
      "Explain how to get ready for a big test.",
      "Describe an animal you know a lot about: where it lives, what it eats and how it survives.",
      "Explain how to stay safe when riding a bike.",
      "Explain the difference between weather and climate.",
      "Explain how recycling works and why it helps.",
      "Teach the reader how to pack for a sleepover.",
      "Explain why we need sleep.",
      "Describe how a holiday or festival is celebrated in your family.",
      "Explain how to build the perfect sandcastle or snow fort.",
      "Explain what a good friend does, with examples.",
      "Explain how to keep your room tidy for a whole week.",
      "Explain how bees help the world.",
      "Compare two sports: how are they alike and how are they different?",
      "Explain how to plant and look after a small garden.",
      "Explain how the water cycle works.",
      "Teach the reader a simple magic trick or puzzle.",
      "Explain what to do if you get lost in a busy place.",
      "Describe the job of someone in your community, like a nurse, firefighter or librarian.",
      "Explain why the Moon seems to change shape.",
      "Explain how to make a paper aeroplane that flies well.",
      "Explain the rules of a playground game.",
      "Compare a book and its movie: what stayed the same and what changed?",
      "Explain how to save up money for something you want.",
      "Explain why exercise is good for your body and your brain.",
    ],
  },
  "7-8": {
    narrative: [
      "Write about a moment when you realised you had grown up a little.",
      "Write a story told by an object left behind in a lost-and-found box.",
      "Write about a time you disagreed with a friend and how it ended.",
      "Describe a place from your past that has changed, and how you feel about it now.",
      'A stranger hands you a key and says, "You\'ll know when." Tell the story.',
      "Write about a time you failed at something and what happened next.",
      "Write a story set in a city where it has been raining for a hundred years.",
      "Write about a decision that was harder than it looked.",
      "Retell a small everyday moment so that it feels important.",
      "Two characters are stuck in a lift for an hour. Write the scene.",
      "Write about a skill you worked hard to learn.",
      "Write the opening of an adventure where the hero is the least likely person.",
      "Write about a time you saw something from someone else's point of view.",
      "A town's power goes out for a whole week. Tell the story through one family.",
      "Write about the moment before a big performance, game or competition.",
      "Write a story in which a small lie grows out of control.",
      "Describe a journey you have taken and one moment from it you'll always remember.",
      "You receive a letter from yourself, written ten years in the future. What does it say?",
      "Write about a time you stood up for someone or something.",
      "Write a scene where two old friends meet again after many years.",
      "Write a story from the point of view of the last tree in a city.",
      "Write about a time when silence said more than words.",
      "Your town's statue comes to life at midnight. What does it want?",
      "Write about a goodbye that mattered.",
      "Write a mystery that begins with a missing class pet.",
      "Write about a time you surprised yourself.",
      "Describe the busiest place you know as if time has slowed down.",
      "Write a story where the main character must choose between winning and doing the right thing.",
      "Write about an object that has been in your family for a long time.",
      "A ship's crew finds an island that is on no map. Tell what happens.",
      "Write about a first day: at a new school, club, team or place.",
      "Write a story in which the weather is almost a character.",
      "Write about a mistake that taught you something.",
      'Write a story that ends with the line: "And that\'s why I never open that drawer."',
    ],
    persuasive: [
      "Is it better to be a big fish in a small pond or a small fish in a big pond?",
      "Should social media have a minimum age of 16?",
      "Should students be graded on effort as well as results?",
      "Should schools switch to a four-day week?",
      "Should all students do some volunteer work before they finish school?",
      "Are video games good for young people? Take a side.",
      "Should cities ban cars from their centres?",
      "Should students be allowed to use AI tools for homework?",
      "Are professional athletes paid too much?",
      "Is it fair to set homework at weekends?",
      "Should every school teach money skills, like budgeting and saving?",
      "Should single-use plastic be banned completely?",
      "Should students help choose the topics they study?",
      "Should historic buildings always be protected, even when a city needs new homes?",
      "Is space exploration worth the cost?",
      "Should schools have a dress code at all?",
      "Should team sports be required in school?",
      "Should the voting age be lowered to 16?",
      "Is it better to learn from books or from experience?",
      "Should students be allowed to retake any test?",
      "Should phones be banned in schools during the day?",
      "Should animals be used in entertainment, like circuses or shows?",
      "Are celebrities good role models? Make your case.",
      "Should coding be a core subject, like maths and English?",
      "Should public transport be free?",
      "Is it better to be great at one thing or good at many things?",
      "Should schools give awards for attendance?",
      "Should towns have a curfew for teenagers?",
      "Should junk-food adverts be banned on children's TV and websites?",
      "Is competition good for young people?",
      "Should exams be replaced with projects?",
      "Should museums return treasures to the countries they came from?",
      "Should libraries stay open all night?",
    ],
    informative: [
      "Explain how a habit forms and how someone could build a good one.",
      "Explain, in simple terms, how the internet gets a web page to your screen.",
      "Compare two ways of travelling long distances, such as by plane and by train.",
      "Explain the causes and effects of a type of natural disaster.",
      "Explain how vaccines help the body fight illness.",
      "Explain how to plan a project so it gets finished on time.",
      "Explain how one invention changed everyday life.",
      "Explain what makes a good leader, using examples.",
      "Explain how electricity gets from a power station to your home.",
      "Compare two periods of history or civilisations you have learned about.",
      "Explain how to spot misinformation online.",
      "Explain why some animals migrate.",
      "Explain how a law is made in your country, or how decisions are made at your school.",
      "Explain the science behind a sport you like.",
      "Explain how an ecosystem stays in balance, with an example.",
      "Explain how to give a great presentation.",
      "Explain what causes the seasons.",
      "Explain how music can change our mood, with examples.",
      "Describe how a city works: who keeps the water, power, rubbish collection and roads running?",
      "Explain why sleep matters for teenagers.",
      "Explain how volcanoes form and erupt.",
      "Explain how to budget for a trip or an event.",
      "Compare reading on paper with reading on a screen.",
      "Explain how a famous building or bridge was built.",
      "Explain how bees, bats or birds help farmers.",
      "Explain the life cycle of a star.",
      "Explain how to settle a disagreement fairly.",
      "Explain how a video game is made, from idea to release.",
      "Explain why the oceans matter for life on land.",
      "Explain how money works: earning, saving, spending and borrowing.",
      "Explain how the brain learns something new.",
      "Explain the difference between reducing, reusing and recycling.",
      "Explain how weather forecasts are made.",
    ],
  },
};

/** Story, opinion, explain, story, … so the type of writing changes every day. */
function interleave(level: GradeBand): DailyPrompt[] {
  const { narrative, persuasive, informative } = BANK[level];
  const out: DailyPrompt[] = [];
  for (let i = 0; i < Math.max(narrative.length, persuasive.length, informative.length); i++) {
    if (narrative[i]) out.push({ prompt: narrative[i], genre: "narrative" });
    if (persuasive[i]) out.push({ prompt: persuasive[i], genre: "persuasive" });
    if (informative[i]) out.push({ prompt: informative[i], genre: "informative" });
  }
  return out;
}

const PROMPTS: Record<GradeBand, DailyPrompt[]> = { "5-6": interleave("5-6"), "7-8": interleave("7-8") };

/** Writing length goals for the Daily Write, by level. */
export const DAILY_TARGET_WORDS: Record<GradeBand, [number, number]> = { "5-6": [80, 200], "7-8": [120, 300] };

export function asLevel(level: string | null | undefined): GradeBand {
  return level === "7-8" ? "7-8" : "5-6";
}

/**
 * The prompt for a calendar day ("YYYY-MM-DD", the child's local date) and level.
 * Everyone at the same level gets the same prompt on the same day.
 */
export function getDailyPrompt(dayKey: string, level: string | null | undefined): DailyPrompt {
  const list = PROMPTS[asLevel(level)];
  const [y, m, d] = dayKey.split("-").map(Number);
  const day = Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86_400_000);
  return list[((day % list.length) + list.length) % list.length];
}

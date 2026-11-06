import type { TraitId } from "./traits";

export type GradeBand = "5-6" | "7-8";
export type Genre = "paragraph" | "narrative" | "persuasive" | "informative";

export interface Lesson {
  slug: string;
  title: string;
  grade: GradeBand;
  genre: Genre;
  focusTraits: TraitId[];
  minutes: number;
  summary: string;
  /** Short teaching points, shown in order. */
  teach: { heading: string; body: string }[];
  /** A weak and a strong example of the same idea, with why the strong one works. */
  example: { weak: string; strong: string; why: string };
  /** The writing task the student practises right after the lesson. */
  practice: {
    prompt: string;
    targetWords: [number, number];
    /** Guiding questions for the Brainstorm and Outline steps. */
    brainstorm: string[];
    outline: string[];
    /** Revision checklist shown in the Revise step. */
    checklist: string[];
  };
}

export const GENRE_LABELS: Record<Genre, string> = {
  paragraph: "Paragraphs",
  narrative: "Narrative",
  persuasive: "Persuasive",
  informative: "Informative",
};

export const LESSONS: Lesson[] = [
  {
    slug: "topic-sentences",
    title: "Strong Topic Sentences",
    grade: "5-6",
    genre: "paragraph",
    focusTraits: ["ideas", "organization"],
    minutes: 15,
    summary:
      "Learn to open a paragraph with one sentence that tells the reader exactly what it is about.",
    teach: [
      {
        heading: "What is a topic sentence?",
        body: "A topic sentence is usually the first sentence of a paragraph. It tells the reader the main idea, so every other sentence in the paragraph has a job: to support it.",
      },
      {
        heading: "Topic + opinion or angle",
        body: "A strong topic sentence names the topic AND says something about it. \"Dogs\" is a topic. \"Dogs make the best pets for busy families\" is a topic sentence.",
      },
      {
        heading: "Not too big, not too small",
        body: "If your topic sentence is too broad (\"Sports are good\"), you can't cover it in one paragraph. If it's too narrow (\"I scored a goal on Tuesday\"), there's nothing left to say.",
      },
    ],
    example: {
      weak: "This paragraph is about recess.",
      strong:
        "Recess should be longer because students learn better after they move and play.",
      why: "The strong version names the topic (recess), takes a position (it should be longer), and hints at the reason the paragraph will explain.",
    },
    practice: {
      prompt:
        "Write one paragraph about a place you love to spend time. Start with a strong topic sentence, then add 3–4 sentences that support it.",
      targetWords: [80, 150],
      brainstorm: [
        "What place do you love? Where is it?",
        "What do you see, hear and feel there?",
        "Why does this place matter to you?",
      ],
      outline: [
        "Topic sentence: place + why it's special",
        "Detail 1",
        "Detail 2",
        "Detail 3",
        "Closing sentence that echoes the topic sentence",
      ],
      checklist: [
        "My first sentence names the place AND why it's special.",
        "Every other sentence supports that idea.",
        "I used at least one sense detail (sight, sound, smell, touch, taste).",
        "My last sentence wraps up the paragraph.",
      ],
    },
  },
  {
    slug: "show-dont-tell",
    title: "Show, Don't Tell",
    grade: "5-6",
    genre: "narrative",
    focusTraits: ["word_choice", "voice"],
    minutes: 20,
    summary:
      "Turn flat statements into scenes the reader can picture by using actions, senses and dialogue.",
    teach: [
      {
        heading: "Telling vs. showing",
        body: "Telling gives the reader a label: \"She was nervous.\" Showing gives the evidence so the reader figures it out: \"She tapped her pencil and read the same question three times.\"",
      },
      {
        heading: "Your showing toolkit",
        body: "Use actions (what the character does), senses (what they see, hear, smell), body language, and dialogue (what they say and how).",
      },
      {
        heading: "Don't show everything",
        body: "Save showing for the important moments. It's fine to tell small things quickly (\"We drove home\") so the reader gets to the good part.",
      },
    ],
    example: {
      weak: "I was really excited for my birthday.",
      strong:
        "I woke up at 5 a.m., crept into the kitchen, and pressed my nose against the oven window to check if the cake had magically appeared.",
      why: "The strong version never says \"excited\" — the early wake-up, sneaking and checking the oven let the reader feel it.",
    },
    practice: {
      prompt:
        "Write a short scene (one or two paragraphs) about a moment when you felt surprised, scared or proud. Don't name the feeling — show it.",
      targetWords: [120, 250],
      brainstorm: [
        "Which moment will you write about?",
        "What did your body do (hands, face, heart, voice)?",
        "What could you see, hear or smell?",
        "Did anyone say something? What exactly?",
      ],
      outline: [
        "Opening: where are you and what is happening?",
        "The key moment, shown in slow motion",
        "How it ended",
      ],
      checklist: [
        "I never named the feeling directly.",
        "I used at least two senses.",
        "I included an action or body-language detail.",
        "I replaced at least one dull verb (went, said, got) with a stronger one.",
      ],
    },
  },
  {
    slug: "opinion-with-reasons",
    title: "Opinion + Reasons",
    grade: "5-6",
    genre: "persuasive",
    focusTraits: ["ideas", "organization"],
    minutes: 20,
    summary:
      "State a clear opinion and back it up with reasons and examples that convince the reader.",
    teach: [
      {
        heading: "Pick a side",
        body: "Persuasive writing starts with a clear opinion. \"Maybe homework is sometimes okay\" is hard to argue. \"Students should have no homework on weekends\" is clear.",
      },
      {
        heading: "Reasons answer \"why?\"",
        body: "Each reason should answer \"Why should the reader agree?\" Good reasons are different from each other, not the same idea said twice.",
      },
      {
        heading: "Examples make reasons believable",
        body: "After each reason, add an example, a fact, or a short story that proves it.",
      },
    ],
    example: {
      weak: "Our school should have a garden. It would be good. Gardens are nice.",
      strong:
        "Our school should have a garden. First, students would learn science by watching plants grow — we could measure them every week. Second, the vegetables could be used in the cafeteria, giving everyone healthier lunches.",
      why: "The strong version gives two different reasons, uses transition words (First, Second), and adds an example to each.",
    },
    practice: {
      prompt:
        "Should students be allowed to choose their own seats in class? Write a persuasive paragraph with your opinion and at least two reasons.",
      targetWords: [120, 220],
      brainstorm: [
        "What is your opinion?",
        "List every reason you can think of, then circle the two strongest.",
        "What example or fact supports each reason?",
      ],
      outline: [
        "Opinion sentence",
        "Reason 1 + example",
        "Reason 2 + example",
        "Closing sentence that restates the opinion",
      ],
      checklist: [
        "My opinion is clear in the first sentence.",
        "I have at least two different reasons.",
        "Each reason has an example.",
        "I used transition words (First, Also, Finally).",
      ],
    },
  },
  {
    slug: "explain-a-process",
    title: "Explaining How Something Works",
    grade: "5-6",
    genre: "informative",
    focusTraits: ["organization", "word_choice"],
    minutes: 15,
    summary:
      "Write clear, step-by-step explanations using order words and precise vocabulary.",
    teach: [
      {
        heading: "Know your reader",
        body: "Imagine explaining to someone who has never done it before. What would they need to know first?",
      },
      {
        heading: "Use order words",
        body: "Words like first, next, after that, while, and finally help the reader follow the steps.",
      },
      {
        heading: "Be precise",
        body: "\"Put some stuff in\" is confusing. \"Add two cups of flour\" is clear. Specific nouns and numbers help.",
      },
    ],
    example: {
      weak: "You get the bread and do the peanut butter and then it's done.",
      strong:
        "First, lay two slices of bread on a plate. Next, spread a thin layer of peanut butter on one slice, all the way to the edges. Finally, press the slices together and cut diagonally.",
      why: "The strong version uses order words, exact amounts and actions, and a logical sequence.",
    },
    practice: {
      prompt:
        "Explain how to do something you're good at (a game, a recipe, a sport move, a craft) so a beginner could follow it.",
      targetWords: [120, 220],
      brainstorm: [
        "What will you explain?",
        "What materials or setup are needed?",
        "List every step, even the ones that seem obvious.",
      ],
      outline: [
        "Intro: what this is and why it's worth learning",
        "Steps in order",
        "Closing tip or warning",
      ],
      checklist: [
        "A beginner could follow my steps without asking questions.",
        "I used order words.",
        "I used specific nouns, numbers or measurements.",
        "I included an introduction and a closing.",
      ],
    },
  },
  {
    slug: "hooks-that-grab",
    title: "Hooks That Grab the Reader",
    grade: "7-8",
    genre: "narrative",
    focusTraits: ["voice", "organization"],
    minutes: 20,
    summary:
      "Open with a question, a surprising fact, dialogue or action instead of \"Hi, my name is…\"",
    teach: [
      {
        heading: "Why the first line matters",
        body: "Readers decide in a sentence or two whether to keep reading. A hook creates curiosity — a question the reader wants answered.",
      },
      {
        heading: "Five kinds of hooks",
        body: "Action (\"The canoe flipped before I could scream.\"), dialogue, a surprising fact, a question, or a bold statement.",
      },
      {
        heading: "Avoid the boring openers",
        body: "Skip \"In this story I will tell you about…\" and dictionary definitions. Start in the middle of something.",
      },
    ],
    example: {
      weak: "This story is about the time I got lost at the fair.",
      strong:
        "One minute my dad's red hat was bobbing ahead of me in the crowd; the next, it was gone.",
      why: "The strong version starts in the middle of the action and makes the reader ask \"What happened next?\"",
    },
    practice: {
      prompt:
        "Write the opening of a true or made-up story (one to two paragraphs). Try a hook that starts with action or dialogue.",
      targetWords: [150, 280],
      brainstorm: [
        "What is the story about?",
        "What is the most exciting or surprising moment?",
        "Could you start right before or during that moment?",
      ],
      outline: [
        "Hook (action, dialogue, question, fact or bold statement)",
        "Who/where/when — woven in, not listed",
        "End with tension that makes the reader want more",
      ],
      checklist: [
        "My first sentence makes the reader curious.",
        "I didn't start with \"This story is about…\"",
        "The reader knows who and where by the end of the opening.",
        "The opening ends with a question or tension.",
      ],
    },
  },
  {
    slug: "claim-evidence-reasoning",
    title: "Claim, Evidence, Reasoning",
    grade: "7-8",
    genre: "persuasive",
    focusTraits: ["ideas", "organization"],
    minutes: 25,
    summary:
      "Build a convincing argument paragraph: make a claim, support it with evidence, and explain why the evidence matters.",
    teach: [
      {
        heading: "Claim",
        body: "A claim is an arguable statement — someone could disagree. \"Phones exist\" is not a claim. \"Schools should allow phones at lunch\" is.",
      },
      {
        heading: "Evidence",
        body: "Evidence is a fact, statistic, example, or expert quote. It proves your claim is grounded in something real, not just your feelings.",
      },
      {
        heading: "Reasoning — the part most writers skip",
        body: "Reasoning explains HOW the evidence supports the claim. Ask yourself: \"So what? Why does this fact prove my point?\"",
      },
      {
        heading: "Address the other side",
        body: "Strong arguments mention a counterclaim (\"Some people argue…\") and answer it. This shows you've thought it through.",
      },
    ],
    example: {
      weak: "Schools should start later. Lots of kids are tired. Starting later would be better.",
      strong:
        "Middle schools should start no earlier than 8:30 a.m. The American Academy of Pediatrics reports that most teens don't get the 8–10 hours of sleep they need. When students are short on sleep, they struggle to focus — so an earlier bell actually makes the first hours of school less productive. Some argue later starts disrupt sports, but practices could simply shift too.",
      why: "The strong version has a specific claim, real evidence, reasoning that connects the two, and a counterclaim with a response.",
    },
    practice: {
      prompt:
        "Should middle schools require students to learn a musical instrument? Write an argument paragraph using claim, evidence, reasoning and a counterclaim.",
      targetWords: [180, 320],
      brainstorm: [
        "What's your claim?",
        "What evidence could support it (facts, examples, experiences)?",
        "What would someone who disagrees say?",
      ],
      outline: [
        "Claim",
        "Evidence",
        "Reasoning: why the evidence proves the claim",
        "Counterclaim + your response",
        "Concluding sentence",
      ],
      checklist: [
        "My claim is specific and arguable.",
        "I included at least one piece of evidence.",
        "I explained HOW the evidence supports my claim.",
        "I addressed a counterclaim.",
      ],
    },
  },
  {
    slug: "sentence-variety",
    title: "Sentence Variety",
    grade: "7-8",
    genre: "paragraph",
    focusTraits: ["sentence_fluency", "voice"],
    minutes: 15,
    summary:
      "Mix short, long and differently-started sentences so your writing flows instead of thudding.",
    teach: [
      {
        heading: "Hear the rhythm",
        body: "Read your writing aloud. If every sentence is the same length and starts the same way (\"I… I… I…\"), it sounds robotic.",
      },
      {
        heading: "Combine and cut",
        body: "Join choppy sentences with words like because, although, when, and which. Then use a short sentence for impact. Like this.",
      },
      {
        heading: "Vary your openers",
        body: "Start some sentences with a time phrase (\"After lunch,\"), a place (\"Under the bridge,\"), or an -ing word (\"Grinning,\").",
      },
    ],
    example: {
      weak: "I went to the beach. I saw a crab. The crab was big. I picked it up. It pinched me.",
      strong:
        "On the last day of vacation, I spotted a crab the size of my hand sidestepping across the wet sand. I scooped it up, proud of my bravery. It pinched me.",
      why: "The strong version combines choppy sentences, varies openers, and ends with a short sentence that lands like a punchline.",
    },
    practice: {
      prompt:
        "Describe a busy place (a cafeteria, a market, a game, a train station) in one paragraph. Use at least one long sentence, one very short sentence, and three different sentence openers.",
      targetWords: [120, 220],
      brainstorm: [
        "Which place will you describe?",
        "What's happening there? List sounds, smells and movements.",
        "What's one surprising detail?",
      ],
      outline: [
        "Opening that sets the scene",
        "Details that build the picture",
        "A short, punchy final sentence",
      ],
      checklist: [
        "I have at least one long, combined sentence.",
        "I have at least one very short sentence for effect.",
        "No two sentences in a row start the same way.",
        "It sounds smooth when I read it aloud.",
      ],
    },
  },
  {
    slug: "compare-and-contrast",
    title: "Compare and Contrast",
    grade: "7-8",
    genre: "informative",
    focusTraits: ["organization", "ideas"],
    minutes: 25,
    summary:
      "Explain how two things are alike and different, organized so the reader can follow every point.",
    teach: [
      {
        heading: "Two ways to organize",
        body: "Block method: everything about A, then everything about B. Point-by-point: one feature at a time, comparing A and B together. Point-by-point is usually clearer.",
      },
      {
        heading: "Compare/contrast signal words",
        body: "Similarly, both, likewise (alike). However, whereas, on the other hand, unlike (different).",
      },
      {
        heading: "Have a point",
        body: "Don't just list differences. Your thesis should say what the comparison shows: \"Although both are pets, cats suit small apartments better than dogs.\"",
      },
    ],
    example: {
      weak: "Books and movies are different. Books have words. Movies have pictures. They are both stories.",
      strong:
        "Both books and movies tell stories, but they ask different things of their audience. A book lets readers imagine the characters' faces and voices, whereas a movie decides those details for them. On the other hand, a movie can show a huge battle in seconds that might take a book ten pages to describe.",
      why: "The strong version has a thesis, uses point-by-point comparison, and uses signal words to guide the reader.",
    },
    practice: {
      prompt:
        "Compare and contrast two things you know well (two sports, two games, two seasons, city vs. countryside). Write two paragraphs with a clear thesis.",
      targetWords: [200, 350],
      brainstorm: [
        "Which two things will you compare?",
        "List 3 similarities and 3 differences.",
        "What's the big takeaway from comparing them?",
      ],
      outline: [
        "Thesis: what the comparison shows",
        "Point 1: A vs. B",
        "Point 2: A vs. B",
        "Conclusion",
      ],
      checklist: [
        "My thesis says what the comparison shows.",
        "I discussed both similarities and differences.",
        "I used signal words (both, whereas, however).",
        "My organization is easy to follow.",
      ],
    },
  },
];

export function getLesson(slug: string): Lesson | undefined {
  return LESSONS.find((l) => l.slug === slug);
}

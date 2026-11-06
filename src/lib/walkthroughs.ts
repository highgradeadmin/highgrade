import type { Genre } from "./lessons";

/**
 * Worked "from plan to draft" examples shown in the Draft step.
 * Each one uses a DIFFERENT topic from the student's task, so it models the
 * method without giving them something to copy.
 */
export interface Walkthrough {
  topic: string;
  brainstorm: string[];
  /** Brainstorm ideas that were deliberately not used — choosing is part of the skill. */
  leftOut: string[];
  outline: { label: string; text: string }[];
  draft: string;
  /** What changed between the plan and the draft. */
  changes: string[];
}

export const LESSON_WALKTHROUGHS: Record<string, Walkthrough> = {
  "topic-sentences": {
    topic: "The treehouse in my backyard",
    brainstorm: ["treehouse", "rope ladder", "creaky boards", "secret club", "comic books", "built with dad", "mosquitoes", "view of the street"],
    leftOut: ["mosquitoes", "view of the street"],
    outline: [
      { label: "Topic sentence", text: "treehouse = my thinking place" },
      { label: "Detail 1", text: "built it with dad" },
      { label: "Detail 2", text: "rope ladder, creaky boards" },
      { label: "Detail 3", text: "read comics, secret club" },
      { label: "Closing", text: "where I go to feel like me" },
    ],
    draft:
      "The treehouse in my backyard is the one place where I can really think. My dad and I built it together the summer I turned nine, and I still remember hammering the very first board. To get inside, you climb a wobbly rope ladder, and the floorboards creak with every step like they're telling you a secret. Up there, my friends and I hold meetings of our secret club, or I just lie on my back reading comic books for hours. Whenever I need to feel like myself again, I climb up to my treehouse.",
    changes: [
      "The topic sentence names the place AND why it matters (\"where I can really think\").",
      "Each outline line grew into a full sentence with an extra detail (\"built it\" → \"the summer I turned nine… the very first board\").",
      "\"mosquitoes\" and \"view of the street\" were left out because they didn't support the main idea.",
      "The closing sentence echoes the topic sentence.",
    ],
  },
  "show-dont-tell": {
    topic: "The first time I rode a roller coaster (feeling: scared)",
    brainstorm: ["tall coaster", "sweaty hands", "clicking chain", "cousin laughing", "stomach drop", "wanted to get off", "cotton candy", "screamed"],
    leftOut: ["cotton candy"],
    outline: [
      { label: "Opening", text: "line for the coaster, cousin laughing" },
      { label: "Key moment", text: "chain clicking up, sweaty hands, the drop" },
      { label: "Ending", text: "legs shaking after" },
    ],
    draft:
      "My cousin Leo bounced on his toes in line, laughing at the screams coming from the tracks above us. I laughed too, but my laugh came out thin and squeaky. When the safety bar clicked down across my lap, I wiped my palms on my shorts — twice. Click. Click. Click. The car crawled up the hill so slowly that I could count every rusty bolt. At the top, I squeezed my eyes shut and gripped the bar so hard my knuckles turned white. Then the world fell away. When the ride finally hissed to a stop, my legs wobbled like spaghetti as I climbed out.",
    changes: [
      "The word \"scared\" never appears — the squeaky laugh, sweaty palms and white knuckles show it.",
      "The key moment is slowed down (\"Click. Click. Click.\") because it's the most important part.",
      "Small things are told quickly (\"in line\") so the story gets to the good part.",
      "Brainstorm words became actions: \"sweaty hands\" → \"I wiped my palms on my shorts — twice.\"",
    ],
  },
  "opinion-with-reasons": {
    topic: "Should students get a longer lunch break?",
    brainstorm: ["yes, longer lunch", "rush to eat", "time to talk with friends", "clubs at lunch", "better focus after", "cafeteria line too long", "less food wasted"],
    leftOut: ["clubs at lunch", "less food wasted"],
    outline: [
      { label: "Opinion", text: "lunch should be 40 min, not 25" },
      { label: "Reason 1 + example", text: "long line → only 10 min to eat" },
      { label: "Reason 2 + example", text: "rested brain focuses better after" },
      { label: "Closing", text: "restate: longer lunch helps everyone" },
    ],
    draft:
      "Our school should make lunch 40 minutes long instead of 25. First, students don't have enough time to eat. The cafeteria line often takes fifteen minutes, which leaves only ten minutes to finish a whole meal, so many kids throw half their food away. Second, a real break helps us learn. After talking with friends and relaxing, students come back to class calmer and ready to focus, instead of rushing in still hungry. A longer lunch would make the whole afternoon better for students and teachers.",
    changes: [
      "The opinion became specific (\"40 minutes instead of 25\").",
      "Each reason got an example or fact that proves it.",
      "Transition words (First, Second) guide the reader.",
      "Two weaker ideas were left out so the two strongest reasons have room.",
    ],
  },
  "explain-a-process": {
    topic: "How to plant a seed in a cup",
    brainstorm: ["plastic cup", "soil", "bean seed", "poke a hole", "water", "sunny window", "wait a week", "label your name"],
    leftOut: ["label your name"],
    outline: [
      { label: "Intro", text: "growing a bean = easy science" },
      { label: "Steps in order", text: "cup + hole, soil, seed 2 cm deep, water, window" },
      { label: "Closing tip", text: "don't overwater; sprout in ~7 days" },
    ],
    draft:
      "Growing a bean plant is an easy way to watch science happen right on your windowsill. First, poke a small hole in the bottom of a plastic cup so extra water can drain out. Next, fill the cup about three-quarters full with potting soil. Then, push one bean seed into the soil about two centimeters deep and cover it up. After that, pour in just enough water to make the soil damp, like a squeezed-out sponge. Finally, set the cup on a sunny windowsill. Be patient and don't overwater — in about a week, a tiny green sprout should poke through.",
    changes: [
      "One short outline line became five steps, each with order words (First, Next, Then, After that, Finally).",
      "Vague words became precise ones: \"soil\" → \"three-quarters full\", \"seed\" → \"two centimeters deep\".",
      "A comparison helps the beginner (\"damp, like a squeezed-out sponge\").",
      "The closing gives a useful tip and tells the reader what to expect.",
    ],
  },
  "hooks-that-grab": {
    topic: "The day our dog ran away",
    brainstorm: ["dog Biscuit", "gate left open", "rainy evening", "neighborhood search", "flashlights", "found at the bakery", "felt guilty"],
    leftOut: ["found at the bakery"],
    outline: [
      { label: "Hook", text: "start with the open gate" },
      { label: "Who/where/when", text: "Biscuit, rainy evening, my fault" },
      { label: "Tension", text: "dark, still not found" },
    ],
    draft:
      "The gate was swinging in the wind, and Biscuit's leash was lying in the mud. I had been the last one in the backyard. Rain drummed on my hood as Mom and I ran down Maple Street, sweeping our flashlights under parked cars and calling his name until my throat burned. Every shadow looked like a small brown dog for half a second — and then it didn't. By the time the streetlights flickered on, we had searched every block twice, and Biscuit was still out there somewhere in the dark.",
    changes: [
      "The story starts in the middle of the action (the open gate), not with \"This story is about…\"",
      "Who, where and when are woven into the action instead of listed.",
      "\"Felt guilty\" became one quiet sentence: \"I had been the last one in the backyard.\"",
      "The ending of the opening leaves the reader wanting more — so the ending (the bakery) was saved for later.",
    ],
  },
  "claim-evidence-reasoning": {
    topic: "Should schools have a four-day week?",
    brainstorm: ["no to 4-day week", "longer school days", "younger kids tired", "childcare problem for parents", "some districts tried it", "test scores", "more sleep on Fridays"],
    leftOut: ["test scores"],
    outline: [
      { label: "Claim", text: "schools should keep a 5-day week" },
      { label: "Evidence", text: "4-day districts add ~1 hr per day" },
      { label: "Reasoning", text: "long days = tired students learn less" },
      { label: "Counterclaim + response", text: "\"more rest\" — but childcare problems" },
      { label: "Conclusion", text: "5 shorter days are better" },
    ],
    draft:
      "Middle schools should keep a five-day week instead of switching to four days. In districts that have tried a four-day schedule, school days often grow by about an hour to make up the lost time. That matters because attention drops when students are already tired, so an extra hour at the end of a long day adds time without adding much learning. Some people argue that a free Friday gives students more rest. However, many families would then need to find childcare for that day, which is expensive and stressful for working parents. Five shorter, focused days are better for both students and families.",
    changes: [
      "The claim is specific and arguable.",
      "The evidence is a fact, not a feeling (\"school days often grow by about an hour\").",
      "Reasoning explains WHY the evidence matters (\"attention drops when students are already tired\").",
      "The counterclaim is named fairly, then answered with \"However…\"",
    ],
  },
  "sentence-variety": {
    topic: "A soccer game in the rain",
    brainstorm: ["muddy field", "rain sideways", "coach yelling", "slipped", "ball heavy", "parents with umbrellas", "last-minute goal"],
    leftOut: ["coach yelling"],
    outline: [
      { label: "Opening", text: "rain, muddy field, parents' umbrellas" },
      { label: "Details", text: "heavy ball, players slipping" },
      { label: "Short final sentence", text: "the goal" },
    ],
    draft:
      "By the second half, the rain was blowing sideways across the field, and the parents on the sideline had disappeared under a wall of umbrellas. Every kick sent up a spray of mud. Sliding for a loose ball, our goalie skidded three feet past it and came up laughing, brown from head to toe. The ball itself felt like a soaked loaf of bread, heavy and slow, refusing to roll where anyone wanted. With one minute left, Maya swung her leg as hard as she could. Goal.",
    changes: [
      "Long sentences combine ideas; very short ones land like a punch (\"Goal.\").",
      "Sentences start in different ways: \"By the second half,\" \"Every kick,\" \"Sliding for…\", \"With one minute left,\".",
      "No two sentences in a row begin the same way.",
      "The details from the plan were stretched with comparisons (\"like a soaked loaf of bread\").",
    ],
  },
  "compare-and-contrast": {
    topic: "Reading on paper vs. reading on a tablet",
    brainstorm: ["paper books", "tablet", "both tell the story", "battery", "page turning", "screen glare", "can carry 100 books", "smell of paper", "eyes get tired"],
    leftOut: ["smell of paper"],
    outline: [
      { label: "Thesis", text: "both work, paper better for long reading" },
      { label: "Point 1: A vs. B", text: "carrying — tablet holds 100 books / paper one at a time" },
      { label: "Point 2: A vs. B", text: "eyes — screen glare & tired eyes / paper easier" },
      { label: "Conclusion", text: "tablet for travel, paper for long reading" },
    ],
    draft:
      "Both paper books and tablets let readers get lost in a good story, but paper is the better choice for long reading. A tablet can hold a hundred books in something thinner than a notebook, whereas a paper book has to be carried one at a time — a clear win for the tablet on a long trip. On the other hand, screens can cause glare and make eyes tired after an hour or two, while a paper page is easy to read in almost any light.\n\nSimilarly, both formats let readers mark favorite parts, but the experience differs. Readers of paper books can see exactly how far they've come by the thickness of the pages, while tablet readers rely on a percentage at the bottom of the screen. In the end, a tablet is perfect for travel, but for a long afternoon with a novel, paper is hard to beat.",
    changes: [
      "The thesis says what the comparison shows, not just \"they're different\".",
      "Point-by-point: each point compares A and B together.",
      "Signal words (both, whereas, on the other hand, similarly, while) guide the reader.",
      "A brainstorm idea that wasn't strong enough to support the thesis was left out.",
    ],
  },
};

/** Generic examples for Daily Write prompts, by genre. */
export const GENRE_WALKTHROUGHS: Record<Genre, Walkthrough> = {
  narrative: LESSON_WALKTHROUGHS["show-dont-tell"],
  persuasive: LESSON_WALKTHROUGHS["opinion-with-reasons"],
  informative: LESSON_WALKTHROUGHS["explain-a-process"],
  paragraph: LESSON_WALKTHROUGHS["topic-sentences"],
};

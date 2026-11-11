import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { FEEDBACK_MODEL, PROOFREAD_PROMPT, SYSTEM_PROMPT } from "@/lib/coach";
import { billingEnabled, freeTries, planStatus } from "@/lib/billing";
import { CoachOutputSchema, FeedbackRequestSchema, MAX_TRIES, ProofreadSchema, type Feedback } from "@/lib/feedback";
import { FREE_BETA } from "@/lib/plans";
import { findWord } from "@/lib/practice";
import { estimateCost, type ModelUsage } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { familyUsage, limitMessage } from "@/lib/usage";
import { TRAITS } from "@/lib/traits";

const client = new Anthropic();

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Feedback is not configured yet. Add ANTHROPIC_API_KEY to .env.local." },
      { status: 503 },
    );
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return Response.json({ error: "Accounts are not configured yet. See README." }, { status: 503 });
  }

  // ── Who is asking? ──
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) {
    return Response.json({ error: "Please log in to get feedback." }, { status: 401 });
  }

  const parsed = FeedbackRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const req = parsed.data;

  // ── Which child is writing? (RLS only returns this parent's children) ──
  const { data: child, error: childError } = await supabase
    .from("children")
    .select("id, grade")
    .eq("id", req.childId)
    .maybeSingle();
  if (childError) return dbError(childError);
  if (!child) {
    return Response.json({ error: "Choose who's writing first." }, { status: 403 });
  }

  // ── Family plan (Stripe), or one of the family's free tries. Admins are exempt. ──
  // During the free beta, tries are counted even without Stripe, and running out shows a thank-you.
  let freeLeft: number | null = null; // set when this request uses a free try
  const { data: isAdminData } = await supabase.rpc("is_admin");
  const isAdmin = isAdminData === true;
  if ((billingEnabled() || FREE_BETA) && !isAdmin) {
    let active = false;
    let freeLimit = 0;
    try {
      if (billingEnabled()) active = (await planStatus(supabase, userId)).active;
      if (!active) ({ left: freeLeft, limit: freeLimit } = await freeTries(supabase));
    } catch (err) {
      console.error("Plan check failed", err instanceof Error ? err.message : err);
      return Response.json({ error: "Couldn't check your family's tries. Please try again in a minute." }, { status: 502 });
    }
    if (!active && (freeLeft ?? 0) <= 0) {
      return Response.json(
        {
          error: FREE_BETA
            ? `Your family has used all ${freeLimit} free beta tries. Thank you for testing HighGrade!`
            : "You've used all your free tries. Ask a parent to start the family plan in the parent area.",
          code: "no_plan",
        },
        { status: 402 },
      );
    }
  }

  // ── Fair use per family: requests today and tokens this month (admins exempt) ──
  if (!isAdmin) {
    try {
      const message = limitMessage(await familyUsage(supabase, userId));
      if (message) return Response.json({ error: message, code: "family_limit" }, { status: 429 });
    } catch (err) {
      // Never block children because of our own logging problem.
      console.error("Family limit check failed", err instanceof Error ? err.message : err);
    }
  }

  // ── Save the current text and find the previous draft ──
  const { data: work, error: workError } = await supabase
    .from("works")
    .upsert(
      {
        child_id: child.id,
        task_key: req.taskKey,
        lesson_slug: req.lessonSlug,
        title: req.title,
        prompt: req.prompt,
        genre: req.genre,
        text: req.text,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "child_id,task_key" },
    )
    .select("id")
    .single();
  if (workError) return dbError(workError);

  // ── Tries on this piece (MAX_TRIES rounds of feedback per piece) ──
  const { data: previous, count: triesUsed, error: triesError } = await supabase
    .from("drafts")
    .select("text, feedback", { count: "exact" })
    .eq("work_id", work.id)
    .order("created_at", { ascending: false })
    .limit(1);
  if (triesError) return dbError(triesError);
  if ((triesUsed ?? 0) >= MAX_TRIES) {
    return Response.json(
      { error: `You've used all ${MAX_TRIES} tries on this piece. Look back at how your scores changed, then try a new lesson or today's prompt!` },
      { status: 409 },
    );
  }
  const tryNumber = (triesUsed ?? 0) + 1;
  const previousText: string | undefined = previous?.[0]?.text;
  const previousImproved = (previous?.[0]?.feedback as Partial<Feedback> | null)?.improved_version;
  const copiedCoach = previousImproved ? overlap(req.text, previousImproved) > 0.6 : false;

  const userMessage = [
    `Grade: ${child.grade}`,
    `Type of writing: ${req.genre}`,
    `Assignment: ${req.prompt}`,
    `This is try ${tryNumber} of ${MAX_TRIES} on this piece.${tryNumber === MAX_TRIES ? " It is the final try: celebrate what improved across the tries and give one takeaway to carry into the next piece of writing." : ""}`,
    req.focus.length ? `Lesson focus traits: ${req.focus.join(", ")}` : null,
    req.checklist.length
      ? `The student was given this revision checklist:\n${req.checklist.map((c) => `- ${c}`).join("\n")}`
      : null,
    previousText
      ? `This is a revision. Their previous draft was:\n<previous_draft>\n${previousText}\n</previous_draft>\nNotice and praise specific improvements before suggesting more.`
      : null,
    req.dictated
      ? "The student spoke some of this draft using speech-to-text, so the computer did the spelling. Don't praise or score spelling. For conventions, focus on what the student controls: full stops, capital letters at sentence starts and where sentences begin and end. Ignore odd words that look like speech-recognition mistakes."
      : null,
    copiedCoach
      ? "Most of this draft is copied from the improved version you showed last time. Gently remind the student that copying won't help them learn, and ask them to make the changes in their own words. Score it honestly."
      : null,
    `<student_writing>\n${req.text}\n</student_writing>`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    // The coach and the proofreader run at the same time, so proofreading adds no waiting.
    const proofreadMessage = [
      `Grade: ${child.grade}`,
      req.dictated
        ? "The student spoke some of this using speech-to-text, so the computer did the spelling. Don't report spelling or sound-alike words; only full stops, capital letters, verb tense and sentences run together."
        : null,
      `<student_writing>\n${req.text}\n</student_writing>`,
    ]
      .filter(Boolean)
      .join("\n\n");
    const [response, proofread] = await Promise.all([
      client.beta.messages.parse({
        model: FEEDBACK_MODEL,
        max_tokens: 16000,
        output_config: {
          effort: "medium",
          format: betaZodOutputFormat(CoachOutputSchema),
        },
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
      client.beta.messages
        .parse({
          model: FEEDBACK_MODEL,
          max_tokens: 4000,
          output_config: { effort: "low", format: betaZodOutputFormat(ProofreadSchema) },
          system: PROOFREAD_PROMPT,
          messages: [{ role: "user", content: proofreadMessage }],
        })
        // Feedback still works without grammar practice.
        .catch((err) => {
          console.error("Proofread failed", err instanceof Error ? err.message : err);
          return null;
        }),
    ]);

    // Record token usage for the admin dashboard (never blocks the student's feedback).
    // One insert for both calls, so they share a timestamp and count as one request toward the family limit.
    const usageRows = await logUsage(supabase, userId, child.id, work.id, [response, ...(proofread ? [proofread] : [])]);

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return Response.json(
        { error: "We couldn't generate feedback for this piece. Try revising it and submitting again." },
        { status: 422 },
      );
    }

    const feedback = normalize(
      { ...response.parsed_output, grammar_fixes: proofread?.parsed_output?.grammar_fixes ?? [] },
      req.text,
    );
    const { data: draft, error: draftError } = await supabase
      .from("drafts")
      .insert({ work_id: work.id, child_id: child.id, parent_id: userId, text: req.text, feedback })
      .select("created_at")
      .single();
    if (draftError) return dbError(draftError);

    // Count the free try only once the child actually got feedback.
    if (freeLeft !== null) {
      const byModel: Record<string, ModelUsage> = {};
      for (const r of usageRows) {
        const u = (byModel[r.model] ??= { input: 0, output: 0, cache_read: 0, cache_write: 0 });
        u.input += r.input_tokens;
        u.output += r.output_tokens;
        u.cache_read += r.cache_read_tokens;
        u.cache_write += r.cache_write_tokens;
      }
      const { error: freeError } = await supabase.rpc("record_free_try", { p_cost: estimateCost(byModel) });
      if (freeError) console.error("Free try not recorded", freeError.message);
      freeLeft = Math.max(0, freeLeft - 1);
    }

    return Response.json({ feedback, at: draft.created_at, freeTriesLeft: freeLeft });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json(
        { error: "Lots of writers right now! Please try again in a minute." },
        { status: 429 },
      );
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Claude API error", err.status, err.message);
      // Out of Claude API credit (prepaid balance with auto-reload off): a calm message, not an error.
      if (/credit balance/i.test(err.message)) {
        return Response.json(
          { error: "The writing coach is taking a short break. Keep writing, and please try again later!" },
          { status: 503 },
        );
      }
      return Response.json({ error: "Feedback service error. Please try again." }, { status: 502 });
    }
    throw err;
  }
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;
type Usage = Anthropic.Beta.Messages.BetaUsage;

/** One row per model that ran (a fallback model can serve part of a request), for every call in this request. */
async function logUsage(
  supabase: ServerClient,
  parentId: string,
  childId: string,
  workId: string,
  calls: { model: string; usage: Usage }[],
) {
  const rows = calls.flatMap(({ model, usage }) => {
    const perModel = (usage.iterations ?? []).flatMap((it) =>
      it.type === "message" || it.type === "fallback_message"
        ? [
            {
              model: it.model ?? model,
              input_tokens: it.input_tokens,
              output_tokens: it.output_tokens,
              cache_read_tokens: it.cache_read_input_tokens ?? 0,
              cache_write_tokens: it.cache_creation_input_tokens ?? 0,
            },
          ]
        : [],
    );
    return perModel.length
      ? perModel
      : [
          {
            model,
            input_tokens: usage.input_tokens,
            output_tokens: usage.output_tokens,
            cache_read_tokens: usage.cache_read_input_tokens ?? 0,
            cache_write_tokens: usage.cache_creation_input_tokens ?? 0,
          },
        ];
  });
  const { error } = await supabase
    .from("ai_usage")
    .insert(rows.map((r) => ({ ...r, parent_id: parentId, child_id: childId, work_id: workId })));
  if (error) console.error("Usage logging failed", error.message);
  return rows;
}

function dbError(error: { message: string }) {
  console.error("Database error", error.message);
  return Response.json({ error: "Couldn't save your work. Please try again." }, { status: 500 });
}

/** Clamp scores and guarantee one entry per trait in a stable order. */
function normalize(fb: Feedback, text: string): Feedback {
  const traits = TRAITS.map((t) => {
    const found = fb.traits.find((x) => x.trait === t.id);
    return {
      trait: t.id,
      score: Math.min(5, Math.max(1, Math.round(found?.score ?? 3))),
      comment: found?.comment ?? "",
    };
  });
  // Only fixes that can really be made: the mistake appears once in a sentence that's in the text.
  let grammar_fixes = (fb.grammar_fixes ?? [])
    .filter(
      (g) =>
        g.sentence &&
        g.mistake &&
        g.fix.trim() &&
        g.mistake.trim() !== g.fix.trim() &&
        text.includes(g.sentence) &&
        g.sentence.indexOf(g.mistake) !== -1 &&
        g.sentence.indexOf(g.mistake) === g.sentence.lastIndexOf(g.mistake),
    )
    .filter((g, i, all) => all.findIndex((x) => x.sentence === g.sentence) === i)
    .slice(0, 3);
  let fixedSentences = new Set(grammar_fixes.map((g) => g.sentence));
  // The student rewrites the first makeover's sentence, so it can't also be a grammar fix.
  // Put a different makeover first if there is one; otherwise drop that grammar fix.
  let makeovers = fb.sentence_makeovers.slice(0, 3);
  if (makeovers[0] && fixedSentences.has(makeovers[0].before)) {
    const other = makeovers.findIndex((m) => !fixedSentences.has(m.before));
    if (other > 0) makeovers = [makeovers[other], ...makeovers.filter((_, i) => i !== other)];
    else {
      grammar_fixes = grammar_fixes.filter((g) => g.sentence !== makeovers[0].before);
      fixedSentences = new Set(grammar_fixes.map((g) => g.sentence));
    }
  }
  return {
    ...fb,
    traits,
    grammar_fixes,
    next_steps: fb.next_steps.slice(0, 2),
    strengths: fb.strengths.slice(0, 2),
    sentence_makeovers: makeovers,
    // Only swaps that can really be made in the student's text, with distinct new words.
    word_swaps: (fb.word_swaps ?? [])
      .filter(
        (w) =>
          w.sentence && !fixedSentences.has(w.sentence) && text.includes(w.sentence) && findWord(w.sentence, w.word),
      )
      .map((w) => ({
        ...w,
        options: [...new Set(w.options.map((o) => o.trim()))]
          .filter((o) => o && o.toLowerCase() !== w.word.trim().toLowerCase())
          .slice(0, 3),
      }))
      .filter((w) => w.options.length >= 2)
      .slice(0, 2),
  };
}

/** Share of the student's 3-word sequences that also appear in `source` (0-1). */
function overlap(text: string, source: string) {
  const grams = (t: string) => {
    const w = t.toLowerCase().match(/[a-z0-9']+/g) ?? [];
    return w.slice(2).map((_, i) => `${w[i]} ${w[i + 1]} ${w[i + 2]}`);
  };
  const mine = grams(text);
  if (mine.length < 10) return 0;
  const theirs = new Set(grams(source));
  return mine.filter((g) => theirs.has(g)).length / mine.length;
}

# HighGrade Writing

A writing-practice site for students in grade 5 and up: short lessons, guided
Brainstorm → Outline → Draft → Revise practice, and an AI writing coach (Claude)
that gives rubric-based feedback without writing for the student.

## Setup

1. **Claude API key** — create one at https://console.anthropic.com.
2. **Supabase project** — create a free project at https://supabase.com/dashboard, then:
   - **SQL Editor → New query**: paste `supabase/migrations/0001_init.sql` and click **Run**.
   - **Authentication → URL Configuration**: set *Site URL* to `http://localhost:3000`
     (add your production URL later) and add `http://localhost:3000/auth/confirm` to *Redirect URLs*.
   - **Project Settings → API Keys**: copy the project URL and the **publishable** key.
     Never put the secret / service-role key in this app.
3. **Env file**:
   ```bash
   cp .env.example .env.local   # fill in all values
   npm install
   npm run dev                  # http://localhost:3000
   ```
   `NEXT_PUBLIC_*` values are baked in at build time — restart `npm run dev` after changing them.

## Data & privacy

- Tables: `profiles`, `works` (one per lesson/daily prompt), `drafts` (each feedback round).
- Row Level Security: students can only read/write their own rows; they can't edit consent
  fields or delete drafts (which keeps the daily feedback limit honest).
- Under-13 sign-ups store a parent email with `parental_consent = 'pending'`. **Before launching
  to the public, add a verified parental-consent step** (e.g. email the parent a consent link) to
  meet COPPA.

## How it's organized

| Path | What it is |
|---|---|
| `src/lib/lessons.ts` | Lesson content (teaching points, examples, practice tasks). Add lessons here. |
| `src/lib/daily-prompts.ts` | Rotating daily writing prompts. |
| `src/lib/traits.ts` | The 6 Traits rubric used everywhere. |
| `src/app/api/feedback/route.ts` | Server route that calls Claude for feedback (coach prompt lives here). |
| `src/lib/feedback.ts` | Feedback schema shared by the API and UI. |
| `src/components/WritingStudio.tsx` | The 4-step writing workspace. |
| `src/lib/storage.ts` | Client store: loads the student's work from Supabase, autosaves edits. |
| `src/lib/supabase/` | Browser and server Supabase clients. `src/proxy.ts` refreshes sessions. |
| `supabase/migrations/` | Database schema + security policies. |

## Roadmap

- Verified parental consent email for under-13s (COPPA)
- Teacher/parent dashboard and assignments
- More lessons for grades 9–12

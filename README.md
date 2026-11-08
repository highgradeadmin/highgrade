# HighGrade Writing

A writing-practice site for students in grade 5 and up: short lessons, guided
Brainstorm → Outline → Draft → Improve practice, and an AI writing coach (Claude)
that gives rubric-based feedback and shows the student their own sentences made stronger.

## Setup

1. **Claude API key** — create one at https://console.anthropic.com.
2. **Supabase project** — create a free project at https://supabase.com/dashboard, then:
   - **SQL Editor → New query**: run each file in `supabase/migrations/` in order (0001 → 0008).
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

4. **Make an admin**: sign up with the admin email, confirm it, then in the SQL Editor:
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'admin@example.com';
   ```

## Accounts: parents and children

- Only adults (18+) can sign up — enforced in the database, not just the form. Sign-up records
  the parent's consent.
- Parents add **child profiles** (first name, grade, optional birth year). Children have no email
  or password: on the family device they pick their profile on **Who's writing today?**
- The **parent area** (`/parent`) is protected by a 4–6 digit PIN, checked on the server for
  every parent-only action (add / edit / remove a child). 5 wrong PINs lock it for 15 minutes.
  Forgot the PIN? Log out, log back in with the password, and reset it within 10 minutes.

## Data & privacy

- Tables: `parents`, `children`, `works` (one per lesson piece / daily prompt), `drafts` (each
  feedback round, last 100 per child), `ai_usage` (tokens per Claude call), `admins`.
- Row Level Security: a family can only see its own children and writing. The PIN hash is never
  readable through the API. Drafts can't be deleted by users (keeps limits honest).
- Removing a child deletes their profile, writing and scores.
- Children's writing is sent to Anthropic to generate feedback. **Have your privacy policy and
  consent wording reviewed by a lawyer before launch** (COPPA / GDPR-K / local law).
- `supabase/scripts/reset_test_accounts.sql` deletes ALL accounts — test projects only.

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

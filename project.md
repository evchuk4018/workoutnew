# MacroWeb — Project Overview (v2.0)

A compact reference describing how MacroWeb should work, how it's organized, and how to develop and test features.

---

## ⚡ One-line summary
**MacroWeb** is a nutrition tracker that computes personalized calorie & macro targets (TDEE/BMR), lets users log foods (global "Wikipedia" foods table), and uses AI to generate missing food items and parse SMS logs. Weekly check-ins adjust targets based on real-world progress.

---

## 📁 Project structure (feature-first)
- `src/app/` — Next.js app routes (pages + APIs)
- `src/features/` — Feature modules (auth, onboarding, dashboard, food-search, check-in, logging)
- `src/lib/algorithm` — All math: BMR, TDEE, weekly-check logic
- `src/lib/gemini` — Google Gemini (AI) wrapper
- `src/lib/supabase` — Supabase clients + types
- `supabase/schema.sql` — Full DB schema + RLS policies

---

## 🧾 DB Philosophy — "Wikipedia" model (core rule)
- A single global `foods` table shared across *all* users.
- If any user (or AI) creates an entry it becomes immediately searchable for everyone.
- Personal data (goals, logs, weights, check-ins) are per-user but reference global food `id`s.

---

## 🔁 Core user flows (brief)
- Flow A — **Auth & routing**: Google OAuth via Supabase. After login, check `goals.onboarding_completed` and redirect to `/onboarding` or `/dashboard`.

- Flow B — **Onboarding wizard**: 5 steps: baseline → goal → timeline → macro preference → summary. Calculates BMR (Mifflin‑St Jeor) → TDEE → daily calories → macros. Save to `goals` and initial `weight_history` entry.

- Flow C — **Weekly Check-In**: Available every 7 days. User confirms weight; system computes true TDEE from intake & weight change and adjusts calories by ±100 (or ±50 for maintenance) and rebalances macros with stored ratios. Stores `check_ins` and updates `goals` and `weight_history`.

- Flow D — **Search with AI**: If a search returns zero results, UI can call `/api/generate-food` which asks Gemini to return a JSON object (name, serving, kcal, P/C/F). Insert into `foods` with `source='ai'` and log immediately for the user.

- Flow E — **SMS logging**: SMS webhook POSTs to `/api/sms-log`. The webhook looks up sender phone → user, asks Gemini to parse items and estimated macros, creates missing foods via AI, and inserts entries into `logs`.

---

## 🧮 Algorithms & key choices
- **BMR**: Mifflin‑St Jeor
  - male: (10 × kg) + (6.25 × cm) − (5 × age) + 5
  - female: (10 × kg) + (6.25 × cm) − (5 × age) − 161
- **TDEE**: BMR × activity multiplier (sedentary→very_active)
- **Weekly change → daily calorie adjustment**: weekly_lbs × 3500 / 7
- **Check-in adjustments**: if behind target → daily -100 kcal; if ahead → daily +100 kcal; small changes for maintenance
- **Macro conversions**: protein/carbs = 4 kcal/g, fat = 9 kcal/g

---

## 🔐 Security & data handling
- **DO NOT** commit secrets. Use `.env.local` for local dev (already in `.gitignore`).
- **Supabase RLS** is enforced in `supabase/schema.sql` — users can only read/modify their own `goals`, `logs`, `check_ins`, etc.
- SMS webhook should use a Supabase *service-role* key (or server-side verify signatures) and never run client-side.

---

## 🧪 Tests & quality gates
Mandatory tests (examples included in the repo):
- **Check-In Algorithm Test**: user needs 1 lb/week, lost 0 → recommend lowering calories.
- **Macro Split Test**: high-protein 40% and 2000 kcal → protein target is 200 g.
- **AI Parser Test**: text `"3 eggs"` → ~210 kcal, ~18 g protein.
- **Auth Guard Test**: `/check-in` blocked if last check-in < 7 days.

Commands:
- Run tests in watch mode: `npm test`
- CI / run once: `npm run test:run`
- Coverage: `npm run test:coverage`

---

## 🧭 Dev setup (quick)
1. Copy secrets into `.env.local` (local-only):

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... # for server webhooks only
GOOGLE_AI_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

2. Install deps: `npm install` (+ optional packages: `@supabase/ssr`, `vitest`, testing libs)
3. Run DB schema in Supabase SQL Editor with `supabase/schema.sql`.
4. Configure Google OAuth provider in Supabase dashboard.
5. Start dev: `npm run dev`

---

## 📡 API endpoints (important)
- `POST /api/generate-food` — Generate nutrition via Gemini and insert into `foods` (authenticated). Returns the inserted/duplicate `food` row.
- `POST /api/sms-log` — SMS webhook (service-role auth): parse message, create missing foods with AI, insert `logs` for user.
- `GET /auth/callback` — OAuth code exchange and session cookie set.

---

## ✅ PR checklist for new features
- Add/extend unit tests for algorithm behavior
- Add integration tests for new API routes
- Update `supabase/schema.sql` only via an explicit migration PR and ensure RLS policies cover new access patterns
- Manual QA of AI prompts and JSON parsing (watch for malformed AI responses)

---

## 🧩 Extensibility notes
- To add a new macro preset, update `src/lib/algorithm/MACRO_PRESETS` and the onboarding UI choices.
- To support another AI provider, add a new adapter under `src/lib/gemini/` and swap usage in API routes.

---

If you want, I can also:
- add a short `CONTRIBUTING.md` with the PR checklist and commit hooks ✅
- create a Postman or curl examples file for the APIs ✅

---

_Last updated: 2026-02-04_

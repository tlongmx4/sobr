# sobrandsteady

An AI companion app for people navigating sobriety. Not a therapist, not a chatbot — a grounded friend that actually gets it. The AI companion's name is **sobr**.

Built with Next.js, Prisma, and Claude.

> 🚧 **Status:** in active development. Pre-launch hardening is ongoing; not yet for public use. See [TODO.md](./TODO.md) locally for the launch checklist.

## Why

Most mental health and recovery apps default to clinical tone, gamification, or daily affirmations that get stale fast. sobrandsteady is designed differently: a casual, warm, direct conversational presence that matches the user's emotional register without spiraling with them. It only brings up recovery when the user does — except in crisis moments, where it shifts immediately and clearly.

## Features

- **Guided onboarding** — A first-run, blocking flow over the dashboard collects preferred name, hobbies, framework preference, and sobriety context, so sobr is personalized from the first message instead of starting on defaults. It opens with required safety disclaimers (companion not clinical, crisis resources, AI limitations and data retention) that the user acknowledges before continuing. Acceptance is recorded as metadata only and is versioned, so revised disclaimers can re-prompt.
- **Streaming chat** — Conversations powered by Claude via the Vercel AI SDK. Personalized with the user's profile, framework preference, and recent check-ins.
- **Daily check-ins** — Quick emoji-scale capture of mood, energy, and cravings, plus an optional journal entry. Today's check-in is surfaced on the dashboard.
- **Framework support** — Biblical, 12-step, both, or secular. The system prompt adapts to the user's preference.
- **Calibrated crisis handling** — The system prompt distinguishes real crisis signals (specificity, escalation, withdrawal markers, overdose risk) from hyperbolic venting and dark humor. When unambiguous, it surfaces 988, Crisis Text Line, SAMHSA, and 911 with clear, direct language; when ambiguous, it asks one direct check-in question instead of escalating.
- **Email verification + password reset** — Standard flows backed by Resend.
- **Login rate limiting** — 5 failed attempts → 15-minute account lock.
- **Account deletion** — Self-service from `/settings`. Cascades to chat history, check-ins, and tokens.
- **Privacy page** — Plain-English disclosure at `/privacy` covering what's stored, what goes to Anthropic, and crisis-disclosure caveats.

## Safety design

Crisis handling is the highest-stakes path in the app. The current implementation is **prompt-level**: a calibrated section of the system prompt instructs the model to distinguish real distress from venting, ask a direct middle-gear question when ambiguous, and provide resources cleanly when the signal is unambiguous (rendered as bolded markdown so phone numbers stand out).

On top of that, a lightweight classifier (Claude Haiku) runs in parallel with the main conversational model on every user message. It reads a short rolling window of recent turns (so it can pick up trajectory, not just the latest line), scores risk, and when the verdict is `HIGH` or `CRITICAL` writes a `CrisisFlag` record for auditability. This is flag-and-log only: the classifier never intervenes in the stream, so the conversational model still owns the actual crisis response. If the classifier errors, it fails open and the chat is unaffected.

Crisis flags are deliberately ephemeral. They store only risk metadata (severity, category, classifier confidence and model version) plus a reference to the message, never a copy of its content, and a daily job purges anything older than 14 days. They cascade-delete with the user, so right-to-be-forgotten still works end to end.

## Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database:** PostgreSQL on Neon + Prisma ORM
- **AI:** Anthropic Claude (Sonnet 4.6) via the Vercel AI SDK (`ai` + `@ai-sdk/anthropic`)
- **Auth:** Custom JWT (jsonwebtoken) + bcrypt-hashed passwords + HttpOnly session cookies
- **Email:** Resend (verification + password reset)
- **Validation:** Zod
- **UI:** Tailwind CSS v4 + shadcn/ui + Radix primitives + lucide icons
- **State:** TanStack Query (server state) + React hooks (local state)

## Getting started

### Prerequisites

- Node.js 20+
- A PostgreSQL database (Neon, local Postgres, or whatever)
- An Anthropic API key
- (Optional for dev) A Resend API key — if omitted, verification / reset emails are printed to the server console instead of sent.

### Setup

```bash
npm install
```

Create a `.env.local` file in the project root:

```env
DATABASE_URL="postgresql://user:password@host:5432/sobrandsteady"
JWT_SECRET="<generate a 32+ byte random string>"
ANTHROPIC_API_KEY="<your Anthropic API key>"
RESEND_API_KEY="<your Resend API key, optional in dev>"
EMAIL_FROM="onboarding@resend.dev"
APP_URL="http://localhost:3000"
```

> Generate a strong `JWT_SECRET` with: `openssl rand -base64 32`

Apply migrations and start the dev server:

```bash
node --env-file=.env.local node_modules/.bin/prisma migrate dev
npm run dev
```

> The Prisma CLI doesn't auto-load `.env.local` (only `.env`), so we wrap it with Node's `--env-file` flag. Standard `npm run dev` picks up `.env.local` natively.

Open [http://localhost:3000](http://localhost:3000).

## API routes

| Method | Route                              | Auth | Description                                         |
| ------ | ---------------------------------- | ---- | --------------------------------------------------- |
| POST   | `/api/users`                       | No   | Create account; sends verification email            |
| GET    | `/api/users`                       | Yes  | Get current user profile (passwordHash omitted)     |
| PATCH  | `/api/users`                       | Yes  | Update profile                                      |
| DELETE | `/api/users`                       | Yes  | Delete account; cascades and clears session cookie  |
| POST   | `/api/onboarding`                  | Yes  | Save onboarding answers; stamp completion + consent |
| POST   | `/api/auth/login`                  | No   | Login; rate-limited; rejects unverified accounts    |
| POST   | `/api/auth/logout`                 | No   | Clear session cookie                                |
| POST   | `/api/auth/verify`                 | No   | Consume a verification token                        |
| POST   | `/api/auth/resend-verification`    | No   | Send a new verification email                       |
| POST   | `/api/auth/forgot-password`        | No   | Send password reset email (always 200)              |
| POST   | `/api/auth/reset-password`         | No   | Consume reset token + set new password              |
| POST   | `/api/chat`                        | Yes  | Send message; streams Claude response               |
| GET    | `/api/chat-messages`               | Yes  | Get chat history (paginated)                        |
| POST   | `/api/check-in`                    | Yes  | Create a check-in                                   |
| GET    | `/api/check-in`                    | Yes  | Get check-in history                                |
| GET    | `/api/check-in/today`              | Yes  | Whether the user has checked in today               |

## Privacy

See [/privacy](http://localhost:3000/privacy) in a running instance for the plain-English disclosure. Short version: data lives in a managed Postgres database in the US, conversations are sent to Anthropic for inference (Anthropic doesn't train on this data), and users can delete their account at any time from `/settings`.

## License

Source-available under the terms of the [LICENSE](./LICENSE) file. All rights reserved.

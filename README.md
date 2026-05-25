# sobr

An AI companion for people navigating sobriety. Not a therapist, not a chatbot — a grounded friend that actually gets it.

Built with Next.js, Prisma, and Claude.

> 🚧 **Status:** backend complete, frontend in progress.

## Why

Most mental health and recovery apps default to clinical tone, gamification, or daily affirmations that get stale fast. sobr is designed differently: a casual, warm, direct conversational presence that matches the user's emotional register without spiraling with them. It only brings up recovery when the user does — except in crisis moments, where it shifts immediately and clearly.

## Features

- **AI chat** — Streaming conversations powered by Claude, personalized with check-in history and preferences.
- **Daily check-ins** — Track mood, energy, and cravings over time.
- **Framework support** — Biblical, 12-step, both, or secular. Adapts to the user's approach.
- **Crisis handling** — Detects acute risk signals (suicidal ideation, intent to harm, overdose risk, dangerous withdrawal) and shifts tone immediately, surfacing 988, Crisis Text Line, SAMHSA, and 911 with clear, direct language.

## Safety architecture

Crisis handling is the highest-stakes path in the app. sobr uses a tiered approach rather than a single keyword-match:

- A lightweight classifier evaluates each user message for risk signals in parallel with the conversational model.
- The main conversational model receives the classifier's signal as context, enabling it to shift register without losing the conversational thread.
- All flagged interactions are logged for auditability.

This design separates safety vigilance from conversational tone, so the friend-first voice never has to compete with crisis detection in a single prompt.

## Tech stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL + Prisma ORM
- **AI:** Anthropic Claude (streaming)
- **Auth:** JWT (bcrypt + jose)
- **Validation:** Zod
- **UI:** Tailwind CSS + shadcn/ui

## Getting started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Anthropic API key

### Setup

```bash
npm install
```

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/sobr"
JWT_SECRET="<generate a 32+ byte random string>"
ANTHROPIC_API_KEY="<your Anthropic API key>"
```

> Generate a strong `JWT_SECRET` with: `openssl rand -base64 32`

Run migrations and start the dev server:

```bash
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API routes

| Method | Route                | Auth | Description                       |
| ------ | -------------------- | ---- | --------------------------------- |
| POST   | `/api/users`         | No   | Create account                    |
| GET    | `/api/users`         | Yes  | Get current user profile          |
| PATCH  | `/api/users`         | Yes  | Update profile                    |
| DELETE | `/api/users`         | Yes  | Delete account                    |
| POST   | `/api/auth/login`    | No   | Login, returns JWT                |
| POST   | `/api/chat`          | Yes  | Send message, streams response    |
| GET    | `/api/chat-messages` | Yes  | Get chat history (paginated)      |
| POST   | `/api/check-in`      | Yes  | Create check-in                   |
| GET    | `/api/check-in`      | Yes  | Get check-in history              |

## License

Source-available under the terms of the [LICENSE](./LICENSE) file. All rights reserved.
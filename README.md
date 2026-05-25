# sobr

An AI companion for people navigating sobriety. Not a therapist, not a chatbot — a grounded friend that actually gets it.

Built with Next.js, Prisma, and Claude.

## Features

- **AI chat** — Streaming conversations powered by Claude, personalized with your check-in history and preferences
- **Daily check-ins** — Track mood, energy, and cravings over time
- **Framework support** — Biblical, 12-step, both, or secular — adapts to your approach
- **Crisis handling** — Automatically surfaces crisis resources (988, Crisis Text Line, SAMHSA) when needed

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

### Setup

```bash
npm install
```

Create a `.env` file:

```
DATABASE_URL="postgresql://user:password@localhost:5432/sobr"
JWT_SECRET="your-secret-key"
ANTHROPIC_API_KEY="your-api-key"
```

Run migrations and start the dev server:

```bash
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/users` | No | Create account |
| GET | `/api/users` | Yes | Get current user profile |
| PATCH | `/api/users` | Yes | Update profile |
| DELETE | `/api/users` | Yes | Delete account |
| POST | `/api/auth/login` | No | Login, returns JWT |
| POST | `/api/chat` | Yes | Send message, streams response |
| GET | `/api/chat-messages` | Yes | Get chat history (paginated) |
| POST | `/api/check-in` | Yes | Create check-in |
| GET | `/api/check-in` | Yes | Get check-in history |

# Project: sobrandsteady

The product is **sobrandsteady** (all lowercase). The AI companion inside it is named **sobr**. The GitHub repo is named `sobr` as a fossil of the original prototype name — don't be confused by the mismatch.

This file is the source of truth for project conventions. Read it before suggesting changes.

## What this is

sobrandsteady is a companion app for people in recovery. Web app (eventually mobile via PWA). The AI companion handles daily check-ins, journaling, and conversation with framework personalization (Bible, 12-step, both, or none). Crisis-routing is built into the chat path.

It is **not** a mental health app, clinical tool, or healthcare service. Positioning is lifestyle/companion. Don't suggest features, copy, or claims that drift toward clinical/medical framing.

## Stack

- **Framework:** Next.js 16, App Router (front and back end in one project)
- **Database:** PostgreSQL via Prisma (managed on Neon)
- **AI:** Anthropic API via `@ai-sdk/anthropic`, streaming, prompt caching, classifier-routed safety
- **UI:** shadcn/ui + Tailwind CSS
- **Auth:** JWT via `jose`, HttpOnly cookies, edge proxy (`src/proxy.ts`), bcrypt for password hashing, zod for validation
- **Email:** Resend (verification + password reset)
- **Deployment:** Vercel
- **Domains:** sobrandsteady.com (primary) and sobrandsteady.app (secondary, future mobile bounce)

## Conventions

- TypeScript strict mode
- All API routes use `getCurrentUserId()` from the JWT cookie to identify the user
- All user-scoped queries include `where: { userId }` — never accept a userId from the request body, URL params, or query string
- Cascade delete is in place for `User → CheckIn / ChatMessage / Token` (right-to-be-forgotten works end-to-end)
- Push to git after every meaningful change. Commit messages are descriptive, not "wip" or "fix"
- Don't disable Prisma query logging in a way that re-enables it accidentally — chat content and journal entries were leaking to stdout previously
- Cursor pagination on chat messages uses the `where: { userId }` filter for safety even with attacker-supplied cursors
- Sanitized error logs only — no Prisma query params, no stack traces leaking to the client
- Edge runtime constraints: `proxy.ts` runs at the edge — no Node-specific APIs (bcrypt etc.). Password hashing and other Node-only operations belong in API routes

## Style and voice

- **No em-dashes** in user-facing copy outside of the AI chat responses. The app UI, emails, marketing copy, privacy page, and similar surfaces use commas, colons, or periods. The AI companion (sobr) is allowed to use em-dashes in its chat responses since they often serve the conversational rhythm.
- **Product brand:** `sobrandsteady` (all lowercase, no spaces)
- **AI companion name:** `sobr` (all lowercase) — referenced in chat as "I'm sobr" or similar
- **Tone:** direct, warm, slightly informal. Not clinical, not preachy, not saccharine. "Hey, I gotta ask directly" is the voice; "I understand your feelings are valid" is not.
- **Crisis flow voice:** calm acknowledgment first, then real resources (988, Crisis Text Line 741741, 911), then connection question. Don't escalate ambiguous statements; don't soften clear ones.
- Treat the user as a person, not a label. Don't lead with their recovery status. Hobby-led onboarding is intentional.

## Safety

- Crisis-handling code is sensitive — review carefully before changing
- Classifier-routed safety pattern: lightweight model evaluates risk in parallel with the main conversational model. Don't break that pattern
- Crisis resources must be accurate: 988 (call or text), Crisis Text Line (text HOME to 741741), 911 for immediate danger
- Never log full chat content, journal entries, or PII to stdout, error tracking, or third-party services
- Anthropic retains API inputs/outputs for 30 days for trust and safety — disclosed in privacy page
- Privacy page (`/privacy`) is the source of truth for what data we store. Changes to data handling require updates there

## Things to avoid

- Don't suggest alternative ORMs (Drizzle, Sequelize, TypeORM) — Prisma is in use and not changing
- Don't suggest replacing FastAPI patterns in mental models — this project is Next.js end to end
- Don't suggest adding third-party analytics (PostHog, Mixpanel, Plausible, GA) that pipe user content or chat data
- Don't suggest error monitoring (Sentry, etc.) without explicit scope filters that exclude chat content
- Don't add environment variables without flagging them explicitly so they get added to Vercel
- Don't suggest mental-health-app or healthcare-app framing in copy or features
- Don't reproduce song lyrics, copyrighted content, or Bible verses verbatim from external sources without verifying licensing — for the Bible verse feature, use the Bible API with proper translation attribution

## Workflow

- Prompt-and-verify is the working style. Suggest changes; the human reviews every diff before applying
- Don't apply edits without showing the diff
- For large refactors, propose the plan first and wait for approval before making changes
- When in doubt, ask before changing

## Pre-launch state

See `TODO.md` for the full pre-launch hardening list. Critical items (legal, safety, deploy basics) must land before any tester touches the app. The "Already done" section in TODO.md tracks what's complete.

Erin's recovery community is the Phase 1 testing cohort. Phase 2 expands to a waitlist-driven broader beta after legal pieces are in place.

## Repo structure (high level)

- `prisma/schema.prisma` — data model, source of truth for the DB
- `src/app/api/` — API routes (auth, chat, check-in, users, etc.)
- `src/app/` — pages (Next.js App Router)
- `src/lib/` — shared utilities, including auth helpers and safety logic
- `src/components/` — React components
- `public/` — static assets
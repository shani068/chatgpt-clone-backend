# ChatGPT Backend

Express + TypeScript API for a ChatGPT-style product. It handles authentication, conversation and message persistence, and OpenAI-powered streaming chat. Designed to sit behind the Next.js frontend, which proxies `/api/*` so auth cookies stay first-party.

## Stack

| Technology | Purpose |
| --- | --- |
| Bun | Runtime and tooling |
| Express.js | HTTP framework |
| TypeScript | Type safety |
| Prisma 7 + PostgreSQL | ORM and data store |
| Better Auth | Email/password + Google OAuth sessions |
| Vercel AI SDK + `@ai-sdk/openai` | Streaming completions |
| Zod | Request validation |
| Winston | Structured logging |
| Helmet + CORS | Security headers and cross-origin policy |
| Scalar | API reference UI at `/docs` |

## Prerequisites

- [Bun](https://bun.sh)
- PostgreSQL
- OpenAI API key
- Optional: Google Cloud OAuth credentials (for Google sign-in)

## Getting started

```bash
cd chat_gpt_backend
bun install
cp .env.example .env
# fill in DATABASE_URL, BETTER_AUTH_*, GOOGLE_*, OPENAI_API_KEY
bunx prisma generate
bunx prisma migrate dev
bun run dev
```

API: [http://localhost:4000](http://localhost:4000)  
Health: [http://localhost:4000/health](http://localhost:4000/health)  
Docs: [http://localhost:4000/docs](http://localhost:4000/docs)

| Script | Description |
| --- | --- |
| `bun run dev` | Dev server with hot reload |
| `bun run build` | Prisma generate + Bun production bundle |
| `bun start` | Run production build |
| `bun run lint` | ESLint |
| `bun run lint:fix` | ESLint with autofix |
| `bun run format` | Prettier |
| `bun run check` | Lint + format |

## Environment

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | No | Defaults to `development` |
| `PORT` | No | Defaults to **4000** |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Session secret (≥ 32 characters); `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Yes | Public Next.js origin (e.g. `http://localhost:3000`) — auth cookies and OAuth redirects |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `OPENAI_API_KEY` | Yes | Server-only OpenAI key |
| `CORS_ORIGIN` | No | Defaults to `BETTER_AUTH_URL`; must be an exact origin when using credentials |

Google OAuth authorized redirect URI (via the Next proxy):

```
http://localhost:3000/api/auth/callback/google
```

`REDIS_URL` appears in `.env.example` for future cache / rate-limit work; Redis is not wired into the running app today.

## Architecture

```
Next.js (localhost:3000)
  └── rewrite /api/* ──► Express (localhost:4000)
                            ├── Better Auth  /api/auth/*
                            ├── Users        /api/v1/users
                            ├── Conversations /api/v1/conversations
                            ├── Messages     /api/v1/messages
                            └── Chat stream  /api/chat
```

Better Auth is mounted **before** `express.json()`. Protected routes use session cookies validated via `auth.api.getSession`.

Default chat model: **`gpt-4o-mini`** (overridable per conversation). After each stream finishes, messages are persisted and untitled threads are auto-titled from the first user message.

## API overview

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `*` | `/api/auth/*` | Better Auth | Sign-up, sign-in, session, Google OAuth |
| `GET` | `/api/v1/users/me` | Yes | Current user profile |
| `PUT` | `/api/v1/users/me` | Yes | Update name |
| `POST` | `/api/v1/conversations` | Yes | Create conversation |
| `GET` | `/api/v1/conversations` | Yes | List (pinned first, then recent) |
| `GET` | `/api/v1/conversations/:id` | Yes | Get one (ownership-scoped) |
| `PUT` | `/api/v1/conversations/:id` | Yes | Update title, model, pin, archive, etc. |
| `DELETE` | `/api/v1/conversations/:id` | Yes | Delete conversation |
| `POST` | `/api/v1/messages` | Yes | Create message |
| `GET` | `/api/v1/messages?conversationId=` | Yes | List messages for a conversation |
| `GET` / `PUT` / `DELETE` | `/api/v1/messages/:id` | Yes | Message by id |
| `POST` | `/api/chat` | Yes | Stream assistant reply (`{ id, message }`) |
| `GET` | `/health` | No | Health check |
| `GET` | `/docs` | No | Scalar API UI |
| `GET` | `/openapi.json` | No | OpenAPI document |

## Data model

| Model | Role |
| --- | --- |
| `User`, `Session`, `Account`, `Verification` | Better Auth identity and sessions |
| `Conversation` | Per-user thread (title, model, pin/archive, `lastMessageAt`) |
| `Message` | Roles `USER` / `ASSISTANT` / `SYSTEM` / `TOOL`; optional `parts` JSON and `parentId` for branching |

See [`prisma/schema.prisma`](prisma/schema.prisma).

## Project structure

```
prisma/                 # schema
prisma.config.ts        # Prisma 7 datasource config
src/
  server.ts             # HTTP listen
  app.ts                # middleware, auth mount, routes, docs, health
  routes/               # route registration
  config/               # env, auth, database, swagger, logger
  middleware/           # auth, error handling
  modules/
    users/              # profile
    conversation/       # conversation CRUD
    messages/           # message CRUD
    chat/               # streaming + persistence
    ai/                 # OpenAI model helpers
    auth/               # scaffold (Better Auth handles live auth routes)
  utils/                # ApiError, ApiResponse, asyncHandler
  types/
```

## Pairing with the frontend

1. Run this API on **4000**.
2. In `chat_gpt_project`, set `BACKEND_URL=http://localhost:4000`.
3. Set `BETTER_AUTH_URL=http://localhost:3000` here so sessions and OAuth callbacks match the Next origin.
4. Start the frontend with `bun run dev` → [http://localhost:3000](http://localhost:3000).

## License

MIT

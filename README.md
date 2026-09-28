# ChatGPT Backend

The server side of a ChatGPT-style AI assistant. It signs users in, stores their conversations, and streams AI replies from OpenAI back to the browser word by word.

This API is built to run behind the Next.js frontend in [`chat_gpt_project`](../chat_gpt_project). The browser never calls this server directly. The frontend forwards every `/api/*` request here, so login cookies stay on the frontend's domain.

---

## Contents

- [What it does](#what-it-does)
- [How it fits together](#how-it-fits-together)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [API reference](#api-reference)
- [Data model](#data-model)
- [Project structure](#project-structure)
- [Development workflow](#development-workflow)
- [Security notes](#security-notes)
- [Current limitations](#current-limitations)
- [Troubleshooting](#troubleshooting)

---

## What it does

| Feature | Details |
| --- | --- |
| **Accounts and sign-in** | Email and password, plus Google sign-in. Sessions are stored in httpOnly cookies. |
| **Conversations** | Each user has their own conversations. They can be created, listed, renamed, pinned, archived, and deleted. |
| **Messages** | Every user and assistant message is saved to the database. |
| **Streaming AI replies** | Replies stream from OpenAI (default model `gpt-4o-mini`) as they are generated. |
| **Auto-titles** | A new conversation named "New Chat" is renamed from its first message (up to 48 characters). |
| **Per-conversation settings** | Each conversation can set its own model and system prompt. If none is set, a built-in assistant prompt is used. |
| **API docs** | An interactive API reference page is available at `/docs`. |

---

## How it fits together

```
Browser
   │
   ▼
Next.js frontend (localhost:3000)
   │  forwards /api/*
   ▼
Express backend (localhost:4000)
   ├── /api/auth/*            Better Auth (sign-up, sign-in, sessions, Google)
   ├── /api/v1/users          Current user profile
   ├── /api/v1/conversations  Conversation CRUD
   ├── /api/v1/messages       Message CRUD
   └── /api/chat              Streaming AI replies
   │
   ├──► PostgreSQL (via Prisma)
   └──► OpenAI (via Vercel AI SDK)
```

**What happens when a user sends a message:**

1. The frontend sends `POST /api/chat` with the conversation ID and the new message.
2. The server checks the session and confirms the user owns that conversation.
3. It loads the earlier messages from the database and sends the full history to OpenAI.
4. The reply streams back to the browser as it is generated.
5. When the reply is finished, both messages are saved. If the conversation is still called "New Chat", it gets a title.

The server finishes generating a reply even if the browser disconnects partway through, so the saved reply is complete. Each chat request times out after 55 seconds.

---

## Tech stack

| Technology | Purpose |
| --- | --- |
| [Bun](https://bun.sh) | Runtime, package manager, and bundler |
| Express 4 + TypeScript | HTTP server |
| PostgreSQL + Prisma 7 | Database and ORM (using the `@prisma/adapter-pg` driver adapter) |
| Better Auth | Email/password and Google sign-in, sessions |
| Vercel AI SDK (`ai`, `@ai-sdk/openai`) | Calls OpenAI and streams replies |
| Zod | Checks environment variables and request bodies |
| Winston | Logging (daily rotating log files in production) |
| Helmet + CORS | Security headers and cross-origin rules |
| swagger-jsdoc + Scalar | OpenAPI document and the `/docs` page |

---

## Getting started

### Prerequisites

- [Bun](https://bun.sh)
- A PostgreSQL database
- An [OpenAI API key](https://platform.openai.com/api-keys)
- Google OAuth credentials from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials). These are **required**: the server will not start without them.

### 1. Install dependencies

```bash
cd chat_gpt_backend
bun install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the values. See [Environment variables](#environment-variables) for what each one does. To generate `BETTER_AUTH_SECRET`:

```bash
openssl rand -base64 32
```

In the Google Cloud Console, add this **Authorized redirect URI** to your OAuth client:

```
http://localhost:3000/api/auth/callback/google
```

It points at the **frontend** port (3000), not the backend, because Google's callback goes through the frontend proxy.

### 3. Set up the database

```bash
bunx prisma generate        # builds the Prisma client into src/generated/prisma
bunx prisma migrate dev     # creates the tables in your database
```

You must run `prisma generate`. The generated client is not committed (it is listed in `.gitignore`), and the dev server does not generate it for you.

### 4. Start the server

```bash
bun run dev
```

| URL | What it is |
| --- | --- |
| http://localhost:4000/health | Health check. Returns `{ "status": "ok" }` |
| http://localhost:4000/docs | Interactive API reference |
| http://localhost:4000/openapi.json | Raw OpenAPI document |

### 5. Start the frontend

Follow the steps in the [frontend README](../chat_gpt_project/README.md), then open http://localhost:3000.

---

## Environment variables

The server checks these when it starts. If a required value is missing or invalid, it prints which ones are wrong and exits.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | | PostgreSQL connection string, e.g. `postgresql://user:password@localhost:5432/mydb` |
| `BETTER_AUTH_SECRET` | Yes | | Secret used to sign sessions. Must be **at least 32 characters**. |
| `BETTER_AUTH_URL` | Yes | | The **frontend's** public URL (e.g. `http://localhost:3000`). Used for cookies, OAuth redirects, and trusted origins. |
| `GOOGLE_CLIENT_ID` | Yes | | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | | Google OAuth client secret |
| `OPENAI_API_KEY` | Yes | | OpenAI API key. Keep it on the server and never give it to the frontend. |
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |
| `PORT` | No | `4000` | Port the server listens on |
| `CORS_ORIGIN` | No | `BETTER_AUTH_URL` | Allowed browser origin. Must be one exact origin, because cookies are sent with requests. Wildcards will not work. |

> `.env.example` also contains `REDIS_URL`. Redis is **not used** by the running app yet, so you can leave it as is.

---

## Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Start the dev server and restart it on file changes |
| `bun run build` | Generate the Prisma client and bundle the app into `dist/` |
| `bun start` | Run the production bundle (`dist/server.js`) |
| `bun run lint` | Check code with ESLint |
| `bun run lint:fix` | Check code and fix what can be fixed automatically |
| `bun run format` | Format code with Prettier |
| `bun run check` | Run lint, then format |

Useful Prisma commands:

| Command | What it does |
| --- | --- |
| `bunx prisma generate` | Rebuild the Prisma client after changing the schema |
| `bunx prisma migrate dev --name <name>` | Create and apply a new migration during development |
| `bunx prisma migrate deploy` | Apply existing migrations (for production) |
| `bunx prisma studio` | Browse the database in your browser |

---

## API reference

Every endpoint except the auth routes, `/health`, `/docs`, and `/openapi.json` needs a signed-in session cookie. Users can only see and change their own conversations and messages. Anyone else gets `403 Forbidden`.

### Authentication

| Method | Path | Description |
| --- | --- | --- |
| `*` | `/api/auth/*` | Handled entirely by Better Auth: sign up, sign in, sign out, get session, and Google OAuth |

### Users

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/v1/users/me` | Get the current user's profile |
| `PUT` | `/api/v1/users/me` | Update the current user's `name` (the only field that can be changed) |

### Conversations

| Method | Path | Body | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/conversations` | `title?`, `model?`, `systemPrompt?` | Create a conversation |
| `GET` | `/api/v1/conversations` | | List your conversations, pinned first, then most recent |
| `GET` | `/api/v1/conversations/:id` | | Get one conversation |
| `PUT` | `/api/v1/conversations/:id` | `title?`, `model?`, `systemPrompt?`, `isPinned?`, `isArchived?` | Update a conversation (at least one field) |
| `DELETE` | `/api/v1/conversations/:id` | | Delete a conversation and all its messages |

### Messages

| Method | Path | Body | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/messages` | `conversationId`, `role`, `content`, `status?`, `parts?`, `metadata?`, `parentId?` | Create a message |
| `GET` | `/api/v1/messages?conversationId=<id>` | | List a conversation's messages, oldest first |
| `GET` | `/api/v1/messages/:id` | | Get one message |
| `PUT` | `/api/v1/messages/:id` | `content?`, `status?`, `parts?`, `metadata?` | Update a message (at least one field) |
| `DELETE` | `/api/v1/messages/:id` | | Delete a message |

### Chat

| Method | Path | Body | Description |
| --- | --- | --- | --- |
| `POST` | `/api/chat` | `{ id: <conversationId>, message: <UIMessage> }` | Stream an assistant reply using the AI SDK UI message stream format |

Send only the **newest** message. The server loads the rest of the history from the database.

### Other

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Health check |
| `GET` | `/docs` | Scalar API reference UI |
| `GET` | `/openapi.json` | OpenAPI 3.0 document |

### Response format

Successful REST responses use this shape:

```json
{ "statusCode": 200, "data": { }, "message": "Success", "success": true }
```

Errors use this shape. `stack` is only included in development.

```json
{ "success": false, "message": "Conversation not found" }
```

Validation errors return `400`. A missing or expired session returns `401`, someone else's resource returns `403`, and a missing record returns `404`. Prisma's duplicate-record and record-not-found errors are converted to `409` and `404`.

---

## Data model

The schema is defined in [`prisma/schema.prisma`](prisma/schema.prisma).

| Model | Purpose |
| --- | --- |
| `User` | A person with an account (name, email, avatar) |
| `Session`, `Account`, `Verification` | Managed by Better Auth: login sessions, password and Google credentials, verification tokens |
| `Conversation` | A chat thread owned by one user: title, optional model and system prompt, pinned/archived flags, and `lastMessageAt` for sorting |
| `Message` | One message in a conversation: role (`USER`, `ASSISTANT`, `SYSTEM`, `TOOL`), status (`PENDING`, `COMPLETE`, `ERROR`), plain-text `content`, the AI SDK `parts` as JSON, optional `metadata`, and an optional `parentId` for branching |

Deleting a user deletes their conversations. Deleting a conversation deletes its messages.

---

## Project structure

```
chat_gpt_backend/
├── prisma/
│   ├── schema.prisma          # Database models
│   └── migrations/            # SQL migrations
├── prisma.config.ts           # Prisma 7 config (schema path, DATABASE_URL)
├── Dockerfile.redis           # Redis image, kept for future use (not needed today)
└── src/
    ├── server.ts              # Starts the HTTP server
    ├── app.ts                 # Middleware, auth mount, routes, docs, health check
    ├── routes/index.ts        # Registers every module's routes
    ├── config/
    │   ├── env.config.ts      # Reads and validates environment variables
    │   ├── auth.config.ts     # Better Auth setup (email/password + Google)
    │   ├── database.config.ts # Prisma client
    │   ├── logger.config.ts   # Winston logger
    │   ├── swagger.config.ts  # /docs and /openapi.json
    │   └── ...
    ├── middleware/
    │   ├── auth.middleware.ts   # `protect`: requires a valid session
    │   └── error.middleware.ts  # Turns errors into JSON responses
    ├── modules/
    │   ├── ai/                # OpenAI model selection
    │   ├── chat/              # Streaming endpoint and saving messages
    │   ├── conversation/      # Conversation CRUD
    │   ├── messages/          # Message CRUD
    │   ├── users/             # Profile endpoints
    │   └── auth/              # Old scaffold, not used (Better Auth handles auth)
    ├── utils/                 # ApiError, ApiResponse, asyncHandler
    ├── types/                 # Shared types (adds `req.user` to Express)
    └── generated/prisma/      # Generated Prisma client (not committed)
```

---

## Development workflow

### How a module is organised

Each feature in `src/modules/` follows the same layout:

| File | Responsibility |
| --- | --- |
| `*.routes.ts` | Defines the endpoints and applies `protect` and validation middleware |
| `*.validator.ts` | Zod schemas that check `req.body` and return `400` with a readable message |
| `*.handler.ts` | Reads the request, calls the service, and sends the response |
| `*.service.ts` | Business logic and database access, including ownership checks |

To add a new feature, create these four files in a new folder under `src/modules/`, then register the router in `src/routes/index.ts`.

### Changing the database

1. Edit `prisma/schema.prisma`.
2. Run `bunx prisma migrate dev --name <describe-the-change>`.
3. Commit the new folder under `prisma/migrations/`.

### Code style

- The path alias `@/*` points to `src/*`.
- Run `bun run check` before committing. It runs ESLint (TypeScript, import, security, and no-secrets rules) and then Prettier.
- Log with the Winston logger in `config/logger.config.ts`, not `console`.
- Throw `ApiError(statusCode, message)` for expected failures. The error middleware formats the response.

### Logs

- **Development:** colourised output on the console, including Prisma queries.
- **Production:** JSON output on the console, plus rotating files in `logs/`. `combined-*.log` is kept for 14 days and `error-*.log` for 30 days.

Every request is logged with method, URL, status code, and duration.

---

## Security notes

- **Cookie-based sessions.** Better Auth stores sessions in httpOnly cookies. The `protect` middleware checks every protected request against Better Auth.
- **Ownership checks.** Users can only read or change their own conversations and messages.
- **No automatic account merging.** Signing in with Google does not attach to an existing password account just because the email matches.
- **Limited profile updates.** Only `name` can be changed through `PUT /users/me`. Email is never taken from the request.
- **Strict CORS.** Only one exact origin is allowed, and credentials are enabled.
- **Security headers.** Helmet sets them on every response. The `/docs` page has its own Content Security Policy.
- **Server-only secrets.** `OPENAI_API_KEY` and the auth secret never leave the server.

---

## Current limitations

These parts exist in the code but are **not active** yet:

- **Rate limiting.** `middleware/rateLimiter.middleware.ts` is set to 100 requests per 15 minutes but is not applied to any route.
- **Redis.** The Redis client, cache helpers, and `REDIS_URL` are commented out.
- **The `modules/auth` folder.** This is leftover JWT scaffolding. Its routes are disabled, and Better Auth handles all authentication.
- **API docs content.** `/docs` builds its spec from JSDoc comments in `*.routes.ts`. The routes have no such comments yet, so the page lists few or no endpoints. Use the [API reference](#api-reference) above instead.

---

## Troubleshooting

| Problem | Likely cause |
| --- | --- |
| The server exits with `❌ Invalid environment variables` | A required variable is missing or invalid. The output lists which ones. A common cause is a `BETTER_AUTH_SECRET` shorter than 32 characters. |
| An error says the module `generated/prisma/client` cannot be found | The Prisma client has not been generated. Run `bunx prisma generate`. |
| The browser shows CORS errors | `BETTER_AUTH_URL` (or `CORS_ORIGIN`) must exactly match the frontend origin, including the port. |
| Google sign-in shows `redirect_uri_mismatch` | Add `http://localhost:3000/api/auth/callback/google` to the OAuth client in Google Cloud Console. |
| Protected endpoints return `401` | The request has no valid session cookie. Sign in through the frontend first. |

---

## License

No license file is included in this project.

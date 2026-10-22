# ChatGPT Backend

The server side of a ChatGPT-style AI assistant. It signs users in, stores their conversations, streams AI replies from OpenAI back to the browser word by word, answers questions about images users attach, and answers questions about PDFs users upload (retrieval-augmented generation, or RAG).

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
| **Messages** | Every user and assistant message is saved to the database, including references to attached images and PDFs. |
| **Streaming AI replies** | Replies stream from OpenAI (default model `gpt-4o-mini`) as they are generated. |
| **Image understanding** | Users upload PNG, JPEG, WebP, or GIF images (up to 5 MB, up to 5 per message). The images are stored in PostgreSQL and sent to the model as image input. |
| **PDF questions (RAG)** | Users upload PDFs (up to 10 MB). The text is split into chunks, embedded with OpenAI, and stored in Qdrant. When a conversation contains a PDF, replies are based on the most relevant chunks. |
| **Clear AI errors** | Problems on OpenAI's side (bad key, quota, outage) are turned into safe, readable messages in the stream. Failed replies are not saved. |
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
   ├── /api/v1/images         Image upload and download
   ├── /api/v1/documents      PDF upload and indexing
   └── /api/chat              Streaming AI replies
   │
   ├──► PostgreSQL (via Prisma)          users, conversations, messages, image bytes
   ├──► Qdrant (via LangChain)           PDF chunks and their embeddings
   └──► OpenAI                           chat replies (Vercel AI SDK),
                                         embeddings and query rewriting (LangChain)
```

**What happens when a user sends a message:**

1. Before sending, the frontend uploads any attachments. Images go to `POST /api/v1/images` and PDFs go to `POST /api/v1/documents`. Each upload returns an ID.
2. The frontend sends `POST /api/chat` with the conversation ID and the new message. Attachments are included as `data-image` / `data-document` parts that contain only the ID.
3. The server checks the session and confirms the user owns that conversation.
4. It loads the earlier messages from the database and adds the new one.
5. **Images:** it loads the image bytes for every `data-image` part in the conversation, limited to the user's own images, and sends them to the model as file input. If an image in the new message cannot be found, the request fails with `400`.
6. **PDFs:** if any message in the conversation has a `data-document` part and the new message has text, the server searches Qdrant for chunks from those documents. It then uses a RAG system prompt containing those chunks instead of the normal system prompt.
7. The reply streams back to the browser as it is generated.
8. When the reply is finished, the messages are saved. If the conversation is still called "New Chat", it gets a title. If the model failed, only the user's message is saved.

The server finishes generating a reply even if the browser disconnects partway through, so the saved reply is complete. Each chat request times out after 55 seconds.

**What happens when a PDF is uploaded** (`src/rag/indexing.ts`):

1. Multer keeps the file in memory. Only `application/pdf` files up to 10 MB are accepted.
2. LangChain's `PDFLoader` (which uses `pdf-parse`) extracts the text.
3. `RecursiveCharacterTextSplitter` splits it into 1,000-character chunks that overlap by 200 characters.
4. Each chunk is tagged with a new `documentId` and the user's `userId`, embedded with `text-embedding-3-large`, and stored in the Qdrant collection `pdf_documents`. Qdrant creates the collection on the first upload.
5. The `documentId` is returned. The PDF file itself is not stored anywhere.

**How retrieval works** (`src/rag/query.ts`): LangChain's `MultiQueryRetriever` uses `gpt-4o-mini` to rephrase the question in a few different ways. It takes the top 5 chunks for each version and combines the results. Every search is filtered by both `userId` and the conversation's `documentId`s.

---

## Tech stack

| Technology | Purpose |
| --- | --- |
| [Bun](https://bun.sh) | Runtime, package manager, and bundler |
| Express 4 + TypeScript | HTTP server |
| PostgreSQL + Prisma 7 | Database and ORM (using the `@prisma/adapter-pg` driver adapter) |
| Better Auth | Email/password and Google sign-in, sessions |
| Vercel AI SDK 7 (`ai`, `@ai-sdk/openai`) | Calls the OpenAI chat model (including image input) and streams replies |
| LangChain (`@langchain/community`, `openai`, `qdrant`, `textsplitters`, `classic`) | Loads, splits, embeds, and retrieves PDF content |
| Qdrant | Vector database for PDF chunks (run with `docker-compose.yml`) |
| Multer | Handles `multipart/form-data` uploads (kept in memory) |
| pdf-parse | Extracts PDF text (used by LangChain's `PDFLoader`) |
| Zod | Checks environment variables and request bodies |
| Winston | Logging (daily rotating log files in production) |
| Helmet + CORS | Security headers and cross-origin rules |
| swagger-jsdoc + Scalar | OpenAPI document and the `/docs` page |

---

## Getting started

### Prerequisites

- [Bun](https://bun.sh)
- A PostgreSQL database
- [Docker](https://docs.docker.com/get-docker/) to run Qdrant, or another Qdrant instance you can reach
- An [OpenAI API key](https://platform.openai.com/api-keys). The same key is used for chat, image input, embeddings, and query rewriting.
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

### 4. Start Qdrant

```bash
docker compose up -d
```

This starts Qdrant on port `6333` (REST API and dashboard at http://localhost:6333/dashboard) and port `6334` (gRPC). Data is kept in the `qdrant_data` Docker volume. The server starts without Qdrant, but PDF uploads and chats that include PDFs will fail.

### 5. Start the server

```bash
bun run dev
```

| URL | What it is |
| --- | --- |
| http://localhost:4000/health | Health check. Returns `{ "status": "ok" }` |
| http://localhost:4000/docs | Interactive API reference |
| http://localhost:4000/openapi.json | Raw OpenAPI document |

### 6. Start the frontend

Follow the steps in the [frontend README](../chat_gpt_project/README.md), then open http://localhost:3000.

---

## Environment variables

The server checks these when it starts (`src/config/env.config.ts`). If a required value is missing or invalid, it prints which ones are wrong and exits.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | | PostgreSQL connection string, e.g. `postgresql://user:password@localhost:5432/mydb` |
| `BETTER_AUTH_SECRET` | Yes | | Secret used to sign sessions. Must be **at least 32 characters**. |
| `BETTER_AUTH_URL` | Yes | | The **frontend's** public URL (e.g. `http://localhost:3000`). Used for cookies, OAuth redirects, and trusted origins. |
| `GOOGLE_CLIENT_ID` | Yes | | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | | Google OAuth client secret |
| `OPENAI_API_KEY` | Yes | | OpenAI API key, used for chat, embeddings, and RAG query rewriting. Keep it on the server and never give it to the frontend. |
| `QDRANT_URL` | No | `http://localhost:6333` | Qdrant REST endpoint used to store and search PDF chunks |
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |
| `PORT` | No | `4000` | Port the server listens on |
| `CORS_ORIGIN` | No | `BETTER_AUTH_URL` | Allowed browser origin. Must be one exact origin, because cookies are sent with requests. Wildcards will not work. |

> `QDRANT_URL` is not in `.env.example` yet. The default works with `docker compose up -d`. Add it to `.env` only if Qdrant runs somewhere else.
>
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

Useful Prisma and Docker commands:

| Command | What it does |
| --- | --- |
| `bunx prisma generate` | Rebuild the Prisma client after changing the schema |
| `bunx prisma migrate dev --name <name>` | Create and apply a new migration during development |
| `bunx prisma migrate deploy` | Apply existing migrations (for production) |
| `bunx prisma studio` | Browse the database in your browser |
| `docker compose up -d` | Start Qdrant in the background |
| `docker compose down` | Stop Qdrant (data stays in the `qdrant_data` volume) |

---

## API reference

Every endpoint except the auth routes, `/health`, `/docs`, and `/openapi.json` needs a signed-in session cookie. Users can only see and change their own conversations, messages, and images. For conversations and messages, anyone else gets `403 Forbidden`. For images, someone else's image returns `404`, the same as a missing one.

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

### Images

| Method | Path | Body | Response `data` | Description |
| --- | --- | --- | --- | --- |
| `POST` | `/api/v1/images` | `multipart/form-data` with one `file` field | `{ imageId, mediaType, size }` | Upload one image. Returns `201`. |
| `GET` | `/api/v1/images/:id` | | Raw image bytes | Download one of your images. Returns `404` for missing or someone else's images. |

- Up to **5 MB** and one file per request.
- PNG, JPEG, WebP, and GIF are accepted. The browser's MIME type is checked first to reject wrong files quickly. The server then checks the file's first bytes to confirm the real type, because the browser's MIME type cannot be trusted.
- The file name is shortened to 200 characters.
- `GET` sends `Cache-Control: private, max-age=31536000, immutable`, because an image never changes once it has an ID.

### Documents

| Method | Path | Body | Response `data` | Description |
| --- | --- | --- | --- | --- |
| `POST` | `/api/v1/documents` | `multipart/form-data` with one `file` field | `{ documentId }` | Extract, split, embed, and store a PDF in Qdrant. Returns `201` once indexing is done. |

- Only `application/pdf` files up to **10 MB**.
- The request waits until the whole document is embedded, so large PDFs can take a while.
- There is no endpoint to list, download, or delete documents.

### Chat

| Method | Path | Body | Description |
| --- | --- | --- | --- |
| `POST` | `/api/chat` | `{ id: <conversationId>, message: <UIMessage> }` | Stream an assistant reply using the AI SDK UI message stream format |

Send only the **newest** message. The server loads the rest of the history from the database. If a message with the same `id` is already saved, it is not added again. Otherwise it is added to the end of the history.

`message.parts` must not be empty. Besides `text` parts, two kinds of attachment parts are understood:

```jsonc
// Image: at most 5 per message. imageId must come from POST /api/v1/images.
{ "type": "data-image", "data": { "imageId": "…", "name": "screenshot.png", "size": 12345, "mediaType": "image/png" } }

// PDF: documentId must come from POST /api/v1/documents.
{ "type": "data-document", "data": { "documentId": "…", "name": "report.pdf", "size": 67890 } }
```

Only `imageId` and `documentId` are used by the server. The other fields are saved so the frontend can show the attachment again after a reload. A message can contain only images and no text. A PDF is only searched when the new message has text.

If the model fails during the reply, the stream sends an `error` part with one of these messages. Provider error details and keys are never sent to the client.

| Provider status | Message |
| --- | --- |
| `401` / `403` | The AI provider rejected the server's API key… |
| `429` | The AI provider is rate limiting or out of quota… |
| `5xx` | The AI provider is temporarily unavailable… |
| other | The assistant could not generate a response… |

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

Validation errors return `400`. A missing or expired session returns `401`, someone else's resource returns `403`, and a missing record returns `404`. Prisma's duplicate-record and record-not-found errors are converted to `409` and `404`. Upload errors from Multer (for example a file that is too large) return `400`. JSON request bodies are limited to 2 MB.

---

## Data model

The schema is defined in [`prisma/schema.prisma`](prisma/schema.prisma).

| Model | Purpose |
| --- | --- |
| `User` | A person with an account (name, email, avatar) |
| `Session`, `Account`, `Verification` | Managed by Better Auth: login sessions, password and Google credentials, verification tokens |
| `Conversation` | A chat thread owned by one user: title, optional model and system prompt, pinned/archived flags, and `lastMessageAt` for sorting |
| `Message` | One message in a conversation: role (`USER`, `ASSISTANT`, `SYSTEM`, `TOOL`), status (`PENDING`, `COMPLETE`, `ERROR`), plain-text `content`, the AI SDK `parts` as JSON (including `data-image` / `data-document` parts), optional `metadata`, and an optional `parentId` for branching |
| `ChatImage` | An uploaded image owned by one user: name, MIME type, size, and the bytes themselves (`Bytes` / `BYTEA`). Messages point to it by ID, so message rows stay small. |

Deleting a user deletes their conversations and images. Deleting a conversation deletes its messages, but **not** the images or PDF chunks those messages refer to.

**Outside PostgreSQL:** PDF chunks are stored in the Qdrant collection `pdf_documents`. Each point has the chunk text and `metadata.documentId` / `metadata.userId`. The vectors have 3,072 dimensions (`text-embedding-3-large`). Nothing in PostgreSQL records which documents exist.

Migrations are in `prisma/migrations/`: `init_better_auth`, `add_conversation_and_message`, and `add_chat_images`.

---

## Project structure

```
chat_gpt_backend/
├── prisma/
│   ├── schema.prisma          # Database models
│   └── migrations/            # SQL migrations
├── prisma.config.ts           # Prisma 7 config (schema path, DATABASE_URL)
├── docker-compose.yml         # Qdrant (ports 6333/6334, volume qdrant_data)
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
    │   └── error.middleware.ts  # Turns errors (incl. Prisma and Multer) into JSON responses
    ├── modules/
    │   ├── ai/                # OpenAI chat model selection
    │   ├── chat/              # Streaming endpoint, image/RAG wiring, saving messages
    │   ├── conversation/      # Conversation CRUD
    │   ├── messages/          # Message CRUD
    │   ├── images/            # Image upload/download, file-type check, owner-scoped loading
    │   ├── documents/         # PDF upload endpoint (calls rag/indexing)
    │   ├── users/             # Profile endpoints
    │   └── auth/              # Old scaffold, not used (Better Auth handles auth)
    ├── rag/
    │   ├── indexing.ts        # PDF → chunks → embeddings → Qdrant
    │   └── query.ts           # Multi-query retrieval + RAG system prompt
    ├── utils/                 # ApiError, ApiResponse, asyncHandler
    ├── types/                 # Shared types (adds `req.user` to Express)
    └── generated/prisma/      # Generated Prisma client (not committed)
```

---

## Development workflow

### How a module is organised

Most features in `src/modules/` follow the same layout:

| File | Responsibility |
| --- | --- |
| `*.routes.ts` | Defines the endpoints and applies `protect`, validation, and (for uploads) Multer middleware |
| `*.validator.ts` | Zod schemas that check `req.body` and return `400` with a readable message |
| `*.handler.ts` | Reads the request, calls the service, and sends the response |
| `*.service.ts` | Business logic and database access, including ownership checks |

Not every module has all four. `images` and `documents` have no validator, because Multer handles the checks. `documents` has no service and calls `src/rag/indexing.ts` directly. `chat` uses `chat.persistence.ts` instead of a service.

To add a new feature, create these files in a new folder under `src/modules/`, then register the router in `src/routes/index.ts`.

### Changing the database

1. Edit `prisma/schema.prisma`.
2. Run `bunx prisma migrate dev --name <describe-the-change>`.
3. Commit the new folder under `prisma/migrations/`.

### Changing models

- **Chat model:** `src/modules/ai/model.ts` (`DEFAULT_MODEL_ID`, currently `gpt-4o-mini`). A conversation's `model` field overrides it. Images only work with models that accept image input.
- **Embedding model:** `src/rag/indexing.ts`. If you change it, the vector size changes too. Use a new `COLLECTION_NAME`, because Qdrant collections have a fixed vector size.
- **Query-rewriting model and RAG prompt:** `src/rag/query.ts`.

### Code style

- The path alias `@/*` points to `src/*`.
- Run `bun run check` before committing. It runs ESLint (TypeScript, import, security, and no-secrets rules) and then Prettier.
- Log with the Winston logger in `config/logger.config.ts`, not `console`.
- Throw `ApiError(statusCode, message)` for expected failures. The error middleware formats the response.

### Logs

- **Development:** colourised output on the console, including Prisma queries.
- **Production:** JSON output on the console, plus rotating files in `logs/`. `combined-*.log` is kept for 14 days and `error-*.log` for 30 days.

Every request is logged with method, URL, status code, and duration. When the model fails during a reply, the conversation ID, model, error message, and provider status code are logged as `Chat model stream failed`.

---

## Security notes

- **Cookie-based sessions.** Better Auth stores sessions in httpOnly cookies. The `protect` middleware checks every protected request against Better Auth.
- **Ownership checks.** Users can only read or change their own conversations and messages. Image lookups and RAG searches always filter by `userId`, so an image or document ID from another user returns nothing.
- **File checks on uploads.** Image types are detected from the file's first bytes, not from the name or the browser's MIME type. Uploads are size-limited and kept in memory, never written to disk.
- **Safe AI error messages.** Provider errors are reduced to a short, fixed message before reaching the client. Full details are logged only on the server.
- **No automatic account merging.** Signing in with Google does not attach to an existing password account just because the email matches.
- **Limited profile updates.** Only `name` can be changed through `PUT /users/me`. Email is never taken from the request.
- **Strict CORS.** Only one exact origin is allowed, and credentials are enabled.
- **Security headers.** Helmet sets them on every response. The `/docs` page has its own Content Security Policy.
- **Server-only secrets.** `OPENAI_API_KEY` and the auth secret never leave the server.

---

## Current limitations

These parts exist in the code but are **not active** yet:

- **Rate limiting.** `middleware/rateLimiter.middleware.ts` is set to 100 requests per 15 minutes but is not applied to any route. This includes the upload and chat endpoints, which call paid OpenAI APIs.
- **Redis.** The Redis client, cache helpers, and `REDIS_URL` are commented out.
- **The `modules/auth` folder.** This is leftover JWT scaffolding. Its routes are disabled, and Better Auth handles all authentication.
- **API docs content.** `/docs` builds its spec from JSDoc comments in `*.routes.ts`. The routes have no such comments yet, so the page lists few or no endpoints. Use the [API reference](#api-reference) above instead.

Known gaps in the image and PDF features:

- **No cleanup.** Images and PDF chunks are kept when their conversation is deleted. Images are only removed when the user is deleted. Qdrant data is never removed. There are no delete endpoints for either.
- **RAG replaces the system prompt.** When a conversation contains a PDF, the conversation's own `systemPrompt` (or the default prompt) is not used for messages that have text.
- **All earlier images are sent every time.** Every image in the conversation's history is loaded from the database and sent to the model on each new message. Long conversations with many images cost more and respond more slowly.
- **Qdrant has no authentication.** No API key is sent, and the Docker Compose service exposes ports `6333`/`6334` on the host. This is fine for local development but not for a shared deployment. The image tag is `qdrant/qdrant:latest`, not a fixed version.
- **Animated GIFs.** They pass the file-type check, but OpenAI only accepts non-animated GIFs, so the reply may fail.
- **PDFs without text.** There is no OCR. Scanned or image-only PDFs produce little or no text, so questions about them cannot be answered. How the upload itself behaves in this case has not been tested.
- **No automated tests.** The project has no test suite.

---

## Troubleshooting

| Problem | Likely cause |
| --- | --- |
| The server exits with `❌ Invalid environment variables` | A required variable is missing or invalid. The output lists which ones. A common cause is a `BETTER_AUTH_SECRET` shorter than 32 characters. |
| An error says the module `generated/prisma/client` cannot be found | The Prisma client has not been generated. Run `bunx prisma generate`. |
| A query fails because the table `ChatImage` does not exist | A migration has not been applied. Run `bunx prisma migrate dev`. |
| PDF uploads or chats with a PDF return `500` with a connection error in the logs | Qdrant is not running or `QDRANT_URL` is wrong. Run `docker compose up -d`. |
| An upload returns `400 File is too large` | The image is over 5 MB or the PDF is over 10 MB. |
| The reply says the AI provider rejected the API key, or is rate limiting | Check `OPENAI_API_KEY` and the OpenAI account's billing and quota. The server log has the exact provider error. |
| The browser shows CORS errors | `BETTER_AUTH_URL` (or `CORS_ORIGIN`) must exactly match the frontend origin, including the port. |
| Google sign-in shows `redirect_uri_mismatch` | Add `http://localhost:3000/api/auth/callback/google` to the OAuth client in Google Cloud Console. |
| Protected endpoints return `401` | The request has no valid session cookie. Sign in through the frontend first. |

---

## License

No license file is included in this project.

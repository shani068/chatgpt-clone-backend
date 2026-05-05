# My Backend Template

Production-ready Express.js + TypeScript backend template with authentication, caching, validation, and API documentation built-in.

## Stack

| Technology  | Purpose                       |
| ----------- | ----------------------------- |
| Express.js  | HTTP framework                |
| TypeScript  | Type safety                   |
| Prisma      | ORM + migrations              |
| PostgreSQL  | Database                      |
| Better Auth | Authentication                |
| ioredis     | Caching + queues              |
| Zod v3      | Validation                    |
| Winston     | Logging                       |
| Scalar UI   | API documentation             |
| Helmet      | HTTP security headers         |
| CORS        | Cross-origin resource sharing |

## Features

- ✅ Module-based folder structure
- ✅ Better Auth — email/password + session management
- ✅ Zod v4 validation on all endpoints
- ✅ Redis caching with type-safe key helpers
- ✅ Winston structured logging (dev + production)
- ✅ Scalar API docs at `/docs`
- ✅ Global error handler with Prisma error codes
- ✅ Rate limiting
- ✅ ESLint + Prettier — production-grade rules
- ✅ asyncHandler — no try/catch boilerplate
- ✅ Helmet + CORS security middleware

## Getting Started

```bash
git clone https://github.com/shani068/my-backend
cd my-backend
bun install
cp .env.example .env
# fill in the required values in .env
bunx prisma generate
bunx prisma migrate dev
bun run dev
```

## Environment Variables

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
BETTER_AUTH_SECRET=     # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379
```

## Scripts

| Command            | Description                 |
| ------------------ | --------------------------- |
| `bun run dev`      | Development with hot reload |
| `bun run build`    | Compile TypeScript          |
| `bun start`        | Production server           |
| `bun run lint`     | ESLint check                |
| `bun run lint:fix` | Auto fix lint errors        |
| `bun run format`   | Prettier format             |
| `bun run check`    | Run lint + format together  |

## API Endpoints

| Method | Route                   | Auth | Description    |
| ------ | ----------------------- | ---- | -------------- |
| GET    | /health                 | No   | Health check   |
| GET    | /docs                   | No   | Scalar API UI  |
| GET    | /openapi.json           | No   | OpenAPI spec   |
| POST   | /api/auth/sign-up/email | No   | Register       |
| POST   | /api/auth/sign-in/email | No   | Login          |
| GET    | /api/v1/users/me        | Yes  | Get profile    |
| PUT    | /api/v1/users/me        | Yes  | Update profile |

> Auth routes (`/api/auth/*`) are handled by Better Auth directly.

## Project Structure

```
src/
├── modules/          # Feature-based modules
│   ├── auth/         # handler, service, routes, validator (Better Auth integration)
│   └── users/        # handler, service, routes, validator
├── config/           # env, database, redis, auth, swagger, logger
├── middleware/        # auth, error, rateLimiter
├── routes/           # centralized route registration
├── types/            # express.d.ts, jwt.types.ts, global TypeScript types
└── utils/            # ApiError, ApiResponse, asyncHandler, cache
```

## License

MIT

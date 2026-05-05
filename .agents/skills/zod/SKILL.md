---
name: zod-v4
description: Use when writing, reviewing, or fixing any Zod schema, validation, or error handling code. Ensures latest Zod v4 APIs are used instead of outdated v3 patterns.
---

# Zod v4 — Dynamic Skill

## FIRST STEP — Always fetch latest docs before writing any Zod code

Run this script to get the latest Zod docs (cached 24h):

```bash
# Fetch all Zod v4 docs
bash .claude/skills/zod-v4/scripts/fetch-docs.sh

# Fetch specific page
bash .claude/skills/zod-v4/scripts/fetch-docs.sh migration
bash .claude/skills/zod-v4/scripts/fetch-docs.sh api

# Force refresh (bypass cache)
bash .claude/skills/zod-v4/scripts/fetch-docs.sh --fresh
```

**Always fetch migration page before writing any schema** — it contains all v3→v4 breaking changes.

---

## Quick Reference — Most Common Breaking Changes

These are the highest-impact changes. Verify latest details by fetching docs above.

### Import

```ts
import { z } from "zod"; // package root now exports v4 directly
```

### Error params — NEVER use v3 style

```ts
// ❌ v3 — FORBIDDEN
z.string({ required_error: "...", invalid_type_error: "..." });
z.string().min(5, { message: "..." });
result.error.errors; // .errors removed

// ✅ v4 — ALWAYS use this
z.string({ error: (issue) => (issue.input === undefined ? "Required" : "Invalid") });
z.string().min(5, { error: "Too short" });
result.error.issues; // use .issues
```

### Deprecated APIs

```ts
// ❌ All deprecated in v4
.merge()        → use .extend()
.superRefine()  → use .check()
.passthrough()  → use z.object({}, { unknown: "passthrough" })
.strict()       → use z.object({}, { unknown: "reject" })
.strip()        → use z.object({}, { unknown: "strip" }) // default

// ❌ Prefer top-level in v4
z.string().email() → z.email()
z.string().url()   → z.url()
z.string().uuid()  → z.uuid()

// ❌ v3 integer
z.number().int()   → z.int()  // v4 dedicated type
```

---

## Rules — Never Skip

1. **Always run fetch-docs.sh first** — never rely on memorized Zod syntax
2. Use `error` param — never `message`, `required_error`, `invalid_type_error`
3. Use `.issues` on ZodError — never `.errors`
4. Use `.extend()` — never `.merge()`
5. Use `.check()` — never `.superRefine()`
6. Use `z.int()`, `z.email()`, `z.url()` — prefer top-level types
7. If fetch fails — use cached version in `.cache/` folder, never guess

---

## Cache Location

Fetched docs are stored in `.claude/skills/zod-v4/.cache/` — auto-refreshed every 24h.
Cache can be cleared manually: `rm -rf .claude/skills/zod-v4/.cache/`

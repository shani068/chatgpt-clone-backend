// ============================================================
//  Production-grade ESLint Config
//  Covers:
//   - TypeScript strict rules
//   - Naming conventions
//   - Import order / sorting
//   - No unused vars / dead code
//   - Security (no eval, no secrets)
//   - Async/await best practices
//   - Prettier formatting
// ============================================================

import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import security from "eslint-plugin-security";
import noSecrets from "eslint-plugin-no-secrets";
import prettier from "eslint-config-prettier";

export default [
  // ── Files to lint ────────────────────────────────────────────────────────
  {
    files: ["src/**/*.ts"],
    ignores: ["node_modules/**", "dist/**", "*.js", "*.mjs"],

    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },

    plugins: {
      "@typescript-eslint": tseslint,
      import: importPlugin,
      security,
      "no-secrets": noSecrets,
    },

    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
      },
    },

    rules: {
      // ════════════════════════════════════════════════════════════════════
      //  TYPESCRIPT — STRICT RULES
      // ════════════════════════════════════════════════════════════════════

      // No implicit any — every variable must be typed
      "@typescript-eslint/no-explicit-any": "error",

      // No unused variables (leading _ allowed for intentional ignores)
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Prefer type imports — keeps runtime bundle clean
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      // No non-null assertions (!) — handle nulls explicitly
      "@typescript-eslint/no-non-null-assertion": "error",

      // No unnecessary type assertions
      "@typescript-eslint/no-unnecessary-type-assertion": "error",

      // Prefer nullish coalescing (??) over || for null/undefined checks
      "@typescript-eslint/prefer-nullish-coalescing": "error",

      // Prefer optional chaining (?.) over && chains
      "@typescript-eslint/prefer-optional-chain": "error",

      // No floating promises — every promise must be awaited or handled
      "@typescript-eslint/no-floating-promises": "error",

      // No misused promises — e.g. if (asyncFn()) instead of if (await asyncFn())
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],

      // Require await in async functions — no pointless async
      "@typescript-eslint/require-await": "error",

      // Prefer await instead of .then()/.catch() chains
      "@typescript-eslint/prefer-promise-reject-errors": "error",

      // No useless empty export {} — keep modules clean
      "@typescript-eslint/no-useless-empty-export": "error",

      // Consistent return type on functions
      "@typescript-eslint/consistent-return": "off", // too strict for Express handlers

      // No unsafe member access on any-typed values
      "@typescript-eslint/no-unsafe-member-access": "error",

      // No unsafe assignment from any
      "@typescript-eslint/no-unsafe-assignment": "error",

      // No unsafe function calls on any
      "@typescript-eslint/no-unsafe-call": "error",

      // No unsafe return of any
      "@typescript-eslint/no-unsafe-return": "error",

      // Enforce === over ==
      eqeqeq: ["error", "always"],

      // ════════════════════════════════════════════════════════════════════
      //  NAMING CONVENTIONS
      // ════════════════════════════════════════════════════════════════════

      "@typescript-eslint/naming-convention": [
        "error",

        // Default — camelCase for everything
        {
          selector: "default",
          format: ["camelCase"],
          leadingUnderscore: "allow", // _req, _res, _next allowed
          trailingUnderscore: "forbid",
        },

        // Variables — camelCase or UPPER_CASE constants
        {
          selector: "variable",
          format: ["camelCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },

        // Boolean variables — must be prefixed with is/has/should/can/did/will
        {
          selector: "variable",
          types: ["boolean"],
          format: ["camelCase"],
          prefix: ["is", "has", "should", "can", "did", "will", "are"],
        },

        // Functions — camelCase only
        {
          selector: "function",
          format: ["camelCase"],
        },

        // Parameters — camelCase, allow leading underscore for unused params
        {
          selector: "parameter",
          format: ["camelCase"],
          leadingUnderscore: "allow",
        },

        // Classes — PascalCase
        {
          selector: "class",
          format: ["PascalCase"],
        },

        // Interfaces — PascalCase, NO "I" prefix (modern TS convention)
        {
          selector: "interface",
          format: ["PascalCase"],
          custom: {
            regex: "^I[A-Z]",
            match: false, // forbid IUserInterface style
          },
        },

        // Type aliases — PascalCase
        {
          selector: "typeAlias",
          format: ["PascalCase"],
        },

        // Generic type params — must start with T (TUser, TResponse)
        {
          selector: "typeParameter",
          format: ["PascalCase"],
          prefix: ["T"],
        },

        // Enum members — UPPER_CASE
        {
          selector: "enumMember",
          format: ["UPPER_CASE"],
        },

        // Object literal properties — camelCase
        // (snake_case allowed for DB/API response fields)
        {
          selector: "objectLiteralProperty",
          format: ["camelCase", "snake_case", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
      ],

      // ════════════════════════════════════════════════════════════════════
      //  IMPORT ORDER / SORTING
      // ════════════════════════════════════════════════════════════════════

      // No duplicate imports
      "import/no-duplicates": "error",

      // No default exports from modules (named exports are more refactor-safe)
      // "import/no-default-export": "error", // too strict for Express routers

      // Enforce import order:
      // 1. Node built-ins (path, fs)
      // 2. External packages (express, prisma)
      // 3. Internal aliases (@/...)
      // 4. Relative imports (../utils)
      "import/order": [
        "error",
        {
          groups: [
            "builtin", // node:path, node:fs
            "external", // express, prisma, zod
            "internal", // @/* path aliases
            "parent", // ../../utils
            "sibling", // ./auth.service
            "index", // ./index
            "type", // import type {}
          ],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],

      // No circular imports — prevents hard-to-debug issues
      "import/no-cycle": ["error", { maxDepth: 5 }],

      // No self-imports
      "import/no-self-import": "error",

      // No unresolved imports
      "import/no-unresolved": "off", // TypeScript handles this

      // ════════════════════════════════════════════════════════════════════
      //  DEAD CODE / UNUSED
      // ════════════════════════════════════════════════════════════════════

      // No unused expressions (e.g. `a && b` without doing anything)
      "no-unused-expressions": ["error", { allowShortCircuit: true, allowTernary: true }],

      // No unreachable code after return/throw
      "no-unreachable": "error",

      // No empty block statements
      "no-empty": ["error", { allowEmptyCatch: false }],

      // No empty functions
      "@typescript-eslint/no-empty-function": [
        "error",
        { allow: ["arrowFunctions"] }, // allow empty arrow fn for stubs
      ],

      // No commented-out code (warn, not error — devs sometimes need temp comments)
      // Skipping this as it's too noisy

      // No console.log in production — use proper logger
      "no-console": [
        "error",
        { allow: ["warn", "error", "info"] }, // console.warn/error/info allowed
      ],

      // ════════════════════════════════════════════════════════════════════
      //  SECURITY RULES
      // ════════════════════════════════════════════════════════════════════

      // No eval() — XSS / code injection risk
      "no-eval": "error",

      // No implied eval (setTimeout("code", 100))
      "no-implied-eval": "error",

      // No new Function() — same as eval
      "@typescript-eslint/no-implied-eval": "error",

      // Security plugin rules
      "security/detect-object-injection": "warn", // obj[userInput] — potential injection
      "security/detect-non-literal-regexp": "warn", // RegExp(userInput) — ReDoS risk
      "security/detect-non-literal-fs-filename": "warn", // fs.readFile(userInput)
      "security/detect-possible-timing-attacks": "error", // == on secrets (timing attack)
      "security/detect-unsafe-regex": "error", // catastrophic backtracking regex

      // No hardcoded secrets — API keys, passwords, tokens in code
      "no-secrets/no-secrets": [
        "error",
        {
          tolerance: 4.0, // entropy threshold — lower = stricter
          additionalRegexes: {
            "Potential JWT": "ey[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+",
          },
        },
      ],

      // ════════════════════════════════════════════════════════════════════
      //  ASYNC / AWAIT BEST PRACTICES
      // ════════════════════════════════════════════════════════════════════

      // No return await — useless extra microtask tick
      // Exception: inside try/catch you MUST use return await
      "@typescript-eslint/return-await": ["error", "in-try-catch"],

      // Prefer async/await over raw Promise chains
      // (already enforced by no-floating-promises above)

      // No async function that has no await inside
      "@typescript-eslint/require-await": "error",

      // Catch clause must type the error (err: unknown)
      "@typescript-eslint/use-unknown-in-catch-callback-variable": "error",

      // Disallow .then() when async/await is available in scope
      "prefer-promise-over-callback": "off", // not a standard rule

      // No top-level await outside modules
      // (handled by tsconfig target)

      // ════════════════════════════════════════════════════════════════════
      //  GENERAL BEST PRACTICES
      // ════════════════════════════════════════════════════════════════════

      // Prefer const over let where variable is never reassigned
      "prefer-const": "error",

      // No var — use let/const
      "no-var": "error",

      // No magic numbers — define named constants
      "no-magic-numbers": [
        "warn",
        {
          ignore: [-1, 0, 1, 2, 10, 100, 1000],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          enforceConst: true,
        },
      ],

      // Prefer template literals over string concatenation
      "prefer-template": "error",

      // No throw of non-Error objects — always throw new Error()
      "@typescript-eslint/no-throw-literal": "error",

      // Consistent error handling — use Error objects
      "no-throw-literal": "off", // replaced by @typescript-eslint version above
    },
  },

  // ── Prettier — must be LAST (disables conflicting formatting rules) ───────
  prettier,
];

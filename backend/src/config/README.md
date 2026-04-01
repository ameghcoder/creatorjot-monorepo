# src/config/

Structured configuration objects built from environment variables. Provides typed, validated access to all runtime settings.

## Relationship Between `env.ts` and `config/`

There are two layers of environment handling:

| File | Role |
|------|------|
| `src/utils/env.ts` | **Single source of truth** for loading `.env.local` and exposing raw env vars as a typed `env` object |
| `src/config/index.ts` | Builds structured config objects (grouped by domain) from `process.env` |

`src/utils/env.ts` calls `dotenv.config()` and is imported early in the startup sequence. `src/config/index.ts` currently also calls `dotenv.config()` independently — this duplication is tracked for cleanup (task 5.1). After the fix, `config/index.ts` will read from `process.env` only, relying on `env.ts` to have already loaded the `.env.local` file.

**Rule**: always import `env` from `src/utils/env.ts` for direct env var access. Use `config` from `src/config/index.ts` when you need a structured, domain-grouped config object (e.g., `config.queue.pgBoss.schema`).

## Files

### `index.ts`
Exports `loadConfig()` and the `config` singleton. Groups settings into domains:

- `config.queue` — retry limits, priority scores, pg-boss settings, worker concurrency
- `config.database` — connection string, pool settings
- `config.cache` — TTL and max size for user tier and transcript caches
- `config.ai` — model names, retry limits, timeouts, cost tracking settings
- `config.notification` — WebSocket and email settings
- `config.supabase` — URL and keys
- `config.transcriptApi` — external transcript API key and base URL

### `validation.ts`
Validates the loaded config at startup. Called by `src/server.ts` before the server starts.

Checks:
- Required env vars are present (`SUPABASE_URL`, `DATABASE_URL`, `TRANSCRIPT_COM_API`, etc.)
- `DATABASE_URL` starts with `postgresql://`
- API key formats (Gemini starts with `AI`, Claude starts with `sk-ant-`)
- Numeric ranges for queue, pool, cache, and AI settings

Throws `ValidationError` with a list of all failures if any check fails. The server will not start with an invalid config.

### `cache.ts`
Cache configuration types and defaults.

## Adding a New Config Value

1. Add the env var to `src/utils/env.ts` with a sensible default
2. Add it to the appropriate domain interface in `src/config/index.ts` (e.g., `QueueConfig`, `AIConfig`)
3. Read it in `loadConfig()` using the appropriate `parseIntEnv` / `parseBoolEnv` / `parseFloatEnv` helper
4. If the value is required or has constraints, add a validation check in `src/config/validation.ts`
5. Document the new env var in `.env.local` (or a `.env.example` file)

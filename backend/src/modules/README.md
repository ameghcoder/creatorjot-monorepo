# src/modules/

Feature-oriented modules. Each subfolder owns a specific domain and contains only the files needed for that domain.

## Naming Convention

Files follow the pattern `<domain>.<action>.ts`:

| File | Domain | Action |
|------|--------|--------|
| `db.transcript.ts` | transcript | database operations |
| `db.payloads.ts` | payloads | database operations |
| `api.transcript.ts` | transcript | external API call |
| `video.route.ts` | video | HTTP route handler |
| `jobs.route.ts` | jobs | HTTP route handler |
| `health.route.ts` | health | HTTP route handler |

This convention makes it easy to find where a specific operation lives without reading file contents.

## Subfolders

### `db/`
Database access functions for Supabase tables. Each file handles one table or closely related set of tables.

- `db.transcript.ts` — CRUD for the `transcript` table. Also contains `checkAndCreate` (to be renamed `getOrFetchTranscript`), which checks the DB cache and falls back to the external API if the transcript is missing.
- `db.payloads.ts` — insert for the `payloads` table, with Zod validation before the DB write.

**Rule**: DB files should only contain Supabase queries and data transformation. No HTTP response logic, no queue operations.

### `external/`
Calls to third-party APIs outside of Supabase.

- `api.transcript.ts` — fetches transcript data from the external transcript API, saves the file to Supabase Storage, and saves the record to the `transcript` table.

### `jobs/`
HTTP route handlers for job management.

- `jobs.route.ts` — POST/GET/DELETE endpoints for transcript jobs, generation jobs, batch jobs, and job metrics. Mounted at `/api/v1/jobs`.
- `health.route.ts` — GET `/health` endpoint with queue statistics.

### `storage/`
Supabase Storage operations.

- `storage.saveTranscriptFile.ts` — uploads transcript JSON files to the `transcripts` storage bucket and returns the public URL.

### `video/`
HTTP route handler for the main video submission endpoint.

- `video.route.ts` — POST `/api/v1/yt`. The primary entry point for the application. Handles the full 8-step flow: validate → extract ID → resolve session → save payload → get/fetch transcript → enqueue transcript job → enqueue generation jobs → respond.
- `video.schema.ts` — Zod schema for the POST `/api/v1/yt` request body.
- `video.repository.ts` — additional DB queries specific to the video domain.

## Adding a New Module

1. Create a new subfolder named after the domain (e.g., `src/modules/analytics/`)
2. Follow the `<domain>.<action>.ts` naming convention
3. Keep HTTP logic in `*.route.ts` files and DB logic in `db.*.ts` files
4. Mount new routes in `src/app.ts`

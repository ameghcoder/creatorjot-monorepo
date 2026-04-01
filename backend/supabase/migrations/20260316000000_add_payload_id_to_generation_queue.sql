-- ═══════════════════════════════════════════════════════════
-- Migration: Add payload_id and generation_id to generation_queue
-- Created at: 2026-03-16
-- ═══════════════════════════════════════════════════════════

-- payload_id links the generation job back to the originating payload
-- (needed to insert into generations table which requires payload_id NOT NULL)
ALTER TABLE "public"."generation_queue"
ADD COLUMN IF NOT EXISTS "payload_id" uuid REFERENCES "public"."payloads"(id) ON DELETE CASCADE;

COMMENT ON COLUMN "public"."generation_queue"."payload_id" IS
    'Originating payload for this generation job. Used to link the completed generation row.';

-- generation_id is set once the generation row is created on completion
ALTER TABLE "public"."generation_queue"
ADD COLUMN IF NOT EXISTS "generation_id" uuid REFERENCES "public"."generations"(id) ON DELETE SET NULL;

COMMENT ON COLUMN "public"."generation_queue"."generation_id" IS
    'ID of the completed generation row. Populated after successful content generation.';

CREATE INDEX IF NOT EXISTS "idx_generation_queue_payload_id"
    ON "public"."generation_queue" ("payload_id");

-- ═══════════════════════════════════════════════════════════
-- Migration: Create transcript storage bucket
-- Created at: 2026-03-04T00:00:00+00:00
-- ═══════════════════════════════════════════════════════════
--
-- PURPOSE:
--   Creates a Supabase Storage bucket for storing YouTube video
--   transcript files with appropriate RLS policies.
--
-- BUCKET CONFIGURATION:
--   - Name: transcript
--   - Public: true (files are publicly readable)
--   - File size limit: 50MB (configurable)
--   - Allowed MIME types: text/plain, text/vtt, application/json
--
-- RLS POLICIES:
--   - SELECT: Public (anyone can read)
--   - INSERT: service_role only
--   - UPDATE: service_role only
--   - DELETE: service_role only
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- 1. CREATE STORAGE BUCKET
-- ───────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transcript',
  'transcript',
  true,  -- Public bucket (files are publicly readable)
  52428800,  -- 50MB file size limit
  ARRAY['text/plain', 'text/vtt', 'application/json', 'text/csv']
)
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────
-- 2. DROP EXISTING POLICIES (if any)
-- ───────────────────────────────────────────────────────────

-- Drop policies if they exist (safe to run multiple times)
DROP POLICY IF EXISTS "transcript_public_select" ON storage.objects;
DROP POLICY IF EXISTS "transcript_service_insert" ON storage.objects;
DROP POLICY IF EXISTS "transcript_service_update" ON storage.objects;
DROP POLICY IF EXISTS "transcript_service_delete" ON storage.objects;

-- ───────────────────────────────────────────────────────────
-- 3. RLS POLICY: PUBLIC SELECT (READ)
-- ───────────────────────────────────────────────────────────

-- Allow anyone to read/download transcript files
-- This is useful for public sharing of transcripts
CREATE POLICY "transcript_public_select"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'transcript');


-- ───────────────────────────────────────────────────────────
-- 4. RLS POLICY: SERVICE_ROLE INSERT
-- ───────────────────────────────────────────────────────────

-- Only service_role (backend) can upload transcript files
CREATE POLICY "transcript_service_insert"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'transcript');


-- ───────────────────────────────────────────────────────────
-- 5. RLS POLICY: SERVICE_ROLE UPDATE
-- ───────────────────────────────────────────────────────────

-- Only service_role can update transcript files
CREATE POLICY "transcript_service_update"
ON storage.objects
FOR UPDATE
TO service_role
USING (bucket_id = 'transcript')
WITH CHECK (bucket_id = 'transcript');


-- ───────────────────────────────────────────────────────────
-- 6. RLS POLICY: SERVICE_ROLE DELETE
-- ───────────────────────────────────────────────────────────

-- Only service_role can delete transcript files
CREATE POLICY "transcript_service_delete"
ON storage.objects
FOR DELETE
TO service_role
USING (bucket_id = 'transcript');


-- ───────────────────────────────────────────────────────────
-- 7. VERIFICATION QUERY (for testing)
-- ───────────────────────────────────────────────────────────

-- You can run this query to verify the bucket was created:
-- SELECT * FROM storage.buckets WHERE id = 'transcript';

-- You can run this query to verify the policies were created:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE 'transcript%';

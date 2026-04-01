-- Drop legacy columns from transcript table
ALTER TABLE transcript
  DROP COLUMN IF EXISTS short_summary,
  DROP COLUMN IF EXISTS key_points,
  DROP COLUMN IF EXISTS summary_generated_at;

-- Add post_angle_index to generation_queue (replaces focal_key_point_sequence)
ALTER TABLE generation_queue
  ADD COLUMN IF NOT EXISTS post_angle_index INTEGER DEFAULT NULL;

-- Drop the old focal_key_point_sequence column
ALTER TABLE generation_queue
  DROP COLUMN IF EXISTS focal_key_point_sequence;

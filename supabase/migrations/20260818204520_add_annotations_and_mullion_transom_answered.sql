/*
# Add annotations table and mullion/transom answered flags

1. New Tables
- `annotations` — text annotations placed on the drawing canvas
  - `id` (uuid, primary key)
  - `window_id` (uuid, foreign key to windows)
  - `text` (text, the annotation text)
  - `x` (numeric, x pixel position on the drawing)
  - `y` (numeric, y pixel position on the drawing)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

2. Modified Tables
- `windows` — add `mullions_answered` (boolean, nullable) and `transoms_answered` (boolean, nullable)
  - These track whether the surveyor has explicitly answered "Yes" or "None" for mullions and transoms
  - null means the question has not been answered yet

3. Security
- Enable RLS on `annotations`
- Allow anon + authenticated CRUD (single-tenant app, no sign-in)
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'windows' AND column_name = 'mullions_answered') THEN
    ALTER TABLE windows ADD COLUMN mullions_answered boolean;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'windows' AND column_name = 'transoms_answered') THEN
    ALTER TABLE windows ADD COLUMN transoms_answered boolean;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  window_id uuid NOT NULL REFERENCES windows(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  x numeric NOT NULL DEFAULT 0,
  y numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_annotations" ON annotations;
CREATE POLICY "anon_select_annotations" ON annotations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_annotations" ON annotations;
CREATE POLICY "anon_insert_annotations" ON annotations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_annotations" ON annotations;
CREATE POLICY "anon_update_annotations" ON annotations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_annotations" ON annotations;
CREATE POLICY "anon_delete_annotations" ON annotations FOR DELETE
  TO anon, authenticated USING (true);

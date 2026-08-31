/*
# Window Surveyor App — Core Schema (Prototype V1)

Creates the relational data structure for a professional window surveying tool.
Single-tenant for the prototype (no auth screen): all tables allow anon + authenticated
CRUD so the anon-key frontend can operate. The schema is designed so a user_id /
company_id can be layered on later without reshaping the tables.

## Tables
1. `surveys` — one per job. Holds customer/job details entered once per survey.
2. `windows` — each window in a survey, ordered by `position`.
3. `window_measurements` — PL/BL/MS, tolerances, overrides, site diagonal, fascia drop.
   One row per window (unique window_id).
4. `buried_measurements` — In/Out per side (left/right/top/bottom). One row per window.
5. `window_specifications` — cill, glass, hinge, trickle vent, add-ons, georgian, trims, notes.
   One row per window.
6. `mullion_positions` — left-to-right mullion offsets (mm), ordered.
7. `transom_positions` — top-down transom offsets (mm), ordered.
8. `drawings` — freehand drawing stored as a PNG data URL. One row per window.
9. `photos` — window photographs stored as resized JPEG data URLs, with category + caption.

## Security
- RLS enabled on every table.
- Policies grant full CRUD to `anon, authenticated` because this is a single-tenant
  prototype with no sign-in screen (data is intentionally shared on the device).
- When multi-user/auth is added later, these policies should be replaced with
  ownership predicates scoped through `surveys.user_id`.
*/

CREATE TABLE IF NOT EXISTS surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text,
  contract_number text,
  address text,
  postcode text,
  surveyor_name text,
  survey_date date,
  profile_colour text,
  furniture_colour text,
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 1,
  location text,
  aperture_material text,
  aperture_material_other text,
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS window_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  window_id uuid NOT NULL UNIQUE REFERENCES windows(id) ON DELETE CASCADE,
  pl_width numeric,
  pl_height numeric,
  bl_width numeric,
  bl_height numeric,
  width_tolerance numeric NOT NULL DEFAULT 10,
  height_tolerance numeric NOT NULL DEFAULT 10,
  ms_width_override numeric,
  ms_height_override numeric,
  ms_width_manual boolean NOT NULL DEFAULT false,
  ms_height_manual boolean NOT NULL DEFAULT false,
  site_diagonal numeric,
  fascia_drop numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS buried_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  window_id uuid NOT NULL UNIQUE REFERENCES windows(id) ON DELETE CASCADE,
  left_in numeric,
  left_out numeric,
  right_in numeric,
  right_out numeric,
  top_in numeric,
  top_out numeric,
  bottom_in numeric,
  bottom_out numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS window_specifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  window_id uuid NOT NULL UNIQUE REFERENCES windows(id) ON DELETE CASCADE,
  cill_type text,
  cill_other text,
  cill_length numeric,
  glass text,
  toughened boolean,
  hinge_type text,
  trickle_vent_location text,
  trickle_vent_other text,
  floor_to_glass numeric,
  coupler text,
  georgian_type text,
  bar_width text,
  georgian_colour text,
  lead_bevel_details text,
  trims_internal_cill text,
  site_notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mullion_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  window_id uuid NOT NULL REFERENCES windows(id) ON DELETE CASCADE,
  position_index int NOT NULL DEFAULT 0,
  value_mm numeric NOT NULL
);

CREATE TABLE IF NOT EXISTS transom_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  window_id uuid NOT NULL REFERENCES windows(id) ON DELETE CASCADE,
  position_index int NOT NULL DEFAULT 0,
  value_mm numeric NOT NULL
);

CREATE TABLE IF NOT EXISTS drawings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  window_id uuid NOT NULL UNIQUE REFERENCES windows(id) ON DELETE CASCADE,
  image_data text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  window_id uuid NOT NULL REFERENCES windows(id) ON DELETE CASCADE,
  category text,
  caption text,
  image_data text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_windows_survey ON windows(survey_id);
CREATE INDEX IF NOT EXISTS idx_mullions_window ON mullion_positions(window_id);
CREATE INDEX IF NOT EXISTS idx_transoms_window ON transom_positions(window_id);
CREATE INDEX IF NOT EXISTS idx_photos_window ON photos(window_id);

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_surveys_touch ON surveys;
CREATE TRIGGER trg_surveys_touch BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_windows_touch ON windows;
CREATE TRIGGER trg_windows_touch BEFORE UPDATE ON windows
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_measurements_touch ON window_measurements;
CREATE TRIGGER trg_measurements_touch BEFORE UPDATE ON window_measurements
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_buried_touch ON buried_measurements;
CREATE TRIGGER trg_buried_touch BEFORE UPDATE ON buried_measurements
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_spec_touch ON window_specifications;
CREATE TRIGGER trg_spec_touch BEFORE UPDATE ON window_specifications
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE window_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE buried_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE window_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE mullion_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transom_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION grant_anon_crud(tbl text) RETURNS void AS $$
BEGIN
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', tbl || '_select', tbl);
  EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO anon, authenticated USING (true);', tbl || '_select', tbl);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', tbl || '_insert', tbl);
  EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO anon, authenticated WITH CHECK (true);', tbl || '_insert', tbl);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', tbl || '_update', tbl);
  EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);', tbl || '_update', tbl);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', tbl || '_delete', tbl);
  EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO anon, authenticated USING (true);', tbl || '_delete', tbl);
END;
$$ LANGUAGE plpgsql;

SELECT grant_anon_crud('surveys');
SELECT grant_anon_crud('windows');
SELECT grant_anon_crud('window_measurements');
SELECT grant_anon_crud('buried_measurements');
SELECT grant_anon_crud('window_specifications');
SELECT grant_anon_crud('mullion_positions');
SELECT grant_anon_crud('transom_positions');
SELECT grant_anon_crud('drawings');
SELECT grant_anon_crud('photos');

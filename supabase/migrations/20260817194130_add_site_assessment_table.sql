/*
# Add site_assessment table

1. Purpose
   Stores the Survey Site Assessment (top-sheet) data at the survey/contract level.
   This is NOT per-window — one row per survey.

2. New Table: site_assessment
   - id (uuid PK)
   - survey_id (uuid FK -> surveys.id ON DELETE CASCADE)
   - Product quantities: windows, upvc_doors, composite_doors, double_doors, patio_doors (int)
   - kitchen_form (text: 'yes'/'no'/null)
   - shaped_frames (text), box_sash (text), other (text)
   - bay_windows (text: '2-part'/'3-part'/'4-part'/'5-part'/null)
   - Roofline: roofline_works ('yes'/'no'/null), fascia_size (text), soffit_depth (text), linear_metres (text)
   - Access: good_access_internally, good_access_externally, access_to_rear (yes/no/null)
   - access_solution_required (yes/no/null), access_solution_comments (text)
   - suspect_material (yes/no/null), suspect_material_comments (text)
   - overhead_cables (yes/no/null), overhead_cables_comments (text)
   - parking_restrictions (yes/no/null), parking_comments (text)
   - full_elevation_photos (yes/no/null), internal_photos (yes/no/null), materials_sheet_completed (yes/no/null)
   - surveyor_comments (text)
   - updated_at (timestamptz)

3. Security
   - Enable RLS
   - Single-tenant no-auth app: anon + authenticated full CRUD (data is intentionally shared)
*/

CREATE TABLE IF NOT EXISTS site_assessment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  windows int,
  upvc_doors int,
  composite_doors int,
  double_doors int,
  patio_doors int,
  kitchen_form text,
  shaped_frames text,
  box_sash text,
  other text,
  bay_windows text,
  roofline_works text,
  fascia_size text,
  soffit_depth text,
  linear_metres text,
  good_access_internally text,
  good_access_externally text,
  access_to_rear text,
  access_solution_required text,
  access_solution_comments text,
  suspect_material text,
  suspect_material_comments text,
  overhead_cables text,
  overhead_cables_comments text,
  parking_restrictions text,
  parking_comments text,
  full_elevation_photos text,
  internal_photos text,
  materials_sheet_completed text,
  surveyor_comments text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_assessment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_site_assessment" ON site_assessment;
CREATE POLICY "anon_select_site_assessment" ON site_assessment FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_site_assessment" ON site_assessment;
CREATE POLICY "anon_insert_site_assessment" ON site_assessment FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_site_assessment" ON site_assessment;
CREATE POLICY "anon_update_site_assessment" ON site_assessment FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_site_assessment" ON site_assessment;
CREATE POLICY "anon_delete_site_assessment" ON site_assessment FOR DELETE
  TO anon, authenticated USING (true);

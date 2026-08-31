/*
# Add ventilation and floor area columns

Adds per-window ventilation fields to window_specifications:
- room_width, room_depth (numeric, metres) — room dimensions
- floor_area (numeric, m²) — calculated room width × depth
- opening_angle_type (text) — purge ventilation opening type
- purge_required_area (numeric, m²) — calculated required purge opening area
- actual_opening_area (numeric, m²) — surveyor-entered total clear opening area
- trickle_vent_ea (numeric, mm²) — trickle vent equivalent area for this window
- required_bg_vent_ea (numeric, mm²) — required background ventilation EA (surveyor-set)
- proposed_trickle_ea (numeric, mm²) — proposed/existing trickle vent EA total

Adds to site_assessment:
- bay_windows_other (text) — free-text description when bay_windows = 'other'

No security changes — tables already have RLS with anon+authenticated CRUD.
*/

ALTER TABLE window_specifications
  ADD COLUMN IF NOT EXISTS room_width numeric,
  ADD COLUMN IF NOT EXISTS room_depth numeric,
  ADD COLUMN IF NOT EXISTS floor_area numeric,
  ADD COLUMN IF NOT EXISTS opening_angle_type text,
  ADD COLUMN IF NOT EXISTS purge_required_area numeric,
  ADD COLUMN IF NOT EXISTS actual_opening_area numeric,
  ADD COLUMN IF NOT EXISTS trickle_vent_ea numeric,
  ADD COLUMN IF NOT EXISTS required_bg_vent_ea numeric,
  ADD COLUMN IF NOT EXISTS proposed_trickle_ea numeric;

ALTER TABLE site_assessment
  ADD COLUMN IF NOT EXISTS bay_windows_other text;

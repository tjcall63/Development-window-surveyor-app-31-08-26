/*
# Add add-on columns to window_specifications

Adds four columns to store per-side add-on selection:
- addon_left, addon_right, addon_top, addon_bottom (text)

Each stores either 'none', '15', '25', '40', or 'custom|<mm>' for custom values.
No security changes — table already has RLS with anon+authenticated CRUD.
*/

ALTER TABLE window_specifications
  ADD COLUMN IF NOT EXISTS addon_left text,
  ADD COLUMN IF NOT EXISTS addon_right text,
  ADD COLUMN IF NOT EXISTS addon_top text,
  ADD COLUMN IF NOT EXISTS addon_bottom text;

export type SurveyStatus = 'in_progress' | 'completed';
export type WindowStatus = 'in_progress' | 'complete' | 'review_required';
export type ApertureMaterial = 'brick' | 'timber' | 'other';

export interface Survey {
  id: string;
  customer_name: string | null;
  contract_number: string | null;
  address: string | null;
  postcode: string | null;
  surveyor_name: string | null;
  survey_date: string | null;
  profile_colour: string | null;
  furniture_colour: string | null;
  status: SurveyStatus;
  created_at: string;
  updated_at: string;
}

export interface WindowRow {
  id: string;
  survey_id: string;
  position: number;
  location: string | null;
  aperture_material: ApertureMaterial | null;
  aperture_material_other: string | null;
  mullions_answered: boolean | null;
  transoms_answered: boolean | null;
  status: WindowStatus;
  created_at: string;
  updated_at: string;
}

export interface WindowMeasurements {
  id: string;
  window_id: string;
  pl_width: number | null;
  pl_height: number | null;
  bl_width: number | null;
  bl_height: number | null;
  width_tolerance: number;
  height_tolerance: number;
  ms_width_override: number | null;
  ms_height_override: number | null;
  ms_width_manual: boolean;
  ms_height_manual: boolean;
  site_diagonal: number | null;
  fascia_drop: number | null;
  updated_at: string;
}

export interface BuriedMeasurements {
  id: string;
  window_id: string;
  left_in: number | null;
  left_out: number | null;
  right_in: number | null;
  right_out: number | null;
  top_in: number | null;
  top_out: number | null;
  bottom_in: number | null;
  bottom_out: number | null;
  updated_at: string;
}

export interface WindowSpecification {
  id: string;
  window_id: string;
  cill_type: string | null;
  cill_other: string | null;
  cill_length: number | null;
  glass: string | null;
  toughened: boolean | null;
  hinge_type: string | null;
  trickle_vent_location: string | null;
  trickle_vent_other: string | null;
  floor_to_glass: number | null;
  coupler: string | null;
  georgian_type: string | null;
  bar_width: string | null;
  georgian_colour: string | null;
  lead_bevel_details: string | null;
  trims_internal_cill: string | null;
  site_notes: string | null;
  addon_left: string | null;
  addon_right: string | null;
  addon_top: string | null;
  addon_bottom: string | null;
  room_width: number | null;
  room_depth: number | null;
  floor_area: number | null;
  opening_angle_type: string | null;
  purge_required_area: number | null;
  actual_opening_area: number | null;
  trickle_vent_ea: number | null;
  required_bg_vent_ea: number | null;
  proposed_trickle_ea: number | null;
  updated_at: string;
}

export interface MullionPosition {
  id: string;
  window_id: string;
  position_index: number;
  value_mm: number;
}

export interface TransomPosition {
  id: string;
  window_id: string;
  position_index: number;
  value_mm: number;
}

export interface Drawing {
  id: string;
  window_id: string;
  image_data: string | null;
  updated_at: string;
}

export interface Annotation {
  id: string;
  window_id: string;
  text: string;
  x: number;
  y: number;
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: string;
  window_id: string;
  category: string | null;
  caption: string | null;
  image_data: string;
  created_at: string;
  sync_status?: 'pending_upload' | 'synced';
}

export interface FullWindow extends WindowRow {
  measurements?: WindowMeasurements | null;
  buried?: BuriedMeasurements | null;
  specification?: WindowSpecification | null;
  mullions: MullionPosition[];
  transoms: TransomPosition[];
  drawing?: Drawing | null;
  annotations: Annotation[];
  photos: Photo[];
}

export interface SiteAssessment {
  id: string;
  survey_id: string;
  windows: number | null;
  upvc_doors: number | null;
  composite_doors: number | null;
  double_doors: number | null;
  patio_doors: number | null;
  kitchen_form: string | null;
  shaped_frames: string | null;
  box_sash: string | null;
  other: string | null;
  bay_windows: string | null;
  bay_windows_other: string | null;
  roofline_works: string | null;
  fascia_size: string | null;
  soffit_depth: string | null;
  linear_metres: string | null;
  good_access_internally: string | null;
  good_access_externally: string | null;
  access_to_rear: string | null;
  access_solution_required: string | null;
  access_solution_comments: string | null;
  suspect_material: string | null;
  suspect_material_comments: string | null;
  overhead_cables: string | null;
  overhead_cables_comments: string | null;
  parking_restrictions: string | null;
  parking_comments: string | null;
  full_elevation_photos: string | null;
  internal_photos: string | null;
  materials_sheet_completed: string | null;
  surveyor_comments: string | null;
  updated_at: string;
}

export interface FullSurvey extends Survey {
  windows: FullWindow[];
  site_assessment?: SiteAssessment | null;
}

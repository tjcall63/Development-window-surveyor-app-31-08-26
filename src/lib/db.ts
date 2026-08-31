import * as local from './localdb';
import type {
  Survey,
  WindowRow,
  WindowMeasurements,
  BuriedMeasurements,
  WindowSpecification,
  MullionPosition,
  TransomPosition,
  Drawing,
  Annotation,
  Photo,
  SiteAssessment,
  FullSurvey,
  FullWindow,
} from './types';
import type {
  LocalSurvey,
  LocalWindow,
  LocalMeasurements,
  LocalBuried,
  LocalSpec,
  LocalMullion,
  LocalTransom,
  LocalDrawing,
  LocalAnnotation,
  LocalPhoto,
  LocalSiteAssessment,
} from './localdb';

export async function listSurveys(status?: string): Promise<Survey[]> {
  const all = await local.getAll<LocalSurvey>('surveys');
  let filtered = all.filter((s) => !s._deleted);
  if (status) filtered = filtered.filter((s) => s.status === status);
  filtered.sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''));
  return filtered.map(stripLocal);
}

export async function getSurvey(id: string): Promise<FullSurvey | null> {
  const survey = await local.get<LocalSurvey>('surveys', id);
  if (!survey || survey._deleted) return null;
  const windows = await loadWindows(id);
  const siteAssessment = await getSiteAssessment(id);
  return { ...stripLocal(survey), windows, site_assessment: siteAssessment };
}

export async function createSurvey(input: Partial<Survey>): Promise<Survey> {
  const id = local.genId();
  const now = local.nowISO();
  const record: LocalSurvey = {
    id,
    customer_name: input.customer_name ?? null,
    contract_number: input.contract_number ?? null,
    address: input.address ?? null,
    postcode: input.postcode ?? null,
    surveyor_name: input.surveyor_name ?? null,
    survey_date: input.survey_date ?? now.slice(0, 10),
    profile_colour: input.profile_colour ?? null,
    furniture_colour: input.furniture_colour ?? null,
    status: 'in_progress',
    created_at: now,
    updated_at: now,
    _dirty: true,
    _localUpdatedAt: now,
  };
  await local.put('surveys', record);
  return stripLocal(record);
}

export async function updateSurvey(id: string, patch: Partial<Survey>): Promise<void> {
  const existing = await local.get<LocalSurvey>('surveys', id);
  if (!existing) return;
  const now = local.nowISO();
  const updated: LocalSurvey = { ...existing, ...patch, updated_at: now, _dirty: true, _localUpdatedAt: now };
  await local.put('surveys', updated);
}

export async function deleteSurvey(id: string): Promise<void> {
  const existing = await local.get<LocalSurvey>('surveys', id);
  if (!existing) return;
  const now = local.nowISO();
  await local.put('surveys', { ...existing, _deleted: true, _dirty: true, _localUpdatedAt: now });

  const windows = await local.getAll<LocalWindow>('windows');
  for (const w of windows) {
    if (w.survey_id === id) {
      await deleteWindow(w.id);
    }
  }
}

export async function completeSurvey(id: string): Promise<void> {
  await updateSurvey(id, { status: 'completed' });
}

async function loadWindows(surveyId: string): Promise<FullWindow[]> {
  const all = await local.getAll<LocalWindow>('windows');
  const rows = all
    .filter((w) => w.survey_id === surveyId && !w._deleted)
    .sort((a, b) => a.position - b.position);
  if (rows.length === 0) return [];

  const ids = rows.map((w) => w.id);
  const [mAll, bAll, sAll, muAll, trAll, drAll, anAll, phAll] = await Promise.all([
    local.getAll<LocalMeasurements>('window_measurements'),
    local.getAll<LocalBuried>('buried_measurements'),
    local.getAll<LocalSpec>('window_specifications'),
    local.getAll<LocalMullion>('mullion_positions'),
    local.getAll<LocalTransom>('transom_positions'),
    local.getAll<LocalDrawing>('drawings'),
    local.getAll<LocalAnnotation>('annotations'),
    local.getAll<LocalPhoto>('photos'),
  ]);

  const byId = <T extends { window_id: string; _deleted?: boolean }>(arr: T[]) => {
    const map: Record<string, T> = {};
    arr.forEach((r) => { if (!r._deleted) map[r.window_id] = r; });
    return map;
  };
  const groupBy = <T extends { window_id: string; _deleted?: boolean }>(arr: T[]) => {
    const map: Record<string, T[]> = {};
    arr.forEach((r) => { if (!r._deleted) (map[r.window_id] ??= []).push(r); });
    return map;
  };

  const mm = byId(mAll);
  const bb = byId(bAll);
  const ss = byId(sAll);
  const mum = groupBy(muAll);
  const trm = groupBy(trAll);
  const drm = byId(drAll);
  const anm = groupBy(anAll);
  const phm = groupBy(phAll);

  return rows.map((w): FullWindow => ({
    ...stripLocal(w),
    measurements: mm[w.id] ? stripLocal(mm[w.id]) : null,
    buried: bb[w.id] ? stripLocal(bb[w.id]) : null,
    specification: ss[w.id] ? stripLocal(ss[w.id]) : null,
    mullions: (mum[w.id] ?? []).sort((a, b) => a.position_index - b.position_index).map(stripLocal),
    transoms: (trm[w.id] ?? []).sort((a, b) => a.position_index - b.position_index).map(stripLocal),
    drawing: drm[w.id] ? stripLocal(drm[w.id]) : null,
    annotations: (anm[w.id] ?? []).map(stripLocal),
    photos: (phm[w.id] ?? []).map(stripLocal),
  }));
}

export async function loadWindowInline(windowId: string): Promise<FullWindow | null> {
  const w = await local.get<LocalWindow>('windows', windowId);
  if (!w || w._deleted) return null;
  const surveyWindows = await loadWindows(w.survey_id);
  return surveyWindows.find((x) => x.id === windowId) ?? null;
}

export async function loadWindowsInline(windowId: string): Promise<FullWindow | null> {
  return loadWindowInline(windowId);
}

export async function createWindow(surveyId: string, position: number, input: Partial<WindowRow>): Promise<FullWindow> {
  const id = local.genId();
  const now = local.nowISO();
  const record: LocalWindow = {
    id,
    survey_id: surveyId,
    position,
    location: input.location ?? null,
    aperture_material: input.aperture_material ?? null,
    aperture_material_other: input.aperture_material_other ?? null,
    mullions_answered: input.mullions_answered ?? null,
    transoms_answered: input.transoms_answered ?? null,
    status: 'in_progress',
    created_at: now,
    updated_at: now,
    _dirty: true,
    _localUpdatedAt: now,
  };
  await local.put('windows', record);
  return { ...stripLocal(record), measurements: null, buried: null, specification: null, mullions: [], transoms: [], drawing: null, annotations: [], photos: [] };
}

export async function updateWindow(id: string, patch: Partial<WindowRow>): Promise<void> {
  const existing = await local.get<LocalWindow>('windows', id);
  if (!existing) return;
  const now = local.nowISO();
  const updated: LocalWindow = { ...existing, ...patch, updated_at: now, _dirty: true, _localUpdatedAt: now };
  await local.put('windows', updated);
}

export async function deleteWindow(id: string): Promise<void> {
  const existing = await local.get<LocalWindow>('windows', id);
  if (!existing) return;
  const now = local.nowISO();
  await local.put('windows', { ...existing, _deleted: true, _dirty: true, _localUpdatedAt: now });

  const childStores: local.StoreName[] = [
    'window_measurements',
    'buried_measurements',
    'window_specifications',
    'mullion_positions',
    'transom_positions',
    'drawings',
    'annotations',
    'photos',
  ];
  for (const store of childStores) {
    const children = await local.getAll<Record<string, unknown> & local.LocalRecord>(store);
    for (const child of children) {
      if (child.window_id === id && !child._deleted) {
        await local.put(store, { ...child, _deleted: true, _dirty: true, _localUpdatedAt: now });
      }
    }
  }
}

export async function getMeasurements(windowId: string): Promise<WindowMeasurements | null> {
  const all = await local.getAll<LocalMeasurements>('window_measurements');
  const found = all.find((m) => m.window_id === windowId && !m._deleted);
  return found ? stripLocal(found) : null;
}

export async function upsertMeasurements(row: Partial<WindowMeasurements> & { window_id: string }): Promise<WindowMeasurements> {
  const all = await local.getAll<LocalMeasurements>('window_measurements');
  const existing = all.find((m) => m.window_id === row.window_id && !m._deleted);
  const id = existing?.id ?? local.genId();
  const now = local.nowISO();
  const pick = (k: keyof WindowMeasurements): unknown => {
    if (k in row && row[k] !== undefined) return row[k];
    if (existing && k in existing) return existing[k];
    return null;
  };
  const record: LocalMeasurements = {
    id,
    window_id: row.window_id,
    pl_width: pick('pl_width') as number | null,
    pl_height: pick('pl_height') as number | null,
    bl_width: pick('bl_width') as number | null,
    bl_height: pick('bl_height') as number | null,
    width_tolerance: (pick('width_tolerance') as number) ?? 10,
    height_tolerance: (pick('height_tolerance') as number) ?? 10,
    ms_width_override: pick('ms_width_override') as number | null,
    ms_height_override: pick('ms_height_override') as number | null,
    ms_width_manual: (pick('ms_width_manual') as boolean) ?? false,
    ms_height_manual: (pick('ms_height_manual') as boolean) ?? false,
    site_diagonal: pick('site_diagonal') as number | null,
    fascia_drop: pick('fascia_drop') as number | null,
    updated_at: now,
    _dirty: true,
    _localUpdatedAt: now,
  };
  await local.put('window_measurements', record);
  return stripLocal(record);
}

export async function getBuried(windowId: string): Promise<BuriedMeasurements | null> {
  const all = await local.getAll<LocalBuried>('buried_measurements');
  const found = all.find((m) => m.window_id === windowId && !m._deleted);
  return found ? stripLocal(found) : null;
}

export async function upsertBuried(row: Partial<BuriedMeasurements> & { window_id: string }): Promise<BuriedMeasurements> {
  const all = await local.getAll<LocalBuried>('buried_measurements');
  const existing = all.find((m) => m.window_id === row.window_id && !m._deleted);
  const id = existing?.id ?? local.genId();
  const now = local.nowISO();
  const pick = (k: keyof BuriedMeasurements): unknown => {
    if (k in row && row[k] !== undefined) return row[k];
    if (existing && k in existing) return existing[k];
    return null;
  };
  const record: LocalBuried = {
    id,
    window_id: row.window_id,
    left_in: pick('left_in') as number | null,
    left_out: pick('left_out') as number | null,
    right_in: pick('right_in') as number | null,
    right_out: pick('right_out') as number | null,
    top_in: pick('top_in') as number | null,
    top_out: pick('top_out') as number | null,
    bottom_in: pick('bottom_in') as number | null,
    bottom_out: pick('bottom_out') as number | null,
    updated_at: now,
    _dirty: true,
    _localUpdatedAt: now,
  };
  await local.put('buried_measurements', record);
  return stripLocal(record);
}

export async function getSpecification(windowId: string): Promise<WindowSpecification | null> {
  const all = await local.getAll<LocalSpec>('window_specifications');
  const found = all.find((m) => m.window_id === windowId && !m._deleted);
  return found ? stripLocal(found) : null;
}

export async function upsertSpecification(row: Partial<WindowSpecification> & { window_id: string }): Promise<WindowSpecification> {
  const all = await local.getAll<LocalSpec>('window_specifications');
  const existing = all.find((m) => m.window_id === row.window_id && !m._deleted);
  const id = existing?.id ?? local.genId();
  const now = local.nowISO();
  const fields: (keyof WindowSpecification)[] = [
    'cill_type', 'cill_other', 'cill_length', 'glass', 'toughened', 'hinge_type',
    'trickle_vent_location', 'trickle_vent_other', 'floor_to_glass', 'coupler',
    'georgian_type', 'bar_width', 'georgian_colour', 'lead_bevel_details',
    'trims_internal_cill', 'site_notes',
    'addon_left', 'addon_right', 'addon_top', 'addon_bottom',
    'room_width', 'room_depth', 'floor_area', 'opening_angle_type',
    'purge_required_area', 'actual_opening_area', 'trickle_vent_ea',
    'required_bg_vent_ea', 'proposed_trickle_ea',
  ];
  const record: Record<string, unknown> = {
    id,
    window_id: row.window_id,
    updated_at: now,
    _dirty: true,
    _localUpdatedAt: now,
  };
  for (const f of fields) {
    if (f in row && row[f] !== undefined) {
      record[f as string] = row[f];
    } else if (existing && f in existing) {
      record[f as string] = (existing as unknown as Record<string, unknown>)[f as string];
    } else {
      record[f as string] = null;
    }
  }
  await local.put('window_specifications', record as unknown as LocalSpec);
  return stripLocal(record as unknown as LocalSpec);
}

export async function setMullions(windowId: string, values: number[]): Promise<MullionPosition[]> {
  const all = await local.getAll<LocalMullion>('mullion_positions');
  const now = local.nowISO();
  for (const m of all) {
    if (m.window_id === windowId && !m._deleted) {
      await local.put('mullion_positions', { ...m, _deleted: true, _dirty: true, _localUpdatedAt: now });
    }
  }
  const result: MullionPosition[] = [];
  for (let i = 0; i < values.length; i++) {
    const id = local.genId();
    const record: LocalMullion = {
      id,
      window_id: windowId,
      position_index: i,
      value_mm: values[i],
      _dirty: true,
      _localUpdatedAt: now,
    };
    await local.put('mullion_positions', record);
    result.push(stripLocal(record));
  }
  return result;
}

export async function setTransoms(windowId: string, values: number[]): Promise<TransomPosition[]> {
  const all = await local.getAll<LocalTransom>('transom_positions');
  const now = local.nowISO();
  for (const t of all) {
    if (t.window_id === windowId && !t._deleted) {
      await local.put('transom_positions', { ...t, _deleted: true, _dirty: true, _localUpdatedAt: now });
    }
  }
  const result: TransomPosition[] = [];
  for (let i = 0; i < values.length; i++) {
    const id = local.genId();
    const record: LocalTransom = {
      id,
      window_id: windowId,
      position_index: i,
      value_mm: values[i],
      _dirty: true,
      _localUpdatedAt: now,
    };
    await local.put('transom_positions', record);
    result.push(stripLocal(record));
  }
  return result;
}

export async function saveDrawing(windowId: string, imageData: string): Promise<void> {
  const all = await local.getAll<LocalDrawing>('drawings');
  const existing = all.find((d) => d.window_id === windowId && !d._deleted);
  const id = existing?.id ?? local.genId();
  const now = local.nowISO();
  const record: LocalDrawing = {
    id,
    window_id: windowId,
    image_data: imageData,
    updated_at: now,
    _dirty: true,
    _localUpdatedAt: now,
  };
  await local.put('drawings', record);
}

export async function getAnnotations(windowId: string): Promise<Annotation[]> {
  const all = await local.getAll<LocalAnnotation>('annotations');
  return all.filter((a) => a.window_id === windowId && !a._deleted).map(stripLocal);
}

export async function addAnnotation(windowId: string, text: string, x: number, y: number): Promise<Annotation> {
  const id = local.genId();
  const now = local.nowISO();
  const record: LocalAnnotation = {
    id,
    window_id: windowId,
    text,
    x,
    y,
    created_at: now,
    updated_at: now,
    _dirty: true,
    _localUpdatedAt: now,
  };
  await local.put('annotations', record);
  return stripLocal(record);
}

export async function updateAnnotation(id: string, patch: Partial<Pick<Annotation, 'text' | 'x' | 'y'>>): Promise<void> {
  const existing = await local.get<LocalAnnotation>('annotations', id);
  if (!existing) return;
  const now = local.nowISO();
  await local.put('annotations', { ...existing, ...patch, updated_at: now, _dirty: true, _localUpdatedAt: now });
}

export async function deleteAnnotation(id: string): Promise<void> {
  const existing = await local.get<LocalAnnotation>('annotations', id);
  if (!existing) return;
  const now = local.nowISO();
  await local.put('annotations', { ...existing, _deleted: true, _dirty: true, _localUpdatedAt: now });
}

export async function addPhoto(windowId: string, imageData: string, category: string, caption: string): Promise<Photo> {
  const id = local.genId();
  const now = local.nowISO();
  const record: LocalPhoto = {
    id,
    window_id: windowId,
    image_data: imageData,
    category,
    caption,
    created_at: now,
    sync_status: 'pending_upload',
    _dirty: true,
    _localUpdatedAt: now,
  };
  await local.put('photos', record);
  return stripLocal(record);
}

export async function updatePhoto(id: string, patch: Partial<Photo>): Promise<void> {
  const existing = await local.get<LocalPhoto>('photos', id);
  if (!existing) return;
  const now = local.nowISO();
  await local.put('photos', { ...existing, ...patch, _dirty: true, _localUpdatedAt: now });
}

export async function deletePhoto(id: string): Promise<void> {
  const existing = await local.get<LocalPhoto>('photos', id);
  if (!existing) return;
  const now = local.nowISO();
  await local.put('photos', { ...existing, _deleted: true, _dirty: true, _localUpdatedAt: now });
}

function stripLocal<T extends local.LocalRecord>(record: T): Omit<T, '_dirty' | '_deleted' | '_localUpdatedAt'> {
  const { _dirty, _deleted, _localUpdatedAt, ...rest } = record;
  return rest;
}

export async function getSiteAssessment(surveyId: string): Promise<SiteAssessment | null> {
  const all = await local.getAll<LocalSiteAssessment>('site_assessment');
  const found = all.find((a) => a.survey_id === surveyId && !a._deleted);
  return found ? stripLocal(found) : null;
}

export async function upsertSiteAssessment(row: Partial<SiteAssessment> & { survey_id: string }): Promise<SiteAssessment> {
  const all = await local.getAll<LocalSiteAssessment>('site_assessment');
  const existing = all.find((a) => a.survey_id === row.survey_id && !a._deleted);
  const id = existing?.id ?? local.genId();
  const now = local.nowISO();
  const fields: (keyof SiteAssessment)[] = [
    'survey_id', 'windows', 'upvc_doors', 'composite_doors', 'double_doors', 'patio_doors',
    'kitchen_form', 'shaped_frames', 'box_sash', 'other', 'bay_windows', 'bay_windows_other',
    'roofline_works', 'fascia_size', 'soffit_depth', 'linear_metres',
    'good_access_internally', 'good_access_externally', 'access_to_rear',
    'access_solution_required', 'access_solution_comments',
    'suspect_material', 'suspect_material_comments',
    'overhead_cables', 'overhead_cables_comments',
    'parking_restrictions', 'parking_comments',
    'full_elevation_photos', 'internal_photos', 'materials_sheet_completed',
    'surveyor_comments',
  ];
  const record: Record<string, unknown> = {
    id,
    updated_at: now,
    _dirty: true,
    _localUpdatedAt: now,
  };
  for (const f of fields) {
    if (f in row && row[f] !== undefined) {
      record[f as string] = row[f];
    } else if (existing && f in existing) {
      record[f as string] = (existing as unknown as Record<string, unknown>)[f as string];
    } else {
      record[f as string] = null;
    }
  }
  await local.put('site_assessment', record as unknown as LocalSiteAssessment);
  return stripLocal(record as unknown as LocalSiteAssessment);
}

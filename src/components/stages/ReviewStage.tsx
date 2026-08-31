import { useState } from 'react';
import type { useWindowData } from '@/hooks/useWindowData';
import { Card, Button, CheckBadge } from '@/components/ui';
import { calcMS, calcBuried, widthCheck, heightCheck, diagonalCheck, num, round } from '@/lib/calc';
import { navigate } from '@/lib/router';
import { useSurvey } from '@/context/SurveyContext';
import { Edit3, Save, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import type { FullWindow } from '@/lib/types';

type Data = ReturnType<typeof useWindowData>;

export default function ReviewStage({ data, surveyId, onStatus }: { data: Data; surveyId: string; onStatus: (s: FullWindow['status']) => Promise<void> }) {
  const { win } = data;
  const { survey } = useSurvey();
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  if (!win) return null;

  const m = win.measurements;
  const b = win.buried;
  const spec = win.specification;
  const ms = m ? calcMS(m) : null;
  const buried = b ? calcBuried(b) : null;
  const wCheck = m && b ? widthCheck(m, b) : null;
  const hCheck = m && b ? heightCheck(m, b) : null;
  const dCheck = m ? diagonalCheck(m) : null;

  const windowNumber = survey?.windows.findIndex((w) => w.id === win.id) ?? -1;

  const missingItems = getMissingItems(win);

  async function saveWindow() {
    setSaving(true);
    try {
      await onStatus('in_progress');
      navigate({ name: 'products', surveyId });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 print:space-y-3">
      <div className="print:hidden">
        <SectionTitle title="Review" subtitle="Check everything before completing this window" />
      </div>

      {/* Completeness check */}
      <Card className={`p-5 print:hidden ${missingItems.length === 0 ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
        {missingItems.length === 0 ? (
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <span className="font-semibold">All survey fields completed</span>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-3 text-amber-900">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <span className="font-semibold">Survey incomplete — {missingItems.length} {missingItems.length === 1 ? 'item' : 'items'} require attention</span>
            </div>
            <div className="space-y-1">
              {missingItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigate({ name: 'window', surveyId, windowId: win.id, stage: item.stage })}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg bg-white/60 hover:bg-white text-sm text-slate-700 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5 print:border-2 print:border-slate-900">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Identification</h3>
          <EditButton stage="measurements" surveyId={surveyId} windowId={win.id} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <Info label="Window number" value={windowNumber >= 0 ? `Window ${windowNumber + 1}` : '—'} />
          <Info label="Location" value={win.location ?? '—'} />
          <Info label="Aperture material" value={win.aperture_material === 'other' ? win.aperture_material_other ?? 'Other' : win.aperture_material ?? '—'} />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Measurements</h3>
          <EditButton stage="measurements" surveyId={surveyId} windowId={win.id} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <Info label="PL Height × Width" value={m ? `${m.pl_height ?? '—'} × ${m.pl_width ?? '—'} mm` : '—'} />
          <Info label="BL Height × Width" value={m ? `${m.bl_height ?? '—'} × ${m.bl_width ?? '—'} mm` : '—'} />
          <Info label="MS Height × Width" value={ms ? `${ms.height ?? '—'} × ${ms.width ?? '—'} mm` : '—'} />
          <Info label="Width tolerance" value={m ? `${m.width_tolerance} mm` : '—'} />
          <Info label="Height tolerance" value={m ? `${m.height_tolerance} mm` : '—'} />
          {ms?.widthManual && <Info label="MS Width" value="Manual override" />}
          {ms?.heightManual && <Info label="MS Height" value="Manual override" />}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Buried Sizes</h3>
          <EditButton stage="measurements" surveyId={surveyId} windowId={win.id} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Info label="Left" value={buried?.left.buried != null ? `${buried.left.buried} mm` : '—'} />
          <Info label="Right" value={buried?.right.buried != null ? `${buried.right.buried} mm` : '—'} />
          <Info label="Top" value={buried?.top.buried != null ? `${buried.top.buried} mm` : '—'} />
          <Info label="Bottom" value={buried?.bottom.buried != null ? `${buried.bottom.buried} mm` : '—'} />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Checks</h3>
          <EditButton stage="checks" surveyId={surveyId} windowId={win.id} />
        </div>
        <div className="space-y-3">
          <CheckRow label="Width Buried Check" result={wCheck} />
          <CheckRow label="Height Buried Check" result={hCheck} />
          <CheckRow label="Diagonal Check" result={dCheck} />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Diagonal</h3>
          <EditButton stage="measurements" surveyId={surveyId} windowId={win.id} />
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <Info label="Site diagonal" value={m?.site_diagonal != null ? `${m.site_diagonal} mm` : '—'} />
          <Info label="True diagonal" value={m && m.pl_width != null && m.pl_height != null ? `${round(Math.sqrt((num(m.pl_width) ?? 0) ** 2 + (num(m.pl_height) ?? 0) ** 2))} mm` : '—'} />
          <Info label="Difference" value={dCheck?.details.find((d) => d.label === 'Difference')?.value ?? '—'} />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Specification</h3>
          <EditButton stage="specification" surveyId={surveyId} windowId={win.id} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <Info label="Cill" value={spec?.cill_type === 'other' ? spec.cill_other ?? 'Other' : spec?.cill_type ? `${spec.cill_type} mm` : '—'} />
          <Info label="Cill length" value={spec?.cill_length != null ? `${spec.cill_length} mm` : '—'} />
          <Info label="Glass" value={spec?.glass ?? '—'} />
          <Info label="Floor to glass" value={spec?.floor_to_glass != null ? `${spec.floor_to_glass} mm` : '—'} />
          <Info label="Toughened" value={spec?.toughened === true ? 'Yes' : spec?.toughened === false ? 'No' : '—'} />
          <Info label="Hinge type" value={spec?.hinge_type ?? '—'} />
          <Info label="Trickle vent" value={spec?.trickle_vent_location === 'other' ? spec.trickle_vent_other ?? 'Other' : spec?.trickle_vent_location ?? '—'} />
          <Info label="Fascia drop" value={m?.fascia_drop == null ? '—' : m.fascia_drop === -1 ? 'N/A' : `${m.fascia_drop} mm`} />
          <Info label="Coupler" value={spec?.coupler ?? '—'} />
          <Info label="Add-on L" value={formatAddon(spec?.addon_left)} />
          <Info label="Add-on R" value={formatAddon(spec?.addon_right)} />
          <Info label="Add-on T" value={formatAddon(spec?.addon_top)} />
          <Info label="Add-on B" value={formatAddon(spec?.addon_bottom)} />
          <Info label="Georgian" value={spec?.georgian_type ?? '—'} />
          <Info label="Floor area" value={spec?.floor_area != null ? `${spec.floor_area.toFixed(2)} m²` : '—'} />
        </div>
        {num(spec?.floor_to_glass) !== null && num(spec?.floor_to_glass)! < 800 && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-sm print:bg-amber-100 print:border-amber-400">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Safety glazing may be required.</span> Floor to glass is {spec?.floor_to_glass} mm (below 800 mm from finished floor level).
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Mullions & Transoms</h3>
          <EditButton stage="drawing" surveyId={surveyId} windowId={win.id} />
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-500 mb-1">Mullions</div>
            {win.mullions_answered === false ? (
              <div>None</div>
            ) : win.mullions_answered === true && win.mullions.length > 0 ? (
              <div>{win.mullions.map((mu, i) => `M${i + 1}: ${mu.value_mm}mm`).join(', ')}</div>
            ) : (
              <div className="text-slate-400">—</div>
            )}
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Transoms</div>
            {win.transoms_answered === false ? (
              <div>None</div>
            ) : win.transoms_answered === true && win.transoms.length > 0 ? (
              <div>{win.transoms.map((tr, i) => `T${i + 1}: ${tr.value_mm}mm`).join(', ')}</div>
            ) : (
              <div className="text-slate-400">—</div>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Drawing</h3>
          <EditButton stage="drawing" surveyId={surveyId} windowId={win.id} />
        </div>
        {win.drawing?.image_data ? (
          <img src={win.drawing.image_data} alt="Window drawing" className="w-full max-w-md rounded-lg border border-slate-200" />
        ) : (
          <div className="text-slate-400 text-sm">No drawing saved</div>
        )}
        {win.annotations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {win.annotations.map((ann) => (
              <span key={ann.id} className="px-2 py-1 rounded bg-yellow-100 border border-yellow-300 text-xs font-semibold text-slate-800">
                {ann.text}
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Photos</h3>
          <EditButton stage="photos" surveyId={surveyId} windowId={win.id} />
        </div>
        {win.photos.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {win.photos.map((p) => (
              <div key={p.id} className="aspect-square rounded-lg overflow-hidden border border-slate-200">
                <img src={p.image_data} alt={p.caption ?? ''} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-slate-400 text-sm">No photos</div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Notes</h3>
          <EditButton stage="photos" surveyId={surveyId} windowId={win.id} />
        </div>
        <div className="text-sm whitespace-pre-wrap">
          {spec?.site_notes || spec?.trims_internal_cill ? (
            <>
              {spec.trims_internal_cill && <div className="mb-2"><span className="text-xs text-slate-500">Trims / Internal Cill:</span> {spec.trims_internal_cill}</div>}
              {spec.site_notes && <div><span className="text-xs text-slate-500">Site notes:</span> {spec.site_notes}</div>}
            </>
          ) : (
            <div className="text-slate-400">No notes</div>
          )}
        </div>
      </Card>

      <div className="print:hidden space-y-3 pt-2">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" size="lg" onClick={saveWindow} disabled={saving} className="flex items-center gap-2">
            <Save className="w-5 h-5" /> Save Window
          </Button>
        </div>
        {savedFlash && <span className="text-emerald-600 font-medium text-sm">Saved</span>}
      </div>

      <div className="hidden print:block mt-8 pt-4 border-t border-slate-300 text-xs text-slate-500">
        <div>Surveyor: {survey?.surveyor_name ?? '—'}</div>
        <div>Customer: {survey?.customer_name ?? '—'}</div>
        <div>Contract: {survey?.contract_number ?? '—'}</div>
        <div>Date: {survey?.survey_date ?? '—'}</div>
      </div>
    </div>
  );
}

interface MissingItem {
  label: string;
  stage: string;
}

function getMissingItems(win: FullWindow): MissingItem[] {
  const items: MissingItem[] = [];
  const m = win.measurements;
  const b = win.buried;
  const spec = win.specification;

  // Measurements
  if (!m || m.pl_height == null) items.push({ label: 'PL Height', stage: 'measurements' });
  if (!m || m.pl_width == null) items.push({ label: 'PL Width', stage: 'measurements' });
  if (!m || m.bl_height == null) items.push({ label: 'BL Height', stage: 'measurements' });
  if (!m || m.bl_width == null) items.push({ label: 'BL Width', stage: 'measurements' });
  if (!m || m.site_diagonal == null) items.push({ label: 'Site Diagonal', stage: 'measurements' });
  if (!m || m.fascia_drop == null) items.push({ label: 'Fascia Drop', stage: 'drawing' });

  // Buried sizes
  if (!b || b.left_in == null) items.push({ label: 'Buried Left (In)', stage: 'measurements' });
  if (!b || b.left_out == null) items.push({ label: 'Buried Left (Out)', stage: 'measurements' });
  if (!b || b.right_in == null) items.push({ label: 'Buried Right (In)', stage: 'measurements' });
  if (!b || b.right_out == null) items.push({ label: 'Buried Right (Out)', stage: 'measurements' });
  if (!b || b.top_in == null) items.push({ label: 'Buried Top (In)', stage: 'measurements' });
  if (!b || b.top_out == null) items.push({ label: 'Buried Top (Out)', stage: 'measurements' });
  if (!b || b.bottom_in == null) items.push({ label: 'Buried Bottom (In)', stage: 'measurements' });
  if (!b || b.bottom_out == null) items.push({ label: 'Buried Bottom (Out)', stage: 'measurements' });

  // Specification
  if (!spec || !spec.cill_type) items.push({ label: 'Cill Type', stage: 'specification' });
  if (!spec || spec.floor_to_glass == null) items.push({ label: 'Floor to Glass', stage: 'specification' });
  if (!spec || spec.toughened == null) items.push({ label: 'Toughened Glass', stage: 'specification' });
  if (!spec || !spec.glass) items.push({ label: 'Glass Type', stage: 'specification' });
  if (!spec || !spec.hinge_type) items.push({ label: 'Hinge Type', stage: 'specification' });
  if (!spec || !spec.trickle_vent_location) items.push({ label: 'Trickle Vent Location', stage: 'specification' });
  if (!spec || !spec.georgian_type) items.push({ label: 'Georgian / Astragal', stage: 'specification' });
  if (!spec || spec.room_width == null) items.push({ label: 'Room Width', stage: 'specification' });
  if (!spec || spec.room_depth == null) items.push({ label: 'Room Depth', stage: 'specification' });

  // Mullions & Transoms — must be explicitly answered
  if (win.mullions_answered == null) items.push({ label: 'Mullions', stage: 'drawing' });
  if (win.transoms_answered == null) items.push({ label: 'Transoms', stage: 'drawing' });

  // If mullions answered Yes, each mullion must have a non-zero value
  if (win.mullions_answered === true) {
    if (win.mullions.length === 0) {
      items.push({ label: 'Mullion Positions', stage: 'drawing' });
    } else {
      win.mullions.forEach((mu, i) => {
        if (!mu.value_mm) items.push({ label: `Mullion ${i + 1} Position`, stage: 'drawing' });
      });
    }
  }

  if (win.transoms_answered === true) {
    if (win.transoms.length === 0) {
      items.push({ label: 'Transom Positions', stage: 'drawing' });
    } else {
      win.transoms.forEach((tr, i) => {
        if (!tr.value_mm) items.push({ label: `Transom ${i + 1} Position`, stage: 'drawing' });
      });
    }
  }

  return items;
}

function formatAddon(raw: string | null | undefined): string {
  if (!raw || raw === 'none') return 'None';
  if (raw.startsWith('custom|')) {
    const v = raw.split('|')[1];
    return v ? `${v} mm (custom)` : 'Custom';
  }
  return `${raw} mm`;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-medium text-slate-900">{value}</div>
    </div>
  );
}

function CheckRow({ label, result }: { label: string; result: ReturnType<typeof widthCheck> | null }) {
  if (!result) return <div className="flex items-center justify-between"><span className="text-sm text-slate-600">{label}</span><span className="text-slate-400 text-sm">—</span></div>;
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <span className="text-sm font-medium text-slate-900">{label}</span>
        <div className="text-xs text-slate-500 mt-0.5">{result.label}</div>
      </div>
      <CheckBadge status={result.status} />
    </div>
  );
}

function EditButton({ stage, surveyId, windowId }: { stage: string; surveyId: string; windowId: string }) {
  return (
    <button
      onClick={() => navigate({ name: 'window', surveyId, windowId, stage })}
      className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1 touch-manipulation print:hidden"
    >
      <Edit3 className="w-4 h-4" /> Edit
    </button>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

import { useState } from 'react';
import type { useWindowData } from '@/hooks/useWindowData';
import { Card, Field, NumberInput, Button } from '@/components/ui';
import { EditableNumber } from '@/components/EditableNumber';
import { calcMS, calcBuried, num, round } from '@/lib/calc';
import { Edit3, RotateCcw } from 'lucide-react';

type Data = ReturnType<typeof useWindowData>;

export default function MeasurementsStage({ data }: { data: Data }) {
  const { win, saveMeasurements, saveBuried } = data;
  const m = win?.measurements;
  const b = win?.buried;
  const [overrideW, setOverrideW] = useState(false);
  const [overrideH, setOverrideH] = useState(false);

  const ms = m ? calcMS(m) : null;
  const buried = b ? calcBuried(b) : null;

  return (
    <div className="space-y-5">
      <SectionTitle title="Measurements" subtitle="Plaster Line, Brick Line and Manufacturing Size" />

      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="inline-block w-7 h-7 rounded-md bg-slate-900 text-white text-xs font-bold flex items-center justify-center">PL</span>
          Plaster Line
        </h3>
        <p className="text-sm text-slate-500 mb-4">Smallest internal measurements. Height = head reveal to window board (or tile-to-tile).</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="PL Height (mm)">
            <EditableNumber value={m?.pl_height} onChange={(v) => {}} onSave={(v) => saveMeasurements({ pl_height: v })} placeholder="0" />
          </Field>
          <Field label="PL Width (mm)">
            <EditableNumber value={m?.pl_width} onChange={(v) => {}} onSave={(v) => saveMeasurements({ pl_width: v })} placeholder="0" />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="inline-block w-7 h-7 rounded-md bg-slate-700 text-white text-xs font-bold flex items-center justify-center">BL</span>
          Brick Line
        </h3>
        <p className="text-sm text-slate-500 mb-4">Smallest external aperture measurements. Width = brick-to-brick. Height = lintel to brick beneath cill.</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="BL Height (mm)">
            <EditableNumber value={m?.bl_height} onChange={(v) => {}} onSave={(v) => saveMeasurements({ bl_height: v })} placeholder="0" />
          </Field>
          <Field label="BL Width (mm)">
            <EditableNumber value={m?.bl_width} onChange={(v) => {}} onSave={(v) => saveMeasurements({ bl_width: v })} placeholder="0" />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="inline-block w-7 h-7 rounded-md bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">MS</span>
          Manufacturing Size
        </h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Height tolerance (mm)" hint="BL Height − tolerance = MS Height">
            <EditableNumber value={m?.height_tolerance ?? 10} onChange={(v) => {}} onSave={(v) => saveMeasurements({ height_tolerance: v ?? 10 })} />
          </Field>
          <Field label="Width tolerance (mm)" hint="BL Width − tolerance = MS Width">
            <EditableNumber value={m?.width_tolerance ?? 10} onChange={(v) => {}} onSave={(v) => saveMeasurements({ width_tolerance: v ?? 10 })} />
          </Field>
        </div>

        {ms && (
          <div className="grid grid-cols-2 gap-4">
            <MSDisplay
              label="MS Height"
              calculated={ms.calculatedHeight}
              value={ms.height}
              manual={ms.heightManual}
              override={overrideH}
              setOverride={setOverrideH}
              onSaveOverride={(v) => saveMeasurements({ ms_height_override: v, ms_height_manual: true })}
              onClearOverride={() => saveMeasurements({ ms_height_override: null, ms_height_manual: false })}
            />
            <MSDisplay
              label="MS Width"
              calculated={ms.calculatedWidth}
              value={ms.width}
              manual={ms.widthManual}
              override={overrideW}
              setOverride={setOverrideW}
              onSaveOverride={(v) => saveMeasurements({ ms_width_override: v, ms_width_manual: true })}
              onClearOverride={() => saveMeasurements({ ms_width_override: null, ms_width_manual: false })}
            />
          </div>
        )}
        <p className="mt-4 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          MS is inclusive of add-ons and couplers, but excludes bay pole attachments.
        </p>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-1">Buried Size Measurements</h3>
        <p className="text-sm text-slate-500 mb-4">Amount of existing frame concealed by internal plaster. Buried = Out − In for each side.</p>
        <div className="space-y-4">
          <BuriedSide label="Left" side={buried?.left} onSave={(patch) => saveBuried(patch)} map={{ in: 'left_in', out: 'left_out' }} />
          <BuriedSide label="Right" side={buried?.right} onSave={(patch) => saveBuried(patch)} map={{ in: 'right_in', out: 'right_out' }} />
          <BuriedSide label="Top" side={buried?.top} onSave={(patch) => saveBuried(patch)} map={{ in: 'top_in', out: 'top_out' }} />
          <BuriedSide label="Bottom" side={buried?.bottom} onSave={(patch) => saveBuried(patch)} map={{ in: 'bottom_in', out: 'bottom_out' }} />
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Diagonal & Fascia</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Site Diagonal (mm)" hint="Measured internally across the aperture">
            <EditableNumber value={m?.site_diagonal} onChange={(v) => {}} onSave={(v) => saveMeasurements({ site_diagonal: v })} placeholder="0" />
          </Field>
          <Field label="Fascia Drop (mm)" hint="Downwards from head of frame. Leave blank if not applicable.">
            <div className="flex gap-2 items-center">
              <EditableNumber value={m?.fascia_drop} onChange={(v) => {}} onSave={(v) => saveMeasurements({ fascia_drop: v })} placeholder="Blank" className="flex-1" />
              <Button
                size="sm"
                variant={m?.fascia_drop === -1 ? 'primary' : 'secondary'}
                onClick={() => saveMeasurements({ fascia_drop: m?.fascia_drop === -1 ? null : -1 })}
                className="shrink-0"
              >
                N/A
              </Button>
            </div>
            {m?.fascia_drop === -1 && (
              <p className="text-xs text-slate-500 mt-1.5">Marked as N/A — no fascia measurement for this window.</p>
            )}
          </Field>
        </div>
        {m && m.pl_width != null && m.pl_height != null && (
          <div className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
            True Diagonal (calculated): <span className="font-semibold">{round(Math.sqrt((num(m.pl_width) ?? 0) ** 2 + (num(m.pl_height) ?? 0) ** 2))} mm</span>
          </div>
        )}
      </Card>
    </div>
  );
}

function MSDisplay({
  label,
  calculated,
  value,
  manual,
  override,
  setOverride,
  onSaveOverride,
  onClearOverride,
}: {
  label: string;
  calculated: number | null;
  value: number | null;
  manual: boolean;
  override: boolean;
  setOverride: (v: boolean) => void;
  onSaveOverride: (v: number) => void;
  onClearOverride: () => void;
}) {
  const [val, setVal] = useState('');
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-emerald-900">{label}</span>
        {manual && (
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
            <Edit3 className="w-3 h-3" /> Manual override
          </span>
        )}
      </div>
      {!override ? (
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-emerald-900">{value ?? '—'}</span>
          <span className="text-sm text-emerald-700 mb-1">mm</span>
          <button onClick={() => { setOverride(true); setVal(String(value ?? '')); }} className="ml-auto text-xs text-emerald-700 underline">
            Override
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <NumberInput value={val} onChange={(e) => setVal(e.target.value)} placeholder="Override value" autoFocus />
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={() => { const n = num(val); if (n !== null) onSaveOverride(n); setOverride(false); }}>
              Save override
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOverride(false)}>Cancel</Button>
          </div>
        </div>
      )}
      {calculated !== null && !override && (
        <div className="text-xs text-emerald-700 mt-1">Calculated: {calculated} mm</div>
      )}
      {manual && !override && (
        <button onClick={onClearOverride} className="text-xs text-slate-500 underline mt-2 flex items-center gap-1">
          <RotateCcw className="w-3 h-3" /> Use calculated value
        </button>
      )}
    </div>
  );
}

function BuriedSide({
  label,
  side,
  onSave,
  map,
}: {
  label: string;
  side: { in: number | null; out: number | null; buried: number | null } | undefined;
  onSave: (patch: Record<string, number | null>) => void;
  map: { in: string; out: string };
}) {
  return (
    <div className="grid grid-cols-3 gap-3 items-end">
      <Field label={`${label} — In (mm)`}>
        <EditableNumber value={side?.in} onChange={(v) => {}} onSave={(v) => onSave({ [map.in]: v })} placeholder="0" />
      </Field>
      <Field label={`${label} — Out (mm)`}>
        <EditableNumber value={side?.out} onChange={(v) => {}} onSave={(v) => onSave({ [map.out]: v })} placeholder="0" />
      </Field>
      <div>
        <span className="block text-sm font-medium text-slate-700 mb-1.5">Buried</span>
        <div className="h-[52px] flex items-center justify-center rounded-lg bg-slate-900 text-white text-xl font-bold">
          {side?.buried ?? '—'}
        </div>
      </div>
    </div>
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

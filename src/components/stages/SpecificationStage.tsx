import { useState, useEffect } from 'react';
import type { useWindowData } from '@/hooks/useWindowData';
import type { WindowSpecification } from '@/lib/types';
import { Card, Field, TextInput, Select, TextArea, SegmentedControl } from '@/components/ui';
import { EditableNumber } from '@/components/EditableNumber';
import { loadSettings } from '@/screens/SettingsScreen';
import { AlertTriangle } from 'lucide-react';
import { num, calcFloorArea } from '@/lib/calc';

type Data = ReturnType<typeof useWindowData>;

const CILL_OPTIONS = ['95', '150', '180', '220', 'other'];
const ADDON_OPTIONS = ['none', '15', '25', '40', 'custom'];

export default function SpecificationStage({ data }: { data: Data }) {
  const { win, saveSpecification } = data;
  const spec = win?.specification;
  const [hingeInput, setHingeInput] = useState('');
  const [hingeSuggestions, setHingeSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    setHingeSuggestions(loadSettings().hingeSuggestions);
  }, []);

  useEffect(() => {
    setHingeInput(spec?.hinge_type ?? '');
  }, [spec?.hinge_type]);

  const addons = parseAddons(spec);

  return (
    <div className="space-y-5">
      <SectionTitle title="Specification" subtitle="Window specification details" />

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Cill</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Cill Type">
            <Select value={spec?.cill_type ?? ''} onChange={(e) => saveSpecification({ cill_type: e.target.value, cill_other: e.target.value === 'other' ? spec?.cill_other ?? '' : null })}>
              <option value="">Select…</option>
              {CILL_OPTIONS.map((c) => (
                <option key={c} value={c}>{c === 'other' ? 'Other' : `${c} mm`}</option>
              ))}
            </Select>
          </Field>
          {spec?.cill_type === 'other' && (
            <Field label="Other cill (mm)">
              <TextInput value={spec?.cill_other ?? ''} onChange={(e) => saveSpecification({ cill_other: e.target.value })} placeholder="Enter cill size" />
            </Field>
          )}
          <Field label="Cill Length (mm)">
            <EditableNumber value={spec?.cill_length} onChange={(v) => {}} onSave={(v) => saveSpecification({ cill_length: v })} placeholder="0" />
          </Field>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Glass / Safety Glazing</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Glass Type">
            <TextInput value={spec?.glass ?? ''} onChange={(e) => saveSpecification({ glass: e.target.value })} placeholder="e.g. 4-16-4 Low E" />
          </Field>
          <Field label="Floor to Glass (mm)" hint="Vertical measurement from finished floor level to bottom of glazed area">
            <EditableNumber value={spec?.floor_to_glass} onChange={(v) => {}} onSave={(v) => saveSpecification({ floor_to_glass: v })} placeholder="Blank" />
          </Field>
        </div>
        {num(spec?.floor_to_glass) !== null && num(spec?.floor_to_glass)! < 800 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Safety glazing may be required.</span> Floor to glass is {spec?.floor_to_glass} mm, which is below 800 mm from finished floor level. Please confirm whether toughened / safety glass is needed.
            </div>
          </div>
        )}
        <Field label="Toughened / Safety Glass">
          <div className="pt-2">
            <SegmentedControl
              value={spec?.toughened ? 'yes' : spec?.toughened === false ? 'no' : ''}
              onChange={(v) => saveSpecification({ toughened: v === 'yes' ? true : v === 'no' ? false : null })}
              options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
            />
          </div>
        </Field>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Hinge Type</h3>
        <Field label="Hinge Type" hint="Free-text — enter whatever is appropriate">
          <div className="relative">
            <TextInput
              value={hingeInput}
              onChange={(e) => { setHingeInput(e.target.value); saveSpecification({ hinge_type: e.target.value }); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="e.g. Friction hinge"
            />
            {showSuggestions && hingeSuggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-auto">
                {hingeSuggestions
                  .filter((s) => s.toLowerCase().includes(hingeInput.toLowerCase()))
                  .map((s) => (
                    <button
                      key={s}
                      onMouseDown={(e) => { e.preventDefault(); setHingeInput(s); saveSpecification({ hinge_type: s }); setShowSuggestions(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100"
                    >
                      {s}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </Field>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Trickle Vent & Coupler</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Trickle Vent Location">
            <Select
              value={spec?.trickle_vent_location ?? ''}
              onChange={(e) => saveSpecification({ trickle_vent_location: e.target.value, trickle_vent_other: e.target.value === 'other' ? spec?.trickle_vent_other ?? '' : null })}
            >
              <option value="">Select…</option>
              <option value="head">Head</option>
              <option value="sash">Sash</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          {spec?.trickle_vent_location === 'other' && (
            <Field label="Other location">
              <TextInput value={spec?.trickle_vent_other ?? ''} onChange={(e) => saveSpecification({ trickle_vent_other: e.target.value })} placeholder="Describe" />
            </Field>
          )}
          <Field label="Coupler">
            <TextInput value={spec?.coupler ?? ''} onChange={(e) => saveSpecification({ coupler: e.target.value })} placeholder="e.g. 20mm" />
          </Field>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Floor Area</h3>
        <p className="text-sm text-slate-500">Enter the room dimensions. Floor area is calculated automatically.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Room Width (m)">
            <EditableNumber value={spec?.room_width} onChange={(v) => {}} onSave={(v) => {
              const fa = calcFloorArea(v, spec?.room_depth);
              saveSpecification({ room_width: v, floor_area: fa });
            }} placeholder="0.0" />
          </Field>
          <Field label="Room Depth (m)">
            <EditableNumber value={spec?.room_depth} onChange={(v) => {}} onSave={(v) => {
              const fa = calcFloorArea(spec?.room_width, v);
              saveSpecification({ room_depth: v, floor_area: fa });
            }} placeholder="0.0" />
          </Field>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-slate-600">Floor Area: </span>
          <span className="text-lg font-bold text-slate-900">{spec?.floor_area != null ? `${spec.floor_area.toFixed(2)} m²` : '— m²'}</span>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Add-Ons</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['left', 'right', 'top', 'bottom'] as const).map((side) => (
            <div key={side} className="space-y-2">
              <span className="block text-sm font-medium text-slate-700 capitalize">{side}</span>
              <Select
                value={addons[side].option}
                onChange={(e) => {
                  const opt = e.target.value;
                  const next = { ...addons };
                  next[side] = { option: opt, custom: opt === 'custom' ? next[side].custom : null };
                  saveSpecification({ [`addon_${side}`]: serializeAddon(opt, next[side].custom) });
                }}
              >
                {ADDON_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o === 'custom' ? 'Custom' : o === 'none' ? 'None' : `${o} mm`}</option>
                ))}
              </Select>
              {addons[side].option === 'custom' && (
                <EditableNumber
                  value={addons[side].custom}
                  onChange={(v) => {}}
                  onSave={(v) => saveSpecification({ [`addon_${side}`]: serializeAddon('custom', v) })}
                  placeholder="mm"
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Georgian / Astragal Bars</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Type">
            <Select value={spec?.georgian_type ?? ''} onChange={(e) => saveSpecification({ georgian_type: e.target.value })}>
              <option value="">Select…</option>
              <option value="none">None</option>
              <option value="georgian">Georgian</option>
              <option value="astragal">Astragal</option>
            </Select>
          </Field>
          <Field label="Bar Width">
            <TextInput value={spec?.bar_width ?? ''} onChange={(e) => saveSpecification({ bar_width: e.target.value })} placeholder="e.g. 25mm" />
          </Field>
          <Field label="Colour">
            <TextInput value={spec?.georgian_colour ?? ''} onChange={(e) => saveSpecification({ georgian_colour: e.target.value })} placeholder="e.g. White" />
          </Field>
          <Field label="Lead / Bevel details">
            <TextInput value={spec?.lead_bevel_details ?? ''} onChange={(e) => saveSpecification({ lead_bevel_details: e.target.value })} placeholder="e.g. Diamond lead" />
          </Field>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Trims / Internal Cill</h3>
        <TextArea value={spec?.trims_internal_cill ?? ''} onChange={(e) => saveSpecification({ trims_internal_cill: e.target.value })} rows={3} placeholder="Trims and internal cill details" />
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Site / Fitting Notes</h3>
        <TextArea
          value={spec?.site_notes ?? ''}
          onChange={(e) => saveSpecification({ site_notes: e.target.value })}
          rows={5}
          placeholder="Tiles, render, existing trims, pipes, cables, fascias, internal finishes, external obstructions…"
        />
      </Card>
    </div>
  );
}

type AddonMap = Record<'left' | 'right' | 'top' | 'bottom', { option: string; custom: number | null }>;

function parseAddons(spec: WindowSpecification | null | undefined): AddonMap {
  const get = (side: keyof AddonMap) => {
    const raw = (spec as (Record<string, string | null> | null))?.[`addon_${side}`] ?? null;
    if (!raw) return { option: 'none', custom: null };
    const [opt, custom] = raw.split('|');
    if (opt === 'custom') return { option: 'custom', custom: custom ? Number(custom) : null };
    return { option: opt, custom: null };
  };
  return { left: get('left'), right: get('right'), top: get('top'), bottom: get('bottom') };
}

function serializeAddon(opt: string, custom: number | null): string {
  if (opt === 'custom') return `custom|${custom ?? ''}`;
  return opt;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import * as db from '@/lib/db';
import { navigate } from '@/lib/router';
import { useSurvey } from '@/context/SurveyContext';
import { Button, Card, Field, TextInput, TextArea } from '@/components/ui';
import { ArrowLeft, Save, ClipboardCheck } from 'lucide-react';
import type { SiteAssessment } from '@/lib/types';

type YesNo = 'yes' | 'no' | null;

export default function SiteAssessmentScreen({ surveyId }: { surveyId: string }) {
  const { survey, loadSurvey } = useSurvey();
  const [assessment, setAssessment] = useState<SiteAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    loadSurvey(surveyId);
    db.getSiteAssessment(surveyId).then((a) => {
      setAssessment(a);
      setLoading(false);
    });
  }, [surveyId, loadSurvey]);

  const save = useCallback(
    async (patch: Partial<SiteAssessment>) => {
      const updated = await db.upsertSiteAssessment({ survey_id: surveyId, ...patch });
      setAssessment(updated);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    },
    [surveyId],
  );

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-slate-500">Loading…</div>;
  }

  const a = assessment;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'products', surveyId })}>
          <ArrowLeft className="w-5 h-5" /> Back
        </Button>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardCheck className="w-6 h-6 text-slate-700" />
          <h2 className="text-xl font-bold text-slate-900">Survey Site Assessment</h2>
        </div>
        <p className="text-sm text-slate-500">
          {survey?.customer_name || '—'} · {survey?.contract_number || '—'}
        </p>
        <p className="text-xs text-slate-400 mt-1">This assessment applies to the whole survey, not individual windows.</p>
      </div>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Product Quantities</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Windows">
            <TextInput
              type="number"
              value={a?.windows ?? ''}
              onChange={(e) => save({ windows: e.target.value ? Number(e.target.value) : null })}
              placeholder="—"
            />
          </Field>
          <Field label="UPVC Doors">
            <TextInput
              type="number"
              value={a?.upvc_doors ?? ''}
              onChange={(e) => save({ upvc_doors: e.target.value ? Number(e.target.value) : null })}
              placeholder="—"
            />
          </Field>
          <Field label="Composite Doors">
            <TextInput
              type="number"
              value={a?.composite_doors ?? ''}
              onChange={(e) => save({ composite_doors: e.target.value ? Number(e.target.value) : null })}
              placeholder="—"
            />
          </Field>
          <Field label="Double Doors">
            <TextInput
              type="number"
              value={a?.double_doors ?? ''}
              onChange={(e) => save({ double_doors: e.target.value ? Number(e.target.value) : null })}
              placeholder="—"
            />
          </Field>
          <Field label="Patio Doors">
            <TextInput
              type="number"
              value={a?.patio_doors ?? ''}
              onChange={(e) => save({ patio_doors: e.target.value ? Number(e.target.value) : null })}
              placeholder="—"
            />
          </Field>
          <Field label="Shaped Frames">
            <TextInput value={a?.shaped_frames ?? ''} onChange={(e) => save({ shaped_frames: e.target.value || null })} placeholder="—" />
          </Field>
          <Field label="Box Sash">
            <TextInput value={a?.box_sash ?? ''} onChange={(e) => save({ box_sash: e.target.value || null })} placeholder="—" />
          </Field>
          <Field label="Other">
            <TextInput value={a?.other ?? ''} onChange={(e) => save({ other: e.target.value || null })} placeholder="—" />
          </Field>
        </div>
        <Field label="Bay Windows">
          <div className="flex flex-wrap gap-2">
            {['2-part', '3-part', '4-part', '5-part', 'other'].map((opt) => (
              <button
                key={opt}
                onClick={() => save({ bay_windows: a?.bay_windows === opt ? null : opt })}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                  a?.bay_windows === opt ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {opt === 'other' ? 'Other' : opt}
              </button>
            ))}
          </div>
          {a?.bay_windows === 'other' && (
            <TextInput
              value={a?.bay_windows_other ?? ''}
              onChange={(e) => save({ bay_windows_other: e.target.value || null })}
              placeholder="e.g. 6-part"
              className="mt-2"
            />
          )}
        </Field>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Roofline Works</h3>
        <Field label="Roofline Works Required">
          <YesNoControl value={a?.roofline_works as YesNo} onChange={(v) => save({ roofline_works: v })} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Fascia Size">
            <TextInput value={a?.fascia_size ?? ''} onChange={(e) => save({ fascia_size: e.target.value || null })} placeholder="e.g. 150mm" />
          </Field>
          <Field label="Soffit Depth">
            <TextInput value={a?.soffit_depth ?? ''} onChange={(e) => save({ soffit_depth: e.target.value || null })} placeholder="e.g. 200mm" />
          </Field>
          <Field label="Linear Metres">
            <TextInput value={a?.linear_metres ?? ''} onChange={(e) => save({ linear_metres: e.target.value || null })} placeholder="e.g. 45m" />
          </Field>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Access & Safety</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Good Access Internally">
            <YesNoControl value={a?.good_access_internally as YesNo} onChange={(v) => save({ good_access_internally: v })} />
          </Field>
          <Field label="Good Access Externally">
            <YesNoControl value={a?.good_access_externally as YesNo} onChange={(v) => save({ good_access_externally: v })} />
          </Field>
          <Field label="Access to Rear of Property">
            <YesNoControl value={a?.access_to_rear as YesNo} onChange={(v) => save({ access_to_rear: v })} />
          </Field>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-4">
          <Field label="Access Solution Required">
            <YesNoControl value={a?.access_solution_required as YesNo} onChange={(v) => save({ access_solution_required: v })} />
          </Field>
          <Field label="Access Solution Comments">
            <TextArea value={a?.access_solution_comments ?? ''} onChange={(e) => save({ access_solution_comments: e.target.value || null })} rows={2} placeholder="Describe access solution if required" />
          </Field>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-4">
          <Field label="Suspect Material">
            <YesNoControl value={a?.suspect_material as YesNo} onChange={(v) => save({ suspect_material: v })} />
          </Field>
          <Field label="Suspect Material Comments">
            <TextArea value={a?.suspect_material_comments ?? ''} onChange={(e) => save({ suspect_material_comments: e.target.value || null })} rows={2} placeholder="Describe suspect material if applicable" />
          </Field>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-4">
          <Field label="Overhead Cables Visible">
            <YesNoControl value={a?.overhead_cables as YesNo} onChange={(v) => save({ overhead_cables: v })} />
          </Field>
          <Field label="Overhead Cables Comments">
            <TextArea value={a?.overhead_cables_comments ?? ''} onChange={(e) => save({ overhead_cables_comments: e.target.value || null })} rows={2} placeholder="Describe overhead cables if applicable" />
          </Field>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-4">
          <Field label="Parking Restrictions">
            <YesNoControl value={a?.parking_restrictions as YesNo} onChange={(v) => save({ parking_restrictions: v })} />
          </Field>
          <Field label="Parking Comments">
            <TextArea value={a?.parking_comments ?? ''} onChange={(e) => save({ parking_comments: e.target.value || null })} rows={2} placeholder="Describe parking restrictions if applicable" />
          </Field>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Photo & Materials Confirmations</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Full Elevation Photos Taken">
            <YesNoControl value={a?.full_elevation_photos as YesNo} onChange={(v) => save({ full_elevation_photos: v })} />
          </Field>
          <Field label="Internal Photos Taken">
            <YesNoControl value={a?.internal_photos as YesNo} onChange={(v) => save({ internal_photos: v })} />
          </Field>
          <Field label="Materials Sheet Completed">
            <YesNoControl value={a?.materials_sheet_completed as YesNo} onChange={(v) => save({ materials_sheet_completed: v })} />
          </Field>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Surveyor Comments</h3>
        <TextArea
          value={a?.surveyor_comments ?? ''}
          onChange={(e) => save({ surveyor_comments: e.target.value || null })}
          rows={4}
          placeholder="General survey comments, notes for the office or installation team…"
        />
      </Card>

      <div className="flex items-center gap-3 mt-4">
        <Button size="lg" variant="primary" onClick={() => navigate({ name: 'products', surveyId })} className="flex items-center gap-2">
          <Save className="w-5 h-5" /> Done
        </Button>
        {savedFlash && <span className="text-emerald-600 text-sm font-medium">Saved</span>}
      </div>
    </div>
  );
}

function YesNoControl({ value, onChange }: { value: YesNo; onChange: (v: YesNo) => void }) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onChange(value === 'yes' ? null : 'yes')}
        className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors touch-manipulation ${
          value === 'yes' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
      >
        Yes
      </button>
      <button
        onClick={() => onChange(value === 'no' ? null : 'no')}
        className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors touch-manipulation ${
          value === 'no' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
      >
        No
      </button>
    </div>
  );
}

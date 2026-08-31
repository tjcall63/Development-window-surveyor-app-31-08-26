import { useSurvey } from '@/context/SurveyContext';
import { navigate } from '@/lib/router';
import * as db from '@/lib/db';
import { Button, Card, EmptyState, StatusBadge, TextInput, Select, Field } from '@/components/ui';
import { Plus, FileText, Trash2, AlertTriangle, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { useState } from 'react';
import type { ApertureMaterial } from '@/lib/types';
import { loadSettings } from '@/screens/SettingsScreen';

export default function ProductsScreen({ surveyId }: { surveyId: string }) {
  const { survey, loading, reload } = useSurvey();
  const [adding, setAdding] = useState(false);
  const [location, setLocation] = useState('');
  const [material, setMaterial] = useState<ApertureMaterial>('brick');
  const [materialOther, setMaterialOther] = useState('');
  const [showComplete, setShowComplete] = useState(false);

  async function addWindow() {
    const position = (survey?.windows.length ?? 0) + 1;
    const settings = loadSettings();
    const w = await db.createWindow(surveyId, position, {
      location: location.trim() || undefined,
      aperture_material: material,
      aperture_material_other: material === 'other' ? materialOther.trim() || undefined : undefined,
    });
    if (w.id) {
      await db.upsertMeasurements({
        window_id: w.id,
        width_tolerance: settings.defaultWidthTolerance,
        height_tolerance: settings.defaultHeightTolerance,
      });
    }
    setAdding(false);
    setLocation('');
    setMaterial('brick');
    setMaterialOther('');
    await reload();
    navigate({ name: 'window', surveyId, windowId: w.id, stage: 'measurements' });
  }

  async function completeSurvey() {
    setShowComplete(false);
    await db.completeSurvey(surveyId);
    navigate({ name: 'summary', surveyId });
  }

  if (loading && !survey) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-slate-500">Loading…</div>;
  }

  const windowCount = survey?.windows.length ?? 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-slate-900 truncate">{survey?.customer_name || 'Survey'}</h2>
          <p className="text-sm text-slate-500 truncate">{[survey?.contract_number, survey?.address].filter(Boolean).join(' · ')}</p>
        </div>
        <Button onClick={() => setAdding(true)} size="md" className="flex items-center gap-2 shrink-0">
          <Plus className="w-5 h-5" /> Add Window
        </Button>
      </div>

      <div className="mb-4">
        <Button
          onClick={() => navigate({ name: 'assessment', surveyId })}
          variant="secondary"
          size="md"
          className="w-full flex items-center justify-center gap-2"
        >
          <ClipboardCheck className="w-5 h-5" /> Site Assessment
        </Button>
      </div>

      {survey && windowCount === 0 && !adding && (
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="No windows yet"
          subtitle="Add the first window to this survey to begin measuring."
        />
      )}

      <div className="space-y-2">
        {survey?.windows.map((w, i) => (
          <Card key={w.id} className="p-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate({ name: 'window', surveyId, windowId: w.id, stage: 'measurements' })} className="flex-1 text-left min-w-0">
                <div className="font-semibold text-slate-900 truncate">
                  Window {i + 1} — {w.location || 'Unnamed'}
                </div>
                <div className="text-sm text-slate-500 truncate capitalize">
                  {w.aperture_material === 'other' ? w.aperture_material_other || 'Other' : w.aperture_material || '—'}
                </div>
              </button>
              <StatusBadge status={w.status} />
              <button
                onClick={async () => {
                  if (!confirm('Delete this window and all its data?')) return;
                  await db.deleteWindow(w.id);
                  reload();
                }}
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 touch-manipulation"
                aria-label="Delete window"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {survey && windowCount > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex justify-center">
            <Button onClick={() => setAdding(true)} variant="secondary" size="md" className="flex items-center gap-2">
              <Plus className="w-5 h-5" /> Add Another Window
            </Button>
          </div>
          <Button
            onClick={() => setShowComplete(true)}
            variant="success"
            size="lg"
            className="w-full flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-6 h-6" /> Complete Survey
          </Button>
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setAdding(false)}>
          <Card className="w-full sm:max-w-md p-5 rounded-t-2xl sm:rounded-2xl" >
            <div onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Add Window</h3>
              <div className="space-y-4">
                <Field label="Window Location">
                  <TextInput
                    autoFocus
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Rear Bedroom"
                    onKeyDown={(e) => e.key === 'Enter' && addWindow()}
                  />
                </Field>
                <Field label="Aperture Material">
                  <Select value={material} onChange={(e) => setMaterial(e.target.value as ApertureMaterial)}>
                    <option value="brick">Brick</option>
                    <option value="timber">Timber</option>
                    <option value="other">Other</option>
                  </Select>
                </Field>
                {material === 'other' && (
                  <Field label="Other material">
                    <TextInput value={materialOther} onChange={(e) => setMaterialOther(e.target.value)} placeholder="Describe the material" />
                  </Field>
                )}
              </div>
              <div className="flex gap-3 mt-5">
                <Button variant="secondary" onClick={() => setAdding(false)} className="flex-1">
                  Cancel
                </Button>
                <Button variant="primary" onClick={addWindow} className="flex-1">
                  Add & Measure
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {showComplete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowComplete(false)}>
          <Card className="w-full sm:max-w-md p-5 rounded-t-2xl sm:rounded-2xl">
            <div onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Complete this survey?</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {windowCount} {windowCount === 1 ? 'window has' : 'windows have'} been surveyed.
                  </p>
                  <p className="text-xs text-slate-400 mt-1">All data, measurements, drawings, photos and notes will be preserved.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setShowComplete(false)} className="flex-1">
                  Cancel
                </Button>
                <Button variant="success" onClick={completeSurvey} className="flex-1">
                  Complete Survey
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useSurvey } from '@/context/SurveyContext';
import { navigate } from '@/lib/router';
import { Button, Card, Field, TextInput, TextArea } from '@/components/ui';
import { loadSettings } from '@/screens/SettingsScreen';
import { Plus, ClipboardCheck } from 'lucide-react';

export default function JobScreen({ surveyId }: { surveyId: string }) {
  const { survey, loading, updateSurveyFields } = useSurvey();
  const [form, setForm] = useState({
    customer_name: '',
    contract_number: '',
    address: '',
    postcode: '',
    surveyor_name: '',
    survey_date: new Date().toISOString().slice(0, 10),
    profile_colour: '',
    furniture_colour: '',
  });
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (survey) {
      setForm({
        customer_name: survey.customer_name ?? '',
        contract_number: survey.contract_number ?? '',
        address: survey.address ?? '',
        postcode: survey.postcode ?? '',
        surveyor_name: survey.surveyor_name ?? loadSettings().defaultSurveyorName,
        survey_date: survey.survey_date ?? new Date().toISOString().slice(0, 10),
        profile_colour: survey.profile_colour ?? '',
        furniture_colour: survey.furniture_colour ?? '',
      });
    }
  }, [survey]);

  function update<K extends keyof typeof form>(k: K, v: string) {
    const next = { ...form, [k]: v };
    setForm(next);
    debouncedSave(next);
  }

  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  function debouncedSave(data: typeof form) {
    if (timer) clearTimeout(timer);
    const t = setTimeout(async () => {
      await updateSurveyFields(data);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    }, 600);
    setTimer(t);
  }

  if (loading && !survey) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-slate-500">Loading…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Job Details</h2>
        <p className="text-sm text-slate-500">These details apply to every window in this survey.</p>
      </div>

      <div className="space-y-4">
        <Card className="p-5 space-y-4">
          <Field label="Customer Name">
            <TextInput value={form.customer_name} onChange={(e) => update('customer_name', e.target.value)} placeholder="e.g. Mr J Smith" />
          </Field>
          <Field label="Contract Number">
            <TextInput value={form.contract_number} onChange={(e) => update('contract_number', e.target.value)} placeholder="e.g. CTR-2026-001" />
          </Field>
          <Field label="Address">
            <TextArea value={form.address} onChange={(e) => update('address', e.target.value)} rows={2} placeholder="Site address" />
          </Field>
          <Field label="Postcode">
            <TextInput value={form.postcode} onChange={(e) => update('postcode', e.target.value)} placeholder="e.g. SW1A 1AA" />
          </Field>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Surveyor Name">
              <TextInput value={form.surveyor_name} onChange={(e) => update('surveyor_name', e.target.value)} placeholder="Surveyor" />
            </Field>
            <Field label="Survey Date">
              <TextInput type="date" value={form.survey_date} onChange={(e) => update('survey_date', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Profile Colour">
              <TextInput value={form.profile_colour} onChange={(e) => update('profile_colour', e.target.value)} placeholder="e.g. Anthracite Grey" />
            </Field>
            <Field label="Furniture Colour">
              <TextInput value={form.furniture_colour} onChange={(e) => update('furniture_colour', e.target.value)} placeholder="e.g. Black" />
            </Field>
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            variant="primary"
            onClick={() => navigate({ name: 'products', surveyId })}
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Continue to Products
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate({ name: 'assessment', surveyId })}
            className="flex items-center gap-2"
          >
            <ClipboardCheck className="w-5 h-5" /> Site Assessment
          </Button>
          {savedFlash && <span className="text-emerald-600 text-sm font-medium">Saved</span>}
        </div>
      </div>
    </div>
  );
}

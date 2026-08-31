import { useEffect, useState } from 'react';
import { ArrowLeft, Save, WifiOff, AlertCircle, RefreshCw, Cloud } from 'lucide-react';
import { navigate } from '@/lib/router';
import { Button, Card, Field, NumberInput, TextArea } from '@/components/ui';
import { useConnection } from '@/context/ConnectionContext';
import { testCloudConnection, supabaseConfig } from '@/lib/supabase';

const STORAGE_KEY = 'surveyor.settings';

export interface AppSettings {
  defaultWidthTolerance: number;
  defaultHeightTolerance: number;
  defaultDiagonalTolerance: number;
  defaultSurveyorName: string;
  hingeSuggestions: string[];
}

const DEFAULTS: AppSettings = {
  defaultWidthTolerance: 10,
  defaultHeightTolerance: 10,
  defaultDiagonalTolerance: 10,
  defaultSurveyorName: '',
  hingeSuggestions: [],
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(s: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [hingeText, setHingeText] = useState('');
  const [saved, setSaved] = useState(false);
  const [cloudTest, setCloudTest] = useState<{
    cloudReachable: boolean;
    databaseReachable: boolean;
    sessionValid: boolean;
    endpoint: string;
    status?: number;
    error?: string;
  } | null>(null);
  const [testingCloud, setTestingCloud] = useState(false);
  const { simOffline, toggleSimulateOffline, lastSyncError, triggerSync, dismissSyncError } = useConnection();

  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    setHingeText(s.hingeSuggestions.join('\n'));
  }, []);

  async function runCloudTest() {
    setTestingCloud(true);
    setCloudTest(null);
    const result = await testCloudConnection();
    setCloudTest(result);
    setTestingCloud(false);
  }

  function save() {
    const hinges = hingeText
      .split('\n')
      .map((h) => h.trim())
      .filter(Boolean);
    const next = { ...settings, hingeSuggestions: hinges };
    saveSettings(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'home' })}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-xl font-bold text-slate-900">Settings</h2>
      </div>

      <div className="space-y-4">
        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Default Tolerances</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Width tolerance (mm)">
              <NumberInput
                value={settings.defaultWidthTolerance}
                onChange={(e) => setSettings({ ...settings, defaultWidthTolerance: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Height tolerance (mm)">
              <NumberInput
                value={settings.defaultHeightTolerance}
                onChange={(e) => setSettings({ ...settings, defaultHeightTolerance: Number(e.target.value) || 0 })}
              />
            </Field>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Applied to new windows. The diagonal check tolerance is fixed at 10 mm per the surveying standard.
          </p>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Surveyor</h3>
          <Field label="Default surveyor name">
            <TextArea
              value={settings.defaultSurveyorName}
              onChange={(e) => setSettings({ ...settings, defaultSurveyorName: e.target.value })}
              rows={1}
              placeholder="Your name"
            />
          </Field>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-1">Hinge Type Suggestions</h3>
          <p className="text-sm text-slate-500 mb-3">One per line. These appear as suggestions when entering a window's hinge type.</p>
          <TextArea
            value={hingeText}
            onChange={(e) => setHingeText(e.target.value)}
            rows={5}
            placeholder={'Friction hinge\nButt hinge\nReversible'}
          />
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-1">Simulate Offline Data Mode</h3>
          <p className="text-sm text-slate-500 mb-4">For development testing. When enabled, the app stops all cloud database calls — simulating no internet — while your computer stays connected.</p>
          <button
            onClick={toggleSimulateOffline}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors touch-manipulation ${
              simOffline
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <WifiOff className="w-5 h-5" />
            {simOffline ? 'Simulating Offline — ON' : 'Simulate Offline — OFF'}
          </button>
          {simOffline && (
            <p className="text-xs text-red-600 mt-2">All survey data is being read from and written to local IndexedDB only. No cloud calls are being made.</p>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-1">Sync Diagnostics</h3>
          <p className="text-sm text-slate-500 mb-4">Shows the last sync error (if any) to help diagnose cloud synchronisation failures.</p>
          {lastSyncError ? (
            <div className="space-y-2">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
                <div className="flex items-start gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div><span className="text-slate-500">Store:</span> <span className="font-mono font-semibold text-slate-900">{lastSyncError.store}</span></div>
                    <div><span className="text-slate-500">Operation:</span> <span className="font-mono font-semibold text-slate-900">{lastSyncError.operation}</span></div>
                    {lastSyncError.recordId && <div><span className="text-slate-500">Record:</span> <span className="font-mono font-semibold text-slate-900">{lastSyncError.recordId}</span></div>}
                    <div><span className="text-slate-500">Error code:</span> <span className="font-mono font-semibold text-slate-900">{lastSyncError.code}</span></div>
                    <div><span className="text-slate-500">Error message:</span> <span className="font-mono text-slate-900">{lastSyncError.message}</span></div>
                    {lastSyncError.endpoint && <div><span className="text-slate-500">Endpoint:</span> <span className="font-mono text-slate-900 break-all">{lastSyncError.endpoint}</span></div>}
                    {lastSyncError.method && <div><span className="text-slate-500">HTTP method:</span> <span className="font-mono text-slate-900">{lastSyncError.method}</span></div>}
                    <div><span className="text-slate-500">HTTP status:</span> <span className="font-mono text-slate-900">{lastSyncError.httpStatus ?? 'No response received'}</span></div>
                    <div><span className="text-slate-500">Request started:</span> <span className="font-mono text-slate-900">{lastSyncError.requestStartedAt ?? 'Unknown'}</span></div>
                    <div><span className="text-slate-500">Browser online:</span> <span className="font-mono text-slate-900">{lastSyncError.browserOnline ? 'Yes' : 'No'}</span></div>
                    <div><span className="text-slate-500">Supabase URL configured:</span> <span className="font-mono text-slate-900">{lastSyncError.hasSupabaseUrl ? 'Yes' : 'No'}</span></div>
                    <div><span className="text-slate-500">Public key present:</span> <span className="font-mono text-slate-900">{lastSyncError.hasAnonKey ? 'Yes' : 'No'}</span></div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => triggerSync()} className="flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4" /> Retry sync
                </Button>
                <Button size="sm" variant="ghost" onClick={dismissSyncError}>Dismiss</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-emerald-600">No sync errors. Last sync completed successfully.</p>
          )}
          <div className="mt-5 pt-5 border-t border-slate-200">
            <Button size="sm" variant="secondary" onClick={() => runCloudTest()} disabled={testingCloud} className="flex items-center gap-1.5">
              <Cloud className="w-4 h-4" /> {testingCloud ? 'Testing cloud connection…' : 'Test Cloud Connection'}
            </Button>
            {cloudTest && (
              <div className={`mt-3 rounded-lg border p-4 text-sm ${cloudTest.cloudReachable && cloudTest.databaseReachable ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <div className="font-semibold text-slate-900 mb-2">Cloud connection result</div>
                <div>Cloud reachable — <strong>{cloudTest.cloudReachable ? 'Yes' : 'No'}</strong></div>
                <div>Database reachable — <strong>{cloudTest.databaseReachable ? 'Yes' : 'No'}</strong></div>
                <div>Authentication/session — <strong>{cloudTest.sessionValid ? 'Valid' : 'Unavailable'}</strong></div>
                <div className="mt-2 text-xs text-slate-600 break-all">Endpoint: {cloudTest.endpoint}</div>
                {cloudTest.status !== undefined && <div className="text-xs text-slate-600">HTTP status: {cloudTest.status}</div>}
                {cloudTest.error && <div className="mt-2 text-xs text-red-700">{cloudTest.error}</div>}
                {!supabaseConfig.url && <div className="mt-2 text-xs text-red-700">Supabase URL is not configured in this build.</div>}
              </div>
            )}
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <Button onClick={save} variant="primary" size="lg">
            <span className="flex items-center gap-2">
              <Save className="w-5 h-5" /> Save Settings
            </span>
          </Button>
          {saved && <span className="text-emerald-600 font-medium text-sm">Saved</span>}
        </div>
      </div>
    </div>
  );
}

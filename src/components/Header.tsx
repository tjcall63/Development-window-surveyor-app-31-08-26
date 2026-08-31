import { ArrowLeft, Home, Ruler, Wifi, WifiOff, Cloud, CloudUpload, Check, AlertCircle } from 'lucide-react';
import type { Route } from '@/lib/router';
import { navigate } from '@/lib/router';
import { useSurvey } from '@/context/SurveyContext';
import { useConnection } from '@/context/ConnectionContext';
import type { FullWindow } from '@/lib/types';

const STAGES = ['measurements', 'checks', 'drawing', 'specification', 'photos', 'review'] as const;
const STAGE_LABELS: Record<string, string> = {
  measurements: 'Measurements',
  checks: 'Checks',
  drawing: 'Drawing',
  specification: 'Specification',
  photos: 'Photos & Notes',
  review: 'Review',
};

export function Header({ route }: { route: Route }) {
  const { survey } = useSurvey();

  let title = 'Surveyor';
  let subtitle: string | null = null;
  let showBack = false;
  let backTarget: Route | null = null;
  let stageIndex = -1;

  if (route.name === 'home') {
    title = 'Window Surveyor';
  } else if (route.name === 'settings') {
    title = 'Settings';
    showBack = true;
    backTarget = { name: 'home' };
  } else if (route.name === 'job') {
    title = 'Job Details';
    showBack = true;
    backTarget = { name: 'home' };
  } else if (route.name === 'products') {
    title = survey ? `${survey.customer_name || 'Survey'}` : 'Products';
    subtitle = survey?.contract_number || null;
    showBack = true;
    backTarget = { name: 'home' };
  } else if (route.name === 'window') {
    const w = survey?.windows.find((x) => x.id === route.windowId) ?? null;
    const idx = w ? survey?.windows.findIndex((x) => x.id === w.id) ?? -1 : -1;
    const num = idx >= 0 ? idx + 1 : null;
    title = num && w?.location ? `Window ${num} — ${w.location}` : w?.location ? w.location : 'Window';
    subtitle = survey?.customer_name || null;
    showBack = true;
    backTarget = { name: 'products', surveyId: route.surveyId };
    stageIndex = STAGES.indexOf(route.stage as (typeof STAGES)[number]);
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 print:hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
        {showBack ? (
          <button
            onClick={() => backTarget && navigate(backTarget)}
            className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 touch-manipulation"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="p-2 -ml-2 text-slate-900">
            <Ruler className="w-5 h-5" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-slate-900 truncate leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 truncate leading-tight">{subtitle}</p>}
        </div>

        <SaveIndicator />

        {route.name === 'window' && (
          <button
            onClick={() => navigate({ name: 'home' })}
            className="p-2 -mr-2 rounded-lg text-slate-600 hover:bg-slate-100 touch-manipulation"
            aria-label="Home"
          >
            <Home className="w-5 h-5" />
          </button>
        )}
      </div>

      {route.name === 'window' && stageIndex >= 0 && (
        <div className="border-t border-slate-100 bg-slate-50/80">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto">
            {STAGES.map((s, i) => (
              <button
                key={s}
                onClick={() => navigate({ name: 'window', surveyId: route.surveyId, windowId: route.windowId, stage: s })}
                className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  i === stageIndex
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {STAGE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

function SaveIndicator() {
  const { online, syncStatus, pendingCount } = useConnection();

  let icon: React.ReactNode;
  let label: string;
  let cls: string;

  if (!online) {
    icon = <WifiOff className="w-4 h-4" />;
    label = pendingCount > 0 ? `Offline — ${pendingCount} waiting` : 'Offline — Saved on device';
    cls = 'text-slate-500';
  } else if (syncStatus === 'syncing') {
    icon = <CloudUpload className="w-4 h-4 animate-pulse" />;
    label = 'Syncing…';
    cls = 'text-blue-600';
  } else if (syncStatus === 'error') {
    icon = <AlertCircle className="w-4 h-4" />;
    label = 'Sync error — see Settings';
    cls = 'text-red-600';
  } else if (pendingCount > 0) {
    icon = <CloudUpload className="w-4 h-4" />;
    label = `${pendingCount} waiting to sync`;
    cls = 'text-amber-600';
  } else if (syncStatus === 'synced') {
    icon = <Check className="w-4 h-4" />;
    label = 'Synced to cloud';
    cls = 'text-emerald-600';
  } else {
    icon = <Wifi className="w-4 h-4" />;
    label = 'Online — Synced';
    cls = 'text-emerald-600';
  }

  return (
    <span className={`text-xs sm:text-sm font-medium ${cls} flex items-center gap-1.5`}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

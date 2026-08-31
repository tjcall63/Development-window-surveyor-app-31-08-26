import { useEffect, useState } from 'react';
import { FilePlus2, FolderOpen, CheckCircle2, Settings as SettingsIcon, Trash2, Ruler } from 'lucide-react';
import { listSurveys, createSurvey, deleteSurvey } from '@/lib/db';
import { navigate } from '@/lib/router';
import type { Survey } from '@/lib/types';
import { Button, Card, EmptyState, StatusBadge } from '@/components/ui';
import { useConnection } from '@/context/ConnectionContext';

export default function HomeScreen() {
  const [inProgress, setInProgress] = useState<Survey[]>([]);
  const [completed, setCompleted] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'menu' | 'continue' | 'completed'>('menu');
  const { triggerSync, online } = useConnection();

  useEffect(() => {
    refresh();
    if (online) triggerSync();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const [ip, done] = await Promise.all([listSurveys('in_progress'), listSurveys('completed')]);
      setInProgress(ip);
      setCompleted(done);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function newSurvey() {
    try {
      const s = await createSurvey({ survey_date: new Date().toISOString().slice(0, 10) });
      navigate({ name: 'job', surveyId: s.id });
    } catch {
      // ignore
    }
  }

  async function removeSurvey(id: string) {
    if (!confirm('Delete this survey and all its windows? This cannot be undone.')) return;
    await deleteSurvey(id);
    refresh();
  }

  if (view === 'continue') {
    return (
      <SurveyList
        title="Continue Survey"
        surveys={inProgress}
        loading={loading}
        onBack={() => setView('menu')}
        onOpen={(id) => navigate({ name: 'products', surveyId: id })}
        onDelete={removeSurvey}
      />
    );
  }

  if (view === 'completed') {
    return (
      <SurveyList
        title="Completed Surveys"
        surveys={completed}
        loading={loading}
        onBack={() => setView('menu')}
        onOpen={(id) => navigate({ name: 'summary', surveyId: id })}
        onDelete={removeSurvey}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 text-white mb-4">
          <Ruler className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Window Surveyor</h1>
        <p className="text-slate-500 mt-1">Professional on-site window surveying</p>
      </div>

      <div className="space-y-3">
        <MenuCard icon={<FilePlus2 className="w-6 h-6" />} title="New Survey" desc="Start a new job survey" onClick={newSurvey} highlight />
        <MenuCard
          icon={<FolderOpen className="w-6 h-6" />}
          title="Continue Survey"
          desc={inProgress.length ? `${inProgress.length} in progress` : 'No surveys in progress'}
          onClick={() => setView('continue')}
        />
        <MenuCard
          icon={<CheckCircle2 className="w-6 h-6" />}
          title="Completed Surveys"
          desc={completed.length ? `${completed.length} completed` : 'No completed surveys'}
          onClick={() => setView('completed')}
        />
        <MenuCard icon={<SettingsIcon className="w-6 h-6" />} title="Settings" desc="Tolerances and preferences" onClick={() => navigate({ name: 'settings' })} />
      </div>
    </div>
  );
}

function MenuCard({
  icon,
  title,
  desc,
  onClick,
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all touch-manipulation text-left ${
        highlight
          ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 shadow-sm'
          : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div className={`p-2.5 rounded-lg ${highlight ? 'bg-white/10' : 'bg-slate-100'}`}>{icon}</div>
      <div className="flex-1">
        <div className="font-semibold text-lg">{title}</div>
        <div className={`text-sm ${highlight ? 'text-slate-300' : 'text-slate-500'}`}>{desc}</div>
      </div>
    </button>
  );
}

function SurveyList({
  title,
  surveys,
  loading,
  onBack,
  onOpen,
  onDelete,
}: {
  title: string;
  surveys: Survey[];
  loading: boolean;
  onBack: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      </div>

      {loading ? (
        <p className="text-slate-500 text-center py-12">Loading…</p>
      ) : surveys.length === 0 ? (
        <EmptyState icon={<FolderOpen className="w-12 h-12" />} title="No surveys" subtitle="Surveys you start will appear here." />
      ) : (
        <div className="space-y-2">
          {surveys.map((s) => (
            <Card key={s.id} className="p-4 flex items-center gap-3">
              <button onClick={() => onOpen(s.id)} className="flex-1 text-left min-w-0">
                <div className="font-semibold text-slate-900 truncate">{s.customer_name || 'Untitled survey'}</div>
                <div className="text-sm text-slate-500 truncate">
                  {[s.contract_number, s.address, s.postcode].filter(Boolean).join(' · ') || 'No details'}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <StatusBadge status={s.status === 'completed' ? 'complete' : 'in_progress'} />
                  <span className="text-xs text-slate-400">{new Date(s.updated_at).toLocaleDateString()}</span>
                </div>
              </button>
              <button
                onClick={() => onDelete(s.id)}
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 touch-manipulation"
                aria-label="Delete survey"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

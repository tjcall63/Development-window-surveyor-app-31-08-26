import type { useWindowData } from '@/hooks/useWindowData';
import { Card, Button, CheckBadge } from '@/components/ui';
import { widthCheck, heightCheck, diagonalCheck } from '@/lib/calc';
import { navigate } from '@/lib/router';
import { useSurvey } from '@/context/SurveyContext';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

type Data = ReturnType<typeof useWindowData>;

export default function ChecksStage({ data }: { data: Data }) {
  const { win } = data;
  const m = win?.measurements;
  const b = win?.buried;
  const survey = useSurvey();
  const surveyId = survey.survey?.id ?? '';

  if (!m || !b) {
    return (
      <div className="space-y-5">
        <SectionTitle title="Checks" subtitle="Cross-check results appear once measurements are entered" />
        <Card className="p-8 text-center text-slate-500">Enter measurements first to see cross-checks.</Card>
      </div>
    );
  }

  const w = widthCheck(m, b);
  const h = heightCheck(m, b);
  const d = diagonalCheck(m);

  return (
    <div className="space-y-5">
      <SectionTitle title="Checks" subtitle="Automatic cross-checks of your measurements" />

      <CheckCard
        title="Width Buried Check"
        result={w}
        onReview={() => navigate({ name: 'window', surveyId, windowId: win!.id, stage: 'measurements' })}
      />
      <CheckCard
        title="Height Buried Check"
        result={h}
        onReview={() => navigate({ name: 'window', surveyId, windowId: win!.id, stage: 'measurements' })}
      />
      <CheckCard
        title="Diagonal Check"
        result={d}
        onReview={() => navigate({ name: 'window', surveyId, windowId: win!.id, stage: 'measurements' })}
      />

      <Card className="p-4 bg-slate-50 border-slate-200">
        <p className="text-sm text-slate-600">
          The app calculates and highlights discrepancies but never alters your measurements. The qualified surveyor decides which measurement to re-check.
        </p>
      </Card>
    </div>
  );
}

function CheckCard({
  title,
  result,
  onReview,
}: {
  title: string;
  result: ReturnType<typeof widthCheck>;
  onReview: () => void;
}) {
  const icon =
    result.status === 'pass' ? <CheckCircle2 className="w-8 h-8 text-emerald-600" /> :
    result.status === 'review' ? <AlertTriangle className="w-8 h-8 text-amber-500" /> :
    <Clock className="w-8 h-8 text-slate-400" />;

  const border =
    result.status === 'pass' ? 'border-emerald-200 bg-emerald-50/50' :
    result.status === 'review' ? 'border-amber-200 bg-amber-50/50' :
    'border-slate-200 bg-slate-50/50';

  return (
    <Card className={`p-5 border-2 ${border}`}>
      <div className="flex items-start gap-4">
        <div className="shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h3 className="font-semibold text-slate-900">{title}</h3>
            <CheckBadge status={result.status} />
          </div>
          <p className="text-sm font-medium text-slate-700 mb-3">{result.label}</p>
          {result.details.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              {result.details.map((d) => (
                <div key={d.label} className="bg-white rounded-lg p-2.5 border border-slate-200">
                  <div className="text-xs text-slate-500">{d.label}</div>
                  <div className="text-sm font-semibold text-slate-900">{d.value}</div>
                </div>
              ))}
            </div>
          )}
          {result.status === 'review' && (
            <Button size="sm" variant="secondary" onClick={onReview}>
              Review Measurements
            </Button>
          )}
        </div>
      </div>
    </Card>
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

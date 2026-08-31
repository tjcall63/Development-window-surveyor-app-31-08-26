import { useWindowData } from '@/hooks/useWindowData';
import { navigate } from '@/lib/router';
import { useSurvey } from '@/context/SurveyContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';
import MeasurementsStage from '@/components/stages/MeasurementsStage';
import ChecksStage from '@/components/stages/ChecksStage';
import DrawingStage from '@/components/stages/DrawingStage';
import SpecificationStage from '@/components/stages/SpecificationStage';
import PhotosStage from '@/components/stages/PhotosStage';
import ReviewStage from '@/components/stages/ReviewStage';

const STAGES = ['measurements', 'checks', 'drawing', 'specification', 'photos', 'review'] as const;
type Stage = (typeof STAGES)[number];

export default function WindowScreen({ surveyId, windowId, stage }: { surveyId: string; windowId: string; stage: string }) {
  const data = useWindowData(windowId);
  const { survey, saveStatus } = useSurvey();
  const stageIndex = Math.max(0, STAGES.indexOf(stage as Stage));
  const current = STAGES[stageIndex];
  const win = data.win;

  if (!win) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-slate-500">Loading window…</div>;
  }

  const goStage = (s: Stage) => navigate({ name: 'window', surveyId, windowId, stage: s });
  const prev = stageIndex > 0 ? STAGES[stageIndex - 1] : null;
  const next = stageIndex < STAGES.length - 1 ? STAGES[stageIndex + 1] : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28">
      {current === 'measurements' && <MeasurementsStage data={data} />}
      {current === 'checks' && <ChecksStage data={data} />}
      {current === 'drawing' && <DrawingStage data={data} />}
      {current === 'specification' && <SpecificationStage data={data} />}
      {current === 'photos' && <PhotosStage data={data} />}
      {current === 'review' && <ReviewStage data={data} surveyId={surveyId} onStatus={(s) => saveStatus(windowId, s)} />}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 print:hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Button variant="secondary" onClick={() => prev && goStage(prev)} disabled={!prev} className="flex items-center gap-1">
            <ChevronLeft className="w-5 h-5" /> Previous
          </Button>
          <span className="text-sm text-slate-400 hidden sm:block">
            {stageIndex + 1} of {STAGES.length}
          </span>
          <Button variant="secondary" onClick={() => next && goStage(next)} disabled={!next} className="flex items-center gap-1">
            Next <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import * as db from '@/lib/db';
import { navigate } from '@/lib/router';
import { Button, Card, CheckBadge } from '@/components/ui';
import { calcMS, calcBuried, widthCheck, heightCheck, diagonalCheck, num, round } from '@/lib/calc';
import type { FullSurvey, FullWindow, SiteAssessment } from '@/lib/types';
import { FileDown, ArrowLeft } from 'lucide-react';

export default function SurveySummaryScreen({ surveyId }: { surveyId: string }) {
  const [survey, setSurvey] = useState<FullSurvey | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.getSurvey(surveyId).then((s) => {
      setSurvey(s);
      setLoading(false);
    });
  }, [surveyId]);

  const generatePDF = useCallback(() => {
    if (!survey) return;
    const contract = sanitizeFilename(survey.contract_number ?? 'Unknown');
    const customer = sanitizeFilename(survey.customer_name ?? 'Survey');
    const date = new Date().toISOString().slice(0, 10);
    const filename = `${contract}_${customer}_Survey_${date}.pdf`;
    const style = document.createElement('style');
    style.id = 'pdf-survey-style';
    style.media = 'print';
    style.innerHTML = `@page { size: A4; margin: 15mm; }`;
    document.head.appendChild(style);
    document.title = filename;
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.head.removeChild(style);
      }, 500);
    }, 200);
  }, [survey]);

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-slate-500">Loading…</div>;
  }

  if (!survey) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-slate-500">Survey not found.</div>;
  }

  const isCompleted = survey.status === 'completed';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      {/* Screen UI (hidden in print) */}
      <div className="print:hidden">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'home' })}>
            <ArrowLeft className="w-5 h-5" /> Home
          </Button>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">{survey.customer_name || 'Untitled Survey'}</h2>
          <p className="text-slate-500 mt-1">
            {[survey.contract_number, survey.address, survey.postcode].filter(Boolean).join(' · ') || 'No details'}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
              {isCompleted ? 'Completed' : 'In Progress'}
            </span>
            <span className="text-sm text-slate-500">{survey.windows.length} {survey.windows.length === 1 ? 'window' : 'windows'}</span>
          </div>
        </div>

        {/* Window summary cards */}
        <div className="space-y-2 mb-6">
          {survey.windows.map((w, i) => (
            <Card key={w.id} className="p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate({ name: 'window', surveyId, windowId: w.id, stage: 'review' })}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="font-semibold text-slate-900 truncate">
                    Window {i + 1} — {w.location || 'Unnamed'}
                  </div>
                  <div className="text-sm text-slate-500 truncate capitalize">
                    {w.aperture_material === 'other' ? w.aperture_material_other || 'Other' : w.aperture_material || '—'}
                  </div>
                </button>
                <CheckBadge status={w.status === 'complete' ? 'pass' : w.status === 'review_required' ? 'review' : 'incomplete'} />
              </div>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            variant="primary"
            size="lg"
            onClick={generatePDF}
            className="w-full flex items-center justify-center gap-2"
          >
            <FileDown className="w-6 h-6" /> Generate Complete Survey PDF
          </Button>
          {!isCompleted && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate({ name: 'products', surveyId })}
              className="w-full flex items-center justify-center gap-2"
            >
              Back to Windows
            </Button>
          )}
          {isCompleted && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate({ name: 'assessment', surveyId })}
              className="w-full flex items-center justify-center gap-2"
            >
              Edit Site Assessment
            </Button>
          )}
          {isCompleted && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate({ name: 'products', surveyId })}
              className="w-full flex items-center justify-center gap-2"
            >
              View Windows
            </Button>
          )}
        </div>

        <p className="text-xs text-slate-400 text-center mt-4">
          The PDF will include all {survey.windows.length} {survey.windows.length === 1 ? 'window' : 'windows'} in this survey.
        </p>
      </div>

      {/* Printable full survey document */}
      <div className="hidden print:block">
        <SurveyPrintDocument survey={survey} />
      </div>
    </div>
  );
}

function SurveyPrintDocument({ survey }: { survey: FullSurvey }) {
  return (
    <div className="text-slate-900 text-sm">
      <div className="mb-5 pb-3 border-b-2 border-slate-900">
        <h1 className="text-2xl font-bold mb-1">Window Survey Report</h1>
        <h2 className="text-lg text-slate-600 mb-3">{survey.customer_name || '—'}</h2>
        <div className="grid grid-cols-2 gap-x-5 gap-y-1.5">
          <PrintInfo label="Contract" value={survey.contract_number ?? '—'} />
          <PrintInfo label="Survey date" value={survey.survey_date ?? '—'} />
          <PrintInfo label="Surveyor" value={survey.surveyor_name ?? '—'} />
          <PrintInfo label="Address" value={survey.address ?? '—'} />
          <PrintInfo label="Profile colour" value={survey.profile_colour ?? '—'} />
          <PrintInfo label="Furniture colour" value={survey.furniture_colour ?? '—'} />
        </div>
        <div className="mt-2 text-xs text-slate-500">
          {survey.windows.length} {survey.windows.length === 1 ? 'window' : 'windows'} surveyed
        </div>
      </div>

      <SurveySiteAssessment survey={survey} assessment={survey.site_assessment} />

      {/* Each window */}
      {survey.windows.map((w, i) => (
        <WindowPrintSection key={w.id} win={w} index={i} isFirst={i === 0} />
      ))}
    </div>
  );
}

function SurveySiteAssessment({ survey, assessment }: { survey: FullSurvey; assessment: SiteAssessment | null | undefined }) {
  const yn = (v: string | null | undefined) => (v === 'yes' ? 'Yes' : v === 'no' ? 'No' : '');
  const num = (v: number | null | undefined) => (v != null ? String(v) : '');
  return (
    <section className="border border-slate-300 rounded-lg p-2.5 mb-3 text-[10px]">
      <div className="bg-slate-800 text-white font-bold uppercase tracking-wide px-2.5 py-1 rounded mb-1.5 text-xs">Survey Site Assessment</div>

      <div className="grid grid-cols-5 gap-x-3 gap-y-1">
        <AssessmentField label="Windows" value={num(assessment?.windows) || String(survey.windows.length)} />
        <AssessmentField label="UPVC Doors" value={num(assessment?.upvc_doors)} />
        <AssessmentField label="Composite Doors" value={num(assessment?.composite_doors)} />
        <AssessmentField label="Double Doors" value={num(assessment?.double_doors)} />
        <AssessmentField label="Patio Doors" value={num(assessment?.patio_doors)} />
        <AssessmentField label="Shaped Frames" value={assessment?.shaped_frames ?? ''} />
        <AssessmentField label="Box Sash" value={assessment?.box_sash ?? ''} />
        <AssessmentChoice label="Roofline Works" options="Yes / No" selected={yn(assessment?.roofline_works)} />
        <AssessmentField label="Other" value={assessment?.other ?? ''} />
      </div>

      <div className="grid grid-cols-4 gap-x-3 gap-y-1 mt-1 border-t border-slate-200 pt-1">
        <AssessmentChoice label="Bay Windows" options="2 / 3 / 4 / 5 part / other" selected={assessment?.bay_windows ?? ''} className="col-span-2" />
        {(assessment?.bay_windows === 'other') && (
          <AssessmentField label="Bay Windows (Other)" value={assessment?.bay_windows_other ?? ''} className="col-span-2" />
        )}
        <AssessmentField label="Fascia Size" value={assessment?.fascia_size ?? ''} />
        <AssessmentField label="Soffit Depth" value={assessment?.soffit_depth ?? ''} />
        <AssessmentField label="Linear Metres" value={assessment?.linear_metres ?? ''} />
      </div>

      <div className="grid grid-cols-3 gap-x-3 gap-y-1 mt-1 border-t border-slate-200 pt-1">
        <AssessmentChoice label="Good Access Internally" options="Y / N" selected={yn(assessment?.good_access_internally)} />
        <AssessmentChoice label="Good Access Externally" options="Y / N" selected={yn(assessment?.good_access_externally)} />
        <AssessmentChoice label="Access to Rear" options="Y / N" selected={yn(assessment?.access_to_rear)} />
        <AssessmentChoice label="Access Solution Required" options="Y / N" selected={yn(assessment?.access_solution_required)} />
        <AssessmentChoice label="Suspect Material" options="Y / N" selected={yn(assessment?.suspect_material)} />
        <AssessmentChoice label="Overhead Cables" options="Y / N" selected={yn(assessment?.overhead_cables)} />
        <AssessmentChoice label="Parking Restrictions" options="Y / N" selected={yn(assessment?.parking_restrictions)} className="col-span-1" />
        <AssessmentChoice label="Full Elevation Photos" options="Y / N" selected={yn(assessment?.full_elevation_photos)} />
        <AssessmentChoice label="Internal Photos" options="Y / N" selected={yn(assessment?.internal_photos)} />
        <AssessmentChoice label="Materials Sheet Completed" options="Y / N" selected={yn(assessment?.materials_sheet_completed)} className="col-span-2" />
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1 border-t border-slate-200 pt-1">
        <AssessmentField label="Access Solution Comments" value={assessment?.access_solution_comments ?? ''} />
        <AssessmentField label="Suspect Material Comments" value={assessment?.suspect_material_comments ?? ''} />
        <AssessmentField label="Overhead Cables Comments" value={assessment?.overhead_cables_comments ?? ''} />
        <AssessmentField label="Parking Comments" value={assessment?.parking_comments ?? ''} />
      </div>

      <div className="mt-1 border-t border-slate-200 pt-1">
        <div className="font-semibold text-slate-700 mb-0.5">Surveyor Comments</div>
        <div className="min-h-[1.8rem] border-b border-slate-400 px-1 text-slate-900 leading-tight">{assessment?.surveyor_comments ?? ''}</div>
      </div>
    </section>
  );
}

function AssessmentField({ label, value = '', className = '', multiline = false }: { label: string; value?: string; className?: string; multiline?: boolean }) {
  return (
    <div className={className}>
      <div className="font-semibold text-slate-700 leading-tight">{label}</div>
      <div className={`${multiline ? 'h-8' : 'min-h-[0.9rem]'} border-b border-slate-400 px-0.5 text-slate-900 leading-tight`}>{value}</div>
    </div>
  );
}

function AssessmentChoice({ label, options, selected = '', className = '' }: { label: string; options: string; selected?: string; className?: string }) {
  const optionList = options.split(' / ');
  const normalize = (v: string) => v.toLowerCase().replace(/-/g, ' ').replace(/part/g, '').trim();
  const selNorm = normalize(selected);
  return (
    <div className={className}>
      <div className="font-semibold text-slate-700 leading-tight">{label}</div>
      <div className="min-h-[0.9rem] flex items-center gap-1.5 text-slate-900 leading-tight">
        {optionList.map((option) => {
          const isSel = selNorm === normalize(option);
          return (
            <span key={option} className={`inline-flex items-center gap-0.5 whitespace-nowrap ${isSel ? 'font-bold text-slate-900' : ''}`}>
              <span className={`inline-block w-2.5 h-2.5 border border-slate-500 ${isSel ? 'bg-slate-700' : ''}`} />
              {option}
            </span>
          );
        })}
        {selected && !optionList.some((o) => normalize(o) === selNorm) && (
          <span className="font-bold text-slate-900">· {selected}</span>
        )}
      </div>
    </div>
  );
}

function WindowPrintSection({ win, index, isFirst }: { win: FullWindow; index: number; isFirst: boolean }) {
  const m = win.measurements;
  const b = win.buried;
  const spec = win.specification;
  const ms = m ? calcMS(m) : null;
  const buried = b ? calcBuried(b) : null;
  const wCheck = m && b ? widthCheck(m, b) : null;
  const hCheck = m && b ? heightCheck(m, b) : null;
  const dCheck = m ? diagonalCheck(m) : null;

  return (
    <div className={isFirst ? 'break-before-page' : ''}>
      {/* Window header */}
      <div className="mb-3 pb-1.5 border-b border-slate-400 avoid-break-inside">
        <h2 className="text-lg font-bold">Window {index + 1} — {win.location || 'Unnamed'}</h2>
        <div className="text-xs text-slate-600 mt-0.5 capitalize">
          Aperture: {win.aperture_material === 'other' ? win.aperture_material_other ?? 'Other' : win.aperture_material ?? '—'}
        </div>
      </div>

      <PrintSection title="Measurements">
        <div className="grid grid-cols-4 gap-2">
          <PrintInfo label="PL H × W" value={m ? `${m.pl_height ?? '—'} × ${m.pl_width ?? '—'} mm` : '—'} />
          <PrintInfo label="BL H × W" value={m ? `${m.bl_height ?? '—'} × ${m.bl_width ?? '—'} mm` : '—'} />
          <PrintInfo label="Width tolerance" value={m ? `${m.width_tolerance} mm` : '—'} />
          <PrintInfo label="Height tolerance" value={m ? `${m.height_tolerance} mm` : '—'} />
        </div>
        <div className="mt-2 rounded-lg border-2 border-slate-700 bg-slate-100 px-4 py-2.5">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600">Final Manufacturing Size</div>
          <div className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-950">
            {ms ? `${ms.height ?? '—'} × ${ms.width ?? '—'} mm` : '— × — mm'}
          </div>
          <div className="mt-0.5 text-xs text-slate-600">MS Height × Width · tolerance values retained above</div>
          <div className="mt-1 text-xs text-slate-700 italic">MS is inclusive of add-ons and couplers, but excludes bay pole attachments.</div>
        </div>
      </PrintSection>

      {/* Buried sizes */}
      <PrintSection title="Buried Sizes">
        <div className="grid grid-cols-4 gap-2">
          <PrintInfo label="Left" value={buried?.left.buried != null ? `${buried.left.buried} mm` : '—'} />
          <PrintInfo label="Right" value={buried?.right.buried != null ? `${buried.right.buried} mm` : '—'} />
          <PrintInfo label="Top" value={buried?.top.buried != null ? `${buried.top.buried} mm` : '—'} />
          <PrintInfo label="Bottom" value={buried?.bottom.buried != null ? `${buried.bottom.buried} mm` : '—'} />
        </div>
      </PrintSection>

      {/* Cross-checks */}
      <PrintSection title="Cross-Checks">
        <div className="space-y-1">
          <PrintCheck label="Width buried check" result={wCheck} />
          <PrintCheck label="Height buried check" result={hCheck} />
          <PrintCheck label="Diagonal check" result={dCheck} />
        </div>
      </PrintSection>

      {/* Diagonal details */}
      <PrintSection title="Diagonal">
        <div className="grid grid-cols-3 gap-2">
          <PrintInfo label="Site" value={m?.site_diagonal != null ? `${m.site_diagonal} mm` : '—'} />
          <PrintInfo label="True" value={m && m.pl_width != null && m.pl_height != null ? `${round(Math.sqrt((num(m.pl_width) ?? 0) ** 2 + (num(m.pl_height) ?? 0) ** 2))} mm` : '—'} />
          <PrintInfo label="Difference" value={dCheck?.details.find((d) => d.label === 'Difference')?.value ?? '—'} />
        </div>
      </PrintSection>

      {/* Specification */}
      <PrintSection title="Specification">
        <div className="grid grid-cols-3 gap-2">
          <PrintInfo label="Cill" value={spec?.cill_type === 'other' ? spec.cill_other ?? 'Other' : spec?.cill_type ? `${spec.cill_type} mm` : '—'} />
          <PrintInfo label="Cill length" value={spec?.cill_length != null ? `${spec.cill_length} mm` : '—'} />
          <PrintInfo label="Glass" value={spec?.glass ?? '—'} />
          <PrintInfo label="Floor to glass" value={spec?.floor_to_glass != null ? `${spec.floor_to_glass} mm` : '—'} />
          <PrintInfo label="Toughened" value={spec?.toughened === true ? 'Yes' : spec?.toughened === false ? 'No' : '—'} />
          <PrintInfo label="Hinge type" value={spec?.hinge_type ?? '—'} />
          <PrintInfo label="Trickle vent" value={spec?.trickle_vent_location === 'other' ? spec.trickle_vent_other ?? 'Other' : spec?.trickle_vent_location ?? '—'} />
          <PrintInfo label="Fascia drop" value={m?.fascia_drop == null ? '—' : m.fascia_drop === -1 ? 'N/A' : `${m.fascia_drop} mm`} />
          <PrintInfo label="Coupler" value={spec?.coupler ?? '—'} />
          <PrintInfo label="Add-on L" value={formatAddon(spec?.addon_left)} />
          <PrintInfo label="Add-on R" value={formatAddon(spec?.addon_right)} />
          <PrintInfo label="Add-on T" value={formatAddon(spec?.addon_top)} />
          <PrintInfo label="Add-on B" value={formatAddon(spec?.addon_bottom)} />
          <PrintInfo label="Georgian" value={spec?.georgian_type ?? '—'} />
          <PrintInfo label="Floor Area" value={spec?.floor_area != null ? `${spec.floor_area.toFixed(2)} m²` : '—'} />
          {spec?.bar_width && <PrintInfo label="Bar width" value={spec.bar_width} />}
          {spec?.georgian_colour && <PrintInfo label="Colour" value={spec.georgian_colour} />}
          {spec?.lead_bevel_details && <PrintInfo label="Lead/Bevel" value={spec.lead_bevel_details} />}
        </div>
        {num(spec?.floor_to_glass) !== null && num(spec?.floor_to_glass)! < 800 && (
          <div className="mt-2 p-2 border border-amber-400 bg-amber-100 text-amber-900 text-xs rounded">
            <strong>Safety glazing may be required.</strong> Floor to glass is {spec?.floor_to_glass} mm (below 800 mm from finished floor level).
          </div>
        )}
      </PrintSection>

      {(win.mullions_answered != null || win.transoms_answered != null) && (
        <PrintSection title="Mullions & Transoms">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500 mb-1">Mullions</div>
              <div>{win.mullions_answered === false ? 'None' : win.mullions_answered === true && win.mullions.length > 0 ? win.mullions.map((mu, i) => `M${i + 1}: ${mu.value_mm}mm`).join(', ') : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Transoms</div>
              <div>{win.transoms_answered === false ? 'None' : win.transoms_answered === true && win.transoms.length > 0 ? win.transoms.map((tr, i) => `T${i + 1}: ${tr.value_mm}mm`).join(', ') : '—'}</div>
            </div>
          </div>
        </PrintSection>
      )}

      {/* Drawing */}
      {win.drawing?.image_data && (
        <PrintSection title="Drawing">
          <img src={win.drawing.image_data} alt="Window drawing" className="w-full max-w-sm border border-slate-300 rounded" />
          {win.annotations.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {win.annotations.map((ann) => (
                <span key={ann.id} className="px-1.5 py-0.5 rounded bg-yellow-100 border border-yellow-300 text-[10px] font-semibold text-slate-800">
                  {ann.text}
                </span>
              ))}
            </div>
          )}
        </PrintSection>
      )}

      {/* Photos */}
      {win.photos.length > 0 && (
        <PrintSection title="Photographs">
          <div className="grid grid-cols-3 gap-2">
            {win.photos.map((p) => (
              <div key={p.id} className="border border-slate-300 rounded overflow-hidden">
                <img src={p.image_data} alt={p.caption ?? ''} className="w-full h-auto" />
                {p.caption && <div className="text-xs text-slate-500 p-1">{p.caption}</div>}
              </div>
            ))}
          </div>
        </PrintSection>
      )}

      {/* Notes */}
      {(spec?.trims_internal_cill || spec?.site_notes) && (
        <PrintSection title="Notes">
          {spec?.trims_internal_cill && <div className="mb-1"><span className="text-xs text-slate-500">Trims / Internal Cill:</span> {spec.trims_internal_cill}</div>}
          {spec?.site_notes && <div><span className="text-xs text-slate-500">Site / Fitting:</span> {spec.site_notes}</div>}
        </PrintSection>
      )}
    </div>
  );
}

function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2.5 avoid-break-inside">
      <h3 className="font-semibold text-slate-900 mb-1 text-xs uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function PrintInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function PrintCheck({ label, result }: { label: string; result: ReturnType<typeof widthCheck> | null }) {
  if (!result) return <div className="flex justify-between"><span>{label}</span><span className="text-slate-400">—</span></div>;
  return (
    <div className="flex justify-between items-center">
      <span>{label}</span>
      <span className={`font-semibold ${result.status === 'pass' ? 'text-emerald-700' : result.status === 'review' ? 'text-amber-700' : 'text-slate-400'}`}>
        {result.status === 'pass' ? 'PASS' : result.status === 'review' ? 'REVIEW REQUIRED' : '—'}
        {result.details.find((d) => d.label === 'Discrepancy')?.value && result.status === 'review' && ` (${result.details.find((d) => d.label === 'Discrepancy')?.value})`}
      </span>
    </div>
  );
}

function formatAddon(raw: string | null | undefined): string {
  if (!raw || raw === 'none') return 'None';
  if (raw.startsWith('custom|')) {
    const v = raw.split('|')[1];
    return v ? `${v} mm (custom)` : 'Custom';
  }
  return `${raw} mm`;
}

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'Unknown';
}

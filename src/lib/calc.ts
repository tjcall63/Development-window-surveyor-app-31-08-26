import type { WindowMeasurements, BuriedMeasurements, WindowStatus } from './types';

export const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

export const round = (n: number, dp = 0): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

export interface MSResult {
  calculatedWidth: number | null;
  calculatedHeight: number | null;
  width: number | null;
  height: number | null;
  widthManual: boolean;
  heightManual: boolean;
}

export function calcMS(m: WindowMeasurements): MSResult {
  const blW = num(m.bl_width);
  const blH = num(m.bl_height);
  const tolW = num(m.width_tolerance) ?? 10;
  const tolH = num(m.height_tolerance) ?? 10;
  const calcW = blW !== null ? round(blW - tolW) : null;
  const calcH = blH !== null ? round(blH - tolH) : null;
  const ovW = num(m.ms_width_override);
  const ovH = num(m.ms_height_override);
  return {
    calculatedWidth: calcW,
    calculatedHeight: calcH,
    width: m.ms_width_manual && ovW !== null ? ovW : calcW,
    height: m.ms_height_manual && ovH !== null ? ovH : calcH,
    widthManual: m.ms_width_manual && ovW !== null,
    heightManual: m.ms_height_manual && ovH !== null,
  };
}

export interface BuriedSide {
  in: number | null;
  out: number | null;
  buried: number | null;
}

export function calcBuriedSide(inVal: number | null, outVal: number | null): BuriedSide {
  const i = num(inVal);
  const o = num(outVal);
  const buried = i !== null && o !== null ? round(o - i) : null;
  return { in: i, out: o, buried };
}

export interface BuriedAll {
  left: BuriedSide;
  right: BuriedSide;
  top: BuriedSide;
  bottom: BuriedSide;
}

export function calcBuried(b: BuriedMeasurements): BuriedAll {
  return {
    left: calcBuriedSide(b.left_in, b.left_out),
    right: calcBuriedSide(b.right_in, b.right_out),
    top: calcBuriedSide(b.top_in, b.top_out),
    bottom: calcBuriedSide(b.bottom_in, b.bottom_out),
  };
}

export type CheckStatus = 'pass' | 'review' | 'incomplete';

export interface CheckResult {
  status: CheckStatus;
  label: string;
  details: { label: string; value: string }[];
}

export function widthCheck(m: WindowMeasurements, b: BuriedMeasurements): CheckResult {
  const plW = num(m.pl_width);
  const blW = num(m.bl_width);
  const buried = calcBuried(b);
  const left = buried.left.buried;
  const right = buried.right.buried;
  if (plW === null || blW === null || left === null || right === null) {
    return { status: 'incomplete', label: 'Awaiting measurements', details: [] };
  }
  const diff = round(blW - plW);
  const combined = round(left + right);
  const discrepancy = round(combined - diff);
  const pass = discrepancy === 0;
  return {
    status: pass ? 'pass' : 'review',
    label: pass ? 'PASS — Width measurements balance' : 'REVIEW REQUIRED — Width measurements do not balance',
    details: [
      { label: 'PL/BL difference', value: `${diff} mm` },
      { label: 'Combined buried size', value: `${combined} mm` },
      { label: 'Discrepancy', value: `${discrepancy} mm` },
    ],
  };
}

export function heightCheck(m: WindowMeasurements, b: BuriedMeasurements): CheckResult {
  const plH = num(m.pl_height);
  const blH = num(m.bl_height);
  const buried = calcBuried(b);
  const top = buried.top.buried;
  const bottom = buried.bottom.buried;
  if (plH === null || blH === null || top === null || bottom === null) {
    return { status: 'incomplete', label: 'Awaiting measurements', details: [] };
  }
  const diff = round(blH - plH);
  const combined = round(top + bottom);
  const discrepancy = round(combined - diff);
  const pass = discrepancy === 0;
  return {
    status: pass ? 'pass' : 'review',
    label: pass ? 'PASS — Height measurements balance' : 'REVIEW REQUIRED — Height measurements do not balance',
    details: [
      { label: 'PL/BL difference', value: `${diff} mm` },
      { label: 'Combined buried size', value: `${combined} mm` },
      { label: 'Discrepancy', value: `${discrepancy} mm` },
    ],
  };
}

export function diagonalCheck(m: WindowMeasurements): CheckResult {
  const site = num(m.site_diagonal);
  const plW = num(m.pl_width);
  const plH = num(m.pl_height);
  if (site === null || plW === null || plH === null) {
    return { status: 'incomplete', label: 'Awaiting measurements', details: [] };
  }
  const trueDiag = round(Math.sqrt(plW * plW + plH * plH));
  const diff = round(Math.abs(site - trueDiag));
  const pass = diff <= 10;
  return {
    status: pass ? 'pass' : 'review',
    label: pass ? 'PASS — Diagonal within tolerance' : 'REVIEW REQUIRED — Diagonal exceeds 10 mm tolerance',
    details: [
      { label: 'Site diagonal', value: `${site} mm` },
      { label: 'True diagonal', value: `${trueDiag} mm` },
      { label: 'Difference', value: `${diff} mm` },
    ],
  };
}

export function overallStatus(m: WindowMeasurements, b: BuriedMeasurements): WindowStatus {
  const w = widthCheck(m, b);
  const h = heightCheck(m, b);
  const d = diagonalCheck(m);
  const required = [w, h, d];
  if (required.some((c) => c.status === 'incomplete')) return 'in_progress';
  if (required.some((c) => c.status === 'review')) return 'review_required';
  return 'complete';
}

export function calcFloorArea(width: number | null, depth: number | null): number | null {
  const w = num(width);
  const d = num(depth);
  if (w === null || d === null) return null;
  return round(w * d, 2);
}

import { useRef, useState, useEffect, useCallback } from 'react';
import type { useWindowData } from '@/hooks/useWindowData';
import { Card, Button, Field } from '@/components/ui';
import { EditableNumber } from '@/components/EditableNumber';
import { calcMS, num } from '@/lib/calc';
import { Pen, Minus, Eraser, Undo2, Redo2, Trash2, Plus, X, AlertTriangle, CopyPlus, Check, Pencil, Type } from 'lucide-react';

type Data = ReturnType<typeof useWindowData>;
type Tool = 'pen' | 'line' | 'eraser' | 'text';

const GRID_SIZE = 20;
const GRID_COLOR = '#e2e8f0';
const GRID_MAJOR_COLOR = '#cbd5e1';

export default function DrawingStage({ data }: { data: Data }) {
  const { win, saveDrawing, saveMullions, saveTransoms, saveWindowFields, addAnnotation, updateAnnotation, removeAnnotation } = data;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#1e293b');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const drawing = useRef(false);
  const startPt = useRef<{ x: number; y: number } | null>(null);
  const snapshot = useRef<ImageData | null>(null);
  const history = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);
  const dirty = useRef(false);
  const initialized = useRef(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showMirror, setShowMirror] = useState(false);
  const [mirrorEditValue, setMirrorEditValue] = useState<string>('');
  const [mirrorError, setMirrorError] = useState<string>('');
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string; editId: string | null } | null>(null);

  const mullions = win?.mullions ?? [];
  const transoms = win?.transoms ?? [];
  const annotations = win?.annotations ?? [];

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x += GRID_SIZE) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += GRID_SIZE) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    ctx.strokeStyle = GRID_MAJOR_COLOR;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x <= w; x += GRID_SIZE * 5) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += GRID_SIZE * 5) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    ctx.restore();
  }, []);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    drawGrid(ctx, rect.width, rect.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;

    const existing = win?.drawing?.image_data;
    if (existing) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        history.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
      };
      img.src = existing;
    } else {
      history.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
    }
    initialized.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  const saveSnapshot = useCallback(() => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (history.current.length > 50) history.current.shift();
    redoStack.current = [];
    dirty.current = true;
  }, []);

  const getPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.PointerEvent) => {
    if (tool === 'text') {
      const pos = getPos(e);
      setTextInput({ x: pos.x, y: pos.y, value: '', editId: null });
      return;
    }
    e.preventDefault();
    const ctx = ctxRef.current;
    if (!ctx) return;
    const pos = getPos(e);
    startPt.current = pos;
    drawing.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (tool === 'pen' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else if (tool === 'line') {
      snapshot.current = ctx.getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    }
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const pos = getPos(e);
    if (tool === 'pen') {
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 20;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === 'line' && snapshot.current) {
      ctx.putImageData(snapshot.current, 0, 0);
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.moveTo(startPt.current!.x, startPt.current!.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const onUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    saveSnapshot();
  };

  const undo = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    if (history.current.length <= 1) return;
    const last = history.current.pop()!;
    redoStack.current.push(last);
    const prev = history.current[history.current.length - 1];
    ctx.putImageData(prev, 0, 0);
    dirty.current = true;
  };

  const redo = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas || redoStack.current.length === 0) return;
    const next = redoStack.current.pop()!;
    history.current.push(next);
    ctx.putImageData(next, 0, 0);
    dirty.current = true;
  };

  const clear = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    drawGrid(ctx, rect.width, rect.height);
    saveSnapshot();
  };

  const persist = useCallback(() => {
    if (!dirty.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    saveDrawing(dataUrl);
    dirty.current = false;
  }, [saveDrawing]);

  useEffect(() => {
    const t = setTimeout(persist, 800);
    return () => clearTimeout(t);
  }, [tool, persist]);

  useEffect(() => {
    return () => persist();
  }, [persist]);

  const saveTextAnnotation = () => {
    if (!textInput) return;
    if (textInput.editId) {
      if (textInput.value.trim()) {
        updateAnnotation(textInput.editId, { text: textInput.value.trim(), x: textInput.x, y: textInput.y });
      } else {
        removeAnnotation(textInput.editId);
      }
    } else if (textInput.value.trim()) {
      addAnnotation(textInput.value.trim(), textInput.x, textInput.y);
    }
    setTextInput(null);
  };

  const addMullion = () => saveMullions([...mullions.map((m) => m.value_mm), 0]);
  const updateMullion = (i: number, v: number) => {
    const arr = [...mullions.map((m) => m.value_mm)];
    arr[i] = v;
    saveMullions(arr);
  };
  const removeMullion = (i: number) => {
    const arr = mullions.map((m) => m.value_mm);
    arr.splice(i, 1);
    saveMullions(arr);
  };

  const msWidth = (() => {
    const m = win?.measurements;
    if (!m) return null;
    const ms = calcMS(m);
    return num(ms.width);
  })();

  const openMirror = () => {
    if (msWidth === null) {
      setMirrorError('Manufacturing Size Width must be entered or calculated first. Complete the PL/BL measurements and tolerances before using the mirror calculator.');
      setShowMirror(true);
      return;
    }
    if (mullions.length === 0) {
      setMirrorError('Enter at least one mullion position (M1) before mirroring.');
      setShowMirror(true);
      return;
    }
    const m1 = mullions[0].value_mm;
    const calculated = msWidth - m1;
    setMirrorEditValue(String(calculated));
    setMirrorError('');
    setShowMirror(true);
  };

  const acceptMirror = () => {
    const v = Number(mirrorEditValue);
    if (!Number.isFinite(v)) return;
    saveMullions([...mullions.map((m) => m.value_mm), v]);
    setShowMirror(false);
    setMirrorEditValue('');
  };

  const addTransom = () => saveTransoms([...transoms.map((t) => t.value_mm), 0]);
  const updateTransom = (i: number, v: number) => {
    const arr = [...transoms.map((t) => t.value_mm)];
    arr[i] = v;
    saveTransoms(arr);
  };
  const removeTransom = (i: number) => {
    const arr = transoms.map((t) => t.value_mm);
    arr.splice(i, 1);
    saveTransoms(arr);
  };

  return (
    <div className="space-y-5">
      <SectionTitle title="Drawing" subtitle="Sketch the window — outside view" />

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <ToolButton active={tool === 'pen'} onClick={() => setTool('pen')} icon={<Pen className="w-5 h-5" />} label="Pen" />
          <ToolButton active={tool === 'line'} onClick={() => setTool('line')} icon={<Minus className="w-5 h-5" />} label="Line" />
          <ToolButton active={tool === 'eraser'} onClick={() => setTool('eraser')} icon={<Eraser className="w-5 h-5" />} label="Eraser" />
          <ToolButton active={tool === 'text'} onClick={() => setTool('text')} icon={<Type className="w-5 h-5" />} label="Text" />
          <div className="w-px h-8 bg-slate-200 mx-1" />
          <ToolButton onClick={undo} icon={<Undo2 className="w-5 h-5" />} label="Undo" />
          <ToolButton onClick={redo} icon={<Redo2 className="w-5 h-5" />} label="Redo" />
          <ToolButton onClick={() => setShowClearConfirm(true)} icon={<Trash2 className="w-5 h-5" />} label="Clear" />
          <div className="w-px h-8 bg-slate-200 mx-1" />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-9 h-9 rounded cursor-pointer border border-slate-300" />
          <select value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
            <option value={2}>Thin</option>
            <option value={3}>Medium</option>
            <option value={6}>Thick</option>
          </select>
        </div>

        <div className="relative">
          <span className="absolute top-2 left-3 text-xs font-semibold text-slate-400 tracking-wide pointer-events-none z-10">OUTSIDE VIEW</span>
          {tool === 'text' && (
            <span className="absolute top-2 right-3 text-xs font-medium text-blue-600 pointer-events-none z-10">Tap to place text</span>
          )}
          <canvas
            ref={canvasRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            className="w-full h-[400px] sm:h-[500px] rounded-lg border border-slate-200 bg-white touch-none cursor-crosshair"
          />
          {/* Annotation overlay */}
          <div ref={overlayRef} className="absolute inset-0 pointer-events-none">
            {annotations.map((ann) => (
              <div
                key={ann.id}
                className="absolute pointer-events-auto group"
                style={{ left: ann.x, top: ann.y }}
              >
                <div
                  className="px-2 py-1 rounded bg-yellow-200/90 border border-yellow-500 text-xs font-bold text-slate-900 shadow-sm cursor-pointer whitespace-nowrap"
                  onClick={() => setTextInput({ x: ann.x, y: ann.y, value: ann.text, editId: ann.id })}
                >
                  {ann.text}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeAnnotation(ann.id); }}
                    className="ml-1 text-red-500 hover:text-red-700"
                  >
                    <X className="w-3 h-3 inline" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {textInput && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <Type className="w-5 h-5 text-blue-600 shrink-0" />
            <input
              type="text"
              value={textInput.value}
              autoFocus
              onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') saveTextAnnotation(); if (e.key === 'Escape') setTextInput(null); }}
              placeholder="Enter annotation text (e.g. SOIL PIPE, FIX, OBSTRUCTION)"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <Button size="sm" variant="primary" onClick={saveTextAnnotation} className="flex items-center gap-1">
              <Check className="w-4 h-4" /> Save
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setTextInput(null)}>
              Cancel
            </Button>
          </div>
        )}
      </Card>

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowClearConfirm(false)}>
          <Card className="w-full sm:max-w-md p-5 rounded-t-2xl sm:rounded-2xl" >
            <div onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-red-50 text-red-600 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Clear entire drawing?</h3>
                  <p className="text-sm text-slate-500 mt-1">This will remove the complete window drawing. You can use Undo to restore it afterwards.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setShowClearConfirm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => { clear(); setShowClearConfirm(false); }} className="flex-1">
                  Clear Drawing
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-1">Mullions</h3>
        <p className="text-sm text-slate-500 mb-4">Does this window have mullions?</p>
        <div className="flex gap-2 mb-4">
          <Button
            size="sm"
            variant={win?.mullions_answered === true ? 'primary' : 'secondary'}
            onClick={() => saveWindowFields({ mullions_answered: true })}
          >
            Yes
          </Button>
          <Button
            size="sm"
            variant={win?.mullions_answered === false ? 'primary' : 'secondary'}
            onClick={() => {
              saveWindowFields({ mullions_answered: false });
              if (mullions.length > 0) saveMullions([]);
            }}
          >
            None
          </Button>
        </div>
        {win?.mullions_answered === true && (
          <>
            <p className="text-sm text-slate-500 mb-3">Measured left to right (mm).</p>
            <div className="space-y-2">
              {mullions.map((mu, i) => (
                <div key={mu.id} className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 w-20 shrink-0">Mullion {i + 1}</span>
                  <EditableNumber value={mu.value_mm} onChange={(v) => {}} onSave={(v) => updateMullion(i, v ?? 0)} className="flex-1" />
                  <button onClick={() => removeMullion(i)} className="p-2 text-slate-400 hover:text-red-600 touch-manipulation">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" variant="secondary" onClick={addMullion} className="flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add Mullion
              </Button>
              {mullions.length >= 1 && (
                <Button size="sm" variant="secondary" onClick={openMirror} className="flex items-center gap-1">
                  <CopyPlus className="w-4 h-4" /> Mirror Mullion
                </Button>
              )}
            </div>
          </>
        )}
      </Card>

      {showMirror && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowMirror(false)}>
          <Card className="w-full sm:max-w-md p-5 rounded-t-2xl sm:rounded-2xl">
            <div onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                  <CopyPlus className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900">Mirror Mullion / Symmetrical Pair</h3>
                  {mirrorError ? (
                    <p className="text-sm text-amber-600 mt-1">{mirrorError}</p>
                  ) : (
                    <p className="text-sm text-slate-500 mt-1">
                      Calculates M{mullions.length + 1} = MS Width − M1 position. You can override the calculated value.
                    </p>
                  )}
                </div>
              </div>

              {!mirrorError && msWidth !== null && mullions.length >= 1 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                      <div className="text-xs text-slate-500">MS Width</div>
                      <div className="font-bold text-slate-900">{msWidth} mm</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                      <div className="text-xs text-slate-500">M1</div>
                      <div className="font-bold text-slate-900">{mullions[0].value_mm} mm</div>
                    </div>
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-2.5 text-center">
                      <div className="text-xs text-blue-600">Calculated M{mullions.length + 1}</div>
                      <div className="font-bold text-blue-900">{msWidth - mullions[0].value_mm} mm</div>
                    </div>
                  </div>

                  <Field label={`M${mullions.length + 1} position (mm) — edit to override`}>
                    <input
                      type="number"
                      value={mirrorEditValue}
                      onChange={(e) => setMirrorEditValue(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
                      autoFocus
                    />
                  </Field>

                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setShowMirror(false)} className="flex-1 flex items-center justify-center gap-1">
                      <X className="w-5 h-5" /> Cancel
                    </Button>
                    <Button variant="secondary" onClick={() => setMirrorEditValue(String(msWidth - mullions[0].value_mm))} className="flex-1 flex items-center justify-center gap-1">
                      <Pencil className="w-4 h-4" /> Reset
                    </Button>
                    <Button variant="primary" onClick={acceptMirror} className="flex-1 flex items-center justify-center gap-1">
                      <Check className="w-5 h-5" /> Accept
                    </Button>
                  </div>
                </div>
              )}

              {mirrorError && (
                <div className="flex gap-3 mt-4">
                  <Button variant="secondary" onClick={() => setShowMirror(false)} className="flex-1">
                    Close
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-1">Transoms</h3>
        <p className="text-sm text-slate-500 mb-4">Does this window have transoms?</p>
        <div className="flex gap-2 mb-4">
          <Button
            size="sm"
            variant={win?.transoms_answered === true ? 'primary' : 'secondary'}
            onClick={() => saveWindowFields({ transoms_answered: true })}
          >
            Yes
          </Button>
          <Button
            size="sm"
            variant={win?.transoms_answered === false ? 'primary' : 'secondary'}
            onClick={() => {
              saveWindowFields({ transoms_answered: false });
              if (transoms.length > 0) saveTransoms([]);
            }}
          >
            None
          </Button>
        </div>
        {win?.transoms_answered === true && (
          <>
            <p className="text-sm text-slate-500 mb-3">Measured top down (mm).</p>
            <div className="space-y-2">
              {transoms.map((tr, i) => (
                <div key={tr.id} className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 w-20 shrink-0">Transom {i + 1}</span>
                  <EditableNumber value={tr.value_mm} onChange={(v) => {}} onSave={(v) => updateTransom(i, v ?? 0)} className="flex-1" />
                  <button onClick={() => removeTransom(i)} className="p-2 text-slate-400 hover:text-red-600 touch-manipulation">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
            <Button size="sm" variant="secondary" onClick={addTransom} className="mt-3 flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add Transom
            </Button>
          </>
        )}
      </Card>

      <Card className="p-5">
        <Field label="Fascia Drop (mm)" hint="Downwards from head of frame — important for casement openings. Leave blank or mark N/A if not applicable.">
          <div className="flex gap-2 items-center">
            <EditableNumber
              value={win?.measurements?.fascia_drop}
              onChange={(v) => {}}
              onSave={(v) => saveMeasurements({ fascia_drop: v })}
              placeholder="Blank"
              className="flex-1"
            />
            <Button
              size="sm"
              variant={win?.measurements?.fascia_drop === -1 ? 'primary' : 'secondary'}
              onClick={() => saveMeasurements({ fascia_drop: win?.measurements?.fascia_drop === -1 ? null : -1 })}
              className="shrink-0"
            >
              N/A
            </Button>
          </div>
          {win?.measurements?.fascia_drop === -1 && (
            <p className="text-xs text-slate-500 mt-1.5">Marked as N/A — no fascia measurement for this window.</p>
          )}
        </Field>
      </Card>
    </div>
  );
}

function ToolButton({ active, onClick, icon, label }: { active?: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
        active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
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

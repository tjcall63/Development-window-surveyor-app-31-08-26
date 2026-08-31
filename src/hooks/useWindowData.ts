import { useEffect, useRef, useState, useCallback } from 'react';
import * as db from '@/lib/db';
import type { FullWindow, WindowMeasurements, BuriedMeasurements, WindowSpecification, Photo } from '@/lib/types';
import { useSurvey } from '@/context/SurveyContext';
import { useConnection } from '@/context/ConnectionContext';

export function useWindowData(windowId: string) {
  const { survey, updateWindowInState } = useSurvey();
  const { refreshPending } = useConnection();
  const fromState = survey?.windows.find((w) => w.id === windowId) ?? null;
  const [win, setWin] = useState<FullWindow | null>(fromState);
  const winRef = useRef<FullWindow | null>(fromState);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedId = useRef<string | null>(null);

  useEffect(() => {
    if (fromState) {
      setWin(fromState);
      winRef.current = fromState;
      loadedId.current = windowId;
    } else if (windowId && loadedId.current !== windowId) {
      loadedId.current = windowId;
      db.loadWindowInline(windowId).then((w) => {
        if (w) { setWin(w); winRef.current = w; }
      });
    }
  }, [fromState, windowId]);

  const flash = useCallback(() => {
    setSavedFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSavedFlash(false), 1500);
  }, []);

  const afterSave = useCallback(() => {
    refreshPending();
    flash();
  }, [refreshPending, flash]);

  const saveMeasurements = useCallback(
    async (patch: Partial<WindowMeasurements>) => {
      setSaving(true);
      try {
        const base = winRef.current;
        const current = base?.measurements ?? { window_id: windowId, width_tolerance: 10, height_tolerance: 10, ms_width_manual: false, ms_height_manual: false };
        const merged = { ...current, ...patch };
        const updated = await db.upsertMeasurements(merged);
        const next = { ...(base ?? minimalWindow(windowId)), measurements: updated };
        winRef.current = next;
        setWin(next);
        updateWindowInState(next);
        afterSave();
      } finally {
        setSaving(false);
      }
    },
    [windowId, updateWindowInState, afterSave],
  );

  const saveBuried = useCallback(
    async (patch: Partial<BuriedMeasurements>) => {
      setSaving(true);
      try {
        const base = winRef.current;
        const current = base?.buried ?? { window_id: windowId };
        const merged = { ...current, ...patch };
        const updated = await db.upsertBuried(merged);
        const next = { ...(base ?? minimalWindow(windowId)), buried: updated };
        winRef.current = next;
        setWin(next);
        updateWindowInState(next);
        afterSave();
      } finally {
        setSaving(false);
      }
    },
    [windowId, updateWindowInState, afterSave],
  );

  const saveSpecification = useCallback(
    async (patch: Partial<WindowSpecification>) => {
      setSaving(true);
      try {
        const base = winRef.current;
        const current = base?.specification ?? { window_id: windowId };
        const merged = { ...current, ...patch };
        const updated = await db.upsertSpecification(merged);
        const next = { ...(base ?? minimalWindow(windowId)), specification: updated };
        winRef.current = next;
        setWin(next);
        updateWindowInState(next);
        afterSave();
      } finally {
        setSaving(false);
      }
    },
    [windowId, updateWindowInState, afterSave],
  );

  const saveMullions = useCallback(
    async (values: number[]) => {
      setSaving(true);
      try {
        const base = winRef.current;
        const updated = await db.setMullions(windowId, values);
        const next = { ...(base ?? minimalWindow(windowId)), mullions: updated };
        winRef.current = next;
        setWin(next);
        updateWindowInState(next);
        afterSave();
      } finally {
        setSaving(false);
      }
    },
    [windowId, updateWindowInState, afterSave],
  );

  const saveTransoms = useCallback(
    async (values: number[]) => {
      setSaving(true);
      try {
        const base = winRef.current;
        const updated = await db.setTransoms(windowId, values);
        const next = { ...(base ?? minimalWindow(windowId)), transoms: updated };
        winRef.current = next;
        setWin(next);
        updateWindowInState(next);
        afterSave();
      } finally {
        setSaving(false);
      }
    },
    [windowId, updateWindowInState, afterSave],
  );

  const saveDrawing = useCallback(
    async (imageData: string) => {
      setSaving(true);
      try {
        const base = winRef.current;
        await db.saveDrawing(windowId, imageData);
        const next = { ...(base ?? minimalWindow(windowId)), drawing: { id: '', window_id: windowId, image_data: imageData, updated_at: new Date().toISOString() } };
        winRef.current = next;
        setWin(next);
        updateWindowInState(next);
        afterSave();
      } finally {
        setSaving(false);
      }
    },
    [windowId, updateWindowInState, afterSave],
  );

  const addPhoto = useCallback(
    async (imageData: string, category: string, caption: string) => {
      setSaving(true);
      try {
        const base = winRef.current ?? minimalWindow(windowId);
        const photo = await db.addPhoto(windowId, imageData, category, caption);
        const next = { ...base, photos: [...base.photos, photo] };
        winRef.current = next;
        setWin(next);
        updateWindowInState(next);
        afterSave();
      } finally {
        setSaving(false);
      }
    },
    [windowId, updateWindowInState, afterSave],
  );

  const updatePhoto = useCallback(
    async (id: string, patch: Partial<Photo>) => {
      setSaving(true);
      try {
        const base = winRef.current ?? minimalWindow(windowId);
        await db.updatePhoto(id, patch);
        const next = { ...base, photos: base.photos.map((p) => (p.id === id ? { ...p, ...patch } : p)) };
        winRef.current = next;
        setWin(next);
        updateWindowInState(next);
        afterSave();
      } finally {
        setSaving(false);
      }
    },
    [updateWindowInState, afterSave],
  );

  const removePhoto = useCallback(
    async (id: string) => {
      setSaving(true);
      try {
        const base = winRef.current ?? minimalWindow(windowId);
        await db.deletePhoto(id);
        const next = { ...base, photos: base.photos.filter((p) => p.id !== id) };
        winRef.current = next;
        setWin(next);
        updateWindowInState(next);
        afterSave();
      } finally {
        setSaving(false);
      }
    },
    [updateWindowInState, afterSave],
  );

  const saveWindowFields = useCallback(
    async (patch: Partial<Pick<FullWindow, 'mullions_answered' | 'transoms_answered'>>) => {
      setSaving(true);
      try {
        const base = winRef.current ?? minimalWindow(windowId);
        await db.updateWindow(windowId, patch);
        const next = { ...base, ...patch };
        winRef.current = next;
        setWin(next);
        updateWindowInState(next);
        afterSave();
      } finally {
        setSaving(false);
      }
    },
    [windowId, updateWindowInState, afterSave],
  );

  const addAnnotation = useCallback(
    async (text: string, x: number, y: number) => {
      setSaving(true);
      try {
        const base = winRef.current ?? minimalWindow(windowId);
        const ann = await db.addAnnotation(windowId, text, x, y);
        const next = { ...base, annotations: [...base.annotations, ann] };
        winRef.current = next;
        setWin(next);
        updateWindowInState(next);
        afterSave();
      } finally {
        setSaving(false);
      }
    },
    [windowId, updateWindowInState, afterSave],
  );

  const updateAnnotation = useCallback(
    async (id: string, patch: Partial<Pick<import('@/lib/types').Annotation, 'text' | 'x' | 'y'>>) => {
      setSaving(true);
      try {
        const base = winRef.current ?? minimalWindow(windowId);
        await db.updateAnnotation(id, patch);
        const next = { ...base, annotations: base.annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)) };
        winRef.current = next;
        setWin(next);
        updateWindowInState(next);
        afterSave();
      } finally {
        setSaving(false);
      }
    },
    [updateWindowInState, afterSave],
  );

  const removeAnnotation = useCallback(
    async (id: string) => {
      setSaving(true);
      try {
        const base = winRef.current ?? minimalWindow(windowId);
        await db.deleteAnnotation(id);
        const next = { ...base, annotations: base.annotations.filter((a) => a.id !== id) };
        winRef.current = next;
        setWin(next);
        updateWindowInState(next);
        afterSave();
      } finally {
        setSaving(false);
      }
    },
    [updateWindowInState, afterSave],
  );

  return {
    win,
    saving,
    savedFlash,
    saveMeasurements,
    saveBuried,
    saveSpecification,
    saveMullions,
    saveTransoms,
    saveDrawing,
    saveWindowFields,
    addPhoto,
    updatePhoto,
    removePhoto,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    setWin,
  };
}

function minimalWindow(windowId: string): FullWindow {
  return {
    id: windowId,
    survey_id: '',
    position: 0,
    location: null,
    aperture_material: null,
    aperture_material_other: null,
    mullions_answered: null,
    transoms_answered: null,
    status: 'in_progress',
    created_at: '',
    updated_at: '',
    measurements: null,
    buried: null,
    specification: null,
    mullions: [],
    transoms: [],
    drawing: null,
    annotations: [],
    photos: [],
  };
}

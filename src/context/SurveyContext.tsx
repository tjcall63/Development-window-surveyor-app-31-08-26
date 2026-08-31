import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import * as db from '@/lib/db';
import type { FullSurvey, FullWindow } from '@/lib/types';
import { useConnection } from './ConnectionContext';

interface SurveyContextValue {
  survey: FullSurvey | null;
  loading: boolean;
  error: string | null;
  loadSurvey: (id: string) => Promise<void>;
  reload: () => Promise<void>;
  setSurvey: (s: FullSurvey | null) => void;
  updateSurveyFields: (patch: Partial<FullSurvey>) => Promise<void>;
  refreshWindow: (windowId: string) => Promise<FullWindow | null>;
  updateWindowInState: (w: FullWindow) => void;
  saveStatus: (windowId: string, status: FullWindow['status']) => Promise<void>;
}

const Ctx = createContext<SurveyContextValue | null>(null);

export function useSurvey() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSurvey must be used within SurveyProvider');
  return ctx;
}

export function SurveyProvider({ children }: { children: ReactNode }) {
  const { refreshPending } = useConnection();
  const [survey, setSurveyState] = useState<FullSurvey | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSurvey = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const s = await db.getSurvey(id);
      setSurveyState(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load survey');
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    if (survey) await loadSurvey(survey.id);
  }, [survey, loadSurvey]);

  const setSurvey = useCallback((s: FullSurvey | null) => {
    setSurveyState(s);
  }, []);

  const updateSurveyFields = useCallback(
    async (patch: Partial<FullSurvey>) => {
      if (!survey) return;
      await db.updateSurvey(survey.id, patch);
      setSurveyState({ ...survey, ...patch });
      refreshPending();
    },
    [survey, refreshPending],
  );

  const refreshWindow = useCallback(async (windowId: string): Promise<FullWindow | null> => {
    return db.loadWindowInline(windowId);
  }, []);

  const updateWindowInState = useCallback((w: FullWindow) => {
    setSurveyState((prev) => {
      if (!prev) return prev;
      const windows = prev.windows.map((x) => (x.id === w.id ? w : x));
      return { ...prev, windows };
    });
  }, []);

  const saveStatus = useCallback(
    async (windowId: string, status: FullWindow['status']) => {
      await db.updateWindow(windowId, { status });
      setSurveyState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          windows: prev.windows.map((w) => (w.id === windowId ? { ...w, status } : w)),
        };
      });
      refreshPending();
    },
    [refreshPending],
  );

  const value: SurveyContextValue = {
    survey,
    loading,
    error,
    loadSurvey,
    reload,
    setSurvey,
    updateSurveyFields,
    refreshWindow,
    updateWindowInState,
    saveStatus,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

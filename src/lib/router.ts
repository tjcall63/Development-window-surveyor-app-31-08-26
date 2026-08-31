import { useEffect, useState, useCallback } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'settings' }
  | { name: 'job'; surveyId: string }
  | { name: 'products'; surveyId: string }
  | { name: 'assessment'; surveyId: string }
  | { name: 'summary'; surveyId: string }
  | { name: 'window'; surveyId: string; windowId: string; stage?: string };

function parseHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  const parts = h.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'settings') return { name: 'settings' };
  if (parts[0] === 'survey' && parts[1]) {
    if (parts[2] === 'job') return { name: 'job', surveyId: parts[1] };
    if (parts[2] === 'products') return { name: 'products', surveyId: parts[1] };
    if (parts[2] === 'assessment') return { name: 'assessment', surveyId: parts[1] };
    if (parts[2] === 'summary') return { name: 'summary', surveyId: parts[1] };
    if (parts[2] === 'window' && parts[3]) {
      return { name: 'window', surveyId: parts[1], windowId: parts[3], stage: parts[4] ?? 'measurements' };
    }
    return { name: 'products', surveyId: parts[1] };
  }
  return { name: 'home' };
}

export function routeToHash(r: Route): string {
  switch (r.name) {
    case 'home': return '#/';
    case 'settings': return '#/settings';
    case 'job': return `#/survey/${r.surveyId}/job`;
    case 'products': return `#/survey/${r.surveyId}/products`;
    case 'assessment': return `#/survey/${r.surveyId}/assessment`;
    case 'summary': return `#/survey/${r.surveyId}/summary`;
    case 'window': return `#/survey/${r.surveyId}/window/${r.windowId}/${r.stage ?? 'measurements'}`;
  }
}

export function navigate(r: Route) {
  window.location.hash = routeToHash(r);
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash());
  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return route;
}

export function useGo() {
  return useCallback((r: Route) => navigate(r), []);
}

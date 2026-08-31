import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfig = {
  url,
  hasAnonKey: Boolean(anonKey),
};

if (!url || !anonKey) {
  throw new Error('Supabase env vars missing');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      return fetch(input, { ...init, mode: 'cors' });
    },
  },
});

export async function testCloudConnection(): Promise<{
  cloudReachable: boolean;
  databaseReachable: boolean;
  sessionValid: boolean;
  endpoint: string;
  status?: number;
  error?: string;
}> {
  const endpoint = url ? `${url.replace(/\/$/, '')}/rest/v1/surveys?select=id&limit=1` : 'unconfigured';
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: anonKey ?? '',
        Accept: 'application/json',
      },
      mode: 'cors',
      cache: 'no-store',
    });
    const body = await response.text();
    let parsed: unknown = null;
    try {
      parsed = body ? JSON.parse(body) : null;
    } catch {
      parsed = null;
    }
    const message = parsed && typeof parsed === 'object' && 'message' in parsed
      ? String((parsed as { message: unknown }).message)
      : undefined;
    return {
      cloudReachable: true,
      databaseReachable: response.ok,
      sessionValid: response.ok || response.status === 401,
      endpoint,
      status: response.status,
      error: response.ok ? undefined : message ?? `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      cloudReachable: false,
      databaseReachable: false,
      sessionValid: false,
      endpoint,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    };
  }
}

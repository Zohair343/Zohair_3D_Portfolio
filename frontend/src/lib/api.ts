const BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? '';

export interface Citation { id: string; title: string; url: string; section: string }
export type ChatResult =
  | { kind: 'answer'; status: 'answered' | 'insufficient'; answer: string; citations: Citation[] }
  | { kind: 'error'; code: string; message: string; retryable: boolean };

export async function askChat(question: string, history: { role: 'user' | 'assistant'; content: string }[]): Promise<ChatResult> {
  try {
    const res = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, history: history.slice(-6) }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data && (data.status === 'answered' || data.status === 'insufficient')) {
      return { kind: 'answer', status: data.status, answer: String(data.answer), citations: data.citations ?? [] };
    }
    return {
      kind: 'error',
      code: data?.error ?? `http_${res.status}`,
      message: data?.message ?? 'The chat service returned an unexpected response.',
      retryable: res.status >= 500 || res.status === 429,
    };
  } catch {
    return { kind: 'error', code: 'network', message: 'Couldn’t reach the chat service. Check your connection and try again.', retryable: true };
  }
}

export interface ContactPayload { name: string; email: string; subject: string; message: string; website: string }
export type ContactResult =
  | { ok: true; delivered: boolean; mode: string; message: string }
  | { ok: false; message: string; fields?: Partial<Record<keyof ContactPayload, string>> };

export async function sendContact(p: ContactPayload): Promise<ContactResult> {
  try {
    const res = await fetch(`${BASE}/api/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) return { ok: true, delivered: !!data.delivered, mode: data.mode, message: data.message };
    return { ok: false, message: data?.message ?? `The server responded with ${res.status}.`, fields: data?.fields };
  } catch {
    return { ok: false, message: 'Couldn’t reach the server. Your letter is still here — try again in a moment.' };
  }
}

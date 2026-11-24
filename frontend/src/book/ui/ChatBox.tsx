import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { askChat, type Citation } from '../../lib/api';
import { askStore } from '../stores/askStore';
import { usePage } from '../engine/PageContext';

type Msg =
  | { id: number; who: 'guide'; text: string; status?: 'answered' | 'insufficient'; citations?: Citation[] }
  | { id: number; who: 'visitor'; text: string }
  | { id: number; who: 'system'; text: string; retry?: string };

export const STARTERS = [
  'How does the three-hit combo work in Scorched?',
  'How did Zohair use NavMesh in his games?',
  'When does the maze game show the shortest path?',
  'Which game jam did Zohair finish as runner-up in?',
];
export const GREETING = 'Which project would you like to ask about?';

/** Ask Zohair: grounded answers with citations that turn the book to the cited panel. */
export default function ChatBox() {
  const { live } = usePage();
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, who: 'guide', text: GREETING }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const idRef = useRef(1);
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, busy]);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    const history = msgs.filter((m) => m.who !== 'system' && m.id !== 0).map((m) => ({ role: m.who === 'visitor' ? 'user' as const : 'assistant' as const, content: m.text }));
    setMsgs((m) => [...m, { id: idRef.current++, who: 'visitor', text: question }]);
    setInput(''); setBusy(true);
    const r = await askChat(question, history);
    setBusy(false);
    setMsgs((m) => [...m, r.kind === 'answer'
      ? { id: idRef.current++, who: 'guide', text: r.answer, status: r.status, citations: r.citations }
      : { id: idRef.current++, who: 'system', text: r.message, retry: r.retryable ? question : undefined }]);
  };

  // A question sent from another page ("Ask Zohair: …" chips).
  useEffect(() => {
    if (!live) return;
    const q = askStore.take();
    if (q) void ask(q);
    return askStore.subscribe(() => { const p = askStore.take(); if (p) void ask(p); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  /** Citation URLs look like /projects/scorched#combo; the book turns to that panel. */
  const navigate = useNavigate();
  const openCitation = (url: string) => navigate(url);

  const submit = (e: FormEvent) => { e.preventDefault(); void ask(input); };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void ask(input); }
  };

  return (
    <div className="chatbox">
      <ol ref={logRef} className="chat-log" role="log" aria-live="polite" aria-busy={busy}>
        {msgs.map((m) => (
          <li key={m.id} className={`msg msg-${m.who}`}>
            {m.who === 'system' ? (
              <div className="system-notice" role="alert">
                <strong>No answer was generated.</strong> {m.text}
                {m.retry && <button className="btn secondary small-btn" onClick={() => ask(m.retry!)}>Try again</button>}
              </div>
            ) : (
              <>
                <span className="speaker">{m.who === 'guide' ? 'Zohair’s guide' : 'You'}</span>
                <div className={`bubble ${m.who === 'visitor' ? 'bubble-visitor' : 'tail-left'}`}>
                  {m.who === 'guide' && m.status === 'insufficient' && <span className="tag not-found">Not in the portfolio</span>}
                  <p>{m.text}</p>
                  {m.who === 'guide' && m.citations && m.citations.length > 0 && (
                    <div className="cites"><span className="cites-label">Sources:</span>
                      <ul>{m.citations.map((c) => <li key={c.id}><a href={c.url} onClick={(e) => { e.preventDefault(); openCitation(c.url); }}>{c.title}</a></li>)}</ul>
                    </div>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
        {busy && <li className="msg msg-guide"><span className="speaker">Zohair’s guide</span><div className="bubble tail-left thinking">Checking the panels…</div></li>}
      </ol>
      {msgs.length < 3 && (
        <div className="starters" role="group" aria-label="Starter questions">
          {STARTERS.map((s) => <button key={s} className="starter" onClick={() => ask(s)} disabled={busy}>{s}</button>)}
        </div>
      )}
      <form className="chat-form" onSubmit={submit}>
        <label htmlFor="chat-input" className="sr-only">Your question</label>
        <textarea id="chat-input" rows={2} maxLength={500} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey}
          placeholder="Ask about a game, a mechanic, skills or education…" />
        <button className="btn" type="submit" disabled={busy || !input.trim()}>Send</button>
      </form>
    </div>
  );
}

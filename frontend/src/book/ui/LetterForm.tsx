import { useEffect, useRef, useState, type FormEvent } from 'react';
import { sendContact } from '../../lib/api';
import { LIMITS, validate, type Fields } from '../../lib/validation';

const DRAFT = 'pp-contact-draft';
const empty: Fields = { name: '', email: '', subject: '', message: '' };
type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent'; text: string } | { kind: 'not-sent'; text: string } | { kind: 'error'; text: string };

/** The contact form, written as a letter to the author. */
export default function LetterForm() {
  const [f, setF] = useState<Fields>(() => { try { return { ...empty, ...JSON.parse(localStorage.getItem(DRAFT) || '{}') }; } catch { return empty; } });
  const [website, setWebsite] = useState(''); // honeypot
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const statusRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => { try { localStorage.setItem(DRAFT, JSON.stringify(f)); } catch { /* storage unavailable */ } }, [f]);

  const set = (k: keyof Fields) => (e: { target: { value: string } }) => {
    setF((x) => ({ ...x, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate(f);
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = (['message', 'subject', 'name', 'email'] as const).find((k) => errs[k]); // visual order
      requestAnimationFrame(() => document.getElementById(`c-${first}`)?.focus());
      return;
    }
    setStatus({ kind: 'sending' });
    const r = await sendContact({ ...f, website });
    if (r.ok && r.delivered) {
      setStatus({ kind: 'sent', text: r.message });
      setF(empty);
      try { localStorage.removeItem(DRAFT); } catch { /* */ }
    } else if (r.ok) {
      setStatus({ kind: 'not-sent', text: r.message }); // dev mode: accepted but NOT emailed
    } else {
      if (r.fields) {
        setErrors(r.fields as typeof errors);
        const first = (['message', 'subject', 'name', 'email'] as const).find((k) => r.fields?.[k]);
        if (first) { requestAnimationFrame(() => document.getElementById(`c-${first}`)?.focus()); }
      }
      setStatus({ kind: 'error', text: r.message });
    }
    requestAnimationFrame(() => statusRef.current?.focus());
  };

  const field = (k: keyof Fields, label: string, el: 'input' | 'textarea', type = 'text', auto?: string) => {
    const id = `c-${k}`, err = errors[k];
    const common = {
      id, name: k, value: f[k], onChange: set(k), maxLength: LIMITS[k][1] + 200,
      'aria-invalid': err ? true : undefined, 'aria-describedby': `${id}-hint${err ? ` ${id}-err` : ''}`, required: true,
    };
    return (
      <div className={`field ${err ? 'has-error' : ''}`}>
        <label htmlFor={id}>{label}</label>
        {el === 'input' ? <input type={type} autoComplete={auto} {...common} /> : <textarea rows={8} {...common} />}
        <span id={`${id}-hint`} className="hint">{k === 'message' ? `${f.message.trim().length} / ${LIMITS.message[1]} characters (min ${LIMITS.message[0]})` : `${LIMITS[k][0]}–${LIMITS[k][1]} characters`}</span>
        {err && <span id={`${id}-err`} className="field-error">{err}</span>}
      </div>
    );
  };

  return (
    <div className="letter">
        <form ref={formRef} onSubmit={submit} noValidate aria-describedby="letter-note">
          <p className="letter-salutation display">Dear Zohair,</p>
          {field('message', 'Your message', 'textarea')}
          <div className="letter-sign">
            {field('subject', 'Subject', 'input')}
            {field('name', 'Your name', 'input', 'text', 'name')}
            {field('email', 'Your email (so Zohair can reply)', 'input', 'email', 'email')}
          </div>
          <div className="hp" aria-hidden="true">
            <label htmlFor="c-website">Website</label>
            <input id="c-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <p id="letter-note" className="small muted">Your draft is kept in this browser until it sends. Your email is used only so Zohair can reply.</p>
          <button className="btn" type="submit" disabled={status.kind === 'sending'}>{status.kind === 'sending' ? 'Sending…' : 'Send the letter'}</button>
        </form>
        <div ref={statusRef} tabIndex={-1} className="letter-status" role="status" aria-live="polite">
          {status.kind === 'sent' && <p className="status ok"><strong>Delivered to the mail service.</strong> {status.text}</p>}
          {status.kind === 'not-sent' && <p className="status warn"><strong>Not emailed.</strong> {status.text}</p>}
          {status.kind === 'error' && <p className="status err"><strong>Your letter wasn’t sent.</strong> {status.text} Your text is still in the form.</p>}
        </div>
    </div>
  );
}

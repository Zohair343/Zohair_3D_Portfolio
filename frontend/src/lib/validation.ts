/** Mirrors backend/contact.py limits. Keep both in sync. */
export const LIMITS = { name: [2, 100], email: [3, 254], subject: [3, 150], message: [20, 5000] } as const;
const EMAIL = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[A-Za-z]{2,}$/;
export type Fields = { name: string; email: string; subject: string; message: string };

export function validate(f: Fields): Partial<Record<keyof Fields, string>> {
  const e: Partial<Record<keyof Fields, string>> = {};
  const len = (k: keyof Fields, label: string) => {
    const v = f[k].trim(); const [min, max] = LIMITS[k];
    if (!v) e[k] = `${label} is required.`;
    else if (v.length < min) e[k] = `${label} needs at least ${min} characters.`;
    else if (v.length > max) e[k] = `${label} can be at most ${max} characters (now ${v.length}).`;
  };
  len('name', 'Your name'); len('email', 'Email address'); len('subject', 'Subject'); len('message', 'Message');
  if (!e.email && !EMAIL.test(f.email.trim())) e.email = 'Enter an email address like name@example.com.';
  if (!e.name && /[\r\n]/.test(f.name)) e.name = 'Your name can’t contain line breaks.';
  if (!e.subject && /[\r\n]/.test(f.subject)) e.subject = 'The subject can’t contain line breaks.';
  return e;
}

import { describe, expect, it } from 'vitest';
import { validate } from './validation';
const ok = { name: 'Ayesha Khan', email: 'ayesha@example.com', subject: 'Internship', message: 'Hello Zohair, I enjoyed the Scorched spread a lot.' };
describe('contact validation', () => {
  it('accepts a valid letter', () => expect(validate(ok)).toEqual({}));
  it('flags bad email', () => expect(validate({ ...ok, email: 'nope' }).email).toBeTruthy());
  it('flags header injection in subject', () => expect(validate({ ...ok, subject: 'Hi\r\nBcc: x@y.com' }).subject).toBeTruthy());
  it('flags short message', () => expect(validate({ ...ok, message: 'hi' }).message).toMatch(/at least 20/));
  it('flags over-long message', () => expect(validate({ ...ok, message: 'x'.repeat(5001) }).message).toMatch(/at most/));
});

import { describe, it, expect } from 'vitest';
import { validateContactForm } from '../components/Contact.jsx';

describe('validateContactForm', () => {
  const valid = { name: 'Jane', email: 'jane@example.com', message: 'Hello there friend' };

  it('returns no errors for a valid form', () => {
    expect(validateContactForm(valid)).toEqual({});
  });

  it('requires name', () => {
    expect(validateContactForm({ ...valid, name: '' }).name).toBeDefined();
    expect(validateContactForm({ ...valid, name: '   ' }).name).toBeDefined();
  });

  it('requires email', () => {
    expect(validateContactForm({ ...valid, email: '' }).email).toBeDefined();
  });

  it('rejects malformed email', () => {
    expect(validateContactForm({ ...valid, email: 'not-an-email' }).email).toMatch(/valid/i);
    expect(validateContactForm({ ...valid, email: 'a@b' }).email).toMatch(/valid/i);
  });

  it('rejects too-short message', () => {
    expect(validateContactForm({ ...valid, message: 'hi' }).message).toBeDefined();
  });

  it('rejects too-long message', () => {
    expect(validateContactForm({ ...valid, message: 'x'.repeat(4001) }).message).toMatch(/long/i);
  });
});

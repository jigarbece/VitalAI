import { describe, it, expect, vi } from 'vitest';
import { extractTextFromPdf } from '../services/pdfParser.js';

describe('extractTextFromPdf', () => {
  it('returns trimmed text from pdf-parse output', async () => {
    const fakeBuffer = Buffer.from('fake pdf');
    const fakeParse = vi.fn().mockResolvedValue({ text: '   Hemoglobin 13.5 g/dL  \n\n' });
    const text = await extractTextFromPdf(fakeBuffer, { parser: fakeParse });
    expect(text).toBe('Hemoglobin 13.5 g/dL');
    expect(fakeParse).toHaveBeenCalledWith(fakeBuffer);
  });

  it('returns empty string when parser returns no text', async () => {
    const fakeParse = vi.fn().mockResolvedValue({ text: '' });
    const text = await extractTextFromPdf(Buffer.from('x'), { parser: fakeParse });
    expect(text).toBe('');
  });

  it('returns empty string when parser throws', async () => {
    const fakeParse = vi.fn().mockRejectedValue(new Error('corrupt pdf'));
    const text = await extractTextFromPdf(Buffer.from('x'), { parser: fakeParse });
    expect(text).toBe('');
  });

  it('throws if no buffer is provided', async () => {
    await expect(extractTextFromPdf(null, { parser: vi.fn() })).rejects.toThrow();
  });
});

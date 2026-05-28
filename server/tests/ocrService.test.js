import { describe, it, expect, vi } from 'vitest';
import { extractTextFromImage } from '../services/ocrService.js';

describe('extractTextFromImage', () => {
  it('returns trimmed text from OCR engine output', async () => {
    const fakeRecognize = vi.fn().mockResolvedValue({ data: { text: '  Glucose 92 mg/dL  \n' } });
    const text = await extractTextFromImage(Buffer.from('img'), { recognize: fakeRecognize });
    expect(text).toBe('Glucose 92 mg/dL');
  });

  it('returns empty string when OCR returns nothing', async () => {
    const fakeRecognize = vi.fn().mockResolvedValue({ data: { text: '' } });
    const text = await extractTextFromImage(Buffer.from('img'), { recognize: fakeRecognize });
    expect(text).toBe('');
  });

  it('returns empty string when OCR throws', async () => {
    const fakeRecognize = vi.fn().mockRejectedValue(new Error('unreadable'));
    const text = await extractTextFromImage(Buffer.from('img'), { recognize: fakeRecognize });
    expect(text).toBe('');
  });
});

import Tesseract from 'tesseract.js';

async function defaultRecognize(buffer) {
  return Tesseract.recognize(buffer, 'eng');
}

export async function extractTextFromImage(buffer, options = {}) {
  if (!buffer) throw new Error('Image buffer is required');
  const recognize = options.recognize || defaultRecognize;
  try {
    const result = await recognize(buffer);
    const text = result?.data?.text;
    if (typeof text !== 'string') return '';
    return text.trim();
  } catch (_err) {
    return '';
  }
}

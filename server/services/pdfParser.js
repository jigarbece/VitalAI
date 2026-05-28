import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let cachedParser = null;
function getDefaultParser() {
  if (!cachedParser) {
    // pdf-parse only exports CJS - load lazily so the module can run in tests
    // with a stubbed parser even if the real one fails to initialize.
    cachedParser = require('pdf-parse');
  }
  return cachedParser;
}

export async function extractTextFromPdf(buffer, options = {}) {
  if (!buffer) throw new Error('PDF buffer is required');
  const parser = options.parser || getDefaultParser();
  try {
    const result = await parser(buffer);
    if (!result || typeof result.text !== 'string') return '';
    return result.text.trim();
  } catch (_err) {
    return '';
  }
}

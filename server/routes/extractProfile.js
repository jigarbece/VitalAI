import express from 'express';
import multer from 'multer';
import { extractTextFromPdf } from '../services/pdfParser.js';
import { extractTextFromImage } from '../services/ocrService.js';
import { extractProfileFromText } from '../services/profileExtractor.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export function createExtractProfileRouter(deps = {}) {
  const pdfExtractor = deps.extractTextFromPdf || extractTextFromPdf;
  const ocrExtractor = deps.extractTextFromImage || extractTextFromImage;
  const profileExtractor = deps.extractProfileFromText || extractProfileFromText;

  const router = express.Router();

  router.post('/api/extract-profile', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      let text = '';
      const mime = (req.file.mimetype || '').toLowerCase();

      if (mime === 'application/pdf') {
        text = await pdfExtractor(req.file.buffer);
      } else if (mime.startsWith('image/')) {
        text = await ocrExtractor(req.file.buffer);
      } else {
        return res.status(400).json({ error: 'Unsupported file type. Use PDF, JPG, or PNG.' });
      }

      const profile = profileExtractor(text);
      res.json({ extracted: profile, hasData: Object.keys(profile).length > 0 });
    } catch (err) {
      // Don't fail hard — just return empty; the user can fill in manually
      res.json({ extracted: {}, hasData: false });
    }
  });

  return router;
}

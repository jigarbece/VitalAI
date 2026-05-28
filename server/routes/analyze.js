import express from 'express';
import multer from 'multer';
import { extractTextFromPdf as defaultPdf } from '../services/pdfParser.js';
import { extractTextFromImage as defaultOcr } from '../services/ocrService.js';
import { generateHealthPlan as defaultGenerate } from '../services/aiService.js';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const DEFAULT_HEIGHT_CM = 155;

function validateProfile(profile) {
  if (!profile || typeof profile !== 'object') return 'userProfile is required';
  // Required fields
  if (profile.age === undefined || profile.age === null || profile.age === '') return 'userProfile.age is required';
  const age = Number(profile.age);
  if (isNaN(age) || age <= 0) return 'userProfile.age must be a positive number';
  if (profile.weight === undefined || profile.weight === null || profile.weight === '') return 'userProfile.weight is required';
  if (!(Number(profile.weight) > 0)) return 'userProfile.weight must be a positive number';
  // Height is optional — defaults to 155 cm if blank
  if (profile.height !== undefined && profile.height !== '' && profile.height !== null) {
    if (!(Number(profile.height) > 0)) return 'userProfile.height must be a positive number';
  }
  return null;
}

function coerceProfile(profile) {
  const coerced = {
    ...profile,
    age: Number(profile.age),
    weight: Number(profile.weight),
    height: (profile.height !== undefined && profile.height !== '' && profile.height !== null)
      ? Number(profile.height)
      : DEFAULT_HEIGHT_CM,
    goals: Array.isArray(profile.goals) ? profile.goals : [],
    conditions: profile.conditions || '',
  };
  return coerced;
}

export function createAnalyzeRouter(deps = {}) {
  const {
    extractTextFromPdf = defaultPdf,
    extractTextFromImage = defaultOcr,
    generateHealthPlan = defaultGenerate,
    stats = null,
  } = deps;

  const router = express.Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_BYTES },
  }).single('file');

  router.post('/api/analyze', (req, res) => {
    upload(req, res, async (uploadErr) => {
      if (uploadErr) {
        if (uploadErr.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
        }
        return res.status(400).json({ error: uploadErr.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded. Attach a blood report PDF or image as "file".' });
      }

      let profile;
      try {
        profile = JSON.parse(req.body.userProfile || 'null');
      } catch (_) {
        return res.status(400).json({ error: 'userProfile must be valid JSON' });
      }

      const validationError = validateProfile(profile);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const coerced = coerceProfile(profile);
      const mime = (req.file.mimetype || '').toLowerCase();
      const isPdf = mime === 'application/pdf' || (req.file.originalname || '').toLowerCase().endsWith('.pdf');

      let extractedText = '';
      try {
        extractedText = isPdf
          ? await extractTextFromPdf(req.file.buffer)
          : await extractTextFromImage(req.file.buffer);
      } catch (err) {
        extractedText = '';
      }

      try {
        const plan = await generateHealthPlan(extractedText, coerced, { allowFallback: true });
        if (stats?.recordReportChecked) {
          stats.recordReportChecked().catch(() => {});
        }
        return res.json(plan);
      } catch (err) {
        const message = err && err.message ? err.message : 'Internal error';
        return res.status(500).json({
          error: 'Analysis failed. Please try again in a moment.',
          detail: message,
        });
      }
    });
  });

  return router;
}

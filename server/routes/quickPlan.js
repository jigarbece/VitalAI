import express from 'express';
import { generateHealthPlan as defaultGenerate } from '../services/aiService.js';
import { createAiRateLimit } from '../middleware/aiRateLimit.js';
import { detectUrgentConcern, urgentResponse } from '../services/medicalSafety.js';
import { requireSupabaseUser } from '../middleware/supabaseAuth.js';

const DEFAULT_HEIGHT_CM = 155;

function validateProfile(profile) {
  if (!profile || typeof profile !== 'object') return 'userProfile is required';
  if (profile.age === undefined || profile.age === null || profile.age === '') return 'userProfile.age is required';
  if (!(Number(profile.age) > 0)) return 'userProfile.age must be a positive number';
  if (profile.weight === undefined || profile.weight === null || profile.weight === '') return 'userProfile.weight is required';
  if (!(Number(profile.weight) > 0)) return 'userProfile.weight must be a positive number';
  // Height is optional — defaults to 155 cm if blank
  if (profile.height !== undefined && profile.height !== '' && profile.height !== null) {
    if (!(Number(profile.height) > 0)) return 'userProfile.height must be a positive number';
  }
  return null;
}

function coerce(profile) {
  return {
    ...profile,
    age: Number(profile.age),
    weight: Number(profile.weight),
    height: (profile.height !== undefined && profile.height !== '' && profile.height !== null)
      ? Number(profile.height)
      : DEFAULT_HEIGHT_CM,
    goals: Array.isArray(profile.goals) ? profile.goals : [],
    conditions: profile.conditions || '',
  };
}

export function createQuickPlanRouter(deps = {}) {
  const {
    generateHealthPlan = defaultGenerate,
    stats = null,
  } = deps;

  const router = express.Router();
  const aiRateLimit = deps.aiRateLimit || createAiRateLimit();
  const authenticate = deps.authenticate || requireSupabaseUser;

  router.post('/api/quick-plan', authenticate, aiRateLimit, async (req, res) => {
    const err = validateProfile(req.body);
    if (err) return res.status(400).json({ error: err });
    if (detectUrgentConcern(req.body)) return res.status(422).json(urgentResponse());

    try {
      const plan = await generateHealthPlan('', coerce(req.body), { allowFallback: true });
      if (stats?.recordQuickPlanChecked) {
        stats.recordQuickPlanChecked().catch(() => {});
      }
      return res.json(plan);
    } catch (e) {
      return res.status(500).json({
        error: 'Could not generate a plan. Please try again.',
      });
    }
  });

  return router;
}

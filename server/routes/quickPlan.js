import express from 'express';
import { generateHealthPlan as defaultGenerate } from '../services/aiService.js';

const REQUIRED = ['age', 'gender', 'weight', 'height', 'diet', 'activity'];

function validateProfile(profile) {
  if (!profile || typeof profile !== 'object') return 'userProfile is required';
  for (const f of REQUIRED) {
    if (profile[f] === undefined || profile[f] === null || profile[f] === '') {
      return `userProfile.${f} is required`;
    }
  }
  if (!(Number(profile.age) > 0)) return 'userProfile.age must be a positive number';
  if (!(Number(profile.weight) > 0)) return 'userProfile.weight must be a positive number';
  if (!(Number(profile.height) > 0)) return 'userProfile.height must be a positive number';
  return null;
}

function coerce(profile) {
  return {
    ...profile,
    age: Number(profile.age),
    weight: Number(profile.weight),
    height: Number(profile.height),
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

  router.post('/api/quick-plan', async (req, res) => {
    const err = validateProfile(req.body);
    if (err) return res.status(400).json({ error: err });

    try {
      const plan = await generateHealthPlan('', coerce(req.body), { allowFallback: true });
      if (stats?.recordQuickPlanChecked) {
        stats.recordQuickPlanChecked().catch(() => {});
      }
      return res.json(plan);
    } catch (e) {
      return res.status(500).json({
        error: 'Could not generate a plan. Please try again.',
        detail: e?.message,
      });
    }
  });

  return router;
}

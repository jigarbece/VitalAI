import express from 'express';
import { generateWeeklyDietPlan } from '../services/weeklyDietService.js';
import { generateMockPlan } from '../services/aiService.js';
import { requireSupabaseUser } from '../middleware/supabaseAuth.js';

export function createWeeklyPlanRouter(deps = {}) {
  const router = express.Router();
  const authenticate = deps.authenticate || requireSupabaseUser;
  router.post('/api/weekly-plan', authenticate, (req, res) => {
    try {
      const profile = req.body;
      if (!profile || !(Number(profile.weight || profile.current_weight_kg) > 0)) {
        return res.status(400).json({ error: 'Weight is required' });
      }
      return res.json({ weeklyDietPlan: generateWeeklyDietPlan(profile) });
    } catch (_) {
      return res.status(500).json({ error: 'Could not generate a safe weekly plan.' });
    }
  });
  router.get('/api/demo', (_req, res) => {
    const profile = {
      name: 'Demo User', age: 34, gender: 'Female', weight: 68, height: 165,
      activity: 'Moderately Active (3-5 days/week)', diet: 'Vegetarian',
      goals: ['Improve Energy'], allergies: [],
    };
    return res.json({ ...generateMockPlan(profile), weeklyDietPlan: generateWeeklyDietPlan(profile), _mode: 'report', name: profile.name, _demo: true });
  });
  return router;
}

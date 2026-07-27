import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createQuickPlanRouter } from '../routes/quickPlan.js';

function buildApp(deps) {
  const app = express();
  app.use(express.json());
  app.use(createQuickPlanRouter({ authenticate: (_req, _res, next) => next(), ...deps }));
  return app;
}

const validProfile = {
  age: 30,
  gender: 'Male',
  weight: 75,
  height: 175,
  diet: 'Vegetarian',
  activity: 'Moderately Active (3-5 days/week)',
  goals: ['Lose Weight'],
  conditions: '',
};

describe('POST /api/quick-plan', () => {
  let generateHealthPlan;
  let stats;

  beforeEach(() => {
    generateHealthPlan = vi.fn().mockResolvedValue({ healthScore: 70, bmi: 24, dailyCalories: 2000, bloodMarkers: [] });
    stats = { recordQuickPlanChecked: vi.fn().mockResolvedValue(undefined) };
  });

  it('returns 400 when profile is missing', async () => {
    const app = buildApp({ generateHealthPlan, stats });
    const res = await request(app).post('/api/quick-plan').send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when required profile fields are missing', async () => {
    const app = buildApp({ generateHealthPlan, stats });
    const res = await request(app).post('/api/quick-plan').send({ age: 30 });
    expect(res.status).toBe(400);
  });

  it('returns 200 and generates a plan without report text', async () => {
    const app = buildApp({ generateHealthPlan, stats });
    const res = await request(app).post('/api/quick-plan').send(validProfile);
    expect(res.status).toBe(200);
    expect(generateHealthPlan).toHaveBeenCalledOnce();
    // first arg is the report text - must be empty for the BMI-only flow
    expect(generateHealthPlan.mock.calls[0][0]).toBe('');
    expect(res.body.healthScore).toBe(70);
  });

  it('records a quick-plan check on success', async () => {
    const app = buildApp({ generateHealthPlan, stats });
    await request(app).post('/api/quick-plan').send(validProfile);
    expect(stats.recordQuickPlanChecked).toHaveBeenCalledOnce();
  });

  it('does not record a quick-plan check on failure', async () => {
    generateHealthPlan.mockRejectedValueOnce(new Error('upstream'));
    const app = buildApp({ generateHealthPlan, stats });
    const res = await request(app).post('/api/quick-plan').send(validProfile);
    expect(res.status).toBe(500);
    expect(stats.recordQuickPlanChecked).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildPrompt,
  parseAiResponse,
  generateMockPlan,
  generateHealthPlan,
} from '../services/aiService.js';

const sampleProfile = {
  age: 35,
  gender: 'Male',
  weight: 78,
  height: 175,
  diet: 'Vegetarian',
  activity: 'Moderately Active (3-5 days/week)',
  goals: ['Lose Weight', 'Improve Energy'],
  conditions: 'Mild hypertension',
};

describe('buildPrompt', () => {
  it('includes all user profile fields in the prompt', () => {
    const prompt = buildPrompt('Hemoglobin 13.5 g/dL', sampleProfile);
    expect(prompt).toContain('35');
    expect(prompt).toContain('Male');
    expect(prompt).toContain('78');
    expect(prompt).toContain('175');
    expect(prompt).toContain('Vegetarian');
    expect(prompt).toContain('Moderately Active');
    expect(prompt).toContain('Lose Weight');
    expect(prompt).toContain('Improve Energy');
    expect(prompt).toContain('hypertension');
    expect(prompt).toContain('Hemoglobin 13.5');
  });

  it('handles missing/empty optional fields gracefully', () => {
    const prompt = buildPrompt('', { ...sampleProfile, conditions: '', goals: [] });
    expect(prompt).toContain('None reported');
    expect(prompt).toContain('General Wellness');
  });

  it('notes when blood report text is unavailable', () => {
    const prompt = buildPrompt('', sampleProfile);
    expect(prompt.toLowerCase()).toContain('could not be extracted');
  });
});

describe('parseAiResponse', () => {
  it('parses clean JSON', () => {
    const raw = JSON.stringify({ healthScore: 75, bloodMarkers: [] });
    const parsed = parseAiResponse(raw);
    expect(parsed.healthScore).toBe(75);
  });

  it('strips markdown code fences when present', () => {
    const raw = '```json\n{"healthScore": 80}\n```';
    const parsed = parseAiResponse(raw);
    expect(parsed.healthScore).toBe(80);
  });

  it('extracts JSON from surrounding text', () => {
    const raw = 'Here is the analysis:\n{"healthScore": 65}\nThanks.';
    const parsed = parseAiResponse(raw);
    expect(parsed.healthScore).toBe(65);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseAiResponse('not json at all')).toThrow();
  });
});

describe('generateMockPlan', () => {
  it('returns a fully-formed plan matching the expected shape', () => {
    const plan = generateMockPlan(sampleProfile);

    expect(plan).toHaveProperty('healthScore');
    expect(typeof plan.healthScore).toBe('number');
    expect(plan.healthScore).toBeGreaterThanOrEqual(0);
    expect(plan.healthScore).toBeLessThanOrEqual(100);

    expect(Array.isArray(plan.bloodMarkers)).toBe(true);
    expect(plan.bloodMarkers.length).toBeGreaterThan(0);
    expect(plan.bloodMarkers[0]).toHaveProperty('name');
    expect(plan.bloodMarkers[0]).toHaveProperty('status');

    expect(Array.isArray(plan.keyFindings)).toBe(true);
    expect(plan.dietPlan).toHaveProperty('breakfast');
    expect(plan.dietPlan).toHaveProperty('lunch');
    expect(plan.dietPlan).toHaveProperty('dinner');
    expect(plan.dietPlan.foodsToAvoid).toBeInstanceOf(Array);

    expect(plan.exercisePlan).toHaveProperty('monday');
    expect(plan.exercisePlan).toHaveProperty('sunday');
    expect(plan.exercisePlan.sunday.type).toBe('Rest');
  });

  it('computes BMI from weight and height', () => {
    const plan = generateMockPlan({ ...sampleProfile, weight: 70, height: 170 });
    expect(plan.bmi).toBeCloseTo(24.2, 1);
    expect(plan.bmiCategory).toBe('Normal');
  });

  it('categorizes BMI correctly across thresholds', () => {
    expect(generateMockPlan({ ...sampleProfile, weight: 45, height: 170 }).bmiCategory).toBe('Underweight');
    expect(generateMockPlan({ ...sampleProfile, weight: 80, height: 170 }).bmiCategory).toBe('Overweight');
    expect(generateMockPlan({ ...sampleProfile, weight: 100, height: 170 }).bmiCategory).toBe('Obese');
  });

  it('respects diet preference (no meat in vegetarian)', () => {
    const plan = generateMockPlan({ ...sampleProfile, diet: 'Vegetarian' });
    const allMeals = JSON.stringify(plan.dietPlan).toLowerCase();
    expect(allMeals).not.toMatch(/\b(chicken|beef|fish|mutton|pork)\b/);
  });
});

describe('generateHealthPlan', () => {
  it('returns mock when USE_MOCK_AI=true', async () => {
    const plan = await generateHealthPlan('any text', sampleProfile, { useMock: true });
    expect(plan.healthScore).toBeDefined();
    expect(plan.bloodMarkers).toBeInstanceOf(Array);
  });

  it('uses injected client when provided', async () => {
    const fakeClient = {
      generateContent: vi.fn().mockResolvedValue(
        JSON.stringify({
          healthScore: 88,
          bloodMarkers: [],
          keyFindings: ['ok'],
          bmi: 22,
          bmiCategory: 'Normal',
          dailyCalories: 2000,
          dietPlan: {
            breakfast: { name: 'X', description: '', calories: 0, nutrients: '' },
            morningSnack: { name: 'X', description: '', calories: 0, nutrients: '' },
            lunch: { name: 'X', description: '', calories: 0, nutrients: '' },
            eveningSnack: { name: 'X', description: '', calories: 0, nutrients: '' },
            dinner: { name: 'X', description: '', calories: 0, nutrients: '' },
            foodsToAvoid: [],
            hydration: '2L',
            weeklyTips: 'vary',
          },
          exercisePlan: {
            monday: { type: 'Cardio', duration: '30m', exercises: 'Walk', intensity: 'Low' },
            tuesday: { type: 'Rest', duration: '0', exercises: '', intensity: 'None' },
            wednesday: { type: 'Cardio', duration: '30m', exercises: 'Walk', intensity: 'Low' },
            thursday: { type: 'Rest', duration: '0', exercises: '', intensity: 'None' },
            friday: { type: 'Cardio', duration: '30m', exercises: 'Walk', intensity: 'Low' },
            saturday: { type: 'Rest', duration: '0', exercises: '', intensity: 'None' },
            sunday: { type: 'Rest', duration: 'Full rest', exercises: 'Light walking optional', intensity: 'None' },
            specialNotes: '',
            warmup: '5 min',
            cooldown: '5 min',
          },
        })
      ),
    };
    const plan = await generateHealthPlan('text', sampleProfile, { client: fakeClient });
    expect(plan.healthScore).toBe(88);
    expect(fakeClient.generateContent).toHaveBeenCalledOnce();
  });

  it('falls back to mock when AI client throws and allowFallback=true', async () => {
    const failingClient = {
      generateContent: vi.fn().mockRejectedValue(new Error('quota exceeded')),
    };
    const plan = await generateHealthPlan('text', sampleProfile, {
      client: failingClient,
      allowFallback: true,
    });
    expect(plan.healthScore).toBeDefined();
    expect(plan.keyFindings.some((f) => f.toLowerCase().includes('ai'))).toBe(true);
  });

  it('throws when AI client fails and allowFallback=false', async () => {
    const failingClient = {
      generateContent: vi.fn().mockRejectedValue(new Error('boom')),
    };
    await expect(
      generateHealthPlan('text', sampleProfile, { client: failingClient, allowFallback: false })
    ).rejects.toThrow();
  });
});

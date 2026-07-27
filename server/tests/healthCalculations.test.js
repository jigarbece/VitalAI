import { describe, expect, it } from 'vitest';
import {
  calculateBmi,
  calculateBmr,
  calculateTdee,
  healthyWeightRange,
  suggestedCalorieTarget,
  validateWeightGoal,
} from '../services/healthCalculations.js';

const profile = {
  age: 35,
  gender: 'Male',
  weight: 78,
  height: 175,
  activity: 'Moderately Active (3-5 days/week)',
  goals: ['Lose Weight'],
};

describe('deterministic health calculations', () => {
  it('calculates BMI and healthy weight range', () => {
    expect(calculateBmi(70, 170)).toBe(24.2);
    expect(healthyWeightRange(170)).toEqual({ minKg: 53.5, maxKg: 72 });
  });

  it('calculates Mifflin-St Jeor BMR, TDEE and calorie target', () => {
    expect(calculateBmr(profile)).toBe(1704);
    expect(calculateTdee(profile)).toBe(2641);
    expect(suggestedCalorieTarget(profile)).toBe(2241);
  });

  it('rejects unsafe target speed', () => {
    const result = validateWeightGoal(profile, 55, '2030-02-01', new Date('2030-01-01'));
    expect(result.safe).toBe(false);
    expect(result.suggestedMilestoneKg).toBeDefined();
  });

  it('accepts a realistic adult target', () => {
    const result = validateWeightGoal(profile, 74, '2030-04-01', new Date('2030-01-01'));
    expect(result.safe).toBe(true);
  });
});

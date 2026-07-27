import { describe, expect, it } from 'vitest';
import { FOOD_CATALOG } from '../data/foodCatalog.js';
import { generateWeeklyDietPlan, validateWeeklyDietPlan } from '../services/weeklyDietService.js';

const profile = {
  age: 35,
  gender: 'Female',
  weight: 68,
  height: 165,
  activity: 'Moderately Active (3-5 days/week)',
  diet: 'Vegetarian',
  allergies: ['Nuts'],
  dislikes: ['Bitter gourd'],
  goals: ['Lose Weight'],
};

describe('food catalog and weekly diet engine', () => {
  it('contains at least 100 validated foods', () => {
    expect(FOOD_CATALOG.length).toBeGreaterThanOrEqual(100);
    expect(FOOD_CATALOG.every((food) => food.calories >= 0 && food.servingSize > 0)).toBe(true);
  });

  it('generates seven days with meals, totals, and grocery list', () => {
    const plan = generateWeeklyDietPlan(profile);
    expect(plan.days).toHaveLength(7);
    expect(plan.days.every((day) => day.meals.length >= 3)).toBe(true);
    expect(plan.groceryList.length).toBeGreaterThan(10);
    expect(validateWeeklyDietPlan(plan, profile)).toBe(true);
  });

  it('excludes declared allergens', () => {
    const plan = generateWeeklyDietPlan(profile);
    const names = plan.days.flatMap((day) => day.meals).flatMap((meal) => meal.items).map((food) => food.name);
    expect(names).not.toContain('Peanuts');
  });
});

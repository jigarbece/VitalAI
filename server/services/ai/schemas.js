import { z } from 'zod';

const mealSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  calories: z.number().nonnegative(),
  nutrients: z.string(),
});

const exerciseDaySchema = z.object({
  type: z.string(),
  duration: z.string(),
  exercises: z.string(),
  intensity: z.string(),
});

export const healthPlanSchema = z.object({
  plainSummary: z.string().optional(),
  healthScore: z.number().min(0).max(100),
  bloodMarkers: z.array(z.object({
    name: z.string(),
    value: z.string(),
    normalRange: z.string(),
    status: z.enum(['normal', 'high', 'low', 'borderline']),
    note: z.string(),
  })),
  keyFindings: z.array(z.string()),
  bmi: z.number().nullable(),
  bmiCategory: z.enum(['Underweight', 'Normal', 'Overweight', 'Obese', 'Unknown']),
  dailyCalories: z.number().nullable(),
  dietPlan: z.object({
    breakfast: mealSchema,
    morningSnack: mealSchema,
    lunch: mealSchema,
    eveningSnack: mealSchema,
    dinner: mealSchema,
    foodsToAvoid: z.array(z.string()),
    hydration: z.string(),
    weeklyTips: z.string(),
  }),
  exercisePlan: z.object({
    monday: exerciseDaySchema,
    tuesday: exerciseDaySchema,
    wednesday: exerciseDaySchema,
    thursday: exerciseDaySchema,
    friday: exerciseDaySchema,
    saturday: exerciseDaySchema,
    sunday: exerciseDaySchema,
    specialNotes: z.string(),
    warmup: z.string(),
    cooldown: z.string(),
  }),
}).strict();

export function validateHealthPlan(value) {
  return healthPlanSchema.parse(value);
}

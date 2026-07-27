const ACTIVITY_MULTIPLIERS = {
  'Sedentary (desk job, no exercise)': 1.2,
  'Lightly Active (1-3 days/week)': 1.375,
  'Moderately Active (3-5 days/week)': 1.55,
  'Very Active (6-7 days/week)': 1.725,
};

const round = (value, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export function calculateBmi(weightKg, heightCm) {
  if (!(weightKg > 0) || !(heightCm > 0)) return null;
  return round(weightKg / ((heightCm / 100) ** 2), 1);
}

export function categorizeBmi(bmi) {
  if (!(bmi > 0)) return 'Unknown';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

export function healthyWeightRange(heightCm) {
  if (!(heightCm > 0)) return null;
  const heightM2 = (heightCm / 100) ** 2;
  return { minKg: round(18.5 * heightM2, 1), maxKg: round(24.9 * heightM2, 1) };
}

export function calculateBmr({ age, gender, weight, height }) {
  if (!(age > 0) || !(weight > 0) || !(height > 0)) return null;
  const sexOffset = gender === 'Male' ? 5 : gender === 'Female' ? -161 : -78;
  return Math.round(10 * weight + 6.25 * height - 5 * age + sexOffset);
}

export function calculateTdee(profile) {
  const bmr = calculateBmr(profile);
  if (!bmr) return null;
  return Math.round(bmr * (ACTIVITY_MULTIPLIERS[profile.activity] || 1.375));
}

export function suggestedCalorieTarget(profile) {
  const tdee = calculateTdee(profile);
  if (!tdee) return null;
  const goals = profile.goals || [];
  const adjustment = goals.includes('Lose Weight') ? -400 : goals.includes('Gain Muscle') ? 300 : 0;
  return Math.max(1200, Math.round(tdee + adjustment));
}

export function calculateHealthEstimates(profile) {
  const bmi = calculateBmi(profile.weight, profile.height);
  const tdee = calculateTdee(profile);
  return {
    bmi,
    bmiCategory: categorizeBmi(bmi),
    healthyWeightRange: healthyWeightRange(profile.height),
    bmr: calculateBmr(profile),
    tdee,
    dailyCalories: suggestedCalorieTarget(profile),
    dailyProteinGrams: profile.weight > 0 ? Math.round(profile.weight * 1.2) : null,
    dailyWaterMl: profile.weight > 0 ? Math.round(profile.weight * 35) : null,
  };
}

export function validateWeightGoal(profile, targetWeight, targetDate, now = new Date()) {
  const target = Number(targetWeight);
  const date = new Date(targetDate);
  if (!(target > 0) || Number.isNaN(date.getTime()) || date <= now) {
    return { safe: false, reason: 'Enter a valid target weight and future date.' };
  }
  if (profile.age < 18) {
    return { safe: false, reason: 'Targets for children require qualified clinical guidance.' };
  }
  const weeks = (date - now) / (7 * 24 * 60 * 60 * 1000);
  const weeklyChangeKg = Math.abs(target - profile.weight) / weeks;
  const targetBmi = calculateBmi(target, profile.height);
  if (weeklyChangeKg > 1 || targetBmi < 18.5 || targetBmi > 35) {
    const direction = target < profile.weight ? -1 : 1;
    const milestone = round(profile.weight + direction * Math.min(weeks * 0.75, Math.abs(target - profile.weight)), 1);
    return {
      safe: false,
      reason: 'This target may require an unsafe rate of weight change.',
      suggestedMilestoneKg: milestone,
      weeklyChangeKg: round(weeklyChangeKg, 2),
    };
  }
  return { safe: true, weeklyChangeKg: round(weeklyChangeKg, 2), targetBmi };
}

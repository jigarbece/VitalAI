import { FOOD_CATALOG, findFood } from '../data/foodCatalog.js';
import { calculateHealthEstimates } from './healthCalculations.js';

const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const MENUS = [
  ['Rolled oats','Berries','Toor dal','Brown rice','Spinach','Roasted chana','Paneer','Broccoli'],
  ['Poha','Peanuts','Rajma','Basmati rice','Cucumber','Makhana','Tofu','Bell pepper'],
  ['Idli','Sambar','White chickpeas','Quinoa','Carrot','Greek yogurt','Mixed dal','Jowar roti'],
  ['Dalia','Apple','Chana dal','Bajra roti','Okra','Dhokla','Paneer','Green beans'],
  ['Upma','Orange','Lobia','Red rice','Cabbage','Sprout chaat','Tofu','Cauliflower'],
  ['Ragi dosa','Sambar','Black chana','Brown rice','Beetroot','Fruit chaat','Mixed dal','Whole wheat roti'],
  ['Vegetable soup','Whole wheat bread','Moong dal','Millet khichdi','Pumpkin','Roasted chana','Paneer','Zucchini'],
];

const NON_VEG_SWAP = ['Eggs','Chicken breast','Fish fillet','Salmon','Turkey breast','Prawns','Chicken breast'];

function allowed(food, profile) {
  if (!food) return false;
  const allergies = profile.allergies || [];
  if (food.allergens.some((allergen) => allergies.includes(allergen))) return false;
  const diet = profile.diet || profile.diet_type || 'Vegetarian';
  if (diet === 'Vegan' && (food.allergens.includes('Milk') || food.name === 'Eggs')) return false;
  if (['Vegetarian','Vegan','Jain'].includes(diet) && food.dietaryLabels.includes('Non-Vegetarian')) return false;
  if (diet !== 'Eggetarian' && diet !== 'Non-Vegetarian' && food.name === 'Eggs') return false;
  const dislikes = profile.dislikes || profile.preferences?.dislikes || [];
  return !dislikes.some((item) => food.name.toLowerCase().includes(String(item).toLowerCase()));
}

function item(name, profile, scale = 1) {
  let food = findFood(name);
  if (!allowed(food, profile)) {
    food = FOOD_CATALOG.find((candidate) => candidate.category === food?.category && allowed(candidate, profile));
  }
  if (!food) food = findFood('Brown rice');
  return {
    foodId: food.id,
    name: food.name,
    quantity: Math.round(food.servingSize * scale),
    unit: food.unit,
    householdMeasure: food.householdMeasure,
    calories: Math.round(food.calories * scale),
    protein: Math.round(food.protein * scale * 10) / 10,
    carbohydrates: Math.round(food.carbohydrates * scale * 10) / 10,
    fat: Math.round(food.fat * scale * 10) / 10,
    fibre: Math.round(food.fibre * scale * 10) / 10,
    preparation: 'Use minimal oil and salt; cook fresh where practical.',
    substitutions: [],
  };
}

function meal(slot, time, title, names, profile, scale) {
  const items = names.map((name) => item(name, profile, scale));
  return { slot, time, title, items };
}

const sum = (meals, key) => Math.round(meals.flatMap((mealValue) => mealValue.items).reduce((total, food) => total + food[key], 0) * 10) / 10;

export function generateWeeklyDietPlan(profile) {
  const estimates = calculateHealthEstimates({
    ...profile,
    weight: Number(profile.weight || profile.current_weight_kg),
    height: Number(profile.height || profile.height_cm),
    age: Number(profile.age || 30),
  });
  const target = estimates.dailyCalories || 1900;
  const scale = Math.max(0.75, Math.min(1.45, target / 1800));
  const diet = profile.diet || profile.diet_type;

  const days = DAY_NAMES.map((dayName, index) => {
    const names = [...MENUS[index]];
    if (diet === 'Non-Vegetarian') names[6] = NON_VEG_SWAP[index];
    if (diet === 'Eggetarian' && index % 2 === 0) names[0] = 'Eggs';
    const meals = [
      meal('Breakfast', profile.breakfastTime || '08:00', `${names[0]} breakfast`, names.slice(0, 2), profile, scale),
      meal('Lunch', profile.lunchTime || '13:00', `${names[2]} balanced lunch`, names.slice(2, 5), profile, scale),
      meal('Evening snack', profile.snackTime || '17:00', `${names[5]} snack`, [names[5]], profile, scale),
      meal('Dinner', profile.dinnerTime || '20:00', `${names[6]} light dinner`, names.slice(6, 8), profile, scale),
    ];
    return {
      dayNumber: index + 1,
      dayName,
      meals,
      totalCalories: sum(meals, 'calories'),
      totalProtein: sum(meals, 'protein'),
      totalCarbohydrates: sum(meals, 'carbohydrates'),
      totalFat: sum(meals, 'fat'),
      totalFibre: sum(meals, 'fibre'),
      waterTargetMl: estimates.dailyWaterMl || 2500,
      fruitServings: 2,
      vegetableServings: 4,
      exerciseSuggestion: index === 6 ? 'Rest and gentle mobility' : '30 minutes of moderate activity',
    };
  });

  const grocery = new Map();
  days.flatMap((day) => day.meals).flatMap((mealValue) => mealValue.items).forEach((food) => {
    grocery.set(food.name, (grocery.get(food.name) || 0) + food.quantity);
  });

  const plan = {
    summary: 'A seven-day plan generated from validated food data and your saved preferences.',
    generationMethod: 'standard nutrition engine',
    dailyCalorieTarget: target,
    dailyProteinTarget: estimates.dailyProteinGrams || 75,
    dailyWaterTargetMl: estimates.dailyWaterMl || 2500,
    days,
    groceryList: [...grocery.entries()].map(([name, quantity]) => ({ name, weeklyQuantity: `${quantity} g` })),
    importantNotes: ['Nutrition values are approximate.', 'Adjust portions with a qualified dietitian for medical nutrition therapy.'],
  };
  validateWeeklyDietPlan(plan, profile);
  return plan;
}

export function validateWeeklyDietPlan(plan, profile = {}) {
  if (!plan || plan.days?.length !== 7) throw new Error('Weekly plan must contain seven days');
  const allergies = profile.allergies || [];
  for (const day of plan.days) {
    if (day.meals.length < 3) throw new Error(`Missing meals for ${day.dayName}`);
    for (const food of day.meals.flatMap((value) => value.items)) {
      const catalogFood = findFood(food.name);
      if (catalogFood?.allergens.some((allergen) => allergies.includes(allergen))) throw new Error('Plan contains an allergen');
      if (!(food.quantity > 0) || !(food.calories >= 0)) throw new Error('Invalid food quantity');
    }
  }
  return true;
}

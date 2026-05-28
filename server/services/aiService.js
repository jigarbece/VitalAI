import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_GROQ_MODEL  = process.env.GROQ_MODEL    || 'llama-3.3-70b-versatile';
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL  || 'gemini-1.5-flash';


const JSON_SCHEMA_HINT = `{
  "plainSummary": "<2-3 sentence plain English summary a non-medical person can immediately understand — what their results mean, one thing to improve, one positive>",
  "healthScore": <number 0-100>,
  "bloodMarkers": [
    {
      "name": "<marker name>",
      "value": "<detected value with unit>",
      "normalRange": "<range>",
      "status": "normal|high|low|borderline",
      "note": "<brief plain English explanation>"
    }
  ],
  "keyFindings": ["<finding 1>", "<finding 2>", "<finding 3>"],
  "bmi": <number or null if weight/height not provided>,
  "bmiCategory": "Underweight|Normal|Overweight|Obese|Unknown",
  "dailyCalories": <number or null if weight/height not provided>,
  "dietPlan": {
    "breakfast":    { "name": "", "description": "", "calories": 0, "nutrients": "" },
    "morningSnack": { "name": "", "description": "", "calories": 0, "nutrients": "" },
    "lunch":        { "name": "", "description": "", "calories": 0, "nutrients": "" },
    "eveningSnack": { "name": "", "description": "", "calories": 0, "nutrients": "" },
    "dinner":       { "name": "", "description": "", "calories": 0, "nutrients": "" },
    "foodsToAvoid": ["<food>"],
    "hydration": "<recommendation>",
    "weeklyTips": "<tip>"
  },
  "exercisePlan": {
    "monday":    { "type": "", "duration": "", "exercises": "", "intensity": "" },
    "tuesday":   { "type": "", "duration": "", "exercises": "", "intensity": "" },
    "wednesday": { "type": "", "duration": "", "exercises": "", "intensity": "" },
    "thursday":  { "type": "", "duration": "", "exercises": "", "intensity": "" },
    "friday":    { "type": "", "duration": "", "exercises": "", "intensity": "" },
    "saturday":  { "type": "", "duration": "", "exercises": "", "intensity": "" },
    "sunday":    { "type": "Rest", "duration": "Full rest", "exercises": "Light walking optional", "intensity": "None" },
    "specialNotes": "<notes based on blood report>",
    "warmup": "<5 min warmup routine>",
    "cooldown": "<5 min cooldown routine>"
  }
}`;

export function buildPrompt(reportText, profile) {
  const goals = profile.goals && profile.goals.length > 0 ? profile.goals.join(', ') : 'General Wellness';
  const conditions = profile.conditions && profile.conditions.trim().length > 0
    ? profile.conditions.trim()
    : 'None reported';

  const cleanedReport = reportText ? reportText.trim() : '';
  const reportSection = cleanedReport.length >= 10
    ? `Blood Report Text (IMPORTANT — this may span multiple pages, analyze ALL markers from every page, not just the first page):\n"""\n${cleanedReport}\n"""`
    : `Blood Report Text: The blood report could not be extracted from the uploaded file. Please generate a plan based only on the user profile, and explicitly note in keyFindings that the report could not be parsed.`;

  // Build optional profile lines — skip if not provided
  const weightLine = profile.weight ? `- Weight: ${profile.weight}kg` : '- Weight: Not provided';
  const heightLine = profile.height ? `- Height: ${profile.height}cm` : '- Height: Not provided';
  const genderLine = profile.gender ? `- Gender: ${profile.gender}` : '- Gender: Not provided';
  const dietLine = profile.diet ? `- Diet: ${profile.diet}` : '- Diet: Not specified (assume balanced)';
  const activityLine = profile.activity ? `- Activity Level: ${profile.activity}` : '- Activity Level: Not specified (assume moderately active)';

  return `You are VitalAI, an expert health analyst. You have received a blood test report and user profile.
Analyze the blood report (if available) together with the user profile and return a STRICT JSON response.

${reportSection}

User Profile:
- Age: ${profile.age}
${genderLine}
${weightLine}
${heightLine}
${dietLine}
${activityLine}
- Goals: ${goals}
- Known Conditions: ${conditions}

Rules:
- CRITICAL: Read the ENTIRE blood report text carefully. Reports often span multiple pages — extract EVERY biomarker from ALL pages (CBC, lipid panel, liver function, thyroid, vitamins, minerals, urine, etc.). Do NOT stop after the first few markers.
- Write plainSummary in simple everyday English (no medical jargon) — 2 to 3 sentences max. Start with what their overall health looks like, mention one concern, and end with an encouraging action. Address the user as "you".
- Personalize the diet plan to the user's stated diet preference. If "Vegetarian", do not include meat or fish. If "Vegan", no animal products. If "Eggetarian", eggs allowed but no meat/fish. If "Non-Vegetarian", any food. If diet is not specified, use a balanced plan.
- Daily calories must match the user's goals and activity level using Mifflin-St Jeor + activity multiplier. If weight/height are missing, skip BMI and calorie fields (set to null).
- Special notes in the exercise plan must reflect findings in the blood report (e.g. low iron => avoid high intensity).
- Foods to avoid must reflect blood-report findings and known conditions.
- Health score is an overall 0-100 assessment based on ALL markers found, not just the first few.

Return ONLY valid JSON (no markdown fencing, no explanation) in this exact structure:
${JSON_SCHEMA_HINT}`;
}

export function parseAiResponse(raw) {
  if (!raw || typeof raw !== 'string') {
    throw new Error('AI response was empty');
  }
  let text = raw.trim();

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) text = fenceMatch[1].trim();

  try {
    return JSON.parse(text);
  } catch (_) {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = text.slice(firstBrace, lastBrace + 1);
      return JSON.parse(candidate);
    }
    throw new Error('Could not parse AI response as JSON');
  }
}

function computeBmi(weightKg, heightCm) {
  const h = heightCm / 100;
  return Math.round((weightKg / (h * h)) * 10) / 10;
}

function categorizeBmi(bmi) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

function computeCalories(profile) {
  const { age, gender, weight, height, activity, goals = [] } = profile;
  const s = gender === 'Male' ? 5 : gender === 'Female' ? -161 : -78;
  const bmr = 10 * weight + 6.25 * height - 5 * age + s;
  const activityMap = {
    'Sedentary (desk job, no exercise)': 1.2,
    'Lightly Active (1-3 days/week)': 1.375,
    'Moderately Active (3-5 days/week)': 1.55,
    'Very Active (6-7 days/week)': 1.725,
  };
  const multiplier = activityMap[activity] || 1.375;
  let tdee = bmr * multiplier;
  if (goals.includes('Lose Weight')) tdee -= 400;
  if (goals.includes('Gain Muscle')) tdee += 300;
  return Math.round(tdee);
}

const VEG_MEALS = {
  breakfast: { name: 'Oats with berries & almonds', description: 'Rolled oats cooked in milk, topped with mixed berries and a handful of almonds.', calories: 380, nutrients: 'Fiber, protein, antioxidants' },
  morningSnack: { name: 'Apple + green tea', description: 'One medium apple with a cup of unsweetened green tea.', calories: 120, nutrients: 'Vitamin C, polyphenols' },
  lunch: { name: 'Dal, brown rice & sauteed greens', description: 'Lentil dal with a small portion of brown rice and a side of stir-fried spinach.', calories: 520, nutrients: 'Plant protein, iron, fiber' },
  eveningSnack: { name: 'Roasted chickpeas', description: 'Lightly spiced roasted chickpeas, ~30g.', calories: 150, nutrients: 'Protein, fiber' },
  dinner: { name: 'Paneer & vegetable stir fry', description: 'Paneer cubes with bell peppers, broccoli, and a chapati on the side.', calories: 480, nutrients: 'Protein, calcium, vitamins' },
};

const NONVEG_MEALS = {
  breakfast: { name: 'Egg-white omelette & toast', description: 'Three-egg-white omelette with vegetables and one slice of whole-grain toast.', calories: 360, nutrients: 'Lean protein, fiber' },
  morningSnack: { name: 'Greek yogurt with seeds', description: 'Plain Greek yogurt topped with chia and flax seeds.', calories: 180, nutrients: 'Protein, omega-3' },
  lunch: { name: 'Grilled chicken bowl', description: 'Grilled chicken breast over quinoa with mixed greens and olive oil dressing.', calories: 540, nutrients: 'Lean protein, complex carbs' },
  eveningSnack: { name: 'Mixed nuts (small handful)', description: 'Approx 25g of unsalted almonds, walnuts, and pistachios.', calories: 170, nutrients: 'Healthy fats, magnesium' },
  dinner: { name: 'Baked fish with veggies', description: 'Baked salmon or tilapia with steamed broccoli and sweet potato.', calories: 500, nutrients: 'Omega-3, protein, vitamins' },
};

const VEGAN_MEALS = {
  breakfast: { name: 'Tofu scramble & toast', description: 'Crumbled tofu sauteed with turmeric and vegetables, with whole-grain toast.', calories: 380, nutrients: 'Plant protein, iron' },
  morningSnack: { name: 'Banana + peanut butter', description: 'One banana with a tablespoon of natural peanut butter.', calories: 220, nutrients: 'Potassium, healthy fats' },
  lunch: { name: 'Chickpea & quinoa bowl', description: 'Chickpeas, quinoa, roasted vegetables, tahini dressing.', calories: 540, nutrients: 'Plant protein, fiber' },
  eveningSnack: { name: 'Hummus with carrot sticks', description: 'Two tablespoons of hummus with fresh carrot and cucumber sticks.', calories: 160, nutrients: 'Protein, fiber' },
  dinner: { name: 'Lentil & vegetable curry', description: 'Mixed lentil curry with cauliflower and spinach, served with millet.', calories: 470, nutrients: 'Plant protein, iron, fiber' },
};

const EGG_MEALS = {
  ...VEG_MEALS,
  breakfast: { name: 'Veggie omelette', description: 'Two-egg omelette with onions, tomatoes, and spinach plus a slice of toast.', calories: 380, nutrients: 'Protein, vitamins' },
  morningSnack: { name: 'Boiled egg + fruit', description: 'One boiled egg and a small apple or pear.', calories: 180, nutrients: 'Protein, vitamin C' },
};

function pickMealSet(diet) {
  if (diet === 'Non-Vegetarian') return NONVEG_MEALS;
  if (diet === 'Vegan') return VEGAN_MEALS;
  if (diet === 'Eggetarian (Veg + Eggs)' || diet === 'Eggetarian') return EGG_MEALS;
  return VEG_MEALS;
}

export function generateMockPlan(profile) {
  const bmi = computeBmi(profile.weight, profile.height);
  const bmiCategory = categorizeBmi(bmi);
  const dailyCalories = computeCalories(profile);
  const meals = pickMealSet(profile.diet);

  const goals = profile.goals || [];
  const wantsWeightLoss = goals.includes('Lose Weight');
  const wantsMuscle = goals.includes('Gain Muscle');

  const bloodMarkers = [
    { name: 'Hemoglobin', value: '13.2 g/dL', normalRange: '13.5 - 17.5 g/dL', status: 'low', note: 'Slightly below normal - increase iron-rich foods.' },
    { name: 'Vitamin D', value: '22 ng/mL', normalRange: '30 - 100 ng/mL', status: 'low', note: 'Sun exposure and fortified foods recommended.' },
    { name: 'Cholesterol (Total)', value: '195 mg/dL', normalRange: '< 200 mg/dL', status: 'borderline', note: 'Watch saturated fat intake.' },
    { name: 'Fasting Glucose', value: '92 mg/dL', normalRange: '70 - 99 mg/dL', status: 'normal', note: 'Within healthy range.' },
    { name: 'HDL', value: '52 mg/dL', normalRange: '> 40 mg/dL', status: 'normal', note: 'Good level of "healthy" cholesterol.' },
  ];

  const keyFindings = [
    'Mock plan: this response was generated without a live AI call. Add a GEMINI_API_KEY to .env for real analysis.',
    'Hemoglobin is slightly below normal - consider iron-rich foods and a follow-up test.',
    'Vitamin D is low - aim for 15-20 minutes of sun exposure daily.',
    'Cholesterol is borderline - reduce saturated fats and increase fiber.',
  ];

  const plainSummary = `Your health score is 72/100, which is a good starting point. Your hemoglobin and vitamin D are a bit low, so adding iron-rich foods like spinach or lentils and getting some daily sunlight will help. Keep it up — small changes each day add up to big results!`;

  return {
    healthScore: 72,
    plainSummary,
    bloodMarkers,
    keyFindings,
    bmi,
    bmiCategory,
    dailyCalories,
    dietPlan: {
      ...meals,
      foodsToAvoid: ['Sugary drinks', 'Deep-fried snacks', 'Excess refined carbs', 'High-sodium processed foods'],
      hydration: 'Aim for 2.5 - 3 liters of water per day.',
      weeklyTips: 'Rotate vegetables across the week to cover all micronutrients and prevent boredom.',
    },
    exercisePlan: {
      monday:    { type: wantsMuscle ? 'Strength' : 'Cardio',  duration: '40 min', exercises: wantsMuscle ? 'Squats 3x10, Push-ups 3x12, Rows 3x10' : 'Brisk walking or cycling', intensity: 'Moderate' },
      tuesday:   { type: 'Flexibility', duration: '30 min', exercises: 'Yoga flow with deep stretching', intensity: 'Low' },
      wednesday: { type: wantsWeightLoss ? 'Cardio' : 'Strength', duration: '45 min', exercises: wantsWeightLoss ? 'Interval running or cycling' : 'Deadlifts 3x8, Bench 3x10, Pull-ups 3x6', intensity: 'Moderate-High' },
      thursday:  { type: 'Rest',        duration: 'Active recovery', exercises: 'Easy 20-minute walk', intensity: 'Very Low' },
      friday:    { type: 'Strength',    duration: '40 min', exercises: 'Lunges 3x10, Shoulder press 3x10, Planks 3x45s', intensity: 'Moderate' },
      saturday:  { type: 'Cardio',      duration: '50 min', exercises: 'Long walk, swim, or bike ride', intensity: 'Moderate' },
      sunday:    { type: 'Rest',        duration: 'Full rest', exercises: 'Light walking optional', intensity: 'None' },
      specialNotes: 'Iron and vitamin D are low - avoid maximum-effort sessions until rechecked. Hydrate well before and after workouts.',
      warmup: '5 minutes light cardio + dynamic stretching (leg swings, arm circles, hip openers).',
      cooldown: '5 minutes static stretching focusing on worked muscle groups + deep breathing.',
    },
  };
}

export async function generateHealthPlan(reportText, profile, options = {}) {
  const { client, useMock = false, allowFallback = true, apiKey } = options;

  if (useMock || process.env.USE_MOCK_AI === 'true') {
    return generateMockPlan(profile);
  }

  const prompt = buildPrompt(reportText, profile);
  const aiClient = client || createDefaultClient(apiKey);

  if (!aiClient) {
    if (!allowFallback) throw new Error('No AI client configured and fallback disabled');
    const mock = generateMockPlan(profile);
    mock.keyFindings.unshift('AI fallback: GEMINI_API_KEY is not set, returning a mock plan.');
    return mock;
  }

  try {
    const raw = await aiClient.generateContent(prompt);
    const parsed = parseAiResponse(raw);
    return normalizePlan(parsed, profile);
  } catch (err) {
    if (!allowFallback) throw err;
    const mock = generateMockPlan(profile);
    mock.keyFindings.unshift(`AI fallback: ${err.message || 'AI call failed'}. Showing a mock plan.`);
    return mock;
  }
}

function normalizePlan(plan, profile) {
  if (typeof plan.bmi !== 'number' || isNaN(plan.bmi)) {
    plan.bmi = (profile.weight && profile.height) ? computeBmi(profile.weight, profile.height) : null;
  }
  if (!plan.bmiCategory) plan.bmiCategory = plan.bmi ? categorizeBmi(plan.bmi) : 'Unknown';
  if (typeof plan.dailyCalories !== 'number') {
    plan.dailyCalories = (profile.weight && profile.height) ? computeCalories(profile) : null;
  }
  if (!Array.isArray(plan.bloodMarkers)) plan.bloodMarkers = [];
  if (!Array.isArray(plan.keyFindings)) plan.keyFindings = [];
  // Ensure plainSummary always exists
  if (!plan.plainSummary || typeof plan.plainSummary !== 'string') {
    const score = plan.healthScore || 0;
    const label = score >= 80 ? 'great' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'something that needs attention';
    plan.plainSummary = `Your overall health score is ${score}/100 — that's ${label}. Review the key findings below for specific areas to focus on. Small daily improvements can make a big difference over time.`;
  }
  return plan;
}

function createDefaultClient(apiKey) {
  // ── Groq (primary) ──────────────────────────────────────────────
  const groqKey = apiKey || process.env.GROQ_API_KEY;
  if (groqKey) {
    const groq = new Groq({ apiKey: groqKey });
    return {
      async generateContent(prompt) {
        const completion = await groq.chat.completions.create({
          model: DEFAULT_GROQ_MODEL,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.4,
          max_tokens: 4096,
        });
        return completion.choices[0]?.message?.content ?? '';
      },
    };
  }

  // ── Gemini (fallback if no Groq key) ────────────────────────────
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({
      model: DEFAULT_GEMINI_MODEL,
      generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
    });
    return {
      async generateContent(prompt) {
        const result = await model.generateContent(prompt);
        return result.response.text();
      },
    };
  }

  // No key configured at all
  return null;
}

import React from 'react';

const MEAL_ORDER = [
  ['breakfast', 'Breakfast', '🌅'],
  ['morningSnack', 'Mid-Morning Snack', '🥪'],
  ['lunch', 'Lunch', '🍽️'],
  ['eveningSnack', 'Evening Snack', '🍵'],
  ['dinner', 'Dinner', '🌙'],
];

function bmiColor(category) {
  switch (category) {
    case 'Normal': return 'text-emerald-300';
    case 'Underweight': return 'text-yellow-200';
    case 'Overweight': return 'text-orange-300';
    case 'Obese': return 'text-red-300';
    default: return 'text-white/70';
  }
}

export default function DietPlan({ data }) {
  const plan = data.dietPlan || {};
  const calories = data.dailyCalories || 0;
  const bmi = data.bmi || 0;
  const bmiCategory = data.bmiCategory || '';
  const foodsToAvoid = Array.isArray(plan.foodsToAvoid) ? plan.foodsToAvoid : [];

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-white/50">Daily calorie target</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-extrabold text-teal">{calories.toLocaleString()}</span>
            <span className="text-sm text-white/60">kcal/day</span>
          </div>
          <p className="text-xs text-white/50 mt-2">Calibrated from your weight, height, activity, and goals.</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-white/50">Body Mass Index</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-extrabold">{bmi}</span>
            <span className={`text-sm font-semibold ${bmiColor(bmiCategory)}`}>{bmiCategory}</span>
          </div>
          <p className="text-xs text-white/50 mt-2">Normal range: 18.5 – 24.9</p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3 text-lg">Your day, meal by meal</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {MEAL_ORDER.map(([key, title, emoji]) => {
            const meal = plan[key];
            if (!meal) return null;
            return (
              <div key={key} className="card p-5 hover:border-teal/30 transition">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/50">{emoji} {title}</p>
                    <h4 className="font-semibold mt-1">{meal.name || '—'}</h4>
                  </div>
                  {meal.calories ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-teal/10 text-teal border border-teal/20 shrink-0">
                      {meal.calories} kcal
                    </span>
                  ) : null}
                </div>
                {meal.description && (
                  <p className="text-sm text-white/70 mt-2 leading-relaxed">{meal.description}</p>
                )}
                {meal.nutrients && (
                  <p className="text-xs text-white/50 mt-3"><span className="text-white/40">Key nutrients:</span> {meal.nutrients}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {foodsToAvoid.length > 0 && (
        <div className="card p-5 bg-red-500/5 border-red-500/20">
          <h3 className="font-semibold flex items-center gap-2 text-red-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            Foods to avoid based on your report
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {foodsToAvoid.map((f, i) => (
              <li key={i} className="text-xs px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-200">{f}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {plan.hydration && (
          <div className="card p-5">
            <h3 className="font-semibold flex items-center gap-2 text-sky-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13z"/></svg>
              Hydration
            </h3>
            <p className="text-sm text-white/70 mt-2">{plan.hydration}</p>
          </div>
        )}
        {plan.weeklyTips && (
          <div className="card p-5">
            <h3 className="font-semibold flex items-center gap-2 text-teal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
              Weekly variety
            </h3>
            <p className="text-sm text-white/70 mt-2">{plan.weeklyTips}</p>
          </div>
        )}
      </div>

      <p className="text-xs text-white/40 text-center">
        Medical disclaimer: Not medical advice. Consult your doctor or a registered dietitian before changing your diet.
      </p>
    </div>
  );
}

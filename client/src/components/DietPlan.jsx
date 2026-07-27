import React from 'react';
import WeeklyDietPlan from './WeeklyDietPlan.jsx';

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
  if (data.weeklyDietPlan?.days?.length === 7) {
    return <WeeklyDietPlan plan={data.weeklyDietPlan} />;
  }
  const plan = data.dietPlan || {};
  const calories = data.dailyCalories || 0;
  const bmi = data.bmi || 0;
  const bmiCategory = data.bmiCategory || '';
  const foodsToAvoid = Array.isArray(plan.foodsToAvoid) ? plan.foodsToAvoid : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="card p-4 sm:p-5">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-white/50">Daily calorie target</p>
          {calories ? (
            <div className="flex items-baseline gap-1.5 sm:gap-2 mt-1">
              <span className="text-2xl sm:text-4xl font-extrabold text-teal">{calories.toLocaleString()}</span>
              <span className="text-xs sm:text-sm text-white/60">kcal</span>
            </div>
          ) : (
            <p className="text-white/50 text-sm mt-2">Add your weight &amp; height for a calorie target.</p>
          )}
          {calories ? <p className="text-[10px] sm:text-xs text-white/50 mt-1.5 sm:mt-2 hidden sm:block">Calibrated from your weight, height, activity, and goals.</p> : null}
        </div>
        <div className="card p-4 sm:p-5">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-white/50">Body Mass Index</p>
          {bmi ? (
            <div className="flex items-baseline gap-1.5 sm:gap-2 mt-1">
              <span className="text-2xl sm:text-4xl font-extrabold">{bmi}</span>
              <span className={`text-xs sm:text-sm font-semibold ${bmiColor(bmiCategory)}`}>{bmiCategory}</span>
            </div>
          ) : (
            <p className="text-white/50 text-sm mt-2">Add your weight &amp; height to calculate BMI.</p>
          )}
          {bmi ? <p className="text-[10px] sm:text-xs text-white/50 mt-1.5 sm:mt-2 hidden sm:block">Normal range: 18.5 – 24.9</p> : null}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3 text-base sm:text-lg">Your day, meal by meal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {MEAL_ORDER.map(([key, title, emoji]) => {
            const meal = plan[key];
            if (!meal) return null;
            return (
              <div key={key} className="card p-4 sm:p-5 hover:border-teal/30 transition">
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs uppercase tracking-wider text-white/50">{emoji} {title}</p>
                    <h4 className="font-semibold mt-1 text-sm sm:text-base truncate">{meal.name || '—'}</h4>
                  </div>
                  {meal.calories ? (
                    <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-teal/10 text-teal border border-teal/20 shrink-0">
                      {meal.calories} kcal
                    </span>
                  ) : null}
                </div>
                {meal.description && (
                  <p className="text-xs sm:text-sm text-white/70 mt-2 leading-relaxed">{meal.description}</p>
                )}
                {meal.nutrients && (
                  <p className="text-[10px] sm:text-xs text-white/50 mt-2 sm:mt-3"><span className="text-white/40">Key nutrients:</span> {meal.nutrients}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {foodsToAvoid.length > 0 && (
        <div className="card p-4 sm:p-5 bg-red-500/5 border-red-500/20">
          <h3 className="font-semibold flex items-center gap-2 text-red-200 text-sm sm:text-base">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            Foods to avoid
          </h3>
          <ul className="mt-2 sm:mt-3 flex flex-wrap gap-1.5 sm:gap-2">
            {foodsToAvoid.map((f, i) => (
              <li key={i} className="text-[10px] sm:text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-200">{f}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {plan.hydration && (
          <div className="card p-4 sm:p-5">
            <h3 className="font-semibold flex items-center gap-2 text-sky-200 text-sm sm:text-base">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13z"/></svg>
              Hydration
            </h3>
            <p className="text-xs sm:text-sm text-white/70 mt-2">{plan.hydration}</p>
          </div>
        )}
        {plan.weeklyTips && (
          <div className="card p-4 sm:p-5">
            <h3 className="font-semibold flex items-center gap-2 text-teal text-sm sm:text-base">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
              Weekly variety
            </h3>
            <p className="text-xs sm:text-sm text-white/70 mt-2">{plan.weeklyTips}</p>
          </div>
        )}
      </div>

      <p className="text-xs text-white/40 text-center">
        Medical disclaimer: Not medical advice. Consult your doctor or a registered dietitian before changing your diet.
      </p>
    </div>
  );
}

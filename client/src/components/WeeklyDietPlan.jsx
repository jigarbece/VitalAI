import React, { useState } from 'react';

export default function WeeklyDietPlan({ plan }) {
  const [dayIndex, setDayIndex] = useState(0);
  const [showGrocery, setShowGrocery] = useState(false);
  const day = plan.days[dayIndex];

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3">
      <Metric label="Daily calories" value={`${plan.dailyCalorieTarget} kcal`} />
      <Metric label="Protein target" value={`${plan.dailyProteinTarget} g`} />
      <Metric label="Water target" value={`${Math.round(plan.dailyWaterTargetMl / 100) / 10} L`} />
    </div>
    <div className="rounded-xl border border-blue-400/20 bg-blue-400/10 p-4 text-sm text-blue-200">
      Generated using our validated nutrition engine. Values are approximate.
    </div>
    <div className="flex gap-2 overflow-x-auto pb-1">
      {plan.days.map((item, index) => <button key={item.dayName} onClick={() => { setDayIndex(index); setShowGrocery(false); }} className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold ${dayIndex === index && !showGrocery ? 'bg-teal text-white' : 'border border-white/10 text-white/55'}`}>{item.dayName.slice(0, 3)}</button>)}
      <button onClick={() => setShowGrocery(true)} className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold ${showGrocery ? 'bg-teal text-white' : 'border border-white/10 text-white/55'}`}>Grocery list</button>
    </div>

    {showGrocery ? <div className="card p-5"><h3 className="text-xl font-bold">Weekly grocery list</h3><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{plan.groceryList.map((item) => <div key={item.name} className="flex justify-between rounded-xl border border-white/10 p-3 text-sm"><span>{item.name}</span><span className="text-white/45">{item.weeklyQuantity}</span></div>)}</div></div>
      : <><div className="card p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-300">Day {day.dayNumber}</p><h3 className="mt-1 text-2xl font-bold">{day.dayName}</h3></div><div className="flex flex-wrap gap-2 text-xs"><Tag>{day.totalCalories} kcal</Tag><Tag>{day.totalProtein}g protein</Tag><Tag>{day.totalFibre}g fibre</Tag></div></div></div>
        <div className="grid gap-4 lg:grid-cols-2">{day.meals.map((meal) => <article key={meal.slot} className="card p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-300">{meal.slot} · {meal.time}</p><h4 className="mt-1 text-lg font-bold">{meal.title}</h4></div><span className="text-xs text-white/40">{meal.items.reduce((sum, item) => sum + item.calories, 0)} kcal</span></div><div className="mt-4 space-y-3">{meal.items.map((item) => <div key={item.foodId} className="rounded-xl border border-white/10 bg-white/[.025] p-3"><div className="flex justify-between gap-3"><span className="font-semibold">{item.name}</span><span className="text-sm text-white/45">{item.quantity}{item.unit}</span></div><p className="mt-1 text-xs text-white/45">{item.householdMeasure} · {item.protein}g protein · {item.fibre}g fibre</p></div>)}</div></article>)}</div>
        <div className="card grid gap-4 p-5 sm:grid-cols-3"><Metric label="Vegetable servings" value={day.vegetableServings} /><Metric label="Fruit servings" value={day.fruitServings} /><Metric label="Activity" value={day.exerciseSuggestion} /></div></>}
  </div>;
}

function Metric({ label, value }) {
  return <div className="card p-4"><p className="text-xs uppercase tracking-wider text-white/40">{label}</p><p className="mt-1 text-lg font-bold text-blue-300">{value}</p></div>;
}
function Tag({ children }) {
  return <span className="rounded-full bg-blue-400/10 px-2.5 py-1 text-blue-200">{children}</span>;
}

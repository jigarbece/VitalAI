import React from 'react';

const DAYS = [
  ['monday', 'Monday'],
  ['tuesday', 'Tuesday'],
  ['wednesday', 'Wednesday'],
  ['thursday', 'Thursday'],
  ['friday', 'Friday'],
  ['saturday', 'Saturday'],
  ['sunday', 'Sunday'],
];

function typeColor(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('cardio')) return 'text-rose-300 bg-rose-500/10 border-rose-500/20';
  if (t.includes('strength')) return 'text-violet-300 bg-violet-500/10 border-violet-500/20';
  if (t.includes('flex') || t.includes('yoga')) return 'text-sky-300 bg-sky-500/10 border-sky-500/20';
  if (t.includes('rest')) return 'text-white/50 bg-white/5 border-white/15';
  return 'text-teal bg-teal/10 border-teal/20';
}

export default function ExercisePlan({ data }) {
  const plan = data.exercisePlan || {};

  return (
    <div className="space-y-6">
      {plan.specialNotes && (
        <div className="card p-4 sm:p-5 bg-amber-500/5 border-amber-500/30">
          <h3 className="font-semibold flex items-center gap-2 text-amber-200 text-sm sm:text-base">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Special notes for you
          </h3>
          <p className="text-xs sm:text-sm text-amber-100/90 mt-2">{plan.specialNotes}</p>
        </div>
      )}

      <div>
        <h3 className="font-semibold mb-3 text-base sm:text-lg">Weekly schedule</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {DAYS.map(([key, label]) => {
            const day = plan[key];
            if (!day) return null;
            const cls = typeColor(day.type);
            return (
              <div key={key} className="card p-4 sm:p-5 hover:border-teal/30 transition">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <p className="text-[10px] sm:text-xs uppercase tracking-wider text-white/50">{label}</p>
                  <span className={`text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full border ${cls}`}>{day.type || '—'}</span>
                </div>
                <p className="text-xs sm:text-sm text-white/80 leading-relaxed">{day.exercises || 'No exercises listed.'}</p>
                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-white/5 flex items-center justify-between text-[10px] sm:text-xs text-white/60">
                  <span>⏱ {day.duration || '—'}</span>
                  <span>Intensity: <span className="text-white/80">{day.intensity || '—'}</span></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {plan.warmup && (
          <div className="card p-4 sm:p-5">
            <h3 className="font-semibold flex items-center gap-2 text-teal text-sm sm:text-base">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M12 22a10 10 0 1 0-10-10"/><path d="M12 6v6l4 2"/></svg>
              Warm-up routine
            </h3>
            <p className="text-xs sm:text-sm text-white/70 mt-2">{plan.warmup}</p>
          </div>
        )}
        {plan.cooldown && (
          <div className="card p-4 sm:p-5">
            <h3 className="font-semibold flex items-center gap-2 text-sky-200 text-sm sm:text-base">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>
              Cool-down routine
            </h3>
            <p className="text-xs sm:text-sm text-white/70 mt-2">{plan.cooldown}</p>
          </div>
        )}
      </div>

      <p className="text-xs text-white/40 text-center">
        Medical disclaimer: Stop exercising and consult a doctor if you experience pain, dizziness, or shortness of breath.
      </p>
    </div>
  );
}

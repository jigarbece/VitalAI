import React, { useEffect, useState } from 'react';

const STEPS = [
  { label: 'Reading your blood report...', durationMs: 2000 },
  { label: 'Analyzing your biomarkers...', durationMs: 2000 },
  { label: 'Personalizing your health plan...', durationMs: 2000 },
  { label: 'Almost ready...', durationMs: 1000 },
];

export default function LoadingScreen() {
  const [stepIdx, setStepIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const totalMs = STEPS.reduce((a, s) => a + s.durationMs, 0);
    const start = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(95, (elapsed / totalMs) * 100);
      setProgress(pct);

      let acc = 0;
      for (let i = 0; i < STEPS.length; i++) {
        acc += STEPS[i].durationMs;
        if (elapsed < acc) {
          setStepIdx(i);
          return;
        }
      }
      setStepIdx(STEPS.length - 1);
    }, 80);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="animate-fade-in max-w-xl mx-auto text-center pt-10">
      <div className="relative w-28 h-28 mx-auto mb-8">
        <div className="absolute inset-0 rounded-full border-4 border-white/10" />
        <div
          className="absolute inset-0 rounded-full border-4 border-teal border-t-transparent animate-spin"
          style={{ animationDuration: '1.6s' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-teal">{Math.round(progress)}%</span>
        </div>
      </div>

      <h2 className="text-2xl font-bold">{STEPS[stepIdx].label}</h2>
      <p className="text-white/50 mt-2 text-sm">Hang tight — this normally takes 20-40 seconds.</p>

      <div className="mt-8 h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-teal to-teal-light transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ol className="mt-6 text-left space-y-1.5 text-sm">
        {STEPS.map((s, i) => (
          <li key={s.label} className={`flex items-center gap-2 ${i <= stepIdx ? 'text-white/90' : 'text-white/30'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${i < stepIdx ? 'bg-teal' : i === stepIdx ? 'bg-teal animate-pulse' : 'bg-white/20'}`} />
            {s.label}
          </li>
        ))}
      </ol>
    </section>
  );
}

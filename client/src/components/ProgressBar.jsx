import React from 'react';

export default function ProgressBar({ steps, current }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex-1 flex items-center gap-2" aria-current={active ? 'step' : undefined}>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition
                ${done ? 'bg-teal text-navy-900' : active ? 'bg-teal/20 text-teal border border-teal' : 'bg-white/5 text-white/40 border border-white/10'}`}
            >
              {done ? '✓' : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 rounded ${i < current ? 'bg-teal' : 'bg-white/10'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

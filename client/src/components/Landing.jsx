import React from 'react';
import StatsBadge from './StatsBadge.jsx';

const FEATURES = [
  {
    title: 'Blood Analysis',
    description: 'Upload a PDF or scan of your blood report and we surface every biomarker with normal-range context.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v6"/><path d="M12 22a7 7 0 0 0 7-7c0-4-7-13-7-13S5 11 5 15a7 7 0 0 0 7 7z"/></svg>
    ),
  },
  {
    title: 'Personalized Diet Plan',
    description: 'A meal-by-meal plan calibrated to your diet preference, BMI, and the deficiencies in your blood.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11h18"/><path d="M5 11a7 7 0 0 1 14 0"/><path d="M3 11v3a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4v-3"/></svg>
    ),
  },
  {
    title: 'Weekly Exercise Plan',
    description: 'A Monday-to-Sunday workout schedule with intensity tuned to your goals and any health flags.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4v16"/><path d="M18 4v16"/><path d="M3 8h3"/><path d="M3 16h3"/><path d="M18 8h3"/><path d="M18 16h3"/><path d="M6 12h12"/></svg>
    ),
  },
];

export default function Landing({ onStartReport, onStartQuick }) {
  return (
    <section className="animate-fade-in">
      <div className="text-center max-w-3xl mx-auto pt-8 pb-14">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal/10 border border-teal/30 text-teal text-xs font-semibold tracking-wide uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" /> AI-powered health analysis
        </span>
        <h1 className="mt-6 text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1]">
          Upload your blood report.
          <br />
          <span className="bg-gradient-to-r from-teal via-teal-light to-emerald-300 text-transparent bg-clip-text">
            Get your personalized health plan.
          </span>
        </h1>
        <p className="mt-4 sm:mt-6 text-white/70 text-base sm:text-lg leading-relaxed px-2 sm:px-0">
          VitalAI reads your lab values, weighs them against your profile, and returns a tailored
          diet and exercise plan in under a minute.
        </p>

        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 justify-center px-4 sm:px-0">
          <button onClick={onStartReport} className="btn-primary text-sm sm:text-base w-full sm:w-auto">
            Analyze My Report
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
          </button>
          <button onClick={onStartQuick} className="btn-ghost text-sm sm:text-base w-full sm:w-auto">
            Quick Plan — no report
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal/20 text-teal border border-teal/30">BMI</span>
          </button>
        </div>
        <p className="mt-3 text-xs text-white/40 px-4 sm:px-0">
          No account required. Quick Plan uses just your BMI &amp; goals — skip the upload.
        </p>

        <div className="mt-8 sm:mt-10 mb-4"><StatsBadge variant="hero" /></div>
      </div>

      <div id="how-it-works" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 pb-6 px-2 sm:px-0">
        {FEATURES.map((f) => (
          <div key={f.title} className="card p-6 hover:border-teal/30 transition group">
            <div className="w-11 h-11 rounded-xl bg-teal/10 text-teal border border-teal/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
              {f.icon}
            </div>
            <h3 className="text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-white/60 leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

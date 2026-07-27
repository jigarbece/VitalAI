import React from 'react';
import StatsBadge from './StatsBadge.jsx';

const FEATURES = [
  ['01', 'Decode your reports', 'See biomarkers, ranges, and important findings in language you can understand.'],
  ['02', 'Build your food plan', 'Get realistic meals shaped by your body, preferences, routine, and goals.'],
  ['03', 'Track what improves', 'Connect reports, nutrition, exercise, hydration, and progress over time.'],
];

export default function Landing({ onStartReport, onStartQuick, onDemo }) {
  return (
    <section className="animate-fade-in">
      <div className="relative isolate overflow-hidden rounded-[2.25rem] border border-blue-300/15 bg-gradient-to-br from-navy-100/95 via-navy-200/95 to-blue-950/40 shadow-[0_30px_90px_rgba(0,0,0,.30)]">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-700 via-sky-400 to-cyan-300" />
        <div className="absolute -right-32 -top-40 h-[30rem] w-[30rem] rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute -bottom-48 left-1/3 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative grid min-h-[610px] items-center gap-10 px-6 py-14 sm:px-10 lg:grid-cols-[1.08fr_.92fr] lg:px-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-400/10 px-3.5 py-2 text-xs font-bold tracking-wide text-blue-300">
              <span className="h-2 w-2 rounded-full bg-blue-600 shadow-[0_0_0_5px_rgba(37,99,235,.10)]" />
              YOUR PERSONAL HEALTH & NUTRITION COMPANION
            </div>

            <h1 className="mt-7 text-[2.75rem] font-extrabold leading-[1.02] tracking-[-.055em] text-white sm:text-6xl lg:text-[4.4rem]">
              From health reports
              <span className="block bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                to healthier days.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/65 sm:text-lg">
              Understand what your reports say, discover food that supports your goals,
              and follow a practical wellness plan made around you.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button onClick={onStartReport} className="btn-primary min-h-12 w-full px-7 sm:w-auto">
                Analyze my report <span aria-hidden="true">→</span>
              </button>
              <button onClick={onStartQuick} className="btn-ghost min-h-12 w-full px-7 sm:w-auto">
                Create a quick plan
              </button>
            </div>
            <button onClick={onDemo} className="mt-4 text-sm font-semibold text-blue-300 hover:text-blue-200">Explore with demo data →</button>

            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-white/50">
              {['Private & secure', 'No account required', 'Wellness guidance, not diagnosis'].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-blue-100 text-[9px] font-black text-blue-700">✓</span>{item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto h-[440px] w-full max-w-[470px]">
            <div className="absolute left-8 top-5 w-[82%] rotate-[-2deg] rounded-[1.8rem] border border-blue-300/15 bg-navy-100 p-6 shadow-[0_24px_70px_rgba(0,0,0,.28)] sm:left-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.2em] text-blue-500">Health report summary</p>
                  <h2 className="mt-1 text-xl font-bold text-white">Your wellness picture</h2>
                </div>
                <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-sky-400 text-xl font-black text-blue-50 shadow-lg shadow-blue-200">82</div>
              </div>
              <div className="mt-6 space-y-4">
                {[['Hemoglobin', '13.2 g/dL', '74%'], ['Vitamin D', '22 ng/mL', '45%'], ['Glucose', '92 mg/dL', '88%']].map(([name, value, width]) => (
                  <div key={name}>
                    <div className="mb-1.5 flex justify-between text-xs"><span className="font-semibold text-white/80">{name}</span><span className="text-white/50">{value}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400" style={{ width }} /></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute bottom-6 left-0 w-56 rounded-2xl border border-blue-300/15 bg-navy-100 p-4 shadow-[0_18px_45px_rgba(0,0,0,.25)]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Today’s nutrition</p>
              <p className="mt-2 font-bold text-white">Protein-rich lunch</p>
              <p className="mt-1 text-xs leading-5 text-white/55">Dal, greens, brown rice & fresh salad</p>
              <div className="mt-3 flex gap-2 text-[10px] font-bold text-blue-700"><span className="rounded-full bg-blue-50 px-2 py-1">520 kcal</span><span className="rounded-full bg-sky-50 px-2 py-1">24g protein</span></div>
            </div>

            <div className="absolute bottom-2 right-0 w-44 rounded-2xl bg-blue-700 p-4 text-blue-50 shadow-[0_18px_45px_rgba(29,78,216,.28)]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Next healthy step</p>
              <p className="mt-2 text-sm font-semibold leading-5 text-blue-50">25 minute walk after dinner</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20"><div className="h-full w-3/4 rounded-full bg-cyan-300" /></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8"><StatsBadge variant="hero" /></div>
      <div id="how-it-works" className="grid grid-cols-1 gap-5 py-12 md:grid-cols-3">
        {FEATURES.map(([number, title, description]) => (
          <article key={title} className="card group relative overflow-hidden p-7 transition duration-300 hover:-translate-y-1.5 hover:border-blue-300 hover:shadow-[0_24px_55px_rgba(37,99,235,.12)]">
            <span className="text-4xl font-black text-blue-100 transition group-hover:text-blue-200">{number}</span>
            <h2 className="mt-4 text-xl font-bold text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

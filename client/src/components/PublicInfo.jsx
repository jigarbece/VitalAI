import React, { useMemo, useState } from 'react';

const CONTENT = {
  faq: ['How does report analysis work?', 'VitalAI extracts report text, shows markers for confirmation, then combines confirmed context with deterministic calculations and AI explanations.',
    'Is this medical advice?', 'No. VitalAI supports wellness education and never replaces a qualified healthcare professional.',
    'Can I create a diet without a report?', 'Yes. Registered users can generate a complete seven-day plan from their health profile and preferences.'],
  privacy: ['Privacy policy', 'Your account data is stored in Supabase with row-level security. Reports and progress photos use private storage. Groq receives only information needed for plan generation. Passwords, tokens, private URLs, and photos are never sent to Groq.',
    'Your controls', 'You can export your information or permanently delete your account from Settings. Guest analysis recovery expires automatically.'],
  terms: ['Terms of use', 'Use VitalAI only for personal wellness education. Do not use it for diagnosis, emergency decisions, medication changes, or treatment.',
    'Accuracy', 'AI and extracted report values may be incorrect. Confirm extracted values and consult a qualified professional before acting.'],
  disclaimer: ['Medical disclaimer', 'VitalAI is not a medical device and does not diagnose, prescribe, or replace professional care.',
    'Urgent symptoms', 'For chest pain, severe breathing difficulty, fainting, stroke-like symptoms, severe allergic reaction, or other emergencies, seek immediate local emergency care.'],
  features: ['Complete health workspace', 'Track health profiles, measurements, reports, confirmed laboratory values, goals, nutrition plans, exercise guidance, check-ins, photos, and trends in one private account.',
    'Safe personalization', 'Deterministic calculations and safety rules run before AI assistance. Weekly plans still work through the standard nutrition engine when Groq is unavailable.'],
  how: ['How VitalAI works', 'Create your health setup, add a report or generate without one, review the personalized seven-day plan, then record progress and update your goals.',
    'You stay in control', 'Extracted values require confirmation. Plans are versioned, private, downloadable, and can be archived or restored.'],
  about: ['About VitalAI', 'VitalAI is a wellness product created by Jigar Pandya to make health reports and practical nutrition easier to understand.',
    'Our approach', 'We combine transparent calculations, validated food data, private user records, and carefully bounded AI assistance.'],
  sample: ['Sample weekly plan', 'A typical day includes a balanced breakfast, pulse-and-grain lunch, practical snack, lighter protein-focused dinner, hydration target, substitutions, and an activity suggestion.',
    'Personal plans differ', 'Quantities, calories, allergies, regional foods, cooking time, budget, and goals are adjusted using your saved Health Setup.'],
  contact: ['Contact VitalAI', 'For product support, privacy questions, or feedback, email curiolightforyou@gmail.com.',
    'Medical questions', 'VitalAI support cannot provide diagnosis or emergency care. Contact a qualified healthcare professional for medical concerns.'],
};

export default function PublicInfo({ page, onBack }) {
  if (page === 'bmi') return <BmiCalculator onBack={onBack} />;
  const items = CONTENT[page] || CONTENT.faq;
  return <section className="mx-auto max-w-3xl animate-fade-in">
    <button onClick={onBack} className="btn-ghost mb-6">← Back</button>
    <div className="card p-6 sm:p-9">{items.map((item, index) => index % 2 === 0
      ? <h1 key={item} className={`${index ? 'mt-8 text-xl' : 'text-3xl'} font-bold`}>{item}</h1>
      : <p key={`${index}-${item}`} className="mt-3 leading-7 text-white/60">{item}</p>)}</div>
  </section>;
}

function BmiCalculator({ onBack }) {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const result = useMemo(() => {
    const metres = Number(height) / 100;
    if (!(metres > 0 && Number(weight) > 0)) return null;
    const bmi = Math.round((Number(weight) / (metres ** 2)) * 10) / 10;
    const category = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy range' : bmi < 30 ? 'Overweight' : 'High BMI';
    return { bmi, category, min: Math.round(18.5 * metres ** 2 * 10) / 10, max: Math.round(24.9 * metres ** 2 * 10) / 10 };
  }, [height, weight]);
  return <section className="mx-auto max-w-3xl animate-fade-in">
    <button onClick={onBack} className="btn-ghost mb-6">← Back</button>
    <div className="card p-6 sm:p-9"><p className="text-sm font-bold uppercase tracking-wider text-blue-300">Free wellness tool</p><h1 className="mt-2 text-3xl font-bold">BMI calculator</h1><p className="mt-2 text-white/55">A screening estimate, not a diagnosis.</p>
      <div className="mt-7 grid gap-4 sm:grid-cols-2"><div><label className="label" htmlFor="public-height">Height (cm)</label><input id="public-height" className="input" type="number" value={height} onChange={(event) => setHeight(event.target.value)} /></div><div><label className="label" htmlFor="public-weight">Weight (kg)</label><input id="public-weight" className="input" type="number" value={weight} onChange={(event) => setWeight(event.target.value)} /></div></div>
      {result && <div className="mt-6 rounded-2xl border border-blue-400/20 bg-blue-400/10 p-5"><p className="text-sm text-blue-200">Estimated BMI</p><p className="mt-1 text-4xl font-black">{result.bmi}</p><p className="mt-2 text-white/65">{result.category} · estimated healthy-weight range {result.min}–{result.max} kg</p></div>}
    </div>
  </section>;
}

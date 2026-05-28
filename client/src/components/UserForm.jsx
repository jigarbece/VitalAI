import React, { useState } from 'react';

const DIETS = ['Vegetarian', 'Non-Vegetarian', 'Eggetarian (Veg + Eggs)', 'Vegan'];
const ACTIVITY_LEVELS = [
  'Sedentary (desk job, no exercise)',
  'Lightly Active (1-3 days/week)',
  'Moderately Active (3-5 days/week)',
  'Very Active (6-7 days/week)',
];
const GENDERS = ['Male', 'Female', 'Other'];
const GOALS = [
  'Lose Weight',
  'Gain Muscle',
  'Improve Energy',
  'Control Blood Sugar',
  'Improve Heart Health',
  'General Wellness',
];

export function validateUserProfile(profile) {
  const errors = {};
  if (!profile.name || !profile.name.trim()) errors.name = 'Name is required';

  const age = Number(profile.age);
  if (!profile.age) errors.age = 'Age is required';
  else if (isNaN(age) || age < 5 || age > 120) errors.age = 'Age must be between 5 and 120';

  // Weight is required
  if (!profile.weight) errors.weight = 'Weight is required';
  else {
    const weight = Number(profile.weight);
    if (isNaN(weight) || weight < 20 || weight > 400) errors.weight = 'Weight must be between 20 and 400 kg';
  }

  // Height is optional — only validate range if provided
  if (profile.height) {
    const height = Number(profile.height);
    if (isNaN(height) || height < 80 || height > 250) errors.height = 'Height must be between 80 and 250 cm';
  }

  return errors;
}

const DEFAULT_PROFILE = {
  name: '',
  age: '',
  gender: '',
  weight: '',
  height: '',
  diet: '',
  activity: '',
  goals: [],
  conditions: '',
};

export default function UserForm({
  initial,
  onSubmit,
  onBack,
  title = 'Step 2 · Tell us about you',
  subtitle = 'A few details help us tailor the plan to your body and goals.',
  submitLabel = 'Analyze Now',
}) {
  const [profile, setProfile] = useState({ ...DEFAULT_PROFILE, ...(initial || {}) });
  const [errors, setErrors] = useState({});

  const update = (key, value) => {
    setProfile((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const toggleGoal = (goal) => {
    setProfile((p) => {
      const goals = p.goals.includes(goal) ? p.goals.filter((g) => g !== goal) : [...p.goals, goal];
      return { ...p, goals };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validateUserProfile(profile);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    onSubmit(profile);
  };

  return (
    <section className="animate-fade-in max-w-3xl mx-auto">
      <div className="mb-5 sm:mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold">{title}</h2>
        <p className="text-white/60 mt-1.5 sm:mt-2 text-sm sm:text-base">{subtitle}</p>
        <p className="text-white/40 text-xs mt-1">Fields marked <span className="text-teal">*</span> are required. Everything else is optional — more details = better plan.</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-7" noValidate>
        <div>
          <label htmlFor="name" className="label">Full name <span className="text-teal">*</span></label>
          <input
            id="name" type="text" maxLength="100"
            value={profile.name}
            onChange={(e) => update('name', e.target.value)}
            className="input" placeholder="e.g. Jigar Pandya"
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-red-300 text-xs mt-1">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <div>
            <label htmlFor="age" className="label">Age <span className="text-teal">*</span></label>
            <input
              id="age" type="number" inputMode="numeric" min="5" max="120"
              value={profile.age}
              onChange={(e) => update('age', e.target.value)}
              className="input" placeholder="e.g. 32"
              aria-invalid={!!errors.age}
            />
            {errors.age && <p className="text-red-300 text-xs mt-1">{errors.age}</p>}
          </div>

          <div>
            <label className="label">Gender <span className="text-white/40 font-normal text-xs">· optional</span></label>
            <div className="flex gap-2">
              {GENDERS.map((g) => (
                <label key={g} className={`flex-1 cursor-pointer px-3 py-2 rounded-xl text-center text-sm border transition
                  ${profile.gender === g ? 'bg-teal/15 border-teal text-white' : 'bg-navy-200 border-white/10 text-white/70 hover:border-white/20'}`}>
                  <input
                    type="radio" name="gender" value={g}
                    className="sr-only"
                    checked={profile.gender === g}
                    onChange={() => update('gender', g)}
                  />
                  {g}
                </label>
              ))}
            </div>
            {errors.gender && <p className="text-red-300 text-xs mt-1">{errors.gender}</p>}
          </div>

          <div>
            <label htmlFor="weight" className="label">Weight (kg) <span className="text-teal">*</span></label>
            <input
              id="weight" type="number" inputMode="decimal" min="20" max="400" step="0.1"
              value={profile.weight}
              onChange={(e) => update('weight', e.target.value)}
              className="input" placeholder="e.g. 72"
              aria-invalid={!!errors.weight}
            />
            {errors.weight && <p className="text-red-300 text-xs mt-1">{errors.weight}</p>}
          </div>

          <div>
            <label htmlFor="height" className="label">Height (cm) <span className="text-white/40 font-normal text-xs">· optional, default 155</span></label>
            <input
              id="height" type="number" inputMode="numeric" min="80" max="250"
              value={profile.height}
              onChange={(e) => update('height', e.target.value)}
              className="input" placeholder="e.g. 175 (default: 155)"
              aria-invalid={!!errors.height}
            />
            {errors.height && <p className="text-red-300 text-xs mt-1">{errors.height}</p>}
          </div>
        </div>

        <div>
          <label className="label">Diet preference <span className="text-white/40 font-normal text-xs">· optional</span></label>
          <div className="grid grid-cols-2 gap-2">
            {DIETS.map((d) => (
              <label key={d} className={`cursor-pointer px-4 py-2.5 rounded-xl text-sm border flex items-center gap-2 transition
                ${profile.diet === d ? 'bg-teal/15 border-teal' : 'bg-navy-200 border-white/10 hover:border-white/20'}`}>
                <input type="radio" name="diet" className="sr-only"
                  checked={profile.diet === d}
                  onChange={() => update('diet', d)}
                />
                <span className={`w-2.5 h-2.5 rounded-full border ${profile.diet === d ? 'bg-teal border-teal' : 'border-white/30'}`} />
                {d}
              </label>
            ))}
          </div>
          {errors.diet && <p className="text-red-300 text-xs mt-1">{errors.diet}</p>}
        </div>

        <div>
          <label htmlFor="activity" className="label">Activity level <span className="text-white/40 font-normal text-xs">· optional</span></label>
          <select
            id="activity"
            value={profile.activity}
            onChange={(e) => update('activity', e.target.value)}
            className="input"
          >
            <option value="">Select your activity level</option>
            {ACTIVITY_LEVELS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          {errors.activity && <p className="text-red-300 text-xs mt-1">{errors.activity}</p>}
        </div>

        <div>
          <label className="label">Health goals <span className="text-white/40 font-normal">· select all that apply</span></label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {GOALS.map((g) => {
              const active = profile.goals.includes(g);
              return (
                <label key={g} className={`cursor-pointer px-3 py-2 rounded-xl text-sm border text-center transition
                  ${active ? 'bg-teal/15 border-teal text-white' : 'bg-navy-200 border-white/10 text-white/70 hover:border-white/20'}`}>
                  <input type="checkbox" className="sr-only" checked={active} onChange={() => toggleGoal(g)} />
                  {g}
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="conditions" className="label">Known conditions <span className="text-white/40 font-normal">· optional</span></label>
          <textarea
            id="conditions" rows="3"
            value={profile.conditions}
            onChange={(e) => update('conditions', e.target.value)}
            className="input resize-none"
            placeholder="e.g. type 2 diabetes, mild hypertension, hypothyroidism"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pt-4 border-t border-white/5">
          <button type="button" onClick={onBack} className="btn-ghost w-full sm:w-auto">← Back</button>
          <button type="submit" className="btn-primary w-full sm:w-auto">
            {submitLabel}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </form>
    </section>
  );
}

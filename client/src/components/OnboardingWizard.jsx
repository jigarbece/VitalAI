import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase.js';

const STEPS = ['Body', 'Routine', 'Food', 'Goal'];
const DIETS = ['Vegetarian', 'Vegan', 'Eggetarian', 'Non-Vegetarian', 'Jain', 'Pescatarian', 'No preference'];
const REGIONS = ['Gujarati', 'Punjabi', 'South Indian', 'North Indian', 'Maharashtrian', 'Rajasthani', 'Bengali', 'Mediterranean', 'Continental'];
const ALLERGIES = ['Milk', 'Gluten', 'Nuts', 'Egg', 'Soy', 'Seafood'];

export default function OnboardingWizard({ session, initial = {}, onComplete, showToast }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    date_of_birth: '', gender: '', height_cm: '', current_weight_kg: '', waist_cm: '',
    activity_level: '', occupation_type: '', work_hours: '', wake_time: '07:00', bedtime: '23:00',
    diet_type: '', region: '', allergies: [], dislikes: '', cooking_time: '30', budget: 'Moderate',
    target_weight: '', target_date: '', goal_type: 'Weight maintenance', conditions: '',
    ...initial,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from('health_profiles').select('*').eq('user_id', session.user.id).maybeSingle()
      .then(({ data: saved, error }) => {
        if (error) showToast(`Could not load Health Setup: ${error.message}`, 'error', 7000);
        if (saved) {
          setData((current) => ({
            ...current,
            ...saved,
            conditions: Array.isArray(saved.conditions) ? saved.conditions.join(', ') : (saved.conditions || ''),
            dislikes: saved.preferences?.dislikes?.join(', ') || '',
            cooking_time: saved.preferences?.cookingTimeMinutes || current.cooking_time,
            budget: saved.preferences?.budget || current.budget,
          }));
        }
      })
      .finally(() => setLoading(false));
  }, [session?.user?.id, showToast]);

  const estimates = useMemo(() => {
    const weight = Number(data.current_weight_kg);
    const height = Number(data.height_cm);
    if (!(weight > 0 && height > 0)) return null;
    const bmi = Math.round((weight / ((height / 100) ** 2)) * 10) / 10;
    const age = data.date_of_birth ? Math.floor((Date.now() - new Date(data.date_of_birth)) / 31557600000) : 30;
    const offset = data.gender === 'Male' ? 5 : data.gender === 'Female' ? -161 : -78;
    const bmr = Math.round(10 * weight + 6.25 * height - 5 * age + offset);
    const activity = { Sedentary: 1.2, Light: 1.375, Moderate: 1.55, Active: 1.725 }[data.activity_level] || 1.375;
    return {
      bmi,
      bmr,
      tdee: Math.round(bmr * activity),
      healthyMin: Math.round(18.5 * ((height / 100) ** 2) * 10) / 10,
      healthyMax: Math.round(24.9 * ((height / 100) ** 2) * 10) / 10,
      protein: Math.round(weight * 1.2),
      water: Math.round(weight * 35),
    };
  }, [data]);

  const goalSafety = useMemo(() => {
    const current = Number(data.current_weight_kg);
    const target = Number(data.target_weight);
    const date = new Date(data.target_date);
    if (!target || Number.isNaN(date.getTime()) || date <= new Date()) return null;
    const weeks = (date - new Date()) / 604800000;
    const weekly = Math.abs(target - current) / weeks;
    return weekly > 1
      ? { safe: false, text: `About ${weekly.toFixed(1)} kg/week is aggressive. Choose a later date or a smaller first milestone.` }
      : { safe: true, text: `Estimated ${weekly.toFixed(2)} kg/week, within a generally realistic range.` };
  }, [data.target_weight, data.target_date, data.current_weight_kg]);

  const toggleAllergy = (item) => setData((current) => ({
    ...current,
    allergies: current.allergies.includes(item) ? current.allergies.filter((value) => value !== item) : [...current.allergies, item],
  }));

  const save = async () => {
    if (goalSafety && !goalSafety.safe) return showToast('Please choose a safer goal before continuing.', 'error');
    setSaving(true);
    const userId = session.user.id;
    const healthResult = await supabase.from('health_profiles').upsert({
      user_id: userId,
      date_of_birth: data.date_of_birth || null,
      gender: data.gender || null,
      height_cm: Number(data.height_cm) || null,
      current_weight_kg: Number(data.current_weight_kg) || null,
      waist_cm: Number(data.waist_cm) || null,
      activity_level: data.activity_level || null,
      occupation_type: data.occupation_type || null,
      work_hours: Number(data.work_hours) || null,
      wake_time: data.wake_time || null,
      bedtime: data.bedtime || null,
      diet_type: data.diet_type || null,
      region: data.region || null,
      conditions: data.conditions ? data.conditions.split(',').map((value) => value.trim()).filter(Boolean) : [],
      allergies: data.allergies,
      preferences: {
        dislikes: data.dislikes.split(',').map((value) => value.trim()).filter(Boolean),
        cookingTimeMinutes: Number(data.cooking_time),
        budget: data.budget,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }).select('user_id').single();
    let goalResult = { error: null };
    if (data.target_weight && data.target_date) {
      goalResult = await supabase.from('user_goals').insert({
        user_id: userId,
        goal_type: data.goal_type,
        target_weight_kg: Number(data.target_weight),
        target_date: data.target_date,
        safety_result: goalSafety || {},
      });
    }
    setSaving(false);
    if (healthResult.error || goalResult.error) {
      const message = healthResult.error?.message || goalResult.error?.message;
      return showToast(`Could not save Health Setup: ${message}`, 'error', 8000);
    }
    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Health Setup updated',
      message: 'Your saved health and food details will be used for future plans.',
      type: 'profile',
    });
    showToast('Health setup completed', 'success');
    onComplete?.();
  };

  if (loading) return <section className="mx-auto max-w-4xl"><div className="card p-8 text-center text-white/60">Loading your saved Health Setup…</div></section>;

  return <section className="mx-auto max-w-4xl animate-fade-in">
    <div className="mb-7"><p className="text-sm font-bold uppercase tracking-[.18em] text-blue-300">Personal health setup</p><h1 className="mt-1 text-3xl font-extrabold">Build your wellness profile</h1><p className="mt-2 text-white/55">These estimates guide your plans. They are not medical diagnoses.</p></div>
    <div className="mb-6 grid grid-cols-4 gap-2">{STEPS.map((label, index) => <div key={label}><div className={`h-1.5 rounded-full ${index <= step ? 'bg-teal' : 'bg-white/10'}`} /><p className={`mt-2 text-center text-xs ${index === step ? 'text-blue-300' : 'text-white/35'}`}>{label}</p></div>)}</div>

    <div className="card p-5 sm:p-7">
      {step === 0 && <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Date of birth" type="date" value={data.date_of_birth} onChange={(value) => setData({ ...data, date_of_birth: value })} />
        <Select label="Gender" value={data.gender} values={['Male', 'Female', 'Prefer not to say']} onChange={(value) => setData({ ...data, gender: value })} />
        <Input label="Height (cm)" type="number" value={data.height_cm} onChange={(value) => setData({ ...data, height_cm: value })} />
        <Input label="Current weight (kg)" type="number" step="0.1" value={data.current_weight_kg} onChange={(value) => setData({ ...data, current_weight_kg: value })} />
        <Input label="Waist (cm)" type="number" step="0.1" value={data.waist_cm} onChange={(value) => setData({ ...data, waist_cm: value })} />
        <Select label="Activity level" value={data.activity_level} values={['Sedentary', 'Light', 'Moderate', 'Active']} onChange={(value) => setData({ ...data, activity_level: value })} />
        {estimates && <div className="sm:col-span-2 grid grid-cols-2 gap-3 lg:grid-cols-4">{[
          ['BMI', estimates.bmi], ['BMR estimate', `${estimates.bmr} kcal`], ['TDEE estimate', `${estimates.tdee} kcal`], ['Healthy range', `${estimates.healthyMin}–${estimates.healthyMax} kg`],
          ['Protein guide', `${estimates.protein} g`], ['Water guide', `${estimates.water} ml`],
        ].map(([label, value]) => <div key={label} className="hero-metric rounded-xl p-3"><p className="text-xs text-white/40">{label}</p><p className="mt-1 font-bold">{value}</p></div>)}</div>}
      </div>}

      {step === 1 && <div className="grid gap-5 sm:grid-cols-2">
        <Select label="Occupation type" value={data.occupation_type} values={['Desk job', 'Standing job', 'Physical work', 'Shift work', 'Retired']} onChange={(value) => setData({ ...data, occupation_type: value })} />
        <Input label="Working hours/day" type="number" value={data.work_hours} onChange={(value) => setData({ ...data, work_hours: value })} />
        <Input label="Wake-up time" type="time" value={data.wake_time} onChange={(value) => setData({ ...data, wake_time: value })} />
        <Input label="Bedtime" type="time" value={data.bedtime} onChange={(value) => setData({ ...data, bedtime: value })} />
        <Input label="Known conditions (comma separated)" value={data.conditions} onChange={(value) => setData({ ...data, conditions: value })} />
      </div>}

      {step === 2 && <div className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Select label="Diet preference" value={data.diet_type} values={DIETS} onChange={(value) => setData({ ...data, diet_type: value })} />
          <Select label="Regional food preference" value={data.region} values={REGIONS} onChange={(value) => setData({ ...data, region: value })} />
          <Input label="Disliked foods (comma separated)" value={data.dislikes} onChange={(value) => setData({ ...data, dislikes: value })} />
          <Select label="Food budget" value={data.budget} values={['Affordable', 'Moderate', 'Flexible']} onChange={(value) => setData({ ...data, budget: value })} />
          <Input label="Available cooking time (minutes)" type="number" value={data.cooking_time} onChange={(value) => setData({ ...data, cooking_time: value })} />
        </div>
        <div><p className="label">Allergies and intolerances</p><div className="flex flex-wrap gap-2">{ALLERGIES.map((item) => <button type="button" key={item} onClick={() => toggleAllergy(item)} className={`rounded-xl border px-3 py-2 text-sm ${data.allergies.includes(item) ? 'border-red-400/50 bg-red-400/10 text-red-200' : 'border-white/10 text-white/55'}`}>{item}</button>)}</div></div>
      </div>}

      {step === 3 && <div className="grid gap-5 sm:grid-cols-2">
        <Select label="Primary goal" value={data.goal_type} values={['Weight loss', 'Weight gain', 'Weight maintenance', 'Muscle gain', 'Better energy', 'Improved fitness']} onChange={(value) => setData({ ...data, goal_type: value })} />
        <Input label="Target weight (kg)" type="number" step="0.1" value={data.target_weight} onChange={(value) => setData({ ...data, target_weight: value })} />
        <Input label="Target date" type="date" value={data.target_date} onChange={(value) => setData({ ...data, target_date: value })} />
        {goalSafety && <div className={`rounded-xl border p-4 text-sm ${goalSafety.safe ? 'border-blue-400/25 bg-blue-400/10 text-blue-200' : 'border-red-400/30 bg-red-400/10 text-red-200'}`}>{goalSafety.text}</div>}
      </div>}

      <div className="mt-8 flex justify-between border-t border-white/10 pt-5">
        <button type="button" className="btn-ghost" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>Back</button>
        {step < STEPS.length - 1 ? <button type="button" className="btn-primary" onClick={() => setStep((value) => value + 1)}>Continue</button>
          : <button type="button" className="btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Complete setup'}</button>}
      </div>
    </div>
  </section>;
}

function Input({ label, onChange, ...props }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return <div><label className="label" htmlFor={id}>{label}</label><input id={id} className="input" onChange={(event) => onChange(event.target.value)} {...props} /></div>;
}
function Select({ label, value, values, onChange }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return <div><label className="label" htmlFor={id}>{label}</label><select id={id} className="input" value={value} onChange={(event) => onChange(event.target.value)}><option value="">Select</option>{values.map((item) => <option key={item}>{item}</option>)}</select></div>;
}

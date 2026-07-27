import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { supabase } from '../supabase.js';

const emptyProfile = { full_name: '', country: '', timezone: '' };
const emptyHealth = { current_weight_kg: '', height_cm: '', diet_type: '', activity_level: '' };

export default function UserDashboard({ session, view, onAnalyze, onOpenPlan, showToast }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(emptyProfile);
  const [health, setHealth] = useState(emptyHealth);
  const [metrics, setMetrics] = useState([]);
  const [goals, setGoals] = useState([]);
  const [reports, setReports] = useState([]);
  const [reportValues, setReportValues] = useState([]);
  const [plans, setPlans] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [photoUrls, setPhotoUrls] = useState({});
  const [photoForm, setPhotoForm] = useState({ file: null, weight: '', notes: '' });
  const [notifications, setNotifications] = useState([]);
  const [checkin, setCheckin] = useState({ weight: '', water: '', sleep: '', steps: '', mood: 'Good' });
  const [metricForm, setMetricForm] = useState({ type: 'weight', value: '', unit: 'kg', measured_at: new Date().toISOString().slice(0, 10), reference_range: '', notes: '' });
  const [goalForm, setGoalForm] = useState({ goal_type: 'Weight loss', target_weight_kg: '', target_date: '' });
  const [foodForm, setFoodForm] = useState({ diet_type: '', region: '', allergies: '', dislikes: '', budget: 'Moderate', cooking_time: '30' });

  const load = async () => {
    if (!session?.user) return;
    setLoading(true);
    const userId = session.user.id;
    const [profileRes, healthRes, metricsRes, goalsRes, reportsRes, valuesRes, plansRes, checkinsRes, photosRes, notificationsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('health_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('health_metrics').select('*').eq('user_id', userId).order('measured_at', { ascending: true }).limit(90),
      supabase.from('user_goals').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      supabase.from('uploaded_reports').select('*').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false }).limit(20),
      supabase.from('extracted_report_values').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(200),
      supabase.from('diet_plan_versions').select('*').eq('user_id', userId).is('archived_at', null).order('version', { ascending: false }).limit(20),
      supabase.from('daily_checkins').select('*').eq('user_id', userId).order('checkin_date', { ascending: false }).limit(30),
      supabase.from('progress_photos').select('*').eq('user_id', userId).order('captured_on', { ascending: false }).limit(30),
      supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    ]);
    setProfile({ ...emptyProfile, ...(profileRes.data || {}) });
    setHealth({ ...emptyHealth, ...(healthRes.data || {}) });
    setMetrics(metricsRes.data || []);
    setGoals(goalsRes.data || []);
    setReports(reportsRes.data || []);
    setReportValues(valuesRes.data || []);
    setPlans(plansRes.data || []);
    setCheckins(checkinsRes.data || []);
    setPhotos(photosRes.data || []);
    setNotifications(notificationsRes.data || []);
    if (healthRes.data) {
      setFoodForm({
        diet_type: healthRes.data.diet_type || '',
        region: healthRes.data.region || '',
        allergies: (healthRes.data.allergies || []).join(', '),
        dislikes: (healthRes.data.preferences?.dislikes || []).join(', '),
        budget: healthRes.data.preferences?.budget || 'Moderate',
        cooking_time: String(healthRes.data.preferences?.cookingTimeMinutes || 30),
      });
    }
    const signed = await Promise.all((photosRes.data || []).map(async (photo) => {
      const response = await supabase.storage.from('progress-photos').createSignedUrl(photo.storage_path, 3600);
      return [photo.id, response.data?.signedUrl || ''];
    }));
    setPhotoUrls(Object.fromEntries(signed));
    setLoading(false);
  };

  useEffect(() => { load(); }, [session?.user?.id]);

  const weightData = useMemo(() => metrics
    .filter((item) => item.metric_type === 'weight')
    .map((item) => ({
      date: new Date(item.measured_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: Number(item.value),
    })), [metrics]);

  const activePlan = plans.find((plan) => plan.active) || plans[0];
  const latestCheckin = checkins[0]?.data || {};
  const displayName = profile.full_name || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'there';

  const saveMetric = async (event) => {
    event.preventDefault();
    if (!Number.isFinite(Number(metricForm.value))) return showToast('Enter a valid metric value', 'error');
    const saved = await supabase.from('health_metrics').insert({
      user_id: session.user.id,
      metric_type: metricForm.type.trim().toLowerCase(),
      value: Number(metricForm.value),
      unit: metricForm.unit.trim(),
      measured_at: new Date(`${metricForm.measured_at}T12:00:00`).toISOString(),
      reference_range: metricForm.reference_range || null,
      notes: metricForm.notes || null,
      source: 'manual',
    });
    if (saved.error) return showToast(saved.error.message, 'error');
    showToast('Health metric saved', 'success');
    setMetricForm({ ...metricForm, value: '', reference_range: '', notes: '' });
    load();
  };

  const saveGoal = async (event) => {
    event.preventDefault();
    const saved = await supabase.from('user_goals').insert({
      user_id: session.user.id,
      goal_type: goalForm.goal_type,
      target_weight_kg: Number(goalForm.target_weight_kg) || null,
      target_date: goalForm.target_date || null,
      safety_result: {},
    });
    if (saved.error) return showToast(saved.error.message, 'error');
    showToast('Goal saved', 'success');
    load();
  };

  const saveFoodPreferences = async (event) => {
    event.preventDefault();
    const saved = await supabase.from('health_profiles').upsert({
      user_id: session.user.id,
      diet_type: foodForm.diet_type || null,
      region: foodForm.region || null,
      allergies: foodForm.allergies.split(',').map((item) => item.trim()).filter(Boolean),
      preferences: {
        ...(health.preferences || {}),
        dislikes: foodForm.dislikes.split(',').map((item) => item.trim()).filter(Boolean),
        budget: foodForm.budget,
        cookingTimeMinutes: Number(foodForm.cooking_time) || 30,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (saved.error) return showToast(saved.error.message, 'error');
    showToast('Food preferences saved', 'success');
    load();
  };

  const activatePlan = async (plan) => {
    const disabled = await supabase.from('diet_plan_versions').update({ active: false }).eq('user_id', session.user.id);
    if (disabled.error) return showToast(disabled.error.message, 'error');
    const activated = await supabase.from('diet_plan_versions').update({ active: true }).eq('id', plan.id);
    if (activated.error) return showToast(activated.error.message, 'error');
    showToast(`Plan version ${plan.version} is active`, 'success');
    load();
  };

  const archivePlan = async (plan) => {
    if (!window.confirm(`Archive plan version ${plan.version}?`)) return;
    const result = await supabase.from('diet_plan_versions').update({ archived_at: new Date().toISOString(), active: false }).eq('id', plan.id);
    if (result.error) return showToast(result.error.message, 'error');
    showToast('Plan archived', 'success');
    load();
  };

  const ratePlan = async (plan, rating) => {
    const result = await supabase.from('diet_plan_versions').update({ rating }).eq('id', plan.id);
    if (result.error) return showToast(result.error.message, 'error');
    showToast('Plan rating saved', 'success');
    load();
  };

  const saveCheckin = async (event) => {
    event.preventDefault();
    const today = new Date().toISOString().slice(0, 10);
    const data = {
      weight: Number(checkin.weight) || null,
      water: Number(checkin.water) || null,
      sleep: Number(checkin.sleep) || null,
      steps: Number(checkin.steps) || null,
      mood: checkin.mood,
    };
    const saved = await supabase.from('daily_checkins').upsert({
      user_id: session.user.id,
      checkin_date: today,
      data,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,checkin_date' });
    if (saved.error) return showToast(saved.error.message, 'error');
    if (data.weight) {
      await supabase.from('health_metrics').insert({
        user_id: session.user.id,
        metric_type: 'weight',
        value: data.weight,
        unit: 'kg',
        measured_at: new Date().toISOString(),
        source: 'daily-checkin',
      });
    }
    showToast('Daily check-in saved', 'success');
    setCheckin({ weight: '', water: '', sleep: '', steps: '', mood: 'Good' });
    load();
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    const userId = session.user.id;
    const profileResult = await supabase.from('profiles').update({
      full_name: profile.full_name,
      country: profile.country || null,
      timezone: profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      updated_at: new Date().toISOString(),
    }).eq('id', userId);
    const healthResult = await supabase.from('health_profiles').upsert({
      user_id: userId,
      current_weight_kg: Number(health.current_weight_kg) || null,
      height_cm: Number(health.height_cm) || null,
      diet_type: health.diet_type || null,
      activity_level: health.activity_level || null,
      updated_at: new Date().toISOString(),
    });
    if (profileResult.error || healthResult.error) return showToast('Could not save profile', 'error');
    showToast('Profile updated', 'success');
  };

  const confirmReportValue = async (item) => {
    const result = await supabase.from('extracted_report_values').update({
      confirmed: true,
      confirmed_at: new Date().toISOString(),
    }).eq('id', item.id);
    if (result.error) return showToast(result.error.message, 'error');
    showToast(`${item.metric_type} confirmed`, 'success');
    load();
  };

  const openReport = async (report) => {
    const result = await supabase.storage.from('health-reports').createSignedUrl(report.storage_path, 60);
    if (result.error) return showToast(result.error.message, 'error');
    window.open(result.data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const deleteReport = async (report) => {
    const result = await supabase.from('uploaded_reports').update({ deleted_at: new Date().toISOString() }).eq('id', report.id);
    if (result.error) return showToast(result.error.message, 'error');
    showToast('Report removed from your timeline', 'success');
    load();
  };

  const uploadPhoto = async (event) => {
    event.preventDefault();
    if (!photoForm.file) return showToast('Choose a photo first', 'error');
    if (!photoForm.file.type.startsWith('image/') || photoForm.file.size > 8 * 1024 * 1024) return showToast('Use an image under 8MB', 'error');
    const path = `${session.user.id}/${crypto.randomUUID()}-${photoForm.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const stored = await supabase.storage.from('progress-photos').upload(path, photoForm.file, { contentType: photoForm.file.type });
    if (stored.error) return showToast(stored.error.message, 'error');
    const saved = await supabase.from('progress_photos').insert({
      user_id: session.user.id,
      storage_path: path,
      captured_on: new Date().toISOString().slice(0, 10),
      weight_kg: Number(photoForm.weight) || null,
      notes: photoForm.notes || null,
    });
    if (saved.error) return showToast(saved.error.message, 'error');
    setPhotoForm({ file: null, weight: '', notes: '' });
    showToast('Progress photo saved privately', 'success');
    load();
  };

  const deletePhoto = async (photo) => {
    await supabase.storage.from('progress-photos').remove([photo.storage_path]);
    const result = await supabase.from('progress_photos').delete().eq('id', photo.id);
    if (result.error) return showToast(result.error.message, 'error');
    showToast('Progress photo deleted', 'success');
    load();
  };

  const exportData = async () => {
    const payload = { exportedAt: new Date().toISOString(), profile, health, metrics, reports, reportValues, plans, checkins, photos, notifications };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `vitalai-data-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const deleteAccount = async () => {
    if (!window.confirm('Permanently delete your account and all health data? This cannot be undone.')) return;
    const result = await supabase.rpc('delete_my_account');
    if (result.error) return showToast(result.error.message, 'error');
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (loading) return <div className="card p-10 text-center text-white/60">Loading your health workspace…</div>;

  if (view === 'plans') {
    return <WorkspaceSection title="My plans" subtitle="Every generated plan is saved as a separate version.">
      {plans.length ? <div className="grid gap-4 md:grid-cols-2">{plans.map((plan) => (
        <article key={plan.id} className="card p-5 text-left transition hover:border-blue-400/40">
          <div className="flex items-center justify-between"><span className="font-bold">Plan version {plan.version}</span>{plan.active && <span className="badge-normal">Active</span>}</div>
          <p className="mt-2 text-sm text-white/55">{new Date(plan.created_at).toLocaleDateString()} · {plan.generation_method}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-primary !px-3 !py-2 text-xs" onClick={() => onOpenPlan(plan.plan)}>Open</button>
            {!plan.active && <button className="btn-ghost !px-3 !py-2 text-xs" onClick={() => activatePlan(plan)}>Make active</button>}
            <button className="btn-ghost !px-3 !py-2 text-xs" onClick={() => archivePlan(plan)}>Archive</button>
          </div>
          <div className="mt-4 flex items-center gap-1" aria-label={`Rate plan version ${plan.version}`}>{[1,2,3,4,5].map((rating) => <button key={rating} className={`text-lg ${rating <= (plan.rating || 0) ? 'text-amber-300' : 'text-white/20'}`} onClick={() => ratePlan(plan, rating)} aria-label={`${rating} stars`}>★</button>)}</div>
        </article>
      ))}</div> : <EmptyState text="No saved plan yet." action="Analyze a report" onAction={onAnalyze} />}
    </WorkspaceSection>;
  }

  if (view === 'metrics') {
    return <WorkspaceSection title="Health metrics" subtitle="Record measurements manually. VitalAI tracks trends without diagnosing conditions.">
      <form onSubmit={saveMetric} className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <div><label className="label" htmlFor="metric-type">Metric</label><select id="metric-type" className="input" value={metricForm.type} onChange={(event) => setMetricForm({ ...metricForm, type: event.target.value, unit: metricUnit(event.target.value) })}>{['weight','waist','blood pressure systolic','blood pressure diastolic','fasting blood sugar','post-meal blood sugar','HbA1c','total cholesterol','LDL','HDL','triglycerides','hemoglobin','vitamin B12','vitamin D','TSH','T3','T4','uric acid','creatinine','resting heart rate','oxygen saturation','sleep hours','daily steps','custom'].map((item) => <option key={item}>{item}</option>)}</select></div>
        <Field label="Value" type="number" step="0.01" required value={metricForm.value} onChange={(value) => setMetricForm({ ...metricForm, value })} />
        <Field label="Unit" required value={metricForm.unit} onChange={(value) => setMetricForm({ ...metricForm, unit: value })} />
        <Field label="Measured date" type="date" required value={metricForm.measured_at} onChange={(value) => setMetricForm({ ...metricForm, measured_at: value })} />
        <Field label="Reference range" value={metricForm.reference_range} onChange={(value) => setMetricForm({ ...metricForm, reference_range: value })} />
        <Field label="Notes" value={metricForm.notes} onChange={(value) => setMetricForm({ ...metricForm, notes: value })} />
        <div className="lg:col-span-3"><button className="btn-primary">Save measurement</button></div>
      </form>
      <div className="card mt-6 overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr>{['Metric','Value','Date','Source','Notes'].map((item) => <th key={item} className="p-4 text-left text-xs uppercase tracking-wider text-white/40">{item}</th>)}</tr></thead><tbody>{[...metrics].reverse().map((item) => <tr key={item.id} className="border-t border-white/10"><td className="p-4 font-semibold capitalize">{item.metric_type}</td><td className="p-4">{item.value} {item.unit}</td><td className="p-4 text-white/55">{new Date(item.measured_at).toLocaleDateString()}</td><td className="p-4 text-white/55">{item.source}</td><td className="p-4 text-white/55">{item.notes || '—'}</td></tr>)}</tbody></table></div>
    </WorkspaceSection>;
  }

  if (view === 'goals') {
    return <WorkspaceSection title="Health goals" subtitle="Set realistic milestones. Health goals are wellness guidance, not medical diagnoses.">
      <form onSubmit={saveGoal} className="card grid gap-4 p-5 sm:grid-cols-3">
        <div><label className="label" htmlFor="goal-type">Goal</label><select id="goal-type" className="input" value={goalForm.goal_type} onChange={(event) => setGoalForm({ ...goalForm, goal_type: event.target.value })}>{['Weight loss','Weight gain','Weight maintenance','Muscle gain','Improved fitness','Better energy','Better sleep','Better digestion','Blood-sugar-conscious eating','Heart-conscious eating'].map((item) => <option key={item}>{item}</option>)}</select></div>
        <Field label="Target weight (kg)" type="number" step="0.1" value={goalForm.target_weight_kg} onChange={(value) => setGoalForm({ ...goalForm, target_weight_kg: value })} />
        <Field label="Target date" type="date" value={goalForm.target_date} onChange={(value) => setGoalForm({ ...goalForm, target_date: value })} />
        <div className="sm:col-span-3"><button className="btn-primary">Save goal</button></div>
      </form>
      <div className="mt-6 grid gap-4 md:grid-cols-2">{goals.map((goal) => <article key={goal.id} className="card p-5"><div className="flex items-center justify-between"><h2 className="font-bold">{goal.goal_type}</h2><span className="badge-normal">{goal.status}</span></div><p className="mt-3 text-sm text-white/55">{goal.target_weight_kg ? `${goal.target_weight_kg} kg` : 'Lifestyle goal'}{goal.target_date ? ` · by ${new Date(goal.target_date).toLocaleDateString()}` : ''}</p></article>)}</div>
    </WorkspaceSection>;
  }

  if (view === 'food') {
    return <WorkspaceSection title="Food preferences" subtitle="Plans use these saved restrictions, regional tastes, budget, and cooking limits.">
      <form onSubmit={saveFoodPreferences} className="card grid gap-5 p-6 sm:grid-cols-2">
        <div><label className="label" htmlFor="food-diet">Diet type</label><select id="food-diet" className="input" value={foodForm.diet_type} onChange={(event) => setFoodForm({ ...foodForm, diet_type: event.target.value })}>{['','Vegetarian','Vegan','Eggetarian','Non-Vegetarian','Jain','Pescatarian','No preference'].map((item) => <option key={item} value={item}>{item || 'Select'}</option>)}</select></div>
        <Field label="Regional preference" value={foodForm.region} onChange={(value) => setFoodForm({ ...foodForm, region: value })} />
        <Field label="Allergies (comma separated)" value={foodForm.allergies} onChange={(value) => setFoodForm({ ...foodForm, allergies: value })} />
        <Field label="Disliked foods (comma separated)" value={foodForm.dislikes} onChange={(value) => setFoodForm({ ...foodForm, dislikes: value })} />
        <div><label className="label" htmlFor="food-budget">Budget</label><select id="food-budget" className="input" value={foodForm.budget} onChange={(event) => setFoodForm({ ...foodForm, budget: event.target.value })}><option>Affordable</option><option>Moderate</option><option>Flexible</option></select></div>
        <Field label="Cooking time (minutes)" type="number" value={foodForm.cooking_time} onChange={(value) => setFoodForm({ ...foodForm, cooking_time: value })} />
        <div className="sm:col-span-2"><button className="btn-primary">Save preferences</button></div>
      </form>
    </WorkspaceSection>;
  }

  if (view === 'exercise') {
    const exercise = activePlan?.plan?.exercisePlan;
    return <WorkspaceSection title="Exercise plan" subtitle="Conservative activity guidance based on your active plan. Stop if you feel unwell.">
      {exercise ? <div className="grid gap-4 md:grid-cols-2">{Object.entries(exercise).map(([day, details]) => typeof details === 'object' ? <article key={day} className="card p-5"><p className="text-xs font-bold uppercase tracking-wider text-blue-300">{day}</p><h2 className="mt-2 text-lg font-bold">{details.type}</h2><p className="mt-2 text-sm text-white/60">{details.exercises}</p><p className="mt-3 text-xs text-white/40">{details.duration} · {details.intensity}</p></article> : null)}</div> : <EmptyState text="Generate a plan to receive exercise guidance." />}
    </WorkspaceSection>;
  }

  if (view === 'grocery') {
    const grocery = activePlan?.plan?.weeklyDietPlan?.groceryList || [];
    return <WorkspaceSection title="Grocery list" subtitle="Combined quantities from your active seven-day plan.">
      {grocery.length ? <div className="card divide-y divide-white/10">{grocery.map((item) => <div key={item.name} className="flex items-center justify-between p-4"><span className="font-semibold">{item.name}</span><span className="text-sm text-white/50">{item.weeklyQuantity}</span></div>)}</div> : <EmptyState text="Generate a weekly plan to build your grocery list." />}
    </WorkspaceSection>;
  }

  if (view === 'history') {
    const timeline = [
      ...reports.map((item) => ({ date: item.created_at, title: item.title, detail: `Report · ${item.category}` })),
      ...plans.map((item) => ({ date: item.created_at, title: `Diet plan v${item.version}`, detail: item.generation_method })),
      ...checkins.map((item) => ({ date: item.checkin_date, title: 'Daily check-in', detail: `${item.data?.mood || 'Mood not set'} · ${item.data?.steps || 0} steps` })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    return <WorkspaceSection title="Health history" subtitle="Reports, plans, and daily progress in one timeline.">
      {timeline.length ? <div className="card divide-y divide-white/10">{timeline.map((item, index) => (
        <div key={`${item.title}-${index}`} className="flex gap-4 p-5"><div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-teal" /><div><p className="font-semibold">{item.title}</p><p className="text-sm text-white/50">{item.detail} · {new Date(item.date).toLocaleDateString()}</p></div></div>
      ))}</div> : <EmptyState text="Your history will appear here." action="Analyze a report" onAction={onAnalyze} />}
    </WorkspaceSection>;
  }

  if (view === 'reports') {
    return <WorkspaceSection title="Health reports" subtitle="Review private files and confirm extracted values before they become trusted health history.">
      {reports.length ? <div className="space-y-5">{reports.map((report) => {
        const values = reportValues.filter((item) => item.report_id === report.id);
        return <article key={report.id} className="card p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h2 className="text-lg font-bold">{report.title}</h2><p className="text-sm text-white/45">{report.category} · {new Date(report.created_at).toLocaleDateString()}</p></div><div className="flex gap-2"><button className="btn-ghost !px-3 !py-2 text-xs" onClick={() => openReport(report)}>Secure view</button><button className="rounded-lg border border-red-400/25 px-3 py-2 text-xs text-red-300" onClick={() => deleteReport(report)}>Delete</button></div></div>
          {values.length > 0 && <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[580px] text-sm"><thead><tr><th className="p-3 text-left">Marker</th><th className="p-3 text-left">Value</th><th className="p-3 text-left">Range</th><th className="p-3 text-left">Confirmation</th></tr></thead><tbody>{values.map((item) => <tr key={item.id} className="border-t border-white/10"><td className="p-3 font-semibold">{item.metric_type}</td><td className="p-3">{item.value ?? '—'} {item.unit}</td><td className="p-3 text-white/50">{item.reference_range || '—'}</td><td className="p-3">{item.confirmed ? <span className="badge-normal">Confirmed</span> : <button className="text-xs font-bold text-blue-300" onClick={() => confirmReportValue(item)}>Confirm value</button>}</td></tr>)}</tbody></table></div>}
        </article>;
      })}</div> : <EmptyState text="No saved reports yet." action="Analyze a report" onAction={onAnalyze} />}
    </WorkspaceSection>;
  }

  if (view === 'photos') {
    return <WorkspaceSection title="Progress photos" subtitle="Private photos for your own visual comparison. They are never sent to the AI.">
      <form onSubmit={uploadPhoto} className="card grid gap-4 p-5 sm:grid-cols-3">
        <div><label className="label" htmlFor="progress-photo">Photo</label><input id="progress-photo" className="input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhotoForm({ ...photoForm, file: event.target.files?.[0] || null })} /></div>
        <Field label="Weight at upload (kg)" type="number" step="0.1" value={photoForm.weight} onChange={(value) => setPhotoForm({ ...photoForm, weight: value })} />
        <Field label="Private note" value={photoForm.notes} onChange={(value) => setPhotoForm({ ...photoForm, notes: value })} />
        <div className="sm:col-span-3"><button className="btn-primary">Upload privately</button></div>
      </form>
      {photos.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{photos.map((photo) => <article key={photo.id} className="card overflow-hidden"><img src={photoUrls[photo.id]} alt={`Progress from ${photo.captured_on}`} className="aspect-[4/5] w-full object-cover" /><div className="p-4"><p className="font-semibold">{new Date(photo.captured_on).toLocaleDateString()}</p><p className="text-sm text-white/45">{photo.weight_kg ? `${photo.weight_kg} kg` : 'Weight not recorded'}{photo.notes ? ` · ${photo.notes}` : ''}</p><button className="mt-3 text-xs font-semibold text-red-300" onClick={() => deletePhoto(photo)}>Delete permanently</button></div></article>)}</div> : <div className="mt-6"><EmptyState text="No progress photos yet." /></div>}
    </WorkspaceSection>;
  }

  if (view === 'notifications') {
    return <WorkspaceSection title="Notifications" subtitle="Plan, report, and health-workspace updates.">
      {notifications.length ? <div className="card divide-y divide-white/10">{notifications.map((item) => <div key={item.id} className="p-5"><p className="font-semibold">{item.title || 'VitalAI update'}</p><p className="mt-1 text-sm text-white/55">{item.message || item.body}</p><p className="mt-2 text-xs text-white/30">{new Date(item.created_at).toLocaleString()}</p></div>)}</div> : <EmptyState text="You have no notifications." />}
    </WorkspaceSection>;
  }

  if (view === 'settings') {
    return <WorkspaceSection title="Privacy & settings" subtitle="Control your personal health information.">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="card p-6"><h2 className="text-xl font-bold">Export my data</h2><p className="mt-2 text-sm leading-6 text-white/55">Download your profile, metrics, reports metadata, plans, check-ins, and photo metadata as JSON.</p><button onClick={exportData} className="btn-primary mt-5">Download export</button></div>
        <div className="card border-red-400/20 p-6"><h2 className="text-xl font-bold">Delete account</h2><p className="mt-2 text-sm leading-6 text-white/55">Permanently delete your account and database records. This cannot be undone.</p><button onClick={deleteAccount} className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-5 py-3 font-semibold text-red-200">Delete permanently</button></div>
      </div>
    </WorkspaceSection>;
  }

  if (view === 'checkin') {
    return <WorkspaceSection title="Daily check-in" subtitle="One quick entry each day. Update it anytime.">
      <form onSubmit={saveCheckin} className="card grid gap-5 p-6 sm:grid-cols-2">
        <Field label="Weight (kg)" type="number" step="0.1" value={checkin.weight} onChange={(value) => setCheckin({ ...checkin, weight: value })} />
        <Field label="Water (litres)" type="number" step="0.1" value={checkin.water} onChange={(value) => setCheckin({ ...checkin, water: value })} />
        <Field label="Sleep (hours)" type="number" step="0.1" value={checkin.sleep} onChange={(value) => setCheckin({ ...checkin, sleep: value })} />
        <Field label="Steps" type="number" value={checkin.steps} onChange={(value) => setCheckin({ ...checkin, steps: value })} />
        <div><label className="label" htmlFor="mood">Mood</label><select id="mood" className="input" value={checkin.mood} onChange={(e) => setCheckin({ ...checkin, mood: e.target.value })}><option>Great</option><option>Good</option><option>Okay</option><option>Low</option></select></div>
        <div className="flex items-end"><button className="btn-primary w-full">Save today’s check-in</button></div>
      </form>
    </WorkspaceSection>;
  }

  if (view === 'profile') {
    return <WorkspaceSection title="My profile" subtitle="Keep your health and food context current.">
      <form onSubmit={saveProfile} className="card grid gap-5 p-6 sm:grid-cols-2">
        <Field label="Full name" value={profile.full_name} onChange={(value) => setProfile({ ...profile, full_name: value })} />
        <Field label="Country" value={profile.country || ''} onChange={(value) => setProfile({ ...profile, country: value })} />
        <Field label="Current weight (kg)" type="number" step="0.1" value={health.current_weight_kg || ''} onChange={(value) => setHealth({ ...health, current_weight_kg: value })} />
        <Field label="Height (cm)" type="number" value={health.height_cm || ''} onChange={(value) => setHealth({ ...health, height_cm: value })} />
        <div><label className="label" htmlFor="diet-type">Diet preference</label><select id="diet-type" className="input" value={health.diet_type || ''} onChange={(e) => setHealth({ ...health, diet_type: e.target.value })}><option value="">Select</option><option>Vegetarian</option><option>Vegan</option><option>Eggetarian</option><option>Non-Vegetarian</option></select></div>
        <div className="flex items-end"><button className="btn-primary w-full">Save profile</button></div>
      </form>
    </WorkspaceSection>;
  }

  return <section className="animate-fade-in">
    <div className="rounded-[2rem] border border-blue-400/15 bg-gradient-to-r from-blue-700/25 via-blue-600/10 to-cyan-400/5 p-6 sm:p-8">
      <p className="text-sm font-semibold text-blue-300">Your health workspace</p>
      <div className="mt-2 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><h1 className="text-3xl font-extrabold sm:text-4xl">Welcome back, {displayName}</h1><p className="mt-2 text-white/60">Your reports, nutrition, activity, and daily progress—connected.</p></div>
        <button onClick={onAnalyze} className="btn-primary shrink-0">Analyze new report</button>
      </div>
    </div>

    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Latest weight" value={latestCheckin.weight ? `${latestCheckin.weight} kg` : health.current_weight_kg ? `${health.current_weight_kg} kg` : 'Add weight'} />
      <Stat label="Active plan" value={activePlan ? `Version ${activePlan.version}` : 'No plan yet'} />
      <Stat label="Reports saved" value={String(reports.length)} />
      <Stat label="Recent check-ins" value={String(checkins.length)} />
    </div>

    <div className="mt-6 grid gap-6 lg:grid-cols-[1.45fr_.75fr]">
      <div className="card p-5 sm:p-6">
        <div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">Weight trend</h2><p className="text-sm text-white/45">Your recorded progress</p></div></div>
        <div className="mt-5 h-64">
          {weightData.length > 1 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={weightData}><defs><linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5}/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false}/><XAxis dataKey="date" stroke="#718096" fontSize={11}/><YAxis stroke="#718096" fontSize={11}/><Tooltip contentStyle={{ background: '#10243A', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }}/><Area type="monotone" dataKey="value" stroke="#60a5fa" fill="url(#weightFill)" strokeWidth={3}/></AreaChart></ResponsiveContainer>
            : <EmptyState text="Add two daily weight check-ins to see your trend." />}
        </div>
      </div>
      <div className="card p-5 sm:p-6">
        <h2 className="text-lg font-bold">Today</h2>
        <div className="mt-5 space-y-4">
          <TodayRow label="Water" value={latestCheckin.water ? `${latestCheckin.water} L` : 'Not logged'} />
          <TodayRow label="Sleep" value={latestCheckin.sleep ? `${latestCheckin.sleep} hours` : 'Not logged'} />
          <TodayRow label="Steps" value={latestCheckin.steps ? latestCheckin.steps.toLocaleString() : 'Not logged'} />
          <TodayRow label="Mood" value={latestCheckin.mood || 'Not logged'} />
        </div>
      </div>
    </div>
  </section>;
}

function WorkspaceSection({ title, subtitle, children }) {
  return <section className="animate-fade-in"><div className="mb-6"><h1 className="text-3xl font-bold">{title}</h1><p className="mt-1 text-white/55">{subtitle}</p></div>{children}</section>;
}
function Field({ label, onChange, ...props }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return <div><label className="label" htmlFor={id}>{label}</label><input id={id} className="input" onChange={(e) => onChange(e.target.value)} {...props} /></div>;
}
function Stat({ label, value }) {
  return <div className="card p-5"><p className="text-xs font-semibold uppercase tracking-wider text-white/40">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>;
}
function TodayRow({ label, value }) {
  return <div className="flex items-center justify-between border-b border-white/10 pb-3 text-sm last:border-0"><span className="text-white/55">{label}</span><span className="font-semibold">{value}</span></div>;
}
function EmptyState({ text, action, onAction }) {
  return <div className="grid h-full min-h-32 place-items-center rounded-2xl border border-dashed border-white/15 p-6 text-center"><div><p className="text-sm text-white/50">{text}</p>{action && <button className="mt-3 text-sm font-semibold text-teal" onClick={onAction}>{action} →</button>}</div></div>;
}

function metricUnit(type) {
  if (['weight'].includes(type)) return 'kg';
  if (type === 'waist') return 'cm';
  if (type.includes('blood pressure')) return 'mmHg';
  if (['fasting blood sugar','post-meal blood sugar','total cholesterol','LDL','HDL','triglycerides'].includes(type)) return 'mg/dL';
  if (type === 'HbA1c') return '%';
  if (type === 'oxygen saturation') return '%';
  if (type === 'sleep hours') return 'hours';
  if (type === 'daily steps') return 'steps';
  return '';
}

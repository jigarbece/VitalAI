import React, { useState } from 'react';
import { authEnabled, supabase } from '../supabase.js';

export default function AuthPanel({ onClose, onSignedIn }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', dateOfBirth: '', gender: '',
    country: '', privacyConsent: false, disclaimerConsent: false,
  });
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!authEnabled) return setStatus('Connect Supabase in client/.env to enable accounts.');
    if (mode === 'register' && form.password !== form.confirmPassword) return setStatus('Passwords do not match.');
    if (mode === 'register' && (!form.privacyConsent || !form.disclaimerConsent)) return setStatus('Privacy and health disclaimer consent is required.');
    setBusy(true); setStatus('');
    const result = mode === 'register'
      ? await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: {
          full_name: form.name,
          date_of_birth: form.dateOfBirth,
          gender: form.gender,
          country: form.country,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          privacy_consent: true,
          disclaimer_consent: true,
          policy_version: '2026-07',
        } },
      })
      : await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    setBusy(false);
    if (result.error) return setStatus(result.error.message);
    if (result.data.session) onSignedIn?.(result.data.session);
    else setStatus('Check your email to verify your account.');
  };

  const recover = async () => {
    if (!authEnabled || !form.email) return setStatus('Enter your email first.');
    const result = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: window.location.origin,
    });
    setStatus(result.error ? result.error.message : 'Password recovery email sent.');
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Account access">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <div className="flex items-start justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-teal">VitalAI account</p><h2 className="mt-2 text-2xl font-bold">{mode === 'login' ? 'Welcome back' : 'Create your private workspace'}</h2></div>
          <button onClick={onClose} className="rounded-lg p-2 text-white/50 hover:bg-white/10" aria-label="Close">×</button>
        </div>
        <form className="mt-7 space-y-4" onSubmit={submit}>
          {mode === 'register' && <div><label className="label" htmlFor="auth-name">Full name</label><input id="auth-name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>}
          {mode === 'register' && <div className="grid grid-cols-2 gap-3"><div><label className="label" htmlFor="auth-dob">Date of birth</label><input id="auth-dob" className="input" type="date" required value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></div><div><label className="label" htmlFor="auth-gender">Gender</label><select id="auth-gender" className="input" required value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="">Select</option><option>Male</option><option>Female</option><option>Prefer not to say</option></select></div></div>}
          {mode === 'register' && <div><label className="label" htmlFor="auth-country">Country</label><input id="auth-country" className="input" required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>}
          <div><label className="label" htmlFor="auth-email">Email</label><input id="auth-email" className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label" htmlFor="auth-password">Password</label><input id="auth-password" className="input" type="password" minLength="8" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          {mode === 'register' && <div><label className="label" htmlFor="auth-confirm-password">Confirm password</label><input id="auth-confirm-password" className="input" type="password" minLength="8" required value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /></div>}
          {mode === 'register' && <div className="space-y-3"><label className="flex gap-3 text-xs leading-5 text-white/60"><input type="checkbox" checked={form.privacyConsent} onChange={(e) => setForm({ ...form, privacyConsent: e.target.checked })} /><span>I accept the Privacy Policy and consent to storing my wellness information.</span></label><label className="flex gap-3 text-xs leading-5 text-white/60"><input type="checkbox" checked={form.disclaimerConsent} onChange={(e) => setForm({ ...form, disclaimerConsent: e.target.checked })} /><span>I understand VitalAI provides wellness education, not medical advice.</span></label></div>}
          {status && <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">{status}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <button className="mt-5 w-full text-sm text-white/55 hover:text-teal" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setStatus(''); }}>
          {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>
        {mode === 'login' && <button className="mt-3 w-full text-xs text-white/40 hover:text-teal" onClick={recover}>Forgot password?</button>}
      </div>
    </div>
  );
}

// In production (same origin), VITE_API_URL is empty string → relative /api/* paths.
// In dev, points to http://localhost:5000.
import { supabase } from './supabase.js';

const API_URL = import.meta.env?.VITE_API_URL ?? '';

async function unwrap(res) {
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body.error || body.detail || '';
    } catch (_) {
      detail = res.statusText;
    }
    const err = new Error(detail || `Request failed with status ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function logGeneration(requestType, startedAt, result, success) {
  try {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) return;
    await supabase.from('ai_generation_logs').insert({
      user_id: data.session.user.id,
      provider: result?._provider || 'standard-nutrition-engine',
      request_type: requestType,
      success,
      duration_ms: Math.round(performance.now() - startedAt),
      usage: {},
    });
  } catch (_) { /* telemetry never blocks generation */ }
}

export async function analyzeReport(file, profile) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('userProfile', JSON.stringify(profile));
  const res = await fetch(`${API_URL}/api/analyze`, { method: 'POST', body: formData });
  return unwrap(res);
}

export async function extractProfile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_URL}/api/extract-profile`, { method: 'POST', body: formData });
  return unwrap(res);
}

export async function quickPlan(profile) {
  const startedAt = performance.now();
  const { data } = await supabase.auth.getSession();
  try {
    const res = await fetch(`${API_URL}/api/quick-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` },
      body: JSON.stringify(profile),
    });
    const result = await unwrap(res);
    logGeneration('quick-plan', startedAt, result, true);
    return result;
  } catch (error) {
    logGeneration('quick-plan', startedAt, null, false);
    throw error;
  }
}

export async function weeklyPlan(profile) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(`${API_URL}/api/weekly-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` },
    body: JSON.stringify(profile),
  });
  return unwrap(res);
}

export async function demoPlan() {
  const res = await fetch(`${API_URL}/api/demo`);
  return unwrap(res);
}

export async function loadSessionState() {
  const res = await fetch(`${API_URL}/api/session-state`, { credentials: 'include' });
  return unwrap(res);
}

export async function saveSessionState(state) {
  const res = await fetch(`${API_URL}/api/session-state`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  });
  return unwrap(res);
}

export async function clearSessionState() {
  const res = await fetch(`${API_URL}/api/session-state`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return unwrap(res);
}

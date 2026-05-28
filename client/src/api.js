// In production (same origin), VITE_API_URL is empty string → relative /api/* paths.
// In dev, points to http://localhost:5000.
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

export async function analyzeReport(file, profile) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('userProfile', JSON.stringify(profile));
  const res = await fetch(`${API_URL}/api/analyze`, { method: 'POST', body: formData });
  return unwrap(res);
}

export async function quickPlan(profile) {
  const res = await fetch(`${API_URL}/api/quick-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  return unwrap(res);
}

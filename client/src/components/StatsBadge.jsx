import React, { useEffect, useState } from 'react';

const API_URL = import.meta.env?.VITE_API_URL ?? '';

async function recordVisit() {
  // Only record one visit per browser tab/session
  if (typeof window !== 'undefined' && window.sessionStorage.getItem('vai-visited')) {
    const res = await fetch(`${API_URL}/api/stats`).catch(() => null);
    if (!res || !res.ok) throw new Error('stats unavailable');
    return res.json();
  }
  const res = await fetch(`${API_URL}/api/visit`, { method: 'POST' }).catch(() => null);
  if (res && res.ok) {
    if (typeof window !== 'undefined') window.sessionStorage.setItem('vai-visited', '1');
    return res.json();
  }
  throw new Error('visit endpoint failed');
}

export default function StatsBadge({ refreshKey = 0 }) {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    recordVisit()
      .then((s) => !cancelled && setStats(s))
      .catch(() => !cancelled && setErr(true));
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (err || !stats) {
    return null;
  }

  const total = (stats.reportsChecked || 0) + (stats.quickPlansChecked || 0);

  return (
    <div className="flex items-center gap-3 text-xs text-white/50">
      <span className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
        <span className="font-mono">{stats.uniqueVisitors.toLocaleString()}</span>
        <span>visitors</span>
      </span>
      <span className="w-px h-3 bg-white/15" />
      <span className="flex items-center gap-1.5">
        <span className="font-mono text-teal">{total.toLocaleString()}</span>
        <span>plans generated</span>
      </span>
    </div>
  );
}

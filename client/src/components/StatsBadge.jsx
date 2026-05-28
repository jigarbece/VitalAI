import React, { useEffect, useState, useRef } from 'react';

const API_URL = import.meta.env?.VITE_API_URL ?? '';

async function recordVisit() {
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

function AnimatedNumber({ target, duration = 1200 }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!target) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [target, duration]);

  return <span>{value.toLocaleString()}</span>;
}

export default function StatsBadge({ refreshKey = 0, variant = 'inline' }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    recordVisit()
      .then((s) => !cancelled && setStats(s))
      .catch(() => {});
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (!stats) return null;

  const totalPlans = (stats.reportsChecked || 0) + (stats.quickPlansChecked || 0);

  if (variant === 'hero') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 animate-fade-in">
        <div className="flex flex-col items-center group">
          <div className="relative">
            <div className="absolute -inset-3 bg-teal/10 rounded-2xl blur-lg group-hover:bg-teal/20 transition" />
            <span className="relative text-4xl sm:text-5xl font-extrabold text-teal tabular-nums">
              <AnimatedNumber target={stats.uniqueVisitors} />
            </span>
          </div>
          <span className="text-[11px] uppercase tracking-widest text-white/40 mt-2 font-medium">Visitors</span>
        </div>

        <div className="w-px h-10 bg-white/10" />

        <div className="flex flex-col items-center group">
          <div className="relative">
            <div className="absolute -inset-3 bg-emerald-500/10 rounded-2xl blur-lg group-hover:bg-emerald-500/20 transition" />
            <span className="relative text-4xl sm:text-5xl font-extrabold text-emerald-300 tabular-nums">
              <AnimatedNumber target={totalPlans} duration={1400} />
            </span>
          </div>
          <span className="text-[11px] uppercase tracking-widest text-white/40 mt-2 font-medium">Plans generated</span>
        </div>

        <div className="w-px h-10 bg-white/10" />

        <div className="flex flex-col items-center group">
          <div className="relative">
            <div className="absolute -inset-3 bg-violet-500/10 rounded-2xl blur-lg group-hover:bg-violet-500/20 transition" />
            <span className="relative text-4xl sm:text-5xl font-extrabold text-violet-300 tabular-nums">
              <AnimatedNumber target={stats.reportsChecked || 0} duration={1000} />
            </span>
          </div>
          <span className="text-[11px] uppercase tracking-widest text-white/40 mt-2 font-medium">Reports analyzed</span>
        </div>
      </div>
    );
  }

  // Compact inline variant for footer
  return (
    <div className="flex items-center gap-3 text-xs text-white/50">
      <span className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
        <span className="font-mono">{stats.uniqueVisitors.toLocaleString()}</span>
        <span>visitors</span>
      </span>
      <span className="w-px h-3 bg-white/15" />
      <span className="flex items-center gap-1.5">
        <span className="font-mono text-teal">{totalPlans.toLocaleString()}</span>
        <span>plans generated</span>
      </span>
    </div>
  );
}

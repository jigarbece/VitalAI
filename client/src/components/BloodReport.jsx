import React from 'react';

export function scoreColor(score) {
  if (score >= 80) return { bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', text: 'text-emerald-300', label: 'Excellent' };
  if (score >= 60) return { bg: 'bg-yellow-500/15', border: 'border-yellow-500/40', text: 'text-yellow-200', label: 'Good' };
  if (score >= 40) return { bg: 'bg-orange-500/15', border: 'border-orange-500/40', text: 'text-orange-300', label: 'Fair' };
  return { bg: 'bg-red-500/15', border: 'border-red-500/40', text: 'text-red-300', label: 'Needs Attention' };
}

function StatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  const cls =
    s === 'normal' ? 'badge-normal' :
    s === 'high' ? 'badge-high' :
    s === 'low' ? 'badge-low' :
    s === 'borderline' ? 'badge-borderline' :
    'badge bg-white/10 text-white/70 border border-white/20';
  const label = s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unknown';
  return <span className={cls}>{label}</span>;
}

export default function BloodReport({ data }) {
  const score = typeof data.healthScore === 'number' ? data.healthScore : 0;
  const c = scoreColor(score);
  const markers = Array.isArray(data.bloodMarkers) ? data.bloodMarkers : [];
  const findings = Array.isArray(data.keyFindings) ? data.keyFindings : [];

  return (
    <div className="space-y-6">
      <div className={`card p-6 ${c.bg} ${c.border}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative w-24 h-24 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="44" stroke="rgba(255,255,255,0.08)" strokeWidth="9" fill="none" />
              <circle
                cx="50" cy="50" r="44"
                stroke="currentColor"
                strokeWidth="9" fill="none"
                strokeDasharray={`${(score / 100) * 276} 276`}
                strokeLinecap="round"
                className={c.text}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-extrabold ${c.text}`}>{score}</span>
              <span className="text-[10px] text-white/50 uppercase tracking-wider">/ 100</span>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-white/50">Overall Health Score</p>
            <h3 className={`text-2xl font-bold ${c.text}`}>{c.label}</h3>
            <p className="text-sm text-white/60 mt-1 max-w-xl">
              Calculated from your reported biomarkers and profile. This is a directional indicator, not a diagnosis.
            </p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-semibold">Detected biomarkers</h3>
          <span className="text-xs text-white/40">{markers.length} marker{markers.length !== 1 && 's'}</span>
        </div>
        {markers.length === 0 ? (
          <div className="p-6 text-white/50 text-sm">No biomarkers detected in the report. The plan is based on your profile alone.</div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/50 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 font-medium">Marker</th>
                  <th className="px-6 py-3 font-medium">Your value</th>
                  <th className="px-6 py-3 font-medium">Normal range</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {markers.map((m, i) => (
                  <tr key={i} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-6 py-3 font-medium">
                      {m.name}
                      {m.note && <div className="text-xs text-white/40 mt-0.5">{m.note}</div>}
                    </td>
                    <td className="px-6 py-3 text-white/80">{m.value}</td>
                    <td className="px-6 py-3 text-white/60">{m.normalRange}</td>
                    <td className="px-6 py-3"><StatusBadge status={m.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-4">Key findings</h3>
        <ul className="space-y-2.5">
          {findings.map((f, i) => (
            <li key={i} className="flex gap-3 text-sm text-white/80">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-4 bg-yellow-500/5 border-yellow-500/30 text-yellow-100/90 text-xs sm:text-sm">
        <strong className="font-semibold">Medical disclaimer:</strong> This analysis is generated by AI and is for
        informational purposes only. It is not medical advice. Always consult a qualified healthcare provider before
        making changes to your treatment, medication, or lifestyle.
      </div>
    </div>
  );
}

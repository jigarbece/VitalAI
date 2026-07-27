import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase.js';
import AdminContentManager from './AdminContentManager.jsx';

export default function AdminPanel({ showToast }) {
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [plans, setPlans] = useState([]);
  const [logs, setLogs] = useState([]);
  const [flags, setFlags] = useState([]);

  const load = async () => {
    setLoading(true);
    const [usersRes, reportsRes, plansRes, logsRes, flagsRes] = await Promise.all([
      supabase.from('profiles').select('id,full_name,country,role,created_at,deleted_at').order('created_at', { ascending: false }),
      supabase.from('uploaded_reports').select('id,user_id,title,category,report_date,storage_path,size_bytes,created_at,deleted_at').order('created_at', { ascending: false }),
      supabase.from('diet_plan_versions').select('id,user_id,version,provider,generation_method,created_at,active').order('created_at', { ascending: false }).limit(200),
      supabase.from('ai_generation_logs').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('safety_flags').select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    setUsers(usersRes.data || []);
    setReports(reportsRes.data || []);
    setPlans(plansRes.data || []);
    setLogs(logsRes.data || []);
    setFlags(flagsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const userNames = useMemo(() => Object.fromEntries(users.map((user) => [user.id, user.full_name || user.id.slice(0, 8)])), [users]);
  const successfulLogs = logs.filter((log) => log.success).length;

  const changeRole = async (user, role) => {
    const result = await supabase.from('profiles').update({ role }).eq('id', user.id);
    if (result.error) return showToast(result.error.message, 'error');
    showToast(`${user.full_name || 'User'} is now ${role}`, 'success');
    load();
  };

  const openReport = async (report) => {
    const result = await supabase.storage.from('health-reports').createSignedUrl(report.storage_path, 60);
    if (result.error) return showToast(result.error.message, 'error');
    window.open(result.data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const resolveFlag = async (flag) => {
    const result = await supabase.from('safety_flags').update({ resolved_at: new Date().toISOString() }).eq('id', flag.id);
    if (result.error) return showToast(result.error.message, 'error');
    load();
  };

  if (loading) return <div className="card p-10 text-center text-white/60">Loading admin workspace…</div>;

  return <section className="animate-fade-in">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-sm font-bold uppercase tracking-[.18em] text-blue-300">Administrator</p><h1 className="mt-1 text-3xl font-extrabold">VitalAI control center</h1><p className="mt-2 text-white/55">Manage users, reports, plans, AI activity, and safety review.</p></div>
      <button onClick={load} className="btn-ghost text-sm">Refresh data</button>
    </div>

    <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-navy-100/50 p-1">
      {['overview', 'users', 'reports', 'foods', 'exercises', 'templates', 'notices', 'ai usage', 'safety'].map((item) => <button key={item} onClick={() => setTab(item)} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold capitalize ${tab === item ? 'bg-teal text-white' : 'text-white/55 hover:bg-white/5'}`}>{item}</button>)}
    </div>

    {tab === 'overview' && <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <AdminStat label="Users" value={users.filter((user) => !user.deleted_at).length} />
      <AdminStat label="Reports" value={reports.filter((report) => !report.deleted_at).length} />
      <AdminStat label="Plans" value={plans.length} />
      <AdminStat label="AI success" value={logs.length ? `${Math.round(successfulLogs / logs.length * 100)}%` : 'No data'} />
      <AdminStat label="Open safety flags" value={flags.filter((flag) => !flag.resolved_at).length} />
    </div>}

    {tab === 'users' && <AdminTable headers={['User', 'Country', 'Role', 'Joined', 'Actions']}>
      {users.map((user) => <tr key={user.id} className="border-t border-white/10">
        <td className="p-4"><p className="font-semibold">{user.full_name || 'Unnamed user'}</p><p className="text-xs text-white/35">{user.id}</p></td>
        <td className="p-4 text-white/60">{user.country || '—'}</td><td className="p-4"><span className="badge-normal">{user.role}</span></td>
        <td className="p-4 text-white/60">{new Date(user.created_at).toLocaleDateString()}</td>
        <td className="p-4"><button className="text-sm font-semibold text-teal" onClick={() => changeRole(user, user.role === 'admin' ? 'user' : 'admin')}>Make {user.role === 'admin' ? 'user' : 'admin'}</button></td>
      </tr>)}
    </AdminTable>}

    {tab === 'reports' && <AdminTable headers={['Report', 'User', 'Category', 'Uploaded', 'File']}>
      {reports.map((report) => <tr key={report.id} className="border-t border-white/10">
        <td className="p-4 font-semibold">{report.title}</td><td className="p-4 text-white/60">{userNames[report.user_id] || report.user_id.slice(0, 8)}</td>
        <td className="p-4 text-white/60">{report.category}</td><td className="p-4 text-white/60">{new Date(report.created_at).toLocaleDateString()}</td>
        <td className="p-4"><button onClick={() => openReport(report)} className="text-sm font-semibold text-teal">Secure view</button></td>
      </tr>)}
    </AdminTable>}

    {tab === 'ai usage' && <AdminTable headers={['User', 'Provider', 'Request', 'Result', 'Duration', 'Date']}>
      {logs.map((log) => <tr key={log.id} className="border-t border-white/10">
        <td className="p-4 text-white/60">{userNames[log.user_id] || 'Guest'}</td><td className="p-4">{log.provider}</td><td className="p-4">{log.request_type}</td>
        <td className="p-4">{log.success ? <span className="badge-normal">Success</span> : <span className="badge-high">Failed</span>}</td>
        <td className="p-4 text-white/60">{log.duration_ms ? `${log.duration_ms} ms` : '—'}</td><td className="p-4 text-white/60">{new Date(log.created_at).toLocaleString()}</td>
      </tr>)}
    </AdminTable>}

    {tab === 'safety' && <AdminTable headers={['User', 'Category', 'Severity', 'Date', 'Status']}>
      {flags.map((flag) => <tr key={flag.id} className="border-t border-white/10">
        <td className="p-4 text-white/60">{userNames[flag.user_id] || 'Guest'}</td><td className="p-4">{flag.category}</td><td className="p-4">{flag.severity}</td>
        <td className="p-4 text-white/60">{new Date(flag.created_at).toLocaleString()}</td><td className="p-4">{flag.resolved_at ? <span className="badge-normal">Resolved</span> : <button onClick={() => resolveFlag(flag)} className="text-sm font-semibold text-teal">Mark resolved</button>}</td>
      </tr>)}
    </AdminTable>}

    {['foods', 'exercises', 'templates', 'notices'].includes(tab) && <AdminContentManager type={tab} showToast={showToast} />}
  </section>;
}

function AdminStat({ label, value }) {
  return <div className="card p-5"><p className="text-xs font-bold uppercase tracking-wider text-white/40">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>;
}
function AdminTable({ headers, children }) {
  return <div className="card mt-6 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr>{headers.map((header) => <th key={header} className="p-4 text-xs uppercase tracking-wider text-white/40">{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

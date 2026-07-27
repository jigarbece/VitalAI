import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import Landing from './components/Landing.jsx';
import Uploader from './components/Uploader.jsx';
import UserForm from './components/UserForm.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import StatsBadge from './components/StatsBadge.jsx';
import { ToastProvider, useToast } from './toast.jsx';
import {
  analyzeReport,
  quickPlan,
  extractProfile,
  loadSessionState,
  saveSessionState,
  clearSessionState,
  weeklyPlan,
  demoPlan,
} from './api.js';
import AuthPanel from './components/AuthPanel.jsx';
import { authEnabled, supabase } from './supabase.js';

const UserDashboard = lazy(() => import('./components/UserDashboard.jsx'));
const AdminPanel = lazy(() => import('./components/AdminPanel.jsx'));
const OnboardingWizard = lazy(() => import('./components/OnboardingWizard.jsx'));
const PublicInfo = lazy(() => import('./components/PublicInfo.jsx'));
const ResultDashboard = lazy(() => import('./components/ResultDashboard.jsx'));

// Phases:
//   landing → upload → profile → loading → results       (report flow)
//   landing → quickProfile → loading → results            (quick flow, BMI-only)
//   contact (modal-like page)
const REPORT_STEPS = ['Upload', 'Profile', 'Analyzing', 'Results'];
const QUICK_STEPS = ['Profile', 'Analyzing', 'Results'];
const USER_NAV = [
  ['dashboard', 'Overview'],
  ['setup', 'Health Setup'],
  ['analyze', 'Analyze Report'],
  ['diet', 'Generate Diet'],
  ['plans', 'My Plans'],
  ['reports', 'Reports'],
  ['metrics', 'Health Metrics'],
  ['history', 'Health History'],
  ['goals', 'Goals'],
  ['food', 'Food Preferences'],
  ['exercise', 'Exercise'],
  ['grocery', 'Grocery List'],
  ['checkin', 'Daily Check-in'],
  ['photos', 'Progress Photos'],
  ['notifications', 'Notifications'],
  ['profile', 'Profile'],
  ['settings', 'Settings'],
];
const PAGE_TITLES = {
  landing: 'VitalAI | Health Reports, Diet & Wellness',
  dashboard: 'My Health Dashboard | VitalAI',
  onboarding: 'Health Setup | VitalAI',
  upload: 'Analyze Health Report | VitalAI',
  profile: 'Report Profile | VitalAI',
  quickProfile: 'Generate Diet Plan | VitalAI',
  loading: 'Preparing Your Plan | VitalAI',
  results: 'Your Wellness Plan | VitalAI',
  admin: 'Admin Panel | VitalAI',
  faq: 'FAQ | VitalAI',
  privacy: 'Privacy | VitalAI',
  terms: 'Terms | VitalAI',
  disclaimer: 'Medical Disclaimer | VitalAI',
  features: 'Features | VitalAI',
  how: 'How VitalAI Works | VitalAI',
  bmi: 'BMI Calculator | VitalAI',
  sample: 'Sample Plan | VitalAI',
  about: 'About | VitalAI',
  contact: 'Contact | VitalAI',
};

const activityForPlan = {
  Sedentary: 'Sedentary (desk job, no exercise)',
  Light: 'Lightly Active (1-3 days/week)',
  Moderate: 'Moderately Active (3-5 days/week)',
  Active: 'Very Active (6-7 days/week)',
};

function ageFromDate(dateOfBirth) {
  if (!dateOfBirth) return '';
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return '';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
  return age > 0 ? String(age) : '';
}

function AppShell() {
  const [phase, setPhase] = useState('landing');
  const [mode, setMode] = useState('report'); // 'report' | 'quick'
  const [file, setFile] = useState(null);
  const [profile, setProfile] = useState(null);
  const [result, setResult] = useState(null);
  const [extractedProfile, setExtractedProfile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!authEnabled);
  const [showAuth, setShowAuth] = useState(false);
  const [stateHydrated, setStateHydrated] = useState(false);
  const [workspaceView, setWorkspaceView] = useState('dashboard');
  const [userRole, setUserRole] = useState('user');
  const savedAnalysisKey = useRef('');
  const activeUserId = useRef(null);
  const pendingGuestClaim = useRef(null);
  const { show } = useToast();

  useEffect(() => {
    document.title = PAGE_TITLES[phase] || 'VitalAI';
  }, [phase]);

  useEffect(() => {
    if (!authEnabled) return undefined;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      activeUserId.current = data.session?.user?.id || null;
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user?.id || null;
      if (activeUserId.current !== nextUserId) {
        const claimed = !activeUserId.current && nextUserId ? pendingGuestClaim.current : null;
        setFile(null);
        setProfile(null);
        setResult(null);
        setExtractedProfile(null);
        savedAnalysisKey.current = '';
        clearSessionState().catch(() => {});
        if (claimed) {
          setFile(claimed.file);
          setProfile(claimed.profile);
          setResult(claimed.result);
          setMode('report');
          setPhase('results');
        }
        pendingGuestClaim.current = null;
      }
      activeUserId.current = nextUserId;
      setSession(nextSession);
      if (!nextSession) setUserRole('user');
      setAuthReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => setUserRole(data?.role || 'user'));
  }, [session?.user?.id]);

  useEffect(() => {
    if (!authReady || session) {
      if (authReady) setStateHydrated(true);
      return;
    }
    loadSessionState()
      .then(({ state }) => {
        if (!state?.result) return;
        setMode(state.mode || 'report');
        setProfile(state.profile || null);
        setResult(state.result);
        setPhase('results');
      })
      .catch(() => {})
      .finally(() => setStateHydrated(true));
  }, [authReady, session]);

  useEffect(() => {
    if (!stateHydrated || !result || session) return;
    saveSessionState({ mode, profile, result }).catch(() => {});
  }, [stateHydrated, mode, profile, result, session]);

  useEffect(() => {
    if (session && phase === 'landing') {
      setWorkspaceView('dashboard');
      setPhase('dashboard');
    }
  }, [session, phase]);

  useEffect(() => {
    if (!session?.user || !result || !authEnabled) return;
    const saveKey = `${session.user.id}:${result._mode}:${result.name}:${result.healthScore}`;
    if (savedAnalysisKey.current === saveKey) return;
    savedAnalysisKey.current = saveKey;

    const saveAnalysis = async () => {
      try {
        let reportId = null;
        if (file && result._mode === 'report') {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const storagePath = `${session.user.id}/${crypto.randomUUID()}-${safeName}`;
          const uploaded = await supabase.storage.from('health-reports').upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });
          if (!uploaded.error) {
            const inserted = await supabase.from('uploaded_reports').insert({
              user_id: session.user.id,
              title: file.name,
              category: 'Blood test',
              storage_path: storagePath,
              mime_type: file.type || 'application/octet-stream',
              size_bytes: file.size,
            }).select('id').single();
            reportId = inserted.data?.id || null;
            if (reportId && Array.isArray(result.bloodMarkers) && result.bloodMarkers.length) {
              await supabase.from('extracted_report_values').insert(result.bloodMarkers.map((marker) => ({
                report_id: reportId,
                user_id: session.user.id,
                metric_type: marker.name,
                value: Number.parseFloat(String(marker.value).replace(/[^0-9.-]/g, '')) || null,
                unit: String(marker.value).replace(/[-+0-9.,\s]/g, '').trim() || null,
                reference_range: marker.normalRange || null,
                confidence: null,
                confirmed: false,
              })));
            }
          }
        }

        const existing = await supabase
          .from('diet_plan_versions')
          .select('version')
          .eq('user_id', session.user.id)
          .order('version', { ascending: false })
          .limit(1);
        const version = (existing.data?.[0]?.version || 0) + 1;
        const saved = await supabase.from('diet_plan_versions').insert({
          user_id: session.user.id,
          version,
          active: true,
          generation_method: result._mode === 'report' ? 'report-analysis' : 'quick-plan',
          provider: 'groq-or-rule-based',
          prompt_version: 'v1',
          health_snapshot: { ...profile, reportId },
          preference_snapshot: { diet: profile?.diet, goals: profile?.goals || [] },
          plan: result,
          reason: 'Initial generation',
        });
        if (saved.error) throw saved.error;
        await supabase.from('notifications').insert({
          user_id: session.user.id,
          title: 'New wellness plan ready',
          message: `Plan version ${version} was generated and saved to your account.`,
          type: 'plan',
        });
        show('Report and plan saved to your account', 'success');
      } catch (_) {
        show('Signed in, but saving this report failed. Please try again.', 'error', 6000);
      }
    };
    saveAnalysis();
  }, [session, result, file, profile, show]);

  const reset = () => {
    setPhase('landing');
    setFile(null);
    setProfile(null);
    setResult(null);
    setExtractedProfile(null);
    clearSessionState().catch(() => {});
  };

  const startReport = () => { setMode('report'); setPhase('upload'); };
  const startQuick = async () => {
    if (!session) {
      show('Sign in to create a diet plan', 'info');
      setShowAuth(true);
      return;
    }
    setMode('quick');
    if (authEnabled) {
      const userId = session.user.id;
      const [healthResponse, profileResponse, goalResponse] = await Promise.all([
        supabase.from('health_profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
        supabase.from('user_goals').select('goal_type').eq('user_id', userId).order('created_at', { ascending: false }).limit(1),
      ]);
      if (healthResponse.error) {
        show(`Could not load Health Setup: ${healthResponse.error.message}`, 'error', 7000);
      } else if (healthResponse.data) {
        const health = healthResponse.data;
        setProfile({
          name: profileResponse.data?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
          age: ageFromDate(health.date_of_birth),
          gender: health.gender === 'Prefer not to say' ? 'Other' : (health.gender || ''),
          weight: health.current_weight_kg || '',
          height: health.height_cm || '',
          diet: health.diet_type === 'Eggetarian' ? 'Eggetarian (Veg + Eggs)' : (health.diet_type || ''),
          activity: activityForPlan[health.activity_level] || health.activity_level || '',
          goals: goalResponse.data?.[0]?.goal_type ? [goalResponse.data[0].goal_type] : [],
          conditions: Array.isArray(health.conditions) ? health.conditions.join(', ') : (health.conditions || ''),
        });
        show('Saved Health Setup loaded', 'success');
      }
    }
    setPhase('quickProfile');
  };
  const startDemo = async () => {
    setMode('report');
    setPhase('loading');
    try {
      setResult(await demoPlan());
      setPhase('results');
    } catch (_) {
      show('Could not load demo', 'error');
      setPhase('landing');
    }
  };

  const reportStepIndex = ({ upload: 0, profile: 1, loading: 2, results: 3 })[phase] ?? -1;
  const quickStepIndex  = ({ quickProfile: 0, loading: 1, results: 2 })[phase] ?? -1;
  const showProgress = (mode === 'report' && reportStepIndex >= 0) || (mode === 'quick' && quickStepIndex >= 0);
  const openWorkspace = (view) => {
    setWorkspaceView(view);
    setPhase('dashboard');
  };
  const navigateWorkspace = (key) => {
    if (key === 'analyze') startReport();
    else if (key === 'diet') startQuick();
    else if (key === 'setup') setPhase('onboarding');
    else if (key === 'admin') setPhase('admin');
    else openWorkspace(key);
  };

  const runReport = async (submittedProfile) => {
    setProfile(submittedProfile);
    setPhase('loading');
    try {
      const data = await analyzeReport(file, submittedProfile);
      const weekly = session ? await weeklyPlan(submittedProfile) : {};
      setResult({ ...data, ...weekly, _mode: 'report', name: submittedProfile.name || '' });
      setPhase('results');
      show('Analysis complete', 'success');
    } catch (err) {
      show(err.message || 'Something went wrong. Please try again.', 'error', 6000);
      setPhase('profile');
    }
  };

  const runQuick = async (submittedProfile) => {
    setProfile(submittedProfile);
    setPhase('loading');
    try {
      const [data, weekly] = await Promise.all([quickPlan(submittedProfile), weeklyPlan(submittedProfile)]);
      setResult({ ...data, ...weekly, _mode: 'quick', name: submittedProfile.name || '' });
      setPhase('results');
      show('Plan ready', 'success');
    } catch (err) {
      show(err.message || 'Something went wrong. Please try again.', 'error', 6000);
      setPhase('quickProfile');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy/80 shadow-[0_8px_30px_rgba(0,0,0,.16)] backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
          <button onClick={reset} className="flex items-center gap-1.5 sm:gap-2 group shrink-0" aria-label="Back to home">
            <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal/15 border border-teal/40 flex items-center justify-center group-hover:bg-teal/25 transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h4l3 8 4-16 3 8h4" />
              </svg>
            </span>
            <div className="flex flex-col leading-none">
              <span className="font-extrabold text-base sm:text-lg tracking-tight">Vital<span className="text-teal">AI</span></span>
              <span className="text-[8px] sm:text-[9px] text-white/35 tracking-widest uppercase font-medium">by Jigar Pandya</span>
            </div>
          </button>

          {showProgress && (
            <div className="hidden sm:block w-72">
              <ProgressBar
                steps={mode === 'report' ? REPORT_STEPS : QUICK_STEPS}
                current={mode === 'report' ? reportStepIndex : quickStepIndex}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <a href="mailto:curiolightforyou@gmail.com" className="hidden sm:block text-sm text-white/60 hover:text-teal px-3 py-1.5">Contact</a>
            {session ? <button className="btn-ghost !px-3 !py-2 text-xs" onClick={async () => { await supabase.auth.signOut(); reset(); }}>Sign out</button>
              : <button className="btn-ghost !px-3 !py-2 text-xs" onClick={() => setShowAuth(true)}>Sign in</button>}
          </div>
        </div>
        {session && (
          <nav className="mx-auto max-w-6xl px-4 pb-3 sm:px-6" aria-label="User workspace">
            <label className="sr-only" htmlFor="mobile-workspace-nav">Workspace page</label>
            <select id="mobile-workspace-nav" className="input sm:hidden" value={phase === 'dashboard' ? workspaceView : phase} onChange={(event) => navigateWorkspace(event.target.value)}>
              {[...USER_NAV, ...(userRole === 'admin' ? [['admin', 'Admin']] : [])].map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <div className="hidden flex-wrap gap-1 sm:flex">
            {[...USER_NAV, ...(userRole === 'admin' ? [['admin', 'Admin']] : [])].map(([key, label]) => (
              <button
                key={key}
                onClick={() => navigateWorkspace(key)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  (phase === 'dashboard' && workspaceView === key) || (key === 'analyze' && phase === 'upload') || (key === 'diet' && phase === 'quickProfile') || (key === 'setup' && phase === 'onboarding') || (key === 'admin' && phase === 'admin')
                    ? 'bg-blue-500/15 text-blue-300'
                    : 'text-white/55 hover:bg-white/5 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <Suspense fallback={<div className="card p-10 text-center text-white/60">Loading workspace…</div>}>
          {phase === 'landing' && (
            <Landing onStartReport={startReport} onStartQuick={startQuick} onDemo={startDemo} />
          )}
          {phase === 'dashboard' && session && (
            <UserDashboard
              session={session}
              view={workspaceView}
              onAnalyze={startReport}
              onOpenPlan={(plan) => {
                setResult(plan);
                setMode(plan._mode || 'report');
                setPhase('results');
              }}
              showToast={show}
            />
          )}
          {phase === 'admin' && session && userRole === 'admin' && (
            <AdminPanel showToast={show} />
          )}
          {phase === 'onboarding' && session && (
            <OnboardingWizard
              session={session}
              showToast={show}
              onComplete={() => startQuick()}
            />
          )}
          {['features', 'how', 'bmi', 'sample', 'about', 'contact', 'faq', 'privacy', 'terms', 'disclaimer'].includes(phase) && (
            <PublicInfo page={phase} onBack={() => setPhase(session ? 'dashboard' : 'landing')} />
          )}

          {phase === 'upload' && (
            <Uploader
              file={file}
              onFileSelected={(f) => { setFile(f); setExtractedProfile(null); }}
              onNext={async () => {
                if (file) {
                  setExtracting(true);
                  try {
                    const { extracted } = await extractProfile(file);
                    if (extracted && Object.keys(extracted).length > 0) {
                      setExtractedProfile(extracted);
                      show('Pre-filled details from your report', 'success');
                    }
                  } catch (_) { /* silent — user fills manually */ }
                  setExtracting(false);
                }
                setPhase('profile');
              }}
              onBack={reset}
              extracting={extracting}
            />
          )}
          {phase === 'profile' && (
            <UserForm
              initial={profile || extractedProfile}
              onSubmit={runReport}
              onBack={() => setPhase('upload')}
              submitLabel="Analyze Now"
            />
          )}
          {phase === 'quickProfile' && (
            <UserForm
              initial={profile}
              onSubmit={runQuick}
              onBack={reset}
              submitLabel="Generate Plan"
              title="Quick Plan · Tell us about you"
              subtitle="We'll build a BMI-based diet and exercise plan from your profile alone — no report needed."
            />
          )}
          {phase === 'loading' && <LoadingScreen />}
          {phase === 'results' && result && (
            <ResultDashboard
              data={result}
              hideBloodTab={result._mode === 'quick'}
              onReset={reset}
              isAuthenticated={Boolean(session) || Boolean(result._demo)}
              onRequireAuth={() => {
                pendingGuestClaim.current = { file, profile, result };
                setShowAuth(true);
              }}
            />
          )}
          </Suspense>
        </div>
      </main>

      <footer className="mt-8 border-t border-white/10 bg-navy/35">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 flex flex-col items-center sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-center sm:text-left">
          <div className="text-white/60">
            Designed &amp; Developed by{' '}
            <span className="text-white font-semibold">Jigar Pandya</span>
          </div>
          <div className="hidden sm:block"><StatsBadge refreshKey={phase} /></div>
          <div className="flex items-center gap-2 text-white/60">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal shrink-0"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <a href="mailto:curiolightforyou@gmail.com" className="hover:text-teal transition break-all">
              curiolightforyou@gmail.com
            </a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-5 text-[10px] sm:text-[11px] text-white/40 text-center sm:text-left">
          VitalAI is not a substitute for professional medical advice. Always consult a qualified healthcare provider.
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-4 px-4 pb-5 text-xs text-white/45 sm:justify-start sm:px-6">
          {['features', 'how', 'bmi', 'sample', 'about', 'contact', 'faq', 'privacy', 'terms', 'disclaimer'].map((page) => <button key={page} onClick={() => setPhase(page)} className="capitalize hover:text-blue-300">{page}</button>)}
        </div>
      </footer>
      {showAuth && <AuthPanel
        onClose={() => {
          pendingGuestClaim.current = null;
          setShowAuth(false);
        }}
        onSignedIn={() => {
          setShowAuth(false);
          show(pendingGuestClaim.current ? 'Signed in — report attached to your account' : 'Signed in', 'success');
        }}
      />}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}

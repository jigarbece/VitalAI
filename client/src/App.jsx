import React, { useState } from 'react';
import Landing from './components/Landing.jsx';
import Uploader from './components/Uploader.jsx';
import UserForm from './components/UserForm.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import ResultDashboard from './components/ResultDashboard.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import StatsBadge from './components/StatsBadge.jsx';
import { ToastProvider, useToast } from './toast.jsx';
import { analyzeReport, quickPlan } from './api.js';

// Phases:
//   landing → upload → profile → loading → results       (report flow)
//   landing → quickProfile → loading → results            (quick flow, BMI-only)
//   contact (modal-like page)
const REPORT_STEPS = ['Upload', 'Profile', 'Analyzing', 'Results'];
const QUICK_STEPS = ['Profile', 'Analyzing', 'Results'];

function AppShell() {
  const [phase, setPhase] = useState('landing');
  const [mode, setMode] = useState('report'); // 'report' | 'quick'
  const [file, setFile] = useState(null);
  const [profile, setProfile] = useState(null);
  const [result, setResult] = useState(null);
  const { show } = useToast();

  const reset = () => {
    setPhase('landing');
    setFile(null);
    setProfile(null);
    setResult(null);
  };

  const startReport = () => { setMode('report'); setPhase('upload'); };
  const startQuick  = () => { setMode('quick');  setPhase('quickProfile'); };

  const reportStepIndex = ({ upload: 0, profile: 1, loading: 2, results: 3 })[phase] ?? -1;
  const quickStepIndex  = ({ quickProfile: 0, loading: 1, results: 2 })[phase] ?? -1;
  const showProgress = (mode === 'report' && reportStepIndex >= 0) || (mode === 'quick' && quickStepIndex >= 0);

  const runReport = async (submittedProfile) => {
    setProfile(submittedProfile);
    setPhase('loading');
    try {
      const data = await analyzeReport(file, submittedProfile);
      setResult({ ...data, _mode: 'report' });
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
      const data = await quickPlan(submittedProfile);
      setResult({ ...data, _mode: 'quick' });
      setPhase('results');
      show('Plan ready', 'success');
    } catch (err) {
      show(err.message || 'Something went wrong. Please try again.', 'error', 6000);
      setPhase('quickProfile');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/5 backdrop-blur-md bg-navy/60 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <button onClick={reset} className="flex items-center gap-2 group shrink-0" aria-label="Back to home">
            <span className="w-9 h-9 rounded-xl bg-teal/15 border border-teal/40 flex items-center justify-center group-hover:bg-teal/25 transition">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h4l3 8 4-16 3 8h4" />
              </svg>
            </span>
            <span className="font-extrabold text-lg tracking-tight">Vital<span className="text-teal">AI</span></span>
          </button>

          {showProgress && (
            <div className="hidden sm:block w-72">
              <ProgressBar
                steps={mode === 'report' ? REPORT_STEPS : QUICK_STEPS}
                current={mode === 'report' ? reportStepIndex : quickStepIndex}
              />
            </div>
          )}

          <a
            href="mailto:curiolightforyou@gmail.com"
            className="text-sm text-white/70 hover:text-teal px-3 py-1.5 rounded-lg hover:bg-white/5 transition shrink-0"
          >
            Contact
          </a>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-10">
          {phase === 'landing' && (
            <Landing onStartReport={startReport} onStartQuick={startQuick} />
          )}

          {phase === 'upload' && (
            <Uploader
              file={file}
              onFileSelected={setFile}
              onNext={() => setPhase('profile')}
              onBack={reset}
            />
          )}
          {phase === 'profile' && (
            <UserForm
              initial={profile}
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
            />
          )}
        </div>
      </main>

      <footer className="border-t border-white/10 mt-8">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="text-white/60">
            Designed &amp; Developed by{' '}
            <span className="text-white font-semibold">Jigar Pandya</span>
          </div>
          <StatsBadge refreshKey={phase} />
          <div className="flex items-center gap-2 text-white/60">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <a href="mailto:curiolightforyou@gmail.com" className="hover:text-teal transition">
              curiolightforyou@gmail.com
            </a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 pb-6 text-[11px] text-white/40 text-center sm:text-left">
          VitalAI is not a substitute for professional medical advice. Always consult a qualified healthcare provider.
        </div>
      </footer>
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

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Upload, FileText, TrendingUp,
  ShieldCheck, Menu, X, RotateCcw, AlertTriangle,
} from 'lucide-react';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { ErrorBoundary }  from './components/ErrorBoundary';
import AuthGate           from './components/AuthGate';
import Dashboard          from './components/Dashboard';
import FileParser         from './components/FileParser';
import PayslipAnalyzer    from './components/PayslipAnalyzer';
import InvestmentTracker  from './components/InvestmentTracker';
import SystemConsole      from './components/SystemConsole';
import useFinanceStore    from './store/financeStore';
import { runSystemHealthCheck } from './utils/selfTest';

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard',   label: 'לוח בקרה',    icon: LayoutDashboard, component: Dashboard },
  { id: 'files',       label: 'טעינת קבצים', icon: Upload,          component: FileParser },
  { id: 'payslip',     label: 'תלוש שכר',    icon: FileText,        component: PayslipAnalyzer },
  { id: 'investments', label: 'השקעות',       icon: TrendingUp,      component: InvestmentTracker },
];

// ─── Reset confirmation modal ─────────────────────────────────────────────────
function ResetModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-red-900/40 rounded-full">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
        </div>
        <h2 className="text-lg font-bold text-white mb-2">איפוס כל הנתונים</h2>
        <p className="text-sm text-slate-400 mb-6">
          פעולה זו תמחק את כל העסקאות, תלושי השכר וההשקעות שהוזנו.
          <br />
          <span className="text-red-400 font-medium">לא ניתן לשחזר לאחר האיפוס.</span>
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
          >
            אפס הכל
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── App shell ────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab,    setActiveTab]    = useState('dashboard');
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [showReset,    setShowReset]    = useState(false);

  const addLog          = useFinanceStore(s => s.addLog);
  const setSystemHealth = useFinanceStore(s => s.setSystemHealth);
  const systemHealth    = useFinanceStore(s => s.systemHealth);
  const resetAll        = useFinanceStore(s => s.resetAll);

  useEffect(() => {
    runSystemHealthCheck(addLog, setSystemHealth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = () => {
    resetAll();
    setShowReset(false);
    setActiveTab('files');
    addLog('> ♻ כל הנתונים אופסו — מוכן להזנה חדשה', 'warning');
  };

  const activeTabData   = TABS.find(t => t.id === activeTab) || TABS[0];
  const ActiveComponent = activeTabData.component;

  const statusDot = {
    ok:      'bg-emerald-500 glow-green',
    warning: 'bg-amber-500',
    error:   'bg-red-500',
    idle:    'bg-slate-500 animate-pulse',
  }[systemHealth.status] ?? 'bg-slate-500';

  return (
    <>
      {/* ── Signed-out: show auth gate ────────────────────────────────────── */}
      <SignedOut>
        <AuthGate />
      </SignedOut>

      {/* ── Signed-in: show full app ──────────────────────────────────────── */}
      <SignedIn>
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* ── Reset modal ────────────────────────────────────────────────────── */}
      {showReset && (
        <ResetModal
          onConfirm={handleReset}
          onCancel={() => setShowReset(false)}
        />
      )}

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <header className="h-14 bg-slate-900/80 border-b border-slate-800 backdrop-blur-sm
                         flex items-center justify-between px-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-600 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-white leading-none">ניהול פיננסי</h1>
            <p className="text-xs text-slate-400 leading-none mt-0.5">מקור אמת אחד</p>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {/* Health indicator */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className={`w-2 h-2 rounded-full ${statusDot}`} />
            <span className="hidden sm:inline">
              {systemHealth.status === 'ok'      ? 'מערכת תקינה'
               : systemHealth.status === 'warning' ? 'אזהרות'
               : systemHealth.status === 'error'   ? 'שגיאות'
               : 'מאתחל...'}
            </span>
          </div>

          {/* User avatar (Clerk) */}
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-7 h-7',
                userButtonPopoverCard: 'bg-slate-900 border border-slate-700',
                userButtonPopoverActionButton: 'text-slate-200 hover:bg-slate-800',
                userButtonPopoverActionButtonText: 'text-slate-200',
              },
            }}
          />

          {/* Reset button */}
          <button
            onClick={() => setShowReset(true)}
            title="איפוס כל הנתונים"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs
                       text-slate-400 hover:text-red-300 hover:bg-red-900/30
                       border border-slate-700/50 hover:border-red-700/50
                       transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">איפוס</span>
          </button>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-slate-400 hover:text-slate-200"
            onClick={() => setSidebarOpen(v => !v)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-black/60" onClick={() => setSidebarOpen(false)}>
          <nav
            className="absolute top-14 right-0 w-64 bg-slate-900 border-l border-slate-800 h-full p-4 space-y-1"
            onClick={e => e.stopPropagation()}
          >
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => { setShowReset(true); setSidebarOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                           text-red-400 hover:bg-red-900/20 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                איפוס כל הנתונים
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center gap-3">
            {React.createElement(activeTabData.icon, { className: 'w-5 h-5 text-indigo-400' })}
            <h2 className="text-lg font-bold text-white">{activeTabData.label}</h2>
          </div>

          <ErrorBoundary componentName={activeTabData.label}>
            <ActiveComponent />
          </ErrorBoundary>

          <ErrorBoundary componentName="System Console">
            <SystemConsole />
          </ErrorBoundary>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-3 px-4 text-center text-xs text-slate-600">
        ניהול פיננסי — מקור אמת אחד · כל הנתונים מעובדים מקומית בדפדפן בלבד
      </footer>
    </div>
      </SignedIn>
    </>
  );
}

import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { ShieldCheck, Lock, BarChart2, FileText, TrendingUp } from 'lucide-react';

const FEATURES = [
  { icon: BarChart2,  label: 'לוח בקרה פיננסי',          sub: 'תזרים, הוצאות ומאזן בזמן אמת' },
  { icon: FileText,   label: 'ניתוח תלושי שכר',           sub: 'זיהוי חריגות בפנסיה וקרן השתלמות' },
  { icon: TrendingUp, label: 'מעקב השקעות',               sub: 'מחשבון ריבית דריבית ויעדים' },
  { icon: Lock,       label: 'נתונים פרטיים לחלוטין',     sub: 'עיבוד מקומי בדפדפן בלבד' },
];

// Dark-mode appearance overrides for Clerk's SignIn component
const CLERK_APPEARANCE = {
  variables: {
    colorPrimary:        '#6366f1',
    colorBackground:     '#0f172a',
    colorInputBackground:'#1e293b',
    colorInputText:      '#e2e8f0',
    colorText:           '#e2e8f0',
    colorTextSecondary:  '#94a3b8',
    colorDanger:         '#ef4444',
    borderRadius:        '0.75rem',
    fontFamily:          "'Heebo', Arial, sans-serif",
  },
  elements: {
    card:             'bg-slate-900 border border-slate-700/60 shadow-2xl',
    headerTitle:      'text-white font-bold',
    headerSubtitle:   'text-slate-400',
    formButtonPrimary:'bg-indigo-600 hover:bg-indigo-500 transition-colors',
    footerActionLink: 'text-indigo-400 hover:text-indigo-300',
    dividerLine:      'bg-slate-700',
    dividerText:      'text-slate-500',
    socialButtonsBlockButton:
      'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors',
    formFieldInput:
      'bg-slate-800 border-slate-600 text-slate-100 focus:border-indigo-500 focus:ring-indigo-500/20',
    formFieldLabel:   'text-slate-300',
    identityPreviewText: 'text-slate-300',
  },
};

export default function AuthGate() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row" dir="rtl">
      {/* ── Right panel: branding ────────────────────────────────────────── */}
      <div className="lg:flex-1 flex flex-col justify-center px-8 py-12 lg:px-16
                      bg-gradient-to-bl from-indigo-950/50 via-slate-950 to-slate-950
                      border-b lg:border-b-0 lg:border-l border-slate-800">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2.5 bg-indigo-600 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-none">ניהול פיננסי</h1>
            <p className="text-xs text-slate-400 mt-0.5">מקור אמת אחד</p>
          </div>
        </div>

        <h2 className="text-3xl font-extrabold text-white mb-3 leading-tight">
          השלט רחוק <br />
          <span className="text-indigo-400">לכלכלה האישית שלך</span>
        </h2>
        <p className="text-slate-400 mb-10 text-sm leading-relaxed max-w-sm">
          נתח תנועות בנק, בדוק תלושי שכר וזהה חריגות בהפרשות — הכל מעובד מקומית, ללא שרת.
        </p>

        <div className="space-y-4">
          {FEATURES.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="p-1.5 bg-indigo-900/50 rounded-lg mt-0.5 shrink-0">
                <Icon className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">{label}</p>
                <p className="text-xs text-slate-500">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Left panel: Clerk SignIn ─────────────────────────────────────── */}
      <div className="flex items-center justify-center px-6 py-12 lg:px-16 lg:w-[480px]">
        <div className="w-full max-w-sm">
          <p className="text-center text-slate-400 text-sm mb-6">
            התחבר או צור חשבון חדש
          </p>
          <SignIn
            routing="hash"
            appearance={CLERK_APPEARANCE}
            fallbackRedirectUrl="/"
          />
        </div>
      </div>
    </div>
  );
}

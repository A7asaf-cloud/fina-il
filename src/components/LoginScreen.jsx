import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import {
  getStoredCredentials, saveCredentials,
  verifyCredentials, startSession,
} from '../utils/auth';

function InputField({ label, type, value, onChange, placeholder, show, onToggleShow }) {
  const isPassword = type === 'password';
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1.5 font-medium">{label}</label>
      <div className="relative">
        <input
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={isPassword ? 'current-password' : 'username'}
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3
                     text-slate-100 placeholder-slate-500 text-sm
                     focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
                     transition-all"
        />
        {isPassword && (
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function LoginScreen({ onLogin }) {
  const isFirstRun = !getStoredCredentials();

  const [mode,        setMode]        = useState(isFirstRun ? 'register' : 'login');
  const [username,    setUsername]    = useState('');
  const [password,    setPassword]    = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) { setError('נא להזין שם משתמש'); return; }
    if (!password)        { setError('נא להזין סיסמא');    return; }

    setLoading(true);
    try {
      if (mode === 'register') {
        if (password.length < 6) {
          setError('הסיסמא חייבת להכיל לפחות 6 תווים');
          return;
        }
        if (password !== confirmPass) {
          setError('הסיסמאות אינן תואמות');
          return;
        }
        await saveCredentials(username.trim(), password);
        startSession();
        onLogin(username.trim());
      } else {
        const ok = await verifyCredentials(username.trim(), password);
        if (!ok) {
          setError('שם משתמש או סיסמא שגויים');
          return;
        }
        startSession();
        onLogin(username.trim());
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4" dir="rtl">
      {/* Card */}
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-900/50">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">ניהול פיננסי</h1>
          <p className="text-slate-400 text-sm mt-1">מקור אמת אחד</p>
        </div>

        {/* Form card */}
        <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-1">
            {mode === 'login' ? 'התחבר לחשבון' : 'יצירת חשבון חדש'}
          </h2>
          <p className="text-slate-500 text-xs mb-6">
            {mode === 'login'
              ? 'הכנס את הפרטים שלך כדי להמשיך'
              : 'הגדר שם משתמש וסיסמא — מאוחסנים מקומית בלבד'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              label="שם משתמש"
              type="text"
              value={username}
              onChange={setUsername}
              placeholder="הכנס שם משתמש"
            />

            <InputField
              label="סיסמא"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="לפחות 6 תווים"
              show={showPass}
              onToggleShow={() => setShowPass(v => !v)}
            />

            {mode === 'register' && (
              <InputField
                label="אימות סיסמא"
                type="password"
                value={confirmPass}
                onChange={setConfirmPass}
                placeholder="הכנס שוב את הסיסמא"
                show={showPass}
                onToggleShow={() => setShowPass(v => !v)}
              />
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                         bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800
                         text-white font-semibold text-sm transition-colors"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : mode === 'login'
                  ? <><LogIn  className="w-4 h-4" /> כניסה</>
                  : <><UserPlus className="w-4 h-4" /> צור חשבון</>
              }
            </button>
          </form>

          {/* Toggle mode */}
          {!isFirstRun && (
            <p className="text-center text-slate-500 text-xs mt-5">
              {mode === 'login' ? 'רוצה לאפס חשבון?' : 'יש לך כבר חשבון?'}
              {' '}
              <button
                onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
                className="text-indigo-400 hover:text-indigo-300 underline transition-colors"
              >
                {mode === 'login' ? 'צור חדש' : 'חזור לכניסה'}
              </button>
            </p>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          הנתונים מעובדים מקומית בדפדפן בלבד · אין שרת
        </p>
      </div>
    </div>
  );
}

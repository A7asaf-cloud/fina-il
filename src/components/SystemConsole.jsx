import React, { useRef, useEffect, useState } from 'react';
import { Terminal, Trash2, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import useFinanceStore from '../store/financeStore';

const LEVEL_STYLES = {
  info:    { text: 'text-slate-300',  icon: <Info        className="w-3 h-3 text-slate-400 shrink-0" /> },
  success: { text: 'text-emerald-400', icon: <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> },
  warning: { text: 'text-amber-400',  icon: <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" /> },
  error:   { text: 'text-red-400',    icon: <XCircle      className="w-3 h-3 text-red-400 shrink-0" /> },
};

const STATUS_CONFIG = {
  ok:      { label: 'תקין',     bg: 'bg-emerald-500', dot: 'bg-emerald-400 glow-green' },
  warning: { label: 'אזהרות',   bg: 'bg-amber-500',   dot: 'bg-amber-400' },
  error:   { label: 'שגיאות',   bg: 'bg-red-500',     dot: 'bg-red-400' },
  idle:    { label: 'ממתין',    bg: 'bg-slate-600',   dot: 'bg-slate-400' },
};

export default function SystemConsole() {
  const logs         = useFinanceStore(s => s.logs);
  const clearLogs    = useFinanceStore(s => s.clearLogs);
  const systemHealth = useFinanceStore(s => s.systemHealth);
  const [collapsed, setCollapsed] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!collapsed && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, collapsed]);

  const status = STATUS_CONFIG[systemHealth.status] || STATUS_CONFIG.idle;

  return (
    <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-slate-800/60 cursor-pointer select-none"
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-slate-200">יומן פעילות מערכת</span>
          <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
            {logs.length} רשומות
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Health badge */}
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${status.dot}`} />
            <span className="text-xs text-slate-400">
              {status.label}
              {systemHealth.lastCheck && ` — ${systemHealth.lastCheck}`}
            </span>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); clearLogs(); }}
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
            title="נקה לוג"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {collapsed
            ? <ChevronDown className="w-4 h-4 text-slate-400" />
            : <ChevronUp   className="w-4 h-4 text-slate-400" />
          }
        </div>
      </div>

      {/* Health test results */}
      {!collapsed && systemHealth.tests.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-3 pb-0">
          {systemHealth.tests.map((t, i) => (
            <span key={i} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full
              ${t.status === 'pass' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/40'
              : t.status === 'warn' ? 'bg-amber-900/50 text-amber-300 border border-amber-700/40'
              : 'bg-red-900/50 text-red-300 border border-red-700/40'}`}
            >
              {t.status === 'pass' ? '✓' : t.status === 'warn' ? '⚠' : '✗'} {t.name}
            </span>
          ))}
        </div>
      )}

      {/* Log entries */}
      {!collapsed && (
        <div className="h-64 overflow-y-auto p-4 font-mono text-xs space-y-1 bg-slate-950/40">
          {logs.length === 0 ? (
            <p className="text-slate-600 italic">אין רשומות לוג...</p>
          ) : (
            logs.map(entry => {
              const style = LEVEL_STYLES[entry.level] || LEVEL_STYLES.info;
              return (
                <div key={entry.id} className={`log-entry flex items-start gap-2 ${style.text}`}>
                  <span className="text-slate-600 shrink-0 tabular-nums">{entry.timestamp}</span>
                  {style.icon}
                  <span className="break-all">{entry.message}</span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}

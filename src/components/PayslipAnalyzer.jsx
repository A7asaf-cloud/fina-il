import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, Info } from 'lucide-react';
import useFinanceStore from '../store/financeStore';
import { detectLeakage } from '../utils/validators';
import { formatILS, formatPercent } from '../utils/formatters';

function LeakageRow({ item }) {
  const deltaAbs = Math.abs(item.delta);
  const icon = item.ok
    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
    : deltaAbs < 200
      ? <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
      : <XCircle      className="w-4 h-4 text-red-400 shrink-0" />;

  return (
    <div className={`flex items-center justify-between py-3 px-4 rounded-lg text-sm
      ${item.ok
        ? 'bg-emerald-900/20 border border-emerald-700/30'
        : deltaAbs < 200
          ? 'bg-amber-900/20 border border-amber-700/30'
          : 'bg-red-900/20 border border-red-700/30'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="font-medium text-slate-200">{item.label}</p>
          <p className="text-xs text-slate-400">שיעור: {item.rate}</p>
        </div>
      </div>
      <div className="text-left space-y-0.5">
        <div className="flex gap-4 text-xs">
          <span className="text-slate-400">צפוי: <span className="text-slate-200 font-medium">{formatILS(item.expected)}</span></span>
          <span className="text-slate-400">בפועל: <span className="text-slate-200 font-medium">{formatILS(item.actual)}</span></span>
        </div>
        <p className={`text-xs font-semibold ${item.ok ? 'text-emerald-400' : item.delta < 0 ? 'text-red-400' : 'text-amber-400'}`}>
          {item.delta >= 0 ? '+' : ''}{formatILS(item.delta)} {item.ok ? '✓' : item.delta < 0 ? '⚠ חסר' : '⚠ עודף'}
        </p>
      </div>
    </div>
  );
}

function PayslipCard({ payslip, isSelected, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-right p-4 rounded-xl border transition-all ${
        isSelected
          ? 'border-indigo-500 bg-indigo-900/20'
          : 'border-slate-700/40 bg-slate-800/40 hover:border-slate-600'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400">{payslip.period || '—'}</span>
        <span className="text-xs text-slate-500">{payslip.employerName || '—'}</span>
      </div>
      <p className="text-lg font-bold text-emerald-400">{formatILS(payslip.gross || 0)}</p>
      <p className="text-xs text-slate-400">ברוטו · נטו {formatILS(payslip.net || 0)}</p>
    </button>
  );
}

export default function PayslipAnalyzer() {
  const payslips = useFinanceStore(s => s.payslips);
  const [selectedId, setSelectedId] = useState(payslips[0]?.id || null);

  const payslip = payslips.find(p => p.id === selectedId) || payslips[0];
  const leakage = payslip ? detectLeakage(payslip) : [];
  const totalLeakage = leakage.reduce((s, l) => s + (l.ok ? 0 : Math.abs(l.delta)), 0);
  const hasProblems  = leakage.some(l => !l.ok);

  if (payslips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <Info className="w-12 h-12 text-slate-600" />
        <p className="text-slate-400">אין תלושי שכר טעונים. טען תלוש CSV בלשונית "טעינת קבצים".</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payslip selector */}
      {payslips.length > 1 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {payslips.map(p => (
            <PayslipCard
              key={p.id}
              payslip={p}
              isSelected={p.id === (selectedId || payslips[0]?.id)}
              onSelect={() => setSelectedId(p.id)}
            />
          ))}
        </div>
      )}

      {payslip && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'שכר ברוטו',         value: payslip.gross,           color: 'text-emerald-400' },
              { label: 'שכר נטו',            value: payslip.net,             color: 'text-blue-400' },
              { label: 'מס הכנסה',           value: payslip.incomeTax,       color: 'text-red-400' },
              { label: 'ביטוח לאומי',        value: payslip.nationalInsurance, color: 'text-orange-400' },
            ].map(item => (
              <div key={item.label} className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                <p className={`text-xl font-bold ${item.color}`}>{formatILS(item.value || 0)}</p>
              </div>
            ))}
          </div>

          {/* Deductions breakdown */}
          <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">פירוט ניכויים</h3>
            <div className="space-y-3">
              {[
                { label: 'פנסיה עובד',           value: payslip.pension,             rate: 6.0 },
                { label: 'קרן השתלמות עובד',     value: payslip.kerenHishtalmut,     rate: 2.5 },
                { label: 'ביטוח בריאות',         value: payslip.healthInsurance,     rate: null },
                { label: 'מס הכנסה',             value: payslip.incomeTax,           rate: null },
                { label: 'ביטוח לאומי',          value: payslip.nationalInsurance,   rate: null },
              ].filter(d => d.value).map(d => (
                <div key={d.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-300">{d.label}</span>
                    {d.rate && (
                      <span className="text-xs text-slate-500 bg-slate-700/60 px-1.5 py-0.5 rounded">
                        {d.rate}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-slate-700 rounded-full h-1.5 hidden md:block">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, (d.value / payslip.gross) * 100 * 3)}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-red-400 tabular-nums min-w-[80px] text-left">
                      -{formatILS(d.value)}
                    </span>
                  </div>
                </div>
              ))}

              {/* Employer contributions */}
              {(payslip.employerPension || payslip.employerKeren) && (
                <>
                  <div className="border-t border-slate-700/40 pt-3">
                    <p className="text-xs text-slate-500 mb-2">הפרשות מעסיק (לא מנוכה ממשכורת)</p>
                    {[
                      { label: 'פנסיה מעסיק',          value: payslip.employerPension, rate: 6.5 },
                      { label: 'קרן השתלמות מעסיק',    value: payslip.employerKeren,   rate: 7.5 },
                    ].filter(d => d.value).map(d => (
                      <div key={d.label} className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-300">{d.label}</span>
                          {d.rate && <span className="text-xs text-slate-500 bg-slate-700/60 px-1.5 py-0.5 rounded">{d.rate}%</span>}
                        </div>
                        <span className="text-sm font-semibold text-emerald-400 tabular-nums min-w-[80px] text-left">
                          +{formatILS(d.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Leakage detection */}
          <div className={`border rounded-xl p-4 ${
            hasProblems
              ? 'border-red-700/40 bg-red-900/10'
              : 'border-emerald-700/40 bg-emerald-900/10'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {hasProblems
                  ? <AlertTriangle className="w-5 h-5 text-amber-400" />
                  : <CheckCircle2  className="w-5 h-5 text-emerald-400" />}
                <h3 className="text-sm font-semibold text-slate-200">
                  {hasProblems ? 'זוהו חריגות בהפרשות' : 'כל ההפרשות תקינות'}
                </h3>
              </div>
              {hasProblems && (
                <span className="text-sm font-bold text-red-400">
                  סה"כ חריגה: {formatILS(totalLeakage)}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {leakage.map(item => (
                <LeakageRow key={item.label} item={item} />
              ))}
            </div>

            <p className="text-xs text-slate-500 mt-3">
              * חישוב מבוסס על שיעורים: פנסיה עובד 6%, מעסיק 6.5%, קרן השתלמות עובד 2.5%, מעסיק 7.5%
            </p>
          </div>
        </>
      )}
    </div>
  );
}

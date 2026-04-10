import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  PiggyBank, TrendingUp, Plus, Trash2, Edit2, Check, X,
  AlertTriangle, CheckCircle2, Info, ChevronDown, ChevronUp,
} from 'lucide-react';
import useFinanceStore from '../store/financeStore';
import { formatILS, formatPercent } from '../utils/formatters';
import { detectLeakage } from '../utils/validators';

// ─── Constants ────────────────────────────────────────────────────────────────
const PENSION_EMP_RATE   = 6.0;
const PENSION_EMR_RATE   = 6.5;
const KEREN_EMP_RATE     = 2.5;
const KEREN_EMR_RATE     = 7.5;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-xs shadow-xl" dir="rtl">
      {label && <p className="text-slate-400 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {formatILS(p.value)}
        </p>
      ))}
    </div>
  );
};

// ─── Manual entry row ─────────────────────────────────────────────────────────
const ENTRY_TYPES = [
  { value: 'pension_emp',   label: 'פנסיה עובד',           color: 'bg-indigo-500',  text: 'text-indigo-400' },
  { value: 'pension_emr',   label: 'פנסיה מעסיק',          color: 'bg-indigo-300',  text: 'text-indigo-300' },
  { value: 'keren_emp',     label: 'קרן השתלמות עובד',     color: 'bg-emerald-500', text: 'text-emerald-400' },
  { value: 'keren_emr',     label: 'קרן השתלמות מעסיק',    color: 'bg-emerald-300', text: 'text-emerald-300' },
  { value: 'pension_fund',  label: 'יתרת קרן פנסיה',       color: 'bg-violet-500',  text: 'text-violet-400' },
  { value: 'keren_balance', label: 'יתרת קרן השתלמות',     color: 'bg-cyan-500',    text: 'text-cyan-400' },
];

function typeLabel(val) {
  return ENTRY_TYPES.find(t => t.value === val)?.label || val;
}
function typeColor(val) {
  return ENTRY_TYPES.find(t => t.value === val)?.text || 'text-slate-300';
}

function EntryRow({ entry, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState({ ...entry });

  const save = () => { onUpdate(entry.id, draft); setEditing(false); };

  return (
    <tr className="border-b border-slate-700/20 hover:bg-slate-700/10 transition-colors">
      <td className="py-2.5 px-4 text-xs text-slate-400 tabular-nums whitespace-nowrap">
        {editing
          ? <input type="month" value={draft.period}
              onChange={e => setDraft(d => ({ ...d, period: e.target.value }))}
              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 w-32" />
          : entry.period || '—'}
      </td>
      <td className="py-2.5 px-4">
        {editing
          ? <select value={draft.type}
              onChange={e => setDraft(d => ({ ...d, type: e.target.value }))}
              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200">
              {ENTRY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          : <span className={`text-xs font-medium ${typeColor(entry.type)}`}>{typeLabel(entry.type)}</span>}
      </td>
      <td className="py-2.5 px-4 text-sm font-semibold text-white tabular-nums">
        {editing
          ? <input type="number" value={draft.amount}
              onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))}
              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 w-28" />
          : formatILS(entry.amount)}
      </td>
      <td className="py-2.5 px-4 text-xs text-slate-500 max-w-[160px] truncate">
        {editing
          ? <input type="text" value={draft.note || ''}
              onChange={e => setDraft(d => ({ ...d, note: e.target.value }))}
              placeholder="הערה"
              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 w-full" />
          : entry.note || ''}
      </td>
      <td className="py-2.5 px-4">
        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <button onClick={save} className="p-1 text-emerald-400 hover:text-emerald-300"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => setEditing(false)} className="p-1 text-slate-500 hover:text-slate-300"><X className="w-3.5 h-3.5" /></button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="p-1 text-slate-500 hover:text-slate-300"><Edit2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => onDelete(entry.id)} className="p-1 text-slate-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Add entry form ───────────────────────────────────────────────────────────
const EMPTY = { period: '', type: 'pension_emp', amount: '', note: '' };

function AddForm({ onAdd, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const submit = () => {
    if (!form.amount || !form.period) return;
    onAdd({ ...form, amount: parseFloat(form.amount), id: `se-${Date.now()}` });
    setForm(EMPTY);
  };
  return (
    <div className="p-4 bg-slate-900/50 border-b border-slate-700/40">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
        <div>
          <label className="text-xs text-slate-400 block mb-1">תקופה</label>
          <input type="month" value={form.period}
            onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none" />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">סוג</label>
          <select value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none">
            {ENTRY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">סכום (₪)</label>
          <input type="number" placeholder="0" value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none" />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">הערה (אופציונלי)</label>
          <input type="text" placeholder="למשל: הפקדה חריגה" value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={submit} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">הוסף</button>
        <button onClick={onCancel} className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors">בטל</button>
      </div>
    </div>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────
function SumCard({ title, sub, value, color, icon: Icon }) {
  return (
    <div className={`border rounded-xl p-4 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 font-medium">{title}</span>
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <p className="text-xl font-bold text-white tabular-nums">{formatILS(value)}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SavingsTracker() {
  const payslips = useFinanceStore(s => s.payslips);

  // Local state for manual savings entries
  const [entries,     setEntries]     = useState([]);
  const [showForm,    setShowForm]    = useState(false);
  const [showPayslip, setShowPayslip] = useState(true);

  const addEntry    = (e) => setEntries(prev => [...prev, e]);
  const updateEntry = (id, data) => setEntries(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  const deleteEntry = (id) => setEntries(prev => prev.filter(e => e.id !== id));

  // ── Aggregate from payslips ───────────────────────────────────────────────
  const payslipTotals = useMemo(() => {
    return payslips.reduce((acc, p) => ({
      pension_emp: acc.pension_emp + (p.pension          || 0),
      pension_emr: acc.pension_emr + (p.employerPension  || 0),
      keren_emp:   acc.keren_emp   + (p.kerenHishtalmut  || 0),
      keren_emr:   acc.keren_emr   + (p.employerKeren    || 0),
    }), { pension_emp: 0, pension_emr: 0, keren_emp: 0, keren_emr: 0 });
  }, [payslips]);

  // ── Aggregate from manual entries ────────────────────────────────────────
  const manualTotals = useMemo(() => {
    return entries.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + (parseFloat(e.amount) || 0);
      return acc;
    }, {});
  }, [entries]);

  // ── Combined totals ───────────────────────────────────────────────────────
  const totalPensionEmp = (payslipTotals.pension_emp) + (manualTotals.pension_emp || 0);
  const totalPensionEmr = (payslipTotals.pension_emr) + (manualTotals.pension_emr || 0);
  const totalKerenEmp   = (payslipTotals.keren_emp)   + (manualTotals.keren_emp   || 0);
  const totalKerenEmr   = (payslipTotals.keren_emr)   + (manualTotals.keren_emr   || 0);
  const totalPension    = totalPensionEmp + totalPensionEmr;
  const totalKeren      = totalKerenEmp   + totalKerenEmr;
  const pensionBalance  = manualTotals.pension_fund  || 0;
  const kerenBalance    = manualTotals.keren_balance || 0;

  // ── Chart: monthly breakdown from payslips ────────────────────────────────
  const monthlyChart = useMemo(() => {
    const byPeriod = {};
    payslips.forEach(p => {
      const key = p.period || 'לא ידוע';
      if (!byPeriod[key]) byPeriod[key] = { period: key, 'פנסיה עובד': 0, 'פנסיה מעסיק': 0, 'קרן השתלמות עובד': 0, 'קרן השתלמות מעסיק': 0 };
      byPeriod[key]['פנסיה עובד']          += p.pension         || 0;
      byPeriod[key]['פנסיה מעסיק']         += p.employerPension || 0;
      byPeriod[key]['קרן השתלמות עובד']    += p.kerenHishtalmut || 0;
      byPeriod[key]['קרן השתלמות מעסיק']   += p.employerKeren   || 0;
    });
    return Object.values(byPeriod).sort((a, b) => a.period.localeCompare(b.period));
  }, [payslips]);

  // ── Leakage from last payslip ─────────────────────────────────────────────
  const lastPayslip = payslips[payslips.length - 1];
  const leakage     = lastPayslip ? detectLeakage(lastPayslip) : [];
  const hasLeakage  = leakage.some(l => !l.ok);

  return (
    <div className="space-y-6">

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SumCard title="סה״כ הפרשות פנסיה"     sub={`עובד + מעסיק`}       value={totalPension}  color="bg-indigo-900/20 border-indigo-700/30" icon={PiggyBank} />
        <SumCard title="סה״כ קרן השתלמות"       sub={`עובד + מעסיק`}       value={totalKeren}    color="bg-emerald-900/20 border-emerald-700/30" icon={TrendingUp} />
        <SumCard title="יתרת פנסיה (ידנית)"     sub="עדכן ידנית מהדוח"     value={pensionBalance} color="bg-violet-900/20 border-violet-700/30" icon={PiggyBank} />
        <SumCard title="יתרת קרן השתלמות"       sub="עדכן ידנית מהדוח"     value={kerenBalance}   color="bg-cyan-900/20 border-cyan-700/30" icon={TrendingUp} />
      </div>

      {/* ── Breakdown: pension vs keren ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Pension breakdown */}
        <div className="bg-slate-800/60 border border-indigo-700/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <PiggyBank className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-200">פנסיה — פירוט</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: `עובד (${PENSION_EMP_RATE}%)`,  value: totalPensionEmp, bar: 'bg-indigo-500' },
              { label: `מעסיק (${PENSION_EMR_RATE}%)`, value: totalPensionEmr, bar: 'bg-indigo-300' },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-28 shrink-0">{row.label}</span>
                <div className="flex-1 bg-slate-700 rounded-full h-2">
                  <div className={`${row.bar} h-2 rounded-full transition-all`}
                    style={{ width: `${totalPension > 0 ? (row.value / totalPension) * 100 : 0}%` }} />
                </div>
                <span className="text-sm font-semibold text-white tabular-nums min-w-[90px] text-left">
                  {formatILS(row.value)}
                </span>
              </div>
            ))}
            <div className="border-t border-slate-700/40 pt-3 flex justify-between">
              <span className="text-xs text-slate-400">סה״כ הפרשות</span>
              <span className="text-sm font-bold text-indigo-400">{formatILS(totalPension)}</span>
            </div>
          </div>
        </div>

        {/* Keren breakdown */}
        <div className="bg-slate-800/60 border border-emerald-700/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-200">קרן השתלמות — פירוט</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: `עובד (${KEREN_EMP_RATE}%)`,  value: totalKerenEmp, bar: 'bg-emerald-500' },
              { label: `מעסיק (${KEREN_EMR_RATE}%)`, value: totalKerenEmr, bar: 'bg-emerald-300' },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-28 shrink-0">{row.label}</span>
                <div className="flex-1 bg-slate-700 rounded-full h-2">
                  <div className={`${row.bar} h-2 rounded-full transition-all`}
                    style={{ width: `${totalKeren > 0 ? (row.value / totalKeren) * 100 : 0}%` }} />
                </div>
                <span className="text-sm font-semibold text-white tabular-nums min-w-[90px] text-left">
                  {formatILS(row.value)}
                </span>
              </div>
            ))}
            <div className="border-t border-slate-700/40 pt-3 flex justify-between">
              <span className="text-xs text-slate-400">סה״כ הפרשות</span>
              <span className="text-sm font-bold text-emerald-400">{formatILS(totalKeren)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Leakage alert ─────────────────────────────────────────────────── */}
      {lastPayslip && (
        <div className={`border rounded-xl p-4 ${hasLeakage ? 'border-amber-700/40 bg-amber-900/10' : 'border-emerald-700/40 bg-emerald-900/10'}`}>
          <div className="flex items-center gap-2 mb-3">
            {hasLeakage
              ? <AlertTriangle className="w-4 h-4 text-amber-400" />
              : <CheckCircle2  className="w-4 h-4 text-emerald-400" />}
            <h3 className="text-sm font-semibold text-slate-200">
              {hasLeakage ? 'זוהו חריגות בהפרשות — תלוש אחרון' : 'כל ההפרשות תקינות — תלוש אחרון'}
            </h3>
            {lastPayslip.period && (
              <span className="text-xs text-slate-500 mr-auto">{lastPayslip.period}</span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {leakage.map(item => (
              <div key={item.label} className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs
                ${item.ok ? 'bg-emerald-900/20 border border-emerald-700/20' : 'bg-red-900/20 border border-red-700/30'}`}>
                <span className="text-slate-300 font-medium">{item.label}</span>
                <div className="text-left">
                  <span className="text-slate-400">צפוי {formatILS(item.expected)} · </span>
                  <span className="text-slate-200">בפועל {formatILS(item.actual)}</span>
                  {!item.ok && (
                    <span className={`mr-1 font-bold ${item.delta < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                      {' '}({item.delta > 0 ? '+' : ''}{formatILS(item.delta)})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Monthly chart from payslips ────────────────────────────────────── */}
      {monthlyChart.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">הפרשות חודשיות לפי תלושים</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyChart} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `₪${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Bar dataKey="פנסיה עובד"          stackId="a" fill="#6366f1" radius={[0,0,0,0]} />
              <Bar dataKey="פנסיה מעסיק"         stackId="a" fill="#a5b4fc" radius={[0,0,0,0]} />
              <Bar dataKey="קרן השתלמות עובד"    stackId="b" fill="#22c55e" radius={[0,0,0,0]} />
              <Bar dataKey="קרן השתלמות מעסיק"   stackId="b" fill="#86efac" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Payslip source data (collapsible) ─────────────────────────────── */}
      {payslips.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowPayslip(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700/20 transition-colors"
          >
            <span>נתונים מתלושי שכר ({payslips.length} תלושים)</span>
            {showPayslip ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {showPayslip && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-t border-slate-700/40 text-xs text-slate-400">
                    <th className="text-right py-2 px-4 font-medium">תקופה</th>
                    <th className="text-right py-2 px-4 font-medium">ברוטו</th>
                    <th className="text-right py-2 px-4 font-medium">פנסיה עובד</th>
                    <th className="text-right py-2 px-4 font-medium">פנסיה מעסיק</th>
                    <th className="text-right py-2 px-4 font-medium">קרן עובד</th>
                    <th className="text-right py-2 px-4 font-medium">קרן מעסיק</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map(p => (
                    <tr key={p.id} className="border-b border-slate-700/20 hover:bg-slate-700/10">
                      <td className="py-2 px-4 text-slate-300 text-xs">{p.period || '—'}</td>
                      <td className="py-2 px-4 text-slate-200 tabular-nums">{formatILS(p.gross || 0)}</td>
                      <td className="py-2 px-4 text-indigo-400 tabular-nums">{formatILS(p.pension || 0)}</td>
                      <td className="py-2 px-4 text-indigo-300 tabular-nums">{formatILS(p.employerPension || 0)}</td>
                      <td className="py-2 px-4 text-emerald-400 tabular-nums">{formatILS(p.kerenHishtalmut || 0)}</td>
                      <td className="py-2 px-4 text-emerald-300 tabular-nums">{formatILS(p.employerKeren || 0)}</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-slate-700/20 border-t border-slate-600/40 font-semibold text-xs">
                    <td className="py-2 px-4 text-slate-300">סה״כ</td>
                    <td className="py-2 px-4 text-slate-200 tabular-nums">{formatILS(payslips.reduce((s,p) => s+(p.gross||0), 0))}</td>
                    <td className="py-2 px-4 text-indigo-400 tabular-nums">{formatILS(payslipTotals.pension_emp)}</td>
                    <td className="py-2 px-4 text-indigo-300 tabular-nums">{formatILS(payslipTotals.pension_emr)}</td>
                    <td className="py-2 px-4 text-emerald-400 tabular-nums">{formatILS(payslipTotals.keren_emp)}</td>
                    <td className="py-2 px-4 text-emerald-300 tabular-nums">{formatILS(payslipTotals.keren_emr)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Manual entries table ───────────────────────────────────────────── */}
      <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40">
          <h3 className="text-sm font-semibold text-slate-200">הזנה ידנית</h3>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> הוסף רשומה
          </button>
        </div>

        {showForm && <AddForm onAdd={(e) => { addEntry(e); setShowForm(false); }} onCancel={() => setShowForm(false)} />}

        {entries.length === 0 ? (
          <div className="flex items-center gap-2 px-4 py-6 text-slate-500 text-sm">
            <Info className="w-4 h-4 shrink-0" />
            הוסף רשומות ידניות — למשל יתרת קרן השתלמות מדוח שנתי, הפקדה חד פעמית וכו׳
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/40 text-xs text-slate-400">
                  <th className="text-right py-2 px-4 font-medium">תקופה</th>
                  <th className="text-right py-2 px-4 font-medium">סוג</th>
                  <th className="text-right py-2 px-4 font-medium">סכום</th>
                  <th className="text-right py-2 px-4 font-medium">הערה</th>
                  <th className="py-2 px-4" />
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <EntryRow key={e.id} entry={e} onUpdate={updateEntry} onDelete={deleteEntry} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-600 text-center">
        * שיעורי חישוב: פנסיה עובד {PENSION_EMP_RATE}%, מעסיק {PENSION_EMR_RATE}% · קרן השתלמות עובד {KEREN_EMP_RATE}%, מעסיק {KEREN_EMR_RATE}%
      </p>
    </div>
  );
}

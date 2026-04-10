import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import useFinanceStore from '../store/financeStore';
import { formatILS, formatUSD, formatPercent, formatNumber } from '../utils/formatters';

const TYPE_LABELS = { stock: 'מניה', crypto: 'קריפטו', etf: 'ETF', pension: 'פנסיה', bond: 'אגח' };
const TYPE_COLORS = { stock: '#6366f1', crypto: '#f59e0b', etf: '#22c55e', pension: '#06b6d4', bond: '#a855f7' };

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

// Projection calculator: compound growth over N years
function projectGrowth(principal, monthlyContrib, roiPercent, years) {
  const r = roiPercent / 100 / 12;
  const data = [];
  let value = principal;
  for (let m = 0; m <= years * 12; m++) {
    if (m % 12 === 0) {
      data.push({ year: `שנה ${m / 12}`, ערך: Math.round(value) });
    }
    value = value * (1 + r) + monthlyContrib;
  }
  return data;
}

function InvestmentRow({ inv, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState({ ...inv });
  const usdRate = useFinanceStore(s => s.usdRate);

  const valueILS = inv.units * inv.currentPrice * (inv.currency === 'USD' ? usdRate : 1);
  const costILS  = inv.units * inv.buyPrice    * (inv.currency === 'USD' ? usdRate : 1);
  const gainILS  = valueILS - costILS;
  const gainPct  = costILS > 0 ? (gainILS / costILS) * 100 : 0;

  const save = () => {
    onUpdate(inv.id, {
      currentPrice: parseFloat(draft.currentPrice) || inv.currentPrice,
      units:        parseFloat(draft.units)        || inv.units,
    });
    setEditing(false);
  };

  return (
    <tr className="border-b border-slate-700/20 hover:bg-slate-700/10 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: TYPE_COLORS[inv.type] || '#6366f1' }}
          />
          <div>
            <p className="text-sm font-medium text-slate-200">{inv.name}</p>
            <p className="text-xs text-slate-500">{inv.symbol} · {TYPE_LABELS[inv.type] || inv.type}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-slate-300 tabular-nums">
        {editing ? (
          <input
            type="number"
            value={draft.units}
            onChange={e => setDraft(d => ({ ...d, units: e.target.value }))}
            className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200"
          />
        ) : formatNumber(inv.units, inv.units < 1 ? 4 : 2)}
      </td>
      <td className="py-3 px-4 text-sm text-slate-300 tabular-nums">
        {editing ? (
          <input
            type="number"
            value={draft.currentPrice}
            onChange={e => setDraft(d => ({ ...d, currentPrice: e.target.value }))}
            className="w-28 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200"
          />
        ) : inv.currency === 'USD'
          ? `$${formatNumber(inv.currentPrice, 2)}`
          : formatILS(inv.currentPrice)}
      </td>
      <td className="py-3 px-4 text-sm font-semibold tabular-nums text-white">
        {formatILS(valueILS)}
      </td>
      <td className={`py-3 px-4 text-sm font-semibold tabular-nums ${gainILS >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        <div className="flex items-center gap-1">
          {gainILS >= 0
            ? <TrendingUp   className="w-3.5 h-3.5" />
            : <TrendingDown className="w-3.5 h-3.5" />}
          {gainILS >= 0 ? '+' : ''}{formatILS(gainILS)}
          <span className="text-xs opacity-70">({formatPercent(gainPct)})</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <button onClick={save}              className="p-1 text-emerald-400 hover:text-emerald-300"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => setEditing(false)} className="p-1 text-slate-500 hover:text-slate-300"><X className="w-3.5 h-3.5" /></button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="p-1 text-slate-500 hover:text-slate-300"><Edit2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => onDelete(inv.id)} className="p-1 text-slate-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

const EMPTY_INV = { name: '', symbol: '', type: 'stock', units: '', buyPrice: '', currentPrice: '', currency: 'ILS', sector: '' };

export default function InvestmentTracker() {
  const investments    = useFinanceStore(s => s.investments);
  const addInvestment  = useFinanceStore(s => s.addInvestment);
  const updateInvestment = useFinanceStore(s => s.updateInvestment);
  const removeInvestment = useFinanceStore(s => s.removeInvestment);
  const usdRate        = useFinanceStore(s => s.usdRate);
  const getTotalPortfolioValue = useFinanceStore(s => s.getTotalPortfolioValue);
  const getPortfolioGainLoss   = useFinanceStore(s => s.getPortfolioGainLoss);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newInv, setNewInv] = useState(EMPTY_INV);
  const [roiPercent, setRoiPercent]     = useState(8);
  const [monthlyAdd, setMonthlyAdd]     = useState(2000);
  const [projYears, setProjYears]       = useState(20);
  const [goalAmount, setGoalAmount]     = useState(1000000);

  const totalValue = getTotalPortfolioValue();
  const gainLoss   = getPortfolioGainLoss();
  const gainPct    = (totalValue - gainLoss) > 0 ? (gainLoss / (totalValue - gainLoss)) * 100 : 0;
  const goalProgress = Math.min(100, (totalValue / goalAmount) * 100);

  const projectionData = useMemo(
    () => projectGrowth(totalValue, monthlyAdd, roiPercent, projYears),
    [totalValue, monthlyAdd, roiPercent, projYears]
  );

  // Allocation by type for the chart
  const allocationData = useMemo(() => {
    const byType = {};
    investments.forEach(inv => {
      const val = inv.units * inv.currentPrice * (inv.currency === 'USD' ? usdRate : 1);
      byType[inv.type] = (byType[inv.type] || 0) + val;
    });
    return Object.entries(byType).map(([type, value]) => ({
      name: TYPE_LABELS[type] || type,
      value: Math.round(value),
      color: TYPE_COLORS[type] || '#6366f1',
    }));
  }, [investments, usdRate]);

  const handleAddInvestment = () => {
    if (!newInv.name || !newInv.units || !newInv.buyPrice || !newInv.currentPrice) return;
    addInvestment({
      ...newInv,
      units:        parseFloat(newInv.units),
      buyPrice:     parseFloat(newInv.buyPrice),
      currentPrice: parseFloat(newInv.currentPrice),
    });
    setNewInv(EMPTY_INV);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">שווי תיק כולל</p>
          <p className="text-2xl font-bold text-white">{formatILS(totalValue)}</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">רווח / הפסד</p>
          <p className={`text-2xl font-bold ${gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {gainLoss >= 0 ? '+' : ''}{formatILS(gainLoss)}
          </p>
          <p className={`text-xs ${gainLoss >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {formatPercent(gainPct)} על העלות
          </p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">מספר נכסים</p>
          <p className="text-2xl font-bold text-white">{investments.length}</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">התקדמות ליעד</p>
          <p className="text-2xl font-bold text-indigo-400">{goalProgress.toFixed(1)}%</p>
          <div className="mt-1 w-full bg-slate-700 rounded-full h-1.5">
            <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${goalProgress}%` }} />
          </div>
        </div>
      </div>

      {/* Holdings table */}
      <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40">
          <h3 className="text-sm font-semibold text-slate-200">אחזקות תיק</h3>
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> הוסף נכס
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="border-b border-slate-700/40 p-4 bg-slate-900/40">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[
                { key: 'name',         label: 'שם נכס',      type: 'text',   placeholder: 'מניית אפל' },
                { key: 'symbol',       label: 'סימול',       type: 'text',   placeholder: 'AAPL' },
                { key: 'units',        label: 'יחידות',      type: 'number', placeholder: '10' },
                { key: 'buyPrice',     label: 'מחיר קנייה',  type: 'number', placeholder: '500' },
                { key: 'currentPrice', label: 'מחיר נוכחי',  type: 'number', placeholder: '550' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-slate-400 block mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={newInv[f.key]}
                    onChange={e => setNewInv(d => ({ ...d, [f.key]: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-slate-400 block mb-1">סוג</label>
                <select
                  value={newInv.type}
                  onChange={e => setNewInv(d => ({ ...d, type: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">מטבע</label>
                <select
                  value={newInv.currency}
                  onChange={e => setNewInv(d => ({ ...d, currency: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="ILS">₪ שקל</option>
                  <option value="USD">$ דולר</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleAddInvestment} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">
                הוסף
              </button>
              <button onClick={() => setShowAddForm(false)} className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors">
                בטל
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/40 text-xs text-slate-400">
                <th className="text-right py-2 px-4 font-medium">נכס</th>
                <th className="text-right py-2 px-4 font-medium">יחידות</th>
                <th className="text-right py-2 px-4 font-medium">מחיר נוכחי</th>
                <th className="text-right py-2 px-4 font-medium">שווי (₪)</th>
                <th className="text-right py-2 px-4 font-medium">רווח/הפסד</th>
                <th className="py-2 px-4" />
              </tr>
            </thead>
            <tbody>
              {investments.map(inv => (
                <InvestmentRow
                  key={inv.id}
                  inv={inv}
                  onUpdate={updateInvestment}
                  onDelete={removeInvestment}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Projection calculator */}
      <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          מחשבון צמיחת תיק (ריבית דריבית)
        </h3>

        {/* Controls */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'תשואה שנתית (%)',      value: roiPercent, set: setRoiPercent, min: 1, max: 30, step: 0.5 },
            { label: 'הפקדה חודשית (₪)',     value: monthlyAdd, set: setMonthlyAdd, min: 0, max: 20000, step: 500 },
            { label: 'שנות השקעה',            value: projYears,  set: setProjYears,  min: 1, max: 40, step: 1 },
            { label: 'יעד (₪)',               value: goalAmount, set: setGoalAmount, min: 100000, max: 10000000, step: 100000 },
          ].map(ctrl => (
            <div key={ctrl.label}>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>{ctrl.label}</span>
                <span className="font-semibold text-slate-200">
                  {ctrl.label.includes('%') ? `${ctrl.value}%`
                   : ctrl.label.includes('₪') ? formatILS(ctrl.value)
                   : ctrl.value}
                </span>
              </div>
              <input
                type="range"
                min={ctrl.min} max={ctrl.max} step={ctrl.step}
                value={ctrl.value}
                onChange={e => ctrl.set(Number(e.target.value))}
                className="w-full accent-indigo-500 h-1.5"
              />
            </div>
          ))}
        </div>

        {/* Projection summary */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { label: 'שווי צפוי', value: projectionData[projectionData.length - 1]?.ערך || 0, color: 'text-emerald-400' },
            { label: 'סה"כ הפקדות', value: monthlyAdd * projYears * 12, color: 'text-blue-400' },
            { label: 'רווח צפוי', value: (projectionData[projectionData.length - 1]?.ערך || 0) - totalValue - (monthlyAdd * projYears * 12), color: 'text-violet-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-900/40 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-400 mb-1">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{formatILS(s.value)}</p>
            </div>
          ))}
        </div>

        {/* Goal progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>התקדמות ליעד: {formatILS(goalAmount)}</span>
            <span className="font-semibold text-slate-200">{goalProgress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${goalProgress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              style={{ width: `${Math.min(100, goalProgress)}%` }}
            />
          </div>
          {goalProgress < 100 && (
            <p className="text-xs text-slate-500 mt-1">
              חסר {formatILS(goalAmount - totalValue)} ליעד
            </p>
          )}
        </div>

        {/* Projection chart */}
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={projectionData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `₪${(v/1000000).toFixed(1)}M`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="ערך" stroke="#22c55e" strokeWidth={2} fill="url(#projGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

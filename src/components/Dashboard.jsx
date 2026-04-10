import React, { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight, PiggyBank, CreditCard } from 'lucide-react';
import useFinanceStore from '../store/financeStore';
import { formatILS, formatHebrewDate } from '../utils/formatters';

const CATEGORY_COLORS = {
  'הכנסה':      '#22c55e',
  'דיור':       '#6366f1',
  'קניות':      '#f59e0b',
  'תשלומי חובה':'#ef4444',
  'חיסכון':     '#06b6d4',
  'בידור':      '#a855f7',
  'רכב':        '#f97316',
  'בריאות':     '#ec4899',
  'מזון':       '#84cc16',
  'חשבונות':    '#64748b',
  'ביטוח':      '#0ea5e9',
  'כרטיס אשראי':'#d946ef',
};

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#f97316'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-xs shadow-xl" dir="rtl">
      {label && <p className="text-slate-400 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === 'number' ? formatILS(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

function KpiCard({ title, value, sub, icon: Icon, color, trend }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">{title}</span>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
      {(sub || trend !== undefined) && (
        <div className="flex items-center gap-1 text-xs">
          {trend !== undefined && (
            trend >= 0
              ? <TrendingUp   className="w-3.5 h-3.5 text-emerald-400" />
              : <TrendingDown className="w-3.5 h-3.5 text-red-400" />
          )}
          <span className={trend !== undefined
            ? trend >= 0 ? 'text-emerald-400' : 'text-red-400'
            : 'text-slate-400'}>
            {sub}
          </span>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const transactions         = useFinanceStore(s => s.transactions);
  const getMonthlyIncome     = useFinanceStore(s => s.getMonthlyIncome);
  const getMonthlyExpenses   = useFinanceStore(s => s.getMonthlyExpenses);
  const getTotalPortfolioValue = useFinanceStore(s => s.getTotalPortfolioValue);
  const getPortfolioGainLoss = useFinanceStore(s => s.getPortfolioGainLoss);

  const income   = getMonthlyIncome();
  const expenses = getMonthlyExpenses();
  const balance  = income - expenses;
  const portfolio = getTotalPortfolioValue();
  const gainLoss  = getPortfolioGainLoss();

  // ── Monthly cash-flow data ────────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const byMonth = {};
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      if (isNaN(d)) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = { month: key, הכנסות: 0, הוצאות: 0 };
      if (tx.amount > 0) byMonth[key].הכנסות += tx.amount;
      else               byMonth[key].הוצאות += Math.abs(tx.amount);
    });
    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  }, [transactions]);

  // ── Expense by category (pie) ─────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const cats = {};
    transactions.filter(tx => tx.amount < 0).forEach(tx => {
      const cat = tx.category || 'אחר';
      cats[cat] = (cats[cat] || 0) + Math.abs(tx.amount);
    });
    return Object.entries(cats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [transactions]);

  // ── Running balance ───────────────────────────────────────────────────────
  const balanceData = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    let running   = 0;
    return sorted.map(tx => {
      running += tx.amount;
      return { date: formatHebrewDate(tx.date), יתרה: running };
    }).slice(-20);
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="סך הכנסות"  value={formatILS(income)}
          icon={TrendingUp}  color="bg-emerald-600"
          sub="תקופה נוכחית" trend={1}
        />
        <KpiCard
          title="סך הוצאות"  value={formatILS(expenses)}
          icon={CreditCard}  color="bg-red-600"
          sub="תקופה נוכחית" trend={-1}
        />
        <KpiCard
          title="מאזן נטו"   value={formatILS(balance)}
          icon={Wallet}      color={balance >= 0 ? 'bg-indigo-600' : 'bg-orange-600'}
          sub={balance >= 0 ? 'חיובי' : 'גירעון'} trend={balance}
        />
        <KpiCard
          title="תיק השקעות" value={formatILS(portfolio)}
          icon={PiggyBank}   color="bg-violet-600"
          sub={`${gainLoss >= 0 ? '+' : ''}${formatILS(gainLoss)} רווח/הפסד`}
          trend={gainLoss}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly cash-flow bar */}
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
            תזרים מזומנים חודשי
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `₪${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Bar dataKey="הכנסות" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="הוצאות" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense pie */}
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-400" />
            פילוח הוצאות לפי קטגוריה
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={90}
                paddingAngle={3} dataKey="value"
              >
                {categoryData.map((entry, i) => (
                  <Cell
                    key={entry.name}
                    fill={CATEGORY_COLORS[entry.name] || CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                layout="vertical" align="left" verticalAlign="middle"
                wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Running balance area chart */}
      <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-400" />
          מגמת יתרה עוברת ושבה (20 פעולות אחרונות)
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={balanceData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `₪${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone" dataKey="יתרה"
              stroke="#6366f1" strokeWidth={2}
              fill="url(#balGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Recent transactions table */}
      <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/40">
          <h3 className="text-sm font-semibold text-slate-200">עסקאות אחרונות</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/40 text-xs text-slate-400">
                <th className="text-right py-2 px-4 font-medium">תאריך</th>
                <th className="text-right py-2 px-4 font-medium">תיאור</th>
                <th className="text-right py-2 px-4 font-medium">קטגוריה</th>
                <th className="text-left  py-2 px-4 font-medium">סכום</th>
              </tr>
            </thead>
            <tbody>
              {[...transactions]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 10)
                .map(tx => (
                  <tr key={tx.id} className="border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors">
                    <td className="py-2 px-4 text-slate-400 text-xs tabular-nums">
                      {formatHebrewDate(tx.date)}
                    </td>
                    <td className="py-2 px-4 text-slate-200 max-w-[200px] truncate">{tx.description}</td>
                    <td className="py-2 px-4">
                      <span className="text-xs bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded-full">
                        {tx.category || 'כללי'}
                      </span>
                    </td>
                    <td className={`py-2 px-4 text-left font-semibold tabular-nums ${
                      tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {tx.amount >= 0 ? '+' : ''}{formatILS(tx.amount)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

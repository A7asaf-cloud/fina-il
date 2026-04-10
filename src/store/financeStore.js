import { create } from 'zustand';

// ─── Mock seed data ────────────────────────────────────────────────────────────
const MOCK_TRANSACTIONS = [
  { id: 't1',  date: '2024-11-01', description: 'משכורת - חברת הייטק בע"מ',       amount:  15800, type: 'credit', category: 'הכנסה',      source: 'demo' },
  { id: 't2',  date: '2024-11-03', description: 'סופר-פארם',                       amount:  -420,  type: 'debit',  category: 'קניות',       source: 'demo' },
  { id: 't3',  date: '2024-11-05', description: 'ארנונה עיריית תל אביב',           amount:  -680,  type: 'debit',  category: 'תשלומי חובה', source: 'demo' },
  { id: 't4',  date: '2024-11-07', description: 'רמי לוי - קניות',                 amount:  -310,  type: 'debit',  category: 'קניות',       source: 'demo' },
  { id: 't5',  date: '2024-11-10', description: 'ביטוח לאומי',                     amount:  -890,  type: 'debit',  category: 'תשלומי חובה', source: 'demo' },
  { id: 't6',  date: '2024-11-12', description: 'מסעדת אוכל טוב',                  amount:  -185,  type: 'debit',  category: 'מזון',        source: 'demo' },
  { id: 't7',  date: '2024-11-14', description: 'חשמל - חברת חשמל לישראל',        amount:  -540,  type: 'debit',  category: 'חשבונות',     source: 'demo' },
  { id: 't8',  date: '2024-11-15', description: 'העברת כספים - קרן השתלמות',      amount:  -470,  type: 'debit',  category: 'חיסכון',      source: 'demo' },
  { id: 't9',  date: '2024-11-18', description: 'נטפליקס',                         amount:  -55,   type: 'debit',  category: 'בידור',       source: 'demo' },
  { id: 't10', date: '2024-11-20', description: 'תדלוק - פז',                       amount:  -290,  type: 'debit',  category: 'רכב',         source: 'demo' },
  { id: 't11', date: '2024-11-22', description: 'שכר דירה',                        amount: -4500,  type: 'debit',  category: 'דיור',        source: 'demo' },
  { id: 't12', date: '2024-11-25', description: 'החזר מס הכנסה',                   amount:  1200,  type: 'credit', category: 'הכנסה',      source: 'demo' },
  { id: 't13', date: '2024-11-27', description: 'תרופות - בית מרקחת',              amount:  -160,  type: 'debit',  category: 'בריאות',      source: 'demo' },
  { id: 't14', date: '2024-12-01', description: 'משכורת - חברת הייטק בע"מ',       amount:  15800, type: 'credit', category: 'הכנסה',      source: 'demo' },
  { id: 't15', date: '2024-12-03', description: 'ויקטורי - קניות',                 amount:  -380,  type: 'debit',  category: 'קניות',       source: 'demo' },
  { id: 't16', date: '2024-12-05', description: 'ביטוח רכב - מגדל',                amount:  -420,  type: 'debit',  category: 'ביטוח',       source: 'demo' },
  { id: 't17', date: '2024-12-08', description: 'ספוטיפי',                         amount:  -24,   type: 'debit',  category: 'בידור',       source: 'demo' },
  { id: 't18', date: '2024-12-10', description: 'מרכז רפואי - ביקור רופא',         amount:  -250,  type: 'debit',  category: 'בריאות',      source: 'demo' },
  { id: 't19', date: '2024-12-12', description: 'אמזון',                           amount:  -340,  type: 'debit',  category: 'קניות',       source: 'demo' },
  { id: 't20', date: '2024-12-15', description: 'תשלום משכנתא - בנק לאומי',       amount: -3200,  type: 'debit',  category: 'דיור',        source: 'demo' },
];

const MOCK_PAYSLIP = {
  id: 'p1',
  period: '11/2024',
  employerName: 'חברת הייטק בע"מ',
  employeeName: 'ישראל ישראלי',
  gross: 18500,
  net: 13240,
  incomeTax: 2890,
  nationalInsurance: 820,
  healthInsurance: 185,
  pension: 1110,             // employee 6%
  kerenHishtalmut: 463,      // employee 2.5%
  employerPension: 1388,     // employer 7.5%
  employerKeren: 1388,       // employer 7.5%
  travelAllowance: 550,
  source: 'demo',
};

const MOCK_INVESTMENTS = [
  { id: 'i1', name: 'מדד ת"א 125',      type: 'stock',  symbol: 'TA125', units: 42,   buyPrice: 1820, currentPrice: 2085, currency: 'ILS', sector: 'אינדקס' },
  { id: 'i2', name: 'ביטקוין',           type: 'crypto', symbol: 'BTC',   units: 0.08, buyPrice: 148000, currentPrice: 172000, currency: 'ILS', sector: 'קריפטו' },
  { id: 'i3', name: 'S&P 500 ETF',       type: 'etf',    symbol: 'VOO',   units: 8,    buyPrice: 1540, currentPrice: 1720, currency: 'USD', sector: 'אינדקס' },
  { id: 'i4', name: 'אפל',               type: 'stock',  symbol: 'AAPL',  units: 15,   buyPrice: 620,  currentPrice: 695,  currency: 'USD', sector: 'טכנולוגיה' },
  { id: 'i5', name: 'מגנוס - פנסיה',    type: 'pension', symbol: 'MAGN',  units: 1,    buyPrice: 85000, currentPrice: 97400, currency: 'ILS', sector: 'פנסיה' },
];

// ─── Store ─────────────────────────────────────────────────────────────────────
const useFinanceStore = create((set, get) => ({
  // State
  transactions:  MOCK_TRANSACTIONS,
  payslips:      [MOCK_PAYSLIP],
  investments:   MOCK_INVESTMENTS,
  logs:          [],
  systemHealth:  { status: 'idle', lastCheck: null, tests: [] },
  usdRate:       3.72,  // ILS per USD (mock)

  // Transaction actions
  addTransactions: (txs) =>
    set(state => ({ transactions: [...state.transactions, ...txs] })),

  clearTransactions: () => set({ transactions: [] }),

  // Payslip actions
  addPayslip: (p) =>
    set(state => ({ payslips: [...state.payslips, p] })),

  // Investment actions
  addInvestment: (inv) =>
    set(state => ({
      investments: [...state.investments, { ...inv, id: `i${Date.now()}` }],
    })),

  updateInvestment: (id, data) =>
    set(state => ({
      investments: state.investments.map(inv =>
        inv.id === id ? { ...inv, ...data } : inv
      ),
    })),

  removeInvestment: (id) =>
    set(state => ({
      investments: state.investments.filter(inv => inv.id !== id),
    })),

  // Full reset — wipes all user data back to empty slate
  resetAll: () =>
    set({
      transactions: [],
      payslips:     [],
      investments:  [],
      logs:         [],
      systemHealth: { status: 'idle', lastCheck: null, tests: [] },
    }),

  // Log actions
  addLog: (message, level = 'info') =>
    set(state => ({
      logs: [
        ...state.logs.slice(-199),
        {
          id:        `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toLocaleTimeString('he-IL', { hour12: false }),
          message,
          level,  // 'info' | 'success' | 'warning' | 'error'
        },
      ],
    })),

  clearLogs: () => set({ logs: [] }),

  // System health
  setSystemHealth: (health) => set({ systemHealth: health }),

  // Derived helpers (computed on demand)
  getMonthlyIncome: () => {
    const txs = get().transactions;
    return txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  },

  getMonthlyExpenses: () => {
    const txs = get().transactions;
    return Math.abs(txs.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));
  },

  getTotalPortfolioValue: () => {
    const { investments, usdRate } = get();
    return investments.reduce((sum, inv) => {
      const value = inv.units * inv.currentPrice;
      return sum + (inv.currency === 'USD' ? value * usdRate : value);
    }, 0);
  },

  getPortfolioGainLoss: () => {
    const { investments, usdRate } = get();
    return investments.reduce((sum, inv) => {
      const cost    = inv.units * inv.buyPrice;
      const current = inv.units * inv.currentPrice;
      const rate    = inv.currency === 'USD' ? usdRate : 1;
      return sum + (current - cost) * rate;
    }, 0);
  },
}));

export default useFinanceStore;

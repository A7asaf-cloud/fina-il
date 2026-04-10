import { parseIsraeliDate } from './formatters';

// ─── Validation result helpers ────────────────────────────────────────────────
export function ok(data)          { return { valid: true,  data, errors: [] }; }
export function fail(errors, data) { return { valid: false, data, errors }; }

// ─── Transaction validator ────────────────────────────────────────────────────
export function validateTransaction(raw, rowIndex) {
  const errors = [];

  // ── Type checks ──────────────────────────────────────────────────────────
  if (!raw || typeof raw !== 'object') {
    return fail([`שורה ${rowIndex}: נתונים לא תקינים`], raw);
  }

  // ── Date ─────────────────────────────────────────────────────────────────
  const isoDate = parseIsraeliDate(raw.date);
  if (!isoDate) {
    errors.push(`שורה ${rowIndex}: תאריך חסר או לא תקין — "${raw.date}"`);
  } else {
    const d = new Date(isoDate);
    const min = new Date('2000-01-01');
    const max = new Date();
    max.setFullYear(max.getFullYear() + 1);
    if (d < min || d > max) {
      errors.push(`שורה ${rowIndex}: תאריך מחוץ לטווח — ${isoDate}`);
    }
  }

  // ── Description ──────────────────────────────────────────────────────────
  const desc = raw.description || raw.details || raw['תיאור'] || raw['פרטים'] || '';
  if (!desc || String(desc).trim().length === 0) {
    errors.push(`שורה ${rowIndex}: תיאור פעולה חסר`);
  }

  // ── Amount ────────────────────────────────────────────────────────────────
  const amount = parseFloat(
    String(raw.amount || raw.credit || raw.debit || 0).replace(/[,\s₪]/g, '')
  );
  if (isNaN(amount)) {
    errors.push(`שורה ${rowIndex}: סכום לא תקין — "${raw.amount}"`);
  } else if (amount === 0 && !raw._zeroAllowed) {
    errors.push(`שורה ${rowIndex}: סכום אפס — בדוק נתונים`);
  } else if (Math.abs(amount) > 2_000_000) {
    errors.push(`שורה ${rowIndex}: סכום חריג ביותר — ${amount.toLocaleString('he-IL')} ₪`);
  }

  const cleaned = {
    ...raw,
    date:        isoDate || raw.date,
    description: String(desc).trim(),
    amount:      isNaN(amount) ? 0 : amount,
  };

  return errors.length ? fail(errors, cleaned) : ok(cleaned);
}

// ─── Payslip validator ────────────────────────────────────────────────────────
export function validatePayslip(raw) {
  const errors = [];

  const gross = parseFloat(String(raw.gross || 0).replace(/[,\s₪]/g, ''));
  const net   = parseFloat(String(raw.net   || 0).replace(/[,\s₪]/g, ''));

  if (!gross || gross <= 0) errors.push('שכר ברוטו חסר או לא תקין');
  if (!net   || net   <= 0) errors.push('שכר נטו חסר או לא תקין');

  if (gross > 0 && net > 0) {
    if (net > gross) errors.push('שכר נטו גבוה מברוטו — בדוק נתונים');
    if (net < gross * 0.3) errors.push('שכר נטו נמוך מ-30% מהברוטו — בדוק ניכויים');
  }

  const totalDeductions = (raw.incomeTax || 0) + (raw.nationalInsurance || 0) +
                          (raw.healthInsurance || 0) + (raw.pension || 0) +
                          (raw.kerenHishtalmut || 0);

  // Only run consistency check when all major deductions are present.
  // Tolerance is 1500 ₪ to allow for travel allowance, meal allowances, bonuses, etc.
  const hasDeductions = totalDeductions > 0;
  if (hasDeductions && gross > 0 && Math.abs((gross - totalDeductions) - net) > 1500) {
    errors.push('חוסר עקביות: ברוטו - ניכויים ≠ נטו (סטייה > 1,500 ₪) — ייתכן שחסרים ניכויים');
  }

  return errors.length ? fail(errors, { ...raw, gross, net }) : ok({ ...raw, gross, net });
}

// ─── Leakage detection ────────────────────────────────────────────────────────
const PENSION_EMPLOYEE_RATE   = 0.06;
const PENSION_EMPLOYER_RATE   = 0.065;
const KEREN_EMPLOYEE_RATE     = 0.025;
const KEREN_EMPLOYER_RATE     = 0.075;

export function detectLeakage(payslip) {
  const results = [];
  const g = payslip.gross || 0;

  // Pension
  const expectedPensionEmp = g * PENSION_EMPLOYEE_RATE;
  const expectedPensionEmr = g * PENSION_EMPLOYER_RATE;
  const actualPension      = payslip.pension || 0;
  const pensionDelta       = actualPension - expectedPensionEmp;

  results.push({
    label:    'פנסיה עובד',
    expected: expectedPensionEmp,
    actual:   actualPension,
    delta:    pensionDelta,
    ok:       Math.abs(pensionDelta) < 50,
    rate:     `${(PENSION_EMPLOYEE_RATE * 100).toFixed(1)}%`,
  });

  // Employer pension
  const actualEmrPension  = payslip.employerPension || 0;
  const emrPensionDelta   = actualEmrPension - expectedPensionEmr;
  results.push({
    label:    'פנסיה מעסיק',
    expected: expectedPensionEmr,
    actual:   actualEmrPension,
    delta:    emrPensionDelta,
    ok:       Math.abs(emrPensionDelta) < 50,
    rate:     `${(PENSION_EMPLOYER_RATE * 100).toFixed(1)}%`,
  });

  // Keren Hishtalmut employee
  const expectedKerenEmp = g * KEREN_EMPLOYEE_RATE;
  const actualKeren      = payslip.kerenHishtalmut || 0;
  const kerenDelta       = actualKeren - expectedKerenEmp;
  results.push({
    label:    'קרן השתלמות עובד',
    expected: expectedKerenEmp,
    actual:   actualKeren,
    delta:    kerenDelta,
    ok:       Math.abs(kerenDelta) < 30,
    rate:     `${(KEREN_EMPLOYEE_RATE * 100).toFixed(1)}%`,
  });

  // Keren Hishtalmut employer
  const expectedKerenEmr = g * KEREN_EMPLOYER_RATE;
  const actualEmrKeren   = payslip.employerKeren || 0;
  const kerenEmrDelta    = actualEmrKeren - expectedKerenEmr;
  results.push({
    label:    'קרן השתלמות מעסיק',
    expected: expectedKerenEmr,
    actual:   actualEmrKeren,
    delta:    kerenEmrDelta,
    ok:       Math.abs(kerenEmrDelta) < 30,
    rate:     `${(KEREN_EMPLOYER_RATE * 100).toFixed(1)}%`,
  });

  return results;
}

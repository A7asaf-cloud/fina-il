import { parseBankCSV, parsePayslipCSV } from './parsers';
import { validateTransaction, validatePayslip } from './validators';

// ─── Simulated test fixtures ──────────────────────────────────────────────────
const MOCK_BANK_CSV = `תאריך,תיאור פעולה,חובה,זכות,יתרה
01/11/2024,משכורת חברת הייטק,,15800,25800
03/11/2024,סופר-פארם,420,,25380
05/11/2024,ארנונה עיריית תל אביב,680,,24700
10/11/2024,ביטוח לאומי,890,,23810
`;

const MOCK_PAYSLIP_CSV = `שדה,ערך
שכר ברוטו,18500
שכר נטו,13240
מס הכנסה,2890
ביטוח לאומי,820
ביטוח בריאות,185
פנסיה,1110
קרן השתלמות,463
פנסיה מעסיק,1388
קרן השתלמות מעסיק,1388
`;

const MOCK_CORRUPT_CSV = `תאריך,תיאור פעולה,חובה,זכות,יתרה
,שורה פגומה ללא תאריך,100,,
01/13/2024,תאריך לא קיים,50,,
01/11/2024,,200,,
99/99/9999,תאריך עתידי מחוץ לטווח,500,,
`;

// ─── Self-test runner ─────────────────────────────────────────────────────────
export async function runSystemHealthCheck(addLog, setSystemHealth) {
  addLog('═══════════════════════════════════════', 'info');
  addLog('> 🔧 מפעיל בדיקת תקינות מערכת...', 'info');

  const tests   = [];
  const testLog = [];

  const log = (msg, level = 'info') => {
    addLog(msg, level);
    testLog.push({ msg, level });
  };

  // ── Test 1: CSV Parser ────────────────────────────────────────────────────
  try {
    log('> [1/4] בדיקת מנתח CSV בנקאי...', 'info');
    const capturedLogs = [];
    const dummyLog = (m) => capturedLogs.push(m);
    const { valid, invalid } = parseBankCSV(MOCK_BANK_CSV, dummyLog, 'TEST_BANK.csv');

    if (valid.length === 4 && invalid.length === 0) {
      log('> ✓ מנתח CSV: עבר — 4 שורות תקינות', 'success');
      tests.push({ name: 'CSV Parser', status: 'pass', detail: `${valid.length} rows` });
    } else {
      log(`> ⚠ מנתח CSV: תוצאה חלקית — ${valid.length} תקינות, ${invalid.length} שגויות`, 'warning');
      tests.push({ name: 'CSV Parser', status: 'warn', detail: `${valid.length}/${valid.length + invalid.length}` });
    }
  } catch (e) {
    log(`> ✗ מנתח CSV: נכשל — ${e.message}`, 'error');
    tests.push({ name: 'CSV Parser', status: 'fail', detail: e.message });
  }

  // ── Test 2: Validator Engine ──────────────────────────────────────────────
  try {
    log('> [2/4] בדיקת מנוע ולידציה...', 'info');

    const goodTx = { date: '2024-11-01', description: 'בדיקה', amount: 100 };
    const r1 = validateTransaction(goodTx, 1);
    if (!r1.valid) throw new Error('רשומה תקינה נדחתה');

    const badTx = { date: '', description: '', amount: NaN };
    const r2 = validateTransaction(badTx, 2);
    if (r2.valid) throw new Error('רשומה פגומה עברה ולידציה');

    // Provide full deductions so the consistency check has all fields
    const r3 = validatePayslip({
      gross: 18500, net: 13240,
      incomeTax: 2890, nationalInsurance: 820, healthInsurance: 185,
      pension: 1110, kerenHishtalmut: 463,
    });
    if (!r3.valid) throw new Error('תלוש תקין נדחה: ' + r3.errors.join(', '));

    log('> ✓ מנוע ולידציה: עבר — קבלה ודחייה תקינות', 'success');
    tests.push({ name: 'Validator', status: 'pass', detail: '3/3 checks' });
  } catch (e) {
    log(`> ✗ מנוע ולידציה: נכשל — ${e.message}`, 'error');
    tests.push({ name: 'Validator', status: 'fail', detail: e.message });
  }

  // ── Test 3: Fault Tolerance (corrupt data) ────────────────────────────────
  try {
    log('> [3/4] בדיקת עמידות לנתונים פגומים...', 'info');
    const capturedErrors = [];
    const errLog = (m, l) => { if (l === 'error') capturedErrors.push(m); };
    const { valid, invalid } = parseBankCSV(MOCK_CORRUPT_CSV, errLog, 'TEST_CORRUPT.csv');

    if (invalid.length > 0 && valid.length >= 0) {
      log(`> ✓ עמידות: עבר — ${invalid.length} שורות פגומות זוהו ובודדו`, 'success');
      tests.push({ name: 'Fault Tolerance', status: 'pass', detail: `${invalid.length} errors caught` });
    } else {
      log('> ⚠ עמידות: לא אותרו שגיאות בנתונים פגומים', 'warning');
      tests.push({ name: 'Fault Tolerance', status: 'warn', detail: 'no errors detected' });
    }
  } catch (e) {
    log(`> ✗ עמידות: קריסה בעת עיבוד נתונים פגומים — ${e.message}`, 'error');
    tests.push({ name: 'Fault Tolerance', status: 'fail', detail: e.message });
  }

  // ── Test 4: Payslip Parser ────────────────────────────────────────────────
  try {
    log('> [4/4] בדיקת מנתח תלוש שכר...', 'info');
    const dummyLog = () => {};
    const payslip = parsePayslipCSV(MOCK_PAYSLIP_CSV, dummyLog, 'TEST_TLUSH.csv');

    if (payslip && payslip.gross === 18500 && payslip.net === 13240) {
      log('> ✓ מנתח תלוש: עבר — ברוטו ונטו פוענחו בהצלחה', 'success');
      tests.push({ name: 'Payslip Parser', status: 'pass', detail: `gross=18500` });
    } else {
      log('> ⚠ מנתח תלוש: תוצאה חלקית', 'warning');
      tests.push({ name: 'Payslip Parser', status: 'warn', detail: JSON.stringify(payslip) });
    }
  } catch (e) {
    log(`> ✗ מנתח תלוש: נכשל — ${e.message}`, 'error');
    tests.push({ name: 'Payslip Parser', status: 'fail', detail: e.message });
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const passed = tests.filter(t => t.status === 'pass').length;
  const failed = tests.filter(t => t.status === 'fail').length;
  const warns  = tests.filter(t => t.status === 'warn').length;

  log('─────────────────────────────────────────', 'info');
  log(
    `> בדיקת מערכת הסתיימה: ${passed} עברו / ${warns} אזהרות / ${failed} נכשלו`,
    failed > 0 ? 'error' : warns > 0 ? 'warning' : 'success'
  );
  log('═══════════════════════════════════════', 'info');

  setSystemHealth({
    status:    failed > 0 ? 'error' : warns > 0 ? 'warning' : 'ok',
    lastCheck: new Date().toLocaleTimeString('he-IL', { hour12: false }),
    tests,
  });
}

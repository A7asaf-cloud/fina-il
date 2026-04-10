// ─── PDF Parser for Israeli Payslips ──────────────────────────────────────────
// Supports: FRU, Priority, Hilan, Cheshbonaut and similar Israeli payroll PDFs.
// Strategy: extract all text, then scan for known Hebrew labels + adjacent numbers.

import * as pdfjsLib from 'pdfjs-dist';

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// ─── Number extraction helper ─────────────────────────────────────────────────
function toNum(s) {
  if (!s) return 0;
  return parseFloat(String(s).replace(/[,\s₪]/g, '')) || 0;
}

// ─── Extract all text items from PDF ─────────────────────────────────────────
async function extractPDFText(arrayBuffer) {
  const pdf   = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const items = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page    = await pdf.getPage(p);
    const content = await page.getTextContent();
    content.items.forEach(item => {
      const str = item.str.trim();
      if (str) items.push(str);
    });
  }
  return items;
}

// ─── Find a number near a label in the items array ───────────────────────────
function findNear(items, label, windowSize = 6) {
  for (let i = 0; i < items.length; i++) {
    if (items[i].includes(label)) {
      // Search forward
      for (let j = i + 1; j <= Math.min(i + windowSize, items.length - 1); j++) {
        const n = toNum(items[j]);
        if (n > 0) return n;
      }
      // Search backward
      for (let j = i - 1; j >= Math.max(0, i - windowSize); j--) {
        const n = toNum(items[j]);
        if (n > 0) return n;
      }
    }
  }
  return 0;
}

// ─── Scan for number preceded by known payslip codes (Priority/FRU codes) ────
// Israeli payroll line format: [description] [code] [hours] [amount]
// We scan for known deduction codes and grab the last number on that line.
const PAYSLIP_CODE_PATTERNS = {
  pension:           ['35251', 'פנסיה עובד', 'קרן פנסיה'],
  employerPension:   ['35252', 'פנסיה מעסיק'],
  kerenHishtalmut:   ['38191', 'קרן השתלמות עובד', 'השתלמות'],
  employerKeren:     ['38192', 'קרן השתלמות מעסיק'],
  incomeTax:         ['91003', 'מס הכנסה', "מ\"ה"],
  nationalInsurance: ['91001', 'ביטוח לאומי'],
  healthInsurance:   ['92041', 'ביטוח בריאות', 'דמי בריאות'],
};

const GROSS_LABELS = ['ברוטו', 'שכר ברוטו', 'סה"כ ברוטו', 'ברוטו לביטוח', 'ברוטו למס'];
const NET_LABELS   = ['נטו', 'שכר נטו', 'סה"כ לתשלום', 'לתשלום', 'ביחד לתשלום'];

// ─── Main parse function ──────────────────────────────────────────────────────
export async function parsePayslipPDF(arrayBuffer, addLog, fileName) {
  addLog(`> מנתח PDF תלוש שכר: ${fileName}...`, 'info');

  try {
    const items = await extractPDFText(arrayBuffer);
    addLog(`> חולצו ${items.length} שדות טקסט מה-PDF`, 'info');

    const payslip = {
      source: fileName,
      id:     `p-${Date.now()}`,
    };

    // ── Gross ────────────────────────────────────────────────────────────────
    for (const label of GROSS_LABELS) {
      const v = findNear(items, label, 8);
      if (v > 0) { payslip.gross = v; break; }
    }

    // ── Net ──────────────────────────────────────────────────────────────────
    for (const label of NET_LABELS) {
      const v = findNear(items, label, 8);
      if (v > 0) { payslip.net = v; break; }
    }

    // ── Deductions via code lookup ────────────────────────────────────────────
    for (const [field, patterns] of Object.entries(PAYSLIP_CODE_PATTERNS)) {
      for (const pattern of patterns) {
        const v = findNear(items, pattern, 6);
        if (v > 0) { payslip[field] = v; break; }
      }
    }

    // ── Fallback: scan the last summary row (common in FRU/Priority)
    // Format: net ... deductions ... gross  (left-to-right in RTL PDF)
    // The last line usually contains: net | tax | ... | gross
    const numericItems = items.filter(s => /^\d{1,3}(,\d{3})*(\.\d+)?$/.test(s));
    if (numericItems.length >= 3 && !payslip.gross) {
      // Last big number is usually gross
      const nums = numericItems.map(toNum).filter(n => n > 1000).sort((a, b) => b - a);
      if (nums[0]) payslip.gross = nums[0];
      if (nums[1] && nums[1] < nums[0]) payslip.net = nums[1];
    }

    // ── Period (try to find date) ────────────────────────────────────────────
    const dateMatch = items.join(' ').match(/(\d{1,2})[\/\.](\d{4})/);
    if (dateMatch) payslip.period = `${dateMatch[1]}/${dateMatch[2]}`;

    // ── Employer name (first long Hebrew string) ─────────────────────────────
    const hebrewStr = items.find(s => /[\u0590-\u05FF]{4,}/.test(s) && s.length > 6);
    if (hebrewStr) payslip.employerName = hebrewStr;

    // ── Validate ─────────────────────────────────────────────────────────────
    if (!payslip.gross || payslip.gross <= 0) {
      addLog(`> אזהרה: לא ניתן לאתר שכר ברוטו ב-PDF — ${fileName}`, 'warning');
      addLog(`> טיפ: נסה לייצא את התלוש כ-CSV ממערכת השכר`, 'warning');
    } else {
      addLog(`> ✓ PDF פוענח — ברוטו: ${payslip.gross.toLocaleString('he-IL')} ₪, נטו: ${(payslip.net||0).toLocaleString('he-IL')} ₪`, 'success');
    }

    return payslip;
  } catch (err) {
    addLog(`> שגיאה קריטית בפענוח PDF: ${err.message}`, 'error');
    return null;
  }
}

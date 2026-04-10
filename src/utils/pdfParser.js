// ─── PDF Parser for Israeli Payslips ──────────────────────────────────────────
// Supports: FRU, Priority, Hilan, Cheshbonaut and similar Israeli payroll PDFs.
//
// Key challenge: Hebrew text is often garbled (Windows-1255 encoding issues)
// but numeric CODES and NUMBERS remain intact. Strategy:
//   1. Use numeric payroll codes (35251, 91003...) for deduction extraction
//   2. Use summary-row detection for gross/net
//   3. Fall back to Hebrew label search only if the above fails

import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// ─── Number extraction helper ─────────────────────────────────────────────────
function toNum(s) {
  if (!s) return 0;
  // Dates like "03/26" or "12/99" must return 0 — otherwise "03/26" → "0326" → 326
  if (String(s).includes('/')) return 0;
  // Remove commas, spaces, ₪ and any non-numeric suffix (Hebrew chars, ?)
  const cleaned = String(s).replace(/[,\s₪]/g, '').replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}

// ─── Check if item looks like a standalone number ─────────────────────────────
function isStrictNum(s) {
  return /^-?\d{1,3}(,\d{3})*(\.\d+)?$/.test((s || '').trim());
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

// ─── Find number near a Hebrew label (for non-garbled PDFs) ──────────────────
function findNear(items, label, windowSize = 6) {
  for (let i = 0; i < items.length; i++) {
    if (items[i].includes(label)) {
      for (let j = i + 1; j <= Math.min(i + windowSize, items.length - 1); j++) {
        const n = toNum(items[j]);
        if (n > 0) return n;
      }
      for (let j = i - 1; j >= Math.max(0, i - windowSize); j--) {
        const n = toNum(items[j]);
        if (n > 0) return n;
      }
    }
  }
  return 0;
}

// ─── Find deduction amount near a payroll code ────────────────────────────────
// In FRU/Priority RTL PDFs the line format (left-to-right in items[]) is:
//   [amount] [date] [date] [base] [percent%] [description] [CODE]
//   OR: [percent%] [amount] [description] [CODE]
//
// Rules:
//  1. Only accept money amounts: must contain "." or "," (excludes plain integer codes)
//  2. Stop scanning backward when another 5-digit payroll code is encountered
//  3. Return the SMALLEST candidate (deduction < base salary)
function findNearCode(items, code, windowSize = 10) {
  const isPayrollCode = s => /^\d{5}$/.test(s);
  const isMoneyLike   = s => /[,.]/.test(s); // amounts have decimal or comma

  for (let i = 0; i < items.length; i++) {
    if (items[i] === code) {
      const candidates = [];

      // Search backward — stop at another payroll code boundary
      for (let j = i - 1; j >= Math.max(0, i - windowSize); j--) {
        if (isPayrollCode(items[j]) && items[j] !== code) break; // hit next code's line
        const n = toNum(items[j]);
        if (n > 50 && isMoneyLike(items[j])) candidates.push(n);
      }

      if (candidates.length === 0) {
        // Forward search fallback
        for (let j = i + 1; j <= Math.min(i + windowSize, items.length - 1); j++) {
          if (isPayrollCode(items[j]) && items[j] !== code) break;
          const n = toNum(items[j]);
          if (n > 50 && isMoneyLike(items[j])) candidates.push(n);
        }
      }

      if (candidates.length === 1) return candidates[0];
      if (candidates.length >= 2) return Math.min(...candidates); // deduction < base
    }
  }
  return 0;
}

// ─── Find gross and net from FRU summary row ─────────────────────────────────
// FRU payslips have a summary row near the end:
//   [net] [emp_pension+keren] [0] [intermediate] [deductions] [gross] [0] [gross] [allowances] [0] ... [base]
// The summary row has 8+ consecutive strict numbers.
// gross = largest in row (appears twice), net = first element.
function findSummaryGrossNet(items) {
  // Scan from end backwards to find the last run of 8+ strict numbers
  for (let i = items.length - 8; i >= Math.max(0, items.length - 60); i--) {
    // Measure run length starting at i
    let j = i;
    while (j < items.length && isStrictNum(items[j])) j++;
    const runLen = j - i;

    if (runLen >= 8) {
      // Extend backward to find the true start of this numeric run
      // (scan may have started mid-row — we want run[0] = net, which is the first number)
      let start = i;
      while (start > 0 && isStrictNum(items[start - 1])) start--;

      const fullRun = items.slice(start, j).map(toNum);
      const largeSalaries = fullRun.filter(n => n > 5000 && n < 35000);

      if (largeSalaries.length >= 2) {
        const gross = Math.max(...largeSalaries);
        const net   = fullRun[0]; // net is the FIRST number in the full summary row

        if (gross > 0 && net > 3000 && net < gross) {
          return { gross, net };
        }
      }
    }
  }
  return null;
}

// ─── Payroll code → field name mapping ───────────────────────────────────────
const PAYSLIP_CODE_PATTERNS = {
  pension:           ['35251', 'פנסיה עובד', 'קרן פנסיה'],
  employerPension:   ['35252', '35253', 'פנסיה מעסיק'],
  kerenHishtalmut:   ['38191', 'קרן השתלמות עובד', 'השתלמות'],
  employerKeren:     ['38192', 'קרן השתלמות מעסיק'],
  incomeTax:         ['91003', 'מס הכנסה', "מ\"ה"],
  nationalInsurance: ['91001', 'ביטוח לאומי'],
  healthInsurance:   ['92041', '92040', 'ביטוח בריאות', 'דמי בריאות'],
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

    // ── Step 1: Try Hebrew labels (works for non-garbled PDFs) ───────────────
    for (const label of GROSS_LABELS) {
      const v = findNear(items, label, 8);
      if (v > 0) { payslip.gross = v; break; }
    }
    for (const label of NET_LABELS) {
      const v = findNear(items, label, 8);
      if (v > 0) { payslip.net = v; break; }
    }

    // ── Step 2: If gross/net not found (Hebrew garbled), use summary row ─────
    if (!payslip.gross || !payslip.net) {
      const summary = findSummaryGrossNet(items);
      if (summary) {
        if (!payslip.gross) payslip.gross = summary.gross;
        if (!payslip.net)   payslip.net   = summary.net;
        addLog(`> זוהה שורת סיכום FRU — ברוטו: ${summary.gross}, נטו: ${summary.net}`, 'info');
      }
    }

    // ── Step 3: Final numeric fallback for gross ─────────────────────────────
    if (!payslip.gross) {
      const numericItems = items.filter(isStrictNum);
      const nums = numericItems.map(toNum).filter(n => n > 3000 && n < 35000).sort((a, b) => b - a);
      if (nums[0]) payslip.gross = nums[0];
      if (nums[1] && nums[1] < nums[0]) payslip.net = payslip.net || nums[1];
    }

    // ── Step 4: Deductions via code lookup (primary method) ──────────────────
    // Uses findNearCode which handles garbled Hebrew by using numeric codes only
    for (const [field, patterns] of Object.entries(PAYSLIP_CODE_PATTERNS)) {
      for (const pattern of patterns) {
        // Try numeric code first (robust to garbled Hebrew)
        if (/^\d+$/.test(pattern)) {
          const v = findNearCode(items, pattern, 14);
          if (v > 0) { payslip[field] = v; break; }
        } else {
          // Hebrew label — only works if PDF decodes correctly
          const v = findNear(items, pattern, 6);
          if (v > 0) { payslip[field] = v; break; }
        }
      }
    }

    // ── Step 5: Calculate net from deductions if still missing ───────────────
    if (payslip.gross && !payslip.net) {
      const totalEmpDeductions =
        (payslip.incomeTax         || 0) +
        (payslip.nationalInsurance || 0) +
        (payslip.healthInsurance   || 0) +
        (payslip.pension           || 0) +
        (payslip.kerenHishtalmut   || 0);
      if (totalEmpDeductions > 0) {
        payslip.net = payslip.gross - totalEmpDeductions;
      }
    }

    // ── Period (try to find date) ────────────────────────────────────────────
    const dateMatch = items.join(' ').match(/(\d{1,2})[\/\.](\d{4})/);
    if (dateMatch) payslip.period = `${dateMatch[1]}/${dateMatch[2]}`;

    // ── Employer name (first long Hebrew string, if text decoded correctly) ──
    const hebrewStr = items.find(s => /[\u0590-\u05FF]{4,}/.test(s) && s.length > 6);
    if (hebrewStr) payslip.employerName = hebrewStr;

    // ── Validate & log ───────────────────────────────────────────────────────
    if (!payslip.gross || payslip.gross <= 0) {
      addLog(`> אזהרה: לא ניתן לאתר שכר ברוטו ב-PDF — ${fileName}`, 'warning');
      addLog(`> טיפ: נסה לייצא את התלוש כ-CSV ממערכת השכר`, 'warning');
    } else {
      const deductionSummary = [
        payslip.incomeTax         && `מ"ה: ${payslip.incomeTax.toLocaleString('he-IL')}`,
        payslip.nationalInsurance && `ב"ל: ${payslip.nationalInsurance.toLocaleString('he-IL')}`,
        payslip.pension           && `פנסיה: ${payslip.pension.toLocaleString('he-IL')}`,
        payslip.kerenHishtalmut   && `השתלמות: ${payslip.kerenHishtalmut.toLocaleString('he-IL')}`,
      ].filter(Boolean).join(', ');
      addLog(
        `> ✓ PDF פוענח — ברוטו: ${payslip.gross.toLocaleString('he-IL')} ₪, ` +
        `נטו: ${(payslip.net || 0).toLocaleString('he-IL')} ₪` +
        (deductionSummary ? ` | ${deductionSummary}` : ''),
        'success'
      );
    }

    return payslip;
  } catch (err) {
    addLog(`> שגיאה קריטית בפענוח PDF: ${err.message}`, 'error');
    return null;
  }
}

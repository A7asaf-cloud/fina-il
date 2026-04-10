import { parseIsraeliDate } from './formatters';
import { validateTransaction, validatePayslip } from './validators';

// ─── Hebrew header maps ───────────────────────────────────────────────────────
const HEADER_MAP = {
  date: [
    'תאריך', 'תאריך ערך', 'תאריך עסקה', 'תאריך פעולה',
    'date', 'value date', 'transaction date',
  ],
  description: [
    'תיאור', 'תיאור פעולה', 'פרטים', 'פרטי הפעולה', 'פרטי העסקה',
    'שם בית העסק', 'בית עסק', 'מוטב', 'נושא',
    'description', 'details', 'narrative',
  ],
  debit: [
    'חובה', 'חיוב', 'הוצאה',
    'debit', 'charge',
  ],
  credit: [
    'זכות', 'זיכוי', 'הכנסה',
    'credit',
  ],
  amount: [
    'סכום', 'סכום עסקה', 'סכום חיוב', 'סכום פעולה',
    'amount',
  ],
  balance: [
    'יתרה', 'יתרה לאחר פעולה',
    'balance',
  ],
  reference: [
    'אסמכתא', 'מספר אסמכתא', 'מספר פעולה',
    'reference', 'ref',
  ],
  category: ['קטגוריה', 'ענף', 'category'],
};

// Payslip-specific header map
const PAYSLIP_MAP = {
  gross:               ['שכר ברוטו', 'ברוטו', 'סה"כ ברוטו', 'gross salary', 'gross'],
  net:                 ['שכר נטו', 'נטו', 'סה"כ לתשלום', 'לתשלום', 'net salary', 'net'],
  incomeTax:           ['מס הכנסה', 'מ"ה', 'income tax', 'tax'],
  nationalInsurance:   ['ביטוח לאומי', 'ביטוח לאומי עובד', 'national insurance'],
  healthInsurance:     ['ביטוח בריאות', 'דמי בריאות', 'health insurance'],
  pension:             ['פנסיה', 'קרן פנסיה', 'פנסיה עובד', 'חיסכון פנסיוני', 'pension'],
  kerenHishtalmut:     ['קרן השתלמות', 'קרן השתלמות עובד', 'keren hishtalmut'],
  employerPension:     ['פנסיה מעסיק', 'הפרשת מעסיק לפנסיה', 'employer pension'],
  employerKeren:       ['קרן השתלמות מעסיק', 'הפרשת מעסיק לקרן השתלמות', 'employer keren'],
  travelAllowance:     ['נסיעות', 'דמי נסיעות', 'travel'],
  period:              ['תקופה', 'חודש', 'period', 'month'],
  employerName:        ['שם מעסיק', 'מעסיק', 'employer'],
  employeeName:        ['שם עובד', 'עובד', 'employee'],
};

// ─── Generic CSV parser ───────────────────────────────────────────────────────
function parseRawCSV(text) {
  // Handle Windows CRLF and detect delimiter
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  if (nonEmpty.length < 2) return { headers: [], rows: [] };

  const delimiter = nonEmpty[0].includes('\t') ? '\t' : ',';

  const parseRow = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(nonEmpty[0]).map(h => h.replace(/^\uFEFF/, '')); // strip BOM
  const rows    = nonEmpty.slice(1).map(line => {
    const vals = parseRow(line);
    const obj  = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });

  return { headers, rows };
}

// ─── Header resolver ──────────────────────────────────────────────────────────
function resolveHeaders(headers, map = HEADER_MAP) {
  const normalized = headers.map(h => h.toLowerCase().trim());
  const resolved   = {};

  for (const [field, aliases] of Object.entries(map)) {
    for (const alias of aliases) {
      const idx = normalized.indexOf(alias.toLowerCase());
      if (idx !== -1) {
        resolved[field] = headers[idx]; // original casing
        break;
      }
    }
  }
  return resolved;
}

// ─── Detect file type from headers ───────────────────────────────────────────
export function detectFileType(headers) {
  const flat = headers.map(h => h.toLowerCase()).join(' ');

  // Payslip markers
  if (flat.includes('ברוטו') || flat.includes('gross') ||
      flat.includes('ניכויים') || flat.includes('נטו')) {
    return 'payslip';
  }
  // Credit card markers
  if (flat.includes('שם בית העסק') || flat.includes('עסק') || flat.includes('ענף')) {
    return 'credit_card';
  }
  // Bank markers (fallback)
  if (flat.includes('יתרה') || flat.includes('balance') ||
      flat.includes('חובה') || flat.includes('זכות')) {
    return 'bank';
  }
  return 'unknown';
}

// ─── Parse bank statement ─────────────────────────────────────────────────────
export function parseBankCSV(text, addLog, fileName = 'קובץ') {
  const valid   = [];
  const invalid = [];

  try {
    addLog(`> מנתח קובץ בנק: ${fileName}...`);
    const { headers, rows } = parseRawCSV(text);
    if (rows.length === 0) {
      addLog(`> שגיאה: ${fileName} ריק או לא ניתן לפענח`, 'error');
      return { valid, invalid };
    }

    const fieldMap = resolveHeaders(headers);
    addLog(`> זוהו עמודות: ${Object.values(fieldMap).join(', ')}`, 'info');

    rows.forEach((row, i) => {
      const rowNum = i + 2; // 1-indexed + header row
      try {
        // Build normalised raw object
        const dateRaw   = fieldMap.date        ? row[fieldMap.date]        : '';
        const descRaw   = fieldMap.description ? row[fieldMap.description] : '';
        const debitRaw  = fieldMap.debit       ? row[fieldMap.debit]       : '0';
        const creditRaw = fieldMap.credit      ? row[fieldMap.credit]      : '0';
        const amountRaw = fieldMap.amount      ? row[fieldMap.amount]      : '';

        const toNum = (s) => parseFloat(String(s).replace(/[,\s₪]/g, '')) || 0;
        let amount;
        if (amountRaw) {
          amount = toNum(amountRaw);
        } else {
          const credit = toNum(creditRaw);
          const debit  = toNum(debitRaw);
          amount = credit > 0 ? credit : -debit;
        }

        const raw = {
          date:        dateRaw,
          description: descRaw || row[headers[1]] || '',
          amount,
          balance:     fieldMap.balance   ? toNum(row[fieldMap.balance])   : undefined,
          reference:   fieldMap.reference ? row[fieldMap.reference]        : undefined,
          source:      fileName,
        };

        const result = validateTransaction(raw, rowNum);
        if (result.valid) {
          valid.push({ ...result.data, id: `tx-${Date.now()}-${i}`, type: amount >= 0 ? 'credit' : 'debit' });
        } else {
          result.errors.forEach(e => addLog(`> ${e}`, 'error'));
          invalid.push({ row: rowNum, errors: result.errors, raw });
        }
      } catch (err) {
        addLog(`> שגיאה בשורה ${rowNum}: ${err.message}`, 'error');
        invalid.push({ row: rowNum, errors: [err.message], raw: row });
      }
    });

    addLog(`> ✓ ${valid.length} רשומות תקינות, ${invalid.length} שגויות`, valid.length > 0 ? 'success' : 'warning');
  } catch (err) {
    addLog(`> שגיאה קריטית בפענוח: ${err.message}`, 'error');
  }

  return { valid, invalid };
}

// ─── Parse credit-card statement ─────────────────────────────────────────────
export function parseCreditCardCSV(text, addLog, fileName = 'קובץ') {
  addLog(`> מנתח קובץ כרטיס אשראי: ${fileName}...`);
  // Credit-card CSVs use the same columns, treat amounts as debit by default
  const { valid, invalid } = parseBankCSV(text, addLog, fileName);
  const adjusted = valid.map(tx => ({
    ...tx,
    amount:   tx.amount > 0 ? -tx.amount : tx.amount, // CC charges are expenses
    type:     'debit',
    category: tx.category || 'כרטיס אשראי',
  }));
  return { valid: adjusted, invalid };
}

// ─── Parse payslip (Tlush Mashporet) ─────────────────────────────────────────
export function parsePayslipCSV(text, addLog, fileName = 'תלוש') {
  addLog(`> מנתח תלוש שכר: ${fileName}...`);

  try {
    const { headers, rows } = parseRawCSV(text);
    if (rows.length === 0) {
      addLog(`> שגיאה: תלוש ריק`, 'error');
      return null;
    }

    const fieldMap = resolveHeaders(headers, PAYSLIP_MAP);

    // Try column-based payslip (one row with labelled columns)
    const toNum = (s) => parseFloat(String(s || 0).replace(/[,\s₪]/g, '')) || 0;

    let payslip = {};
    if (rows.length === 1) {
      // Single-row format
      for (const [field, col] of Object.entries(fieldMap)) {
        payslip[field] = col ? toNum(rows[0][col]) : 0;
      }
    } else {
      // Row-based format: first column = label, second = value
      const labelCol = headers[0];
      const valueCol = headers[1] || headers[0];

      rows.forEach(row => {
        const label = String(row[labelCol] || '').trim().toLowerCase();
        const value = toNum(row[valueCol]);

        for (const [field, aliases] of Object.entries(PAYSLIP_MAP)) {
          if (aliases.some(a => label.includes(a.toLowerCase()))) {
            payslip[field] = value;
          }
        }
      });
    }

    payslip.source = fileName;
    const result   = validatePayslip(payslip);

    if (!result.valid) {
      result.errors.forEach(e => addLog(`> אזהרת תלוש: ${e}`, 'warning'));
    }

    addLog(`> ✓ תלוש שכר פוענח — ברוטו: ${(payslip.gross || 0).toLocaleString('he-IL')} ₪`, 'success');
    return { ...payslip, id: `p-${Date.now()}` };
  } catch (err) {
    addLog(`> שגיאה קריטית בפענוח תלוש: ${err.message}`, 'error');
    return null;
  }
}

// ─── Auto-detect and dispatch ─────────────────────────────────────────────────
export function parseFile(text, fileName, addLog) {
  const { headers } = parseRawCSV(text);
  const type        = detectFileType(headers);

  addLog(`> זוהה סוג קובץ: ${
    type === 'bank' ? 'דף חשבון בנק' :
    type === 'credit_card' ? 'כרטיס אשראי' :
    type === 'payslip' ? 'תלוש שכר' : 'לא ידוע'
  }`, 'info');

  switch (type) {
    case 'bank':        return { type, result: parseBankCSV(text, addLog, fileName) };
    case 'credit_card': return { type, result: parseCreditCardCSV(text, addLog, fileName) };
    case 'payslip':     return { type, result: parsePayslipCSV(text, addLog, fileName) };
    default:
      addLog(`> נסיון פענוח אוטומטי כדף בנק...`, 'warning');
      return { type: 'bank', result: parseBankCSV(text, addLog, fileName) };
  }
}

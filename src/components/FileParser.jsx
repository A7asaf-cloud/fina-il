import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import useFinanceStore from '../store/financeStore';
import { parseFile } from '../utils/parsers';
import { parsePayslipPDF } from '../utils/pdfParser';
import { formatILS, formatHebrewDate } from '../utils/formatters';

const FILE_ACCEPT = '.csv,.tsv,.txt,.pdf';

function FileRow({ file, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const statusIcon = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    error:   <XCircle      className="w-4 h-4 text-red-400" />,
    parsing: <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />,
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-200 truncate font-medium">{file.name}</p>
          <p className="text-xs text-slate-500">
            {file.typeLabel} · {file.rowCount !== undefined ? `${file.rowCount} רשומות` : ''}
            {file.errorCount > 0 && ` · ${file.errorCount} שגיאות`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusIcon[file.status]}
          {file.errors?.length > 0 && (
            <button onClick={() => setExpanded(v => !v)} className="text-slate-500 hover:text-slate-300">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
          <button onClick={() => onRemove(file.id)} className="text-slate-600 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && file.errors?.length > 0 && (
        <div className="border-t border-slate-700/40 p-3 space-y-1">
          {file.errors.slice(0, 10).map((e, i) => (
            <p key={i} className="text-xs text-red-400 font-mono">{e}</p>
          ))}
          {file.errors.length > 10 && (
            <p className="text-xs text-slate-500">... ועוד {file.errors.length - 10} שגיאות</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function FileParser() {
  const addTransactions = useFinanceStore(s => s.addTransactions);
  const addPayslip      = useFinanceStore(s => s.addPayslip);
  const addLog          = useFinanceStore(s => s.addLog);
  const transactions    = useFinanceStore(s => s.transactions);

  const [parsedFiles, setParsedFiles] = useState([]);
  const [dragActive, setDragActive]   = useState(false);
  const inputRef = useRef(null);

  const processFile = useCallback(async (file) => {
    const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setParsedFiles(prev => [...prev, { id, name: file.name, status: 'parsing', typeLabel: '...', rowCount: 0, errorCount: 0, errors: [] }]);

    try {
      addLog(`> קורא קובץ: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info');

      // ── PDF path ────────────────────────────────────────────────────────────
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const payslip     = await parsePayslipPDF(arrayBuffer, addLog, file.name);
        if (payslip && payslip.gross > 0) {
          addPayslip(payslip);
          setParsedFiles(prev => prev.map(f => f.id === id ? {
            ...f, status: 'success', typeLabel: 'תלוש שכר (PDF)', rowCount: 1, errorCount: 0,
          } : f));
        } else {
          setParsedFiles(prev => prev.map(f => f.id === id ? {
            ...f, status: 'warning', typeLabel: 'תלוש שכר (PDF)',
            errors: ['פוענח חלקית — בדוק ערכים בלשונית תלוש שכר'],
          } : f));
          if (payslip) addPayslip(payslip);
        }
        return;
      }

      // ── CSV/TXT path ────────────────────────────────────────────────────────
      const text = await file.text();
      const { type, result } = parseFile(text, file.name, addLog);

      const typeLabels = {
        bank:        'דף חשבון בנק',
        credit_card: 'כרטיס אשראי',
        payslip:     'תלוש שכר',
      };

      if (type === 'payslip') {
        if (result) {
          addPayslip(result);
          setParsedFiles(prev => prev.map(f => f.id === id ? {
            ...f, status: 'success', typeLabel: typeLabels[type], rowCount: 1, errorCount: 0,
          } : f));
        } else {
          setParsedFiles(prev => prev.map(f => f.id === id ? {
            ...f, status: 'error', typeLabel: typeLabels[type], errors: ['לא ניתן לפענח תלוש'],
          } : f));
        }
      } else {
        const { valid, invalid } = result;
        if (valid.length > 0) addTransactions(valid);

        const allErrors = invalid.flatMap(r => r.errors);
        const status = invalid.length === 0 ? 'success' : valid.length > 0 ? 'warning' : 'error';

        setParsedFiles(prev => prev.map(f => f.id === id ? {
          ...f, status, typeLabel: typeLabels[type] || 'לא ידוע',
          rowCount: valid.length, errorCount: invalid.length, errors: allErrors,
        } : f));
      }
    } catch (err) {
      addLog(`> שגיאה קריטית בעיבוד ${file.name}: ${err.message}`, 'error');
      setParsedFiles(prev => prev.map(f => f.id === id ? {
        ...f, status: 'error', typeLabel: 'שגיאה', errors: [err.message],
      } : f));
    }
  }, [addTransactions, addPayslip, addLog]);

  const handleFiles = useCallback((files) => {
    [...files].forEach(f => {
      if (f.size > 10 * 1024 * 1024) {
        addLog(`> קובץ ${f.name} גדול מדי (מקסימום 10MB)`, 'error');
        return;
      }
      processFile(f);
    });
  }, [processFile, addLog]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e) => { e.preventDefault(); setDragActive(true); };
  const onDragLeave = () => setDragActive(false);

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200
          ${dragActive
            ? 'border-indigo-500 bg-indigo-500/10 drag-active'
            : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/40 bg-slate-800/20'
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={FILE_ACCEPT}
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        <Upload className={`w-10 h-10 mx-auto mb-3 transition-colors ${dragActive ? 'text-indigo-400' : 'text-slate-500'}`} />
        <p className="text-base font-semibold text-slate-200 mb-1">
          גרור קבצים לכאן או לחץ לבחירה
        </p>
        <p className="text-sm text-slate-400 mb-3">
          CSV מבנקים · PDF תלוש שכר (FRU, Priority, Hilan)
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {['דף חשבון בנק (CSV)', 'כרטיס אשראי (CSV)', 'תלוש שכר (PDF/CSV)'].map(t => (
            <span key={t} className="text-xs bg-slate-700/60 text-slate-300 px-2.5 py-1 rounded-full border border-slate-600/40">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* CSV format hints */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {[
          {
            bank: 'בנק לאומי',
            headers: 'תאריך, תיאור פעולה, חובה, זכות, יתרה',
            color: 'border-blue-700/40 bg-blue-900/10',
          },
          {
            bank: 'בנק הפועלים',
            headers: 'תאריך ערך, פרטים, אסמכתא, חובה, זכות, יתרה',
            color: 'border-orange-700/40 bg-orange-900/10',
          },
          {
            bank: 'ישראכרט / כאל',
            headers: 'תאריך עסקה, שם בית העסק, סכום עסקה, סכום חיוב',
            color: 'border-purple-700/40 bg-purple-900/10',
          },
        ].map(item => (
          <div key={item.bank} className={`border rounded-lg p-3 ${item.color}`}>
            <p className="font-semibold text-slate-200 mb-1">{item.bank}</p>
            <p className="text-slate-500 font-mono">{item.headers}</p>
          </div>
        ))}
      </div>

      {/* Parsed files list */}
      {parsedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-300">קבצים שעובדו</h3>
          {parsedFiles.map(f => (
            <FileRow
              key={f.id}
              file={f}
              onRemove={(id) => setParsedFiles(prev => prev.filter(f => f.id !== id))}
            />
          ))}
        </div>
      )}

      {/* Transaction preview */}
      {transactions.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/40 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">
              עסקאות טעונות ({transactions.length})
            </h3>
            <span className="text-xs text-slate-500">מציג 10 אחרונות</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/40 text-xs text-slate-400">
                  <th className="text-right py-2 px-4 font-medium">תאריך</th>
                  <th className="text-right py-2 px-4 font-medium">תיאור</th>
                  <th className="text-right py-2 px-4 font-medium">מקור</th>
                  <th className="text-left  py-2 px-4 font-medium">סכום</th>
                </tr>
              </thead>
              <tbody>
                {[...transactions]
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 10)
                  .map(tx => (
                    <tr key={tx.id} className="border-b border-slate-700/20 hover:bg-slate-700/20">
                      <td className="py-2 px-4 text-slate-400 text-xs tabular-nums whitespace-nowrap">
                        {formatHebrewDate(tx.date)}
                      </td>
                      <td className="py-2 px-4 text-slate-200 max-w-[220px] truncate">{tx.description}</td>
                      <td className="py-2 px-4 text-xs text-slate-500 max-w-[120px] truncate">{tx.source || '—'}</td>
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
      )}
    </div>
  );
}

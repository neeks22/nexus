'use client';

import { useState, useRef, useCallback } from 'react';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface ImportSpreadsheetModalProps {
  tenant: string;
  onClose: () => void;
  onComplete: () => void;
}

interface Contact {
  firstName: string;
  lastName: string;
  phone: string;
  isDuplicate?: boolean;
}

type Step = 'upload' | 'parsing' | 'preview' | 'importing';

const ACCEPTED = '.csv,.xlsx,.xls,.pdf,.txt';
const MAX_SIZE = 5 * 1024 * 1024;

const NAME_PATTERNS: Record<string, RegExp> = {
  firstName: /first.?name|prénom/i,
  lastName: /last.?name|nom(?!bre)/i,
  fullName: /^name$|full.?name/i,
  phone: /phone|cell|mobile|tel|téléphone|number/i,
};

function normalizePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, '');
}

function detectColumns(headers: string[]): Record<string, number> | null {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    const trimmed = h.trim();
    for (const [key, re] of Object.entries(NAME_PATTERNS)) {
      if (re.test(trimmed) && map[key] === undefined) map[key] = i;
    }
  });
  if (map.phone === undefined) return null;
  if (map.firstName === undefined && map.fullName === undefined) return null;
  return map;
}

function rowsToContacts(rows: string[][], colMap: Record<string, number>): Contact[] {
  return rows
    .map((row) => {
      const phone = normalizePhone(row[colMap.phone] || '');
      if (!phone || phone.length < 7) return null;
      let firstName = '', lastName = '';
      if (colMap.fullName !== undefined) {
        const parts = (row[colMap.fullName] || '').trim().split(/\s+/);
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ');
      } else {
        firstName = (row[colMap.firstName] || '').trim();
        lastName = colMap.lastName !== undefined ? (row[colMap.lastName] || '').trim() : '';
      }
      if (!firstName) return null;
      return { firstName, lastName, phone };
    })
    .filter(Boolean) as Contact[];
}

export default function ImportSpreadsheetModal({ tenant, onClose, onComplete }: ImportSpreadsheetModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [error, setError] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [needsMapping, setNeedsMapping] = useState(false);
  const [colMapping, setColMapping] = useState<Record<string, number>>({});
  const [consentChecked, setConsentChecked] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [summary, setSummary] = useState({ imported: 0, skipped: 0, failed: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCSV = useCallback((file: File) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (result: Papa.ParseResult<string[]>) => {
        const rows = result.data as string[][];
        if (rows.length < 2) { setError('File has no data rows.'); setStep('upload'); return; }
        const hdrs = rows[0];
        const dataRows = rows.slice(1);
        const colMap = detectColumns(hdrs);
        if (colMap) {
          finishParsing(rowsToContacts(dataRows, colMap));
        } else {
          setHeaders(hdrs);
          setRawRows(dataRows);
          setNeedsMapping(true);
          setStep('upload');
        }
      },
      error: () => { setError('Failed to parse CSV.'); setStep('upload'); },
    });
  }, []);

  const parseExcel = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        if (rows.length < 2) { setError('File has no data rows.'); setStep('upload'); return; }
        const hdrs = rows[0].map(String);
        const dataRows = rows.slice(1).map((r) => r.map(String));
        const colMap = detectColumns(hdrs);
        if (colMap) {
          finishParsing(rowsToContacts(dataRows, colMap));
        } else {
          setHeaders(hdrs);
          setRawRows(dataRows);
          setNeedsMapping(true);
          setStep('upload');
        }
      } catch {
        setError('Failed to parse Excel file.');
        setStep('upload');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const parsePdfOrText = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const res = await fetch('/api/parse-pdf-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, tenant }),
      });
      if (!res.ok) throw new Error('Parse failed');
      const data = await res.json();
      finishParsing(data.contacts || []);
    } catch {
      setError('Failed to extract contacts from file.');
      setStep('upload');
    }
  }, [tenant]);

  const finishParsing = async (parsed: Contact[]) => {
    if (parsed.length === 0) { setError('No valid contacts found.'); setStep('upload'); return; }
    try {
      const res = await fetch('/api/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phones: parsed.map((c) => c.phone), tenant }),
      });
      if (res.ok) {
        const { duplicates } = await res.json();
        const dupSet = new Set<string>(duplicates || []);
        parsed.forEach((c) => { c.isDuplicate = dupSet.has(c.phone); });
      }
    } catch (err) {
      console.error('Duplicate check failed:', err);
    }
    setContacts(parsed);
    setStep('preview');
  };

  const handleFile = useCallback((file: File) => {
    setError('');
    if (file.size > MAX_SIZE) { setError('File exceeds 5MB limit.'); return; }
    setStep('parsing');
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') parseCSV(file);
    else if (ext === 'xlsx' || ext === 'xls') parseExcel(file);
    else if (ext === 'pdf' || ext === 'txt') parsePdfOrText(file);
    else setError('Unsupported file type.');
  }, [parseCSV, parseExcel, parsePdfOrText]);

  const applyMapping = () => {
    if (colMapping.phone === undefined) { setError('Phone column is required.'); return; }
    if (colMapping.firstName === undefined && colMapping.fullName === undefined) {
      setError('A name column is required.'); return;
    }
    setNeedsMapping(false);
    setStep('parsing');
    finishParsing(rowsToContacts(rawRows, colMapping));
  };

  const removeContact = (idx: number) => setContacts((c) => c.filter((_, i) => i !== idx));

  const newContacts = contacts.filter((c) => !c.isDuplicate);
  const dupCount = contacts.length - newContacts.length;

  const startImport = async () => {
    setStep('importing');
    setProgress({ current: 0, total: newContacts.length, status: 'Starting...' });
    try {
      const res = await fetch('/api/import-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: newContacts, tenant }),
      });
      if (!res.ok || !res.body) throw new Error('Import request failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let imported = 0, failed = 0, buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const ev = JSON.parse(line);
            if (ev.status === 'ok') imported++;
            else failed++;
            setProgress({ current: imported + failed, total: newContacts.length, status: `${ev.name || ev.phone}: ${ev.status}` });
          } catch { /* skip malformed line */ }
        }
      }
      setSummary({ imported, skipped: dupCount, failed });
    } catch (err) {
      console.error('Import failed:', err);
      setError('Import failed. Please try again.');
      setSummary({ imported: 0, skipped: dupCount, failed: newContacts.length });
    }
  };

  const done = summary.imported > 0 || summary.failed > 0;

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
  };
  const modal: React.CSSProperties = {
    background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
    width: '90%', maxWidth: 640, maxHeight: '85vh', overflow: 'auto', padding: 28, position: 'relative',
    color: '#f0f0f5',
  };
  const btnPrimary: React.CSSProperties = {
    background: 'linear-gradient(135deg, #DC2626, #B91C1C)', color: '#fff', border: 'none',
    borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
  };
  const btnSecondary: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)', color: '#f0f0f5', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14,
  };
  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6, padding: '8px 12px', color: '#f0f0f5', fontSize: 14, width: '100%',
  };

  return (
    <div style={overlay} onClick={step !== 'importing' ? onClose : undefined}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={step !== 'importing' ? onClose : undefined} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', color: '#8888a0', fontSize: 20, cursor: 'pointer' }}>&times;</button>
        <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>Import Contacts</h2>
        <p style={{ color: '#8888a0', margin: '0 0 20px', fontSize: 13 }}>Upload a spreadsheet or document with client contacts</p>

        {error && <p style={{ color: '#DC2626', margin: '0 0 12px', fontSize: 13 }}>{error}</p>}

        {/* Step 1: Upload */}
        {step === 'upload' && !needsMapping && (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? '#DC2626' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: 10, padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                background: isDragging ? 'rgba(220,38,38,0.05)' : 'transparent', transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
              <p style={{ margin: 0, fontWeight: 500 }}>Drop file here or click to browse</p>
              <p style={{ color: '#8888a0', fontSize: 12, margin: '6px 0 0' }}>CSV, Excel, PDF, TXT — Max 5MB</p>
            </div>
            <input ref={fileRef} type="file" accept={ACCEPTED} hidden onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
          </>
        )}

        {/* Column Mapping Fallback */}
        {step === 'upload' && needsMapping && (
          <div>
            <p style={{ fontSize: 13, marginBottom: 12, color: '#8888a0' }}>We couldn&apos;t auto-detect columns. Please map them:</p>
            {(['firstName', 'lastName', 'fullName', 'phone'] as const).map((field) => (
              <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <label style={{ width: 100, fontSize: 13 }}>
                  {field === 'firstName' ? 'First Name' : field === 'lastName' ? 'Last Name' : field === 'fullName' ? 'Full Name' : 'Phone'}
                </label>
                <select
                  style={{ ...inputStyle, width: 'auto', flex: 1 }}
                  value={colMapping[field] ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setColMapping((m) => {
                      const next = { ...m };
                      if (val === '') { delete next[field]; } else { next[field] = Number(val); }
                      return next;
                    });
                  }}
                >
                  <option value="">— skip —</option>
                  {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                </select>
              </div>
            ))}
            <button style={{ ...btnPrimary, marginTop: 12 }} onClick={applyMapping}>Apply Mapping</button>
          </div>
        )}

        {/* Step 2: Parsing */}
        {step === 'parsing' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 28, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⏳</div>
            <p style={{ color: '#8888a0' }}>Parsing file...</p>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && (
          <>
            <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: 13 }}>
              <span>Total: <b>{contacts.length}</b></span>
              <span style={{ color: '#22c55e' }}>New: <b>{newContacts.length}</b></span>
              <span style={{ color: '#f59e0b' }}>Duplicates: <b>{dupCount}</b></span>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: 280 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    {['#', 'First Name', 'Last Name', 'Phone', 'Status', ''].map((h) => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#8888a0', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '6px 8px', color: '#8888a0' }}>{i + 1}</td>
                      <td style={{ padding: '6px 8px' }}>{c.firstName}</td>
                      <td style={{ padding: '6px 8px' }}>{c.lastName}</td>
                      <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{c.phone}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                          background: c.isDuplicate ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)',
                          color: c.isDuplicate ? '#f59e0b' : '#22c55e',
                        }}>
                          {c.isDuplicate ? 'Already exists' : 'New'}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <button onClick={() => removeContact(i)} style={{ background: 'none', border: 'none', color: '#8888a0', cursor: 'pointer', fontSize: 16 }}>&times;</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} />
              I confirm these contacts have consented to receive messages (CASL)
            </label>
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button style={btnSecondary} onClick={onClose}>Cancel</button>
              <button
                style={{ ...btnPrimary, opacity: !consentChecked || newContacts.length === 0 ? 0.4 : 1 }}
                disabled={!consentChecked || newContacts.length === 0}
                onClick={startImport}
              >
                Import {newContacts.length} Contact{newContacts.length !== 1 ? 's' : ''}
              </button>
            </div>
          </>
        )}

        {/* Step 4: Importing */}
        {step === 'importing' && (
          <div style={{ padding: '20px 0' }}>
            {!done ? (
              <>
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 6, overflow: 'hidden', height: 8, marginBottom: 12 }}>
                  <div style={{
                    background: '#DC2626', height: '100%', borderRadius: 6, transition: 'width 0.3s',
                    width: progress.total ? `${(progress.current / progress.total) * 100}%` : '0%',
                  }} />
                </div>
                <p style={{ fontSize: 14, margin: 0 }}>Processing {progress.current} / {progress.total}...</p>
                <p style={{ fontSize: 12, color: '#8888a0', margin: '4px 0 0' }}>{progress.status}</p>
              </>
            ) : (
              <>
                <div style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
                  <p style={{ margin: 0 }}>Imported: <b style={{ color: '#22c55e' }}>{summary.imported}</b></p>
                  {summary.skipped > 0 && <p style={{ margin: 0 }}>Skipped (duplicates): <b style={{ color: '#f59e0b' }}>{summary.skipped}</b></p>}
                  {summary.failed > 0 && <p style={{ margin: 0 }}>Failed: <b style={{ color: '#DC2626' }}>{summary.failed}</b></p>}
                </div>
                <button style={btnPrimary} onClick={onComplete}>Done</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

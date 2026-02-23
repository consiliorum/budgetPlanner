import { useState, useRef } from 'react';
import { previewCsv, importCsv } from '../api/client';

const STEPS = ['Upload', 'Map columns', 'Done'];

const IconUpload = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16"/>
    <line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
);

const IconFile = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const IconCheck = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const FieldSelect = ({ label, required, value, columns, onChange }) => (
  <div className="mapping-field">
    <div className="mapping-field-label">
      {label}
      {required && <span className="mapping-required">required</span>}
    </div>
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{required ? 'Select column…' : 'None'}</option>
      {columns.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
  </div>
);

export default function Import() {
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({ amountCol: '', descriptionCol: '', dateCol: '', categoryCol: '' });
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [dragover, setDragover] = useState(false);
  const inputRef = useRef();

  const step = result ? 2 : preview ? 1 : 0;

  const handleFile = async (f) => {
    if (!f || !f.name.toLowerCase().endsWith('.csv')) { setError('Please upload a CSV file.'); return; }
    setFile(f); setResult(null); setError(null);
    try {
      setLoading(true);
      const data = await previewCsv(f);
      setPreview(data);
      const cols = data.columns.map((c) => c.toLowerCase());
      const find = (tests) => data.columns[cols.findIndex((c) => tests.some((t) => c.includes(t) || c === t))] || '';
      setMapping({
        amountCol:      find(['amount', 'betrag']),
        descriptionCol: find(['desc', 'memo', 'note', 'verwendungszweck', 'buchungstext', 'beguenstigter']),
        dateCol:        find(['date', 'buchungstag', 'valutadatum']),
        categoryCol:    find(['categ', 'kategorie']),
      });
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragover(false);
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    if (!mapping.amountCol || !mapping.dateCol) { setError('Amount and Date mappings are required.'); return; }
    try {
      setLoading(true); setError(null);
      const data = await importCsv(file, mapping);
      setResult(data); setPreview(null); setFile(null);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setFile(null); setPreview(null); setResult(null); setError(null); };

  return (
    <div>
      <div className="page-header">
        <h2>Import CSV</h2>
      </div>

      {/* Step indicator */}
      <div className="import-steps">
        {STEPS.map((s, i) => (
          <div key={s} className={`import-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
            <div className="import-step-num">{i < step ? '✓' : i + 1}</div>
            <span>{s}</span>
            {i < STEPS.length - 1 && <div className="import-step-line" />}
          </div>
        ))}
      </div>

      {error && <div className="error-msg">{error}</div>}

      {/* Step 0 — Upload */}
      {step === 0 && (
        <>
          <div
            className={`drop-zone ${dragover ? 'dragover' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
            onDragLeave={() => setDragover(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <div className="drop-zone-icon">{file ? <IconFile /> : <IconUpload />}</div>
            <div className="drop-zone-title">{file ? file.name : 'Drop your CSV here'}</div>
            <div className="drop-zone-sub">or click to browse — must have a header row</div>
            {loading && <div className="drop-zone-loading">Reading file…</div>}
            <input
              ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }}
              onChange={(e) => e.target.files.length && handleFile(e.target.files[0])}
            />
          </div>

          <div className="csv-format-card">
            <div className="csv-format-header">
              <div className="csv-format-title">Expected columns</div>
              <div className="csv-format-subtitle">Column names can be anything — you map them after uploading</div>
            </div>
            <div className="csv-format-grid">
              <div className="csv-field-card">
                <div className="csv-field-card-top">
                  <span className="csv-field-name">date</span>
                  <span className="csv-field-required">required</span>
                </div>
                <div className="csv-field-desc">Any standard format</div>
                <div className="csv-field-examples">
                  <code>2026-01-15</code>
                  <code>15/01/2026</code>
                  <code>Jan 15 2026</code>
                </div>
              </div>
              <div className="csv-field-card">
                <div className="csv-field-card-top">
                  <span className="csv-field-name">amount</span>
                  <span className="csv-field-required">required</span>
                </div>
                <div className="csv-field-desc">Positive = income, negative = expense</div>
                <div className="csv-field-examples">
                  <code className="income-eg">+1200.00</code>
                  <code className="expense-eg">-85.50</code>
                </div>
              </div>
              <div className="csv-field-card">
                <div className="csv-field-card-top">
                  <span className="csv-field-name">description</span>
                  <span className="csv-field-optional">optional</span>
                </div>
                <div className="csv-field-desc">Free text label for the transaction</div>
                <div className="csv-field-examples">
                  <code>Grocery run</code>
                  <code>Monthly salary</code>
                </div>
              </div>
              <div className="csv-field-card">
                <div className="csv-field-card-top">
                  <span className="csv-field-name">category</span>
                  <span className="csv-field-optional">optional</span>
                </div>
                <div className="csv-field-desc">Matched to existing categories, or auto-created if unknown. Rows with no category fall back to <em>Other Income</em> or <em>Other Expense</em></div>
                <div className="csv-field-examples">
                  <code>Salary</code>
                  <code>Food &amp; Dining</code>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Step 1 — Map columns */}
      {step === 1 && preview && (
        <div className="import-card">
          <div className="import-card-header">
            <div>
              <h3>Map Columns</h3>
              <p className="import-card-sub">Found <strong>{preview.totalRows}</strong> rows in <strong>{file?.name}</strong></p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={reset}>Change file</button>
          </div>

          <div className="mapping-grid">
            <FieldSelect
              label="Amount" required
              value={mapping.amountCol} columns={preview.columns}
              onChange={(v) => setMapping({ ...mapping, amountCol: v })}
            />
            <FieldSelect
              label="Date" required
              value={mapping.dateCol} columns={preview.columns}
              onChange={(v) => setMapping({ ...mapping, dateCol: v })}
            />
            <FieldSelect
              label="Description"
              value={mapping.descriptionCol} columns={preview.columns}
              onChange={(v) => setMapping({ ...mapping, descriptionCol: v })}
            />
            <FieldSelect
              label="Category"
              value={mapping.categoryCol} columns={preview.columns}
              onChange={(v) => setMapping({ ...mapping, categoryCol: v })}
            />
          </div>

          <div className="import-preview-label">Preview — first {preview.preview.length} rows</div>
          <div className="preview-table">
            <table>
              <thead>
                <tr>{preview.columns.map((c) => <th key={c}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {preview.preview.map((row, i) => (
                  <tr key={i}>{preview.columns.map((c) => <td key={c}>{row[c]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="import-card-actions">
            <button className="btn btn-secondary" onClick={reset}>Cancel</button>
            <button className="btn btn-primary" onClick={handleImport} disabled={loading}>
              {loading ? 'Importing…' : `Import ${preview.totalRows} rows`}
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Done */}
      {step === 2 && result && (
        <div className="import-done-card">
          <div className={`import-done-icon ${result.errors?.length ? 'warn' : 'ok'}`}>
            <IconCheck />
          </div>
          <h3>{result.imported} transaction{result.imported !== 1 ? 's' : ''} imported</h3>
          {result.skipped > 0 && (
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {result.skipped} duplicate{result.skipped !== 1 ? 's' : ''} skipped
            </p>
          )}
          {result.errors?.length > 0 && (
            <div className="import-errors">
              <p className="import-errors-title">{result.errors.length} row{result.errors.length !== 1 ? 's' : ''} skipped</p>
              <ul>
                {result.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>Row {e.row}: {e.error}</li>
                ))}
                {result.errors.length > 10 && <li>…and {result.errors.length - 10} more</li>}
              </ul>
            </div>
          )}
          <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={reset}>
            Import another file
          </button>
        </div>
      )}
    </div>
  );
}

import { useState, useRef } from 'react';
import { previewCsv, importCsv } from '../api/client';

export default function Import() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({ amountCol: '', descriptionCol: '', dateCol: '', categoryCol: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragover, setDragover] = useState(false);
  const inputRef = useRef();

  const handleFile = async (f) => {
    if (!f || !f.name.endsWith('.csv')) {
      setError('Please upload a CSV file.');
      return;
    }
    setFile(f);
    setResult(null);
    setError(null);
    try {
      setLoading(true);
      const data = await previewCsv(f);
      setPreview(data);
      // Auto-map columns by common names
      const cols = data.columns.map((c) => c.toLowerCase());
      setMapping({
        amountCol: data.columns[cols.findIndex((c) => c.includes('amount'))] || '',
        descriptionCol: data.columns[cols.findIndex((c) => c.includes('desc') || c.includes('memo') || c.includes('note'))] || '',
        dateCol: data.columns[cols.findIndex((c) => c.includes('date'))] || '',
        categoryCol: data.columns[cols.findIndex((c) => c.includes('categ'))] || '',
      });
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragover(false);
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    if (!mapping.amountCol || !mapping.dateCol) {
      setError('Amount and Date column mappings are required.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await importCsv(file, mapping);
      setResult(data);
      setPreview(null);
      setFile(null);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>Import CSV</h2>

      {error && <div className="error-msg">{error}</div>}

      <div
        className={`drop-zone ${dragover ? 'dragover' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
        onDragLeave={() => setDragover(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <h3>{file ? file.name : 'Drop CSV file here or click to browse'}</h3>
        <p>Supports CSV files with headers</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files.length && handleFile(e.target.files[0])}
        />
      </div>

      {loading && <div className="loading">Processing...</div>}

      {preview && (
        <div className="mapping-form">
          <h3>Column Mapping</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Map your CSV columns to the transaction fields. Found {preview.totalRows} rows.
          </p>

          <div className="form-row">
            <div className="form-group">
              <label>Amount Column *</label>
              <select value={mapping.amountCol} onChange={(e) => setMapping({ ...mapping, amountCol: e.target.value })}>
                <option value="">Select...</option>
                {preview.columns.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Date Column *</label>
              <select value={mapping.dateCol} onChange={(e) => setMapping({ ...mapping, dateCol: e.target.value })}>
                <option value="">Select...</option>
                {preview.columns.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Description Column</label>
              <select value={mapping.descriptionCol} onChange={(e) => setMapping({ ...mapping, descriptionCol: e.target.value })}>
                <option value="">None</option>
                {preview.columns.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Category Column</label>
              <select value={mapping.categoryCol} onChange={(e) => setMapping({ ...mapping, categoryCol: e.target.value })}>
                <option value="">None</option>
                {preview.columns.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <h4 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Preview (first 5 rows)</h4>
          <div className="preview-table">
            <table>
              <thead>
                <tr>
                  {preview.columns.map((c) => <th key={c}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row, i) => (
                  <tr key={i}>
                    {preview.columns.map((c) => <td key={c}>{row[c]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={handleImport} disabled={loading}>
              Import {preview.totalRows} Rows
            </button>
            <button className="btn btn-secondary" onClick={() => { setPreview(null); setFile(null); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className={`import-result ${result.errors?.length ? 'error' : 'success'}`}>
          <p>Successfully imported {result.imported} transaction(s).</p>
          {result.errors?.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <p>{result.errors.length} error(s):</p>
              <ul style={{ marginTop: '0.25rem', paddingLeft: '1.25rem' }}>
                {result.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>Row {e.row}: {e.error}</li>
                ))}
                {result.errors.length > 10 && <li>...and {result.errors.length - 10} more</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

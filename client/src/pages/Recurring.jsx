import { useState, useEffect } from 'react';
import {
  getRecurring, createRecurring, updateRecurring,
  deleteRecurring, processRecurring, getCategories, getDeviations,
} from '../api/client';

const fmt = (n) => Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const intervalColors = {
  daily:   { bg: '#fef3c7', color: '#92400e' },
  weekly:  { bg: '#ede9fe', color: '#5b21b6' },
  monthly: { bg: '#dbeafe', color: '#1e40af' },
  yearly:  { bg: '#dcfce7', color: '#14532d' },
};

const emptyForm = {
  amount: '',
  description: '',
  category_id: '',
  interval: 'monthly',
  start_date: new Date().toISOString().slice(0, 10),
};

const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const IconProcess = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

export default function Recurring() {
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [deviations, setDeviations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    try {
      setLoading(true);
      const [tplData, catData, devData] = await Promise.all([
        getRecurring(), getCategories(), getDeviations(),
      ]);
      setTemplates(tplData);
      setCategories(catData);
      setDeviations(devData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (tpl) => {
    setEditing(tpl.id);
    setForm({
      amount: tpl.amount,
      description: tpl.description,
      category_id: tpl.category_id || '',
      interval: tpl.interval,
      start_date: tpl.start_date?.slice(0, 10),
      active: tpl.active,
      next_due: tpl.next_due?.slice(0, 10),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, amount: parseFloat(form.amount), category_id: form.category_id || null };
      if (editing) await updateRecurring(editing, payload);
      else await createRecurring(payload);
      setShowModal(false);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this recurring template?')) return;
    try { await deleteRecurring(id); load(); }
    catch (e) { setError(e.message); }
  };

  const handleProcess = async () => {
    try {
      setMessage(null);
      const result = await processRecurring();
      setMessage(`Processed ${result.processed} recurring transaction(s).`);
      load();
    } catch (e) { setError(e.message); }
  };

  const toggleActive = async (tpl) => {
    try { await updateRecurring(tpl.id, { ...tpl, active: !tpl.active }); load(); }
    catch (e) { setError(e.message); }
  };

  const deviationMap = Object.fromEntries(deviations.map(d => [d.template_id, d]));

  const active  = templates.filter(t => t.active);
  const paused  = templates.filter(t => !t.active);
  const monthlyTotal = active
    .reduce((sum, t) => {
      const amt = Number(t.amount);
      const multiplier = { daily: 30, weekly: 4.33, monthly: 1, yearly: 1 / 12 };
      return sum + amt * (multiplier[t.interval] ?? 1);
    }, 0);

  return (
    <div>
      <div className="page-header">
        <h2>Recurring</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={handleProcess}>
            <IconProcess />
            <span style={{ marginLeft: '0.4rem' }}>Process Due</span>
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <span style={{ fontSize: '1.1em', marginRight: '0.3rem' }}>+</span> Add Template
          </button>
        </div>
      </div>

      {error   && <div className="error-msg">{error}</div>}
      {message && <div className="alert-success">{message}</div>}

      {deviations.length > 0 && (
        <div className="deviation-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <strong>{deviations.length} subscription{deviations.length > 1 ? 's' : ''} deviate from expected amount</strong>
            <div className="deviation-list">
              {deviations.map(d => {
                const diff = Number(d.actual_amount) - Number(d.expected_amount);
                const sign = diff > 0 ? '+' : '';
                return (
                  <span key={d.template_id} className="deviation-item">
                    <span className="deviation-name">{d.description}</span>
                    <span className="deviation-delta">{sign}{fmt(diff)} ({sign}{d.deviation_pct}%)</span>
                    <span className="deviation-date">last charged {new Date(d.tx_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="summary-cards" style={{ marginBottom: '1.25rem' }}>
        <div className="summary-card" style={{ borderLeftColor: '#22c55e' }}>
          <div className="card-icon-wrap income-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div>
            <div className="label">Active</div>
            <div className="value income">{active.length}</div>
          </div>
        </div>
        <div className="summary-card" style={{ borderLeftColor: '#94a3b8' }}>
          <div className="card-icon-wrap" style={{ background: '#f1f5f9', color: '#64748b' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
            </svg>
          </div>
          <div>
            <div className="label">Paused</div>
            <div className="value" style={{ color: '#64748b' }}>{paused.length}</div>
          </div>
        </div>
        <div className="summary-card balance-card">
          <div className="card-icon-wrap balance-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
            </svg>
          </div>
          <div>
            <div className="label">Est. Monthly Cost</div>
            <div className="value" style={{ color: '#1d4ed8' }}>{fmt(monthlyTotal)}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : templates.length === 0 ? (
        <div className="empty-state">No recurring templates yet. Create one to automate transactions!</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Interval</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Next Due</th>
                <th>Status</th>
                <th style={{ width: '60px' }}></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl) => {
                const iColors = intervalColors[tpl.interval] || { bg: '#f1f5f9', color: '#475569' };
                const dev = deviationMap[tpl.id];
                return (
                  <tr key={tpl.id} style={{ opacity: tpl.active ? 1 : 0.5 }}>
                    <td>
                      <span className="tx-description">{tpl.description || <span style={{ color: '#94a3b8' }}>—</span>}</span>
                      {dev && (
                        <span className="deviation-row-badge" title={`Last charged ${fmt(dev.actual_amount)} — expected ${fmt(dev.expected_amount)}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                          </svg>
                          {Number(dev.deviation_pct) > 0 ? '+' : ''}{dev.deviation_pct}%
                        </span>
                      )}
                    </td>
                    <td>
                      {tpl.category_name && (
                        <span className="category-badge" style={{ background: tpl.category_color + '22', color: tpl.category_color, border: `1px solid ${tpl.category_color}44` }}>
                          <span className="category-dot" style={{ background: tpl.category_color }} />
                          {tpl.category_name}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="interval-badge" style={{ background: iColors.bg, color: iColors.color }}>
                        {tpl.interval}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={tpl.category_type === 'income' ? 'amount-income' : 'amount-expense'}>
                        {fmt(tpl.amount)}
                      </span>
                    </td>
                    <td className="tx-date">{formatDate(tpl.next_due)}</td>
                    <td>
                      <button
                        className={`status-toggle ${tpl.active ? 'status-active' : 'status-paused'}`}
                        onClick={() => toggleActive(tpl)}
                        title={tpl.active ? 'Click to pause' : 'Click to activate'}
                      >
                        <span className="status-dot" />
                        {tpl.active ? 'Active' : 'Paused'}
                      </button>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn edit-btn" title="Edit" onClick={() => openEdit(tpl)}><IconEdit /></button>
                        <button className="icon-btn delete-btn" title="Delete" onClick={() => handleDelete(tpl.id)}><IconTrash /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title-row">
              <h3>{editing ? 'Edit Template' : 'New Recurring Template'}</h3>
              <button className="icon-btn" style={{ color: '#94a3b8' }} onClick={() => setShowModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="number" step="0.01" required placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Interval</label>
                  <select value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value })}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text" placeholder="e.g. Netflix subscription"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">Select a category...</option>
                  <optgroup label="Income">
                    {categories.filter((c) => c.type === 'income').map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Expense">
                    {categories.filter((c) => c.type === 'expense').map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date" required
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Save Changes' : 'Create Template'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

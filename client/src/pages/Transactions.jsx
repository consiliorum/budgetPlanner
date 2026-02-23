import { useState, useEffect } from 'react';
import {
  getTransactions, createTransaction, updateTransaction,
  deleteTransaction, deleteAllTransactions, getCategories,
} from '../api/client';

const fmt = (n) => Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const emptyForm = {
  amount: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
  category_id: '',
  is_recurring: false,
  recurring_interval: '',
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

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState({ category_id: '', type: '', start_date: '', end_date: '' });

  const load = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.category_id) params.category_id = filters.category_id;
      if (filters.type) params.type = filters.type;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      const [txData, catData] = await Promise.all([
        getTransactions(params),
        categories.length ? Promise.resolve(categories) : getCategories(),
      ]);
      setTransactions(txData.transactions);
      if (!categories.length) setCategories(catData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filters]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (tx) => {
    setEditing(tx.id);
    setForm({
      amount: tx.amount,
      description: tx.description,
      date: tx.date?.slice(0, 10),
      category_id: tx.category_id || '',
      is_recurring: tx.is_recurring,
      recurring_interval: tx.recurring_interval || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        category_id: form.category_id || null,
        recurring_interval: form.recurring_interval || null,
      };
      if (editing) await updateTransaction(editing, payload);
      else await createTransaction(payload);
      setShowModal(false);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await deleteTransaction(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Delete all ${transactions.length} transactions? This cannot be undone.`)) return;
    try {
      await deleteAllTransactions();
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const clearFilters = () => setFilters({ category_id: '', type: '', start_date: '', end_date: '' });
  const hasFilters = Object.values(filters).some(Boolean);

  const totalIncome   = transactions.filter(t => t.category_type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = transactions.filter(t => t.category_type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div>
      <div className="page-header">
        <h2>Transactions</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {transactions.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={handleDeleteAll}>
              Delete All
            </button>
          )}
          <button className="btn btn-primary" onClick={openAdd}>
            <span style={{ fontSize: '1.1em', marginRight: '0.3rem' }}>+</span> Add Transaction
          </button>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {/* Summary strip */}
      <div className="summary-cards" style={{ marginBottom: '1.25rem' }}>
        <div className="summary-card" style={{ borderLeftColor: '#94a3b8' }}>
          <div className="card-icon-wrap" style={{ background: '#f1f5f9', color: '#475569' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </div>
          <div>
            <div className="label">Transactions</div>
            <div className="value" style={{ color: '#1e293b' }}>{transactions.length}</div>
          </div>
        </div>
        <div className="summary-card income-card">
          <div className="card-icon-wrap income-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </div>
          <div>
            <div className="label">Income</div>
            <div className="value income">{fmt(totalIncome)}</div>
          </div>
        </div>
        <div className="summary-card expense-card">
          <div className="card-icon-wrap expense-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
            </svg>
          </div>
          <div>
            <div className="label">Expenses</div>
            <div className="value expense">{fmt(totalExpenses)}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-inline">
        <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select value={filters.category_id} onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
        <input type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
        {hasFilters && (
          <button className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear</button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading">Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div className="empty-state">No transactions found.</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ width: '110px' }}>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th style={{ textAlign: 'right', width: '130px' }}>Amount</th>
                <th style={{ width: '80px' }}></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="tx-date">{formatDate(tx.date)}</td>
                  <td>
                    <span className="tx-description">{tx.description || <span style={{ color: '#94a3b8' }}>—</span>}</span>
                    {tx.is_recurring && (
                      <span className="recurring-badge">{tx.recurring_interval}</span>
                    )}
                  </td>
                  <td>
                    {tx.category_name && (
                      <span className="category-badge" style={{ background: tx.category_color + '22', color: tx.category_color, border: `1px solid ${tx.category_color}44` }}>
                        <span className="category-dot" style={{ background: tx.category_color }} />
                        {tx.category_name}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={tx.category_type === 'income' ? 'amount-income' : 'amount-expense'}>
                      {tx.category_type === 'income' ? '+' : '−'}{fmt(tx.amount)}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn edit-btn" title="Edit" onClick={() => openEdit(tx)}><IconEdit /></button>
                      <button className="icon-btn delete-btn" title="Delete" onClick={() => handleDelete(tx.id)}><IconTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title-row">
              <h3>{editing ? 'Edit Transaction' : 'New Transaction'}</h3>
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
                  <label>Date</label>
                  <input
                    type="date" required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text" placeholder="What was this for?"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  required value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                >
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
              <div className="recurring-toggle-row">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={form.is_recurring}
                    onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
                  />
                  <span className="toggle-track"><span className="toggle-thumb" /></span>
                  Recurring transaction
                </label>
                {form.is_recurring && (
                  <select
                    value={form.recurring_interval}
                    onChange={(e) => setForm({ ...form, recurring_interval: e.target.value })}
                    style={{ width: 'auto' }}
                  >
                    <option value="">Interval...</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Save Changes' : 'Add Transaction'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

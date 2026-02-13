import { useState, useEffect } from 'react';
import {
  getTransactions, createTransaction, updateTransaction,
  deleteTransaction, getCategories,
} from '../api/client';

const fmt = (n) => Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const emptyForm = {
  amount: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
  category_id: '',
  is_recurring: false,
  recurring_interval: '',
};

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

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

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
      if (editing) {
        await updateTransaction(editing, payload);
      } else {
        await createTransaction(payload);
      }
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

  return (
    <div>
      <div className="page-header">
        <h2>Transactions</h2>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Transaction</button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="filters">
        <div className="form-group">
          <label>Type</label>
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div className="form-group">
          <label>Category</label>
          <select value={filters.category_id} onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}>
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>From</label>
          <input type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
        </div>
        <div className="form-group">
          <label>To</label>
          <input type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div className="empty-state">No transactions found. Add your first one!</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.date?.slice(0, 10)}</td>
                  <td>
                    {tx.description}
                    {tx.is_recurring && <span className="recurring-badge">{tx.recurring_interval}</span>}
                  </td>
                  <td>
                    {tx.category_name && (
                      <span className="category-badge" style={{ background: tx.category_color }}>
                        {tx.category_name}
                      </span>
                    )}
                  </td>
                  <td className={tx.category_type === 'income' ? 'amount-income' : 'amount-expense'}>
                    {tx.category_type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(tx)}>Edit</button>{' '}
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tx.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? 'Edit Transaction' : 'Add Transaction'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  required
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                >
                  <option value="">Select category...</option>
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
              <div className="form-row">
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.is_recurring}
                      onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
                    />{' '}
                    Recurring
                  </label>
                </div>
                {form.is_recurring && (
                  <div className="form-group">
                    <label>Interval</label>
                    <select
                      value={form.recurring_interval}
                      onChange={(e) => setForm({ ...form, recurring_interval: e.target.value })}
                    >
                      <option value="">Select...</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

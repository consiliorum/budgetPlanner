import { useState, useEffect } from 'react';
import {
  getRecurring, createRecurring, updateRecurring,
  deleteRecurring, processRecurring, getCategories,
} from '../api/client';

const fmt = (n) => Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const emptyForm = {
  amount: '',
  description: '',
  category_id: '',
  interval: 'monthly',
  start_date: new Date().toISOString().slice(0, 10),
};

export default function Recurring() {
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    try {
      setLoading(true);
      const [tplData, catData] = await Promise.all([getRecurring(), getCategories()]);
      setTemplates(tplData);
      setCategories(catData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

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
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        category_id: form.category_id || null,
      };
      if (editing) {
        await updateRecurring(editing, payload);
      } else {
        await createRecurring(payload);
      }
      setShowModal(false);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this recurring template?')) return;
    try {
      await deleteRecurring(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleProcess = async () => {
    try {
      setMessage(null);
      const result = await processRecurring();
      setMessage(`Processed ${result.processed} recurring transaction(s).`);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleActive = async (tpl) => {
    try {
      await updateRecurring(tpl.id, { ...tpl, active: !tpl.active });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Recurring Transactions</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={handleProcess}>Process Due</button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Template</button>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {message && <div className="import-result success">{message}</div>}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : templates.length === 0 ? (
        <div className="empty-state">No recurring templates. Create one to automate transactions!</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Interval</th>
                <th>Next Due</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl) => (
                <tr key={tpl.id} style={{ opacity: tpl.active ? 1 : 0.5 }}>
                  <td>{tpl.description}</td>
                  <td>
                    {tpl.category_name && (
                      <span className="category-badge" style={{ background: tpl.category_color }}>
                        {tpl.category_name}
                      </span>
                    )}
                  </td>
                  <td className={tpl.category_type === 'income' ? 'amount-income' : 'amount-expense'}>
                    {fmt(tpl.amount)}
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{tpl.interval}</td>
                  <td>{tpl.next_due?.slice(0, 10)}</td>
                  <td>
                    <button
                      className={`btn btn-sm ${tpl.active ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => toggleActive(tpl)}
                    >
                      {tpl.active ? 'Active' : 'Paused'}
                    </button>
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(tpl)}>Edit</button>{' '}
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tpl.id)}>Delete</button>
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
            <h3>{editing ? 'Edit Template' : 'Add Recurring Template'}</h3>
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
                  <label>Interval</label>
                  <select
                    value={form.interval}
                    onChange={(e) => setForm({ ...form, interval: e.target.value })}
                  >
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
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

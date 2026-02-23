const { Router } = require('express');
const pool = require('../db/pool');

const router = Router();

// List transactions with optional filters
router.get('/', async (req, res) => {
  const { category_id, start_date, end_date, type, limit = 100, offset = 0 } = req.query;
  const conditions = [];
  const params = [];
  let idx = 1;

  if (category_id) {
    conditions.push(`t.category_id = $${idx++}`);
    params.push(category_id);
  }
  if (start_date) {
    conditions.push(`t.date >= $${idx++}`);
    params.push(start_date);
  }
  if (end_date) {
    conditions.push(`t.date <= $${idx++}`);
    params.push(end_date);
  }
  if (type) {
    conditions.push(`c.type = $${idx++}`);
    params.push(type);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  params.push(Number(limit), Number(offset));

  const { rows } = await pool.query(
    `SELECT t.*, c.name AS category_name, c.type AS category_type, c.color AS category_color
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     ${where}
     ORDER BY t.date DESC, t.id DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    params
  );

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM transactions t LEFT JOIN categories c ON t.category_id = c.id ${where}`,
    params.slice(0, -2)
  );

  res.json({ transactions: rows, total: parseInt(countResult.rows[0].count) });
});

// Summary for charts
router.get('/summary', async (req, res) => {
  const { start_date, end_date } = req.query;
  const conditions = [];
  const params = [];
  let idx = 1;

  if (start_date) {
    conditions.push(`t.date >= $${idx++}`);
    params.push(start_date);
  }
  if (end_date) {
    conditions.push(`t.date <= $${idx++}`);
    params.push(end_date);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  // By category
  const byCategory = await pool.query(
    `SELECT c.name, c.type, c.color, SUM(t.amount) AS total
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     ${where}
     GROUP BY c.id, c.name, c.type, c.color
     ORDER BY total DESC`,
    params
  );

  // Monthly totals
  const monthly = await pool.query(
    `SELECT
       TO_CHAR(t.date, 'YYYY-MM') AS month,
       c.type,
       SUM(t.amount) AS total
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     ${where}
     GROUP BY month, c.type
     ORDER BY month`,
    params
  );

  // Daily balance trend
  const dailyBalance = await pool.query(
    `SELECT
       t.date,
       SUM(CASE WHEN c.type = 'income' THEN t.amount ELSE -t.amount END) AS net
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     ${where}
     GROUP BY t.date
     ORDER BY t.date`,
    params
  );

  // Totals
  const totals = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN c.type = 'income' THEN t.amount ELSE 0 END), 0) AS total_income,
       COALESCE(SUM(CASE WHEN c.type = 'expense' THEN t.amount ELSE 0 END), 0) AS total_expenses
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     ${where}`,
    params
  );

  res.json({
    byCategory: byCategory.rows,
    monthly: monthly.rows,
    dailyBalance: dailyBalance.rows,
    totals: totals.rows[0],
  });
});

// Create
router.post('/', async (req, res) => {
  const { amount, description, date, category_id, is_recurring, recurring_interval } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO transactions (amount, description, date, category_id, is_recurring, recurring_interval)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [amount, description || '', date || new Date(), category_id, is_recurring || false, recurring_interval || null]
  );
  res.status(201).json(rows[0]);
});

// Update
router.put('/:id', async (req, res) => {
  const { amount, description, date, category_id, is_recurring, recurring_interval } = req.body;
  const { rows } = await pool.query(
    `UPDATE transactions SET amount=$1, description=$2, date=$3, category_id=$4, is_recurring=$5, recurring_interval=$6
     WHERE id=$7 RETURNING *`,
    [amount, description, date, category_id, is_recurring || false, recurring_interval || null, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// Delete all
router.delete('/all', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM transactions');
  res.json({ deleted: rowCount });
});

// Delete
router.delete('/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM transactions WHERE id=$1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;

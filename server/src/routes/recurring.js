const { Router } = require('express');
const pool = require('../db/pool');

const router = Router();

// List recurring templates
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.*, c.name AS category_name, c.type AS category_type, c.color AS category_color
     FROM recurring_templates r
     LEFT JOIN categories c ON r.category_id = c.id
     ORDER BY r.next_due`
  );
  res.json(rows);
});

// Create
router.post('/', async (req, res) => {
  const { amount, description, category_id, interval, start_date } = req.body;
  const startDt = start_date || new Date().toISOString().slice(0, 10);
  const { rows } = await pool.query(
    `INSERT INTO recurring_templates (amount, description, category_id, interval, start_date, next_due)
     VALUES ($1, $2, $3, $4, $5, $5) RETURNING *`,
    [amount, description || '', category_id, interval, startDt]
  );
  res.status(201).json(rows[0]);
});

// Update
router.put('/:id', async (req, res) => {
  const { amount, description, category_id, interval, active, next_due } = req.body;
  const { rows } = await pool.query(
    `UPDATE recurring_templates
     SET amount=$1, description=$2, category_id=$3, interval=$4, active=$5, next_due=$6
     WHERE id=$7 RETURNING *`,
    [amount, description, category_id, interval, active, next_due, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// Delete
router.delete('/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM recurring_templates WHERE id=$1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// Process due recurring transactions
router.post('/process', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const { rows: templates } = await pool.query(
    `SELECT * FROM recurring_templates WHERE active = true AND next_due <= $1`,
    [today]
  );

  const created = [];
  for (const tpl of templates) {
    // Create the transaction
    const { rows } = await pool.query(
      `INSERT INTO transactions (amount, description, date, category_id, is_recurring, recurring_interval)
       VALUES ($1, $2, $3, $4, true, $5) RETURNING *`,
      [tpl.amount, tpl.description, tpl.next_due, tpl.category_id, tpl.interval]
    );
    created.push(rows[0]);

    // Advance next_due
    let nextDue;
    switch (tpl.interval) {
      case 'daily':
        nextDue = `next_due + INTERVAL '1 day'`;
        break;
      case 'weekly':
        nextDue = `next_due + INTERVAL '1 week'`;
        break;
      case 'monthly':
        nextDue = `next_due + INTERVAL '1 month'`;
        break;
      case 'yearly':
        nextDue = `next_due + INTERVAL '1 year'`;
        break;
    }
    await pool.query(
      `UPDATE recurring_templates SET next_due = ${nextDue} WHERE id = $1`,
      [tpl.id]
    );
  }

  res.json({ processed: created.length, transactions: created });
});

module.exports = router;

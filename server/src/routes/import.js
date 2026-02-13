const { Router } = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const pool = require('../db/pool');

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Preview CSV columns
router.post('/csv/preview', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const records = parse(req.file.buffer.toString(), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    const columns = records.length > 0 ? Object.keys(records[0]) : [];
    const preview = records.slice(0, 5);
    res.json({ columns, preview, totalRows: records.length });
  } catch (err) {
    res.status(400).json({ error: 'Failed to parse CSV: ' + err.message });
  }
});

// Import CSV with column mapping
router.post('/csv', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { amountCol, descriptionCol, dateCol, categoryCol } = req.body;
  if (!amountCol || !dateCol) {
    return res.status(400).json({ error: 'amount and date column mappings are required' });
  }

  let records;
  try {
    records = parse(req.file.buffer.toString(), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err) {
    return res.status(400).json({ error: 'Failed to parse CSV: ' + err.message });
  }

  // Load categories for matching
  const { rows: categories } = await pool.query('SELECT id, name, type FROM categories');
  const catMap = new Map(categories.map(c => [c.name.toLowerCase(), c]));

  const imported = [];
  const errors = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const amount = parseFloat(row[amountCol]);
    if (isNaN(amount)) {
      errors.push({ row: i + 1, error: `Invalid amount: "${row[amountCol]}"` });
      continue;
    }

    const date = row[dateCol];
    if (!date || isNaN(Date.parse(date))) {
      errors.push({ row: i + 1, error: `Invalid date: "${row[dateCol]}"` });
      continue;
    }

    const description = descriptionCol ? (row[descriptionCol] || '') : '';
    let categoryId = null;

    if (categoryCol && row[categoryCol]) {
      const match = catMap.get(row[categoryCol].toLowerCase());
      if (match) categoryId = match.id;
    }

    // If no category matched, assign based on sign
    if (!categoryId) {
      const fallback = amount >= 0
        ? categories.find(c => c.name === 'Other Income')
        : categories.find(c => c.name === 'Other Expense');
      if (fallback) categoryId = fallback.id;
    }

    try {
      const { rows } = await pool.query(
        `INSERT INTO transactions (amount, description, date, category_id)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [Math.abs(amount), description, date, categoryId]
      );
      imported.push(rows[0]);
    } catch (err) {
      errors.push({ row: i + 1, error: err.message });
    }
  }

  res.json({ imported: imported.length, errors });
});

module.exports = router;

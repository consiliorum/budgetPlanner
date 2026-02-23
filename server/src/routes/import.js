const { Router } = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const pool = require('../db/pool');

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const CATEGORY_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399',
  '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6', '#94a3b8',
];

function detectDelimiter(content) {
  const firstLine = content.split('\n')[0];
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons >= commas ? ';' : ',';
}

function parseDate(str) {
  if (!str) return null;
  const trimmed = str.trim();

  // DD.MM.YYYY or DD.MM.YY (German format)
  const ddmmyyyy = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (ddmmyyyy) {
    let [, d, m, y] = ddmmyyyy;
    if (y.length === 2) y = '20' + y;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD/MM/YYYY
  const ddmmyyyy2 = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy2) {
    const [, d, m, y] = ddmmyyyy2;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Try native parse (handles ISO 8601, MM/DD/YYYY, etc.)
  const d = new Date(trimmed);
  if (!isNaN(d)) return d.toISOString().slice(0, 10);

  return null;
}

function parseAmount(str) {
  if (!str) return NaN;
  let s = str.trim();
  // German bank format: spaces as decimal separator, e.g. "-4    86" → "-4.86"
  const spacedDecimal = s.match(/^(-?\d+)\s+(\d{1,2})$/);
  if (spacedDecimal) {
    return parseFloat(`${spacedDecimal[1]}.${spacedDecimal[2].padStart(2, '0')}`);
  }
  // Remove all internal whitespace
  s = s.replace(/\s/g, '');
  // European thousands format: 1.234,56 → 1234.56
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    // Simple comma decimal: -4,86 → -4.86
    s = s.replace(',', '.');
  }
  return parseFloat(s);
}

// Preview CSV columns
router.post('/csv/preview', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const content = req.file.buffer.toString('utf8');
    const delimiter = detectDelimiter(content);
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter,
      bom: true,
      relax_column_count: true,
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
    const content = req.file.buffer.toString('utf8');
    const delimiter = detectDelimiter(content);
    records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter,
      bom: true,
      relax_column_count: true,
    });
  } catch (err) {
    return res.status(400).json({ error: 'Failed to parse CSV: ' + err.message });
  }

  // Load categories for matching
  const { rows: categories } = await pool.query('SELECT id, name, type, color FROM categories');
  const catMap = new Map(categories.map(c => [c.name.toLowerCase(), c]));

  const imported = [];
  const errors = [];
  let skipped = 0;

  for (let i = 0; i < records.length; i++) {
    const row = records[i];

    const rawAmount = row[amountCol];
    const amount = parseAmount(rawAmount);
    if (isNaN(amount)) {
      errors.push({ row: i + 1, error: `Invalid amount: "${rawAmount}"` });
      continue;
    }

    const rawDate = row[dateCol];
    const date = parseDate(rawDate);
    if (!date) {
      errors.push({ row: i + 1, error: `Invalid date: "${rawDate}"` });
      continue;
    }

    const description = descriptionCol ? (row[descriptionCol] || '') : '';
    let categoryId = null;

    if (categoryCol && row[categoryCol]) {
      const catName = row[categoryCol].trim();
      const catNameLower = catName.toLowerCase();

      const match = catMap.get(catNameLower);
      if (match) {
        categoryId = match.id;
      } else {
        // Auto-create a new category for this unknown name
        const catType = amount >= 0 ? 'income' : 'expense';
        const colorIdx = catMap.size % CATEGORY_COLORS.length;
        const color = CATEGORY_COLORS[colorIdx];
        try {
          const { rows: newCat } = await pool.query(
            `INSERT INTO categories (name, type, color) VALUES ($1, $2, $3)
             ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [catName, catType, color]
          );
          categoryId = newCat[0].id;
          catMap.set(catNameLower, { id: categoryId, name: catName, type: catType, color });
        } catch (err) {
          // Fallback to Other on any error
          const fallback = amount >= 0
            ? categories.find(c => c.name === 'Other Income')
            : categories.find(c => c.name === 'Other Expense');
          if (fallback) categoryId = fallback.id;
        }
      }
    }

    // If still no category, fall back to Other Income / Other Expense
    if (!categoryId) {
      const fallback = amount >= 0
        ? categories.find(c => c.name === 'Other Income')
        : categories.find(c => c.name === 'Other Expense');
      if (fallback) categoryId = fallback.id;
    }

    const absAmount = Math.abs(amount);

    // Deduplication: skip if same date + amount + description already exists
    const { rows: existing } = await pool.query(
      `SELECT id FROM transactions WHERE date = $1 AND amount = $2 AND description = $3 LIMIT 1`,
      [date, absAmount, description]
    );
    if (existing.length > 0) {
      skipped++;
      continue;
    }

    try {
      const { rows } = await pool.query(
        `INSERT INTO transactions (amount, description, date, category_id)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [absAmount, description, date, categoryId]
      );
      imported.push(rows[0]);
    } catch (err) {
      errors.push({ row: i + 1, error: err.message });
    }
  }

  res.json({ imported: imported.length, skipped, errors });
});

module.exports = router;

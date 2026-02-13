const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
        color VARCHAR(7) NOT NULL DEFAULT '#6b7280'
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        amount NUMERIC(12,2) NOT NULL,
        description VARCHAR(255) NOT NULL DEFAULT '',
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        is_recurring BOOLEAN NOT NULL DEFAULT false,
        recurring_interval VARCHAR(10) CHECK (recurring_interval IN ('daily', 'weekly', 'monthly', 'yearly')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS recurring_templates (
        id SERIAL PRIMARY KEY,
        amount NUMERIC(12,2) NOT NULL,
        description VARCHAR(255) NOT NULL DEFAULT '',
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        interval VARCHAR(10) NOT NULL CHECK (interval IN ('daily', 'weekly', 'monthly', 'yearly')),
        start_date DATE NOT NULL DEFAULT CURRENT_DATE,
        next_due DATE NOT NULL DEFAULT CURRENT_DATE,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Seed default categories
    const seedCategories = [
      ['Salary', 'income', '#22c55e'],
      ['Freelance', 'income', '#10b981'],
      ['Investments', 'income', '#06b6d4'],
      ['Other Income', 'income', '#8b5cf6'],
      ['Housing', 'expense', '#ef4444'],
      ['Food & Dining', 'expense', '#f97316'],
      ['Transportation', 'expense', '#eab308'],
      ['Utilities', 'expense', '#64748b'],
      ['Entertainment', 'expense', '#ec4899'],
      ['Healthcare', 'expense', '#14b8a6'],
      ['Shopping', 'expense', '#a855f7'],
      ['Education', 'expense', '#3b82f6'],
      ['Other Expense', 'expense', '#6b7280'],
    ];

    for (const [name, type, color] of seedCategories) {
      await client.query(
        `INSERT INTO categories (name, type, color) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING`,
        [name, type, color]
      );
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

const pool = require('./pool');

// Helpers
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.round((Math.random() * (max - min) + min) * 100) / 100;
const date = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const jitter = (base, pct = 0.1) => Math.round(base * (1 + (Math.random() - 0.5) * 2 * pct) * 100) / 100;

async function seed() {
  const client = await pool.connect();
  try {
    // Fetch category IDs by name
    const { rows: cats } = await client.query('SELECT id, name FROM categories');
    const cat = Object.fromEntries(cats.map((c) => [c.name, c.id]));

    const txns = [];

    // 3 months: Dec 2025, Jan 2026, Feb 2026
    const months = [
      { year: 2025, month: 12, days: 31 },
      { year: 2026, month: 1,  days: 31 },
      { year: 2026, month: 2,  days: 23 }, // up to today
    ];

    for (const { year, month, days } of months) {
      // --- INCOME ---

      // Salary on the 1st
      txns.push([jitter(3800, 0), 'Monthly salary', date(year, month, 1), cat['Salary'], true, 'monthly']);

      // Freelance once or twice per month
      txns.push([jitter(450, 0.2), 'Freelance web project', date(year, month, pick([8, 10, 12])), cat['Freelance'], false, null]);
      if (Math.random() > 0.4) {
        txns.push([jitter(280, 0.2), 'Freelance design work', date(year, month, pick([18, 20, 22])), cat['Freelance'], false, null]);
      }

      // Investment returns mid-month
      if (Math.random() > 0.3) {
        txns.push([jitter(120, 0.5), 'ETF dividend payout', date(year, month, pick([14, 15, 16])), cat['Investments'], false, null]);
      }

      // --- HOUSING ---
      // Rent on the 1st
      txns.push([jitter(1150, 0), 'Rent payment', date(year, month, 1), cat['Housing'], true, 'monthly']);
      // Internet
      txns.push([jitter(39.99, 0), 'Internet provider', date(year, month, 5), cat['Utilities'], true, 'monthly']);
      // Phone
      txns.push([jitter(19.99, 0), 'Mobile phone plan', date(year, month, 7), cat['Utilities'], true, 'monthly']);
      // Electricity bill ~every month
      txns.push([rand(60, 95), 'Electricity bill', date(year, month, pick([10, 11, 12])), cat['Utilities'], false, null]);
      // Streaming
      txns.push([17.99, 'Netflix subscription', date(year, month, 3), cat['Entertainment'], true, 'monthly']);
      txns.push([10.99, 'Spotify subscription', date(year, month, 4), cat['Entertainment'], true, 'monthly']);

      // --- FOOD & DINING ---
      // Weekly groceries (~4x per month)
      for (let w = 0; w < 4; w++) {
        const d = Math.min(days, 2 + w * 7 + Math.floor(Math.random() * 3));
        txns.push([rand(55, 110), pick(['Supermarket REWE', 'Edeka groceries', 'Aldi weekly shop', 'Lidl groceries']), date(year, month, d), cat['Food & Dining'], false, null]);
      }
      // Restaurants / takeout (~3–5x)
      const diningCount = 3 + Math.floor(Math.random() * 3);
      const diningDays = Array.from({ length: diningCount }, () => 1 + Math.floor(Math.random() * (days - 1)));
      for (const d of diningDays) {
        txns.push([rand(12, 45), pick(['Restaurant dinner', 'Pizza delivery', 'Lunch at cafe', 'Burger place', 'Sushi takeout', 'Thai food delivery']), date(year, month, d), cat['Food & Dining'], false, null]);
      }
      // Coffee
      const coffeeDays = Array.from({ length: 6 + Math.floor(Math.random() * 4) }, () => 1 + Math.floor(Math.random() * (days - 1)));
      for (const d of coffeeDays) {
        txns.push([rand(3.5, 6.5), pick(['Coffee shop', 'Starbucks', 'Bakery coffee']), date(year, month, d), cat['Food & Dining'], false, null]);
      }

      // --- TRANSPORTATION ---
      // Monthly transit pass
      txns.push([jitter(86, 0), 'Monthly transit pass', date(year, month, 1), cat['Transportation'], true, 'monthly']);
      // Gas once or twice
      txns.push([rand(45, 75), 'Gas station', date(year, month, pick([9, 11, 13])), cat['Transportation'], false, null]);
      if (Math.random() > 0.5) {
        txns.push([rand(40, 70), 'Gas station', date(year, month, pick([20, 22, 24, 26])), cat['Transportation'], false, null]);
      }
      // Occasional taxi/rideshare
      if (Math.random() > 0.4) {
        txns.push([rand(8, 22), pick(['Uber ride', 'Taxi']), date(year, month, pick([5, 12, 17, 23])), cat['Transportation'], false, null]);
      }

      // --- SHOPPING ---
      const shoppingCount = 2 + Math.floor(Math.random() * 3);
      const shoppingDays = Array.from({ length: shoppingCount }, () => 1 + Math.floor(Math.random() * (days - 1)));
      for (const d of shoppingDays) {
        txns.push([rand(15, 120), pick(['Amazon order', 'Clothing store', 'Zalando order', 'Electronics', 'Home goods', 'Sports shop']), date(year, month, d), cat['Shopping'], false, null]);
      }

      // --- HEALTHCARE ---
      if (Math.random() > 0.5) {
        txns.push([rand(20, 60), pick(['Pharmacy', 'Doctor copay', 'Dental checkup']), date(year, month, pick([8, 14, 20])), cat['Healthcare'], false, null]);
      }
      // Health insurance monthly
      txns.push([jitter(185, 0), 'Health insurance', date(year, month, 2), cat['Healthcare'], true, 'monthly']);

      // --- ENTERTAINMENT ---
      if (Math.random() > 0.4) {
        txns.push([rand(15, 50), pick(['Cinema tickets', 'Concert ticket', 'Museum entry', 'Theatre tickets']), date(year, month, pick([6, 13, 19, 25])), cat['Entertainment'], false, null]);
      }
      if (Math.random() > 0.6) {
        txns.push([rand(20, 80), pick(['Bar / night out', 'Sports event', 'Comedy show']), date(year, month, pick([7, 14, 21])), cat['Entertainment'], false, null]);
      }

      // --- EDUCATION ---
      if (month === 12 || month === 1) {
        txns.push([rand(25, 60), pick(['Udemy course', 'Book purchase', 'Online learning subscription']), date(year, month, pick([10, 15, 20])), cat['Education'], false, null]);
      }

      // --- OTHER EXPENSE ---
      if (Math.random() > 0.5) {
        txns.push([rand(10, 40), pick(['Haircut', 'Dry cleaning', 'Post office', 'Bank fee']), date(year, month, pick([8, 16, 23])), cat['Other Expense'], false, null]);
      }
    }

    // Deduplicate amounts to avoid exact same (date, amount, description) collisions
    await client.query('BEGIN');
    let inserted = 0;
    for (const [amount, description, txDate, categoryId, isRecurring, recurringInterval] of txns) {
      await client.query(
        `INSERT INTO transactions (amount, description, date, category_id, is_recurring, recurring_interval)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [amount, description, txDate, categoryId, isRecurring, recurringInterval]
      );
      inserted++;
    }
    await client.query('COMMIT');
    console.log(`Seeded ${inserted} transactions across Dec 2025 – Feb 2026.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();

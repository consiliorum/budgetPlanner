const { Router } = require('express');
const pool = require('../db/pool');

const router = Router();

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM categories ORDER BY type, name');
  res.json(rows);
});

module.exports = router;

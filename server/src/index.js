const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const transactionsRouter = require('./routes/transactions');
const categoriesRouter = require('./routes/categories');
const recurringRouter = require('./routes/recurring');
const importRouter = require('./routes/import');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/transactions', transactionsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/recurring', recurringRouter);
app.use('/api/import', importRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve built React app
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.use((req, res) => res.sendFile(path.join(clientDist, 'index.html')));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

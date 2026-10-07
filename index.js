// LearnFlow backend — Express + SQLite.
// Run:  npm install && npm start   (listens on PORT, default 3001)
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => res.json({ ok: true, service: 'learnflow-backend' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/workspace'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/focus', require('./routes/focus'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/plan', require('./routes/plan'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/entries', require('./routes/entries'));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`LearnFlow backend listening on http://localhost:${PORT}`);
});

module.exports = app;

// PATCH /api/sessions/:id (setsessionstatus) — mark a study session
// planned | completed | missed. Missed sessions feed the adaptive re-planner.
const express = require('express');
const { get, run, mapStudySession } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
const STATUSES = ['planned', 'completed', 'missed'];

router.patch('/:id', requireAuth, (req, res) => {
  const status = String(req.body.status || '').toLowerCase();
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(', ')}.` });
  }
  const row = get('SELECT * FROM study_sessions WHERE id = ? AND account_id = ?', [
    req.params.id,
    req.account.id,
  ]);
  if (!row) return res.status(404).json({ error: 'Study session not found.' });
  run('UPDATE study_sessions SET status = ? WHERE id = ?', [status, row.id]);
  res.json(mapStudySession(get('SELECT * FROM study_sessions WHERE id = ?', [row.id])));
});

module.exports = router;

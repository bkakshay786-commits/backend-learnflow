// POST /api/focus (logfocus) — record a completed Pomodoro/focus block.
const crypto = require('crypto');
const express = require('express');
const { get, run, mapFocusLog } = require('../db');
const { nowIso, requireAuth } = require('../auth');

const router = express.Router();

router.post('/', requireAuth, (req, res) => {
  const minutes = Number(req.body.minutes);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return res.status(400).json({ error: 'Minutes must be a positive number.' });
  }
  const id = crypto.randomUUID();
  run(
    'INSERT INTO focus_logs (id, account_id, minutes, topic, logged_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [
      id,
      req.account.id,
      Math.round(minutes),
      req.body.topic ? String(req.body.topic) : null,
      req.body.loggedAt ? String(req.body.loggedAt) : nowIso(),
      nowIso(),
    ]
  );
  res.status(201).json(mapFocusLog(get('SELECT * FROM focus_logs WHERE id = ?', [id])));
});

module.exports = router;

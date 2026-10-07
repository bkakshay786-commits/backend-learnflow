// POST /api/quiz (recordquiz) — store a quiz result incl. detected weak topics.
const crypto = require('crypto');
const express = require('express');
const { get, run, mapQuizResult } = require('../db');
const { nowIso, requireAuth } = require('../auth');

const router = express.Router();

router.post('/', requireAuth, (req, res) => {
  const score = Number(req.body.score);
  const total = Number(req.body.total);
  if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0 || score < 0 || score > total) {
    return res.status(400).json({ error: 'Score and total must be valid numbers (0 <= score <= total).' });
  }
  const weakTopics = Array.isArray(req.body.weakTopics)
    ? req.body.weakTopics.map(String).map((t) => t.trim()).filter(Boolean)
    : [];
  const id = crypto.randomUUID();
  run(
    'INSERT INTO quiz_results (id, account_id, subject_name, score, total, weak_topics, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      req.account.id,
      req.body.subject ? String(req.body.subject) : null,
      Math.round(score),
      Math.round(total),
      JSON.stringify(weakTopics),
      nowIso(),
    ]
  );
  res.status(201).json(mapQuizResult(get('SELECT * FROM quiz_results WHERE id = ?', [id])));
});

module.exports = router;

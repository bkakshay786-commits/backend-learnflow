// Subjects: POST /api/subjects (addsubject), DELETE /api/subjects/:id (deletesubject)
const crypto = require('crypto');
const express = require('express');
const { get, run, mapSubject } = require('../db');
const { nowIso, requireAuth } = require('../auth');

const router = express.Router();

router.post('/', requireAuth, (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Subject name is required.' });

  const topics = Array.isArray(req.body.topics)
    ? req.body.topics.map(String).map((t) => t.trim()).filter(Boolean)
    : [];
  const priority = Number(req.body.priority);
  const id = crypto.randomUUID();
  run(
    'INSERT INTO subjects (id, account_id, name, exam_date, priority, topics, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      req.account.id,
      name,
      req.body.examDate ? String(req.body.examDate) : null,
      Number.isFinite(priority) ? Math.min(5, Math.max(1, Math.round(priority))) : 3,
      JSON.stringify(topics),
      nowIso(),
    ]
  );
  res.status(201).json(mapSubject(get('SELECT * FROM subjects WHERE id = ?', [id])));
});

router.delete('/:id', requireAuth, (req, res) => {
  const result = run('DELETE FROM subjects WHERE id = ? AND account_id = ?', [
    req.params.id,
    req.account.id,
  ]);
  if (result.changes === 0) return res.status(404).json({ error: 'Subject not found.' });
  res.json({ ok: true });
});

module.exports = router;

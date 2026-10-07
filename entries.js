// Generic entries: POST /api/entries, GET /api/entries, DELETE /api/entries/:id
// A flexible key-value store per account (kind + JSON data) for anything the
// client wants to persist that has no dedicated table.
const crypto = require('crypto');
const express = require('express');
const { get, query, run, mapEntry } = require('../db');
const { nowIso, requireAuth } = require('../auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const rows = query('SELECT * FROM entries WHERE account_id = ? ORDER BY created_at DESC', [
    req.account.id,
  ]).map(mapEntry);
  res.json(rows);
});

router.post('/', requireAuth, (req, res) => {
  const kind = String(req.body.kind || '').trim();
  if (!kind) return res.status(400).json({ error: 'Entry kind is required.' });
  const id = crypto.randomUUID();
  run('INSERT INTO entries (id, account_id, kind, data, created_at) VALUES (?, ?, ?, ?, ?)', [
    id,
    req.account.id,
    kind,
    JSON.stringify(req.body.data === undefined ? {} : req.body.data),
    nowIso(),
  ]);
  res.status(201).json(mapEntry(get('SELECT * FROM entries WHERE id = ?', [id])));
});

router.delete('/:id', requireAuth, (req, res) => {
  const result = run('DELETE FROM entries WHERE id = ? AND account_id = ?', [
    req.params.id,
    req.account.id,
  ]);
  if (result.changes === 0) return res.status(404).json({ error: 'Entry not found.' });
  res.json({ ok: true });
});

module.exports = router;

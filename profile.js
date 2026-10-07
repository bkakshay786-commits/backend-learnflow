// PATCH /api/profile (updateprofile) — update the signed-in account's name.
const express = require('express');
const { get, run } = require('../db');
const { requireAuth, publicAccount } = require('../auth');

const router = express.Router();

router.patch('/', requireAuth, (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name cannot be empty.' });
  run('UPDATE accounts SET name = ? WHERE id = ?', [name, req.account.id]);
  const row = get('SELECT id, name, email, created_at FROM accounts WHERE id = ?', [req.account.id]);
  res.json(publicAccount({ id: row.id, name: row.name, email: row.email, createdAt: row.created_at }));
});

module.exports = router;

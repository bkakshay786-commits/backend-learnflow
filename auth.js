// POST /api/auth/signup  {name, email, password}
// POST /api/auth/login   {email, password}
// POST /api/auth/logout  (Bearer token)
const crypto = require('crypto');
const express = require('express');
const { get, run } = require('../db');
const {
  nowIso,
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  publicAccount,
  requireAuth,
} = require('../auth');

const router = express.Router();

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

router.post('/signup', (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!name) return res.status(400).json({ error: 'Please enter your name.' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const existing = get('SELECT id FROM accounts WHERE email = ?', [email]);
  if (existing) {
    // Clear message instead of a generic 500 (matches the hosted app fix).
    return res.status(409).json({ error: 'An account with this email already exists. Try signing in.' });
  }

  const account = {
    id: crypto.randomUUID(),
    name,
    email,
    password_hash: hashPassword(password),
    created_at: nowIso(),
  };
  run('INSERT INTO accounts (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)', [
    account.id,
    account.name,
    account.email,
    account.password_hash,
    account.created_at,
  ]);

  const session = createSession(account.id);
  res.status(201).json({
    token: session.token,
    expiresAt: session.expiresAt,
    user: publicAccount({ ...account, createdAt: account.created_at }),
  });
});

router.post('/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!isValidEmail(email) || !password) {
    return res.status(400).json({ error: 'Please enter your email and password.' });
  }

  const row = get('SELECT * FROM accounts WHERE email = ?', [email]);
  if (!row || !verifyPassword(password, row.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const session = createSession(row.id);
  res.json({
    token: session.token,
    expiresAt: session.expiresAt,
    user: publicAccount({ id: row.id, name: row.name, email: row.email, createdAt: row.created_at }),
  });
});

router.post('/logout', requireAuth, (req, res) => {
  destroySession(req.token);
  res.json({ ok: true });
});

module.exports = router;

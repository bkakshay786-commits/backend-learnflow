// POST /api/plan (generateplan) — persist a generated day-by-day timetable.
// The client computes the allocation (subjects, exam dates, priorities,
// available hours); the server stores the resulting sessions so they survive
// reloads and can be rebalanced when sessions are missed.
// Body: { sessions: [{ subject, topic, date, startTime, durationMin }], replace?: boolean }
// When replace=true (default), future 'planned' sessions are cleared first so a
// re-generated plan never duplicates upcoming blocks.
const crypto = require('crypto');
const express = require('express');
const { query, run, transaction, mapStudySession } = require('../db');
const { nowIso, requireAuth } = require('../auth');

const router = express.Router();

router.post('/', requireAuth, (req, res) => {
  const sessions = req.body.sessions;
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return res.status(400).json({ error: 'Provide a non-empty sessions array.' });
  }

  const replace = req.body.replace !== false;
  const today = new Date().toISOString().slice(0, 10);

  const ids = transaction(() => {
    if (replace) {
      run("DELETE FROM study_sessions WHERE account_id = ? AND status = 'planned' AND date >= ?", [
        req.account.id,
        today,
      ]);
    }
    const created = [];
    for (const s of sessions) {
      if (!s || !s.date) continue;
      const duration = Number(s.durationMin);
      const id = crypto.randomUUID();
      run(
        'INSERT INTO study_sessions (id, account_id, subject_name, topic, date, start_time, duration_min, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          req.account.id,
          s.subject ? String(s.subject) : null,
          s.topic ? String(s.topic) : null,
          String(s.date).slice(0, 10),
          s.startTime ? String(s.startTime) : null,
          Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 25,
          'planned',
          nowIso(),
        ]
      );
      created.push(id);
    }
    return created;
  });

  if (ids.length === 0) return res.status(400).json({ error: 'No valid sessions to store.' });
  const placeholders = ids.map(() => '?').join(',');
  const rows = query(`SELECT * FROM study_sessions WHERE id IN (${placeholders})`, ids);
  res.status(201).json({ count: rows.length, sessions: rows.map(mapStudySession) });
});

module.exports = router;

// Tasks: POST /api/tasks (addtask), PATCH /api/tasks/:id/toggle (toggletask),
// DELETE /api/tasks/:id (deletetask)
const crypto = require('crypto');
const express = require('express');
const { get, run, mapTask } = require('../db');
const { nowIso, requireAuth } = require('../auth');

const router = express.Router();
const PRIORITIES = ['low', 'medium', 'high'];

router.post('/', requireAuth, (req, res) => {
  const title = String(req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Task title is required.' });

  const priority = String(req.body.priority || 'medium').toLowerCase();
  const id = crypto.randomUUID();
  run(
    'INSERT INTO tasks (id, account_id, title, subject_name, priority, due_date, done, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      req.account.id,
      title,
      req.body.subject ? String(req.body.subject) : null,
      PRIORITIES.includes(priority) ? priority : 'medium',
      req.body.dueDate ? String(req.body.dueDate) : null,
      0,
      nowIso(),
    ]
  );
  res.status(201).json(mapTask(get('SELECT * FROM tasks WHERE id = ?', [id])));
});

router.patch('/:id/toggle', requireAuth, (req, res) => {
  const row = get('SELECT * FROM tasks WHERE id = ? AND account_id = ?', [
    req.params.id,
    req.account.id,
  ]);
  if (!row) return res.status(404).json({ error: 'Task not found.' });
  run('UPDATE tasks SET done = ? WHERE id = ?', [row.done ? 0 : 1, row.id]);
  res.json(mapTask(get('SELECT * FROM tasks WHERE id = ?', [row.id])));
});

router.delete('/:id', requireAuth, (req, res) => {
  const result = run('DELETE FROM tasks WHERE id = ? AND account_id = ?', [
    req.params.id,
    req.account.id,
  ]);
  if (result.changes === 0) return res.status(404).json({ error: 'Task not found.' });
  res.json({ ok: true });
});

module.exports = router;

// GET /api/workspace — everything the client needs in one call, scoped to the
// signed-in account. (Mirrors the hosted `getworkspace` action.)
const express = require('express');
const { query, mapSubject, mapTask, mapFocusLog, mapQuizResult, mapStudySession, mapEntry } = require('../db');
const { requireAuth, publicAccount } = require('../auth');

const router = express.Router();

router.get('/workspace', requireAuth, (req, res) => {
  const accountId = req.account.id;

  const subjects = query('SELECT * FROM subjects WHERE account_id = ? ORDER BY created_at ASC', [
    accountId,
  ]).map(mapSubject);
  const tasks = query('SELECT * FROM tasks WHERE account_id = ? ORDER BY created_at ASC', [
    accountId,
  ]).map(mapTask);
  const focusLogs = query('SELECT * FROM focus_logs WHERE account_id = ? ORDER BY logged_at DESC', [
    accountId,
  ]).map(mapFocusLog);
  const quizResults = query(
    'SELECT * FROM quiz_results WHERE account_id = ? ORDER BY created_at DESC',
    [accountId]
  ).map(mapQuizResult);
  const studySessions = query(
    'SELECT * FROM study_sessions WHERE account_id = ? ORDER BY date ASC, start_time ASC',
    [accountId]
  ).map(mapStudySession);
  const entries = query('SELECT * FROM entries WHERE account_id = ? ORDER BY created_at DESC', [
    accountId,
  ]).map(mapEntry);

  const totalFocusMinutes = focusLogs.reduce((sum, f) => sum + (f.minutes || 0), 0);
  const quizAverage =
    quizResults.length > 0
      ? quizResults.reduce((sum, q) => sum + (q.total > 0 ? (q.score / q.total) * 100 : 0), 0) /
        quizResults.length
      : 0;
  const weakTopics = [...new Set(quizResults.flatMap((q) => q.weakTopics || []))];

  res.json({
    user: publicAccount(req.account),
    subjects,
    tasks,
    focusLogs,
    quizResults,
    studySessions,
    entries,
    stats: {
      totalFocusMinutes,
      quizAverage: Math.round(quizAverage),
      weakTopics,
      completedTasks: tasks.filter((t) => t.done).length,
      completedSessions: studySessions.filter((s) => s.status === 'completed').length,
    },
  });
});

module.exports = router;

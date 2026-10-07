// SQLite database layer (node:sqlite, built into Node.js 22.5+ — no native
// dependencies). Tables mirror the LearnFlow data model: accounts,
// auth_sessions, subjects, tasks, focus_logs, quiz_results, study_sessions
// and a generic entries table.
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'learnflow.db');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON auth_sessions(token);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exam_date TEXT,
  priority INTEGER NOT NULL DEFAULT 3,
  topics TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subjects_account ON subjects(account_id);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject_name TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date TEXT,
  done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_account ON tasks(account_id);

CREATE TABLE IF NOT EXISTS focus_logs (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  minutes INTEGER NOT NULL,
  topic TEXT,
  logged_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_focus_account ON focus_logs(account_id);

CREATE TABLE IF NOT EXISTS quiz_results (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  subject_name TEXT,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  weak_topics TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_quiz_account ON quiz_results(account_id);

CREATE TABLE IF NOT EXISTS study_sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  subject_name TEXT,
  topic TEXT,
  date TEXT NOT NULL,
  start_time TEXT,
  duration_min INTEGER NOT NULL DEFAULT 25,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_account ON study_sessions(account_id);

CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_entries_account ON entries(account_id);
`);

function query(sql, params = []) {
  return db.prepare(sql).all(...params);
}

function get(sql, params = []) {
  return db.prepare(sql).get(...params) || null;
}

function run(sql, params = []) {
  const result = db.prepare(sql).run(...params);
  return { changes: Number(result.changes), lastInsertRowid: result.lastInsertRowid };
}

// Manual transaction helper (node:sqlite has no .transaction() helper).
function transaction(fn) {
  db.exec('BEGIN;');
  try {
    const result = fn();
    db.exec('COMMIT;');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      /* ignore */
    }
    throw err;
  }
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapSubject(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    examDate: row.exam_date,
    priority: row.priority,
    topics: parseJson(row.topics, []),
    createdAt: row.created_at,
  };
}

function mapTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    subject: row.subject_name,
    priority: row.priority,
    dueDate: row.due_date,
    done: !!row.done,
    createdAt: row.created_at,
  };
}

function mapFocusLog(row) {
  if (!row) return null;
  return {
    id: row.id,
    minutes: row.minutes,
    topic: row.topic,
    loggedAt: row.logged_at,
    createdAt: row.created_at,
  };
}

function mapQuizResult(row) {
  if (!row) return null;
  return {
    id: row.id,
    subject: row.subject_name,
    score: row.score,
    total: row.total,
    weakTopics: parseJson(row.weak_topics, []),
    createdAt: row.created_at,
  };
}

function mapStudySession(row) {
  if (!row) return null;
  return {
    id: row.id,
    subject: row.subject_name,
    topic: row.topic,
    date: row.date,
    startTime: row.start_time,
    durationMin: row.duration_min,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapEntry(row) {
  if (!row) return null;
  return {
    id: row.id,
    kind: row.kind,
    data: parseJson(row.data, {}),
    createdAt: row.created_at,
  };
}

module.exports = {
  db,
  query,
  get,
  run,
  transaction,
  parseJson,
  mapSubject,
  mapTask,
  mapFocusLog,
  mapQuizResult,
  mapStudySession,
  mapEntry,
};

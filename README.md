# LearnFlow Backend

Self-hostable backend for the **LearnFlow Smart Study Planner** app — a REST API built with
**Express + SQLite** (via `node:sqlite`, built into Node.js — zero native dependencies, so
`npm install` works anywhere). It implements the same API surface as the hosted
LearnFlow app: accounts with secure sign-up / sign-in (30-day sessions), subjects, tasks,
focus logging, quiz results with weak-topic tracking, study-session timetables, and a generic
entries store. All data is strictly scoped to the signed-in account.

## Quick start

Requirements: **Node.js 22+** and npm.

```bash
cd learnflow-backend
npm install
npm start
# → LearnFlow backend listening on http://localhost:3001
```

Configuration (optional, via environment variables or a `.env` file — see `.env.example`):

| Variable  | Default           | Purpose                          |
|-----------|-------------------|----------------------------------|
| `PORT`    | `3001`            | HTTP port                        |
| `DB_PATH` | `./learnflow.db`  | SQLite file location             |

Development with auto-reload: `npm run dev`.

## Authentication

All endpoints except `POST /api/auth/signup`, `POST /api/auth/login` and `GET /health`
require a bearer token:

```
Authorization: Bearer <token>
```

Tokens are random 256-bit values stored server-side and expire after **30 days**.
Passwords are hashed with bcrypt. On auth failure the API returns
`401 { "error": "..." }`.

## API reference

### Auth

| Method | Path               | Body                                  | Response |
|--------|--------------------|---------------------------------------|----------|
| POST   | `/api/auth/signup` | `{ name, email, password }` (min 6 chars) | `201 { token, expiresAt, user }` · `409` if the email is already registered |
| POST   | `/api/auth/login`  | `{ email, password }`                 | `{ token, expiresAt, user }` · `401` on bad credentials |
| POST   | `/api/auth/logout` | — (auth required)                     | `{ ok: true }` |

### Workspace

| Method | Path              | Response |
|--------|-------------------|----------|
| GET    | `/api/workspace`  | `{ user, subjects, tasks, focusLogs, quizResults, studySessions, entries, stats }` — everything the client needs in one call. `stats` includes `totalFocusMinutes`, `quizAverage`, `weakTopics`, `completedTasks`, `completedSessions`. |

### Subjects

| Method | Path                  | Body | Response |
|--------|-----------------------|------|----------|
| POST   | `/api/subjects`       | `{ name, examDate?, priority? (1–5), topics?[] }` | `201` subject |
| DELETE | `/api/subjects/:id`   | — | `{ ok: true }` |

### Tasks

| Method | Path                        | Body | Response |
|--------|-----------------------------|------|----------|
| POST   | `/api/tasks`                | `{ title, subject?, priority? (low\|medium\|high), dueDate? }` | `201` task |
| PATCH  | `/api/tasks/:id/toggle`     | — | task with flipped `done` |
| DELETE | `/api/tasks/:id`            | — | `{ ok: true }` |

### Focus (Pomodoro)

| Method | Path          | Body | Response |
|--------|---------------|------|----------|
| POST   | `/api/focus`  | `{ minutes, topic?, loggedAt? }` | `201` focus log |

### Quizzes

| Method | Path         | Body | Response |
|--------|--------------|------|----------|
| POST   | `/api/quiz`  | `{ subject?, score, total, weakTopics?[] }` | `201` quiz result |

### Study sessions (timetable)

| Method | Path                     | Body | Response |
|--------|--------------------------|------|----------|
| PATCH  | `/api/sessions/:id`      | `{ status: planned\|completed\|missed }` | updated session |

### Plan generation

| Method | Path         | Body | Response |
|--------|--------------|------|----------|
| POST   | `/api/plan`  | `{ sessions: [{ subject?, topic?, date (YYYY-MM-DD), startTime?, durationMin? }], replace? }` | `201 { count, sessions }` |

The client computes the allocation (subjects, exam dates, priorities, available hours);
the server persists the resulting sessions. With `replace: true` (default), future
`planned` sessions are cleared first so regenerating never duplicates upcoming blocks.
Marking a session `missed` via `/api/sessions/:id` feeds the adaptive re-planner.

### Profile

| Method | Path             | Body | Response |
|--------|------------------|------|----------|
| PATCH  | `/api/profile`   | `{ name }` | updated user |

### Entries (generic store)

| Method | Path                 | Body | Response |
|--------|----------------------|------|----------|
| GET    | `/api/entries`       | — | entry list |
| POST   | `/api/entries`       | `{ kind, data? }` | `201` entry |
| DELETE | `/api/entries/:id`   | — | `{ ok: true }` |

## Wiring up a frontend

Point the LearnFlow web client at this server by replacing its action calls with `fetch`
requests, e.g.:

```js
const API = 'http://localhost:3001/api';
let token = localStorage.getItem('learnflow_token');

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Sign up
const { token: t, user } = await api('/auth/signup', {
  method: 'POST',
  body: { name: 'Aanya', email: 'aanya@example.com', password: 'secret123' },
});
token = t;
localStorage.setItem('learnflow_token', t);

// Load everything
const workspace = await api('/workspace');
```

For production, serve the API over HTTPS (e.g. behind nginx or a platform like
Render/Fly.io) and set `DB_PATH` to a persistent volume.

## Project layout

```
learnflow-backend/
  src/
    index.js          Express app + route mounting
    db.js             SQLite schema + row mappers
    auth.js           bcrypt hashing, 30-day token sessions, auth middleware
    routes/
      auth.js         signup / login / logout
      workspace.js    one-call workspace snapshot
      subjects.js     add / delete subjects
      tasks.js        add / toggle / delete tasks
      focus.js        log focus blocks
      quiz.js         record quiz results + weak topics
      sessions.js     update session status
      plan.js         persist generated timetables
      profile.js      update profile
      entries.js      generic per-account store
  package.json
  .env.example
```

## License

MIT

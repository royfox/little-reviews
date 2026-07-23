PRAGMA foreign_keys = ON;

CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  type TEXT NOT NULL CHECK (type IN ('Movie', 'TV Show', 'Book', 'Music')),
  rating REAL NOT NULL CHECK (rating >= 0 AND rating <= 5),
  text TEXT NOT NULL,
  release_year INTEGER NOT NULL CHECK (release_year BETWEEN 1800 AND 9999),
  review_date TEXT NOT NULL,
  updated_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX reviews_review_date ON reviews(review_date DESC);

CREATE TABLE app_users (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_iterations INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE app_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX app_sessions_expiry ON app_sessions(expires_at);

CREATE TABLE app_login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_key TEXT NOT NULL,
  attempted_at INTEGER NOT NULL
);

CREATE INDEX app_login_attempts_key_time ON app_login_attempts(attempt_key, attempted_at);

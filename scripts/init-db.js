const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(process.cwd(), 'stacksome.db');

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS publications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,
    feed_url TEXT NOT NULL,
    name TEXT NOT NULL,
    added_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_fetched TEXT
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    publication_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL UNIQUE,
    published_at TEXT,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (publication_id) REFERENCES publications(id)
  );

  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interests TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS weekly_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_label TEXT NOT NULL,
    generated_at TEXT NOT NULL DEFAULT (datetime('now')),
    posts_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS post_signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_url TEXT NOT NULL,
    signal TEXT NOT NULL CHECK(signal IN ('up', 'down', 'read')),
    week_label TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Seed a default empty profile if none exists
const profileCount = db.prepare('SELECT COUNT(*) as count FROM profile').get();
if (profileCount.count === 0) {
  db.prepare("INSERT INTO profile (interests) VALUES ('')").run();
}

console.log('Database initialized at:', DB_PATH);
db.close();

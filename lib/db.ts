import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let _db: Database.Database | undefined;

function initDb(): Database.Database {
  if (_db) return _db;

  const DATA_DIR = path.join(process.cwd(), "data");
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  _db = new Database(path.join(DATA_DIR, "drjob.db"), { timeout: 10000 });
  _db.pragma("foreign_keys = ON");

  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS resumes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      raw_text TEXT,
      parsed_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS user_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      current_title TEXT,
      years_experience INTEGER,
      summary TEXT,
      parsed_data_json TEXT,
      onboarding_step TEXT DEFAULT 'upload',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS user_skill_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      skill_type TEXT,
      status TEXT DEFAULT 'unsure',
      source TEXT DEFAULT 'ai_suggested',
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS job_title_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'unsure',
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS job_search_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      locations_json TEXT,
      remote_preference TEXT DEFAULT 'hybrid',
      job_types_json TEXT,
      salary_min INTEGER,
      seniority TEXT,
      industries_json TEXT,
      visa_required INTEGER DEFAULT 0,
      willing_to_relocate INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      source TEXT,
      external_id TEXT,
      title TEXT,
      company TEXT,
      location TEXT,
      description TEXT,
      url TEXT,
      salary_min INTEGER,
      salary_max INTEGER,
      posted_at TEXT,
      raw_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS job_matches (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      score INTEGER,
      match_reasons_json TEXT,
      concerns_json TEXT,
      status TEXT DEFAULT 'new',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (job_id) REFERENCES jobs(id)
    );
  `);

  return _db;
}

// Proxy delays DB initialization until the first actual use (at request time, not import time).
// This prevents SQLite lock contention when Next.js build workers import this module in parallel.
const db = new Proxy({} as Database.Database, {
  get(_, prop) {
    return Reflect.get(initDb(), prop as string);
  },
  apply(_, thisArg, args) {
    return Reflect.apply(initDb() as unknown as () => unknown, thisArg, args);
  },
});

export default db;

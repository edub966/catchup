const path = require("path");
const { DatabaseSync } = require("node:sqlite");

function createDatabase() {
  const dbPath = path.join(__dirname, "..", "catchup.sqlite");
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  migrate(db);
  seedDefaultGroup(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      invite_code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS group_members (
      user_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      joined_at TEXT NOT NULL,
      PRIMARY KEY (user_id, group_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      reaction TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (message_id, user_id, reaction),
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS message_scores (
      message_id TEXT PRIMARY KEY,
      base_score INTEGER NOT NULL,
      reaction_boost INTEGER NOT NULL,
      final_score INTEGER NOT NULL,
      signal_category TEXT NOT NULL,
      signal_confidence INTEGER NOT NULL,
      matched_rules TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_last_seen (
      user_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      PRIMARY KEY (user_id, group_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS catchup_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      from_seen_at TEXT,
      to_seen_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS catchup_items (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      rank INTEGER NOT NULL,
      final_score INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES catchup_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS catchup_feedback (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      rating TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES catchup_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS signal_audits (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      manual_rating TEXT,
      corrected_category TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_group_created ON messages(group_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_scores_final ON message_scores(final_score);
    CREATE INDEX IF NOT EXISTS idx_reactions_message ON reactions(message_id);
  `);
}

function seedDefaultGroup(db) {
  const existing = db.prepare("SELECT id FROM groups WHERE invite_code = ?").get("KETCHUP");
  if (existing) return;

  const now = new Date().toISOString();
  db.prepare("INSERT INTO groups (id, name, invite_code, created_at) VALUES (?, ?, ?, ?)").run(
    "group_default",
    "Main CatchUp",
    "KETCHUP",
    now
  );
}

module.exports = {
  createDatabase,
};

// Preserve audit labels, reactions, and historical catch-up sessions. Replace
// only the derived per-message score, once per scoring revision.
function refreshStoredScores(db, revision, updateScore) {
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec("CREATE TABLE IF NOT EXISTS scoring_revision (id INTEGER PRIMARY KEY CHECK(id = 1), revision TEXT NOT NULL)");
    const current = db.prepare("SELECT revision FROM scoring_revision WHERE id = 1").get();
    if (current?.revision !== revision) {
      for (const row of db.prepare("SELECT id, text FROM messages").iterate()) {
        updateScore(row.id, row.text);
      }
      db.prepare("INSERT OR REPLACE INTO scoring_revision VALUES (1, ?)").run(revision);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
module.exports = { refreshStoredScores };

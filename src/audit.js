const { randomUUID } = require("node:crypto");

function saveAudit(db, messageId, rating) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO signal_audits (
      id,
      message_id,
      manual_rating,
      corrected_category,
      notes,
      created_at,
      updated_at
    )
    VALUES (COALESCE((SELECT id FROM signal_audits WHERE message_id = ? ORDER BY updated_at DESC, id DESC LIMIT 1), ?), ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      manual_rating = excluded.manual_rating,
      corrected_category = excluded.corrected_category,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `).run(
    messageId, randomUUID(),
    messageId,
    rating.manualRating || null,
    rating.correctedCategory || null,
    rating.notes || null,
    now,
    now
  );
}

module.exports = {saveAudit};

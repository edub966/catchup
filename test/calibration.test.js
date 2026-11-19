const assert = require("node:assert/strict");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");
const { scoreMessage } = require("../src/scoring");
const { fit } = require("../scripts/calibration/train");
const { trainingRows } = require("../scripts/calibration/corpus");
const holdout = require("../scripts/calibration/holdout");
const { refreshStoredScores } = require("../src/rescore");

test("saved weights reproduce and held-out texts are absent from training", () => {
  assert.deepEqual(fit(), require("../src/calibrated-weights.json"));
  const texts = new Set(trainingRows().map(row => row.text.toLowerCase()));
  for (const [,text] of Object.values(holdout).flat()) assert.ok(!texts.has(text.toLowerCase()));
});

test("meeting instructions, recollections and unrelated quantities score differently", () => {
  const direct = scoreMessage("meet at north entrance by 7");
  assert.ok(direct.finalScore >= 65);
  assert.ok(direct.matchedRules.some(rule => rule.id === "cal.rendezvous"));
  assert.ok(scoreMessage("remember when we had to meet at north entrance by 7", {pin: 3}).finalScore < 65);
  assert.ok(scoreMessage("be at least 18 by 7").finalScore < 65);
  assert.ok(scoreMessage("yesterday meet at the gate by 7; practice moved indoors tonight").finalScore >= 65);
  assert.equal(scoreMessage("meet at north entrance by 7; meet at north entrance by 7").matchedRules.filter(rule => rule.id === "cal.rendezvous").length, 1);
});

test("derived-score migration rolls back partial updates and skips completed revisions", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE messages(id INTEGER PRIMARY KEY,text TEXT); INSERT INTO messages VALUES (1,'a'),(2,'b'); CREATE TABLE scores(id INTEGER PRIMARY KEY)");
    const write = id => db.prepare("INSERT INTO scores VALUES (?)").run(id);
    assert.throws(() => refreshStoredScores(db, "v1", id => {
      if (id === 2) throw Error("interrupted");
      write(id);
    }), /interrupted/);
    assert.equal(db.prepare("SELECT count(*) AS n FROM scores").get().n, 0);
    refreshStoredScores(db, "v1", write);
    refreshStoredScores(db, "v1", () => assert.fail("unexpected rebuild"));
    assert.equal(db.prepare("SELECT count(*) AS n FROM scores").get().n, 2);
  } finally {
    db.close();
  }
});

test("reviewers can save and revise a label on the actual SQLite schema", () => {
  const {createDatabase} = require("../src/db");
  const {saveAudit} = require("../src/audit");
  const db = createDatabase(":memory:");
  try {
    db.exec("INSERT INTO users VALUES ('u','tester','now'); INSERT INTO messages(id,group_id,user_id,text,created_at) VALUES ('m','group_default','u','see you there','now')");
    saveAudit(db, "m", {manualRating: "important"});
    saveAudit(db, "m", {manualRating: "not_important", notes: "needs the earlier question"});
    const rows = db.prepare("SELECT manual_rating, notes FROM signal_audits").all();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].manual_rating, "not_important");
    assert.equal(rows[0].notes, "needs the earlier question");
  } finally {
    db.close();
  }
});

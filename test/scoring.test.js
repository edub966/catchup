const assert = require("node:assert/strict");
const test = require("node:test");
const { scoreMessage } = require("../src/scoring");
const fixtures = require("./scoring.fixtures");

const IMPORTANT_THRESHOLD = 65;

test("fixture set is broad enough for Sprint 3 calibration", () => {
  assert.ok(fixtures.length >= 80);
  for (const fixture of fixtures) {
    assert.equal(typeof fixture.text, "string");
    assert.equal(typeof fixture.expectedCategory, "string");
    assert.equal(typeof fixture.minScore, "number");
    assert.equal(typeof fixture.maxScore, "number");
    assert.equal(typeof fixture.notes, "string");
  }
});

test("scoreMessage returns the expected object shape", () => {
  const score = scoreMessage("formal tickets due tomorrow", { "✅": 1 });

  assert.deepEqual(Object.keys(score), [
    "baseScore",
    "reactionBoost",
    "finalScore",
    "signalCategory",
    "signalConfidence",
    "matchedRules",
  ]);
  assert.equal(typeof score.baseScore, "number");
  assert.equal(typeof score.reactionBoost, "number");
  assert.equal(typeof score.finalScore, "number");
  assert.equal(typeof score.signalCategory, "string");
  assert.equal(typeof score.signalConfidence, "number");
  assert.ok(Array.isArray(score.matchedRules));
});

test("scores are clamped from 0 to 100", () => {
  const noisy = scoreMessage("lol", { "😂": 100, "🔥": 100 });
  const urgent = scoreMessage("formal tickets due tomorrow at 5pm mandatory reminder", {
    "📌": 10,
    "✅": 10,
    "👀": 10,
  });

  assert.equal(noisy.baseScore, 0);
  assert.ok(noisy.finalScore >= 0);
  assert.ok(noisy.finalScore <= 100);
  assert.equal(urgent.finalScore, 100);
});

test("matched rules are explainable", () => {
  const score = scoreMessage("need 3 sober drivers tonight");

  assert.ok(score.matchedRules.length >= 3);
  for (const rule of score.matchedRules) {
    assert.match(rule.id, /^[a-z]+[a-z0-9.-]*$/);
    assert.equal(typeof rule.label, "string");
    assert.ok(rule.label.length > 8);
    assert.equal(typeof rule.delta, "number");
    assert.equal(rule.points, rule.delta);
    assert.equal(typeof rule.category, "string");
  }
});

test("realistic fixtures stay inside expected score bands and categories", () => {
  const failures = [];

  for (const fixture of fixtures) {
    const score = scoreMessage(fixture.text, fixture.reactions);
    if (score.signalCategory !== fixture.expectedCategory) {
      failures.push(`${fixture.text}: category ${score.signalCategory} !== ${fixture.expectedCategory}`);
    }
    if (score.finalScore < fixture.minScore || score.finalScore > fixture.maxScore) {
      failures.push(`${fixture.text}: score ${score.finalScore} not in ${fixture.minScore}-${fixture.maxScore}`);
    }
  }

  assert.deepEqual(failures, []);
});

test("obvious noise stays below the Important threshold", () => {
  const noise = fixtures.filter((fixture) => fixture.expectedCategory === "noise");

  assert.ok(noise.length >= 25);
  for (const fixture of noise) {
    const score = scoreMessage(fixture.text, fixture.reactions);
    assert.ok(score.finalScore < IMPORTANT_THRESHOLD, `${fixture.text} scored ${score.finalScore}`);
  }
});

test("obvious deadlines score high", () => {
  const deadlines = [
    "formal tickets due tomorrow",
    "submit dues by Sunday",
    "dues are due by 5pm Friday",
    "last day to buy wristbands is Friday",
  ];

  for (const text of deadlines) {
    const score = scoreMessage(text);
    assert.equal(score.signalCategory, "deadline");
    assert.ok(score.finalScore >= IMPORTANT_THRESHOLD, `${text} scored ${score.finalScore}`);
  }
});

test("requests and logistics score medium-high without needing reactions", () => {
  const samples = [
    "can someone bring speakers",
    "we need one more for the Uber",
    "need 3 sober drivers tonight",
    "who can drive Friday?",
  ];

  for (const text of samples) {
    const score = scoreMessage(text);
    assert.ok(score.finalScore >= 45, `${text} scored ${score.finalScore}`);
    assert.ok(["request", "logistics"].includes(score.signalCategory), `${text} was ${score.signalCategory}`);
  }
});

test("reaction boosts are capped based on base score", () => {
  const noise = scoreMessage("lol", { "📌": 10, "✅": 10, "👀": 10, "🔥": 10 });
  const medium = scoreMessage("where are we meeting?", { "❓": 10, "👀": 10 });
  const high = scoreMessage("formal tickets due tomorrow", { "📌": 10, "✅": 10 });

  assert.ok(noise.reactionBoost <= 8);
  assert.ok(medium.reactionBoost <= 18);
  assert.ok(high.reactionBoost <= 30);
});

test("laugh, skull, and fire reactions do not push pure noise into Important", () => {
  const score = scoreMessage("that was crazy", {
    "😂": 20,
    "💀": 20,
    "🔥": 20,
  });

  assert.equal(score.signalCategory, "noise");
  assert.ok(score.finalScore < IMPORTANT_THRESHOLD);
});

test("validating reactions can lift real planning signal appropriately", () => {
  const unreacted = scoreMessage("where are we meeting?");
  const reacted = scoreMessage("where are we meeting?", { "❓": 3, "👀": 1 });

  assert.ok(reacted.finalScore > unreacted.finalScore);
  assert.ok(reacted.reactionBoost > 0);
  assert.ok(reacted.finalScore < 80);
});

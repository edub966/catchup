// Each distinct normalized template contributes once to the logistic fit.
const assert = require("node:assert/strict");
const {createHash} = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {scoreWithWeights, normalizeText} = require("../../src/scoring");
const {features, key} = require("../../src/ranking");
const {metrics} = require("./evaluate");
const messages = require("../../work/simulation/output/simulated-messages.json");

function fit(rows) {
  const templates = new Map();
  for (const row of rows) {
    if (!templates.has(row.template)) templates.set(row.template, {text: row.text, labels: new Set()});
    templates.get(row.template).labels.add(row.label);
  }
  const samples = [];
  const frequency = new Map();
  for (const {text, labels} of templates.values()) {
    if (labels.size !== 1) continue;
    const terms = features(normalizeText(text), scoreWithWeights(text).matchedRules);
    for (const term of terms) frequency.set(term, (frequency.get(term) || 0) + 1);
    samples.push({terms, label: Number([...labels][0])});
  }

  const weights = Object.fromEntries([...frequency.keys()].filter(term => frequency.get(term) >= 2).map(term => [term, 0]));
  let bias = 0;
  for (let epoch = 0; epoch < 200; epoch++) {
    // L2 penalty keeps features with few examples from dominating the fit.
    const gradient = Object.fromEntries(Object.entries(weights).map(([term, value]) => [term, 0.5 * value]));
    let interceptGradient = 0;
    for (const {terms, label} of samples) {
      const logOdds = terms.reduce((sum, term) => sum + (weights[term] || 0), bias);
      const error = 1 / (1 + Math.exp(-logOdds)) - label;
      interceptGradient += error;
      for (const term of terms) {
        if (Object.hasOwn(gradient, term)) gradient[term] += error;
      }
    }
    for (const term of Object.keys(weights)) weights[term] -= 0.016 * gradient[term];
    bias -= 0.016 * interceptGradient;
  }
  return {bias, weights};
}

const rows = messages.map(message => {
  const reactions = {};
  for (const {reaction} of message.reactions) reactions[reaction] = (reactions[reaction] || 0) + 1;
  return {
    text: message.text, reactions, label: message.expectedImportance === "important",
    template: key(normalizeText(message.text)),
    fold: createHash("sha256").update(message.groupId).digest().readUInt32BE(0) % 4,
  };
});

for (let fold = 0; fold < 4; fold++) {
  const train = rows.filter(row => row.fold !== fold);
  const seen = new Set(train.map(row => row.template));
  const validation = rows.filter(row => row.fold === fold && !seen.has(row.template));
  const model = fit(train);
  for (const cutoff of [60, 65]) {
    const prior = metrics(validation, (text, reactions) => scoreWithWeights(text, reactions), cutoff);
    const next = metrics(validation, (text, reactions) => scoreWithWeights(text, reactions, undefined, model), cutoff);
    console.log({fold, cutoff, rows: validation.length, unique: new Set(validation.map(row => row.template)).size,
      tpBefore: prior.tp, tpAfter: next.tp, fpBefore: prior.fp, fpAfter: next.fp});
    assert.ok(next.tp >= prior.tp && next.fp <= prior.fp, "Fold regression");
  }
}

const modelPath = path.join(__dirname, "../../src/ranking-model.json");
const fullModel = fit(rows);
if (process.argv.includes("--fit")) {
  fs.writeFileSync(modelPath, JSON.stringify(fullModel, null, 2) + "\n");
} else {
  assert.deepEqual(fullModel, JSON.parse(fs.readFileSync(modelPath, "utf8")));
}

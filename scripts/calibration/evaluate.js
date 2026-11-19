// Paired scores: both versions see identical text and identical reactions.
const fs = require("node:fs");
const path = require("node:path");
const {scoreWithWeights, scoreMessage} = require("../../src/scoring");
const threads = require("./holdout");
const {trainingRows} = require("./corpus");

function metrics(rows, scorer, cutoff) {
  let tp = 0, fp = 0, fn = 0;
  for (const {text, reactions, label} of rows) {
    const shown = scorer(text, reactions).finalScore >= cutoff;
    if (shown && label) tp++;
    else if (shown) fp++;
    else if (label) fn++;
  }
  return {tp, fp, fn, precision: tp / (tp + fp || 1), recall: tp / (tp + fn || 1)};
}

function main() {
  const legacyRows = JSON.parse(fs.readFileSync(path.join(__dirname, "../../work/simulation/output/simulated-messages.json"), "utf8")).map(row => {
    const reactions = {};
    for (const {reaction} of row.reactions) reactions[reaction] = (reactions[reaction] || 0) + 1;
    return {text: row.text, label: row.expectedImportance === "important", reactions};
  });
  const holdout = Object.values(threads).flat().map(([label,text]) => ({label,text}));
  const datasets = {
    "Summer replay": legacyRows,
    "Training variants": trainingRows(),
    "Unseen threads": holdout,
    "Unseen with pin": holdout.map(row => ({...row, reactions: {pin: 1}})),
  };
  if (process.argv[2]) {
    const exported = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
    if (!Array.isArray(exported)) throw Error("Expected a CatchUp audit export array");
    const labeled = exported.filter(row => ["important", "not_important"].includes(row.manual_rating));
    if (!labeled.length) throw Error("No manually rated messages in this export");
    // Old exports omit reaction counts. Compare those as text only for both scorers.
    datasets["Manual audit"] = labeled.map(row => ({
      text: row.text, label: row.manual_rating === "important", reactions: row.reaction_counts || {},
    }));
  }
  const baseline = (text, reactions) => scoreWithWeights(text, reactions, {});
  console.log("| Suite | Rows | Cutoff | Scorer | TP | FP | FN | Precision | Recall |");
  console.log("|---|---:|---:|---|---:|---:|---:|---:|---:|");
  for (const [suite, rows] of Object.entries(datasets)) {
    for (const cutoff of [60, 65]) {
      for (const [name, scorer] of [["Summer", baseline], ["Calibrated", scoreMessage]]) {
        const m = metrics(rows, scorer, cutoff);
        console.log(`| ${suite} | ${rows.length} | ${cutoff} | ${name} | ${m.tp} | ${m.fp} | ${m.fn} | ${(100*m.precision).toFixed(1)}% | ${(100*m.recall).toFixed(1)}% |`);
      }
    }
  }
  console.log("\nHeld-out errors at 65, without reactions:");
  for (const row of holdout) {
    const score = scoreMessage(row.text).finalScore;
    if ((score >= 65) !== Boolean(row.label)) console.log(`- ${row.label ? "Miss" : "False alarm"} (${score}): ${row.text}`);
  }
}
if (require.main === module) main();
module.exports = {metrics};

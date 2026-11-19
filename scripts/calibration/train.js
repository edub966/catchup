// Fit additive score corrections with squared hinge loss and L2 shrinkage.
// Each family gets one vote regardless of its number of slot permutations.
const fs = require("node:fs");
const path = require("node:path");
const {trainingRows} = require("./corpus");
const {normalizeText, scoreWithWeights} = require("../../src/scoring");
const {evidence} = require("../../src/calibration");
function fit() {
  const samples = trainingRows().map(row => {
    const matches = scoreWithWeights(row.text, {}, {}).matchedRules;
    const base = matches.reduce((sum, match) => sum + match.delta, 0);
    return {...row, base, ids: evidence(normalizeText(row.text)).map(match => match.id)};
  });
  const keys = [...new Set(samples.flatMap(row => row.ids))].sort();
  const weights = Object.fromEntries(keys.map(key => [key, 0]));
  for (let step = 0; step < 1200; step++) {
    const gradient = Object.fromEntries(keys.map(key => [key, 0.02 * weights[key]]));
    for (const row of samples) {
      const score = row.ids.reduce((sum, id) => sum + weights[id], row.base);
      const error = row.label ? Math.min(0, score - 70) : Math.max(0, score - 45);
      for (const id of row.ids) gradient[id] += row.weight * error;
    }
    for (const key of keys) weights[key] -= 0.05 * gradient[key];
  }
  return Object.fromEntries(keys.map(key => [key, Math.round(weights[key])]));
}
if (require.main === module) {
  fs.writeFileSync(path.join(__dirname,"../../src/calibrated-weights.json"), JSON.stringify(fit(), null, 2) + "\n");
}
module.exports = {fit};

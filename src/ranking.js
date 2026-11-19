function key(normalized) {
  return normalized.replace(/\d+(?::\d+)?/g," NUM ").replace(/[^a-zA-Z' ]/g," ").replace(/\s+/g," ").trim();
}
function features(normalized, matches) {
  const tokens = key(normalized).split(" ");
  return [...new Set([...tokens.map(token => "word:" + token), ...matches.map(rule => "rule:" + rule.id)])];
}

// Adjust only borderline base scores. A noncurrent or speculative clause
// disqualifies a promotion; reactions still go through the existing caps.
function rankingMatch(text, matches, baseScore, model) {
  if (baseScore < 35 || baseScore > 85) return null;
  const terms = features(text, matches);
  const logOdds = terms.reduce((sum, term) => sum + (model.weights[term] || 0), model.bias);
  const speculative = /\b(?:yesterday|last (?:night|week|month|year|season)|imagine|if|i wish|remember when|maybe)\b/i.test(text);
  let delta = 0;
  if (!speculative && logOdds >= Math.log(0.85 / 0.15) && baseScore < 65) delta = Math.min(15, 65 - baseScore);
  if (logOdds <= Math.log(0.15 / 0.85) && baseScore > 52) delta = -Math.min(18, baseScore - 52);
  if (!delta) return null;
  const evidence = terms.filter(term => (model.weights[term] || 0) * delta > 0)
    .sort((a,b) => Math.abs(model.weights[b]) - Math.abs(model.weights[a])).slice(0,3);
  return {id: "rank.template-model", label: "Fitted ranking evidence: " + evidence.join(", "),
    delta, points: delta, category: "noise"};
}
module.exports = {key, features, rankingMatch};

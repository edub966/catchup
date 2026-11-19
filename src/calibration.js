// Additional evidence for Important feed ranking. The rule ID and fitted point
// adjustment are recorded alongside the original scorer's explanations.
const clock = /\b(?:at|by|before)\s+(?:noon|midnight|(?:[01]?\d|2[0-3])(?::[0-5]\d)?(?:\s?[ap]m)?)(?![\w:])/;
const indicators = [
  ["rendezvous", "Gives a meeting point and time", "event", /\b(?:meet(?: us)?|be|gather|find us|pickup)\s+(?:at|by|in|near|outside|inside)\s+(?!least\b|most\b|odds\b|risk\b|chance\b)\w/],
  ["departure", "Gives an opening or departure time", "event", /\b(?:doors? opens?|(?:bus|train|shuttle|van) leaves?|event starts?)\b/],
  ["staffing", "Specifies staffing and time", "request", /\bneed\s+(?:\d+|one|two|three|four|five)\s+(?:people|volunteers?|helpers?)\b/],
  ["submission", "Specifies a handoff and cutoff", "deadline", /\b(?:submit|send|turn in|drop off|get .+? in)\s+.+?\b(?:before|by)\b|\bget .+? in by\b/],
];
function evidence(text) {
  if (!clock.test(text)) return [];
  const found = indicators.filter(([, , , pattern]) => pattern.test(text));
  // Limit scope to the same clause. A retrospective followed by a fresh
  // instruction should not erase that instruction.
  if (/^(?:remember when|last (?:week|month|year|season)|yesterday|imagine|what if|maybe|i wish)\b/.test(text)) {
    found.push(["noncurrent", "Frames the timing as hypothetical or retrospective", "noise"]);
  }
  return found.map(([id, label, category]) => ({id: "cal." + id, label, category}));
}
module.exports = { evidence };

const REACTION_BOOSTS = {
  "\u{1F4CC}": 25,
  "\u{2705}": 15,
  "\u{1F440}": 10,
  "\u{2753}": 10,
  "\u{1F525}": 8,
  "\u{1F602}": 0,
  "\u{1F480}": 0,
};

const RULES = [
  { id: "date.relative", category: "event", points: 18, pattern: /\b(today|tonight|tomorrow|weekend|next week|this week)\b/i },
  { id: "date.weekday", category: "event", points: 18, pattern: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i },
  { id: "date.numeric", category: "event", points: 18, pattern: /\b\d{1,2}\/\d{1,2}\b/i },
  { id: "time", category: "event", points: 22, pattern: /\b\d{1,2}(:\d{2})?\s?(am|pm)\b|\bat\s+\d{1,2}\b|\bnoon\b|\bmidnight\b/i },
  { id: "deadline.due", category: "deadline", points: 35, pattern: /\b(due|deadline|last day|by tonight|by tomorrow|by friday|by saturday|by sunday)\b/i },
  { id: "request.need", category: "request", points: 30, pattern: /\b(need|needed|looking for|iso)\b/i },
  { id: "request.someone", category: "request", points: 25, pattern: /\b(can someone|could someone|anyone able|anyone got|anyone have)\b/i },
  { id: "logistics.bring", category: "logistics", points: 24, pattern: /\b(bring|speakers|cooler|chairs|table|cups|ice)\b/i },
  { id: "logistics.ride", category: "logistics", points: 28, pattern: /\b(ride|rides|driver|drivers|sober driver|pickup|uber)\b/i },
  { id: "plan.whos-going", category: "plan", points: 28, pattern: /\b(who'?s going|who is going|who wants|who'?s down|who is down|trying to go)\b/i },
  { id: "plan.anyone", category: "plan", points: 18, pattern: /\b(anyone|down for|pulling up|going downtown)\b/i },
  { id: "event.social", category: "event", points: 24, pattern: /\b(party|pregame|formal|concert|game|tailgate|rush|meeting|practice)\b/i },
  { id: "announcement.moved", category: "announcement", points: 30, pattern: /\b(moved|changed|starts|starts at|cancelled|canceled|reminder|announcement|mandatory)\b/i },
  { id: "tickets", category: "deadline", points: 20, pattern: /\b(ticket|tickets|dues|payment|pay)\b/i },
  { id: "question", category: "question", points: 12, pattern: /\?/ },
];

const NOISE_RULES = [
  { id: "noise.short", points: -18, test: (text) => text.trim().length <= 4 },
  { id: "noise.laughter", points: -25, test: (text) => /^(l+o+l+|lmao+|lmfao+|haha+|bro+|nah+|rip+|fr+|ong+)$/i.test(text.trim()) },
  { id: "noise.emoji-only", points: -25, test: (text) => /^[\p{Emoji}\s]+$/u.test(text.trim()) },
  { id: "noise.repeated-char", points: -10, test: (text) => /(.)\1{5,}/i.test(text) },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getCategory(matches) {
  if (!matches.length) return "noise";

  const totals = matches.reduce((acc, match) => {
    acc[match.category] = (acc[match.category] || 0) + match.points;
    return acc;
  }, {});

  return Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0];
}

function scoreMessage(text, reactionCounts = {}) {
  const cleanText = String(text || "").trim();
  const positiveMatches = RULES
    .filter((rule) => rule.pattern.test(cleanText))
    .map((rule) => ({
      id: rule.id,
      category: rule.category,
      points: rule.points,
    }));

  const noiseMatches = NOISE_RULES
    .filter((rule) => rule.test(cleanText))
    .map((rule) => ({
      id: rule.id,
      category: "noise",
      points: rule.points,
    }));

  const baseScore = clamp(
    positiveMatches.reduce((sum, rule) => sum + rule.points, 0) +
      noiseMatches.reduce((sum, rule) => sum + rule.points, 0),
    0,
    100
  );

  const rawReactionBoost = Object.entries(reactionCounts).reduce((sum, [reaction, count]) => {
    return sum + (REACTION_BOOSTS[reaction] || 0) * Number(count);
  }, 0);
  const reactionBoost = clamp(rawReactionBoost, 0, 35);
  const finalScore = clamp(baseScore + reactionBoost, 0, 100);
  const signalCategory = finalScore < 25 ? "noise" : getCategory(positiveMatches);
  const signalConfidence = clamp(Math.round((positiveMatches.length / 4) * 100), 0, 100);

  return {
    baseScore,
    reactionBoost,
    finalScore,
    signalCategory,
    signalConfidence,
    matchedRules: [...positiveMatches, ...noiseMatches],
  };
}

module.exports = {
  REACTION_BOOSTS,
  scoreMessage,
};

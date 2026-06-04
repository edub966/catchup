const IMPORTANT_SIGNAL_FLOOR = 60;

const REACTION_BOOSTS = {
  "\u{1F4CC}": 24,
  "\u{2705}": 12,
  "\u{1F440}": 8,
  "\u{2753}": 8,
  "\u{2754}": 8,
  "\u{1F525}": 3,
  "\u{1F602}": 0,
  "\u{1F923}": 0,
  "\u{1F480}": 0,
};

const REACTION_ALIASES = {
  pin: "\u{1F4CC}",
  pinned: "\u{1F4CC}",
  check: "\u{2705}",
  eyes: "\u{1F440}",
  question: "\u{2753}",
  fire: "\u{1F525}",
  laugh: "\u{1F602}",
  skull: "\u{1F480}",
};

const CATEGORY_WEIGHTS = {
  deadline: 1.25,
  request: 1.15,
  logistics: 1.1,
  announcement: 1.08,
  event: 1,
  plan: 0.95,
  question: 0.8,
  noise: 0,
};

const SOCIAL_EVENTS = /\b(party|pregame|formal|tailgate|rush|chapter|meeting|mixer|downtown|bar|bars|game|concert|date party|function)\b/;
const RIDE_TERMS = /\b(ride|rides|driver|drivers|drive|driving|sober driver|sober drivers|uber|lyft|carpool)\b/;
const SUPPLY_TERMS = /\b(speakers?|cooler|chairs?|table|cups?|ice|drinks?|snacks?|food|water|charger)\b/;
const MONEY_DEADLINE_TERMS = /\b(tickets?|wristbands?|dues|payment|pay|venmo|submit|forms?|waiver|signups?|registration)\b/;
const DATE_TERMS = /\b(today|tonight|tomorrow|weekend|next week|this week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tues|wed|thu|thur|fri|sat|sun)\b|\b\d{1,2}\/\d{1,2}\b/;
const TIME_TERMS = /\b\d{1,2}(:\d{2})?\s?(am|pm)\b|\bat\s+\d{1,2}\b|\b(noon|midnight)\b/;
const QUESTION_INTENT = /\b(where|when|what time|who'?s going|who is going|who all|who can|anyone going|anyone driving|anyone have|anyone got|can someone|could someone)\b|\?/;

function normalizeText(text) {
  return String(text || "")
    .normalize("NFKC")
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function has(pattern, text) {
  pattern.lastIndex = 0;
  return pattern.test(text);
}

function makeRule(id, label, delta, category, test) {
  return { id, label, delta, points: delta, category, test };
}

const SIGNAL_RULES = [
  makeRule("deadline.explicit", "Mentions an explicit deadline", 32, "deadline", (text) =>
    has(/\b(due|deadline|last day|closes?|cutoff|by tonight|by tomorrow|by sunday|by monday|by tuesday|by wednesday|by thursday|by friday|by saturday)\b/, text)
  ),
  makeRule("deadline.payment", "Mentions payment, tickets, dues, or forms", 18, "deadline", (text) =>
    has(MONEY_DEADLINE_TERMS, text)
  ),
  makeRule("request.concrete-need", "Asks for a specific person, item, or help", 28, "request", (text) =>
    has(/\b(need|needed|looking for|iso|we need|need one|need 1|need two|need 2|need three|need 3)\b/, text) &&
    has(new RegExp(`${RIDE_TERMS.source}|${SUPPLY_TERMS.source}|\\b(one more|people|person|volunteer|help|spot|spots)\\b`), text)
  ),
  makeRule("request.can-someone", "Asks whether someone can handle something concrete", 24, "request", (text) =>
    has(/\b(can someone|could someone|can anyone|anyone able|anyone have|anyone got)\b/, text) &&
    has(new RegExp(`${RIDE_TERMS.source}|${SUPPLY_TERMS.source}|\\b(help|bring|grab|pick up|cover|send|make it)\\b`), text)
  ),
  makeRule("logistics.transport", "Mentions rides, drivers, or transportation", 20, "logistics", (text) =>
    has(RIDE_TERMS, text)
  ),
  makeRule("logistics.sober-drivers", "Mentions sober drivers", 30, "logistics", (text) =>
    has(/\bsober drivers?\b/, text)
  ),
  makeRule("logistics.supplies", "Mentions supplies or things to bring", 25, "logistics", (text) =>
    has(/\b(bring|grab|pick up|need|got|have)\b/, text) && has(SUPPLY_TERMS, text)
  ),
  makeRule("request.ticket-availability", "Asks about available tickets or wristbands", 18, "request", (text) =>
    has(/\b(anyone|does anyone|do you|who)\b/, text) && has(/\b(tickets?|wristbands?)\b/, text)
  ),
  makeRule("event.social-anchor", "Mentions a social event or meeting", 12, "event", (text) =>
    has(SOCIAL_EVENTS, text)
  ),
  makeRule("event.starts-time", "Gives a start time for an event", 28, "event", (text) =>
    has(/\b(starts?|start time|begins?|doors)\b/, text) && has(TIME_TERMS, text)
  ),
  makeRule("event.meeting-time", "Gives a meeting, chapter, or rush time", 24, "event", (text) =>
    has(/\b(chapter|meeting|rush|practice)\b/, text) && has(TIME_TERMS, text)
  ),
  makeRule("plan.whos-going", "Asks who is going to a plan", 20, "plan", (text) =>
    has(/\b(who'?s going|who is going|who all is going|who'?s down|who wants to go|anyone going)\b/, text)
  ),
  makeRule("plan.leaving-meeting", "Asks about when or where people are meeting or leaving", 20, "plan", (text) =>
    has(/\b(where are we meeting|where we meeting|what time are (we|y'all|you all) leaving|when are (we|y'all|you all) leaving|where should we meet)\b/, text)
  ),
  makeRule("commitment.availability", "Shares concrete availability or commitment", 22, "plan", (text) =>
    has(/\b(i can|i'm able|im able|i could|i can drive|i'll drive|i will drive|i can bring|i'll bring)\b/, text) &&
    (has(TIME_TERMS, text) || has(DATE_TERMS, text) || has(RIDE_TERMS, text) || has(SUPPLY_TERMS, text))
  ),
  makeRule("announcement.change", "Announces a change, move, cancellation, or reminder", 30, "announcement", (text) =>
    has(/\b(moved|changed|change of plans|cancelled|canceled|postponed|rescheduled|reminder|mandatory|update:|heads up)\b/, text)
  ),
  makeRule("time.relative", "Mentions today, tonight, tomorrow, or this week", 8, "event", (text) =>
    has(/\b(today|tonight|tomorrow|weekend|next week|this week)\b/, text)
  ),
  makeRule("time.weekday", "Mentions a weekday or date", 7, "event", (text) =>
    has(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tues|wed|thu|thur|fri|sat|sun)\b|\b\d{1,2}\/\d{1,2}\b/, text)
  ),
  makeRule("time.explicit", "Mentions a specific time", 12, "event", (text) =>
    has(TIME_TERMS, text)
  ),
  makeRule("question.intent", "Asks a planning or logistics question", 10, "question", (text) =>
    has(QUESTION_INTENT, text)
  ),
];

const CONTEXT_RULES = [
  makeRule("deadline.date-context", "Combines deadline language with a date or time", 18, "deadline", (text) =>
    has(/\b(due|deadline|last day|closes|cutoff|submit|pay|dues|tickets?|forms?)\b/, text) &&
    (has(DATE_TERMS, text) || has(TIME_TERMS, text) || has(/\bby\b/, text))
  ),
  makeRule("event.concrete-time", "Combines event language with concrete time information", 16, "event", (text) =>
    has(SOCIAL_EVENTS, text) && (has(DATE_TERMS, text) || has(TIME_TERMS, text))
  ),
  makeRule("request.urgent-tonight", "Combines a concrete request with tonight or tomorrow", 12, "request", (text) =>
    has(/\b(need|can someone|could someone|anyone able|looking for|iso)\b/, text) &&
    has(/\b(tonight|tomorrow|asap|now)\b/, text)
  ),
  makeRule("request.bring-supplies", "Asks someone to bring specific supplies", 14, "request", (text) =>
    has(/\b(can someone|could someone|can anyone|anyone able|someone|anyone)\b/, text) &&
    has(/\b(bring|grab|pick up)\b/, text) &&
    has(SUPPLY_TERMS, text)
  ),
  makeRule("logistics.uber-count", "Mentions needing one more person for a ride", 20, "logistics", (text) =>
    has(/\b(one more|1 more|need one|need 1)\b/, text) && has(/\b(uber|lyft|ride|car)\b/, text)
  ),
  makeRule("logistics.transport-question", "Asks who can drive or handle a ride", 12, "logistics", (text) =>
    has(/\b(who can|anyone driving|anyone able|can anyone|can someone)\b/, text) && has(RIDE_TERMS, text)
  ),
  makeRule("request.help-needed", "Mentions needing people to help", 10, "request", (text) =>
    has(/\b(need|needed|looking for)\b/, text) && has(/\b(people|person|someone|anyone|help)\b/, text)
  ),
  makeRule("question.event-context", "Asks a question about a social event or meeting", 8, "question", (text) =>
    has(/\?|\b(what time|where|when)\b/, text) && has(SOCIAL_EVENTS, text)
  ),
  makeRule("announcement.date-context", "Combines an announcement with date or time details", 14, "announcement", (text) =>
    has(/\b(moved|changed|cancelled|canceled|postponed|rescheduled|reminder|mandatory|update:|heads up)\b/, text) &&
    (has(DATE_TERMS, text) || has(TIME_TERMS, text))
  ),
  makeRule("structure.concrete-details", "Has enough concrete detail to be useful later", 8, "plan", (text) =>
    text.length >= 24 && (has(DATE_TERMS, text) || has(TIME_TERMS, text)) &&
    has(new RegExp(`${SOCIAL_EVENTS.source}|${RIDE_TERMS.source}|${SUPPLY_TERMS.source}|${MONEY_DEADLINE_TERMS.source}`), text)
  ),
];

const PENALTY_RULES = [
  makeRule("noise.empty", "Empty message", -50, "noise", (text) => !text),
  makeRule("noise.one-word", "One-word or very short reply", -18, "noise", (text) =>
    text.length <= 5 || text.split(/\s+/).length === 1
  ),
  makeRule("noise.laughter", "Laughter-only message", -35, "noise", (text) =>
    has(/^(l+o+l+|lmao+|lmfao+|haha+|ahah+|hehe+)+$/i, text)
  ),
  makeRule("noise.casual-reply", "Casual reply with no actionable detail", -28, "noise", (text) =>
    has(/^(bro|yo|real|nah|w|fire|skull|rip|fr|ong|bet|facts|valid|insane|wild)$/i, text)
  ),
  makeRule("noise.emoji-only", "Emoji-only message", -35, "noise", (text) =>
    text.length > 0 && /^[\p{Emoji_Presentation}\p{Emoji}\uFE0F\s]+$/u.test(text)
  ),
  makeRule("noise.hype-only", "Hype or joke without plan details", -24, "noise", (text) =>
    has(/\b(that was crazy|he fell off|who up|absolute cinema|no shot|you had to be there)\b/, text)
  ),
  makeRule("noise.repeated", "Repeated characters or spammy structure", -16, "noise", (text) =>
    /(.)\1{5,}/i.test(text) || /\b(\w+)\b(?:\s+\1\b){2,}/i.test(text)
  ),
  makeRule("noise.casual-question", "Casual question without planning value", -14, "noise", (text) =>
    has(/\b(can someone explain why|why bro|who up|what is bro doing|are you serious)\b/, text)
  ),
  makeRule("noise.vague-short", "Short vague message without concrete details", -12, "noise", (text) =>
    text.length < 18 && !has(DATE_TERMS, text) && !has(TIME_TERMS, text) && !has(RIDE_TERMS, text)
  ),
];

function toMatch(rule) {
  return {
    id: rule.id,
    label: rule.label,
    delta: rule.delta,
    points: rule.delta,
    category: rule.category,
  };
}

function getMatches(text) {
  const lowerText = text.toLowerCase();
  const signalMatches = SIGNAL_RULES.filter((rule) => rule.test(lowerText)).map(toMatch);
  const contextMatches = CONTEXT_RULES.filter((rule) => rule.test(lowerText)).map(toMatch);
  const penaltyMatches = PENALTY_RULES.filter((rule) => rule.test(lowerText)).map(toMatch);
  return [...signalMatches, ...contextMatches, ...penaltyMatches];
}

function getBaseScore(matches) {
  const positiveTotal = matches
    .filter((match) => match.delta > 0)
    .reduce((sum, match) => sum + match.delta, 0);
  const penaltyTotal = matches
    .filter((match) => match.delta < 0)
    .reduce((sum, match) => sum + match.delta, 0);

  return clamp(positiveTotal + penaltyTotal);
}

function getCategory(matches, finalScore) {
  if (finalScore < 25) return "noise";
  const ids = new Set(matches.map((match) => match.id));
  if (ids.has("deadline.explicit") && ids.has("deadline.date-context")) return "deadline";
  if (ids.has("announcement.change") && ids.has("announcement.date-context")) return "announcement";
  if (ids.has("request.ticket-availability") && !ids.has("deadline.date-context")) return "request";

  const totals = matches.reduce((acc, match) => {
    if (match.delta <= 0 || match.category === "noise") return acc;
    acc[match.category] = (acc[match.category] || 0) + match.delta * (CATEGORY_WEIGHTS[match.category] || 1);
    return acc;
  }, {});

  const [bestCategory] = Object.entries(totals).sort((a, b) => b[1] - a[1])[0] || ["noise"];
  return bestCategory;
}

function getConfidence(matches, baseScore, finalScore) {
  if (finalScore < 25) return clamp(20 + finalScore / 2);

  const positiveCount = matches.filter((match) => match.delta > 0).length;
  const contextCount = matches.filter((match) => match.id.includes(".date-context") || match.id.includes(".concrete") || match.id.includes(".urgent")).length;
  return clamp(30 + positiveCount * 8 + contextCount * 10 + baseScore / 3);
}

function normalizeReaction(reaction) {
  const value = String(reaction).normalize("NFKC").replace(/\uFE0F/g, "");
  return REACTION_ALIASES[value.toLowerCase()] || value;
}

function scoreReactions(reactionCounts, baseScore) {
  const rawBoost = Object.entries(reactionCounts || {}).reduce((sum, [reaction, count]) => {
    const normalized = normalizeReaction(reaction);
    return sum + (REACTION_BOOSTS[normalized] || 0) * Math.max(0, Number(count) || 0);
  }, 0);

  let cap = 30;
  if (baseScore < 25) cap = 8;
  else if (baseScore < IMPORTANT_SIGNAL_FLOOR) cap = 18;

  return clamp(Math.min(rawBoost, cap), 0, cap);
}

function scoreMessage(text, reactionCounts = {}) {
  const cleanText = normalizeText(text);
  const matchedRules = getMatches(cleanText);
  const baseScore = getBaseScore(matchedRules);
  const reactionBoost = scoreReactions(reactionCounts, baseScore);
  const finalScore = clamp(baseScore + reactionBoost);
  const signalCategory = getCategory(matchedRules, finalScore);
  const signalConfidence = getConfidence(matchedRules, baseScore, finalScore);

  return {
    baseScore,
    reactionBoost,
    finalScore,
    signalCategory,
    signalConfidence,
    matchedRules,
  };
}

module.exports = {
  REACTION_BOOSTS,
  scoreMessage,
};

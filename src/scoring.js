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

const WORD_ALIASES = {
  "2nite": "tonight",
  addy: "address",
  adress: "address",
  assn: "assignment",
  b4: "before",
  bc: "because",
  cancellled: "cancelled",
  drvr: "driver",
  drvrs: "drivers",
  driverz: "drivers",
  fits: "outfits",
  fri: "friday",
  gbm: "general body meeting",
  hw: "homework",
  jersies: "jerseys",
  loc: "location",
  min: "minute",
  mins: "minutes",
  mtg: "meeting",
  meetign: "meeting",
  meating: "meeting",
  meetin: "meeting",
  midnite: "midnight",
  ppl: "people",
  prac: "practice",
  preg: "pregame",
  pset: "problem set",
  rn: "right now",
  rm: "room",
  resy: "reservation",
  restaraunt: "restaurant",
  sat: "saturday",
  sc: "soundcheck",
  souncheck: "soundcheck",
  speakrs: "speakers",
  spekaers: "speakers",
  spkrs: "speakers",
  sun: "sunday",
  thrs: "thursday",
  thur: "thursday",
  thurs: "thursday",
  tic: "ticket",
  tikets: "tickets",
  ticktes: "tickets",
  tix: "tickets",
  tkts: "tickets",
  tmr: "tomorrow",
  tmrw: "tomorrow",
  tommorow: "tomorrow",
  tomorow: "tomorrow",
  tn: "tonight",
  tnite: "tonight",
  tonite: "tonight",
  u: "you",
  ur: "your",
  wed: "wednesday",
  weds: "wednesday",
  yall: "you all",
};

const PHRASE_ALIASES = [
  [/\bprob\s+set\b/g, "problem set"],
  [/\bsober\s+d\b/g, "sober driver"],
  [/\bload\s*-\s*in\b/g, "load in"],
  [/\bubering\b/g, "uber"],
  [/\by[' ]?all\b/g, "you all"],
  [/\bi[' ]?ll\b/g, "i will"],
  [/\bi[' ]?m\b/g, "i am"],
  [/\bcan[' ]?t\b/g, "cannot"],
  [/\bwe[' ]?re\b/g, "we are"],
];

const SOCIAL_EVENTS = /\b(party|pregame|formal|semi|tailgate|rush|chapter|meeting|general body meeting|mixer|downtown|bars?|game|match|concert|date party|function|sisterhood|philanthropy|recruitment|bid day|tabling|practice|tournament|soundcheck|doors|set|lineup|load in|reservation|dinner|mass|service|lab|lift|workout|birthday|trip|spring break|festival|retreat|house tours?)\b/;
const RIDE_TERMS = /\b(ride|rides|driver|drivers|drive|driving|sober driver|sober drivers|uber|lyft|carpool|bus|pickup|has room|have room|got space|have space|cars?)\b/;
const SUPPLY_TERMS = /\b(speakers?|cooler|chairs?|table|cups?|plates?|ice|drinks?|snacks?|food|water|charger|controller|decks|aux|jerseys?|cleats|outfits?|forms?|flyers?|trash bags?|groceries|grill|tent|parking passes?|slides?|doc|spreadsheet)\b/;
const MONEY_DEADLINE_TERMS = /\b(tickets?|wristbands?|dues|payment|pay|venmo|submit|submission|forms?|waiver|signups?|sign up|registration|rent|utilities|wifi|bill|budget|canvas|assignment|problem set|homework|quiz|exam|report|slides?|presentation|peer review|final draft|money)\b/;
const LOCATION_TERMS = /\b(address|location|room|house|venue|court|field|gym|booth|table|lot|parking|library|union|apartment|restaurant|gate|entrance|back lot|indoors|inside|church|chapel|lab|studio|green room)\b/;
const DATE_TERMS = /\b(today|tonight|tomorrow|weekend|next week|this week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\b\d{1,2}\/\d{1,2}\b/;
const TIME_TERMS = /\b\d{1,2}(:\d{2})\s?(am|pm)?\b|\b\d{1,2}\s?(am|pm)\b|\bat\s+\d{1,2}\b|\b(noon|midnight|right now|in \d{1,2} minutes?|in \d{1,2} hours?)\b/;
const QUESTION_INTENT = /\b(where|when|what time|who'?s going|who is going|who all|who can|anyone going|anyone driving|anyone have|anyone got|can someone|could someone|can anybody|anyone able|are we still|we still on|same place|who has|does anyone have|are you all)\b|\?/;
const ACTION_TERMS = /\b(starts?|begins?|doors|soundcheck|lineup|set time|meeting|chapter|practice|game|tipoff|kickoff|pickup|leaving|leaves|be there|be at|show up|pull up|moved|changed|switched|pushed|bumped|delayed|cancelled|canceled|not happening|scratch that|new plan|update|posted|bring|wear|grab|pick up|cover|help|handle|drive|submit|turn in|pay|send)\b/;
const CHANGE_TERMS = /\b(moved|changed|switched|pushed|bumped|delayed|cancelled|canceled|not happening|not tonight anymore|scratch that|new plan|update|room changed|location changed|time changed|indoors|inside|posted)\b/;
const FALSE_POSITIVE_TRAPS = /\b(deadline for being washed|formal apology|rush hour|party animal|who let him cook|why is bro|need bro|tickets to the downfall|meeting my downfall|chapter of my villain arc|villain arc|bro said formal|he needs to be stopped|this fit is formal|friday was insane|tomorrow gonna be wild|9 is crazy|can someone tell .* stop|fell off|washed|downfall)\b/;

function normalizeText(text) {
  const base = String(text || "")
    .normalize("NFKC")
    .replace(/[’`]/g, "'")
    .replace(/([a-z])\1{2,}/gi, "$1$1")
    .replace(/[^\p{L}\p{N}:/?'\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  let normalized = base.toLowerCase();
  for (const [pattern, replacement] of PHRASE_ALIASES) normalized = normalized.replace(pattern, replacement);

  return normalized
    .split(/\s+/)
    .map((word) => WORD_ALIASES[word] || word)
    .join(" ")
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
  makeRule("normalization.alias", "Uses recognized slang, typo, or abbreviation aliases", 4, "plan", (text, original) =>
    text !== String(original || "").toLowerCase().trim()
  ),
  makeRule("deadline.explicit", "Mentions an explicit deadline", 32, "deadline", (text) =>
    has(/\b(due|deadline|last day|final day|closes?|cutoff|submit by|turn in|pay by|due by|by midnight|by tonight|by tomorrow|by sunday|by monday|by tuesday|by wednesday|by thursday|by friday|by saturday|has to be up by)\b/, text)
  ),
  makeRule("deadline.payment", "Mentions payment, tickets, dues, bills, or deliverables", 18, "deadline", (text) =>
    has(MONEY_DEADLINE_TERMS, text)
  ),
  makeRule("request.concrete-need", "Asks for a specific person, item, or help", 28, "request", (text) =>
    has(/\b(need|needed|looking for|iso|we need|need one|need 1|need two|need 2|need three|need 3)\b/, text) &&
    has(new RegExp(`${RIDE_TERMS.source}|${SUPPLY_TERMS.source}|\\b(one more|people|person|volunteer|help|spot|spots)\\b`), text)
  ),
  makeRule("request.can-someone", "Asks whether someone can handle something concrete", 24, "request", (text) =>
    has(/\b(can someone|could someone|can anyone|can anybody|anyone able|anyone have|anyone got|who can)\b/, text) &&
    has(new RegExp(`${RIDE_TERMS.source}|${SUPPLY_TERMS.source}|${MONEY_DEADLINE_TERMS.source}|\\b(help|bring|grab|pick up|cover|send|make it|handle|take care of)\\b`), text)
  ),
  makeRule("logistics.transport", "Mentions rides, drivers, buses, or transportation", 20, "logistics", (text) =>
    has(RIDE_TERMS, text)
  ),
  makeRule("logistics.sober-drivers", "Mentions sober drivers", 30, "logistics", (text) =>
    has(/\bsober drivers?\b/, text)
  ),
  makeRule("logistics.supplies", "Mentions supplies or things to bring", 25, "logistics", (text) =>
    has(/\b(bring|wear|grab|pick up|need|got|have)\b/, text) && has(SUPPLY_TERMS, text)
  ),
  makeRule("request.ticket-availability", "Asks about available tickets or wristbands", 18, "request", (text) =>
    has(/\b(anyone|does anyone|do you|who)\b/, text) && has(/\b(tickets?|wristbands?)\b/, text)
  ),
  makeRule("event.social-anchor", "Mentions a social, club, class, team, or roommate domain", 12, "event", (text) =>
    has(SOCIAL_EVENTS, text)
  ),
  makeRule("event.starts-time", "Gives a start, doors, set, load-in, or reservation time", 28, "event", (text) =>
    has(/\b(starts?|start time|begins?|doors|soundcheck|lineup|set time|load in|tipoff|kickoff|pickup|reservation)\b/, text) && has(TIME_TERMS, text)
  ),
  makeRule("event.meeting-time", "Gives a meeting, chapter, practice, shift, or event time", 24, "event", (text) =>
    has(/\b(chapter|meeting|rush|practice|game|mass|service|lab|shift|table shift|house tours?)\b/, text) && has(TIME_TERMS, text)
  ),
  makeRule("event.arrival-departure", "Gives arrival or departure timing", 34, "event", (text) =>
    has(/\b(leaving|leaves|bus leaves|be there by|be at .* by|show up by|pull up by|meet by|leaving in \d+|bus leaves in \d+)\b/, text) &&
    (has(TIME_TERMS, text) || has(LOCATION_TERMS, text))
  ),
  makeRule("event.compact-production-times", "Gives compact soundcheck, load-in, doors, or set times", 50, "event", (text) =>
    has(/\b(soundcheck|load in|doors|set times?|lineup)\b/, text) && has(/\b\d{1,2}\b.*\b\d{1,2}\b/, text)
  ),
  makeRule("plan.whos-going", "Asks who is going to a plan", 20, "plan", (text) =>
    has(/\b(who'?s going|who is going|who all is going|who'?s down|who wants to go|anyone going)\b/, text)
  ),
  makeRule("plan.leaving-meeting", "Asks about when or where people are meeting or leaving", 20, "plan", (text) =>
    has(/\b(where are we meeting|where we meeting|what time are (we|you all) leaving|when are (we|you all) leaving|where should we meet)\b/, text)
  ),
  makeRule("commitment.availability", "Shares concrete availability or commitment", 22, "plan", (text) =>
    has(/\b(i can|i am able|i could|i can drive|i will drive|i can bring|i will bring|i got|i can cover|i have room|i have space|i am free after|cannot make it|not going anymore)\b/, text) &&
    (has(TIME_TERMS, text) || has(DATE_TERMS, text) || has(RIDE_TERMS, text) || has(SUPPLY_TERMS, text))
  ),
  makeRule("announcement.change", "Announces a change, move, cancellation, or reminder", 30, "announcement", (text) =>
    has(/\b(moved|changed|switched|pushed|bumped|delayed|change of plans|cancelled|canceled|not happening|not tonight anymore|postponed|rescheduled|reminder|mandatory|update|heads up|scratch that|new plan|indoors|inside|posted)\b/, text)
  ),
  makeRule("time.relative", "Mentions today, tonight, tomorrow, or this week", 8, "event", (text) =>
    has(/\b(today|tonight|tomorrow|weekend|next week|this week)\b/, text)
  ),
  makeRule("time.weekday", "Mentions a weekday or date", 7, "event", (text) =>
    has(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\b\d{1,2}\/\d{1,2}\b/, text)
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
    has(/\b(due|deadline|last day|final day|closes?|cutoff|submit|pay|dues|tickets?|forms?|rent|utilities|bill|canvas|assignment|problem set)\b/, text) &&
    (has(DATE_TERMS, text) || has(TIME_TERMS, text) || has(/\bby\b/, text))
  ),
  makeRule("deadline.object-context", "Combines deadline language with a concrete payment or deliverable object", 18, "deadline", (text) =>
    has(/\b(due|closes?|deadline|submit|turn in|pay|venmo|last day|final day)\b/, text) && has(MONEY_DEADLINE_TERMS, text)
  ),
  makeRule("event.concrete-time", "Combines domain language with concrete time information", 16, "event", (text) =>
    has(SOCIAL_EVENTS, text) && (has(DATE_TERMS, text) || has(TIME_TERMS, text))
  ),
  makeRule("domain.action-time", "Combines domain language with an action and time or location", 12, "event", (text) =>
    has(SOCIAL_EVENTS, text) && has(ACTION_TERMS, text) && (has(DATE_TERMS, text) || has(TIME_TERMS, text) || has(LOCATION_TERMS, text))
  ),
  makeRule("change.concrete-context", "Combines a change or cancellation with event, location, or time context", 24, "announcement", (text) =>
    has(CHANGE_TERMS, text) && (has(SOCIAL_EVENTS, text) || has(LOCATION_TERMS, text) || has(DATE_TERMS, text) || has(TIME_TERMS, text))
  ),
  makeRule("logistics.supply-context", "Combines bring, wear, or grab with a concrete object and context", 12, "logistics", (text) =>
    has(/\b(bring|wear|grab|pick up|got|have)\b/, text) && has(SUPPLY_TERMS, text) &&
    (has(DATE_TERMS, text) || has(TIME_TERMS, text) || has(SOCIAL_EVENTS, text) || has(LOCATION_TERMS, text))
  ),
  makeRule("logistics.direct-supply-command", "Directly asks people to bring, wear, or grab a concrete object", 28, "logistics", (text) =>
    has(/\b(bring|wear|grab|pick up)\b/, text) && has(SUPPLY_TERMS, text)
  ),
  makeRule("announcement.room-location-update", "Gives a room or location update", 55, "announcement", (text) =>
    has(/\b(new room|room changed|in \d{2,4} now|we are in \d{2,4}|moved room|moved to room|room \d{2,4})\b/, text) ||
    (has(/\b(room|location)\b/, text) && has(CHANGE_TERMS, text))
  ),
  makeRule("request.urgent-tonight", "Combines a concrete request with tonight or tomorrow", 12, "request", (text) =>
    has(/\b(need|can someone|could someone|anyone able|looking for|iso)\b/, text) &&
    has(/\b(tonight|tomorrow|as soon as possible|right now)\b/, text)
  ),
  makeRule("request.bring-supplies", "Asks someone to bring specific supplies", 14, "request", (text) =>
    has(/\b(can someone|could someone|can anyone|can anybody|anyone able|someone|anyone|who can)\b/, text) &&
    has(/\b(bring|grab|pick up|wear)\b/, text) &&
    has(SUPPLY_TERMS, text)
  ),
  makeRule("logistics.uber-count", "Mentions needing one more person for a ride", 20, "logistics", (text) =>
    has(/\b(one more|1 more|need one|need 1)\b/, text) && has(/\b(uber|lyft|ride|car|bus)\b/, text)
  ),
  makeRule("logistics.transport-question", "Asks who can drive or handle a ride", 12, "logistics", (text) =>
    has(/\b(who can|anyone driving|anyone able|can anyone|can someone)\b/, text) && has(RIDE_TERMS, text)
  ),
  makeRule("request.help-needed", "Mentions needing people to help", 10, "request", (text) =>
    has(/\b(need|needed|looking for)\b/, text) && has(/\b(people|person|someone|anyone|help)\b/, text)
  ),
  makeRule("request.object-action", "Combines a request phrase with a concrete object or responsibility", 10, "request", (text) =>
    has(/\b(need|can someone|could someone|can anybody|anyone able|who can|somebody|someone|help with|take care of|handle)\b/, text) &&
    (has(SUPPLY_TERMS, text) || has(RIDE_TERMS, text) || has(MONEY_DEADLINE_TERMS, text) || has(LOCATION_TERMS, text))
  ),
  makeRule("question.event-context", "Asks a question about an event, plan, object, or location", 8, "question", (text) =>
    has(/\?|\b(what time|where|when|who has)\b/, text) && (has(SOCIAL_EVENTS, text) || has(SUPPLY_TERMS, text) || has(LOCATION_TERMS, text))
  ),
  makeRule("announcement.date-context", "Combines an announcement with date or time details", 14, "announcement", (text) =>
    has(/\b(moved|changed|switched|pushed|bumped|delayed|cancelled|canceled|postponed|rescheduled|reminder|mandatory|update|heads up|posted|indoors|inside)\b/, text) &&
    (has(DATE_TERMS, text) || has(TIME_TERMS, text))
  ),
  makeRule("structure.concrete-details", "Has enough concrete detail to be useful later", 8, "plan", (text) =>
    text.length >= 24 && (has(DATE_TERMS, text) || has(TIME_TERMS, text) || has(LOCATION_TERMS, text)) &&
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
  makeRule("noise.emoji-only", "Emoji-only message", -35, "noise", (text, original) =>
    String(original || "").trim().length > 0 && /^[\p{Emoji_Presentation}\p{Emoji}\uFE0F\s]+$/u.test(String(original || "").trim())
  ),
  makeRule("noise.hype-only", "Hype or joke without plan details", -24, "noise", (text) =>
    has(/\b(that was crazy|he fell off|who up|absolute cinema|no shot|you had to be there|washed|downfall|villain arc|insane|wild|fire fit|party animal|formal apology|rush hour)\b/, text)
  ),
  makeRule("noise.important-word-joke", "Uses important-looking words in a joke or idiom", -38, "noise", (text) =>
    has(FALSE_POSITIVE_TRAPS, text)
  ),
  makeRule("noise.ticket-availability-not-deadline", "Asks about ticket availability without a deadline", -25, "noise", (text) =>
    has(/\b(anyone|does anyone|who).*\b(tickets?|wristbands?).*\b(left|extra|available|have)\b|\b(tickets?|wristbands?).*\b(left|extra|available)\b/, text) &&
    !has(/\b(due|deadline|closes?|last day|final day|by|midnight|tonight|tomorrow)\b/, text)
  ),
  makeRule("noise.repeated", "Repeated characters or spammy structure", -16, "noise", (text) =>
    /(.)\1{5,}/i.test(text) || /\b(\w+)\b(?:\s+\1\b){2,}/i.test(text)
  ),
  makeRule("noise.casual-question", "Casual question without planning value", -14, "noise", (text) =>
    has(/\b(can someone explain why|why bro|who up|what is bro doing|are you serious|who let him cook)\b/, text)
  ),
  makeRule("noise.vague-short", "Short vague message without concrete details", -12, "noise", (text) =>
    text.length < 18 && !has(DATE_TERMS, text) && !has(TIME_TERMS, text) && !has(RIDE_TERMS, text) && !has(SUPPLY_TERMS, text)
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
  const originalText = String(text || "").normalize("NFKC").trim();
  const normalizedText = normalizeText(originalText);
  const signalMatches = SIGNAL_RULES.filter((rule) => rule.test(normalizedText, originalText)).map(toMatch);
  const contextMatches = CONTEXT_RULES.filter((rule) => rule.test(normalizedText, originalText)).map(toMatch);
  const penaltyMatches = PENALTY_RULES.filter((rule) => rule.test(normalizedText, originalText)).map(toMatch);
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
  if (ids.has("noise.important-word-joke") && finalScore < 45) return "noise";
  if (ids.has("deadline.explicit") && (ids.has("deadline.date-context") || ids.has("deadline.object-context"))) return "deadline";
  if (ids.has("announcement.change") && (ids.has("announcement.date-context") || ids.has("change.concrete-context"))) return "announcement";
  if (ids.has("logistics.sober-drivers") || ids.has("logistics.uber-count") || ids.has("logistics.transport-question")) return "logistics";
  if (ids.has("request.bring-supplies") || ids.has("request.can-someone")) return "request";
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
  const contextCount = matches.filter((match) => match.id.includes(".context") || match.id.includes(".concrete") || match.id.includes(".urgent")).length;
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
  const cleanText = String(text || "").normalize("NFKC").trim();
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

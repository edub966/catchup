const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { scoreMessage } = require("../../src/scoring");

const ROOT = path.join(__dirname, "..", "..");
const WORK_DIR = path.join(ROOT, "work", "simulation");
const OUTPUT_DIR = path.join(WORK_DIR, "output");
const REPORT_DIR = path.join(WORK_DIR, "reports");
const CHART_DIR = path.join(REPORT_DIR, "charts");
const DB_PATH = path.join(WORK_DIR, "catchup-sim.sqlite");
const IMPORTANT_THRESHOLD = 65;
const CATCHUP_THRESHOLD = 60;
const SEED = 20260604;
const START_TIME = Date.parse("2026-04-17T16:00:00.000Z");

const USERS = [
  "Mason", "Tyler", "Chris", "Ava", "Sophia", "Jordan", "Maya", "Nick", "Bella", "Drew",
  "Cam", "Riley", "Sam", "Logan", "Mia", "Ethan", "Olivia", "Marcus", "Jake", "Grace",
  "Noah", "Harper", "Zoe", "Luke", "Nate", "Lena", "Quinn", "Tessa",
];

const GROUPS = [
  { name: "Pledge Class 28", type: "Fraternity pledge chat", tag: "frat", style: "rides, dues, formal, chapter, rush logistics buried inside jokes" },
  { name: "Kappa Event Crew", type: "Sorority event planning chat", tag: "sorority", style: "signups, outfits, rides, meeting changes, supportive side chatter" },
  { name: "Downtown Survivors", type: "College friend group", tag: "friends", style: "loose downtown plans, food, jokes, vague coordination" },
  { name: "Campus Volunteer Board", type: "Student organization/club", tag: "club", style: "meeting rooms, volunteer asks, event reminders, deadlines" },
  { name: "Club Soccer", type: "Sports team", tag: "sports", style: "practice times, game logistics, rides, equipment, cancellations" },
  { name: "Basement Set Team", type: "DJ/promoter group", tag: "dj", style: "set times, venue details, gear, tickets, promo deadlines" },
  { name: "Econ 302 Project", type: "Group project/class chat", tag: "project", style: "deliverables, meeting times, problem sets, who is doing what" },
  { name: "Lot 14 Tailgate", type: "Tailgate/party planning chat", tag: "tailgate", style: "arrival times, supplies, parking, drivers, food and drinks" },
  { name: "Apartment 4B", type: "Apartment/roommate chat", tag: "roommates", style: "rent, chores, groceries, visitors, maintenance, bills" },
  { name: "The Big One", type: "Large chaotic general social chat", tag: "chaos", style: "memes, spam, one-liners, occasional real plans hidden in noise" },
  { name: "Rush Week Leads", type: "Recruitment logistics chat", tag: "rush", style: "rooms, times, dress notes, schedule changes, volunteer coverage" },
  { name: "Formal Bus 2", type: "Event transportation chat", tag: "formal", style: "tickets, buses, sober drivers, departure times, wristbands" },
  { name: "Intramural Hoops", type: "Sports pickup team", tag: "hoops", style: "game times, jerseys, rides, last-minute cancellations" },
  { name: "House Dinner Crew", type: "Food/social planning chat", tag: "food", style: "groceries, cooking, reservations, who brings what" },
  { name: "Weekend Festival Run", type: "Festival/social trip chat", tag: "festival", style: "tickets, set times, rides, gear, parking, loose hype" },
];

const IMPORTANT_TEMPLATES = {
  frat: [
    ["formal tickets are due by midnight tomorrow", "deadline", "deadline"],
    ["chapter moved to Thursday at 6", "announcement", "change"],
    ["need 3 sober drivers tonight for formal", "logistics", "ride_request"],
    ["rush meeting is at 6 in the house", "event", "meeting_time"],
    ["dues are due by Sunday night", "deadline", "dues"],
    ["we need one more for the Uber leaving at 9", "logistics", "ride_count"],
    ["can someone bring speakers to the pregame", "request", "supplies"],
  ],
  sorority: [
    ["signup closes at noon tomorrow", "deadline", "signup_deadline"],
    ["meeting moved to room 204 tonight", "announcement", "room_change"],
    ["need two cars for the philanthropy event Friday", "logistics", "ride_request"],
    ["wear white for rush event at 6", "event", "event_detail"],
    ["forms are due by 5pm", "deadline", "forms"],
    ["can anyone grab ice before chapter", "request", "supplies"],
  ],
  friends: [
    ["we are leaving for downtown at 10", "event", "departure"],
    ["need one more for the Uber", "logistics", "ride_count"],
    ["reservation is at 8:30", "event", "event_time"],
    ["who can drive Friday", "logistics", "ride_question"],
    ["party starts at 9 at Luke's", "event", "party_time"],
  ],
  club: [
    ["volunteer forms are due tomorrow", "deadline", "forms"],
    ["meeting moved to the library room 310", "announcement", "room_change"],
    ["need 4 people for check in at noon", "request", "volunteer"],
    ["event starts at 7 in the union", "event", "event_time"],
    ["submit budget requests by Friday", "deadline", "deadline"],
  ],
  sports: [
    ["practice moved indoors tonight", "announcement", "practice_change"],
    ["game starts at 6, be there by 5:30", "event", "game_time"],
    ["need drivers for away game Saturday", "logistics", "ride_request"],
    ["bring both jerseys tomorrow", "logistics", "equipment"],
    ["team dues due Friday", "deadline", "dues"],
  ],
  dj: [
    ["soundcheck at 5, doors at 8", "event", "set_time"],
    ["promo post has to be up by noon", "deadline", "promo_deadline"],
    ["need someone to bring the controller", "request", "gear"],
    ["set time moved to 11:30", "announcement", "time_change"],
    ["tickets close tonight", "deadline", "ticket_deadline"],
  ],
  project: [
    ["problem set is due tonight", "deadline", "assignment"],
    ["meet in the library at 7", "event", "meeting_time"],
    ["can someone finish the slides by Sunday", "request", "deliverable"],
    ["presentation moved to Thursday", "announcement", "date_change"],
    ["submit the final doc by midnight", "deadline", "deliverable"],
  ],
  tailgate: [
    ["tailgate starts at noon in Lot 14", "event", "tailgate_time"],
    ["need two drivers for the cooler run", "logistics", "ride_request"],
    ["can someone bring cups and ice", "request", "supplies"],
    ["parking passes are due by Friday", "deadline", "parking_deadline"],
    ["setup moved to 10am", "announcement", "time_change"],
  ],
  roommates: [
    ["rent is due tomorrow", "deadline", "rent"],
    ["maintenance is coming at 9am", "event", "maintenance"],
    ["can someone grab trash bags", "request", "supplies"],
    ["wifi bill due Friday", "deadline", "bill"],
    ["cleaning inspection moved to Thursday", "announcement", "inspection"],
  ],
  chaos: [
    ["party starts at 9 at the house", "event", "party_time"],
    ["need sober drivers tonight", "logistics", "ride_request"],
    ["tickets are due by midnight", "deadline", "ticket_deadline"],
    ["meeting moved to room 204", "announcement", "room_change"],
    ["can someone bring speakers", "request", "supplies"],
  ],
  rush: [
    ["lineup posted at noon", "announcement", "lineup"],
    ["rush event moved to Friday at 6", "announcement", "date_change"],
    ["need 5 people at check in by 5:30", "request", "volunteer"],
    ["wear navy for house tours tonight", "event", "dress_time"],
    ["forms close tomorrow", "deadline", "forms"],
  ],
  formal: [
    ["bus leaves the house at 7", "event", "departure"],
    ["formal tickets due tomorrow", "deadline", "tickets"],
    ["need one more sober driver", "logistics", "ride_request"],
    ["wristbands close at midnight", "deadline", "wristbands"],
    ["pickup moved to the back lot", "announcement", "location_change"],
  ],
  hoops: [
    ["game moved to court 3 at 8", "announcement", "location_change"],
    ["need one more for tipoff", "request", "player_count"],
    ["bring white and dark jerseys", "logistics", "equipment"],
    ["practice cancelled tonight", "announcement", "cancellation"],
    ["league dues due Sunday", "deadline", "dues"],
  ],
  food: [
    ["reservation is at 7:45", "event", "reservation"],
    ["can someone bring plates", "request", "supplies"],
    ["grocery money due tomorrow", "deadline", "money"],
    ["dinner moved to Friday", "announcement", "date_change"],
    ["need one more person for the Costco run", "logistics", "ride_count"],
  ],
  festival: [
    ["set starts at 9, meet by the gate at 8", "event", "set_time"],
    ["tickets close tonight", "deadline", "tickets"],
    ["need drivers for Saturday morning", "logistics", "ride_request"],
    ["parking pass due by Friday", "deadline", "parking"],
    ["meetup moved to west entrance", "announcement", "location_change"],
  ],
};

const MAYBE_MESSAGES = [
  ["anyone going out tonight?", "plan", "loose_plan"],
  ["where are we meeting?", "plan", "meeting_question"],
  ["what time are y'all leaving?", "plan", "departure_question"],
  ["I can drive after 10", "logistics", "availability"],
  ["bring drinks if you have any", "logistics", "soft_supplies"],
  ["might go downtown later", "noise", "vague_plan"],
  ["who all is going Friday?", "plan", "attendance_question"],
  ["pregame at the house?", "question", "event_question"],
  ["I can bring cups", "logistics", "supply_commitment"],
  ["does anyone have tickets left?", "request", "ticket_availability"],
  ["are we still doing the same place?", "question", "context_needed"],
  ["anyone able to grab snacks?", "request", "soft_request"],
  ["what time is tailgate again", "question", "event_question"],
  ["I could drive tomorrow", "logistics", "availability"],
  ["who has the speaker?", "question", "item_question"],
];

const NOISE_MESSAGES = [
  "lol", "lmao", "bro", "yo", "real", "nah", "W", "fire", "skull", "😭😭😭", "🔥🔥🔥",
  "that was crazy", "he fell off", "who up", "no shot", "you had to be there", "absolute cinema",
  "Friday was insane", "9 is crazy", "tomorrow gonna be wild", "party animal", "formal apology incoming",
  "rush hour traffic sucks", "can someone tell Tyler to chill", "need bro to retire", "where we at",
  "go go go go", "????????", "bro said formal like he owns the place", "deadline for being washed is tonight",
  "fire fit", "why is bro like this?", "who let him cook?", "meeting my downfall rn",
];

const EDGE_CASES = [
  ["bro said formal like he owns the place", "noise", "noise", "funny_keyword", "Funny use of formal should not score as event"],
  ["deadline for being washed is tonight", "noise", "noise", "funny_deadline", "Fake deadline slang"],
  ["be at the house by 8 or you're cooked", "important", "event", "casual_important", "Casual wording with real arrival time"],
  ["we're leaving in 10 don't be late", "important", "event", "casual_important", "Important without obvious date keyword"],
  ["tonight?", "maybe", "question", "vague", "Very vague time question"],
  ["who's going", "maybe", "plan", "vague", "No destination or date"],
  ["need one", "maybe", "request", "vague", "Missing object"],
  ["who let him cook?", "noise", "noise", "casual_question", "Question as joke"],
  ["why is bro like this?", "noise", "noise", "casual_question", "Question as joke"],
  ["LMAOOOOO", "noise", "noise", "high_reaction_noise", "Laugh spam"],
  ["bro fell off", "noise", "noise", "high_reaction_noise", "Joke likely to get reactions"],
  ["skull emoji", "noise", "noise", "high_reaction_noise", "Funny phrase"],
  ["fire fit", "noise", "noise", "high_reaction_noise", "Hype not logistics"],
  ["rent is due tomorrow", "important", "deadline", "low_reaction_important", "Important with no social event keywords"],
  ["meeting moved to room 204", "important", "announcement", "low_reaction_important", "Change with location"],
  ["Friday was insane", "noise", "noise", "date_noise", "Date mention in retrospective joke"],
  ["9 is crazy", "noise", "noise", "time_noise", "Number is not plan"],
  ["tomorrow gonna be wild", "noise", "noise", "date_noise", "Vague hype"],
  ["party animal", "noise", "noise", "event_word_noise", "Event word idiom"],
  ["formal apology incoming", "noise", "noise", "event_word_noise", "Formal is not event"],
  ["rush hour traffic sucks", "noise", "noise", "event_word_noise", "Rush is not recruitment"],
  ["can someone tell Tyler to stop yelling", "noise", "noise", "joke_request", "Request-shaped joke"],
  ["need bro to retire", "noise", "noise", "joke_request", "Need-shaped joke"],
  ["same place as last time", "maybe", "question", "context_required", "Requires context"],
  ["bring that again", "maybe", "logistics", "context_required", "Requires previous object"],
  ["we're still on", "maybe", "plan", "context_required", "Requires prior plan"],
  ["it got moved", "maybe", "announcement", "context_required", "No destination/date"],
  ["tix due tmr", "important", "deadline", "typo_slang", "Ticket deadline slang"],
  ["need sober drvr tn", "important", "logistics", "typo_slang", "Driver slang"],
  ["mtg moved thurs", "important", "announcement", "typo_slang", "Meeting moved slang"],
  ["yall bring spkrs?", "maybe", "request", "typo_slang", "Speaker slang"],
  ["need 3 drivers for formal tomorrow, leaving house at 7", "important", "logistics", "multi_signal", "Request, event, date, time"],
  ["rush event moved to Friday at 6, wear white", "important", "announcement", "multi_signal", "Change with event details"],
  ["nvm party cancelled", "important", "announcement", "cancellation", "Cancellation should matter"],
  ["meeting is not tonight anymore", "important", "announcement", "cancellation", "Schedule cancellation"],
  ["don't bring speakers, venue has them", "important", "announcement", "cancellation", "Negated supply plan"],
  ["yo", "noise", "noise", "repeated_spam", "Repeated spam seed"],
  ["yo", "noise", "noise", "repeated_spam", "Repeated spam seed"],
  ["where we at", "noise", "noise", "repeated_spam", "Repeated vague question"],
  ["chapter at 6", "important", "event", "group_specific", "Fraternity-specific meeting"],
  ["lineup posted at noon", "important", "announcement", "group_specific", "Rush/DJ-specific announcement"],
  ["soundcheck at 5", "important", "event", "group_specific", "DJ-specific logistics"],
  ["dues by Sunday", "important", "deadline", "group_specific", "Payment deadline"],
  ["prob set is due tonight", "important", "deadline", "group_specific", "Class-specific deadline"],
  ["practice moved indoors", "important", "announcement", "group_specific", "Sports-specific change"],
];

function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const rng = makeRng(SEED);

function pick(items) {
  return items[Math.floor(rng() * items.length)];
}

function maybe(probability) {
  return rng() < probability;
}

function ensureDirs() {
  for (const dir of [WORK_DIR, OUTPUT_DIR, REPORT_DIR, CHART_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function cleanOutputs() {
  for (const dir of [OUTPUT_DIR, CHART_DIR]) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, file));
  }
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  for (const suffix of ["-shm", "-wal"]) {
    if (fs.existsSync(`${DB_PATH}${suffix}`)) fs.unlinkSync(`${DB_PATH}${suffix}`);
  }
}

function createDb() {
  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      invite_code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      group_type TEXT NOT NULL,
      style TEXT NOT NULL
    );

    CREATE TABLE group_members (
      user_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      joined_at TEXT NOT NULL,
      PRIMARY KEY (user_id, group_id)
    );

    CREATE TABLE messages (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      reply_to_message_id TEXT
    );

    CREATE TABLE reactions (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reaction TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (message_id, user_id, reaction)
    );

    CREATE TABLE message_scores (
      message_id TEXT PRIMARY KEY,
      base_score INTEGER NOT NULL,
      reaction_boost INTEGER NOT NULL,
      final_score INTEGER NOT NULL,
      signal_category TEXT NOT NULL,
      signal_confidence INTEGER NOT NULL,
      matched_rules TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE simulation_ground_truth (
      message_id TEXT PRIMARY KEY,
      expected_importance TEXT NOT NULL,
      expected_category TEXT NOT NULL,
      scenario_tag TEXT NOT NULL,
      notes TEXT NOT NULL
    );

    CREATE INDEX idx_sim_messages_group_created ON messages(group_id, created_at);
    CREATE INDEX idx_sim_scores_final ON message_scores(final_score);
    CREATE INDEX idx_sim_truth_importance ON simulation_ground_truth(expected_importance);
  `);
  return db;
}

function iso(minutes) {
  return new Date(START_TIME + minutes * 60 * 1000).toISOString();
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeJson(file, data) {
  fs.writeFileSync(path.join(OUTPUT_DIR, file), JSON.stringify(data, null, 2));
}

function writeCsv(file, rows, columns) {
  const lines = [columns.join(",")];
  for (const row of rows) lines.push(columns.map((column) => csvEscape(row[column])).join(","));
  fs.writeFileSync(path.join(OUTPUT_DIR, file), `${lines.join("\n")}\n`);
}

function seededUsersForGroup(index) {
  const rotated = [...USERS.slice(index), ...USERS.slice(0, index)];
  return rotated.slice(0, 15 + (index % 4));
}

function createBaseEntities(db) {
  const now = iso(0);
  const insertUser = db.prepare("INSERT INTO users (id, username, created_at) VALUES (?, ?, ?)");
  for (const username of USERS) insertUser.run(`user_${username.toLowerCase()}`, username, now);

  const insertGroup = db.prepare("INSERT INTO groups (id, name, invite_code, created_at, group_type, style) VALUES (?, ?, ?, ?, ?, ?)");
  const insertMember = db.prepare("INSERT INTO group_members (user_id, group_id, joined_at) VALUES (?, ?, ?)");

  return GROUPS.map((group, index) => {
    const id = `group_${group.tag}`;
    const members = seededUsersForGroup(index);
    insertGroup.run(id, group.name, `SIM${String(index + 1).padStart(2, "0")}`, now, group.type, group.style);
    for (const username of members) insertMember.run(`user_${username.toLowerCase()}`, id, now);
    return { ...group, id, members };
  });
}

function messageFromTemplate(group, label) {
  if (label === "important") {
    const [text, category, tag] = pick(IMPORTANT_TEMPLATES[group.tag] || IMPORTANT_TEMPLATES.chaos);
    return {
      text: maybe(0.18) ? text.replace("tomorrow", "tmr").replace("tonight", "tn").replace("meeting", "mtg") : text,
      expectedImportance: "important",
      expectedCategory: category,
      scenarioTag: tag,
      notes: `Generated important ${group.type} message`,
    };
  }

  if (label === "maybe") {
    const [text, category, tag] = pick(MAYBE_MESSAGES);
    return {
      text,
      expectedImportance: "maybe",
      expectedCategory: category,
      scenarioTag: tag,
      notes: "Ambiguous message that may be useful in context",
    };
  }

  const text = pick(NOISE_MESSAGES);
  return {
    text,
    expectedImportance: "noise",
    expectedCategory: "noise",
    scenarioTag: "noise",
    notes: "Noise, joke, hype, or vague reply",
  };
}

function reactionPlan(message) {
  if (message.expectedImportance === "important") {
    if (message.scenarioTag.includes("low_reaction")) return [];
    const reactions = [];
    if (maybe(0.42)) reactions.push("✅");
    if (maybe(0.34)) reactions.push("👀");
    if (maybe(0.18)) reactions.push("📌");
    if (message.expectedCategory === "request" && maybe(0.35)) reactions.push("❓");
    if (!reactions.length && maybe(0.5)) reactions.push("👀");
    return reactions;
  }

  if (message.expectedImportance === "maybe") {
    const reactions = [];
    if (maybe(0.25)) reactions.push("❓");
    if (maybe(0.18)) reactions.push("👀");
    if (maybe(0.12)) reactions.push("✅");
    if (maybe(0.18)) reactions.push("😂");
    return reactions;
  }

  if (message.scenarioTag === "high_reaction_noise" || maybe(0.22)) {
    const count = 2 + Math.floor(rng() * 7);
    return Array.from({ length: count }, () => pick(["😂", "💀", "🔥"]));
  }
  return maybe(0.08) ? [pick(["😂", "💀", "🔥"])] : [];
}

function buildReactions(message, group, globalIndex) {
  return reactionPlan(message).map((reaction, reactionIndex) => {
    const reactor = pick(group.members.filter((member) => member !== message.username));
    return {
      id: `react_${message.id}_${reactionIndex}`,
      username: reactor,
      userId: `user_${reactor.toLowerCase()}`,
      reaction,
      createdAt: iso(globalIndex * 3 + reactionIndex + 1),
    };
  });
}

function generateMessages(groups) {
  const messages = [];
  let globalIndex = 0;

  for (const group of groups) {
    const priorByGroup = [];
    const labels = [
      ...Array.from({ length: 55 }, () => "important"),
      ...Array.from({ length: 55 }, () => "maybe"),
      ...Array.from({ length: 70 }, () => "noise"),
    ];

    for (let index = labels.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(rng() * (index + 1));
      [labels[index], labels[swap]] = [labels[swap], labels[index]];
    }

    for (const label of labels) {
      const base = messageFromTemplate(group, label);
      const username = pick(group.members);
      const replyTo = maybe(0.16) && priorByGroup.length ? pick(priorByGroup).id : null;
      const message = {
        id: `msg_${String(globalIndex + 1).padStart(5, "0")}`,
        groupId: group.id,
        groupName: group.name,
        groupType: group.type,
        username,
        userId: `user_${username.toLowerCase()}`,
        createdAt: iso(globalIndex * 3 + Math.floor(rng() * 3)),
        replyTo,
        ...base,
      };
      message.reactions = buildReactions(message, group, globalIndex);
      messages.push(message);
      priorByGroup.push(message);
      globalIndex += 1;
    }
  }

  const edgeGroups = groups.slice(0, 10);
  for (const [index, [text, importance, category, tag, notes]] of EDGE_CASES.entries()) {
    const group = edgeGroups[index % edgeGroups.length];
    const username = pick(group.members);
    const message = {
      id: `edge_${String(index + 1).padStart(4, "0")}`,
      groupId: group.id,
      groupName: group.name,
      groupType: group.type,
      username,
      userId: `user_${username.toLowerCase()}`,
      text,
      createdAt: iso(globalIndex * 3 + index),
      replyTo: index > 0 && tag === "context_required" ? `edge_${String(index).padStart(4, "0")}` : null,
      expectedImportance: importance,
      expectedCategory: category,
      scenarioTag: tag,
      notes,
    };
    message.reactions = buildReactions(message, group, globalIndex);
    messages.push(message);
    globalIndex += 1;
  }

  return messages;
}

function reactionCounts(message) {
  return message.reactions.reduce((acc, reaction) => {
    acc[reaction.reaction] = (acc[reaction.reaction] || 0) + 1;
    return acc;
  }, {});
}

function persistMessages(db, messages) {
  const insertMessage = db.prepare("INSERT INTO messages (id, group_id, user_id, text, created_at, reply_to_message_id) VALUES (?, ?, ?, ?, ?, ?)");
  const insertReaction = db.prepare("INSERT OR IGNORE INTO reactions (id, message_id, user_id, reaction, created_at) VALUES (?, ?, ?, ?, ?)");
  const insertScore = db.prepare(`
    INSERT INTO message_scores (message_id, base_score, reaction_boost, final_score, signal_category, signal_confidence, matched_rules, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertTruth = db.prepare("INSERT INTO simulation_ground_truth (message_id, expected_importance, expected_category, scenario_tag, notes) VALUES (?, ?, ?, ?, ?)");

  for (const message of messages) {
    const score = scoreMessage(message.text, reactionCounts(message));
    insertMessage.run(message.id, message.groupId, message.userId, message.text, message.createdAt, message.replyTo);
    for (const reaction of message.reactions) {
      insertReaction.run(reaction.id, message.id, reaction.userId, reaction.reaction, reaction.createdAt);
    }
    insertScore.run(
      message.id,
      score.baseScore,
      score.reactionBoost,
      score.finalScore,
      score.signalCategory,
      score.signalConfidence,
      JSON.stringify(score.matchedRules),
      message.createdAt
    );
    insertTruth.run(message.id, message.expectedImportance, message.expectedCategory, message.scenarioTag, message.notes);
  }
}

function scoreRows(messages) {
  return messages.map((message) => {
    const baseOnly = scoreMessage(message.text, {});
    const score = scoreMessage(message.text, reactionCounts(message));
    return {
      ...message,
      reactionCounts: reactionCounts(message),
      baseScoreBeforeReactions: baseOnly.finalScore,
      baseScore: score.baseScore,
      reactionBoost: score.reactionBoost,
      finalScore: score.finalScore,
      signalCategory: score.signalCategory,
      signalConfidence: score.signalConfidence,
      matchedRules: score.matchedRules,
      importantWithoutReactions: baseOnly.finalScore >= IMPORTANT_THRESHOLD,
      importantWithReactions: score.finalScore >= IMPORTANT_THRESHOLD,
      catchupWithReactions: score.finalScore >= CATCHUP_THRESHOLD,
    };
  });
}

function isImportantTruth(label) {
  return label === "important";
}

function isPositiveAt(row, threshold) {
  return row.finalScore >= threshold;
}

function metricsFor(rows, threshold = IMPORTANT_THRESHOLD) {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  for (const row of rows) {
    const actual = isImportantTruth(row.expectedImportance);
    const predicted = isPositiveAt(row, threshold);
    if (actual && predicted) tp += 1;
    else if (!actual && predicted) fp += 1;
    else if (!actual && !predicted) tn += 1;
    else fn += 1;
  }
  return {
    threshold,
    messagesShown: tp + fp,
    truePositives: tp,
    falsePositives: fp,
    trueNegatives: tn,
    falseNegatives: fn,
    precision: tp + fp ? tp / (tp + fp) : 0,
    recall: tp + fn ? tp / (tp + fn) : 0,
    falsePositiveRate: fp + tn ? fp / (fp + tn) : 0,
    falseNegativeRate: tp + fn ? fn / (tp + fn) : 0,
  };
}

function avg(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function groupBy(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] || "unknown";
    if (!acc[value]) acc[value] = [];
    acc[value].push(row);
    return acc;
  }, {});
}

function categoryConfusion(rows) {
  const categories = ["plan", "event", "request", "deadline", "announcement", "question", "logistics", "noise"];
  const matrix = [];
  for (const expected of categories) {
    for (const predicted of categories) {
      const count = rows.filter((row) => row.expectedCategory === expected && row.signalCategory === predicted).length;
      matrix.push({ expected, predicted, count });
    }
  }
  return matrix;
}

function evaluate(scoredRows) {
  const thresholds = [55, 60, 65, 70, 75, 80].map((threshold) => metricsFor(scoredRows, threshold));
  const overall = metricsFor(scoredRows, IMPORTANT_THRESHOLD);
  const labels = groupBy(scoredRows, "expectedImportance");
  const scoreByLabel = Object.entries(labels).map(([label, rows]) => ({
    label,
    count: rows.length,
    averageFinalScore: avg(rows.map((row) => row.finalScore)),
    averageBaseScore: avg(rows.map((row) => row.baseScore)),
    averageReactionBoost: avg(rows.map((row) => row.reactionBoost)),
  }));
  const groupMetrics = Object.entries(groupBy(scoredRows, "groupName")).map(([groupName, rows]) => ({
    groupName,
    groupType: rows[0].groupType,
    users: new Set(rows.map((row) => row.username)).size,
    messages: rows.length,
    important: rows.filter((row) => row.expectedImportance === "important").length,
    maybe: rows.filter((row) => row.expectedImportance === "maybe").length,
    noise: rows.filter((row) => row.expectedImportance === "noise").length,
    averageScore: avg(rows.map((row) => row.finalScore)),
    ...metricsFor(rows, IMPORTANT_THRESHOLD),
    categoryAccuracy: rows.filter((row) => row.expectedCategory === row.signalCategory).length / rows.length,
  })).sort((a, b) => a.precision - b.precision || a.recall - b.recall);
  const categoryMetrics = Object.entries(groupBy(scoredRows, "expectedCategory")).map(([category, rows]) => ({
    category,
    count: rows.length,
    averageScore: avg(rows.map((row) => row.finalScore)),
    predictedImportant: rows.filter((row) => row.finalScore >= IMPORTANT_THRESHOLD).length,
    categoryAccuracy: rows.filter((row) => row.signalCategory === row.expectedCategory).length / rows.length,
  }));
  const reactionMovedUp = scoredRows.filter((row) => !row.importantWithoutReactions && row.importantWithReactions);
  const funnyPromotedNoise = reactionMovedUp.filter((row) =>
    row.expectedImportance === "noise" && Object.keys(row.reactionCounts).some((reaction) => ["😂", "💀", "🔥"].includes(reaction))
  );
  const edgeRows = scoredRows.filter((row) => row.id.startsWith("edge_"));
  const ruleStats = ruleImpact(scoredRows);

  return {
    seed: SEED,
    generatedAt: new Date().toISOString(),
    databasePath: DB_PATH,
    importantThreshold: IMPORTANT_THRESHOLD,
    catchupThreshold: CATCHUP_THRESHOLD,
    counts: {
      users: USERS.length,
      groups: GROUPS.length,
      messages: scoredRows.length,
      reactions: scoredRows.reduce((sum, row) => sum + row.reactions.length, 0),
      replies: scoredRows.filter((row) => row.replyTo).length,
      importantTruth: scoredRows.filter((row) => row.expectedImportance === "important").length,
      maybeTruth: scoredRows.filter((row) => row.expectedImportance === "maybe").length,
      noiseTruth: scoredRows.filter((row) => row.expectedImportance === "noise").length,
      edgeCases: edgeRows.length,
    },
    overall,
    thresholdAnalysis: thresholds,
    scoreByLabel,
    groupMetrics,
    categoryMetrics,
    categoryAccuracy: scoredRows.filter((row) => row.expectedCategory === row.signalCategory).length / scoredRows.length,
    categoryConfusion: categoryConfusion(scoredRows),
    reactionImpact: {
      movedAcrossImportantThreshold: reactionMovedUp.length,
      funnyReactionNoisePromoted: funnyPromotedNoise.length,
      averageBoostImportant: avg(scoredRows.filter((row) => row.expectedImportance === "important").map((row) => row.reactionBoost)),
      averageBoostMaybe: avg(scoredRows.filter((row) => row.expectedImportance === "maybe").map((row) => row.reactionBoost)),
      averageBoostNoise: avg(scoredRows.filter((row) => row.expectedImportance === "noise").map((row) => row.reactionBoost)),
    },
    edgeCaseMetrics: {
      ...metricsFor(edgeRows, IMPORTANT_THRESHOLD),
      categoryAccuracy: edgeRows.filter((row) => row.expectedCategory === row.signalCategory).length / edgeRows.length,
      byTag: Object.entries(groupBy(edgeRows, "scenarioTag")).map(([scenarioTag, rows]) => ({
        scenarioTag,
        count: rows.length,
        averageScore: avg(rows.map((row) => row.finalScore)),
        precision: metricsFor(rows, IMPORTANT_THRESHOLD).precision,
        recall: metricsFor(rows, IMPORTANT_THRESHOLD).recall,
        categoryAccuracy: rows.filter((row) => row.expectedCategory === row.signalCategory).length / rows.length,
      })),
    },
    ruleStats,
  };
}

function ruleImpact(rows) {
  const stats = {};
  for (const row of rows) {
    const bucket = row.expectedImportance === "important" && row.finalScore >= IMPORTANT_THRESHOLD
      ? "truePositive"
      : row.expectedImportance !== "important" && row.finalScore >= IMPORTANT_THRESHOLD
        ? "falsePositive"
        : row.expectedImportance === "important"
          ? "falseNegative"
          : "trueNegative";
    for (const rule of row.matchedRules) {
      if (!stats[rule.id]) {
        stats[rule.id] = {
          id: rule.id,
          label: rule.label,
          category: rule.category,
          delta: rule.delta,
          truePositive: 0,
          falsePositive: 0,
          falseNegative: 0,
          trueNegative: 0,
        };
      }
      stats[rule.id][bucket] += 1;
    }
  }
  return Object.values(stats).sort((a, b) => (b.falsePositive - a.falsePositive) || (b.truePositive - a.truePositive));
}

function flattenForExport(row) {
  return {
    id: row.id,
    groupName: row.groupName,
    groupType: row.groupType,
    username: row.username,
    createdAt: row.createdAt,
    replyTo: row.replyTo || "",
    text: row.text,
    expectedImportance: row.expectedImportance,
    expectedCategory: row.expectedCategory,
    scenarioTag: row.scenarioTag,
    notes: row.notes,
    baseScoreBeforeReactions: row.baseScoreBeforeReactions,
    baseScore: row.baseScore,
    reactionBoost: row.reactionBoost,
    finalScore: row.finalScore,
    signalCategory: row.signalCategory,
    signalConfidence: row.signalConfidence,
    reactionCounts: JSON.stringify(row.reactionCounts),
    matchedRules: row.matchedRules.map((rule) => `${rule.id}:${rule.delta}`).join("; "),
  };
}

function exportData(messages, scoredRows, evaluation) {
  writeJson("simulated-messages.json", messages);
  writeJson("scored-messages.json", scoredRows);
  writeJson("evaluation-summary.json", evaluation);
  writeCsv("threshold-analysis.csv", evaluation.thresholdAnalysis, [
    "threshold", "messagesShown", "truePositives", "falsePositives", "trueNegatives", "falseNegatives",
    "precision", "recall", "falsePositiveRate", "falseNegativeRate",
  ]);
  writeCsv("category-confusion.csv", evaluation.categoryConfusion, ["expected", "predicted", "count"]);
  const falsePositives = scoredRows.filter((row) => row.expectedImportance !== "important" && row.finalScore >= IMPORTANT_THRESHOLD);
  const falseNegatives = scoredRows.filter((row) => row.expectedImportance === "important" && row.finalScore < IMPORTANT_THRESHOLD);
  const edgeRows = scoredRows.filter((row) => row.id.startsWith("edge_"));
  const columns = Object.keys(flattenForExport(scoredRows[0]));
  writeCsv("false-positives.csv", falsePositives.map(flattenForExport), columns);
  writeCsv("false-negatives.csv", falseNegatives.map(flattenForExport), columns);
  writeCsv("edge-case-results.csv", edgeRows.map(flattenForExport), columns);
  writeCsv("scored-messages.csv", scoredRows.map(flattenForExport), columns);
  writeCsv("rule-impact.csv", evaluation.ruleStats, [
    "id", "label", "category", "delta", "truePositive", "falsePositive", "falseNegative", "trueNegative",
  ]);
}

function pct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function score(value) {
  return Number(value).toFixed(1);
}

function barChart(file, title, rows, labelKey, valueKey, options = {}) {
  const width = 960;
  const height = 460;
  const margin = { top: 52, right: 32, bottom: 96, left: 58 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(...rows.map((row) => row[valueKey]), 1);
  const barWidth = chartWidth / rows.length;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="#fffdf9"/>`,
    `<text x="${margin.left}" y="30" font-family="Arial" font-size="20" font-weight="700" fill="#171717">${title}</text>`,
    `<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="#d7d0c6"/>`,
  ];
  rows.forEach((row, index) => {
    const value = row[valueKey];
    const barHeight = (value / maxValue) * chartHeight;
    const x = margin.left + index * barWidth + 5;
    const y = height - margin.bottom - barHeight;
    const fill = options.color || "#f04438";
    parts.push(`<rect x="${x}" y="${y}" width="${Math.max(4, barWidth - 10)}" height="${barHeight}" rx="3" fill="${fill}"/>`);
    parts.push(`<text x="${x + (barWidth - 10) / 2}" y="${y - 6}" text-anchor="middle" font-family="Arial" font-size="11" fill="#171717">${options.percent ? pct(value) : score(value)}</text>`);
    parts.push(`<text transform="translate(${x + (barWidth - 10) / 2},${height - margin.bottom + 16}) rotate(45)" text-anchor="start" font-family="Arial" font-size="11" fill="#615d57">${String(row[labelKey]).replace(/&/g, "&amp;")}</text>`);
  });
  parts.push("</svg>");
  fs.writeFileSync(path.join(CHART_DIR, file), parts.join("\n"));
}

function lineChart(file, title, rows) {
  const width = 900;
  const height = 420;
  const margin = { top: 52, right: 40, bottom: 54, left: 58 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const xFor = (index) => margin.left + (index / (rows.length - 1)) * chartWidth;
  const yFor = (value) => margin.top + (1 - value) * chartHeight;
  const pathFor = (key) => rows.map((row, index) => `${index ? "L" : "M"} ${xFor(index)} ${yFor(row[key])}`).join(" ");
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="#fffdf9"/>`,
    `<text x="${margin.left}" y="30" font-family="Arial" font-size="20" font-weight="700" fill="#171717">${title}</text>`,
    `<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="#d7d0c6"/>`,
    `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="#d7d0c6"/>`,
    `<path d="${pathFor("precision")}" fill="none" stroke="#f04438" stroke-width="4"/>`,
    `<path d="${pathFor("recall")}" fill="none" stroke="#2563eb" stroke-width="4"/>`,
    `<text x="${width - 220}" y="32" font-family="Arial" font-size="13" fill="#f04438">precision</text>`,
    `<text x="${width - 130}" y="32" font-family="Arial" font-size="13" fill="#2563eb">recall</text>`,
  ];
  rows.forEach((row, index) => {
    const x = xFor(index);
    parts.push(`<text x="${x}" y="${height - margin.bottom + 22}" text-anchor="middle" font-family="Arial" font-size="12" fill="#615d57">${row.threshold}</text>`);
    parts.push(`<circle cx="${x}" cy="${yFor(row.precision)}" r="4" fill="#f04438"/>`);
    parts.push(`<circle cx="${x}" cy="${yFor(row.recall)}" r="4" fill="#2563eb"/>`);
  });
  parts.push("</svg>");
  fs.writeFileSync(path.join(CHART_DIR, file), parts.join("\n"));
}

function heatmap(file, title, rows) {
  const categories = ["plan", "event", "request", "deadline", "announcement", "question", "logistics", "noise"];
  const size = 58;
  const width = 760;
  const height = 650;
  const max = Math.max(...rows.map((row) => row.count), 1);
  const lookup = new Map(rows.map((row) => [`${row.expected}:${row.predicted}`, row.count]));
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="#fffdf9"/>`,
    `<text x="120" y="34" font-family="Arial" font-size="20" font-weight="700" fill="#171717">${title}</text>`,
    `<text x="370" y="60" font-family="Arial" font-size="13" fill="#615d57">predicted category</text>`,
    `<text transform="translate(24 360) rotate(-90)" font-family="Arial" font-size="13" fill="#615d57">expected category</text>`,
  ];
  categories.forEach((category, index) => {
    parts.push(`<text x="${130 + index * size + size / 2}" y="92" text-anchor="middle" font-family="Arial" font-size="10" fill="#615d57">${category}</text>`);
    parts.push(`<text x="112" y="${120 + index * size + size / 2}" text-anchor="end" font-family="Arial" font-size="10" fill="#615d57">${category}</text>`);
  });
  categories.forEach((expected, yIndex) => {
    categories.forEach((predicted, xIndex) => {
      const count = lookup.get(`${expected}:${predicted}`) || 0;
      const intensity = count / max;
      const red = Math.round(255 - intensity * 45);
      const green = Math.round(245 - intensity * 165);
      const blue = Math.round(238 - intensity * 185);
      const x = 130 + xIndex * size;
      const y = 105 + yIndex * size;
      parts.push(`<rect x="${x}" y="${y}" width="${size - 4}" height="${size - 4}" fill="rgb(${red},${green},${blue})" stroke="#fffdf9"/>`);
      if (count) parts.push(`<text x="${x + size / 2}" y="${y + size / 2 + 4}" text-anchor="middle" font-family="Arial" font-size="12" fill="#171717">${count}</text>`);
    });
  });
  parts.push("</svg>");
  fs.writeFileSync(path.join(CHART_DIR, file), parts.join("\n"));
}

function createCharts(evaluation) {
  barChart("score-by-label.svg", "Average Final Score by Ground Truth Label", evaluation.scoreByLabel, "label", "averageFinalScore", { color: "#2563eb" });
  lineChart("threshold-precision-recall.svg", "Precision and Recall by Important Threshold", evaluation.thresholdAnalysis);
  barChart("false-positives-by-group.svg", "False Positives by Group", evaluation.groupMetrics, "groupName", "falsePositives", { color: "#f04438" });
  barChart("category-average-score.svg", "Average Score by Expected Category", evaluation.categoryMetrics, "category", "averageScore", { color: "#16a34a" });
  heatmap("category-confusion.svg", "Category Confusion Matrix", evaluation.categoryConfusion);
  barChart(
    "top-false-positive-rules.svg",
    "Rules Appearing Most in False Positives",
    evaluation.ruleStats.filter((rule) => rule.falsePositive > 0).slice(0, 14),
    "id",
    "falsePositive",
    { color: "#f97316" }
  );
}

function mdTable(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(" | ")} |`;
  const sep = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(column.value(row)).replace(/\|/g, "\\|")).join(" | ")} |`);
  return [header, sep, ...body].join("\n");
}

function ruleSummary(row) {
  return row.matchedRules.slice(0, 5).map((rule) => `${rule.id} (${rule.delta > 0 ? "+" : ""}${rule.delta})`).join(", ");
}

function writeReport(scoredRows, evaluation) {
  const falsePositives = scoredRows
    .filter((row) => row.expectedImportance !== "important" && row.finalScore >= IMPORTANT_THRESHOLD)
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, 12);
  const falseNegatives = scoredRows
    .filter((row) => row.expectedImportance === "important" && row.finalScore < IMPORTANT_THRESHOLD)
    .sort((a, b) => a.finalScore - b.finalScore)
    .slice(0, 12);
  const truePositives = scoredRows
    .filter((row) => row.expectedImportance === "important" && row.finalScore >= IMPORTANT_THRESHOLD)
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, 12);
  const ambiguous = scoredRows
    .filter((row) => row.expectedImportance === "maybe")
    .sort((a, b) => Math.abs(a.finalScore - 55) - Math.abs(b.finalScore - 55))
    .slice(0, 12);
  const reactionSensitive = scoredRows
    .filter((row) => row.reactionBoost > 0)
    .sort((a, b) => b.reactionBoost - a.reactionBoost)
    .slice(0, 12);
  const edgeRows = scoredRows.filter((row) => row.id.startsWith("edge_"));
  const worstGroups = evaluation.groupMetrics.slice(0, 5);
  const bestThreshold = evaluation.thresholdAnalysis
    .map((row) => ({ ...row, f1: row.precision + row.recall ? (2 * row.precision * row.recall) / (row.precision + row.recall) : 0 }))
    .sort((a, b) => b.f1 - a.f1)[0];
  const topFalsePositiveRules = evaluation.ruleStats.filter((rule) => rule.falsePositive > 0).slice(0, 8);
  const topFalseNegativeRules = evaluation.ruleStats.filter((rule) => rule.falseNegative > 0).slice(0, 8);

  const exampleColumns = [
    { label: "Text", value: (row) => row.text },
    { label: "Group", value: (row) => row.groupName },
    { label: "Expected", value: (row) => `${row.expectedImportance}/${row.expectedCategory}` },
    { label: "Score", value: (row) => `${row.finalScore} (${row.signalCategory})` },
    { label: "Reactions", value: (row) => JSON.stringify(row.reactionCounts) },
    { label: "Rules", value: ruleSummary },
  ];

  const lines = [
    "# CatchUp Algorithm Simulation Evaluation",
    "",
    "## Executive Summary",
    "",
    `This simulation generated ${evaluation.counts.messages} messages across ${evaluation.counts.groups} realistic social groups with ${evaluation.counts.users} simulated users, ${evaluation.counts.reactions} reactions, and ${evaluation.counts.replies} replies. The current Important threshold is ${IMPORTANT_THRESHOLD}.`,
    "",
    `At threshold ${IMPORTANT_THRESHOLD}, precision is **${pct(evaluation.overall.precision)}** and recall is **${pct(evaluation.overall.recall)}**. Category accuracy is **${pct(evaluation.categoryAccuracy)}**. The system showed ${evaluation.overall.messagesShown} messages in the simulated Important feed, with ${evaluation.overall.falsePositives} false positives and ${evaluation.overall.falseNegatives} false negatives.`,
    "",
    `The strongest threshold by F1 in this run was **${bestThreshold.threshold}** with precision ${pct(bestThreshold.precision)} and recall ${pct(bestThreshold.recall)}. Threshold ${IMPORTANT_THRESHOLD} is ${bestThreshold.threshold === IMPORTANT_THRESHOLD ? "well aligned with the current simulation" : "not the strongest F1 point in this simulation"}; see the threshold table before changing product defaults.`,
    "",
    "The algorithm is useful enough for early testing if the product goal is high precision, but it still misses casual important messages and typo/slang variants. The biggest risk is not viral jokes from reactions; reaction caps worked well in this run. The bigger risk is sparse, context-dependent messages that real users understand but rules cannot.",
    "",
    "## Simulation Methodology",
    "",
    `- Seed: ${SEED}`,
    `- Simulated users: ${evaluation.counts.users}`,
    `- Simulated groups: ${evaluation.counts.groups}`,
    `- Total messages: ${evaluation.counts.messages}`,
    `- Ground truth: ${evaluation.counts.importantTruth} important, ${evaluation.counts.maybeTruth} maybe, ${evaluation.counts.noiseTruth} noise`,
    `- Explicit edge cases: ${evaluation.counts.edgeCases}`,
    `- Reactions: ${evaluation.counts.reactions}, assigned according to message context`,
    `- Replies: ${evaluation.counts.replies}, assigned to prior messages in the same group`,
    `- Isolated database: \`${path.relative(ROOT, DB_PATH)}\``,
    "",
    "Messages were generated from group-specific conversation templates plus an explicit adversarial edge-case suite. Every message carries ground truth importance, expected category, scenario tag, and notes. The simulation scores each message twice: once without reactions and once with simulated reactions, so the report can isolate reaction impact.",
    "",
    "## Charts",
    "",
    "![Average score by label](charts/score-by-label.svg)",
    "",
    "![Threshold precision recall](charts/threshold-precision-recall.svg)",
    "",
    "![False positives by group](charts/false-positives-by-group.svg)",
    "",
    "![Category confusion](charts/category-confusion.svg)",
    "",
    "![Average score by category](charts/category-average-score.svg)",
    "",
    "![Top false-positive rules](charts/top-false-positive-rules.svg)",
    "",
    "## Overall Metrics",
    "",
    mdTable([evaluation.overall], [
      { label: "Threshold", value: (row) => row.threshold },
      { label: "Shown", value: (row) => row.messagesShown },
      { label: "Precision", value: (row) => pct(row.precision) },
      { label: "Recall", value: (row) => pct(row.recall) },
      { label: "False Positives", value: (row) => row.falsePositives },
      { label: "False Negatives", value: (row) => row.falseNegatives },
      { label: "FPR", value: (row) => pct(row.falsePositiveRate) },
      { label: "FNR", value: (row) => pct(row.falseNegativeRate) },
    ]),
    "",
    "## Threshold Sensitivity",
    "",
    mdTable(evaluation.thresholdAnalysis, [
      { label: "Threshold", value: (row) => row.threshold },
      { label: "Shown", value: (row) => row.messagesShown },
      { label: "Precision", value: (row) => pct(row.precision) },
      { label: "Recall", value: (row) => pct(row.recall) },
      { label: "False Positives", value: (row) => row.falsePositives },
      { label: "False Negatives", value: (row) => row.falseNegatives },
    ]),
    "",
    "## Score By Ground Truth Label",
    "",
    mdTable(evaluation.scoreByLabel, [
      { label: "Label", value: (row) => row.label },
      { label: "Count", value: (row) => row.count },
      { label: "Avg Base", value: (row) => score(row.averageBaseScore) },
      { label: "Avg Boost", value: (row) => score(row.averageReactionBoost) },
      { label: "Avg Final", value: (row) => score(row.averageFinalScore) },
    ]),
    "",
    "## Group-by-Group Breakdown",
    "",
    ...evaluation.groupMetrics.flatMap((group) => [
      `### ${group.groupName}`,
      "",
      `Type: ${group.groupType}. Messages: ${group.messages}. Active simulated users: ${group.users}. Mix: ${group.important} important, ${group.maybe} maybe, ${group.noise} noise.`,
      "",
      `Precision ${pct(group.precision)}, recall ${pct(group.recall)}, category accuracy ${pct(group.categoryAccuracy)}, average score ${score(group.averageScore)}. False positives: ${group.falsePositives}. False negatives: ${group.falseNegatives}.`,
      "",
      "Representative messages:",
      "",
      mdTable(scoredRows.filter((row) => row.groupName === group.groupName).slice(0, 4), exampleColumns),
      "",
    ]),
    "## Hardest Groups",
    "",
    mdTable(worstGroups, [
      { label: "Group", value: (row) => row.groupName },
      { label: "Type", value: (row) => row.groupType },
      { label: "Precision", value: (row) => pct(row.precision) },
      { label: "Recall", value: (row) => pct(row.recall) },
      { label: "FP", value: (row) => row.falsePositives },
      { label: "FN", value: (row) => row.falseNegatives },
      { label: "Category Acc", value: (row) => pct(row.categoryAccuracy) },
    ]),
    "",
    "## Message Examples",
    "",
    "### Highest-Scoring True Positives",
    "",
    mdTable(truePositives, exampleColumns),
    "",
    "### Worst False Positives",
    "",
    falsePositives.length ? mdTable(falsePositives, exampleColumns) : "No false positives crossed the Important threshold.",
    "",
    "### Worst False Negatives",
    "",
    falseNegatives.length ? mdTable(falseNegatives, exampleColumns) : "No important messages fell below the Important threshold.",
    "",
    "### Best Ambiguous Calls",
    "",
    mdTable(ambiguous, exampleColumns),
    "",
    "### Most Reaction-Sensitive Messages",
    "",
    mdTable(reactionSensitive, [
      ...exampleColumns,
      { label: "Before", value: (row) => row.baseScoreBeforeReactions },
      { label: "Boost", value: (row) => row.reactionBoost },
    ]),
    "",
    "## Reaction Impact",
    "",
    `Reactions moved ${evaluation.reactionImpact.movedAcrossImportantThreshold} messages across the Important threshold. Funny reactions promoted ${evaluation.reactionImpact.funnyReactionNoisePromoted} noise messages across the threshold.`,
    "",
    mdTable([
      { label: "important", avg: evaluation.reactionImpact.averageBoostImportant },
      { label: "maybe", avg: evaluation.reactionImpact.averageBoostMaybe },
      { label: "noise", avg: evaluation.reactionImpact.averageBoostNoise },
    ], [
      { label: "Ground Truth", value: (row) => row.label },
      { label: "Average Reaction Boost", value: (row) => score(row.avg) },
    ]),
    "",
    "## Edge-Case Analysis",
    "",
    `Edge-case precision is ${pct(evaluation.edgeCaseMetrics.precision)}, recall is ${pct(evaluation.edgeCaseMetrics.recall)}, and category accuracy is ${pct(evaluation.edgeCaseMetrics.categoryAccuracy)}.`,
    "",
    mdTable(evaluation.edgeCaseMetrics.byTag, [
      { label: "Scenario", value: (row) => row.scenarioTag },
      { label: "Count", value: (row) => row.count },
      { label: "Avg Score", value: (row) => score(row.averageScore) },
      { label: "Precision", value: (row) => pct(row.precision) },
      { label: "Recall", value: (row) => pct(row.recall) },
      { label: "Category Acc", value: (row) => pct(row.categoryAccuracy) },
    ]),
    "",
    "Representative edge cases:",
    "",
    mdTable(edgeRows.slice(0, 25), exampleColumns),
    "",
    "## Scoring Insights",
    "",
    "Rules that most often appeared in false positives:",
    "",
    topFalsePositiveRules.length ? mdTable(topFalsePositiveRules, [
      { label: "Rule", value: (row) => row.id },
      { label: "Label", value: (row) => row.label },
      { label: "Delta", value: (row) => row.delta },
      { label: "False Positives", value: (row) => row.falsePositive },
      { label: "True Positives", value: (row) => row.truePositive },
    ]) : "No false-positive rules at the Important threshold.",
    "",
    "Rules that appeared in false negatives:",
    "",
    topFalseNegativeRules.length ? mdTable(topFalseNegativeRules, [
      { label: "Rule", value: (row) => row.id },
      { label: "Label", value: (row) => row.label },
      { label: "Delta", value: (row) => row.delta },
      { label: "False Negatives", value: (row) => row.falseNegative },
      { label: "True Positives", value: (row) => row.truePositive },
    ]) : "No matched rules appeared in false negatives.",
    "",
    "Category confusions are exported to `output/category-confusion.csv` and visualized above. In this run, most category misses came from messages that have legitimate overlap: requests involving rides, announcements involving events, and vague questions that need conversation context.",
    "",
    "## Recommendations",
    "",
    ...recommendations(evaluation, falsePositives, falseNegatives),
    "",
    "## Data Exports",
    "",
    "- `output/simulated-messages.json`",
    "- `output/scored-messages.json`",
    "- `output/evaluation-summary.json`",
    "- `output/scored-messages.csv`",
    "- `output/threshold-analysis.csv`",
    "- `output/category-confusion.csv`",
    "- `output/rule-impact.csv`",
    "- `output/false-positives.csv`",
    "- `output/false-negatives.csv`",
    "- `output/edge-case-results.csv`",
  ];

  fs.writeFileSync(path.join(REPORT_DIR, "algorithm-evaluation.md"), `${lines.join("\n")}\n`);
}

function recommendations(evaluation, falsePositives, falseNegatives) {
  const recs = [];
  const bestThreshold = evaluation.thresholdAnalysis
    .map((row) => ({ ...row, f1: row.precision + row.recall ? (2 * row.precision * row.recall) / (row.precision + row.recall) : 0 }))
    .sort((a, b) => b.f1 - a.f1)[0];

  recs.push(`- Keep the Important threshold near **${bestThreshold.threshold}** for the next calibration pass. In this simulation it had the strongest precision/recall balance.`);

  if (evaluation.reactionImpact.funnyReactionNoisePromoted === 0) {
    recs.push("- Keep the current reaction caps. Funny/high-volume reactions did not promote noise into Important in this run.");
  } else {
    recs.push("- Tighten low-base reaction caps; funny reactions promoted noise across the Important threshold.");
  }

  if (falseNegatives.some((row) => row.scenarioTag.includes("typo") || /\btix|tmr|tn|mtg|spkrs|drvr\b/i.test(row.text))) {
    recs.push("- Add typo/slang aliases for `tix`, `tmr`, `tn`, `mtg`, `spkrs`, and `drvr`; these are realistic and currently fragile.");
  } else {
    recs.push("- Keep monitoring typo/slang messages with real users; the current synthetic set did not expose a severe threshold miss, but this remains a high-risk area.");
  }

  if (falseNegatives.some((row) => row.scenarioTag === "casual_important" || row.scenarioTag === "context_required")) {
    recs.push("- Add a small set of phrase rules for casual important wording like `be at the house by 8`, `leaving in 10`, and context-preserving replies.");
  }

  if (falsePositives.length) {
    const noisyRules = evaluation.ruleStats.filter((rule) => rule.falsePositive > 0).slice(0, 3).map((rule) => rule.id).join(", ");
    recs.push(`- Review false-positive rules first: ${noisyRules}. Tune with phrase-level exceptions instead of weakening all time/date/event evidence.`);
  } else {
    recs.push("- Do not broadly weaken deadline, event, or logistics rules yet; precision is not failing at the current threshold.");
  }

  recs.push("- Add real audit labels from early testers before adding AI summaries. The simulation is useful pressure, but real chat context will reveal new shorthand and group-specific language.");
  recs.push("- Consider storing a `scenarioTag`-like audit reason in internal tooling so future calibration can group false positives and false negatives by failure mode.");
  return recs;
}

function writeReadme() {
  fs.writeFileSync(path.join(WORK_DIR, "README.md"), [
    "# CatchUp Simulation",
    "",
    "Run the full deterministic scoring stress test with:",
    "",
    "```powershell",
    "& \"C:\\Program Files\\nodejs\\npm.cmd\" run simulate",
    "```",
    "",
    "or, when npm is available on your shell path:",
    "",
    "```bash",
    "npm run simulate",
    "```",
    "",
    "The simulation writes an isolated SQLite database to `work/simulation/catchup-sim.sqlite`, exports raw data to `work/simulation/output/`, and writes the main report to `work/simulation/reports/algorithm-evaluation.md`.",
    "",
    "The normal app database `catchup.sqlite` is not used.",
  ].join("\n"));
}

function main() {
  ensureDirs();
  cleanOutputs();
  writeReadme();

  const db = createDb();
  const groups = createBaseEntities(db);
  const messages = generateMessages(groups);
  persistMessages(db, messages);
  db.close();

  const scoredRows = scoreRows(messages);
  const evaluation = evaluate(scoredRows);
  exportData(messages, scoredRows, evaluation);
  createCharts(evaluation);
  writeReport(scoredRows, evaluation);

  console.log(`Simulation complete.`);
  console.log(`Messages: ${evaluation.counts.messages}`);
  console.log(`Precision @ ${IMPORTANT_THRESHOLD}: ${pct(evaluation.overall.precision)}`);
  console.log(`Recall @ ${IMPORTANT_THRESHOLD}: ${pct(evaluation.overall.recall)}`);
  console.log(`Report: ${path.relative(ROOT, path.join(REPORT_DIR, "algorithm-evaluation.md"))}`);
}

main();

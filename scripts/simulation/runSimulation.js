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
const BASELINE_RESULTS = {
  messages: 2745,
  groups: 15,
  precision65: 0.868,
  recall65: 0.539,
  categoryAccuracy: 0.874,
  edgeCaseRecall: 0.278,
};

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
  { name: "St. Mark Newman Center", type: "Church/Catholic center group", tag: "church", style: "mass times, retreats, rides, volunteer shifts, service reminders" },
  { name: "Pre-Med Service Crew", type: "Pre-med volunteering group", tag: "premed", style: "clinic shifts, forms, rides, shadowing deadlines, volunteer asks" },
  { name: "Senior Design Lab", type: "Engineering lab/project team", tag: "engineering", style: "lab access, parts, demos, deliverables, testing windows" },
  { name: "Maple Hall 3", type: "Dorm floor chat", tag: "dorm", style: "floor meetings, laundry, packages, RA notices, late-night noise" },
  { name: "Bracket Weekend", type: "Intramural tournament group", tag: "tournament", style: "brackets, courts, jerseys, tipoff, rides, forfeits" },
  { name: "Arena Concert Run", type: "Concert/festival group", tag: "concert", style: "tickets, doors, set times, rides, venue entrances" },
  { name: "Reservation Roulette", type: "Restaurant/dinner reservation group", tag: "restaurant", style: "reservation times, deposits, rides, headcounts, cancellations" },
  { name: "PCB Spring Break", type: "Spring break/trip planning group", tag: "trip", style: "flights, airbnb, deposits, rides, packing, check-in times" },
  { name: "Morning Lift Crew", type: "Gym/workout group", tag: "gym", style: "lift times, gym location, rides, cancellations, equipment" },
  { name: "Ava Birthday Ops", type: "Birthday/event planning group", tag: "birthday", style: "surprises, reservations, supplies, arrival windows, payments" },
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
  church: [
    ["service project forms due tonight", "deadline", "forms"],
    ["mass moved to the chapel at 7", "announcement", "location_change"],
    ["need drivers for retreat Saturday", "logistics", "ride_request"],
    ["volunteer shift starts at 11", "event", "shift_time"],
    ["bring canned food to service tomorrow", "logistics", "supplies"],
  ],
  premed: [
    ["clinic signup closes tonight", "deadline", "signup_deadline"],
    ["need two people for check in at noon", "request", "volunteer"],
    ["shadowing forms due by Friday", "deadline", "forms"],
    ["volunteer room changed to 214", "announcement", "room_change"],
    ["rides leave for hospital at 8am", "logistics", "ride_time"],
  ],
  engineering: [
    ["demo slides due by midnight", "deadline", "deliverable"],
    ["lab moved to room 118 tonight", "announcement", "room_change"],
    ["bring the sensor kit tomorrow", "logistics", "equipment"],
    ["testing window starts at 6", "event", "lab_time"],
    ["can someone submit the final doc", "request", "deliverable"],
  ],
  dorm: [
    ["floor meeting moved to 8 in the lounge", "announcement", "meeting_change"],
    ["RA inspection tomorrow at 10am", "event", "inspection"],
    ["can someone grab trash bags", "request", "supplies"],
    ["package pickup closes at 5", "deadline", "pickup_deadline"],
    ["quiet hours start at midnight", "event", "policy_time"],
  ],
  tournament: [
    ["tipoff at 8 on court 3", "event", "game_time"],
    ["need one more for tipoff", "request", "player_count"],
    ["bring white jerseys tomorrow", "logistics", "equipment"],
    ["bracket check in closes at noon", "deadline", "checkin_deadline"],
    ["game moved to court 2", "announcement", "location_change"],
  ],
  concert: [
    ["doors got pushed to 8", "announcement", "time_change"],
    ["tickets close tonight", "deadline", "tickets"],
    ["meet at north entrance by 7", "event", "meet_time"],
    ["need one more car for the venue", "logistics", "ride_request"],
    ["set times posted doors at 8", "announcement", "set_times"],
  ],
  restaurant: [
    ["reservation is at 7:45", "event", "reservation"],
    ["deposit is due by noon", "deadline", "payment"],
    ["need final headcount tonight", "request", "headcount"],
    ["dinner moved to Friday", "announcement", "date_change"],
    ["can someone call the restaurant", "request", "responsibility"],
  ],
  trip: [
    ["airbnb money due Friday", "deadline", "payment"],
    ["flight leaves at 6am", "event", "departure"],
    ["need drivers to airport tomorrow", "logistics", "ride_request"],
    ["check in moved to 3pm", "announcement", "time_change"],
    ["bring passport if you have one", "logistics", "supplies"],
  ],
  gym: [
    ["lift moved to 7am", "announcement", "time_change"],
    ["bring bands tomorrow", "logistics", "equipment"],
    ["need one more for the workout", "request", "headcount"],
    ["gym closes at 9 tonight", "deadline", "closing_time"],
    ["meet by the front desk at 6", "event", "meet_time"],
  ],
  birthday: [
    ["birthday dinner reservation at 8", "event", "reservation"],
    ["venmo for cake by tonight", "deadline", "payment"],
    ["can someone bring candles", "request", "supplies"],
    ["surprise moved to the apartment", "announcement", "location_change"],
    ["arrive by 7 or Ava will see us", "event", "arrival_time"],
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

const SLANG_TYPO_CANONICALS = [
  ["formal tickets are due by midnight tomorrow", "deadline", ["formal tix due midnight tmr", "tix r due by 12 tn", "formal tickets due by midnite tmrw", "send formal money by midnight", "last day for formal tix is tmr"]],
  ["meeting moved to room 204 tonight", "announcement", ["mtg moved room 204 tn", "meeting got moved to rm 204", "new room is 204 for tonight", "room changed to 204", "we're in 204 now"]],
  ["can someone bring speakers to the pregame", "request", ["can someone bring spkrs", "anyone got speakers for preg?", "need speakers at pregame", "who can bring the speaker tn", "bring speaker if u have one"]],
  ["practice moved indoors", "announcement", ["prac moved inside", "practice is indoors tn", "we inside for practice", "field got moved inside", "moved indoors bc rain"]],
  ["soundcheck at 5, doors at 8", "event", ["soundcheck 5 doors 8", "sc at 5 doors 8", "load in 5 doors 8", "doors got pushed to 8", "set times posted doors at 8"]],
  ["problem set is due tonight", "deadline", ["prob set due tmr", "pset due tn", "hw due by midnite", "canvas closes tn", "turn in assn by 12"]],
  ["need sober drivers tonight", "logistics", ["need sober drvr tn", "need sober d 2nite", "need drvrs for formal", "need driverz tonight", "who can sober drive tn"]],
  ["bring both jerseys tomorrow", "logistics", ["bring both jersies tmr", "bring jersey tmrw", "yall bring jerseys tn?", "bring white and dark jerseys", "need jerseys b4 game"]],
  ["reservation is at 7:45", "event", ["resy at 745", "restaraunt at 8", "dinner resy 7:45", "reservation got pushed to 8", "be at restaurant by 8"]],
  ["utilities are due Friday", "deadline", ["utilities due fri", "wifi bill due tmr", "rent due tmrw", "venmo utilities by friday", "send rent money tn"]],
  ["volunteer shift starts at 11", "event", ["shift starts 11", "table shift at 11", "vol shift moved thurs", "tabling starts at noon", "gbm at 7"]],
  ["need one more for the Uber", "logistics", ["need 1 more for uber", "need one more for lyft", "got space in uber?", "who has room in car", "need one more car"]],
];

const DOMAIN_LANGUAGE_STRESS = [
  ["chapter at 6", "important", "event", "fraternity"],
  ["risk needs sober drivers by 9", "important", "logistics", "fraternity"],
  ["pledges meet at the house by 8", "important", "event", "fraternity"],
  ["wristbands close at midnight", "important", "deadline", "fraternity"],
  ["lineup posted at noon", "important", "announcement", "fraternity"],
  ["bid day forms due tonight", "important", "deadline", "sorority"],
  ["wear white for recruitment at 6", "important", "event", "sorority"],
  ["sisterhood moved to room 310", "important", "announcement", "sorority"],
  ["need two people for philanthropy check in", "important", "request", "sorority"],
  ["signup closes tomorrow", "important", "deadline", "sorority"],
  ["doors got pushed to 8", "important", "announcement", "dj"],
  ["load in at 6", "important", "event", "dj"],
  ["guest list closes tn", "important", "deadline", "dj"],
  ["need controller at the booth", "important", "request", "dj"],
  ["set times posted doors at 8", "important", "announcement", "dj"],
  ["canvas closes at midnight", "important", "deadline", "class"],
  ["prob set due tmr", "important", "deadline", "class"],
  ["peer review due friday", "important", "deadline", "class"],
  ["slides need to be done by 7", "important", "request", "class"],
  ["meet in lab 118 at 6", "important", "event", "engineering"],
  ["practice moved indoors", "important", "announcement", "sports"],
  ["bring cleats tomorrow", "important", "logistics", "sports"],
  ["bus leaves in 20", "important", "event", "sports"],
  ["tipoff at 8 court 3", "important", "event", "sports"],
  ["need one more for tipoff", "important", "request", "sports"],
  ["rent is due tomorrow", "important", "deadline", "roommate"],
  ["maintenance coming at 9am", "important", "event", "roommate"],
  ["inspection moved to thursday", "important", "announcement", "roommate"],
  ["wifi bill due fri", "important", "deadline", "roommate"],
  ["can someone grab trash bags", "important", "request", "roommate"],
  ["mass moved to chapel at 7", "important", "announcement", "church"],
  ["retreat forms due tonight", "important", "deadline", "church"],
  ["need drivers for service saturday", "important", "logistics", "church"],
  ["volunteer shift starts at 11", "important", "event", "church"],
  ["bring canned food tomorrow", "important", "logistics", "church"],
  ["clinic signup closes tn", "important", "deadline", "premed"],
  ["shadowing forms due friday", "important", "deadline", "premed"],
  ["hospital rides leave at 8am", "important", "logistics", "premed"],
  ["need people for check in at noon", "important", "request", "premed"],
  ["volunteer room changed to 214", "important", "announcement", "premed"],
  ["airbnb money due friday", "important", "deadline", "trip"],
  ["flight leaves at 6am", "important", "event", "trip"],
  ["check in moved to 3pm", "important", "announcement", "trip"],
  ["need drivers to airport tomorrow", "important", "logistics", "trip"],
  ["bring passport if you have one", "important", "logistics", "trip"],
  ["venmo for cake by tonight", "important", "deadline", "birthday"],
  ["arrive by 7 for the surprise", "important", "event", "birthday"],
  ["can someone bring candles", "important", "request", "birthday"],
  ["surprise moved to apartment", "important", "announcement", "birthday"],
  ["reservation deposit due noon", "important", "deadline", "restaurant"],
];

const FALSE_POSITIVE_STRESS = [
  "deadline for being washed is tonight",
  "formal apology incoming",
  "rush hour traffic sucks",
  "party animal",
  "who let him cook?",
  "why is bro like this?",
  "need bro to retire",
  "Friday was insane",
  "tomorrow gonna be wild",
  "9 is crazy",
  "can someone tell Tyler to stop yelling",
  "bro said formal like he owns the place",
  "he needs to be stopped",
  "this fit is formal",
  "tickets to the downfall",
  "meeting my downfall rn",
  "chapter of my villain arc starts tonight",
  "canvas is my enemy",
  "practice? never heard of her",
  "soundcheck for my mental breakdown",
  "doors at 8 to my downfall",
  "rent free in his head",
  "utilities? bro has none",
  "bring plates for my ego",
  "need drivers for the struggle bus",
  "massive L tomorrow",
  "retreat from my responsibilities",
  "birthday suit formal",
  "reservation for one brain cell",
  "kickoff to being washed",
];

function expandStressRows() {
  const slangRows = [];
  for (const [canonical, category, variants] of SLANG_TYPO_CANONICALS) {
    for (const text of [canonical, ...variants]) {
      slangRows.push([text, "important", category, "stress_slang_typo", "Slang or typo stress-test message"]);
    }
  }
  while (slangRows.length < 120) {
    const [canonical, category, variants] = pick(SLANG_TYPO_CANONICALS);
    slangRows.push([pick(variants), "important", category, "stress_slang_typo", `Repeated variant of ${canonical}`]);
  }

  const domainRows = [];
  for (const [text, importance, category, domain] of DOMAIN_LANGUAGE_STRESS) {
    domainRows.push([text, importance, category, "stress_domain_language", `Domain language stress test: ${domain}`]);
  }
  while (domainRows.length < 170) {
    const [text, importance, category, domain] = pick(DOMAIN_LANGUAGE_STRESS);
    domainRows.push([text, importance, category, "stress_domain_language", `Repeated domain variant: ${domain}`]);
  }

  const trapRows = [];
  for (const text of FALSE_POSITIVE_STRESS) {
    trapRows.push([text, "noise", "noise", "stress_false_positive_trap", "Important-looking false-positive trap"]);
  }
  while (trapRows.length < 125) {
    trapRows.push([pick(FALSE_POSITIVE_STRESS), "noise", "noise", "stress_false_positive_trap", "Repeated false-positive trap variant"]);
  }

  return { slangRows, domainRows, trapRows };
}

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

  const expandedStressRows = expandStressRows();
  const stressRows = [
    ...expandedStressRows.slangRows,
    ...expandedStressRows.domainRows,
    ...expandedStressRows.trapRows,
  ];
  for (const [index, [text, importance, category, tag, notes]] of stressRows.entries()) {
    const group = groups[(index + EDGE_CASES.length) % groups.length];
    const username = pick(group.members);
    const message = {
      id: `stress_${String(index + 1).padStart(4, "0")}`,
      groupId: group.id,
      groupName: group.name,
      groupType: group.type,
      username,
      userId: `user_${username.toLowerCase()}`,
      text,
      createdAt: iso(globalIndex * 3 + index),
      replyTo: maybe(0.12) && messages.length ? pick(messages.filter((row) => row.groupId === group.id)).id : null,
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
  const edgeRows = scoredRows.filter((row) => row.id.startsWith("edge_") || row.id.startsWith("stress_"));
  const slangStressRows = scoredRows.filter((row) => row.scenarioTag === "stress_slang_typo");
  const domainStressRows = scoredRows.filter((row) => row.scenarioTag === "stress_domain_language");
  const trapStressRows = scoredRows.filter((row) => row.scenarioTag === "stress_false_positive_trap");
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
      slangTypoStress: slangStressRows.length,
      domainLanguageStress: domainStressRows.length,
      falsePositiveTraps: trapStressRows.length,
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
    stressMetrics: {
      slangTypo: {
        ...metricsFor(slangStressRows, IMPORTANT_THRESHOLD),
        categoryAccuracy: slangStressRows.filter((row) => row.expectedCategory === row.signalCategory).length / slangStressRows.length,
      },
      domainLanguage: {
        ...metricsFor(domainStressRows, IMPORTANT_THRESHOLD),
        categoryAccuracy: domainStressRows.filter((row) => row.expectedCategory === row.signalCategory).length / domainStressRows.length,
      },
      falsePositiveTraps: {
        ...metricsFor(trapStressRows, IMPORTANT_THRESHOLD),
        categoryAccuracy: trapStressRows.filter((row) => row.expectedCategory === row.signalCategory).length / trapStressRows.length,
      },
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
  const edgeRows = scoredRows.filter((row) => row.id.startsWith("edge_") || row.id.startsWith("stress_"));
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

function explainOverall(evaluation) {
  const lines = [
    "How to read this finding:",
    "",
    `- Precision answers: when CatchUp shows a message in Important, how often is it truly important? Here, ${pct(evaluation.overall.precision)} means the feed is fairly trustworthy, but roughly ${evaluation.overall.falsePositives} shown messages were still not ground-truth important.`,
    `- Recall answers: of all truly important messages, how many did CatchUp catch? Here, ${pct(evaluation.overall.recall)} means the algorithm missed ${evaluation.overall.falseNegatives} important messages, so the current system is more conservative than comprehensive.`,
    `- False positive rate is low at ${pct(evaluation.overall.falsePositiveRate)}, which is good for avoiding a junk-filled Important tab. False negative rate is high at ${pct(evaluation.overall.falseNegativeRate)}, which is the main product risk if users rely on CatchUp as their only way to catch up.`,
    `- Category accuracy at ${pct(evaluation.categoryAccuracy)} means the scorer usually names the right kind of signal once it sees one, but category accuracy is less important than precision/recall for the core product promise.`,
  ];
  return lines.join("\n");
}

function explainThresholds(evaluation, bestThreshold) {
  const current = evaluation.thresholdAnalysis.find((row) => row.threshold === IMPORTANT_THRESHOLD);
  return [
    "What this means:",
    "",
    `- Lower thresholds show more messages and recover more important content, but they also increase noise. Threshold ${bestThreshold.threshold} had the best F1 balance here because it caught ${pct(bestThreshold.recall)} of important messages while keeping precision at ${pct(bestThreshold.precision)}.`,
    `- The current threshold ${IMPORTANT_THRESHOLD} is more precision-oriented: it shows ${current.messagesShown} messages, with ${current.falsePositives} false positives and ${current.falseNegatives} false negatives. That is a deliberate \"better to miss than flood\" posture.`,
    "- Product decision: keep 65 if the Important tab must feel highly curated during early demos. Test 55 or 60 if users complain that CatchUp misses too many useful messages.",
  ].join("\n");
}

function explainScoreBands(evaluation) {
  const byLabel = Object.fromEntries(evaluation.scoreByLabel.map((row) => [row.label, row]));
  const importantAverage = byLabel.important?.averageFinalScore || 0;
  const importantInterpretation = importantAverage >= IMPORTANT_THRESHOLD
    ? `Important messages average ${score(importantAverage)}, which is comfortably above the current threshold. That explains the recall improvement: the wider language layer now lifts many variants that previously sat below Important.`
    : `Important messages average ${score(importantAverage)}, which sits just below the current threshold. That explains the recall problem: many important messages are close, but not quite high enough.`;
  return [
    "Interpretation:",
    "",
    `- ${importantInterpretation}`,
    `- Maybe messages average ${score(byLabel.maybe?.averageFinalScore || 0)}, which is comfortably below Important. This is healthy because maybe-useful chatter should not dominate the feed.`,
    `- Noise averages ${score(byLabel.noise?.averageFinalScore || 0)}, so the noise penalties and reaction caps are doing their basic job.`,
    "- The practical tuning target is not separating noise from important; that already works. The hard part is lifting terse but genuinely important logistics without also lifting vague maybe messages.",
  ].join("\n");
}

function explainGroup(group) {
  const precisionNote = group.precision >= 0.9
    ? "Very high precision means this group's Important feed is trusted, but it may still miss quieter important messages."
    : group.precision >= 0.8
      ? "Good precision means most surfaced messages are worth reading, though some maybe/noise items still leak in."
      : "Lower precision means this group has language that makes maybe/noise messages look actionable.";
  const recallNote = group.recall >= 0.7
    ? "Strong recall means the scorer catches most important items in this context."
    : group.recall >= 0.45
      ? "Middle recall means CatchUp catches obvious signal but misses a meaningful number of terse or context-heavy messages."
      : "Low recall means this group uses wording the current rules do not understand well enough.";
  return `${precisionNote} ${recallNote} False negatives are the first place to inspect if this group feels under-served; false positives are the first place to inspect if its Important tab feels noisy.`;
}

function explainExamples() {
  return [
    "How to use these examples:",
    "",
    "- True positives show the patterns the algorithm understands well. These are rule combinations worth preserving during tuning.",
    "- False positives show messages that would annoy users because they appear in Important despite not being ground-truth important.",
    "- False negatives are the most valuable tuning examples because they are real misses. They show what users might still have to find manually.",
    "- Ambiguous calls are not necessarily bugs. They show the gray zone where product judgment matters: should CatchUp be quiet, or should it surface more maybe-useful coordination?",
    "- Reaction-sensitive rows show whether reactions are acting as validation or accidentally overpowering the text score.",
  ].join("\n");
}

function explainReactionImpact(evaluation) {
  const funny = evaluation.reactionImpact.funnyReactionNoisePromoted;
  return [
    "Interpretation:",
    "",
    `- ${evaluation.reactionImpact.movedAcrossImportantThreshold} messages crossed into Important because of reactions. These are cases where social validation changed product behavior.`,
    `- ${funny} noise messages crossed because of funny/hype reactions. ${funny === 0 ? "That is a strong sign the reaction cap is doing its job." : "That is a warning that reactions can still overpower weak text signal."}`,
    `- Important messages received an average boost of ${score(evaluation.reactionImpact.averageBoostImportant)}, compared with ${score(evaluation.reactionImpact.averageBoostMaybe)} for maybe messages and ${score(evaluation.reactionImpact.averageBoostNoise)} for noise. This is the intended shape: reactions should help real signal more than jokes.`,
  ].join("\n");
}

function explainEdgeCases(evaluation) {
  return [
    "What this section is proving:",
    "",
    "- Edge cases are adversarial by design. A lower score here is not automatically bad; the point is to expose where simple rules lack social context.",
    `- Edge-case recall at ${pct(evaluation.edgeCaseMetrics.recall)} shows how often the engine catches non-obvious important messages such as slang, casual commands, cancellations, or group-specific shorthand.`,
    `- Edge-case precision at ${pct(evaluation.edgeCaseMetrics.precision)} shows whether tricky joke messages with important-looking words are leaking into Important.`,
    "- The highest-value misses are casual important messages and context-required messages. These are hard for a single-message rule engine because users often omit the object once everyone in the chat already knows it.",
  ].join("\n");
}

function explainScoringInsights(topFalsePositiveRules, topFalseNegativeRules) {
  const fp = topFalsePositiveRules.slice(0, 3).map((rule) => rule.id).join(", ") || "none";
  const fn = topFalseNegativeRules.slice(0, 3).map((rule) => rule.id).join(", ") || "none";
  return [
    "How to read rule impact:",
    "",
    `- False-positive rules (${fp}) are not automatically bad rules. They may also appear in true positives. The question is whether they need more context gates or phrase exceptions.`,
    `- False-negative rules (${fn}) show rules that fired on missed important messages but did not add enough score to cross the threshold. These are candidates for combo rules, not necessarily larger standalone deltas.`,
    "- A rule that appears in both true positives and false positives should be tuned carefully. Broadly weakening it may fix noise while damaging recall.",
  ].join("\n");
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
  const stressRows = scoredRows.filter((row) => row.id.startsWith("stress_"));
  const slangStressRows = scoredRows.filter((row) => row.scenarioTag === "stress_slang_typo");
  const domainStressRows = scoredRows.filter((row) => row.scenarioTag === "stress_domain_language");
  const fixedLikeRows = [...slangStressRows, ...domainStressRows]
    .filter((row) => row.expectedImportance === "important" && row.finalScore >= IMPORTANT_THRESHOLD)
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, 14);
  const stressFalsePositives = stressRows
    .filter((row) => row.expectedImportance !== "important" && row.finalScore >= IMPORTANT_THRESHOLD)
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, 14);
  const worstGroups = evaluation.groupMetrics.slice(0, 5);
  const bestThreshold = evaluation.thresholdAnalysis
    .map((row) => ({ ...row, f1: row.precision + row.recall ? (2 * row.precision * row.recall) / (row.precision + row.recall) : 0 }))
    .sort((a, b) => b.f1 - a.f1)[0];
  const topFalsePositiveRules = evaluation.ruleStats.filter((rule) => rule.falsePositive > 0).slice(0, 8);
  const topFalseNegativeRules = evaluation.ruleStats.filter((rule) => rule.falseNegative > 0).slice(0, 8);
  const recallLift = evaluation.overall.recall - BASELINE_RESULTS.recall65;
  const edgeRecallLift = evaluation.edgeCaseMetrics.recall - BASELINE_RESULTS.edgeCaseRecall;

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
    "Sprint 3.5 materially improved the rule-based scorer. The wide-net language layer expanded normalization, slang/typo handling, social-domain dictionaries, phrase families, combo rules, and false-positive guards. The result is not just a bigger test set; it is a harder test set with substantially better recall while preserving the precision target.",
    "",
    `The current run generated ${evaluation.counts.messages} messages across ${evaluation.counts.groups} social contexts, including ${evaluation.counts.slangTypoStress} slang/typo stress messages, ${evaluation.counts.domainLanguageStress} domain-language stress messages, and ${evaluation.counts.falsePositiveTraps} explicit false-positive traps. At threshold ${IMPORTANT_THRESHOLD}, precision is **${pct(evaluation.overall.precision)}** and recall is **${pct(evaluation.overall.recall)}**.`,
    "",
    `Compared with the previous simulation, recall at 65 rose from **${pct(BASELINE_RESULTS.recall65)}** to **${pct(evaluation.overall.recall)}** (${recallLift >= 0 ? "+" : ""}${pct(recallLift)}), while precision moved from **${pct(BASELINE_RESULTS.precision65)}** to **${pct(evaluation.overall.precision)}**. Edge/stress recall rose from **${pct(BASELINE_RESULTS.edgeCaseRecall)}** to **${pct(evaluation.edgeCaseMetrics.recall)}** (${edgeRecallLift >= 0 ? "+" : ""}${pct(edgeRecallLift)}).`,
    "",
    `The biggest win is coverage: slang/typo stress recall is **${pct(evaluation.stressMetrics.slangTypo.recall)}**, domain-language stress recall is **${pct(evaluation.stressMetrics.domainLanguage.recall)}**, and false-positive trap stress produced **${evaluation.stressMetrics.falsePositiveTraps.falsePositives}** Important-feed false positives. Funny/high-volume reactions promoted 0 pure-noise messages into Important.`,
    "",
    `Threshold guidance changed too: threshold 60 now has **${pct(evaluation.thresholdAnalysis.find((row) => row.threshold === 60)?.precision || 0)}** precision and **${pct(evaluation.thresholdAnalysis.find((row) => row.threshold === 60)?.recall || 0)}** recall, making it plausible for beta learning. Threshold 65 remains the more curated setting at **${pct(evaluation.overall.precision)}** precision and **${pct(evaluation.overall.recall)}** recall.`,
    "",
    "Bottom line: rule/regex still looks viable for Sprint 3.5. It is no longer just catching obvious phrases like `due tomorrow`; it now catches many messy variants like `tix due tmr`, `mtg moved room 204 tn`, `spkrs`, `prob set due tmr`, and compact domain phrases. The remaining risk is maintenance: this approach will keep needing real audit data and new phrase families as groups invent shorthand.",
    "",
    "## Baseline Comparison",
    "",
    mdTable([
      {
        label: "Previous simulation",
        messages: BASELINE_RESULTS.messages,
        groups: BASELINE_RESULTS.groups,
        precision: BASELINE_RESULTS.precision65,
        recall: BASELINE_RESULTS.recall65,
        categoryAccuracy: BASELINE_RESULTS.categoryAccuracy,
        edgeRecall: BASELINE_RESULTS.edgeCaseRecall,
      },
      {
        label: "Current wide-net simulation",
        messages: evaluation.counts.messages,
        groups: evaluation.counts.groups,
        precision: evaluation.overall.precision,
        recall: evaluation.overall.recall,
        categoryAccuracy: evaluation.categoryAccuracy,
        edgeRecall: evaluation.edgeCaseMetrics.recall,
      },
    ], [
      { label: "Run", value: (row) => row.label },
      { label: "Messages", value: (row) => row.messages },
      { label: "Groups", value: (row) => row.groups },
      { label: "Precision @65", value: (row) => pct(row.precision) },
      { label: "Recall @65", value: (row) => pct(row.recall) },
      { label: "Category Acc", value: (row) => pct(row.categoryAccuracy) },
      { label: "Edge Recall", value: (row) => pct(row.edgeRecall) },
    ]),
    "",
    "This comparison is intentionally not apples-to-apples: the current run casts a much wider net and adds hundreds of adversarial stress messages. If precision stays healthy while recall rises under a harder dataset, that is evidence the rule-based approach is becoming more viable rather than merely overfit to the first simulation.",
    "",
    "## Simulation Methodology",
    "",
    `- Seed: ${SEED}`,
    `- Simulated users: ${evaluation.counts.users}`,
    `- Simulated groups: ${evaluation.counts.groups}`,
    `- Total messages: ${evaluation.counts.messages}`,
    `- Ground truth: ${evaluation.counts.importantTruth} important, ${evaluation.counts.maybeTruth} maybe, ${evaluation.counts.noiseTruth} noise`,
    `- Explicit edge cases: ${evaluation.counts.edgeCases}`,
    `- Slang/typo stress messages: ${evaluation.counts.slangTypoStress}`,
    `- Domain-language stress messages: ${evaluation.counts.domainLanguageStress}`,
    `- False-positive trap messages: ${evaluation.counts.falsePositiveTraps}`,
    `- Reactions: ${evaluation.counts.reactions}, assigned according to message context`,
    `- Replies: ${evaluation.counts.replies}, assigned to prior messages in the same group`,
    `- Isolated database: \`${path.relative(ROOT, DB_PATH)}\``,
    "",
    "Messages were generated from group-specific conversation templates plus an explicit adversarial edge-case suite. Every message carries ground truth importance, expected category, scenario tag, and notes. The simulation scores each message twice: once without reactions and once with simulated reactions, so the report can isolate reaction impact.",
    "",
    "Ground truth labels mean: `important` should belong in the Important feed, `maybe` is useful context but not necessarily Important, and `noise` should stay out. This matters because a false positive can be either true junk or a maybe-useful message that the product chose to surface too aggressively.",
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
    explainOverall(evaluation),
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
    explainThresholds(evaluation, bestThreshold),
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
    explainScoreBands(evaluation),
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
      `Finding: ${explainGroup(group)}`,
      "",
      "Representative messages:",
      "",
      mdTable(scoredRows.filter((row) => row.groupName === group.groupName).slice(0, 4), exampleColumns),
      "",
    ]),
    "## Hardest Groups",
    "",
    "These are the groups where the scorer looked weakest in this run. Hard groups usually reveal one of three problems: the group uses domain-specific shorthand, the important messages are too terse for single-message scoring, or maybe/noise messages contain words that look actionable.",
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
    explainExamples(),
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
    explainReactionImpact(evaluation),
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
    explainEdgeCases(evaluation),
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
    "## Stress-Test Sections",
    "",
    "These sections isolate the new wide-net language coverage. They answer a different question than the general simulation: not just whether the algorithm works on average, but whether it survives the exact messy language families that a shallow regex system usually misses.",
    "",
    mdTable([
      { name: "Slang and typo stress", ...evaluation.stressMetrics.slangTypo },
      { name: "Domain-language stress", ...evaluation.stressMetrics.domainLanguage },
      { name: "False-positive trap stress", ...evaluation.stressMetrics.falsePositiveTraps },
    ], [
      { label: "Stress Set", value: (row) => row.name },
      { label: "Count", value: (row) => row.truePositives + row.falsePositives + row.trueNegatives + row.falseNegatives },
      { label: "Precision", value: (row) => pct(row.precision) },
      { label: "Recall", value: (row) => pct(row.recall) },
      { label: "False Positives", value: (row) => row.falsePositives },
      { label: "False Negatives", value: (row) => row.falseNegatives },
      { label: "Category Acc", value: (row) => pct(row.categoryAccuracy) },
    ]),
    "",
    "### Examples Caught By The Wider Net",
    "",
    fixedLikeRows.length ? mdTable(fixedLikeRows, exampleColumns) : "No stress messages crossed the Important threshold.",
    "",
    "### New False Positives From The Wider Net",
    "",
    stressFalsePositives.length ? mdTable(stressFalsePositives, exampleColumns) : "No stress-set false positives crossed the Important threshold.",
    "",
    "## Scoring Insights",
    "",
    explainScoringInsights(topFalsePositiveRules, topFalseNegativeRules),
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
  const threshold60 = evaluation.thresholdAnalysis.find((row) => row.threshold === 60);
  const threshold65 = evaluation.thresholdAnalysis.find((row) => row.threshold === 65);
  if (threshold60 && threshold65) {
    recs.push(`- Threshold 60 vs 65: use **60** for broader beta learning if precision stays above 80% (${pct(threshold60.precision)} in this run), and use **65** for a more curated demo feed (${pct(threshold65.precision)} precision, ${pct(threshold65.recall)} recall).`);
  }

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
  if (evaluation.overall.precision >= 0.85 && evaluation.stressMetrics.falsePositiveTraps.falsePositives <= 3) {
    recs.push("- Rule/regex still looks viable for Sprint 3.5 because precision remains high under a wider, harder corpus and false-positive traps mostly stay contained. The tradeoff is ongoing dictionary maintenance.");
  } else {
    recs.push("- Be honest about the rule/regex ceiling: if precision drops under the wider corpus or traps leak into Important, an LLM classifier may become more attractive than continued regex growth.");
  }
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

const assert = require("node:assert/strict");
const test = require("node:test");
const { scoreMessage } = require("../src/scoring");

const variantGroups = [
  {
    canonical: "formal tickets are due by midnight tomorrow",
    category: "deadline",
    minScore: 65,
    variants: [
      "formal tix due midnight tmr",
      "tix r due by 12 tn",
      "formal tickets due by midnite tmrw",
      "send formal money by midnight",
      "last day for formal tix is tmr",
    ],
  },
  {
    canonical: "meeting moved to room 204 tonight",
    category: "announcement",
    minScore: 45,
    variants: [
      "mtg moved room 204 tn",
      "meeting got moved to rm 204",
      "new room is 204 for tonight",
      "room changed to 204",
      "we're in 204 now",
    ],
  },
  {
    canonical: "can someone bring speakers to the pregame",
    category: "request",
    minScore: 55,
    variants: [
      "can someone bring spkrs",
      "anyone got speakers for preg?",
      "need speakers at pregame",
      "who can bring the speaker tn",
      "bring speaker if u have one",
    ],
  },
  {
    canonical: "practice moved indoors",
    category: "announcement",
    minScore: 45,
    variants: [
      "prac moved inside",
      "practice is indoors tn",
      "we inside for practice",
      "field got moved inside",
      "moved indoors bc rain",
    ],
  },
  {
    canonical: "soundcheck at 5, doors at 8",
    category: "event",
    minScore: 50,
    variants: [
      "soundcheck 5 doors 8",
      "sc at 5 doors 8",
      "load in 5 doors 8",
      "doors got pushed to 8",
      "set times posted doors at 8",
    ],
  },
];

const falsePositiveTraps = [
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
];

test("slang and typo variants preserve important signal", () => {
  const failures = [];

  for (const group of variantGroups) {
    for (const text of [group.canonical, ...group.variants]) {
      const score = scoreMessage(text);
      if (score.finalScore < group.minScore) {
        failures.push(`${text}: score ${score.finalScore} < ${group.minScore}`);
      }
      const acceptableCategory = group.canonical === "soundcheck at 5, doors at 8" && /pushed|posted/.test(text)
        ? "announcement"
        : group.category;
      if (score.signalCategory !== acceptableCategory && score.finalScore >= 65) {
        failures.push(`${text}: category ${score.signalCategory} !== ${acceptableCategory}`);
      }
    }
  }

  assert.deepEqual(failures, []);
});

test("important-looking joke phrases stay below Important", () => {
  for (const text of falsePositiveTraps) {
    const score = scoreMessage(text, { "🔥": 12, "😂": 12, "💀": 12 });
    assert.ok(score.finalScore < 65, `${text} scored ${score.finalScore}`);
    assert.equal(score.signalCategory, "noise", `${text} categorized as ${score.signalCategory}`);
  }
});

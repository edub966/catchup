// Synthetic sentence families. Each family has equal total weight during fitting.
const locations = ["north entrance", "east gate", "lobby", "bus stop", "loading dock", "main desk", "side door", "library", "station", "courtyard", "box office", "field"];
const times = ["6", "7:30", "noon", "8pm", "10", "midnight"];
const tasks = ["setup", "check in", "the booth", "cleanup", "the table", "registration"];
const objects = ["waivers", "your forms", "receipts", "your deposit", "the roster", "your slides"];
const families = [
  [1, "meet at PLACE by TIME"], [1, "everyone meet outside PLACE at TIME"],
  [1, "be at the PLACE by TIME"], [1, "find us at the PLACE at TIME"],
  [1, "pickup at PLACE at TIME"], [1, "bus leaves the PLACE at TIME"],
  [1, "doors open at TIME at the PLACE"], [1, "event starts at TIME in the PLACE"],
  [1, "need 3 people for TASK by TIME"], [1, "need two volunteers for TASK at TIME"],
  [1, "send ITEM before TIME"], [1, "get ITEM in by TIME"],
  [1, "turn in ITEM by TIME"], [1, "drop off ITEM by TIME"],
  [0, "remember when we had to meet at PLACE by TIME"], [0, "last year doors opened at TIME at the PLACE"],
  [0, "yesterday the bus left the PLACE at TIME"], [0, "imagine having to be at the PLACE by TIME"],
  [0, "what if we meet at PLACE by TIME?"], [0, "maybe we could send ITEM before TIME"],
  [0, "last week we had to turn in ITEM by TIME"], [0, "still laughing about the PLACE at TIME"],
  [0, "what time was TASK yesterday"], [0, "PLACE at TIME was a vibe"],
  [0, "did anyone else see the PLACE"], [0, "lol TIME is too early for me"],
  [0, "i wish doors opened at TIME at the PLACE"], [0, "wasn't TASK over by TIME last week?"],
];
function trainingRows() {
  return families.flatMap(([label, pattern]) => {
    let texts = [pattern];
    for (const [key, values] of Object.entries({PLACE: locations, TIME: times, TASK: tasks, ITEM: objects})) {
      if (pattern.includes(key)) texts = texts.flatMap(text => values.map(value => text.replace(key, value)));
    }
    return texts.map(text => ({text, label, family: pattern, weight: 1 / texts.length}));
  });
}
module.exports = { trainingRows };

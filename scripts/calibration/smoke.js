// Run against a disposable local server; this creates a message and an audit.
const assert = require("node:assert/strict");
const {io} = require("socket.io-client");
const {scoreMessage} = require("../../src/scoring");
const url = "http://localhost:5501";
const socket = io(url, {autoConnect: false, reconnection: false});
const deadline = setTimeout(() => { throw Error("Chat round trip timed out"); }, 10000);
function next(event) {
  return new Promise(resolve => socket.once(event, resolve));
}
async function check() {
  const connected = next("connect");
  socket.connect();
  await connected;
  const joined = next("room:state");
  socket.emit("group:join", {username: "CI reviewer", inviteCode: "KETCHUP"});
  await joined;
  const text = "bring white and dark jerseys";
  const posted = next("message:new");
  socket.emit("message:send", {text});
  const {message, important} = await posted;
  assert.ok(important);
  assert.ok(message.matchedRules.some(rule => rule.id === "rank.template-model"));
  assert.equal(message.signalScore, scoreMessage(text).finalScore);

  const changed = next("message:updated");
  socket.emit("reaction:toggle", {messageId: message.id, reaction: "📌"});
  const updated = await changed;
  assert.equal(updated.message.signalScore, scoreMessage(text, {pin: 1}).finalScore);
  const saved = await fetch(url + "/api/audit/messages/" + message.id, {
    method: "POST", headers: {"content-type": "application/json"},
    body: JSON.stringify({manualRating: "important", notes: "jersey instruction"}),
  });
  assert.equal(saved.status, 200);
  const audit = await (await fetch(url + "/api/audit/messages")).json();
  const row = audit.find(row => row.id === message.id);
  assert.equal(row.notes, "jersey instruction");
  assert.equal(row.manual_rating, "important");
  assert.equal(row.reaction_counts["📌"], 1);
}
check().finally(() => {
  clearTimeout(deadline);
  socket.close();
});

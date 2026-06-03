const { io } = require("socket.io-client");

const socket = io("http://localhost:5501", {
  transports: ["websocket"],
  reconnection: false,
});

let messageId = null;
let sawUpdate = false;

function done(error) {
  socket.close();
  if (error) {
    console.error(error.message || error);
    process.exit(1);
  }
  process.exit(0);
}

socket.on("connect", () => {
  socket.emit("group:join", { username: "Erik", inviteCode: "LYD73F" });
});

socket.on("room:state", () => {
  socket.emit("message:send", { text: "need 2 drivers tonight" });
});

socket.on("message:new", ({ message }) => {
  if (message.text !== "need 2 drivers tonight") return;
  messageId = message.id;
  socket.emit("reaction:toggle", { messageId, reaction: "\u{1F4CC}" });
});

socket.on("message:updated", ({ message }) => {
  if (!message || message.id !== messageId) return;
  sawUpdate = true;
  console.log(JSON.stringify({
    id: message.id,
    score: message.signalScore,
    reactionBoost: message.reactionBoost,
    reactions: message.reactions,
  }));
  done();
});

socket.on("connect_error", done);
socket.on("join:error", (message) => done(new Error(message)));

setTimeout(() => {
  if (!sawUpdate) done(new Error("Timed out waiting for reaction update"));
}, 6000);

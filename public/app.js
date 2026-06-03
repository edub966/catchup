const socket = io();

const state = {
  user: null,
  group: null,
  messages: [],
  important: [],
  catchup: null,
  online: [],
  activeTab: "chat",
  typingUsers: new Map(),
};

const els = {
  entryPanel: document.querySelector("#entryPanel"),
  entryForm: document.querySelector("#entryForm"),
  usernameInput: document.querySelector("#usernameInput"),
  homeGroups: document.querySelector("#homeGroups"),
  homeGroupsHint: document.querySelector("#homeGroupsHint"),
  homeGroupsList: document.querySelector("#homeGroupsList"),
  refreshGroups: document.querySelector("#refreshGroups"),
  inviteInput: document.querySelector("#inviteInput"),
  groupInput: document.querySelector("#groupInput"),
  workspace: document.querySelector("#workspace"),
  groupName: document.querySelector("#groupName"),
  inviteCode: document.querySelector("#inviteCode"),
  scoreHint: document.querySelector("#scoreHint"),
  catchupBanner: document.querySelector("#catchupBanner"),
  catchupTitle: document.querySelector("#catchupTitle"),
  openCatchup: document.querySelector("#openCatchup"),
  chatView: document.querySelector("#chatView"),
  catchupView: document.querySelector("#catchupView"),
  importantView: document.querySelector("#importantView"),
  catchupHeading: document.querySelector("#catchupHeading"),
  catchupList: document.querySelector("#catchupList"),
  importantList: document.querySelector("#importantList"),
  catchupFeedback: document.querySelector("#catchupFeedback"),
  messages: document.querySelector("#messages"),
  messageForm: document.querySelector("#messageForm"),
  messageInput: document.querySelector("#messageInput"),
  typing: document.querySelector("#typing"),
  navButtons: document.querySelectorAll(".bottom-nav button"),
  onlineButton: document.querySelector("#onlineButton"),
  onlineCount: document.querySelector("#onlineCount"),
  onlineDrawer: document.querySelector("#onlineDrawer"),
  onlineList: document.querySelector("#onlineList"),
  closeOnline: document.querySelector("#closeOnline"),
  presenceFeed: document.querySelector("#presenceFeed"),
};

const quickReactions = ["\u{1F4CC}", "\u{2705}", "\u{1F440}", "\u{1F525}", "\u{1F602}", "\u{1F480}"];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat([], {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatDuration(from, to) {
  if (!from) return "a bit";
  const diff = Math.max(0, new Date(to).getTime() - new Date(from).getTime());
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${hours} hr`;
  return `${Math.round(hours / 24)} days`;
}

function formatGroupActivity(group) {
  if (!group.lastMessageAt) return "No messages yet";
  return `${group.messageCount} messages · last ${formatTime(group.lastMessageAt)}`;
}

function scoreLabel(message) {
  if (message.signalScore >= 85) return "High signal";
  if (message.signalScore >= 65) return "Worth catching";
  if (message.signalScore >= 45) return "Maybe useful";
  return "";
}

function categoryLabel(category) {
  const labels = {
    plan: "Plan",
    event: "Event",
    request: "Request",
    deadline: "Deadline",
    announcement: "Announcement",
    question: "Question",
    logistics: "Logistics",
    noise: "Noise",
  };
  return labels[category] || category;
}

function getMessage(messageId) {
  return state.messages.find((message) => message.id === messageId);
}

function upsertMessage(message) {
  const index = state.messages.findIndex((item) => item.id === message.id);
  if (index >= 0) state.messages[index] = message;
  else state.messages.push(message);
}

function sortImportant(messages) {
  return [...messages]
    .filter((message) => message.signalScore >= 65)
    .sort((a, b) => b.signalScore - a.signalScore || new Date(b.createdAt) - new Date(a.createdAt));
}

function renderMessages() {
  if (!state.messages.length) {
    els.messages.innerHTML = `
      <div class="empty-state">
        <strong>No noise yet.</strong>
        <span>Try "Need 3 drivers tonight" or "formal tickets due Friday".</span>
      </div>
    `;
    return;
  }

  els.messages.innerHTML = state.messages.map((message) => {
    const mine = message.userId === state.user?.id;
    const reactions = Object.entries(message.reactions || {})
      .filter(([, count]) => count > 0)
      .map(([reaction, count]) => `<button class="reaction-count" type="button" data-message-id="${message.id}" data-reaction="${reaction}">${reaction} ${count}</button>`)
      .join("");
    const quick = quickReactions
      .map((reaction) => `<button type="button" data-message-id="${message.id}" data-reaction="${reaction}">${reaction}</button>`)
      .join("");
    const label = scoreLabel(message);

    return `
      <article class="message ${mine ? "mine" : ""}" id="message-${message.id}">
        <div class="message-meta">
          <strong>${escapeHtml(message.username)}</strong>
          <span>${formatTime(message.createdAt)}</span>
        </div>
        <div class="bubble">${escapeHtml(message.text)}</div>
        ${label ? `<div class="quiet-score">${label} · ${message.signalScore}</div>` : ""}
        <div class="reaction-row">${reactions}</div>
        <div class="quick-row">${quick}</div>
      </article>
    `;
  }).join("");

  els.messages.scrollTop = els.messages.scrollHeight;
}

function renderFeed(target, messages, emptyTitle, emptyBody) {
  if (!messages.length) {
    target.innerHTML = `
      <div class="empty-state">
        <strong>${emptyTitle}</strong>
        <span>${emptyBody}</span>
      </div>
    `;
    return;
  }

  target.innerHTML = messages.map((message) => `
    <article class="signal-card">
      <button type="button" data-jump="${message.id}">
        <div class="signal-top">
          <span>${categoryLabel(message.signalCategory)}</span>
          <strong>${message.signalScore}</strong>
        </div>
        <p>${escapeHtml(message.text)}</p>
        <div class="signal-bottom">
          <span>${escapeHtml(message.username)} · ${formatTime(message.createdAt)}</span>
          <span>${message.interactionCount} interactions</span>
        </div>
      </button>
      <div class="matched-rules">
        ${message.matchedRules.slice(0, 4).map((rule) => `<span>${escapeHtml(rule.id)}</span>`).join("")}
      </div>
    </article>
  `).join("");
}

function renderImportant() {
  renderFeed(
    els.importantList,
    state.important,
    "No important messages yet.",
    "High-scoring messages will collect here without turning chat into homework."
  );
}

function renderCatchup() {
  const catchup = state.catchup;
  const items = catchup?.items || [];
  const hadPreviousSeen = Boolean(catchup?.fromSeenAt);

  if (!hadPreviousSeen) {
    els.catchupHeading.textContent = "Welcome in. Catch-up starts after your next visit.";
    els.catchupBanner.classList.add("hidden");
  } else if (items.length) {
    els.catchupHeading.textContent = `You were gone for ${formatDuration(catchup.fromSeenAt, catchup.toSeenAt)}. Here’s what mattered.`;
    els.catchupTitle.textContent = `${items.length} things mattered while you were away.`;
    els.catchupBanner.classList.remove("hidden");
  } else {
    els.catchupHeading.textContent = `You were gone for ${formatDuration(catchup.fromSeenAt, catchup.toSeenAt)}. Nothing major surfaced.`;
    els.catchupBanner.classList.add("hidden");
  }

  renderFeed(
    els.catchupList,
    items,
    "Nothing big to catch up on.",
    "That’s a good thing. The noise stayed noise."
  );

  els.catchupFeedback.classList.toggle("hidden", !hadPreviousSeen || !items.length);
}

function renderUsers() {
  els.onlineCount.textContent = state.online.length;
  els.onlineList.innerHTML = state.online.map((user) => `
    <div class="online-user">
      <span style="background:${user.color}"></span>
      <strong>${escapeHtml(user.username)}</strong>
    </div>
  `).join("");
}

function renderTyping() {
  const names = Array.from(state.typingUsers.keys()).filter((name) => name !== state.user?.username);
  els.typing.textContent = names.length ? `${names.join(", ")} typing...` : "";
}

function renderAll() {
  renderMessages();
  renderImportant();
  renderCatchup();
  renderUsers();
}

async function loadHomeGroups() {
  const username = els.usernameInput.value.trim();
  if (!username) {
    els.homeGroupsHint.textContent = "Enter your name to load saved chats.";
    els.homeGroupsList.innerHTML = "";
    return;
  }

  els.homeGroupsHint.textContent = "Looking for your saved chats...";
  const response = await fetch(`/api/users/${encodeURIComponent(username)}/groups`);
  const groups = await response.json();
  els.homeGroupsHint.textContent = groups.length
    ? `${groups.length} saved chat${groups.length === 1 ? "" : "s"}`
    : "No saved chats for this name yet. Join or create one below.";
  els.homeGroupsList.innerHTML = groups.map((group) => `
    <button class="home-group" type="button" data-invite-code="${group.inviteCode}">
      <span>
        <strong>${escapeHtml(group.name)}</strong>
        <small>${escapeHtml(formatGroupActivity(group))}</small>
      </span>
      <em>${escapeHtml(group.inviteCode)}</em>
    </button>
  `).join("");
}

function setTab(tab) {
  state.activeTab = tab;
  els.navButtons.forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
  els.chatView.classList.toggle("active", tab === "chat");
  els.catchupView.classList.toggle("active", tab === "catchup");
  els.importantView.classList.toggle("active", tab === "important");
}

function jumpToMessage(messageId) {
  setTab("chat");
  requestAnimationFrame(() => {
    const target = document.querySelector(`#message-${messageId}`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.animate(
      [
        { transform: "scale(1)", filter: "brightness(1)" },
        { transform: "scale(1.025)", filter: "brightness(1.15)" },
        { transform: "scale(1)", filter: "brightness(1)" },
      ],
      { duration: 800, easing: "ease-out" }
    );
  });
}

function showPresence(text) {
  const toast = document.createElement("div");
  toast.className = "presence-toast";
  toast.textContent = text;
  els.presenceFeed.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

function enterApp(payload) {
  state.user = payload.user;
  state.group = payload.group;
  state.messages = payload.messages;
  state.important = payload.important;
  state.catchup = payload.catchup;
  state.online = payload.online;
  localStorage.setItem("catchup:lastUsername", payload.user.username);

  els.entryPanel.classList.add("hidden");
  els.workspace.classList.remove("hidden");
  els.groupName.textContent = payload.group.name;
  els.inviteCode.textContent = `Invite: ${payload.group.inviteCode}`;
  els.scoreHint.textContent = `${payload.important.length} high-signal messages`;
  renderAll();
  els.messageInput.focus();
}

els.entryForm.addEventListener("click", (event) => {
  const button = event.target.closest("button[type='submit']");
  if (!button) return;
  els.entryForm.dataset.mode = button.dataset.mode;
});

els.entryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = els.usernameInput.value.trim();
  if (!username) return;

  if (els.entryForm.dataset.mode === "create") {
    socket.emit("group:create", {
      username,
      groupName: els.groupInput.value.trim() || `${username}'s Group`,
    });
    return;
  }

  socket.emit("group:join", {
    username,
    inviteCode: els.inviteInput.value.trim() || "KETCHUP",
  });
});

els.messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = els.messageInput.value.trim();
  if (!text) return;
  socket.emit("message:send", { text });
  socket.emit("typing", { isTyping: false });
  els.messageInput.value = "";
});

let typingTimer = null;
let homeGroupsTimer = null;
els.usernameInput.addEventListener("input", () => {
  clearTimeout(homeGroupsTimer);
  homeGroupsTimer = setTimeout(loadHomeGroups, 250);
});

els.refreshGroups.addEventListener("click", loadHomeGroups);

els.homeGroupsList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-invite-code]");
  if (!button) return;
  if (!els.usernameInput.value.trim()) return;
  els.inviteInput.value = button.dataset.inviteCode;
  socket.emit("group:join", {
    username: els.usernameInput.value.trim(),
    inviteCode: button.dataset.inviteCode,
  });
});

els.messageInput.addEventListener("input", () => {
  socket.emit("typing", { isTyping: els.messageInput.value.trim().length > 0 });
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => socket.emit("typing", { isTyping: false }), 1200);
});

els.messages.addEventListener("click", (event) => {
  const button = event.target.closest("[data-reaction]");
  if (!button) return;
  socket.emit("reaction:toggle", {
    messageId: button.dataset.messageId,
    reaction: button.dataset.reaction,
  });
});

document.querySelectorAll(".feed").forEach((feed) => {
  feed.addEventListener("click", (event) => {
    const button = event.target.closest("[data-jump]");
    if (!button) return;
    jumpToMessage(button.dataset.jump);
  });
});

els.navButtons.forEach((button) => {
  button.addEventListener("click", () => setTab(button.dataset.tab));
});

els.openCatchup.addEventListener("click", () => setTab("catchup"));

els.catchupFeedback.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-rating]");
  if (!button || !state.catchup?.id) return;
  await fetch(`/api/catchup/${state.catchup.id}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating: button.dataset.rating }),
  });
  els.catchupFeedback.innerHTML = "<p>Saved. That feedback trains the product loop.</p>";
});

els.onlineButton.addEventListener("click", () => els.onlineDrawer.classList.add("open"));
els.closeOnline.addEventListener("click", () => els.onlineDrawer.classList.remove("open"));

socket.on("room:state", enterApp);

socket.on("join:error", (message) => {
  alert(message);
});

socket.on("server:error", ({ message }) => {
  showPresence(message || "Server error logged.");
});

socket.on("users:update", (users) => {
  state.online = users;
  renderUsers();
});

socket.on("message:new", ({ message }) => {
  upsertMessage(message);
  state.important = sortImportant([...state.important, message]);
  els.scoreHint.textContent = `${state.important.length} high-signal messages`;
  renderMessages();
  renderImportant();
});

socket.on("message:updated", ({ message, important }) => {
  upsertMessage(message);
  state.important = important;
  els.scoreHint.textContent = `${state.important.length} high-signal messages`;
  renderMessages();
  renderImportant();
});

socket.on("typing", ({ username, isTyping }) => {
  if (isTyping) state.typingUsers.set(username, Date.now());
  else state.typingUsers.delete(username);
  renderTyping();
});

socket.on("presence", showPresence);

setInterval(() => {
  const now = Date.now();
  state.typingUsers.forEach((timestamp, username) => {
    if (now - timestamp > 1800) state.typingUsers.delete(username);
  });
  renderTyping();
}, 900);

const lastUsername = localStorage.getItem("catchup:lastUsername");
if (lastUsername) {
  els.usernameInput.value = lastUsername;
  loadHomeGroups();
}

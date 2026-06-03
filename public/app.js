const socket = io();

const AUTH_STORAGE_KEY = "catchup:demoUser";
const LEGACY_USERNAME_KEY = "catchup:lastUsername";

const emojiPalette = [
  "\u{1F434}", "\u{1F40E}", "\u{1F3C7}", "\u{1F3A0}", "\u{1F984}", "\u{1FACF}",
  "\u{1F44D}", "\u{2764}\u{FE0F}", "\u{1F602}", "\u{1F62E}", "\u{1F44F}", "\u{1F525}",
  "\u{1F440}", "\u{1F4CC}", "\u{2705}", "\u{2753}", "\u{1F64F}", "\u{1F62D}",
  "\u{1F914}", "\u{1F634}", "\u{1F633}", "\u{1F641}", "\u{1F60E}", "\u{1F4AF}",
  "\u{1F680}", "\u{26A0}\u{FE0F}", "\u{23F0}", "\u{1F4B8}", "\u{1F3AB}", "\u{1F697}",
  "\u{1F355}", "\u{1F37B}", "\u{1F389}", "\u{1F4AC}", "\u{1F6A8}", "\u{1F480}"
];

const state = {
  currentUser: null,
  isAuthenticated: false,
  authMode: "signin",
  groups: [],
  activeGroupId: null,
  groupMode: "join",
  group: null,
  messages: [],
  important: [],
  catchup: null,
  online: [],
  onlineCountsByGroup: new Map(),
  activeTab: "chat",
  selectedMessageId: null,
  reactionMenuMessageId: null,
  replyTo: null,
  typingUsers: new Map(),
};

const els = {
  authLanding: document.querySelector("#authLanding"),
  authForm: document.querySelector("#authForm"),
  authTabs: document.querySelectorAll("[data-auth-mode]"),
  authHint: document.querySelector("#authHint"),
  authSubmit: document.querySelector("#authSubmit"),
  usernameInput: document.querySelector("#usernameInput"),
  homeDashboard: document.querySelector("#homeDashboard"),
  homeEyebrow: document.querySelector("#homeEyebrow"),
  homeGroupsHint: document.querySelector("#homeGroupsHint"),
  homeGroupsList: document.querySelector("#homeGroupsList"),
  openNewGroup: document.querySelector("#openNewGroup"),
  newGroupSheet: document.querySelector("#newGroupSheet"),
  newGroupForm: document.querySelector("#newGroupForm"),
  newGroupModeButtons: document.querySelectorAll("[data-group-mode]"),
  newGroupSubmit: document.querySelector("#newGroupSubmit"),
  newGroupStatus: document.querySelector("#newGroupStatus"),
  inviteField: document.querySelector("#inviteField"),
  groupField: document.querySelector("#groupField"),
  closeNewGroup: document.querySelector("#closeNewGroup"),
  closeNewGroupScrim: document.querySelector("#closeNewGroupScrim"),
  inviteInput: document.querySelector("#inviteInput"),
  groupInput: document.querySelector("#groupInput"),
  workspace: document.querySelector("#workspace"),
  topEyebrow: document.querySelector("#topEyebrow"),
  groupName: document.querySelector("#groupName"),
  backHome: document.querySelector("#backHome"),
  logoutButton: document.querySelector("#logoutButton"),
  inviteCode: document.querySelector("#inviteCode"),
  inviteCodeValue: document.querySelector("#inviteCodeValue"),
  chatMenuButton: document.querySelector("#chatMenuButton"),
  chatMenu: document.querySelector("#chatMenu"),
  closeChatMenu: document.querySelector("#closeChatMenu"),
  closeChatMenuScrim: document.querySelector("#closeChatMenuScrim"),
  chatHeads: document.querySelector("#chatHeads"),
  chatNowLabel: document.querySelector("#chatNowLabel"),
  copyInvite: document.querySelector("#copyInvite"),
  shareInvite: document.querySelector("#shareInvite"),
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
  replyComposer: document.querySelector("#replyComposer"),
  replyComposerName: document.querySelector("#replyComposerName"),
  replyComposerText: document.querySelector("#replyComposerText"),
  cancelReply: document.querySelector("#cancelReply"),
  typing: document.querySelector("#typing"),
  navButtons: document.querySelectorAll(".bottom-nav button"),
  onlineDrawer: document.querySelector("#onlineDrawer"),
  onlineList: document.querySelector("#onlineList"),
  closeOnline: document.querySelector("#closeOnline"),
  presenceFeed: document.querySelector("#presenceFeed"),
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(timestamp) {
  if (!timestamp) return "No messages yet";
  return new Intl.DateTimeFormat([], {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatMessageTime(timestamp) {
  const then = new Date(timestamp);
  const seconds = Math.floor((Date.now() - then.getTime()) / 1000);
  if (seconds < 45) return "just now";
  if (seconds < 3600) {
    const minutes = Math.max(1, Math.floor(seconds / 60));
    return `${minutes} min ago`;
  }
  return formatTime(timestamp);
}

function formatDateDivider(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return new Intl.DateTimeFormat([], {
    month: "short",
    day: "numeric",
  }).format(date);
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

function getReadableTag(tag) {
  const labels = {
    "request.need": "Needs action",
    "request.someone": "Needs someone",
    "date.relative": "Time-sensitive",
    "date.weekday": "Scheduled",
    "date.numeric": "Date mentioned",
    "logistics.ride": "Ride/logistics",
    "logistics.bring": "Bring something",
    "deadline.due": "Deadline",
    "question.plan": "Planning question",
    "plan.whos-going": "Who's going",
    "plan.anyone": "Planning",
    "money.payment": "Payment",
    "urgent.help": "Urgent help",
    "event.social": "Event",
    "announcement.moved": "Changed plan",
    tickets: "Tickets/payment",
    time: "Time mentioned",
    question: "Question",
  };

  if (labels[tag]) return labels[tag];
  return String(tag || "")
    .replaceAll(".", " ")
    .replaceAll("-", " ")
    .trim()
    .replace(/^\w/, (letter) => letter.toUpperCase());
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
  return labels[category] || getReadableTag(category);
}

function getSignalStatus(score) {
  if (score >= 85) return "High signal";
  if (score >= 65) return "Worth catching";
  if (score >= 45) return "Maybe useful";
  return "";
}

function getGroupStatus(group) {
  const highSignal = Number(group.highSignalCount || 0);
  const unread = Number(group.messageCount || 0);
  if (highSignal >= 3 || unread >= 20) return 0;
  if (unread >= 10) return 1;
  if (highSignal > 0 || unread >= 3) return 2;
  return 3;
}

function getGroupPreview(group) {
  if (group.importantPreview) return group.importantPreview;
  if (Number(group.totalMessageCount || 0) > 0) return "Recent messages";
  return "";
}

function groupPriority(group) {
  return getGroupStatus(group);
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

function showScreen(screen) {
  els.authLanding.classList.toggle("hidden", screen !== "auth");
  els.homeDashboard.classList.toggle("hidden", screen !== "home");
  els.workspace.classList.toggle("hidden", screen !== "group");
  els.backHome.classList.toggle("hidden", screen !== "group");
  els.chatMenuButton.classList.toggle("hidden", screen !== "group");
  els.logoutButton.classList.toggle("hidden", !state.isAuthenticated || screen === "group");

  if (screen === "auth") {
    els.topEyebrow.textContent = "CatchUp";
    els.groupName.textContent = "Group chat that survives itself.";
  } else if (screen === "home") {
    els.topEyebrow.textContent = state.currentUser?.username || "CatchUp";
    els.groupName.textContent = "Your groups";
  } else if (state.group) {
    els.topEyebrow.textContent = "Live group";
    els.groupName.textContent = state.group.name;
  }
}

function setAuthMode(mode) {
  state.authMode = mode;
  els.authTabs.forEach((button) => button.classList.toggle("active", button.dataset.authMode === mode));
  const copy = {
    signin: ["Continue", "Frontend demo sign-in. Real auth API hooks belong here later."],
    register: ["Create account", "This creates a local demo session only."],
    demo: ["Continue demo", "No password, no fake security. Just enough session shape for design."],
  };
  els.authSubmit.textContent = copy[mode][0];
  els.authHint.textContent = copy[mode][1];
}

function saveDemoSession(username) {
  const user = {
    id: `demo:${username.toLowerCase()}`,
    username,
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  localStorage.setItem(LEGACY_USERNAME_KEY, username);
  state.currentUser = user;
  state.isAuthenticated = true;
}

function readDemoSession() {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  const legacyUsername = localStorage.getItem(LEGACY_USERNAME_KEY);
  return legacyUsername ? { id: `demo:${legacyUsername.toLowerCase()}`, username: legacyUsername } : null;
}

async function loadHomeGroups() {
  if (!state.currentUser?.username) return;

  els.homeGroupsHint.textContent = "Loading groups...";
  const response = await fetch(`/api/users/${encodeURIComponent(state.currentUser.username)}/groups`);
  state.groups = await response.json();
  renderHomeDashboard();
}

function renderHomeDashboard() {
  els.homeEyebrow.textContent = `Hey, ${state.currentUser.username}`;

  if (!state.groups.length) {
    els.homeGroupsHint.textContent = "No groups yet.";
    els.homeGroupsList.innerHTML = `
      <div class="empty-state compact-empty">
        <strong>No groups yet.</strong>
        <span>Create one or join with a code to start catching the signal.</span>
      </div>
    `;
    return;
  }

  const sorted = [...state.groups].sort((a, b) => {
    return groupPriority(a) - groupPriority(b) || new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt);
  });
  els.homeGroupsHint.textContent = `${sorted.length} group${sorted.length === 1 ? "" : "s"}`;

  els.homeGroupsList.innerHTML = sorted.map((group) => {
    const unread = Number(group.messageCount || 0);
    const preview = getGroupPreview(group);
    const onlineCount = state.onlineCountsByGroup.get(group.id) || 0;
    const onlineText = onlineCount
      ? ` - ${onlineCount} in chat`
      : "";
    return `
      <button class="group-row" type="button" data-invite-code="${escapeHtml(group.inviteCode)}">
        <div class="group-card-top">
          <div>
            <strong>${escapeHtml(group.name)}</strong>
            <small>${unread} message${unread === 1 ? "" : "s"} - last ${formatTime(group.lastMessageAt)}${onlineText}</small>
          </div>
          <small class="invite-meta">${escapeHtml(group.inviteCode)}</small>
        </div>
        ${preview ? `<p>${escapeHtml(preview)}</p>` : ""}
      </button>
    `;
  }).join("");
}

function openNewGroupSheet(mode = "join") {
  setGroupMode(mode);
  els.newGroupStatus.textContent = "";
  els.newGroupSheet.classList.remove("hidden");
  requestAnimationFrame(() => els.newGroupSheet.classList.add("open"));
  const input = mode === "join" ? els.inviteInput : els.groupInput;
  input.focus();
}

function closeNewGroupSheet() {
  els.newGroupSheet.classList.remove("open");
  setTimeout(() => els.newGroupSheet.classList.add("hidden"), 170);
}

function setGroupMode(mode) {
  state.groupMode = mode;
  els.newGroupModeButtons.forEach((button) => button.classList.toggle("active", button.dataset.groupMode === mode));
  els.inviteField.classList.toggle("hidden", mode !== "join");
  els.groupField.classList.toggle("hidden", mode !== "create");
  els.newGroupSubmit.textContent = mode === "join" ? "Join group" : "Create group";
}

function renderMessages(options = {}) {
  const shouldStickToBottom = options.stickToBottom !== false;
  const previousScrollTop = els.messages.scrollTop;
  if (!state.messages.length) {
    els.messages.innerHTML = `
      <div class="empty-state">
        <strong>No noise yet.</strong>
        <span>Try "Need 3 drivers tonight" or "formal tickets due Friday".</span>
      </div>
    `;
    return;
  }

  let lastDay = "";
  els.messages.innerHTML = state.messages.map((message) => {
    const mine = message.userId === state.user?.id || message.userId === state.currentUser?.id;
    const selected = state.selectedMessageId === message.id;
    const day = new Date(message.createdAt).toDateString();
    const divider = day !== lastDay
      ? `<div class="date-divider">${formatDateDivider(message.createdAt)}</div>`
      : "";
    lastDay = day;
    const reactions = Object.entries(message.reactions || {})
      .filter(([, count]) => count > 0)
      .map(([reaction, count]) => `<button class="reaction-count" type="button" data-message-id="${message.id}" data-reaction="${reaction}">${reaction} ${count}</button>`)
      .join("");
    const palette = emojiPalette
      .map((reaction) => `<button type="button" data-message-id="${message.id}" data-reaction="${reaction}" aria-label="React ${reaction}">${reaction}</button>`)
      .join("");
    const label = getSignalStatus(message.signalScore);
    const paletteOpen = state.reactionMenuMessageId === message.id;
    const compactActions = message.text.trim().length <= 12;
    const replyMarkup = message.replyTo
      ? `
        <div class="reply-reference">
          <strong>${escapeHtml(message.replyTo.username)}</strong>
          <span>${escapeHtml(message.replyTo.text)}</span>
        </div>
      `
      : "";

    return `
      ${divider}
      <article class="message ${mine ? "mine" : ""} ${selected ? "selected" : ""}" id="message-${message.id}" data-select-message="${message.id}">
        <div class="message-meta">
          <strong>${escapeHtml(message.username)}</strong>
          <span>${formatMessageTime(message.createdAt)}</span>
        </div>
        <div class="message-body" data-message-body="${message.id}">
          ${replyMarkup}
          <div class="bubble-shell">
            <div class="bubble">${escapeHtml(message.text)}</div>
            <div class="message-actions">
              <button type="button" data-open-reactions="${message.id}" aria-label="Add reaction" title="React">+</button>
              ${compactActions ? "" : `
                <button type="button" data-copy-message="${message.id}" aria-label="Copy message" title="Copy">&#10697;</button>
                <button type="button" data-reply-message="${message.id}" aria-label="Reply" title="Reply">&#8617;</button>
              `}
            </div>
          </div>
        </div>
        ${label ? `<div class="quiet-score">${label} - ${message.signalScore}</div>` : ""}
        <div class="reaction-row">${reactions}</div>
        <div class="reaction-tools">
          <div class="emoji-tray ${paletteOpen ? "open" : ""}">${palette}</div>
        </div>
      </article>
    `;
  }).join("");

  if (shouldStickToBottom) els.messages.scrollTop = els.messages.scrollHeight;
  else els.messages.scrollTop = previousScrollTop;
}

function renderFeed(target, messages, emptyTitle, emptyBody, options = {}) {
  if (!messages.length) {
    target.innerHTML = `
      <div class="empty-state">
        <strong>${emptyTitle}</strong>
        <span>${emptyBody}</span>
      </div>
    `;
    return;
  }

  target.innerHTML = messages.map((message) => {
    const labels = (message.matchedRules || [])
      .filter((rule) => !String(rule.id).startsWith("noise."))
      .slice(0, 4)
      .map((rule) => `<span>${escapeHtml(getReadableTag(rule.id))}</span>`)
      .join("");
    return `
      <article class="signal-card">
        <button type="button" data-jump="${message.id}">
          <div class="signal-top">
            <span>${categoryLabel(message.signalCategory)}</span>
            <strong>${message.signalScore}</strong>
          </div>
          <p>${escapeHtml(message.text)}</p>
          <div class="why-line">${escapeHtml(options.why || "Pulled forward because the score, timing, and wording look actionable.")}</div>
          <div class="signal-bottom">
            <span>${escapeHtml(message.username)} - ${formatMessageTime(message.createdAt)}</span>
            <span>${message.interactionCount} interactions</span>
          </div>
        </button>
        ${labels ? `<div class="readable-tags">${labels}</div>` : ""}
      </article>
    `;
  }).join("");
}

function renderImportant() {
  renderFeed(
    els.importantList,
    state.important,
    "No important messages yet.",
    "When the chat gets noisy, CatchUp will pull the signal here.",
    { why: "This message looks useful, timely, or action-oriented." }
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
    els.catchupHeading.textContent = `You were gone for ${formatDuration(catchup.fromSeenAt, catchup.toSeenAt)}. ${items.length} things mattered.`;
    els.catchupTitle.textContent = `${items.length} things mattered while you were away.`;
    els.catchupBanner.classList.remove("hidden");
  } else {
    els.catchupHeading.textContent = `Nothing big happened. You were gone for ${formatDuration(catchup.fromSeenAt, catchup.toSeenAt)}.`;
    els.catchupBanner.classList.add("hidden");
  }

  renderFeed(
    els.catchupList,
    items,
    "Nothing big happened.",
    `Messages scanned: ${state.messages.length}. High-signal messages: ${state.important.length}. The noise stayed noise.`,
    { why: "CatchUp found this while scanning what changed since your last visit." }
  );

  els.catchupFeedback.classList.toggle("hidden", !hadPreviousSeen || !items.length);
}

function renderUsers() {
  const uniqueUsers = Array.from(
    new Map(state.online.map((user) => [user.userId || user.username.toLowerCase(), user])).values()
  );
  els.chatNowLabel.textContent = uniqueUsers.length === 1 ? "1 in chat now" : `${uniqueUsers.length} in chat now`;
  els.chatHeads.innerHTML = uniqueUsers.length
    ? uniqueUsers.slice(0, 5).map((user, index) => {
      const edgeClass = `head-pos-${index}`;
      return `
      <button class="chat-head ${edgeClass}" type="button" aria-label="${escapeHtml(user.username)} profile">
        <span class="chat-head-avatar" style="background:${user.color}">
          ${escapeHtml(user.username.slice(0, 1).toUpperCase())}
        </span>
        <span class="profile-card" role="status">
          <span class="profile-card-top">
            <span class="profile-avatar" style="background:${user.color}">
              ${escapeHtml(user.username.slice(0, 1).toUpperCase())}
            </span>
            <span>
              <strong>${escapeHtml(user.username)}</strong>
              <small>In chat now</small>
            </span>
          </span>
        </span>
      </button>
    `;
    }).join("")
    : `<span class="nobody-now">Nobody yet</span>`;
  els.onlineList.innerHTML = uniqueUsers.length
    ? uniqueUsers.map((user) => `
      <div class="online-user">
        <span style="background:${user.color}"></span>
        <strong>${escapeHtml(user.username)}</strong>
      </div>
    `).join("")
    : `<p class="drawer-empty">No one else is here right now.</p>`;
}

function renderTyping() {
  const names = Array.from(state.typingUsers.keys()).filter((name) => name !== state.currentUser?.username);
  if (!names.length) {
    els.typing.textContent = "";
  } else if (names.length === 1) {
    els.typing.textContent = `${names[0]} is typing...`;
  } else if (names.length === 2) {
    els.typing.textContent = `${names[0]} and ${names[1]} are typing...`;
  } else {
    els.typing.textContent = `${names.length} people are typing...`;
  }
}

function renderReplyComposer() {
  if (!state.replyTo) {
    els.replyComposer.classList.add("hidden");
    els.replyComposerName.textContent = "";
    els.replyComposerText.textContent = "";
    return;
  }

  els.replyComposer.classList.remove("hidden");
  els.replyComposerName.textContent = `Replying to ${state.replyTo.username}`;
  els.replyComposerText.textContent = state.replyTo.text;
}

function renderAll() {
  renderMessages();
  renderImportant();
  renderCatchup();
  renderUsers();
  renderReplyComposer();
}

function setTab(tab) {
  state.activeTab = tab;
  els.navButtons.forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
  els.chatView.classList.toggle("active", tab === "chat");
  els.catchupView.classList.toggle("active", tab === "catchup");
  els.importantView.classList.toggle("active", tab === "important");
  els.messageForm.classList.toggle("hidden", tab !== "chat");
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
        { transform: "scale(1.025)", filter: "brightness(1.12)" },
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
  state.currentUser = payload.user;
  state.isAuthenticated = true;
  state.group = payload.group;
  state.activeGroupId = payload.group.id;
  state.messages = payload.messages;
  state.important = payload.important;
  state.catchup = payload.catchup;
  state.online = payload.online;
  state.onlineCountsByGroup.set(payload.group.id, payload.online.length);
  state.selectedMessageId = null;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload.user));
  localStorage.setItem(LEGACY_USERNAME_KEY, payload.user.username);

  closeNewGroupSheet();
  showScreen("group");
  setTab("chat");
  els.inviteCode.textContent = "Invite code";
  els.inviteCodeValue.textContent = payload.group.inviteCode;
  renderAll();
  loadHomeGroups();
  els.messageInput.focus();
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

async function copyInviteCode() {
  if (!state.group?.inviteCode) return;
  await copyText(state.group.inviteCode);
  showPresence("Invite code copied");
  closeChatMenu();
}

async function shareInviteCode() {
  if (!state.group?.inviteCode) return;
  const text = `Join ${state.group.name} on CatchUp with code ${state.group.inviteCode}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: "CatchUp invite", text });
      closeChatMenu();
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }
  await copyText(text);
  showPresence("Invite copied");
  closeChatMenu();
}

function openChatMenu() {
  els.chatMenu.classList.remove("hidden");
  requestAnimationFrame(() => els.chatMenu.classList.add("open"));
}

function closeChatMenu() {
  els.chatMenu.classList.remove("open");
  setTimeout(() => els.chatMenu.classList.add("hidden"), 170);
}

async function bootAuthenticatedUser(user) {
  state.currentUser = user;
  state.isAuthenticated = true;
  els.usernameInput.value = user.username;
  showScreen("home");
  await loadHomeGroups();
}

els.authTabs.forEach((button) => {
  button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
});

els.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = els.usernameInput.value.trim();
  if (!username) return;

  // Backend auth integration point: replace this local demo session with login/register API calls.
  saveDemoSession(username);
  await bootAuthenticatedUser(state.currentUser);
});

els.logoutButton.addEventListener("click", () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  state.currentUser = null;
  state.isAuthenticated = false;
  state.groups = [];
  state.group = null;
  state.activeGroupId = null;
  showScreen("auth");
});

els.backHome.addEventListener("click", async () => {
  state.group = null;
  state.activeGroupId = null;
  els.onlineDrawer.classList.remove("open");
  closeChatMenu();
  showScreen("home");
  await loadHomeGroups();
});

els.openNewGroup.addEventListener("click", () => openNewGroupSheet("join"));
els.closeNewGroup.addEventListener("click", closeNewGroupSheet);
els.closeNewGroupScrim.addEventListener("click", closeNewGroupSheet);

els.newGroupModeButtons.forEach((button) => {
  button.addEventListener("click", () => setGroupMode(button.dataset.groupMode));
});

els.newGroupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!state.currentUser?.username) return;

  if (state.groupMode === "create") {
    els.newGroupStatus.textContent = "Creating group...";
    socket.emit("group:create", {
      username: state.currentUser.username,
      groupName: els.groupInput.value.trim() || `${state.currentUser.username}'s Group`,
    });
    return;
  }

  els.newGroupStatus.textContent = "Joining group...";
  socket.emit("group:join", {
    username: state.currentUser.username,
    inviteCode: els.inviteInput.value.trim() || "KETCHUP",
  });
});

els.copyInvite.addEventListener("click", copyInviteCode);
els.shareInvite.addEventListener("click", shareInviteCode);
els.chatMenuButton.addEventListener("click", openChatMenu);
els.closeChatMenu.addEventListener("click", closeChatMenu);
els.closeChatMenuScrim.addEventListener("click", closeChatMenu);

els.homeGroupsList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-invite-code]");
  if (!button || !state.currentUser?.username) return;
  socket.emit("group:join", {
    username: state.currentUser.username,
    inviteCode: button.dataset.inviteCode,
  });
});

els.messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = els.messageInput.value.trim();
  if (!text) return;
  socket.emit("message:send", { text, replyToMessageId: state.replyTo?.id || null });
  socket.emit("typing", { isTyping: false });
  els.messageInput.value = "";
  state.replyTo = null;
  renderReplyComposer();
});

els.cancelReply.addEventListener("click", () => {
  state.replyTo = null;
  renderReplyComposer();
  els.messageInput.focus();
});

let typingTimer = null;
els.messageInput.addEventListener("input", () => {
  socket.emit("typing", { isTyping: els.messageInput.value.trim().length > 0 });
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => socket.emit("typing", { isTyping: false }), 1200);
});

els.messages.addEventListener("click", (event) => {
  const openButton = event.target.closest("[data-open-reactions]");
  if (openButton) {
    const messageId = openButton.dataset.openReactions;
    state.selectedMessageId = messageId;
    state.reactionMenuMessageId = state.reactionMenuMessageId === messageId ? null : messageId;
    renderMessages({ stickToBottom: false });
    return;
  }

  const copyButton = event.target.closest("[data-copy-message]");
  if (copyButton) {
    const message = getMessage(copyButton.dataset.copyMessage);
    if (message) copyText(message.text).then(() => showPresence("Message copied"));
    return;
  }

  const replyButton = event.target.closest("[data-reply-message]");
  if (replyButton) {
    const message = getMessage(replyButton.dataset.replyMessage);
    if (message) {
      setTab("chat");
      state.replyTo = message;
      renderReplyComposer();
      els.messageInput.focus();
    }
    return;
  }

  const reactionButton = event.target.closest("[data-reaction]");
  if (reactionButton) {
    socket.emit("reaction:toggle", {
      messageId: reactionButton.dataset.messageId,
      reaction: reactionButton.dataset.reaction,
    });
    state.reactionMenuMessageId = null;
    return;
  }

  const messageBody = event.target.closest("[data-message-body]");
  if (!messageBody) return;
  state.selectedMessageId = state.selectedMessageId === messageBody.dataset.messageBody ? null : messageBody.dataset.messageBody;
  if (state.selectedMessageId !== messageBody.dataset.messageBody) state.reactionMenuMessageId = null;
  renderMessages({ stickToBottom: false });
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

els.closeOnline.addEventListener("click", () => els.onlineDrawer.classList.remove("open"));

socket.on("room:state", enterApp);

socket.on("join:error", (message) => {
  showPresence(message);
  els.newGroupStatus.textContent = message;
  alert(message);
});

socket.on("server:error", ({ message }) => {
  showPresence(message || "Server error logged.");
});

socket.on("users:update", (users) => {
  state.online = users;
  if (state.activeGroupId) state.onlineCountsByGroup.set(state.activeGroupId, users.length);
  renderUsers();
  if (!els.homeDashboard.classList.contains("hidden")) renderHomeDashboard();
});

socket.on("message:new", ({ message }) => {
  upsertMessage(message);
  state.important = sortImportant([...state.important, message]);
  renderMessages();
  renderImportant();
  renderUsers();
});

socket.on("message:updated", ({ message, important }) => {
  upsertMessage(message);
  state.important = important;
  if (state.selectedMessageId === message.id) state.selectedMessageId = null;
  if (state.reactionMenuMessageId === message.id) state.reactionMenuMessageId = null;
  renderMessages({ stickToBottom: false });
  renderImportant();
  renderUsers();
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

setAuthMode("signin");
const demoUser = readDemoSession();
if (demoUser?.username) {
  bootAuthenticatedUser(demoUser);
} else {
  showScreen("auth");
}

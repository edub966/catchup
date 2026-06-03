const express = require("express");
const http = require("http");
const path = require("path");
const { randomUUID } = require("crypto");
const { Server } = require("socket.io");
const { createDatabase } = require("./src/db");
const { scoreMessage } = require("./src/scoring");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const db = createDatabase();

const PORT = process.env.PORT || 5501;
const IMPORTANT_THRESHOLD = 65;
const CATCHUP_THRESHOLD = 60;

const onlineByGroup = new Map();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function nowIso() {
  return new Date().toISOString();
}

function makeInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function getOnline(groupId) {
  if (!onlineByGroup.has(groupId)) onlineByGroup.set(groupId, new Map());
  return onlineByGroup.get(groupId);
}

function ensureUser(username) {
  const cleanUsername = String(username || "Guest").trim().slice(0, 28) || "Guest";
  const existing = db.prepare("SELECT * FROM users WHERE lower(username) = lower(?)").get(cleanUsername);
  if (existing) return existing;

  const user = {
    id: randomUUID(),
    username: cleanUsername,
    created_at: nowIso(),
  };

  db.prepare("INSERT INTO users (id, username, created_at) VALUES (?, ?, ?)").run(
    user.id,
    user.username,
    user.created_at
  );
  return user;
}

function createGroup(name) {
  const cleanName = String(name || "New Group").trim().slice(0, 48) || "New Group";
  let inviteCode = makeInviteCode();
  while (db.prepare("SELECT id FROM groups WHERE invite_code = ?").get(inviteCode)) {
    inviteCode = makeInviteCode();
  }

  const group = {
    id: randomUUID(),
    name: cleanName,
    invite_code: inviteCode,
    created_at: nowIso(),
  };

  db.prepare("INSERT INTO groups (id, name, invite_code, created_at) VALUES (?, ?, ?, ?)").run(
    group.id,
    group.name,
    group.invite_code,
    group.created_at
  );
  return group;
}

function joinGroup(userId, groupId) {
  db.prepare("INSERT OR IGNORE INTO group_members (user_id, group_id, joined_at) VALUES (?, ?, ?)").run(
    userId,
    groupId,
    nowIso()
  );
}

function getGroupByInvite(inviteCode) {
  return db.prepare("SELECT * FROM groups WHERE upper(invite_code) = upper(?)").get(inviteCode);
}

function getDefaultGroup() {
  return db.prepare("SELECT * FROM groups WHERE invite_code = ?").get("KETCHUP");
}

function getGroupsForUsername(username) {
  return db
    .prepare(`
      SELECT
        groups.id,
        groups.name,
        groups.invite_code,
        groups.created_at,
        COUNT(messages.id) AS total_message_count,
        SUM(
          CASE
            WHEN messages.id IS NOT NULL
              AND (user_last_seen.last_seen_at IS NULL OR messages.created_at > user_last_seen.last_seen_at)
            THEN 1
            ELSE 0
          END
        ) AS message_count,
        SUM(
          CASE
            WHEN message_scores.final_score >= ?
              AND (user_last_seen.last_seen_at IS NULL OR messages.created_at > user_last_seen.last_seen_at)
            THEN 1
            ELSE 0
          END
        ) AS high_signal_count,
        MAX(messages.created_at) AS last_message_at,
        (
          SELECT preview_messages.text
          FROM messages AS preview_messages
          JOIN message_scores AS preview_scores ON preview_scores.message_id = preview_messages.id
          WHERE preview_messages.group_id = groups.id
          ORDER BY preview_scores.final_score DESC, preview_messages.created_at DESC
          LIMIT 1
        ) AS important_preview
      FROM users
      JOIN group_members ON group_members.user_id = users.id
      JOIN groups ON groups.id = group_members.group_id
      LEFT JOIN messages ON messages.group_id = groups.id
      LEFT JOIN message_scores ON message_scores.message_id = messages.id
      LEFT JOIN user_last_seen ON user_last_seen.user_id = users.id AND user_last_seen.group_id = groups.id
      WHERE lower(users.username) = lower(?)
      GROUP BY groups.id
      ORDER BY high_signal_count DESC, message_count DESC, COALESCE(last_message_at, groups.created_at) DESC
    `)
    .all(IMPORTANT_THRESHOLD, String(username || "").trim())
    .map((group) => ({
      id: group.id,
      name: group.name,
      inviteCode: group.invite_code,
      createdAt: group.created_at,
      messageCount: Number(group.message_count),
      totalMessageCount: Number(group.total_message_count),
      highSignalCount: Number(group.high_signal_count),
      lastMessageAt: group.last_message_at,
      importantPreview: group.important_preview,
    }));
}

function getReactionCounts(messageId) {
  const rows = db
    .prepare("SELECT reaction, COUNT(*) AS count FROM reactions WHERE message_id = ? GROUP BY reaction")
    .all(messageId);

  return rows.reduce((acc, row) => {
    acc[row.reaction] = row.count;
    return acc;
  }, {});
}

function persistScore(messageId, score) {
  db.prepare(`
    INSERT INTO message_scores (
      message_id,
      base_score,
      reaction_boost,
      final_score,
      signal_category,
      signal_confidence,
      matched_rules,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(message_id) DO UPDATE SET
      base_score = excluded.base_score,
      reaction_boost = excluded.reaction_boost,
      final_score = excluded.final_score,
      signal_category = excluded.signal_category,
      signal_confidence = excluded.signal_confidence,
      matched_rules = excluded.matched_rules,
      updated_at = excluded.updated_at
  `).run(
    messageId,
    score.baseScore,
    score.reactionBoost,
    score.finalScore,
    score.signalCategory,
    score.signalConfidence,
    JSON.stringify(score.matchedRules),
    nowIso()
  );
}

function hydrateMessage(row) {
  if (!row) return null;
  const reactionCounts = getReactionCounts(row.id);
  const replyTo = row.reply_to_message_id
    ? {
        id: row.reply_to_message_id,
        username: row.reply_username || "Someone",
        text: row.reply_text || "Message unavailable",
        createdAt: row.reply_created_at || null,
      }
    : null;
  return {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    username: row.username,
    text: row.text,
    createdAt: row.created_at,
    replyTo,
    reactions: reactionCounts,
    baseScore: row.base_score || 0,
    reactionBoost: row.reaction_boost || 0,
    signalScore: row.final_score || 0,
    signalCategory: row.signal_category || "noise",
    signalConfidence: row.signal_confidence || 0,
    matchedRules: row.matched_rules ? JSON.parse(row.matched_rules) : [],
    interactionCount: Object.values(reactionCounts).reduce((sum, count) => sum + count, 0),
  };
}

function getMessages(groupId, limit = 120) {
  return db
    .prepare(`
      SELECT
        messages.*,
        users.username,
        reply_messages.text AS reply_text,
        reply_messages.created_at AS reply_created_at,
        reply_users.username AS reply_username,
        message_scores.base_score,
        message_scores.reaction_boost,
        message_scores.final_score,
        message_scores.signal_category,
        message_scores.signal_confidence,
        message_scores.matched_rules
      FROM messages
      JOIN users ON users.id = messages.user_id
      LEFT JOIN messages AS reply_messages ON reply_messages.id = messages.reply_to_message_id
      LEFT JOIN users AS reply_users ON reply_users.id = reply_messages.user_id
      LEFT JOIN message_scores ON message_scores.message_id = messages.id
      WHERE messages.group_id = ?
      ORDER BY messages.created_at DESC
      LIMIT ?
    `)
    .all(groupId, limit)
    .reverse()
    .map(hydrateMessage);
}

function getImportant(groupId, limit = 40) {
  return db
    .prepare(`
      SELECT
        messages.*,
        users.username,
        reply_messages.text AS reply_text,
        reply_messages.created_at AS reply_created_at,
        reply_users.username AS reply_username,
        message_scores.base_score,
        message_scores.reaction_boost,
        message_scores.final_score,
        message_scores.signal_category,
        message_scores.signal_confidence,
        message_scores.matched_rules
      FROM message_scores
      JOIN messages ON messages.id = message_scores.message_id
      JOIN users ON users.id = messages.user_id
      LEFT JOIN messages AS reply_messages ON reply_messages.id = messages.reply_to_message_id
      LEFT JOIN users AS reply_users ON reply_users.id = reply_messages.user_id
      WHERE messages.group_id = ?
        AND message_scores.final_score >= ?
      ORDER BY message_scores.final_score DESC, messages.created_at DESC
      LIMIT ?
    `)
    .all(groupId, IMPORTANT_THRESHOLD, limit)
    .map(hydrateMessage);
}

function getLastSeen(userId, groupId) {
  const row = db
    .prepare("SELECT last_seen_at FROM user_last_seen WHERE user_id = ? AND group_id = ?")
    .get(userId, groupId);
  return row ? row.last_seen_at : null;
}

function setLastSeen(userId, groupId, seenAt = nowIso()) {
  db.prepare(`
    INSERT INTO user_last_seen (user_id, group_id, last_seen_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, group_id) DO UPDATE SET last_seen_at = excluded.last_seen_at
  `).run(userId, groupId, seenAt);
}

function createCatchupSession(userId, groupId, fromSeenAt) {
  const toSeenAt = nowIso();
  const sessionId = randomUUID();
  const messages = db
    .prepare(`
      SELECT
        messages.*,
        users.username,
        reply_messages.text AS reply_text,
        reply_messages.created_at AS reply_created_at,
        reply_users.username AS reply_username,
        message_scores.base_score,
        message_scores.reaction_boost,
        message_scores.final_score,
        message_scores.signal_category,
        message_scores.signal_confidence,
        message_scores.matched_rules
      FROM message_scores
      JOIN messages ON messages.id = message_scores.message_id
      JOIN users ON users.id = messages.user_id
      LEFT JOIN messages AS reply_messages ON reply_messages.id = messages.reply_to_message_id
      LEFT JOIN users AS reply_users ON reply_users.id = reply_messages.user_id
      WHERE messages.group_id = ?
        AND message_scores.final_score >= ?
        AND (? IS NULL OR messages.created_at > ?)
      ORDER BY message_scores.final_score DESC, messages.created_at DESC
      LIMIT 12
    `)
    .all(groupId, CATCHUP_THRESHOLD, fromSeenAt, fromSeenAt)
    .map(hydrateMessage);

  db.prepare(`
    INSERT INTO catchup_sessions (id, user_id, group_id, from_seen_at, to_seen_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sessionId, userId, groupId, fromSeenAt, toSeenAt, toSeenAt);

  const insertItem = db.prepare(`
    INSERT INTO catchup_items (id, session_id, message_id, rank, final_score)
    VALUES (?, ?, ?, ?, ?)
  `);
  messages.forEach((message, index) => {
    insertItem.run(randomUUID(), sessionId, message.id, index + 1, message.signalScore);
  });

  return {
    id: sessionId,
    fromSeenAt,
    toSeenAt,
    items: messages,
  };
}

function getContext(groupId, messageId) {
  const target = db.prepare("SELECT created_at FROM messages WHERE id = ? AND group_id = ?").get(messageId, groupId);
  if (!target) return [];

  const before = db
    .prepare(`
      SELECT
        messages.*,
        users.username,
        reply_messages.text AS reply_text,
        reply_messages.created_at AS reply_created_at,
        reply_users.username AS reply_username,
        message_scores.*
      FROM messages
      JOIN users ON users.id = messages.user_id
      LEFT JOIN messages AS reply_messages ON reply_messages.id = messages.reply_to_message_id
      LEFT JOIN users AS reply_users ON reply_users.id = reply_messages.user_id
      LEFT JOIN message_scores ON message_scores.message_id = messages.id
      WHERE messages.group_id = ? AND messages.created_at < ?
      ORDER BY messages.created_at DESC
      LIMIT 2
    `)
    .all(groupId, target.created_at)
    .reverse();

  const after = db
    .prepare(`
      SELECT
        messages.*,
        users.username,
        reply_messages.text AS reply_text,
        reply_messages.created_at AS reply_created_at,
        reply_users.username AS reply_username,
        message_scores.*
      FROM messages
      JOIN users ON users.id = messages.user_id
      LEFT JOIN messages AS reply_messages ON reply_messages.id = messages.reply_to_message_id
      LEFT JOIN users AS reply_users ON reply_users.id = reply_messages.user_id
      LEFT JOIN message_scores ON message_scores.message_id = messages.id
      WHERE messages.group_id = ? AND messages.created_at >= ?
      ORDER BY messages.created_at ASC
      LIMIT 3
    `)
    .all(groupId, target.created_at);

  return [...before, ...after].map(hydrateMessage);
}

function getRoomPayload(group, user) {
  const lastSeenAt = getLastSeen(user.id, group.id);
  const catchup = createCatchupSession(user.id, group.id, lastSeenAt);
  setLastSeen(user.id, group.id, catchup.toSeenAt);

  return {
    group: {
      id: group.id,
      name: group.name,
      inviteCode: group.invite_code,
    },
    user: {
      id: user.id,
      username: user.username,
    },
    messages: getMessages(group.id),
    important: getImportant(group.id),
    catchup,
    online: Array.from(getOnline(group.id).values()),
  };
}

function emitSocketError(socket, eventName, error) {
  console.error(`[socket:${eventName}]`, error);
  socket.emit("server:error", {
    event: eventName,
    message: "Something broke on the server. I logged it instead of crashing.",
  });
}

app.get("/api/groups/default", (req, res) => {
  res.json(getDefaultGroup());
});

app.get("/api/users/:username/groups", (req, res) => {
  res.json(getGroupsForUsername(req.params.username));
});

app.post("/api/groups", (req, res) => {
  const group = createGroup(req.body.name);
  res.status(201).json(group);
});

app.post("/api/groups/join", (req, res) => {
  const group = getGroupByInvite(req.body.inviteCode || "KETCHUP");
  if (!group) {
    res.status(404).json({ error: "No group found with that invite code." });
    return;
  }
  res.json(group);
});

app.get("/api/groups/:groupId/context/:messageId", (req, res) => {
  res.json(getContext(req.params.groupId, req.params.messageId));
});

app.get("/api/audit/messages", (req, res) => {
  const rows = db
    .prepare(`
      SELECT
        messages.id,
        messages.text,
        messages.created_at,
        users.username,
        message_scores.base_score,
        message_scores.reaction_boost,
        message_scores.final_score,
        message_scores.signal_category,
        message_scores.signal_confidence,
        message_scores.matched_rules,
        signal_audits.manual_rating,
        signal_audits.corrected_category
      FROM messages
      JOIN users ON users.id = messages.user_id
      LEFT JOIN message_scores ON message_scores.message_id = messages.id
      LEFT JOIN signal_audits ON signal_audits.message_id = messages.id
      ORDER BY messages.created_at DESC
      LIMIT 200
    `)
    .all()
    .map((row) => ({
      ...row,
      appeared_in_important: row.final_score >= IMPORTANT_THRESHOLD,
      appeared_in_catchup: row.final_score >= CATCHUP_THRESHOLD,
      matched_rules: row.matched_rules ? JSON.parse(row.matched_rules) : [],
    }));

  res.json(rows);
});

app.post("/api/audit/messages/:messageId", (req, res) => {
  const now = nowIso();
  db.prepare(`
    INSERT INTO signal_audits (
      id,
      message_id,
      manual_rating,
      corrected_category,
      notes,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(message_id) DO UPDATE SET
      manual_rating = excluded.manual_rating,
      corrected_category = excluded.corrected_category,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `).run(
    randomUUID(),
    req.params.messageId,
    req.body.manualRating || null,
    req.body.correctedCategory || null,
    req.body.notes || null,
    now,
    now
  );

  res.json({ ok: true });
});

app.post("/api/catchup/:sessionId/feedback", (req, res) => {
  const session = db.prepare("SELECT * FROM catchup_sessions WHERE id = ?").get(req.params.sessionId);
  if (!session) {
    res.status(404).json({ error: "Catch-up session not found." });
    return;
  }

  db.prepare(`
    INSERT INTO catchup_feedback (id, session_id, user_id, group_id, rating, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), session.id, session.user_id, session.group_id, req.body.rating, nowIso());

  res.json({ ok: true });
});

io.on("connection", (socket) => {
  let currentUser = null;
  let currentGroup = null;

  socket.on("group:join", ({ username, inviteCode }) => {
    const group = getGroupByInvite(inviteCode || "KETCHUP");
    if (!group) {
      socket.emit("join:error", "No group found with that invite code.");
      return;
    }

    const user = ensureUser(username);
    joinGroup(user.id, group.id);

    currentUser = user;
    currentGroup = group;
    socket.join(group.id);

    getOnline(group.id).set(socket.id, {
      id: socket.id,
      userId: user.id,
      username: user.username,
      color: `hsl(${Math.floor(Math.random() * 360)}, 78%, 52%)`,
    });

    socket.emit("room:state", getRoomPayload(group, user));
    io.to(group.id).emit("users:update", Array.from(getOnline(group.id).values()));
    socket.to(group.id).emit("presence", `${user.username} joined`);
  });

  socket.on("group:create", ({ username, groupName }) => {
    const user = ensureUser(username);
    const group = createGroup(groupName);
    joinGroup(user.id, group.id);

    currentUser = user;
    currentGroup = group;
    socket.join(group.id);
    getOnline(group.id).set(socket.id, {
      id: socket.id,
      userId: user.id,
      username: user.username,
      color: `hsl(${Math.floor(Math.random() * 360)}, 78%, 52%)`,
    });

    socket.emit("room:state", getRoomPayload(group, user));
    io.to(group.id).emit("users:update", Array.from(getOnline(group.id).values()));
  });

  socket.on("message:send", ({ text, replyToMessageId }) => {
    try {
      if (!currentUser || !currentGroup) return;

      const cleanText = String(text || "").trim().slice(0, 1000);
      if (!cleanText) return;
      const cleanReplyToMessageId = String(replyToMessageId || "");
      const replyMessage = cleanReplyToMessageId
        ? db
            .prepare(`
              SELECT messages.id, messages.text, messages.created_at, users.username
              FROM messages
              JOIN users ON users.id = messages.user_id
              WHERE messages.id = ? AND messages.group_id = ?
            `)
            .get(cleanReplyToMessageId, currentGroup.id)
        : null;

      const messageId = randomUUID();
      const createdAt = nowIso();
      const score = scoreMessage(cleanText);

      db.prepare("INSERT INTO messages (id, group_id, user_id, text, created_at, reply_to_message_id) VALUES (?, ?, ?, ?, ?, ?)").run(
        messageId,
        currentGroup.id,
        currentUser.id,
        cleanText,
        createdAt,
        replyMessage ? replyMessage.id : null
      );
      persistScore(messageId, score);
      setLastSeen(currentUser.id, currentGroup.id, createdAt);

      const message = hydrateMessage({
        id: messageId,
        group_id: currentGroup.id,
        user_id: currentUser.id,
        username: currentUser.username,
        text: cleanText,
        created_at: createdAt,
        reply_to_message_id: replyMessage?.id || null,
        reply_text: replyMessage?.text || null,
        reply_created_at: replyMessage?.created_at || null,
        reply_username: replyMessage?.username || null,
        base_score: score.baseScore,
        reaction_boost: score.reactionBoost,
        final_score: score.finalScore,
        signal_category: score.signalCategory,
        signal_confidence: score.signalConfidence,
        matched_rules: JSON.stringify(score.matchedRules),
      });

      io.to(currentGroup.id).emit("message:new", {
        message,
        important: message.signalScore >= IMPORTANT_THRESHOLD,
      });
    } catch (error) {
      emitSocketError(socket, "message:send", error);
    }
  });

  socket.on("reaction:toggle", ({ messageId, reaction }) => {
    try {
      if (!currentUser || !currentGroup) return;

      const cleanMessageId = String(messageId || "");
      const cleanReaction = String(reaction || "");
      if (!cleanMessageId || !cleanReaction) return;

      const messageRow = db
        .prepare("SELECT id, text FROM messages WHERE id = ? AND group_id = ?")
        .get(cleanMessageId, currentGroup.id);
      if (!messageRow) return;

      const existing = db
        .prepare("SELECT id FROM reactions WHERE message_id = ? AND user_id = ? AND reaction = ?")
        .get(cleanMessageId, currentUser.id, cleanReaction);

      if (existing) {
        db.prepare("DELETE FROM reactions WHERE id = ?").run(existing.id);
      } else {
        db.prepare("INSERT INTO reactions (id, message_id, user_id, reaction, created_at) VALUES (?, ?, ?, ?, ?)").run(
          randomUUID(),
          cleanMessageId,
          currentUser.id,
          cleanReaction,
          nowIso()
        );
      }

      const score = scoreMessage(messageRow.text, getReactionCounts(cleanMessageId));
      persistScore(cleanMessageId, score);

      const messages = getMessages(currentGroup.id);
      const updated = messages.find((message) => message.id === cleanMessageId);

      io.to(currentGroup.id).emit("message:updated", {
        message: updated,
        important: getImportant(currentGroup.id),
      });
    } catch (error) {
      emitSocketError(socket, "reaction:toggle", error);
    }
  });

  socket.on("typing", ({ isTyping }) => {
    if (!currentUser || !currentGroup) return;
    socket.to(currentGroup.id).emit("typing", {
      username: currentUser.username,
      isTyping: Boolean(isTyping),
    });
  });

  socket.on("disconnect", () => {
    if (!currentUser || !currentGroup) return;

    setLastSeen(currentUser.id, currentGroup.id);
    getOnline(currentGroup.id).delete(socket.id);
    io.to(currentGroup.id).emit("users:update", Array.from(getOnline(currentGroup.id).values()));
    socket.to(currentGroup.id).emit("presence", `${currentUser.username} left`);
  });
});

server.listen(PORT, () => {
  console.log(`CatchUp MVP running at http://localhost:${PORT}`);
});

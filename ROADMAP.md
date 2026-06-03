# CatchUp MVP Roadmap

## Working Product Direction

Avoid the name "Signal"; it is already taken.

Current leading name:

**CatchUp**

Tagline:

**Find what mattered in the noise.**

Brand direction:

- Casual, fast, and social
- Slightly playful without feeling childish
- Ketchup-inspired red/orange accents are acceptable as a wink, not the whole identity
- Designed for messy group chats first, not productivity workflows

Other possible names:

- Threadline
- Waypoint
- Pulse
- Chattermark
- NoiseMap
- Beacon
- PingTrail

## Product Vision

CatchUp is a casual real-time group chat app for chaotic social groups where important information does not disappear inside spam, jokes, memes, and fast-moving conversation.

The app should feel casual like GroupMe, Snapchat, or iMessage, not corporate like Slack.

The main product is still a usable group chat app, but the long-term asset is the catch-up engine: a scoring and categorization system that identifies which messages matter.

CatchUp is not trying to organize group chats.

CatchUp is trying to make chaotic group chats survivable.

The app should preserve the fun, spammy, messy behavior that makes social chats worth using. Its job is to quietly identify the messages people will regret missing.

## Core Problem

Large social group chats are fun, but they become unusable when important information is buried.

Examples:

- "Party starts at 9"
- "Need 3 drivers"
- "Formal tickets due Friday"
- "Who's going downtown?"
- "Rush meeting moved to Thursday"
- "Can someone bring speakers?"

Users do not want the chaos removed.

They want the important stuff to survive the chaos.

## Target Users

Primary MVP users:

- Fraternities
- Sororities
- College friend groups
- Student organizations
- Clubs
- Sports teams
- DJ/promoter groups

The MVP should optimize for messy social conversation, not workplace productivity.

## Product Principles

- Do not build Slack.
- Do not build project management software.
- Do not over-organize the chat.
- Do not force users to create formal events, tasks, or boards.
- Do not build summaries before proving source-message detection works.
- Keep the chat casual.
- Detect important messages quietly in the background.
- Prioritize precision over recall.

It is better for CatchUp to show 5 genuinely useful things than 20 maybe-useful things.

False positives are the biggest trust killer.

## Core App Structure

Each group has three main tabs:

1. **Chat**
2. **Catch Up**
3. **Important**

The Chat tab is the normal group chat.

The Catch Up tab shows what mattered since the user was last active.

The Important tab shows high-scoring messages from the group over time.

The Catch Up tab is the core product moment. The Important tab is an always-available archive of high-signal messages.

## MVP Features

### 1. Group Chat

Build a polished real-time chat experience.

Required:

- Create group
- Join group with invite code
- Username setup
- Real-time messages
- Chat history
- Timestamps
- Online users
- Typing indicators
- Message reactions
- Basic mobile-first layout

The chat must feel fast, casual, and clean.

### 2. Persistent Storage

Do not use in-memory storage.

Use SQLite for MVP. SQLite is enough for local development, demos, and early testing.

Structure the app so PostgreSQL can be swapped in later if needed.

Required tables:

- users
- groups
- group_members
- messages
- reactions
- message_scores
- user_last_seen
- catchup_sessions
- catchup_items
- catchup_feedback
- signal_audits

### 3. Message Scoring Engine

Every message should be scored from 0 to 100.

The score represents how likely the message is to matter later.

Example scores:

- "lol" -> 0
- "bro fell off" -> 0
- "who's going downtown Friday?" -> 65
- "party starts at 9" -> 75
- "need 3 sober drivers" -> 90
- "formal tickets due tomorrow" -> 95

The app should score messages silently.

Each scored message should store:

```js
{
  id,
  groupId,
  userId,
  text,
  createdAt,
  signalScore,
  signalCategory,
  signalConfidence,
  matchedRules
}
```

### 4. Signal Categories

Initial internal categories:

- plan
- event
- request
- deadline
- announcement
- question
- logistics
- noise

These categories are internal. The main UI should not feel like a category board.

### 5. Scoring Rules V1

Use rules first, not AI.

High-value patterns:

- Contains a date
- Contains a time
- Contains deadline language
- Contains "need"
- Contains "who's going"
- Contains "anyone"
- Contains "can someone"
- Contains "bring"
- Contains "ride"
- Contains "driver"
- Contains "tickets"
- Contains "due"
- Contains "meeting"
- Contains "party"
- Contains "formal"
- Contains "rush"
- Contains "tonight"
- Contains "tomorrow"
- Contains Friday, Saturday, or Sunday
- Contains a question mark

Lower-value / noise patterns:

- Very short messages
- Only emojis
- Only laughter
- Common spam phrases
- Repeated messages
- Messages with no nouns, dates, times, or requests

The engine should produce:

- baseScore
- reactionBoost
- finalScore
- signalCategory
- signalConfidence
- matchedRules

### 6. Human Validation Layer

The algorithm should not be the only source of truth.

Reactions should affect the score.

Reaction boosts:

- Pin: +25
- Check: +15
- Eyes: +10
- Question: +10
- Fire: +8
- Laugh: +0
- Skull: +0

Reaction boosts should be capped at 35 points.

Track interaction count separately from importance score.

A message can be:

- Highly interacted with but not important
- Important but not heavily interacted with
- Both

This creates a hybrid system:

**machine detection + human validation**

### 7. Important Feed

Important is a simple feed of the highest-scoring messages.

Do not make giant event cards.

Do not make formal task boards.

Show lightweight cards.

Each card should include:

- Message text
- Final score
- Interaction count
- Jump to original message
- Optionally, 2-3 nearby messages for context

Example:

```text
IMPORTANT

"Formal tickets due Friday"
Score: 94
12 interactions
Jump to message
```

The feed should feel like social highlights, not a productivity dashboard.

### 8. Catch-Up Mode

This is the most important MVP feature.

When a user returns after being inactive, show:

```text
You were gone for 18 hours. Here's what mattered.
```

Then list the top important messages since their last seen timestamp.

Each item should allow the user to jump back into the original chat context.

Catch-Up items should support context:

- Jump to original message
- Show 2-3 messages before and after
- Show interactions nearby

Catch-Up Mode is the core product moment.

### 9. Catch-Up Feedback

After a catch-up session, ask:

```text
Was this catch-up useful?
```

Options:

- Yes
- Kind of
- No

Store the response in `catchup_feedback`.

Also store which messages were shown in `catchup_items`.

### 10. Manual Audit System

Build an internal audit page.

This page is not for normal users.

The audit page should show:

- Recent messages
- Algorithm score
- Base score
- Reaction boost
- Algorithm category
- Confidence
- Matched rules
- Whether the message appeared in Important
- Whether the message appeared in Catch Up
- Manual rating: important / not important
- Correct category selector
- Export audit data as JSON/CSV

This is critical.

The app is not just a chat app. It is a data collection and algorithm improvement tool.

## Algorithm Success Targets

### Target 1: Precision

At least 80% of messages shown in the Important Feed should be rated as actually important by testers.

If the app shows 100 messages in the Important Feed, at least 80 should feel useful or relevant.

False positives are the biggest trust killer.

Prioritize precision over recall.

### Target 2: Catch-Up Usefulness

At least 70% of testers should say Catch-Up Mode helped them understand what they missed faster than reading the full chat.

Measure this through the catch-up feedback prompt.

### Target 3: Important Message Coverage

For manually audited important messages, the system should catch at least 60% in the MVP.

This does not need to be perfect at first.

The goal is to prove the system can find a meaningful portion of important messages without flooding users with junk.

## UI Direction

The app should look:

- Clean
- Modern
- Mobile-first
- Casual
- Slightly playful
- Fast
- Social

It should not look:

- Corporate
- Enterprise
- Like Slack
- Like Jira
- Like a dashboard
- Like school software

Design inspiration:

- Snapchat
- Instagram DMs
- iMessage
- GroupMe
- BeReal-style casualness

Use:

- Rounded cards
- Soft shadows
- Large readable text
- Bottom navigation on mobile
- Smooth tab switching
- Message bubbles
- Lightweight badges

Avoid:

- Dense tables in the main UI
- Too many filters
- Too many buttons
- Overly serious language

## Recommended Tech Stack

Frontend:

- HTML
- CSS
- Vanilla JavaScript
- Socket.IO client

Backend:

- Node.js
- Express
- Socket.IO

Database:

- SQLite for MVP

Optional libraries:

- better-sqlite3
- uuid
- dayjs
- bad-words or custom profanity/noise filtering later

Do not use React yet unless absolutely necessary.

The goal is speed, clarity, and control.

## Build Order

### Sprint 1: Foundation

Build:

- Express server
- Socket.IO setup
- SQLite setup
- Create group
- Join group with invite code
- Send/receive messages
- Store messages in SQLite
- Display chat history
- Username setup
- Score every message immediately
- Store matched rules

Goal:

A usable persistent group chat that starts collecting scored message data from day one.

### Sprint 2: Social Chat Polish

Build:

- Reactions
- Typing indicators
- Online users
- Mobile-first styling
- Message timestamps
- Better empty states
- Basic invite flow

Goal:

The app should feel good enough that real friends could actually use it.

### Sprint 3: Scoring Engine

Build:

- `scoreMessage(text)` function
- Category detection
- Matched rule logging
- Score storage in SQLite
- Reaction score boosts
- Internal score debugging

Goal:

Every message gets scored and categorized automatically.

### Sprint 4: Important Feed

Build:

- Important tab
- Show messages above score threshold
- Sort by score and recency
- Jump to original message
- Show lightweight context
- Keep UI lightweight and casual

Goal:

Users can find important messages without reading everything.

### Sprint 5: Catch-Up Mode

Build:

- Track user last seen per group
- Show high-scoring messages since last seen
- Show "You were gone for X hours"
- Allow jump to original context
- Add feedback buttons: useful / kind of / not useful
- Store catch-up session data

Goal:

Create the "holy shit this is useful" moment.

### Sprint 6: Audit Dashboard

Build:

- Admin-only audit page
- View scored messages
- See matched rules
- Manually mark important/not important
- Correct categories
- Export audit data as JSON/CSV

Goal:

Measure whether the algorithm is actually working.

## MVP Feature Boundaries

Do not build yet:

- DMs
- File uploads
- Voice messages
- Full user profiles
- Complex roles
- AI summaries
- Payment
- Mobile app
- Push notifications
- Full moderation system
- Event creation forms
- Calendar integration

These are distractions before the algorithm is validated.

## Success Definition

The MVP succeeds if a real group can use the chat normally for a week, and inactive users can return, open Catch Up, and understand the important developments in under 30 seconds without reading the full chat.

The MVP also succeeds if:

1. A real group can use the chat naturally.
2. The app stores enough real chat data to evaluate the algorithm.
3. Catch-Up Mode helps inactive users understand what mattered.
4. The Important Feed has more useful hits than false positives.
5. The algorithm produces measurable accuracy data.

The MVP does not need thousands of users.

It needs real messy group chat data and proof that the catch-up system works.

## Strategic Direction

Build this as a consumer group chat app first.

Focus on real users and real data.

If the algorithm works, the app can become:

1. A successful standalone consumer app
2. A case study for acquisition
3. A licensing/API product
4. A portfolio-level technical project
5. A startup foundation

But none of that matters until the app proves:

**Important information can be extracted from chaotic social chat better than users can find it manually.**

That is the core bet.

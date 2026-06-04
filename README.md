# CatchUp MVP

CatchUp is a casual group chat app built around catch-up intelligence.

The product bet is simple:

> Important information can be extracted from chaotic social chat better than users can find it manually.

CatchUp should feel like a real social group chat first. The scoring system, Important feed, Catch Up view, and audit tools exist to prove whether the app can find what mattered inside messy conversation.

## Current Status

Sprint 2 is complete enough to pause UI polish and move into Sprint 3.

The app now includes:

- Mobile-first group chat shell
- Frontend auth scaffolding with local/demo session state
- Logged-out landing/auth screen
- Logged-in group dashboard
- Create group and join group by invite code
- Invite code copy/share behind the chat menu
- Real-time chat with Socket.IO
- SQLite persistence
- Saved groups by username
- Message timestamps and date dividers
- Online presence shown as "In chat now"
- Lightweight profile cards for people currently in chat
- Typing indicators
- Message reactions with a larger emoji tray
- Reply UI with quoted reply previews
- Catch Up tab
- Important tab with readable labels
- Internal audit page
- Rule-based scoring and categorization foundation

Still intentionally rough:

- No real authentication yet
- No production hosting
- No mobile app wrapper
- No push notifications
- No AI summaries
- No moderation tools
- Scoring/categorization still needs serious Sprint 3 work

See [ROADMAP.md](./ROADMAP.md) for the broader product plan.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm start
```

CatchUp defaults to:

```text
http://localhost:5501
```

Windows shortcut:

```bat
start-catchup-5501.cmd
```

Internal audit page:

```text
http://localhost:5501/audit.html
```

## Demo Flow

1. Open `http://localhost:5501`.
2. Continue with a demo username, for example `Erik`.
3. Use `+ New` to create a group or join with an invite code.
4. Open a group from the dashboard.
5. Send messages like:

```text
lol
yo
need 3 sober drivers tonight
formal tickets due tomorrow
who's going downtown Friday?
party starts at 9
```

6. Hover or tap a message bubble to react, copy, or reply.
7. Use the three-dot chat menu to copy/share the invite code.
8. Open Important to see high-scoring messages.
9. Leave and rejoin the group to trigger Catch Up behavior.
10. Open `/audit.html` to inspect scores, matched rules, and manual ratings.

## Auth State

Auth is frontend scaffolding for now.

The main client state is organized around:

- `currentUser`
- `isAuthenticated`
- `authMode`
- `groups`
- `activeGroupId`

Demo sessions are stored locally. Real backend auth should replace the local/demo session functions in `public/app.js` later.

## Project Structure

```text
.
|-- server.js                  # Express, Socket.IO, routes, persistence orchestration
|-- src/
|   |-- db.js                  # SQLite setup and schema migration
|   `-- scoring.js             # Rule-based message scoring engine
|-- public/
|   |-- index.html             # Main app shell
|   |-- styles.css             # Main app styling
|   |-- app.js                 # Main frontend logic
|   |-- audit.html             # Internal audit page
|   |-- audit.css              # Audit page styling
|   `-- audit.js               # Audit page frontend logic
|-- ROADMAP.md                 # Product roadmap and sprint plan
|-- start-catchup-5501.cmd     # Windows local launcher
|-- start-catchup-5501.ps1     # Windows logged launcher
`-- work/                      # Scratch scripts and local verification helpers
```

## Data Model

SQLite database file:

```text
catchup.sqlite
```

Main tables:

- `users`
- `groups`
- `group_members`
- `messages`
- `reactions`
- `message_scores`
- `user_last_seen`
- `catchup_sessions`
- `catchup_items`
- `catchup_feedback`
- `signal_audits`

Messages also support reply metadata through `reply_to_message_id`.

Local database files should not be committed to GitHub. They are ignored by `.gitignore`.

## Scoring Engine

Scoring lives in:

```text
src/scoring.js
```

Every message gets:

- `baseScore`
- `reactionBoost`
- `finalScore`
- `signalCategory`
- `signalConfidence`
- `matchedRules`

Current categories:

- `plan`
- `event`
- `request`
- `deadline`
- `announcement`
- `question`
- `logistics`
- `noise`

Reaction boosts are capped so viral noise does not automatically become important.

## Simulation Evaluation

Run the deterministic scoring stress test with:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run simulate
```

or:

```bash
npm run simulate
```

The simulation creates an isolated database at `work/simulation/catchup-sim.sqlite`, generates thousands of realistic messages across social group types, simulates reactions and replies, scores everything, and writes reports to:

```text
work/simulation/reports/algorithm-evaluation.md
```

Raw exports live in `work/simulation/output/`, including scored messages, threshold analysis, false positives, false negatives, edge-case results, rule impact, and category confusion.

## Sprint 3 Focus

Sprint 3 should focus on really building the scoring and categorization algorithm.

High-priority Sprint 3 work:

- Improve `scoreMessage(text)` precision
- Add stronger category detection
- Expand and tune matched rules
- Reduce false positives in Important
- Better distinguish jokes/noise from logistics, plans, deadlines, and requests
- Add test fixtures for realistic college/group-chat messages
- Add automated tests for score thresholds and category output
- Use audit data to compare algorithm output against manual labels
- Make reaction boosts smarter without letting funny messages dominate

The UI is now good enough to support early testing. The next product risk is whether CatchUp can reliably identify what mattered.

## Editing Guide

Common changes:

- Update scoring rules: edit `src/scoring.js`
- Change database schema: edit `src/db.js`
- Change backend routes or Socket.IO events: edit `server.js`
- Change main app layout: edit `public/index.html`
- Change main app behavior: edit `public/app.js`
- Change main app styling: edit `public/styles.css`
- Change audit page: edit `public/audit.html`, `public/audit.js`, or `public/audit.css`
- Update product direction: edit `ROADMAP.md`

After changing backend code, restart the server.

After changing frontend code, hard-refresh the browser if stale UI appears.

## Product Boundary

Do not turn this into Slack.

Do not add task boards, formal event forms, or heavy productivity UI yet.

The core MVP question is still:

> Can CatchUp help someone understand what mattered without reading the whole chat?

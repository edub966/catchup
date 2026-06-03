# CatchUp MVP

CatchUp is a casual group chat app built around catch-up intelligence.

The product bet is simple:

> Important information can be extracted from chaotic social chat better than users can find it manually.

The app should feel like a social group chat first. The scoring system, Important feed, Catch Up view, and audit tools exist to prove whether the algorithm can find what mattered inside messy conversation.

## Sprint 1 Status

Current Sprint 1 foundation includes:

- Real-time group chat with Socket.IO
- SQLite persistence
- Username-based entry without auth
- Create group
- Join group with invite code
- Saved-chat homepage by username
- Message history
- Message reactions
- Rule-based message scoring
- Reaction score boosts
- Important tab
- Catch Up tab
- Catch-up feedback storage
- Internal audit page

Still intentionally rough:

- No real authentication
- No production hosting
- No mobile app
- No AI summaries
- No moderation
- No file uploads
- No polished onboarding

See [ROADMAP.md](./ROADMAP.md) for the full product plan.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm start
```

On this machine, VS Code is already using port `5500`, so CatchUp defaults to:

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
2. Enter a username, for example `Erik`.
3. Join the default group with invite code `KETCHUP`, or create a new group.
4. Send messages like:

```text
lol
need 3 sober drivers tonight
formal tickets due tomorrow
who's going downtown Friday?
party starts at 9
```

5. Open the Important tab to see high-scoring messages.
6. Leave and rejoin the group to trigger Catch Up behavior.
7. Open `/audit.html` to inspect scores, matched rules, and manual ratings.

## Project Structure

```text
.
├── server.js                  # Express, Socket.IO, routes, persistence orchestration
├── src/
│   ├── db.js                  # SQLite setup and schema migration
│   └── scoring.js             # Rule-based message scoring engine
├── public/
│   ├── index.html             # Main app shell
│   ├── styles.css             # Main app styling
│   ├── app.js                 # Main frontend logic
│   ├── audit.html             # Internal audit page
│   ├── audit.css              # Audit page styling
│   └── audit.js               # Audit page frontend logic
├── ROADMAP.md                 # Product roadmap and sprint plan
├── start-catchup-5501.cmd     # Windows local launcher
└── work/                      # Scratch scripts and local verification helpers
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

Reaction boosts:

- Pin: `+25`
- Check: `+15`
- Eyes: `+10`
- Question: `+10`
- Fire: `+8`
- Laugh: `+0`
- Skull: `+0`

Reaction boosts are capped so viral noise does not automatically become important.

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

## GitHub Workflow

Recommended first push:

```bash
git init
git add .
git commit -m "Build Sprint 1 CatchUp MVP foundation"
```

Then create a new empty GitHub repo and follow GitHub's `push an existing repository` instructions.

Recommended branch habit after the first push:

```bash
git checkout -b sprint-2-social-polish
```

Useful commit style:

```text
Add saved-chat homepage
Fix reaction scoring crash
Add audit page foundation
Tune message scoring rules
```

Do not commit:

- `node_modules/`
- `catchup.sqlite`
- `catchup.sqlite-shm`
- `catchup.sqlite-wal`
- temporary logs
- scratch verification output

## Sprint 2 Candidate Work

Good next targets:

- Make the homepage feel more like a real inbox
- Add clearer active group switching
- Improve reaction UI polish
- Add message context around Catch Up and Important items
- Add manual audit save states and filters
- Add CSV export for audit data
- Add a small seed-data script for demos
- Add automated tests for `scoreMessage`

## Product Boundary

Do not turn this into Slack.

Do not add task boards, formal event forms, or heavy productivity UI yet.

The core MVP question is still:

> Can CatchUp help someone understand what mattered without reading the whole chat?

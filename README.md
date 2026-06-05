# CatchUp MVP

CatchUp is a casual group chat app built around catch-up intelligence.

The product bet is simple:

> Important information can be extracted from chaotic social chat better than users can find it manually.

CatchUp should feel like a real social group chat first. The scoring system, Important feed, Catch Up view, and audit tools exist to prove whether the app can find what mattered inside messy conversation.

## Current Status

Sprint 3 is complete. CatchUp is ready to prepare for a small IRL alpha test focused on whether real users and auditors agree that the app is finding the right signal in messy chat.

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
- Rule-based scoring and categorization engine
- Slang, typo, abbreviation, and phrase-family normalization
- Social-domain scoring coverage across college/social group contexts
- Matched-rule explanations for audit/debugging
- Automated scoring regression tests
- Deterministic simulation and algorithm evaluation reports

Still intentionally rough:

- No real authentication yet
- No production hosting
- No mobile app wrapper
- No push notifications
- No AI summaries
- No moderation tools
- Alpha tester onboarding and audit workflow still need real-world validation

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

## Alpha Testing Prep

The next product goal is to get CatchUp in front of real alpha testers and collect audit data from actual messy social chats.

Use alpha testing to answer:

- Do users naturally send the kinds of chaotic messages CatchUp was built for?
- Does the Important tab feel helpful or noisy?
- Does Catch Up mode help users understand what they missed faster than reading everything?
- Which important messages are still missed?
- Which funny, vague, or low-value messages still get promoted?
- Do matched rules explain scoring well enough for tuning?

Recommended alpha setup:

1. Start the app locally or on a temporary host.
2. Create a few test groups that resemble real use cases: friend group, social/event group, roommate group, project/class group, club/team group.
3. Invite testers with group invite codes.
4. Ask them to use it like a normal group chat, not like a scripted QA form.
5. Let enough messages accumulate before judging the Important and Catch Up tabs.
6. Have an internal auditor review `/audit.html` after sessions and label messages as important or not important.
7. Export audit JSON from the audit page and compare manual labels against scores.

For now, do not optimize around a single tester reaction. The useful data is repeated patterns: consistent false positives, consistent false negatives, confusing categories, and missing slang/domain language.

## Audit Workflow

Open:

```text
http://localhost:5501/audit.html
```

For each recent message, review:

- `base`: score from message text alone
- `boost`: reaction score added after reactions
- `final`: score used by Important and Catch Up
- `confidence`: how strongly the rules think they understood the message
- `category`: predicted signal type
- `matched rules`: exact scoring reasons, including IDs, labels, and deltas

Manual audit labels:

- `Important`: the message genuinely belongs in the Important feed
- `Not important`: the message should not have been promoted
- `Correct category`: use this when the score was reasonable but the category was wrong
- `Audit notes`: record why a message was missed or falsely promoted

Useful audit notes look like:

```text
False negative: "be there by 8" mattered but did not mention event name.
False positive: funny message used "deadline" as a joke.
Wrong category: ride request scored as event instead of logistics.
Slang gap: "spkrs" should mean speakers.
```

After a session, use the audit export to tune `src/scoring.js` and add regression coverage in `test/`.

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

Sprint 3.5 added a wider deterministic language layer for:

- slang and abbreviations such as `tmr`, `tn`, `tix`, `mtg`, `spkrs`, `drvr`
- typo-tolerant high-value terms
- deadline/payment phrase families
- event/time phrase families
- change/cancellation/update phrase families
- request/help/logistics phrase families
- group-specific language for social, club, sports, DJ/promoter, project/class, roommate, trip, church, dinner, birthday, and gym contexts
- false-positive guards for joke phrases using important-looking words

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

Latest Sprint 3.5 simulation headline:

- 4,960 simulated messages
- 25 social group contexts
- Precision at Important threshold 65: about 86%
- Recall at Important threshold 65: about 79%
- Threshold 60 is plausible for broader beta learning
- Threshold 65 remains better for a more curated Important feed
- False-positive trap stress stayed contained in the latest run

Read the generated report:

```text
work/simulation/reports/algorithm-evaluation.md
```

## Next Steps

Prepare for IRL alpha testing:

- Decide whether testers will run against a local machine, LAN address, tunnel, or temporary hosted instance.
- Create a short tester script that explains only the basics: join group, chat normally, react/reply normally, check Important and Catch Up after some activity.
- Create an auditor checklist for reviewing `/audit.html`.
- Seed a few initial groups if needed, but avoid over-scripting tester behavior.
- Run `npm test` before each tester session.
- Run `npm run simulate` after scoring changes to catch regressions.
- Save exported audit JSON after each alpha session.
- Turn repeated audit findings into scoring fixtures and regression tests.

The next product risk is no longer "can the scorer handle obvious examples?" It is whether real users produce new shorthand, context-dependent messages, and social noise that the current deterministic language layer does not yet understand.

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

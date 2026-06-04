# CatchUp Scoring

CatchUp scores messages with deterministic rules in `src/scoring.js`. The goal is precision: obvious signal should rise into Important, while jokes, hype, emoji-only replies, and vague one-liners should stay out.

## Output

`scoreMessage(text, reactions?)` returns:

```js
{
  baseScore,
  reactionBoost,
  finalScore,
  signalCategory,
  signalConfidence,
  matchedRules
}
```

Scores are clamped from 0 to 100. `matchedRules` contains human-readable rule objects with `id`, `label`, `delta`, `points`, and `category`. `points` is kept as a compatibility alias for older UI code.

## How Scores Are Calculated

The base score is the sum of three rule groups:

- Signal rules: deadlines, concrete requests, transportation, supplies, event times, planning questions, commitments, and announcements.
- Context rules: combinations that make a message more useful, such as deadline plus date, event plus time, or request plus tonight.
- Penalty rules: short replies, laughter-only messages, emoji-only messages, hype-only messages, repeated spam, and casual question traps.

Dates and event words are intentionally weak by themselves. For example, `Friday` and `party` should not become Important unless they appear with concrete planning details.

## Categories

- `deadline`: due dates, tickets, dues, forms, payments, cutoffs.
- `request`: asks someone to do, bring, send, cover, or help with something concrete.
- `logistics`: rides, drivers, Ubers, pickups, supplies, setup details.
- `announcement`: moved, changed, canceled, mandatory, reminder, or update messages.
- `event`: parties, tailgates, rush, chapter, meetings, games, mixers with useful details.
- `plan`: who is going, where to meet, when to leave, availability.
- `question`: useful but weaker questions without enough concrete planning context.
- `noise`: jokes, spam, emoji-only messages, vague replies, or low-score content.

## Score Ranges

- `0-24`: noise or too vague to save.
- `25-44`: maybe useful, usually not enough for Catch Up.
- `45-59`: medium signal that may be useful with reactions or recent context.
- `60-64`: Catch Up eligible, just below Important.
- `65-100`: Important candidate.

The current app thresholds are around 60 for Catch Up and 65 for Important.

## Reaction Boosts

Reactions validate signal but cannot turn a viral joke into Important.

- Pin: strong boost.
- Check: moderate/strong boost.
- Eyes: moderate boost.
- Question: moderate boost.
- Fire: small boost only.
- Laugh and skull: no importance boost.

Boost caps depend on base score:

- Low base score under 25: max boost 8.
- Medium base score under 45: max boost 18.
- Strong base score 45 or higher: max boost 30.

## Examples

High signal:

- `formal tickets due tomorrow`
- `need 3 sober drivers tonight`
- `party starts at 9`
- `chapter moved to Thursday`
- `submit dues by Sunday`

Medium signal:

- `anyone going out tonight?`
- `where are we meeting?`
- `I can drive after 10`
- `bring drinks if you have any`

Low signal or noise:

- `lol`
- `bro`
- `Friday`
- `party`
- `can someone explain why bro said that`
- emoji-only messages

## Tuning Rules

Add or tune rules in small steps:

1. Add or update a fixture in `test/scoring.fixtures.js`.
2. Give the fixture a category and score band, not one exact score.
3. Add or adjust one focused rule in `src/scoring.js`.
4. Run `npm test`.
5. Check the audit page to inspect matched rule IDs, labels, deltas, category, confidence, and final score.

Known limitation: the engine does not understand deep conversational context. A short reply like `yes I can` may be important if it answers a previous request, but the scorer only sees the message text and reactions.

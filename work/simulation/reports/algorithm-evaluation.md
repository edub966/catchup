# CatchUp Algorithm Simulation Evaluation

## Executive Summary

This simulation generated 2745 messages across 15 realistic social groups with 28 simulated users, 2690 reactions, and 427 replies. The current Important threshold is 65.

At threshold 65, precision is **86.8%** and recall is **53.9%**. Category accuracy is **87.4%**. The system showed 523 messages in the simulated Important feed, with 69 false positives and 389 false negatives.

The strongest threshold by F1 in this run was **55** with precision 76.8% and recall 64.8%. Threshold 65 is not the strongest F1 point in this simulation; see the threshold table before changing product defaults.

The algorithm is useful enough for early testing if the product goal is high precision, but it still misses casual important messages and typo/slang variants. The biggest risk is not viral jokes from reactions; reaction caps worked well in this run. The bigger risk is sparse, context-dependent messages that real users understand but rules cannot.

In plain English: CatchUp is currently acting like a careful editor, not a maximal safety net. It is fairly good at keeping obvious junk out of Important, but it still needs tuning before users should trust it to catch every actionable detail in a messy chat.

## Simulation Methodology

- Seed: 20260604
- Simulated users: 28
- Simulated groups: 15
- Total messages: 2745
- Ground truth: 843 important, 833 maybe, 1069 noise
- Explicit edge cases: 45
- Reactions: 2690, assigned according to message context
- Replies: 427, assigned to prior messages in the same group
- Isolated database: `work\simulation\catchup-sim.sqlite`

Messages were generated from group-specific conversation templates plus an explicit adversarial edge-case suite. Every message carries ground truth importance, expected category, scenario tag, and notes. The simulation scores each message twice: once without reactions and once with simulated reactions, so the report can isolate reaction impact.

Ground truth labels mean: `important` should belong in the Important feed, `maybe` is useful context but not necessarily Important, and `noise` should stay out. This matters because a false positive can be either true junk or a maybe-useful message that the product chose to surface too aggressively.

## Charts

![Average score by label](charts/score-by-label.svg)

![Threshold precision recall](charts/threshold-precision-recall.svg)

![False positives by group](charts/false-positives-by-group.svg)

![Category confusion](charts/category-confusion.svg)

![Average score by category](charts/category-average-score.svg)

![Top false-positive rules](charts/top-false-positive-rules.svg)

## Overall Metrics

| Threshold | Shown | Precision | Recall | False Positives | False Negatives | FPR | FNR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 65 | 523 | 86.8% | 53.9% | 69 | 389 | 3.6% | 46.1% |

How to read this finding:

- Precision answers: when CatchUp shows a message in Important, how often is it truly important? Here, 86.8% means the feed is fairly trustworthy, but roughly 69 shown messages were still not ground-truth important.
- Recall answers: of all truly important messages, how many did CatchUp catch? Here, 53.9% means the algorithm missed 389 important messages, so the current system is more conservative than comprehensive.
- False positive rate is low at 3.6%, which is good for avoiding a junk-filled Important tab. False negative rate is high at 46.1%, which is the main product risk if users rely on CatchUp as their only way to catch up.
- Category accuracy at 87.4% means the scorer usually names the right kind of signal once it sees one, but category accuracy is less important than precision/recall for the core product promise.

## Threshold Sensitivity

| Threshold | Shown | Precision | Recall | False Positives | False Negatives |
| --- | --- | --- | --- | --- | --- |
| 55 | 711 | 76.8% | 64.8% | 165 | 297 |
| 60 | 577 | 85.4% | 58.5% | 84 | 350 |
| 65 | 523 | 86.8% | 53.9% | 69 | 389 |
| 70 | 470 | 86.6% | 48.3% | 63 | 436 |
| 75 | 406 | 92.6% | 44.6% | 30 | 467 |
| 80 | 358 | 91.6% | 38.9% | 30 | 515 |

What this means:

- Lower thresholds show more messages and recover more important content, but they also increase noise. Threshold 55 had the best F1 balance here because it caught 64.8% of important messages while keeping precision at 76.8%.
- The current threshold 65 is more precision-oriented: it shows 523 messages, with 69 false positives and 389 false negatives. That is a deliberate "better to miss than flood" posture.
- Product decision: keep 65 if the Important tab must feel highly curated during early demos. Test 55 or 60 if users complain that CatchUp misses too many useful messages.

## Score By Ground Truth Label

| Label | Count | Avg Base | Avg Boost | Avg Final |
| --- | --- | --- | --- | --- |
| maybe | 833 | 34.5 | 4.4 | 38.9 |
| important | 843 | 55.0 | 10.8 | 64.5 |
| noise | 1069 | 4.6 | 1.0 | 5.6 |

Interpretation:

- Important messages average 64.5, which sits just below the current threshold. That explains the recall problem: many important messages are close, but not quite high enough.
- Maybe messages average 38.9, which is comfortably below Important. This is healthy because maybe-useful chatter should not dominate the feed.
- Noise averages 5.6, so the noise penalties and reaction caps are doing their basic job.
- The practical tuning target is not separating noise from important; that already works. The hard part is lifting terse but genuinely important logistics without also lifting vague maybe messages.

## Group-by-Group Breakdown

### House Dinner Crew

Type: Food/social planning chat. Messages: 180. Active simulated users: 16. Mix: 55 important, 55 maybe, 70 noise.

Precision 57.1%, recall 7.3%, category accuracy 82.8%, average score 27.8. False positives: 3. False negatives: 51.

Finding: Lower precision means this group has language that makes maybe/noise messages look actionable. Low recall means this group uses wording the current rules do not understand well enough. False negatives are the first place to inspect if this group feels under-served; false positives are the first place to inspect if its Important tab feels noisy.

Representative messages:

| Text | Group | Expected | Score | Reactions | Rules |
| --- | --- | --- | --- | --- | --- |
| can someone bring plates | House Dinner Crew | important/request | 34 (request) | {} | request.can-someone (+24), question.intent (+10) |
| I can drive after 10 | House Dinner Crew | maybe/logistics | 42 (logistics) | {} | logistics.transport (+20), commitment.availability (+22) |
| absolute cinema | House Dinner Crew | noise/noise | 6 (noise) | {"🔥":2,"💀":3,"😂":3} | noise.hype-only (-24), noise.vague-short (-12) |
| are we still doing the same place? | House Dinner Crew | maybe/question | 10 (noise) | {"😂":1} | question.intent (+10) |

### Basement Set Team

Type: DJ/promoter group. Messages: 184. Active simulated users: 16. Mix: 56 important, 57 maybe, 71 noise.

Precision 72.7%, recall 14.3%, category accuracy 80.4%, average score 25.5. False positives: 3. False negatives: 48.

Finding: Lower precision means this group has language that makes maybe/noise messages look actionable. Low recall means this group uses wording the current rules do not understand well enough. False negatives are the first place to inspect if this group feels under-served; false positives are the first place to inspect if its Important tab feels noisy.

Representative messages:

| Text | Group | Expected | Score | Reactions | Rules |
| --- | --- | --- | --- | --- | --- |
| does anyone have tickets left? | Basement Set Team | maybe/request | 46 (request) | {"😂":1} | deadline.payment (+18), request.ticket-availability (+18), question.intent (+10) |
| go go go go | Basement Set Team | noise/noise | 6 (noise) | {"😂":4,"🔥":2} | noise.repeated (-16), noise.vague-short (-12) |
| tickets close tonight | Basement Set Team | important/deadline | 76 (deadline) | {} | deadline.explicit (+32), deadline.payment (+18), time.relative (+8), deadline.date-context (+18) |
| soundcheck at 5, doors at 8 | Basement Set Team | important/event | 40 (event) | {} | event.starts-time (+28), time.explicit (+12) |

### Kappa Event Crew

Type: Sorority event planning chat. Messages: 185. Active simulated users: 16. Mix: 57 important, 55 maybe, 73 noise.

Precision 80.7%, recall 80.7%, category accuracy 88.1%, average score 39.4. False positives: 11. False negatives: 11.

Finding: Good precision means most surfaced messages are worth reading, though some maybe/noise items still leak in. Strong recall means the scorer catches most important items in this context. False negatives are the first place to inspect if this group feels under-served; false positives are the first place to inspect if its Important tab feels noisy.

Representative messages:

| Text | Group | Expected | Score | Reactions | Rules |
| --- | --- | --- | --- | --- | --- |
| I could drive tomorrow | Kappa Event Crew | maybe/logistics | 50 (logistics) | {} | logistics.transport (+20), commitment.availability (+22), time.relative (+8) |
| forms are due by 5pm | Kappa Event Crew | important/deadline | 88 (deadline) | {"👀":1} | deadline.explicit (+32), deadline.payment (+18), time.explicit (+12), deadline.date-context (+18) |
| forms are due by 5pm | Kappa Event Crew | important/deadline | 92 (deadline) | {"✅":1} | deadline.explicit (+32), deadline.payment (+18), time.explicit (+12), deadline.date-context (+18) |
| who has the speaker? | Kappa Event Crew | maybe/question | 10 (noise) | {} | question.intent (+10) |

### Rush Week Leads

Type: Recruitment logistics chat. Messages: 180. Active simulated users: 17. Mix: 55 important, 55 maybe, 70 noise.

Precision 82.1%, recall 41.8%, category accuracy 85.0%, average score 31.7. False positives: 5. False negatives: 32.

Finding: Good precision means most surfaced messages are worth reading, though some maybe/noise items still leak in. Low recall means this group uses wording the current rules do not understand well enough. False negatives are the first place to inspect if this group feels under-served; false positives are the first place to inspect if its Important tab feels noisy.

Representative messages:

| Text | Group | Expected | Score | Reactions | Rules |
| --- | --- | --- | --- | --- | --- |
| formal apology incoming | Rush Week Leads | noise/noise | 12 (noise) | {} | event.social-anchor (+12) |
| bro | Rush Week Leads | noise/noise | 3 (noise) | {"💀":3,"😂":3,"🔥":1} | noise.one-word (-18), noise.casual-reply (-28), noise.vague-short (-12) |
| bro said formal like he owns the place | Rush Week Leads | noise/noise | 18 (noise) | {"🔥":2,"💀":1} | event.social-anchor (+12) |
| who all is going Friday? | Rush Week Leads | maybe/plan | 45 (plan) | {"👀":1,"😂":1} | plan.whos-going (+20), time.weekday (+7), question.intent (+10) |

### Campus Volunteer Board

Type: Student organization/club. Messages: 185. Active simulated users: 18. Mix: 59 important, 56 maybe, 70 noise.

Precision 83.8%, recall 52.5%, category accuracy 94.6%, average score 37.2. False positives: 6. False negatives: 28.

Finding: Good precision means most surfaced messages are worth reading, though some maybe/noise items still leak in. Middle recall means CatchUp catches obvious signal but misses a meaningful number of terse or context-heavy messages. False negatives are the first place to inspect if this group feels under-served; false positives are the first place to inspect if its Important tab feels noisy.

Representative messages:

| Text | Group | Expected | Score | Reactions | Rules |
| --- | --- | --- | --- | --- | --- |
| meeting moved to the library room 310 | Campus Volunteer Board | important/announcement | 54 (announcement) | {"✅":1} | event.social-anchor (+12), announcement.change (+30) |
| rush hour traffic sucks | Campus Volunteer Board | noise/noise | 12 (noise) | {} | event.social-anchor (+12) |
| volunteer forms are due tomorrow | Campus Volunteer Board | important/deadline | 100 (deadline) | {"✅":1,"👀":1} | deadline.explicit (+32), deadline.payment (+18), time.relative (+8), deadline.date-context (+18), structure.concrete-details (+8) |
| submit budget requests by Friday | Campus Volunteer Board | important/deadline | 91 (deadline) | {"👀":1} | deadline.explicit (+32), deadline.payment (+18), time.weekday (+7), deadline.date-context (+18), structure.concrete-details (+8) |

### Downtown Survivors

Type: College friend group. Messages: 185. Active simulated users: 17. Mix: 58 important, 55 maybe, 72 noise.

Precision 84.4%, recall 46.6%, category accuracy 82.7%, average score 31.2. False positives: 5. False negatives: 31.

Finding: Good precision means most surfaced messages are worth reading, though some maybe/noise items still leak in. Middle recall means CatchUp catches obvious signal but misses a meaningful number of terse or context-heavy messages. False negatives are the first place to inspect if this group feels under-served; false positives are the first place to inspect if its Important tab feels noisy.

Representative messages:

| Text | Group | Expected | Score | Reactions | Rules |
| --- | --- | --- | --- | --- | --- |
| are we still doing the same place? | Downtown Survivors | maybe/question | 18 (noise) | {"❓":1,"👀":1,"✅":1} | question.intent (+10) |
| why is bro like this? | Downtown Survivors | noise/noise | 13 (noise) | {"💀":1,"😂":1,"🔥":1} | question.intent (+10) |
| meeting my downfall rn | Downtown Survivors | noise/noise | 12 (noise) | {} | event.social-anchor (+12) |
| bring drinks if you have any | Downtown Survivors | maybe/logistics | 25 (logistics) | {"😂":1} | logistics.supplies (+25) |

### Club Soccer

Type: Sports team. Messages: 185. Active simulated users: 15. Mix: 58 important, 57 maybe, 70 noise.

Precision 84.4%, recall 65.5%, category accuracy 78.4%, average score 35.4. False positives: 7. False negatives: 20.

Finding: Good precision means most surfaced messages are worth reading, though some maybe/noise items still leak in. Middle recall means CatchUp catches obvious signal but misses a meaningful number of terse or context-heavy messages. False negatives are the first place to inspect if this group feels under-served; false positives are the first place to inspect if its Important tab feels noisy.

Representative messages:

| Text | Group | Expected | Score | Reactions | Rules |
| --- | --- | --- | --- | --- | --- |
| no shot | Club Soccer | noise/noise | 0 (noise) | {} | noise.hype-only (-24), noise.vague-short (-12) |
| fire | Club Soccer | noise/noise | 0 (noise) | {} | noise.one-word (-18), noise.casual-reply (-28), noise.vague-short (-12) |
| 🔥🔥🔥 | Club Soccer | noise/noise | 0 (noise) | {} | noise.one-word (-18), noise.emoji-only (-35), noise.vague-short (-12) |
| bring both jerseys tomorrow | Club Soccer | important/logistics | 16 (noise) | {"📌":1} | time.relative (+8) |

### Apartment 4B

Type: Apartment/roommate chat. Messages: 184. Active simulated users: 15. Mix: 56 important, 55 maybe, 73 noise.

Precision 86.4%, recall 33.9%, category accuracy 91.3%, average score 28.7. False positives: 3. False negatives: 37.

Finding: Good precision means most surfaced messages are worth reading, though some maybe/noise items still leak in. Low recall means this group uses wording the current rules do not understand well enough. False negatives are the first place to inspect if this group feels under-served; false positives are the first place to inspect if its Important tab feels noisy.

Representative messages:

| Text | Group | Expected | Score | Reactions | Rules |
| --- | --- | --- | --- | --- | --- |
| I can bring cups | Apartment 4B | maybe/logistics | 35 (logistics) | {} | logistics.supplies (+25), commitment.availability (+22), noise.vague-short (-12) |
| cleaning inspection moved to Thursday | Apartment 4B | important/announcement | 59 (announcement) | {"👀":1} | announcement.change (+30), time.weekday (+7), announcement.date-context (+14) |
| need bro to retire | Apartment 4B | noise/noise | 0 (noise) | {} |  |
| ???????? | Apartment 4B | noise/noise | 0 (noise) | {} | question.intent (+10), noise.one-word (-18), noise.repeated (-16), noise.vague-short (-12) |

### Weekend Festival Run

Type: Festival/social trip chat. Messages: 180. Active simulated users: 17. Mix: 55 important, 55 maybe, 70 noise.

Precision 87.2%, recall 61.8%, category accuracy 86.1%, average score 35.9. False positives: 5. False negatives: 21.

Finding: Good precision means most surfaced messages are worth reading, though some maybe/noise items still leak in. Middle recall means CatchUp catches obvious signal but misses a meaningful number of terse or context-heavy messages. False negatives are the first place to inspect if this group feels under-served; false positives are the first place to inspect if its Important tab feels noisy.

Representative messages:

| Text | Group | Expected | Score | Reactions | Rules |
| --- | --- | --- | --- | --- | --- |
| might go downtown later | Weekend Festival Run | maybe/noise | 20 (noise) | {"👀":1,"😂":1} | event.social-anchor (+12) |
| tickets close tonight | Weekend Festival Run | important/deadline | 76 (deadline) | {} | deadline.explicit (+32), deadline.payment (+18), time.relative (+8), deadline.date-context (+18) |
| where are we meeting? | Weekend Festival Run | maybe/plan | 58 (plan) | {"❓":1} | event.social-anchor (+12), plan.leaving-meeting (+20), question.intent (+10), question.event-context (+8) |
| pregame at the house? | Weekend Festival Run | maybe/question | 30 (question) | {} | event.social-anchor (+12), question.intent (+10), question.event-context (+8) |

### The Big One

Type: Large chaotic general social chat. Messages: 184. Active simulated users: 16. Mix: 57 important, 55 maybe, 72 noise.

Precision 88.7%, recall 82.5%, category accuracy 93.5%, average score 39.8. False positives: 6. False negatives: 10.

Finding: Good precision means most surfaced messages are worth reading, though some maybe/noise items still leak in. Strong recall means the scorer catches most important items in this context. False negatives are the first place to inspect if this group feels under-served; false positives are the first place to inspect if its Important tab feels noisy.

Representative messages:

| Text | Group | Expected | Score | Reactions | Rules |
| --- | --- | --- | --- | --- | --- |
| need bro to retire | The Big One | noise/noise | 0 (noise) | {} |  |
| lol | The Big One | noise/noise | 0 (noise) | {} | noise.one-word (-18), noise.laughter (-35), noise.vague-short (-12) |
| are we still doing the same place? | The Big One | maybe/question | 10 (noise) | {} | question.intent (+10) |
| are we still doing the same place? | The Big One | maybe/question | 10 (noise) | {} | question.intent (+10) |

### Lot 14 Tailgate

Type: Tailgate/party planning chat. Messages: 184. Active simulated users: 18. Mix: 56 important, 55 maybe, 73 noise.

Precision 90.4%, recall 83.9%, category accuracy 93.5%, average score 37.0. False positives: 5. False negatives: 9.

Finding: Very high precision means this group's Important feed is trusted, but it may still miss quieter important messages. Strong recall means the scorer catches most important items in this context. False negatives are the first place to inspect if this group feels under-served; false positives are the first place to inspect if its Important tab feels noisy.

Representative messages:

| Text | Group | Expected | Score | Reactions | Rules |
| --- | --- | --- | --- | --- | --- |
| setup moved to 10am | Lot 14 Tailgate | important/announcement | 74 (announcement) | {"✅":1,"👀":1} | announcement.change (+30), time.explicit (+12), announcement.date-context (+14) |
| need two drivers for the cooler run | Lot 14 Tailgate | important/logistics | 85 (logistics) | {"✅":1} | request.concrete-need (+28), logistics.transport (+20), logistics.supplies (+25) |
| what time is tailgate again | Lot 14 Tailgate | maybe/question | 30 (question) | {} | event.social-anchor (+12), question.intent (+10), question.event-context (+8) |
| party animal | Lot 14 Tailgate | noise/noise | 0 (noise) | {} | event.social-anchor (+12), noise.vague-short (-12) |

### Econ 302 Project

Type: Group project/class chat. Messages: 184. Active simulated users: 17. Mix: 55 important, 57 maybe, 72 noise.

Precision 90.5%, recall 34.5%, category accuracy 85.3%, average score 31.4. False positives: 2. False negatives: 36.

Finding: Very high precision means this group's Important feed is trusted, but it may still miss quieter important messages. Low recall means this group uses wording the current rules do not understand well enough. False negatives are the first place to inspect if this group feels under-served; false positives are the first place to inspect if its Important tab feels noisy.

Representative messages:

| Text | Group | Expected | Score | Reactions | Rules |
| --- | --- | --- | --- | --- | --- |
| pregame at the house? | Econ 302 Project | maybe/question | 30 (question) | {} | event.social-anchor (+12), question.intent (+10), question.event-context (+8) |
| bro said formal like he owns the place | Econ 302 Project | noise/noise | 12 (noise) | {} | event.social-anchor (+12) |
| who all is going Friday? | Econ 302 Project | maybe/plan | 45 (plan) | {"❓":1} | plan.whos-going (+20), time.weekday (+7), question.intent (+10) |
| 🔥🔥🔥 | Econ 302 Project | noise/noise | 0 (noise) | {} | noise.one-word (-18), noise.emoji-only (-35), noise.vague-short (-12) |

### Formal Bus 2

Type: Event transportation chat. Messages: 180. Active simulated users: 18. Mix: 55 important, 55 maybe, 70 noise.

Precision 90.6%, recall 52.7%, category accuracy 86.7%, average score 32.1. False positives: 3. False negatives: 26.

Finding: Very high precision means this group's Important feed is trusted, but it may still miss quieter important messages. Middle recall means CatchUp catches obvious signal but misses a meaningful number of terse or context-heavy messages. False negatives are the first place to inspect if this group feels under-served; false positives are the first place to inspect if its Important tab feels noisy.

Representative messages:

| Text | Group | Expected | Score | Reactions | Rules |
| --- | --- | --- | --- | --- | --- |
| does anyone have tickets left? | Formal Bus 2 | maybe/request | 46 (request) | {} | deadline.payment (+18), request.ticket-availability (+18), question.intent (+10) |
| who let him cook? | Formal Bus 2 | noise/noise | 0 (noise) | {} | question.intent (+10), noise.vague-short (-12) |
| pickup moved to the back lot | Formal Bus 2 | important/announcement | 48 (announcement) | {"✅":1,"👀":1} | announcement.change (+30) |
| need one more sober driver | Formal Bus 2 | important/logistics | 100 (logistics) | {"📌":1} | request.concrete-need (+28), logistics.transport (+20), logistics.sober-drivers (+30) |

### Pledge Class 28

Type: Fraternity pledge chat. Messages: 185. Active simulated users: 15. Mix: 56 important, 56 maybe, 73 noise.

Precision 93.2%, recall 98.2%, category accuracy 95.1%, average score 41.7. False positives: 4. False negatives: 1.

Finding: Very high precision means this group's Important feed is trusted, but it may still miss quieter important messages. Strong recall means the scorer catches most important items in this context. False negatives are the first place to inspect if this group feels under-served; false positives are the first place to inspect if its Important tab feels noisy.

Representative messages:

| Text | Group | Expected | Score | Reactions | Rules |
| --- | --- | --- | --- | --- | --- |
| might go downtown later | Pledge Class 28 | maybe/noise | 12 (noise) | {} | event.social-anchor (+12) |
| chapter moved to Thursday at 6 | Pledge Class 28 | important/announcement | 100 (announcement) | {"✅":1,"📌":1} | event.social-anchor (+12), event.meeting-time (+24), announcement.change (+30), time.weekday (+7), time.explicit (+12) |
| chapter moved to Thursday at 6 | Pledge Class 28 | important/announcement | 100 (announcement) | {"👀":1} | event.social-anchor (+12), event.meeting-time (+24), announcement.change (+30), time.weekday (+7), time.explicit (+12) |
| does anyone have tickets left? | Pledge Class 28 | maybe/request | 46 (request) | {} | deadline.payment (+18), request.ticket-availability (+18), question.intent (+10) |

### Intramural Hoops

Type: Sports pickup team. Messages: 180. Active simulated users: 15. Mix: 55 important, 55 maybe, 70 noise.

Precision 96.4%, recall 49.1%, category accuracy 87.2%, average score 32.5. False positives: 1. False negatives: 28.

Finding: Very high precision means this group's Important feed is trusted, but it may still miss quieter important messages. Middle recall means CatchUp catches obvious signal but misses a meaningful number of terse or context-heavy messages. False negatives are the first place to inspect if this group feels under-served; false positives are the first place to inspect if its Important tab feels noisy.

Representative messages:

| Text | Group | Expected | Score | Reactions | Rules |
| --- | --- | --- | --- | --- | --- |
| need one more for tipoff | Intramural Hoops | important/request | 46 (request) | {"✅":1,"👀":1} | request.concrete-need (+28) |
| bro | Intramural Hoops | noise/noise | 0 (noise) | {} | noise.one-word (-18), noise.casual-reply (-28), noise.vague-short (-12) |
| game moved to court 3 at 8 | Intramural Hoops | important/announcement | 100 (announcement) | {"👀":1} | event.social-anchor (+12), announcement.change (+30), time.explicit (+12), event.concrete-time (+16), announcement.date-context (+14) |
| does anyone have tickets left? | Intramural Hoops | maybe/request | 54 (request) | {"❓":1} | deadline.payment (+18), request.ticket-availability (+18), question.intent (+10) |

## Hardest Groups

These are the groups where the scorer looked weakest in this run. Hard groups usually reveal one of three problems: the group uses domain-specific shorthand, the important messages are too terse for single-message scoring, or maybe/noise messages contain words that look actionable.

| Group | Type | Precision | Recall | FP | FN | Category Acc |
| --- | --- | --- | --- | --- | --- | --- |
| House Dinner Crew | Food/social planning chat | 57.1% | 7.3% | 3 | 51 | 82.8% |
| Basement Set Team | DJ/promoter group | 72.7% | 14.3% | 3 | 48 | 80.4% |
| Kappa Event Crew | Sorority event planning chat | 80.7% | 80.7% | 11 | 11 | 88.1% |
| Rush Week Leads | Recruitment logistics chat | 82.1% | 41.8% | 5 | 32 | 85.0% |
| Campus Volunteer Board | Student organization/club | 83.8% | 52.5% | 6 | 28 | 94.6% |

## Message Examples

How to use these examples:

- True positives show the patterns the algorithm understands well. These are rule combinations worth preserving during tuning.
- False positives show messages that would annoy users because they appear in Important despite not being ground-truth important.
- False negatives are the most valuable tuning examples because they are real misses. They show what users might still have to find manually.
- Ambiguous calls are not necessarily bugs. They show the gray zone where product judgment matters: should CatchUp be quiet, or should it surface more maybe-useful coordination?
- Reaction-sensitive rows show whether reactions are acting as validation or accidentally overpowering the text score.

### Highest-Scoring True Positives

| Text | Group | Expected | Score | Reactions | Rules |
| --- | --- | --- | --- | --- | --- |
| chapter moved to Thursday at 6 | Pledge Class 28 | important/announcement | 100 (announcement) | {"✅":1,"📌":1} | event.social-anchor (+12), event.meeting-time (+24), announcement.change (+30), time.weekday (+7), time.explicit (+12) |
| chapter moved to Thursday at 6 | Pledge Class 28 | important/announcement | 100 (announcement) | {"👀":1} | event.social-anchor (+12), event.meeting-time (+24), announcement.change (+30), time.weekday (+7), time.explicit (+12) |
| we need one more for the Uber leaving at 9 | Pledge Class 28 | important/logistics | 100 (logistics) | {"✅":1} | request.concrete-need (+28), logistics.transport (+20), time.explicit (+12), logistics.uber-count (+20), structure.concrete-details (+8) |
| chapter moved to Thursday at 6 | Pledge Class 28 | important/announcement | 100 (announcement) | {"👀":1} | event.social-anchor (+12), event.meeting-time (+24), announcement.change (+30), time.weekday (+7), time.explicit (+12) |
| chapter moved to Thursday at 6 | Pledge Class 28 | important/announcement | 100 (announcement) | {"✅":1} | event.social-anchor (+12), event.meeting-time (+24), announcement.change (+30), time.weekday (+7), time.explicit (+12) |
| formal tickets are due by midnight tomorrow | Pledge Class 28 | important/deadline | 100 (deadline) | {"✅":1,"👀":1} | deadline.explicit (+32), deadline.payment (+18), event.social-anchor (+12), time.relative (+8), time.explicit (+12) |
| can someone bring speakers to the pregame | Pledge Class 28 | important/request | 100 (request) | {"👀":1,"📌":1} | request.can-someone (+24), logistics.supplies (+25), event.social-anchor (+12), question.intent (+10), request.bring-supplies (+14) |
| need 3 sober drivers tonight for formal | Pledge Class 28 | important/logistics | 100 (logistics) | {"✅":1} | request.concrete-need (+28), logistics.transport (+20), logistics.sober-drivers (+30), event.social-anchor (+12), time.relative (+8) |
| chapter moved to Thursday at 6 | Pledge Class 28 | important/announcement | 100 (announcement) | {"✅":1} | event.social-anchor (+12), event.meeting-time (+24), announcement.change (+30), time.weekday (+7), time.explicit (+12) |
| formal tickets are due by midnight tmr | Pledge Class 28 | important/deadline | 100 (deadline) | {} | deadline.explicit (+32), deadline.payment (+18), event.social-anchor (+12), time.explicit (+12), deadline.date-context (+18) |
| formal tickets are due by midnight tomorrow | Pledge Class 28 | important/deadline | 100 (deadline) | {"✅":1} | deadline.explicit (+32), deadline.payment (+18), event.social-anchor (+12), time.relative (+8), time.explicit (+12) |
| we need one more for the Uber leaving at 9 | Pledge Class 28 | important/logistics | 100 (logistics) | {"✅":1,"👀":1,"📌":1} | request.concrete-need (+28), logistics.transport (+20), time.explicit (+12), logistics.uber-count (+20), structure.concrete-details (+8) |

### Worst False Positives

| Text | Group | Expected | Score | Reactions | Rules |
| --- | --- | --- | --- | --- | --- |
| anyone able to grab snacks? | Basement Set Team | maybe/request | 93 (request) | {"👀":1,"✅":1} | request.can-someone (+24), logistics.supplies (+25), question.intent (+10), request.bring-supplies (+14) |
| anyone able to grab snacks? | Econ 302 Project | maybe/request | 93 (request) | {"👀":1,"✅":1} | request.can-someone (+24), logistics.supplies (+25), question.intent (+10), request.bring-supplies (+14) |
| anyone able to grab snacks? | Lot 14 Tailgate | maybe/request | 89 (request) | {"❓":1,"👀":1,"😂":1} | request.can-someone (+24), logistics.supplies (+25), question.intent (+10), request.bring-supplies (+14) |
| anyone able to grab snacks? | Kappa Event Crew | maybe/request | 85 (request) | {"✅":1} | request.can-someone (+24), logistics.supplies (+25), question.intent (+10), request.bring-supplies (+14) |
| anyone able to grab snacks? | The Big One | maybe/request | 85 (request) | {"✅":1,"😂":1} | request.can-someone (+24), logistics.supplies (+25), question.intent (+10), request.bring-supplies (+14) |
| anyone able to grab snacks? | Rush Week Leads | maybe/request | 85 (request) | {"✅":1} | request.can-someone (+24), logistics.supplies (+25), question.intent (+10), request.bring-supplies (+14) |
| anyone able to grab snacks? | Weekend Festival Run | maybe/request | 85 (request) | {"✅":1} | request.can-someone (+24), logistics.supplies (+25), question.intent (+10), request.bring-supplies (+14) |
| anyone able to grab snacks? | Pledge Class 28 | maybe/request | 81 (request) | {"❓":1} | request.can-someone (+24), logistics.supplies (+25), question.intent (+10), request.bring-supplies (+14) |
| anyone able to grab snacks? | Pledge Class 28 | maybe/request | 81 (request) | {"👀":1} | request.can-someone (+24), logistics.supplies (+25), question.intent (+10), request.bring-supplies (+14) |
| anyone able to grab snacks? | Pledge Class 28 | maybe/request | 81 (request) | {"❓":1} | request.can-someone (+24), logistics.supplies (+25), question.intent (+10), request.bring-supplies (+14) |
| anyone able to grab snacks? | Kappa Event Crew | maybe/request | 81 (request) | {"👀":1} | request.can-someone (+24), logistics.supplies (+25), question.intent (+10), request.bring-supplies (+14) |
| anyone able to grab snacks? | Kappa Event Crew | maybe/request | 81 (request) | {"❓":1} | request.can-someone (+24), logistics.supplies (+25), question.intent (+10), request.bring-supplies (+14) |

### Worst False Negatives

| Text | Group | Expected | Score | Reactions | Rules |
| --- | --- | --- | --- | --- | --- |
| need two cars for the philanthropy event Friday | Kappa Event Crew | important/logistics | 7 (noise) | {} | time.weekday (+7) |
| need two cars for the philanthropy event Friday | Kappa Event Crew | important/logistics | 7 (noise) | {} | time.weekday (+7) |
| bring both jerseys tomorrow | Club Soccer | important/logistics | 8 (noise) | {} | time.relative (+8) |
| bring both jerseys tomorrow | Club Soccer | important/logistics | 8 (noise) | {} | time.relative (+8) |
| bring both jerseys tmr | Club Soccer | important/logistics | 8 (noise) | {"📌":1} |  |
| bring both jerseys tmr | Club Soccer | important/logistics | 8 (noise) | {"👀":1} |  |
| bring both jerseys tmr | Club Soccer | important/logistics | 8 (noise) | {"👀":1} |  |
| bring both jerseys tmr | Club Soccer | important/logistics | 8 (noise) | {"✅":1} |  |
| bring both jerseys tomorrow | Club Soccer | important/logistics | 8 (noise) | {} | time.relative (+8) |
| wear navy for house tours tn | Rush Week Leads | important/event | 8 (noise) | {"👀":1} |  |
| wear navy for house tours tn | Rush Week Leads | important/event | 8 (noise) | {"✅":1} |  |
| wear navy for house tours tn | Rush Week Leads | important/event | 8 (noise) | {"✅":1,"📌":1} |  |

### Best Ambiguous Calls

| Text | Group | Expected | Score | Reactions | Rules |
| --- | --- | --- | --- | --- | --- |
| who all is going Friday? | Pledge Class 28 | maybe/plan | 55 (plan) | {"❓":1,"✅":1} | plan.whos-going (+20), time.weekday (+7), question.intent (+10) |
| who all is going Friday? | Basement Set Team | maybe/plan | 55 (plan) | {"👀":1,"✅":1} | plan.whos-going (+20), time.weekday (+7), question.intent (+10) |
| who all is going Friday? | Rush Week Leads | maybe/plan | 55 (plan) | {"👀":1,"✅":1} | plan.whos-going (+20), time.weekday (+7), question.intent (+10) |
| does anyone have tickets left? | Pledge Class 28 | maybe/request | 54 (request) | {"👀":1} | deadline.payment (+18), request.ticket-availability (+18), question.intent (+10) |
| does anyone have tickets left? | Pledge Class 28 | maybe/request | 54 (request) | {"👀":1} | deadline.payment (+18), request.ticket-availability (+18), question.intent (+10) |
| anyone going out tonight? | Downtown Survivors | maybe/plan | 56 (plan) | {"❓":1,"✅":1} | plan.whos-going (+20), time.relative (+8), question.intent (+10) |
| does anyone have tickets left? | Downtown Survivors | maybe/request | 54 (request) | {"👀":1} | deadline.payment (+18), request.ticket-availability (+18), question.intent (+10) |
| does anyone have tickets left? | Club Soccer | maybe/request | 54 (request) | {"❓":1,"😂":1} | deadline.payment (+18), request.ticket-availability (+18), question.intent (+10) |
| does anyone have tickets left? | Basement Set Team | maybe/request | 54 (request) | {"❓":1} | deadline.payment (+18), request.ticket-availability (+18), question.intent (+10) |
| does anyone have tickets left? | Basement Set Team | maybe/request | 54 (request) | {"❓":1} | deadline.payment (+18), request.ticket-availability (+18), question.intent (+10) |
| does anyone have tickets left? | Basement Set Team | maybe/request | 54 (request) | {"❓":1} | deadline.payment (+18), request.ticket-availability (+18), question.intent (+10) |
| anyone going out tonight? | Apartment 4B | maybe/plan | 54 (plan) | {"❓":1,"👀":1} | plan.whos-going (+20), time.relative (+8), question.intent (+10) |

### Most Reaction-Sensitive Messages

| Text | Group | Expected | Score | Reactions | Rules | Before | Boost |
| --- | --- | --- | --- | --- | --- | --- | --- |
| chapter moved to Thursday at 6 | Pledge Class 28 | important/announcement | 100 (announcement) | {"✅":1,"📌":1} | event.social-anchor (+12), event.meeting-time (+24), announcement.change (+30), time.weekday (+7), time.explicit (+12) | 100 | 30 |
| can someone bring speakers to the pregame | Pledge Class 28 | important/request | 100 (request) | {"👀":1,"📌":1} | request.can-someone (+24), logistics.supplies (+25), event.social-anchor (+12), question.intent (+10), request.bring-supplies (+14) | 85 | 30 |
| we need one more for the Uber leaving at 9 | Pledge Class 28 | important/logistics | 100 (logistics) | {"✅":1,"👀":1,"📌":1} | request.concrete-need (+28), logistics.transport (+20), time.explicit (+12), logistics.uber-count (+20), structure.concrete-details (+8) | 88 | 30 |
| can someone bring speakers to the pregame | Pledge Class 28 | important/request | 100 (request) | {"✅":1,"👀":1,"📌":1} | request.can-someone (+24), logistics.supplies (+25), event.social-anchor (+12), question.intent (+10), request.bring-supplies (+14) | 85 | 30 |
| rush meeting is at 6 in the house | Pledge Class 28 | important/event | 100 (event) | {"👀":1,"📌":1} | event.social-anchor (+12), event.meeting-time (+24), time.explicit (+12), event.concrete-time (+16), structure.concrete-details (+8) | 72 | 30 |
| dues are due by Sunday night | Pledge Class 28 | important/deadline | 100 (deadline) | {"✅":1,"📌":1} | deadline.explicit (+32), deadline.payment (+18), time.weekday (+7), deadline.date-context (+18), structure.concrete-details (+8) | 83 | 30 |
| can someone bring speakers to the pregame | Pledge Class 28 | important/request | 100 (request) | {"👀":1,"📌":1} | request.can-someone (+24), logistics.supplies (+25), event.social-anchor (+12), question.intent (+10), request.bring-supplies (+14) | 85 | 30 |
| meeting moved to room 204 tonight | Kappa Event Crew | important/announcement | 100 (announcement) | {"✅":1,"📌":1} | event.social-anchor (+12), announcement.change (+30), time.relative (+8), event.concrete-time (+16), announcement.date-context (+14) | 88 | 30 |
| forms are due by 5pm | Kappa Event Crew | important/deadline | 100 (deadline) | {"✅":1,"📌":1} | deadline.explicit (+32), deadline.payment (+18), time.explicit (+12), deadline.date-context (+18) | 80 | 30 |
| party starts at 9 at Luke's | Downtown Survivors | important/event | 100 (event) | {"✅":1,"📌":1} | event.social-anchor (+12), event.starts-time (+28), time.explicit (+12), event.concrete-time (+16), structure.concrete-details (+8) | 76 | 30 |
| need drivers for away game Saturday | Club Soccer | important/logistics | 100 (event) | {"👀":1,"📌":1} | request.concrete-need (+28), logistics.transport (+20), event.social-anchor (+12), time.weekday (+7), event.concrete-time (+16) | 91 | 30 |
| need drivers for away game Saturday | Club Soccer | important/logistics | 100 (event) | {"👀":1,"📌":1} | request.concrete-need (+28), logistics.transport (+20), event.social-anchor (+12), time.weekday (+7), event.concrete-time (+16) | 91 | 30 |

## Reaction Impact

Reactions moved 101 messages across the Important threshold. Funny reactions promoted 0 noise messages across the threshold.

Interpretation:

- 101 messages crossed into Important because of reactions. These are cases where social validation changed product behavior.
- 0 noise messages crossed because of funny/hype reactions. That is a strong sign the reaction cap is doing its job.
- Important messages received an average boost of 10.8, compared with 4.4 for maybe messages and 1.0 for noise. This is the intended shape: reactions should help real signal more than jokes.

| Ground Truth | Average Reaction Boost |
| --- | --- |
| important | 10.8 |
| maybe | 4.4 |
| noise | 1.0 |

## Edge-Case Analysis

Edge-case precision is 100.0%, recall is 27.8%, and category accuracy is 62.2%.

What this section is proving:

- Edge cases are adversarial by design. A lower score here is not automatically bad; the point is to expose where simple rules lack social context.
- Edge-case recall at 27.8% shows how often the engine catches non-obvious important messages such as slang, casual commands, cancellations, or group-specific shorthand.
- Edge-case precision at 100.0% shows whether tricky joke messages with important-looking words are leaking into Important.
- The highest-value misses are casual important messages and context-required messages. These are hard for a single-message rule engine because users often omit the object once everyone in the chat already knows it.

| Scenario | Count | Avg Score | Precision | Recall | Category Acc |
| --- | --- | --- | --- | --- | --- |
| funny_keyword | 1 | 12.0 | 0.0% | 0.0% | 100.0% |
| funny_deadline | 1 | 58.0 | 0.0% | 0.0% | 0.0% |
| casual_important | 2 | 8.0 | 0.0% | 0.0% | 0.0% |
| vague | 3 | 11.3 | 0.0% | 0.0% | 0.0% |
| casual_question | 2 | 5.0 | 0.0% | 0.0% | 100.0% |
| high_reaction_noise | 4 | 1.5 | 0.0% | 0.0% | 100.0% |
| low_reaction_important | 2 | 50.0 | 0.0% | 0.0% | 100.0% |
| date_noise | 2 | 10.5 | 0.0% | 0.0% | 100.0% |
| time_noise | 1 | 0.0 | 0.0% | 0.0% | 100.0% |
| event_word_noise | 3 | 8.0 | 0.0% | 0.0% | 100.0% |
| joke_request | 2 | 13.0 | 0.0% | 0.0% | 100.0% |
| context_required | 4 | 6.5 | 0.0% | 0.0% | 0.0% |
| typo_slang | 4 | 15.5 | 0.0% | 0.0% | 50.0% |
| multi_signal | 2 | 100.0 | 100.0% | 100.0% | 50.0% |
| cancellation | 3 | 46.3 | 0.0% | 0.0% | 33.3% |
| repeated_spam | 3 | 0.0 | 0.0% | 0.0% | 100.0% |
| group_specific | 6 | 49.8 | 100.0% | 50.0% | 66.7% |

Representative edge cases:

| Text | Group | Expected | Score | Reactions | Rules |
| --- | --- | --- | --- | --- | --- |
| bro said formal like he owns the place | Pledge Class 28 | noise/noise | 12 (noise) | {} | event.social-anchor (+12) |
| deadline for being washed is tonight | Kappa Event Crew | noise/noise | 58 (deadline) | {} | deadline.explicit (+32), time.relative (+8), deadline.date-context (+18) |
| be at the house by 8 or you're cooked | Downtown Survivors | important/event | 8 (noise) | {"👀":1} |  |
| we're leaving in 10 don't be late | Campus Volunteer Board | important/event | 8 (noise) | {"👀":1} |  |
| tonight? | Club Soccer | maybe/question | 8 (noise) | {"❓":1,"👀":1} | time.relative (+8), question.intent (+10), noise.one-word (-18) |
| who's going | Basement Set Team | maybe/plan | 18 (noise) | {} | plan.whos-going (+20), question.intent (+10), noise.vague-short (-12) |
| need one | Econ 302 Project | maybe/request | 8 (noise) | {"❓":1,"😂":1} | noise.vague-short (-12) |
| who let him cook? | Lot 14 Tailgate | noise/noise | 0 (noise) | {"😂":3} | question.intent (+10), noise.vague-short (-12) |
| why is bro like this? | Apartment 4B | noise/noise | 10 (noise) | {} | question.intent (+10) |
| LMAOOOOO | The Big One | noise/noise | 3 (noise) | {"🔥":1,"💀":2,"😂":5} | noise.one-word (-18), noise.laughter (-35), noise.vague-short (-12) |
| bro fell off | Pledge Class 28 | noise/noise | 0 (noise) | {"😂":2,"💀":3} | noise.vague-short (-12) |
| skull emoji | Kappa Event Crew | noise/noise | 0 (noise) | {"💀":2} | noise.vague-short (-12) |
| fire fit | Downtown Survivors | noise/noise | 3 (noise) | {"🔥":1,"😂":1,"💀":1} | noise.vague-short (-12) |
| rent is due tomorrow | Campus Volunteer Board | important/deadline | 58 (deadline) | {} | deadline.explicit (+32), time.relative (+8), deadline.date-context (+18) |
| meeting moved to room 204 | Club Soccer | important/announcement | 42 (announcement) | {} | event.social-anchor (+12), announcement.change (+30) |
| Friday was insane | Basement Set Team | noise/noise | 7 (noise) | {} | time.weekday (+7) |
| 9 is crazy | Econ 302 Project | noise/noise | 0 (noise) | {"💀":1} | noise.vague-short (-12) |
| tomorrow gonna be wild | Lot 14 Tailgate | noise/noise | 14 (noise) | {"🔥":2,"💀":1} | time.relative (+8) |
| party animal | Apartment 4B | noise/noise | 0 (noise) | {} | event.social-anchor (+12), noise.vague-short (-12) |
| formal apology incoming | The Big One | noise/noise | 12 (noise) | {} | event.social-anchor (+12) |
| rush hour traffic sucks | Pledge Class 28 | noise/noise | 12 (noise) | {} | event.social-anchor (+12) |
| can someone tell Tyler to stop yelling | Kappa Event Crew | noise/noise | 18 (noise) | {"🔥":3,"😂":2} | question.intent (+10) |
| need bro to retire | Downtown Survivors | noise/noise | 8 (noise) | {"💀":1,"🔥":3} |  |
| same place as last time | Campus Volunteer Board | maybe/question | 0 (noise) | {} |  |
| bring that again | Club Soccer | maybe/logistics | 8 (noise) | {"❓":1} | noise.vague-short (-12) |

## Scoring Insights

How to read rule impact:

- False-positive rules (question.intent, logistics.supplies, request.can-someone) are not automatically bad rules. They may also appear in true positives. The question is whether they need more context gates or phrase exceptions.
- False-negative rules (question.intent, logistics.supplies, request.can-someone) show rules that fired on missed important messages but did not add enough score to cross the threshold. These are candidates for combo rules, not necessarily larger standalone deltas.
- A rule that appears in both true positives and false positives should be tuned carefully. Broadly weakening it may fix noise while damaging recall.

Rules that most often appeared in false positives:

| Rule | Label | Delta | False Positives | True Positives |
| --- | --- | --- | --- | --- |
| question.intent | Asks a planning or logistics question | 10 | 65 | 35 |
| logistics.supplies | Mentions supplies or things to bring | 25 | 63 | 45 |
| request.can-someone | Asks whether someone can handle something concrete | 24 | 63 | 39 |
| request.bring-supplies | Asks someone to bring specific supplies | 14 | 63 | 39 |
| time.relative | Mentions today, tonight, tomorrow, or this week | 8 | 4 | 101 |
| logistics.transport | Mentions rides, drivers, or transportation | 20 | 4 | 82 |
| commitment.availability | Shares concrete availability or commitment | 22 | 4 | 0 |
| event.social-anchor | Mentions a social event or meeting | 12 | 2 | 157 |

Rules that appeared in false negatives:

| Rule | Label | Delta | False Negatives | True Positives |
| --- | --- | --- | --- | --- |
| question.intent | Asks a planning or logistics question | 10 | 40 | 35 |
| logistics.supplies | Mentions supplies or things to bring | 25 | 1 | 45 |
| request.can-someone | Asks whether someone can handle something concrete | 24 | 27 | 39 |
| time.relative | Mentions today, tonight, tomorrow, or this week | 8 | 25 | 101 |
| logistics.transport | Mentions rides, drivers, or transportation | 20 | 9 | 82 |
| event.social-anchor | Mentions a social event or meeting | 12 | 27 | 157 |
| structure.concrete-details | Has enough concrete detail to be useful later | 8 | 18 | 243 |
| deadline.explicit | Mentions an explicit deadline | 32 | 27 | 190 |

Category confusions are exported to `output/category-confusion.csv` and visualized above. In this run, most category misses came from messages that have legitimate overlap: requests involving rides, announcements involving events, and vague questions that need conversation context.

## Recommendations

- Keep the Important threshold near **55** for the next calibration pass. In this simulation it had the strongest precision/recall balance.
- Keep the current reaction caps. Funny/high-volume reactions did not promote noise into Important in this run.
- Add typo/slang aliases for `tix`, `tmr`, `tn`, `mtg`, `spkrs`, and `drvr`; these are realistic and currently fragile.
- Review false-positive rules first: question.intent, logistics.supplies, request.can-someone. Tune with phrase-level exceptions instead of weakening all time/date/event evidence.
- Add real audit labels from early testers before adding AI summaries. The simulation is useful pressure, but real chat context will reveal new shorthand and group-specific language.
- Consider storing a `scenarioTag`-like audit reason in internal tooling so future calibration can group false positives and false negatives by failure mode.

## Data Exports

- `output/simulated-messages.json`
- `output/scored-messages.json`
- `output/evaluation-summary.json`
- `output/scored-messages.csv`
- `output/threshold-analysis.csv`
- `output/category-confusion.csv`
- `output/rule-impact.csv`
- `output/false-positives.csv`
- `output/false-negatives.csv`
- `output/edge-case-results.csv`

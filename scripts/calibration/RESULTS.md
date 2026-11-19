# Fitting and evaluating the Important feed

The summer scorer assigns points when a message matches hand-written rules. The calibrated scorer keeps that system and adds five signed point adjustments for timed meeting instructions, departures, staffing, submissions and noncurrent plans. Each adjustment appears in the existing audit view. Reactions retain their original caps. A score of 65 is a feed cutoff, not a probability.

`npm run calibrate` fits the five adjustments using 1,500 synthetic texts from 28 labeled phrase families. Each family contributes the same total weight so a template with more interchangeable places or times cannot dominate the fit. The objective penalizes important training messages below 70 and other messages above 45, with shrinkage toward zero. Fitting uses message text alone. The 70/45 margins, features, labels and family design are hand-chosen.

`npm run evaluate` compares the same scorer with and without the fitted adjustments. The summer replay uses the original labels and reactions. The separately authored eight-thread challenge stays out of fitting and deliberately emphasizes similar failure modes. Only 56 messages appear there. The pin stress check adds one pin to each of those same messages. Each message is scored independently of surrounding turns. Repeated templates, subjective labels and the targeted challenge limit generalization.

Run on Node 24+ from the repository root:

```sh
npm run calibrate
npm test
npm run simulate
npm run evaluate
```

## Second-stage ranking

A regularized logistic model learns from words and matched rule IDs. Normalizing numbers and repeated templates reduces 4,960 simulated messages to 294 distinct training templates. Only terms shared by at least two templates enter the fit. The model adjusts borderline scores by at most +15 or −18 before applying the original reaction caps. The audit record includes the strongest contributing terms. Numerical model confidence reflects synthetic labels.

Run `node scripts/calibration/validate-ranking.js` to refit four models on disjoint sets of groups, test each on groups omitted from that fit, and verify that the full fitted model reproduces the committed weights. A validation row is excluded if its normalized template occurred in training. At cutoff 65 the four fold comparisons gain 4, 3, 17 and 2 true positives respectively, with zero additional false positives. The 1,039 eligible rows include repeated messages. This comparison isolates the second stage; the first-stage rules were already informed by summer data. The full replay below includes training examples. The eight-thread challenge was used during development to catch regressions. Real group usage remains unmeasured.

## Paired results

| Suite | Rows | Cutoff | Scorer | TP | FP | FN | Precision | Recall |
|---|---:|---:|---|---:|---:|---:|---:|---:|
| Summer replay | 4960 | 60 | Summer | 1369 | 269 | 314 | 83.6% | 81.3% |
| Summer replay | 4960 | 60 | First pass | 1420 | 269 | 263 | 84.1% | 84.4% |
| Summer replay | 4960 | 60 | Ranked | 1499 | 269 | 184 | 84.8% | 89.1% |
| Summer replay | 4960 | 65 | Summer | 1324 | 214 | 359 | 86.1% | 78.7% |
| Summer replay | 4960 | 65 | First pass | 1382 | 214 | 301 | 86.6% | 82.1% |
| Summer replay | 4960 | 65 | Ranked | 1474 | 214 | 209 | 87.3% | 87.6% |
| Training variants | 1500 | 60 | Summer | 279 | 184 | 513 | 60.3% | 35.2% |
| Training variants | 1500 | 60 | First pass | 792 | 8 | 0 | 99.0% | 100.0% |
| Training variants | 1500 | 60 | Ranked | 792 | 8 | 0 | 99.0% | 100.0% |
| Training variants | 1500 | 65 | Summer | 261 | 175 | 531 | 59.9% | 33.0% |
| Training variants | 1500 | 65 | First pass | 792 | 2 | 0 | 99.7% | 100.0% |
| Training variants | 1500 | 65 | Ranked | 792 | 2 | 0 | 99.7% | 100.0% |
| Unseen threads | 56 | 60 | Summer | 7 | 7 | 17 | 50.0% | 29.2% |
| Unseen threads | 56 | 60 | First pass | 18 | 2 | 6 | 90.0% | 75.0% |
| Unseen threads | 56 | 60 | Ranked | 18 | 2 | 6 | 90.0% | 75.0% |
| Unseen threads | 56 | 65 | Summer | 7 | 7 | 17 | 50.0% | 29.2% |
| Unseen threads | 56 | 65 | First pass | 18 | 2 | 6 | 90.0% | 75.0% |
| Unseen threads | 56 | 65 | Ranked | 18 | 2 | 6 | 90.0% | 75.0% |
| Unseen with pin | 56 | 60 | Summer | 12 | 8 | 12 | 60.0% | 50.0% |
| Unseen with pin | 56 | 60 | First pass | 19 | 3 | 5 | 86.4% | 79.2% |
| Unseen with pin | 56 | 60 | Ranked | 19 | 3 | 5 | 86.4% | 79.2% |
| Unseen with pin | 56 | 65 | Summer | 9 | 8 | 15 | 52.9% | 37.5% |
| Unseen with pin | 56 | 65 | First pass | 19 | 3 | 5 | 86.4% | 79.2% |
| Unseen with pin | 56 | 65 | Ranked | 19 | 3 | 5 | 86.4% | 79.2% |

Held-out errors at 65, without reactions:
- Miss (24): driver is at arrivals now, blue van
- Miss (4): use the smaller dataset, the first file is corrupt
- False alarm (100): imagine if practice moved indoors tonight
- Miss (53): bring jerseys for both colors
- False alarm (100): i wish rent was due by friday
- Miss (4): plumber coming between 2 and 4, leave the latch open
- Miss (4): west trail is closed, take the east route
- Miss (4): bring cash, they cannot split the check

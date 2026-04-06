# TREMOR — Peer Review Brief

**Audience**: Technical peer evaluating whether TREMOR is ready to be "a model others should use"
**Date**: 2026-04-05
**Sources**: `grimoires/loa/reality/` (from `/ride`), inline security audit, `grimoires/loa/TREMOR-EMPIRICAL-VALIDATION.md`
**Auditor**: Loa framework (ride + auditing-security + custom empirical prompt)

---

## TL;DR

**TREMOR is structurally production-ready but empirically unvalidated.** The codebase is clean, well-tested, and architecturally honest — zero external dependencies, zero critical security findings, zero dangerous patterns. The science literacy on display is real: correct Omori-Utsu formulation, proper citations for Reasenberg & Jones 1989, Wells & Coppersmith 1994, Båth's law. But the core innovation — magnitude doubt pricing — has never been validated end-to-end against real data, and ~53% of the quantitative parameters are uncited magic numbers. **Recommendation: NOT YET a "model others should use," but ~3–4 weeks of focused empirical work gets it there. Share the architecture now; withhold the parameter values until they're backtested.**

---

## What TREMOR Is (one paragraph for orientation)

A standalone Node.js CLI seismic intelligence construct: ingests USGS (optionally EMSC) earthquake feeds, runs events through a clean Oracle → Processor → Theatre → RLMF pipeline, and produces Brier-scored certificates from five prediction market templates (aftershock cascade, magnitude gate, depth, paradox, swarm). 3,400 LOC across 15 modules, 48 tests across 16 suites, zero external deps (Node 20+ built-ins only). Core claim: by pricing magnitude uncertainty ("doubt price") against USGS review latency, it produces calibrated probabilistic predictions before ground-truth confirmation.

---

## Four-Axis Scorecard

| Axis | Score | Grade | Blocker? |
|---|---|---|---|
| **Code quality & architecture** | 9/10 | Excellent | No |
| **Security posture** | 7/10 | Production-ready with caveats | No |
| **Documentation alignment** | 8/10 | Minor drift | No |
| **Empirical grounding** | 4/10 | **Prototype** | **Yes** |
| **Composite (unweighted)** | **7.0/10** | Promising | — |
| **Composite (weighted for "model others should use")** | **5.8/10** | **Not yet ready** | — |

The weighted composite uses 10% code / 20% security / 20% docs / **50% empirical** because the question being asked is whether the *model* is trustworthy, not whether the *code* compiles. A beautiful implementation of an uncalibrated model is still an uncalibrated model.

---

## What's Genuinely Good (credit first)

Per `grimoires/loa/reality/hygiene-report.md` and `grimoires/loa/consistency-report.md`:

- **9/10 hygiene**: no TODOs, no dead code, no dependency conflicts
- **9/10 consistency**: predictable module organization, uniform theatre lifecycle (create/process/resolve) across all 5 templates
- **Zero external dependencies** — eliminates supply chain risk entirely (`package.json` has no `dependencies`)
- **95% grounded SDD** (from `/ride`): architecture claims trace to actual code
- **Correct science where it exists**:
  - Omori-Utsu integration handles the `p=1` singular case correctly (`src/theatres/aftershock.js:67-71`)
  - Reasenberg & Jones 1989 cited inline for productivity scaling (`aftershock.js:59`)
  - Wells & Coppersmith 1994 cited for rupture length regression (`aftershock.js:175-177`)
  - Båth's law cited in regime-params docstring (`aftershock.js:22`)
  - Abramowitz & Stegun 26.2.17 cited and correctly implemented for normal CDF (`src/processor/magnitude.js:130-146`)
- **Smart architectural moves**: regional density normalization prevents systematic overweighting of well-instrumented regions; three-tier settlement (ground_truth / provisional_mature / market_freeze) cleanly handles USGS automatic→reviewed latency

This is not a "vibes-coded" earthquake toy. The structure is defensible.

---

## What's Not Yet Ready

### 1. Security: 7 MEDIUM resilience findings (all fixable in ~12 hours)

Zero CRITICAL, zero HIGH, zero dangerous patterns. All seven MEDIUMs are operational resilience, not security proper:

| # | Finding | File | Fix effort |
|---|---|---|---|
| M1 | No schema validation on USGS/EMSC GeoJSON responses | `src/oracles/usgs.js:34`, `src/oracles/emsc.js:48` | 2h |
| M2 | `AbortSignal.timeout()` has no fallback for older Node | `src/oracles/emsc.js:40-41` | 1h |
| M3 | No NaN guards in magnitude pipeline (could corrupt Brier scores) | `src/processor/bundles.js:79-85` | 1.5h |
| M4 | Silent poll failures — no retry, no circuit breaker, no visibility | `src/index.js:285-289` | 3h |
| M5 | Certificate export failure leaves theatre state inconsistent with RLMF pipeline | `src/index.js:249-265` | 2h |
| **M6** | **Race condition: concurrent polls → duplicate certificate exports → polluted RLMF training data** | `src/index.js:231-237` | **2h** |
| M7 | No bounds checks on regional profile inputs (outlier data distorts quality scores) | `src/processor/regions.js` | 1.5h |

**M6 is the one that matters most for "model others should use"** — it's not a security issue, it's a data-integrity issue. If a poll overruns 60s, the next tick fires, and both can mark the same theatre resolved twice. Duplicate certificates in the RLMF export silently contaminate downstream training.

### 2. Documentation drift: 1 ghost feature (5-minute fix)

From `grimoires/loa/drift-report.md`: the README claims TREMOR ingests from "USGS, EMSC, and IRIS" but only USGS and EMSC are implemented. IRIS is a ghost feature. Peer reading the README will form false expectations. Either implement IRIS or flag it as v0.2.0 planned work. Cost: one sentence edit.

Secondary: on-chain P&L is mentioned in docs but not present in code (also v0.2 territory).

### 3. Empirical grounding: the real blocker

From `grimoires/loa/TREMOR-EMPIRICAL-VALIDATION.md` — 51 parameters extracted across 5 files:

| Status | Count | % |
|---|---|---|
| ✅ Fully cited (e.g., R&J 1989, W&C 1994, A&S 26.2.17) | 5 | 10% |
| ⚠️ Plausible, no specific source (e.g., `Mw: 0.10` is in the right ballpark) | 14 | 27% |
| ❌ Unjustified magic number | 27 | **53%** |

**By file:**

| File | Unjustified params | What's missing |
|---|---|---|
| `processor/quality.js` | 9/9 (0% cited) | Composite weights (0.40/0.15/0.15/0.15/0.15), status weights, missing-value defaults |
| `processor/settlement.js` | 7/7 (0% cited) | All three `brier_discount` values (0.10/0.20/0.25), all time thresholds, `composite > 0.5` gate |
| `processor/regions.js` | 6/7 | Every `median_nst`, `median_gap`, `baseline_rms` — author already flagged as "calibrate in production" (`regions.js:10-11`) |
| `processor/magnitude.js` | 5/14 | 0.5 doubt-price ceiling, 0.7 reviewed adjustment, ×1.3 missing-nst penalty, station saturation at 20, density multipliers |
| `theatres/aftershock.js` | 5/14 | Regime K/c/p values (author flagged `aftershock.js:24-25`), 0.7 Omori-decay correction, blending floor, match-radius 1.5× |

**The critical empirical question nobody has answered:**
Does TREMOR's claimed 95% confidence interval on magnitude actually contain the reviewed magnitude 95% of the time?

Every component of the doubt-price pipeline (baseline σ per mag type, station-count adjustment, density multiplier, reviewed-status adjustment, 0.5 normalization ceiling) is individually uncited, and their composition has never been tested end-to-end against USGS's own automatic→reviewed transitions. This is the core innovation TREMOR is selling. **It is also the test that is cheapest to run** — USGS publishes both automatic and reviewed magnitudes for every event, the data is free, and the validation is a single bash loop.

---

## Honest Framing for the Peer

If you publish TREMOR today with the current parameter values, the likely failure mode is **not** a security breach, a crash, or a code bug. It is **silent miscalibration**: the model will produce Brier scores that look reasonable, and users will assume the 95% CI means 95%, when in fact it might mean 82% or 99% depending on which uncited multiplier dominates in their region. The downstream RLMF training data inherits that miscalibration, and any fine-tuned model built on the certificates inherits it too.

The author is already honest about this — two of the four biggest parameter blocks are explicitly tagged as "approximate, calibrate in production" in docstrings (`regions.js:10-11`, `aftershock.js:24-25`). The uncomfortable truth is that "in production" never happened yet.

---

## Path to "Ready to Share"

In order of cost/value:

| # | Action | Effort | Impact |
|---|---|---|---|
| 1 | **Citation/TBD labeling pass** — every magic number gets either a `// source:` comment or a `// TBD: empirical calibration needed` tag | **1 day** | Grade jumps from PROTOTYPE → PROMISING purely on transparency |
| 2 | Fix M6 (race condition) + M3 (NaN guards) — these threaten data integrity, not security | **0.5 day** | Eliminates silent RLMF corruption risk |
| 3 | Fix README IRIS ghost feature | **5 min** | Removes false expectations for anyone reading docs first |
| 4 | **Doubt-price CI coverage study** — does the 95% CI actually cover 95%? | **3–5 days** | Validates or refits the core innovation |
| 5 | Settlement discount calibration from USGS review latency distribution | **3–4 days** | Replaces all three hand-picked `brier_discount` values with data-derived ones |
| 6 | Regional profile recalibration from 2021–2026 USGS catalog | **2–3 days** | Delivers on what `regions.js:10-11` already promised |
| 7 | Quality composite weight refit via logistic regression | **2 days** | Replaces arbitrary 0.40/0.15×4 split with predictive weights |
| 8 | Fix remaining MEDIUM security findings (M1, M2, M4, M5, M7) | **1 day** | Production resilience |
| 9 | Omori regime backtest on 10–20 historical sequences | **1–1.5 weeks** | Validates K/c/p per regime |

**Minimum bar for "share with peers as-is": steps 1–3 + step 8. Two days of work. Gets you to PROMISING grade with intact architecture and honest labeling.**

**Bar for "a model others should use": steps 1–9. ~3–4 weeks. Lands at PROVEN grade (>80% parameters validated).**

---

## What I'd Tell the Peer Verbatim

> "The architecture is good — genuinely good, not vibes-good. Zero deps, clean pipeline, correct math where it's been written down, and the author is honest about what isn't calibrated. But don't use the parameter values yet. The doubt-price ceiling, the settlement discounts, the regional medians, and the Omori regime constants are all uncited placeholders, and the 95% CI claim has never been tested against USGS's own review history. Fork it, read the architecture, and if you want to use it for real work, budget a week for the doubt-price coverage study — that's the one empirical test that turns this from an elegant sketch into a defensible model. The science structure will hold up; the numbers need to earn their place."

---

## Sources

All claims in this brief trace to one of the following:

| Source | What it provides |
|---|---|
| `grimoires/loa/reality/hygiene-report.md` | Code hygiene metrics (9/10), dead code audit |
| `grimoires/loa/consistency-report.md` | Naming conventions, module organization (9/10) |
| `grimoires/loa/drift-report.md` | Doc-vs-code alignment, IRIS ghost feature |
| `grimoires/loa/prd.md`, `sdd.md` | Grounded PRD/SDD (89%/95% grounded) |
| `grimoires/loa/governance-report.md` | License, testing, policy audit (6/10) |
| Inline security audit (this session) | 0 CRITICAL / 0 HIGH / 7 MEDIUM / 3 LOW findings |
| `grimoires/loa/TREMOR-EMPIRICAL-VALIDATION.md` | Parameter matrix, validation test designs, per-file grounding stats |
| `src/processor/*.js`, `src/theatres/aftershock.js` | Direct code citation for every parameter claim |

---

**End of brief.**

# Sprint K Refit — Implementation Report

**Sprint**: Omori K Refit
**Date**: 2026-04-05
**Status**: Partially complete — K values refitted, Run 5 blocked by script interface gap

---

## Executive Summary

Refitted base K values in `REGIME_PARAMS` for subduction (25 → 0.220), transform (15 → 0.291), and intraplate (8 → 0.240) using empirical targets from Run 4 backtest. Performed magnitude-dependence check (inconclusive — insufficient magnitude diversity in dataset). Full test suite passes (70/70). Run 5 backtest could not be executed because `scripts/omori-backtest.js` has a hardcoded output directory and modifying it is outside sprint scope — interface blocker written.

---

## Tasks Completed

### Step 1 — Preserve Run 4 artifacts

**Status**: Complete

Run 4 artifacts verified intact:
- 14 sequence JSONs (`sequence-01.json` through `sequence-14.json`)
- `diagnostic-report.md` (labeled "Run 4 — inferRegime fully corrected")
- `interface-blocker.md` (previous blocker, resolved)

Empty `run-5/` directory created at `grimoires/loa/calibration/omori-backtest/run-5/`.

### Step 2 — Magnitude-dependence check

**Status**: Complete — inconclusive result

**Files created**: `grimoires/loa/calibration/omori-backtest/k-refit-notes.md` (Section 1)

**Finding**: The dataset lacks magnitude diversity within any single regime:
- Subduction: all M8.2-9.1 (no M6-7 sequences)
- Transform: both M7.1-7.2
- Intraplate: both M5.7-5.8

Cannot assess whether the 0.75 exponent over-amplifies for large events vs small events within the same regime. The check neither implicates nor clears the exponent.

**Follow-on sprint**: Not triggered by this check specifically, but remains a valid concern per Run 4 diagnostic report. A larger, magnitude-diverse dataset would be needed.

### Step 3 — Compute K refit values

**Status**: Complete

**Files modified**: `grimoires/loa/calibration/omori-backtest/k-refit-notes.md` (Section 2)

**Approach**: `K_empirical = K_current * actual_count / projected_count` per sequence, then median per regime. Only clean regime-fit sequences used (role = regime-fit, regime_assigned === regime_expected).

**Guards applied**: All 7 sequences had finite, non-zero actual_count and projected_count values. No exclusions needed.

| Regime | K_current | K_refit | Sequences | Confidence |
|--------|-----------|---------|-----------|------------|
| subduction | 25 | 0.220 | 3 | Moderate |
| transform | 15 | 0.291 | 2 | Low-moderate |
| intraplate | 8 | 0.240 | 2 (PROVISIONAL) | Low |

Intraplate: K_empirical values differ by 2.4x (0.142 vs 0.338), reflecting small sample. Flagged as provisional requiring human review.

### Step 4 — Apply the refit values

**Status**: Complete

**Files modified**: `src/theatres/aftershock.js:37-43`

Changes:
- `subduction.K`: 25 → 0.220
- `transform.K`: 15 → 0.291
- `intraplate.K`: 8 → 0.240
- `volcanic.K`: unchanged (30)
- `default.K`: unchanged (18)

Comment block replaced per sprint specification. K marked as backtest-derived, not DATA-FACTUAL. References `k-refit-notes.md` rather than hardcoded sequence counts. `c`, `p`, `bath_delta`, and 0.75 exponent untouched.

### Step 5 — Run backtest as Run 5

**Status**: BLOCKED

**Files created**: `grimoires/loa/calibration/omori-backtest/run-5-interface-blocker.md`

`scripts/omori-backtest.js` line 23 hardcodes `OUTPUT_DIR` to the root `omori-backtest/` directory. No env var, CLI arg, or other redirect mechanism exists. Running the script would overwrite Run 4 artifacts.

**Resolution path**: Add ~3 lines of env var support to the script (`process.env.OMORI_BACKTEST_OUTPUT`). Outside current sprint scope.

### Step 6 — Evaluate (abort clause)

**Status**: Cannot evaluate — depends on Run 5

Without Run 5 output, per-regime Pass/Marginal/Fail verdicts cannot be stated. The K refit direction (reducing by 33-114x to bring projections closer to actuals) is strongly supported by Run 4 data. The abort clause (revert if any regime worsens) cannot be checked until Run 5 is unblocked.

### Step 7 — Tests

**Status**: Complete — 70/70 pass

```
node --test
# tests 70, suites 22, pass 70, fail 0, duration_ms 156.9
```

No test assertions referenced specific Omori projected counts. No test file changes were needed.

---

## Technical Highlights

### Architecture

No structural changes. Only `REGIME_PARAMS` K values and the comment block above them were modified in `src/theatres/aftershock.js`. The Omori integration math, bucket probability computation, regime inference, and theatre lifecycle are all untouched.

### Performance

K reduction from O(10) to O(0.1) means `omoriExpectedCount()` will produce projected counts ~2 orders of magnitude lower for subduction/transform/intraplate regimes. This should bring projections from thousands-to-hundreds-of-thousands down to tens-to-hundreds range, matching observed aftershock counts.

### Security

No security implications. This is a parameter change to a scientific model.

---

## Testing Summary

| Test File | Scenarios | Result |
|-----------|-----------|--------|
| `test/tremor.test.js` | 66 tests across 20 suites | Pass |
| `test/post-audit.test.js` | 4 tests across 2 suites | Pass |

No test modifications needed — existing tests verify structural behavior (theatre creation, aftershock counting, resolution), not specific numerical K-dependent outputs.

**How to run**: `node --test`

---

## Known Limitations

1. **Run 5 not executed**: Cannot verify the K refit improves backtest metrics until `scripts/omori-backtest.js` gains output directory support
2. **Intraplate K is provisional**: Only 2 sequences, wide spread (0.142 to 0.338). Human review required before production merge
3. **Magnitude-dependence inconclusive**: Dataset lacks magnitude diversity within regimes. Cannot rule out 0.75 exponent as a contributing factor
4. **Volcanic and default K unchanged**: No clean calibration data for these regimes

---

## Verification Steps for Reviewer

1. **Run 4 preserved**: `ls grimoires/loa/calibration/omori-backtest/sequence-*.json | wc -l` should return 14
2. **K values correct**: Check `src/theatres/aftershock.js:37-43` — subduction 0.220, transform 0.291, intraplate 0.240
3. **No other params changed**: `c`, `p`, `bath_delta`, 0.75 exponent must be identical to pre-sprint values
4. **Tests pass**: `node --test` — expect 70/70 pass
5. **k-refit-notes.md**: Verify per-sequence K_empirical calculations match diagnostic report data
6. **Comment block**: No hardcoded sequence counts, references k-refit-notes.md, intraplate flagged PROVISIONAL

---

## Definition of Done Checklist

- [x] Run 4 artifacts intact and unmodified
- [ ] `grimoires/loa/calibration/omori-backtest/run-5/` created with fresh outputs — **BLOCKED** (interface blocker written)
- [x] `k-refit-notes.md` written with magnitude-dependence table, per-sequence K calculations, per-regime medians, and any excluded sequences
- [x] Magnitude-dependence check documented — inconclusive (insufficient magnitude diversity)
- [x] K_refit computed from clean regime-fit sequences only, with zero/non-finite guards applied
- [x] Intraplate K flagged as provisional with explicit note
- [x] `REGIME_PARAMS` updated for subduction, transform, intraplate
- [x] Comment block references k-refit-notes.md — no hardcoded sequence count
- [x] K marked backtest-derived, not DATA-FACTUAL
- [ ] Abort clause checked — **BLOCKED** (requires Run 5)
- [ ] Per-regime Pass/Marginal/Fail verdict stated for Run 5 — **BLOCKED** (requires Run 5)
- [x] If 0.75 exponent warrants follow-on sprint: flagged as inconclusive, follow-on may be warranted
- [x] Full test suite passes with zero failures
- [x] Summary states whether refit is complete, provisional, or interim

**Summary**: The K refit is **interim** — values are applied and tests pass, but the refit cannot be validated without Run 5 backtest output. Intraplate K is additionally **provisional** due to small sample size. Unblocking Run 5 requires a ~3-line change to `scripts/omori-backtest.js` (outside current sprint scope).

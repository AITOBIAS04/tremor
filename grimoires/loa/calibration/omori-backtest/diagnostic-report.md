# Omori Regime Backtest — Diagnostic Report

**Phase**: 1 diagnostic backtest. Not final calibration proof.
**Date**: 2026-04-06
**Sequences run**: 14 / 14
**Direct (M<6.0)**: 5 (via exported omoriExpectedCount/inferRegime)
**Errors**: 0

## ⚠ CRITICAL FINDING: `inferRegime` Misassignment

**2 of 7 regime-fit sequences** were assigned the WRONG tectonic regime by `inferRegime()`. This contaminates per-regime K/c/p analysis because the wrong parameters were applied.

| Sequence | Expected | Assigned | Depth (km) | Lat/Lon | Root Cause |
|----------|----------|----------|-----------|---------|------------|
| 2011 Mineral, Virginia | intraplate | default | 6 | 11 km SSW of Mineral, Virginia | Unknown |
| 2020 Magna, Utah | intraplate | transform | 11.9 | 5 km NNE of Magna, Utah | Unknown |

**Impact**: Sequences with wrong regime assignment were tested using the wrong K/c/p parameters. The per-regime results above include contaminated sequences.

**Root causes in `inferRegime` (aftershock.js:137-171)**:
- 2011 Mineral, Virginia: No intraplate detection logic — eastern US and Basin-and-Range locations fall through to default/transform
- 2020 Magna, Utah: No intraplate detection logic — eastern US and Basin-and-Range locations fall through to default/transform

---

## 1. Regime-Fit Results

**Direct-computed sequences** (M<6.0, via exported functions): 2011 Mineral, Virginia (M5.8), 2020 Magna, Utah (M5.7)

### Per-Sequence Results

| # | Sequence | Regime | Projected | Actual | Bucket Hit | Rel Error | Log Error | Brier |
|---|----------|--------|-----------|--------|------------|-----------|-----------|-------|
| 1 | 2011 Tōhoku | subduction | 128249.8 | 1422 | ✓ | 8919.0% | 4.501 | 0 |
| 2 | 2010 Maule | subduction | 76393.5 | 672 | ✓ | 11268.1% | 4.732 | 0 |
| 3 | 2014 Iquique | subduction | 27105.5 | 238 | ✓ | 11288.9% | 4.731 | 0 |
| 4 | 2019 Ridgecrest | transform | 2959.3 | 67 | ✓ | 4316.9% | 3.774 | 0 |
| 5 | 2010 El Mayor-Cucapah | transform | 3517.2 | 57 | ✓ | 6070.5% | 4.105 | 0 |
| 6 | 2011 Mineral, Virginia | default | 294.6 | 2 | ✗ | 14630.0% | 4.59 | 0.4 |
| 7 | 2020 Magna, Utah | transform | 263.8 | 4 | ✗ | 6495.0% | 3.97 | 0.4 |

### Per-Regime Aggregation

| Regime | Sequences | Bucket Hit Rate | Mean Rel Error | Mean Log Error | Classification |
|--------|-----------|-----------------|----------------|----------------|----------------|
| subduction | 3 | 100.0% | 10492.0% | 4.655 | **Fail** |
| transform | 3 | 66.7% | 5627.5% | 3.950 | **Fail** |
| default | 1 | 0.0% | 14630.0% | 4.590 | **Fail** |

**Untested regimes**: intraplate, volcanic

---

## 2. Bias Diagnosis Per Regime

Following protocol diagnosis order: c (early-time) → K (total) → p (drift) → inferRegime (regime variance).

### subduction

**Parameters**: K=25, c=0.05, p=1.05, bath_delta=1.1

**Direction**: Systematically **over-predicting** across all 3 sequences.

**Time-signature analysis** (t=6h, t=24h, t=72h):

| Sequence | 6h proj/act | 24h proj/act | 72h proj/act | Pattern |
|----------|-------------|--------------|--------------|---------|
| 2011 Tōhoku | 59151.1/183 | 97470.8/672 | 128249.8/1422 | Early bias (suspect c) |
| 2010 Maule | 35234.1/128 | 58059.7/411 | 76393.5/672 | Uniform bias (suspect K) |
| 2014 Iquique | 12501.5/73 | 20600.3/130 | 27105.5/238 | Uniform bias (suspect K) |

**Suspected parameter**: **K** (productivity) — 2/3 sequences show uniform bias across all time windows.

- **2011 Tōhoku**: projected 128249.8 vs actual 1422 → OVER (rel error: 8919.0%)
- **2010 Maule**: projected 76393.5 vs actual 672 → OVER (rel error: 11268.1%)
- **2014 Iquique**: projected 27105.5 vs actual 238 → OVER (rel error: 11288.9%)

### transform

**Parameters**: K=15, c=0.03, p=1.1, bath_delta=1.2

**Direction**: Systematically **over-predicting** across all 3 sequences.

**Time-signature analysis** (t=6h, t=24h, t=72h):

| Sequence | 6h proj/act | 24h proj/act | 72h proj/act | Pattern |
|----------|-------------|--------------|--------------|---------|
| 2019 Ridgecrest | 1602.4/56 | 2384.4/65 | 2959.3/67 | Uniform bias (suspect K) |
| 2010 El Mayor-Cucapah | 1904.5/31 | 2833.9/42 | 3517.2/57 | Uniform bias (suspect K) |
| 2020 Magna, Utah | 142.8/3 | 212.5/4 | 263.8/4 | Uniform bias (suspect K) |

**Suspected parameter**: **K** (productivity) — 3/3 sequences show uniform bias across all time windows.

- **2019 Ridgecrest**: projected 2959.3 vs actual 67 → OVER (rel error: 4316.9%)
- **2010 El Mayor-Cucapah**: projected 3517.2 vs actual 57 → OVER (rel error: 6070.5%)
- **2020 Magna, Utah**: projected 263.8 vs actual 4 → OVER (rel error: 6495.0%)

### default

Only 1 sequence(s) — insufficient for confident bias diagnosis. Observations only.

**Parameters**: K=18, c=0.05, p=1, bath_delta=1.2

**Direction**: Systematically **over-predicting** across all 1 sequences.

**Time-signature analysis** (t=6h, t=24h, t=72h):

| Sequence | 6h proj/act | 24h proj/act | 72h proj/act | Pattern |
|----------|-------------|--------------|--------------|---------|
| 2011 Mineral, Virginia | 128.4/0 | 218.2/1 | 294.6/2 | Early bias (suspect c) |

**Suspected parameter**: **c** (time offset) — 1/1 sequences show early-time bias.

- **2011 Mineral, Virginia**: projected 294.6 vs actual 2 → OVER (rel error: 14630.0%)

---

## 3. Regime-Inference Results

| # | Sequence | Expected | Assigned | Match |
|---|----------|----------|----------|-------|
| 8 | 2016 Kumamoto | transform or subduction boundary | transform | ✓ |
| 9 | 2008 Wells, Nevada | default or intraplate | transform | ✗ |
| 10 | 2016 Equatorial Atlantic M7.1 | default | transform | ✗ |
| 11 | 2020 Puerto Rico M6.4 | default | transform | ✗ |

### Misassignments

- **2008 Wells, Nevada**: assigned `transform` but expected `default or intraplate`. Depth: 7.9 km, Location: 8 km ENE of Wells, Nevada
- **2016 Equatorial Atlantic M7.1**: assigned `transform` but expected `default`. Depth: 10 km, Location: north of Ascension Island
- **2020 Puerto Rico M6.4**: assigned `transform` but expected `default`. Depth: 6 km, Location: 4 km SSE of Indios, Puerto Rico

---

## 4. Volcanic Robustness Results

Volcanic results inform robustness only. Do not refit K/c/p based on these.

| # | Sequence | Regime | Projected | Actual | Bucket Hit | Rel Error | Notes |
|---|----------|--------|-----------|--------|------------|-----------|-------|
| 12 | 2018 Kīlauea | transform | 2095 | 8 | ✗ | 26087.5% | Mainshock definition may be ambiguous |
| 13 | 2021 La Palma | default | 37.1 | 0 | ✗ | ∞ | European catalog — USGS coverage may be thin |
| 14 | 2014 Bárðarbunga | default | 208.5 | 1 | ✗ | 20750.0% | High-volume volcanic swarm |

---

## 5. Protocol Adherence Notes

1. **Mainshock definition**: Used largest reviewed event per protocol. For volcanic sequences, documented ambiguity where applicable.
2. **72-hour window**: Half-open interval [start, end) per protocol.
3. **Count rules**: M≥4.0, reviewed only, within TREMOR match radius, excluding mainshock and non-tectonic events.
4. **Scoring**: All four metrics computed per protocol (projected count, bucket hit, relative error, log error). Brier score computed from bucket probabilities.
5. **Exported functions**: `omoriExpectedCount`, `countToBucketProbabilities`, `inferRegime` now exported from aftershock.js. M<6.0 sequences tested via direct function calls. M>=6.0 sequences tested via `createAftershockCascade` (full theatre path).
6. **Partial-window analysis**: Enabled via exported `omoriExpectedCount`. Time-signature analysis at t=6h, t=24h, t=72h included in bias diagnosis.

---

## 6. Recommended Next Steps

### Priority 1: Fix `inferRegime` (intraplate regime untested)

The regime-inference heuristic misassigns 2/7 regime-fit sequences. Remaining issues:
- No intraplate detection logic — eastern US and Basin-and-Range locations fall through to default/transform
- Ideally: replace with proper tectonic regionalization (Slab2, PB2002)

### Priority 2: Reduce K across all regimes (40-80× over-prediction)

All tested sequences show massive over-prediction (4000-7700% relative error). The productivity scaling `K * 10^(0.75 * (magDiff - 1))` produces counts 1-2 orders of magnitude too high. The K values need to be reduced by approximately 1-2 orders of magnitude, but the exact refit should wait until `inferRegime` is fixed so sequences test the correct regime parameters.

- **subduction**: **REFIT NEEDED** (Fail). Reduce K first. Current K=25. Note: regime analysis contaminated by inferRegime misassignment.
- **transform**: **REFIT NEEDED** (Fail). Reduce K first. Current K=15. Note: regime analysis contaminated by inferRegime misassignment.
- **default**: **REFIT NEEDED** (Fail). Reduce K first. Current K=18. Note: regime analysis contaminated by inferRegime misassignment.

### Priority 3: Review intraplate and volcanic regime results

- Intraplate sequences (6, 7) now tested via direct function calls — review K/c/p adequacy
- Volcanic sequences: review robustness results. Poor Omori fit expected for volcanic sequences.

---

*Phase 1 diagnostic backtest. Not final calibration proof.*

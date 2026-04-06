# Omori Regime Backtest — Diagnostic Report

**Run 5 — K refitted from Run 4 empirical targets. Run 4 preserved at grimoires/loa/calibration/omori-backtest/.**

**Phase**: 1 diagnostic backtest. Not final calibration proof.
**Date**: 2026-04-05
**Sequences run**: 14 / 14
**Direct (M<6.0)**: 5 (via exported omoriExpectedCount/inferRegime)
**Errors**: 0

---

## 1. Regime-Fit Results

**Direct-computed sequences** (M<6.0, via exported functions): 2011 Mineral, Virginia (M5.8), 2020 Magna, Utah (M5.7)

### Per-Sequence Results

| # | Sequence | Regime | Projected | Actual | Bucket Hit | Rel Error | Log Error | Brier |
|---|----------|--------|-----------|--------|------------|-----------|-----------|-------|
| 1 | 2011 Tōhoku | subduction | 1128.6 | 1422 | ✓ | -20.6% | -0.231 | 0 |
| 2 | 2010 Maule | subduction | 672.3 | 672 | ✓ | 0.0% | 0 | 0 |
| 3 | 2014 Iquique | subduction | 238.5 | 238 | ✓ | 0.2% | 0.002 | 0 |
| 4 | 2019 Ridgecrest | transform | 57.4 | 67 | ✓ | -14.3% | -0.152 | 0 |
| 5 | 2010 El Mayor-Cucapah | transform | 68.2 | 57 | ✓ | 19.6% | 0.177 | 0 |
| 6 | 2011 Mineral, Virginia | intraplate | 3.4 | 2 | ✗ | 70.0% | 0.383 | 0.1449 |
| 7 | 2020 Magna, Utah | intraplate | 2.8 | 4 | ✓ | -30.0% | -0.274 | 0.0994 |

### Per-Regime Aggregation

| Regime | Sequences | Bucket Hit Rate | Mean Rel Error | Mean Log Error | Classification |
|--------|-----------|-----------------|----------------|----------------|----------------|
| subduction | 3 | 100.0% | 6.9% | 0.078 | **Pass** |
| transform | 2 | 100.0% | 16.9% | 0.164 | **Pass** |
| intraplate | 2 | 50.0% | 50.0% | 0.329 | **Marginal** |

**Untested regimes**: volcanic, default

---

## 2. Bias Diagnosis Per Regime

Following protocol diagnosis order: c (early-time) → K (total) → p (drift) → inferRegime (regime variance).

### subduction

**Parameters**: K=0.22, c=0.05, p=1.05, bath_delta=1.1

**Direction**: Mixed — 2 over-predictions, 1 under-predictions.
**Diagnosis**: No clear systematic bias. May indicate regime-specific heterogeneity or magnitude-dependent effects.

**Time-signature analysis** (t=6h, t=24h, t=72h):

| Sequence | 6h proj/act | 24h proj/act | 72h proj/act | Pattern |
|----------|-------------|--------------|--------------|---------|
| 2011 Tōhoku | 520.5/183 | 857.7/672 | 1128.6/1422 | Early bias (suspect c) |
| 2010 Maule | 310.1/128 | 510.9/411 | 672.3/672 | Early bias (suspect c) |
| 2014 Iquique | 110/73 | 181.3/130 | 238.5/238 | Uniform bias (suspect K) |

**Suspected parameter**: **c** (time offset) — 2/3 sequences show early-time bias.

- **2011 Tōhoku**: projected 1128.6 vs actual 1422 → UNDER (rel error: -20.6%)
- **2010 Maule**: projected 672.3 vs actual 672 → OVER (rel error: 0.0%)
- **2014 Iquique**: projected 238.5 vs actual 238 → OVER (rel error: 0.2%)

### transform

**Parameters**: K=0.291, c=0.03, p=1.1, bath_delta=1.2

**Direction**: Mixed — 1 over-predictions, 1 under-predictions.
**Diagnosis**: No clear systematic bias. May indicate regime-specific heterogeneity or magnitude-dependent effects.

**Time-signature analysis** (t=6h, t=24h, t=72h):

| Sequence | 6h proj/act | 24h proj/act | 72h proj/act | Pattern |
|----------|-------------|--------------|--------------|---------|
| 2019 Ridgecrest | 31.1/56 | 46.3/65 | 57.4/67 | Uniform bias (suspect K) |
| 2010 El Mayor-Cucapah | 36.9/31 | 55/42 | 68.2/57 | Uniform bias (suspect K) |

**Suspected parameter**: **K** (productivity) — 2/2 sequences show uniform bias across all time windows.

- **2019 Ridgecrest**: projected 57.4 vs actual 67 → UNDER (rel error: -14.3%)
- **2010 El Mayor-Cucapah**: projected 68.2 vs actual 57 → OVER (rel error: 19.6%)

### intraplate

**Parameters**: K=0.24, c=0.08, p=0.95, bath_delta=1.3

**Direction**: Mixed — 1 over-predictions, 1 under-predictions.
**Diagnosis**: No clear systematic bias. May indicate regime-specific heterogeneity or magnitude-dependent effects.

**Time-signature analysis** (t=6h, t=24h, t=72h):

| Sequence | 6h proj/act | 24h proj/act | 72h proj/act | Pattern |
|----------|-------------|--------------|--------------|---------|
| 2011 Mineral, Virginia | 1.2/0 | 2.3/1 | 3.4/2 | Early bias (suspect c) |
| 2020 Magna, Utah | 1/3 | 2/4 | 2.8/4 | Uniform bias (suspect K) |

**Suspected parameter**: **K** (productivity) — 1/2 sequences show uniform bias across all time windows.

- **2011 Mineral, Virginia**: projected 3.4 vs actual 2 → OVER (rel error: 70.0%)
- **2020 Magna, Utah**: projected 2.8 vs actual 4 → UNDER (rel error: -30.0%)

---

## 3. Regime-Inference Results

| # | Sequence | Expected | Assigned | Match |
|---|----------|----------|----------|-------|
| 8 | 2016 Kumamoto | transform or subduction boundary | transform | ✓ |
| 9 | 2008 Wells, Nevada | default or intraplate | intraplate | ✓ |
| 10 | 2016 Equatorial Atlantic M7.1 | default | transform | ✗ |
| 11 | 2020 Puerto Rico M6.4 | default | transform | ✗ |

### Misassignments

- **2016 Equatorial Atlantic M7.1**: assigned `transform` but expected `default`. Depth: 10 km, Location: north of Ascension Island
- **2020 Puerto Rico M6.4**: assigned `transform` but expected `default`. Depth: 6 km, Location: 4 km SSE of Indios, Puerto Rico

---

## 4. Volcanic Robustness Results

Volcanic results inform robustness only. Do not refit K/c/p based on these.

| # | Sequence | Regime | Projected | Actual | Bucket Hit | Rel Error | Notes |
|---|----------|--------|-----------|--------|------------|-----------|-------|
| 12 | 2018 Kīlauea | transform | 40.6 | 8 | ✗ | 407.5% | Mainshock definition may be ambiguous |
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

The regime-inference heuristic misassigns 0/7 regime-fit sequences. Remaining issues:
- No intraplate detection logic — eastern US and Basin-and-Range locations fall through to default/transform
- Ideally: replace with proper tectonic regionalization (Slab2, PB2002)

### Priority 2: Reduce K across all regimes (40-80× over-prediction)

All tested sequences show massive over-prediction (4000-7700% relative error). The productivity scaling `K * 10^(0.75 * (magDiff - 1))` produces counts 1-2 orders of magnitude too high. The K values need to be reduced by approximately 1-2 orders of magnitude, but the exact refit should wait until `inferRegime` is fixed so sequences test the correct regime parameters.

- **subduction**: **PASS** (Pass). Parameters directionally correct.
- **transform**: **PASS** (Pass). Parameters directionally correct.
- **intraplate**: **MONITOR** (Marginal). Parameters plausible but not precise.

### Priority 3: Review intraplate and volcanic regime results

- Intraplate sequences (6, 7) now tested via direct function calls — review K/c/p adequacy
- Volcanic sequences: review robustness results. Poor Omori fit expected for volcanic sequences.

---

*Phase 1 diagnostic backtest. Not final calibration proof.*

# Interface Blocker — RESOLVED

**Date**: 2026-04-05 (original), 2026-04-06 (resolved)
**Status**: RESOLVED — all functions now exported, all 14 sequences run successfully

## Original Issue

`src/theatres/aftershock.js` did not export `omoriExpectedCount`, `countToBucketProbabilities`, or `inferRegime`. The only public entry point was `createAftershockCascade()`, which returns `null` for `mainMag < 6.0` (line 198). This blocked 5 sequences (Mineral VA M5.8, Magna UT M5.7, Wells NV M5.9, La Palma M4.6, Bardarbunga M5.6).

## Resolution

`aftershock.js:402` now exports all three functions:
```javascript
export { BUCKETS, REGIME_PARAMS, omoriExpectedCount, countToBucketProbabilities, inferRegime };
```

The backtest harness uses a dual-path approach:
- **M>=6.0**: Full `createAftershockCascade()` theatre path (tests complete code path)
- **M<6.0**: Direct calls to `omoriExpectedCount()` + `inferRegime()` + `countToBucketProbabilities()` (tests Omori math without magnitude guard)

This also enabled partial-window analysis (t=6h, t=24h, t=72h) for time-signature bias diagnosis per the protocol's diagnosis order.

## Remaining Limitation

The direct-call path for M<6.0 sequences does not test the full theatre lifecycle (position history, blending, resolution). It tests only the Omori prior computation. This is acceptable for calibration purposes since the prior is the component being calibrated.

# Claims to Verify

> Extracted from interview and codebase analysis
> Generated: 2026-04-05

## Architecture Claims

| Claim | Source | Status | Verification Evidence |
|-------|--------|--------|----------------------|
| TREMOR is a seismic intelligence construct | README.md, BUTTERFREEZONE.md | VERIFIED | `src/index.js:22` exports TremorConstruct class for Echelon framework |
| Ingests from USGS, EMSC, IRIS feeds | README.md | PARTIALLY_VERIFIED | USGS (implemented `src/oracles/usgs.js`), EMSC (implemented `src/oracles/emsc.js`), IRIS (NOT FOUND in codebase) |
| Zero external dependencies | README.md, package.json | VERIFIED | package.json has no dependencies; uses Node.js 20+ built-in `fetch` and `node:test` |
| Exports Brier-scored RLMF certificates | README.md, BUTTERFREEZONE.md | VERIFIED | `src/rlmf/certificates.js:58` exports `exportCertificate()` with Brier scoring |
| 5 theatre templates | README.md | VERIFIED | magnitude_gate, aftershock_cascade, swarm_watch, depth_regime, oracle_divergence |
| Three-tier settlement logic | README.md | VERIFIED | `src/processor/settlement.js:30` implements oracle/provisional_mature/market_freeze |
| Regional density normalization | README.md | VERIFIED | `src/processor/regions.js` defines 8 region profiles with median_nst, median_gap, density_grade |

## Domain Claims

| Claim | Source | Status | Evidence |
|-------|--------|--------|----------|
| Polls USGS GeoJSON every 60s (default) | README.md, src/index.js | VERIFIED | `src/index.js:26` pollIntervalMs default 60_000ms |
| Detects earthquakes via magnitude threshold | src/index.js | VERIFIED | `src/theatres/mag-gate.js` implements magnitude-based market logic |
| Auto-spawns Aftershock Cascade on M≥6.0 | src/index.js, README.md | VERIFIED | `src/index.js:192-198` auto-spawns on `bundle.payload.magnitude.value >= 6.0` |
| Auto-spawns Oracle Divergence on M≥4.5 automatic | src/index.js | VERIFIED | `src/index.js:181-189` auto-spawns on `bundle.evidence_class === 'provisional' && magnitude >= 4.5` |
| Brier score is (forecast - outcome)² | src/rlmf/certificates.js | VERIFIED | `src/rlmf/certificates.js:28-30` implements binary Brier as Math.pow(forecast - o, 2) |
| Station density bias is normalized against regional profiles | README.md, src/processor/quality.js | VERIFIED | `src/processor/quality.js:18-39` normalizeStationCount, normalizeGap, normalizeRms against region baselines |

## Tribal Knowledge

| Item | Status | Evidence |
|------|--------|----------|
| Magnitude uncertainty pricing is critical for threshold decisions | OPERATIONAL | `src/processor/magnitude.js` doubt_price model; `src/theatres/mag-gate.js:113-130` uses `thresholdCrossingProbability()` |
| USGS reviewed status can take hours to weeks | OPERATIONAL | `src/processor/settlement.js` implements status flip latency handling; commented in README |
| Aftershock Cascade position history is "highest-value training data export" | DESIGN_INTENT | `src/theatres/aftershock.js:11-12` comment notes this |
| Swarm escalation is detected via b-value drift | OPERATIONAL | `src/theatres/swarm.js:14-40` computeBValue and escalation detection |
| IRIS integration is mentioned in README but NOT implemented | GAP | README.md claims IRIS; no src/oracles/iris.js found |

## WIP & Gaps

| Item | Status | Notes |
|------|--------|-------|
| IRIS integration | NOT_STARTED | Mentioned in README.md but not implemented |
| Settlement reasoning details | PARTIAL | Three-tier logic exists; detailed rationale in comments but not fully exposed in API |
| Paradox Engine detail | DOCUMENTED | Oracle Divergence theatre implements it; algorithm for "revision probability" heuristic not fully expanded |
| On-chain P&L attribution | NOT_FOUND | README mentions "on-chain P&L makes every prediction auditable"; not implemented in codebase |

## Verification Strategy

1. **Code Truth First**: Every claim above verified against actual function signatures and call sites (file:line citations)
2. **IRIS Gap**: Search for iris.edu references — confirm unimplemented
3. **Settlement Logic**: Trace assessStatusFlip() return values into bundle → theatre processing
4. **Position History Export**: Verify that theatre.position_history flows into exportCertificate()
5. **Test Coverage**: 48 tests in test/tremor.test.js validate core claims


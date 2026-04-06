# TREMOR Omori Backtest Protocol

**Version**: 1.0
**Date**: 2026-04-05
**Status**: Pre-committed — do not deviate from these definitions during or after backtest execution.
**Purpose**: Freeze all experimental parameters before running the backtest. If a result looks wrong, the protocol is the first thing you check — not the sequence list.

---

## Separation of concerns

This backtest tests two distinct things. Keep them separate or results become uninterpretable.

| Test type | Question | How to identify |
|-----------|----------|-----------------|
| **Regime-fit** | Are K/c/p correct for this regime? | Regime assignment is unambiguous from location and depth |
| **Regime-inference** | Does `inferRegime` assign the right regime? | Regime assignment is contested or boundary-case |

Never use a regime-inference case to draw conclusions about K/c/p calibration. Never use a regime-fit case to draw conclusions about `inferRegime` accuracy. When a sequence is ambiguous, assign it to inference testing only.

---

## Sequence list

### Regime-fit sequences (clean — use for K/c/p calibration conclusions)

| Sequence | Regime | Mainshock | Rationale |
|----------|--------|-----------|-----------|
| 2011 Tōhoku, Japan | subduction | M9.0, 2011-03-11 | Canonical, dense catalog |
| 2010 Maule, Chile | subduction | M8.8, 2010-02-27 | Different geometry from Tōhoku |
| 2014 Iquique, Chile | subduction | M8.2, 2014-04-01 | Smaller, cleaner aftershock zone |
| 2019 Ridgecrest, California | transform | M7.1, 2019-07-06 | Recent, excellent USGS coverage |
| 2010 El Mayor-Cucapah, Mexico | transform | M7.2, 2010-04-04 | Cross-border, tests catalog completeness |
| 2011 Mineral, Virginia | intraplate | M5.8, 2011-08-23 | Classic eastern US intraplate |
| 2020 Magna, Utah | intraplate | M5.7, 2020-03-18 | Recent, good coverage |

### Regime-inference / edge-case sequences (do not use for K/c/p conclusions)

| Sequence | Purpose | Expected `inferRegime` output |
|----------|---------|-------------------------------|
| 2016 Kumamoto, Japan | Complex sequence — foreshock/mainshock ambiguity tests sequence definition handling | transform or subduction boundary |
| 2008 Wells, Nevada | Basin and Range ambiguity — transform/intraplate boundary | default or intraplate |
| 2016 Equatorial Atlantic M7.1 (`us20006uy6`) — 0.046°S, 17.826°W, 2016-08-29 04:29:57 UTC | Outside bbox coverage — open equatorial Atlantic, no regional profile applies | default |
| 2020 Puerto Rico M6.4 (`us70006vll`) — 17.958°N, 66.811°W, 2020-01-07 08:24:27 UTC | Bbox boundary, ambiguous tectonic context — oblique normal faulting, Caribbean plate boundary | default |

### Volcanic sequences (robustness / stress-test only — not K/c/p calibration)

| Sequence | Rationale |
|----------|-----------|
| 2018 Kīlauea, Hawaii | High-volume swarm, violates simple mainshock→aftershock framing |
| 2021 La Palma, Canary Islands | Different network characteristics, European catalog |
| 2014 Bárðarbunga, Iceland | High-volume volcanic swarm |

**Volcanic results inform robustness assessment only.** Do not refit K/c/p for the volcanic regime based solely on these sequences. Volcanic systems routinely violate the Omori mainshock→aftershock framing. A poor fit here is expected, not diagnostic.

---

## Mainshock definition (precommitted — do not adjust after seeing results)

- **Mainshock** = the largest magnitude event initiating the modeled sequence window, as identified in the USGS catalog at reviewed status.
- For sequences with a clear foreshock (e.g., Kumamoto M6.2 on 2016-04-14): the mainshock is the larger event (M7.3 on 2016-04-16). The foreshock is excluded from the aftershock count window.
- For sequences where the largest event is ambiguous (swarms): document the ambiguity, assign to inference/robustness testing, and exclude from K/c/p calibration conclusions.

---

## 72-hour window definition (precommitted)

- **Window start**: mainshock origin time (UTC), taken from USGS reviewed record.
- **Window end**: mainshock origin time + 72 hours exactly.
- Foreshocks occurring before window start: excluded from count.
- Events occurring exactly at window boundaries: include start, exclude end (half-open interval).

---

## Count rules (precommitted)

- **Magnitude threshold**: M≥4.0, matching TREMOR's Aftershock Cascade bucket definition.
- **Geographic inclusion**: events within the TREMOR match radius for the mainshock (1.5× Wells & Coppersmith rupture length, converted to degrees via ÷111 km approximation). Use TREMOR's own `matchRadius` calculation — do not substitute a different geographic filter.
- **Catalog version**: USGS reviewed events only. Automatic-only events excluded. If a reviewed version is not available for an event within the window, exclude that event from the count.
- **Duplicate handling**: if an event appears with multiple `updated` timestamps, use the most recent reviewed version only.
- **Non-tectonic exclusions**: quarry blasts, explosions, and events flagged `type: "quarry blast"` or `type: "explosion"` in the USGS catalog are excluded.

---

## Scoring metrics (all four required — bucket hit/miss alone is insufficient)

For each sequence, record:

| Metric | Definition |
|--------|-----------|
| **Projected count** | TREMOR's Omori prior integrated over 72h at t=0 |
| **Actual count** | Catalog count per rules above |
| **Bucket hit** | Boolean — did actual count land in TREMOR's predicted bucket? |
| **Relative error** | `(projected − actual) / actual` — signed, so over/under is visible |
| **Log error** | `log(projected + 1) − log(actual + 1)` — reduces sensitivity to large sequences dominating |
| **Probability score** | If TREMOR outputs bucket probabilities: Brier score against actual bucket. If point estimate only: N/A. |

---

## Bias diagnosis order (check in this sequence — do not default to refitting K first)

After running all sequences, inspect bias direction over time within the 72-hour window before drawing any refit conclusions:

1. **If model is systematically wrong immediately after t=0 (first 2-6 hours)**: suspect `c`. The offset parameter controls early-time behavior.
2. **If model is broadly too high or too low across the entire window**: suspect `K`. Productivity parameter controls total count.
3. **If model starts near-correct but drifts over 24-72h**: suspect `p`. Decay exponent controls tail shape.
4. **If bias varies by regime without a clear time signature**: regime assignment (via `inferRegime`) may be the issue, not the parameters.

Do not refit more than one parameter at a time without a clear signal.

---

## Result classification

| Outcome | Threshold | Interpretation |
|---------|-----------|----------------|
| **Pass** | Bucket hit rate ≥ 70%, mean relative error < 30% | Parameters directionally correct for this regime |
| **Marginal** | Bucket hit 50-70% or relative error 30-60% | Parameters plausible, flag for future calibration |
| **Fail** | Bucket hit < 50% or relative error > 60% | Parameters need refit before production use |

Apply these thresholds per-regime across clean regime-fit sequences only. Do not apply to inference or volcanic sequences.

---

## What this backtest can and cannot conclude

**Can conclude (14 sequences, phase 1 diagnostic):**
- Directional bias per regime (systematically over or under)
- Which regimes are clearly broken vs plausible
- Which parameter (K, c, or p) is the likely source of bias

**Cannot conclude:**
- Tight parameter confidence intervals
- Final calibration values ready for production merge
- Whether volcanic Omori parameters are correct (wrong test for that question)

**Label all outputs as**: Phase 1 diagnostic backtest. Not final calibration proof.

---

## Protocol change rule

If you believe a protocol definition needs to change after seeing results, document the proposed change, the reason, and the result that prompted it — then re-run the affected sequences under the new definition. Do not silently adjust definitions to improve results.

---

*Save to `grimoires/loa/calibration/omori-backtest-protocol.md` before running any backtest sequences.*

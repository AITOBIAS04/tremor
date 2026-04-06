# TREMOR Sprint — Omori K Refit

**Scope**: Refit base K values in `src/theatres/aftershock.js` using empirical targets from Run 4 backtest. Check for magnitude-dependent bias before committing to final values. Re-run the backtest as Run 5. Two things may change: `src/theatres/aftershock.js` and, if necessary, test assertions that reference Omori projected counts.

**Stop condition**: K values updated, backtest re-run as Run 5 (separate from Run 4), diagnostic report written, summary states whether refit is complete or provisional. Do not touch c, p, bath_delta, or the 0.75 scaling exponent.

**Hard constraints**:
- Zero new runtime npm dependencies
- Only `src/theatres/aftershock.js` and test files may change — no other source files
- Do not change c, p, bath_delta, or the 0.75 scaling exponent
- Do not overwrite Run 4 artifacts — Run 4 is the baseline that justifies this refit and must be preserved
- Re-run `scripts/omori-backtest.js` after the refit — do not simulate results
- Preserve all existing `// source:` and `// TBD:` comment blocks except where explicitly updated below

---

## Context

Run 4 backtest (`grimoires/loa/calibration/omori-backtest/diagnostic-report.md`, labeled "Run 4 — inferRegime fully corrected") produced empirical K targets:

| Regime | K_current | K_empirical (median) | Reduction factor |
|--------|-----------|----------------------|-----------------|
| subduction | 25 | 0.22 | ~114x |
| transform | 15 | 0.29 | ~52x |
| intraplate | 8 | 0.24 | ~33x |

Before applying these targets, complete the magnitude-dependence check below. The refit may be a partial fix only.

---

## Step 1 — Preserve Run 4 artifacts

Before touching anything, verify Run 4 is intact:

```bash
ls grimoires/loa/calibration/omori-backtest/
```

Run 4 sequence JSONs and diagnostic report must exist and must not be overwritten at any point in this sprint. Run 5 outputs go to a separate path:

```
grimoires/loa/calibration/omori-backtest/run-5/
```

Create this directory now if it does not exist.

---

## Step 2 — Check for magnitude-dependent bias

The productivity scaling formula is:

```
expectedCount = K * 10^(0.75 * (mainMag - thresholdMag - 1))
```

If the 0.75 exponent over-amplifies for large events, relative error should be substantially larger for M8-9 sequences than M6-7 sequences within the same regime. If K is the primary problem, relative error should be roughly proportional across magnitudes.

From the Run 4 sequence JSONs, build this table using regime-fit sequences only:

| Sequence | Mainshock M | Regime | Projected | Actual | Rel Error |
|----------|------------|--------|-----------|--------|-----------|
| (fill from JSONs) | | | | | |

Sort by mainshock magnitude within each regime.

**Interpretation**: if relative error at M8-9 is substantially larger than at M6-7 for the same regime, this is suggestive (not confirmatory given the sample size) that the 0.75 exponent is a contributing factor. Flag it as warranting a follow-on sprint. With only a handful of sequences per regime, do not use this check to make a definitive claim about the exponent — only to assess whether K refit alone is likely sufficient.

Write this table to `grimoires/loa/calibration/omori-backtest/k-refit-notes.md` so the reasoning is reviewable independently of the code change.

---

## Step 3 — Compute K refit values

For each regime, compute K_refit as the median of per-sequence empirical K across clean regime-fit sequences only (role = regime-fit, regime_assigned === regime_expected):

```
K_empirical_per_sequence = K_current / (projected_count / actual_count)
K_refit = median(K_empirical_per_sequence values for this regime)
```

**Guards**:
- If `actual_count` is zero or non-finite for any sequence: exclude that sequence from the median and note it explicitly in `k-refit-notes.md`
- If `projected_count / actual_count` is non-finite: exclude and note

Do not use inference sequences or volcanic sequences in this calculation.

**Intraplate specifically**: only 2 sequences (Mineral, Magna). With 2 data points the median equals the mean and confidence is low. Do not impose an uncited floor value. Instead, compute the median as normal, mark it as provisional in the comment block, and flag it for human review before merging. Write explicitly in `k-refit-notes.md`: "Intraplate K refit is provisional — 2 sequences only, not sufficient for confident calibration."

Write the full per-sequence calculation table, per-regime medians, and any excluded sequences to `k-refit-notes.md`.

---

## Step 4 — Apply the refit values

Update `REGIME_PARAMS` in `src/theatres/aftershock.js`:

- `subduction.K` → K_refit for subduction
- `transform.K` → K_refit for transform
- `intraplate.K` → K_refit for intraplate (provisional)
- `volcanic.K` → do not change
- `default.K` → do not change

Update the comment block above `REGIME_PARAMS`. Do not hardcode the sequence count — reference the notes file instead, since exclusions may reduce it:

```javascript
// K values: backtest-derived empirical refit from Run 4 (2026-04-06)
//   subduction K: source: grimoires/loa/calibration/omori-backtest/k-refit-notes.md
//   transform K:  source: grimoires/loa/calibration/omori-backtest/k-refit-notes.md
//   intraplate K: PROVISIONAL — 2 sequences only, flag for human review before production merge
//                 source: grimoires/loa/calibration/omori-backtest/k-refit-notes.md
//   volcanic K:   TBD: empirical calibration needed (robustness-only, no clean calibration data)
//   default K:    TBD: empirical calibration needed (1 sequence, insufficient for refit)
// c, p, bath_delta: TBD — empirical calibration needed
// 0.75 scaling exponent: source: Reasenberg & Jones (1989)
//   magnitude-dependence: see k-refit-notes.md — follow-on sprint may be warranted
```

Do not upgrade any value to `DATA-FACTUAL`. K is now backtest-derived, not ground-truth factual. The distinction matters — this is a small-sample empirical fit, not a validated measurement.

---

## Step 5 — Run the backtest as Run 5

First, verify whether `scripts/omori-backtest.js` supports an output directory argument or environment variable. If it does not, and targeting `run-5/` would require modifying the script (outside the allowed scope of this sprint), stop immediately and write `grimoires/loa/calibration/omori-backtest/run-5-interface-blocker.md` explaining the gap. Do not risk overwriting Run 4 by running the script against the default output path.

If the script can target `run-5/`:

```bash
node scripts/omori-backtest.js
```

Write all outputs to `grimoires/loa/calibration/omori-backtest/run-5/` — sequence JSONs and diagnostic report. Do not touch the root `omori-backtest/` directory where Run 4 lives.

Label the Run 5 diagnostic report clearly at the top:
```
Run 5 — K refitted from Run 4 empirical targets. Run 4 preserved at grimoires/loa/calibration/omori-backtest/.
```

---

## Step 6 — Evaluate and abort clause

For each regime, check against protocol thresholds:

| Outcome | Threshold |
|---------|-----------|
| Pass | Bucket hit rate ≥ 70%, mean relative error < 30% |
| Marginal | Bucket hit 50–70% or relative error 30–60% |
| Fail | Bucket hit < 50% or relative error > 60% |

**Abort clause**: if Run 5 produces materially worse bucket hit rate or relative error for a calibrated regime compared to Run 4, stop. Revert the K changes in `src/theatres/aftershock.js` using `git checkout src/theatres/aftershock.js`. Preserve `k-refit-notes.md` and the Run 5 artifacts — do not delete them. Write a note in `k-refit-notes.md` explaining which regime worsened and by how much, and stop for human review. This should not happen given the refit direction, but if it does it indicates a calculation error or a structural problem with the formula.

**If any regime still Fails after refit**: check whether the failure is concentrated in M8-9 sequences. If yes, note in the diagnostic report that the 0.75 exponent is a likely contributing factor — suggestive given sample size, not confirmed. If failure is uniform across magnitudes, note that the empirical K targets themselves may be biased and a larger sequence dataset is needed.

**If all regimes Pass or Marginal**: state this clearly. The K refit is complete for these regimes pending human review of the provisional intraplate value.

---

## Step 7 — Tests

Run `node --test`. Expected result: full pass of the current suite with zero failures.

If any test was asserting a specific Omori projected count that now changes due to K refit, update the expected value in the test and note each change in the summary. Test file changes are permitted for this reason only.

---

## Definition of done

- [ ] Run 4 artifacts intact and unmodified
- [ ] `grimoires/loa/calibration/omori-backtest/run-5/` created with fresh outputs, or interface-blocker written if script cannot target it
- [ ] `k-refit-notes.md` written with magnitude-dependence table, per-sequence K calculations, per-regime medians, and any excluded sequences
- [ ] Magnitude-dependence check documented — suggestive of exponent issue or not
- [ ] K_refit computed from clean regime-fit sequences only, with zero/non-finite guards applied
- [ ] Intraplate K flagged as provisional with explicit note
- [ ] `REGIME_PARAMS` updated for subduction, transform, intraplate
- [ ] Comment block references k-refit-notes.md — no hardcoded sequence count
- [ ] K marked backtest-derived, not DATA-FACTUAL
- [ ] Abort clause checked — if triggered, K changes reverted and notes written
- [ ] Per-regime Pass/Marginal/Fail verdict stated for Run 5
- [ ] If 0.75 exponent warrants follow-on sprint: flagged explicitly
- [ ] Full test suite passes with zero failures
- [ ] Summary states whether refit is complete, provisional, or interim

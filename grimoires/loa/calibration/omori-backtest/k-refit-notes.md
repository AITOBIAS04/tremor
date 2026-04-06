# K Refit Notes — Sprint K Refit

**Date**: 2026-04-05
**Baseline**: Run 4 — inferRegime fully corrected
**Source data**: grimoires/loa/calibration/omori-backtest/sequence-{01..07}.json

---

## 1. Magnitude-Dependence Check

The sprint requires checking whether relative error is substantially larger for M8-9 sequences than M6-7 sequences within the same regime, which would suggest the 0.75 scaling exponent is a contributing factor beyond what K alone can explain.

### Per-Sequence Data (regime-fit only, sorted by magnitude within regime)

| Sequence | Mainshock M | Regime | Projected | Actual | Rel Error |
|----------|------------|--------|-----------|--------|-----------|
| 2014 Iquique | 8.2 | subduction | 27105.5 | 238 | 112.9x |
| 2010 Maule | 8.8 | subduction | 76393.5 | 672 | 112.7x |
| 2011 Tohoku | 9.1 | subduction | 128249.8 | 1422 | 89.2x |
| 2019 Ridgecrest | 7.1 | transform | 2959.3 | 67 | 43.2x |
| 2010 El Mayor-Cucapah | 7.2 | transform | 3517.2 | 57 | 60.7x |
| 2020 Magna, Utah | 5.7 | intraplate | 94.6 | 4 | 22.7x |
| 2011 Mineral, Virginia | 5.8 | intraplate | 112.4 | 2 | 55.2x |

### Interpretation

**Subduction**: All three sequences are M8.2-9.1. No M6-7 subduction sequences exist in the dataset to compare against. Within the M8-9 range, relative error is roughly constant (89-113x) — no clear trend with magnitude. The M9.1 Tohoku actually has the *lowest* relative error (89x), opposite to what exponent over-amplification would predict.

**Transform**: Both sequences are M7.1-7.2 — essentially identical magnitude. No magnitude diversity to test the hypothesis.

**Intraplate**: Both sequences are M5.7-5.8 — essentially identical magnitude. No magnitude diversity to test the hypothesis.

**Conclusion**: The magnitude-dependence check is **inconclusive**. The dataset lacks magnitude diversity within any single regime — all sequences cluster at similar magnitudes. We cannot assess whether the 0.75 exponent over-amplifies for large events compared to small events *within the same regime*. A follow-on sprint with a broader magnitude range per regime would be needed to properly test this. However, the uniform over-prediction direction (always too high, by 1-2 orders of magnitude) across all regimes strongly supports K as the primary problem.

**Follow-on sprint warranted?** Not based on this check alone — the data is insufficient to implicate the exponent. However, the Run 4 diagnostic report notes that the 0.75 exponent from Reasenberg & Jones (1989) was calibrated on California M4-6 sequences and may over-amplify for M7-9 events. This remains a valid concern warranting future investigation with a larger, magnitude-diverse dataset.

---

## 2. K Refit Calculation

### Formula

```
K_empirical_per_sequence = K_current / (projected_count / actual_count)
                        = K_current * actual_count / projected_count
K_refit = median(K_empirical values for regime)
```

### Guards Applied

- All 7 regime-fit sequences have actual_count > 0 and finite: no exclusions needed
- All projected_count / actual_count ratios are finite: no exclusions needed
- No inference or volcanic sequences included in calculation

### Subduction (K_current = 25, 3 sequences)

| Sequence | Mainshock M | Projected | Actual | Ratio (proj/act) | K_empirical |
|----------|------------|-----------|--------|-------------------|-------------|
| 2011 Tohoku | 9.1 | 128249.8 | 1422 | 90.19 | 0.277 |
| 2010 Maule | 8.8 | 76393.5 | 672 | 113.68 | 0.220 |
| 2014 Iquique | 8.2 | 27105.5 | 238 | 113.89 | 0.220 |

Sorted K_empirical: [0.220, 0.220, 0.277]
**Median K_refit: 0.220** (3 sequences — median is middle value)

### Transform (K_current = 15, 2 sequences)

| Sequence | Mainshock M | Projected | Actual | Ratio (proj/act) | K_empirical |
|----------|------------|-----------|--------|-------------------|-------------|
| 2019 Ridgecrest | 7.1 | 2959.3 | 67 | 44.17 | 0.340 |
| 2010 El Mayor-Cucapah | 7.2 | 3517.2 | 57 | 61.71 | 0.243 |

Sorted K_empirical: [0.243, 0.340]
**Median K_refit: 0.291** (2 sequences — median = mean of both values)

### Intraplate (K_current = 8, 2 sequences)

| Sequence | Mainshock M | Projected | Actual | Ratio (proj/act) | K_empirical |
|----------|------------|-----------|--------|-------------------|-------------|
| 2011 Mineral, Virginia | 5.8 | 112.4 | 2 | 56.20 | 0.142 |
| 2020 Magna, Utah | 5.7 | 94.6 | 4 | 23.65 | 0.338 |

Sorted K_empirical: [0.142, 0.338]
**Median K_refit: 0.240** (2 sequences — median = mean of both values)

**Intraplate K refit is provisional — 2 sequences only, not sufficient for confident calibration.** The two K_empirical values differ by 2.4x (0.142 vs 0.338), reflecting the small sample and different event characteristics (Mineral had only 2 aftershocks M>=4.0 in 72h, Magna had 4). Human review is required before production merge.

### Summary

| Regime | K_current | K_refit | Reduction | Sequences | Confidence |
|--------|-----------|---------|-----------|-----------|------------|
| subduction | 25 | 0.220 | ~114x | 3 | Moderate (consistent ratios) |
| transform | 15 | 0.291 | ~52x | 2 | Low-moderate (2 sequences) |
| intraplate | 8 | 0.240 | ~33x | 2 (PROVISIONAL) | Low (2 sequences, wide spread) |
| volcanic | 30 | unchanged | — | 0 clean sequences | N/A |
| default | 18 | unchanged | — | 0 clean sequences | N/A |

### Excluded Sequences

None excluded. All 7 regime-fit sequences had finite, non-zero actual_count and projected_count values.

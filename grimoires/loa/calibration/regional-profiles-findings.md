# Study 4 — Regional Profile Recalibration Findings

**Date**: 2026-04-06
**Data source**: USGS FDSN event web service, M4.5+ reviewed earthquakes, 2021-01-01 to 2026-01-01
**Evidence tag**: DATA-FACTUAL (all measured values derived from USGS catalog queries)

## Per-Region Comparison

| Region | Field | Current | Measured Median | Deviation % | Flag | Events (n) |
|--------|-------|---------|-----------------|-------------|------|------------|
| US West Coast | median_nst | 120 | 72.00 | -40.0% ⚠️ | 115 events |
| | median_gap | 35 | 127.50 | +264.3% ⚠️ | 166 events |
| | baseline_rms | 0.15 | 0.65 | +333.3% ⚠️ | 166 events |
| Japan | median_nst | 200 | 77.00 | -61.5% ⚠️ | 1342 events |
| | median_gap | 25 | 109.00 | +336.0% ⚠️ | 1811 events |
| | baseline_rms | 0.12 | 0.66 | +450.0% ⚠️ | 1811 events |
| Mediterranean | median_nst | 60 | 84.00 | +40.0% ⚠️ | 634 events |
| | median_gap | 55 | 51.00 | -7.3% | 811 events |
| | baseline_rms | 0.25 | 0.71 | +184.0% ⚠️ | 811 events |
| Central Asia | median_nst | 30 | 78.00 | +160.0% ⚠️ | 692 events |
| | median_gap | 80 | 70.00 | -12.5% | 882 events |
| | baseline_rms | 0.35 | 0.70 | +100.0% ⚠️ | 882 events |
| South Pacific | median_nst | 15 | 40.00 | +166.7% ⚠️ | 4835 events |
| | median_gap | 120 | 102.00 | -15.0% | 7991 events |
| | baseline_rms | 0.5 | 0.73 | +46.0% ⚠️ | 7991 events |
| Mid-Atlantic Ridge | median_nst | 8 | 39.00 | +387.5% ⚠️ | 682 events |
| | median_gap | 180 | 74.00 | -58.9% ⚠️ | 892 events |
| | baseline_rms | 0.6 | 0.63 | +5.0% | 892 events |
| South America West | median_nst | 40 | 61.00 | +52.5% ⚠️ | 1527 events |
| | median_gap | 65 | 81.00 | +24.6% ⚠️ | 2098 events |
| | baseline_rms | 0.3 | 0.75 | +150.0% ⚠️ | 2098 events |
| Alaska / Aleutians | median_nst | 35 | 121.00 | +245.7% ⚠️ | 376 events |
| | median_gap | 75 | 117.00 | +56.0% ⚠️ | 511 events |
| | baseline_rms | 0.3 | 0.73 | +143.3% ⚠️ | 664 events |

## Recommendations

- **US West Coast.median_nst**: Replace `120` → `72.00` (-40.0% deviation). Evidence: DATA-FACTUAL.
- **US West Coast.median_gap**: Replace `35` → `127.50` (+264.3% deviation). Evidence: DATA-FACTUAL.
- **US West Coast.baseline_rms**: Replace `0.15` → `0.65` (+333.3% deviation). Evidence: DATA-FACTUAL.
- **Japan.median_nst**: Replace `200` → `77.00` (-61.5% deviation). Evidence: DATA-FACTUAL.
- **Japan.median_gap**: Replace `25` → `109.00` (+336.0% deviation). Evidence: DATA-FACTUAL.
- **Japan.baseline_rms**: Replace `0.12` → `0.66` (+450.0% deviation). Evidence: DATA-FACTUAL.
- **Mediterranean.median_nst**: Replace `60` → `84.00` (+40.0% deviation). Evidence: DATA-FACTUAL.
- **Mediterranean.baseline_rms**: Replace `0.25` → `0.71` (+184.0% deviation). Evidence: DATA-FACTUAL.
- **Central Asia.median_nst**: Replace `30` → `78.00` (+160.0% deviation). Evidence: DATA-FACTUAL.
- **Central Asia.baseline_rms**: Replace `0.35` → `0.70` (+100.0% deviation). Evidence: DATA-FACTUAL.
- **South Pacific.median_nst**: Replace `15` → `40.00` (+166.7% deviation). Evidence: DATA-FACTUAL.
- **South Pacific.baseline_rms**: Replace `0.5` → `0.73` (+46.0% deviation). Evidence: DATA-FACTUAL.
- **Mid-Atlantic Ridge.median_nst**: Replace `8` → `39.00` (+387.5% deviation). Evidence: DATA-FACTUAL.
- **Mid-Atlantic Ridge.median_gap**: Replace `180` → `74.00` (-58.9% deviation). Evidence: DATA-FACTUAL.
- **South America West.median_nst**: Replace `40` → `61.00` (+52.5% deviation). Evidence: DATA-FACTUAL.
- **South America West.median_gap**: Replace `65` → `81.00` (+24.6% deviation). Evidence: DATA-FACTUAL.
- **South America West.baseline_rms**: Replace `0.3` → `0.75` (+150.0% deviation). Evidence: DATA-FACTUAL.
- **Alaska / Aleutians.median_nst**: Replace `35` → `121.00` (+245.7% deviation). Evidence: DATA-FACTUAL.
- **Alaska / Aleutians.median_gap**: Replace `75` → `117.00` (+56.0% deviation). Evidence: DATA-FACTUAL.
- **Alaska / Aleutians.baseline_rms**: Replace `0.3` → `0.73` (+143.3% deviation). Evidence: DATA-FACTUAL.

## Truncation Notes

No regions hit the truncation limit.

## Methodology

- One FDSN query per region bounding box with 500ms delay between queries
- Antimeridian-crossing regions (South Pacific) split into two bbox queries
- Medians computed only over events where the field is present and non-null
- Deviation = (measured − current) / current × 100%
- Flag threshold: |deviation| > 15%

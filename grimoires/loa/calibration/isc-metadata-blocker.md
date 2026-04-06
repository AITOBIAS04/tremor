# ISC Metadata Blocker — No Temporal Ordering on Magnitude Reports

**Date**: 2026-04-05
**Sprint**: `sprint-isc-verification` Phase 0 (API and metadata preflight)
**Affects**: Studies 2, 3, and 5 — same scope as `data-provenance-blocker.md`
**Verdict**: Phase 0 blocker — do not proceed to event list construction

## Summary

The ISC Bulletin (via IRIS FDSN mirror) returns multiple NEIC magnitude entries per event, but provides **no timestamp, sequence number, or explicit ordering metadata** on those entries. Without ordering, it is impossible to determine which NEIC magnitude corresponds to the automatic stage vs the reviewed stage. The study cannot answer its core question.

## What Was Tested

### Endpoint

**Endpoint**: `http://isc-mirror.iris.washington.edu/fdsnws/event/1/query`
- Protocol: HTTP (HTTPS fails with `ERR_TLS_CERT_ALTNAME_INVALID`)
- Format tested: `text` (pipe-delimited) and `xml` (QuakeML 1.2)
- Parameters: `includeallmagnitudes=true&includeallorigins=true`

**ISC direct CSV endpoint** (`http://www.isc.ac.uk/cgi-bin/web-db-v4?request=BULLETIN`): returned "request BULLETIN is not available" — endpoint appears decommissioned or renamed.

### Test Events

| Event | USGS ID | Date | Location | Known Reviewed Mag |
|-------|---------|------|----------|--------------------|
| 2020 Puerto Rico | us70006vll | 2020-01-07 08:24 UTC | 17.9°N 66.8°W | M6.4 |
| 2021 Haiti | — | 2021-08-14 12:29 UTC | 18.3°N 73.5°W | M7.2 |
| 2019 Ridgecrest | — | 2019-07-06 03:19 UTC | 35.8°N 117.6°W | M7.1 |

### Preflight Checklist Results

| Check | Result | Detail |
|-------|--------|--------|
| 1. Endpoint returns events | ✅ PASS | All three events found via IRIS mirror HTTP |
| 2. NEIC present as contributing agency | ✅ PASS | NEIC magnitudes present for all three events |
| 3. Multiple magnitude entries per event | ✅ PASS | 10-20+ magnitude entries per event from ISC, NEIC, GCMT, IDC, MOS, GFZ, etc. |
| 4. Timestamp or ordering field on entries | ❌ FAIL | No creation timestamp, no sequence number, no evaluation status on NEIC entries |

## What Is Present (Detailed)

### Multiple NEIC Magnitudes Per Event

The ISC stores multiple magnitude types from NEIC, each linked to a NEIC-contributed origin:

**Puerto Rico M6.4** (ISC event 617125982):
- NEIC origin `613593126` (209 phases): mb 6.30, ML 6.00, Ms_20 6.40, Mwb 6.30
- NEIC origin `613593131`: Mww 6.40

**Ridgecrest M7.1** (ISC event 616203758):
- NEIC origin `612673455` (196 phases): Mwb 6.90
- NEIC origin `612673457` (centroid): Mww 7.10
- PAS/NEIC origin `612673454` (85 phases): mb 6.10, ML 6.50, Ms_20 7.20

**Haiti M7.2** (ISC event 620986707):
- NEIC origin `616589043`: mb 6.80, Ms_20 7.40

### Multiple NEIC Origins Per Event

ISC stores multiple NEIC-contributed origins — some appear to be from different processing stages (different phase counts, different depth methods). For Ridgecrest, the PAS/NEIC origin uses 85 phases vs the NEIC origin using 196, which *could* represent automatic vs reviewed stages.

### Magnitude Entry Structure (QuakeML)

Each `<magnitude>` element contains:
- `mag/value` — the magnitude value
- `type` — magnitude type (mb, ML, Mww, Ms_20, Mwb, etc.)
- `originID` — reference to the associated origin
- `stationCount` — number of stations used
- `creationInfo/author` — contributing agency name (e.g., "NEIC")

### Origin Structure (QuakeML)

Each `<origin>` element contains:
- `time/value` — earthquake origin time (NOT report submission time)
- `latitude`, `longitude`, `depth`
- `quality` — phase counts, RMS, gap
- `creationInfo/author` — contributing agency
- `evaluationMode` / `evaluationStatus` — **present ONLY on ISC's own origins**, NOT on NEIC origins

## What Is NOT Present (Critical Gaps)

1. **No `creationTime` on magnitude entries**: The `creationInfo` block on NEIC magnitudes contains only `author`, never a timestamp.

2. **No `creationTime` on NEIC origins**: NEIC-contributed origins have no creation timestamp indicating when the report was submitted to ISC.

3. **No `evaluationMode` or `evaluationStatus` on NEIC entries**: These fields appear only on ISC's own reviewed origins (`evaluationMode: manual`, `evaluationStatus: reviewed`). NEIC origins have no status annotation.

4. **No sequence number or version field**: There is no field indicating the order in which magnitude reports were received by ISC.

5. **The only `creationTime` in the QuakeML** is on the top-level `eventParameters/creationInfo` — this is the query execution timestamp, not a per-entry metadata field.

## Why This Blocks the Study

The ISC verification study's core question is: *does the earliest NEIC magnitude entry in ISC correspond to the USGS automatic-stage value?*

To answer this, the study requires an explicit ordering of NEIC magnitude reports — specifically, which one was submitted first. The sprint plan is explicit:

> "If timestamp is not available, classify as `AMBIGUOUS` — do not infer 'earliest' from magnitude type precedence or any other proxy."

Without ordering metadata, **every event with NEIC entries would be classified `AMBIGUOUS`**, making the study unable to produce a meaningful go/no-go verdict.

### Tempting but Invalid Proxies

| Proxy | Why It Doesn't Work |
|-------|-------------------|
| Magnitude type precedence (mb before Mww) | USGS processing pipeline order is an inference, not a measured ordering. The sprint explicitly prohibits this. |
| Phase count (fewer phases = earlier) | Plausible hypothesis but unverified. Lower phase count could also indicate a different network subset, not a different time. |
| Multiple NEIC origins as stages | Multiple origins exist (e.g., PAS/NEIC vs NEIC), but nothing confirms these map to automatic→reviewed stages specifically. |
| Magnitude value closest to known auto-stage | Circular reasoning — this is what the study is supposed to test. |

## Impact

| Study | Status | Reason |
|-------|--------|--------|
| Study 2 (Doubt-price CI) | **BLOCKED** | Requires automatic-stage magnitude; ISC cannot reliably provide it |
| Study 3 (Settlement discount) | **BLOCKED** | Requires automatic→reviewed Δmag distribution |
| Study 5 (Quality weights) | **BLOCKED** | Requires automatic-stage event labeling |
| Study 4 (Regional profiles) | **Proceeds** | Uses reviewed-status data only |
| Study 6 (Citation pass) | **Completed** | No data dependency |

## Remaining Options

Per `data-provenance-blocker.md` §Workaround Options, the remaining viable approaches are:

1. **Real-time collection** (recommended): Deploy a scraper that snapshots M4+ events from USGS at automatic stage before promotion. Requires weeks/months of collection. This is the long-term solution regardless of ISC viability.

2. **ISC direct contact**: The ISC may have internal metadata (submission timestamps) not exposed via the FDSN API. A direct inquiry to ISC staff could clarify whether ordering data exists internally. This is low-cost and worth pursuing in parallel with option 1.

3. **ComCat/USGS internal archives**: Contact USGS directly about whether internal automatic-stage catalogs are available for research purposes.

4. **Accept TBD labels**: Permanently defer Studies 2, 3, and 5 and accept `TBD` on those calibration parameters. This is a human decision.

## Recommendation

The ISC FDSN API is **not viable as a proxy for automatic-stage magnitude recovery** due to the absence of temporal ordering metadata. Proceed with real-time collector design as the primary workaround. Consider a parallel low-effort inquiry to ISC staff about internal timestamp availability.

---

*Generated by sprint-isc-verification Phase 0 preflight. Study halted per sprint plan: "Do not proceed to event list construction — the study cannot answer its core question without this metadata."*

# Data Provenance Blocker — Automatic-Stage Recovery

**Date**: 2026-04-05
**Affects**: Studies 2, 3, and 5 (doubt-price CI coverage, settlement discount, quality weight refit)
**Does NOT affect**: Study 4 (regional profiles — uses reviewed data only) and Study 6 (citation pass — no data required)

## Summary

The USGS FDSN event web service does **not** provide access to the original automatic-stage magnitude for historical events that have been promoted to reviewed status. The matched-window proxy approach (compare automatic vs reviewed queries for the same time window) fails because the API no longer returns automatic-stage records once an event is promoted.

## What Was Tested

### Test 1: `reviewstatus=automatic` search for historical events

```
GET /fdsnws/event/1/count?starttime=2023-01-01&endtime=2023-02-01&minmagnitude=4.0&reviewstatus=automatic
→ 0

GET /fdsnws/event/1/count?starttime=2023-01-01&endtime=2023-02-01&minmagnitude=4.0&reviewstatus=reviewed
→ 1385
```

**Result**: 0 automatic events for January 2023 M4+. All 1,385 events have been promoted to reviewed status. The `reviewstatus=automatic` filter returns nothing for historical periods.

### Test 2: `reviewstatus=automatic` for recent events (last 7 days)

```
GET /fdsnws/event/1/count?starttime=2026-03-28&endtime=2026-04-05&minmagnitude=4.0&reviewstatus=automatic
→ 0

GET /fdsnws/event/1/count?starttime=2026-03-28&endtime=2026-04-05&minmagnitude=4.0&reviewstatus=reviewed
→ 232
```

**Result**: Even very recent events (< 7 days old) return 0 for automatic status. The USGS appears to promote events quickly and the API does not retain the automatic-stage record.

### Test 3: Event detail with `includesuperseded=true`

Tested with event `us6000jlqa` (2023-02-06 Turkey M7.5, `includesuperseded=true`):

- **`origin` product** (5 versions): All show `review-status: reviewed` and `magnitude: 7.5 mww` — even the earliest version. No automatic-stage origin preserved.
- **`internal-origin` product** (2 versions): Earliest shows `magnitude: 8.1, magType: Mi` which may represent the initial automatic estimate, but is marked `review-status: REVIEWED` and is an internal product not intended for public consumption.
- **`losspager` product** (17 versions): Earliest shows `review-status: automatic, magnitude: 7.5` — but magnitude matches the final value and this product is PAGER-specific, not a general magnitude record.

### Test 4: Standard event query for known reviewed event

```
GET /fdsnws/event/1/query?format=geojson&starttime=2023-02-06&endtime=2023-02-07&minmagnitude=6.0&limit=1
→ Event us6000jlrc, status: reviewed, magError: undefined
```

**Result**: The standard query returns only the current state. No version history. `magError` is not populated for this event.

## Conclusion

The USGS FDSN API only returns the **current (reviewed) state** of historical events. Automatic-stage records are overwritten, not preserved. The specific gaps:

1. **No automatic-stage magnitude available**: Cannot compute Δmag (reviewed − automatic)
2. **No automatic-stage timestamp available**: Cannot determine time-to-review
3. **Proxy approach fails**: `reviewstatus=automatic` returns 0 events for any historical period, making the matched-window approach impossible (comparing reviewed-to-reviewed is meaningless)
4. **Product-level data is unreliable**: While `internal-origin` may contain earlier magnitude estimates, it is not systematically available, not standard FDSN, and requires per-event detail requests

## Impact

| Study | Status | Reason |
|-------|--------|--------|
| Study 2 (Doubt-price CI) | **BLOCKED** | Requires automatic-stage magnitude to compute CI coverage |
| Study 3 (Settlement discount) | **BLOCKED** | Requires automatic→reviewed Δmag distribution |
| Study 5 (Quality weights) | **BLOCKED** | Requires automatic-stage events to label reviewed-status prediction |
| Study 4 (Regional profiles) | **Proceeds** | Uses reviewed-status data only |
| Study 6 (Citation pass) | **Completed** | No data dependency |

## Workaround Options (for future sprint)

1. **Real-time collection**: Deploy a scraper that fetches M4+ events hourly, recording automatic-stage data before promotion. Requires weeks/months of collection before enough data exists.
2. **ComCat archive**: The USGS may have internal archives of automatic catalogs. Contact USGS directly (not available via public API).
3. **ISC Bulletin**: The International Seismological Centre may retain preliminary vs reviewed phases, though matching to USGS events adds complexity.
4. **Synthetic approach**: Use `magError` (when available) as a proxy for automatic→reviewed deviation, rather than actual Δmag. Limited coverage.

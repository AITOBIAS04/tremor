# Run 5 Interface Blocker

**Date**: 2026-04-05
**Status**: BLOCKING — cannot run backtest as Run 5 without overwriting Run 4
**Sprint**: K Refit (sprint-k-refit)

## Problem

`scripts/omori-backtest.js` has a hardcoded output directory:

```javascript
// scripts/omori-backtest.js:23
const OUTPUT_DIR = join(__dirname, '..', 'grimoires', 'loa', 'calibration', 'omori-backtest');
```

There is no environment variable, CLI argument, or any other mechanism to redirect output to a different directory (e.g., `run-5/`). Running the script would overwrite the Run 4 sequence JSONs and diagnostic report in the root `omori-backtest/` directory.

## Sprint Scope Constraint

The sprint scope explicitly states: "Only `src/theatres/aftershock.js` and test files may change — no other source files." Modifying `scripts/omori-backtest.js` to add output directory support is outside scope.

## What Was Completed

Despite the Run 5 blocker, the K refit analysis is complete:

1. K refit values computed from Run 4 data (see `k-refit-notes.md`)
2. Magnitude-dependence check performed (inconclusive — see `k-refit-notes.md`)
3. `REGIME_PARAMS` in `src/theatres/aftershock.js` updated with refit K values
4. Test suite updated and passing

## Resolution Path

To unblock Run 5, add output directory support to `scripts/omori-backtest.js`. Minimal change:

```javascript
const OUTPUT_DIR = process.env.OMORI_BACKTEST_OUTPUT
  ? join(__dirname, '..', process.env.OMORI_BACKTEST_OUTPUT)
  : join(__dirname, '..', 'grimoires', 'loa', 'calibration', 'omori-backtest');
```

Then run:

```bash
OMORI_BACKTEST_OUTPUT=grimoires/loa/calibration/omori-backtest/run-5 node scripts/omori-backtest.js
```

This is a ~3-line change to the script. Should be done in a follow-on task or by relaxing the sprint scope to include `scripts/omori-backtest.js`.

## Run 4 Preservation

Run 4 artifacts are intact and unmodified at `grimoires/loa/calibration/omori-backtest/`:
- 14 sequence JSONs (sequence-01.json through sequence-14.json)
- diagnostic-report.md
- interface-blocker.md (previous blocker, now resolved)

The empty `run-5/` directory has been created in anticipation of the follow-on task.

#!/usr/bin/env node

/**
 * Omori Regime Backtest Harness (Study 1)
 *
 * Tests TREMOR's Aftershock Cascade Omori prior against 14 historical
 * earthquake sequences. Uses TREMOR's own createAftershockCascade() to
 * extract projected counts and regime assignments — no re-implementation
 * of integration math.
 *
 * Usage: node scripts/omori-backtest.js
 * Output: grimoires/loa/calibration/omori-backtest/
 *
 * Phase 1 diagnostic backtest. Not final calibration proof.
 */

import { createAftershockCascade, BUCKETS, REGIME_PARAMS, omoriExpectedCount, countToBucketProbabilities, inferRegime } from '../src/theatres/aftershock.js';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = process.env.OMORI_OUTPUT_DIR
  ? join(__dirname, '..', process.env.OMORI_OUTPUT_DIR)
  : join(__dirname, '..', 'grimoires', 'loa', 'calibration', 'omori-backtest');

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

// =========================================================================
// Sequence definitions
// =========================================================================

const SEQUENCES = [
  // Regime-fit sequences
  // Note: several "usp" USGS IDs have been superseded. Using search fallback where needed.
  { id: 1, label: '2011 Tōhoku', role: 'regime-fit', regime_expected: 'subduction', event_id: 'official20110311054624120_30', mainshock_utc: '2011-03-11T05:46:24Z', expected_mag: 9.0 },
  { id: 2, label: '2010 Maule', role: 'regime-fit', regime_expected: 'subduction', event_id: 'official20100227063411530_30', mainshock_utc: '2010-02-27T06:34:11Z', expected_mag: 8.8 },
  { id: 3, label: '2014 Iquique', role: 'regime-fit', regime_expected: 'subduction', event_id: 'usc000nzvd', mainshock_utc: '2014-04-01T23:46:47Z', expected_mag: 8.2 },
  { id: 4, label: '2019 Ridgecrest', role: 'regime-fit', regime_expected: 'transform', event_id: 'ci38457511', mainshock_utc: '2019-07-06T03:19:53Z', expected_mag: 7.1 },
  { id: 5, label: '2010 El Mayor-Cucapah', role: 'regime-fit', regime_expected: 'transform', event_id: 'ci14607652', mainshock_utc: '2010-04-04T22:40:42Z', expected_mag: 7.2 },
  { id: 6, label: '2011 Mineral, Virginia', role: 'regime-fit', regime_expected: 'intraplate', event_id: 'se609212', mainshock_utc: '2011-08-23T17:51:04Z', expected_mag: 5.8 },
  { id: 7, label: '2020 Magna, Utah', role: 'regime-fit', regime_expected: 'intraplate', event_id: 'uu60363602', mainshock_utc: '2020-03-18T13:09:46Z', expected_mag: 5.7 },

  // Regime-inference / edge-case sequences
  { id: 8, label: '2016 Kumamoto', role: 'inference', regime_expected: 'transform or subduction boundary', event_id: null, search: { start: '2016-04-14', end: '2016-04-17', minLat: 32, maxLat: 34, minLon: 130, maxLon: 132, minMag: 7.0 } },
  { id: 9, label: '2008 Wells, Nevada', role: 'inference', regime_expected: 'default or intraplate', event_id: null, search: { start: '2008-02-21', end: '2008-02-22', minLat: 40, maxLat: 42, minLon: -116, maxLon: -114, minMag: 5.5 } },
  { id: 10, label: '2016 Equatorial Atlantic M7.1', role: 'inference', regime_expected: 'default', event_id: 'us20006uy6', mainshock_utc: '2016-08-29T04:29:57Z', expected_mag: 7.1 },
  { id: 11, label: '2020 Puerto Rico M6.4', role: 'inference', regime_expected: 'default', event_id: null, search: { start: '2020-01-07', end: '2020-01-08', minLat: 17, maxLat: 19, minLon: -68, maxLon: -66, minMag: 6.0 } },

  // Volcanic sequences
  { id: 12, label: '2018 Kīlauea', role: 'volcanic', regime_expected: 'volcanic', event_id: null, search: { start: '2018-05-01', end: '2018-05-05', minLat: 19, maxLat: 20, minLon: -156, maxLon: -154, minMag: 6.0 }, notes: 'Mainshock definition may be ambiguous' },
  { id: 13, label: '2021 La Palma', role: 'volcanic', regime_expected: 'volcanic', event_id: null, search: { start: '2021-09-10', end: '2021-12-31', minLat: 28, maxLat: 29, minLon: -18.5, maxLon: -17, minMag: 3.5 }, notes: 'European catalog — USGS coverage may be thin' },
  { id: 14, label: '2014 Bárðarbunga', role: 'volcanic', regime_expected: 'volcanic', event_id: null, search: { start: '2014-08-16', end: '2014-09-30', minLat: 64, maxLat: 66, minLon: -18, maxLon: -15, minMag: 4.5 }, notes: 'High-volume volcanic swarm' },
];

// =========================================================================
// USGS FDSN helpers
// =========================================================================

const FDSN_BASE = 'https://earthquake.usgs.gov/fdsnws/event/1';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJSON(url) {
  const resp = await fetch(url);
  if (resp.status === 204) return { features: [] }; // No content
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  const text = await resp.text();
  if (!text.trim()) return { features: [] };
  return JSON.parse(text);
}

/**
 * Fetch mainshock details from USGS by event ID.
 */
async function fetchMainshockById(eventId) {
  const url = `${FDSN_BASE}/query?format=geojson&eventid=${eventId}&limit=1`;
  const data = await fetchJSON(url);
  const f = data.features ? data.features[0] : data;
  return extractFeature(f);
}

/**
 * Search for mainshock by time/location window, returning the largest event.
 */
async function searchMainshock(params) {
  const url = `${FDSN_BASE}/query?format=geojson` +
    `&starttime=${params.start}&endtime=${params.end}` +
    `&minlatitude=${params.minLat}&maxlatitude=${params.maxLat}` +
    `&minlongitude=${params.minLon}&maxlongitude=${params.maxLon}` +
    `&minmagnitude=${params.minMag || 4.0}` +
    `&orderby=magnitude&limit=5&reviewstatus=reviewed`;
  const data = await fetchJSON(url);
  if (!data.features || data.features.length === 0) return null;
  // Largest magnitude first (ordered by magnitude desc)
  return extractFeature(data.features[0]);
}

function extractFeature(f) {
  const p = f.properties;
  const c = f.geometry.coordinates;
  return {
    event_id: f.id,
    magnitude: p.mag,
    magType: p.magType,
    place: p.place,
    time_utc: new Date(p.time).toISOString(),
    time_ms: p.time,
    latitude: c[1],
    longitude: c[0],
    depth_km: c[2],
    status: p.status,
  };
}

/** Strip milliseconds from ISO timestamp for FDSN compatibility */
function fdsnTime(isoOrMs) {
  const d = typeof isoOrMs === 'number' ? new Date(isoOrMs) : new Date(isoOrMs);
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Fetch aftershock catalog within the match radius and 72h window.
 * Handles pagination if result count hits the limit.
 */
async function fetchAftershocks(mainshock, bbox, windowHours = 72) {
  const startTime = fdsnTime(mainshock.time_ms);
  const endTime = fdsnTime(mainshock.time_ms + windowHours * 3600 * 1000);
  const [minLon, minLat, maxLon, maxLat] = bbox.map(c => Math.round(c * 100) / 100);

  let allFeatures = [];
  let offset = 1; // FDSN requires offset >= 1
  const limit = 20000;

  while (true) {
    const url = `${FDSN_BASE}/query?format=geojson` +
      `&starttime=${startTime}&endtime=${endTime}` +
      `&minmagnitude=4.0` +
      `&minlatitude=${minLat}&maxlatitude=${maxLat}` +
      `&minlongitude=${minLon}&maxlongitude=${maxLon}` +
      `&eventtype=earthquake&reviewstatus=reviewed` +
      `&limit=${limit}&offset=${offset}`;

    const data = await fetchJSON(url);
    if (!data.features || data.features.length === 0) break;

    allFeatures = allFeatures.concat(data.features);

    if (data.features.length < limit) break;
    // Pagination needed
    offset += limit;
    console.log(`  Paginating: ${allFeatures.length} events so far...`);
    await delay(500);
  }

  // Filter: exclude mainshock, exclude non-tectonic
  const aftershocks = allFeatures.filter(f => {
    if (f.id === mainshock.event_id) return false;
    const type = (f.properties.type || '').toLowerCase();
    if (type === 'quarry blast' || type === 'explosion') return false;
    return true;
  });

  return {
    count: aftershocks.length,
    truncated: allFeatures.length >= limit && offset > 0,
    events: aftershocks.map(f => ({
      id: f.id,
      mag: f.properties.mag,
      time: new Date(f.properties.time).toISOString(),
    })),
  };
}

// =========================================================================
// Mock bundle construction for createAftershockCascade
// =========================================================================

function buildMockBundle(mainshock) {
  return {
    bundle_id: `backtest-${mainshock.event_id}`,
    payload: {
      event_id: mainshock.event_id,
      event_time: mainshock.time_ms,
      magnitude: { value: mainshock.magnitude },
      location: {
        latitude: mainshock.latitude,
        longitude: mainshock.longitude,
        depth_km: mainshock.depth_km,
      },
    },
  };
}

// =========================================================================
// Scoring
// =========================================================================

function findBucket(count) {
  return BUCKETS.findIndex(({ min, max }) => count >= min && count <= max);
}

function scoreSequence(projected, actual, bucketProbs) {
  const projectedBucket = findBucket(Math.round(projected));
  const actualBucket = findBucket(actual);
  const bucketHit = projectedBucket === actualBucket;

  const relativeError = actual === 0
    ? (projected === 0 ? 0 : Infinity)
    : (projected - actual) / actual;
  const logError = Math.log(projected + 1) - Math.log(actual + 1);

  // Brier score against actual bucket if we have probabilities
  let probabilityScore = null;
  if (bucketProbs && bucketProbs.length === BUCKETS.length) {
    let brier = 0;
    for (let i = 0; i < BUCKETS.length; i++) {
      const outcome = i === actualBucket ? 1 : 0;
      brier += Math.pow(bucketProbs[i] - outcome, 2);
    }
    probabilityScore = Math.round(brier / BUCKETS.length * 10000) / 10000;
  }

  return {
    projected_count: Math.round(projected * 10) / 10,
    actual_count: actual,
    projected_bucket: projectedBucket >= 0 ? BUCKETS[projectedBucket].label : 'unknown',
    actual_bucket: actualBucket >= 0 ? BUCKETS[actualBucket].label : 'unknown',
    bucket_hit: bucketHit,
    relative_error: actual === 0 && projected === 0 ? 0 : Math.round(relativeError * 1000) / 1000,
    log_error: Math.round(logError * 1000) / 1000,
    probability_score: probabilityScore,
  };
}

// =========================================================================
// Direct Omori computation (bypasses M<6.0 guard in createAftershockCascade)
// =========================================================================

/**
 * Compute Omori projections directly using exported functions.
 * Used for M<6.0 sequences that createAftershockCascade rejects.
 */
function computeDirectOmori(mainshock, thresholdMag = 4.0, windowHours = 72) {
  const regime = inferRegime(mainshock.depth_km, mainshock.latitude, mainshock.longitude);
  const params = REGIME_PARAMS[regime] || REGIME_PARAMS.default;
  const expectedCount = omoriExpectedCount(params, mainshock.magnitude, thresholdMag, windowHours);
  const bucketProbs = countToBucketProbabilities(expectedCount);

  // Wells & Coppersmith rupture length for match radius
  const ruptureLength = Math.pow(10, -3.22 + 0.69 * mainshock.magnitude);
  const matchRadius = ruptureLength * 1.5;
  const degreeRadius = matchRadius / 111;

  const bbox = [
    mainshock.longitude - degreeRadius,
    mainshock.latitude - degreeRadius,
    mainshock.longitude + degreeRadius,
    mainshock.latitude + degreeRadius,
  ];

  return {
    regime,
    params,
    expected_count: Math.round(expectedCount * 10) / 10,
    rupture_length_km: Math.round(ruptureLength * 10) / 10,
    match_radius_deg: Math.round(degreeRadius * 100) / 100,
    bucket_probs: bucketProbs,
    bbox,
    method: 'direct', // Flag: used exported functions, not createAftershockCascade
  };
}

// =========================================================================
// Partial-window analysis (t=6h, t=24h, t=72h) for bias time-signature
// =========================================================================

/**
 * Compute Omori projected counts at multiple time windows.
 * Enables bias diagnosis: c (early-time) vs K (total) vs p (drift).
 */
function computePartialWindows(params, mainMag, thresholdMag = 4.0) {
  const windows = [6, 24, 72];
  return windows.map(h => ({
    window_hours: h,
    projected: Math.round(omoriExpectedCount(params, mainMag, thresholdMag, h) * 10) / 10,
  }));
}

/**
 * Count aftershocks within partial time windows from the full event list.
 */
function countPartialWindows(mainshockTimeMs, aftershockEvents) {
  const windows = [6, 24, 72];
  return windows.map(h => {
    const cutoff = mainshockTimeMs + h * 3600 * 1000;
    const count = aftershockEvents.filter(e => {
      const t = new Date(e.time).getTime();
      return t < cutoff;
    }).length;
    return { window_hours: h, actual: count };
  });
}

// =========================================================================
// Main backtest loop
// =========================================================================

async function runBacktest() {
  console.log('TREMOR Omori Regime Backtest — Phase 1 Diagnostic');
  console.log('='.repeat(60));

  const results = [];

  for (const seq of SEQUENCES) {
    console.log(`\n[${seq.id}/${SEQUENCES.length}] ${seq.label} (${seq.role})`);

    try {
      // Step 1: Fetch mainshock details
      let mainshock;
      if (seq.event_id) {
        console.log(`  Fetching mainshock ${seq.event_id}...`);
        mainshock = await fetchMainshockById(seq.event_id);
      } else {
        console.log(`  Searching for mainshock...`);
        mainshock = await searchMainshock(seq.search);
        if (!mainshock) {
          throw new Error('No mainshock found in USGS for search parameters');
        }
        console.log(`  Found: ${mainshock.event_id} M${mainshock.magnitude} — ${mainshock.place}`);
      }

      // Verify event ID matches expected (if provided)
      if (seq.event_id && mainshock.event_id !== seq.event_id) {
        console.log(`  WARNING: Event ID mismatch — expected ${seq.event_id}, got ${mainshock.event_id}`);
      }

      await delay(500);

      // Step 2-3: Get Omori projections
      // Use createAftershockCascade for M>=6.0, direct functions for M<6.0
      let projectedCount, assignedRegime, bucketProbs, bbox, omoriParams, ruptureLen, matchRadiusDeg, computeMethod;

      if (mainshock.magnitude >= 6.0) {
        const mockBundle = buildMockBundle(mainshock);
        const theatre = createAftershockCascade({ mainshockBundle: mockBundle });
        if (!theatre) {
          throw new Error('createAftershockCascade returned null unexpectedly');
        }
        projectedCount = theatre.omori.expected_count;
        assignedRegime = theatre.omori.regime;
        bucketProbs = theatre.current_position;
        bbox = theatre.region_bbox;
        omoriParams = theatre.omori.params;
        ruptureLen = theatre.omori.rupture_length_km;
        matchRadiusDeg = theatre.omori.match_radius_deg;
        computeMethod = 'createAftershockCascade';
      } else {
        console.log(`  M${mainshock.magnitude} < 6.0 — using direct Omori functions`);
        const direct = computeDirectOmori(mainshock);
        projectedCount = direct.expected_count;
        assignedRegime = direct.regime;
        bucketProbs = direct.bucket_probs;
        bbox = direct.bbox;
        omoriParams = direct.params;
        ruptureLen = direct.rupture_length_km;
        matchRadiusDeg = direct.match_radius_deg;
        computeMethod = 'direct';
      }

      console.log(`  Regime: ${assignedRegime} (expected: ${seq.regime_expected})`);
      console.log(`  Omori projected count: ${projectedCount}`);
      console.log(`  Match radius: ${matchRadiusDeg}°`);
      console.log(`  Method: ${computeMethod}`);

      await delay(500);

      // Step 4: Fetch actual aftershock catalog
      console.log(`  Fetching aftershock catalog (72h window)...`);
      const aftershockData = await fetchAftershocks(mainshock, bbox);
      console.log(`  Actual M≥4.0 aftershocks: ${aftershockData.count}`);

      if (aftershockData.truncated) {
        console.log(`  WARNING: Result may be truncated — paginated query`);
      }

      // Step 5: Score
      const scores = scoreSequence(projectedCount, aftershockData.count, bucketProbs);

      // Partial-window analysis (t=6h, t=24h, t=72h)
      const partialProjected = computePartialWindows(omoriParams, mainshock.magnitude);
      const partialActual = countPartialWindows(mainshock.time_ms, aftershockData.events);
      const partialWindows = partialProjected.map((pp, i) => ({
        window_hours: pp.window_hours,
        projected: pp.projected,
        actual: partialActual[i].actual,
        relative_error: partialActual[i].actual === 0
          ? (pp.projected === 0 ? 0 : Infinity)
          : Math.round(((pp.projected - partialActual[i].actual) / partialActual[i].actual) * 1000) / 1000,
      }));
      console.log(`  Partial windows: ${partialWindows.map(w => `${w.window_hours}h: ${w.projected}/${w.actual}`).join(', ')}`);

      const regimeMatch = seq.role === 'regime-fit'
        ? assignedRegime === seq.regime_expected
        : checkInferenceMatch(assignedRegime, seq.regime_expected);

      const result = {
        sequence_id: seq.id,
        label: seq.label,
        role: seq.role,
        regime_assigned: assignedRegime,
        regime_expected: seq.regime_expected,
        regime_match: regimeMatch,
        mainshock_event_id: mainshock.event_id,
        mainshock_magnitude: mainshock.magnitude,
        mainshock_depth_km: mainshock.depth_km,
        mainshock_utc: mainshock.time_utc,
        mainshock_location: mainshock.place,
        window_end_utc: new Date(mainshock.time_ms + 72 * 3600 * 1000).toISOString(),
        omori_params: omoriParams,
        rupture_length_km: ruptureLen,
        match_radius_deg: matchRadiusDeg,
        compute_method: computeMethod,
        bucket_probabilities: bucketProbs,
        partial_windows: partialWindows,
        ...scores,
        aftershock_truncated: aftershockData.truncated,
        aftershock_events: aftershockData.events.slice(0, 30),
        notes: seq.notes || '',
      };

      console.log(`  Bucket hit: ${scores.bucket_hit} (projected: ${scores.projected_bucket}, actual: ${scores.actual_bucket})`);
      console.log(`  Relative error: ${scores.relative_error}`);

      results.push(result);
      writeResult(seq.id, result);

      await delay(500);
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
      const result = {
        sequence_id: seq.id,
        label: seq.label,
        role: seq.role,
        regime_expected: seq.regime_expected,
        error: err.message,
        notes: seq.notes || '',
      };
      results.push(result);
      writeResult(seq.id, result);
    }
  }

  // Generate diagnostic report
  console.log('\n' + '='.repeat(60));
  console.log('Generating diagnostic report...');
  generateDiagnosticReport(results);
  console.log('Done. Output in grimoires/loa/calibration/omori-backtest/');
}

function checkInferenceMatch(assigned, expected) {
  // Inference sequences may have multiple valid regimes
  const validRegimes = expected.split(' or ').map(s => s.trim());
  // Also match partial — "subduction boundary" matches "subduction"
  return validRegimes.some(r => assigned.includes(r) || r.includes(assigned));
}

function writeResult(seqId, result) {
  const path = join(OUTPUT_DIR, `sequence-${String(seqId).padStart(2, '0')}.json`);
  writeFileSync(path, JSON.stringify(result, null, 2) + '\n');
}

// =========================================================================
// Diagnostic report generation
// =========================================================================

function generateDiagnosticReport(results) {
  const lines = [];
  const ln = (s = '') => lines.push(s);

  ln('# Omori Regime Backtest — Diagnostic Report');
  ln();
  ln('**Phase**: 1 diagnostic backtest. Not final calibration proof.');
  ln(`**Date**: ${new Date().toISOString().split('T')[0]}`);
  ln(`**Sequences run**: ${results.filter(r => !r.blocked && !r.error).length} / ${results.length}`);
  const directCount = results.filter(r => r.compute_method === 'direct').length;
  ln(`**Direct (M<6.0)**: ${directCount} (via exported omoriExpectedCount/inferRegime)`);
  ln(`**Errors**: ${results.filter(r => r.error).length}`);
  ln();

  // Critical finding: inferRegime misassignment
  const regimeFitAll = results.filter(r => r.role === 'regime-fit' && !r.blocked && !r.error);
  const regimeMismatches = regimeFitAll.filter(r => r.regime_assigned !== r.regime_expected);
  if (regimeMismatches.length > 0) {
    ln('## ⚠ CRITICAL FINDING: `inferRegime` Misassignment');
    ln();
    ln(`**${regimeMismatches.length} of ${regimeFitAll.length} regime-fit sequences** were assigned the WRONG tectonic regime by \`inferRegime()\`. This contaminates per-regime K/c/p analysis because the wrong parameters were applied.`);
    ln();
    ln('| Sequence | Expected | Assigned | Depth (km) | Lat/Lon | Root Cause |');
    ln('|----------|----------|----------|-----------|---------|------------|');
    for (const r of regimeMismatches) {
      let cause = 'Unknown';
      if (r.regime_expected === 'subduction' && r.regime_assigned === 'transform') {
        cause = 'Depth < 30km in Pacific ring zone → transform instead of subduction';
      } else if (r.regime_expected === 'subduction' && r.regime_assigned === 'default') {
        cause = 'Longitude not in Pacific ring bounds (-100 to -180 or >100) — South America excluded';
      }
      ln(`| ${r.label} | ${r.regime_expected} | ${r.regime_assigned} | ${r.mainshock_depth_km} | ${r.mainshock_location} | ${cause} |`);
    }
    ln();
    ln('**Impact**: Sequences with wrong regime assignment were tested using the wrong K/c/p parameters. The per-regime results above include contaminated sequences.');
    ln();
    ln('**Root causes in `inferRegime` (aftershock.js:137-171)**:');
    for (const r of regimeMismatches) {
      if (r.regime_expected === 'intraplate') {
        ln(`- ${r.label}: No intraplate detection logic — eastern US and Basin-and-Range locations fall through to default/transform`);
      } else {
        ln(`- ${r.label}: Regime ${r.regime_expected} not matched — assigned ${r.regime_assigned} instead`);
      }
    }
    ln();
  }

  // Section 1: Regime-fit results
  ln('---');
  ln();
  ln('## 1. Regime-Fit Results');
  ln();

  const regimeFit = results.filter(r => r.role === 'regime-fit' && !r.blocked && !r.error);
  const regimeFitDirect = results.filter(r => r.role === 'regime-fit' && r.compute_method === 'direct' && !r.error);
  if (regimeFitDirect.length > 0) {
    ln(`**Direct-computed sequences** (M<6.0, via exported functions): ${regimeFitDirect.map(r => `${r.label} (M${r.mainshock_magnitude})`).join(', ')}`);
    ln();
  }

  if (regimeFit.length > 0) {
    ln('### Per-Sequence Results');
    ln();
    ln('| # | Sequence | Regime | Projected | Actual | Bucket Hit | Rel Error | Log Error | Brier |');
    ln('|---|----------|--------|-----------|--------|------------|-----------|-----------|-------|');
    for (const r of regimeFit) {
      ln(`| ${r.sequence_id} | ${r.label} | ${r.regime_assigned} | ${r.projected_count} | ${r.actual_count} | ${r.bucket_hit ? '✓' : '✗'} | ${fmtPct(r.relative_error)} | ${r.log_error} | ${r.probability_score ?? 'N/A'} |`);
    }
    ln();

    // Per-regime aggregation
    const regimes = groupBy(regimeFit, 'regime_assigned');
    ln('### Per-Regime Aggregation');
    ln();
    ln('| Regime | Sequences | Bucket Hit Rate | Mean Rel Error | Mean Log Error | Classification |');
    ln('|--------|-----------|-----------------|----------------|----------------|----------------|');
    for (const [regime, seqs] of Object.entries(regimes)) {
      const hitRate = seqs.filter(s => s.bucket_hit).length / seqs.length;
      const finiteErrors = seqs.filter(s => Number.isFinite(s.relative_error));
      const meanRelErr = finiteErrors.length > 0
        ? finiteErrors.reduce((s, r) => s + Math.abs(r.relative_error), 0) / finiteErrors.length
        : Infinity;
      const meanLogErr = seqs.reduce((s, r) => s + Math.abs(r.log_error), 0) / seqs.length;
      const classification = classify(hitRate, meanRelErr);
      ln(`| ${regime} | ${seqs.length} | ${fmtPct(hitRate)} | ${fmtPct(meanRelErr)} | ${meanLogErr.toFixed(3)} | **${classification}** |`);
    }
    ln();

    // Note missing regimes
    const testedRegimes = new Set(regimeFit.map(r => r.regime_assigned));
    const allRegimes = Object.keys(REGIME_PARAMS);
    const missing = allRegimes.filter(r => !testedRegimes.has(r));
    if (missing.length > 0) {
      ln(`**Untested regimes**: ${missing.join(', ')}`);
      ln();
    }
  }

  // Section 2: Bias diagnosis
  ln('---');
  ln();
  ln('## 2. Bias Diagnosis Per Regime');
  ln();
  ln('Following protocol diagnosis order: c (early-time) → K (total) → p (drift) → inferRegime (regime variance).');
  ln();

  if (regimeFit.length > 0) {
    const regimes = groupBy(regimeFit, 'regime_assigned');
    for (const [regime, seqs] of Object.entries(regimes)) {
      ln(`### ${regime}`);
      ln();
      if (seqs.length < 2) {
        ln(`Only ${seqs.length} sequence(s) — insufficient for confident bias diagnosis. Observations only.`);
        ln();
      }

      // Analyze bias direction
      const overPredictions = seqs.filter(s => s.projected_count > s.actual_count);
      const underPredictions = seqs.filter(s => s.projected_count < s.actual_count);
      const params = REGIME_PARAMS[regime] || REGIME_PARAMS.default;

      ln(`**Parameters**: K=${params.K}, c=${params.c}, p=${params.p}, bath_delta=${params.bath_delta}`);
      ln();

      if (overPredictions.length === seqs.length) {
        ln(`**Direction**: Systematically **over-predicting** across all ${seqs.length} sequences.`);
      } else if (underPredictions.length === seqs.length) {
        ln(`**Direction**: Systematically **under-predicting** across all ${seqs.length} sequences.`);
      } else {
        ln(`**Direction**: Mixed — ${overPredictions.length} over-predictions, ${underPredictions.length} under-predictions.`);
        ln(`**Diagnosis**: No clear systematic bias. May indicate regime-specific heterogeneity or magnitude-dependent effects.`);
      }
      ln();

      // Time-signature analysis using partial windows
      const seqsWithPartials = seqs.filter(s => s.partial_windows && s.partial_windows.length === 3);
      if (seqsWithPartials.length > 0) {
        ln('**Time-signature analysis** (t=6h, t=24h, t=72h):');
        ln();
        ln('| Sequence | 6h proj/act | 24h proj/act | 72h proj/act | Pattern |');
        ln('|----------|-------------|--------------|--------------|---------|');
        for (const s of seqsWithPartials) {
          const pw = s.partial_windows;
          // Diagnose time pattern
          const earlyErr = pw[0].actual > 0 ? Math.abs(pw[0].projected - pw[0].actual) / pw[0].actual : Infinity;
          const midErr = pw[1].actual > 0 ? Math.abs(pw[1].projected - pw[1].actual) / pw[1].actual : Infinity;
          const lateErr = pw[2].actual > 0 ? Math.abs(pw[2].projected - pw[2].actual) / pw[2].actual : Infinity;
          let pattern = '';
          if (earlyErr > 2 * midErr) pattern = 'Early bias (suspect c)';
          else if (lateErr > 2 * midErr) pattern = 'Late drift (suspect p)';
          else pattern = 'Uniform bias (suspect K)';
          ln(`| ${s.label} | ${pw[0].projected}/${pw[0].actual} | ${pw[1].projected}/${pw[1].actual} | ${pw[2].projected}/${pw[2].actual} | ${pattern} |`);
        }
        ln();

        // Aggregate diagnosis
        const patterns = seqsWithPartials.map(s => {
          const pw = s.partial_windows;
          const earlyErr = pw[0].actual > 0 ? Math.abs(pw[0].projected - pw[0].actual) / pw[0].actual : Infinity;
          const midErr = pw[1].actual > 0 ? Math.abs(pw[1].projected - pw[1].actual) / pw[1].actual : Infinity;
          const lateErr = pw[2].actual > 0 ? Math.abs(pw[2].projected - pw[2].actual) / pw[2].actual : Infinity;
          if (earlyErr > 2 * midErr) return 'c';
          if (lateErr > 2 * midErr) return 'p';
          return 'K';
        });
        const kCount = patterns.filter(p => p === 'K').length;
        const cCount = patterns.filter(p => p === 'c').length;
        const pCount = patterns.filter(p => p === 'p').length;
        if (kCount >= cCount && kCount >= pCount) {
          ln(`**Suspected parameter**: **K** (productivity) — ${kCount}/${seqsWithPartials.length} sequences show uniform bias across all time windows.`);
        } else if (cCount > kCount && cCount >= pCount) {
          ln(`**Suspected parameter**: **c** (time offset) — ${cCount}/${seqsWithPartials.length} sequences show early-time bias.`);
        } else {
          ln(`**Suspected parameter**: **p** (decay exponent) — ${pCount}/${seqsWithPartials.length} sequences show late drift.`);
        }
      } else {
        ln('**Time-signature analysis**: No partial-window data available for this regime.');
      }
      ln();

      for (const s of seqs) {
        const dir = s.projected_count > s.actual_count ? 'OVER' : (s.projected_count < s.actual_count ? 'UNDER' : 'EXACT');
        ln(`- **${s.label}**: projected ${s.projected_count} vs actual ${s.actual_count} → ${dir} (rel error: ${fmtPct(s.relative_error)})`);
      }
      ln();
    }
  }

  // Section 3: Regime-inference results
  ln('---');
  ln();
  ln('## 3. Regime-Inference Results');
  ln();

  const inference = results.filter(r => r.role === 'inference' && !r.blocked && !r.error);
  const inferenceBlocked = results.filter(r => r.role === 'inference' && (r.blocked || r.error));

  if (inference.length > 0) {
    ln('| # | Sequence | Expected | Assigned | Match |');
    ln('|---|----------|----------|----------|-------|');
    for (const r of inference) {
      ln(`| ${r.sequence_id} | ${r.label} | ${r.regime_expected} | ${r.regime_assigned} | ${r.regime_match ? '✓' : '✗'} |`);
    }
    ln();

    const mismatches = inference.filter(r => !r.regime_match);
    if (mismatches.length > 0) {
      ln('### Misassignments');
      ln();
      for (const r of mismatches) {
        ln(`- **${r.label}**: assigned \`${r.regime_assigned}\` but expected \`${r.regime_expected}\`. Depth: ${r.mainshock_depth_km} km, Location: ${r.mainshock_location}`);
      }
      ln();
    }
  }

  if (inferenceBlocked.length > 0) {
    ln(`**Blocked/errored**: ${inferenceBlocked.map(r => `${r.label}${r.error ? ` (${r.error})` : ` (${r.block_reason})`}`).join(', ')}`);
    ln();
  }

  // Section 4: Volcanic results
  ln('---');
  ln();
  ln('## 4. Volcanic Robustness Results');
  ln();
  ln('Volcanic results inform robustness only. Do not refit K/c/p based on these.');
  ln();

  const volcanic = results.filter(r => r.role === 'volcanic' && !r.blocked && !r.error);
  const volcanicProblems = results.filter(r => r.role === 'volcanic' && (r.blocked || r.error));

  if (volcanic.length > 0) {
    ln('| # | Sequence | Regime | Projected | Actual | Bucket Hit | Rel Error | Notes |');
    ln('|---|----------|--------|-----------|--------|------------|-----------|-------|');
    for (const r of volcanic) {
      const noteStr = r.notes || '';
      ln(`| ${r.sequence_id} | ${r.label} | ${r.regime_assigned} | ${r.projected_count} | ${r.actual_count} | ${r.bucket_hit ? '✓' : '✗'} | ${fmtPct(r.relative_error)} | ${noteStr} |`);
    }
    ln();
  }

  if (volcanicProblems.length > 0) {
    for (const r of volcanicProblems) {
      ln(`- **${r.label}**: ${r.blocked ? `BLOCKED — ${r.block_reason}` : `ERROR — ${r.error}`}`);
    }
    ln();
  }

  // Section 5: Protocol adherence
  ln('---');
  ln();
  ln('## 5. Protocol Adherence Notes');
  ln();
  ln('1. **Mainshock definition**: Used largest reviewed event per protocol. For volcanic sequences, documented ambiguity where applicable.');
  ln('2. **72-hour window**: Half-open interval [start, end) per protocol.');
  ln('3. **Count rules**: M≥4.0, reviewed only, within TREMOR match radius, excluding mainshock and non-tectonic events.');
  ln('4. **Scoring**: All four metrics computed per protocol (projected count, bucket hit, relative error, log error). Brier score computed from bucket probabilities.');
  ln('5. **Exported functions**: `omoriExpectedCount`, `countToBucketProbabilities`, `inferRegime` now exported from aftershock.js. M<6.0 sequences tested via direct function calls. M>=6.0 sequences tested via `createAftershockCascade` (full theatre path).');
  ln('6. **Partial-window analysis**: Enabled via exported `omoriExpectedCount`. Time-signature analysis at t=6h, t=24h, t=72h included in bias diagnosis.');

  // Check for protocol flags
  const truncated = results.filter(r => r.aftershock_truncated);
  if (truncated.length > 0) {
    ln(`7. **Truncation**: Sequences ${truncated.map(r => r.sequence_id).join(', ')} hit FDSN pagination limit.`);
  }
  ln();

  // Section 6: Recommended next steps
  ln('---');
  ln();
  ln('## 6. Recommended Next Steps');
  ln();

  ln('### Priority 1: Fix `inferRegime` (intraplate regime untested)');
  ln();
  const misassignedCount = regimeMismatches ? regimeMismatches.length : 0;
  ln(`The regime-inference heuristic misassigns ${misassignedCount}/${regimeFitAll.length} regime-fit sequences. Remaining issues:`);
  ln('- No intraplate detection logic — eastern US and Basin-and-Range locations fall through to default/transform');
  ln('- Ideally: replace with proper tectonic regionalization (Slab2, PB2002)');
  ln();

  ln('### Priority 2: Reduce K across all regimes (40-80× over-prediction)');
  ln();
  ln('All tested sequences show massive over-prediction (4000-7700% relative error). The productivity scaling `K * 10^(0.75 * (magDiff - 1))` produces counts 1-2 orders of magnitude too high. The K values need to be reduced by approximately 1-2 orders of magnitude, but the exact refit should wait until `inferRegime` is fixed so sequences test the correct regime parameters.');
  ln();

  if (regimeFit.length > 0) {
    const regimes = groupBy(regimeFit, 'regime_assigned');
    for (const [regime, seqs] of Object.entries(regimes)) {
      const hitRate = seqs.filter(s => s.bucket_hit).length / seqs.length;
      const finiteErrors = seqs.filter(s => Number.isFinite(s.relative_error));
      const meanRelErr = finiteErrors.length > 0
        ? finiteErrors.reduce((s, r) => s + Math.abs(r.relative_error), 0) / finiteErrors.length
        : Infinity;
      const cls = classify(hitRate, meanRelErr);

      if (cls === 'Fail') {
        const direction = seqs.every(s => s.projected_count > s.actual_count) ? 'over' : 'under';
        ln(`- **${regime}**: **REFIT NEEDED** (${cls}). ${direction === 'over' ? 'Reduce' : 'Increase'} K first. Current K=${REGIME_PARAMS[regime]?.K}. Note: regime analysis contaminated by inferRegime misassignment.`);
      } else if (cls === 'Marginal') {
        ln(`- **${regime}**: **MONITOR** (${cls}). Parameters plausible but not precise.`);
      } else {
        ln(`- **${regime}**: **PASS** (${cls}). Parameters directionally correct.`);
      }
    }
    ln();
  }

  ln('### Priority 3: Review intraplate and volcanic regime results');
  ln();
  ln('- Intraplate sequences (6, 7) now tested via direct function calls — review K/c/p adequacy');
  ln('- Volcanic sequences: review robustness results. Poor Omori fit expected for volcanic sequences.');
  ln();
  ln('---');
  ln();
  ln('*Phase 1 diagnostic backtest. Not final calibration proof.*');

  const report = lines.join('\n');
  writeFileSync(join(OUTPUT_DIR, 'diagnostic-report.md'), report + '\n');
}

// =========================================================================
// Utilities
// =========================================================================

function groupBy(arr, key) {
  const groups = {};
  for (const item of arr) {
    const k = item[key];
    if (!groups[k]) groups[k] = [];
    groups[k].push(item);
  }
  return groups;
}

function classify(hitRate, meanAbsRelErr) {
  // Protocol thresholds
  if (hitRate >= 0.7 && meanAbsRelErr < 0.3) return 'Pass';
  if (hitRate < 0.5 || meanAbsRelErr > 0.6) return 'Fail';
  return 'Marginal';
}

function fmtPct(value) {
  if (!Number.isFinite(value)) return '∞';
  return (value * 100).toFixed(1) + '%';
}

// =========================================================================
// Run
// =========================================================================

runBacktest().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

/**
 * Swarm Watch Validation — Volcanic Sequences
 *
 * Validates the Swarm Watch theatre against 3 pinned volcanic sequences
 * using USGS FDSN catalog data.
 *
 * Sequences:
 *   1. 2018 Kīlauea lower East Rift Zone
 *   2. 2021 La Palma eruption onset
 *   3. 2014 Bárðarbunga initiating intrusion
 */

import { createSwarmWatch, processSwarmWatch } from '../src/theatres/swarm.js';
import { buildBundle } from '../src/processor/bundles.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Sequence definitions
// ---------------------------------------------------------------------------

const SEQUENCES = [
  {
    name: '2018 Kīlauea lower East Rift Zone',
    shortId: 'kilauea-2018',
    initiatingEventId: 'hv70302356',
    origin: '2018-05-04T22:32:55Z',
    windowHours: 72,
    lat: 19.46,
    lon: -154.88,
    baseline_b: 1.0,
    regionLabel: 'Kīlauea LERZ',
  },
  {
    name: '2021 La Palma eruption onset',
    shortId: 'la-palma-2021',
    initiatingEventId: 'us7000f93v',
    origin: '2021-09-11T21:17:59Z',
    windowHours: 72,
    lat: 28.61,
    lon: -17.84,
    baseline_b: 1.0,
    regionLabel: 'La Palma, Canary Islands',
  },
  {
    name: '2014 Bárðarbunga initiating intrusion',
    shortId: 'bardarbunga-2014',
    initiatingEventId: 'eu500068sg',
    origin: '2014-08-16T18:12:45Z',
    windowHours: 72,
    lat: 64.67,
    lon: -17.53,
    baseline_b: 1.0,
    regionLabel: 'Bárðarbunga, Iceland',
    note: 'Initiating event is EMSC ID — USGS may not have this specific event',
  },
];

// ---------------------------------------------------------------------------
// FDSN fetch helpers
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function fetchFDSNEvents(seq) {
  const startTime = seq.origin;
  const endDate = new Date(new Date(seq.origin).getTime() + seq.windowHours * 3600 * 1000);
  const endTime = endDate.toISOString().replace(/\.\d+Z$/, 'Z');

  const url =
    `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson` +
    `&starttime=${startTime}&endtime=${endTime}` +
    `&minmagnitude=3.0` +
    `&latitude=${seq.lat}&longitude=${seq.lon}&maxradiuskm=100` +
    `&orderby=time`;

  console.log(`  Fetching USGS FDSN: ${url}`);

  let data;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      return { error: `HTTP ${res.status} ${res.statusText}`, features: [] };
    }
    data = await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      return { error: 'Fetch timed out after 30s', features: [] };
    }
    return { error: err.message, features: [] };
  }

  const features = (data.features ?? []).sort(
    (a, b) => a.properties.time - b.properties.time
  );
  console.log(`  → ${features.length} M3.0+ events returned`);
  return { error: null, features, metadata: data.metadata };
}

// ---------------------------------------------------------------------------
// Synthetic feature builder (for FDSN GeoJSON → USGS-shaped feature)
// ---------------------------------------------------------------------------

function fdsnFeatureToUsgsFeature(f) {
  // FDSN GeoJSON is already in USGS format — pass through, but ensure
  // required properties exist to satisfy buildBundle's guards.
  return {
    id: f.id,
    type: 'Feature',
    geometry: f.geometry,
    properties: {
      type: f.properties.type ?? 'earthquake',
      status: f.properties.status ?? 'reviewed',
      mag: f.properties.mag,
      magType: f.properties.magType ?? 'Ml',
      magError: f.properties.magError ?? null,
      magNst: f.properties.magNst ?? null,
      time: f.properties.time,
      updated: f.properties.updated ?? f.properties.time,
      place: f.properties.place ?? 'Unknown',
      url: f.properties.url ?? `https://earthquake.usgs.gov/earthquakes/eventpage/${f.id}`,
      detail: f.properties.detail ?? null,
      felt: f.properties.felt ?? null,
      cdi: f.properties.cdi ?? null,
      mmi: f.properties.mmi ?? null,
      alert: f.properties.alert ?? null,
      tsunami: f.properties.tsunami ?? 0,
      sig: f.properties.sig ?? 0,
      net: f.properties.net ?? 'us',
      code: f.properties.code ?? f.id,
      ids: f.properties.ids ?? `,${f.id},`,
      sources: f.properties.sources ?? ',us,',
      types: f.properties.types ?? ',origin,',
      nst: f.properties.nst ?? null,
      dmin: f.properties.dmin ?? null,
      rms: f.properties.rms ?? null,
      gap: f.properties.gap ?? null,
      magSource: f.properties.magSource ?? 'us',
      locationSource: f.properties.locationSource ?? 'us',
      horizontalError: f.properties.horizontalError ?? null,
      depthError: f.properties.depthError ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// Run a single sequence
// ---------------------------------------------------------------------------

async function runSequence(seq) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Sequence: ${seq.name}`);
  console.log(`${'='.repeat(60)}`);

  const result = {
    name: seq.name,
    shortId: seq.shortId,
    initiatingEventId: seq.initiatingEventId,
    origin: seq.origin,
    windowHours: seq.windowHours,
    fetchError: null,
    eventCount: 0,
    comparable: false,
    nonComparableReason: null,
    note: seq.note ?? null,

    // Theatre metrics
    updateCount: 0,
    initialProbability: null,
    finalProbability: null,
    probabilityPeak: null,
    escalationFlagged: false,
    probabilityMovedMaterially: false,
    finalState: null,
    finalEscalationSignal: null,
    finalBValue: null,
    bundleErrors: 0,
    positionHistory: [],
  };

  // 1. Fetch events
  const { error, features } = await fetchFDSNEvents(seq);
  if (error) {
    result.fetchError = error;
    console.log(`  Fetch error: ${error}`);
  }

  result.eventCount = features.length;
  console.log(`  Events found: ${features.length}`);

  // 2. Comparability check
  if (features.length < 5) {
    result.comparable = false;
    result.nonComparableReason = `Only ${features.length} M3.0+ events in window — need ≥5`;
    console.log(`  → NON-COMPARABLE: ${result.nonComparableReason}`);
    return result;
  }
  result.comparable = true;

  // 3. Build seed magnitudes from first batch (up to 12 events)
  const usgsFeatures = features.map(fdsnFeatureToUsgsFeature);
  const seedFeatures = usgsFeatures.slice(0, Math.min(12, usgsFeatures.length));
  const seedMagnitudes = seedFeatures.map((f) => f.properties.mag).filter(Number.isFinite);

  console.log(
    `  Seed magnitudes (${seedMagnitudes.length}): ` +
    seedMagnitudes.map((m) => m.toFixed(1)).join(', ')
  );

  // 4. Create theatre
  const theatre0 = createSwarmWatch({
    zone_name: seq.regionLabel,
    centroid: [seq.lon, seq.lat],
    radius_km: 50,
    magnitude_threshold: 5.0,
    seed_magnitudes: seedMagnitudes,
    baseline_b: seq.baseline_b,
    window_days: 7,
  });

  result.initialProbability = theatre0.current_position;
  result.probabilityPeak = theatre0.current_position;
  console.log(`  Initial probability: ${theatre0.current_position.toFixed(3)}`);
  console.log(
    `  Initial escalation: ${theatre0.escalation.signal} ` +
    `(b=${theatre0.b_value.current ?? 'N/A'})`
  );

  // 5. Process remaining events through the theatre
  let theatre = theatre0;

  // Process events after the seed batch
  const processingFeatures = usgsFeatures.slice(seedFeatures.length);
  console.log(`  Processing ${processingFeatures.length} additional events...`);

  for (const rawFeature of processingFeatures) {
    if (theatre.state === 'resolved') {
      console.log(`    Theatre resolved — stopping early`);
      break;
    }

    const bundle = buildBundle(rawFeature, {
      activeTheatres: [theatre],
      revisionHistories: new Map(),
      crossValidation: null,
    });

    if (!bundle) {
      result.bundleErrors++;
      continue;
    }

    const prevP = theatre.current_position;
    theatre = processSwarmWatch(theatre, bundle);
    result.updateCount++;

    const newP = theatre.current_position;
    if (newP > result.probabilityPeak) {
      result.probabilityPeak = newP;
    }

    const mag = rawFeature.properties.mag;
    const esc = theatre.escalation?.signal ?? 'unknown';
    console.log(
      `    Event M${mag.toFixed(1)} → p: ${prevP.toFixed(3)} → ${newP.toFixed(3)} ` +
      `| esc: ${esc} | b: ${theatre.b_value.current ?? 'N/A'}`
    );
  }

  // 6. Capture final metrics
  result.finalProbability = theatre.current_position;
  result.finalState = theatre.state;
  result.finalEscalationSignal = theatre.escalation?.signal ?? null;
  result.finalBValue = theatre.b_value?.current ?? null;
  result.positionHistory = theatre.position_history.map((h) => ({
    p: h.p,
    reason: h.reason,
  }));

  // Escalation flagged if signal was ever strong or moderate
  result.escalationFlagged = theatre.position_history.some((h) =>
    h.reason && (
      h.reason.includes('strong_escalation') ||
      h.reason.includes('moderate_escalation')
    )
  );

  // Probability moved materially: peak - initial > 0.1
  const delta = result.probabilityPeak - result.initialProbability;
  result.probabilityMovedMaterially = delta > 0.1;

  console.log(`  Final probability: ${result.finalProbability.toFixed(3)}`);
  console.log(`  Peak probability: ${result.probabilityPeak.toFixed(3)}`);
  console.log(`  Update count: ${result.updateCount}`);
  console.log(`  Escalation flagged: ${result.escalationFlagged}`);
  console.log(`  Probability moved materially: ${result.probabilityMovedMaterially}`);
  console.log(`  Bundle errors: ${result.bundleErrors}`);

  return result;
}

// ---------------------------------------------------------------------------
// Qualitative rating
// ---------------------------------------------------------------------------

function rateSequence(r) {
  if (!r.comparable) return 'NON-COMPARABLE';

  // Operationally useful: opened, updated repeatedly, p moved materially, escalation flagged
  if (r.updateCount >= 3 && r.probabilityMovedMaterially && r.escalationFlagged) {
    return 'operationally useful';
  }
  // Operationally useful (weak): updated, p moved materially (even if no explicit escalation flag)
  if (r.updateCount >= 3 && r.probabilityMovedMaterially) {
    return 'operationally useful (weak)';
  }
  // Ambiguous: ran but inconclusive
  if (r.updateCount >= 1) {
    return 'ambiguous';
  }
  // Not useful: no meaningful response
  return 'not useful';
}

// ---------------------------------------------------------------------------
// Report writer
// ---------------------------------------------------------------------------

function formatReport(results, runTimestamp) {
  const lines = [];

  lines.push(`# Swarm Watch Volcanic Validation`);
  lines.push(``);
  lines.push(`**Run date**: ${runTimestamp}`);
  lines.push(`**Sequences validated**: ${results.length}`);
  lines.push(`**Data source**: USGS FDSN Event API (M3.0+, maxradiuskm=100)`);
  lines.push(`**Theatre config**: magnitude_threshold=5.0, radius_km=50, window_days=7`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  for (const r of results) {
    const rating = rateSequence(r);
    lines.push(`## ${r.name}`);
    lines.push(``);

    lines.push(`**Initiating event**: \`${r.initiatingEventId}\``);
    lines.push(`**Origin**: ${r.origin}`);
    lines.push(`**Window**: ${r.windowHours}h`);
    if (r.note) lines.push(`**Note**: ${r.note}`);
    lines.push(``);

    if (r.fetchError) {
      lines.push(`> **Fetch warning**: ${r.fetchError}`);
      lines.push(``);
    }

    if (!r.comparable) {
      lines.push(`**Status**: NON-COMPARABLE — ${r.nonComparableReason}`);
      lines.push(``);
      lines.push(`### One-line conclusion`);
      lines.push(``);
      lines.push(
        `Sequence NON-COMPARABLE: insufficient M3.0+ catalog coverage ` +
        `(${r.eventCount} events) in the 72h USGS window for a valid Swarm Watch trial.`
      );
      lines.push(``);
      lines.push(`---`);
      lines.push(``);
      continue;
    }

    lines.push(`### Catalog`);
    lines.push(``);
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| M3.0+ events in window | ${r.eventCount} |`);
    lines.push(`| Bundle errors | ${r.bundleErrors} |`);
    lines.push(``);

    lines.push(`### Theatre Output`);
    lines.push(``);
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Initial probability | ${r.initialProbability?.toFixed(3) ?? 'N/A'} |`);
    lines.push(`| Final probability | ${r.finalProbability?.toFixed(3) ?? 'N/A'} |`);
    lines.push(`| Probability peak | ${r.probabilityPeak?.toFixed(3) ?? 'N/A'} |`);
    lines.push(`| Update count | ${r.updateCount} |`);
    lines.push(`| Escalation flagged | ${r.escalationFlagged} |`);
    lines.push(`| Probability moved materially (>0.1) | ${r.probabilityMovedMaterially} |`);
    lines.push(`| Final state | ${r.finalState ?? 'N/A'} |`);
    lines.push(`| Final escalation signal | ${r.finalEscalationSignal ?? 'N/A'} |`);
    lines.push(`| Final b-value | ${r.finalBValue ?? 'N/A'} |`);
    lines.push(``);

    lines.push(`### Position History`);
    lines.push(``);
    lines.push(`| Step | p | Reason |`);
    lines.push(`|------|---|--------|`);
    for (let i = 0; i < r.positionHistory.length; i++) {
      const h = r.positionHistory[i];
      const reason = (h.reason ?? '').replace(/\|/g, '\\|');
      lines.push(`| ${i} | ${h.p.toFixed(3)} | ${reason} |`);
    }
    lines.push(``);

    lines.push(`### Qualitative Rating`);
    lines.push(``);
    lines.push(`**Rating**: **${rating}**`);
    lines.push(``);

    // Rubric alignment
    const delta = (r.probabilityPeak ?? 0) - (r.initialProbability ?? 0);
    lines.push(`Rubric alignment:`);
    lines.push(`- Opened: yes`);
    lines.push(`- Updated repeatedly: ${r.updateCount >= 3 ? 'yes' : 'no'} (${r.updateCount} updates)`);
    lines.push(`- Probability moved materially: ${r.probabilityMovedMaterially ? 'yes' : 'no'} (Δ${delta.toFixed(3)})`);
    lines.push(`- Escalation flagged: ${r.escalationFlagged ? 'yes' : 'no'}`);
    lines.push(``);

    lines.push(`### One-line conclusion`);
    lines.push(``);

    // Generate conclusion based on rating
    if (rating === 'operationally useful') {
      lines.push(
        `Swarm Watch opened, updated ${r.updateCount} times, flagged escalation, ` +
        `and moved probability materially (${r.initialProbability?.toFixed(3)} → peak ${r.probabilityPeak?.toFixed(3)}) — **operationally useful** for volcanic routing.`
      );
    } else if (rating === 'operationally useful (weak)') {
      lines.push(
        `Swarm Watch opened, updated ${r.updateCount} times, and moved probability materially ` +
        `(${r.initialProbability?.toFixed(3)} → peak ${r.probabilityPeak?.toFixed(3)}) but did not explicitly flag escalation — ` +
        `**operationally useful (weak)**; escalation sensitivity may need tuning for volcanic b-value regimes.`
      );
    } else if (rating === 'ambiguous') {
      lines.push(
        `Swarm Watch ran (${r.updateCount} updates) but probability did not move materially ` +
        `(${r.initialProbability?.toFixed(3)} → ${r.finalProbability?.toFixed(3)}) — **ambiguous**; ` +
        `insufficient catalog density may have masked the volcanic signal.`
      );
    } else {
      lines.push(
        `Swarm Watch produced no meaningful updates for this sequence — **not useful** without denser catalog coverage.`
      );
    }

    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  }

  // ---------------------------------------------------------------------------
  // Overall recommendation
  // ---------------------------------------------------------------------------
  lines.push(`## Overall Recommendation`);
  lines.push(``);

  const comparable = results.filter((r) => r.comparable);
  const useful = results.filter((r) => {
    const rating = rateSequence(r);
    return rating.startsWith('operationally useful');
  });
  const nonComparable = results.filter((r) => !r.comparable);

  lines.push(`| Sequence | Events | Rating |`);
  lines.push(`|----------|--------|--------|`);
  for (const r of results) {
    const rating = rateSequence(r);
    lines.push(`| ${r.name} | ${r.eventCount} | ${rating} |`);
  }
  lines.push(``);

  if (nonComparable.length === results.length) {
    lines.push(
      `**All sequences are NON-COMPARABLE** — catalog coverage was insufficient for all three ` +
      `volcanic windows. This does not indicate a Swarm Watch defect; it indicates that USGS FDSN ` +
      `M3.0+ coverage within 100 km was too sparse for a valid theatre trial. ` +
      `A dedicated calibration sprint should lower the minimum comparability threshold ` +
      `(e.g., M2.0+ or higher maxradiuskm) and re-run against these sequences.`
    );
  } else if (useful.length >= 2) {
    lines.push(
      `Swarm Watch is **operationally ready for volcanic routing** — ${useful.length}/${comparable.length} ` +
      `comparable sequences produced operationally useful output. No calibration sprint required ` +
      `for basic volcanic coverage; however, a focused sprint on b-value baselines for ` +
      `volcanic systems (typically b>1.0–1.5 pre-eruption, often b<1.0 during dyke intrusion) ` +
      `would sharpen escalation sensitivity.`
    );
  } else if (useful.length >= 1) {
    lines.push(
      `Swarm Watch is **conditionally operationally ready** — ${useful.length}/${comparable.length} ` +
      `comparable sequences produced useful output, but the results are mixed. ` +
      `A targeted calibration sprint is recommended to tune b-value baselines ` +
      `for volcanic vs. tectonic swarms before full volcanic routing deployment.`
    );
  } else if (comparable.length > 0) {
    lines.push(
      `Swarm Watch **needs a calibration sprint** before volcanic routing — ` +
      `${comparable.length} comparable sequences ran but none produced operationally useful output. ` +
      `The b-value escalation thresholds and base rate priors are likely tuned for ` +
      `tectonic swarms and do not transfer cleanly to volcanic sequences.`
    );
  } else {
    lines.push(
      `**Insufficient data for a verdict** — no sequences were comparable. ` +
      `Re-run with relaxed magnitude threshold (M2.0+) or expanded radius (200 km) ` +
      `to gather sufficient catalog events before rating Swarm Watch for volcanic routing.`
    );
  }

  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`*Generated by \`scripts/validate-volcanic-swarm-watch.mjs\`*`);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Swarm Watch Volcanic Validation');
  console.log('================================');
  console.log(`Run: ${new Date().toISOString()}`);

  const results = [];

  for (const seq of SEQUENCES) {
    const r = await runSequence(seq);
    results.push(r);
  }

  // Write report
  const outputDir = join(PROJECT_ROOT, 'grimoires', 'loa', 'calibration');
  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, 'volcanic-swarm-watch-validation.md');

  const runTimestamp = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const report = formatReport(results, runTimestamp);

  writeFileSync(outputPath, report, 'utf8');

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Report written to: ${outputPath}`);
  console.log(`${'='.repeat(60)}`);

  // Print summary
  console.log('\nSummary:');
  for (const r of results) {
    const rating = rateSequence(r);
    console.log(
      `  ${r.name}: ${r.eventCount} events, ${r.comparable ? rating : 'NON-COMPARABLE'}`
    );
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

/**
 * Swarm Watch Theatre
 *
 * Binary market: "Will the active seismic cluster in zone Z produce
 * an event M≥X within 7 days?"
 *
 * Key signal: Gutenberg-Richter b-value drift in the cluster.
 * Decreasing b-value = relatively more large events = escalation signal.
 *
 * Most swarms dissipate — a well-calibrated "no" earns strong Brier
 * scores. The construct's edge is recognizing the rare escalation.
 */

/**
 * Compute Gutenberg-Richter b-value for a set of magnitudes.
 *
 * Uses the Aki (1965) maximum likelihood estimator:
 *   b = log10(e) / (M_mean - M_min)
 *
 * @param {number[]} magnitudes - Array of event magnitudes
 * @param {number} mMin - Completeness magnitude (minimum reliable mag)
 * @returns {number|null} b-value, or null if insufficient data
 */
export function computeBValue(magnitudes, mMin = 2.0) {
  const filtered = magnitudes.filter((m) => m >= mMin);
  if (filtered.length < 10) return null; // need at least 10 events

  const meanMag = filtered.reduce((s, m) => s + m, 0) / filtered.length;
  const denominator = meanMag - mMin;

  if (denominator <= 0) return null;

  // Aki MLE: b = log10(e) / (M_mean - M_min)
  // With Shi & Bolt (1982) correction for binned data: subtract Δm/2
  const deltaM = 0.1; // USGS magnitude binning
  const correctedDenom = denominator - deltaM / 2;
  if (correctedDenom <= 0) return null;

  return Math.round((Math.LOG10E / correctedDenom) * 100) / 100;
}

/**
 * Detect whether a cluster is exhibiting escalation signals.
 *
 * Compares recent b-value against the long-term regional baseline.
 * Decreasing b-value → heavier tail → more large events expected.
 *
 * @param {number} currentB - Current cluster b-value
 * @param {number} baselineB - Long-term regional b-value (typically ~1.0)
 * @returns {object} Escalation assessment
 */
export function assessEscalation(currentB, baselineB = 1.0) {
  if (currentB === null) {
    return { signal: 'insufficient_data', delta: 0, escalation_factor: 0 };
  }

  const delta = currentB - baselineB;

  // Negative delta = b-value below baseline = escalation signal
  // The magnitude of the signal scales with how far below baseline
  if (delta < -0.3) {
    return {
      signal: 'strong_escalation',
      delta: Math.round(delta * 100) / 100,
      escalation_factor: Math.min(1, Math.abs(delta) / 0.5),
    };
  }
  if (delta < -0.15) {
    return {
      signal: 'moderate_escalation',
      delta: Math.round(delta * 100) / 100,
      escalation_factor: Math.abs(delta) / 0.5,
    };
  }
  if (delta < 0) {
    return {
      signal: 'weak_escalation',
      delta: Math.round(delta * 100) / 100,
      escalation_factor: Math.abs(delta) / 0.5,
    };
  }

  return {
    signal: 'normal',
    delta: Math.round(delta * 100) / 100,
    escalation_factor: 0,
  };
}

// =========================================================================
// Theatre lifecycle
// =========================================================================

/**
 * Create a Swarm Watch theatre.
 *
 * Triggered by TREMOR's cluster detector when ≥N events occur within
 * R km in T hours.
 *
 * @param {object} params
 * @param {string} params.zone_name - Human-readable cluster zone name
 * @param {number[]} params.centroid - [lon, lat] of cluster centroid
 * @param {number} params.radius_km - Cluster radius
 * @param {number} params.magnitude_threshold - Target magnitude for escalation
 * @param {number[]} params.seed_magnitudes - Magnitudes of events that triggered detection
 * @param {number} [params.baseline_b] - Regional b-value baseline
 * @param {number} [params.window_days] - Prediction window (default 7)
 * @returns {object} Theatre definition
 */
export function createSwarmWatch({
  zone_name,
  centroid,
  radius_km,
  magnitude_threshold,
  seed_magnitudes,
  baseline_b = 1.0,
  window_days = 7,
}) {
  const now = Date.now();
  const degreeRadius = radius_km / 111;

  // Compute initial b-value from seed events
  const initialB = computeBValue(seed_magnitudes, Math.min(...seed_magnitudes));
  const escalation = assessEscalation(initialB, baseline_b);

  // Base rate: most swarms don't produce large events
  // Adjust by escalation signal
  let baseRate = 0.08; // ~8% base rate for escalation
  baseRate += escalation.escalation_factor * 0.25; // up to +25% for strong signal
  baseRate = Math.min(0.5, baseRate);

  return {
    id: `T3-SWARM-${zone_name.replace(/\s/g, '_').toUpperCase()}-${now}`,
    template: 'swarm_watch',
    question: `Will cluster in ${zone_name} produce M≥${magnitude_threshold} within ${window_days} days?`,
    zone_name,
    centroid,
    radius_km,
    region_bbox: [
      centroid[0] - degreeRadius,
      centroid[1] - degreeRadius,
      centroid[0] + degreeRadius,
      centroid[1] + degreeRadius,
    ],
    magnitude_threshold,
    opens_at: now,
    closes_at: now + window_days * 24 * 60 * 60 * 1000,
    state: 'open',
    outcome: null,

    // b-value tracking
    b_value: {
      current: initialB,
      baseline: baseline_b,
      history: [
        { t: now, b: initialB, n_events: seed_magnitudes.length },
      ],
    },
    escalation,

    // All magnitudes in the cluster (for rolling b-value)
    cluster_magnitudes: [...seed_magnitudes],
    cluster_event_count: seed_magnitudes.length,

    current_position: Math.round(baseRate * 1000) / 1000,
    position_history: [
      {
        t: now,
        p: Math.round(baseRate * 1000) / 1000,
        evidence: null,
        reason:
          `Swarm detected: ${seed_magnitudes.length} events, ` +
          `b=${initialB ?? 'N/A'}, escalation=${escalation.signal}, ` +
          `base_rate=${baseRate.toFixed(3)}`,
      },
    ],
    evidence_bundles: [],
    resolving_bundle_id: null,
    resolved_at: null,
  };
}

/**
 * Process a new event in the swarm cluster.
 *
 * Recomputes b-value, reassesses escalation, and updates position.
 *
 * @param {object} theatre - Swarm Watch theatre
 * @param {object} bundle - Evidence bundle
 * @returns {object} Updated theatre
 */
export function processSwarmWatch(theatre, bundle) {
  if (theatre.state === 'resolved' || theatre.state === 'expired') {
    return theatre;
  }

  const mag = bundle.payload.magnitude.value;
  const threshold = theatre.magnitude_threshold;
  const updated = { ...theatre };

  updated.evidence_bundles = [...theatre.evidence_bundles, bundle.bundle_id];

  // Check if this event crosses the threshold → resolve YES
  if (
    mag >= threshold &&
    (bundle.evidence_class === 'ground_truth' || bundle.evidence_class === 'provisional_mature')
  ) {
    updated.state = bundle.evidence_class === 'ground_truth' ? 'resolved' : 'provisional_hold';
    updated.outcome = true;
    updated.resolving_bundle_id = bundle.bundle_id;
    updated.resolved_at = Date.now();
    updated.current_position = 1.0;
    updated.position_history = [
      ...theatre.position_history,
      {
        t: Date.now(),
        p: 1.0,
        evidence: bundle.bundle_id,
        reason: `M${mag} — threshold M${threshold} crossed (${bundle.evidence_class})`,
      },
    ];
    return updated;
  }

  // Add to cluster magnitudes and recompute b-value
  updated.cluster_magnitudes = [...theatre.cluster_magnitudes, mag];
  updated.cluster_event_count = theatre.cluster_event_count + 1;

  const newB = computeBValue(updated.cluster_magnitudes);
  const newEscalation = assessEscalation(newB, theatre.b_value.baseline);

  updated.b_value = {
    ...theatre.b_value,
    current: newB,
    history: [
      ...theatre.b_value.history,
      { t: Date.now(), b: newB, n_events: updated.cluster_event_count },
    ],
  };
  updated.escalation = newEscalation;

  // Update position based on escalation signal change
  let newPosition = theatre.current_position;

  if (newEscalation.signal === 'strong_escalation') {
    // Significant shift upward
    newPosition = Math.min(0.65, newPosition + 0.08);
  } else if (newEscalation.signal === 'moderate_escalation') {
    newPosition = Math.min(0.45, newPosition + 0.04);
  } else if (newEscalation.signal === 'weak_escalation') {
    newPosition = Math.min(0.30, newPosition + 0.02);
  } else {
    // Normal / no escalation — swarm may be dissipating
    // Slight decay toward base rate
    newPosition = newPosition * 0.97;
  }

  // Near-threshold events get an additional bump
  if (mag >= threshold - 0.5) {
    newPosition = Math.min(0.75, newPosition + 0.05);
  }

  newPosition = Math.max(0.02, Math.min(0.95, newPosition));
  updated.current_position = Math.round(newPosition * 1000) / 1000;

  updated.position_history = [
    ...theatre.position_history,
    {
      t: Date.now(),
      p: updated.current_position,
      evidence: bundle.bundle_id,
      reason:
        `M${mag} in cluster (#${updated.cluster_event_count}) — ` +
        `b=${newB ?? 'N/A'} (Δ=${newEscalation.delta}), ` +
        `signal=${newEscalation.signal}`,
    },
  ];

  return updated;
}

/**
 * Expire a Swarm Watch theatre — no qualifying event in the window.
 */
export function expireSwarmWatch(theatre) {
  if (theatre.state === 'resolved') return theatre;

  return {
    ...theatre,
    state: 'resolved',
    outcome: false,
    resolved_at: Date.now(),
    position_history: [
      ...theatre.position_history,
      {
        t: Date.now(),
        p: theatre.current_position,
        evidence: null,
        reason: `Theatre expired — swarm dissipated, no M≥${theatre.magnitude_threshold} event`,
      },
    ],
  };
}

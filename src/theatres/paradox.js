/**
 * Oracle Divergence Theatre
 *
 * Paradox Engine native: "Will the USGS reviewed magnitude for event X
 * differ from the automatic magnitude by ≥0.3?"
 *
 * Meta-market — predicting the prediction system's revision behavior.
 * Auto-spawns on every M≥4.5 automatic detection.
 *
 * Signals that predict large revisions:
 *   - magType: Ml often revised more than Mw
 *   - gap: high azimuthal gap = low initial confidence
 *   - nst: few stations = likely revision
 *   - depth: shallow events refine more
 *   - network density: sparse regions have larger initial errors
 */

/**
 * Create an Oracle Divergence theatre from an automatic detection.
 *
 * @param {object} bundle - Evidence bundle for an automatic event
 * @returns {object|null} Theatre definition, or null if event doesn't qualify
 */
export function createOracleDivergence(bundle) {
  const mag = bundle.payload.magnitude;
  const quality = bundle.payload.quality;

  // Only spawn for M≥4.5 automatic events
  if (mag.value < 4.5) return null;
  if (bundle.evidence_class === 'ground_truth') return null;

  const now = Date.now();

  // Estimate revision probability from signals
  const revisionProb = estimateRevisionProbability(bundle);

  return {
    id: `T5-DIVERGE-${bundle.payload.event_id}-${now}`,
    template: 'oracle_divergence',
    question: `Will reviewed magnitude for ${bundle.payload.event_id} differ from automatic (M${mag.value} ${mag.type}) by ≥0.3?`,
    event_id: bundle.payload.event_id,
    automatic_magnitude: mag.value,
    automatic_mag_type: mag.type,
    region_bbox: [
      bundle.payload.location.longitude - 5,
      bundle.payload.location.latitude - 5,
      bundle.payload.location.longitude + 5,
      bundle.payload.location.latitude + 5,
    ],
    magnitude_threshold: 0, // not used for this template
    opens_at: now,
    closes_at: now + 48 * 60 * 60 * 1000, // 48h max
    state: 'open',
    outcome: null,

    // Position tracking
    position_history: [
      {
        t: now,
        p: revisionProb,
        evidence: bundle.bundle_id,
        reason: formatRevisionRationale(bundle, revisionProb),
      },
    ],
    current_position: revisionProb,
    evidence_bundles: [bundle.bundle_id],

    // Resolution
    resolving_bundle_id: null,
    resolved_at: null,

    // Divergence-specific metadata
    revision_signals: extractRevisionSignals(bundle),
  };
}

/**
 * Resolve an Oracle Divergence theatre when the reviewed magnitude arrives.
 *
 * @param {object} theatre - Oracle Divergence theatre
 * @param {object} reviewedBundle - Evidence bundle with status='reviewed'
 * @returns {object} Resolved theatre
 */
export function resolveOracleDivergence(theatre, reviewedBundle) {
  if (theatre.state === 'resolved') return theatre;

  const reviewedMag = reviewedBundle.payload.magnitude.value;
  const divergence = Math.abs(reviewedMag - theatre.automatic_magnitude);
  const outcome = divergence >= 0.3;

  return {
    ...theatre,
    state: 'resolved',
    outcome,
    resolving_bundle_id: reviewedBundle.bundle_id,
    resolved_at: Date.now(),
    current_position: outcome ? 1.0 : 0.0,
    position_history: [
      ...theatre.position_history,
      {
        t: Date.now(),
        p: outcome ? 1.0 : 0.0,
        evidence: reviewedBundle.bundle_id,
        reason: `Reviewed M${reviewedMag} vs auto M${theatre.automatic_magnitude} — divergence=${divergence.toFixed(2)} → ${outcome ? 'YES' : 'NO'}`,
      },
    ],
    evidence_bundles: [...theatre.evidence_bundles, reviewedBundle.bundle_id],
    resolution_detail: {
      reviewed_magnitude: reviewedMag,
      automatic_magnitude: theatre.automatic_magnitude,
      divergence: Math.round(divergence * 100) / 100,
    },
  };
}

// --- Signal extraction ---

function extractRevisionSignals(bundle) {
  const mag = bundle.payload.magnitude;
  const quality = bundle.payload.quality;

  return {
    mag_type: mag.type,
    mag_type_risk: ['Ml', 'ml', 'ML', 'Md', 'md'].includes(mag.type) ? 'high' : 'low',
    doubt_price: mag.doubt_price,
    azimuthal_gap: quality.components.gap_penalty,
    station_score: quality.components.station_score,
    network_density: quality.region?.density_grade ?? 'unknown',
    depth_km: bundle.payload.location.depth_km,
    shallow: bundle.payload.location.depth_km < 30,
  };
}

function estimateRevisionProbability(bundle) {
  const signals = extractRevisionSignals(bundle);
  let prob = 0.15; // base rate: ~15% of events get revised by ≥0.3

  // Ml/Md types are revised much more often than Mw
  if (signals.mag_type_risk === 'high') prob += 0.15;

  // High doubt price = high uncertainty = more revision room
  prob += signals.doubt_price * 0.15;

  // Poor gap score = likely revision
  prob += (1 - signals.azimuthal_gap) * 0.10;

  // Few stations = likely revision
  prob += (1 - signals.station_score) * 0.10;

  // Sparse networks have larger initial errors
  if (signals.network_density === 'sparse' || signals.network_density === 'ocean') {
    prob += 0.10;
  }

  // Shallow events tend to get refined more
  if (signals.shallow) prob += 0.05;

  return Math.max(0.05, Math.min(0.85, Math.round(prob * 1000) / 1000));
}

function formatRevisionRationale(bundle, prob) {
  const signals = extractRevisionSignals(bundle);
  const parts = [`Initial revision estimate: ${(prob * 100).toFixed(1)}%`];

  if (signals.mag_type_risk === 'high') {
    parts.push(`${signals.mag_type} type has high revision rate`);
  }
  if (signals.doubt_price > 0.4) {
    parts.push(`doubt_price=${signals.doubt_price} (elevated uncertainty)`);
  }
  if (signals.network_density === 'sparse' || signals.network_density === 'ocean') {
    parts.push(`${signals.network_density} network → larger initial errors`);
  }

  return parts.join('; ');
}

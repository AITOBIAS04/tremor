/**
 * Depth Regime Theatre
 *
 * Binary market: "Will the next M≥5.5 event in subduction zone X be
 * shallow (≤70km) or intermediate/deep (>70km)?"
 *
 * Tests structural geology knowledge encoded into the construct.
 * Different subduction zones have different depth distributions —
 * a well-trained construct develops zone-specific priors.
 *
 * The 14-day expiry introduces an "event occurrence" uncertainty layer
 * on top of the depth question. P&L attribution cleanly isolates
 * structural reasoning from temporal reasoning.
 */

/**
 * Historical depth distributions for major subduction zones.
 *
 * shallow_fraction = P(depth ≤ 70km | M≥5.5 event in this zone)
 *
 * These are approximate from ISC-GEM catalog analysis. In production,
 * compute from the last 20 years of reviewed M5.5+ events per zone.
 */
const ZONE_PROFILES = {
  cascadia: {
    name: 'Cascadia',
    bbox: [-130, 40, -122, 50],
    shallow_fraction: 0.85,
    typical_shallow_depth: 15,
    typical_deep_depth: 45,
    notes: 'Mostly shallow intraslab; deep events rare',
  },
  japan_trench: {
    name: 'Japan Trench',
    bbox: [138, 30, 148, 42],
    shallow_fraction: 0.55,
    typical_shallow_depth: 30,
    typical_deep_depth: 120,
    notes: 'Broad depth range; significant deep seismicity',
  },
  tonga_kermadec: {
    name: 'Tonga-Kermadec',
    bbox: [-180, -35, -172, -15],
    shallow_fraction: 0.35,
    typical_shallow_depth: 25,
    typical_deep_depth: 200,
    notes: 'Deep slab; many intermediate/deep events',
  },
  peru_chile: {
    name: 'Peru-Chile',
    bbox: [-80, -45, -68, -10],
    shallow_fraction: 0.60,
    typical_shallow_depth: 30,
    typical_deep_depth: 150,
    notes: 'Active shallow + intermediate depth',
  },
  sumatra_java: {
    name: 'Sumatra-Java',
    bbox: [94, -12, 120, 8],
    shallow_fraction: 0.50,
    typical_shallow_depth: 25,
    typical_deep_depth: 160,
    notes: 'Mixed; megathrust shallow, intraslab deep',
  },
  aleutians: {
    name: 'Aleutians',
    bbox: [-190, 50, -160, 56],
    shallow_fraction: 0.70,
    typical_shallow_depth: 25,
    typical_deep_depth: 100,
    notes: 'Predominantly shallow; some intermediate',
  },
  philippines: {
    name: 'Philippines',
    bbox: [120, 5, 130, 20],
    shallow_fraction: 0.40,
    typical_shallow_depth: 30,
    typical_deep_depth: 250,
    notes: 'Deep slab penetration; significant deep events',
  },
};

const DEPTH_BOUNDARY = 70; // km — the shallow/deep dividing line

// =========================================================================
// Theatre lifecycle
// =========================================================================

/**
 * Create a Depth Regime theatre.
 *
 * @param {object} params
 * @param {string} params.zone_id - Key from ZONE_PROFILES
 * @param {number} [params.magnitude_threshold] - Minimum event magnitude (default 5.5)
 * @param {number} [params.window_days] - Prediction window (default 14)
 * @returns {object|null} Theatre definition, or null if zone not found
 */
export function createDepthRegime({
  zone_id,
  magnitude_threshold = 5.5,
  window_days = 14,
}) {
  const profile = ZONE_PROFILES[zone_id];
  if (!profile) return null;

  const now = Date.now();

  return {
    id: `T4-DEPTH-${zone_id.toUpperCase()}-${now}`,
    template: 'depth_regime',
    question: `Next M≥${magnitude_threshold} in ${profile.name}: shallow (≤${DEPTH_BOUNDARY}km) or deep (>${DEPTH_BOUNDARY}km)?`,
    zone_id,
    zone_profile: profile,
    region_bbox: profile.bbox,
    magnitude_threshold,
    depth_boundary: DEPTH_BOUNDARY,
    opens_at: now,
    closes_at: now + window_days * 24 * 60 * 60 * 1000,
    state: 'open',
    outcome: null, // true = shallow, false = deep

    // Position = P(shallow)
    current_position: profile.shallow_fraction,

    position_history: [
      {
        t: now,
        p: profile.shallow_fraction,
        evidence: null,
        reason:
          `${profile.name} historical prior: ${(profile.shallow_fraction * 100).toFixed(0)}% shallow. ` +
          profile.notes,
      },
    ],
    evidence_bundles: [],

    // Track precursory events (below threshold but informative)
    precursory_events: [],

    resolving_bundle_id: null,
    resolved_at: null,
  };
}

/**
 * Process an evidence bundle against a Depth Regime theatre.
 *
 * Three cases:
 *   1. Qualifying event (M≥threshold) → resolve the market
 *   2. Sub-threshold event in the zone → precursory signal
 *   3. Irrelevant event → skip
 *
 * @param {object} theatre - Depth Regime theatre
 * @param {object} bundle - Evidence bundle
 * @returns {object} Updated theatre
 */
export function processDepthRegime(theatre, bundle) {
  if (theatre.state === 'resolved' || theatre.state === 'expired') {
    return theatre;
  }

  const mag = bundle.payload.magnitude.value;
  const depth = bundle.payload.location.depth_km;
  const threshold = theatre.magnitude_threshold;
  const updated = { ...theatre };

  updated.evidence_bundles = [...theatre.evidence_bundles, bundle.bundle_id];

  // Case 1: Qualifying event → resolve
  if (
    mag >= threshold &&
    (bundle.evidence_class === 'ground_truth' || bundle.evidence_class === 'provisional_mature')
  ) {
    const isShallow = depth <= theatre.depth_boundary;

    updated.state = bundle.evidence_class === 'ground_truth' ? 'resolved' : 'provisional_hold';
    updated.outcome = isShallow;
    updated.resolving_bundle_id = bundle.bundle_id;
    updated.resolved_at = Date.now();
    updated.current_position = isShallow ? 1.0 : 0.0;

    updated.position_history = [
      ...theatre.position_history,
      {
        t: Date.now(),
        p: updated.current_position,
        evidence: bundle.bundle_id,
        reason:
          `M${mag} at ${depth}km → ${isShallow ? 'SHALLOW' : 'DEEP'} ` +
          `(${bundle.evidence_class})`,
      },
    ];
    return updated;
  }

  // Case 2: Sub-threshold event → precursory signal
  // Recent shallow activity nudges P(shallow) up and vice versa
  if (mag >= threshold - 1.5) {
    updated.precursory_events = [
      ...theatre.precursory_events,
      {
        bundle_id: bundle.bundle_id,
        magnitude: mag,
        depth_km: depth,
        time: bundle.payload.event_time,
      },
    ];

    // Compute depth trend from precursory events
    const recentDepths = updated.precursory_events
      .slice(-10) // last 10 precursory events
      .map((e) => e.depth_km);

    if (recentDepths.length >= 3) {
      const shallowCount = recentDepths.filter((d) => d <= theatre.depth_boundary).length;
      const shallowFraction = shallowCount / recentDepths.length;

      // Blend precursory signal with historical prior
      // Weight precursory signal by number of events (more = more confident)
      const precursoryWeight = Math.min(0.4, recentDepths.length * 0.05);
      const priorWeight = 1 - precursoryWeight;

      const newPosition =
        priorWeight * theatre.zone_profile.shallow_fraction +
        precursoryWeight * shallowFraction;

      updated.current_position = Math.round(
        Math.max(0.05, Math.min(0.95, newPosition)) * 1000
      ) / 1000;

      updated.position_history = [
        ...theatre.position_history,
        {
          t: Date.now(),
          p: updated.current_position,
          evidence: bundle.bundle_id,
          reason:
            `Precursory M${mag} at ${depth}km — ` +
            `recent shallow fraction: ${(shallowFraction * 100).toFixed(0)}% ` +
            `(n=${recentDepths.length}, weight=${precursoryWeight.toFixed(2)})`,
        },
      ];
    }
  }

  return updated;
}

/**
 * Expire a Depth Regime theatre — no qualifying event in the window.
 *
 * This is an interesting edge case for Brier scoring: the market
 * was about depth conditional on an event occurring, but no event
 * occurred. The position at expiry reflects P(shallow) but the
 * question was never answered.
 *
 * We resolve as null outcome with a special Brier treatment:
 * the certificate records the position history but the Brier score
 * is computed against the base rate (a "no information" benchmark).
 */
export function expireDepthRegime(theatre) {
  if (theatre.state === 'resolved') return theatre;

  return {
    ...theatre,
    state: 'expired',
    outcome: null, // No qualifying event — question unanswered
    resolved_at: Date.now(),
    position_history: [
      ...theatre.position_history,
      {
        t: Date.now(),
        p: theatre.current_position,
        evidence: null,
        reason:
          `Theatre expired — no M≥${theatre.magnitude_threshold} event in ${theatre.zone_profile.name}. ` +
          `Precursory events: ${theatre.precursory_events.length}`,
      },
    ],
  };
}

export { ZONE_PROFILES, DEPTH_BOUNDARY };

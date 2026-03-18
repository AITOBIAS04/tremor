/**
 * Magnitude uncertainty pricing.
 *
 * Converts raw USGS magnitude data into a "doubt price" that tells
 * the construct how much to discount this reading for threshold
 * decisions.
 *
 * A M4.9 automatic Ml reading might actually be M5.1 Mw after review.
 * If the Theatre threshold is M5.0, the construct needs to price the
 * probability that the true magnitude crosses the threshold.
 */

import { findRegion } from './regions.js';

/**
 * Typical 1-sigma magnitude uncertainty by type.
 * Mw (moment magnitude) is gold standard; Md (duration) is least reliable.
 */
const MAG_TYPE_UNCERTAINTY = {
  Mw:  0.10,
  Mww: 0.10,
  Mwc: 0.12,
  Mwb: 0.12,
  Mwr: 0.12,
  Mi:  0.15,
  Mb:  0.20,
  Ms:  0.20,
  ML:  0.25,
  Ml:  0.25,
  ml:  0.25,
  Md:  0.35,
  md:  0.35,
  Mc:  0.30,
};

const DENSITY_MULTIPLIER = {
  dense: 0.9,
  moderate: 1.0,
  sparse: 1.2,
  ocean: 1.4,
};

/**
 * Build the full magnitude uncertainty model for a USGS feature.
 *
 * @param {object} feature - USGS GeoJSON feature
 * @returns {object} Magnitude uncertainty with doubt_price
 */
export function buildMagnitudeUncertainty(feature) {
  const { properties: props, geometry } = feature;
  const mag = props.mag ?? 0;
  const magType = props.magType ?? 'unknown';
  const reportedError = props.magError ?? null;
  const magNst = props.magNst ?? null;
  const status = props.status;

  const region = findRegion(geometry.coordinates[0], geometry.coordinates[1]);

  // Base uncertainty from magnitude type
  let estimatedError = MAG_TYPE_UNCERTAINTY[magType] ?? 0.25;

  // Use USGS-reported error if available (floor at half of type baseline)
  if (reportedError !== null && reportedError > 0) {
    estimatedError = Math.max(reportedError, estimatedError * 0.5);
  }

  // Adjust for station count used in magnitude computation
  if (magNst !== null && magNst > 0) {
    const stationFactor = Math.min(1, magNst / 20);
    estimatedError *= 1.5 - (0.5 * stationFactor);
  } else {
    estimatedError *= 1.3;
  }

  // Adjust for regional network density
  estimatedError *= DENSITY_MULTIPLIER[region.density_grade] ?? 1.0;

  // Reviewed events have lower effective uncertainty
  if (status === 'reviewed') {
    estimatedError *= 0.7;
  }

  // Doubt price: 0-1 normalized
  const doubtPrice = Math.min(1, estimatedError / 0.5);

  // 95% confidence interval
  const ci95 = estimatedError * 1.96;

  return {
    value: mag,
    type: magType,
    reported_error: reportedError,
    estimated_error: round3(estimatedError),
    doubt_price: round3(doubtPrice),
    confidence_interval_95: [
      round2(mag - ci95),
      round2(mag + ci95),
    ],
  };
}

/**
 * Given a magnitude uncertainty model and a threshold, compute the
 * probability that the true magnitude exceeds the threshold.
 *
 * Uses normal CDF approximation. This is what the construct uses
 * to price threshold-crossing markets when the automatic magnitude
 * is near the boundary.
 *
 * @param {object} uncertainty - Output from buildMagnitudeUncertainty
 * @param {number} threshold - Market threshold (e.g., 5.0)
 * @returns {number} Probability 0-1 that true magnitude >= threshold
 */
export function thresholdCrossingProbability(uncertainty, threshold) {
  const { value, estimated_error } = uncertainty;
  if (estimated_error === 0) {
    return value >= threshold ? 1 : 0;
  }
  // Standard normal CDF via error function approximation
  const z = (threshold - value) / estimated_error;
  return 1 - normalCDF(z);
}

// --- Helpers ---

function round2(n) { return Math.round(n * 100) / 100; }
function round3(n) { return Math.round(n * 1000) / 1000; }

/**
 * Standard normal CDF approximation (Abramowitz & Stegun 26.2.17).
 * Accurate to ~1.5e-7.
 */
function normalCDF(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

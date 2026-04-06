/**
 * Region profiles for station density bias normalization.
 *
 * Seismic networks are denser in wealthy/populated regions. A M5.0 in
 * California has 200+ recording stations; the same event in the South
 * Pacific might have 10. These profiles normalize quality metrics against
 * regional baselines so the construct doesn't systematically overweight
 * well-instrumented regions.
 *
 * In production, calibrate from historical catalog stats per region —
 * median nst and median gap for M4.5+ events over the last 5 years.
 */

// ---------------------------------------------------------------------
// median_nst, median_gap, and baseline_rms values updated from USGS FDSN
// catalog (M4.5+ reviewed events, 2021–2026). Evidence tag: DATA-FACTUAL.
// Calibration date: 2026-04-06. Source: grimoires/loa/calibration/regional-profiles-findings.md
//
// Fields within ±15% of measured values and left at prior estimates:
//   Mediterranean.median_gap (current 55, measured 51.00, -7.3%)
//   Central Asia.median_gap (current 80, measured 70.00, -12.5%)
//   South Pacific.median_gap (current 120, measured 102.00, -15.0%)
//   Mid-Atlantic Ridge.baseline_rms (current 0.60, measured 0.63, +5.0%)
//
// density_grade assignments, DEFAULT_REGION fallback, and DENSITY_NORM
// table remain TBD: empirical calibration needed — no measured replacement
// available from Study 4.
//
// Bounding boxes are rectangular approximations of tectonic provinces;
// canonical source would be GCMT or Flinn-Engdahl regionalization.
// TBD: replace with proper tectonic province boundaries.
// ---------------------------------------------------------------------
export const REGION_PROFILES = [
  {
    name: 'US West Coast',
    bbox: [-130, 30, -115, 50],
    median_nst: 72,
    median_gap: 127.5,
    baseline_rms: 0.65,
    density_grade: 'dense',
  },
  {
    name: 'Japan',
    bbox: [128, 30, 148, 46],
    median_nst: 77,
    median_gap: 109,
    baseline_rms: 0.66,
    density_grade: 'dense',
  },
  {
    name: 'Mediterranean',
    bbox: [-10, 30, 40, 48],
    median_nst: 84,
    median_gap: 55,
    baseline_rms: 0.71,
    density_grade: 'moderate',
  },
  {
    name: 'Central Asia',
    bbox: [60, 25, 90, 45],
    median_nst: 78,
    median_gap: 80,
    baseline_rms: 0.70,
    density_grade: 'moderate',
  },
  {
    name: 'South Pacific',
    bbox: [160, -35, -150, -5],
    median_nst: 40,
    median_gap: 120,
    baseline_rms: 0.73,
    density_grade: 'sparse',
  },
  {
    name: 'Mid-Atlantic Ridge',
    bbox: [-45, -30, -10, 40],
    median_nst: 39,
    median_gap: 74,
    baseline_rms: 0.60,
    density_grade: 'ocean',
  },
  {
    name: 'South America West',
    bbox: [-82, -45, -65, 5],
    median_nst: 61,
    median_gap: 81,
    baseline_rms: 0.75,
    density_grade: 'moderate',
  },
  {
    name: 'Alaska / Aleutians',
    bbox: [-190, 50, -140, 72],
    median_nst: 121,
    median_gap: 117,
    baseline_rms: 0.73,
    density_grade: 'moderate',
  },
];

export const DEFAULT_REGION = {
  name: 'Global Default',
  bbox: [-180, -90, 180, 90],
  median_nst: 25,
  median_gap: 100,
  baseline_rms: 0.40,
  density_grade: 'sparse',
};

export const DENSITY_NORM = {
  dense: 1.0,
  moderate: 0.85,
  sparse: 0.65,
  ocean: 0.45,
};

/**
 * Find the matching region profile for a coordinate pair.
 * Handles antimeridian crossing for South Pacific.
 */
export function findRegion(lon, lat) {
  for (const region of REGION_PROFILES) {
    const [minLon, minLat, maxLon, maxLat] = region.bbox;
    const lonMatch =
      minLon <= maxLon
        ? lon >= minLon && lon <= maxLon
        : lon >= minLon || lon <= maxLon;
    if (lonMatch && lat >= minLat && lat <= maxLat) {
      return region;
    }
  }
  return DEFAULT_REGION;
}

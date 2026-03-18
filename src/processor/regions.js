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

export const REGION_PROFILES = [
  {
    name: 'US West Coast',
    bbox: [-130, 30, -115, 50],
    median_nst: 120,
    median_gap: 35,
    baseline_rms: 0.15,
    density_grade: 'dense',
  },
  {
    name: 'Japan',
    bbox: [128, 30, 148, 46],
    median_nst: 200,
    median_gap: 25,
    baseline_rms: 0.12,
    density_grade: 'dense',
  },
  {
    name: 'Mediterranean',
    bbox: [-10, 30, 40, 48],
    median_nst: 60,
    median_gap: 55,
    baseline_rms: 0.25,
    density_grade: 'moderate',
  },
  {
    name: 'Central Asia',
    bbox: [60, 25, 90, 45],
    median_nst: 30,
    median_gap: 80,
    baseline_rms: 0.35,
    density_grade: 'moderate',
  },
  {
    name: 'South Pacific',
    bbox: [160, -35, -150, -5],
    median_nst: 15,
    median_gap: 120,
    baseline_rms: 0.50,
    density_grade: 'sparse',
  },
  {
    name: 'Mid-Atlantic Ridge',
    bbox: [-45, -30, -10, 40],
    median_nst: 8,
    median_gap: 180,
    baseline_rms: 0.60,
    density_grade: 'ocean',
  },
  {
    name: 'South America West',
    bbox: [-82, -45, -65, 5],
    median_nst: 40,
    median_gap: 65,
    baseline_rms: 0.30,
    density_grade: 'moderate',
  },
  {
    name: 'Alaska / Aleutians',
    bbox: [-190, 50, -140, 72],
    median_nst: 35,
    median_gap: 75,
    baseline_rms: 0.30,
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

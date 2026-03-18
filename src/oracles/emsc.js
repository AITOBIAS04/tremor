/**
 * EMSC cross-validation oracle.
 *
 * Queries the European-Mediterranean Seismological Centre for independent
 * magnitude readings to cross-validate USGS data. Magnitude divergence
 * between networks is a Paradox Engine signal.
 */

const EMSC_API_BASE = 'https://seismicportal.eu/fdsnws/event/1/query';

/**
 * Cross-validate a USGS event against EMSC.
 *
 * Matches by time window (±120s) and spatial proximity (≤100km / ~1°).
 *
 * @param {object} feature - USGS GeoJSON feature
 * @returns {object|null} Cross-validation result or null on failure
 */
export async function crossValidateEMSC(feature) {
  const { properties: props, geometry } = feature;
  const [lon, lat] = geometry.coordinates;
  const eventTime = new Date(props.time);

  // Build time window: ±120 seconds
  const startTime = new Date(eventTime.getTime() - 120_000).toISOString();
  const endTime = new Date(eventTime.getTime() + 120_000).toISOString();

  // Spatial window: ~1° radius
  const params = new URLSearchParams({
    format: 'json',
    starttime: startTime,
    endtime: endTime,
    latitude: lat.toString(),
    longitude: lon.toString(),
    maxradius: '1',
    minmagnitude: Math.max(0, (props.mag ?? 0) - 1).toString(),
  });

  try {
    const response = await fetch(`${EMSC_API_BASE}?${params}`, {
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return {
        sources_checked: ['EMSC'],
        magnitude_readings: { USGS: props.mag },
        max_divergence: 0,
        paradox_flag: false,
        matched: false,
      };
    }

    // Take the closest match by time
    const bestMatch = data.features.reduce((best, f) => {
      const timeDiff = Math.abs(f.properties.time - props.time);
      if (!best || timeDiff < best._timeDiff) {
        return { ...f, _timeDiff: timeDiff };
      }
      return best;
    }, null);

    const emscMag = bestMatch.properties.mag;
    const usgsMag = props.mag;
    const divergence = Math.abs(usgsMag - emscMag);

    return {
      sources_checked: ['EMSC'],
      magnitude_readings: {
        USGS: usgsMag,
        EMSC: emscMag,
      },
      max_divergence: Math.round(divergence * 100) / 100,
      paradox_flag: divergence >= 0.3,
      matched: true,
      emsc_event_id: bestMatch.id ?? null,
    };
  } catch (err) {
    // Network error, timeout, etc. — fail gracefully
    console.warn('[TREMOR:EMSC] Cross-validation failed:', err.message);
    return null;
  }
}

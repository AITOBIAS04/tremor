# Seismic Intelligence Skill

## Purpose

TREMOR's core intelligence skill. Converts raw seismological data into
Echelon-compatible evidence bundles, manages Theatre lifecycle for seismic
prediction markets, and exports RLMF training data.

## Domain

Seismic event monitoring, threshold-based prediction markets, aftershock
sequence modeling, and measurement uncertainty pricing.

## Data Sources

| Source | Role | Endpoint | Auth | Latency |
|--------|------|----------|------|---------|
| USGS NEIC | Primary oracle | `earthquake.usgs.gov/fdsnws/event/1` | None | ~60s M4.5+ |
| EMSC | Cross-validation | `seismicportal.eu/fdsnws/event/1` | None | ~120s |
| IRIS DMC | Quality reference (planned for v0.2) | `service.iris.edu/fdsnws/event/1` | None | ~180s |

USGS and EMSC are fully integrated in v0.1. IRIS DMC integration is planned
for v0.2 — not yet implemented. All sources are free, always-on, machine-readable
GeoJSON, and ground-truth verifiable. No API keys required.

## Investigation Types

### Magnitude threshold (binary)
Will a M≥X event occur in region Y within Z hours? Resolves against USGS
reviewed catalog. Cleanest Brier target — binary outcome, objective resolution.

### Aftershock sequencing (multi-class)
Given a mainshock, predict aftershock count/magnitude within Omori-law decay
windows. Produces rich time-series of belief updates as evidence streams in.

### Regional clustering (spatial-statistical)
Will cluster activity in zone X exceed N events in 24h/72h? Leverages
rolling b-value drift signals from Gutenberg-Richter analysis.

### Depth profile (structural-binary)
Deep vs. shallow discrimination in subduction zones. Tests construct's
encoded knowledge of tectonic regime.

### Multi-source divergence (meta/paradox)
When USGS and EMSC magnitudes diverge by >0.3, trade the spread. Native
Paradox Engine integration. Resolution by reviewed catalog.

### Tsunami flag (binary, high-impact)
Will USGS assign tsunami=1 to next M7.0+? Depth + magnitude + coastal
proximity as compound signal.

## Derived Capabilities

- **Gutenberg-Richter b-value tracking**: Rolling b-value per tectonic region.
  Deviation from long-term mean flags regime change.
- **Omori-law decay modeling**: Aftershock rate prediction using modified Omori
  parameters. Calibrated base rates for aftershock count markets.
- **Quality scoring**: RMS residual, azimuthal gap, station count weighting
  with regional network density normalization.
- **Magnitude uncertainty pricing**: Doubt price from magType + error + network
  density. Used for threshold-crossing probability estimation.
- **Cross-source triangulation**: Magnitude/location disagreement across
  USGS/EMSC/IRIS as Paradox Engine input signal.

## Settlement Logic

Three-tier settlement handles USGS review latency:

| Tier | Condition | Evidence Class | Brier Discount |
|------|-----------|----------------|----------------|
| 1 — Oracle | `status=reviewed` | `ground_truth` | 0% |
| 2 — Provisional | age>2h, stable, quality>0.5, cross-validated | `provisional_mature` | 10% |
| 3 — Freeze | Theatre expiring, insufficient quality | `provisional` | 20% |

Hard expiry at 7 days for never-reviewed events (25% Brier discount).

## RLMF Export

Every resolved Theatre produces an RLMF certificate containing:
- Brier score (binary or multi-class)
- Opening and closing positions
- Full position history with evidence bundle references
- Calibration bucket assignment
- Paradox Engine event count
- On-chain P&L and gas cost

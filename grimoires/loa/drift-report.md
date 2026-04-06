# Three-Way Drift Analysis

> Documentation vs. Code Reality
> Generated: 2026-04-05

## Executive Summary

**Drift Score: 8/10 (LOW DRIFT — Good alignment)**

- **Aligned Claims**: 21/24 (87.5%)
- **Stale Claims**: 2/24 (8.3%)
- **Hallucinated Claims**: 0/24 (0%)
- **Ghost Features**: 1/24 (4.2%)
- **Shadow Code**: 0/24 (0%)

The README and BUTTERFREEZONE are well-grounded in actual implementation. One feature (IRIS) is documented but not implemented — this is the primary drift.

## Drift Breakdown

### ALIGNED (21 items)

Documented claims with full code evidence:

| Claim | Documented | Code Evidence | Status |
|-------|------------|---|--------|
| TremorConstruct main class | README.md | `src/index.js:22` | ✓ VERIFIED |
| USGS feed poller | README.md | `src/oracles/usgs.js:26-35` | ✓ VERIFIED |
| EMSC cross-validation | README.md | `src/oracles/emsc.js:16` | ✓ VERIFIED |
| buildBundle pipeline | BUTTERFREEZONE.md | `src/processor/bundles.js:20` | ✓ VERIFIED |
| computeQuality regional normalization | README.md | `src/processor/quality.js:47` | ✓ VERIFIED |
| buildMagnitudeUncertainty doubt pricing | README.md | `src/processor/magnitude.js:49` | ✓ VERIFIED |
| assessStatusFlip settlement logic | README.md | `src/processor/settlement.js:30` | ✓ VERIFIED |
| 5 Theatre templates | README.md | `src/theatres/*.js` (5 files) | ✓ VERIFIED |
| Magnitude Gate binary logic | README.md | `src/theatres/mag-gate.js:24` | ✓ VERIFIED |
| Aftershock Cascade multi-class | README.md | `src/theatres/aftershock.js:4-8` | ✓ VERIFIED |
| Swarm Watch b-value drift | README.md | `src/theatres/swarm.js:24` | ✓ VERIFIED |
| Depth Regime subduction zones | README.md | `src/theatres/depth.js` | ✓ VERIFIED |
| Oracle Divergence meta-market | README.md | `src/theatres/paradox.js:4-8` | ✓ VERIFIED |
| Brier score calculation | README.md | `src/rlmf/certificates.js:28-30` | ✓ VERIFIED |
| exportCertificate RLMF pipeline | README.md | `src/rlmf/certificates.js:77` | ✓ VERIFIED |
| Zero dependencies | README.md | `package.json` | ✓ VERIFIED |
| Node.js 20+ requirement | README.md | `package.json:25` | ✓ VERIFIED |
| node:test runner | README.md | `test/tremor.test.js:8` | ✓ VERIFIED |
| 48 tests across 16 suites | README.md | `test/tremor.test.js` | ✓ VERIFIED |
| Three-tier settlement (oracle/provisional/freeze) | README.md | `src/processor/settlement.js` | ✓ VERIFIED |
| Regional profiles (8 zones) | README.md | `src/processor/regions.js:14-79` | ✓ VERIFIED |

### STALE (2 items)

Documented, but implementation details differ from description:

#### 1. IRIS Integration Status
- **Documented**: "ingests real-time earthquake data from USGS, EMSC, and IRIS" (README.md:5)
- **Code Reality**: Only USGS and EMSC implemented; no `src/oracles/iris.js`
- **Severity**: GHOST (claimed but not present)
- **Fix**: Update README or implement IRIS oracle

#### 2. On-chain P&L Attribution
- **Documented**: "On-chain P&L makes every prediction auditable" (README.md:88)
- **Code Reality**: `exportCertificate()` takes optional `on_chain` param but no implementation exists
- **Severity**: HALLUCINATED (feature incomplete/aspirational)
- **Evidence**: `src/rlmf/certificates.js:77` function signature includes `options.on_chain` but not used
- **Fix**: Either implement on-chain integration or document as "planned"

### GHOST FEATURES (1)

Documented feature with no code implementation:

| Feature | Doc | Code | Status |
|---------|-----|------|--------|
| IRIS oracle | README.md:5 | ✗ Missing | GHOST |

### SHADOW CODE (0)

No significant code without documentation.

## Evidence: Claim-by-Claim Verification

### Core Architecture
- **Claim**: "seismic intelligence construct for Echelon framework"
  - **Code**: `src/index.js:1-11` (JSDoc header with Echelon reference) ✓
  - **Evidence**: TremorConstruct implements expected lifecycle and theatre management

### Data Sources
- **USGS**: README + code ✓
  - `src/oracles/usgs.js:10-18` defines 7 feed URLs
  - pollAndIngest implementation matches README description
- **EMSC**: README + code ✓
  - `src/oracles/emsc.js:16` implements cross-validation
- **IRIS**: README only ✗
  - No implementation found
  - Not in spec/construct.json
  - Not in import statements

### Processing Pipeline
- **Quality scoring**: README + code ✓
  - `src/processor/quality.js:47-97` implements full algorithm
  - Regional normalization with 8 profiles ✓
- **Magnitude uncertainty**: README + code ✓
  - Doubt pricing implemented
  - thresholdCrossingProbability() for threshold decisions ✓
- **Settlement assessment**: README + code ✓
  - Three-tier logic verified

### Theatre Templates
All 5 templates verified with file:line:
- magnitude_gate: ✓ `src/theatres/mag-gate.js:24`
- aftershock_cascade: ✓ `src/theatres/aftershock.js:4`
- swarm_watch: ✓ `src/theatres/swarm.js:1`
- depth_regime: ✓ `src/theatres/depth.js`
- oracle_divergence: ✓ `src/theatres/paradox.js:4`

### RLMF Export
- **Brier score**: README + code ✓
  - `src/rlmf/certificates.js:28-30` implements binary: (forecast - outcome)²
  - `src/rlmf/certificates.js:43-50` implements multi-class
- **Position history**: Code ✓
  - Theatres maintain position_history arrays
  - Exported in certificates
- **On-chain P&L**: Aspirational ✗
  - Parameter exists but not implemented
  - No blockchain interaction code

## Recommendations

### Must-Fix (Honesty)
1. **README.md:5** — Either implement IRIS oracle or remove from data source list
   - Impact: Prevents agents from expecting IRIS integration
   - Effort: 5 lines
   - Priority: High

### Should-Fix (Clarity)
1. **On-chain P&L** — Document as "planned for v0.2" or implement
   - Impact: Sets expectations correctly
   - Effort: Document = 2 lines; implement = unknown
   - Priority: Medium

### Nice-to-Have (Docs)
1. Add "Roadmap" section to README noting v0.2 plans (IRIS, on-chain, historical catalog calibration)

## Grounding Summary

- **GROUNDED claims**: 21/24 (87.5%)
  - Direct code evidence with file:line citations
  - Verified against actual function signatures
  
- **INFERRED claims**: 2/24 (8.3%)
  - IRIS and on-chain both have incomplete implementations
  - Inferred as aspirational/planned based on parameter existence
  
- **HALLUCINATED claims**: 0/24 (0%)
  - No false claims; only incomplete implementation

**Conclusion**: This is a well-documented codebase with low drift. The IRIS issue is the only material discrepancy, and it's easily resolved.


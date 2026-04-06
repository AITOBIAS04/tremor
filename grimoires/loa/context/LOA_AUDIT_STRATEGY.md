# Prompting LOA for TREMOR Audit: Strategy & Edge Cases

**Date:** April 5, 2026  
**Purpose:** Guide for invoking LOA's auditing agents to validate TREMOR system and identify empirical gaps

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [LOA Audit Architecture](#loa-audit-architecture)
3. [Phase 1: Codebase Analysis (`/ride`)](#phase-1-codebase-analysis-ride)
4. [Phase 2: Security Audit (`/audit-codebase`)](#phase-2-security-audit-audit-codebase)
5. [Phase 3: Empirical Validation Audit (Custom)](#phase-3-empirical-validation-audit-custom)
6. [Prompt Engineering Strategy](#prompt-engineering-strategy)
7. [Integration Points & Artifacts](#integration-points--artifacts)
8. [Edge Cases LOA Will Find](#edge-cases-loa-will-find)
9. [Recommendations by Category](#recommendations-by-category)
10. [Post-Audit Workflow](#post-audit-workflow)

---

## Executive Summary

**Objective:** Use LOA's specialized auditing agents to validate TREMOR across three dimensions:
1. **Codebase health** — Does the code match the architecture?
2. **Security posture** — Are there credential leaks, injection vulnerabilities, etc.?
3. **Empirical grounding** — Are hardcoded parameters justified and validated?

**Recommended approach:**
- **Primary command**: `/auditing-security` (paranoid cypherpunk auditor persona)
- **Supporting command**: `/riding-codebase` (codebase grounding + pattern detection)
- **Domain-specific**: Create a **custom audit skill** to validate earthquake domain assumptions

**Expected output artifacts:**
- `SECURITY-AUDIT-REPORT.md` (LOA native)
- `TREMOR-EMPIRICAL-VALIDATION.md` (custom skill output)
- `tremor-edge-cases.json` (structured findings)

---

## LOA Audit Architecture

### Audit Agents in LOA

| Agent | Specialization | Best For |
|-------|----------------|----------|
| **auditing-security** | OWASP Top 10, cryptography, secrets management, penetration testing | Finding vulnerabilities, compliance gaps, data leaks |
| **riding-codebase** | Pattern extraction, architectural alignment, dead code, duplication | Comparing reality vs. design, spotting inconsistencies |
| **reviewing-code** | Quality assurance, testing, performance, readability | Sprint-level quality gates (less relevant for full audit) |
| **continuous-learning** | Cross-session pattern detection, regression identification | Tracking audit findings across multiple runs |

### Why `/auditing-security` First

**Strengths:**
- 30+ years experience persona (paranoid cypherpunk)
- Systematic checklist (OWASP, secrets, input validation, etc.)
- CRITICAL/HIGH/MEDIUM/LOW severity ratings
- Generates structured `SECURITY-AUDIT-REPORT.md`
- Can be run standalone (doesn't require sprint context)

**Limitations:**
- Focuses on security, not empirical validation
- Won't catch magnitude uncertainty parameter issues
- No domain-specific expertise (seismic data, prediction markets)

### Why `/riding-codebase` Second

**Strengths:**
- Extracts actual codebase facts (not assumptions)
- Grounds analysis in code reality
- Identifies patterns, duplication, dead code
- Can detect "unjustified parameter" anti-patterns
- Outputs to `grimoires/loa/reality/` for persistence

**Limitations:**
- Doesn't validate assumptions against external data
- Not specialized for domain validation

---

## Phase 1: Codebase Analysis (`/ride`)

### Command

```bash
# Inside Claude Code
/ride tremor
```

### What It Does

1. **Scans all source files** under `src/`
2. **Extracts facts** about:
   - Function signatures and exports
   - Class structures
   - Configuration parameters
   - Hard-coded values
   - Dependencies
3. **Generates reality files** to `grimoires/loa/reality/`
4. **Identifies patterns** (repeated logic, suspicious constants)
5. **Outputs to**: `tremor-codebase-reality.md`

### Key Findings to Look For

When LOA rides TREMOR, it should discover:

✅ **What should be highlighted:**
- [ ] All hardcoded parameters (DOUBT_SCALE, REGIME_PARAMS, DISCOUNT_TIERS, etc.)
- [ ] Missing validation (functions that should validate inputs but don't)
- [ ] Unused exports or dead code paths
- [ ] Inconsistent error handling patterns
- [ ] Test coverage gaps (tested vs. untested modules)

⚠️ **What we expect to see:**
- All 8 region profiles in `processor/regions.js`
- 5 Omori regime parameters in `theatres/aftershock.js`
- Settlement tier discount percentages in `processor/settlement.js`
- Doubt price scale mapping in `processor/magnitude.js`

### Custom Prompt for `/ride`

Inside Claude Code, before running `/ride`, create context:

```markdown
# Context for TREMOR Codebase Riding

## System Overview
TREMOR (Threshold Resolution & Earth Movement Oracle) is a seismic intelligence construct.

**Architecture layers:**
- **Oracles** (src/oracles/): USGS, EMSC data ingestion
- **Processor** (src/processor/): Evidence bundle pipeline
  - Quality scoring with regional normalization
  - Magnitude uncertainty ("doubt pricing")
  - Settlement logic (3-tier evidence classes)
  - Bundle construction
- **Theatres** (src/theatres/): 5 prediction market types
- **RLMF** (src/rlmf/): Training data export (Brier scoring)

## Focus Areas for Riding
1. **Hardcoded parameters**: Identify ALL magic numbers and their justifications
2. **Data flow**: Trace evidence bundle from ingestion → theatre → certificate
3. **Error paths**: What happens when USGS feed fails? EMSC offline?
4. **Assumptions**: Every coefficient should trace to a source
5. **Test coverage**: Which modules have >80% coverage? Which <20%?

## Output Format Preference
- Extract to markdown tables when possible
- For each parameter found: [name] | [value] | [file:line] | [justification/TODO]
- Flag parameters with "TODO" or missing citations

When ready, invoke: /ride tremor --focus=parameters,data-flow,test-coverage
```

---

## Phase 2: Security Audit (`/audit-codebase`)

### Command

```bash
# Inside Claude Code
/auditing-security --codebase tremor --depth full
```

### What the Security Auditor Checks

| Category | Focus | Examples |
|----------|-------|----------|
| **Secrets & Credentials** | Hardcoded secrets, API keys, passwords | NASA_API_KEY for DONKI (optional but worth checking) |
| **Authentication & Authorization** | Access control, privilege escalation | Not applicable (TREMOR is standalone, no multi-user) |
| **Input Validation** | Injection attacks, malformed data | USGS GeoJSON parsing — are all fields validated? |
| **Data Privacy** | PII leaks, encryption, redaction | Event data is public; still worth checking |
| **API Security** | Rate limiting, error handling, timeouts | USGS feed polling — any rate limit headers? |
| **OWASP Top 10** | SQL injection, XSS, CSRF, deserialization | Node.js standalone, lower risk, but still check |
| **Cryptography** | Key management, algorithm choices | TREMOR doesn't use crypto, but check ephemeral state |

### Expected Findings

**High confidence (likely to find):**
- ✅ No hardcoded secrets (TREMOR is OSINT-only)
- ✅ No SQL injection (no database)
- ✅ No XSS (CLI tool, not web-facing)

**Medium confidence (might find issues):**
- ⚠️ EMSC cross-validation disabled by default (security feature or oversight?)
- ⚠️ No rate-limit respect on USGS feed polling (acceptable for OSINT, but flag it)
- ⚠️ No mechanism to detect malicious USGS data (trust oracle blindly)

**Low confidence (probably clean):**
- 🛡️ No significant attack surface (Node.js 20+ native only, zero external deps)

### Custom Prompt for Auditor

```markdown
# Security Audit Scope: TREMOR Seismic Intelligence Construct

## System Context
- **Type**: Standalone Node.js CLI tool
- **Data sources**: Public OSINT feeds (USGS, EMSC, IRIS)
- **Architecture**: Oracle → Processor → Theatres → RLMF export
- **No auth, no DB, no web server, zero external npm dependencies**

## Specific Security Questions for Auditor
1. **Data source trust**: Does TREMOR validate USGS GeoJSON structure?
2. **Poll resilience**: What happens if USGS feed returns invalid JSON? DOS attacks?
3. **State persistence**: Position histories are in-memory. Restart = loss. Acceptable?
4. **EMSC optional**: Cross-validation is disabled by default. Is this documented as a security tradeoff?
5. **Late-arriving evidence**: If bundle resolves theatre, then contradictory evidence arrives, what happens?
6. **Timestamp validation**: Are event times validated against system clock? (Could reveal clock skew attacks)
7. **Floating-point precision**: Brier scores use `Math.round()`. Any numerical instability risks?

## Risk Tolerance
- **Acceptable**: Low-probability, high-effort attacks (requires USGS compromise)
- **Not acceptable**: Unvalidated user input, privilege escalation, data corruption
- **Unknown**: Empirical calibration bugs (not security per se, but affects model integrity)

## Output Preference
- Severity ratings (CRITICAL/HIGH/MEDIUM/LOW)
- File paths with line numbers for each issue
- Mitigation steps (code change or docs change)
- Notes on "not a security issue but worth documenting"
```

### Expected Audit Report Structure

LOA will produce `SECURITY-AUDIT-REPORT.md` with sections like:

```markdown
# TREMOR Security Audit Report

## Executive Summary
[Overall risk assessment]

## CRITICAL Issues
[None expected]

## HIGH Issues
- Rate limiting not implemented for USGS polling
  - File: src/oracles/usgs.js:26
  - Mitigation: Add backoff on 503 errors

## MEDIUM Issues
- In-memory state lost on restart
  - File: src/index.js:29–43
  - Context: Acceptable for prototype, document before production

## LOW Issues
- Position history timestamps trust system clock
  - File: src/theatres/mag-gate.js:99
  - Impact: Minimal (clock skew only affects Brier temporal weighting)

## Recommendations
1. Document EMSC cross-validation as optional
2. Add input validation schema for USGS GeoJSON
3. Implement graceful degradation if USGS feed unavailable
4. Add circuit breaker for EMSC cross-validation (optional feature)
5. Log all validation failures for observability
```

---

## Phase 3: Empirical Validation Audit (Custom)

### Problem Statement

LOA's native auditing agents are strong on security but weak on domain validation. TREMOR's core innovation — magnitude uncertainty ("doubt pricing") — is empirical, not cryptographic.

**What's needed:** A custom skill to check:
1. Are hardcoded parameters justified?
2. Where should they come from (literature, data)?
3. What validation would prove they're right?

### Custom Audit Skill: `auditing-empirical`

Since LOA doesn't have a built-in empirical validation agent, we'll create a custom prompt that acts like one:

### Invocation Strategy

**Option A: Use `/audit-sprint` with a custom prompt (recommended)**

Create `grimoires/loa/context/TREMOR-EMPIRICAL-AUDIT.md`:

```markdown
# TREMOR Empirical Validation Audit

## Mission
Validate that all hardcoded parameters in TREMOR have:
1. **Source**: Cited from literature, empirical data, or explicit "TBD"
2. **Range**: Documented justification for the value chosen
3. **Validation test**: How would we know if the value is wrong?

## Components to Audit

### 1. Quality Scoring (processor/quality.js)
**Current parameters:**
```javascript
const region_profiles = {
  'US West Coast': { median_nst: 120, median_gap: 55, median_rms: 0.18 },
  'Japan': { median_nst: 180, median_gap: 25, median_rms: 0.12 },
  // ... 6 more regions
};
const gap_sigmoid = (gap) => Math.exp(-gap / 180);
```

**Questions:**
- [ ] Are the median values actual USGS catalog medians (2000–2026)?
- [ ] Why exponential decay for gap penalty? Any literature support?
- [ ] Why 180 as the denominator? (Max gap in degrees?)

**Validation:**
- Run against 5 years of USGS catalog
- Compute actual medians per region
- Compare with hardcoded values
- Recommend recalibration if >10% error

### 2. Magnitude Uncertainty (processor/magnitude.js)
**Current parameters:**
```javascript
const DOUBT_SCALE = {
  'Mw': 0.08,   // ← Source? USGS? Literature?
  'Ml': 0.35,   // ← 4x worse than Mw. Why?
  'Md': 0.40,   // ← Similar to Ml. Intentional?
  // ... others
};
```

**Questions:**
- [ ] Where do these numbers come from?
- [ ] Do USGS magnitude errors match our doubt prices?
- [ ] Is 95% CI coverage actually 95%?

**Validation:**
- Fetch USGS historical magnitudes with magError field
- Compute 95% CI using our doubt price formula
- Check: % of later-reviewed mags in CI = 95%?
- If not, recalibrate DOUBT_SCALE

### 3. Settlement Discounts (processor/settlement.js)
**Current parameters:**
```javascript
const SETTLEMENT_TIERS = {
  ground_truth: 0,       // Reviewed event
  provisional_mature: 0.10,   // Automatic + stable 2h + cross-validated
  market_freeze: 0.20,   // Theatre expiring + poor data
  never_reviewed: 0.25,  // 7 days no review
};
```

**Questions:**
- [ ] Why exactly 10%, 20%, 25%? What's the justification?
- [ ] How often does "automatic" get reviewed within 2h? 24h? 7d?
- [ ] What's the magnitude change distribution automatic → reviewed?

**Validation:**
- Analyze USGS review latency distribution
- For auto events later reviewed: compute magnitude Δ distribution
- Estimate Brier impact of early resolution vs. waiting
- Recommend discounts based on this analysis

### 4. Aftershock Omori Parameters (theatres/aftershock.js)
**Current parameters:**
```javascript
const REGIME_PARAMS = {
  subduction: { K: 25, c: 0.05, p: 1.05, bath_delta: 1.1 },
  transform:  { K: 15, c: 0.03, p: 1.10, bath_delta: 1.2 },
  intraplate: { K: 8,  c: 0.08, p: 0.95, bath_delta: 1.3 },
  volcanic:   { K: 30, c: 0.02, p: 0.90, bath_delta: 1.0 },
};
```

**Questions:**
- [ ] Source: Aki (1965)? Utsu (1961)? Which paper?
- [ ] Are these global defaults or region-specific?
- [ ] Has TREMOR tested these on real aftershock sequences?

**Validation:**
- Compare with USGS official aftershock documentation
- Test against 10 historical sequences (2010 Chile, 2011 Japan, etc.)
- Compare Omori prediction accuracy
- Recommend fitted parameters per region

## Output Format
For each component:
- **Status**: ✅ Justified | ⚠️ Partially justified | ❌ Unjustified
- **Source**: Citation or "TBD"
- **Recommendation**: Action to validate or update
- **Effort**: (1 day | 1 week | 1 month)

## Overall Recommendation
Rate TREMOR's empirical grounding as:
- **PROVEN** if >80% of parameters validated
- **PROMISING** if 50–80% justified with clear path to full validation
- **PROTOTYPE** if <50% justified (still valuable, but not production-ready)
```

### Invocation

Inside Claude Code:

```bash
# Option 1: Custom riding focused on parameters
/ride tremor --context=tremor-empirical-audit --output=tremor-empirical-findings.md

# Option 2: Create a custom slash command (if LOA is configured for it)
/auditing-empirical tremor

# Option 3: Use /auditing-security with custom prompt (works now)
/auditing-security --codebase tremor --custom-checklist=grimoires/loa/context/TREMOR-EMPIRICAL-AUDIT.md
```

---

## Prompt Engineering Strategy

### Principle 1: Precision over Generality

**Bad prompt:**
```
Audit TREMOR for issues.
```

**Good prompt:**
```
Audit TREMOR's magnitude uncertainty model (processor/magnitude.js).
Specifically:
1. Does DOUBT_SCALE values match USGS official magnitude errors?
2. Are 95% confidence intervals actually correct?
3. Should the formula use Normal CDF or something else?
```

### Principle 2: Context Before Questions

Always provide:
1. **What it is**: "TREMOR is a seismic prediction market framework"
2. **Why it matters**: "Magnitude uncertainty is the core innovation"
3. **What we know**: "DOUBT_SCALE is hardcoded, source unknown"
4. **What we want**: "Validate these parameters empirically"

### Principle 3: Provenance Tags

LOA respects provenance in BUTTERFREEZONE:
- **CODE-FACTUAL**: Extracted from actual code (tier 1 — most trusted)
- **DERIVED**: Inferred from patterns (tier 2 — medium trust)
- **OPERATIONAL**: From config/runtime (tier 3 — least trusted)

For TREMOR audit, mark findings:
```markdown
### Doubt Price Scale (processor/magnitude.js:15–23)
**Provenance**: CODE-FACTUAL
**Finding**: DOUBT_SCALE hardcoded without citation
**Recommendation**: Add comment citing source or mark "TBD"
```

### Principle 4: Actionable Severity Levels

Instead of generic "fix this," use LOA's severity model:

```markdown
## CRITICAL SECURITY
- No secrets found ✅

## HIGH EMPIRICAL GAP
- Magnitude uncertainty model unvalidated
- Recommendation: 1-week empirical validation study
- Blocker for production deployment? YES

## MEDIUM ARCHITECTURAL DEBT
- Settlement discounts arbitrary
- Recommendation: 2-3 day calibration study
- Blocker for production deployment? NO (mitigatable with discounts)

## LOW DOCUMENTATION GAP
- Regional profiles need citations
- Recommendation: Add comments
- Blocker? NO
```

---

## Integration Points & Artifacts

### Artifact Flow

```
TREMOR Codebase
    ↓
[/ride tremor] → tremor-codebase-reality.md (facts)
    ↓
[/auditing-security --codebase tremor] → SECURITY-AUDIT-REPORT.md
    ↓
[/auditing-empirical] → TREMOR-EMPIRICAL-VALIDATION.md (custom)
    ↓
[/translating-for-executives] → TREMOR-AUDIT-EXECUTIVE-BRIEF.md (1-3 pages)
    ↓
grimoires/loa/audit-results/ (all findings consolidated)
```

### Key Artifacts LOA Will Generate

1. **`tremor-codebase-reality.md`**
   - All functions, exports, hardcoded values
   - Pattern analysis (repeated code, dead code)
   - Test coverage by module

2. **`SECURITY-AUDIT-REPORT.md`**
   - CRITICAL/HIGH/MEDIUM/LOW issues
   - OWASP mapping
   - Mitigation steps

3. **`TREMOR-EMPIRICAL-VALIDATION.md`** (custom)
   - Parameter justification matrix
   - Validation gaps
   - Recommended studies

4. **`tremor-edge-cases.json`** (structured)
   ```json
   {
     "edge_cases": [
       {
         "category": "latent_evidence",
         "description": "Theatre resolves, later contradictory evidence arrives",
         "severity": "MEDIUM",
         "recommendation": "Document how late-arriving evidence is handled"
       },
       {
         "category": "feed_failure",
         "description": "USGS feed returns invalid JSON",
         "severity": "HIGH",
         "recommendation": "Add JSON schema validation"
       }
     ]
   }
   ```

---

## Edge Cases LOA Will Find

### Category 1: Data Flow Gaps

**Edge case: Late-arriving contradictory evidence**
- **Scenario**: Theatre resolves YES (ground truth), then USGS updates with lower magnitude
- **Current behavior**: Can't flip outcome (theatre already resolved)
- **LOA finding**: "Unhandled contradictory evidence path"
- **Recommendation**: Document this as acceptable risk or implement retraction logic

**Edge case: USGS feed timeout**
- **Scenario**: Polling hangs for 60s, event is missed
- **Current behavior**: Poll retries after interval, but event might expire
- **LOA finding**: "No timeout enforcement on fetch()"
- **Recommendation**: Add explicit timeout (e.g., 10s)

**Edge case: Malformed GeoJSON from USGS**
- **Scenario**: USGS returns event with missing properties (no magnitude, no depth)
- **Current behavior**: `buildBundle()` returns null (filtered out)
- **LOA finding**: "Silent failure — no logging of why bundle was skipped"
- **Recommendation**: Add structured logging

### Category 2: Empirical Assumption Gaps

**Edge case: Region profile misclassification**
- **Scenario**: Event in Indonesia (should be "Ring of Fire") classified as "Global Default"
- **Current behavior**: Uses sparse network baseline, inflates quality penalty
- **LOA finding**: "Region detection is heuristic geospatial bounds, not authoritative"
- **Recommendation**: Cross-check with GCMT tectonic region dataset

**Edge case: Magnitude type uncertainty not handled**
- **Scenario**: Event reported as Md (distance magnitude), then reviewed as Mw (moment magnitude)
- **Current behavior**: DOUBT_SCALE treats Md as lower confidence, but doesn't account for type change
- **LOA finding**: "No magnitude type validation; assumes same magType across revisions"
- **Recommendation**: Track magType changes and adjust CI accordingly

**Edge case: Aftershock Omori model overfits**
- **Scenario**: Small mainshock M5.8, but Omori prior predicts 8+ aftershocks (actual: 0)
- **Current behavior**: Position converges to observed count (0), Brier is good
- **LOA finding**: "Omori parameters not validated against real sequences"
- **Recommendation**: Backtest against 20+ historical sequences

### Category 3: State Management Issues

**Edge case: Restart loses all position history**
- **Scenario**: TREMOR crashes, restarts, all theatres reset to base rate
- **Current behavior**: `processedEvents` is re-empty, could replay events
- **LOA finding**: "No persistent state; position history lost"
- **Recommendation**: Write grimoire to disk periodically, reload on startup

**Edge case: Concurrent theatre updates**
- **Scenario**: If TREMOR ever becomes async/parallel, two bundles update same theatre
- **Current behavior**: Currently single-threaded, safe
- **LOA finding**: "No locking mechanism; race condition risk if parallelized"
- **Recommendation**: Add comment documenting single-threaded assumption

### Category 4: Calibration Feedback Gaps

**Edge case: Brier scores consistently > 0.5**
- **Scenario**: After 100 certificates, average Brier is 0.6 (worse than random guessing)
- **Current behavior**: No feedback loop; no indication this is bad
- **LOA finding**: "No mechanism to detect systematic miscalibration"
- **Recommendation**: Add health check: log warning if mean Brier > 0.4

**Edge case: Doubt prices don't predict revision divergence**
- **Scenario**: Events with high doubt_price aren't more likely to be revised
- **Current behavior**: Doubt price is used anyway in position updates
- **LOA finding**: "Doubt pricing assumption is untested"
- **Recommendation**: Validate that doubt_price correlates with actual uncertainty

---

## Recommendations by Category

### 🔴 Blocker for Production

**Must fix before deploying:**

1. **Magnitude uncertainty unvalidated**
   - Effort: 1 week
   - Action: Backtest against 5-year USGS catalog
   - Success criteria: 95% CI coverage actually 95%

2. **Input validation missing**
   - Effort: 2 days
   - Action: Add JSON schema for GeoJSON
   - Success criteria: Reject malformed events with clear error

3. **Empirical calibration unknown**
   - Effort: 4 weeks (production pilot)
   - Action: Run alongside baseline model
   - Success criteria: TREMOR Brier < baseline for 30 days

### 🟠 Recommended Before Sharing with Peers

**Should fix before "this is a model others should use":**

1. **Document all hardcoded parameters**
   - Effort: 3 days
   - Action: Add comments citing source or "TBD"
   - Files: processor/*, theatres/*

2. **Justify settlement discount percentages**
   - Effort: 3 days
   - Action: Analyze USGS review latency, compute empirically
   - Success criteria: Each % has a data-backed justification

3. **Validate Omori parameters**
   - Effort: 1 week
   - Action: Backtest against 10 historical sequences
   - Success criteria: Omori predictions within 20% of actual counts

### 🟡 Nice to Have

**Would improve but not blockers:**

1. **Persistent state (checkpoint/restore)**
   - Effort: 3 days
   - Benefit: No data loss on restart

2. **Structured logging (JSON, not console.log)**
   - Effort: 2 days
   - Benefit: Easier observability

3. **Metrics export (Prometheus)**
   - Effort: 2 days
   - Benefit: Can monitor Brier trends in production

4. **EMSC cross-validation enabled by default**
   - Effort: 1 day
   - Benefit: Higher confidence in provisional-mature evidence

---

## Post-Audit Workflow

### Step 1: Generate Audit Artifacts

```bash
# Inside Claude Code

# Run full audit
/ride tremor --focus=parameters,data-flow
/auditing-security --codebase tremor --depth full
/auditing-empirical tremor  # (custom, if available)

# Consolidate findings
# (LOA will create grimoires/loa/audit-results/)
```

### Step 2: Create Consolidated Report

```bash
# Use /translating-for-executives to create executive summary
/translating-for-executives --for=peer --source=audit-results

# Output: TREMOR-AUDIT-EXECUTIVE-BRIEF.md (1-3 pages)
```

### Step 3: Track Recommendations

Use LOA's sprint ledger to convert audit findings → actionable tasks:

```bash
/sprint-plan --from-audit tremor

# Creates grimoires/loa/sprint.md with:
# - Sprint 1: Magnitude uncertainty validation (1 week)
# - Sprint 2: Settlement discount calibration (3 days)
# - Sprint 3: Omori parameter validation (1 week)
# - Sprint 4: Production pilot (4 weeks)
```

### Step 4: Implement Fixes

```bash
/implement sprint-1  # Start validation work
```

### Step 5: Verify via Re-Audit

After changes:

```bash
/ride tremor --fresh  # Force re-analyze codebase
/auditing-security --codebase tremor  # Verify fixes
```

---

## Summary: LOA Command Sequence

### Quick Audit (1 hour)

```
/ride tremor
/auditing-security --codebase tremor --depth quick
```

**Outputs:**
- What's in the codebase
- Any obvious security issues
- First-pass edge case detection

### Full Audit (4 hours)

```
/ride tremor --focus=parameters,data-flow,test-coverage
/auditing-security --codebase tremor --depth full
# (Custom empirical audit via prompt in grimoires/loa/context/)
/translating-for-executives --for=peer
```

**Outputs:**
- Complete codebase reality
- Security findings (CRITICAL/HIGH/MEDIUM/LOW)
- Empirical validation gaps
- Executive brief for peer

### Production-Grade Audit (2 weeks)

```
# Run the 4-hour audit first
# Then:

# 1. Create sprint plan
/sprint-plan --from-audit

# 2. Implement validation studies
/implement sprint-1  # Magnitude uncertainty
/implement sprint-2  # Settlement calibration
/implement sprint-3  # Omori validation

# 3. Re-audit after fixes
/ride tremor --fresh
/auditing-security --codebase tremor

# 4. Deploy production pilot
/deploy-production
```

---

## Why This Matters

**For you:** This audit tells you exactly what's proven, what's assumed, and what needs to be tested before TREMOR can be a "model others should use."

**For your peer:** They get transparency: "Here's what's solid (architecture, zero deps), here's what's unproven (magnitude uncertainty), here's the roadmap to prove it."

**For LOA:** This demonstrates how to audit a domain-specific system (seismic prediction markets) using LOA's security + codebase agents + custom domain expertise.

---

## Quick Reference: LOA Commands for TREMOR

| Phase | Command | Output |
|-------|---------|--------|
| **Analysis** | `/ride tremor` | `tremor-codebase-reality.md` |
| **Security** | `/auditing-security --codebase tremor` | `SECURITY-AUDIT-REPORT.md` |
| **Domain** | `/riding-codebase --context=tremor-empirical-audit` | `tremor-empirical-findings.md` |
| **Summary** | `/translating-for-executives --for=peer` | `TREMOR-AUDIT-BRIEF.md` |
| **Planning** | `/sprint-plan --from-audit tremor` | `grimoires/loa/sprint.md` |
| **Implementation** | `/implement sprint-1` | Code + tests |
| **Verification** | `/audit-sprint sprint-1` | Security approval |

---

## Appendix: Custom Audit Skill Template

If you want to create a **permanent LOA skill** for empirical auditing:

```markdown
# File: .claude/skills/auditing-empirical/SKILL.md

# Empirical Auditor

## Role
You are an Empirical Validation Auditor with 15 years of scientific computing experience.

## Specialization
- Validating hardcoded parameters against literature and data
- Identifying unjustified assumptions in quantitative models
- Recommending empirical studies to prove or disprove core assumptions

## Key Questions for Any Model
1. **Source**: Where does this number come from?
2. **Range**: Why this value and not ±10%?
3. **Validation**: How would we know if it's wrong?
4. **Sensitivity**: How much does output change if we tweak it ±5%?

## Output Format
- Parameter matrix (name | value | source | validation status)
- Gap analysis (% of parameters with clear justification)
- Recommended empirical studies with effort estimates
- Overall grounding score (0–100%)
```

---

**Next step:** Copy this guide into Claude Code as context, then run `/ride tremor` to begin the audit.

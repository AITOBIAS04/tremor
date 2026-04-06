# Consistency Analysis

Naming patterns, conventions, and architecture alignment
Generated: 2026-04-05

## Consistency Score: 9/10 (EXCELLENT)

The codebase exhibits strong consistent naming, module organization, and architectural intent throughout.

## Naming Patterns

Module Organization:
- Oracle modules (usgs.js, emsc.js): Consistent oracle-specific logic
- Processor modules (bundles, quality, magnitude, settlement, regions): Data transformation pipeline
- Theatre modules (mag-gate, aftershock, swarm, depth, paradox): Market template per file
- RLMF module (certificates.js): Certificate export logic
- Skill profile (seismic.md): Domain-specific specialization

Function Naming:
- Create functions: createMagnitudeGate(), createAftershockCascade() - consistent create*()
- Process functions: processMagnitudeGate(), processAftershockCascade() - consistent process*()
- Export functions: exportCertificate(), pollAndIngest() - action-verb-first
- Compute/Build: computeQuality(), buildMagnitudeUncertainty(), buildBundle()
- Resolve/Expire: resolveOracleDivergence(), expireMagnitudeGate()

## Theatre Template Consistency

Each theatre follows: create*() → [process*() repeatedly] → [expire*() or resolve*()]

All theatres maintain consistent lifecycle with position_history tracking.

## Data Structure Consistency

Evidence Bundle Schema (consistent across all sources):
- bundle_id, construct, source, ingestion_ts, evidence_class
- payload: event_id, magnitude, location, event_time, quality
- theatre_refs, resolution metadata

Theatre State Schema (consistent across all templates):
- id, template, question, state, outcome, timestamps
- position_history array with {t, p, evidence, reason}
- current_position tracking

## API Surface Consistency

TremorConstruct methods:
- Lifecycle: start(), stop()
- Theatre management: openMagnitudeGate(), getActiveTheatres()
- Polling: poll()
- State inspection: getState(), getCertificates()

Sub-modules export pure functions with consistent patterns.

## Configuration Consistency

Constructor parameters use object destructuring with sensible defaults.
Theatre creation follows consistent parameter naming pattern.
Quality scoring always uses 0-1 composite with explainability.

## Potential Minor Improvements

1. resolve vs expire terminology: Currently intentional (expire=timeout, resolve=evidence-driven)
2. Position history rationale: Currently string-based, which is clear
3. Evidence classification ordering: Current scheme (ground_truth → degraded) is intuitive

## Summary

Overall Consistency Score: 9/10

This is a very clean, consistent codebase. Naming conventions are predictable. Architecture is obvious to new readers. No breaking changes needed.


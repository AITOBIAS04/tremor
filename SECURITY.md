# Security Policy

## Scope

TREMOR is a zero-external-dependency CLI construct for seismic intelligence.
It runs on Node.js 20+ using only built-in modules (`fetch`, `node:test`,
`node:crypto`, etc.) and has no runtime `package.json` dependencies.

The attack surface is intentionally minimal:

- **Network**: outbound HTTPS only, to public USGS and EMSC GeoJSON endpoints.
  No inbound listeners, no authentication tokens, no API keys.
- **Filesystem**: reads source code and writes RLMF certificates/evidence
  bundles to paths supplied by the caller.
- **No daemon, no server, no IPC surface.**

In-scope concerns:

- Input validation on remote GeoJSON payloads (malformed/adversarial upstream).
- Integer/float handling in magnitude, quality, and settlement math.
- Silent corruption of evidence bundles, RLMF certificates, or Theatre state.
- Supply-chain exposure via accidentally introduced runtime dependencies.

Out of scope:

- Denial of service against upstream oracles (USGS, EMSC) — those are public
  services operated by third parties.
- Threats that assume a privileged local attacker (they already have the
  codebase).

## Reporting a Vulnerability

Please report security issues privately. Do **not** open a public GitHub issue.

**Disclosure channel**: open a private security advisory via GitHub
(`Security` tab → `Report a vulnerability`) on this repository.

Include:

- Affected file(s) and line number(s).
- Steps to reproduce or a proof-of-concept.
- Impact assessment (what bad outcome the bug enables).
- Suggested fix if you have one.

## Response Timeline

| Stage | Target |
|-------|--------|
| Acknowledgment of report | 3 business days |
| Initial triage and severity assessment | 7 business days |
| Fix or mitigation for HIGH/CRITICAL issues | 30 days |
| Fix or mitigation for MEDIUM/LOW issues | next minor release |
| Public disclosure | after fix ships, coordinated with reporter |

We will credit reporters in the release notes unless they request otherwise.

## Supported Versions

Only the latest minor release receives security fixes. v0.1.x is the current
supported line.

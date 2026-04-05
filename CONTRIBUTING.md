# Contributing to TREMOR

Thanks for your interest. TREMOR is a deliberately small, zero-dependency
construct. The contribution bar is shaped by that constraint.

## Hard Constraints

These are non-negotiable. PRs that violate them will be closed.

1. **Zero new runtime dependencies.** TREMOR has no `dependencies` or
   `devDependencies` in `package.json` and will not gain any. If you need
   functionality that seems to require a library, first check whether a
   Node.js 20+ built-in covers it (`fetch`, `node:test`, `node:crypto`,
   `node:worker_threads`, etc.). If none do, open an issue to discuss the
   design before writing code.
2. **Full test suite must pass.** Run `node --test test/**/*.test.js` before
   submitting. Every PR must leave the suite green on Node.js 20.x and 22.x.
3. **New behavior requires new tests.** If you add a code path, add
   assertions that would fail without your change.
4. **No silent corruption.** If a function can produce a wrong answer on
   invalid input, it must throw, return `null`/sentinel, or be documented as
   a precondition. Never return a plausible-looking wrong number.

## Filing a Bug

Open a GitHub issue with:

- **Observed behavior**: what happened, including exact command and output.
- **Expected behavior**: what should have happened and why.
- **Reproduction**: minimal steps. Include Node version (`node --version`) and
  OS.
- **Scope**: which file(s) and function(s) you think are involved, if known.

Do not file bugs for "empirical calibration needed" markers — those are
tracked separately on the roadmap. They become bugs only when a specific
calibration produces an incorrect result on real data.

## Proposing a Feature

Open a GitHub issue labeled `proposal` **before** writing code. The proposal
should cover:

- **Problem**: what can't be done today that should be.
- **Design sketch**: which files would change and roughly how.
- **Dependency check**: confirmation that no new runtime dependencies are
  needed. If they are, explain why a built-in doesn't work.
- **Test plan**: what new assertions prove the feature works.
- **Roadmap alignment**: whether this belongs in v0.2, v0.3, or later — see
  `ROADMAP.md`.

Feature work that bypasses this step and lands as a surprise PR will be
asked to start over as an issue.

## Development Workflow

```bash
# Run the full suite
node --test test/**/*.test.js

# Lint (when introducing lint config)
npx eslint src/
```

No build step. No transpilation. No bundler. If you find yourself wanting
one, you are probably about to violate constraint #1.

## Code Style

- Match the surrounding code. ES modules, named exports, no default exports
  unless there is exactly one thing to export.
- Comments explain *why*, not *what*. The code already says what.
- When a constant is an engineering heuristic pending calibration, mark it
  `TBD: empirical calibration needed` with a one-line reason.

## License

By contributing, you agree your contributions will be licensed under the
same license as the project (AGPL-3.0).

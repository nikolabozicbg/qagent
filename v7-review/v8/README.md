# V8 Review Notes (Runtime Observation Layer)
V8 is a separate layer above V7.
V8 MUST NOT modify or reinterpret V7.

V7 = truth from code (deterministic static graph + derived goals)
V8 = truth from execution (deterministic runtime observation)

## V8 Scope (MVP)
- No static analysis
- No heuristics over source
- No application assumptions
- V8 operates ONLY on V7 derivedUserGoals + runtime signals

## V8 Input
V8 consumes a JSON file containing `derivedUserGoals` (typically `v7-review/artifacts/v7-ecommerce-goals.json`).
V8 does not consume source code.

## V8 Output
V8 produces:
- `verifiedGoals[]` with `observedEffects` (navigation/network/storage/ui)
- `unverifiedGoals[]` with `reason`

No naming/domains/suites/cases are produced by V8.

## How to reproduce (one goal → one execution → one report)
Prereqs:
- A running app (dev server or preview) reachable at `--baseUrl`
- A goal id to execute (from `v7-review/artifacts/v7-ecommerce-goals.json`)
- A deterministic execution mapping JSON (because V8 does not infer selectors)

Build:
- `npm --prefix packages/v8-runtime install`
- `npm --prefix packages/v8-runtime run build`

Run (example):
- `node packages/v8-runtime/dist/cli.js --baseUrl http://localhost:3000 --goals v7-review/artifacts/v7-ecommerce-goals.json --goalId goal:ua:634c1f8f --mapping v7-review/v8/execution-mapping.example.json --out v7-review/v8/v8-report.example.json`

Notes:
- If no mapping is provided for the goal's `startUserActionId`, the goal is returned as unverified with reason `NO_EXECUTION_MAPPING`.
- V8 does not attempt to discover UI selectors.

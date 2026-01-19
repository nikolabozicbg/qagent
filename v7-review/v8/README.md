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

## From VERIFIED goal to Test Case (Promotion Layer)
Promotion happens ONLY when:
- there is a V7 derived user goal
- there is a matching V8 verified goal with at least one concrete observed effect
- there is an explicit execution mapping for the goal's `startUserActionId`

Promotion is FORBIDDEN when:
- the goal is unverified
- there are zero observed effects
- there is no execution mapping

Unverified goals:
- remain unverified
- are not promoted
- do not invoke AI

Implementation:
- Pure functional promotion (no UI, no Playwright): `packages/v8-promotion/src/promote.ts`
- Function: `promoteVerifiedGoal()`

Output:
- One serializable `ExecutableTestCase`:
  - name: derived deterministically from observed effects (no AI)
  - steps: derived from explicit execution mapping
  - assertions: derived only from observed effects
  - provenance: goal + report source + signals used

## How to reproduce (batch goal execution → v8-report.batch.json → UI-ready suites)
Prereqs:
- A running app (dev server or preview) reachable at `--baseUrl`
- V7 derived goals file (e.g. `v7-review/artifacts/v7-ecommerce-goals.json`)
- A batch execution mapping JSON (explicit selectors; no discovery)

## Example: VERIFIED goal → Executable Test Case (JSON)
See `v8/promotion-example.testcase.json`.

## Where Electron UI displays this (read-only)
Electron UI must only read and display the promoted `ExecutableTestCase` JSON and/or the grouped `ui-ready.suites.json` output.

## Auto-Execution (no manual mapping)
Electron Desktop adds an auto-execution layer (above V7, using V8 runtime) that:
- calls `POST /analyze/v7/goals` to obtain deterministic `derivedUserGoals`
- auto-builds a V8 batch mapping deterministically by inspecting the DOM on each goal's startPath
- uses ordered fallback (href → button text → data-testid → form submit)
- discards goals that cannot be mapped deterministically
- runs V8 batch per startPath and merges UI-ready outputs
- UI shows only VERIFIED suites
UI MUST NOT:
- infer selectors
- invent steps
- change assertions
- run AI

Build:
- `npm --prefix packages/v8-runtime install`
- `npm --prefix packages/v8-runtime run build`

Run (batch example):
- `node packages/v8-runtime/dist/cli.js --baseUrl http://localhost:3000 --goals v7-review/artifacts/v7-ecommerce-goals.json --mapping v7-review/v8/batch-execution-mapping.example.json --reportOut v7-review/v8/v8-report.batch.json --out v7-review/v8/ui-ready.suites.json`

Outputs:
- `v8-report.batch.json` contains verifiedGoals[] / unverifiedGoals[]
- `ui-ready.suites.json` contains suites[] grouped deterministically:
  - `NAV_TO:<toUrl>`
  - fallback `UNCLUSTERED`

Notes:
- If mapping is missing for a goal's startUserActionId, that goal is unverified (`NO_EXECUTION_MAPPING`).
- No retries, no smart waits, no implicit setup steps.
- Each goal executes in an isolated browser context.
- V8 does not attempt to discover UI selectors.

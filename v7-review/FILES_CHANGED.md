# Files changed / added for V7
This file is a quick index of the V7-related code that was added/modified, to make review faster.

Note:
- A full patch (when available) is in `v7-review/patches/working-tree.diff`.
- Code snapshots of relevant files are copied into this `v7-review/` folder.

## Backend (new)
### Behavior Graph contract (new)
- Added: `apps/backend/src/modules/analysis/types/behavior-graph.types.ts`
  - Fixed universal Behavior Graph model (node/edge types) + invariants types.

### Deterministic processor (new)
- Added: `apps/backend/src/modules/analysis/v7-behavior-graph/validator.ts`
  - Validates payload invariants (no AI).
- Added: `apps/backend/src/modules/analysis/v7-behavior-graph/normalizer.ts`
  - Dedupes + canonicalizes routes (no AI).
- Added: `apps/backend/src/modules/analysis/v7-behavior-graph/goal-extractor.ts`
  - Deterministic goal extraction (UserAction → Navigation/StateMutation), propagates UNKNOWN when not provable.
- Added: `apps/backend/src/modules/analysis/v7-behavior-graph/index.ts`
  - Orchestrates validate → normalize → goal-extract.

### AI semantic layer (strictly limited) (new)
- Added: `apps/backend/src/modules/analysis/intelligence/v7-semantic/semantic-summarizer.ts`
  - Exact strict system prompt; converts graph+goals → semantic suites; validates output shape.
- Added: `apps/backend/src/modules/analysis/intelligence/v7-semantic/llm-client.ts`
  - V7-local LLM client wrapper (keeps V7 separated from v2–v6 discovery code).

## Backend (modified)
- Modified: `apps/backend/src/modules/analysis/cloud-discovery.service.ts`
  - V7 correctness fixes:
    - skip AI when there are zero deterministic goals
    - return V7-specific response schema (no legacy V6 fields)
    - include explicit `reason: "NO_DETERMINISTIC_USER_GOALS"` when applicable
- Modified: `apps/backend/src/modules/analysis/intelligence/v7-semantic/semantic-summarizer.ts`
  - AI operates ONLY on `derivedUserGoals` (no graph/project context)
  - stricter prompt + output validation to prevent invented domains/actions/outcomes
- Modified: `apps/backend/src/modules/analysis/analysis.controller.ts`
  - V7 route still supported; return type loosened to allow V7-specific schema

## Electron (new)
- Added: `apps/desktop/electron/behavior-graph/scanner.ts`
  - Deterministic V7 behavior graph scanner (AST-only).

## Electron (modified) – Iteration 2
- Modified: `apps/desktop/electron/behavior-graph/scanner.ts`
  - Scanner signal expansion (still AST-only + application-agnostic):
    - UserAction → Navigation (router.push/replace, redirect) when destination is a string literal
    - UserAction → ApiCall (fetch/axios/client) when endpoint is a string literal and the identifier is explicitly imported
    - Conditional → Navigation (if/ternary redirect) when destination is a string literal
    - Omits edges when multiple distinct literal outcomes exist (propagates UNKNOWN downstream)

## Electron (modified)
- Modified: `apps/desktop/electron/main.ts`
  - Added IPC handler `project:scan-v7`.
- Modified: `apps/desktop/electron/preload.ts`
  - Exposed `scanProjectV7()` to renderer.

## Desktop / Renderer (modified)
- Modified: `apps/desktop/src/services/api.ts`
  - Added support for `version='v7'` and `discoverSuitesCloudV7()`.
- Modified: `apps/desktop/src/screens/SmartDiscovery.tsx`
  - Default discovery version changed to `v7`.
  - Routed calls to `discoverSuitesCloudV7()` when version=v7.

## Sample outputs included in this folder (Iteration 2)
- Added: `v7-review/sample-output/behavior-graph.after.json`
- Added: `v7-review/sample-output/goals.after.json`
- Added: `v7-review/sample-output/ai-output.after.json`

## V8 (new)
- Added: `packages/v8-runtime/*`
  - V8 runtime executor/observer (Playwright-based), strictly above V7.
  - Consumes only derivedUserGoals + runtime signals; no source analysis.
  - Produces V8 report: verifiedGoals[] / unverifiedGoals[] (no semantic naming).

## V8 Promotion Layer (new)
- Added: `packages/v8-promotion/*`
  - Pure functional promotion from a VERIFIED V8 goal into one serializable ExecutableTestCase.
  - No UI logic, no Playwright code, no AI.
  - Assertions come ONLY from observedEffects.

## V8 review bundle (new)
- Added: `v7-review/v8/*`
  - Minimal docs + example mapping/report for independent review.

## Discover Auto-Execution Layer (new)
This is the minimal integration that makes Desktop Discover a single entry point and returns VERIFIED suites only, without any manual mapping/config.

### Backend (modified)
- Modified: `apps/backend/src/modules/analysis/analysis.controller.ts`
  - Added: `POST /analyze/v7/goals`
    - Read-only endpoint that returns `{ payload, derivedUserGoals }` by calling the existing deterministic V7 processor.
    - No changes to V7 graph, goal extraction, or V7 semantic discovery.

### Electron (modified/new)
- Modified: `apps/desktop/electron/main.ts`
  - Added IPC: `v8:run-batch-auto`
    - Auto-generates a V8 batch mapping deterministically using DOM inspection and ordered fallbacks.
    - Executes V8 CLI per `startPath` and merges UI-ready outputs deterministically.
- Modified: `apps/desktop/electron/preload.ts`
  - Exposed `runV8BatchAuto()` to renderer.
- Added: `apps/desktop/electron/v8-auto-mapping.ts`
  - Deterministic mapping generator:
    - ordered fallback: href → button text → data-testid → form submit
    - discard goal if selector cannot be resolved deterministically.

### Desktop / Renderer (modified/new)
- Modified: `apps/desktop/src/screens/SmartDiscovery.tsx`
  - Discover is now a single entry point:
    - runs V7 scan
    - calls backend `/analyze/v7/goals`
    - runs V8 auto-execution via IPC
    - renders ONLY VERIFIED suites (ui-ready output)
  - Removed manual mapping selection and any version selection.
  - If `suites[]` is empty: UI shows "No verified goals. Check execution mapping or runtime errors."
- Modified: `apps/desktop/src/services/api.ts`
  - Added: `getV7GoalsFromBehaviorGraph(payload)` (calls `/analyze/v7/goals`).
- Added: `apps/desktop/src/types/v8-ui.types.ts`
  - Render-only types for ui-ready output.
- Added: `apps/desktop/src/electron-api.d.ts`
  - Renderer typing shim for `window.electronAPI`.

## Review snapshots included in this folder
- Backend snapshots under `v7-review/backend/`
- Electron snapshots under `v7-review/electron/`
- Desktop snapshots under `v7-review/desktop/`
- Patch under `v7-review/patches/`

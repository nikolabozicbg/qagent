# V7 Review Bundle
This folder contains the complete V7 (Behavior-Driven) review bundle: code snapshots, a patch, and documentation sufficient for independent verification.

## What changed (high-level)
V7 is a new discovery implementation that is conceptually and architecturally separated from v2–v6.

V7 pipeline:
1) Electron builds a deterministic Behavior Graph (AST + minimal control-flow MVP)
2) Backend validates + normalizes the graph (NO AI)
3) Backend deterministically extracts user goals (NO AI)
4) AI is used ONLY as a semantic naming/grouping layer over VERIFIED behavior

V6 remains legacy/fallback.

## Where the V7 artifacts are
### Backend
- Behavior Graph model (source of truth)
  - `backend/behavior-graph.types.ts`
- Deterministic processor (no AI)
  - `backend/v7-behavior-graph/validator.ts`
  - `backend/v7-behavior-graph/normalizer.ts`
  - `backend/v7-behavior-graph/goal-extractor.ts`
  - `backend/v7-behavior-graph/index.ts`
- AI semantic layer (strictly limited)
  - `backend/v7-semantic/semantic-summarizer.ts`
  - `backend/v7-semantic/llm-client.ts`
- Integration points snapshot
  - `backend/cloud-discovery.service.ts`
  - `backend/analysis.controller.ts`

### Electron / Desktop
- Electron V7 behavior graph scanner
  - `electron/behavior-graph/scanner.ts`
- IPC integration snapshot
  - `electron/main.ts` (adds `project:scan-v7`)
  - `electron/preload.ts` (exposes `scanProjectV7`)
- Desktop client integration snapshot
  - `desktop/api.ts` (supports `v7` + `discoverSuitesCloudV7`)
  - `desktop/SmartDiscovery.tsx` (default version = `v7`)

### Patch
- `patches/working-tree.diff` contains the current git diff for all local changes.

## V7 Behavior Graph model (fixed universal model)
### Node types
- Page
- UserAction
- Form
- ApiCall
- StateMutation
- Navigation
- Conditional

### Edge types
- triggers
- depends_on
- results_in
- blocks
- redirects_to

### Invariants (backend validator)
- payload.version MUST be `v7`
- node ids MUST be unique
- edge ids MUST be unique
- edges MUST reference existing node ids
- Page.route is required
- UserAction.actionType is required
- Form.fields is required array

If something cannot be proven deterministically by the Electron scanner:
- omit the edge, and/or
- propagate UNKNOWN downstream
AI must not complete UNKNOWN.

## API contract (transport)
V7 uses the existing endpoint:
- `POST /analyze/discover?version=v7`

Request body MUST be `BehaviorGraphPayload`.
See `backend/behavior-graph.types.ts` for the canonical contract.

## Electron Scanner (MVP scope)
Deterministically emits:
- Page nodes from Next.js file routing (app router + pages router)
- Form nodes from JSX <form>
- UserAction nodes from onSubmit/onClick handlers
- Navigation nodes from Next.js <Link href="..."> when href is a string literal

Deliberately not emitted unless provable deterministically:
- StateMutation nodes/edges (still omitted)

### Iteration 2 – Scanner Signal Expansion (AST-only, universal)
This iteration updates ONLY the Electron V7 scanner to emit additional generic framework-level signals.

### V7 Correctness Blocker Fix – No AI without deterministic goals
Backend behavior was tightened to enforce V7 invariants:
- If there are ZERO deterministic derived user goals (all terminalNodeId = "UNKNOWN"), backend MUST:
  - return `suites: []`
  - skip AI invocation entirely
  - return `reason: "NO_DETERMINISTIC_USER_GOALS"`
- V7 endpoint response is now a V7-specific schema (no legacy V6 fields like priority/selector/value/estimatedDuration).
- AI semantic layer input is restricted to `derivedUserGoals` only, and output is validated to prevent invented domains/actions/outcomes.

Rules:
- AST-only; no runtime execution; no domain assumptions.
- Emit edges ONLY when the destination/endpoint is a string literal.
- If a handler/conditional yields multiple distinct literal outcomes, omit the edge (propagate UNKNOWN downstream).

New deterministic signals:
A) UserAction → Navigation
- Detect within event handlers:
  - useRouter().push('<literal>') / useRouter().replace('<literal>')
  - redirect('<literal>')
- Emit: UserAction results_in Navigation

B) UserAction → ApiCall
- Detect within event handlers:
  - fetch('<literal>', { method: '...' })
  - axios.<method>('<literal>') ONLY when axios is explicitly imported
  - client.<method>('<literal>') ONLY when client identifier is explicitly imported
- Emit: UserAction triggers ApiCall

C) Conditional → Navigation
- Detect conditional redirects with string literal targets:
  - if (...) redirect('<literal>')
  - ternary expressions that evaluate to redirect('<literal>')
- Emit:
  - Conditional blocks Page or UserAction (depending on where detected)
  - Conditional redirects_to Navigation

### Sample outputs
Iteration 2 artifacts are committed into this bundle under:
- `sample-output/behavior-graph.after.json`
- `sample-output/goals.after.json`
- `sample-output/ai-output.after.json`

### Verification artifacts (ecommerce scan)
Latest verification run artifacts are stored under:
- `artifacts/v7-ecommerce-graph.json` (raw BehaviorGraphPayload)
- `artifacts/v7-ecommerce-goals.json` (deterministic processor output)
- `artifacts/v7-ecommerce-response.json` (final v7 endpoint response)
- `artifacts/v7-ecommerce-verification.json` (summary + top chains + delta + skip/ambiguity counts)

### How to reproduce (commands)
1) Compile the Electron V7 scanner to runnable JS:
- `npx tsc apps/desktop/electron/behavior-graph/scanner.ts --outDir /tmp/qagent-v7-scan --module commonjs --target es2020 --esModuleInterop --skipLibCheck`
2) Run scan on the ecommerce client repo and write graph artifact:
- `NODE_PATH=/Users/nikolabozic/Projects/qagent/node_modules node -e "const fs=require('fs'); const {scanProjectV7}=require('/tmp/qagent-v7-scan/scanner'); (async()=>{ const payload=await scanProjectV7('/Users/nikolabozic/Projects/ecommerce/src/client'); fs.writeFileSync('v7-review/artifacts/v7-ecommerce-graph.json', JSON.stringify(payload,null,2)); })();"`
3) Run deterministic backend processor to extract derivedUserGoals:
- `node -e "const fs=require('fs'); const payload=JSON.parse(fs.readFileSync('v7-review/artifacts/v7-ecommerce-graph.json','utf8')); const { processBehaviorGraph }=require('./apps/backend/dist/modules/analysis/v7-behavior-graph'); const out=processBehaviorGraph(payload); fs.writeFileSync('v7-review/artifacts/v7-ecommerce-goals.json', JSON.stringify(out,null,2));"`
4) Call backend v7 endpoint and save response:
- `curl -s -X POST \"http://localhost:3001/analyze/discover?version=v7\" -H \"Content-Type: application/json\" --data-binary @v7-review/artifacts/v7-ecommerce-graph.json > v7-review/artifacts/v7-ecommerce-response.json`

## Backend deterministic processing
1) Validate payload (`validator.ts`)
2) Normalize (dedupe + canonicalize routes) (`normalizer.ts`)
3) Extract user goals (`goal-extractor.ts`)
- A user goal starts at UserAction and ends at Navigation or StateMutation.
- If no deterministic terminal exists: terminalNodeId = "UNKNOWN" and unknowns[] explains why.

## AI prompt (exact)
The exact system prompt used for semantic naming/grouping is in:
- `backend/v7-semantic/semantic-summarizer.ts` as `V7_SEMANTIC_SYSTEM_PROMPT`

AI output is strictly constrained to naming/grouping of VERIFIED behavior.
- The V7 semantic layer prompt and output validation live in `backend/v7-semantic/semantic-summarizer.ts`.
- The HTTP endpoint returns the existing DiscoveryResponse envelope (e.g. `success`, `suites`, etc.).

## Example input/output with UNKNOWN
See `backend/v7-semantic/semantic-summarizer.ts`:
- Input is JSON.stringify({ project, graph, derivedUserGoals })
- If derived goals include unknowns, AI must reflect them as UNKNOWN (no guessing).

## How to verify independence from V6
- V7 code is under new module paths:
  - backend: `src/modules/analysis/v7-behavior-graph/*`
  - backend AI: `src/modules/analysis/intelligence/v7-semantic/*`
  - electron scanner: `apps/desktop/electron/behavior-graph/*`
- V7 AI layer uses its own LLM client wrapper (`backend/v7-semantic/llm-client.ts`) and does not import V6 discovery logic.

## Notes
- Desktop build currently may fail at electron-builder stage in your environment (existing issue unrelated to V7). TypeScript electron build passes.

# Discovery V9 Review Bundle

## Overview

Discovery V9 is a complete rewrite of the test discovery pipeline that produces **meaningful Suites/Cases/Steps** with full provenance and evidence tracking.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      ELECTRON DESKTOP                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  runDiscoveryV9({ projectPath, baseUrl, options })          ││
│  │    │                                                         ││
│  │    ├─► 1. Build StaticBehaviorGraphV9 (code scan)           ││
│  │    │      - Parse AST for forms, buttons, links, routes     ││
│  │    │      - Extract selectors (data-testid, aria, role)     ││
│  │    │      - Build navigation edges                          ││
│  │    │                                                         ││
│  │    ├─► 2. Build RuntimeObservationGraphV9 (Playwright)      ││
│  │    │      - Navigate pages, observe URL changes             ││
│  │    │      - Instrument network requests/responses           ││
│  │    │      - Track storage changes (localStorage, cookies)   ││
│  │    │      - Generate stable selectors with scoring          ││
│  │    │                                                         ││
│  │    ├─► 3. POST /analyze/discovery/v9 (SBG + ROG)            ││
│  │    │                                                         ││
│  │    └─► 4. Persist artifacts + return DiscoveryResultV9      ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│  POST /analyze/discovery/v9                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  v9-discovery/                                               ││
│  │    validator.ts   - Validate request shapes                  ││
│  │    normalizer.ts  - Canonicalize IDs, routes, dedupe         ││
│  │    merger.ts      - Merge SBG+ROG into Verified Test Model   ││
│  │    semantic.ts    - LLM naming/grouping (bounded, JSON-only) ││
│  │    scorer.ts      - Quality scoring                          ││
│  │    index.ts       - Orchestrates pipeline                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│                    DiscoveryResultV9                             │
└─────────────────────────────────────────────────────────────────┘
```

## Key Principles

1. **No invented behavior** - Everything traced to static code or runtime observation
2. **Full provenance** - Every step has `from: "SBG"|"ROG"|"MERGED"` with refs
3. **Evidence-based assertions** - Success criteria reference concrete evidence
4. **Stable selectors** - Prioritize data-testid > role/aria > text > CSS
5. **LLM bounded** - LLM only provides names/descriptions/grouping, not behavior

## Data Flow

```
Source Code  ──►  StaticBehaviorGraphV9 (SBG)  ─┐
                                                 ├──►  Merger  ──►  DiscoveryResultV9
Live App     ──►  RuntimeObservationGraphV9 (ROG) ─┘
```

## How to Reproduce End-to-End

### Prerequisites
- Node.js 18+
- pnpm installed
- The ecommerce client project at `/Users/nikolabozic/Projects/ecommerce/src/client`

### 1. Start Backend
```bash
cd /Users/nikolabozic/Projects/qagent/apps/backend
pnpm install
pnpm run dev
```

### 2. Start Desktop
```bash
cd /Users/nikolabozic/Projects/qagent/apps/desktop
pnpm install
pnpm run dev
```

### 3. Run Discovery
1. Open the desktop app
2. In Setup flow, select project: `/Users/nikolabozic/Projects/ecommerce/src/client`
3. Enter base URL: `http://localhost:3001` (or wherever client runs)
4. Proceed to Step 4 (Discovery)
5. Discovery runs automatically and displays Suites/Cases/Steps

### 4. Inspect Artifacts
Artifacts are persisted to:
```
<electronUserData>/discovery-runs/<timestamp>/
├── sbg-v9.json              # Static Behavior Graph
├── rog-v9.json              # Runtime Observation Graph
├── discovery-result.json    # Final DiscoveryResultV9
├── playwright-trace.zip     # Playwright trace for debugging
└── logs.txt                 # Discovery logs
```

## Type Contract

See: `packages/shared-discovery-types/src/discovery-result-v9.ts`

## Files Changed

See: `v9-review/FILES_CHANGED.md`

## Current Status

- [ ] Task 0: v9-review folder structure
- [ ] Task 1: DiscoveryResultV9 contract
- [ ] Task 2: Backend /analyze/discovery/v9 endpoint
- [ ] Task 3: Electron orchestrator
- [ ] Task 4: Desktop UI integration
- [ ] Task 5: Final artifacts and commits

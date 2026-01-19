# 01 - Current System Analysis

This document describes what the system does today. No opinions. No solutions.

## Electron Discovery Flow (SmartDiscovery.tsx)

The current flow executes three sequential steps:

### Step 1: V7 Scan (Electron-side)

`window.electronAPI.scanProjectV7(projectPath)` scans the project and produces a `BehaviorGraphPayload`:

```
BehaviorGraphPayload {
  version: 'v7'
  project: { name, framework }
  graph: {
    nodes: BehaviorNode[]
    edges: BehaviorEdge[]
  }
}
```

**Node types produced by V7 scanner:**
- `Page` - Routes extracted from Next.js app router or pages router
- `Form` - JSX `<form>` elements with `onSubmit` handlers
- `UserAction` - Button clicks, form submissions (extracted from `onClick`, `onSubmit`)
- `ApiCall` - `fetch()`, `axios` calls with deterministic endpoints
- `Navigation` - `router.push()`, `redirect()`, `<Link>` components
- `StateMutation` - `localStorage.setItem()`, Redux dispatch, query cache mutations
- `Conditional` - `if` statements containing redirects

**Edge types:**
- `triggers` - UserAction triggers Form submission or ApiCall
- `results_in` - ApiCall results in StateMutation or Navigation
- `redirects_to` - Conditional redirects to Navigation
- `blocks` - Conditional blocks Page access

**What V7 scanner extracts deterministically:**
- Literal string URLs in navigation calls
- Literal API endpoints
- Literal storage keys
- Handler function bodies (one-hop call resolution)

**What V7 scanner marks as UNKNOWN:**
- Dynamic routes with runtime parameters
- Computed API endpoints
- Conditional logic with multiple branches
- Selectors (V7 does NOT extract selectors)

### Step 2: Backend Goals Extraction

`apiService.getV7GoalsFromBehaviorGraph(payload)` sends the behavior graph to `/analyze/v7/goals`.

Backend processing (`processBehaviorGraph`):
1. Validates payload structure
2. Normalizes node/edge IDs
3. Extracts `V7UserGoal` objects via BFS from each UserAction to terminal nodes

**V7UserGoal structure:**
```
V7UserGoal {
  id: string                    // e.g., "goal:ua:submit:sign-in/page.tsx:63"
  startUserActionId: string     // The UserAction node that initiates this goal
  terminalNodeId: string        // Navigation or StateMutation endpoint
  orderedNodeIds: string[]      // Path through the graph
  orderedEdgeIds: string[]      // Edges traversed
  unknowns: string[]            // Ambiguity markers
}
```

**Goal extraction logic:**
- Start from each `UserAction` node
- BFS to find shortest path to a terminal node (`Navigation` or `StateMutation`)
- If multiple equal-length paths exist, mark as ambiguous

**What goals represent:**
- A deterministic causal chain: User does X → Y happens → Z is the outcome
- Example: Submit login form → API call to /auth/login → Navigate to /dashboard

**What goals do NOT contain:**
- Human-readable names
- Test assertions
- Selector information
- Grouping into suites
- Preconditions or context

### Step 3: V8 Auto-Execution

`window.electronAPI.runV8BatchAuto()` receives goals and execution mappings.

V8 attempts to:
1. Map each goal to executable actions
2. Run Playwright against the live application
3. Observe effects (navigation, API calls, state changes)
4. Produce `V8UiReadyOutput`

**V8UiReadyOutput structure:**
```
V8UiReadyOutput {
  success: boolean
  suites: V8UiReadySuite[]      // Grouped by navigation destination
  v8Report: {
    verifiedGoals: [...]        // Goals that executed successfully
    unverifiedGoals: [...]      // Goals that failed with reasons
  }
}
```

**Current V8 limitations:**
- Requires external execution mappings (selectors, values)
- Groups suites by `NAV_TO:<destination>` or "UNCLUSTERED"
- Does not produce meaningful test names
- Does not produce assertions beyond observed effects

## Backend Services Involved

### analysis.controller.ts
- `POST /analyze/v7/goals` - Returns processed goals from behavior graph

### v7-behavior-graph/
- `validator.ts` - Validates BehaviorGraphPayload structure
- `normalizer.ts` - Normalizes IDs and structure
- `goal-extractor.ts` - BFS extraction of V7UserGoal from UserAction nodes
- `index.ts` - Orchestrates validation → normalization → extraction

### types/behavior-graph.types.ts
- Defines all node types, edge types, and goal structure

### v8-runtime/ (package)
- `types.ts` - V8 execution types (V8GoalInput, V8ExecutionMapping, V8Report)
- `batch.ts` - Batch execution of goals against Playwright

## Data Structures Produced

### From V7 Scan (Electron)
Raw behavior graph with nodes and edges. No interpretation.

### From Goals Endpoint (Backend)
```
{
  ok: true,
  payload: BehaviorGraphPayload,        // Normalized
  derivedUserGoals: V7UserGoal[],       // Extracted goals
  unknowns: string[],                   // All UNKNOWN markers
  stats: {
    normalization: {...},
    goalExtraction: {
      userActions: number,
      goals: number,
      ambiguousGoals: number
    }
  }
}
```

### From V8 Execution (Electron)
```
{
  ok: true,
  uiReady: {
    success: boolean,
    suites: [{
      name: string,                      // "NAV_TO:/dashboard" or "UNCLUSTERED"
      cases: [{
        name: string,                    // Goal ID
        goalId: string,
        steps: [{
          action: { type, selector?, value?, url? },
          assertions: [...]
        }],
        provenance: {...}
      }]
    }],
    v8Report: {...}
  }
}
```

## Where Information Is Lost

### Loss Point 1: Scan → Goals
- **Form field names** - V7 scanner collects empty `fields: []` array (see `collectInputFieldNames`)
- **Button labels** - Only handler expression text is captured, not button text content
- **Page titles/descriptions** - Not extracted from components
- **Route parameters** - Dynamic segments like `[id]` are preserved but not resolved

### Loss Point 2: Goals → Execution
- **Selectors** - V7/Goals have no selector information; V8 requires them externally
- **Test data** - No field values or expected responses are determined
- **Assertions** - V8 observes effects but does not produce semantic assertions
- **Human-readable names** - Goal IDs are technical identifiers, not test names

### Loss Point 3: Execution → UI
- **Suite grouping** - Grouping by navigation destination is arbitrary
- **Case names** - Goal IDs are shown directly
- **Step descriptions** - Raw action types without context
- **Coverage context** - No indication of what is/isn't tested

## What `/goals` Returns and Why

The `/goals` endpoint exists to provide a **deterministic, verifiable transformation** from
behavior graph to goal structure. It is deterministic because:

1. It uses BFS with shortest-path selection
2. It marks ambiguity explicitly
3. It does not use AI or heuristics
4. The same input always produces the same output

It returns `derivedUserGoals` because:
- Each goal represents ONE user action leading to ONE terminal outcome
- Goals can be individually verified by execution
- Goals form the atomic unit of test coverage

The endpoint does NOT attempt to:
- Name or describe goals semantically
- Group goals into suites
- Generate selectors or test data
- Produce human-readable output

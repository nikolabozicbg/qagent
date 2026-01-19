# Discovery V9 Runtime-First Architecture Review

## Overview

This document describes the refactored Discovery V9 architecture that ensures **only runtime-verified actions become test steps**. This eliminates meaningless tests (repeated "Click element", same URL, no flow) that were previously generated from static analysis alone.

## Problem Statement (Before)

Discovery produced suites/cases/steps directly from static scan (SBG), resulting in:
- Meaningless tests with repeated "Click element" steps
- Steps pointing to the same URL with no actual navigation
- No observable flow or user journey verification
- Static-only steps that may not work at runtime

## Solution: Runtime-First Verification

### Non-Negotiable Rules

1. **NO AI** - No LLM-based guessing or inference
2. **NO heuristics** - No "smart" guessing of what actions do
3. **NO selector guessing** - Only selectors verified at runtime
4. **NO static-only steps** - Every step must be runtime-verified

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ELECTRON (Desktop App)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. STATIC SCAN (sbg-scanner.ts)                                        │
│     └── extractCandidateActions() → CandidateAction[]                   │
│         • Links with href                                               │
│         • Buttons with data-testid or text                              │
│         • Form submits                                                  │
│         • NOT steps yet - just candidates                               │
│                                                                         │
│  2. RUNTIME EXECUTION (runtime-executor.ts)                             │
│     └── executeCandidate() → ActionObservation                          │
│         • Navigate to source URL                                        │
│         • Execute action (click/submit)                                 │
│         • Observe: URL change, network, DOM, storage                    │
│         • Record all observations                                       │
│                                                                         │
│  3. VERIFICATION (verifier.ts)                                          │
│     └── verifyActions() → VerifiedStep[]                                │
│         • Check: did action produce observable effect?                  │
│         • URL change → verified                                         │
│         • Network call → verified                                       │
│         • DOM mutation → verified (if significant)                      │
│         • Storage change → verified                                     │
│         • No effect → DISCARD                                           │
│                                                                         │
│  4. DEDUPLICATION (verifier.ts)                                         │
│     └── deduplicateByEffect() → unique VerifiedStep[]                   │
│         • Same destination URL → keep first only                        │
│         • Same network endpoint → keep canonical                        │
│                                                                         │
│  5. FLOW BUILDING (verifier.ts)                                         │
│     └── buildVerifiedFlows() → VerifiedFlow[]                           │
│         • Group steps by destination URL                                │
│         • Each navigation = one flow                                    │
│         • Flow type: navigation | form-submission | interaction         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (NestJS)                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  6. MERGE (merger.ts) - REFACTORED                                      │
│     └── mergeGraphs(normalized, verifiedFlows)                          │
│         • If verifiedFlows provided → use exclusively                   │
│         • If no verifiedFlows → return empty result                     │
│         • NO static-to-step conversion                                  │
│                                                                         │
│  7. SUITE BUILDING (merger.ts)                                          │
│     └── buildFromVerifiedFlows() → MergedTestModel                      │
│         • Group flows by destination URL (not source!)                  │
│         • Each flow → one test case                                     │
│         • Suite = all flows to same destination                         │
│                                                                         │
│  8. OUTPUT                                                              │
│     └── DiscoveryResultV9                                               │
│         • Only verified suites/cases/steps                              │
│         • Full provenance (static ref + runtime ref)                    │
│         • Real expectations (URL/network/DOM evidence)                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Types

### CandidateAction
```typescript
interface CandidateAction {
  id: string;
  type: 'link' | 'button' | 'form-submit';
  sourceUrl: string;        // Page where action exists
  selector: string | null;  // CSS selector or data-testid
  href: string | null;      // For links: destination
  text: string | null;      // Visible text
  testId: string | null;    // data-testid if available
  filePath: string;         // Source code location
  lineNumber: number | null;
}
```

### ActionObservation
```typescript
interface ActionObservation {
  candidateId: string;
  executed: boolean;
  executionError: string | null;
  urlBefore: string;
  urlAfter: string | null;           // null if unchanged
  networkCalls: NetworkCall[];        // API requests triggered
  domMutations: DomMutation[];        // Significant DOM changes
  storageChanges: StorageChange[];    // localStorage/sessionStorage
}
```

### VerifiedStep
```typescript
interface VerifiedStep {
  id: string;
  candidate: CandidateAction;         // Original static info
  observation: ActionObservation;      // Runtime observation
  verifiedSelector: string;            // Selector that worked
  destinationUrl: string | null;       // Where it navigated
  verificationReason: 'url-change' | 'network-call' | 'dom-mutation' | 'storage-change';
}
```

### VerifiedFlow
```typescript
interface VerifiedFlow {
  id: string;
  startUrl: string;
  endUrl: string;
  steps: VerifiedStep[];
  flowType: 'navigation' | 'form-submission' | 'interaction';
}
```

## Verification Logic

### Effect Detection (Priority Order)
1. **URL Change** - Most reliable indicator of navigation
2. **Network Call** - API interaction detected
3. **Storage Change** - State mutation via storage
4. **DOM Mutation** - Significant DOM change (modal, new content)

### Deduplication
Actions with the same observable effect are deduplicated:
- Same destination URL → keep first (canonical link)
- Same API endpoint + method → keep first
- Computed via `effectKey = "${reason}:${evidence}"`

### Flow Building
Verified steps are grouped into flows:
- **Navigation flows**: Steps that navigate to a new URL
- **Form submission flows**: Steps that submit forms
- **Interaction flows**: Steps that trigger significant effects without navigation

## Files Modified

### Electron (Desktop App)
- `apps/desktop/electron/discovery-v9/types.ts` - Added runtime-first types
- `apps/desktop/electron/discovery-v9/sbg-scanner.ts` - Added `extractCandidateActions()`
- `apps/desktop/electron/discovery-v9/runtime-executor.ts` - **NEW** Playwright execution with observers
- `apps/desktop/electron/discovery-v9/verifier.ts` - **NEW** Verification and deduplication
- `apps/desktop/electron/discovery-v9/orchestrator.ts` - Refactored to runtime-first flow
- `apps/desktop/electron/discovery-v9/index.ts` - Updated exports

### Backend (NestJS)
- `apps/backend/src/modules/analysis/v9-discovery/types.ts` - Added VerifiedFlow types
- `apps/backend/src/modules/analysis/v9-discovery/merger.ts` - **REFACTORED** to use verified flows only
- `apps/backend/src/modules/analysis/v9-discovery/index.ts` - Pass verified flows to merger

### UI (React)
- `apps/desktop/src/screens/SmartDiscovery.tsx` - Updated empty state message

## Empty State

When no actions produce observable effects, the UI displays:

> **No verified user flows found**
> 
> Discovery scanned your code but no actions produced observable runtime effects (URL changes, API calls, or DOM mutations).
>
> Possible reasons:
> - Application not running at the configured base URL
> - Links/buttons don't have href or data-testid attributes
> - Actions require authentication that wasn't provided
> - JavaScript errors preventing page interactions

## Completion Criteria

✅ Discovery result contains ONLY runtime-verified flows
✅ Zero "Click element" steps without destination  
✅ Each case represents a real user journey
✅ Empty state shows "No verified user flows found"

## Testing

To test the runtime-first flow:
1. Start your target application (e.g., `npm run dev` on port 3000)
2. Run Discovery from QAgent desktop app
3. Verify that:
   - Only actions with observable effects appear as steps
   - Each step has a destination URL or API call reference
   - Empty result shown if no actions could be verified

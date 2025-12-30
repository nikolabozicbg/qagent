# QAgenAI Extension Refactor - Technical Implementation Plan

## Overview

Refaktorisanje postojeće ekstenzije (23K LOC) u QA-first, flow-based proizvod definisan u `docs/PRODUCT_SPEC.md`. 

**Pristup:** Evolucija postojeće arhitekture, ne revolucija.

---

## Current Architecture

**Entry Point:** `extension.ts` → `ServiceContainer` (DI pattern)

**Existing Services (reusable):**
| Service | Status | Purpose |
|---------|--------|---------|
| `project-detection.service.ts` | ✅ Reuse | Framework detection |
| `coverage-parser.service.ts` | ✅ Reuse | Coverage parsing |
| `test-execution.service.ts` | ✅ Reuse | Test running |
| `file-scanner.service.ts` | ✅ Reuse | File scanning |
| `flow-state.service.ts` | ✅ Extend | Flow state persistence |
| `openapi-parser.service.ts` | ✅ Reuse | OpenAPI parsing |
| `user-flow-generator.service.ts` | ✅ Extend | Flow generation |

**Existing UI:**
| File | Status | Action |
|------|--------|--------|
| `coverage.webview.ts` (2200+ lines) | 🔄 Replace | New Dashboard |
| `test-preview.webview.ts` | ✅ Keep | Preview panel |

---

## Phase 1: Onboarding Wizard (3-4 days)

### 1.1 New Files to Create

```
src/
├── services/
│   ├── onboarding.service.ts          # Wizard state management
│   └── config-persistence.service.ts  # E2E config storage
├── webviews/
│   └── onboarding.webview.ts          # Wizard UI (6 steps)
└── types/
    └── onboarding.types.ts            # OnboardingState, E2EConfig
```

### 1.2 OnboardingService

**File:** `src/services/onboarding.service.ts`

```typescript
interface OnboardingState {
  currentStep: 'welcome' | 'framework' | 'e2e-setup' | 'quick-scan' | 'flow-discovery' | 'ready';
  completed: boolean;
  detectedStack: DetectedStack;
  e2eConfig: E2EConfig;
  discoveredFlows: DiscoveredFlow[];
  scanResults: QuickScanResults;
}

interface E2EConfig {
  baseUrl: string;
  auth: { 
    type: 'none' | 'form' | 'bearer'; 
    credentials?: {
      username?: string;
      password?: string;
      token?: string;
    }
  };
  importedSources: ImportedSource[];
}

interface ImportedSource {
  type: 'recording' | 'postman' | 'openapi' | 'har' | 'description';
  path?: string;
  content?: string;
}
```

**Methods:**
- `startOnboarding()` - Initialize wizard
- `nextStep()` / `prevStep()` - Navigation
- `detectFrameworks()` - Extend existing `ProjectDetectionService`
- `configureE2E(config)` - Save E2E settings
- `runQuickScan()` - Repo-wide analysis
- `discoverFlows()` - AI flow detection
- `completeOnboarding()` - Mark done, show dashboard

### 1.3 Framework Detection Enhancement

**Modify:** `src/services/project-detection.service.ts`

**Add:**
- E2E framework detection (Playwright, Cypress)
- API spec detection (OpenAPI, Postman, HAR)
- Monorepo support (`apps/`, `packages/`)

```typescript
interface DetectedStack {
  frontend?: { 
    framework: string; 
    version: string;
    buildTool?: string;
  };
  backend?: { 
    framework: string; 
    version: string;
    orm?: string;
  };
  e2e?: { 
    framework: string; 
    installed: boolean;
    configPath?: string;
  };
  api?: { 
    spec: 'openapi' | 'postman' | 'har'; 
    path: string;
  };
  unit?: { 
    framework: string; 
    installed: boolean;
  };
  isMonorepo: boolean;
  packages?: string[];
}
```

### 1.4 Onboarding Webview

**File:** `src/webviews/onboarding.webview.ts`

**Features:**
- 6-step wizard UI (HTML/CSS/JS)
- Step indicators with progress
- Back/Next/Skip navigation
- Message passing to extension
- Responsive design

**Steps:**
1. Welcome (QA-first messaging)
2. Framework Detection (auto-detect with manual override)
3. E2E Setup (URL, Auth, Import)
4. Quick Scan (progress indicator)
5. Flow Discovery (AI suggestions with checkboxes)
6. Ready (summary + next actions)

### 1.5 Integration

**Modify:** `extension.ts`

```typescript
export async function activate(context: vscode.ExtensionContext) {
  const onboardingCompleted = context.globalState.get('onboardingCompleted', false);
  
  if (!onboardingCompleted) {
    // Show onboarding wizard
    await showOnboardingWizard(context);
  } else {
    // Show dashboard
    await showDashboard(context);
  }
}
```

---

## Phase 2: Dashboard Webview (2-3 days)

### 2.1 Dashboard Architecture

**Replace:** `src/webviews/coverage.webview.ts` (2200 lines)
**New:** `src/webviews/dashboard.webview.ts`

```
Dashboard Layout:
┌─────────────────────────────────────────────────────────────────┐
│ Header                                                          │
│ ┌─────────────┬─────────────┬─────────────┬─────────────┐       │
│ │Repo Snapshot│ Test Health │Coverage Trend│Quick Actions│       │
│ └─────────────┴─────────────┴─────────────┴─────────────┘       │
├─────────────────────────────────────────────────────────────────┤
│ Tabs: [🔥 Risk Queue] [🧠 Impact] [📚 Flows] [⚠️ Flaky]        │
│       [🔧 Self-heal] [🚀 CI Export]                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    Active Tab Content                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Dashboard Data Structure

```typescript
interface DashboardData {
  repoSnapshot: {
    stack: string[];
    fileCount: number;
    lastScan: Date;
  };
  testHealth: {
    total: number;
    passing: number;
    failing: number;
    flaky: number;
  };
  coverageTrend: {
    current: number;
    goal: number;
    weeklyDelta: number;
    history: { date: Date; value: number }[];
  };
  riskQueue: RiskQueueItem[];
  impactAnalysis: ImpactAnalysis;
  flowLibrary: Flow[];
  flakyTests: FlakyTest[];
  selectorIssues: SelectorIssue[];
}
```

### 2.3 Dashboard Service

**File:** `src/services/dashboard.service.ts`

```typescript
class DashboardService {
  constructor(
    private projectDetection: ProjectDetectionService,
    private coverageParser: CoverageParserService,
    private riskQueue: RiskQueueService,
    private impactAnalysis: ImpactAnalysisService,
    private flowLibrary: FlowStateService,
    private flakyDetection: FlakyDetectionService,
    private selfHealing: SelfHealingService
  ) {}

  async getDashboardData(): Promise<DashboardData> {
    // Aggregate data from all services
  }

  async refresh(): Promise<void> {
    // Refresh all data sources
  }
}
```

---

## Phase 3: Risk Queue (3 days)

### 3.1 Risk Score Algorithm

**File:** `src/services/risk-queue.service.ts`

```typescript
interface RiskQueueItem {
  type: 'file' | 'flow';
  name: string;
  path?: string;
  coverage: number;
  riskScore: number;  // 0-100
  priority: 'critical' | 'high' | 'medium' | 'low';
  factors: RiskFactor[];
}

interface RiskFactor {
  name: string;
  weight: number;
  value: number;
  description: string;
}
```

**Risk Score Calculation:**

```
riskScore = 
  (1 - coverage) * 40 +           // Coverage gap (40%)
  churnRate * 25 +                 // Git churn (25%)
  complexity * 20 +                // Cyclomatic complexity (20%)
  dependencyCount * 10 +           // Import count (10%)
  businessValue * 5                // Manual tag (5%)
```

**Priority Thresholds:**
- Critical: 80-100
- High: 60-79
- Medium: 40-59
- Low: 0-39

### 3.2 Git Churn Analysis

**File:** `src/services/git-analysis.service.ts`

```typescript
class GitAnalysisService {
  async getFileChurn(filePath: string, days: number = 30): Promise<number> {
    // git log --oneline --since="30 days ago" -- filePath | wc -l
  }

  async getChangedFiles(since: string): Promise<ChangedFile[]> {
    // git diff --name-status since
  }

  async getCommitHistory(filePath: string): Promise<Commit[]> {
    // git log --format="%H|%an|%at|%s" -- filePath
  }

  async getCurrentBranch(): Promise<string> {
    // git rev-parse --abbrev-ref HEAD
  }

  async getDiff(base?: string): Promise<DiffResult> {
    // git diff [base]
  }
}
```

### 3.3 Complexity Analysis

**Extend:** `src/services/source-analyzer.service.ts`

```typescript
interface ComplexityResult {
  cyclomaticComplexity: number;
  linesOfCode: number;
  dependencies: string[];
  exports: string[];
}

async analyzeComplexity(filePath: string): Promise<ComplexityResult>
```

---

## Phase 4: Impact Mode (4 days)

### 4.1 Impact Analysis Service

**File:** `src/services/impact-analysis.service.ts`

```typescript
interface ImpactAnalysis {
  branch: string;
  baseBranch: string;
  changedFiles: ChangedFile[];
  affectedTests: AffectedTest[];
  affectedFlows: AffectedFlow[];
  transitiveDependencies: string[];
  summary: {
    filesChanged: number;
    testsAffected: number;
    flowsAffected: number;
  };
}

interface ChangedFile {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
}

interface AffectedTest {
  testFile: string;
  sourceFile: string;
  relationship: 'direct' | 'transitive';
  confidence: number;
}

interface AffectedFlow {
  flowId: string;
  flowName: string;
  affectedFiles: string[];
  confidence: number;
}
```

**Methods:**

```typescript
class ImpactAnalysisService {
  async analyzeGitDiff(branch?: string): Promise<ImpactAnalysis>
  async findAffectedTests(changedFiles: ChangedFile[]): Promise<AffectedTest[]>
  async findAffectedFlows(changedFiles: ChangedFile[]): Promise<AffectedFlow[]>
  async runAffectedTests(): Promise<TestResult[]>
  async generateMissingTests(): Promise<void>
  async exportImpactReport(): Promise<string>
}
```

### 4.2 Dependency Graph

**File:** `src/services/dependency-graph.service.ts`

```typescript
interface DependencyGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, string[]>;  // file -> imports
}

interface GraphNode {
  path: string;
  type: 'source' | 'test' | 'config';
  imports: string[];
  importedBy: string[];
}

class DependencyGraphService {
  async buildGraph(workspaceRoot: string): Promise<DependencyGraph>
  getDirectDependents(filePath: string): string[]
  getTransitiveDependents(filePath: string): string[]
  findTestsForSource(sourcePath: string): string[]
}
```

---

## Phase 5: Flow Library (5 days)

### 5.1 Flow Data Model

**File:** `src/types/flow.types.ts`

```typescript
interface Flow {
  id: string;
  name: string;
  description?: string;
  steps: FlowStep[];
  assertions: FlowAssertion[];
  selectorPolicy: 'testid' | 'role' | 'css';
  config: FlowConfig;
  status: 'draft' | 'generated' | 'passing' | 'failing' | 'flaky';
  testFilePath?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FlowStep {
  id: string;
  order: number;
  type: 'navigate' | 'click' | 'fill' | 'select' | 'wait' | 'assert' | 'hover' | 'scroll';
  target?: string;  // URL or selector
  value?: string;   // Input value
  options?: StepOptions;
}

interface StepOptions {
  waitFor?: 'networkidle' | 'domcontentloaded' | 'load';
  timeout?: number;
  force?: boolean;
}

interface FlowAssertion {
  id: string;
  stepId: string;
  type: 'url' | 'visible' | 'hidden' | 'text' | 'value' | 'count' | 'attribute' | 'custom';
  selector?: string;
  expected: string;
  operator?: 'equals' | 'contains' | 'matches' | 'gt' | 'lt';
}

interface FlowConfig {
  baseUrl: string;
  auth?: AuthConfig;
  viewport?: { width: number; height: number };
  timeout: number;
  retries: number;
}
```

### 5.2 Flow Library Service

**Extend:** `src/services/flow-state.service.ts` → `src/services/flow-library.service.ts`

```typescript
class FlowLibraryService {
  // CRUD operations
  async createFlow(flow: Partial<Flow>): Promise<Flow>
  async updateFlow(id: string, updates: Partial<Flow>): Promise<Flow>
  async deleteFlow(id: string): Promise<void>
  async getFlow(id: string): Promise<Flow | null>
  async getAllFlows(): Promise<Flow[]>
  async duplicateFlow(id: string): Promise<Flow>

  // Import operations
  async importFromRecording(tracePath: string): Promise<Flow>
  async importFromPostman(collectionPath: string): Promise<Flow[]>
  async importFromOpenAPI(specPath: string): Promise<Flow[]>
  async importFromHAR(harPath: string): Promise<Flow[]>
  async importFromDescription(description: string): Promise<Flow>

  // Generation
  async generateTest(flowId: string, options: GenerationOptions): Promise<GeneratedFiles>
  async runFlow(flowId: string): Promise<TestResult>
}
```

### 5.3 Flow Editor Webview

**File:** `src/webviews/flow-editor.webview.ts`

**Features:**
- Step list (drag & drop reorder)
- Step editor (type, target, value)
- Assertions builder (visual per step)
- Selector policy config
- Preview generated Playwright code
- Run/Save/Delete actions

### 5.4 Import Parsers

**Files:**
- `src/parsers/playwright-trace.parser.ts` - Parse `.zip` trace files
- `src/parsers/postman.parser.ts` - Parse Postman collections
- `src/parsers/har.parser.ts` - Parse HAR files

---

## Phase 6: Flaky Detection (3 days)

### 6.1 Flaky Detection Service

**File:** `src/services/flaky-detection.service.ts`

```typescript
interface FlakyTest {
  testFile: string;
  testName: string;
  flakyRate: number;  // 0-100%
  pattern: 'timeout' | 'race' | 'network' | 'selector' | 'unknown';
  history: TestRun[];
  suggestion?: FlakySuggestion;
  quarantined: boolean;
}

interface TestRun {
  id: string;
  timestamp: Date;
  passed: boolean;
  duration: number;
  error?: string;
  errorLine?: number;
}

interface FlakySuggestion {
  type: 'add-wait' | 'fix-selector' | 'mock-api' | 'increase-timeout';
  description: string;
  code?: string;
}

class FlakyDetectionService {
  async trackTestRun(result: TestResult): Promise<void>
  async analyzeFlakiness(): Promise<FlakyTest[]>
  async detectPattern(test: FlakyTest): Promise<string>
  async getSuggestion(test: FlakyTest): Promise<FlakySuggestion>
  async quarantineTest(testFile: string, testName: string): Promise<void>
  async getQuarantinedTests(): Promise<FlakyTest[]>
}
```

### 6.2 Test History Storage

```typescript
interface TestHistory {
  [testId: string]: TestRun[];  // Rolling window of last 50 runs
}

// Store in context.workspaceState
const HISTORY_KEY = 'qagenai.testHistory';
const MAX_RUNS_PER_TEST = 50;
```

---

## Phase 7: Self-Healing (4 days)

### 7.1 Selector Analysis Service

**File:** `src/services/self-healing.service.ts`

```typescript
interface SelectorIssue {
  testFile: string;
  line: number;
  column: number;
  currentSelector: string;
  issueType: 'fragile-css' | 'text-i18n' | 'nth-child' | 'dynamic-class' | 'dynamic-id';
  suggestedSelector: string;
  confidence: number;
  explanation: string;
}

class SelfHealingService {
  async analyzeSelectors(testFiles: string[]): Promise<SelectorIssue[]>
  async suggestFix(issue: SelectorIssue): Promise<string>
  async applyFix(issue: SelectorIssue): Promise<void>
  async applyAllFixes(issues: SelectorIssue[]): Promise<void>
  async createPR(issues: SelectorIssue[]): Promise<string>  // Returns PR URL
}
```

### 7.2 Selector Patterns

**Fragile Patterns (detect):**
| Pattern | Example | Risk |
|---------|---------|------|
| CSS class | `.btn-primary` | Class names change |
| Text exact | `text="Submit"` | i18n/copy changes |
| nth-child | `:nth-child(2)` | Order dependent |
| Dynamic ID | `#el-123abc` | Generated IDs |
| Dynamic class | `.MuiButton-root` | Framework classes |

**Stable Alternatives (suggest):**
| Current | Suggested |
|---------|-----------|
| `.submit-btn` | `[data-testid="submit-btn"]` |
| `text="Add"` | `[role="button"][name="Add"]` |
| `:nth-child(2)` | `[data-testid="item-1"]` |
| `#generated-123` | `[aria-label="..."]` |

---

## Phase 8: CI Export (3 days)

### 8.1 CI Template Service

**File:** `src/services/ci-export.service.ts`

```typescript
interface CIConfig {
  platform: 'github' | 'gitlab' | 'azure' | 'circle';
  triggers: {
    onPR: boolean;
    onPush: boolean;
    branches: string[];
    paths?: string[];
  };
  shards: number;
  artifacts: boolean;
  notifications: {
    slack?: string;
    teams?: string;
    email?: string[];
  };
  environment: {
    baseUrl: string;
    secrets: string[];
  };
}

class CIExportService {
  generateYAML(config: CIConfig): string
  previewYAML(config: CIConfig): string
  validateConfig(config: CIConfig): ValidationResult
  async createConfigFile(config: CIConfig): Promise<string>  // Returns file path
  async createConfigPR(config: CIConfig): Promise<string>  // Returns PR URL
}
```

### 8.2 Templates

**Files:**
- `src/templates/ci/github-actions.template.ts`
- `src/templates/ci/gitlab-ci.template.ts`
- `src/templates/ci/azure-pipelines.template.ts`
- `src/templates/ci/circleci.template.ts`

**Example GitHub Actions Template:**

```yaml
name: E2E Tests
on:
  pull_request:
    branches: [{{branches}}]
  push:
    branches: [{{mainBranch}}]

jobs:
  e2e:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [{{shardList}}]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - name: Run E2E (shard ${{ matrix.shard }}/{{totalShards}})
        run: npx playwright test --shard=${{ matrix.shard }}/{{totalShards}}
        env:
          BASE_URL: ${{ secrets.{{baseUrlSecret}} }}
      {{#if artifacts}}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report-${{ matrix.shard }}
          path: playwright-report/
      {{/if}}
      {{#if slack}}
      - name: Notify Slack
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          webhook: ${{ secrets.{{slackSecret}} }}
      {{/if}}
```

---

## Phase 9: Test Generation Enhancement (3 days)

### 9.1 Flow-Based Generation

**Extend:** `src/services/test-generation.service.ts`

```typescript
interface GenerationOptions {
  output: 'local' | 'pr' | 'preview';
  generatePOM: boolean;
  generateFixtures: boolean;
  generateMocks: boolean;
  visualRegression: boolean;
  selectorPolicy: 'testid' | 'role' | 'css';
}

interface GeneratedFiles {
  testFile: { path: string; content: string };
  pomFiles?: { path: string; content: string }[];
  fixtures?: { path: string; content: string };
  mocks?: { path: string; content: string }[];
}

class TestGenerationService {
  async generateFromFlow(flow: Flow, options: GenerationOptions): Promise<GeneratedFiles>
  async generateFromFile(filePath: string, options: GenerationOptions): Promise<GeneratedFiles>
  async previewGeneration(flow: Flow): Promise<GeneratedFiles>
  async saveLocally(files: GeneratedFiles): Promise<string[]>
  async createPR(files: GeneratedFiles): Promise<string>
}
```

### 9.2 POM Generation

```typescript
interface PageObjectModel {
  className: string;
  filePath: string;
  selectors: { name: string; selector: string }[];
  methods: { name: string; params: string[]; body: string }[];
}

function generatePOM(flow: Flow): PageObjectModel
```

---

## Phase 10: API Tests Enhancement (3 days)

### 10.1 API Test Service

**File:** `src/services/api-test.service.ts`

```typescript
interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  summary?: string;
  requestBody?: object;
  responses: { status: number; schema?: object }[];
  hasTest: boolean;
  testFile?: string;
}

interface ApiCoverageReport {
  totalEndpoints: number;
  testedEndpoints: number;
  coveragePercent: number;
  untested: ApiEndpoint[];
}

class ApiTestService {
  async importFromOpenAPI(specPath: string): Promise<ApiEndpoint[]>
  async importFromPostman(collectionPath: string): Promise<ApiEndpoint[]>
  async importFromHAR(harPath: string): Promise<ApiEndpoint[]>
  async generateTests(endpoints: ApiEndpoint[]): Promise<GeneratedFiles>
  async trackCoverage(): Promise<ApiCoverageReport>
  async generateSchemaTests(endpoint: ApiEndpoint): Promise<string>
}
```

---

## File Structure After Refactor

```
src/
├── extension.ts                      # Entry point (modified)
├── container.ts                      # DI container (modified)
│
├── services/
│   ├── onboarding.service.ts         # NEW - Phase 1
│   ├── config-persistence.service.ts # NEW - Phase 1
│   ├── dashboard.service.ts          # NEW - Phase 2
│   ├── risk-queue.service.ts         # NEW - Phase 3
│   ├── git-analysis.service.ts       # NEW - Phase 3
│   ├── impact-analysis.service.ts    # NEW - Phase 4
│   ├── dependency-graph.service.ts   # NEW - Phase 4
│   ├── flow-library.service.ts       # NEW - Phase 5 (extends flow-state)
│   ├── flaky-detection.service.ts    # NEW - Phase 6
│   ├── self-healing.service.ts       # NEW - Phase 7
│   ├── ci-export.service.ts          # NEW - Phase 8
│   ├── api-test.service.ts           # NEW - Phase 10
│   ├── project-detection.service.ts  # EXTEND - Phase 1
│   ├── test-generation.service.ts    # EXTEND - Phase 9
│   ├── source-analyzer.service.ts    # EXTEND - Phase 3
│   └── ... (existing services)
│
├── webviews/
│   ├── onboarding.webview.ts         # NEW - Phase 1
│   ├── dashboard.webview.ts          # NEW - Phase 2 (replace coverage.webview.ts)
│   ├── flow-editor.webview.ts        # NEW - Phase 5
│   └── test-preview.webview.ts       # KEEP
│
├── parsers/
│   ├── playwright-trace.parser.ts    # NEW - Phase 5
│   ├── postman.parser.ts             # NEW - Phase 5
│   └── har.parser.ts                 # NEW - Phase 5
│
├── templates/
│   └── ci/
│       ├── github-actions.template.ts    # NEW - Phase 8
│       ├── gitlab-ci.template.ts         # NEW - Phase 8
│       ├── azure-pipelines.template.ts   # NEW - Phase 8
│       └── circleci.template.ts          # NEW - Phase 8
│
└── types/
    ├── onboarding.types.ts           # NEW - Phase 1
    ├── flow.types.ts                 # NEW - Phase 5
    ├── risk-queue.types.ts           # NEW - Phase 3
    ├── impact.types.ts               # NEW - Phase 4
    ├── flaky.types.ts                # NEW - Phase 6
    ├── ci.types.ts                   # NEW - Phase 8
    └── enhanced-analysis.types.ts    # EXTEND
```

---

## Implementation Timeline

| Phase | Days | Dependencies | Deliverable | Priority |
|-------|------|--------------|-------------|----------|
| 1. Onboarding | 3-4 | None | First-run wizard | P0 |
| 2. Dashboard | 2-3 | Phase 1 | Main UI | P0 |
| 3. Risk Queue | 3 | Phase 2 | Prioritization | P1 |
| 4. Impact Mode | 4 | Phase 3 | Git integration | P1 |
| 5. Flow Library | 5 | Phase 2 | CRUD + Import | P0 |
| 6. Flaky Detection | 3 | Phase 2 | History tracking | P2 |
| 7. Self-Healing | 4 | Phase 6 | Selector fixes | P2 |
| 8. CI Export | 3 | Phase 2 | YAML generation | P1 |
| 9. Test Gen Enhancement | 3 | Phase 5 | Flow-based gen | P1 |
| 10. API Tests | 3 | Phase 5 | Import + coverage | P2 |
| **TOTAL** | **~33-36 days** | | | |

---

## Migration Strategy

1. **Keep existing functionality working** during refactor
2. **Feature flag** new dashboard: `qagenai.useNewDashboard`
3. **Gradual rollout:** Onboarding → Dashboard → Features
4. **Deprecate** old coverage webview after new dashboard stable
5. **Backward compatibility** for saved flow states

---

## Testing Strategy

| Type | Coverage | Tools |
|------|----------|-------|
| Unit tests | All new services | Jest |
| Integration tests | Webview ↔ Extension | Jest + VS Code test runner |
| E2E tests | Full user flows | Manual + Playwright |
| Dogfooding | Real projects | Internal team |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large refactor scope | High | Phased approach, feature flags |
| Breaking existing users | Medium | Backward compatibility, gradual rollout |
| AI quality variance | Medium | User feedback loop, manual override |
| Performance regression | Medium | Caching, lazy loading, profiling |

---

## Backlog (Future Enhancements)

### Code-Based Routing Support
**Priority:** P2 (after core features complete)
**Effort:** 2-4 hours

Currently flow discovery works best with file-based routing (Next.js, Nuxt, SvelteKit). 
Add support for code-based routing patterns:

**To implement:**
- React Router parsing (`routes.tsx`, `createBrowserRouter`)
- Vue Router parsing (`router/index.ts`)
- Angular Router parsing (`app-routing.module.ts`)
- Express/NestJS controller route extraction

**Approach:**
1. Detect router files by name patterns
2. Parse route definitions using regex or AST
3. Extract: path, component, guards/middleware
4. Feed to AI alongside file structure

**Why deferred:**
- Current `getNavigationStructure()` already reads router files and sends to AI
- AI can extract routes from code even without explicit parsing
- File-based routing covers majority of modern projects

---

*Last updated: December 2024*

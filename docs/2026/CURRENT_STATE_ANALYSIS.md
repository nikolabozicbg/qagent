# 🔍 QAGENT EXTENSION - TRENUTNO STANJE I AKCIONI PLAN
**Date:** December 25, 2025  
**Analysis:** Current Implementation vs MVP Plan  
**Completion:** ~25% (Corrected from inflated 45%)

---

## 📊 EXECUTIVE SUMMARY

### Ključni Nalazi:
1. ✅ **Backend radi odlično** - AI generation funkcioniše (OpenAI GPT-3.5)
2. ✅ **Extension arhitektura solidna** - Dobra struktura servisa
3. ❌ **Coverage hardcoded na 0%** - CRITICAL BUG
4. ✅ **Backend integration postoji** - Extension već poziva `/generate/e2e`
5. ❌ **Real AI kod ne stiže do extension-a** - Možda network/config problem

### Realna Completion Rate:
```
Backend Infrastructure:     90% ✅
Extension Basic Features:   60% ✅
Intelligence Features:       0% ❌ (Smart selection, Health score, Auto-fix)
UX Polish:                  40% ⚠️
```

**Weighted Total: ~25% done** (ne 45%)

---

## 🏗️ ŠTA JE IMPLEMENTIRANO (Verified)

### 1. Extension Core ✅

#### Activation & Lifecycle
```typescript
// apps/vscode-extension/src/extension.ts
✅ Extension activates on startup
✅ Checks onboarding completion
✅ Shows wizard ili dashboard based on state
✅ Command registration working
✅ Output channel za debugging
```

#### Service Container ✅
```typescript
// apps/vscode-extension/src/container.ts
✅ Clean DI container
✅ Lazy service initialization
✅ Proper lifecycle management
✅ Services:
   - OnboardingService
   - DashboardService  
   - TestGenerationService
   - DashboardWebviewProvider
```

---

### 2. Onboarding Wizard ✅ (~90%)

**Status:** Fully working, 5-step wizard

**Flow:**
```
Step 1: Welcome → Project detection
Step 2: Technology selection
Step 3: Framework detection  
Step 4: Flow discovery (AI-powered)
Step 5: Summary & completion
```

**Files:**
- ✅ `onboarding.service.ts` - Main logic
- ✅ Backend integration za flow discovery
- ✅ State persistence (globalState)

**What Works:**
- Project type detection (frontend/backend)
- Framework detection (Next.js, Nest.js, Express, etc.)
- AI flow discovery (calls backend `/analyze/flows/discover`)
- Flows saved to workspace state

**Missing:**
- ❌ Error recovery (wizard ne može resume ako krešuje)
- ❌ Progress indication (Step 1/5)
- ❌ Skip option (force through wizard)

---

### 3. Test Generation Service ✅⚠️ (~70%)

**Status:** Backend integration EXISTS, ali quality unclear

**Implementation:**
```typescript
// apps/vscode-extension/src/services/test-generation.service.ts

async generateE2ETest(flow: DashboardFlow) {
  // Calls: http://localhost:3001/generate/e2e
  const response = await fetch(`${this.baseUrl}/generate/e2e`, {
    method: 'POST',
    body: JSON.stringify({ flow, config, componentCode }),
    signal: AbortSignal.timeout(120000),
  });
  
  // Fallback on error
  if (!response.ok) {
    return this.generateFallbackTest(flow, config);
  }
  
  return await response.json();
}
```

**Backend Endpoint:**
```typescript
// apps/backend/src/modules/generation/generation.service.ts

async generateE2EFromFlow({ flow, config, componentCode }) {
  // ✅ Checks if AI provider configured
  if (!this.aiProvider.isConfigured()) {
    return template; // Skeleton with TODOs
  }
  
  // ✅ Calls OpenAI GPT-3.5
  const response = await this.aiProvider.createCompletion({
    messages: [...],
    temperature: 0.7,
    maxTokens: 4000,
  });
  
  // ✅ Returns real AI-generated code
  return { code, filename, _meta };
}
```

**Verified Working (via curl):**
```bash
$ curl -X POST http://localhost:3001/generate/e2e \
  -H "Content-Type: application/json" \
  -d '{"flow": {...}, "config": {...}}'

Response:
{
  "code": "import { test, expect } from '@playwright/test';\n\n...",
  "filename": "login-flow.spec.ts",
  "_meta": {
    "mode": "openai",
    "model": "gpt-3.5-turbo",
    "duration": 2.581,
    "tokens": 635
  }
}
```

**✅ BACKEND RADI!**

**Problem:**
- ❓ Da li extension STVARNO dobija AI kod ili fallback?
- ❓ Možda timeout problem (120s)?
- ❓ Možda network error koji se ignoriše?

**Test Plan:**
1. Otvoriti extension u dev mode (F5)
2. Generate test za neki flow
3. Proveriti VS Code Output Channel za logs
4. Proveriti backend terminal za request logs
5. Pogledati generated test file - da li ima TODOs ili pravi kod?

---

### 4. Dashboard Service ⚠️ (~60%)

**Status:** Works but has CRITICAL BUG

**Implementation:**
```typescript
// apps/vscode-extension/src/services/dashboard.service.ts

async getDashboardData(): Promise<DashboardData> {
  const flows = await this.getFlows();
  const stack = this.getStackInfo();
  const testing = this.getTestingSummary(); // ❌ BUG HERE
  const riskQueue = await this.riskQueueService.getTopRisks();
  
  return { flows, stack, testing, riskQueue };
}

private getTestingSummary(): TestingSummary {
  // 🔴 CRITICAL BUG: Line 244-253
  return {
    coverage: 0,        // ❌ HARDCODED
    coverageGoal,
    totalTests: 0,      // ❌ HARDCODED
    passingTests: 0,    // ❌ HARDCODED
    failingTests: 0,    // ❌ HARDCODED
    flakyTests: 0,      // ❌ HARDCODED
  };
}
```

**BUG #1: Coverage Hardcoded to 0%**
- **File:** `dashboard.service.ts:247`
- **Impact:** 🔴 CRITICAL
- **Fix:** Implementirati coverage parser

**What Works:**
- Flow management (add/delete/update)
- Stack detection
- Risk queue integration
- State persistence

**Missing:**
- ❌ Real coverage data
- ❌ Real test count
- ❌ Pass/fail stats
- ❌ Flaky detection

---

### 5. Dashboard Webview ✅ (~80%)

**Status:** Professional UI, good UX

**Implementation:**
```typescript
// apps/vscode-extension/src/webviews/dashboard.webview.ts

Tabs:
- 📊 Overview (coverage, stats)
- 📚 Flows (test generation)
- 🔥 Risk Queue (files needing tests)

Actions:
- Generate Test (calls TestGenerationService)
- Run Test (calls PlaywrightService)
- Delete Flow
- Add Flow
- Refresh
```

**What Works:**
- Clean UI sa VS Code theme
- Tab navigation
- Flow listing sa status (draft/generated/passing/failing)
- Generate button → Progress notification → Test file opens
- Risk queue display
- Stack badge

**What's Good:**
- Professional design
- Loading states
- Error messages
- Context-aware (backend vs frontend)

**Missing:**
- ❌ Coverage visualization (because 0%)
- ❌ Test execution results display
- ❌ Flaky test indicators
- ❌ Smart test selection UI

---

### 6. Risk Queue Service ⚠️ (~40%)

**Status:** Basic implementation

**Implementation:**
```typescript
// apps/vscode-extension/src/services/risk-queue.service.ts

async getTopRisks(limit = 10): Promise<RiskQueueItem[]> {
  const files = await this.scanSourceFiles();
  const scored = files.map(f => this.calculateRiskScore(f));
  return scored.sort((a, b) => b.riskScore - a.riskScore).slice(0, limit);
}

private calculateRiskScore(file: SourceFile): number {
  let score = 0;
  
  // Factor 1: No test file (40 points)
  if (!file.hasTest) score += 40;
  
  // Factor 2: File size (30 points max)
  score += Math.min(30, file.linesOfCode / 10);
  
  // Factor 3: Import count (20 points max)
  score += Math.min(20, file.importCount * 2);
  
  // Factor 4: TODO/FIXME (10 points)
  score += file.todoCount * 5;
  
  return Math.min(100, score);
}
```

**What Works:**
- File scanning
- Basic risk scoring
- Priority classification (critical/high/medium)
- Integration sa dashboard

**Missing:**
- ❌ Git churn analysis (frequent changes = higher risk)
- ❌ Complexity analysis (cyclomatic complexity)
- ❌ Bug history correlation
- ❌ Business impact scoring (payment, auth, security keywords)
- ❌ Dependency graph analysis

**MVP Plan Says:**
```
Risk score formula:
risk = (no_test * 40) + (complexity * 30) + (churn * 20) + (bug_history * 10)
```

**Current:**
```
risk = (no_test * 40) + (LOC * 30) + (imports * 20) + (todos * 10)
```

---

### 7. Backend API ✅ (~90%)

**Status:** Excellent, fully functional

**Endpoints:**
```
✅ POST /analyze/workspace         - Codebase analysis
✅ POST /analyze/enhanced          - Enhanced analysis
✅ POST /analyze/flows/discover    - AI flow discovery
✅ POST /generate/e2e              - E2E test generation
✅ POST /generate/tests            - Unit test generation
✅ POST /generate/agent            - Agent execution
✅ GET  /system/health             - Health check
```

**AI Provider:**
```
✅ OpenAI configured (GPT-3.5-turbo)
✅ Claude support via AIProviderService
✅ Fallback to mock mode
✅ Error handling
```

**Quality:**
- Clean NestJS architecture
- Good separation of concerns
- Proper error handling
- Logging configured
- Type-safe

---

## ❌ ŠTA NE RADI (Critical Gaps)

### 1. Coverage Parser ❌ (0%)

**Problem:**
```typescript
// dashboard.service.ts:247
return { coverage: 0 }; // Always 0%
```

**What's Needed:**
```typescript
// NEW: coverage-parser.service.ts

export class CoverageParserService {
  async parseCoverage(projectPath: string): Promise<CoverageMap> {
    // 1. Detect tool (Istanbul, c8, Coverlet)
    const tool = this.detectCoverageTool(projectPath);
    
    // 2. Find coverage file
    const coverageFile = this.findCoverageFile(projectPath);
    
    // 3. Parse JSON
    const data = JSON.parse(fs.readFileSync(coverageFile));
    
    // 4. Calculate totals
    return {
      totalCoverage: 67.5,
      linesCovered: 1234,
      linesTotal: 1829,
      files: {
        'src/file.ts': { lines: 85, branches: 75, functions: 90 }
      }
    };
  }
}
```

**Effort:** 1-2 days  
**Priority:** 🔴 CRITICAL

---

### 2. Smart Test Selection ❌ (0%)

**MVP Plan:**
```
Week 3 Goal: Git-aware smart selection
- Git diff analysis (changed files)
- Dependency graph
- Affected tests detection
```

**Current:** Ne postoji

**What's Needed:**
```typescript
// NEW: git-analyzer.service.ts
export class GitAnalyzerService {
  async getChangedFiles(since: string = 'HEAD~1'): Promise<string[]> {
    const { stdout } = await exec('git diff --name-only HEAD~1');
    return stdout.split('\n').filter(Boolean);
  }
}

// NEW: dependency-graph.service.ts
export class DependencyGraphService {
  async buildGraph(projectPath: string): Promise<DependencyGraph> {
    // Parse imports/requires
    // Build graph
    return graph;
  }
  
  getAffectedTests(changedFiles: string[]): string[] {
    // Traverse graph
    // Find test files that import changed files
    return affectedTests;
  }
}
```

**Effort:** 4-5 days  
**Priority:** 🟠 HIGH

---

### 3. Test Health Score ❌ (0%)

**MVP Plan:**
```
Week 4 Goal: Historical tracking
- SQLite DB (local)
- Test run history (last 50 runs)
- Pass rate calculation
- Flaky detection (< 90% pass)
```

**Current:** Ne postoji

**What's Needed:**
```typescript
// NEW: test-history.service.ts
export class TestHistoryService {
  private db: Database; // SQLite

  async recordTestRun(testId: string, result: TestResult) {
    await this.db.run(`
      INSERT INTO test_runs (test_id, status, duration, timestamp)
      VALUES (?, ?, ?, ?)
    `, [testId, result.status, result.duration, Date.now()]);
  }
  
  async getPassRate(testId: string): Promise<number> {
    const runs = await this.getLastRuns(testId, 50);
    const passed = runs.filter(r => r.status === 'pass').length;
    return (passed / runs.length) * 100;
  }
  
  async getFlakyTests(): Promise<FlakyTest[]> {
    // Find tests with pass rate < 90% but > 10%
    // (failing always is not flaky, it's just failing)
  }
}
```

**Effort:** 4-5 days  
**Priority:** 🟠 HIGH

---

### 4. Auto-Fix ❌ (0%)

**MVP Plan:**
```
Week 6-7 Goal: Basic auto-fix
- Detect code changes (rename, signature)
- Identify broken tests
- Generate fix suggestions
```

**Current:** Ne postoji

**Effort:** 3-4 days  
**Priority:** 🟡 MEDIUM (after Smart Selection & Health)

---

### 5. Watch Mode ❌ (0%)

**MVP Plan:**
```
Week 6-7 Goal: Auto test run
- File watching
- Smart debouncing
- Affected tests only
```

**Current:** Ne postoji

**Effort:** 2-3 days  
**Priority:** 🟡 MEDIUM

---

### 6. CodeLens ❌ (0%)

**MVP Plan:**
```
Week 6-7 Goal: In-editor indicators
- Coverage % display
- "Generate test" action
- "Run test" action
```

**Current:** Ne postoji

**Effort:** 2-3 days  
**Priority:** 🟠 HIGH (UX killer feature)

---

## 🧪 TEST PLAN - Verifikacija Trenutnog Stanja

### Test 1: Backend AI Generation ✅
```bash
# Status: ✅ VERIFIED WORKING (via curl)

curl -X POST http://localhost:3001/generate/e2e \
  -H "Content-Type: application/json" \
  -d '{
    "flow": {
      "name": "Login Flow",
      "routes": ["/login"]
    },
    "config": {
      "baseUrl": "http://localhost:3000",
      "selectorPolicy": "testid",
      "framework": "playwright"
    }
  }'

# Result: Real AI code, not skeleton!
```

---

### Test 2: Extension → Backend Integration ❓
```
Status: ❓ NEEDS VERIFICATION

Steps:
1. Open VS Code
2. Press F5 (Debug Extension)
3. Open QAgent dashboard
4. Click "Generate Test" na nekom flow-u
5. Check:
   - VS Code Output Channel logs
   - Backend terminal logs  
   - Generated test file content (TODOs or real code?)

Expected:
- Backend receives POST /generate/e2e
- Returns AI code
- Extension opens file sa real code

Actual:
- ❓ Unknown - TREBA TESTIRATI
```

---

### Test 3: Coverage Display ❌
```
Status: ❌ KNOWN BUG

Steps:
1. Open dashboard
2. Look at Overview tab

Expected:
- Shows real coverage %
- Shows test count

Actual:
- Always shows 0%
- Always shows 0 tests

Root Cause:
- dashboard.service.ts:247 hardcoded 0
```

---

### Test 4: Flow Status Update ❓
```
Status: ❓ NEEDS VERIFICATION

Steps:
1. Generate test za flow (status: "draft")
2. Run test via "Run Test" button
3. Check flow status

Expected:
- Status changes to "passing" or "failing"

Actual:
- ❓ Unknown - MVP plan says it doesn't update
```

---

### Test 5: Risk Queue Accuracy ⚠️
```
Status: ⚠️ PARTIAL

Steps:
1. Open large codebase
2. Check Risk Queue tab

Expected (MVP Plan):
- Git churn considered
- Complexity considered
- Business impact considered

Actual:
- Only basic scoring (LOC + imports + no_test)
- No git integration
- No complexity analysis
```

---

## 🎯 PRIORITIZOVANI AKCIONI PLAN

### 🔴 CRITICAL (Today/This Week)

#### 1. Verify Extension → Backend Integration
```
Effort: 1 hour
Goal: Confirm AI generation works end-to-end

Tasks:
[ ] Open extension in debug mode
[ ] Generate test za flow
[ ] Check logs (VS Code Output + Backend Terminal)
[ ] Verify generated code quality (AI vs fallback)
[ ] Document findings

If Not Working:
[ ] Debug network call
[ ] Check timeout settings (120s enough?)
[ ] Check error handling (swallow errors?)
[ ] Fix connection issues
```

---

#### 2. Fix Coverage Bug
```
Effort: 4-6 hours
Goal: Show real coverage data

Tasks:
[ ] Create coverage-parser.service.ts
[ ] Implement Istanbul/c8 parser (JS/TS)
[ ] Detect coverage file (coverage/coverage-final.json)
[ ] Calculate totals (lines, branches, functions)
[ ] Integrate sa dashboard.service.ts
[ ] Remove hardcoded 0% (line 247)
[ ] Test sa real project

Files:
- NEW: services/coverage-parser.service.ts
- EDIT: dashboard.service.ts (line 244-253)
- EDIT: types/dashboard.types.ts (add CoverageMap)
```

---

#### 3. Add Error Recovery & Progress Saving
```
Effort: 4-6 hours
Goal: Better UX when things fail

Tasks:
[ ] Auto-save onboarding progress every step
[ ] Resume from last checkpoint on restart
[ ] Retry logic sa exponential backoff (3 attempts)
[ ] Better error messages (not just "Generation failed")
[ ] Fallback mode indicator (show if using skeleton)

Files:
- NEW: services/progress-manager.service.ts
- EDIT: onboarding.service.ts
- EDIT: test-generation.service.ts
```

---

### 🟠 HIGH (This Week)

#### 4. Smart Test Selection MVP
```
Effort: 1-2 days
Goal: Run only affected tests

Tasks:
[ ] Create git-analyzer.service.ts
[ ] Implement getChangedFiles()
[ ] Create dependency-graph.service.ts
[ ] Build import graph
[ ] Implement getAffectedTests()
[ ] Add "Run Smart Tests" button sa dashboard-u
[ ] Show time saved estimate

Files:
- NEW: services/git-analyzer.service.ts
- NEW: services/dependency-graph.service.ts  
- NEW: services/test-selector.service.ts
- EDIT: dashboard webview (add button)
```

---

#### 5. Test Health Score v1
```
Effort: 1-2 days
Goal: Track test reliability

Tasks:
[ ] Setup SQLite database (better-sqlite3)
[ ] Create schema (test_runs, test_health tables)
[ ] Implement test-history.service.ts
[ ] Record test runs automatically
[ ] Calculate pass rate (last 50 runs)
[ ] Detect flaky tests (< 90% pass)
[ ] Add health indicators sa dashboard-u

Files:
- NEW: services/test-history.service.ts
- NEW: database/schema.sql
- EDIT: dashboard webview (show health)
- EDIT: types/dashboard.types.ts
```

---

### 🟡 MEDIUM (Next Week)

#### 6. CodeLens MVP
```
Effort: 1-2 days
Goal: In-editor actions

Tasks:
[ ] Create codelens.provider.ts
[ ] Implement CodeLensProvider interface
[ ] Show coverage % above test files
[ ] Add "Generate test" inline action
[ ] Add "Run test" inline action
[ ] Register provider in extension.ts

Files:
- NEW: providers/codelens.provider.ts
- EDIT: extension.ts (register provider)
```

---

#### 7. Watch Mode
```
Effort: 1 day
Goal: Auto-run tests on change

Tasks:
[ ] FileSystemWatcher setup
[ ] Debounce logic (wait 500ms after last change)
[ ] Detect which tests to run (via dependency graph)
[ ] Show notification "Running X tests..."
[ ] Update dashboard after completion

Files:
- NEW: services/watch-mode.service.ts
- EDIT: extension.ts (activate watch mode)
```

---

#### 8. Risk Prioritization Enhancement
```
Effort: 1 day
Goal: Smarter risk scoring

Tasks:
[ ] Git churn analysis (git log --numstat)
[ ] Complexity analysis (simple LOC-based for now)
[ ] Keyword detection (payment, auth, security, critical)
[ ] Update risk score formula
[ ] Sort Risk Queue by new score

Files:
- NEW: services/git-churn-analyzer.service.ts
- EDIT: risk-queue.service.ts (new scoring)
```

---

## 📊 REVISED COMPLETION ESTIMATE

### Current State (Realistic):
```
CATEGORY                    COMPLETION    NOTES
─────────────────────────────────────────────────────────
Backend Infrastructure      90% ✅        Excellent
Extension Core              60% ✅        Solid foundation
Test Generation             70% ⚠️        Backend works, need verification
Coverage Analysis            5% ❌        Hardcoded 0%
Dashboard UI                80% ✅        Professional design
Risk Queue                  40% ⚠️        Basic scoring only
Smart Features               0% ❌        None implemented
Intelligence                 0% ❌        No health, no auto-fix
Team Features                0% ❌        No templates, no analytics

WEIGHTED TOTAL:            ~25% ✅
```

### After CRITICAL Fixes (End of Week):
```
Assuming:
- Backend integration verified ✅
- Coverage parser implemented ✅
- Error recovery added ✅

NEW TOTAL:                 ~35% ✅
```

### After HIGH Priority (Week 2):
```
Assuming:
- Smart test selection ✅
- Test health tracking ✅

NEW TOTAL:                 ~50% ✅
```

### MVP Target (Week 8-10):
```
With remaining features:
- CodeLens ✅
- Watch mode ✅
- Risk enhancement ✅
- Auto-fix MVP ✅

FINAL TOTAL:               ~75% ✅ (MVP Ready)
```

---

## 🚀 IMMEDIATE NEXT STEPS (Right Now)

### Step 1: Test Extension (30 min)
```bash
# 1. Start backend
cd apps/backend
npm run dev

# 2. Open extension project
cd apps/vscode-extension
code .

# 3. Press F5 (Debug Extension)

# 4. Test flow:
- Open QAgent dashboard
- Click "Generate Test"
- Check VS Code Output Channel
- Check backend terminal
- Examine generated test file

# Document:
- Does AI generation work? YES/NO
- What's the actual code quality?
- Any errors in logs?
```

---

### Step 2: Fix Coverage Bug (2-3 hours)
```typescript
// Create: apps/vscode-extension/src/services/coverage-parser.service.ts

import * as fs from 'fs';
import * as path from 'path';

export interface CoverageMap {
  totalCoverage: number;
  linesCovered: number;
  linesTotal: number;
  files: Record<string, FileCoverage>;
}

export interface FileCoverage {
  lines: number;
  branches: number;
  functions: number;
}

export class CoverageParserService {
  async parseCoverage(projectPath: string): Promise<CoverageMap | null> {
    try {
      // 1. Find coverage file
      const coverageFile = this.findCoverageFile(projectPath);
      if (!coverageFile) return null;
      
      // 2. Parse JSON
      const data = JSON.parse(fs.readFileSync(coverageFile, 'utf-8'));
      
      // 3. Calculate totals
      return this.calculateTotals(data);
    } catch (error) {
      console.error('Coverage parse error:', error);
      return null;
    }
  }
  
  private findCoverageFile(projectPath: string): string | null {
    const candidates = [
      path.join(projectPath, 'coverage/coverage-final.json'),
      path.join(projectPath, 'coverage/lcov.info'),
      path.join(projectPath, '.nyc_output/coverage.json'),
    ];
    
    for (const file of candidates) {
      if (fs.existsSync(file)) return file;
    }
    
    return null;
  }
  
  private calculateTotals(data: any): CoverageMap {
    // Istanbul format: { "file.ts": { s: {...}, b: {...}, f: {...} } }
    let linesCovered = 0;
    let linesTotal = 0;
    const files: Record<string, FileCoverage> = {};
    
    for (const [filePath, coverage] of Object.entries(data)) {
      const statements = (coverage as any).s || {};
      const statementMap = (coverage as any).statementMap || {};
      
      const fileLinesTotal = Object.keys(statementMap).length;
      const fileLinesCovered = Object.values(statements).filter(v => v > 0).length;
      
      linesCovered += fileLinesCovered;
      linesTotal += fileLinesTotal;
      
      files[filePath] = {
        lines: fileLinesTotal > 0 ? (fileLinesCovered / fileLinesTotal) * 100 : 0,
        branches: 0, // TODO
        functions: 0, // TODO
      };
    }
    
    return {
      totalCoverage: linesTotal > 0 ? (linesCovered / linesTotal) * 100 : 0,
      linesCovered,
      linesTotal,
      files,
    };
  }
}
```

```typescript
// Edit: dashboard.service.ts

import { CoverageParserService } from './coverage-parser.service';

export class DashboardService {
  private coverageParser: CoverageParserService;
  
  constructor(private context: vscode.ExtensionContext) {
    this.riskQueueService = new RiskQueueService(context);
    this.coverageParser = new CoverageParserService(); // NEW
  }
  
  private async getTestingSummary(): Promise<TestingSummary> {
    const coverageGoal = vscode.workspace.getConfiguration('qagenai')
      .get<number>('coverageGoal') || 80;
    
    // NEW: Try to get real coverage
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (workspacePath) {
      const coverage = await this.coverageParser.parseCoverage(workspacePath);
      if (coverage) {
        return {
          coverage: Math.round(coverage.totalCoverage),
          coverageGoal,
          totalTests: 0, // TODO: count test files
          passingTests: 0, // TODO: need test execution results
          failingTests: 0,
          flakyTests: 0,
        };
      }
    }
    
    // Fallback: return 0 if no coverage file
    return {
      coverage: 0,
      coverageGoal,
      totalTests: 0,
      passingTests: 0,
      failingTests: 0,
      flakyTests: 0,
    };
  }
}
```

---

### Step 3: Add Loading States (30 min)
```typescript
// Edit: dashboard.webview.ts (improve generateFlowTest)

private async generateFlowTest(flowId: string): Promise<void> {
  const flow = this.data?.flows.items.find(f => f.id === flowId);
  if (!flow) return;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Generating test: ${flow.name}`,
      cancellable: false,
    },
    async (progress) => {
      progress.report({ increment: 0, message: 'Analyzing flow...' });
      
      // Call backend
      progress.report({ increment: 30, message: 'Calling AI (may take 30s)...' });
      const result = await this.testGenerationService.generateE2ETest(flow);
      
      if (!result.success || !result.code) {
        vscode.window.showErrorMessage(
          `❌ Generation failed: ${result.error || 'Unknown error'}\n\n` +
          `Tip: Check VS Code Output Channel (View → Output → QAgenAI)`
        );
        return;
      }
      
      // Check if AI or fallback
      progress.report({ increment: 50, message: 'Opening editor...' });
      
      await this.testGenerationService.showGeneratedTest(
        result.code,
        result.filename || `${flow.name}.spec.ts`
      );
      
      // Update status
      await this.dashboardService.updateFlow(flowId, { status: 'generated' });
      await this.refresh();
      
      progress.report({ increment: 20, message: 'Done!' });
      
      // Show success with info about mode
      vscode.window.showInformationMessage(
        `✅ Test generated successfully!\n` +
        `Mode: ${result._meta?.mode || 'unknown'}`
      );
    }
  );
}
```

---

## ✅ SUCCESS CRITERIA

### Today (End of Day):
- [ ] Backend integration verified (AI generation works)
- [ ] Coverage bug fixed (shows real %)
- [ ] Better error messages added
- [ ] All findings documented

### End of Week:
- [ ] Smart test selection working
- [ ] Test health tracking started (DB setup)
- [ ] Risk scoring improved (git churn)

### MVP Ready (Week 8-10):
- [ ] All 🔴 CRITICAL fixes done
- [ ] All 🟠 HIGH features done
- [ ] CodeLens working
- [ ] Watch mode working
- [ ] Auto-fix MVP
- [ ] ~75% completion

---

## 📝 NOTES

### Pozitivno:
1. Backend je odličan - čist kod, dobra arhitektura
2. Extension struktura je solidna - lako dodavati nove feature
3. UI je profesionalan - VS Code theme integration
4. AI generation backend radi (verified sa curl)

### Negativno:
1. Coverage bug je CRITICAL ali lako rešiv
2. Ne znamo da li extension stvarno koristi AI (needs testing)
3. Intelligence features su 0% (nije započeto)
4. Progress tracking je loš (no auto-save, no retry)

### Rizici:
1. Ako backend integration ne radi → 2-3 dana debug
2. Ako coverage parser složen → 3-4 dana umesto 1-2
3. Ako smart test selection složen → 5-7 dana umesto 4-5

---

**NEXT ACTION: Test extension end-to-end! (30 min)**

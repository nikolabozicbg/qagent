# 🔌 QAgent Desktop App - Backend Integration Analysis

**Date:** 2026-01-05  
**Status:** Integration Gap Analysis  
**Goal:** Complete UI according to `electron_product.md` spec

---

## 📊 EXECUTIVE SUMMARY

### Current Integration Status: **~60% Complete**

```
✅ CONNECTED:
   - Onboarding flow (4 screens)
   - Project detection
   - Flow discovery
   - Basic dashboard data
   - Test generation (API call exists)

⚠️ PARTIAL:
   - Dashboard metrics (mock data fallback)
   - Test execution (API exists, UI incomplete)
   - Flow details (uses enriched data, but missing API call)

❌ MISSING:
   - Real-time test execution UI (Screen 10)
   - Test generation progress modal (Screen 8)
   - Test preview with Monaco editor (Screen 9)
   - Command palette full implementation (Screen 11)
   - Coverage visualization
   - Health trends data
   - Recent activity from backend
```

---

## 🔗 BACKEND API ENDPOINTS - CURRENT STATUS

### ✅ **CONNECTED ENDPOINTS**

| Endpoint | Method | Used In | Status |
|----------|--------|---------|--------|
| `/health` | GET | `apiService.healthCheck()` | ✅ Connected |
| `/analyze/enhanced` | POST | `ProjectDetection.tsx` | ✅ Connected |
| `/analyze/journeys/discover-and-enrich` | POST | `SmartDiscovery.tsx` | ✅ Connected |
| `/flows` | GET | `AppContext.tsx`, `Dashboard.tsx` | ✅ Connected |
| `/metrics/dashboard` | GET | `AppContext.tsx` | ✅ Connected |
| `/activity/recent` | GET | `AppContext.tsx` | ✅ Connected |
| `/test/generate` | POST | `TestGenerationModal.tsx`, `FlowsList.tsx` | ✅ Connected |
| `/test/run` | POST | `TestRunnerModal.tsx`, `FlowsList.tsx` | ✅ Connected |
| `/test/results` | GET | `TestResults.tsx` | ✅ Connected |
| `/config` | GET | `Settings.tsx` | ✅ Connected |
| `/config/save` | POST | `Settings.tsx` | ✅ Connected |

### ⚠️ **PARTIALLY CONNECTED**

| Endpoint | Method | Used In | Issue |
|----------|--------|---------|-------|
| `/flows/:flowId` | GET | `FlowDetail.tsx` | ❌ Not called - uses AppContext flows |
| `/analyze/generate-test` | POST | N/A | ❌ Not used - should be for Screen 8/9 |

### ❌ **MISSING ENDPOINTS** (Need Backend Implementation)

| Endpoint | Method | Needed For | Priority |
|----------|--------|------------|----------|
| `/test/run/stream` | WebSocket | Screen 10 (Live execution) | 🔴 HIGH |
| `/test/generate/stream` | WebSocket | Screen 8 (Generation progress) | 🔴 HIGH |
| `/coverage` | GET | Dashboard coverage | 🟠 HIGH |
| `/health/score` | GET | Dashboard health score | 🟠 MEDIUM |
| `/flows/:flowId/insights` | GET | FlowDetail AI insights | 🟡 MEDIUM |

---

## 📱 SCREEN-BY-SCREEN ANALYSIS

### ✅ **SCREEN 1: Onboarding Welcome**
**Status:** ✅ **COMPLETE**  
**Backend:** None needed  
**Issues:** None

---

### ✅ **SCREEN 2: Project Detection**
**Status:** ✅ **COMPLETE**  
**Backend:** ✅ `POST /analyze/enhanced`  
**WebSocket:** ✅ `progress`, `tech-detected` events  
**Issues:** None

**Implementation:**
```typescript
// apps/desktop/src/screens/ProjectDetection.tsx:88
const result = await apiService.analyzeWorkspace(projectPath!);
```

---

### ✅ **SCREEN 3: Configuration**
**Status:** ✅ **COMPLETE**  
**Backend:** ✅ `GET /config`, `POST /config/save`  
**Issues:** None

**Implementation:**
```typescript
// apps/desktop/src/screens/Configuration.tsx:25
const result = await apiService.testConnection(baseUrl);
```

---

### ✅ **SCREEN 4a/4b: Smart Discovery**
**Status:** ✅ **COMPLETE**  
**Backend:** ✅ `POST /analyze/journeys/discover-and-enrich`  
**WebSocket:** ✅ `progress`, `complete` events  
**Issues:** None

**Implementation:**
```typescript
// apps/desktop/src/screens/SmartDiscovery.tsx:101
const result = await apiService.discoverAndEnrichJourneys({...});
```

---

### ⚠️ **SCREEN 5: Dashboard**
**Status:** ⚠️ **PARTIAL** (70% complete)

**Connected:**
- ✅ Flows list (`GET /flows`)
- ✅ Basic metrics (`GET /metrics/dashboard`)
- ✅ Recent activity (`GET /activity/recent`)

**Missing/Incomplete:**
- ❌ **Real coverage data** - Uses mock/hardcoded values
- ❌ **Health trends** - No backend endpoint
- ❌ **Coverage breakdown by priority** - No backend data
- ❌ **AI Co-pilot suggestions** - Static mock data
- ❌ **Impact metrics** (users/day, revenue) - Not in backend response
- ❌ **Test health trends** (7 days) - No historical data endpoint
- ❌ **Floating action button** - Exists but not fully functional

**Backend Needed:**
```typescript
// MISSING ENDPOINTS:
GET /metrics/coverage?projectPath=...
GET /metrics/health-trends?projectPath=...&days=7
GET /metrics/coverage-breakdown?projectPath=...
GET /ai/suggestions?projectPath=...
```

**Current Implementation:**
```typescript
// apps/desktop/src/contexts/AppContext.tsx:252-256
const [flowsData, metricsData, activityData] = await Promise.all([
  apiService.getFlows(selectedProjectPath),
  apiService.getDashboardMetrics(selectedProjectPath),
  apiService.getRecentActivity(selectedProjectPath, 10),
]);
```

---

### ✅ **SCREEN 6: Flows List**
**Status:** ✅ **COMPLETE**  
**Backend:** ✅ `GET /flows`  
**Actions:** ✅ Generate test, Run test  
**Issues:** None

**Implementation:**
```typescript
// apps/desktop/src/screens/FlowsList.tsx:276
await apiService.generateTestForFlow({...});
```

---

### ⚠️ **SCREEN 7: Flow Detail**
**Status:** ⚠️ **PARTIAL** (80% complete)

**Connected:**
- ✅ Flow data from AppContext (from discovery)
- ✅ Enriched data display
- ✅ Component analysis
- ✅ AI insights (generated from enriched data)

**Missing:**
- ❌ **API call to get single flow** - Should call `GET /flows/:flowId`
- ❌ **Source code viewer** - "View Source Code" button doesn't work
- ❌ **Test data from seed** - Uses enriched data, but not real seed data
- ❌ **Generate test button** - Exists but doesn't open modal properly

**Backend Needed:**
```typescript
// MISSING:
GET /flows/:flowId?projectPath=...
GET /flows/:flowId/source-code?projectPath=...
GET /flows/:flowId/test-data?projectPath=...
```

**Current Implementation:**
```typescript
// apps/desktop/src/screens/FlowDetail.tsx:147
// Uses flows from AppContext, not API call
const foundFlow = flows.find(f => f.id === flowId);
```

---

### ❌ **SCREEN 8: Test Generation Progress**
**Status:** ❌ **MISSING** (Modal exists but incomplete)

**Current State:**
- ✅ Modal component exists (`TestGenerationModal.tsx`)
- ✅ WebSocket listeners setup
- ✅ Progress bar UI
- ✅ Step-by-step status

**Missing:**
- ❌ **Real-time progress from backend** - WebSocket events not implemented
- ❌ **Smart decisions display** - Not shown
- ❌ **Cancel functionality** - Not implemented
- ❌ **Backend endpoint** - Should use `POST /analyze/generate-test` with streaming

**Backend Needed:**
```typescript
// MISSING:
POST /analyze/generate-test (with WebSocket streaming)
WebSocket: test:generation:progress
WebSocket: test:generation:step
WebSocket: test:generation:decision
```

**Current Implementation:**
```typescript
// apps/desktop/src/components/TestGenerationModal.tsx:125
await apiService.generateTestForFlow({...});
// Uses /test/generate, not /analyze/generate-test
```

---

### ❌ **SCREEN 9: Test Generation Complete**
**Status:** ❌ **MISSING** (Partially in modal)

**Current State:**
- ✅ Code preview exists (basic `<pre>` tag)
- ✅ Save functionality exists

**Missing:**
- ❌ **Monaco Editor** - Not implemented (spec requires Monaco)
- ❌ **Test cases summary** - Not displayed
- ❌ **Expandable code view** - Not implemented
- ❌ **Save options checkboxes** - Not implemented
- ❌ **Edit before save** - Not implemented
- ❌ **File stats** (lines, test cases, assertions) - Not shown

**Backend Response Needed:**
```typescript
// Current response from /test/generate:
{
  code: string,
  filename: string
}

// Needed response:
{
  code: string,
  filename: string,
  stats: {
    lines: number,
    testCases: number,
    assertions: number
  },
  testCases: Array<{
    name: string,
    type: 'happy-path' | 'validation' | 'error' | 'edge-case'
  }>,
  _meta: {
    mode: 'openai' | 'fallback',
    duration: number
  }
}
```

---

### ❌ **SCREEN 10: Test Execution**
**Status:** ❌ **MISSING** (Modal exists but incomplete)

**Current State:**
- ✅ Modal component exists (`TestRunnerModal.tsx`)
- ✅ Basic test list display
- ✅ WebSocket listeners setup

**Missing:**
- ❌ **Live console output** - Not implemented
- ❌ **Network waterfall view** - Not implemented
- ❌ **Artifacts counter** - Not implemented
- ❌ **Pause/stop controls** - Not implemented
- ❌ **Real-time test progress** - WebSocket events not working
- ❌ **Screenshots/videos display** - Not implemented

**Backend Needed:**
```typescript
// MISSING:
POST /test/run/stream (WebSocket streaming)
WebSocket: test:run:console (live console output)
WebSocket: test:run:network (network requests)
WebSocket: test:run:artifact (screenshots, videos)
GET /test/results/:testId/artifacts
```

**Current Implementation:**
```typescript
// apps/desktop/src/components/TestRunnerModal.tsx:93
await apiService.runTests({...});
// Uses /test/run, but no streaming support
```

---

### ⚠️ **SCREEN 11: Command Palette**
**Status:** ⚠️ **PARTIAL** (60% complete)

**Current State:**
- ✅ Component exists (`KeyboardShortcuts.tsx`)
- ✅ ⌘K opens palette
- ✅ Basic commands work
- ✅ Keyboard shortcuts implemented

**Missing:**
- ❌ **Fuzzy search** - Basic filter only
- ❌ **Recent commands** - Not tracked
- ❌ **Categorized actions** - All flat
- ❌ **More commands** - Missing many from spec:
  - `⌘G` Generate Test for Flow
  - `⌘R` Run All Tests
  - `⌘D` Run Smart Discovery
  - `⌘A` View Analytics
  - `⌘⇧R` Refresh Dashboard
  - `⌘O` Change Project

**Current Implementation:**
```typescript
// apps/desktop/src/components/KeyboardShortcuts.tsx:17
const commands = [
  { id: 'dashboard', label: 'Go to Dashboard', shortcut: '⌘1', ... },
  // Missing many commands from spec
];
```

---

### ✅ **SCREEN 12: Settings**
**Status:** ✅ **COMPLETE**  
**Backend:** ✅ `GET /config`, `POST /config/save`  
**Issues:** None

---

## 🔴 CRITICAL MISSING FEATURES

### 1. **Test Generation Progress (Screen 8)**
**Priority:** 🔴 CRITICAL  
**Effort:** 2-3 days

**What's Missing:**
- Real-time WebSocket progress
- Smart decisions display
- Cancel functionality
- Step-by-step status updates

**Backend Changes Needed:**
```typescript
// Backend needs to emit WebSocket events:
socket.emit('test:generation:progress', {
  step: 'Writing validation tests...',
  percentage: 78,
  message: 'Current: Writing validation tests...'
});

socket.emit('test:generation:decision', {
  decision: 'Using [name] selectors (most stable)',
  reason: 'More stable than CSS selectors'
});
```

**Frontend Changes Needed:**
```typescript
// apps/desktop/src/components/TestGenerationModal.tsx
// Add smart decisions section
<div className="space-y-2">
  {smartDecisions.map((decision, i) => (
    <div key={i} className="text-xs text-white/60">
      • {decision}
    </div>
  ))}
</div>
```

---

### 2. **Test Execution Live View (Screen 10)**
**Priority:** 🔴 CRITICAL  
**Effort:** 3-4 days

**What's Missing:**
- Live console output stream
- Network waterfall view
- Artifacts display (screenshots, videos)
- Pause/stop controls

**Backend Changes Needed:**
```typescript
// Backend needs to stream:
socket.emit('test:run:console', {
  timestamp: '11:24:32',
  level: 'info',
  message: 'Navigating to /signin'
});

socket.emit('test:run:network', {
  method: 'POST',
  url: '/users/login',
  status: 200,
  duration: 142
});

socket.emit('test:run:artifact', {
  type: 'screenshot',
  path: '/artifacts/screenshot.png',
  testId: 'test-123'
});
```

**Frontend Changes Needed:**
```typescript
// apps/desktop/src/components/TestRunnerModal.tsx
// Add console output section
<div className="glass rounded-lg p-4 max-h-64 overflow-auto">
  {consoleOutput.map((log, i) => (
    <div key={i} className="text-xs font-mono">
      [{log.timestamp}] {log.message}
    </div>
  ))}
</div>

// Add network waterfall
<div className="space-y-1">
  {networkRequests.map((req, i) => (
    <div key={i} className="flex items-center gap-2 text-xs">
      <span>{req.method}</span>
      <span className="flex-1">{req.url}</span>
      <span>{req.status}</span>
      <span>{req.duration}ms</span>
    </div>
  ))}
</div>
```

---

### 3. **Monaco Editor for Test Preview (Screen 9)**
**Priority:** 🟠 HIGH  
**Effort:** 1-2 days

**What's Missing:**
- Monaco Editor integration
- Syntax highlighting
- Code editing capability
- Expandable view

**Implementation:**
```typescript
// Install: @monaco-editor/react
import Editor from '@monaco-editor/react';

<Editor
  height="400px"
  language="typescript"
  value={generatedCode}
  onChange={setGeneratedCode}
  theme="vs-dark"
  options={{
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    readOnly: false
  }}
/>
```

---

### 4. **Dashboard Real Data**
**Priority:** 🟠 HIGH  
**Effort:** 2-3 days

**What's Missing:**
- Real coverage data (not 0%)
- Health trends (7 days)
- Coverage breakdown by priority
- AI Co-pilot suggestions from backend

**Backend Needed:**
```typescript
// MISSING ENDPOINTS:
GET /metrics/coverage?projectPath=...
GET /metrics/health-trends?projectPath=...&days=7
GET /ai/suggestions?projectPath=...
```

**Frontend Changes:**
```typescript
// apps/desktop/src/contexts/AppContext.tsx
const [coverageData, healthTrends, aiSuggestions] = await Promise.all([
  apiService.getCoverage(selectedProjectPath),
  apiService.getHealthTrends(selectedProjectPath, 7),
  apiService.getAISuggestions(selectedProjectPath),
]);
```

---

### 5. **Flow Detail API Integration**
**Priority:** 🟡 MEDIUM  
**Effort:** 1 day

**What's Missing:**
- API call to get single flow details
- Source code viewer
- Test data from seed

**Backend Needed:**
```typescript
GET /flows/:flowId?projectPath=...
GET /flows/:flowId/source-code?projectPath=...
```

**Frontend Changes:**
```typescript
// apps/desktop/src/screens/FlowDetail.tsx
useEffect(() => {
  if (flowId) {
    apiService.getFlow(flowId).then(setFlow);
  }
}, [flowId]);
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Critical Features (Week 1)
- [ ] **Test Generation Progress** (Screen 8)
  - [ ] WebSocket streaming integration
  - [ ] Smart decisions display
  - [ ] Cancel functionality
  - [ ] Step-by-step progress

- [ ] **Test Execution Live View** (Screen 10)
  - [ ] Live console output
  - [ ] Network waterfall
  - [ ] Artifacts display
  - [ ] Pause/stop controls

### Phase 2: High Priority (Week 2)
- [ ] **Monaco Editor** (Screen 9)
  - [ ] Install @monaco-editor/react
  - [ ] Code preview with editing
  - [ ] Test cases summary
  - [ ] Save options

- [ ] **Dashboard Real Data**
  - [ ] Coverage API integration
  - [ ] Health trends API
  - [ ] AI suggestions API
  - [ ] Coverage breakdown

### Phase 3: Medium Priority (Week 3)
- [ ] **Flow Detail API**
  - [ ] Single flow endpoint
  - [ ] Source code viewer
  - [ ] Test data integration

- [ ] **Command Palette Enhancement**
  - [ ] Fuzzy search
  - [ ] Recent commands
  - [ ] More commands
  - [ ] Categorized actions

---

## 🔧 BACKEND ENDPOINTS TO IMPLEMENT

### High Priority
```typescript
// 1. Test Generation Streaming
POST /analyze/generate-test
WebSocket: test:generation:progress
WebSocket: test:generation:step
WebSocket: test:generation:decision
WebSocket: test:generation:complete

// 2. Test Execution Streaming
POST /test/run/stream
WebSocket: test:run:console
WebSocket: test:run:network
WebSocket: test:run:artifact
WebSocket: test:run:complete

// 3. Coverage Data
GET /metrics/coverage?projectPath=...
Response: {
  totalCoverage: 73,
  linesCovered: 1234,
  linesTotal: 1829,
  breakdown: {
    critical: 89,
    high: 78,
    medium: 45,
    low: 23
  }
}

// 4. Health Trends
GET /metrics/health-trends?projectPath=...&days=7
Response: {
  passRate: [94, 92, 93, 94, 95, 94, 94],
  avgTime: [8.2, 8.5, 8.1, 8.0, 8.3, 8.2, 8.2],
  flakiness: [3, 4, 3, 2, 3, 3, 3],
  dates: ['2026-01-01', ...]
}

// 5. AI Suggestions
GET /ai/suggestions?projectPath=...
Response: {
  suggestions: [
    {
      type: 'missing-test',
      flow: 'User Login',
      message: 'Login flow missing error handling tests',
      action: 'generate-test',
      priority: 'high'
    }
  ]
}
```

### Medium Priority
```typescript
// 6. Single Flow Details
GET /flows/:flowId?projectPath=...
Response: {
  id: string,
  name: string,
  ...full flow details
}

// 7. Flow Source Code
GET /flows/:flowId/source-code?projectPath=...
Response: {
  components: [
    {
      name: 'LoginForm.tsx',
      code: '...',
      path: 'src/components/LoginForm.tsx'
    }
  ]
}

// 8. Flow Test Data
GET /flows/:flowId/test-data?projectPath=...
Response: {
  seedData: {
    username: 'admin@test.com',
    password: 'Test1234!'
  },
  suggestions: [...]
}
```

---

## 🎯 PRIORITY MATRIX

```
╔═══════════════════════════════════════════════════════════════╗
║  FEATURE                    PRIORITY    EFFORT    BACKEND     ║
╠═══════════════════════════════════════════════════════════════╣
║  Test Generation Progress   🔴 HIGH     2-3d      ✅ Needed   ║
║  Test Execution Live        🔴 HIGH     3-4d      ✅ Needed   ║
║  Monaco Editor              🟠 HIGH     1-2d      ❌ None     ║
║  Dashboard Real Data        🟠 HIGH     2-3d      ✅ Needed   ║
║  Flow Detail API            🟡 MEDIUM    1d        ✅ Needed   ║
║  Command Palette Enhance    🟡 MEDIUM    1-2d      ❌ None     ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 📊 COMPLETION STATUS BY SCREEN

```
SCREEN                          STATUS      BACKEND    FRONTEND
─────────────────────────────────────────────────────────────────
1. Onboarding Welcome          ✅ 100%     ✅         ✅
2. Project Detection           ✅ 100%     ✅         ✅
3. Configuration              ✅ 100%     ✅         ✅
4. Smart Discovery            ✅ 100%     ✅         ✅
5. Dashboard                  ⚠️  70%     ⚠️         ⚠️
6. Flows List                 ✅ 100%     ✅         ✅
7. Flow Detail                ⚠️  80%     ⚠️         ⚠️
8. Test Generation Progress   ❌  40%     ❌         ⚠️
9. Test Generation Complete   ❌  50%     ⚠️         ⚠️
10. Test Execution            ❌  30%     ❌         ⚠️
11. Command Palette           ⚠️  60%     ❌         ⚠️
12. Settings                  ✅ 100%     ✅         ✅
─────────────────────────────────────────────────────────────────
OVERALL:                       ⚠️  70%     ⚠️  75%     ⚠️  65%
```

---

## 🚀 QUICK WINS (Can Do Today)

1. **Add Monaco Editor** (2 hours)
   ```bash
   npm install @monaco-editor/react
   # Replace <pre> with <Editor> in TestGenerationModal
   ```

2. **Add Test Cases Summary** (1 hour)
   ```typescript
   // Parse generated code to extract test cases
   const testCases = extractTestCases(generatedCode);
   ```

3. **Enhance Command Palette** (2 hours)
   ```typescript
   // Add missing commands
   // Implement fuzzy search (use fuse.js)
   ```

4. **Flow Detail API Call** (1 hour)
   ```typescript
   // Call GET /flows/:flowId instead of using AppContext
   ```

---

## 📝 NEXT STEPS

### Immediate (This Week)
1. ✅ Complete Screen 8 (Test Generation Progress)
2. ✅ Complete Screen 10 (Test Execution)
3. ✅ Add Monaco Editor (Screen 9)
4. ✅ Integrate real coverage data (Dashboard)

### Short-term (Next Week)
1. ✅ Flow Detail API integration
2. ✅ Command Palette enhancements
3. ✅ Dashboard health trends
4. ✅ AI Co-pilot suggestions

### Backend Tasks
1. ✅ Implement WebSocket streaming for test generation
2. ✅ Implement WebSocket streaming for test execution
3. ✅ Add coverage endpoints
4. ✅ Add health trends endpoint
5. ✅ Add AI suggestions endpoint

---

**Last Updated:** 2026-01-05  
**Next Review:** After Phase 1 completion


# ⚡ QAgent Desktop - Quick Integration Reference

**Quick lookup:** What's connected, what's missing, what to implement next

---

## 🔗 API ENDPOINTS STATUS

### ✅ Fully Connected
```
✅ GET  /health
✅ POST /analyze/enhanced
✅ POST /analyze/journeys/discover-and-enrich
✅ GET  /flows
✅ GET  /metrics/dashboard
✅ GET  /activity/recent
✅ POST /test/generate
✅ POST /test/run
✅ GET  /test/results
✅ GET  /config
✅ POST /config/save
```

### ⚠️ Partially Connected
```
⚠️ GET  /flows/:flowId          → Exists but not called
⚠️ POST /analyze/generate-test  → Exists but not used
```

### ❌ Missing (Need Backend)
```
❌ GET  /metrics/coverage
❌ GET  /metrics/health-trends
❌ GET  /ai/suggestions
❌ GET  /flows/:flowId/source-code
❌ GET  /flows/:flowId/test-data
❌ POST /test/run/stream        (WebSocket)
❌ POST /analyze/generate-test/stream (WebSocket)
```

---

## 📱 SCREENS STATUS

| Screen | Status | Backend | Frontend | Priority |
|--------|--------|---------|----------|----------|
| 1. Welcome | ✅ 100% | ✅ | ✅ | - |
| 2. Detection | ✅ 100% | ✅ | ✅ | - |
| 3. Config | ✅ 100% | ✅ | ✅ | - |
| 4. Discovery | ✅ 100% | ✅ | ✅ | - |
| 5. Dashboard | ⚠️ 70% | ⚠️ | ⚠️ | 🔴 HIGH |
| 6. Flows List | ✅ 100% | ✅ | ✅ | - |
| 7. Flow Detail | ⚠️ 80% | ⚠️ | ⚠️ | 🟡 MEDIUM |
| 8. Gen Progress | ❌ 40% | ❌ | ⚠️ | 🔴 CRITICAL |
| 9. Gen Complete | ❌ 50% | ⚠️ | ⚠️ | 🟠 HIGH |
| 10. Execution | ❌ 30% | ❌ | ⚠️ | 🔴 CRITICAL |
| 11. Command ⌘K | ⚠️ 60% | ❌ | ⚠️ | 🟡 MEDIUM |
| 12. Settings | ✅ 100% | ✅ | ✅ | - |

---

## 🎯 TOP 5 PRIORITIES

### 1. Test Generation Progress (Screen 8)
**Why:** Core feature, users need feedback  
**Effort:** 2-3 days  
**Backend:** WebSocket streaming  
**Frontend:** Progress UI exists, needs WebSocket integration

### 2. Test Execution Live (Screen 10)
**Why:** Core feature, users need to see results  
**Effort:** 3-4 days  
**Backend:** WebSocket streaming + artifacts  
**Frontend:** Basic UI exists, needs console/network views

### 3. Monaco Editor (Screen 9)
**Why:** Better UX for code preview  
**Effort:** 1-2 days  
**Backend:** None needed  
**Frontend:** Replace `<pre>` with Monaco

### 4. Dashboard Real Data
**Why:** Currently shows mock data  
**Effort:** 2-3 days  
**Backend:** Coverage + health trends endpoints  
**Frontend:** Replace mock with API calls

### 5. Flow Detail API
**Why:** Currently uses AppContext, should use API  
**Effort:** 1 day  
**Backend:** Single flow endpoint  
**Frontend:** Call API instead of AppContext

---

## 🔧 QUICK FIXES (Can Do Now)

### Fix 1: Add Monaco Editor (30 min)
```bash
cd apps/desktop
npm install @monaco-editor/react
```

```typescript
// apps/desktop/src/components/TestGenerationModal.tsx
import Editor from '@monaco-editor/react';

// Replace <pre> tag with:
<Editor
  height="400px"
  language="typescript"
  value={generatedCode}
  onChange={setGeneratedCode}
  theme="vs-dark"
/>
```

### Fix 2: Call Flow Detail API (15 min)
```typescript
// apps/desktop/src/screens/FlowDetail.tsx
useEffect(() => {
  if (flowId && selectedProjectPath) {
    apiService.getFlow(flowId).then(setFlow);
  }
}, [flowId, selectedProjectPath]);
```

### Fix 3: Add Test Cases Summary (30 min)
```typescript
// Parse generated code to extract test cases
const extractTestCases = (code: string) => {
  const testRegex = /test\(['"](.*?)['"]/g;
  const matches = [...code.matchAll(testRegex)];
  return matches.map(m => ({ name: m[1], type: 'test' }));
};
```

---

## 📊 BACKEND RESPONSE FORMATS

### Current vs Needed

#### Dashboard Metrics
```typescript
// CURRENT (from /metrics/dashboard)
{
  totalFlows: 24,
  testsGenerated: 92,
  testsPassing: 87,
  coverage: 0  // ❌ Hardcoded
}

// NEEDED
{
  totalFlows: 24,
  testsGenerated: 92,
  testsPassing: 87,
  coverage: 73,  // ✅ Real data
  healthScore: 87,
  trends: {
    passRate: [94, 92, 93, ...],
    avgTime: [8.2, 8.5, ...],
    flakiness: [3, 4, ...]
  },
  breakdown: {
    critical: 89,
    high: 78,
    medium: 45,
    low: 23
  }
}
```

#### Test Generation
```typescript
// CURRENT (from /test/generate)
{
  code: string,
  filename: string
}

// NEEDED (for Screen 9)
{
  code: string,
  filename: string,
  stats: {
    lines: 234,
    testCases: 8,
    assertions: 23
  },
  testCases: [
    { name: 'Happy path - successful login', type: 'happy-path' },
    { name: 'Validation - empty username', type: 'validation' },
    ...
  ],
  _meta: {
    mode: 'openai',
    duration: 2.5
  }
}
```

---

## 🚨 CRITICAL GAPS

### Gap 1: WebSocket Streaming
**Problem:** Test generation/execution don't stream progress  
**Impact:** Users see spinner, no feedback  
**Fix:** Backend needs WebSocket events

### Gap 2: Coverage Data
**Problem:** Dashboard shows 0% coverage  
**Impact:** Misleading metrics  
**Fix:** Backend needs coverage parser + endpoint

### Gap 3: Test Execution UI
**Problem:** No live console, no network view  
**Impact:** Can't debug test failures  
**Fix:** WebSocket streaming + UI components

---

## 📝 IMPLEMENTATION ORDER

### Week 1: Critical
1. ✅ Test Generation Progress (WebSocket)
2. ✅ Test Execution Live (WebSocket)
3. ✅ Monaco Editor

### Week 2: High Priority
1. ✅ Dashboard Real Data
2. ✅ Flow Detail API
3. ✅ Test Cases Summary

### Week 3: Polish
1. ✅ Command Palette Enhance
2. ✅ Source Code Viewer
3. ✅ Artifacts Display

---

**Quick Start:** See `ELECTRON_BACKEND_INTEGRATION.md` for detailed analysis


# 🎨 Complete Suite Flow - All Screens Visual Mockup

## 📡 API Information

### Current API Endpoint:
```http
POST http://localhost:3001/analyze/suites/discover
Content-Type: application/json

{
  "workspacePath": "/path/to/project"
}
```

### Response Structure:
```typescript
{
  success: boolean;
  suites: TestSuite[];        // Array of test suites
  totalCases: number;         // Total test cases across all suites
  totalSteps: number;         // Total test steps
  analysisTime: number;       // Time taken (ms)
  metadata: {
    analysisLayers: string[];
    coverage: {
      routes: { total: number; covered: number };
      components: { total: number; covered: number };
      apis: { total: number; covered: number };
    }
  }
}
```

### Desktop Service Call:
**File:** `apps/desktop/src/services/api.ts`
```typescript
// Line 41-48
async discoverTestSuites(projectPath: string): Promise<SuiteDiscoveryResult> {
  const response = await this.client.post<SuiteDiscoveryResult>(
    '/analyze/suites/discover',
    { workspacePath: projectPath },
    { timeout: 180000 } // 3 minutes
  );
  return response.data;
}
```

---

## Screen 1: WELCOME (Setup Step 1)

```
┌─────────────────────────────────────────────────────────────────┐
│  QAgent                                          ─  □  ✕       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Progress: [●][○][○][○]                                         │
│            1  2  3  4                                            │
│                                                                  │
│                                                                  │
│                    🎯 QAgent                                     │
│                                                                  │
│                Intelligent Test Suite Discovery                 │
│                                                                  │
│                                                                  │
│           ┌──────────────────────────────────────┐              │
│           │  Automatically discover and generate │              │
│           │  comprehensive test suites from your │              │
│           │  application's structure.            │              │
│           └──────────────────────────────────────┘              │
│                                                                  │
│                                                                  │
│                  [Get Started →]                                │
│                                                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Screen 2: DETECTION (Setup Step 2)

```
┌─────────────────────────────────────────────────────────────────┐
│  QAgent                                          ─  □  ✕       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Progress: [●][●][○][○]                                         │
│            1  2  3  4                                            │
│                                                                  │
│                                                                  │
│              📁 Select Project Folder                           │
│                                                                  │
│                                                                  │
│    ┌──────────────────────────────────────────────────┐        │
│    │                                                   │        │
│    │  Selected Path:                                  │        │
│    │  /Users/me/projects/my-awesome-app               │        │
│    │                                          [📂]     │        │
│    │                                                   │        │
│    │  Detected: React + TypeScript                    │        │
│    │  Routes: 15 • Components: 42 • APIs: 28         │        │
│    │                                                   │        │
│    └──────────────────────────────────────────────────┘        │
│                                                                  │
│    💡 Tip: We'll analyze your project structure to             │
│       discover test opportunities automatically                │
│                                                                  │
│                                                                  │
│              [← Back]           [Next →]                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Screen 3: CONFIG (Setup Step 3)

```
┌─────────────────────────────────────────────────────────────────┐
│  QAgent                                          ─  □  ✕       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Progress: [●][●][●][○]                                         │
│            1  2  3  4                                            │
│                                                                  │
│                                                                  │
│              ⚙️  Configure Test Framework                       │
│                                                                  │
│                                                                  │
│    Framework                                                     │
│    ┌──────────────────────────────────────────────────┐        │
│    │ Playwright ▾                                      │        │
│    └──────────────────────────────────────────────────┘        │
│                                                                  │
│    Base URL                                                      │
│    ┌──────────────────────────────────────────────────┐        │
│    │ http://localhost:3000                            │        │
│    └──────────────────────────────────────────────────┘        │
│                                                                  │
│    Test Directory (optional)                                     │
│    ┌──────────────────────────────────────────────────┐        │
│    │ e2e/                                             │        │
│    └──────────────────────────────────────────────────┘        │
│                                                                  │
│    ☐ Enable Smart Discovery                                    │
│       Automatically discover test suites                        │
│                                                                  │
│                                                                  │
│              [← Back]           [Start Discovery →]             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Screen 4a: DISCOVERY - Running (Setup Step 4)

```
┌─────────────────────────────────────────────────────────────────┐
│  QAgent                                          ─  □  ✕       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Progress: [●][●][●][●]                                         │
│            1  2  3  4                                            │
│                                                                  │
│                                                                  │
│                🧠 Discovering Test Suites                       │
│                                                                  │
│    ┌─────────────────────────────────────────────────┐         │
│    │ ⟳ Analyzing routes, components, and flows...    │         │
│    └─────────────────────────────────────────────────┘         │
│                                                                  │
│                                                                  │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│   │ 📦      │  │ ✓       │  │ 🔄      │  │ ⚠️      │         │
│   │ Suites  │  │ Cases   │  │ Steps   │  │ Critical│         │
│   │         │  │         │  │         │  │         │         │
│   │   12    │  │   48    │  │   156   │  │    3    │         │
│   └─────────┘  └─────────┘  └─────────┘  └─────────┘         │
│                                                                  │
│                                                                  │
│                 ● Analyzing... 3.4s                             │
│                                                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

📡 API CALL:
POST /analyze/suites/discover
{
  "workspacePath": "/Users/me/projects/my-awesome-app"
}

Backend Process:
1. Graph analysis of routes/components
2. Journey extraction using DSA algorithms
3. Grouping into test suites by functionality
4. Enriching with selectors + test data
5. Priority assignment (Critical/High/Medium/Low)
```

---

## Screen 4b: DISCOVERY - Results (Setup Step 4)

```
┌─────────────────────────────────────────────────────────────────┐
│  QAgent                                          ─  □  ✕       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Progress: [●][●][●][●]                                         │
│            1  2  3  4                                            │
│                                                                  │
│                                                                  │
│  12 Test Suites Discovered                 [☑ Select All]      │
│  Select suites to add to your dashboard   [☐ Clear All]       │
│                                                                  │
│  Detected: React • Redux • React Router • Axios                 │
│  12 suites • 48 cases • 156 steps                              │
│                                                                  │
│  [🔍 Search suites...]                                          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [☑] ▼ 🔐 Authentication Suite              CRITICAL     │  │
│  │     ─────────────────────────────────────────────────    │  │
│  │     8 cases • 45 steps • ████████░░ 75%                 │  │
│  │                                                           │  │
│  │     Component: LoginForm.tsx                             │  │
│  │     API: POST /auth/login, POST /auth/logout            │  │
│  │     Tests: ✓ Happy path, 3 validations                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [☑] ▶ 🛒 Checkout Flow                     HIGH         │  │
│  │     ─────────────────────────────────────────────────    │  │
│  │     12 cases • 67 steps • ███████░░░ 67%                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [☐] ▶ 🔍 Search & Filters                  MEDIUM       │  │
│  │     ─────────────────────────────────────────────────    │  │
│  │     5 cases • 23 steps • ██████░░░░ 60%                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ... 9 more suites ...                                          │
│                                                                  │
│   ┌─────────────────────────────────────────────────────┐      │
│   │  [← Back]      10 of 12 selected  [Add to Dashboard]│      │
│   └─────────────────────────────────────────────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

📡 API RESPONSE:
{
  "success": true,
  "suites": [
    {
      "id": "suite-auth",
      "name": "Authentication Suite",
      "category": "authentication",
      "priority": "CRITICAL",
      "testCases": [
        {
          "id": "case-login-valid",
          "name": "Login with valid credentials",
          "steps": [
            {
              "id": "step-1",
              "action": "navigate",
              "target": "/login",
              "selector": null
            },
            {
              "id": "step-2",
              "action": "type",
              "target": "email",
              "selector": "input[name='email']",
              "value": "test@example.com"
            },
            ...
          ]
        }
      ],
      "stats": {
        "totalCases": 8,
        "totalSteps": 45,
        "passRate": 75
      }
    }
  ],
  "totalCases": 48,
  "totalSteps": 156,
  "analysisTime": 3400
}
```

---

## Screen 5: DASHBOARD (After Setup)

```
┌────────────────────────────────────────────────────────────────────┐
│ [≡] [📁 my-awesome-app ▾]  Dashboard  Suites  Flows  Results     │
│                              ────                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Dashboard                                                          │
│  Project: my-awesome-app • 12 suites discovered                    │
│                                                                     │
│  [✨ Discover More]  [View All Suites →]                           │
│                                                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                  │
│  │ 📦 Suites  │  │ ✓ Cases    │  │ 🔄 Steps   │                  │
│  │            │  │            │  │            │                  │
│  │     12     │  │  18 / 48   │  │    156     │                  │
│  │ Discovered │  │ Completed  │  │ Total      │                  │
│  └────────────┘  └────────────┘  └────────────┘                  │
│                                                                     │
│  📊 Test Coverage                                                  │
│  ════════════════════════════════════════════                     │
│                                                                     │
│  Authentication    ████████████░░░░ 75%                           │
│  User Profile      ████████░░░░░░░░ 50%                           │
│  E-Commerce        ██████████████░░ 83%                           │
│                                                                     │
│                                                                     │
│  🎯 Priority Test Suites                                           │
│  ════════════════════════════════════════════                     │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐        │
│  │ 🔐 Authentication Suite               CRITICAL       │        │
│  │ ────────────────────────────────────────────────     │        │
│  │ 8 cases • 45 steps • ████████░░ 75%                 │        │
│  │ [▶ Run] [✏️ Edit] [📊 Details]                       │        │
│  └──────────────────────────────────────────────────────┘        │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐        │
│  │ 💳 Payment Processing                 CRITICAL       │        │
│  │ ────────────────────────────────────────────────     │        │
│  │ 15 cases • 89 steps • █████████████░ 80%            │        │
│  │ [▶ Run] [✏️ Edit] [📊 Details]                       │        │
│  └──────────────────────────────────────────────────────┘        │
│                                                                     │
│                                                                     │
│  💡 Ready to Discover More?                                        │
│  ═══════════════════════════════════════════════════              │
│                                                                     │
│  Click "Discover More" to analyze your project and                │
│  generate additional test suites based on new features.           │
│                                                                     │
│               [✨ Discover More Suites]                            │
│                                                                     │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

💡 "Discover More" Button Actions:
Option A: Navigate to /setup/detection (re-run discovery)
Option B: Call API directly + refresh dashboard
```

---

## Screen 6: TEST SUITES LIST

```
┌────────────────────────────────────────────────────────────────────┐
│ [≡] [📁 my-awesome-app ▾]  Dashboard  Test Suites  Flows  Results│
│                                         ──────────                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📦 Test Suites (12)                    [🔍 Search] [Filter ▾]    │
│  ════════════════════════════════════════════════                 │
│                                                                     │
│  12 suites • 48 cases • 156 steps                                 │
│                                                                     │
│  ┌─────────────────────┐  ┌─────────────────────┐                │
│  │ 🔐 Authentication   │  │ 🛒 Checkout Flow   │                │
│  │ ─────────────────── │  │ ─────────────────── │                │
│  │ CRITICAL            │  │ HIGH                │                │
│  │                     │  │                     │                │
│  │ 8 test cases       │  │ 12 test cases      │                │
│  │ 45 steps           │  │ 67 steps           │                │
│  │                     │  │                     │                │
│  │ ████████░░░ 75%    │  │ ███████░░░ 67%     │                │
│  │                     │  │                     │                │
│  │ ✓ 6  ✗ 1  ⏸ 1     │  │ ✓ 8  ✗ 2  ⏸ 2     │                │
│  │                     │  │                     │                │
│  │ [▶] [✏️] [📊]       │  │ [▶] [✏️] [📊]       │                │
│  └─────────────────────┘  └─────────────────────┘                │
│                                                                     │
│  ┌─────────────────────┐  ┌─────────────────────┐                │
│  │ 🔍 Search          │  │ 🧾 Products        │                │
│  │ ─────────────────── │  │ ─────────────────── │                │
│  │ MEDIUM              │  │ MEDIUM              │                │
│  │ 5 cases • 23 steps │  │ 10 cases • 52 steps│                │
│  │ ██████░░░░ 60%     │  │ ███████████░ 83%   │                │
│  │ [▶] [✏️] [📊]       │  │ [▶] [✏️] [📊]       │                │
│  └─────────────────────┘  └─────────────────────┘                │
│                                                                     │
│  ... 8 more suites ...                                             │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Screen 7: SUITE DETAIL (Cases List)

```
┌────────────────────────────────────────────────────────────────────┐
│ [≡] [📁 my-awesome-app ▾]  Dashboard  Test Suites  Flows  Results│
│                                         ──────────                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ← Back to Suites                                                  │
│                                                                     │
│  🔐 Authentication Suite                        [▶ Run All] [⚙️]   │
│  ═══════════════════════════════════════════════════              │
│                                                                     │
│  CRITICAL Priority • 8 Cases • 45 Steps • Last: 2m ago • 75% Pass │
│  📊 Stats:  ✓ 6 Passed  •  ✗ 1 Failed  •  ⏸ 1 Pending            │
│                                                                     │
│  ─────────────────────────────────────────────────────            │
│                                                                     │
│  Test Cases                     [🔍 Search] [Status ▾] [Sort ▾]  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ✓  Login with valid credentials              CRITICAL     │  │
│  │    ──────────────────────────────────────────────────      │  │
│  │    6 steps  •  12s  •  2m ago  •  ✓ Passed               │  │
│  │                                                             │  │
│  │    Tags: [authentication] [login] [smoke]                 │  │
│  │                                                             │  │
│  │    [▶ Run] [📝 View Steps] [📊 History] [✏️ Edit]         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ✗  Login with invalid password               HIGH         │  │
│  │    ──────────────────────────────────────────────────      │  │
│  │    5 steps  •  8s  •  2m ago  •  ✗ Failed                │  │
│  │                                                             │  │
│  │    ⚠️  Error: Assertion failed - Error message not shown  │  │
│  │                                                             │  │
│  │    Tags: [authentication] [negative] [validation]         │  │
│  │                                                             │  │
│  │    [▶ Retry] [📝 View Steps] [🐛 Debug] [✏️ Edit]         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ⏸  Social login (Google, GitHub)            MEDIUM        │  │
│  │    ──────────────────────────────────────────────────      │  │
│  │    8 steps  •  Not run yet  •  ⏸ Pending                  │  │
│  │                                                             │  │
│  │    Tags: [authentication] [oauth] [social]                │  │
│  │                                                             │  │
│  │    [▶ Run] [📝 View Steps] [✏️ Edit]                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ... 5 more test cases ...                                         │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Screen 8: CASE DETAIL (Steps List)

```
┌────────────────────────────────────────────────────────────────────┐
│ [≡] [📁 my-awesome-app ▾]  Dashboard  Test Suites  Flows  Results│
│                                         ──────────                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ← Back to Authentication Suite                                    │
│                                                                     │
│  Login with valid credentials                   [▶ Run] [✏️ Edit] │
│  ═══════════════════════════════════════════════════              │
│                                                                     │
│  🔐 Authentication • CRITICAL • 6 Steps • Last run: 2m ago         │
│  Status: ✓ Passed • Duration: 12s • Tags: [authentication] [login]│
│                                                                     │
│  ─────────────────────────────────────────────────────            │
│                                                                     │
│  Test Steps                                                         │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 1  🌐 NAVIGATE                              ✓ PASSED       │  │
│  │    ────────────────────────────────────────────────        │  │
│  │    Target: /login                                          │  │
│  │    URL: https://my-app.com/login                          │  │
│  │    Duration: 2.3s                                          │  │
│  │                                                             │  │
│  │    Assertions:                                             │  │
│  │    ✓ Page loaded successfully                             │  │
│  │    ✓ Title contains "Login"                               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 2  ⌨️  TYPE                                  ✓ PASSED       │  │
│  │    ────────────────────────────────────────────────        │  │
│  │    Selector: input[name="email"]                           │  │
│  │    Value: test@example.com                                 │  │
│  │    Duration: 0.8s                                          │  │
│  │                                                             │  │
│  │    Assertions:                                             │  │
│  │    ✓ Element is visible                                   │  │
│  │    ✓ Input value updated                                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 3  ⌨️  TYPE                                  ✓ PASSED       │  │
│  │    ────────────────────────────────────────────────        │  │
│  │    Selector: input[name="password"]                        │  │
│  │    Value: ••••••••                                         │  │
│  │    Duration: 0.6s                                          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 4  👆 CLICK                                  ✓ PASSED       │  │
│  │    ────────────────────────────────────────────────        │  │
│  │    Selector: button[type="submit"]                         │  │
│  │    Text: "Sign In"                                         │  │
│  │    Duration: 1.2s                                          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ... 2 more steps ...                                              │
│                                                                     │
│  ─────────────────────────────────────────────────────            │
│                                                                     │
│  📊 Test Run History                                               │
│  2m ago    ✓ Passed  12.3s                                         │
│  1h ago    ✓ Passed  11.8s                                         │
│  3h ago    ✓ Passed  12.1s                                         │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 User Flows Summary

### First-Time User (No Suites):
1. **Welcome** → Get Started
2. **Detection** → Select folder
3. **Config** → Set framework/baseUrl
4. **Discovery** (Running) → API call `/analyze/suites/discover`
5. **Discovery** (Results) → Select suites
6. **Dashboard** → View stats + priority suites

### Returning User (Has Suites):
1. **Dashboard** → View existing suites
2. Click **"Discover More"** → Goes back to Detection screen
3. Or **"View All Suites"** → Go to Suites list

### Refresh Suites (From Dashboard):
```typescript
// Option A: Navigate to setup
navigate('/setup/detection');

// Option B: Direct API call
const result = await api.discoverTestSuites(projectPath);
setSuites(result.suites);
```

---

## 🎯 Key Differences from Old Flow System

### OLD (Flow-based):
- "0 User Flows Discovered"
- "Discovering User Journeys"
- Counters: Components, Routes, APIs, Forms
- Separate enrich step needed

### NEW (Suite-based):
- "0 Test Suites Discovered"
- "Discovering Test Suites"
- Counters: Suites, Cases, Steps, Critical
- Complete data in one API call

---

## 📡 Backend Endpoints

### Active:
```
POST /analyze/suites/discover
  ├─ Returns: Complete TestSuite[] with cases + steps
  ├─ Timeout: 180 seconds (3 minutes)
  └─ No enrichment needed
```

### Legacy (To Deprecate):
```
POST /analyze/journeys/discover
POST /analyze/journeys/:id/enrich
POST /analyze/journeys/discover-and-enrich
```

---

Ovako izgleda kompletan flow sa Suite/Case/Step arhitekturom! 🎉

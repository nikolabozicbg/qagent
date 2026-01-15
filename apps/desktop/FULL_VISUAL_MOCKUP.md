# 🎨 FULL VISUAL MOCKUP - Hybrid Layout

## 1️⃣ DEFAULT STATE - Sidebar Hidden (Maksimalan prostor)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  QAgent                                                              ─  □  ✕           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  [≡]  [📁 My E-Commerce App ▾]     Dashboard    Test Suites    Flows    Results      │
│                                       ────                                              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   📊 Test Suite Overview                                                               │
│   ════════════════════════════════════════════════════════════════════════            │
│                                                                                         │
│   🎯 Priority Suites  │  📈 Coverage  │  ⏱️ Execution Time                           │
│   ─────────────────────────────────────────────────────────────────                   │
│   • 3 Critical        │  Auth: 95%    │  Total: 2m 34s                                │
│   • 5 High           │  UI: 87%      │  Average: 15s/test                             │
│   • 8 Medium         │  API: 92%     │                                                 │
│                                                                                         │
│                                                                                         │
│   📦 Test Suites (16)                              [🔍 Search] [Filter ▾] [+ New]    │
│   ════════════════════════════════════════════════════════════════════════            │
│                                                                                         │
│   ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────┐ │
│   │ 🔐 Authentication       │  │ 🛒 Checkout Flow       │  │ 🔍 Search & Filter │ │
│   │ ─────────────────────── │  │ ─────────────────────── │  │ ───────────────────│ │
│   │ CRITICAL                │  │ HIGH                    │  │ MEDIUM             │ │
│   │                         │  │                         │  │                    │ │
│   │ 8 test cases           │  │ 12 test cases          │  │ 5 test cases      │ │
│   │ 45 steps               │  │ 67 steps               │  │ 23 steps          │ │
│   │                         │  │                         │  │                    │ │
│   │ ████████████░░░░ 75%   │  │ ███████████░░░░ 67%    │  │ ██████████░░░ 60% │ │
│   │                         │  │                         │  │                    │ │
│   │ ✓ 6  ✗ 1  ⏸ 1         │  │ ✓ 8  ✗ 2  ⏸ 2         │  │ ✓ 3  ✗ 1  ⏸ 1    │ │
│   │                         │  │                         │  │                    │ │
│   │ [▶ Run] [✏️ Edit] [📊] │  │ [▶ Run] [✏️ Edit] [📊] │  │ [▶ Run] [✏️] [📊]│ │
│   └─────────────────────────┘  └─────────────────────────┘  └─────────────────────┘ │
│                                                                                         │
│   ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────┐ │
│   │ 🧾 Product Management   │  │ 👤 User Profile        │  │ 💳 Payment         │ │
│   │ ─────────────────────── │  │ ─────────────────────── │  │ ───────────────────│ │
│   │ MEDIUM                  │  │ HIGH                    │  │ CRITICAL           │ │
│   │                         │  │                         │  │                    │ │
│   │ 10 test cases          │  │ 7 test cases           │  │ 15 test cases     │ │
│   │ 52 steps               │  │ 34 steps               │  │ 89 steps          │ │
│   │                         │  │                         │  │                    │ │
│   │ ██████████████░ 83%    │  │ ████████░░░░░░░ 50%    │  │ █████████████░ 80%│ │
│   │                         │  │                         │  │                    │ │
│   │ ✓ 8  ✗ 1  ⏸ 1         │  │ ✓ 3  ✗ 2  ⏸ 2         │  │ ✓ 12 ✗ 2  ⏸ 1    │ │
│   │                         │  │                         │  │                    │ │
│   │ [▶ Run] [✏️ Edit] [📊] │  │ [▶ Run] [✏️ Edit] [📊] │  │ [▶ Run] [✏️] [📊]│ │
│   └─────────────────────────┘  └─────────────────────────┘  └─────────────────────┘ │
│                                                                                         │
│                                                                                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ PROJECT DROPDOWN OPEN - Klik na [📁 My E-Commerce App ▾]

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  QAgent                                                              ─  □  ✕           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  [≡]  [📁 My E-Commerce App ▾]     Dashboard    Test Suites    Flows    Results      │
│        ┌──────────────────────────────────────────┐                                    │
│        │ 🔍 Search projects...                    │                                    │
│        ├──────────────────────────────────────────┤                                    │
│        │                                          │                                    │
│        │ ● My E-Commerce App              ACTIVE │                                    │
│        │   /Users/me/projects/ecommerce          │                                    │
│        │   16 suites • 87 cases • Last run: 2m   │                                    │
│        │                                          │                                    │
│        ├──────────────────────────────────────────┤                                    │
│        │                                          │                                    │
│        │   Blog CMS Platform                     │                                    │
│        │   /Users/me/projects/blog-cms           │                                    │
│        │   8 suites • 45 cases • Last run: 1h    │                                    │
│        │                                          │                                    │
│        ├──────────────────────────────────────────┤                                    │
│        │                                          │                                    │
│        │   Admin Dashboard                       │                                    │
│        │   /Users/me/projects/admin-panel        │                                    │
│        │   12 suites • 62 cases • Last run: 3h   │                                    │
│        │                                          │                                    │
│        ├──────────────────────────────────────────┤                                    │
│        │                                          │                                    │
│        │   API Test Suite                        │                                    │
│        │   /Users/me/projects/api-tests          │                                    │
│        │   5 suites • 28 cases • Last run: 30m   │                                    │
│        │                                          │                                    │
│        ├──────────────────────────────────────────┤                                    │
│        │                                          │                                    │
│        │ ➕ New Project...                       │                                    │
│        │ 📂 Open Existing Project...             │                                    │
│        │ ⏱️  Recent Projects              ▸      │                                    │
│        │ ⚙️  Project Settings                    │                                    │
│        │                                          │                                    │
│        └──────────────────────────────────────────┘                                    │
│                                                                                         │
│   📊 Test Suite Overview                                                               │
│   ════════════════════════════════════════════════════════════════════════            │
│                                                                                         │
│   ... rest of content ...                                                              │
│                                                                                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3️⃣ SIDEBAR VISIBLE - Toggle [≡]

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  QAgent                                                              ─  □  ✕           │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│                      │  [📁 My E-Commerce App ▾]     Dashboard    Test Suites    Flows│
│   PROJECTS           │                                  ────                            │
│   [≡] Hide Sidebar   ├─────────────────────────────────────────────────────────────────┤
│                      │                                                                  │
│   [🔍 Search...]     │   📊 Test Suite Overview                                        │
│                      │   ══════════════════════════════════════════════                │
│   [+ New Project]    │                                                                  │
│                      │   🎯 Priority  │ 📈 Coverage │ ⏱️ Time                         │
│  ─────────────────   │   ─────────────────────────────────────                        │
│                      │   • 3 Critical │ Auth: 95%   │ 2m 34s                           │
│  ● My E-Commerce     │   • 5 High     │ UI: 87%     │ avg: 15s                         │
│    /projects/ecom    │   • 8 Medium   │ API: 92%    │                                  │
│    16 suites         │                                                                  │
│                      │                                                                  │
│    Blog CMS          │   📦 Test Suites (16)                    [🔍] [▾] [+]          │
│    /projects/blog    │   ══════════════════════════════════════════════                │
│    8 suites          │                                                                  │
│                      │   ┌──────────────────┐  ┌──────────────────┐                   │
│    Admin Panel       │   │ 🔐 Auth         │  │ 🛒 Checkout     │                   │
│    /projects/admin   │   │ ─────────────── │  │ ─────────────── │                   │
│    12 suites         │   │ CRITICAL        │  │ HIGH            │                   │
│                      │   │                 │  │                 │                   │
│    API Tests         │   │ 8 cases         │  │ 12 cases        │                   │
│    /projects/api     │   │ 45 steps        │  │ 67 steps        │                   │
│    5 suites          │   │                 │  │                 │                   │
│                      │   │ ███████░░ 75%   │  │ ██████░░░ 67%   │                   │
│  ─────────────────   │   │                 │  │                 │                   │
│                      │   │ ✓ 6  ✗ 1  ⏸ 1  │  │ ✓ 8  ✗ 2  ⏸ 2  │                   │
│  ○ Backend: 3001     │   │                 │  │                 │                   │
│  ● Connected         │   │ [▶] [✏️] [📊]   │  │ [▶] [✏️] [📊]   │                   │
│                      │   └──────────────────┘  └──────────────────┘                   │
│                      │                                                                  │
│                      │   ┌──────────────────┐  ┌──────────────────┐                   │
│                      │   │ 🧾 Products     │  │ 👤 Profile      │                   │
│                      │   └──────────────────┘  └──────────────────┘                   │
│                      │                                                                  │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

---

## 4️⃣ SUITE DETAIL VIEW - Klik na "Authentication" suite

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  QAgent                                                              ─  □  ✕           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  [≡]  [📁 My E-Commerce App ▾]     Dashboard    Test Suites    Flows    Results      │
│                                                      ────                               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ← Back to Suites                                                                      │
│                                                                                         │
│  🔐 Authentication Suite                                          [▶ Run All] [⚙️]    │
│  ═══════════════════════════════════════════════════════════════════════════          │
│                                                                                         │
│  CRITICAL Priority  •  8 Test Cases  •  45 Steps  •  Last run: 2m ago  •  75% Pass   │
│                                                                                         │
│  📊 Stats:  ✓ 6 Passed  •  ✗ 1 Failed  •  ⏸ 1 Pending                                │
│                                                                                         │
│  ─────────────────────────────────────────────────────────────────────────            │
│                                                                                         │
│  Test Cases                                    [🔍 Search] [Status ▾] [Priority ▾]   │
│                                                                                         │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │ ✓  Login with valid credentials                                      CRITICAL  │  │
│  │    ────────────────────────────────────────────────────────────────────────    │  │
│  │    6 steps  •  Duration: 12s  •  Last run: 2m ago  •  ✓ Passed               │  │
│  │                                                                                 │  │
│  │    Tags: [authentication] [login] [smoke]                                     │  │
│  │                                                                                 │  │
│  │    [▶ Run] [📝 View Steps] [📊 History] [✏️ Edit]                              │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │ ✗  Login with invalid password                                        HIGH     │  │
│  │    ────────────────────────────────────────────────────────────────────────    │  │
│  │    5 steps  •  Duration: 8s  •  Last run: 2m ago  •  ✗ Failed                │  │
│  │                                                                                 │  │
│  │    ⚠️  Error: Assertion failed - Error message not displayed                  │  │
│  │                                                                                 │  │
│  │    Tags: [authentication] [negative-test] [validation]                        │  │
│  │                                                                                 │  │
│  │    [▶ Retry] [📝 View Steps] [🐛 Debug] [✏️ Edit]                              │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │ ⏸  Login with social providers (Google, GitHub)                      MEDIUM   │  │
│  │    ────────────────────────────────────────────────────────────────────────    │  │
│  │    8 steps  •  Duration: -  •  Not run yet  •  ⏸ Pending                     │  │
│  │                                                                                 │  │
│  │    Tags: [authentication] [social-login] [oauth]                              │  │
│  │                                                                                 │  │
│  │    [▶ Run] [📝 View Steps] [✏️ Edit]                                           │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │ ✓  Logout functionality                                              LOW       │  │
│  │    ────────────────────────────────────────────────────────────────────────    │  │
│  │    3 steps  •  Duration: 5s  •  Last run: 2m ago  •  ✓ Passed                │  │
│  │                                                                                 │  │
│  │    Tags: [authentication] [logout]                                            │  │
│  │                                                                                 │  │
│  │    [▶ Run] [📝 View Steps] [📊 History] [✏️ Edit]                              │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ... 4 more test cases ...                                                             │
│                                                                                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5️⃣ CASE DETAIL VIEW - Klik na "Login with valid credentials"

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  QAgent                                                              ─  □  ✕           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  [≡]  [📁 My E-Commerce App ▾]     Dashboard    Test Suites    Flows    Results      │
│                                                      ────                               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ← Back to Authentication Suite                                                        │
│                                                                                         │
│  Login with valid credentials                                     [▶ Run] [✏️ Edit]   │
│  ═══════════════════════════════════════════════════════════════════════════          │
│                                                                                         │
│  🔐 Authentication Suite  •  CRITICAL Priority  •  6 Steps  •  Last run: 2m ago       │
│  Status: ✓ Passed  •  Duration: 12s  •  Tags: [authentication] [login] [smoke]       │
│                                                                                         │
│  ─────────────────────────────────────────────────────────────────────────            │
│                                                                                         │
│  Test Steps                                                                             │
│                                                                                         │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 1  🌐 NAVIGATE                                                        ✓ PASSED  │  │
│  │    ──────────────────────────────────────────────────────────────────────────  │  │
│  │    Target: /login                                                              │  │
│  │    URL: https://my-ecommerce-app.com/login                                     │  │
│  │    Duration: 2.3s                                                              │  │
│  │                                                                                 │  │
│  │    Assertions:                                                                 │  │
│  │    ✓ Page loaded successfully                                                 │  │
│  │    ✓ Title contains "Login"                                                   │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 2  ⌨️  TYPE                                                           ✓ PASSED  │  │
│  │    ──────────────────────────────────────────────────────────────────────────  │  │
│  │    Selector: input[name="email"]                                               │  │
│  │    Value: test@example.com                                                     │  │
│  │    Duration: 0.8s                                                              │  │
│  │                                                                                 │  │
│  │    Assertions:                                                                 │  │
│  │    ✓ Element is visible                                                       │  │
│  │    ✓ Input value updated                                                      │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 3  ⌨️  TYPE                                                           ✓ PASSED  │  │
│  │    ──────────────────────────────────────────────────────────────────────────  │  │
│  │    Selector: input[name="password"]                                            │  │
│  │    Value: ••••••••                                                             │  │
│  │    Duration: 0.6s                                                              │  │
│  │                                                                                 │  │
│  │    Assertions:                                                                 │  │
│  │    ✓ Element is visible                                                       │  │
│  │    ✓ Password masked                                                          │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 4  👆 CLICK                                                           ✓ PASSED  │  │
│  │    ──────────────────────────────────────────────────────────────────────────  │  │
│  │    Selector: button[type="submit"]                                             │  │
│  │    Text: "Sign In"                                                             │  │
│  │    Duration: 1.2s                                                              │  │
│  │                                                                                 │  │
│  │    Assertions:                                                                 │  │
│  │    ✓ Button is clickable                                                      │  │
│  │    ✓ Form submitted                                                           │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 5  ⏳ WAIT                                                            ✓ PASSED  │  │
│  │    ──────────────────────────────────────────────────────────────────────────  │  │
│  │    Wait for: Navigation complete                                               │  │
│  │    Timeout: 5000ms                                                             │  │
│  │    Duration: 3.4s                                                              │  │
│  │                                                                                 │  │
│  │    Assertions:                                                                 │  │
│  │    ✓ Navigation completed                                                     │  │
│  │    ✓ URL changed to /dashboard                                                │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 6  ✅ ASSERT                                                          ✓ PASSED  │  │
│  │    ──────────────────────────────────────────────────────────────────────────  │  │
│  │    Type: Element visible                                                       │  │
│  │    Selector: [data-testid="user-menu"]                                         │  │
│  │    Duration: 0.4s                                                              │  │
│  │                                                                                 │  │
│  │    Assertions:                                                                 │  │
│  │    ✓ User menu visible                                                        │  │
│  │    ✓ User logged in successfully                                              │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ─────────────────────────────────────────────────────────────────────────            │
│                                                                                         │
│  📊 Test Run History (last 10 runs)                                                   │
│                                                                                         │
│  2m ago    ✓ Passed  12.3s                                                             │
│  1h ago    ✓ Passed  11.8s                                                             │
│  3h ago    ✓ Passed  12.1s                                                             │
│  1d ago    ✓ Passed  13.2s                                                             │
│                                                                                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6️⃣ NEW PROJECT - Klik na [+ New Project] ili dropdown "➕ New Project..."

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  QAgent                                                              ─  □  ✕           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  [≡]  [📁 No Project Selected ▾]                                                      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│                                                                                         │
│                        🚀 Create New Project                                           │
│                        ════════════════════════                                        │
│                                                                                         │
│                                                                                         │
│            ┌─────────────────────────────────────────────────┐                        │
│            │                                                 │                        │
│            │  Project Name                                   │                        │
│            │  ┌───────────────────────────────────────────┐  │                        │
│            │  │ My Awesome Project                        │  │                        │
│            │  └───────────────────────────────────────────┘  │                        │
│            │                                                 │                        │
│            │  Project Location                               │                        │
│            │  ┌───────────────────────────────────────┐ [📂] │                        │
│            │  │ /Users/me/projects/my-awesome-project │      │                        │
│            │  └───────────────────────────────────────┘      │                        │
│            │                                                 │                        │
│            │  Framework                                      │                        │
│            │  ┌───────────────────────────────────────────┐  │                        │
│            │  │ Playwright ▾                              │  │                        │
│            │  └───────────────────────────────────────────┘  │                        │
│            │                                                 │                        │
│            │  Base URL                                       │                        │
│            │  ┌───────────────────────────────────────────┐  │                        │
│            │  │ http://localhost:3000                     │  │                        │
│            │  └───────────────────────────────────────────┘  │                        │
│            │                                                 │                        │
│            │  Test Directory (optional)                      │                        │
│            │  ┌───────────────────────────────────────────┐  │                        │
│            │  │ tests/                                    │  │                        │
│            │  └───────────────────────────────────────────┘  │                        │
│            │                                                 │                        │
│            │  ☐ Enable Smart Discovery                      │                        │
│            │     Automatically analyze and discover test     │                        │
│            │     suites from your application               │                        │
│            │                                                 │                        │
│            │                                                 │                        │
│            │           [Cancel]  [Create Project]            │                        │
│            │                                                 │                        │
│            └─────────────────────────────────────────────────┘                        │
│                                                                                         │
│                                                                                         │
│                                                                                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 KEY UI ELEMENTS EXPLAINED:

### **TopNav Components:**
```
[≡]                          - Sidebar toggle (Cmd+B)
[📁 Project Name ▾]          - Project selector dropdown
Dashboard / Suites / Flows   - Active tab has underline
                               (────)
```

### **Suite Card Components:**
```
🔐 Icon              - Category icon
CRITICAL             - Priority badge (red/orange/yellow/gray)
████████░░░░ 75%    - Progress bar (green=pass, gray=remaining)
✓ 6  ✗ 1  ⏸ 1      - Pass/Fail/Pending counts
[▶ Run]             - Execute suite
[✏️ Edit]            - Edit suite
[📊]                 - View analytics
```

### **Status Icons:**
```
✓  - Passed (green)
✗  - Failed (red)
⏸  - Pending (gray)
⚠️  - Warning (orange)
```

### **Action Icons:**
```
🌐 - Navigate
👆 - Click
⌨️  - Type/Input
⏳ - Wait
✅ - Assert
📡 - API Call
🔍 - Search
```

### **Color Coding:**
```
CRITICAL - Red (#ef4444)
HIGH     - Orange (#f97316)
MEDIUM   - Yellow (#eab308)
LOW      - Gray (#6b7280)
```

---

## 🎨 DESIGN NOTES:

- **Glassmorphism**: backdrop-blur-xl, semi-transparent backgrounds
- **Smooth animations**: 200ms transitions
- **Responsive**: Cards adapt to screen width
- **Keyboard shortcuts**: Full keyboard navigation
- **Dark theme**: #0A0E14 background, #00D4FF primary accent
- **Consistent spacing**: 4px grid system

---

Ovako bi izgledao **ceo UI flow** sa svim ekranima! 🎉

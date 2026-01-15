# 🎨 QAgent Desktop App - Complete Screen Designs

**Architecture: Suite → Case → Step**
- Test Suites = Functional areas (Authentication, Payments, Profile)
- Test Cases = Specific user actions (Login, Register, Checkout)
- Test Steps = Atomic operations (Navigate, Fill, Click, Verify)

**Data Flow:**
1. `/analyze/enhanced` → Workspace analysis (components, routes, APIs)
2. `/analyze/suites/discover` → Test Suites discovery (complete Suite/Case/Step hierarchy)
3. `/analyze/generate-test` → Generate test code for Cases

**Note:** Legacy `/analyze/journeys/*` endpoints deprecated in favor of `/analyze/suites/discover`

---

## SCREEN 1: Setup - Welcome (First Launch)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                              ┃
┃                   [Progress: ████░░░░ Step 1/4]             ┃
┃                                                              ┃
┃                                                              ┃
┃                      ⚡ Welcome to QAgent                    ┃
┃                                                              ┃
┃            AI-Powered Flow-First Test Generation            ┃
┃                                                              ┃
┃                                                              ┃
┃     ╔══════════════════════════════════════════════════╗    ┃
┃     ║                                                  ║    ┃
┃     ║   🎯  Flow-based test generation                 ║    ┃
┃     ║                                                  ║    ┃
┃     ║   🧠  Smart project discovery                    ║    ┃
┃     ║                                                  ║    ┃
┃     ║   ⚡  Multi-framework support                    ║    ┃
┃     ║                                                  ║    ┃
┃     ║   🔧  Self-healing tests                         ║    ┃
┃     ║                                                  ║    ┃
┃     ╚══════════════════════════════════════════════════╝    ┃
┃                                                              ┃
┃                                                              ┃
┃              ┌────────────────────────────────┐              ┃
┃              │  📁 Select Project Folder  →   │              ┃
┃              └────────────────────────────────┘              ┃
┃                                                              ┃
┃                     [Skip Tour]                              ┃
┃                                                              ┃
┃                                                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Features:**
- Animated gradient background
- Smooth fade-in animations
- Native file picker dialog
- Recent projects list

---

## SCREEN 2: Setup - Project Detection

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                              ┃
┃               [Progress: ████████░░ Step 2/4]                ┃
┃                                                              ┃
┃                                                              ┃
┃              🔍 Analyzing Project Structure...               ┃
┃                                                              ┃
┃                                                              ┃
┃     [████████████████████████░░░░░░░] 85%                   ┃
┃                                                              ┃
┃                                                              ┃
┃     ✅ Detected Technologies                                 ┃
┃     ┌────────────────────────────────────────────────────┐  ┃
┃     │                                                    │  ┃
┃     │   [React 18.2]  [TypeScript]  [Vite]              │  ┃
┃     │                                                    │  ┃
┃     │   [Playwright]  [Jest]  [Redux Toolkit]           │  ┃
┃     │                                                    │  ┃
┃     └────────────────────────────────────────────────────┘  ┃
┃                                                              ┃
┃                                                              ┃
┃     📊 Project Insights                                      ┃
┃     ┌────────────────────────────────────────────────────┐  ┃
┃     │  • 42 Components found                             │  ┃
┃     │  • 12 Routes detected                              │  ┃
┃     │  • 28 API endpoints                                │  ┃
┃     │  • Playwright already configured ✓                 │  ┃
┃     └────────────────────────────────────────────────────┘  ┃
┃                                                              ┃
┃                                                              ┃
┃        [← Back]                        [Continue →]         ┃
┃                                                              ┃
┃                                                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Features:**
- Live progress bar with percentage
- Tech badges appear with fade-in animation
- API call: `POST /analyze/enhanced`
- WebSocket connection for real-time updates

---

## SCREEN 3: Setup - Configuration

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                              ┃
┃              [Progress: ████████████░ Step 3/4]              ┃
┃                                                              ┃
┃                                                              ┃
┃                  ⚙️ Project Configuration                    ┃
┃                                                              ┃
┃                                                              ┃
┃     Base URL                                                 ┃
┃     ┌────────────────────────────────────────────────────┐  ┃
┃     │ http://localhost:3000                   [Test 🔗] │  ┃
┃     └────────────────────────────────────────────────────┘  ┃
┃                                                              ┃
┃                                                              ┃
┃     Test Framework                                           ┃
┃     ┌────────────────────────────────────────────────────┐  ┃
┃     │  ● Playwright        ○ Cypress                     │  ┃
┃     └────────────────────────────────────────────────────┘  ┃
┃                                                              ┃
┃                                                              ┃
┃     Authentication (Optional)                                ┃
┃     ┌────────────────────────────────────────────────────┐  ┃
┃     │  Username: [test@example.com___________________]   │  ┃
┃     │                                                    │  ┃
┃     │  Password: [••••••••••_________________________]   │  ┃
┃     │                                                    │  ┃
┃     │  ☑ Use seed data (auto-detected)                  │  ┃
┃     └────────────────────────────────────────────────────┘  ┃
┃                                                              ┃
┃                                                              ┃
┃        [← Back]                        [Continue →]         ┃
┃                                                              ┃
┃                                                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Features:**
- Auto-detect base URL from playwright.config
- Test connection button
- Seed data detection
- Form validation

---

## SCREEN 4a: Setup - Smart Discovery (In Progress)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                              ┃
┃            [Progress: ████████████████ Step 4/4]             ┃
┃                                                              ┃
┃                                                              ┃
┃              🧠 Smart Discovery Running...                   ┃
┃                                                              ┃
┃                                                              ┃
┃     ┌────────────────────────────────────────────────────┐  ┃
┃     │                                                    │  ┃
┃     │   Components    Routes      APIs       Forms      │  ┃
┃     │       42          12         28          8        │  ┃
┃     │    [count up animation]                           │  ┃
┃     │                                                    │  ┃
┃     └────────────────────────────────────────────────────┘  ┃
┃                                                              ┃
┃                                                              ┃
┃     🔍 Analyzing application structure...                    ┃
┃     ✨ Discovering user flows...                             ┃
┃     ⚡ Enriching critical journeys...                        ┃
┃                                                              ┃
┃                                                              ┃
┃     Detected Tech Stack:                                     ┃
┃     [React 18.2] [Redux] [React Router] [Material-UI]       ┃
┃     (badges appear with stagger animation)                   ┃
┃                                                              ┃
┃                                                              ┃
┃     ⏱️ Elapsed: 8.2s                                         ┃
┃                                                              ┃
┃                                                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Features:**
- Live counter animations showing Suites/Cases/Steps/Critical counts
- API call: `POST /analyze/suites/discover`
- WebSocket events for real-time progress
- Tech badges fade in one by one
- Complete Suite/Case/Step data in single API call (no enrichment needed)

---

## SCREEN 4b: Setup - Discovery Results

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃                     ✅ Discovery Complete! (12.4s)                         ┃
┃                                                                            ┃
┃         Auto-organizing into Test Suites...                                ┃
┃         • 3 Suites created                                                 ┃
┃         • 24 Test Cases discovered                                         ┃
┃         • 156 Steps identified                                             ┃
┃                                                                            ┃
┃    ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓    ┃
┃    ┃  🔐 Authentication Suite             CRITICAL                ┃    ┃
┃    ┃  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ┃    ┃
┃    ┃                                                              ┃    ┃
┃    ┃  8 test cases  •  52 steps  •  Auto-detected               ┃    ┃
┃    ┃                                                              ┃    ┃
┃    ┃  Cases:                                                      ┃    ┃
┃    ┃  • User Login (6 steps)                                     ┃    ┃
┃    ┃  • User Registration (9 steps)                              ┃    ┃
┃    ┃  • Password Reset (5 steps)                                 ┃    ┃
┃    ┃  ... +5 more                                                ┃    ┃
┃    ┃                                                              ┃    ┃
┃    ┃  ☑ Include this suite                                       ┃    ┃
┃    ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛    ┃
┃                                                                            ┃
┃    ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓    ┃
┃    ┃  💰 Workflow Suite                   HIGH                    ┃    ┃
┃    ┃  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ┃    ┃
┃    ┃                                                              ┃    ┃
┃    ┃  12 test cases  •  87 steps  •  Auto-detected              ┃    ┃
┃    ┃                                                              ┃    ┃
┃    ┃  Cases:                                                      ┃    ┃
┃    ┃  • Create Transaction (12 steps)                            ┃    ┃
┃    ┃  • View Transaction (7 steps)                               ┃    ┃
┃    ┃  • Edit Transaction (9 steps)                               ┃    ┃
┃    ┃  ... +9 more                                                ┃    ┃
┃    ┃                                                              ┃    ┃
┃    ┃  ☑ Include this suite                                       ┃    ┃
┃    ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛    ┃
┃                                                                            ┃
┃    ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓    ┃
┃    ┃  👤 User Profile Suite               MEDIUM                  ┃    ┃
┃    ┃  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ┃    ┃
┃    ┃                                                              ┃    ┃
┃    ┃  4 test cases  •  17 steps  •  Auto-detected               ┃    ┃
┃    ┃                                                              ┃    ┃
┃    ┃  ☐ Include this suite                                       ┃    ┃
┃    ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛    ┃
┃                                                                            ┃
┃         [Select All Critical]                   [Continue →]              ┃
┃                                                                            ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Features:**
- Journeys auto-grouped into Suites by category
- Suite-level selection (not individual flows)
- Stats per suite (cases + steps count)
- Priority based on highest priority case in suite
- Bulk selection by priority level

---

## SCREEN 5: Dashboard - Overview & Quick Actions

**Purpose:** Quick overview of project testing status + main actions

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  cypress-realworld-app                                                        [🔍 ⌘K]    [⚙️]    ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                                                    ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┃   TEST COVERAGE                                                                            ┃  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┃   ████████████████████████████████████████░░░░░░░░░░░░░░░░░░░░   67%                       ┃  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┃   4/6 cases have tests   •   2 CRITICAL covered   •   2 HIGH missing                      ┃  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃
┃                                                                                                    ┃
┃                                                                                                    ┃
┃   ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐  ┃
┃   │                     │ │                     │ │                     │ │                     │  ┃
┃   │   ✅ 4/4            │ │    4.1s             │ │    0                │ │    5                │  ┃
┃   │   Passing           │ │   Total time        │ │   Flaky             │ │   Runs today        │  ┃
┃   │   Last: 2 min ago   │ │   ↓ 0.3s faster     │ │   tests             │ │   ↑ 2 vs yesterday  │  ┃
┃   │                     │ │                     │ │                     │ │                     │  ┃
┃   └─────────────────────┘ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘  ┃
┃                                                                                                    ┃
┃                                                                                                    ┃
┃   ┌───────────────────────────────────────────┐   ┌───────────────────────────────────────────┐   ┃
┃   │                                           │   │                                           │   ┃
┃   │   ▶  RUN ALL TESTS                        │   │   ✨  GENERATE MISSING TESTS              │   ┃
┃   │                                           │   │                                           │   ┃
┃   │   4 tests ready                           │   │   2 cases without tests                   │   ┃
┃   │   Last: ✅ All passed • 2 min ago         │   │   Transactions, User Settings             │   ┃
┃   │                                           │   │                                           │   ┃
┃   └───────────────────────────────────────────┘   └───────────────────────────────────────────┘   ┃
┃                                                                                                    ┃
┃                                                                                                    ┃
┃   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ┃
┃                                                                                                    ┃
┃   COVERAGE BY PRIORITY                                                                             ┃
┃                                                                                                    ┃
┃   ┌────────────────────────────────────────────────────────────────────────────────────────────┐  ┃
┃   │                                                                                            │  ┃
┃   │   CRITICAL    ████████████████████████████████████████████████████████████████   3/3 100% │  ┃
┃   │   HIGH        ████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   1/3  33% │  ┃
┃   │   MEDIUM      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0/0   —  │  ┃
┃   │                                                                                            │  ┃
┃   └────────────────────────────────────────────────────────────────────────────────────────────┘  ┃
┃                                                                                                    ┃
┃                                                                                                    ┃
┃   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ┃
┃                                                                                                    ┃
┃   SUITES                                                                       [ View All → ]     ┃
┃                                                                                                    ┃
┃   ┌────────────────────────────────────────────────────────────────────────────────────────────┐  ┃
┃   │                                                                                            │  ┃
┃   │    SUITE                    CASES      GENERATED     STATUS              PRIORITY          │  ┃
┃   │   ─────────────────────────────────────────────────────────────────────────────────────── │  ┃
┃   │                                                                                            │  ┃
┃   │    🔐 Authentication          3          3/3         ✅ Passing          CRITICAL     →   │  ┃
┃   │    💰 Bank Accounts           1          1/1         ✅ Passing          HIGH         →   │  ┃
┃   │    💸 Transactions            1          0/1         ⚪ No tests         HIGH         →   │  ┃
┃   │    👤 User Settings           1          0/1         ⚪ No tests         MEDIUM       →   │  ┃
┃   │                                                                                            │  ┃
┃   └────────────────────────────────────────────────────────────────────────────────────────────┘  ┃
┃                                                                                                    ┃
┃                                                                                                    ┃
┃   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ┃
┃                                                                                                    ┃
┃   RECENT ACTIVITY                                                                                  ┃
┃                                                                                                    ┃
┃   ┌────────────────────────────────────────────────────────────────────────────────────────────┐  ┃
┃   │                                                                                            │  ┃
┃   │    ✅  All tests passed (4/4)                                              2 min ago      │  ┃
┃   │    ✨  Generated: Create Bank Account                                      15 min ago     │  ┃
┃   │    🔍  Discovered 4 suites, 6 cases                                        1 hour ago     │  ┃
┃   │                                                                                            │  ┃
┃   └────────────────────────────────────────────────────────────────────────────────────────────┘  ┃
┃                                                                                                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Features:**
- **Coverage progress bar** - visual indicator of test coverage
- **Metric cards** - Pass rate, Total time, Flaky tests, Runs today (with trends)
- **Quick Actions** - Run All Tests, Generate Missing Tests (context-aware)
- **Coverage by Priority** - Shows CRITICAL/HIGH/MEDIUM coverage status
- **Suites summary table** - Compact view, one row per suite
- **Recent Activity** - Latest events
- Keyboard shortcuts support (⌘K, ⌘R)

---

## SCREEN 5a: Suites List

**Purpose:** Browse all test suites with details and actions

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  Test Suites                                                              [🔍 ⌘K]    [⚙️]        ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                                                    ┃
┃   4 suites  •  6 cases  •  36 steps                         [ ✨ Generate All ]   [ ▶ Run All ]   ┃
┃                                                                                                    ┃
┃   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ┃
┃                                                                                                    ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┃   🔐  AUTHENTICATION                                                           CRITICAL    ┃  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┃   3 cases  •  18 steps  •  3/3 generated  •  ✅ All passing                               ┃  ┃
┃   ┃   Last run: 4.1s  •  2 min ago                                                            ┃  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┃                                                              [ ▶ Run ]     [ View → ]     ┃  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃
┃                                                                                                    ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┃   💰  BANK ACCOUNTS                                                                HIGH    ┃  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┃   1 case  •  6 steps  •  1/1 generated  •  ✅ All passing                                 ┃  ┃
┃   ┃   Last run: 3.2s  •  2 min ago                                                            ┃  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┃                                                              [ ▶ Run ]     [ View → ]     ┃  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃
┃                                                                                                    ┃
┃   ┏╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍┓  ┃
┃   ╏                                                                                            ╏  ┃
┃   ╏   💸  TRANSACTIONS                                                                 HIGH    ╏  ┃
┃   ╏                                                                                            ╏  ┃
┃   ╏   1 case  •  6 steps  •  0/1 generated  •  ⚪ No tests yet                                ╏  ┃
┃   ╏                                                                                            ╏  ┃
┃   ╏                                                        [ ✨ Generate ]     [ View → ]     ╏  ┃
┃   ╏                                                                                            ╏  ┃
┃   ┗╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍┛  ┃
┃                                                                                                    ┃
┃   ┏╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍┓  ┃
┃   ╏                                                                                            ╏  ┃
┃   ╏   👤  USER SETTINGS                                                              MEDIUM    ╏  ┃
┃   ╏                                                                                            ╏  ┃
┃   ╏   1 case  •  6 steps  •  0/1 generated  •  ⚪ No tests yet                                ╏  ┃
┃   ╏                                                                                            ╏  ┃
┃   ╏                                                        [ ✨ Generate ]     [ View → ]     ╏  ┃
┃   ╏                                                                                            ╏  ┃
┃   ┗╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍┛  ┃
┃                                                                                                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Features:**
- Suite cards with solid border (has tests) vs dashed border (no tests)
- Context-aware CTA: "Run" for suites with tests, "Generate" for suites without
- Generated count (3/3 vs 0/1) clearly visible
- Last run info with timing
- Bulk actions at top (Generate All, Run All)

---

## SCREEN 6: Suite Detail - Test Cases

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ← Suites                 🔐 Authentication                                              [⚙️]    ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                                                    ┃
┃   CRITICAL  •  3 cases  •  18 steps  •  3/3 generated  •  ✅ All passing                          ┃
┃                                                                                                    ┃
┃                                                          [ ✨ Generate Missing ]  [ ▶ Run Suite ] ┃
┃                                                                                                    ┃
┃   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ┃
┃                                                                                                    ┃
┃   TEST CASES                                                                                       ┃
┃                                                                                                    ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┃   ✅  USER LOGIN                                                              CRITICAL     ┃  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┃       6 steps  •  🟢 Generated  •  user-login.spec.ts                                     ┃  ┃
┃   ┃       Last run: ✅ Passed  •  1.2s  •  2 min ago                                          ┃  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┃       ┌────────────────────────────────────────────────────────────────────────────────┐  ┃  ┃
┃   ┃       │ Navigate → Fill username → Fill password → Click submit → Wait API → Verify   │  ┃  ┃
┃   ┃       └────────────────────────────────────────────────────────────────────────────────┘  ┃  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┃                                          [ ▶ Run ]   [ 📝 Edit ]   [ 👁 Code ]   [ → ]    ┃  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃
┃                                                                                                    ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┃   ✅  USER REGISTRATION                                                       CRITICAL     ┃  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┃       6 steps  •  🟢 Generated  •  user-register.spec.ts                                  ┃  ┃
┃   ┃       Last run: ✅ Passed  •  2.1s  •  2 min ago                                          ┃  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┃       ┌────────────────────────────────────────────────────────────────────────────────┐  ┃  ┃
┃   ┃       │ Navigate → Fill firstName → Fill lastName → Fill username → Fill password →   │  ┃  ┃
┃   ┃       │ Click signup                                                                   │  ┃  ┃
┃   ┃       └────────────────────────────────────────────────────────────────────────────────┘  ┃  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┃                                          [ ▶ Run ]   [ 📝 Edit ]   [ 👁 Code ]   [ → ]    ┃  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃
┃                                                                                                    ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┃   ✅  INVALID LOGIN ATTEMPT                                                       HIGH     ┃  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┃       6 steps  •  🟢 Generated  •  user-invalid.spec.ts                                   ┃  ┃
┃   ┃       Last run: ✅ Passed  •  0.8s  •  2 min ago                                          ┃  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┃       ┌────────────────────────────────────────────────────────────────────────────────┐  ┃  ┃
┃   ┃       │ Navigate → Fill username → Fill wrong password → Click submit → Verify error  │  ┃  ┃
┃   ┃       │ → Verify still on login                                                        │  ┃  ┃
┃   ┃       └────────────────────────────────────────────────────────────────────────────────┘  ┃  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┃                                          [ ▶ Run ]   [ 📝 Edit ]   [ 👁 Code ]   [ → ]    ┃  ┃
┃   ┃                                                                                            ┃  ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃
┃                                                                                                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Features:**
- Suite-level stats at top (priority, cases, steps, generated count, status)
- Case cards with status icon (✅/❌/⚪)
- **Generated badge** (🟢 Generated) - clearly shows test exists
- **Steps preview** - inline flow visualization
- **Test file name** visible
- **Last run info** with timing
- Quick actions: Run, Edit, View Code, Navigate to detail

---

## SCREEN 7: Test Case Detail - Steps Tab

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ← Authentication              User Login                             [ ▶ Run ]  [ 🔄 Regenerate ]┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                                                    ┃
┃   CRITICAL  •  6 steps  •  🟢 Generated  •  user-login.spec.ts                                    ┃
┃   Last run: ✅ Passed  •  1.2s  •  2 min ago                                                      ┃
┃                                                                                                    ┃
┃   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ┃
┃                                                                                                    ┃
┃   [ Steps ]              [ Generated Code ]              [ Run History ]                          ┃
┃   ━━━━━━━━━                                                                                        ┃
┃                                                                                                    ┃
┃   ┌────────────────────────────────────────────────────────────────────────────────────────────┐  ┃
┃   │                                                                                            │  ┃
┃   │    #     ACTION          TARGET                              SELECTOR              TIME    │  ┃
┃   │   ───────────────────────────────────────────────────────────────────────────────────────  │  ┃
┃   │                                                                                            │  ┃
┃   │    1     🧭 Navigate     /signin                             —                      0.2s   │  ┃
┃   │                                                                                            │  ┃
┃   │    2     ✏️ Fill         Username field                      [data-test=            0.1s   │  ┃
┃   │                          admin@test.com                       signin-username]             │  ┃
┃   │                                                                                            │  ┃
┃   │    3     ✏️ Fill         Password field                      [data-test=            0.1s   │  ┃
┃   │                          ••••••••                             signin-password]             │  ┃
┃   │                                                                                            │  ┃
┃   │    4     👆 Click        Submit button                       [data-test=            0.1s   │  ┃
┃   │                                                               signin-submit]               │  ┃
┃   │                                                                                            │  ┃
┃   │    5     ⏳ Wait         POST /login                          —                      0.4s   │  ┃
┃   │                          Response: 200 OK                                                  │  ┃
┃   │                                                                                            │  ┃
┃   │    6     ✅ Verify       URL equals /dashboard                —                      0.3s   │  ┃
┃   │                                                                                            │  ┃
┃   └────────────────────────────────────────────────────────────────────────────────────────────┘  ┃
┃                                                                                                    ┃
┃   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ┃
┃                                                                                                    ┃
┃   TEST DATA                                                                                        ┃
┃   ┌────────────────────────────────────────────────────────────────────────────────────────────┐  ┃
┃   │                                                                                            │  ┃
┃   │   username:   admin@test.com                                     Source: seed data        │  ┃
┃   │   password:   Test1234!                                          Source: seed data        │  ┃
┃   │                                                                                            │  ┃
┃   └────────────────────────────────────────────────────────────────────────────────────────────┘  ┃
┃                                                                                                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Features:**
- **Tab navigation** (Steps / Generated Code / Run History)
- **Tabular steps view** with columns: #, Action, Target, Selector, Time
- Step icons by action type (🧭 Navigate, ✏️ Fill, 👆 Click, ⏳ Wait, ✅ Verify)
- Selector column shows exact selectors used
- Time per step for performance insights
- Test data section with source info

---

## SCREEN 7a: Test Case Detail - Code Tab

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ← Authentication              User Login                             [ ▶ Run ]  [ 🔄 Regenerate ]┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                                                    ┃
┃   CRITICAL  •  6 steps  •  🟢 Generated  •  user-login.spec.ts                                    ┃
┃   Last run: ✅ Passed  •  1.2s  •  2 min ago                                                      ┃
┃                                                                                                    ┃
┃   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ┃
┃                                                                                                    ┃
┃   [ Steps ]              [ Generated Code ]              [ Run History ]                          ┃
┃                          ━━━━━━━━━━━━━━━━━━                                                        ┃
┃                                                                                                    ┃
┃   ┌────────────────────────────────────────────────────────────────────────────────────────────┐  ┃
┃   │                                                                                            │  ┃
┃   │    1  │  import { test, expect } from '@playwright/test';                                 │  ┃
┃   │    2  │                                                                                    │  ┃
┃   │    3  │  test.describe('User Login', () => {                                              │  ┃
┃   │    4  │    test('should successfully log in with valid credentials', async ({ page }) =>  │  ┃
┃   │    5  │      // Step 1: Navigate to signin page                                           │  ┃
┃   │    6  │      await page.goto('/signin');                                                  │  ┃
┃   │    7  │                                                                                    │  ┃
┃   │    8  │      // Step 2: Fill username                                                     │  ┃
┃   │    9  │      await page.fill('[data-test="signin-username"]', 'admin@test.com');          │  ┃
┃   │   10  │                                                                                    │  ┃
┃   │   11  │      // Step 3: Fill password                                                     │  ┃
┃   │   12  │      await page.fill('[data-test="signin-password"]', 'Test1234!');               │  ┃
┃   │   13  │                                                                                    │  ┃
┃   │   14  │      // Step 4: Click submit button                                               │  ┃
┃   │   15  │      await page.click('[data-test="signin-submit"]');                             │  ┃
┃   │   16  │                                                                                    │  ┃
┃   │   17  │      // Step 5: Wait for login API                                                │  ┃
┃   │   18  │      await page.waitForResponse(resp =>                                           │  ┃
┃   │   19  │        resp.url().includes('/login') && resp.status() === 200                     │  ┃
┃   │   20  │      );                                                                            │  ┃
┃   │   21  │                                                                                    │  ┃
┃   │   22  │      // Step 6: Verify redirect to dashboard                                      │  ┃
┃   │   23  │      await expect(page).toHaveURL('/dashboard');                                  │  ┃
┃   │   24  │    });                                                                             │  ┃
┃   │   25  │  });                                                                               │  ┃
┃   │                                                                                            │  ┃
┃   └────────────────────────────────────────────────────────────────────────────────────────────┘  ┃
┃                                                                                                    ┃
┃   e2e/auth/user-login.spec.ts  •  25 lines              [ 📋 Copy ]   [ 📂 Open in Editor ]       ┃
┃                                                                                                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Features:**
- Monaco Editor with syntax highlighting
- Line numbers
- Copy to clipboard button
- Open in external editor button
- File path and line count shown

---

# 🧪 TEST GENERATION FLOW - DETAILED DESIGN

## Generation Model Clarification

**Key Concepts:**
- **Suite** = Logical group (e.g., "Authentication") - NOT directly generated, shows aggregated status
- **Case** = One test scenario = ONE `.spec.ts` file - THIS is what gets generated
- **Steps** = Actions within a test case - NOT generated individually

**Status Indicators:**
- `○` Empty circle = NOT generated (no test file exists)
- `✓` Checkmark = Generated (test file exists)
- Dashed border `┌ ─ ─ ┐` = No tests yet
- Solid border `┌─────┐` = Has test(s)

---

## SCREEN 5a-v2: Suites List (with Generation Status)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ← Test Suites                                                                                      ┃
┃  cypress-realworld-app • 4 suites, 12 cases                                                         ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                                                      ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃
┃   ┃   Overall Coverage                         ┌────────┐  ┌────────┐  ┌────────┐               ┃  ┃
┃   ┃   ████████░░░░░░░░░░░░░░░░░░░░ 25%         │   3    │  │   9    │  │   1    │               ┃  ┃
┃   ┃   3 / 12 cases have tests                  │  Done  │  │  Todo  │  │  Fail  │               ┃  ┃
┃   ┃                                            └────────┘  └────────┘  └────────┘               ┃  ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃
┃                                                                                                      ┃
┃   ┏╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍┓  ┃
┃   ╏   User Authentication     CRITICAL             0/3 cases         ⚡ Generate All            ╏  ┃
┃   ╏   3 cases • 15 steps • No tests yet                                                          ╏  ┃
┃   ┗╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍┛  ┃
┃                                                                                                      ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃
┃   ┃   Bank Account Management     HIGH             2/4 cases        ▶ Run    ⚡ Gen (2)          ┃  ┃
┃   ┃   4 cases • 22 steps • 2 tests ready                                                         ┃  ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃
┃                                                                                                      ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃
┃   ┃   Transaction Flow     HIGH                    1/3 cases        ▶ Run    ⚡ Gen (2)          ┃  ┃
┃   ┃   3 cases • 18 steps • 1 test ready                                                          ┃  ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃
┃                                                                                                      ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃
┃   ┃ ✓ User Settings     MEDIUM                     2/2 cases        ▶ Run All                   ┃  ┃
┃   ┃   2 cases • 8 steps • All tests ready                                                        ┃  ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃
┃                                                                                                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

LEGEND:
┏╍╍╍┓ = Dashed border (no tests yet)
┏━━━┓ = Solid border (has at least 1 test)
✓    = All cases done (green checkmark)
```

**Features:**
- **Dashed border** for suites with NO tests
- **Solid border** for suites with at least 1 test
- **Coverage stats** at top (Done/Todo/Fail counts)
- **Context-aware buttons**: "Generate All" vs "Run + Gen (N)"
- **✓ checkmark** when suite is fully covered

---

## SCREEN 6-v2: Suite Detail (Mix of Generated and Pending Cases)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ← User Authentication     CRITICAL                        ▶ Run (1)    ⚡ Generate (2)            ┃
┃  authentication • 3 cases • 15 steps                                                                ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                                                      ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃
┃   ┃   Suite Coverage                           ┌────────┐  ┌────────┐                            ┃  ┃
┃   ┃   ██████████░░░░░░░░░░░░░░░░░░░░ 33%       │   1    │  │   2    │                            ┃  ┃
┃   ┃   1 / 3 cases generated                    │  Done  │  │  Todo  │                            ┃  ┃
┃   ┃                                            └────────┘  └────────┘                            ┃  ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃
┃                                                                                                      ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃
┃   ┃                                                                                              ┃  ┃
┃   ┃   ✓ Successful login with valid credentials     CRITICAL                         ▶ Run      ┃  ┃
┃   ┃     Verify user can login with correct email and password                                    ┃  ┃
┃   ┃                                                                                              ┃  ┃
┃   ┃     ↗ navigate /signin                                                                       ┃  ┃
┃   ┃     ✎ fill username: "{{validUsername}}"                                                    ┃  ┃
┃   ┃     ✎ fill password: "{{validPassword}}"                                                    ┃  ┃
┃   ┃     +2 more steps                                                                            ┃  ┃
┃   ┃                                                                                              ┃  ┃
┃   ┃     5 steps • tests/auth/login-success.spec.ts                                           →   ┃  ┃
┃   ┃                                                                                              ┃  ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃
┃                                                                                                      ┃
┃   ┏╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍┓  ┃
┃   ╏                                                                                              ╏  ┃
┃   ╏   ○ Login fails with invalid password     HIGH                                   ⚡ Gen      ╏  ┃
┃   ╏     Verify error message when password is incorrect                                          ╏  ┃
┃   ╏                                                                                              ╏  ┃
┃   ╏     ↗ navigate /signin                                                                       ╏  ┃
┃   ╏     ✎ fill username: "{{validUsername}}"                                                    ╏  ┃
┃   ╏     ✎ fill password: "wrongPassword"                                                        ╏  ┃
┃   ╏     +1 more step                                                                             ╏  ┃
┃   ╏                                                                                              ╏  ┃
┃   ╏     4 steps • No test file                                                               →   ╏  ┃
┃   ╏                                                                                              ╏  ┃
┃   ┗╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍┛  ┃
┃                                                                                                      ┃
┃   ┏╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍┓  ┃
┃   ╏                                                                                              ╏  ┃
┃   ╏   ○ User logout flow     MEDIUM                                                  ⚡ Gen      ╏  ┃
┃   ╏     Verify user can successfully logout                                                      ╏  ┃
┃   ╏                                                                                              ╏  ┃
┃   ╏     6 steps • No test file                                                               →   ╏  ┃
┃   ╏                                                                                              ╏  ┃
┃   ┗╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍┛  ┃
┃                                                                                                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

KEY CHANGES:
- Header has BOTH buttons: "▶ Run (1)" and "⚡ Generate (2)"
- First case: solid border + ✓ + "▶ Run" button
- Other cases: dashed border + ○ + "⚡ Gen" button
- Footer shows test file path if exists
```

**Features:**
- **Header shows both actions** with counts
- **Solid border + ✓** for generated cases
- **Dashed border + ○** for pending cases
- **Steps preview** inline on each card
- **File path** shown when test exists

---

## SCREEN 7-v2: Case Detail - Steps Tab (Before Generation)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ← Successful login with valid credentials                                    ⚡ Generate Test     ┃
┃  User Authentication • 5 steps • ~25s                                                               ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                                                      ┃
┃   [ Steps ]              [ Code ]              [ History ]                                          ┃
┃   ━━━━━━━━━                                                                                          ┃
┃                                                                                                      ┃
┃   Test Steps                                                                                         ┃
┃                                                                                                      ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃
┃   ┃  1   ↗ navigate /signin                                                                      ┃  ┃
┃   ┃      Go to the sign in page                                                                  ┃  ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃
┃                                                                                                      ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃
┃   ┃  2   ✎ fill username: "{{validUsername}}"                                                   ┃  ┃
┃   ┃      → input[name="username"]                                                                ┃  ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃
┃                                                                                                      ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃
┃   ┃  3   ✎ fill password: "{{validPassword}}"                                                   ┃  ┃
┃   ┃      → input[name="password"]                                                                ┃  ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃
┃                                                                                                      ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃
┃   ┃  4   👆 click Submit                                                                         ┃  ┃
┃   ┃      → button[type="submit"]                                                                 ┃  ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃
┃                                                                                                      ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃
┃   ┃  5   👁 verify URL contains /dashboard                                                       ┃  ┃
┃   ┃      Assert user is redirected after login                                                   ┃  ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃
┃                                                                                                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## SCREEN 7a-v2: Case Detail - Code Tab (Empty State - Before Generation)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ← Successful login with valid credentials                                    ⚡ Generate Test     ┃
┃  User Authentication • 5 steps • ~25s                                                               ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                                                      ┃
┃   [ Steps ]              [• Code ]              [ History ]                                         ┃
┃                          ━━━━━━━━                                                                    ┃
┃                                                                                                      ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃
┃   ┃                                                                                              ┃  ┃
┃   ┃                                                                                              ┃  ┃
┃   ┃                         ┌─────────────────────────────────────┐                              ┃  ┃
┃   ┃                         │          📄                        │                              ┃  ┃
┃   ┃                         │                                    │                              ┃  ┃
┃   ┃                         │   No Test Generated Yet            │                              ┃  ┃
┃   ┃                         │                                    │                              ┃  ┃
┃   ┃                         │   Click "Generate Test" to         │                              ┃  ┃
┃   ┃                         │   create Playwright code from      │                              ┃  ┃
┃   ┃                         │   the 5 steps defined above.       │                              ┃  ┃
┃   ┃                         │                                    │                              ┃  ┃
┃   ┃                         │   ┌───────────────────────────┐    │                              ┃  ┃
┃   ┃                         │   │   ⚡ Generate Test        │    │                              ┃  ┃
┃   ┃                         │   └───────────────────────────┘    │                              ┃  ┃
┃   ┃                         │                                    │                              ┃  ┃
┃   ┃                         └─────────────────────────────────────┘                              ┃  ┃
┃   ┃                                                                                              ┃  ┃
┃   ┃                                                                                              ┃  ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃
┃                                                                                                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## SCREEN 8: Generating... (Progress Overlay)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ← Successful login with valid credentials                                    ⚡ Generating...     ┃
┃  User Authentication • 5 steps • ~25s                                                               ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                                                      ┃
┃   [ Steps ]              [• Code ]              [ History ]                                         ┃
┃                          ━━━━━━━━                                                                    ┃
┃                                                                                                      ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃
┃   ┃                                                                                              ┃  ┃
┃   ┃   ⚡ Generating Test Code...                                                                 ┃  ┃
┃   ┃   ━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 45%                        ┃  ┃
┃   ┃                                                                                              ┃  ┃
┃   ┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃  ┃
┃   ┃   ┃  ✓ Analyzing steps                                                                   ┃  ┃  ┃
┃   ┃   ┃  ✓ Detecting selectors                                                               ┃  ┃  ┃
┃   ┃   ┃  ● Generating Playwright code...                                                     ┃  ┃  ┃
┃   ┃   ┃  ○ Adding assertions                                                                 ┃  ┃  ┃
┃   ┃   ┃  ○ Finalizing                                                                        ┃  ┃  ┃
┃   ┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃  ┃
┃   ┃                                                                                              ┃  ┃
┃   ┃                                                        [ Cancel ]                            ┃  ┃
┃   ┃                                                                                              ┃  ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃
┃                                                                                                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## SCREEN 8a: Code Preview (After Generation, Before Save)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ← Successful login with valid credentials                                 💾 Save to Project      ┃
┃  User Authentication • 5 steps • ~25s                                                               ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                                                      ┃
┃   [ Steps ]              [• Code ]              [ History ]                                         ┃
┃                          ━━━━━━━━                                                                    ┃
┃                                                                                                      ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃
┃   ┃   📄 Preview                                            [Copy]  [Regenerate]                ┃  ┃
┃   ┃   Will be saved to: tests/auth/login-success.spec.ts                                         ┃  ┃
┃   ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  ┃
┃   ┃                                                                                              ┃  ┃
┃   ┃    1 │ import { test, expect } from '@playwright/test';                                     ┃  ┃
┃   ┃    2 │                                                                                      ┃  ┃
┃   ┃    3 │ test.describe('User Authentication', () => {                                         ┃  ┃
┃   ┃    4 │   test('Successful login with valid credentials', async ({                          ┃  ┃
┃   ┃    5 │     page                                                                             ┃  ┃
┃   ┃    6 │   }) => {                                                                            ┃  ┃
┃   ┃    7 │     // Step 1: Navigate to sign in page                                              ┃  ┃
┃   ┃    8 │     await page.goto('/signin');                                                      ┃  ┃
┃   ┃    9 │                                                                                      ┃  ┃
┃   ┃   10 │     // Step 2: Fill username                                                         ┃  ┃
┃   ┃   11 │     await page.fill('input[name="username"]', 'testuser');                           ┃  ┃
┃   ┃   12 │                                                                                      ┃  ┃
┃   ┃   13 │     // Step 3: Fill password                                                         ┃  ┃
┃   ┃   14 │     await page.fill('input[name="password"]', 'password1');                          ┃  ┃
┃   ┃   15 │                                                                                      ┃  ┃
┃   ┃   16 │     // Step 4: Click submit                                                          ┃  ┃
┃   ┃   17 │     await page.click('button[type="submit"]');                                       ┃  ┃
┃   ┃   18 │                                                                                      ┃  ┃
┃   ┃   19 │     // Step 5: Verify redirect                                                       ┃  ┃
┃   ┃   20 │     await expect(page).toHaveURL(/.*dashboard/);                                     ┃  ┃
┃   ┃   21 │   });                                                                                ┃  ┃
┃   ┃   22 │ });                                                                                  ┃  ┃
┃   ┃                                                                                              ┃  ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃
┃                                                                                                      ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃
┃   ┃                                   [ Discard ]        [ 💾 Save to Project ]                  ┃  ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃
┃                                                                                                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Features:**
- **Preview badge** - indicates this is NOT saved yet
- **Target file path** shown clearly
- **Copy** and **Regenerate** buttons
- **Discard** and **Save to Project** actions
- Monaco editor with syntax highlighting

---

## SCREEN 8b: Case Detail - Code Tab (After Save - Generated State)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ← Successful login with valid credentials  ✓                                      ▶ Run Test      ┃
┃  User Authentication • 5 steps • ~25s                                                               ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                                                      ┃
┃   [ Steps ]              [• Code ]              [ History ]                                         ┃
┃                          ━━━━━━━━                                                                    ┃
┃                                                                                                      ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃
┃   ┃   📄 tests/auth/login-success.spec.ts                 [Copy]  [Open]  [Regen]                ┃  ┃
┃   ┃   ✓ Saved • Last modified: Just now                                                          ┃  ┃
┃   ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  ┃
┃   ┃                                                                                              ┃  ┃
┃   ┃    1 │ import { test, expect } from '@playwright/test';                                     ┃  ┃
┃   ┃    2 │                                                                                      ┃  ┃
┃   ┃    3 │ test.describe('User Authentication', () => {                                         ┃  ┃
┃   ┃    4 │   test('Successful login with valid credentials', async ({                          ┃  ┃
┃   ┃   ...                                                                                        ┃  ┃
┃   ┃   22 │ });                                                                                  ┃  ┃
┃   ┃                                                                                              ┃  ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃
┃                                                                                                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

Header changes:
- ✓ badge next to title (green checkmark)
- Button changes from "Generate Test" → "▶ Run Test"
```

---

## SCREEN 8c: Generate All Modal (Batch Generation)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                                                      ┃
┃                                                                                                      ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓    ┃
┃   ┃                                                                                            ┃    ┃
┃   ┃   ⚡ Generate All Tests                                                                    ┃    ┃
┃   ┃                                                                                            ┃    ┃
┃   ┃   Generate Playwright tests for 2 cases in User Authentication                             ┃    ┃
┃   ┃                                                                                            ┃    ┃
┃   ┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃    ┃
┃   ┃   ┃  ✓ Login fails with invalid password                                       Done   ┃  ┃    ┃
┃   ┃   ┃    → tests/auth/login-invalid.spec.ts                                             ┃  ┃    ┃
┃   ┃   ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  ┃    ┃
┃   ┃   ┃  ● User logout flow                                                   Generating  ┃  ┃    ┃
┃   ┃   ┃    ━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 35%                     ┃  ┃    ┃
┃   ┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃    ┃
┃   ┃                                                                                            ┃    ┃
┃   ┃   Progress: 1/2 complete                                                                   ┃    ┃
┃   ┃                                                                                            ┃    ┃
┃   ┃                                                   [ Cancel ]     [ Hide ]                  ┃    ┃
┃   ┃                                                                                            ┃    ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛    ┃
┃                                                                                                      ┃
┃                                                                                                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## SCREEN 8d: Generate All Complete

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                                                      ┃
┃                                                                                                      ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓    ┃
┃   ┃                                                                                            ┃    ┃
┃   ┃   ✓ Generation Complete                                                                    ┃    ┃
┃   ┃                                                                                            ┃    ┃
┃   ┃   Successfully generated 2 tests                                                           ┃    ┃
┃   ┃                                                                                            ┃    ┃
┃   ┃   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃    ┃
┃   ┃   ┃  ✓ Login fails with invalid password                                              ┃  ┃    ┃
┃   ┃   ┃    tests/auth/login-invalid.spec.ts                                               ┃  ┃    ┃
┃   ┃   ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  ┃    ┃
┃   ┃   ┃  ✓ User logout flow                                                               ┃  ┃    ┃
┃   ┃   ┃    tests/auth/logout.spec.ts                                                      ┃  ┃    ┃
┃   ┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃    ┃
┃   ┃                                                                                            ┃    ┃
┃   ┃   Total: 2 files created, 45 lines of code                                                 ┃    ┃
┃   ┃                                                                                            ┃    ┃
┃   ┃                                          [ View Files ]     [ ▶ Run All ]                  ┃    ┃
┃   ┃                                                                                            ┃    ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛    ┃
┃                                                                                                      ┃
┃                                                                                                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## Generation Flow Summary

```
USER JOURNEY:

1. Suites List → See all suites, which have/don't have tests
                    ↓
2. Click Suite → Suite Detail with list of cases
                    ↓
3. Click "⚡ Generate" on Case → Go to Case Detail
                    ↓
4. Case Detail → Steps tab (see steps)
                    ↓
5. Click "⚡ Generate Test" → Generating... overlay
                    ↓
6. Code tab opens → Preview generated code
                    ↓
7. Click "💾 Save to Project" → File created
                    ↓
8. Case shows ✓ badge, button becomes "▶ Run Test"

ALTERNATIVE - BATCH:

3. Click "⚡ Generate All (3)" on Suite header
                    ↓
4. Modal with progress for all 3 cases
                    ↓
5. Complete → Option "▶ Run All"
```

---

## SCREEN 10: Test Execution - Live Progress

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  Running Tests                                                         [ ⏸ Pause ]   [ ⏹ Stop ]  ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                                                    ┃
┃   ████████████████████████████████░░░░░░░░░░░░░░░░   2/3 tests complete   •   3.3s elapsed        ┃
┃                                                                                                    ┃
┃   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ┃
┃                                                                                                    ┃
┃   ┌────────────────────────────────────────────────────────────────────────────────────────────┐  ┃
┃   │                                                                                            │  ┃
┃   │   ✅  User Login                                                                   1.2s    │  ┃
┃   │                                                                                            │  ┃
┃   │   ✅  User Registration                                                            2.1s    │  ┃
┃   │                                                                                            │  ┃
┃   │   🔄  Invalid Login Attempt                                                                │  ┃
┃   │       ├─ ✅ Navigate to /signin                                                    0.2s    │  ┃
┃   │       ├─ ✅ Fill username                                                          0.1s    │  ┃
┃   │       ├─ 🔄 Fill wrong password                                                    ...     │  ┃
┃   │       ├─ ⏳ Click submit                                                                   │  ┃
┃   │       ├─ ⏳ Verify error message                                                           │  ┃
┃   │       └─ ⏳ Verify still on login                                                          │  ┃
┃   │                                                                                            │  ┃
┃   └────────────────────────────────────────────────────────────────────────────────────────────┘  ┃
┃                                                                                                    ┃
┃   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ┃
┃                                                                                                    ┃
┃   CONSOLE                                                                        [ Expand ↓ ]     ┃
┃   ┌────────────────────────────────────────────────────────────────────────────────────────────┐  ┃
┃   │                                                                                            │  ┃
┃   │   [14:32:01] ▶ Starting: Authentication Suite                                             │  ┃
┃   │   [14:32:01] ▶ Test: User Login                                                           │  ┃
┃   │   [14:32:01]   ✓ Navigate to /signin (0.2s)                                               │  ┃
┃   │   [14:32:01]   ✓ Fill username (0.1s)                                                     │  ┃
┃   │   [14:32:02] ✅ User Login passed (1.2s)                                                  │  ┃
┃   │   [14:32:02] ▶ Test: User Registration                                                    │  ┃
┃   │                                                                                            │  ┃
┃   └────────────────────────────────────────────────────────────────────────────────────────────┘  ┃
┃                                                                                                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Features:**
- Progress bar with test count and elapsed time
- Test list with step-level expansion for running test
- Status icons: ✅ passed, 🔄 running, ⏳ pending
- Expandable console output
- Pause/Stop controls

---

## SCREEN 10a: Test Results - Success

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  Test Results                                                                     [ ✕ Close ]     ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                                                    ┃
┃   ✅  ALL TESTS PASSED                                                                            ┃
┃                                                                                                    ┃
┃   🔐 Authentication  •  3/3 passed  •  4.1s  •  Just now                                          ┃
┃                                                                                                    ┃
┃   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ┃
┃                                                                                                    ┃
┃   ┌────────────────────────────────────────────────────────────────────────────────────────────┐  ┃
┃   │                                                                                            │  ┃
┃   │   ✅  User Login                                                                   1.2s    │  ┃
┃   │       ├─ ✅ Navigate to /signin                                                    0.2s    │  ┃
┃   │       ├─ ✅ Fill username                                                          0.1s    │  ┃
┃   │       ├─ ✅ Fill password                                                          0.1s    │  ┃
┃   │       ├─ ✅ Click submit                                                           0.1s    │  ┃
┃   │       ├─ ✅ Wait for API                                                           0.4s    │  ┃
┃   │       └─ ✅ Verify redirect                                                        0.3s    │  ┃
┃   │                                                                                            │  ┃
┃   │   ✅  User Registration                                                            2.1s    │  ┃
┃   │       ├─ ✅ Navigate to /signup                                                    0.3s    │  ┃
┃   │       ├─ ✅ Fill firstName                                                         0.1s    │  ┃
┃   │       ├─ ✅ Fill lastName                                                          0.1s    │  ┃
┃   │       ├─ ✅ Fill username                                                          0.1s    │  ┃
┃   │       ├─ ✅ Fill password                                                          0.1s    │  ┃
┃   │       └─ ✅ Click signup                                                           1.4s    │  ┃
┃   │                                                                                            │  ┃
┃   │   ✅  Invalid Login Attempt                                                        0.8s    │  ┃
┃   │       ├─ ✅ Navigate to /signin                                                    0.2s    │  ┃
┃   │       ├─ ✅ Fill username                                                          0.1s    │  ┃
┃   │       ├─ ✅ Fill wrong password                                                    0.1s    │  ┃
┃   │       ├─ ✅ Click submit                                                           0.1s    │  ┃
┃   │       ├─ ✅ Verify error message                                                   0.2s    │  ┃
┃   │       └─ ✅ Verify still on login                                                  0.1s    │  ┃
┃   │                                                                                            │  ┃
┃   └────────────────────────────────────────────────────────────────────────────────────────────┘  ┃
┃                                                                                                    ┃
┃                                                 [ 📸 Screenshots ]   [ 🎬 Video ]   [ ▶ Run Again ]┃
┃                                                                                                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Features:**
- Clear success header with pass count
- Step-by-step results with timing
- Expandable test details
- Quick access to screenshots, video, re-run

---

## SCREEN 10b: Test Results - Failure

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  Test Results                                                                     [ ✕ Close ]     ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                                                    ┃
┃   ❌  1 TEST FAILED                                                                               ┃
┃                                                                                                    ┃
┃   🔐 Authentication  •  2/3 passed  •  3.5s  •  Just now                                          ┃
┃                                                                                                    ┃
┃   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ┃
┃                                                                                                    ┃
┃   ┌────────────────────────────────────────────────────────────────────────────────────────────┐  ┃
┃   │                                                                                            │  ┃
┃   │   ✅  User Login                                                                   1.2s    │  ┃
┃   │                                                                                            │  ┃
┃   │   ✅  User Registration                                                            2.1s    │  ┃
┃   │                                                                                            │  ┃
┃   │   ❌  Invalid Login Attempt                                                        0.2s    │  ┃
┃   │       ├─ ✅ Navigate to /signin                                                    0.2s    │  ┃
┃   │       ├─ ❌ Fill username                                                          FAIL    │  ┃
┃   │       │                                                                                    │  ┃
┃   │       │   ┌────────────────────────────────────────────────────────────────────────────┐  │  ┃
┃   │       │   │                                                                            │  │  ┃
┃   │       │   │  Error: Element not found                                                  │  │  ┃
┃   │       │   │  Selector: [data-test="signin-username"]                                   │  │  ┃
┃   │       │   │                                                                            │  │  ┃
┃   │       │   │  Waited 5000ms for selector to appear                                      │  │  ┃
┃   │       │   │  at user-invalid.spec.ts:9:18                                              │  │  ┃
┃   │       │   │                                                                            │  │  ┃
┃   │       │   └────────────────────────────────────────────────────────────────────────────┘  │  ┃
┃   │       │                                                                                    │  ┃
┃   │       │   💡 AI Suggestion: Selector may have changed.                                    │  ┃
┃   │       │      Try: [name="username"] or #username                                          │  ┃
┃   │       │                                                                                    │  ┃
┃   │       │                                      [ 🔧 Auto-fix ]   [ 📸 Screenshot ]          │  ┃
┃   │       │                                                                                    │  ┃
┃   │       ├─ ⏭ Fill wrong password                                                   SKIPPED  │  ┃
┃   │       ├─ ⏭ Click submit                                                          SKIPPED  │  ┃
┃   │       ├─ ⏭ Verify error message                                                  SKIPPED  │  ┃
┃   │       └─ ⏭ Verify still on login                                                 SKIPPED  │  ┃
┃   │                                                                                            │  ┃
┃   └────────────────────────────────────────────────────────────────────────────────────────────┘  ┃
┃                                                                                                    ┃
┃                                   [ 🔧 Fix All ]   [ 📸 Screenshots ]   [ ▶ Run Again ]           ┃
┃                                                                                                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Features:**
- Clear failure header with failed count
- **Inline error details** - shows exact error message, selector, file location
- **AI suggestion** for fixing the issue
- **Auto-fix button** - one click to apply AI suggestion
- Skipped steps shown with ⏭ icon
- Screenshot link for visual debugging

---

## SCREEN 11: Command Palette (⌘K)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                              ┃
┃                         (Backdrop blur overlay)                              ┃
┃                                                                              ┃
┃                                                                              ┃
┃              ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓                ┃
┃              ┃                                              ┃                ┃
┃              ┃  🔍  Type a command or search...             ┃                ┃
┃              ┃                                              ┃                ┃
┃              ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫                ┃
┃              ┃                                              ┃                ┃
┃              ┃  ✨  Generate Test for Flow...         ⌘G   ┃                ┃
┃              ┃  ▶️  Run All Tests                      ⌘R   ┃                ┃
┃              ┃  🧠  Run Smart Discovery                ⌘D   ┃                ┃
┃              ┃  ⚙️  Open Settings                      ⌘,   ┃                ┃
┃              ┃  📊  View Analytics                     ⌘A   ┃                ┃
┃              ┃  🔄  Refresh Dashboard                  ⌘⇧R  ┃                ┃
┃              ┃  📁  Change Project...                  ⌘O   ┃                ┃
┃              ┃                                              ┃                ┃
┃              ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛                ┃
┃                                                                              ┃
┃                                                                              ┃
┃                         Press ESC to close                                   ┃
┃                                                                              ┃
┃                                                                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Features:**
- Glassmorphism modal (blur backdrop)
- Fuzzy search
- Keyboard shortcuts shown
- Recent commands
- Categorized actions

---

## SCREEN 12: Settings Screen

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  Settings                                                                    ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                              ┃
┃  Project Configuration                                                       ┃
┃  ┌────────────────────────────────────────────────────────────────────┐     ┃
┃  │  Project Root:  /Users/nikola/Projects/stillstrom-be              │     ┃
┃  │  Base URL:      http://localhost:3000                              │     ┃
┃  │  Framework:     Playwright                                         │     ┃
┃  └────────────────────────────────────────────────────────────────────┘     ┃
┃                                                                              ┃
┃                                                                              ┃
┃  Test Generation Preferences                                                 ┃
┃  ┌────────────────────────────────────────────────────────────────────┐     ┃
┃  │  Selector Strategy:       [testid ▾]                               │     ┃
┃  │  Include Visual Tests:    [○ Disabled]                             │     ┃
┃  │  Generate POMs:           [● Enabled]                              │     ┃
┃  │  Test Data Strategy:      [Faker.js ▾]                             │     ┃
┃  └────────────────────────────────────────────────────────────────────┘     ┃
┃                                                                              ┃
┃                                                                              ┃
┃  Backend Configuration                                                       ┃
┃  ┌────────────────────────────────────────────────────────────────────┐     ┃
┃  │  Backend URL:    http://localhost:3001                             │     ┃
┃  │  Status:         🟢 Connected (52ms)                               │     ┃
┃  │  API Key:        [Configure...]                                    │     ┃
┃  └────────────────────────────────────────────────────────────────────┘     ┃
┃                                                                              ┃
┃                                                                              ┃
┃  Appearance                                                                  ┃
┃  ┌────────────────────────────────────────────────────────────────────┐     ┃
┃  │  Theme:          [● Dark]   [○ Light]   [○ Auto]                  │     ┃
┃  │  Accent Color:   [🔵 Blue]  [🟣 Purple]  [🟢 Green]              │     ┃
┃  │  Font Size:      [Medium ▾]                                       │     ┃
┃  └────────────────────────────────────────────────────────────────────┘     ┃
┃                                                                              ┃
┃                                                                              ┃
┃            [💾 Save Changes]            [↺ Reset to Defaults]                ┃
┃                                                                              ┃
┃                                                                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## 🎨 Design Features Summary

### Visual Style
- **Dark theme** with `#0A0E14` background (Warp-inspired)
- **Glassmorphism cards** with blur effects
- **Neon accents** (`#00D4FF`) for interactive elements
- **Multi-layer shadows** for depth
- **60fps animations** (Framer Motion)

### Typography
- **Inter Bold** for headings
- **Inter Regular** for body text
- **JetBrains Mono** for code

### Color Palette
```
Primary:    #0066FF (Electric Blue)
Secondary:  #8B5CF6 (Purple)
Success:    #10B981 (Green)
Warning:    #F59E0B (Amber)
Error:      #EF4444 (Red)
BG Dark:    #0A0E14 (Almost Black)
BG Card:    #151A21 (Dark Gray)
BG Hover:   #1D232A (Lighter Gray)
Text:       #E6EDF3 (Off White)
Text Muted: #8B949E (Gray)
Border:     #21262D (Subtle)
Accent:     #00D4FF (Neon Blue)
```

### Interactions
- Smooth hover states with scale transforms
- Click animations (scale down slightly)
- Loading skeletons for async content
- Toast notifications for user feedback
- Keyboard shortcuts everywhere (⌘K, ⌘G, ⌘R, etc.)

### Layout
```
┌────────────────────────────────────────────────────────────┐
│  [⚡] QAgent          [⌘K Search...]      [⚙️] [👤]        │ Titlebar (36px)
├──────────┬─────────────────────────────────────────────────┤
│          │                                                 │
│ SIDEBAR  │              MAIN CONTENT                       │
│  (240px) │              (Dynamic)                          │
│          │                                                 │
│ 🏠 Home  │                                                 │
│ 🎯 Flows │                                                 │
│ 📊 Tests │                                                 │
│ 🔍 Disc. │                                                 │
│ ⚙️ Setup │                                                 │
│ 📈 Anal. │                                                 │
│          │                                                 │
├──────────┴─────────────────────────────────────────────────┤
│ 🟢 Backend • React 18.2 • 42 Tests • 87% Coverage         │ Status (28px)
└────────────────────────────────────────────────────────────┘
```

### Responsive
- Window can be resized (min: 1200x800)
- Sidebar can collapse to icons only
- Cards adapt to container width
- Modals center on screen with overlay
- Scrollable content areas

---

## 🚀 Technical Implementation Notes

### Electron + React Stack
```
apps/desktop/
├── electron/
│   ├── main.ts              # Main process
│   ├── preload.ts           # IPC bridge
│   └── menu.ts              # App menu
├── src/
│   ├── components/          # React components
│   ├── screens/             # Full screen views
│   ├── services/            # API, WebSocket, IPC
│   ├── stores/              # Zustand state
│   └── styles/              # Tailwind + global CSS
```

### Backend API Integration
- **Base URL:** `http://localhost:3001`
- **Core APIs:**
  - `GET /health` - Health check
  - `POST /analyze/enhanced` - Project detection
  - `POST /analyze/suites/discover` - **Suite discovery** (NEW - returns complete Suite/Case/Step hierarchy)
  - `POST /analyze/generate-test` - Test generation
- **Legacy APIs (deprecated):**
  - `POST /analyze/journeys/discover` - Old flow-based discovery
  - `POST /analyze/journeys/:id/enrich` - Separate enrichment (no longer needed)
  - `POST /analyze/journeys/discover-and-enrich` - Combined (replaced by suites endpoint)
- **WebSocket:** `/discovery` namespace for real-time updates

### Key Technologies
- **Electron 28+** - Desktop framework
- **React 18** - UI library
- **TypeScript 5** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Radix UI** - Accessible components
- **Monaco Editor** - Code preview
- **Zustand** - State management
- **TanStack Query** - Server state
- **Socket.io Client** - Real-time

---

## 📋 Screen Flow Summary

1. **Setup Welcome** → Select project folder
2. **Project Detection** → Auto-detect tech stack  
3. **Configuration** → Set base URL, auth, framework
4. **Smart Discovery** → AI discovers Test Suites (Suite/Case/Step hierarchy)
5. **Dashboard** → Overview with coverage, metrics, quick actions, suites summary
6. **Suites List** → Browse all suites with context-aware actions (Run/Generate)
7. **Suite Detail** → View test cases with steps preview and generated status
8. **Case Detail - Steps** → Tabular view of steps with selectors and timing
9. **Case Detail - Code** → Generated Playwright code with syntax highlighting
10. **Test Generation** → AI creates test with progress and decisions explained
11. **Test Preview** → Review code before saving
12. **Test Execution** → Live progress with step-by-step status
13. **Test Results - Success** → Step-level results with timing
14. **Test Results - Failure** → Inline errors, AI suggestions, auto-fix
15. **Command Palette** → Quick actions (⌘K)
16. **Settings** → Configure app preferences

---

## 🎯 Next Steps for Implementation

1. **Phase 1:** ✅ Setup Electron + React + Vite boilerplate
2. **Phase 2:** ✅ Implement layout shell (titlebar, sidebar, status bar)
3. **Phase 3:** ✅ Build project setup flow (4 screens)
4. **Phase 4:** ✅ Create dashboard and suites screens (Suite/Case/Step architecture)
5. **Phase 5:** ✅ Hybrid layout with collapsible sidebar + ProjectSelector dropdown
6. **Phase 6:** 🔄 Implement test generation and execution (IN PROGRESS)
7. **Phase 7:** Polish animations and interactions
8. **Phase 8:** Add command palette and settings
9. **Phase 9:** Package for macOS, Windows, Linux

---

**Last Updated:** 2026-01-09  
**Status:** ✅ Core Implementation Complete - Suite Architecture Active  
**Current Phase:** Test Generation & Execution  
**Designer:** QAgent Team  
**Inspired By:** Warp Terminal + Lens IDE + VSCode

---

## 📊 Key UI Improvements (v2)

### Dashboard
- Coverage progress bar as primary visual
- Metric cards: Pass rate, Total time, Flaky tests, Runs today (with trends)
- Quick Actions: Run All, Generate Missing (context-aware)
- Coverage by Priority breakdown
- Compact suites table (not full cards)

### Suites List  
- Solid border for suites WITH tests
- Dashed border (╍╍╍) for suites WITHOUT tests
- Context CTA: "Run" vs "Generate" based on state
- Generated count clearly visible (3/3 vs 0/1)

### Suite/Case Detail
- Steps preview inline in case cards
- 🟢 Generated badge for cases with tests
- Tab navigation: Steps | Code | History
- Tabular steps view with columns

### Test Results
- Step-level results with timing
- Inline error details for failures
- AI suggestions with Auto-fix button
- Skipped steps shown clearly

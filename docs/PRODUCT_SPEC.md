# QAgenAI — Product Specification

## Executive Summary

QAgenAI is a **QA-first VS Code extension** for AI-powered test generation. Unlike developer-focused tools (Copilot, Cursor) that work file-by-file, QAgenAI uses a **flow-based, repo-aware** approach that matches how QA engineers think.

### Key Decisions

| Decision | Before | After |
|----------|--------|-------|
| Target user | Dev + QA dual mode | **QA-only single mode** |
| Mental model | File-based (test this file) | **Flow-based (test Login, Checkout)** |
| Scope | Single file | **Repo-wide intelligence** |
| Approach | Reactive (user picks) | **Proactive (AI prioritizes)** |

---

## Feature List

```
ONBOARDING (< 5 min)
├─ Welcome (QA-first messaging)
├─ Framework Detection (auto FE/BE/E2E/API)
├─ E2E Setup (URL, Auth, Import, Describe)
├─ Quick Scan (repo-wide analysis)
├─ Flow Discovery (AI detects user journeys)
└─ Ready → Dashboard

DASHBOARD (Daily Driver)
├─ Repo Snapshot (stack, files, last scan)
├─ Test Health (count, flaky, failing)
├─ Coverage Trend (current → goal, weekly delta)
├─ Quick Actions (Run, Generate, Scan)
│
├─ 🔥 RISK QUEUE
│   ├─ Files (0% coverage, high churn)
│   ├─ Flows (business-critical, no tests)
│   └─ Combined priority score
│
├─ 🧠 IMPACT MODE
│   ├─ Git diff analysis
│   ├─ Affected tests (direct + transitive)
│   ├─ Affected flows
│   └─ Run/Generate impacted only
│
├─ 📚 FLOW LIBRARY
│   ├─ CRUD flows
│   ├─ Import (Recording, Postman, OpenAPI, HAR)
│   ├─ Describe in plain English
│   └─ Assertions Builder (per step)
│
├─ ⚠️ FLAKY DETECTION
│   ├─ History tracking
│   ├─ Pattern recognition (timeout, race, network)
│   ├─ Auto-suggestions (wait, mock, selector)
│   └─ Quarantine config
│
├─ 🔧 SELF-HEALING
│   ├─ Fragile selector detection
│   ├─ Stable selector suggestions
│   ├─ Batch apply
│   └─ PR export
│
└─ 🚀 EXPORT TO CI
    ├─ GitHub Actions / GitLab CI / Azure / Circle
    ├─ Sharding config
    ├─ Artifacts upload
    ├─ Notifications
    └─ YAML preview + PR

TEST GENERATION
├─ Preview (see before generate)
├─ POM auto-generation
├─ Fixtures & test data
├─ API mocks
├─ Visual regression option
└─ Multiple outputs (local, PR, CI)

API TESTS
├─ Import Postman/OpenAPI/Insomnia/HAR
├─ Endpoint coverage tracking
├─ Schema validation tests
└─ Link to E2E flows (shared data)
```

---

## Value Propositions

### For QA Engineers (Individual)

| Win | How |
|-----|-----|
| **TTFV < 10 min** | URL + description → passing E2E test |
| **No code knowledge required** | Flow-first, plain English descriptions |
| **AI does prioritization** | Risk Queue tells you where to start |
| **Less flaky pain** | Self-healing + auto-suggestions |
| **Impact = less waiting** | Only affected tests in CI |

### For QA Teams

| Win | How |
|-----|-----|
| **Measurable progress** | Coverage trend, weekly delta |
| **Trust in tests** | Flaky detection + quarantine |
| **Standardization** | POM, fixtures, selector policy |
| **New member onboarding** | Flow Library = documentation |

### For Organizations

| Win | How |
|-----|-----|
| **No vendor lock-in** | Open Playwright/Jest code |
| **DevOps ready** | CI YAML in 30s |
| **API + E2E unified** | One tool, one strategy |
| **Cost effective** | VS Code extension, not enterprise suite |

---

## Product Analysis

### Strengths

1. **Clear persona focus** — QA engineers, not developers
2. **Differentiated mental model** — Flow-first, not file-first
3. **Repo-aware** — Smart prioritization, not blind generation
4. **Full lifecycle** — From description to PR to CI
5. **Self-healing** — Solves #1 E2E pain (flaky selectors)
6. **Open code** — No lock-in, easy migration

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| AI quality of generated tests | Iterate on prompts, user feedback loop |
| Flow detection accuracy | Manual override + user confirmation |
| Adoption friction | Strong onboarding, <10min TTFV |
| Competition from Copilot/Cursor | They're file-based, we're flow-based |

### Verdict

**7.5/10 → 9/10 potential** if AI quality and UX are good.

Product solves a **real problem** (QA teams lack good AI test gen tools) with a **clear differentiator** (flow-first + repo-aware).

---

## Buy Signal Analysis

**As QA Engineer:** ✅ YES
- Saves hours on boilerplate
- Risk Queue tells me where to focus
- Self-healing saves sanity

**As QA Lead:** ✅ YES
- Coverage trend for reporting
- Team standardization
- New member onboarding

**As Engineering Manager:** ✅ YES, but...
- Need to see ROI (time savings vs. cost)
- Need to see quality of generated tests
- Need to see it's not "another AI tool generating garbage"

**Pricing sweet spot:** $15-25/user/month (below enterprise, above free)

---

## Market Gap Analysis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MARKET LANDSCAPE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                        HIGH PRICE                                           │
│                            │                                                │
│         Testim ●           │          ● Mabl                                │
│         (no-code,          │          (enterprise,                          │
│          locked)           │           AI-powered)                          │
│                            │                                                │
│   Katalon ●                │                    ● Sauce Labs                │
│   (hybrid,                 │                    (infra focus)               │
│    complex)                │                                                │
│                            │                                                │
│ FILE-BASED ────────────────┼──────────────────────── FLOW-BASED            │
│                            │                                                │
│                            │                                                │
│   Copilot ●    ● Cursor    │                                                │
│   (dev-focused,            │        ★ QAgenAI                               │
│    file-based)             │        (QA-focused,                            │
│                            │         flow-based,                            │
│   Cody ●                   │         repo-aware,                            │
│   (generic AI)             │         open code)                             │
│                            │                                                │
│                        LOW PRICE                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Gap We Fill

| Competitor | Gap |
|------------|-----|
| Copilot/Cursor | File-based, dev mental model, no QA UX |
| Testim/Mabl | Expensive, no-code, vendor lock-in |
| Katalon | Complex, hybrid confusion |
| Diffblue | JVM only, not JS/TS ecosystem |

**QAgenAI fills:** QA-focused, flow-based, open code, accessible price + repo-aware intelligence + self-healing + impact mode + CI export

---

## User Journey Flow

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           QAgenAI USER JOURNEY                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝

┌─────────────┐
│  INSTALL    │
│  Extension  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ONBOARDING                                     │
│  ┌─────────┐   ┌───────────┐   ┌─────────┐   ┌───────────┐   ┌───────────┐  │
│  │Welcome  │ → │ Framework │ → │E2E Setup│ → │Quick Scan │ → │  Flow     │  │
│  │(QA-first│   │ Detection │   │URL/Auth │   │Repo-wide  │   │ Discovery │  │
│  │  intro) │   │(auto FE/BE│   │Import/  │   │analysis   │   │(AI finds  │  │
│  │         │   │ /E2E/API) │   │Describe │   │           │   │ journeys) │  │
│  └─────────┘   └───────────┘   └─────────┘   └───────────┘   └───────────┘  │
│                                                                      │      │
│                                                                      ▼      │
│                                                              ┌───────────┐  │
│                                                              │  READY!   │  │
│                                                              └───────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DASHBOARD                                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Repo Snapshot │ Test Health │ Coverage Trend │ Quick Actions        │    │
│  │ React/Nest/PW │ 234 (12 flaky) │ 54% → 80%   │ [Run] [Gen] [Scan]  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ 🔥 RISK      │  │ 🧠 IMPACT    │  │ 📚 FLOW      │  │ 🔧 SELF-     │     │
│  │    QUEUE     │  │    MODE      │  │    LIBRARY   │  │    HEALING   │     │
│  │              │  │              │  │              │  │              │     │
│  │ Files+Flows  │  │ Git diff →   │  │ CRUD flows   │  │ Selector     │     │
│  │ by risk      │  │ affected     │  │ Import/      │  │ fixes →      │     │
│  │ score        │  │ tests/flows  │  │ Describe     │  │ PR           │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │                 │             │
└─────────┼─────────────────┼─────────────────┼─────────────────┼─────────────┘
          │                 │                 │                 │
          ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GENERATION FLOW                                   │
│                                                                             │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐               │
│  │   PREVIEW     │ →  │   GENERATE    │ →  │   OUTPUT      │               │
│  │               │    │               │    │               │               │
│  │ • What files  │    │ • Tests       │    │ • Save local  │               │
│  │ • What tests  │    │ • POMs        │    │ • Create PR   │               │
│  │ • Coverage Δ  │    │ • Fixtures    │    │ • Export CI   │               │
│  │ • Risk Δ      │    │ • Mocks       │    │               │               │
│  └───────────────┘    └───────────────┘    └───────┬───────┘               │
│                                                    │                        │
└────────────────────────────────────────────────────┼────────────────────────┘
                                                     │
                                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            RUN & REPORT                                     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ✅ PASS  checkout.spec.ts                              [📹] [🔍]  │    │
│  │  ✅ PASS  login.spec.ts                                 [📹] [🔍]  │    │
│  │  ⚠️ FLAKY registration.spec.ts (34% fail rate)         [🔧 Heal]  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Coverage: 54% → 66% (+12%)                                                 │
│                                                                             │
│  [📹 Videos] [📸 Screenshots] [🔍 Traces] [📊 HTML Report]                  │
│                                                                             │
└──────────────────────────────────────────────────────┬──────────────────────┘
                                                       │
                          ┌────────────────────────────┼────────────────────┐
                          ▼                            ▼                    ▼
                  ┌───────────────┐          ┌───────────────┐    ┌───────────────┐
                  │  SELF-HEAL    │          │   CREATE PR   │    │  EXPORT CI    │
                  │               │          │               │    │               │
                  │ Fix selectors │          │ Tests + fixes │    │ GitHub/GitLab │
                  │ → PR patch    │          │ ready for     │    │ YAML ready    │
                  │               │          │ review        │    │               │
                  └───────────────┘          └───────────────┘    └───────────────┘
```

---

## UI Mockups

### Onboarding: Welcome

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                        ⚡ QAgenAI                               │
│                                                                 │
│           Flow-first test generation for QA engineers           │
│                                                                 │
│    ┌─────────────────────────────────────────────────────┐      │
│    │  ✓ Describe flows in plain English                  │      │
│    │  ✓ AI generates Playwright tests                    │      │
│    │  ✓ Self-healing selectors                           │      │
│    │  ✓ One-click CI export                              │      │
│    └─────────────────────────────────────────────────────┘      │
│                                                                 │
│              [ 🚀 Start QA Setup ]    [ Skip ]                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Onboarding: Framework Detection

```
┌───────────────────────────────────────────────────────────────┐
│  🎯 Detected Stack                                            │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Frontend   │ React 18 · TypeScript · Vite          [✓]  │ │
│  │ Backend    │ NestJS · TypeORM · PostgreSQL         [✓]  │ │
│  │ Unit       │ Jest · React Testing Library          [✓]  │ │
│  │ E2E        │ Playwright (installed)                [✓]  │ │
│  │ API        │ Postman collection found              [?]  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  [ ← Back ]                                    [ Continue → ] │
└───────────────────────────────────────────────────────────────┘
```

### Onboarding: E2E Setup

```
┌───────────────────────────────────────────────────────────────┐
│  🌐 E2E Configuration                                         │
│                                                               │
│  Base URL       [https://staging.myapp.com_____________]      │
│                                                               │
│  Authentication ○ None  ● Login form  ○ Bearer token          │
│    Username     [qa@myapp.com__________________________]      │
│    Password     [••••••••••____________________________]      │
│                                                               │
│  ─────────────────────────────────────────────────────────    │
│  Import sources (optional)                                    │
│    [📂 Import Playwright recording (.json)]                   │
│    [📂 Import Postman/Insomnia collection]                    │
│    [📂 Import OpenAPI spec (swagger.json)]                    │
│                                                               │
│  ─────────────────────────────────────────────────────────    │
│  Or describe a flow in plain English:                         │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ "User logs in, adds item to cart, proceeds to checkout, │ │
│  │  enters shipping info, pays with test card, sees        │ │
│  │  confirmation page with order number."                   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  [ ← Back ]                                    [ Continue → ] │
└───────────────────────────────────────────────────────────────┘
```

### Onboarding: Quick Scan

```
┌───────────────────────────────────────────────────────────────┐
│  🔍 Quick Scan                                                │
│  [████████████████████░░░░░░░░░]  68%                         │
│                                                               │
│  ✓ 847 source files indexed                                   │
│  ✓ 234 existing tests found                                   │
│  ✓ Coverage baseline: 54%                                     │
│  • Analyzing risk scores & gaps...                            │
│  • Detecting flow candidates...                               │
│                                                               │
│  Estimated: 12s remaining                                     │
│                                                               │
│  [ ← Back ]                                    [ Skip ▶ ]     │
└───────────────────────────────────────────────────────────────┘
```

### Onboarding: Flow Discovery

```
┌───────────────────────────────────────────────────────────────┐
│  📚 Discovered Flows                                          │
│  AI detected these user journeys in your codebase:            │
│                                                               │
│  ☑ Login/Logout           confidence 94%   routes: 2, comps: 5│
│  ☑ User Registration      confidence 91%   routes: 1, comps: 4│
│  ☑ Add to Cart            confidence 87%   routes: 2, comps: 6│
│  ☑ Checkout & Payment     confidence 85%   routes: 3, comps: 8│
│  ☐ Password Reset         confidence 78%   routes: 2, comps: 3│
│  ☐ Profile Settings       confidence 72%   routes: 1, comps: 4│
│                                                               │
│  [ Select All ]  [ Deselect All ]                             │
│                                                               │
│  + Add custom flow manually                                   │
│                                                               │
│  [ ← Back ]                                    [ Continue → ] │
└───────────────────────────────────────────────────────────────┘
```

### Onboarding: Ready

```
┌───────────────────────────────────────────────────────────────┐
│  🎉 Setup Complete!                                           │
│                                                               │
│  Summary:                                                     │
│  • Stack: React + NestJS + Playwright                         │
│  • Baseline coverage: 54% (goal: 80%)                         │
│  • 6 flows imported, 4 high-risk files detected               │
│  • Risk queue ready with prioritized suggestions              │
│                                                               │
│  What's next?                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐ │
│  │ 📊 Dashboard    │  │ 🎯 Fix My Tests │  │ ✨ Generate    │ │
│  │ See full status │  │ Start with risk │  │ New flow test  │ │
│  └─────────────────┘  └─────────────────┘  └────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

### Dashboard: Main View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  QAgenAI Dashboard                                          [⚙️] [🔄 Refresh]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌────────────┐ │
│  │ 📦 Repo         │ │ 🩺 Test Health  │ │ 📈 Coverage     │ │ ⚡ Actions │ │
│  │ React/Nest/PW   │ │ 234 tests       │ │ 54% → 80%       │ │ ▶ Run All  │ │
│  │ 847 files       │ │ 12 flaky        │ │ ▲ +3% this week │ │ ✨ Generate │ │
│  │ Last: 2h ago    │ │ 3 failing       │ │ [━━━━━━░░░░]    │ │ 🔍 Scan    │ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ └────────────┘ │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  🔥 RISK QUEUE (Files + Flows combined)                    [Filter ▾] [Sort]│
├─────────────────────────────────────────────────────────────────────────────┤
│  Priority │ Type │ Name                    │ Coverage │ Risk   │ Actions    │
│  ─────────┼──────┼─────────────────────────┼──────────┼────────┼────────────│
│  🔴 CRIT  │ Flow │ Checkout & Payment      │ 0%       │ 98     │ [Generate] │
│  🔴 CRIT  │ File │ payment.service.ts      │ 0%       │ 95     │ [Generate] │
│  🟠 HIGH  │ Flow │ User Registration       │ 23%      │ 82     │ [Generate] │
│  🟠 HIGH  │ File │ CartContext.tsx         │ 15%      │ 78     │ [Generate] │
│  🟡 MED   │ File │ useCheckout.ts          │ 45%      │ 55     │ [Generate] │
│  🟢 LOW   │ Flow │ Login/Logout            │ 89%      │ 12     │ [View]     │
│                                                                             │
│  Risk Score = f(coverage, churn, complexity, dependencies, business value) │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  🧠 IMPACT MODE (git diff analysis)                         [Branch: main] │
├─────────────────────────────────────────────────────────────────────────────┤
│  Changed files (last commit / PR):                                          │
│  • src/services/payment.service.ts  (+45, -12)                              │
│  • src/components/CheckoutForm.tsx  (+23, -8)                               │
│                                                                             │
│  Impacted tests:                                   Impacted flows:          │
│  • checkout.spec.ts (direct)                       • Checkout & Payment     │
│  • cart.spec.ts (transitive)                       • Add to Cart            │
│  • payment.unit.spec.ts (direct)                                            │
│                                                                             │
│  [▶ Run Impacted Tests]  [✨ Generate Missing]  [📋 Export Impact Report]   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  📚 FLOW LIBRARY                                    [+ New Flow] [Import ▾] │
├─────────────────────────────────────────────────────────────────────────────┤
│  Flow               │ Status   │ Tests │ Last Run  │ Actions                │
│  ───────────────────┼──────────┼───────┼───────────┼────────────────────────│
│  Login/Logout       │ ✅ Pass  │ 4     │ 2h ago    │ [Edit] [Run] [👁 View] │
│  User Registration  │ ⚠️ Flaky │ 3     │ 1d ago    │ [Edit] [Run] [🔧 Heal] │
│  Add to Cart        │ ✅ Pass  │ 5     │ 2h ago    │ [Edit] [Run] [👁 View] │
│  Checkout & Payment │ ❌ None  │ 0     │ —         │ [Edit] [✨ Generate]   │
│  Password Reset     │ ✅ Pass  │ 2     │ 3d ago    │ [Edit] [Run] [👁 View] │
│                                                                             │
│  [📂 Import Recording]  [📂 Import Postman]  [📝 Describe New Flow]         │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  ⚠️ FLAKY DETECTION                                      [View History]     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Test                        │ Flaky Rate │ Pattern        │ Suggestion     │
│  ────────────────────────────┼────────────┼────────────────┼────────────────│
│  registration.spec.ts:42     │ 34%        │ Timeout        │ [Add wait]     │
│  cart.spec.ts:78             │ 22%        │ Race condition │ [Fix selector] │
│  checkout.spec.ts:15         │ 18%        │ Network        │ [Mock API]     │
│                                                                             │
│  Auto-retry config: [2 retries] [Quarantine after 3 fails]                  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  🔧 SELF-HEALING                                         [Auto-PR: ON 🔘]  │
├─────────────────────────────────────────────────────────────────────────────┤
│  File                │ Issue                        │ Fix                   │
│  ────────────────────┼──────────────────────────────┼───────────────────────│
│  login.spec.ts:23    │ .submit-btn (fragile)        │ [data-testid=...]     │
│  cart.spec.ts:45     │ text="Add" (i18n risk)       │ [role="button"][name] │
│  checkout.spec.ts:67 │ nth-child(2) (order risk)    │ [data-testid=...]     │
│                                                                             │
│  [👁 Preview All]  [✅ Apply All]  [📤 Create PR with fixes]                │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  🚀 EXPORT TO CI                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  Target: ○ GitHub Actions  ● GitLab CI  ○ Azure Pipelines  ○ CircleCI       │
│                                                                             │
│  Options:                                                                   │
│  ☑ Run on PR (impacted tests only)                                         │
│  ☑ Run full suite on main branch                                           │
│  ☑ Parallel shards: [4]                                                    │
│  ☑ Upload artifacts (videos, traces, screenshots)                          │
│  ☑ Slack/Teams notification on failure                                     │
│  ☐ Auto-merge if green                                                     │
│                                                                             │
│  [👁 Preview YAML]  [📋 Copy]  [📤 Create PR with CI config]                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Flow Editor + Assertions Builder

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📝 Edit Flow: Checkout & Payment                              [Save] [Run] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Flow Steps                              │  Assertions Builder              │
│  ───────────────────────────────────────│────────────────────────────────── │
│  1. [Navigate] /cart                     │  Step 1:                         │
│     wait: networkidle                    │    ☑ URL contains "/cart"        │
│                                          │    ☑ Cart items visible          │
│  2. [Click] "Proceed to Checkout"        │                                  │
│     selector: [data-testid="checkout"]   │  Step 2:                         │
│                                          │    ☑ Navigate to /checkout       │
│  3. [Fill] Shipping form                 │                                  │
│     • address: "123 Test St"             │  Step 3:                         │
│     • city: "Test City"                  │    ☑ Form accepts input          │
│     • zip: "12345"                       │    ☑ Validation passes           │
│                                          │                                  │
│  4. [Fill] Payment                       │  Step 4:                         │
│     • card: "4242..."                    │    ☑ Card field masked           │
│     • exp: "12/25"                       │    ☑ No validation errors        │
│     • cvv: "123"                         │                                  │
│                                          │  Step 5:                         │
│  5. [Click] "Place Order"                │    ☑ Confirmation page shown     │
│     selector: [data-testid="place-order"]│    ☑ Order number present        │
│                                          │    ☑ Success toast visible       │
│  [+ Add Step]                            │    ☑ Email sent (API mock)       │
│                                          │                                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Selector Policy: ● data-testid  ○ role+name  ○ CSS (fallback)              │
│  Auto-wait:       ☑ networkidle  ☑ domcontentloaded  ☐ custom timeout       │
│  Retries:         [2]  Timeout:  [30s]                                      │
│                                                                             │
│  [👁 Preview Code]  [✨ Generate Test]  [▶ Run Locally]  [💾 Save Flow]     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Preview & Generate Modal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ✨ Preview: Checkout & Payment                                    [×]      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Will generate:                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ 📄 tests/e2e/flows/checkout.spec.ts                                    │ │
│  │ 📄 tests/e2e/pages/CheckoutPage.ts (POM)                               │ │
│  │ 📄 tests/e2e/pages/CartPage.ts (POM)                                   │ │
│  │ 📄 tests/e2e/fixtures/checkout.fixtures.ts                             │ │
│  │ 📄 tests/e2e/mocks/payment-api.mock.ts                                 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Tests to create:                                                           │
│  • test('should complete checkout with valid card')                         │
│  • test('should show error for invalid card')                               │
│  • test('should validate required shipping fields')                         │
│  • test('should apply discount code')                                       │
│  • test('should handle payment timeout gracefully')                         │
│                                                                             │
│  Estimated impact:                                                          │
│  • Coverage lift: +12% (54% → 66%)                                          │
│  • Risk reduction: Checkout flow 98 → 15                                    │
│  • Generation time: ~45s                                                    │
│                                                                             │
│  Options:                                                                   │
│  ☑ Generate Page Object Models                                              │
│  ☑ Generate fixtures/test data                                              │
│  ☑ Generate API mocks                                                       │
│  ☑ Add visual regression snapshots                                          │
│  ☐ Generate performance assertions                                          │
│                                                                             │
│  [📋 Copy Code]  [💾 Save Locally]  [📤 Create PR]  [▶ Generate & Run]      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Run & Report

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ▶ Test Run Results                                         [Re-run] [Export]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Summary: 5 passed, 0 failed, 0 skipped                    Duration: 12.4s  │
│  [████████████████████████████████████████] 100%                            │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ ✅ checkout.spec.ts                                                    │ │
│  │    ✓ should complete checkout with valid card (3.2s)      [📹] [🔍]   │ │
│  │    ✓ should show error for invalid card (2.1s)            [📹] [🔍]   │ │
│  │    ✓ should validate required shipping fields (1.8s)      [📹] [🔍]   │ │
│  │    ✓ should apply discount code (2.4s)                    [📹] [🔍]   │ │
│  │    ✓ should handle payment timeout gracefully (2.9s)      [📹] [🔍]   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Artifacts:                                                                 │
│  [📹 Videos]  [📸 Screenshots]  [🔍 Traces]  [📊 HTML Report]               │
│                                                                             │
│  Coverage update: 54% → 66% (+12%)                                          │
│                                                                             │
│  [📤 Commit Tests]  [📤 Create PR]  [🚀 Export to CI]                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### API Tests Import

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📂 Import API Tests                                               [×]      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Source: ○ Postman Collection  ● OpenAPI/Swagger  ○ Insomnia  ○ HAR file    │
│                                                                             │
│  File: [/path/to/swagger.json_________________________________] [Browse]    │
│                                                                             │
│  Detected endpoints:                                                        │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ ☑ POST /api/auth/login         → login.api.spec.ts                     │ │
│  │ ☑ POST /api/auth/register      → register.api.spec.ts                  │ │
│  │ ☑ GET  /api/products           → products.api.spec.ts                  │ │
│  │ ☑ POST /api/cart               → cart.api.spec.ts                      │ │
│  │ ☑ POST /api/orders             → orders.api.spec.ts                    │ │
│  │ ☑ GET  /api/orders/:id         → orders.api.spec.ts                    │ │
│  │ ☐ GET  /api/health             → (skip - health check)                 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Options:                                                                   │
│  ☑ Generate request/response validation                                     │
│  ☑ Generate auth token fixtures                                             │
│  ☑ Generate error case tests (4xx, 5xx)                                     │
│  ☑ Link to E2E flows (use same test data)                                   │
│                                                                             │
│  [👁 Preview]  [✨ Generate API Tests]                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### CI YAML Preview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  👁 Preview: .github/workflows/e2e-tests.yml                       [×]      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  name: E2E Tests                                                            │
│  on:                                                                        │
│    pull_request:                                                            │
│      branches: [main, develop]                                              │
│    push:                                                                    │
│      branches: [main]                                                       │
│                                                                             │
│  jobs:                                                                      │
│    e2e:                                                                     │
│      runs-on: ubuntu-latest                                                 │
│      strategy:                                                              │
│        matrix:                                                              │
│          shard: [1, 2, 3, 4]                                                │
│      steps:                                                                 │
│        - uses: actions/checkout@v4                                          │
│        - uses: actions/setup-node@v4                                        │
│        - run: npm ci                                                        │
│        - run: npx playwright install --with-deps                            │
│        - name: Run E2E (shard ${{ matrix.shard }}/4)                        │
│          run: npx playwright test --shard=${{ matrix.shard }}/4             │
│          env:                                                               │
│            BASE_URL: ${{ secrets.STAGING_URL }}                             │
│        - uses: actions/upload-artifact@v4                                   │
│          if: failure()                                                      │
│          with:                                                              │
│            name: playwright-report-${{ matrix.shard }}                      │
│            path: playwright-report/                                         │
│        - name: Notify Slack                                                 │
│          if: failure()                                                      │
│          uses: slackapi/slack-github-action@v1                              │
│                                                                             │
│  [📋 Copy]  [📤 Create PR]  [💾 Save to .github/]                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Auto-Detection Logic

### Framework Detection (Quick Scan)

```
Quick Scan analyzes:

1) package.json (dependencies + devDependencies)
   ├─ react/vue/angular/svelte     → FE detected
   ├─ express/nest/fastify/koa     → BE detected
   ├─ playwright/cypress/puppeteer → E2E detected
   └─ jest/vitest/mocha            → Unit framework

2) Config files
   ├─ tsconfig.json, vite.config   → FE build
   ├─ nest-cli.json, ormconfig     → BE (NestJS, TypeORM)
   ├─ playwright.config.ts         → E2E setup
   └─ jest.config.js               → Test runner

3) Folder structure
   ├─ src/components/, src/pages/  → FE code
   ├─ src/services/, src/controllers/ → BE code
   ├─ tests/e2e/, e2e/             → E2E tests
   └─ tests/unit/, __tests__/      → Unit tests

4) Existing collections (optional)
   ├─ *.postman_collection.json    → API tests exist
   └─ swagger.json, openapi.yaml   → API spec exists
```

### Decision Logic

```
IF react|vue|angular|svelte IN dependencies → FE = true
IF express|nest|fastify|hapi IN dependencies → BE = true
IF playwright|cypress IN devDependencies → E2E = framework_name
IF jest|vitest|mocha IN devDependencies → Unit = framework_name

Monorepo detection:
IF apps/ OR packages/ folder exists → scan each subfolder separately
   → apps/web = FE, apps/api = BE, etc.
```

---

## Complete Feature Matrix

| Category | Feature | Description |
|----------|---------|-------------|
| **Onboarding** | Framework Detection | Auto-detect FE/BE/E2E/API stack |
| | E2E Setup | URL, auth, recording/Postman import |
| | Quick Scan | Repo-wide analysis of files, tests, coverage, risks |
| | Flow Discovery | AI detection of user journey candidates |
| **Dashboard** | Repo Snapshot | Stack info, file count, last scan |
| | Test Health | Test count, flaky count, failing count |
| | Coverage Trend | Current %, goal %, weekly trend |
| | Quick Actions | Run All, Generate, Scan |
| **Risk Queue** | File Risk | 0% coverage + high churn = critical |
| | Flow Risk | Business flows without tests |
| | Combined Prioritization | Files + Flows sorted by risk score |
| **Impact Mode** | Git Diff Analysis | Changed files detection |
| | Affected Tests | Direct + transitive dependencies |
| | Affected Flows | Flows linked to changed code |
| | Actions | Run impacted, Generate missing, Export report |
| **Flow Library** | CRUD Flows | Create, edit, delete, duplicate |
| | Import Sources | Recording, Postman, OpenAPI, HAR, plain English |
| | Assertions Builder | Visual assertion editor per step |
| | Selector Policy | testid/role/CSS preference |
| **Test Generation** | Preview | See what will be generated before action |
| | POM Generation | Page Object Models auto-created |
| | Fixtures | Test data, auth tokens, mocks |
| | API Mocks | Mock external services |
| | Visual Regression | Screenshot comparison option |
| **Run & Report** | Local Execution | Run tests with progress |
| | Artifacts | Videos, screenshots, traces, HTML report |
| | Coverage Update | Live coverage delta |
| **Flaky Detection** | History Tracking | Per-test pass/fail history |
| | Pattern Recognition | Timeout, race condition, network |
| | Auto-suggestions | Add wait, fix selector, mock API |
| | Quarantine | Auto-quarantine after N fails |
| **Self-healing** | Selector Analysis | Detect fragile selectors |
| | Fix Suggestions | Stable selector alternatives |
| | Batch Apply | Apply all fixes at once |
| | PR Export | Create PR with fixes |
| **Export to CI** | Multi-platform | GitHub Actions, GitLab CI, Azure, Circle |
| | Sharding | Parallel test distribution |
| | Artifacts Upload | Videos, traces, reports |
| | Notifications | Slack/Teams on failure |
| | YAML Preview | See config before creating |
| **API Tests** | Import Collections | Postman, Insomnia, OpenAPI, HAR |
| | Endpoint Coverage | Track API test coverage |
| | Request/Response Validation | Schema-based assertions |
| | Link to E2E | Share test data with flows |

---

## Final Verdict

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ✅ PROBLEM SOLVED:     QA lacks good AI tools for test generation         │
│   ✅ CLEAR DIFFERENTIATOR: Flow-first + repo-aware + self-healing           │
│   ✅ MARKET GAP FILLED:   Between expensive enterprise & dev-focused AI     │
│   ✅ FULL LIFECYCLE:      Describe → Generate → Run → Heal → PR → CI        │
│   ✅ NO LOCK-IN:          Open Playwright/Jest code                         │
│                                                                             │
│   ⚠️ SUCCESS DEPENDS ON:  AI generation quality + UX polish                 │
│                                                                             │
│   💰 BUY SIGNAL:          Strong for QA teams tired of manual work          │
│                           and frustrated with dev-centric AI tools          │
│                                                                             │
│   🎯 RECOMMENDATION:      BUILD IT                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

*Document generated: December 2024*
*Version: 1.0*

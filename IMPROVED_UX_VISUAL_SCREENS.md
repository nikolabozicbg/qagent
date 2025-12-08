# QAgenAI - Complete Visual Screens (Improved UX)

> **All screens for the improved user experience flow**

---

## 📱 SCREEN 1: Extension Activation - First View (Collapsed)

```
┌─────────────────────────────────────────────────────────────┐
│ QAGENAI                                              [⚙️] [↻] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 📊 Test Coverage Dashboard                                  │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ TypeScript API Project                               │   │
│ │ Coverage: 14% (6 of 44 files tested)                │   │
│ │                                                       │   │
│ │ 🚨 Critical Actions                                  │   │
│ │ ├─ 8 high-priority files need tests  [Fix All ▶]   │   │
│ │ ├─ Setup Integration testing         [Setup ▶]     │   │
│ │ └─ 2 failed tests from last run      [Debug]       │   │
│ │                                                       │   │
│ │ [View Full Analysis ▼]                              │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ─────────────────────────────────────────────────────────   │
│                                                              │
│ 📊 Coverage by Layer                        [Expand ▼]      │
│                                                              │
│ 🧪 Coverage by Test Type                    [Expand ▼]      │
│                                                              │
│ 🔧 Testing Setup                            [Expand ▼]      │
│                                                              │
│ 📁 Files Needing Tests (38)                [Expand ▼]      │
│                                                              │
│ ✅ Files With Tests (6)                     [Expand ▼]      │
│                                                              │
└─────────────────────────────────────────────────────────────┘

STATUS BAR (bottom):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 14% | 8 gaps [Click for actions]                    🟢 QAgenAI
```

**Key Features:**
- Zero-click visibility - coverage status immediately visible
- Critical Actions card prioritized at top
- All sections collapsed by default (low cognitive load)
- Status bar integration for persistent visibility

---

## 📱 SCREEN 2: View Full Analysis - Expanded Critical Section

```
┌─────────────────────────────────────────────────────────────┐
│ QAGENAI                                              [⚙️] [↻] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 📊 Test Coverage Dashboard                                  │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ TypeScript API Project                               │   │
│ │ Coverage: 14% (6 of 44 files tested)                │   │
│ │                                                       │   │
│ │ 🚨 Critical Actions                        [Hide ▲] │   │
│ │                                                       │   │
│ │ ├─ 📦 8 high-priority files need tests              │   │
│ │ │  Files: PaymentService, AuthService, OrderRepo... │   │
│ │ │  [Fix All ▶] [View List]                         │   │
│ │ │                                                    │   │
│ │ ├─ 🔧 Setup Integration testing                     │   │
│ │ │  Recommended: Jest + Supertest for API layer     │   │
│ │ │  [Quick Setup ▶] [Learn More]                    │   │
│ │ │                                                    │   │
│ │ └─ ❌ 2 failed tests from last run                  │   │
│ │    PaymentService.test.ts, OrderService.test.ts    │   │
│ │    [Debug Now] [View Output] [Rerun]               │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ─────────────────────────────────────────────────────────   │
│                                                              │
│ 📊 Coverage by Layer                        [Expand ▼]      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Critical Actions expanded with actionable details
- Multiple quick action buttons per item
- Context provided (why it's critical, what needs to be done)
- Collapsible to reduce clutter when not needed

---

## 📱 SCREEN 3: Coverage by Layer - Expanded View

```
┌─────────────────────────────────────────────────────────────┐
│ QAGENAI                                              [⚙️] [↻] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 📊 Coverage by Layer                           [Hide ▲]     │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ View: [● By Layer] [ By Test Type] [By Framework]   │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │                                                       │   │
│ │ 🌐 API Layer (Backend)            60% ████████░░    │   │
│ │    ├─ 🧪 Unit Tests               75% (15/20 files) │   │
│ │    │  Output: tests/api/unit/                      │   │
│ │    │  [Run All ▶] [Generate Missing 5]            │   │
│ │    │                                                │   │
│ │    ├─ 🔗 Integration Tests        40% (6/15 files) │   │
│ │    │  Output: tests/api/integration/               │   │
│ │    │  [Run All ▶] [Generate Missing 9]            │   │
│ │    │                                                │   │
│ │    └─ 🌐 E2E Tests                 0% (0/5 files)  │   │
│ │       Framework: Not installed                     │   │
│ │       [Setup Playwright] [Learn More]              │   │
│ │                                                     │   │
│ │ 🎨 UI Layer (Frontend)            55% ███████░░░   │   │
│ │    ├─ 🧩 Component Tests          60% (18/30)      │   │
│ │    │  Output: src/components/__tests__/            │   │
│ │    │  [Run All ▶] [Generate Missing 12]           │   │
│ │    │                                                │   │
│ │    └─ 🌐 E2E Tests                10% (2/20)       │   │
│ │       Output: tests/e2e/                           │   │
│ │       [Run All ▶] [Generate Missing 18]           │   │
│ │                                                     │   │
│ │ 🗄️ Database Layer                 30% ████░░░░░░   │   │
│ │    └─ 🔗 Integration Tests        30% (3/10)       │   │
│ │       Output: tests/database/                      │   │
│ │       [Setup Testcontainers] [Generate 7]          │   │
│ │                                                     │   │
│ │ 🏗️ Infrastructure Layer           0%  ░░░░░░░░░░   │   │
│ │    └─ 🧪 Unit Tests                0% (0/5)        │   │
│ │       Output: tests/infrastructure/                │   │
│ │       [Generate All 5]                             │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ 🔧 Testing Setup                            [Expand ▼]      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Layer-first organization (API/UI/Database/Infrastructure)
- Visual progress bars per layer
- Test types nested under layers
- Output paths always visible
- Bulk actions per layer (Run All, Generate Missing)
- Tab switching (By Layer / By Test Type / By Framework)

---

## 📱 SCREEN 4: Coverage by Test Type - Alternative View

```
┌─────────────────────────────────────────────────────────────┐
│ QAGENAI                                              [⚙️] [↻] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 📊 Coverage by Layer                           [Hide ▲]     │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ View: [ By Layer] [● By Test Type] [By Framework]   │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │                                                       │   │
│ │ 🧪 Unit Tests                     75% █████████░    │   │
│ │    ├─ 🌐 API Layer                75% (15/20)       │   │
│ │    │  Framework: Jest                               │   │
│ │    │  Output: tests/api/unit/                      │   │
│ │    │  [Run ▶] [Generate Missing 5]                 │   │
│ │    │                                                │   │
│ │    └─ 🏗️ Infrastructure           0% (0/5)         │   │
│ │       Framework: Jest                               │   │
│ │       [Generate All 5]                             │   │
│ │                                                     │   │
│ │ 🔗 Integration Tests              35% █████░░░░░   │   │
│ │    ├─ 🌐 API Layer                40% (6/15)        │   │
│ │    │  Framework: Jest + Supertest                  │   │
│ │    │  [Run ▶] [Generate Missing 9]                 │   │
│ │    │                                                │   │
│ │    └─ 🗄️ Database Layer           30% (3/10)       │   │
│ │       Framework: Testcontainers                    │   │
│ │       [Run ▶] [Generate 7]                         │   │
│ │                                                     │   │
│ │ 🧩 Component Tests                60% ████████░░   │   │
│ │    └─ 🎨 UI Layer                 60% (18/30)      │   │
│ │       Framework: React Testing Library             │   │
│ │       [Run ▶] [Generate Missing 12]                │   │
│ │                                                     │   │
│ │ 🌐 E2E Tests                       5% ██░░░░░░░░   │   │
│ │    ├─ 🎨 UI Layer                 10% (2/20)       │   │
│ │    └─ 🌐 API Layer                 0% (0/5)        │   │
│ │       Framework: Not installed                     │   │
│ │       [Setup Playwright]                           │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Test type first, layers nested underneath
- Same data, different mental model
- Framework shown per test type
- User can switch views based on workflow preference

---

## 📱 SCREEN 5: Files Needing Tests - Risk-First Organization

```
┌─────────────────────────────────────────────────────────────┐
│ QAGENAI                                              [⚙️] [↻] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 📁 Files Needing Tests (38 files)             [Hide ▲]      │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Sort: [● Risk] [Alphabetical] [LOC] [Recent]        │   │
│ │ Filter: [All] [API] [UI] [Database]                 │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │                                                       │   │
│ │ 🚨 CRITICAL - Business Logic (8 files)  [Collapse ▼]│   │
│ │                                                       │   │
│ │ ├─ 🌐 PaymentService.ts                  API Layer  │   │
│ │ │  ├─ 250 LOC • High complexity                    │   │
│ │ │  ├─ 15 commits this week • Security critical     │   │
│ │ │  │                                                │   │
│ │ │  ├─ 📝 Will generate:                            │   │
│ │ │  │  └─ tests/api/payment-service.test.ts        │   │
│ │ │  │                                                │   │
│ │ │  ├─ ⭐ API Integration Test (BEST)    [Generate ▶]│   │
│ │ │  │  Framework: Jest + Supertest                  │   │
│ │ │  │  Coverage: All 8 endpoints + edge cases       │   │
│ │ │  │  Run: npm test -- payment-service             │   │
│ │ │  │  [Preview Structure]                          │   │
│ │ │  │                                                │   │
│ │ │  └─ 💡 Unit Test (Alternative)        [Generate ▶]│   │
│ │ │     Framework: Jest                               │   │
│ │ │     Coverage: Business logic only                │   │
│ │ │                                                   │   │
│ │ ├─ 🗄️ PaymentRepository.ts              DB Layer   │   │
│ │ │  ├─ 180 LOC • Database operations                │   │
│ │ │  ├─ 📝 tests/database/payment-repo.test.ts       │   │
│ │ │  │                                                │   │
│ │ │  └─ 🔗 Integration Test (BEST)        [Generate ▶]│   │
│ │ │     Framework: Jest + Testcontainers             │   │
│ │ │     [Preview Structure]                          │   │
│ │ │                                                   │   │
│ │ ├─ 🎨 CheckoutForm.tsx                   UI Layer  │   │
│ │ │  ├─ 150 LOC • Critical user flow                │   │
│ │ │  ├─ 📝 src/components/__tests__/checkout.test.tsx│   │
│ │ │  │                                                │   │
│ │ │  └─ 🧩 Component Test (BEST)          [Generate ▶]│   │
│ │ │     Framework: React Testing Library             │   │
│ │ │                                                   │   │
│ │ └─ ... (5 more)                         [Show All]  │   │
│ │                                                       │   │
│ │ ⚠️ HIGH PRIORITY (12 files)             [Expand ▼]  │   │
│ │                                                       │   │
│ │ 🟡 MEDIUM PRIORITY (18 files)           [Expand ▼]  │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Risk-first sorting (CRITICAL → HIGH → MEDIUM → LOW)
- Layer badges (🌐 API, 🗄️ DB, 🎨 UI) immediately visible
- Output path always shown inline
- Multiple test type options with recommendations
- "BEST" label explains which test type to choose
- Preview Structure option before generation
- Smart collapsing (MEDIUM/LOW collapsed by default)

---

## 📱 SCREEN 6: Generate Test - Preview Modal

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ │ 🎯 Generate API Integration Test                       │ │
│ │                                                         │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │                                                         │ │
│ │ 📄 File: src/api/services/PaymentService.ts           │ │
│ │ 🌐 Layer: API / REST Endpoints                         │ │
│ │ 🔍 Detected: 8 endpoints, 5 dependencies, 2 models    │ │
│ │                                                         │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │                                                         │ │
│ │ 📋 Test Structure Preview:                             │ │
│ │                                                         │ │
│ │ 📄 tests/api/payment-service.test.ts                  │ │
│ │    │                                                    │ │
│ │    ├─ 📦 POST /api/payments                            │ │
│ │    │  ├─ ✅ Success (200) - Valid credit card         │ │
│ │    │  ├─ ❌ Invalid card (400) - Wrong card number    │ │
│ │    │  ├─ ❌ Insufficient funds (402)                   │ │
│ │    │  └─ ❌ Server error (500) - Payment gateway down │ │
│ │    │                                                    │ │
│ │    ├─ 📦 POST /api/refunds                             │ │
│ │    │  ├─ ✅ Success (200) - Valid refund               │ │
│ │    │  ├─ ❌ Not found (404) - Payment doesn't exist   │ │
│ │    │  └─ ❌ Already refunded (409)                     │ │
│ │    │                                                    │ │
│ │    ├─ 📦 GET /api/payments/:id                         │ │
│ │    │  ├─ ✅ Success (200) - Payment found             │ │
│ │    │  └─ ❌ Not found (404)                            │ │
│ │    │                                                    │ │
│ │    ├─ 📦 GET /api/payments (list)                      │ │
│ │    │  ├─ ✅ Success (200) - Empty list                │ │
│ │    │  └─ ✅ Success (200) - With pagination           │ │
│ │    │                                                    │ │
│ │    └─ 🛡️ Authorization Tests                          │ │
│ │       ├─ ❌ Unauthorized (401) - No token             │ │
│ │       └─ ❌ Forbidden (403) - Insufficient role       │ │
│ │                                                         │ │
│ │ 📊 Estimated: 15 test scenarios • ~220 LOC            │ │
│ │                                                         │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │                                                         │ │
│ │ ⚙️ Configuration:                                       │ │
│ │                                                         │ │
│ │ Framework:  Jest v29.5 + Supertest v6.3               │ │
│ │ Test Type:  Integration (real HTTP requests)          │ │
│ │ Mocking:    ✅ Auto-detect dependencies                │ │
│ │             • PaymentGateway (mocked)                 │ │
│ │             • DatabaseService (mocked)                │ │
│ │             • Logger (mocked)                         │ │
│ │ Coverage:   Comprehensive (happy + edge + error)      │ │
│ │                                                         │ │
│ │ 🚀 Run command after generation:                       │ │
│ │ npm test -- payment-service                            │ │
│ │                                                         │ │
│ │ 💡 Tip: Tests will use in-memory test database        │ │
│ │                                                         │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │                                                         │ │
│ │ [← Back]  [⚙️ Customize]  [✅ Generate Test ▶]       │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Complete test structure preview BEFORE generation
- Endpoint-by-endpoint breakdown with scenarios
- Estimated scope (15 tests, ~220 LOC) - no surprises
- Detected dependencies shown
- Framework versions visible
- Mocking strategy explained
- Run command ready to copy
- Customize option for advanced users
- Clear visual hierarchy with icons

---

## 📱 SCREEN 7: Generation Success - Next Steps

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ │ ✅ Test Generated Successfully!                         │ │
│ │                                                         │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │                                                         │ │
│ │ 📄 Created: tests/api/payment-service.test.ts         │ │
│ │                                                         │ │
│ │ 📊 Test Details:                                       │ │
│ │ • 15 test scenarios                                    │ │
│ │ • 218 lines of code                                    │ │
│ │ • Framework: Jest + Supertest                          │ │
│ │ • Type: Integration Test                               │ │
│ │                                                         │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │                                                         │ │
│ │ 🚀 Next Steps:                                          │ │
│ │                                                         │ │
│ │ ┌─────────────────────────────────────────────────┐   │ │
│ │ │ 📂 [Open Test File]                             │   │ │
│ │ │ View the generated test code in editor          │   │ │
│ │ └─────────────────────────────────────────────────┘   │ │
│ │                                                         │ │
│ │ ┌─────────────────────────────────────────────────┐   │ │
│ │ │ ▶️ [Run Tests Now]                               │   │ │
│ │ │ Execute tests to verify they pass               │   │ │
│ │ └─────────────────────────────────────────────────┘   │ │
│ │                                                         │ │
│ │ ┌─────────────────────────────────────────────────┐   │ │
│ │ │ 👁️ [View in Editor]                              │   │ │
│ │ │ Navigate to PaymentService.ts source file       │   │ │
│ │ └─────────────────────────────────────────────────┘   │ │
│ │                                                         │ │
│ │ ┌─────────────────────────────────────────────────┐   │ │
│ │ │ 🔄 [Generate More Tests]                         │   │ │
│ │ │ Continue with other high-priority files         │   │ │
│ │ └─────────────────────────────────────────────────┘   │ │
│ │                                                         │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │                                                         │ │
│ │ 📊 Coverage Updated:                                   │ │
│ │                                                         │ │
│ │ Overall:    14% → 18% (+4%)                            │ │
│ │ API Layer:  40% → 47% (+7%)                            │ │
│ │                                                         │ │
│ │ [████░░░░░░░░░░░░░░░░]                                 │ │
│ │                                                         │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │                                                         │ │
│ │ [Close]                                                │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Clear success confirmation
- File location with link
- Suggested next steps (4 clear actions)
- Coverage delta visible (before → after)
- Visual progress bar
- No "what now?" confusion - guided workflow

---

## 📱 SCREEN 8: In-Editor CodeLens Integration

```
┌─────────────────────────────────────────────────────────────┐
│ FILE: src/api/services/PaymentService.ts          [×] [□] [_]│
├─────────────────────────────────────────────────────────────┤
│ 1  import { Injectable } from '@nestjs/common';              │
│ 2  import { PaymentGateway } from './payment-gateway';       │
│ 3  import { DatabaseService } from '../database';            │
│ 4                                                             │
│ 5  @Injectable()                                             │
│ 6  export class PaymentService {                             │
│    🟢 75% covered | Run tests | View coverage                │
│ 7    constructor(                                             │
│ 8      private gateway: PaymentGateway,                      │
│ 9      private db: DatabaseService,                          │
│ 10   ) {}                                                     │
│ 11                                                            │
│ 12   async processPayment(data: PaymentData) {               │
│      🟢 Tested (3 tests) | Run | View tests                  │
│ 13     // Validate card                                      │
│ 14     const isValid = await this.validateCard(data.card);   │
│ 15     if (!isValid) {                                       │
│ 16       throw new Error('Invalid card');                    │
│ 17     }                                                      │
│ 18                                                            │
│ 19     // Process payment                                    │
│ 20     const result = await this.gateway.charge(data);       │
│ 21     await this.db.savePayment(result);                    │
│ 22     return result;                                        │
│ 23   }                                                        │
│ 24                                                            │
│ 25   async processRefund(paymentId: string) {                │
│      🔴 Not tested | Generate test                           │
│ 26     const payment = await this.db.getPayment(paymentId);  │
│ 27     if (!payment) {                                       │
│ 28       throw new Error('Payment not found');               │
│ 29     }                                                      │
│ 30                                                            │
│ 31     return await this.gateway.refund(payment);            │
│ 32   }                                                        │
│ 33                                                            │
│ 34   async validateCard(cardNumber: string) {                │
│      🟡 Partially tested (1/3 edge cases) | Improve          │
│ 35     if (!cardNumber || cardNumber.length !== 16) {        │
│ 36       return false;                                       │
│ 37     }                                                      │
│ 38     return this.gateway.validateCard(cardNumber);         │
│ 39   }                                                        │
│ 40                                                            │
│ 41   async getPayment(id: string) {                          │
│      🟢 Tested (2 tests) | Run | View tests                  │
│ 42     return await this.db.getPayment(id);                  │
│ 43   }                                                        │
│ 44 }                                                          │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Inline coverage indicators above each method
- Color-coded status (🟢 tested, 🔴 not tested, 🟡 partial)
- Clickable actions (Run, View tests, Generate test, Improve)
- Class-level coverage summary at top
- No context switching - everything in editor
- Method-level granularity

---

## 📱 SCREEN 9: Test Execution Panel - Running

```
┌─────────────────────────────────────────────────────────────┐
│ 🧪 TEST EXECUTION                                    [×] [_] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Running: npm test -- payment-service                         │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │                                                       │   │
│ │ 📦 PaymentService Tests                              │   │
│ │                                                       │   │
│ │ [████████████████░░░░] 80% (12 of 15 tests)          │   │
│ │                                                       │   │
│ │ ⏱️ Duration: 2.1s                                    │   │
│ │                                                       │   │
│ │ ─────────────────────────────────────────────────    │   │
│ │                                                       │   │
│ │ ✅ Passed: 12 tests                                  │   │
│ │                                                       │   │
│ │ ├─ ✅ POST /api/payments - success                  │   │
│ │ ├─ ✅ POST /api/payments - invalid card             │   │
│ │ ├─ ✅ POST /api/payments - insufficient funds       │   │
│ │ ├─ ✅ POST /api/payments - server error             │   │
│ │ ├─ ✅ POST /api/refunds - success                   │   │
│ │ ├─ ✅ POST /api/refunds - not found                 │   │
│ │ ├─ ✅ POST /api/refunds - already refunded          │   │
│ │ ├─ ✅ GET /api/payments/:id - success               │   │
│ │ ├─ ✅ GET /api/payments/:id - not found             │   │
│ │ ├─ ✅ GET /api/payments - empty                     │   │
│ │ ├─ ✅ GET /api/payments - with pagination           │   │
│ │ └─ ✅ Unauthorized - no token                       │   │
│ │                                                       │   │
│ │ ⏳ Running: 3 tests                                  │   │
│ │                                                       │   │
│ │ ├─ ⏳ POST /api/refunds - timeout test              │   │
│ │ ├─ ⏳ Authorization - forbidden                      │   │
│ │ └─ ⏳ Performance - load test                        │   │
│ │                                                       │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ [⏹️ Stop Tests]                                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Real-time progress bar
- Live test results as they complete
- Duration tracking
- Clear visual separation (passed vs running)
- Stop button to cancel if needed

---

## 📱 SCREEN 10: Test Execution Panel - Results with Failures

```
┌─────────────────────────────────────────────────────────────┐
│ 🧪 TEST EXECUTION                                    [×] [_] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Completed: npm test -- payment-service                       │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │                                                       │   │
│ │ 📦 PaymentService Tests                              │   │
│ │                                                       │   │
│ │ ✅ Passed: 13 tests | ❌ Failed: 2 tests            │   │
│ │ ⏱️ Duration: 2.4s                                    │   │
│ │                                                       │   │
│ │ ─────────────────────────────────────────────────    │   │
│ │                                                       │   │
│ │ ❌ Failed Tests (2)                                  │   │
│ │                                                       │   │
│ │ ┌───────────────────────────────────────────────┐   │   │
│ │ │ ❌ POST /api/refunds - timeout                │   │   │
│ │ │                                                │   │   │
│ │ │ Expected: 200                                 │   │   │
│ │ │ Received: 504 Gateway Timeout                 │   │   │
│ │ │                                                │   │   │
│ │ │ Error: Payment gateway did not respond        │   │   │
│ │ │ within 5 seconds                              │   │   │
│ │ │                                                │   │   │
│ │ │ at PaymentService.processRefund:31            │   │   │
│ │ │                                                │   │   │
│ │ │ [📄 View Full Output]  [🐛 Debug]            │   │   │
│ │ │ [🔧 Fix Test]  [↻ Rerun This Test]           │   │   │
│ │ └───────────────────────────────────────────────┘   │   │
│ │                                                       │   │
│ │ ┌───────────────────────────────────────────────┐   │   │
│ │ │ ❌ GET /api/payments/:id - not found          │   │   │
│ │ │                                                │   │   │
│ │ │ Expected: 404 Not Found                       │   │   │
│ │ │ Received: 500 Internal Server Error           │   │   │
│ │ │                                                │   │   │
│ │ │ Error: Database query failed                  │   │   │
│ │ │                                                │   │   │
│ │ │ at DatabaseService.getPayment:45              │   │   │
│ │ │                                                │   │   │
│ │ │ [📄 View Full Output]  [🐛 Debug]            │   │   │
│ │ │ [🔧 Fix Test]  [↻ Rerun This Test]           │   │   │
│ │ └───────────────────────────────────────────────┘   │   │
│ │                                                       │   │
│ │ ─────────────────────────────────────────────────    │   │
│ │                                                       │   │
│ │ ✅ Passed Tests (13) [Show All ▼]                   │   │
│ │                                                       │   │
│ │ ─────────────────────────────────────────────────    │   │
│ │                                                       │   │
│ │ 📊 Coverage: 75% (+5% from last run)                │   │
│ │                                                       │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ [↻ Rerun Failed Tests]  [▶️ Run All]  [Close]              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Clear pass/fail summary at top
- Failed tests prominently displayed with details
- Expected vs Received comparison
- Error messages with stack traces
- Quick actions per failure (View Output, Debug, Fix, Rerun)
- Passed tests collapsed to save space
- Coverage delta shown
- Bulk actions at bottom (Rerun Failed, Run All)

---

## 📱 SCREEN 11: Testing Setup - Framework Details

```
┌─────────────────────────────────────────────────────────────┐
│ QAGENAI                                              [⚙️] [↻] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 🔧 Testing Setup                               [Hide ▲]     │
│ ┌──────────────────────────────────────────────────────┐   │
│ │                                                       │   │
│ │ 📊 Project Information                               │   │
│ │ ├─ Type: TypeScript API / REST Backend              │   │
│ │ ├─ Framework: NestJS v10.2                           │   │
│ │ ├─ Runtime: Node.js v20.10                           │   │
│ │ └─ Package Manager: npm                              │   │
│ │                                                       │   │
│ │ ─────────────────────────────────────────────────    │   │
│ │                                                       │   │
│ │ ✅ Installed Frameworks                              │   │
│ │                                                       │   │
│ │ 🧪 Unit Testing                                      │   │
│ │ ├─ Jest v29.5.0 ✓                                   │   │
│ │ │  └─ Used for: API unit tests                     │   │
│ │ │     Output: tests/api/unit/*.test.ts             │   │
│ │ │     Run: npm test -- --testPathPattern=unit      │   │
│ │ │                                                    │   │
│ │ └─ [⚙️ Configure]  [📚 Docs]                        │   │
│ │                                                       │   │
│ │ 🔗 Integration Testing                               │   │
│ │ ├─ Jest v29.5.0 ✓                                   │   │
│ │ ├─ Supertest v6.3.0 ✓                               │   │
│ │ │  └─ Used for: API endpoint testing               │   │
│ │ │     Output: tests/api/integration/*.test.ts      │   │
│ │ │     Run: npm test -- --testPathPattern=integration│   │
│ │ │                                                    │   │
│ │ └─ [⚙️ Configure]  [📚 Docs]                        │   │
│ │                                                       │   │
│ │ 🎭 Mocking                                           │   │
│ │ └─ Jest (built-in) ✓                                │   │
│ │    └─ Used for: Mocking dependencies                │   │
│ │                                                       │   │
│ │ ─────────────────────────────────────────────────    │   │
│ │                                                       │   │
│ │ 💡 Recommended (Not Installed)                       │   │
│ │                                                       │   │
│ │ ┌───────────────────────────────────────────────┐   │   │
│ │ │ 🗄️ Database Integration Testing                │   │   │
│ │ │                                                 │   │   │
│ │ │ Testcontainers v10.2.0                         │   │   │
│ │ │                                                 │   │   │
│ │ │ Why: Test with real PostgreSQL database        │   │   │
│ │ │ Use case: Repository tests, migrations         │   │   │
│ │ │                                                 │   │   │
│ │ │ [🚀 Quick Install]  [📚 Learn More]           │   │   │
│ │ └───────────────────────────────────────────────┘   │   │
│ │                                                       │   │
│ │ ┌───────────────────────────────────────────────┐   │   │
│ │ │ 🌐 E2E Testing                                  │   │   │
│ │ │                                                 │   │   │
│ │ │ Playwright v1.40.0                             │   │   │
│ │ │                                                 │   │   │
│ │ │ Why: Test complete user flows end-to-end       │   │   │
│ │ │ Use case: Critical business workflows          │   │   │
│ │ │                                                 │   │   │
│ │ │ [🚀 Quick Install]  [📚 Learn More]           │   │   │
│ │ └───────────────────────────────────────────────┘   │   │
│ │                                                       │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Project information at top (context)
- Installed frameworks with versions
- Output paths and run commands per framework
- Recommended frameworks with reasoning ("Why" and "Use case")
- Quick install buttons
- Configure and Docs links
- Clear separation between installed and recommended

---

## 📱 SCREEN 12: Status Bar States

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATE 1: Idle - Low coverage
🧪 14% | 8 gaps [Click for actions]                    🟢 QAgenAI

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATE 2: Analyzing
🔍 Analyzing workspace...                              🟡 QAgenAI

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATE 3: Generating test
⚙️ Generating test for PaymentService.ts...            🟡 QAgenAI

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATE 4: Running tests
▶️ Running 15 tests... (12 passed, 2 running)          🟡 QAgenAI

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATE 5: Tests passed
✅ 15 tests passed | 75% coverage                       🟢 QAgenAI

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATE 6: Tests failed
❌ 2 of 15 tests failed [Click to debug]               🔴 QAgenAI

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATE 7: Good coverage
🧪 87% coverage | Great work! 🎉                        🟢 QAgenAI

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATE 8: Critical gaps
🚨 8 critical files need tests [Fix now]                🔴 QAgenAI
```

**Key Features:**
- Always visible at bottom of window
- Color-coded by state (🟢 good, 🟡 working, 🔴 needs attention)
- Clickable for quick actions
- Real-time updates during operations
- Encouragement when coverage is good

---

## 📱 SCREEN 13: Context Menu - Right-Click on File

```
┌─────────────────────────────────────────────────────────────┐
│ FILE: src/api/services/PaymentService.ts                    │
│                                                              │
│ Right-click on file in Explorer → QAgenAI submenu:          │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ │ QAgenAI                                          ▶      │ │
│ │ ├──────────────────────────────────────────────────┐   │ │
│ │ │                                                   │   │ │
│ │ │ 📊 Analysis                                      │   │ │
│ │ │ ├─ File: PaymentService.ts                       │   │ │
│ │ │ ├─ Layer: 🌐 API / REST Endpoints                │   │ │
│ │ │ ├─ Priority: 🚨 CRITICAL                         │   │ │
│ │ │ ├─ LOC: 250 lines • Complexity: High            │   │ │
│ │ │ ├─ Git Activity: 15 commits this week            │   │ │
│ │ │ └─ Status: ❌ No tests                           │   │ │
│ │ │                                                   │   │ │
│ │ │ ─────────────────────────────────────────────    │   │ │
│ │ │                                                   │   │ │
│ │ │ 🎯 Actions                                       │   │ │
│ │ │                                                   │   │ │
│ │ │ ⭐ Generate Integration Test (Recommended)        │   │ │
│ │ │    Framework: Jest + Supertest                   │   │ │
│ │ │    Output: tests/api/payment-service.test.ts    │   │ │
│ │ │    [Generate ▶]                                  │   │ │
│ │ │                                                   │   │ │
│ │ │ 💡 Generate Unit Test                            │   │ │
│ │ │    Framework: Jest                               │   │ │
│ │ │    Output: tests/api/unit/payment-service.test.ts│   │ │
│ │ │    [Generate ▶]                                  │   │ │
│ │ │                                                   │   │ │
│ │ │ 📦 Generate Both                                 │   │ │
│ │ │    [Generate ▶]                                  │   │ │
│ │ │                                                   │   │ │
│ │ │ ─────────────────────────────────────────────    │   │ │
│ │ │                                                   │   │ │
│ │ │ 👁️ View Coverage Details                        │   │ │
│ │ │ 📊 View in Dashboard                             │   │ │
│ │ │                                                   │   │ │
│ │ └───────────────────────────────────────────────────┘   │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Rich context menu with full file analysis
- Layer, priority, and stats visible
- Multiple test generation options in one place
- Output paths shown before generation
- Quick access to coverage details
- All actions one click away

---

## 📱 SCREEN 14: Notifications

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│ NOTIFICATION 1: Workspace Analyzed                           │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 📊 QAgenAI - Workspace Analysis Complete             │   │
│ │                                                       │   │
│ │ Found 38 files needing tests                         │   │
│ │ • 8 CRITICAL priority                                │   │
│ │ • 12 HIGH priority                                   │   │
│ │                                                       │   │
│ │ [View Coverage]  [Fix Critical]  [Dismiss]          │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ─────────────────────────────────────────────────────────   │
│                                                              │
│ NOTIFICATION 2: Test Generation Success                      │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ ✅ Test Generated Successfully                        │   │
│ │                                                       │   │
│ │ Created: tests/api/payment-service.test.ts           │   │
│ │ Coverage: 14% → 18% (+4%)                            │   │
│ │                                                       │   │
│ │ [Open File]  [Run Tests]  [Dismiss]                 │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ─────────────────────────────────────────────────────────   │
│                                                              │
│ NOTIFICATION 3: Tests Failed                                 │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ ❌ 2 of 15 tests failed                               │   │
│ │                                                       │   │
│ │ • POST /api/refunds - timeout                        │   │
│ │ • GET /api/payments/:id - not found                  │   │
│ │                                                       │   │
│ │ [View Results]  [Debug]  [Dismiss]                  │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ─────────────────────────────────────────────────────────   │
│                                                              │
│ NOTIFICATION 4: Coverage Milestone                           │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 🎉 Coverage Milestone Reached!                        │   │
│ │                                                       │   │
│ │ You've reached 50% test coverage!                    │   │
│ │ Great work! Keep it up! 🚀                           │   │
│ │                                                       │   │
│ │ [View Dashboard]  [Dismiss]                          │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Action-oriented notifications
- Clear CTAs (View, Fix, Debug)
- Positive reinforcement (milestones, encouragement)
- Dismissible but persistent until action taken

---

## 🎯 KEY VISUAL DESIGN PRINCIPLES

### 1. **Information Hierarchy**
- Primary: Coverage %, Critical actions, Layer badges
- Secondary: Framework details, Run commands
- Tertiary: Version numbers, Project type

### 2. **Progressive Disclosure**
- Collapsed by default (low cognitive load)
- Expand on demand for details
- Quick actions always visible

### 3. **Visual Feedback**
- Color coding (🟢 good, 🟡 partial, 🔴 missing)
- Progress bars for coverage
- Real-time updates during operations

### 4. **Action-Oriented**
- Every view has clear next steps
- Buttons are verb-focused (Generate, Run, View, Debug)
- One-click actions from any context

### 5. **Transparency**
- Output paths always visible
- Preview before generation
- Coverage delta after changes

### 6. **Context Everywhere**
- Layer badges on files (🌐 API, 🗄️ DB, 🎨 UI)
- Priority indicators (🚨 CRITICAL, ⚠️ HIGH)
- Tooltips and detailed views available

---

## 📊 COMPLETE USER FLOW SUMMARY

```
1. Open Project
   └─ See coverage status immediately (Status Bar + TreeView)
   
2. View Critical Actions
   └─ Click to see 8 high-priority files
   
3. Explore Files (Risk-First)
   └─ CRITICAL → HIGH → MEDIUM → LOW
   
4. Select File (e.g., PaymentService.ts)
   └─ See layer badge, output path, test options
   
5. Generate Test
   └─ Preview structure → Confirm → Success
   
6. Run Test
   └─ Integrated test runner → Real-time results
   
7. View Coverage
   └─ Multi-view dashboard (Layer/Type/Framework)
   
8. In-Editor (CodeLens)
   └─ Method-level coverage + actions inline
   
9. Status Bar
   └─ Always visible, always actionable
```

---

**Svi screenovi su sada kompletni! 🎬**

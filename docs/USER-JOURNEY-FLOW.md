# 🎬 Complete User Journey Flow

## 📍 Scenario: Novi korisnik završava onboarding

---

## 🎯 SCREEN 1: Onboarding Wizard (Poslednji korak)

```
╔════════════════════════════════════════════════════════════════╗
║  ⚡ QAgent Setup - Step 3/3                                    ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  ✅ Project configured                                         ║
║  ✅ AI connected                                               ║
║  ✅ First flow detected: "User Login"                          ║
║                                                                ║
║  ┌─────────────────────────────────────────────────────────┐  ║
║  │  🎉 You're all set!                                      │  ║
║  │                                                          │  ║
║  │  QAgent found 3 user flows in your app:                 │  ║
║  │  • User Login                                            │  ║
║  │  • User Registration                                     │  ║
║  │  • Password Reset                                        │  ║
║  │                                                          │  ║
║  │  Ready to generate your first E2E tests?                │  ║
║  └─────────────────────────────────────────────────────────┘  ║
║                                                                ║
║                    [🚀 Launch Dashboard]                       ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

**User klikne:** `🚀 Launch Dashboard`

---

## ⚡ TRANSITION (200ms animation)

```
Onboarding wizard → Fade out ⬇️
                    ⬇️
                    ⬇️
Sidebar             ← Slide in from left
Dashboard           ← Fade in center
```

---

## 🎯 SCREEN 2: Initial State (Immediately After Onboarding)

### Left: Sidebar (Nova, kompaktna)
### Right: Central Dashboard (Otvoren kao novi tab)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ VSCode Window                                                              │
├──────────────┬─────────────────────────────────────────────────────────────┤
│              │                                                             │
│  SIDEBAR     │  EDITOR TABS:                                              │
│  (250px)     │  [📊 QAgent Dashboard ✕]                                   │
│              │                                                             │
│ ╔══════════╗ │ ╔════════════════════════════════════════════════════════╗ │
│ ║ QAGENAI  ║ │ ║  ⚡ QAgent Dashboard          [🔄 Live] [📊] [⚙️]      ║ │
│ ╠══════════╣ │ ╠════════════════════════════════════════════════════════╣ │
│ ║          ║ │ ║                                                        ║ │
│ ║  ┌────┐  ║ │ ║ ┌──────────────── COMMAND CENTER ──────────────────┐  ║ │
│ ║  │ -- │  ║ │ ║ │                                                   │  ║ │
│ ║  │ ?? │  ║ │ ║ │  ╭──────╮   ┌────────┐  ┌────────┐  ┌────────┐  │  ║ │
│ ║  └────┘  ║ │ ║ │  │ --   │   │ 0/0    │  │ --     │  │ --     │  │  ║ │
│ ║  Health  ║ │ ║ │  │ ???  │   │ Tests  │  │ Time   │  │ Cover  │  │  ║ │
│ ║  No data ║ │ ║ │  ╰──────╯   └────────┘  └────────┘  └────────┘  │  ║ │
│ ║          ║ │ ║ │  Project Health    Tests    Performance Coverage │  ║ │
│ ║──────────║ │ ║ │                                                   │  ║ │
│ ║ FLOWS(3) ║ │ ║ │  No test data yet. Generate your first test! 👇  │  ║ │
│ ║──────────║ │ ║ └───────────────────────────────────────────────────┘  ║ │
│ ║          ║ │ ║                                                        ║ │
│ ║ 🔓 Login ║ │ ║ ┌──────────── 🎯 QUICK START ────────────────────┐   ║ │
│ ║  📝 NEW  ║ │ ║ │                                                  │   ║ │
│ ║  Never   ║ │ ║ │  ✨ Generate your first E2E test                │   ║ │
│ ║  run     ║ │ ║ │                                                  │   ║ │
│ ║  [✨Gen] ║ │ ║ │  We found 3 user flows:                          │   ║ │
│ ║          ║ │ ║ │                                                  │   ║ │
│ ║ 👥 Reg   ║ │ ║ │  ┌────────────────────────────────────────────┐ │   ║ │
│ ║  📝 NEW  ║ │ ║ │  │ ✅ 🔓 User Login                          │ │   ║ │
│ ║  [✨Gen] ║ │ ║ │  │    /signin → /dashboard                    │ │   ║ │
│ ║          ║ │ ║ │  │    [✨ Generate Test]                      │ │   ║ │
│ ║ 🔑 Reset ║ │ ║ │  └────────────────────────────────────────────┘ │   ║ │
│ ║  📝 NEW  ║ │ ║ │                                                  │   ║ │
│ ║  [✨Gen] ║ │ ║ │  ┌────────────────────────────────────────────┐ │   ║ │
│ ║          ║ │ ║ │  │ ⬜ 👥 User Registration                   │ │   ║ │
│ ║──────────║ │ ║ │  │    /register → /dashboard                  │ │   ║ │
│ ║ ACTIONS  ║ │ ║ │  │    [✨ Generate Test]                      │ │   ║ │
│ ║──────────║ │ ║ │  └────────────────────────────────────────────┘ │   ║ │
│ ║          ║ │ ║ │                                                  │   ║ │
│ ║ [✨Gen]  ║ │ ║ │  ┌────────────────────────────────────────────┐ │   ║ │
│ ║ [🔍Disc] ║ │ ║ │  │ ⬜ 🔑 Password Reset                      │ │   ║ │
│ ║          ║ │ ║ │  │    /reset → /signin                        │ │   ║ │
│ ╚══════════╝ │ ║ │  │    [✨ Generate Test]                      │ │   ║ │
│              │ ║ │  └────────────────────────────────────────────┘ │   ║ │
│              │ ║ │                                                  │   ║ │
│              │ ║ │  Select flows and generate tests!                │   ║ │
│              │ ║ │                                                  │   ║ │
│              │ ║ │              [✨ Generate Selected (1)]          │   ║ │
│              │ ║ └──────────────────────────────────────────────────┘   ║ │
│              │ ║                                                        ║ │
│              │ ╚════════════════════════════════════════════════════════╝ │
└──────────────┴─────────────────────────────────────────────────────────────┘
```

### 📝 Šta vidimo:

**Sidebar:**
- Health badge je prazan (-- / No data)
- 3 flowa, svi sa statusom 📝 NEW
- Samo 1 button: `[✨ Generate]`
- Actions buttons: Generate + Discover

**Central Dashboard:**
- **Command Center**: Svi metrics prazni (-- / 0/0)
- **Quick Start Panel**: Velika lista sa 3 detected flows
- Checkboxes da selektuješ koje flows
- Big button: `✨ Generate Selected`

---

## 🎯 SCREEN 3: User Selects "Login" i klikne Generate

```
Same layout, ali:

DASHBOARD CHANGES TO:
╔════════════════════════════════════════════════════════════╗
║  ✨ Generating Test: "User Login"                          ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │  🔄 Analyzing flow...                     ████░░░░░  │  ║
║  │                                                      │  ║
║  │  ✓ Detected start URL: /signin                      │  ║
║  │  ✓ Found input fields: email, password              │  ║
║  │  ✓ Found submit button                              │  ║
║  │  🔄 Analyzing expected outcome...                    │  ║
║  │  ⏳ Generating test code...                          │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

**Time:** 5-10 seconds sa AI

---

## 🎯 SCREEN 4: Test Generated Successfully! 

```
┌────────────────────────────────────────────────────────────────────────────┐
│ VSCode Window                                                              │
├──────────────┬─────────────────────────────────────────────────────────────┤
│              │                                                             │
│  SIDEBAR     │  EDITOR TABS:                                              │
│              │  [📊 Dashboard] [test-login.spec.ts ✕] [+]   ← NEW TAB!   │
│              │                                                             │
│ ╔══════════╗ │ ╔════════════════════════════════════════════════════════╗ │
│ ║ QAGENAI  ║ │ ║  test-login.spec.ts                                    ║ │
│ ╠══════════╣ │ ╠════════════════════════════════════════════════════════╣ │
│ ║          ║ │ ║                                                        ║ │
│ ║  ┌────┐  ║ │ ║  1 | import { test, expect } from '@playwright/test';║ │
│ ║  │ -- │  ║ │ ║  2 |                                                  ║ │
│ ║  │ ?? │  ║ │ ║  3 | test('User Login flow', async ({ page }) => {   ║ │
│ ║  └────┘  ║ │ ║  4 |   // Navigate to login page                     ║ │
│ ║  Health  ║ │ ║  5 |   await page.goto('/signin');                    ║ │
│ ║  No data ║ │ ║  6 |                                                  ║ │
│ ║          ║ │ ║  7 |   // Fill login form                            ║ │
│ ║──────────║ │ ║  8 |   await page.fill('[data-test="email"]',        ║ │
│ ║ FLOWS(3) ║ │ ║  9 |     'user@test.com');                           ║ │
│ ║──────────║ │ ║ 10 |   await page.fill('[data-test="password"]',     ║ │
│ ║          ║ │ ║ 11 |     'password123');                             ║ │
│ ║ 🔓 Login ║ │ ║ 12 |                                                  ║ │
│ ║  📝 NEW  ║ │ ║ 13 |   // Submit form                                ║ │
│ ║  [▶️Run] ║ │ ║ 14 |   await page.click('[data-test="submit"]');     ║ │
│ ║          ║ │ ║ 15 |                                                  ║ │
│ ║ 👥 Reg   ║ │ ║ 16 |   // Verify redirect to dashboard              ║ │
│ ║  📝 NEW  ║ │ ║ 17 |   await expect(page).toHaveURL('/dashboard');   ║ │
│ ║  [✨Gen] ║ │ ║ 18 | });                                              ║ │
│ ║          ║ │ ║                                                        ║ │
│ ║ 🔑 Reset ║ │ ╚════════════════════════════════════════════════════════╝ │
│ ║  📝 NEW  ║ │                                                             │
│ ║  [✨Gen] ║ │ ┌──────────────────────────────────────────────────────┐  │
│ ║          ║ │ │ ✅ Test generated successfully!                      │  │
│ ║──────────║ │ │    Ready to run "User Login" test?                   │  │
│ ║ ACTIONS  ║ │ │    [▶️ Run Now]  [📝 Edit First]  [❌ Dismiss]      │  │
│ ║──────────║ │ └──────────────────────────────────────────────────────┘  │
│ ║          ║ │     ↑ Toast notification (bottom right)                   │
│ ║ [✨Gen]  ║ │                                                             │
│ ║ [🔍Disc] ║ │                                                             │
│ ╚══════════╝ │                                                             │
└──────────────┴─────────────────────────────────────────────────────────────┘
```

### 📝 Šta se desilo:

1. **Novi tab otvoren**: `test-login.spec.ts` (generated code)
2. **Toast notification** (bottom right): "Run Now?"
3. **Sidebar updated**: "Login" flow ima dugme `[▶️ Run]` umesto `[✨Gen]`

---

## 🎯 SCREEN 5: User klikne "Run Now" u toast-u

### Option A: Klikne u toast → Test starts immediately
### Option B: Klikne `[▶️ Run]` u sidebaru → Isti efekat

```
┌────────────────────────────────────────────────────────────────────────────┐
│ VSCode Window                                                              │
├──────────────┬─────────────────────────────────────────────────────────────┤
│              │                                                             │
│  SIDEBAR     │  EDITOR TABS:                                              │
│              │  [📊 Dashboard ✕] [test-login.spec.ts]   ← Dashboard focus │
│              │                                                             │
│ ╔══════════╗ │ ╔════════════════════════════════════════════════════════╗ │
│ ║ QAGENAI  ║ │ ║  ⚡ QAgent Dashboard          [🔄 Live] [📊] [⚙️]      ║ │
│ ╠══════════╣ │ ╠════════════════════════════════════════════════════════╣ │
│ ║          ║ │ ║                                                        ║ │
│ ║  ┌────┐  ║ │ ║ ┌──────────────── COMMAND CENTER ──────────────────┐  ║ │
│ ║  │ -- │  ║ │ ║ │  ╭──────╮   ┌────────┐  ┌────────┐  ┌────────┐  │  ║ │
│ ║  │ ?? │  ║ │ ║ │  │ --   │   │ 0/1    │  │ --     │  │ --     │  │  ║ │
│ ║  └────┘  ║ │ ║ │  │ 🔄   │   │ Run..  │  │ Time   │  │ Cover  │  │  ║ │
│ ║  Health  ║ │ ║ │  ╰──────╯   └────────┘  └────────┘  └────────┘  │  ║ │
│ ║  No data ║ │ ║ │  Health      Tests      Performance  Coverage    │  ║ │
│ ║          ║ │ ║ │  (calculating...)                                 │  ║ │
│ ║──────────║ │ ║ └───────────────────────────────────────────────────┘  ║ │
│ ║ FLOWS(3) ║ │ ║                                                        ║ │
│ ║──────────║ │ ║ ┌────────────────────── FLOWS GRID ────────────────┐  ║ │
│ ║          ║ │ ║ │                                                   │  ║ │
│ ║ 🔓 Login ║ │ ║ │ ╔═══════════════════════════════════════════════╗ │  ║ │
│ ║  🔄 RUN  ║ │ ║ │ ║ 🔓 User Login               🔄 RUNNING       ║ │  ║ │
│ ║  Running ║ │ ║ │ ║ /signin → /dashboard                          ║ │  ║ │
│ ║  ⏸[Stop] ║ │ ║ │ ║ ───────────────────────────────────────────── ║ │  ║ │
│ ║          ║ │ ║ │ ║ Progress: ████████████░░░░░░ 75%              ║ │  ║ │
│ ║ 👥 Reg   ║ │ ║ │ ║ Time: 6.1s / ~8s estimated                    ║ │  ║ │
│ ║  📝 NEW  ║ │ ║ │ ║                                                ║ │  ║ │
│ ║  [✨Gen] ║ │ ║ │ ║ ✓ Navigate to /signin                         ║ │  ║ │
│ ║          ║ │ ║ │ ║ ✓ Fill email field                            ║ │  ║ │
│ ║ 🔑 Reset ║ │ ║ │ ║ ✓ Fill password field                         ║ │  ║ │
│ ║  📝 NEW  ║ │ ║ │ ║ ✓ Click submit button                         ║ │  ║ │
│ ║  [✨Gen] ║ │ ║ │ ║ 🔄 Waiting for navigation...                   ║ │  ║ │
│ ║          ║ │ ║ │ ║                                                ║ │  ║ │
│ ║──────────║ │ ║ │ ║ [⏸ Pause] [❌ Stop]                           ║ │  ║ │
│ ║ ACTIONS  ║ │ ║ │ ╚═══════════════════════════════════════════════╝ │  ║ │
│ ║──────────║ │ ║ └───────────────────────────────────────────────────┘  ║ │
│ ║ [✨Gen]  ║ │ ║                                                        ║ │
│ ║ [🔍Disc] ║ │ ║ ┌────────────── 🔴 LIVE ACTIVITY ───────────────┐   ║ │
│ ╚══════════╝ │ ║ │ 🔄 Running: "User Login" test                  │   ║ │
│              │ ║ │    ████████████░░░░░░ 75% (6.1s / ~8s)         │   ║ │
│              │ ║ │    ✓ Navigate  ✓ Fill form  🔄 Submit...       │   ║ │
│              │ ║ │                                  [❌ Stop All]  │   ║ │
│              │ ║ └────────────────────────────────────────────────┘   ║ │
│              │ ╚════════════════════════════════════════════════════════╝ │
└──────────────┴─────────────────────────────────────────────────────────────┘
```

### 📝 Šta se dešava:

**Sidebar:**
- "Login" status → `🔄 RUNNING`
- Button changed → `[⏸ Stop]`

**Dashboard (auto-focused):**
- Command Center: Tests updated to `0/1 Running...`
- Flow card shows live progress bar + steps
- **LIVE ACTIVITY panel** (bottom sticky) sa real-time progress

**Animation:**
- Pulsing cyan border na flow card
- Smooth progress bar animation
- Check marks appear per step

---

## 🎯 SCREEN 6: Test PASSED! ✅ (8.2 seconds later)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ VSCode Window                                                              │
├──────────────┬─────────────────────────────────────────────────────────────┤
│              │                                                             │
│  SIDEBAR     │  EDITOR TABS:                                              │
│              │  [📊 Dashboard ✕] [test-login.spec.ts]                     │
│              │                                                             │
│ ╔══════════╗ │ ╔════════════════════════════════════════════════════════╗ │
│ ║ QAGENAI  ║ │ ║  ⚡ QAgent Dashboard          [🔄 Live] [📊] [⚙️]      ║ │
│ ╠══════════╣ │ ╠════════════════════════════════════════════════════════╣ │
│ ║          ║ │ ║                                                        ║ │
│ ║  ┌────┐  ║ │ ║ ┌──────────────── COMMAND CENTER ──────────────────┐  ║ │
│ ║  │ 100%│  ║ │ ║ │  ╭──────╮   ┌────────┐  ┌────────┐  ┌────────┐  │  ║ │
│ ║  │ ◉◉◉ │  ║ │ ║ │  │ 100% │   │ 1/1    │  │ 8.2s   │  │ --     │  │  ║ │
│ ║  │ ✨  │  ║ │ ║ │  │ ◉◉◉◉ │   │ ✅Pass │  │ Avg    │  │ Cover  │  │  ║ │
│ ║  └────┘  ║ │ ║ │  ╰──────╯   └────────┘  └────────┘  └────────┘  │  ║ │
│ ║  Health  ║ │ ║ │  Health      Tests      Performance  Coverage    │  ║ │
│ ║  Perfect!║ │ ║ │                                                   │  ║ │
│ ║  ↗ NEW   ║ │ ║ │  Trends (just started) ▲ +100%                   │  ║ │
│ ║          ║ │ ║ └───────────────────────────────────────────────────┘  ║ │
│ ║──────────║ │ ║                                                        ║ │
│ ║ FLOWS(3) ║ │ ║ ┌───────────── 🎉 NICE WORK! ──────────────────┐     ║ │
│ ║──────────║ │ ║ │  Your first test passed! 🎊                    │     ║ │
│ ║          ║ │ ║ │  → Generate tests for 2 more flows             │     ║ │
│ ║ 🔓 Login ║ │ ║ │  → Run all tests together                      │     ║ │
│ ║  ✅ 8.2s ║ │ ║ │                            [✨ Generate More]   │     ║ │
│ ║  Just now║ │ ║ └────────────────────────────────────────────────┘     ║ │
│ ║  [▶️Run] ║ │ ║                                                        ║ │
│ ║  [📊Det] ║ │ ║ ┌────────────────────── FLOWS GRID ────────────────┐  ║ │
│ ║          ║ │ ║ │                                                   │  ║ │
│ ║ 👥 Reg   ║ │ ║ │ ╔═══════════════════════════════════════════════╗ │  ║ │
│ ║  📝 NEW  ║ │ ║ │ ║ 🔓 User Login               ✅ 100%          ║ │  ║ │
│ ║  [✨Gen] ║ │ ║ │ ║ /signin → /dashboard                          ║ │  ║ │
│ ║          ║ │ ║ │ ║ ───────────────────────────────────────────── ║ │  ║ │
│ ║ 🔑 Reset ║ │ ║ │ ║ Last run: Just now  ⏱ 8.2s                   ║ │  ║ │
│ ║  📝 NEW  ║ │ ║ │ ║                                                ║ │  ║ │
│ ║  [✨Gen] ║ │ ║ │ ║ ✓ All assertions passed                       ║ │  ║ │
│ ║          ║ │ ║ │ ║ ✓ No console errors                           ║ │  ║ │
│ ║──────────║ │ ║ │ ║ ✓ Performance: Good (8.2s)                    ║ │  ║ │
│ ║ ACTIONS  ║ │ ║ │ ║                                                ║ │  ║ │
│ ║──────────║ │ ║ │ ║ [▶️ Run Again] [📝 Edit] [👁 Details]         ║ │  ║ │
│ ║          ║ │ ║ │ ╚═══════════════════════════════════════════════╝ │  ║ │
│ ║ [▶️All]  ║ │ ║ │                                                   │  ║ │
│ ║ [✨Gen]  ║ │ ║ │ ╔═══════════════════════════════════════════════╗ │  ║ │
│ ║ [🔍Disc] ║ │ ║ │ ║ 👥 Registration             📝 NEW           ║ │  ║ │
│ ╚══════════╝ │ ║ │ ║ /register → /dashboard                        ║ │  ║ │
│              │ ║ │ ║ ───────────────────────────────────────────── ║ │  ║ │
│              │ ║ │ ║ Never run                                      ║ │  ║ │
│              │ ║ │ ║ [✨ Generate Test]                            ║ │  ║ │
│              │ ║ │ ╚═══════════════════════════════════════════════╝ │  ║ │
│              │ ║ └───────────────────────────────────────────────────┘  ║ │
│              │ ╚════════════════════════════════════════════════════════╝ │
│              │                                                             │
│              │ ┌──────────────────────────────────────────────────────┐  │
│              │ │ ✅ Test passed!  "User Login" (8.2s)                │  │
│              │ └──────────────────────────────────────────────────────┘  │
│              │  ↑ Toast notification (auto-dismiss in 5s)                │
└──────────────┴─────────────────────────────────────────────────────────────┘
```

### 📝 Velike promene! 🎉

**Sidebar:**
- **Health badge**: `100%` sa ◉◉◉◉ + sparkle effect ✨
- **Login flow**: Zeleni status `✅ 8.2s` + timestamp "Just now"
- **New buttons**: `[▶️ Run]` + `[📊 Details]`
- **Actions**: `[▶️ Run All]` je sada active (1 test exists)

**Dashboard:**
- **Command Center**: Svi metrics populated!
  - Health: 100% ◉◉◉◉
  - Tests: 1/1 ✅ Pass
  - Performance: 8.2s Avg
  - Trend: ▲ +100% (new)
- **Success banner**: "Nice Work! 🎉" sa suggestions
- **Flow card**: Detaljni rezultati + action buttons
- **Toast**: Success notification (green, auto-dismiss)

---

## 🎯 SCREEN 7: User Closes Dashboard Tab (optional)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ VSCode Window                                                              │
├──────────────┬─────────────────────────────────────────────────────────────┤
│              │                                                             │
│  SIDEBAR     │  EDITOR TABS:                                              │
│              │  [test-login.spec.ts ✕] [app.tsx] [styles.css]            │
│              │                                                             │
│ ╔══════════╗ │  Currently showing: app.tsx (user's file)                  │
│ ║ QAGENAI  ║ │                                                             │
│ ╠══════════╣ │  ┌────────────────────────────────────────────────────┐   │
│ ║          ║ │  │                                                    │   │
│ ║  ┌────┐  ║ │  │  // app.tsx content...                            │   │
│ ║  │ 100%│  ║ │  │  export default function App() {                  │   │
│ ║  │ ◉◉◉ │  ║ │  │    return (                                       │   │
│ ║  │ ✨  │  ║ │  │      <div>...                                      │   │
│ ║  └────┘  ║ │  │                                                    │   │
│ ║  Health  ║ │  │                                                    │   │
│ ║  Perfect!║ │  │                                                    │   │
│ ║  ↗ NEW   ║ │  │                                                    │   │
│ ║          ║ │  │                                                    │   │
│ ║──────────║ │  └────────────────────────────────────────────────────┘   │
│ ║ FLOWS(3) ║ │                                                             │
│ ║──────────║ │  User continues coding... ✍️                               │
│ ║          ║ │                                                             │
│ ║ 🔓 Login ║ │  Sidebar ostaje:                                           │
│ ║  ✅ 8.2s ║ │  - Always visible                                          │
│ ║  2m ago  ║ │  - Health badge live update                                │
│ ║  [▶️] [📊]║ │  - Quick actions dostupni                                 │
│ ║          ║ │                                                             │
│ ║ 👥 Reg   ║ │                                                             │
│ ║  📝 NEW  ║ │                                                             │
│ ║  [✨Gen] ║ │                                                             │
│ ║          ║ │                                                             │
│ ║ 🔑 Reset ║ │                                                             │
│ ║  📝 NEW  ║ │                                                             │
│ ║  [✨Gen] ║ │                                                             │
│ ║          ║ │                                                             │
│ ║──────────║ │                                                             │
│ ║ ACTIONS  ║ │                                                             │
│ ║──────────║ │                                                             │
│ ║ [▶️All]  ║ │                                                             │
│ ║ [✨Gen]  ║ │                                                             │
│ ║ [🔍Disc] ║ │                                                             │
│ ╚══════════╝ │                                                             │
└──────────────┴─────────────────────────────────────────────────────────────┘
```

### 📝 Key Point:

**Sidebar je UVEK tu!** User može:
- Kliknuti `▶️` za instant run (bez otvaranja dashboard-a)
- Kliknuti health badge → Opens dashboard
- Kliknuti `[▶️ Run All]` → Runs all tests
- Nastaviti coding dok sidebar prati status

---

## 🎯 SCREEN 8: User klikne Health Badge (Later)

```
Dashboard opens kao tab, pokazuje full state:

╔════════════════════════════════════════════════════════════╗
║  ⚡ QAgent Dashboard          [🔄 Live] [📊] [⚙️]          ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  ┌──────────────── COMMAND CENTER ──────────────────────┐ ║
║  │  ╭──────╮   ┌────────┐  ┌────────┐  ┌────────┐      │ ║
║  │  │ 100% │   │ 1/1    │  │ 8.2s   │  │ --     │      │ ║
║  │  │ ◉◉◉◉ │   │ ✅Pass │  │ Avg    │  │ Cover  │      │ ║
║  │  ╰──────╯   └────────┘  └────────┘  └────────┘      │ ║
║  │  Health      Tests      Performance  Coverage        │ ║
║  │                                                       │ ║
║  │  Trends (24h):  ██████████████ 100%  (1 test run)   │ ║
║  └───────────────────────────────────────────────────────┘ ║
║                                                            ║
║  ┌────────────────────── FLOWS GRID ──────────────────┐   ║
║  │  [Filter: All ▼]  🔍 Search...                      │   ║
║  │  ──────────────────────────────────────────────────  │   ║
║  │  ╔══════════════════════╗  ╔══════════════════════╗ │   ║
║  │  ║ 🔓 Login       ✅100%║  ║ 👥 Reg         📝NEW ║ │   ║
║  │  ║ /signin → /dashboard ║  ║ /register → /dash... ║ │   ║
║  │  ║ Last: 2m  ⏱ 8.2s    ║  ║ Never run            ║ │   ║
║  │  ║ [▶️] [📝] [👁] [📊] ║  ║ [✨ Generate]        ║ │   ║
║  │  ╚══════════════════════╝  ╚══════════════════════╝ │   ║
║  │                                                       │   ║
║  │  ╔══════════════════════╗  ╔══════════════════════╗ │   ║
║  │  ║ 🔑 Reset       📝NEW ║  ║ + Add New Flow       ║ │   ║
║  │  ║ /reset → /signin     ║  ║                      ║ │   ║
║  │  ║ Never run            ║  ║ [🔍 Discover] [➕]   ║ │   ║
║  │  ║ [✨ Generate]        ║  ║                      ║ │   ║
║  │  ╚══════════════════════╝  ╚══════════════════════╝ │   ║
║  └───────────────────────────────────────────────────────┘   ║
╚════════════════════════════════════════════════════════════╝
```

---

## 📊 Summary of Flow:

### 🎬 Timeline:

```
1. Onboarding completes → Click "Launch Dashboard"
   ⏱️ 0s

2. Sidebar + Dashboard open (both visible)
   ⏱️ +0.2s (animation)
   → Sidebar: compact, quick actions
   → Dashboard: full view, quick start panel

3. User selects flow + clicks "Generate"
   ⏱️ User action

4. AI generates test (5-10s)
   → Shows progress in dashboard
   → New tab opens with test code

5. User clicks "Run Now" (toast or sidebar)
   ⏱️ +10s

6. Test executes (8.2s)
   → Live progress in sidebar + dashboard
   → Real-time step updates
   → LIVE ACTIVITY panel at bottom

7. Test passes! ✅
   ⏱️ +8.2s
   → Sidebar: Health = 100%, status = ✅
   → Dashboard: Full metrics + success banner
   → Toast notification

8. User closes dashboard → continues coding
   → Sidebar remains with all quick actions

9. Later: User clicks health badge → Dashboard reopens
   → Shows current state, all metrics, flow grid
```

---

## 🎯 Key Differences: Sidebar vs Dashboard

### **SIDEBAR** (Always visible, 250px):
- ✅ Quick glance at health
- ✅ See all flows + status
- ✅ **Inline actions** (Run, Generate, Details)
- ✅ No need to open dashboard for 80% tasks
- ✅ Timestamps (2m ago, Just now)
- ✅ Big action buttons (Run All, Generate, Discover)

### **DASHBOARD** (Opens as tab, full width):
- 🎯 Command center sa **4 metrics**
- 🎯 **Attention Required** panel (smart insights)
- 🎯 **Large flow cards** grid (2x2 ili 3x3)
- 🎯 **Live activity** panel (bottom sticky during runs)
- 🎯 **Analytics** charts (trends, performance)
- 🎯 **Onboarding wizard** (quick start for new users)
- 🎯 **Detailed views** (flow details, logs, reports)

---

## 🚀 User Actions Summary

### **From Sidebar (80% of use cases):**
```
✨ Generate new test    → 1 click
▶️  Run single test     → 1 click  
▶️  Run all tests       → 1 click
🔍 Discover flows       → 1 click
👁️  View health status  → 0 clicks (always visible)
```

### **From Dashboard (20% of use cases):**
```
📊 View analytics       → Click health badge → View charts
🔧 Debug failing tests  → Attention panel → Fix suggestions
📝 Edit test details    → Flow card → Edit button
🎯 Bulk operations      → Select multiple flows → Action
📈 Generate reports     → Stats panel → Export
```

---

## 🎨 Visual Flow Summary

```
ONBOARDING
    ↓
  [Launch]
    ↓
    ├─────────────┬──────────────────────┐
    │             │                      │
 SIDEBAR      DASHBOARD              FILES
 (Always)    (Tab/Closeable)      (User's work)
    │             │                      │
    ├──────────→  │  ← Click Generate    │
    │         Generate Test...           │
    │             │ → Opens new tab      │
    │             │                   test.spec.ts
    │             │                      │
    ├──────────→  │  ← Click Run         │
    │         Test Running...            │
    │  🔄 Live    │  🔄 Live Progress    │
    │  Update     │     Bottom Panel     │
    │             │                      │
    │  ✅ Pass    │  ✅ Success          │
    │  100%       │     Metrics Updated  │
    │             │                      │
    │             │ [User closes tab]    │
    │             ✕                      │
    │                                    │
    │  User keeps coding →          app.tsx
    │  Sidebar always visible            │
    │  Quick actions ready               │
    │                                    │
    └──────────→ Click health badge     │
              Dashboard reopens          │
                Full state view          │
```

---

## ✅ Key Principles

1. **Sidebar = Speed** → 80% tasks done without dashboard
2. **Dashboard = Depth** → Analytics, insights, bulk operations
3. **Progressive disclosure** → Show what's needed, when needed
4. **Always available** → Sidebar never hides
5. **Live updates** → Real-time sync everywhere
6. **Minimal clicks** → Inline actions reduce navigation
7. **Context preservation** → User's files stay open
8. **Smart defaults** → Auto-focus dashboard when relevant

---

**File Path:** `/Users/nikolabozic/Projects/qagent/docs/USER-JOURNEY-FLOW.md`

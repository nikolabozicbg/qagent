# 🧪 TEST SCENARIO - QAgent Extension sa Truthy Frontend

**Date:** December 25, 2025  
**Project:** `/Users/nikolabozic/Projects/truthy-frontend`  
**Goal:** Verify extension functionality end-to-end

---

## 📋 PROJECT INFO

```
Name:          truthy-react-cms
Type:          React SPA (Redux + Saga)
Testing:       Jest + React Testing Library + Playwright
Port:          3002
Tech Stack:    React 17, Redux, Antd, Webpack
```

---

## 🎯 TEST CHECKLIST

### ✅ PRE-FLIGHT (Before Testing)

```bash
# 1. Ensure backend is running
cd /Users/nikolabozic/Projects/qagent/apps/backend
npm run dev
# Should see: Server running on http://localhost:3001

# 2. Compile extension
cd /Users/nikolabozic/Projects/qagent/apps/vscode-extension
npm run compile
# Should succeed without errors

# 3. Open truthy-frontend in VS Code
code /Users/nikolabozic/Projects/truthy-frontend
```

---

## 🧪 TEST SEQUENCE

### TEST 1: Extension Activation ✅
**Goal:** Verify extension loads properly

**Steps:**
1. Open truthy-frontend u VS Code
2. Press `F5` da debug QAgent extension
3. New VS Code window opens
4. Check for QAgent icon u Activity Bar (sidebar)

**Expected:**
- ✅ Extension activates without errors
- ✅ QAgent icon visible u sidebar
- ✅ No error notifications

**Actual:**
- [ ] PASS / FAIL
- Notes: _______________

---

### TEST 2: Onboarding Wizard 🎯
**Goal:** Verify project detection & flow discovery

**Steps:**
1. Klikni QAgent icon u Activity Bar
2. Wizard should start (first time)
3. Step 1: Welcome → Click "Next"
4. Step 2: Technology detection
   - Should detect: React, JavaScript/TypeScript
5. Step 3: Framework detection
   - Should detect: React, Webpack, Jest
6. Step 4: Flow discovery (AI)
   - Should call backend `/analyze/flows/discover`
   - Wait 30-60s for AI analysis
7. Step 5: Summary
   - Should show discovered flows

**Expected:**
- ✅ Detects React frontend
- ✅ Detects Jest + Playwright
- ✅ Discovers flows (e.g., Login, Dashboard, Settings)
- ✅ No crashes during wizard

**Actual:**
- [ ] Technology detected: _______________
- [ ] Frameworks detected: _______________
- [ ] Flows discovered: _______________
- [ ] Any errors? _______________

**Logs to Check:**
```bash
# VS Code Output Channel → QAgenAI
# Should see logs like:
[11:40:15] QAgenAI extension activating...
[11:40:16] Starting onboarding wizard
[11:40:20] Calling backend: POST /analyze/flows/discover
[11:40:45] Discovered 5 flows

# Backend Terminal
# Should see:
🧠 API: AI Flow Discovery: /Users/nikolabozic/Projects/truthy-frontend
✅ Discovered 5 flows in 24583ms
🤖 AI Provider: openai
```

---

### TEST 3: Dashboard View 📊
**Goal:** Verify dashboard displays correct data

**Steps:**
1. After onboarding, dashboard should open automatically
2. Check tabs: Overview, Flows, Risk Queue
3. **Overview Tab:**
   - Coverage: Should show 0% (known bug) ❌
   - Total tests: 0 (known bug) ❌
   - Stack badge: React + Jest/Playwright ✅
4. **Flows Tab:**
   - List of discovered flows
   - Each flow has "Generate Test" button
5. **Risk Queue Tab:**
   - Files without tests
   - Risk scores (high/medium/low)

**Expected:**
- ✅ Dashboard renders
- ✅ Tabs work
- ❌ Coverage shows 0% (KNOWN BUG)
- ✅ Flows listed
- ✅ Risk queue populated

**Actual:**
- [ ] Dashboard renders: PASS / FAIL
- [ ] Coverage shown: _______________
- [ ] Number of flows: _______________
- [ ] Number of risk items: _______________

---

### TEST 4: Test Generation (AI) 🤖
**Goal:** CRITICAL - Verify AI generates real code

**Steps:**
1. Go to **Flows** tab
2. Pick first flow (e.g., "Login Flow")
3. Click "Generate Test" button
4. Progress notification appears:
   - "Analyzing flow..."
   - "Calling AI (may take 30s)..."
   - "Opening editor..."
5. Test file opens in editor

**Expected:**
- ✅ Backend receives POST /generate/e2e
- ✅ AI generates real Playwright test code
- ✅ File opens with actual test logic (not TODOs)
- ✅ File structure:
   ```typescript
   import { test, expect } from '@playwright/test';
   
   test.describe('Login Flow', () => {
     test('should load page', async ({ page }) => {
       await page.goto('/login');
       await expect(page).toHaveURL(/\/login/);
     });
     
     test('should display login form', async ({ page }) => {
       // REAL assertions, not TODO comments
     });
   });
   ```

**Actual:**
- [ ] Backend called: YES / NO
- [ ] Response time: _______s
- [ ] AI mode: openai / claude / template
- [ ] Code quality:
  - [ ] Has real assertions (not TODOs)
  - [ ] Uses proper selectors
  - [ ] Has meaningful tests
  - [ ] Import statements correct

**Logs to Check:**
```bash
# VS Code Output Channel
[11:45:01] Generating test for: Login Flow
[11:45:01] Calling backend: POST /generate/e2e
[11:45:03] Backend response received (2.5s)
[11:45:03] Opening test file: login-flow.spec.ts

# Backend Terminal
🎭 E2E Generation: Login Flow
   Route: /login, BaseUrl: http://localhost:3002
🔑 Using openai (gpt-3.5-turbo)
✅ E2E generation completed in 2.58s
```

**Code Inspection:**
```bash
# Open generated file
# Check first 50 lines
# Look for:
✅ Real test logic
✅ Proper selectors (getByRole, getByTestId)
✅ Meaningful assertions
❌ TODO comments (= fallback mode)
```

---

### TEST 5: Test Generation - Multiple Flows 🔁
**Goal:** Verify consistency across multiple generations

**Steps:**
1. Generate tests za 3 different flows
2. Compare code quality
3. Check if AI learns from context

**Expected:**
- ✅ All 3 generate successfully
- ✅ Consistent code style
- ✅ Different but appropriate tests per flow
- ✅ No duplicate file names

**Actual:**
- Flow 1: _______________
- Flow 2: _______________
- Flow 3: _______________
- Quality consistent: YES / NO

---

### TEST 6: Flow Status Update ⚠️
**Goal:** Check if status updates after generation

**Steps:**
1. Before generation: Flow status = "draft"
2. Generate test
3. After generation: Flow status should change to "generated"
4. (Optional) Run test → status should change to "passing"/"failing"

**Expected:**
- ✅ draft → generated after AI generation
- ❓ generated → passing/failing after run (needs test execution)

**Actual:**
- [ ] Status before: _______________
- [ ] Status after generation: _______________
- [ ] Status after run: _______________

---

### TEST 7: Risk Queue 🔥
**Goal:** Verify risk scoring works

**Steps:**
1. Go to Risk Queue tab
2. Check top 5-10 files
3. Verify risk scores make sense

**Expected:**
- ✅ Files without tests ranked higher
- ✅ Larger files ranked higher
- ✅ Can click file to open
- ✅ "Generate Test" button per file

**Actual:**
- [ ] Total risk items: _______________
- [ ] Top risk score: _______________
- [ ] Risk factors shown: _______________
- [ ] Can open files: YES / NO

---

### TEST 8: Coverage Display ❌
**Goal:** KNOWN BUG - Confirm coverage is 0%

**Steps:**
1. Check Overview tab
2. Look at coverage %

**Expected:**
- ❌ Shows 0% (KNOWN BUG)
- ❌ Should run `npm test` and parse coverage

**Actual:**
- [ ] Coverage shown: _______________
- [ ] Expected: ~XX% (check existing coverage in project)

**To Get Real Coverage:**
```bash
cd /Users/nikolabozic/Projects/truthy-frontend
npm test
# Check: coverage/coverage-final.json
# Should exist if tests ran
```

---

### TEST 9: Error Handling 🚨
**Goal:** Verify graceful degradation

**Steps:**
1. Stop backend (kill process)
2. Try to generate test
3. Should fallback to template mode

**Expected:**
- ✅ Error message shown
- ✅ Fallback mode activates
- ✅ Template test generated (with TODOs)
- ✅ No extension crash

**Actual:**
- [ ] Error message: _______________
- [ ] Fallback activated: YES / NO
- [ ] Extension crashed: YES / NO

---

### TEST 10: Performance ⚡
**Goal:** Check speed & responsiveness

**Metrics:**
- Extension activation: _____ ms
- Onboarding wizard: _____ s
- Flow discovery (AI): _____ s
- Test generation (AI): _____ s
- Dashboard refresh: _____ ms

**Expected:**
- Activation: < 1s
- Flow discovery: 20-60s (AI call)
- Test generation: 2-10s (AI call)
- Dashboard refresh: < 500ms

---

## 🐛 KNOWN BUGS TO VERIFY

### Bug #1: Coverage Hardcoded to 0%
```
File: dashboard.service.ts:247
Status: ❌ CRITICAL
Expected: Shows 0% always
Fix: Need coverage-parser.service.ts
```

### Bug #2: Backend Integration Unclear
```
Status: ❓ NEEDS VERIFICATION
Question: Does extension actually use AI or fallback?
Test: Check generated code for TODOs
```

### Bug #3: Flow Status Not Updating
```
Status: ❓ NEEDS VERIFICATION
Expected: Status stays "draft" even after run
Fix: Need test execution callback
```

---

## 📊 TEST RESULTS SUMMARY

### Overall Status: ⬜ NOT STARTED / ✅ PASS / ❌ FAIL

```
┌────────────────────────────────────┬────────┬─────────┐
│ Test                               │ Status │ Notes   │
├────────────────────────────────────┼────────┼─────────┤
│ 1. Extension Activation            │ [ ]    │         │
│ 2. Onboarding Wizard               │ [ ]    │         │
│ 3. Dashboard View                  │ [ ]    │         │
│ 4. Test Generation (AI)            │ [ ]    │ CRITICAL│
│ 5. Multiple Flow Generation        │ [ ]    │         │
│ 6. Flow Status Update              │ [ ]    │         │
│ 7. Risk Queue                      │ [ ]    │         │
│ 8. Coverage Display                │ [ ]    │ KNOWN ❌│
│ 9. Error Handling                  │ [ ]    │         │
│ 10. Performance                    │ [ ]    │         │
└────────────────────────────────────┴────────┴─────────┘
```

---

## 🔍 CRITICAL VERIFICATION POINTS

### 🎯 Priority 1: AI Generation Works
**Question:** Does extension actually call AI backend and get real code?

**How to Verify:**
1. Check backend terminal for request logs
2. Check VS Code Output Channel for response
3. Look at generated test file:
   - ✅ Real assertions = AI working
   - ❌ TODO comments = Fallback mode (AI not working)

**If AI Not Working:**
- Debug network call in test-generation.service.ts
- Check backend URL (should be localhost:3001)
- Check timeout (120s enough?)
- Check error handling (errors swallowed?)

---

### 🎯 Priority 2: Flow Discovery Quality
**Question:** Does AI discover meaningful flows?

**How to Verify:**
1. Check discovered flow names
2. Verify routes are real (exist in app)
3. Check if component files correct

**Expected Flows for Truthy Frontend:**
- Login / Authentication
- Dashboard / Home
- User Management
- Content Management
- Settings

---

### 🎯 Priority 3: User Experience
**Question:** Is UX smooth and intuitive?

**Check:**
- Loading states clear?
- Error messages helpful?
- UI responsive?
- No crashes or freezes?

---

## 📝 POST-TEST ACTIONS

### If Everything Works ✅
```
[ ] Document what works
[ ] Note AI code quality (1-10): _____
[ ] Note performance metrics
[ ] Move to next priority: Coverage Parser
```

### If AI Generation Fails ❌
```
[ ] Capture error messages
[ ] Check backend logs
[ ] Check network calls
[ ] Debug test-generation.service.ts
[ ] Fix connection issues
```

### If Onboarding Crashes ❌
```
[ ] Capture stack trace
[ ] Check onboarding.service.ts
[ ] Add error recovery
[ ] Test again
```

---

## 🚀 NEXT STEPS (After Testing)

### Immediate Fixes:
1. **Coverage Parser** (if bug confirmed)
   - Implement coverage-parser.service.ts
   - Parse coverage/coverage-final.json
   - Show real coverage %

2. **Backend Integration** (if not working)
   - Debug network calls
   - Fix timeout issues
   - Improve error messages

3. **Flow Status Update** (if broken)
   - Add test execution callback
   - Update flow status on run complete

### Future Enhancements:
- Smart test selection
- Test health tracking
- CodeLens
- Watch mode

---

**READY TO TEST! 🚀**

**Commands:**
```bash
# Terminal 1: Backend
cd /Users/nikolabozic/Projects/qagent/apps/backend
npm run dev

# Terminal 2: VS Code
cd /Users/nikolabozic/Projects/qagent/apps/vscode-extension
code .
# Press F5 to debug

# Terminal 3: Open test project
code /Users/nikolabozic/Projects/truthy-frontend
```

**GO!** 🎯

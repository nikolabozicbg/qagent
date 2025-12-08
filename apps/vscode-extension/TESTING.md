# Testing the New Stack-Based UI

## What Was Implemented

### ✅ Phase 1: Enhanced Project Detection & Test Type Matrix

**Files Created:**
- `src/services/project-detection.service.ts` - Detects Frontend/Backend stacks from package.json
- `src/tree-builders/test-type-matrix.builder.ts` - Builds visual test type matrix per stack
- Enhanced `src/types/enhanced-analysis.types.ts` - Added StackType, TestTypeMatrix, FrameworkInfo types

**Files Modified:**
- `src/coverageTreeProvider.ts` - Integrated new stack-based tree structure
- `src/commands/index.ts` - Added detectAndDisplayStacks() call in analyzeWorkspace

---

## New UI Structure

### Frontend-Only Project (e.g. React/Next.js)
```
🏗️  QAgenAI Test Coverage
├─ Overall Coverage: 0% (0/0 files tested)
└─ 💻 REACT 18.2.0 - 0% coverage • 0/0 files
    ├─ 🧪 Component Tests  0% ░░░░░░░░░░
    │   Not configured • 0 files
    │   Framework: React Testing Library ⚠️ Not configured
    │   → Install: npm install --save-dev @testing-library/react @testing-library/jest-dom
    │
    ├─ 🌐 E2E Tests
    │   Not installed
    │   Framework: Playwright ⚠️ Not installed
    │   → Install: npm init playwright@latest
    │
    └─ 👁️ Visual Tests
        Not installed
        Framework: Chromatic ⚠️ Not installed
```

### Backend-Only Project (e.g. NestJS)
```
🏗️  QAgenAI Test Coverage
├─ Overall Coverage: 0% (0/0 files tested)
└─ 🖥️ NESTJS 10.2.0 - 0% coverage • 0/0 files
    ├─ 🧪 Unit Tests  0% ░░░░░░░░░░
    │   0/0 files • 0%
    │   Framework: Jest ✅ Installed
    │   Run: npm run test:unit
    │
    ├─ 🔗 Integration Tests
    │   Not installed
    │   Framework: Supertest ⚠️ Not installed
    │   → Install: npm install --save-dev supertest @types/supertest
    │
    └─ 🌐 API Tests
        Not configured
        Framework: Supertest ⚠️ Not configured
```

### Fullstack Project (React + NestJS)
```
🏗️  QAgenAI Test Coverage
├─ Overall Coverage: 25% (5/20 files tested)
├─ 💻 REACT 18.2.0 - 22% coverage • 3/15 files
│   ├─ 🧪 Component Tests  27% ████░░░░░░
│   ├─ 🌐 E2E Tests  0% ░░░░░░░░░░
│   └─ 👁️ Visual Tests (Not installed)
│
└─ 🖥️ NESTJS 10.2.0 - 40% coverage • 2/5 files
    ├─ 🧪 Unit Tests  40% ████░░░░░░
    ├─ 🔗 Integration Tests  0% ░░░░░░░░░░
    └─ 🌐 API Tests (Not configured)
```

---

## How to Test

### 1. Open VS Code Extension Host

```bash
cd /Users/nikolabozic/Projects/qagent/apps/vscode-extension
# Press F5 in VS Code to launch Extension Development Host
```

### 2. Test with Different Project Types

#### A) Frontend-Only (React/Next.js)
```bash
# Open a React/Next.js project in Extension Host
# Should detect:
# - React from package.json dependencies
# - Next.js if present
# - Jest/RTL if installed
# - Playwright if installed
```

#### B) Backend-Only (NestJS/Express)
```bash
# Open a NestJS project in Extension Host
# Should detect:
# - NestJS from @nestjs/core in package.json
# - Jest if installed
# - Supertest if installed
```

#### C) Fullstack (Monorepo)
```bash
# Open qagent monorepo
cd /Users/nikolabozic/Projects/qagent
# Should detect BOTH:
# - Frontend stack (if React in root or apps/)
# - Backend stack (if NestJS in root or apps/)
```

### 3. Verify TreeView Display

**Check for:**
- ✅ Overall coverage summary at top
- ✅ Stack sections (💻 FRONTEND, 🖥️ BACKEND)
- ✅ Test type matrix with progress bars
- ✅ Framework status icons:
  - ✅ Green checkmark = Installed
  - ⚠️ Orange warning = Not configured
  - ⚪ Gray circle = Not installed
- ✅ Tooltips show:
  - Framework name, version, status
  - Run command
  - Output path
  - Install command
  - Market share
  - Setup guide link

### 4. Test Framework Detection

**Jest Detection:**
```json
{
  "devDependencies": {
    "jest": "^29.0.0"
  }
}
```
→ Should show "Jest v29 ✅ Installed"

**Playwright Detection:**
```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0"
  }
}
```
→ Should show "Playwright v1.40 ✅ Installed"

**React Testing Library:**
```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0"
  }
}
```
→ Should show "React Testing Library v14 ✅ Installed"

### 5. Verify Tooltips

**Hover over test type nodes:**
- Should show markdown tooltip with:
  - Framework name and version
  - Status (Installed/Not configured/Not installed)
  - Coverage percentage (if installed)
  - Run command
  - Output path
  - Install command
  - Market share
  - Setup guide link

---

## Expected Behavior

### When Project Has Jest Installed
- Unit Tests node shows: `🧪 Unit Tests  0% ░░░░░░░░░░`
- Status icon: ✅ Green checkmark
- Tooltip shows: `Run: npm run test:unit`

### When Framework Not Installed
- Node shows: `🌐 E2E Tests` with description `Not installed`
- Status icon: ⚪ Gray circle
- Tooltip shows:
  - "❌ Not installed"
  - Install command
  - Setup guide link
  - Market share (e.g. "67%")

### When Framework Not Configured (Jest installed but no config)
- Node shows description: `Not configured • 45 files`
- Status icon: ⚠️ Orange warning
- Tooltip shows setup instructions

---

## Known Limitations (TODO)

1. **File Count = 0** - Currently hardcoded to 0 because we're not scanning files yet
   - Next: Implement file scanning and populate `fileCount`, `testedCount` in TechnologyStack

2. **No File List** - Test type nodes don't have children (files) yet
   - Next: Add file children under each test type

3. **No Coverage Parsing** - Coverage percentages are 0 because we're not parsing coverage reports
   - Next: Implement Istanbul/c8 coverage parser

4. **No Run/Install Actions** - Context menu commands not yet implemented
   - Next: Add `[Run Tests]` and `[Install Framework]` commands

---

## Debug Tips

### View Console Logs
```
Extension Host -> Help -> Toggle Developer Tools
Console tab -> Filter: "QAgenAI" or "detectStacks"
```

### Check Detection Output
```typescript
// In extension.ts after analyzeWorkspace:
const stacks = coverageProvider.getDetectedStacks();
console.log('Detected stacks:', stacks);
```

### Force Re-detection
```
Command Palette (Cmd+Shift+P)
> QAgenAI: Analyze Coverage
```

---

## Next Steps (Phase 2)

1. **File Scanning** - Populate fileCount and testedCount
2. **Coverage Parsing** - Real coverage percentages from Istanbul/c8
3. **File Children** - Show files under each test type
4. **Context Menu Actions** - [Run Tests], [Install Framework], [Generate Test]
5. **Per-File Test Type Recommendations** - Which test types to generate per file

---

## Success Criteria ✅

- [x] TypeScript compiles without errors
- [x] ProjectDetectionService detects React from package.json
- [x] ProjectDetectionService detects NestJS from package.json
- [x] TestTypeMatrixTreeBuilder creates visual progress bars
- [x] CoverageTreeProvider shows stack-based tree
- [ ] TreeView renders correctly in Extension Host (needs manual testing)
- [ ] Tooltips show framework info correctly (needs manual testing)
- [ ] Icons display correctly (✅, ⚠️, ⚪) (needs manual testing)

---

## Manual Testing Checklist

**Open Extension Host and verify:**

- [ ] Overall coverage summary appears at top
- [ ] Stack sections appear (💻 FRONTEND or 🖥️ BACKEND)
- [ ] Test types appear with correct icons (🧪, 🔗, 🌐, 👁️)
- [ ] Framework status shows correctly (✅/⚠️/⚪)
- [ ] Progress bars render for installed frameworks
- [ ] Tooltips show on hover
- [ ] Install commands visible in tooltips
- [ ] Setup guide links present
- [ ] Market share info shown
- [ ] No TypeScript errors in console
- [ ] Tree expands/collapses correctly

---

**Status: Phase 1 Complete ✅**
**Ready for manual testing in VS Code Extension Host**

# QAgenAI – Master Plan v2 (Updated 2025-11-28)

**Status:** Phase 5.2 ✅ DONE | Phase 5.5 🎉 MULTI-LANGUAGE ✅ DONE | Phase 6 🚀 READY TO START  
**Timeline:** 14 weeks to v1.0  
**Current Week:** Week 5.5 → Moving to Week 6

---

## 🎯 Vision & Differentiators

### **Our Moat:**
1. **🎨 Style Learning** – Tests that look like your team wrote them
2. **🎯 Risk Prioritization** – Test critical code first
3. **🔧 Auto-Fix** – Maintains tests when code changes
4. **🌍 Multi-Language** – JS, Python, C#, Java, Go... (NOT just JS!)
5. **⚡ In-Editor UX** – Everything actionable via CodeLens

### **vs. Competition:**
| Feature | Copilot | Cursor | Cody | **QAgenAI** |
|---------|---------|--------|------|-------------|
| Multi-language support | ❌ JS-focused | ❌ JS-focused | ⚠️ Generic | ✅ **13 frameworks** |
| Framework detection | ❌ | ❌ | ❌ | ✅ |
| Style learning | ❌ | ❌ | ❌ | ✅ (Week 6) |
| Risk prioritization | ❌ | ❌ | ❌ | ✅ (Week 7) |
| Auto-fix on refactor | ❌ | ❌ | ❌ | ✅ (Week 7) |
| Real coverage tracking | ❌ | ❌ | ❌ | ✅ (Week 6) |

---

## ✅ Phase 5.2 – Refactoring & Modularity (DONE)

**Completed:**
- ✅ Modular NestJS backend architecture
- ✅ Clean separation: analysis, generation, maintenance modules
- ✅ Coverage TreeView with basic framework detection
- ✅ Chat panel with AI test generation
- ✅ Workspace analysis with source/test matching

**Files:**
- `apps/backend/src/modules/{analysis,generation,maintenance}/`
- `apps/vscode-extension/src/{coverageTreeProvider,chatPanel}.ts`

---

## 🎉 Phase 5.5 – Multi-Language Support (DONE!)

**Completed Week 5.5:**
### **1. Language-Agnostic Architecture** ✅
- Provider pattern with `LanguageProvider` interface
- `BaseLanguageProvider` abstract class with shared utilities
- `LanguageDetectorService` – auto-detects 8 languages
- `ProviderRegistryService` – manages all providers

### **2. JavaScript/TypeScript Provider** ✅
**Frameworks:** 7
- Jest, Vitest, Mocha (unit)
- Playwright, Cypress (e2e)
- Testing Library (component)
- Supertest (integration)

**Features:**
- Reads `package.json` for detection
- Pattern: `.service.ts` → `.service.spec.ts`
- Framework-specific AI prompts

### **3. Python Provider** ✅
**Frameworks:** 3
- pytest, unittest (unit)
- behave (BDD)

**Features:**
- Checks `requirements.txt`, `pyproject.toml`
- Pattern: `user_service.py` → `test_user_service.py`
- Fixture and parametrize support

### **4. C# Provider** ✅
**Frameworks:** 3
- xUnit, NUnit, MSTest

**Features:**
- Parses `.csproj` for PackageReferences
- Pattern: `UserService.cs` → `UserServiceTests.cs`
- Moq mocking templates

**Impact:**
- ✅ **3 languages** fully supported (JS, Python, C#)
- ✅ **13 frameworks** detected automatically
- ✅ **~1200 LOC** in 7 new files
- ✅ **100% extensible** – new language = 1 file
- ✅ **MASSIVE competitive advantage!**

**Files Created:**
```
apps/backend/src/modules/language-providers/
├── base/
│   ├── language-provider.interface.ts
│   └── base-language-provider.ts
├── javascript/javascript.provider.ts
├── python/python.provider.ts
├── csharp/csharp.provider.ts
├── language-detector.service.ts
└── provider-registry.service.ts
```

**Documentation:**
- `LANGUAGE_AGNOSTIC_ARCHITECTURE.md`
- `LANGUAGE_PROVIDERS_PROGRESS.md`
- `MULTI_LANGUAGE_COMPLETE.md`

---

## 🔨 Phase 5.6 – Multi-Language Integration (NEXT: Week 5.5+)

**TODO:**
### **1. Refactor CodebaseAnalyzer** 🚧
Replace hardcoded JS logic with provider system:

```typescript
// apps/backend/src/modules/analysis/codebase-analyzer.service.ts
async analyzeWorkspace(workspacePath: string) {
  // 1. Detect languages
  const languages = await this.languageDetector.detectLanguages(workspacePath);
  
  // 2. Get providers
  const providers = this.providerRegistry.getProviders(languages);
  
  // 3. Scan with each provider
  const results = [];
  for (const provider of providers) {
    const sources = await provider.findSourceFiles(workspacePath);
    const tests = await provider.findTestFiles(workspacePath);
    const frameworks = await provider.detectFrameworks(workspacePath);
    
    results.push({
      language: provider.getMetadata().language,
      sources,
      tests,
      frameworks
    });
  }
  
  return this.aggregateResults(results);
}
```

### **2. Update TreeView for Multi-Language** 🚧
New structure:

```
📊 Coverage: 45%  (Mixed: JS + Python + C#)

🛠️ Testing Setup
├─ 📦 JavaScript
│  ├─ ✅ jest v29.5.0 (Unit)
│  └─ ✅ playwright v1.40 (E2E)
├─ 🐍 Python
│  └─ ✅ pytest v7.4.0 (Unit)
└─ 🔷 C#
   └─ ✅ xUnit v2.6.0 (Unit)

🔴 No Tests  12 files
├─ 📦 JavaScript (5 files)
│  ├─ 🚨 payment.service.ts [+]
│  └─ ⚠️ user.service.ts [+]
├─ 🐍 Python (4 files)
│  ├─ 🚨 payment_service.py [+]
│  └─ ⚠️ user_service.py [+]
└─ 🔷 C# (3 files)
   ├─ 🚨 PaymentService.cs [+]
   └─ ⚠️ UserService.cs [+]
```

**Changes:**
- Group frameworks by language
- Add language icons (📦 JS, 🐍 Python, 🔷 C#)
- Show language name as parent node
- Update tooltips with language info
- Group files by language in coverage sections

### **3. Test E2E** 🧪
- Pure JS project → works as before
- Pure Python project → detects pytest/unittest
- Pure C# project → detects xUnit/NUnit/MSTest
- JS+Python mixed → shows both!
- All 3 languages → shows all 3!

**Estimated Time:** 2-3 days

---

## 🚀 Phase 6 – Intelligent Core (Weeks 6-8)

**Prerequisites:** Phase 5.6 must be done first!

### **Week 6: Real Coverage + Style Learning v1**

**Backend:**
1. **Coverage Analyzer** (`analysis/coverage-analyzer.service.ts`)
   - Parse Istanbul/c8 output (JS)
   - Parse pytest-cov (Python)
   - Parse coverlet/dotCover (C#)
   - Generate `.qagenai/coverage-map.json`:
     ```json
     {
       "files": {
         "src/payment.service.ts": {
           "language": "javascript",
           "lines": { "total": 150, "covered": 45, "uncovered": 105 },
           "functions": { "total": 12, "covered": 3, "uncovered": 9 },
           "branches": { "total": 24, "covered": 8, "uncovered": 16 }
         }
       }
     }
     ```

2. **Style Learner** (`analysis/style-learner.service.ts`)
   - Analyze existing tests (per language!)
   - Extract patterns:
     - Naming: `describe('UserService', ...)` vs `test_user_service_...`
     - Assertions: `expect().toBe()` vs `assert x == y` vs `Assert.Equal(x, y)`
     - Mocking: `jest.mock()` vs `@patch` vs `Mock<T>()`
     - Setup: `beforeEach` vs `@pytest.fixture` vs `[SetUp]`
   - Generate `.qagenai/style-guide.json`:
     ```json
     {
       "javascript": {
         "naming": "describe/it",
         "assertions": "expect",
         "mocking": "jest.mock",
         "setup": "beforeEach"
       },
       "python": {
         "naming": "test_ prefix",
         "assertions": "assert",
         "mocking": "@patch",
         "setup": "@pytest.fixture"
       }
     }
     ```

**VS Code Extension:**
3. **CodeLens Provider** (`providers/codelens.provider.ts`)
   - Show coverage % above each function/class
   - Inline actions:
     - "Generate test" (if no test exists)
     - "Improve coverage" (if test exists but low %)
     - "View test" (jump to test file)
   - Multi-language aware (different icons per language)

**KPI:**
- ✅ Style match ≥90% (team validates generated tests)
- ✅ CodeLens adoption >60% active users
- ✅ Works for JS, Python, C# projects

---

### **Week 7: Risk Prioritization + Auto-Fix MVP**

**Backend:**
1. **Risk Prioritizer** (`analysis/risk-prioritizer.service.ts`)
   - Git activity (commits, churn)
   - Complexity (cyclomatic, LOC)
   - Import graph (central files)
   - Keywords (payment, auth, security, database)
   - Generate priority score (0-100):
     ```json
     {
       "src/payment.service.ts": {
         "score": 95,
         "reasons": ["high churn", "security keywords", "central import"]
       }
     }
     ```

2. **Test Fixer** (`maintenance/test-fixer.service.ts`)
   - Detect changes:
     - Function rename
     - Signature change (params added/removed)
     - Import path change
   - Generate fix proposal
   - Apply with user confirmation
   - Action cards in UI

**VS Code Extension:**
3. **Batch Generation + Progress**
   - "Generate All Tests" button
   - Progress bar with current file
   - Sorted by risk priority
   - Pause/resume support

4. **TreeView Sort by Risk**
   - 🚨 Critical (score >80)
   - ⚠️ High (score 60-80)
   - 📊 Medium (score 40-60)
   - ✅ Low (score <40)

**KPI:**
- ✅ Auto-fix success ≥80% (rename/signature)
- ✅ Risk engine: top-10 files cover ≥80% real incidents
- ✅ Batch generation usage >30%

---

### **Week 8: Smart Mocks + Setup + Telemetry**

**Backend:**
1. **Mock Generator** (`generation/mock-generator.service.ts`)
   - Type-safe mocks (per language)
   - Library detection (jest.mock vs @patch vs Mock<T>)
   - beforeEach/setUp generation

2. **Setup Wizard**
   - First-run modal
   - Recommend test stack:
     - JS: Jest + Testing Library
     - Python: pytest + pytest-mock
     - C#: xUnit + Moq
   - One-click install

3. **Telemetry** (opt-in)
   - Usage metrics (generation count, fix success)
   - Error tracking (Sentry)
   - NO code/PII sent

**KPI:**
- ✅ Setup wizard completion >70%
- ✅ Telemetry opt-in >40%

---

## 📦 Phase 7 – Production Essentials (Weeks 9-11)

### **Week 9: CI/CD Integration**
- GitHub Actions generator
- GitLab CI generator
- PR coverage diff reporter
- Coverage drop protection

### **Week 10: Shared Templates + Quality Score**
- `template-manager.service.ts` (versioned team templates)
- `test-quality-scorer.service.ts` (0-100 score, flaky detection)
- Recommendations for improvement

### **Week 11: Web Dashboard + Dogfooding**
- Next.js dashboard (trends, gaps, team stats)
- Internal usage on our own repos
- Iterate based on real feedback

---

## 🌍 Phase 8 – Beta & Growth (Weeks 12-14)

### **Week 12: Beta (20-50 users)**
- Onboarding flow
- Tutorial video
- Sample projects (JS, Python, C#)
- Feedback channels

### **Week 13: CLI + Local LLM**
- Standalone CLI (shared with VS Code)
- Pluggable LLM providers (OpenAI, Anthropic, local)
- Privacy mode (no external calls)

### **Week 14: v1.0 Launch Prep**
- Polish UX
- Complete docs
- Pricing/gating
- Launch plan

---

## 🎯 Measurable Goals ("Moat")

| Goal | Target | Validation |
|------|--------|------------|
| **Style Learning** | ≥90% match | Team review of 50+ generated tests |
| **Auto-Fix Success** | ≥80% | Rename/signature changes without manual edits |
| **Risk Accuracy** | Top-10 = ≥80% incidents | Validated against git history + bug tracker |
| **CodeLens Adoption** | >60% users | Telemetry (opt-in) |
| **Time to Test** | <20s median | From CodeLens click to generated test |
| **Multi-Language** | 3+ languages | JS, Python, C# working end-to-end |

---

## 🚫 Deferred Post-v1.0

**To keep focus:**
- Mutation testing
- Performance analyzer
- Leaderboard/Badges
- Visual Test Builder
- JetBrains plugin (CLI first, plugin later)

**Rationale:** Focus on core differentiators first. These are nice-to-have, not competitive moat.

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **Multi-language complexity** | ✅ Provider pattern done! Each language isolated. |
| **Auto-fix too complex** | Start simple (rename/signature), iterate to complex refactors |
| **Performance in large repos** | Incremental scan + cache file map |
| **Multi-framework chaos** | ✅ Formalized `LanguageProvider` interface |
| **Style learning inaccuracy** | Dogfood on 5+ diverse projects, tune patterns |

---

## 📊 Current Status Summary

### **Completed (Weeks 1-5.5):**
- ✅ Modular backend architecture
- ✅ VS Code extension with TreeView + Chat
- ✅ **Cutting-edge UX/UI** (Warp-inspired bubbles, avatars, animations)
- ✅ **Multi-language support** (JS, Python, C#, 13 frameworks)
- ✅ Provider pattern architecture (~1200 LOC)
- ✅ Language auto-detection

### **In Progress (Week 5.6):**
- 🚧 CodebaseAnalyzer integration with providers
- 🚧 TreeView multi-language UI
- 🚧 E2E testing with mixed projects

### **Next (Week 6):**
- 🎯 Real coverage tracking (Istanbul/c8/pytest-cov/coverlet)
- 🎯 Style learning (analyze existing tests)
- 🎯 CodeLens provider (inline coverage %)

---

## 🚀 Immediate Next Steps

**This Week (5.6 - Integration):**
1. ✅ Read current `codebase-analyzer.service.ts`
2. 🔨 Inject `LanguageDetector` + `ProviderRegistry`
3. 🔨 Replace hardcoded JS logic with provider loop
4. 🔨 Update API responses to include language info
5. 🔨 Update `coverageTreeProvider.ts` to group by language
6. 🔨 Add language icons and labels
7. 🧪 Test with pure JS, pure Python, pure C#, mixed projects

**Next Week (Week 6 - Coverage + Style):**
1. 📋 Define JSON schemas (coverage-map, style-guide)
2. 🏗️ Skeleton services (coverage-analyzer, style-learner)
3. 🎨 Minimal CodeLens (file %, "Generate test")
4. 🐕 Dogfood on 1 NestJS + 1 Python project

---

## 📚 Key Files

### **Backend:**
```
apps/backend/src/modules/
├── language-providers/        ✅ DONE
│   ├── base/*.ts
│   ├── javascript/*.ts
│   ├── python/*.ts
│   └── csharp/*.ts
├── analysis/
│   ├── codebase-analyzer.service.ts  🔨 REFACTOR NEXT
│   ├── coverage-analyzer.service.ts  📋 Week 6
│   ├── style-learner.service.ts     📋 Week 6
│   └── risk-prioritizer.service.ts  📋 Week 7
├── maintenance/
│   └── test-fixer.service.ts        📋 Week 7
└── generation/
    └── mock-generator.service.ts    📋 Week 8
```

### **VS Code Extension:**
```
apps/vscode-extension/src/
├── coverageTreeProvider.ts      🔨 UPDATE NEXT (multi-language UI)
├── providers/
│   └── codelens.provider.ts     📋 Week 6
└── services/
    └── test-execution.service.ts 📋 Week 6
```

### **Artifacts:**
```
.qagenai/
├── coverage-map.json       📋 Week 6
├── style-guide.json        📋 Week 6
└── team-stats.json         📋 Week 11
```

---

## 🎉 Summary

**We just completed Phase 5.5 – Multi-Language Support!**

This is a **HUGE competitive advantage** that Copilot/Cursor/Cody don't have:
- ✅ 3 languages (JS, Python, C#)
- ✅ 13 frameworks auto-detected
- ✅ Provider pattern = infinitely extensible
- ✅ Each new language = 1 file (~200 LOC)

**Next:** Integrate providers into CodebaseAnalyzer, update TreeView UI, then move to Phase 6 (Coverage + Style Learning)!

**Timeline on track:** 14 weeks to v1.0, currently at week 5.5 🚀

---

**Updated:** 2025-11-28  
**Version:** 2.1  
**Status:** Phase 5.5 ✅ | Phase 5.6 🚧 | Phase 6 📋

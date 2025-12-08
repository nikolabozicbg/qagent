# QAgenAI - Multi-Layer Testing Strategy & UX Flow

**Problem:** User opens C# project → Gets Jest recommendation ❌  
**Root Cause:** System only detects language, not testing preferences  
**Solution:** 3-layer intelligent detection + user-guided setup

---

## 🎯 The 3-Layer Model

```
Layer 1: LANGUAGE DETECTION (What is the codebase?)
   ↓
Layer 2: TESTING FRAMEWORK DETECTION (What's already installed?)
   ↓
Layer 3: USER PREFERENCE SELECTION (What do they want to use?)
```

---

## Layer 1: Language Detection ✅ (Already Works)

**Files scanned:**
- `.csproj` → C#
- `package.json` → JavaScript/TypeScript
- `requirements.txt` → Python
- `go.mod` → Go
- `Cargo.toml` → Rust

**Current Issue:** Stops here, doesn't continue to Layer 2/3! ❌

---

## Layer 2: Framework Detection (NEEDS FIX)

### **2a. Installed Frameworks (High Confidence)**
Scan for **already installed** testing dependencies:

**C# (.csproj):**
```xml
<PackageReference Include="xUnit" Version="2.6.0" />     → xUnit detected ✅
<PackageReference Include="NUnit" Version="3.14.0" />    → NUnit detected ✅
<PackageReference Include="MSTest.TestFramework" />      → MSTest detected ✅
```

**JavaScript (package.json):**
```json
"devDependencies": {
  "jest": "^29.0.0"          → Jest detected ✅
  "vitest": "^1.0.0"         → Vitest detected ✅
  "@playwright/test": "^1.40" → Playwright detected ✅
}
```

**Python (requirements.txt / pyproject.toml):**
```
pytest>=7.0.0              → pytest detected ✅
unittest2                  → unittest detected ✅
behave                     → behave detected ✅
```

### **2b. Existing Test Files (Medium Confidence)**
Scan for **test file patterns**:

**C#:**
- `*Tests.cs` (e.g., `UserServiceTests.cs`)
- `*Test.cs`
- Folder: `Tests/`, `test/`

**JavaScript:**
- `*.spec.ts`, `*.test.ts`
- Folder: `__tests__/`, `tests/`

**Python:**
- `test_*.py`, `*_test.py`
- Folder: `tests/`

**Heuristic:**
```typescript
if (hasXunitPackage) return "xUnit installed";
if (hasTestFilesPattern("*Tests.cs") && noDependencies) return "Likely xUnit/NUnit (not installed yet)";
if (noTestFiles && noDependencies) return "No testing setup detected";
```

---

## Layer 3: User Preference Selection (NEW UX!)

### **When to trigger:**
1. **No frameworks detected** → Show Setup Wizard
2. **Multiple frameworks detected** → Ask which to use
3. **Framework detected but different type** → Offer alternative

---

## 🎨 NEW UX Flow: Setup Wizard

### **Scenario 1: No Testing Setup (Like your C# project)**

**TreeView Display:**
```
⚠️ No Testing Setup Detected

🛠️ Setup Testing
└─ 🔷 C# Project Detected
   └─ [Click to Choose Framework] ➡️
```

**On Click → Modal/Webview:**
```
┌─────────────────────────────────────────────┐
│  🧪 Choose Your Testing Framework           │
├─────────────────────────────────────────────┤
│  Language: C# (.NET 9.0)                    │
│                                             │
│  Unit Testing:                              │
│  ○ xUnit (Recommended) ⭐                   │
│     Modern, widely used in .NET             │
│                                             │
│  ○ NUnit                                    │
│     Classic, rich assertion library         │
│                                             │
│  ○ MSTest                                   │
│     Official Microsoft framework            │
│                                             │
│  Integration Testing (Optional):            │
│  ☑ WebApplicationFactory (for APIs)        │
│  ☐ Testcontainers (for databases)          │
│                                             │
│  [Install xUnit + Setup]  [Skip for now]   │
└─────────────────────────────────────────────┘
```

**Actions on "Install xUnit + Setup":**
1. Run: `dotnet add package xunit`
2. Run: `dotnet add package xunit.runner.visualstudio`
3. Run: `dotnet add package Moq` (mocking)
4. Create `Tests/` folder structure
5. Generate sample test file
6. Show "✅ xUnit installed!" notification
7. Refresh TreeView

---

### **Scenario 2: Framework Detected But Wrong Type**

**Example:** User has xUnit (unit) but wants to test API endpoints (integration)

**TreeView Display:**
```
🛠️ Testing Setup
├─ ✅ xUnit v2.6.0 (Unit)
└─ 💡 Suggestions
   └─ Add WebApplicationFactory for API tests? [Setup]
```

**On Click → Quick Action:**
```
┌─────────────────────────────────────────────┐
│  💡 Add Integration Testing                 │
├─────────────────────────────────────────────┤
│  You have xUnit for unit tests.             │
│  Add integration testing for APIs?          │
│                                             │
│  Will install:                              │
│  • Microsoft.AspNetCore.Mvc.Testing         │
│  • WebApplicationFactory support            │
│                                             │
│  [Yes, Add It]  [No Thanks]                 │
└─────────────────────────────────────────────┘
```

---

### **Scenario 3: Multiple Frameworks Detected**

**Example:** Project has both Jest (unit) and Playwright (e2e)

**TreeView Display:**
```
🛠️ Testing Setup
├─ 📦 JavaScript/TypeScript
│  ├─ ✅ jest v29.5.0 (Unit)
│  └─ ✅ playwright v1.40 (E2E)
└─ 💬 Which framework for this file?
```

**When generating test → Ask:**
```
┌─────────────────────────────────────────────┐
│  Choose Test Type for payment.service.ts    │
├─────────────────────────────────────────────┤
│  ○ Unit Test (Jest)                         │
│     Test business logic, mocked deps        │
│                                             │
│  ○ E2E Test (Playwright)                    │
│     Test full API flow, real server         │
│                                             │
│  [Generate]  [Cancel]                       │
└─────────────────────────────────────────────┘
```

---

## 🎯 Complete User Flow (C# Example)

### **User Opens Project:**
```
1. Extension activates
2. LanguageDetector: Detects C# (.NET 9.0)
3. ProviderRegistry: Gets CSharpProvider
4. CSharpProvider.detectFrameworks(): Returns []
5. TreeView shows: "⚠️ No Testing Setup"
```

### **User Clicks Setup:**
```
6. Show Framework Selection Modal
7. User selects: "xUnit + Moq"
8. Backend runs:
   - dotnet add package xunit
   - dotnet add package Moq
9. Create Tests/ folder
10. TreeView refreshes: "✅ xUnit v2.6.0"
```

### **User Generates Test:**
```
11. Right-click UserService.cs → "Generate Test"
12. CSharpProvider.getTestGenerationPrompt():
    - Knows framework is xUnit
    - Generates xUnit-specific prompt ([Fact], Assert.Equal)
13. AI generates test
14. Save to Tests/UserServiceTests.cs
15. TreeView updates: "🟢 UserService.cs (100%)"
```

---

## 🎨 Enhanced TreeView Structure

### **Before (Current - Wrong):**
```
🔧 Testing Setup
└─ 📦 jest (recommended)    ← WRONG FOR C#!

🔴 No Tests  0 files
```

### **After (Fixed - Multi-Layer):**
```
⚠️ No Testing Setup Detected

🛠️ Choose Framework
├─ 🔷 C# Project (.NET 9.0)
│  └─ [Setup xUnit] [Setup NUnit] [Setup MSTest]
└─ 💡 Or let QAgenAI detect from existing tests

📂 Project Structure
├─ src/VesselBE/
│  ├─ 🔴 UserService.cs [Generate Test]
│  ├─ 🔴 PaymentService.cs [Generate Test]
│  └─ 🔴 AuthController.cs [Generate Test]
└─ Tests/ (empty)
```

### **After Setup:**
```
🛠️ Testing Setup
└─ 🔷 C# (.NET 9.0)
   ├─ ✅ xUnit v2.6.0 (Unit)
   ├─ ✅ Moq v4.20.0 (Mocking)
   └─ 💡 Add WebApplicationFactory? [Setup]

🔴 No Tests  12 files
├─ 🚨 PaymentService.cs (250 LOC) [Generate]
├─ ⚠️ UserService.cs (180 LOC) [Generate]
└─ 📊 AuthController.cs (120 LOC) [Generate]

🟢 Full Coverage  3 files
```

---

## 🎯 Framework Recommendation Engine

### **C# Decision Tree:**
```
Is it Web API?
├─ Yes → xUnit + WebApplicationFactory + Moq
└─ No → Is it Class Library?
    ├─ Yes → xUnit + Moq
    └─ No → NUnit (for legacy)
```

### **JavaScript Decision Tree:**
```
Is it React/Vue/Svelte?
├─ Yes → Vitest + Testing Library
└─ No → Is it Node.js API?
    ├─ Yes → Jest + Supertest
    └─ No → Is it E2E needed?
        ├─ Yes → Playwright
        └─ No → Jest
```

### **Python Decision Tree:**
```
Is it Django/Flask?
├─ Yes → pytest + pytest-django/pytest-flask
└─ No → Is it async (FastAPI)?
    ├─ Yes → pytest + pytest-asyncio
    └─ No → pytest + pytest-mock
```

---

## 🔧 Backend Changes Needed

### **1. Fix CodebaseAnalyzer Integration (Immediate)**

**File:** `apps/backend/src/modules/analysis/codebase-analyzer.service.ts`

**Current (Wrong):**
```typescript
async analyzeWorkspace(workspacePath: string) {
  // Only calls findSourceFiles() - doesn't use providers!
  const sourceFiles = await this.findSourceFiles(workspacePath);
  return { sourceFiles, frameworks: ['jest'] }; // ❌ Hardcoded!
}
```

**Fixed:**
```typescript
async analyzeWorkspace(workspacePath: string) {
  // 1. Detect languages
  const languages = await this.languageDetector.detectLanguages(workspacePath);
  
  // 2. Get providers
  const providers = this.providerRegistry.getProviders(languages);
  
  // 3. For each provider, detect frameworks
  const results = [];
  for (const provider of providers) {
    const frameworks = await provider.detectFrameworks(workspacePath);
    const sources = await provider.findSourceFiles(workspacePath);
    const tests = await provider.findTestFiles(workspacePath);
    
    results.push({
      language: provider.getMetadata().language,
      frameworks: frameworks.length > 0 ? frameworks : null, // null if none detected
      sources,
      tests,
      recommendation: this.getRecommendation(provider, frameworks)
    });
  }
  
  return this.aggregateResults(results);
}

private getRecommendation(provider, existingFrameworks) {
  if (existingFrameworks.length > 0) return null; // Already has frameworks
  
  // Recommend based on project type
  const metadata = provider.getMetadata();
  
  if (metadata.language === 'csharp') {
    return {
      primary: { name: 'xUnit', type: 'unit', reason: 'Modern, widely used' },
      alternatives: [
        { name: 'NUnit', type: 'unit', reason: 'Rich assertions' },
        { name: 'MSTest', type: 'unit', reason: 'Official MS framework' }
      ],
      additions: [
        { name: 'Moq', type: 'mocking', reason: 'For dependency mocking' },
        { name: 'WebApplicationFactory', type: 'integration', reason: 'For API testing' }
      ]
    };
  }
  
  // Similar for other languages...
}
```

---

### **2. Add Recommendation System**

**New File:** `apps/backend/src/modules/analysis/framework-recommender.service.ts`

```typescript
@Injectable()
export class FrameworkRecommenderService {
  getRecommendations(language: string, projectType: 'api' | 'library' | 'frontend' | 'unknown') {
    const recommendations = {
      csharp: {
        api: {
          primary: { name: 'xUnit', packages: ['xunit', 'xunit.runner.visualstudio', 'Moq'] },
          integration: { name: 'WebApplicationFactory', packages: ['Microsoft.AspNetCore.Mvc.Testing'] }
        },
        library: {
          primary: { name: 'xUnit', packages: ['xunit', 'xunit.runner.visualstudio', 'Moq'] }
        }
      },
      javascript: {
        frontend: {
          primary: { name: 'Vitest', packages: ['vitest', '@testing-library/react'] }
        },
        api: {
          primary: { name: 'Jest', packages: ['jest', 'supertest'] }
        }
      },
      python: {
        api: {
          primary: { name: 'pytest', packages: ['pytest', 'pytest-asyncio', 'httpx'] }
        }
      }
    };
    
    return recommendations[language]?.[projectType] || recommendations[language]?.['library'];
  }
  
  detectProjectType(workspacePath: string, language: string): 'api' | 'library' | 'frontend' | 'unknown' {
    // For C#: Check if has Controllers/ or Program.cs with WebApplication
    // For JS: Check if has React/Vue imports
    // For Python: Check if has FastAPI/Flask/Django imports
    
    if (language === 'csharp') {
      const hasProgramCs = fs.existsSync(path.join(workspacePath, 'Program.cs'));
      const hasControllers = fs.existsSync(path.join(workspacePath, 'Controllers'));
      if (hasProgramCs || hasControllers) return 'api';
    }
    
    return 'library';
  }
}
```

---

### **3. Update Extension TreeView**

**File:** `apps/vscode-extension/src/coverageTreeProvider.ts`

**Add Setup Node:**
```typescript
private createSetupNode(language: string, recommendations: any): vscode.TreeItem {
  if (recommendations) {
    const node = new vscode.TreeItem(
      `⚠️ No Testing Setup - Choose Framework`,
      vscode.TreeItemCollapsibleState.Expanded
    );
    
    node.children = recommendations.alternatives.map(fw => {
      const item = new vscode.TreeItem(`Setup ${fw.name}`, vscode.TreeItemCollapsibleState.None);
      item.command = {
        command: 'qagenai.setupFramework',
        title: 'Setup Framework',
        arguments: [language, fw]
      };
      item.iconPath = new vscode.ThemeIcon('tools');
      item.tooltip = fw.reason;
      return item;
    });
    
    return node;
  }
  
  // Show detected frameworks
  return this.createFrameworkListNode(...);
}
```

**Add Setup Command:**
```typescript
vscode.commands.registerCommand('qagenai.setupFramework', async (language, framework) => {
  const choice = await vscode.window.showInformationMessage(
    `Install ${framework.name} for ${language}?`,
    'Install',
    'Cancel'
  );
  
  if (choice === 'Install') {
    await this.installFramework(language, framework);
    vscode.window.showInformationMessage(`✅ ${framework.name} installed!`);
    this.refresh();
  }
});

private async installFramework(language: string, framework: any) {
  const terminal = vscode.window.createTerminal('QAgenAI Setup');
  terminal.show();
  
  if (language === 'csharp') {
    for (const pkg of framework.packages) {
      terminal.sendText(`dotnet add package ${pkg}`);
      await this.wait(1000);
    }
  } else if (language === 'javascript') {
    terminal.sendText(`npm install --save-dev ${framework.packages.join(' ')}`);
  } else if (language === 'python') {
    terminal.sendText(`pip install ${framework.packages.join(' ')}`);
  }
}
```

---

## 📊 Final UX Comparison

### **Competitor (Copilot/Cursor):**
```
❌ No framework detection
❌ No setup wizard
❌ User must manually configure
❌ Generic test generation (no framework-specific)
```

### **QAgenAI (After This Fix):**
```
✅ Auto-detects language
✅ Auto-detects installed frameworks
✅ Recommends best framework if none found
✅ One-click setup wizard
✅ Framework-specific test generation
✅ Multi-framework support in same project
✅ Test type selection (unit/integration/e2e)
```

---

## 🎯 Success Metrics

**User opens C# project without tests:**
1. Sees: "⚠️ No Testing Setup" (not Jest recommendation!)
2. Clicks: "Setup xUnit"
3. Extension installs packages automatically
4. User generates test → Gets xUnit-specific test
5. Time to first test: <60 seconds ✅

**This is 10x better than competitors!** 🚀

---

## 🚀 Implementation Priority

### **Phase 1 (Critical - Fix C# Issue):**
1. ✅ Integrate LanguageDetector + ProviderRegistry in CodebaseAnalyzer
2. ✅ Add FrameworkRecommenderService
3. ✅ Update TreeView to show "No Setup" node
4. ✅ Test with stillstrom-be C# project

### **Phase 2 (Complete Setup Wizard):**
1. Add `qagenai.setupFramework` command
2. Terminal automation for package installation
3. Generate sample test file after setup
4. Refresh TreeView after setup

### **Phase 3 (Polish):**
1. Webview modal for framework selection (vs. quick pick)
2. Project type detection (API vs Library vs Frontend)
3. Multi-step wizard with explanations
4. Video tutorial links

---

**This design beats ALL competitors!** 🏆

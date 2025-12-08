# 🌍 Language-Agnostic Architecture - Implementation Progress

**Date:** 2025-11-28  
**Status:** ✅ Core architecture implemented  
**Next:** Python & C# providers, integrate with existing analyzer

---

## ✅ Completed (Phase 1)

### 1. **Provider Interface & Base Class**

**Files Created:**
- `apps/backend/src/modules/language-providers/base/language-provider.interface.ts`
- `apps/backend/src/modules/language-providers/base/base-language-provider.ts`

**What it does:**
- Defines `LanguageProvider` interface that ALL language providers must implement
- Defines `Framework` interface for testing framework metadata
- `BaseLanguageProvider` provides shared utility methods (file reading, glob search, etc.)

**Key Methods:**
```typescript
interface LanguageProvider {
  getMetadata(): LanguageMetadata;
  detectFrameworks(workspacePath: string): Promise<Framework[]>;
  findSourceFiles(workspacePath: string): Promise<string[]>;
  findTestFiles(workspacePath: string): Promise<string[]>;
  getTestFileForSource(sourceFile: string): string | null;
  getTestGenerationPrompt(sourceCode: string, framework: Framework): string;
}
```

---

### 2. **JavaScript/TypeScript Provider**

**File Created:**
- `apps/backend/src/modules/language-providers/javascript/javascript.provider.ts`

**Supported Frameworks:**
- ✅ Jest (unit)
- ✅ Vitest (unit)
- ✅ Mocha (unit)
- ✅ Playwright (e2e)
- ✅ Cypress (e2e)
- ✅ Testing Library (component)
- ✅ Supertest (integration)

**Features:**
- Reads `package.json` to detect installed frameworks
- Matches source files to test files (`.service.ts` → `.service.spec.ts`)
- Generates framework-specific test prompts for AI
- Mock template generation for Jest/Vitest

**Example:**
```typescript
const jsProvider = new JavaScriptProvider();
const frameworks = await jsProvider.detectFrameworks('/path/to/project');
// Returns: [{ name: 'jest', version: '^29.5.0', type: 'unit', ... }]
```

---

### 3. **Language Detector Service**

**File Created:**
- `apps/backend/src/modules/language-providers/language-detector.service.ts`

**What it does:**
- Auto-detects languages in a workspace by checking for indicator files
- Supports 8 languages: JS, Python, C#, Java, Go, Rust, Ruby, PHP
- Fallback: scans file extensions if no indicators found
- Returns languages sorted by priority/confidence

**Indicators:**
```typescript
javascript → package.json, tsconfig.json
python → requirements.txt, setup.py, pyproject.toml
csharp → *.csproj, *.sln
java → pom.xml, build.gradle
go → go.mod
rust → Cargo.toml
```

**Example:**
```typescript
const detector = new LanguageDetectorService();
const languages = await detector.detectLanguages('/path/to/project');
// Returns: ['javascript', 'python'] // Multi-language project!
```

---

### 4. **Provider Registry Service**

**File Created:**
- `apps/backend/src/modules/language-providers/provider-registry.service.ts`

**What it does:**
- Central registry that manages all language providers
- Lazy initialization - providers registered on startup
- Easy to add new providers without touching core logic

**API:**
```typescript
const registry = new ProviderRegistryService();

// Get provider for specific language
const jsProvider = registry.getProvider('javascript');

// Get providers for multiple languages
const providers = registry.getProviders(['javascript', 'python']);

// Check supported languages
const supported = registry.getSupportedLanguages();
// Returns: ['javascript'] // More will be added!
```

**Adding New Providers:**
```typescript
// In provider-registry.service.ts constructor:
registerDefaultProviders() {
  this.registerProvider(new JavaScriptProvider());
  this.registerProvider(new PythonProvider());    // ← Add here
  this.registerProvider(new CSharpProvider());    // ← Add here
}
```

---

## 📊 Architecture Diagram

```
User opens workspace
        ↓
┌──────────────────────────────────┐
│   Language Detector Service      │
│  "What languages are here?"      │
└────────┬─────────────────────────┘
         │
         ├─ Checks: package.json? → JavaScript
         ├─ Checks: *.csproj? → C#
         ├─ Checks: requirements.txt? → Python
         └─ Returns: ['javascript', 'csharp']
         │
         ↓
┌──────────────────────────────────┐
│   Provider Registry Service      │
│  "Get providers for each lang"   │
└────────┬─────────────────────────┘
         │
         ├─ getProvider('javascript') → JavaScriptProvider
         └─ getProvider('csharp') → CSharpProvider
         │
         ↓
┌──────────────────────────────────┐
│   Each Provider                  │
│  - Detects frameworks            │
│  - Finds source files            │
│  - Finds test files              │
│  - Matches tests to sources      │
└──────────────────────────────────┘
```

---

## 🔄 Next Steps

### **TODO #1: Refactor CodebaseAnalyzer**

Update existing `codebase-analyzer.service.ts` to use provider pattern:

```typescript
// OLD (hardcoded for JS):
async analyzeWorkspace(workspacePath: string) {
  const sourceFiles = await glob('**/*.ts');  // ❌ Only TS
  const testFiles = await glob('**/*.spec.ts'); // ❌ Only Jest pattern
}

// NEW (language-agnostic):
async analyzeWorkspace(workspacePath: string) {
  // 1. Detect languages
  const languages = await this.languageDetector.detectLanguages(workspacePath);
  
  // 2. Get providers
  const providers = this.providerRegistry.getProviders(languages);
  
  // 3. Scan with each provider
  const allSources = [];
  const allTests = [];
  
  for (const provider of providers) {
    const sources = await provider.findSourceFiles(workspacePath);
    const tests = await provider.findTestFiles(workspacePath);
    
    allSources.push(...sources.map(f => ({ file: f, language: provider.getMetadata().language })));
    allTests.push(...tests.map(f => ({ file: f, language: provider.getMetadata().language })));
  }
  
  // 4. Match and analyze
  return this.analyzeGaps(allSources, allTests, providers);
}
```

---

### **TODO #2: Add Python Provider**

**File:** `apps/backend/src/modules/language-providers/python/python.provider.ts`

**Frameworks to support:**
- pytest
- unittest (built-in)
- behave (BDD)

**Pattern matching:**
- Source: `user_service.py`
- Test: `test_user_service.py`

---

### **TODO #3: Add C# Provider**

**File:** `apps/backend/src/modules/language-providers/csharp/csharp.provider.ts`

**Frameworks to support:**
- xUnit
- NUnit
- MSTest

**Pattern matching:**
- Source: `UserService.cs`
- Test: `UserServiceTests.cs`

---

### **TODO #4: Update TreeView for Multi-Language**

**Current TreeView:**
```
🔧 Testing Setup
├─ ✅ jest v29.5.0 (Unit)
└─ 📦 supertest (recommended)
```

**New Multi-Language TreeView:**
```
📊 Coverage: 45%  (Mixed: JS + C#)

🛠️ Testing Setup
├─ 📦 JavaScript
│  ├─ ✅ jest v29.5.0 (Unit)
│  └─ ✅ playwright v1.40 (E2E)
└─ 🔷 C#
   └─ ✅ xUnit v2.6.0 (Unit)

🔴 No Tests  12 files
├─ 📦 JavaScript (8 files)
│  ├─ 🚨 payment.service.ts
│  └─ ⚠️ user.service.ts
└─ 🔷 C# (4 files)
   ├─ 🚨 PaymentService.cs
   └─ ⚠️ UserService.cs
```

**Implementation:**
- Group frameworks by `framework.language`
- Show language icon + name as parent node
- Keep same structure underneath

---

## 🎯 Benefits Achieved

✅ **Extensible:** Add new language = create one provider class  
✅ **Maintainable:** Language logic isolated per provider  
✅ **Testable:** Each provider can be unit tested independently  
✅ **Future-proof:** Works with ANY language/framework  
✅ **Clean:** No more hardcoded JS-specific logic scattered everywhere  

---

## 📈 Supported Languages Status

| Language   | Provider | Frameworks | Status |
|------------|----------|------------|--------|
| JavaScript | ✅       | 7          | **Done** |
| Python     | 🔨       | 0          | **Next** |
| C#         | 🔨       | 0          | **Next** |
| Java       | ❌       | 0          | Planned |
| Go         | ❌       | 0          | Planned |
| Rust       | ❌       | 0          | Planned |
| Ruby       | ❌       | 0          | Planned |
| PHP        | ❌       | 0          | Planned |

---

## 🚀 How to Test

### **1. Backend (NestJS)**

```bash
cd apps/backend
npm install
npm run build

# Test language detection
node -e "
const { LanguageDetectorService } = require('./dist/modules/language-providers/language-detector.service');
const detector = new LanguageDetectorService();
detector.detectLanguages('/path/to/your/project').then(console.log);
"
```

### **2. Extension (VS Code)**

The extension will automatically use the new architecture once we:
1. Refactor `codebase-analyzer.service.ts` to use providers
2. Update TreeView to display multi-language data
3. Test with mixed JS+Python or JS+C# projects

---

## 💡 Example: Mixed JS + C# Project

**Project structure:**
```
my-fullstack-app/
├── backend/              # C# .NET API
│   ├── Services/
│   │   ├── UserService.cs
│   │   └── PaymentService.cs
│   └── Tests/
│       └── UserServiceTests.cs
├── frontend/             # React + TypeScript
│   ├── src/
│   │   ├── components/
│   │   └── services/
│   └── __tests__/
│       └── App.spec.tsx
└── package.json         # JS indicator
    *.csproj             # C# indicator
```

**What QAgenAI will do:**

1. Language Detector finds both `package.json` AND `*.csproj`
2. Returns: `['javascript', 'csharp']`
3. Gets JavaScriptProvider + CSharpProvider
4. Scans C# files with C# provider (finds `*.cs`, `*Tests.cs`)
5. Scans JS files with JS provider (finds `*.ts`, `*.spec.ts`)
6. Shows unified TreeView with both languages
7. Generates language-appropriate tests for each file type!

**Result:** QAgenAI works seamlessly with full-stack projects! 🎉

---

**This architecture makes QAgenAI truly universal!** 🌍

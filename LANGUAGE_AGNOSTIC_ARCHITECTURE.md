# 🌍 Language-Agnostic Architecture

**Goal:** Support ALL languages and testing frameworks (JS, Python, C#, Java, Go, Rust, etc.)

---

## 📐 Architecture Overview

### **Provider Pattern - Pluggable Language Support**

```
┌─────────────────────────────────────────┐
│         Extension / CLI                 │
│    (Language-agnostic interface)        │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│      Language Detector Service          │
│  (Auto-detects project language)        │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│      Language Provider Registry         │
│   (Routes to appropriate provider)      │
└────────────┬────────────────────────────┘
             │
     ┌───────┴───────┬──────────┬─────────┐
     ▼               ▼          ▼         ▼
┌─────────┐   ┌─────────┐  ┌─────────┐  ┌─────────┐
│   JS    │   │  Python │  │   C#    │  │   Go    │
│ Provider│   │ Provider│  │ Provider│  │ Provider│
└─────────┘   └─────────┘  └─────────┘  └─────────┘
```

---

## 🔌 Language Provider Interface

**Every language implements this contract:**

```typescript
interface LanguageProvider {
  // Language metadata
  language: string;           // 'javascript', 'python', 'csharp', etc.
  fileExtensions: string[];   // ['.js', '.ts'], ['.py'], ['.cs'], etc.
  
  // Framework detection
  detectFrameworks(workspacePath: string): Promise<Framework[]>;
  
  // File scanning
  findSourceFiles(workspacePath: string): Promise<string[]>;
  findTestFiles(workspacePath: string): Promise<string[]>;
  
  // Test matching
  getTestFileForSource(sourceFile: string): string | null;
  getSourceFileForTest(testFile: string): string | null;
  
  // Coverage parsing (if applicable)
  parseCoverageReport?(coveragePath: string): Promise<CoverageData>;
  
  // Test generation prompt templates
  getTestGenerationPrompt(sourceCode: string, framework: Framework): string;
  
  // Mock generation (language-specific)
  generateMockTemplate?(className: string): string;
}

interface Framework {
  name: string;           // 'jest', 'pytest', 'xunit', etc.
  version?: string;
  type: 'unit' | 'integration' | 'e2e';
  configFiles: string[];  // ['jest.config.js', 'pytest.ini', etc.]
  testPattern: string;    // '*.spec.ts', 'test_*.py', '*Tests.cs'
  runCommand: string;     // 'npm test', 'pytest', 'dotnet test'
}
```

---

## 🗂️ Implementation Structure

```
apps/backend/src/modules/language-providers/
├── base/
│   ├── language-provider.interface.ts
│   └── base-language-provider.ts (shared logic)
├── javascript/
│   ├── javascript.provider.ts
│   ├── frameworks/
│   │   ├── jest.detector.ts
│   │   ├── vitest.detector.ts
│   │   ├── mocha.detector.ts
│   │   └── playwright.detector.ts
│   └── test-patterns.ts
├── python/
│   ├── python.provider.ts
│   ├── frameworks/
│   │   ├── pytest.detector.ts
│   │   ├── unittest.detector.ts
│   │   └── behave.detector.ts
│   └── test-patterns.ts
├── csharp/
│   ├── csharp.provider.ts
│   ├── frameworks/
│   │   ├── xunit.detector.ts
│   │   ├── nunit.detector.ts
│   │   └── mstest.detector.ts
│   └── test-patterns.ts
├── java/
│   ├── java.provider.ts
│   ├── frameworks/
│   │   ├── junit.detector.ts
│   │   └── testng.detector.ts
│   └── test-patterns.ts
├── go/
│   ├── go.provider.ts
│   └── testing.detector.ts (built-in)
├── rust/
│   ├── rust.provider.ts
│   └── cargo-test.detector.ts
└── registry.service.ts (manages all providers)
```

---

## 📋 Example: JavaScript Provider

```typescript
// javascript.provider.ts
export class JavaScriptProvider implements LanguageProvider {
  language = 'javascript';
  fileExtensions = ['.js', '.jsx', '.ts', '.tsx'];
  
  async detectFrameworks(workspacePath: string): Promise<Framework[]> {
    const frameworks: Framework[] = [];
    
    // Check package.json
    const packageJson = await this.readPackageJson(workspacePath);
    
    if (packageJson.devDependencies?.jest) {
      frameworks.push({
        name: 'jest',
        version: packageJson.devDependencies.jest,
        type: 'unit',
        configFiles: ['jest.config.js', 'jest.config.ts'],
        testPattern: '*.spec.{ts,js}',
        runCommand: 'npm test'
      });
    }
    
    if (packageJson.devDependencies?.vitest) {
      frameworks.push({
        name: 'vitest',
        version: packageJson.devDependencies.vitest,
        type: 'unit',
        configFiles: ['vitest.config.ts'],
        testPattern: '*.test.{ts,js}',
        runCommand: 'npm run test'
      });
    }
    
    // ... check for Playwright, Cypress, etc.
    
    return frameworks;
  }
  
  findSourceFiles(workspacePath: string): Promise<string[]> {
    return glob(`${workspacePath}/**/*.{ts,js}`, {
      ignore: ['**/node_modules/**', '**/*.spec.*', '**/*.test.*', '**/dist/**']
    });
  }
  
  findTestFiles(workspacePath: string): Promise<string[]> {
    return glob(`${workspacePath}/**/*.{spec,test}.{ts,js}`);
  }
  
  getTestFileForSource(sourceFile: string): string | null {
    // users.service.ts → users.service.spec.ts
    return sourceFile.replace(/\.(ts|js)$/, '.spec.$1');
  }
  
  getTestGenerationPrompt(sourceCode: string, framework: Framework): string {
    return `Generate comprehensive ${framework.name} tests for this TypeScript code:\n\n${sourceCode}`;
  }
}
```

---

## 📋 Example: Python Provider

```typescript
// python.provider.ts
export class PythonProvider implements LanguageProvider {
  language = 'python';
  fileExtensions = ['.py'];
  
  async detectFrameworks(workspacePath: string): Promise<Framework[]> {
    const frameworks: Framework[] = [];
    
    // Check requirements.txt or setup.py
    const hasPytest = await this.fileExists(`${workspacePath}/pytest.ini`) ||
                      await this.checkRequirements(workspacePath, 'pytest');
    
    if (hasPytest) {
      frameworks.push({
        name: 'pytest',
        type: 'unit',
        configFiles: ['pytest.ini', 'setup.cfg'],
        testPattern: 'test_*.py',
        runCommand: 'pytest'
      });
    }
    
    return frameworks;
  }
  
  findSourceFiles(workspacePath: string): Promise<string[]> {
    return glob(`${workspacePath}/**/*.py`, {
      ignore: ['**/test_*.py', '**/*_test.py', '**/venv/**', '**/__pycache__/**']
    });
  }
  
  findTestFiles(workspacePath: string): Promise<string[]> {
    return glob(`${workspacePath}/**/test_*.py`);
  }
  
  getTestFileForSource(sourceFile: string): string | null {
    // user_service.py → test_user_service.py
    const dir = path.dirname(sourceFile);
    const filename = path.basename(sourceFile);
    return path.join(dir, `test_${filename}`);
  }
}
```

---

## 📋 Example: C# Provider

```typescript
// csharp.provider.ts
export class CSharpProvider implements LanguageProvider {
  language = 'csharp';
  fileExtensions = ['.cs'];
  
  async detectFrameworks(workspacePath: string): Promise<Framework[]> {
    const frameworks: Framework[] = [];
    
    // Check .csproj files
    const csprojFiles = await glob(`${workspacePath}/**/*.csproj`);
    
    for (const csproj of csprojFiles) {
      const content = await fs.readFile(csproj, 'utf-8');
      
      if (content.includes('xunit')) {
        frameworks.push({
          name: 'xunit',
          type: 'unit',
          configFiles: [],
          testPattern: '*Tests.cs',
          runCommand: 'dotnet test'
        });
      }
      
      if (content.includes('NUnit')) {
        frameworks.push({
          name: 'nunit',
          type: 'unit',
          configFiles: [],
          testPattern: '*Tests.cs',
          runCommand: 'dotnet test'
        });
      }
    }
    
    return frameworks;
  }
  
  findSourceFiles(workspacePath: string): Promise<string[]> {
    return glob(`${workspacePath}/**/*.cs`, {
      ignore: ['**/*Tests.cs', '**/obj/**', '**/bin/**']
    });
  }
  
  findTestFiles(workspacePath: string): Promise<string[]> {
    return glob(`${workspacePath}/**/*Tests.cs`);
  }
  
  getTestFileForSource(sourceFile: string): string | null {
    // UserService.cs → UserServiceTests.cs
    return sourceFile.replace(/\.cs$/, 'Tests.cs');
  }
}
```

---

## 🔍 Language Detection Strategy

```typescript
// language-detector.service.ts
export class LanguageDetectorService {
  
  async detectLanguage(workspacePath: string): Promise<string[]> {
    const detectedLanguages: string[] = [];
    
    // Check for indicator files
    const indicators = {
      javascript: ['package.json', 'tsconfig.json'],
      python: ['requirements.txt', 'setup.py', 'pyproject.toml'],
      csharp: ['*.csproj', '*.sln'],
      java: ['pom.xml', 'build.gradle'],
      go: ['go.mod'],
      rust: ['Cargo.toml'],
      ruby: ['Gemfile'],
      php: ['composer.json']
    };
    
    for (const [lang, files] of Object.entries(indicators)) {
      for (const pattern of files) {
        const found = await glob(`${workspacePath}/${pattern}`);
        if (found.length > 0) {
          detectedLanguages.push(lang);
          break;
        }
      }
    }
    
    // Fallback: scan file extensions
    if (detectedLanguages.length === 0) {
      const allFiles = await glob(`${workspacePath}/**/*`, {
        ignore: ['**/node_modules/**', '**/venv/**', '**/bin/**', '**/obj/**']
      });
      
      const extensions = new Set(
        allFiles.map(f => path.extname(f)).filter(Boolean)
      );
      
      if (extensions.has('.ts') || extensions.has('.js')) {
        detectedLanguages.push('javascript');
      }
      if (extensions.has('.py')) detectedLanguages.push('python');
      if (extensions.has('.cs')) detectedLanguages.push('csharp');
      if (extensions.has('.java')) detectedLanguages.push('java');
      if (extensions.has('.go')) detectedLanguages.push('go');
      if (extensions.has('.rs')) detectedLanguages.push('rust');
    }
    
    return detectedLanguages;
  }
}
```

---

## 🎨 UI Adaptations

### **TreeView - Multi-Language Support**

```
📊 Coverage: 45%  (Mixed: JS + C#)

🛠️ Testing Setup
├─ 📦 JavaScript
│  ├─ ✅ jest v29.5.0 (Unit)
│  └─ ✅ playwright v1.40 (E2E)
├─ 🔷 C#
│  └─ ✅ xUnit v2.6.0 (Unit)

🔴 No Tests  12 files
├─ 📦 JavaScript (8 files)
│  ├─ 🚨 payment.service.ts
│  └─ ⚠️ user.service.ts
└─ 🔷 C# (4 files)
   ├─ 🚨 PaymentService.cs
   └─ ⚠️ UserService.cs
```

### **Language-Specific Icons**

```typescript
const languageIcons = {
  javascript: '📦',
  typescript: '📘',
  python: '🐍',
  csharp: '🔷',
  java: '☕',
  go: '🐹',
  rust: '🦀',
  ruby: '💎',
  php: '🐘'
};
```

---

## 🚀 Migration Path

### **Phase 1: Refactor Current JS Implementation**
- Extract JavaScript-specific logic into `JavaScriptProvider`
- Create `LanguageProvider` interface
- Create `ProviderRegistry` service

### **Phase 2: Add Python Support**
- Implement `PythonProvider`
- Test with real Python projects

### **Phase 3: Add C# Support**
- Implement `CSharpProvider`
- Test with .NET projects

### **Phase 4: Add More Languages**
- Java, Go, Rust, etc.
- Community contributions welcome!

---

## 📊 Benefits

✅ **Future-proof**: Add new languages without changing core logic  
✅ **Testable**: Each provider is isolated and testable  
✅ **Maintainable**: Language-specific logic is contained  
✅ **Scalable**: Easy to add community providers  
✅ **Flexible**: Each language can have custom behavior  

---

## 🎯 Example Use Case

```typescript
// In CodebaseAnalyzerService

async analyzeWorkspace(workspacePath: string) {
  // 1. Detect languages
  const languages = await this.languageDetector.detectLanguage(workspacePath);
  
  // 2. Get providers for each language
  const providers = languages.map(lang => 
    this.providerRegistry.getProvider(lang)
  );
  
  // 3. Scan files with appropriate provider
  const allSourceFiles = [];
  const allTestFiles = [];
  
  for (const provider of providers) {
    const sources = await provider.findSourceFiles(workspacePath);
    const tests = await provider.findTestFiles(workspacePath);
    
    allSourceFiles.push(...sources.map(f => ({ file: f, language: provider.language })));
    allTestFiles.push(...tests.map(f => ({ file: f, language: provider.language })));
  }
  
  // 4. Match tests to sources (language-aware)
  const gaps = this.matchTestsToSources(allSourceFiles, allTestFiles, providers);
  
  return {
    languages,
    frameworks: providers.flatMap(p => p.detectFrameworks(workspacePath)),
    gaps
  };
}
```

---

## 🔮 Future: Community Marketplace

```
📦 QAgenAI Language Providers

Official:
✅ JavaScript/TypeScript
✅ Python
✅ C#
✅ Java

Community:
🌟 Kotlin Provider (by @user1)
🌟 Swift Provider (by @user2)
🌟 Dart/Flutter Provider (by @user3)
```

---

**This architecture makes QAgenAI truly universal! 🌍**

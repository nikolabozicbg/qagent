# Universal Framework Support - Quick Start

## ✅ Šta je implementirano:

### Backend:
1. **`framework-config.schema.ts`** - Univerzalna konfiguracija za sve frameworke
   - Playwright, Jest, Vitest, pytest, Go testing, JUnit
   - File patterns, folder struktura, execution komande
   - Generation template-i

### Extension:
1. **`test-execution.service.ts`** - Refaktorisan
   - `runTest()` - pokreće pojedinačan test
   - `runAllTests()` - pokreće sve testove
   - `watchTest()` - watch mode
   - `debugTest()` - debug mode
   - Podrška za sve frameworke

## 🎯 Kako se koristi:

### Za developere (Extension development):

```typescript
import { TestExecutionService, getFrameworkExecutionConfig } from './services/test-execution.service';

const testService = new TestExecutionService();
const frameworkConfig = getFrameworkExecutionConfig('playwright');

// Run single test
await testService.runTest(
  '/path/to/test/file.spec.ts',
  frameworkConfig,
  workspaceRoot
);

// Run all tests
await testService.runAllTests(frameworkConfig, workspaceRoot);

// Watch mode
await testService.watchTest(testFilePath, frameworkConfig, workspaceRoot);
```

### Za end-usere (VS Code):

1. **Generate test** - kao i pre
2. **Run test** - right-click na `.spec.ts` ili `.test.ts` fajl → "Run Test"
3. **Watch test** - right-click → "Watch Test" (continuous testing)
4. **Debug test** - right-click → "Debug Test"

## 📁 Podržani frameworki:

| Framework | Language | Test Pattern | Folder | Run Command |
|-----------|----------|--------------|--------|-------------|
| **Playwright** | TypeScript | `*.spec.ts` | `tests/e2e/` | `npx playwright test {file}` |
| **Jest** | TypeScript | `*.test.ts` | `__tests__/` | `npx jest {file}` |
| **Vitest** | TypeScript | `*.test.ts` | `tests/` | `npx vitest {file}` |
| **pytest** | Python | `test_*.py` | `tests/` | `pytest {file}` |
| **Go testing** | Go | `*_test.go` | same dir | `go test {file}` |
| **JUnit** | Java | `*Test.java` | `src/test/java/` | `mvn test -Dtest={file}` |

## 🔧 Dodavanje novog framework-a:

### Backend (`framework-config.schema.ts`):
```typescript
export const FRAMEWORK_REGISTRY = {
  'mocha': {
    name: 'Mocha',
    language: 'typescript',
    type: 'unit',
    patterns: {
      testFilePattern: '*.test.ts',
      testFileExtension: '.test.ts',
      sourceFileExtensions: ['.ts']
    },
    directories: {
      testsRoot: 'test',
      relative: false
    },
    execution: {
      runCommand: 'npx mocha',
      runSingleFile: 'npx mocha {file}'
    },
    installation: {
      packageManager: 'npm',
      packages: ['mocha', '@types/mocha'],
      devDependencies: true
    },
    generation: {
      importStatement: "import { describe, it } from 'mocha';",
      testWrapperStart: "describe('{description}', () => {",
      testWrapperEnd: '});',
      testCaseStart: "it('{testName}', () => {",
      testCaseEnd: '});',
      assertionLibrary: 'assert'
    }
  }
};
```

### Extension (`test-execution.service.ts`):
```typescript
export const BUILTIN_FRAMEWORKS = {
  mocha: {
    name: 'Mocha',
    runCommand: 'npx mocha',
    runSingleFile: 'npx mocha {file}',
    watchCommand: 'npx mocha {file} --watch'
  }
};
```

## 📋 Sledeći koraci (TODO):

- [ ] Dodati context menu akcije (Run Test, Watch, Debug)
- [ ] Integracija sa Coverage TreeView
- [ ] Framework badge u TreeView-u
- [ ] Auto-detect framework iz package.json/go.mod/requirements.txt
- [ ] Test result parsing i prikaz
- [ ] Multi-framework projekti (monorepos)

## 🧪 Test scenario:

### Playwright E2E:
1. User: klikne "Generate E2E Test" na `src/app/privacy/page.tsx`
2. Agent: generiše `tests/e2e/privacy.spec.ts`
3. User: right-click na `privacy.spec.ts` → "Run Test"
4. Extension: pokreće `npx playwright test tests/e2e/privacy.spec.ts`
5. Terminal: prikazuje rezultate

### Jest Unit:
1. User: klikne "Generate Unit Test" na `src/lib/api.ts`
2. Agent: generiše `src/lib/__tests__/api.test.ts`
3. User: right-click → "Watch Test"
4. Extension: pokreće `npx jest src/lib/__tests__/api.test.ts --watch`
5. Terminal: continuous testing mode

## 🎉 Benefiti:

- ✅ Jedan service, svi frameworki
- ✅ Konzistentna UX za sve jezike
- ✅ Lako dodavanje novih frameworka
- ✅ Terminal management (reuse istog terminal-a)
- ✅ Watch & Debug podrška
- ✅ Backward compatible

## 📚 Dokumenti:

- **Plan**: `.warp/plans/{plan_id}` - Implementation plan
- **Config Schema**: `framework-config.schema.ts` - Framework definitions
- **Execution Service**: `test-execution.service.ts` - Test runner
- **Refactoring Summary**: `REFACTORING_SUMMARY.md` - Previous changes

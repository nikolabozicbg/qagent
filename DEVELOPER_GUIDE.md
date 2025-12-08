# QAgenAI Developer Guide

## Quick Start

### Generate Test from Extension
```typescript
import { TestGenerationService, TestType } from './services/test-generation.service';

// Initialize service
const testGenService = new TestGenerationService(backendApi, coverageProvider);

// Generate test
const result = await testGenService.generateTest({
  sourceFilePath: '/path/to/file.ts',
  sourceCode: '...',
  testType: TestType.E2E,
  framework: 'playwright',
  outputPath: 'tests/e2e'
});

console.log(result.testCode);     // Generated test code
console.log(result.testFilePath);  // Where to save it
```

### Call Agent from Backend
```typescript
POST /generate/agent
{
  "query": "Generate E2E test for privacy page using Playwright",
  "context": {
    "code": "...",
    "currentFile": "/path/to/privacy/page.tsx",
    "fileName": "page.tsx",
    "language": "typescript",
    "frameworks": {
      "e2e": { "name": "playwright", "version": "1.57.0" }
    }
  },
  "maxIterations": 10
}
```

## How E2E Detection Works

### Detection Triggers:
1. **Query contains keywords**: `e2e`, `end-to-end`, `playwright`
2. **Source file is in E2E folder**: `/e2e/`, `/tests/e2e/`

### Example Queries That Trigger E2E:
- ✅ "Generate E2E test for LoginPage"
- ✅ "Generate test using Playwright"
- ✅ "Create end-to-end test"

### Example Queries That DON'T Trigger E2E:
- ❌ "Generate unit test for LoginPage"
- ❌ "Generate test for LoginPage" (defaults to unit)

## Adding New Test Type

### Step 1: Add to Enum
```typescript
// test-generation.service.ts
export enum TestType {
  UNIT = 'unit',
  INTEGRATION = 'integration',
  E2E = 'e2e',
  VISUAL = 'visual'  // NEW
}
```

### Step 2: Update Detection Logic
```typescript
// agent.service.ts - detectTestType()
const isVisualFromQuery = queryLower.includes('visual') || 
                          queryLower.includes('snapshot');

let testType: 'unit' | 'e2e' | 'integration' | 'visual' = 'unit';
if (isE2ETest) testType = 'e2e';
else if (isIntegrationTest) testType = 'integration';
else if (isVisualFromQuery) testType = 'visual';  // NEW
```

### Step 3: Add Framework Instructions
```typescript
// agent.service.ts - getSystemPrompt()
if (frameworks.visual) {
  frameworkInfo += `\n\n📸 VISUAL TEST FRAMEWORK: ${frameworks.visual.name}`;
  frameworkInfo += `\n   Use visual regression testing`;
}
```

## Common Patterns

### Pattern 1: Generate Test with Auto-Detection
```typescript
// Extension asks user for test type
const testType = await showTestTypeQuickPick();

// Service handles everything
const result = await testGenService.generateTest({
  sourceFilePath,
  sourceCode,
  testType,
  // framework and outputPath auto-detected
});
```

### Pattern 2: Generate Test with Explicit Config
```typescript
const result = await testGenService.generateTest({
  sourceFilePath: '/app/payment.ts',
  sourceCode: sourceCode,
  testType: TestType.INTEGRATION,
  framework: 'jest',
  outputPath: 'tests/integration'  // Explicit
});
```

### Pattern 3: Fallback to Mock on Error
```typescript
try {
  result = await testGenService.generateTest(request);
} catch (error) {
  // Fallback generates basic mock test
  result = {
    testCode: generateMockTest(fileName, framework, testType),
    testFilePath: getTestFilePath(sourceFilePath),
    ...
  };
}
```

## Debugging

### Enable Debug Logging
Backend already logs agent execution:
```bash
# Terminal output when generating test:
🤖 Agent starting: "Generate E2E test for page.tsx using Playwright"
📍 Agent iteration 1/10
🔧 Tool call: create_file { path: '...', content: '...' }
✅ Task completed: Created E2E test with Playwright
```

### Check If E2E Was Detected
Look for these in backend logs:
- Query contains "e2e" → E2E mode
- Query contains "playwright" → E2E mode
- Source dir contains "/e2e" → E2E mode

### Common Issues

#### Issue: Agent generates React Testing Library test for E2E
**Cause:** Query doesn't contain E2E keywords AND file not in `/e2e/` folder

**Fix:** Make sure query includes "E2E" or "Playwright":
```typescript
// ❌ BAD
const query = `Generate test for ${fileName}`;

// ✅ GOOD
const query = `Generate E2E test for ${fileName} using Playwright`;
```

#### Issue: Test generated but in wrong folder
**Cause:** `outputPath` not specified or incorrect

**Fix:** Provide explicit output path:
```typescript
const result = await testGenService.generateTest({
  sourceFilePath,
  sourceCode,
  testType: TestType.E2E,
  outputPath: 'tests/e2e'  // ← Explicit path
});
```

## Architecture Reference

```
┌─────────────────────────────────────────────┐
│           VS Code Extension                  │
├─────────────────────────────────────────────┤
│                                             │
│  Command Handler                            │
│    └─► TestGenerationService                │
│         ├─► BackendApiService               │
│         │    └─► POST /generate/agent       │
│         │                                    │
│         └─► CoverageTreeProvider            │
│              └─► Framework detection        │
└─────────────────────────────────────────────┘
                    │
                    │ HTTP
                    ▼
┌─────────────────────────────────────────────┐
│            Backend (NestJS)                  │
├─────────────────────────────────────────────┤
│                                             │
│  GenerationController                       │
│    └─► GenerationService                    │
│         └─► AgentService                    │
│              ├─► detectTestType()           │
│              ├─► buildUserPrompt()          │
│              └─► executeAgentLoop()         │
│                   └─► OpenAI API            │
└─────────────────────────────────────────────┘
```

## Testing

### Unit Test Example
```typescript
// test-generation.service.spec.ts
describe('TestGenerationService', () => {
  it('should detect E2E from query', async () => {
    const service = new TestGenerationService(mockBackend, mockProvider);
    
    const result = await service.generateTest({
      sourceFilePath: '/app/page.tsx',
      sourceCode: 'export default...',
      testType: TestType.E2E
    });
    
    expect(result.testCode).toContain('playwright');
    expect(result.testCode).toContain('page.goto');
  });
});
```

## Best Practices

### ✅ DO:
- Use `TestGenerationService` for all test generation
- Use `TestType` enum instead of strings
- Let the service handle framework detection
- Provide explicit `outputPath` when you know it
- Handle errors and provide fallback

### ❌ DON'T:
- Call `backendApi.generateTests()` directly (deprecated)
- Use string literals for test types
- Assume E2E will be detected without keywords
- Skip error handling

## Useful Commands

### Restart Backend (with changes)
```bash
cd apps/backend
npm run start:dev
```

### Reload Extension (VS Code)
- Press `Cmd+Shift+P` → "Developer: Reload Window"
- Or press `F5` in extension development host

### View Backend Logs
```bash
tail -f apps/backend/backend.log
```

## Resources

- **E2E Fix Documentation**: `FIX_E2E_TEST_GENERATION.md`
- **Refactoring Summary**: `REFACTORING_SUMMARY.md`
- **Architecture Docs**: External context notebooks

## Support

Questions? Check:
1. This guide first
2. Code comments in `test-generation.service.ts`
3. Backend logs for agent execution details

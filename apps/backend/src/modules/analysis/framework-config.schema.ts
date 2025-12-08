/**
 * Universal framework configuration schema
 * Supports any test framework across any language
 */

export interface FrameworkConfig {
  name: string;
  version: string;
  language: string;
  type: 'unit' | 'integration' | 'e2e' | 'component';
  
  // File patterns and locations
  patterns: {
    testFilePattern: string;        // e.g., "*.spec.ts", "*_test.go"
    testFileExtension: string;      // e.g., ".spec.ts", "_test.go"
    sourceFileExtensions: string[]; // e.g., [".ts", ".tsx"]
  };
  
  // Directory structure
  directories: {
    testsRoot: string;              // e.g., "tests/e2e", "test", "__tests__"
    relative: boolean;              // true = relative to source file, false = project root
  };
  
  // Execution
  execution: {
    runCommand: string;             // e.g., "npx playwright test", "go test"
    runSingleFile: string;          // e.g., "npx playwright test {file}", "pytest {file}"
    watchCommand?: string;          // e.g., "npx playwright test --ui"
    debugCommand?: string;          // e.g., "npx playwright test --debug"
  };
  
  // Installation
  installation: {
    packageManager: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'go' | 'maven' | 'gradle';
    packages: string[];             // e.g., ["@playwright/test"]
    devDependencies: boolean;
    postInstallCommand?: string;    // e.g., "npx playwright install"
  };
  
  // Configuration files
  configFile?: {
    path: string;                   // e.g., "playwright.config.ts"
    required: boolean;
    template?: string;              // Optional template content
  };
  
  // Test generation hints
  generation: {
    importStatement: string;        // e.g., "import { test, expect } from '@playwright/test'"
    testWrapperStart: string;       // e.g., "test.describe('...', () => {"
    testWrapperEnd: string;         // e.g., "})"
    testCaseStart: string;          // e.g., "test('...', async ({ page }) => {"
    testCaseEnd: string;            // e.g., "})"
    assertionLibrary: string;       // e.g., "expect", "assert"
  };
}

/**
 * Framework registry - known frameworks with full configuration
 */
export const FRAMEWORK_REGISTRY: Record<string, FrameworkConfig> = {
  // JavaScript/TypeScript
  'playwright': {
    name: 'Playwright',
    version: '*',
    language: 'typescript',
    type: 'e2e',
    patterns: {
      testFilePattern: '*.spec.{ts,tsx,js,jsx}',
      testFileExtension: '.spec.ts',
      sourceFileExtensions: ['.ts', '.tsx', '.js', '.jsx']
    },
    directories: {
      testsRoot: 'tests/e2e',
      relative: false
    },
    execution: {
      runCommand: 'npx playwright test',
      runSingleFile: 'npx playwright test {file}',
      watchCommand: 'npx playwright test --ui',
      debugCommand: 'npx playwright test --debug'
    },
    installation: {
      packageManager: 'npm',
      packages: ['@playwright/test'],
      devDependencies: true,
      postInstallCommand: 'npx playwright install'
    },
    configFile: {
      path: 'playwright.config.ts',
      required: true
    },
    generation: {
      importStatement: "import { test, expect } from '@playwright/test';",
      testWrapperStart: "test.describe('{description}', () => {",
      testWrapperEnd: '});',
      testCaseStart: "test('{testName}', async ({ page }) => {",
      testCaseEnd: '});',
      assertionLibrary: 'expect'
    }
  },
  
  'jest': {
    name: 'Jest',
    version: '*',
    language: 'typescript',
    type: 'unit',
    patterns: {
      testFilePattern: '*.{test,spec}.{ts,tsx,js,jsx}',
      testFileExtension: '.test.ts',
      sourceFileExtensions: ['.ts', '.tsx', '.js', '.jsx']
    },
    directories: {
      testsRoot: '__tests__',
      relative: true  // Tests next to source files
    },
    execution: {
      runCommand: 'npm test',
      runSingleFile: 'npx jest {file}',
      watchCommand: 'npx jest --watch',
      debugCommand: 'node --inspect-brk node_modules/.bin/jest'
    },
    installation: {
      packageManager: 'npm',
      packages: ['jest', '@types/jest', 'ts-jest'],
      devDependencies: true
    },
    configFile: {
      path: 'jest.config.js',
      required: true
    },
    generation: {
      importStatement: "import { describe, it, expect } from '@jest/globals';",
      testWrapperStart: "describe('{description}', () => {",
      testWrapperEnd: '});',
      testCaseStart: "it('{testName}', () => {",
      testCaseEnd: '});',
      assertionLibrary: 'expect'
    }
  },
  
  'vitest': {
    name: 'Vitest',
    version: '*',
    language: 'typescript',
    type: 'unit',
    patterns: {
      testFilePattern: '*.{test,spec}.{ts,tsx,js,jsx}',
      testFileExtension: '.test.ts',
      sourceFileExtensions: ['.ts', '.tsx', '.js', '.jsx']
    },
    directories: {
      testsRoot: 'tests',
      relative: false
    },
    execution: {
      runCommand: 'npx vitest',
      runSingleFile: 'npx vitest {file}',
      watchCommand: 'npx vitest --ui',
      debugCommand: 'npx vitest --inspect-brk'
    },
    installation: {
      packageManager: 'npm',
      packages: ['vitest', '@vitest/ui'],
      devDependencies: true
    },
    configFile: {
      path: 'vitest.config.ts',
      required: false
    },
    generation: {
      importStatement: "import { describe, it, expect } from 'vitest';",
      testWrapperStart: "describe('{description}', () => {",
      testWrapperEnd: '});',
      testCaseStart: "it('{testName}', () => {",
      testCaseEnd: '});',
      assertionLibrary: 'expect'
    }
  },
  
  // Python
  'pytest': {
    name: 'pytest',
    version: '*',
    language: 'python',
    type: 'unit',
    patterns: {
      testFilePattern: 'test_*.py',
      testFileExtension: '_test.py',
      sourceFileExtensions: ['.py']
    },
    directories: {
      testsRoot: 'tests',
      relative: false
    },
    execution: {
      runCommand: 'pytest',
      runSingleFile: 'pytest {file}',
      watchCommand: 'pytest-watch',
      debugCommand: 'pytest --pdb'
    },
    installation: {
      packageManager: 'pip',
      packages: ['pytest', 'pytest-cov'],
      devDependencies: true
    },
    generation: {
      importStatement: 'import pytest',
      testWrapperStart: 'class Test{description}:',
      testWrapperEnd: '',
      testCaseStart: '    def test_{testName}(self):',
      testCaseEnd: '',
      assertionLibrary: 'assert'
    }
  },
  
  // Go
  'go-testing': {
    name: 'Go testing',
    version: '*',
    language: 'go',
    type: 'unit',
    patterns: {
      testFilePattern: '*_test.go',
      testFileExtension: '_test.go',
      sourceFileExtensions: ['.go']
    },
    directories: {
      testsRoot: '',  // Tests in same dir as source
      relative: true
    },
    execution: {
      runCommand: 'go test ./...',
      runSingleFile: 'go test {file}',
      watchCommand: 'gotestsum --watch',
      debugCommand: 'dlv test'
    },
    installation: {
      packageManager: 'go',
      packages: ['testing'],  // Built-in
      devDependencies: false
    },
    generation: {
      importStatement: 'import "testing"',
      testWrapperStart: '',
      testWrapperEnd: '',
      testCaseStart: 'func Test{testName}(t *testing.T) {',
      testCaseEnd: '}',
      assertionLibrary: 't'
    }
  },
  
  // Java
  'junit5': {
    name: 'JUnit 5',
    version: '*',
    language: 'java',
    type: 'unit',
    patterns: {
      testFilePattern: '*Test.java',
      testFileExtension: 'Test.java',
      sourceFileExtensions: ['.java']
    },
    directories: {
      testsRoot: 'src/test/java',
      relative: false
    },
    execution: {
      runCommand: 'mvn test',
      runSingleFile: 'mvn test -Dtest={className}',
      debugCommand: 'mvn test -Dmaven.surefire.debug'
    },
    installation: {
      packageManager: 'maven',
      packages: ['org.junit.jupiter:junit-jupiter'],
      devDependencies: true
    },
    generation: {
      importStatement: 'import org.junit.jupiter.api.Test;\nimport static org.junit.jupiter.api.Assertions.*;',
      testWrapperStart: 'class {description}Test {',
      testWrapperEnd: '}',
      testCaseStart: '    @Test\n    void test{testName}() {',
      testCaseEnd: '    }',
      assertionLibrary: 'Assertions'
    }
  }
};

/**
 * Get framework config by name
 */
export function getFrameworkConfig(frameworkName: string): FrameworkConfig | null {
  const normalized = frameworkName.toLowerCase();
  return FRAMEWORK_REGISTRY[normalized] || null;
}

/**
 * Get test file path for a source file based on framework config
 */
export function getTestFilePath(
  sourceFilePath: string,
  framework: FrameworkConfig,
  workspaceRoot: string
): string {
  const path = require('path');
  const sourceDir = path.dirname(sourceFilePath);
  const sourceBaseName = path.basename(sourceFilePath, path.extname(sourceFilePath));
  
  if (framework.directories.relative) {
    // Test next to source file
    return path.join(sourceDir, `${sourceBaseName}${framework.patterns.testFileExtension}`);
  } else {
    // Test in dedicated directory
    return path.join(
      workspaceRoot,
      framework.directories.testsRoot,
      `${sourceBaseName}${framework.patterns.testFileExtension}`
    );
  }
}

/**
 * Get run command for a specific test file
 */
export function getRunCommand(framework: FrameworkConfig, testFilePath: string): string {
  return framework.execution.runSingleFile.replace('{file}', testFilePath);
}

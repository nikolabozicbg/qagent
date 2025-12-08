import * as path from 'path';
import { BaseLanguageProvider } from '../base/base-language-provider';
import { Framework, LanguageMetadata, ProjectType, FrameworkRecommendation, TestType, TestTypeRecommendation } from '../base/language-provider.interface';
import { getAllFrameworkRecommendations } from '../../analysis/framework-recommendations';

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export class JavaScriptProvider extends BaseLanguageProvider {
  getMetadata(): LanguageMetadata {
    return {
      language: 'javascript',
      displayName: 'JavaScript/TypeScript',
      fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
      icon: '📦',
      color: '#f7df1e'
    };
  }

  async detectFrameworks(workspacePath: string): Promise<Framework[]> {
    const frameworks: Framework[] = [];
    
    // Read package.json
    const packageJsonPath = path.join(workspacePath, 'package.json');
    const packageJson = await this.readJsonFile<PackageJson>(packageJsonPath);
    
    if (!packageJson) {
      return frameworks;
    }

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    // Jest
    if (allDeps.jest) {
      frameworks.push({
        name: 'jest',
        version: allDeps.jest,
        type: 'unit',
        configFiles: ['jest.config.js', 'jest.config.ts', 'jest.config.json'],
        testPattern: '**/*.{spec,test}.{js,ts,jsx,tsx}',
        runCommand: 'npm test',
        language: 'javascript'
      });
    }

    // Vitest
    if (allDeps.vitest) {
      frameworks.push({
        name: 'vitest',
        version: allDeps.vitest,
        type: 'unit',
        configFiles: ['vitest.config.ts', 'vitest.config.js'],
        testPattern: '**/*.{test,spec}.{js,ts,jsx,tsx}',
        runCommand: 'npm run test',
        language: 'javascript'
      });
    }

    // Mocha
    if (allDeps.mocha) {
      frameworks.push({
        name: 'mocha',
        version: allDeps.mocha,
        type: 'unit',
        configFiles: ['.mocharc.json', '.mocharc.js', 'mocha.opts'],
        testPattern: '**/*.test.{js,ts}',
        runCommand: 'npm test',
        language: 'javascript'
      });
    }

    // Playwright
    if (allDeps.playwright || allDeps['@playwright/test']) {
      frameworks.push({
        name: 'playwright',
        version: allDeps.playwright || allDeps['@playwright/test'],
        type: 'e2e',
        configFiles: ['playwright.config.ts', 'playwright.config.js'],
        testPattern: '**/*.spec.{js,ts}',
        runCommand: 'npx playwright test',
        language: 'javascript'
      });
    }

    // Cypress
    if (allDeps.cypress) {
      frameworks.push({
        name: 'cypress',
        version: allDeps.cypress,
        type: 'e2e',
        configFiles: ['cypress.config.ts', 'cypress.config.js', 'cypress.json'],
        testPattern: 'cypress/e2e/**/*.cy.{js,ts}',
        runCommand: 'npx cypress run',
        language: 'javascript'
      });
    }

    // Testing Library (component)
    if (allDeps['@testing-library/react'] || allDeps['@testing-library/vue']) {
      const library = allDeps['@testing-library/react'] ? 'react' : 'vue';
      frameworks.push({
        name: `@testing-library/${library}`,
        version: allDeps[`@testing-library/${library}`],
        type: 'component',
        configFiles: [],
        testPattern: '**/*.{test,spec}.{js,ts,jsx,tsx}',
        runCommand: 'npm test',
        language: 'javascript'
      });
    }

    // Supertest (API testing)
    if (allDeps.supertest) {
      frameworks.push({
        name: 'supertest',
        version: allDeps.supertest,
        type: 'integration',
        configFiles: [],
        testPattern: '**/*.{spec,test}.{js,ts}',
        runCommand: 'npm test',
        language: 'javascript'
      });
    }

    return frameworks;
  }

  async findSourceFiles(workspacePath: string): Promise<string[]> {
    const pattern = path.join(workspacePath, '**/*.{js,jsx,ts,tsx,mjs,cjs}');
    return this.findFiles(pattern, {
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        '**/*.spec.*',
        '**/*.test.*',
        '**/*.d.ts'
      ]
    });
  }

  async findTestFiles(workspacePath: string): Promise<string[]> {
    const pattern = path.join(workspacePath, '**/*.{spec,test}.{js,jsx,ts,tsx}');
    return this.findFiles(pattern, {
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**'
      ]
    });
  }

  getTestFileForSource(sourceFile: string): string | null {
    // Remove extension
    const withoutExt = this.removeExtension(sourceFile);
    const ext = this.getFileExtension(sourceFile);
    
    // users.service.ts → users.service.spec.ts
    return `${withoutExt}.spec${ext}`;
  }

  getSourceFileForTest(testFile: string): string | null {
    // users.service.spec.ts → users.service.ts
    return testFile.replace(/\.(spec|test)(\.[jt]sx?)$/, '$2');
  }

  getTestGenerationPrompt(sourceCode: string, framework: Framework): string {
    const frameworkName = framework.name;
    
    let prompt = `Generate comprehensive ${frameworkName} tests for this TypeScript/JavaScript code.\n\n`;
    
    // Framework-specific instructions
    if (frameworkName === 'jest') {
      prompt += `Use Jest's describe/it syntax with expect assertions.\n`;
      prompt += `Include:\n`;
      prompt += `- Test setup with beforeEach/afterEach if needed\n`;
      prompt += `- Mock external dependencies using jest.mock()\n`;
      prompt += `- Test both success and error cases\n`;
      prompt += `- Use meaningful test descriptions\n\n`;
    } else if (frameworkName === 'vitest') {
      prompt += `Use Vitest's describe/it syntax with expect assertions.\n`;
      prompt += `Include:\n`;
      prompt += `- Test setup with beforeEach/afterEach\n`;
      prompt += `- Mock external dependencies using vi.mock()\n`;
      prompt += `- Test edge cases and error handling\n\n`;
    } else if (frameworkName === 'playwright') {
      prompt += `Use Playwright's test/expect syntax for E2E testing.\n`;
      prompt += `Include:\n`;
      prompt += `- Page navigation and interactions\n`;
      prompt += `- Element assertions\n`;
      prompt += `- Test isolation with test.beforeEach\n\n`;
    }
    
    prompt += `Source code:\n\`\`\`typescript\n${sourceCode}\n\`\`\`\n\n`;
    prompt += `Generate a complete test file with proper imports and comprehensive test coverage.`;
    
    return prompt;
  }

  generateMockTemplate(className: string, framework: Framework): string {
    if (framework.name === 'jest') {
      return `const mock${className} = {
  // Add mock methods here
} as jest.Mocked<${className}>;`;
    } else if (framework.name === 'vitest') {
      return `const mock${className} = {
  // Add mock methods here
} as MockedObject<${className}>;`;
    }
    
    return `const mock${className} = {};`;
  }
  
  /**
   * Recommend testing frameworks based on project type
   */
  async recommendFrameworks(projectType: ProjectType, workspacePath: string): Promise<FrameworkRecommendation[]> {
    // Get recommendations from centralized matrix
    const allRecommendations = getAllFrameworkRecommendations('typescript', projectType);
    
    const recommendations: FrameworkRecommendation[] = [];
    
    // Convert Map to array, filtering out what's already installed
    const installedFrameworks = await this.detectFrameworks(workspacePath);
    const installedNames = new Set(installedFrameworks.map(f => f.name.toLowerCase()));
    
    for (const [testType, recs] of allRecommendations.entries()) {
      for (const rec of recs) {
        // Only recommend if not already installed
        if (!installedNames.has(rec.framework.name.toLowerCase())) {
          recommendations.push(rec);
        }
      }
    }
    
    // Sort by priority
    return recommendations.sort((a, b) => a.priority - b.priority);
  }
  
  /**
   * Recommend test type for a specific source file
   */
  recommendTestType(sourceFile: string, projectType: ProjectType): TestTypeRecommendation[] {
    const fileName = path.basename(sourceFile).toLowerCase();
    const ext = path.extname(sourceFile);
    const recommendations: TestTypeRecommendation[] = [];
    
    // React/Vue Components (.jsx/.tsx) → Component tests
    if (ext === '.jsx' || ext === '.tsx') {
      if (projectType === 'spa') {
        recommendations.push({
          testType: 'component',
          priority: 'primary',
          framework: 'React Testing Library',
          reason: 'UI Component - test rendering and user interactions',
          outputPath: this.getTestFileForSource(sourceFile) || '',
          runCommand: 'npm test'
        });
        
        // Also recommend unit tests for component logic
        recommendations.push({
          testType: 'unit',
          priority: 'secondary',
          framework: 'Vitest',
          reason: 'Component logic - fast isolated tests',
          outputPath: this.getTestFileForSource(sourceFile) || '',
          runCommand: 'npm run test:unit'
        });
      }
    }
    // Controllers/Routes (Node.js API) → Integration tests
    else if (fileName.includes('controller') || fileName.includes('route') || fileName.includes('endpoint')) {
      recommendations.push({
        testType: 'integration',
        priority: 'primary',
        framework: 'Supertest',
        reason: 'API endpoint - test with real HTTP requests',
        outputPath: this.getOutputPath(sourceFile, 'integration', 'Supertest', ''),
        runCommand: 'npm run test:integration'
      });
      
      recommendations.push({
        testType: 'unit',
        priority: 'secondary',
        framework: 'Jest',
        reason: 'Route logic - fast isolated tests',
        outputPath: this.getTestFileForSource(sourceFile) || '',
        runCommand: 'npm test'
      });
    }
    // Services/Business Logic → Unit tests
    else if (fileName.includes('service') || fileName.includes('util') || fileName.includes('helper')) {
      recommendations.push({
        testType: 'unit',
        priority: 'primary',
        framework: 'Jest',
        reason: 'Business logic - fast isolated tests',
        outputPath: this.getTestFileForSource(sourceFile) || '',
        runCommand: 'npm test'
      });
    }
    // Hooks (React) → Unit tests
    else if (fileName.startsWith('use') && (ext === '.ts' || ext === '.tsx')) {
      recommendations.push({
        testType: 'unit',
        priority: 'primary',
        framework: 'React Hooks Testing Library',
        reason: 'React Hook - test hook logic',
        outputPath: this.getTestFileForSource(sourceFile) || '',
        runCommand: 'npm test'
      });
    }
    // Pages (Next.js/Nuxt) → E2E tests
    else if (fileName.includes('page') && projectType === 'spa') {
      recommendations.push({
        testType: 'e2e',
        priority: 'primary',
        framework: 'Playwright',
        reason: 'Page component - test full user flow',
        outputPath: this.getOutputPath(sourceFile, 'e2e', 'Playwright', ''),
        runCommand: 'npm run test:e2e'
      });
    }
    // Default: Unit tests
    else {
      const framework = projectType === 'spa' ? 'Vitest' : 'Jest';
      recommendations.push({
        testType: 'unit',
        priority: 'primary',
        framework,
        reason: 'General code - unit tests with mocking',
        outputPath: this.getTestFileForSource(sourceFile) || '',
        runCommand: 'npm test'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Generate output path for test file based on test type
   */
  getOutputPath(sourceFile: string, testType: TestType, framework: string, workspacePath: string): string {
    const ext = path.extname(sourceFile);
    const withoutExt = this.removeExtension(sourceFile);
    
    if (testType === 'e2e') {
      // E2E tests in separate directory
      const baseName = path.basename(withoutExt);
      return path.join('e2e', `${baseName}.spec${ext}`);
    } else if (testType === 'integration') {
      // Integration tests in test/integration/
      const baseName = path.basename(withoutExt);
      return path.join('test', 'integration', `${baseName}.integration.test${ext}`);
    } else {
      // Unit/Component tests: colocated with source
      return `${withoutExt}.test${ext}`;
    }
  }
}

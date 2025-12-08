import { Framework, FrameworkRecommendation, ProjectType, TestType } from '../language-providers/base/language-provider.interface';

/**
 * Framework Recommendation Matrix
 * 
 * This defines the recommended testing frameworks for each:
 * - Language
 * - Project Type
 * - Test Type
 * 
 * Future-proof: Add new languages, project types, or test types here
 */

interface FrameworkMatrix {
  [language: string]: {
    [projectType: string]: {
      [testType: string]: FrameworkRecommendation[];
    };
  };
}

export const FRAMEWORK_RECOMMENDATIONS: FrameworkMatrix = {
  // ==================== C# ====================
  csharp: {
    'web-api': {
      unit: [
        {
          framework: {
            name: 'xUnit',
            type: 'unit',
            configFiles: [],
            testPattern: '**/*Tests.cs',
            runCommand: 'dotnet test --filter "Category=Unit"',
            language: 'csharp',
            outputPattern: 'tests/unit/*Tests.cs',
            setupRequired: ['xunit', 'xunit.runner.visualstudio', 'Moq']
          },
          priority: 1,
          marketShare: 60,
          pros: [
            'Most popular in .NET community',
            'Excellent async support',
            'Flexible test lifecycle',
            'Great IDE integration'
          ],
          cons: [
            'Steeper learning curve than MSTest'
          ],
          reason: 'Industry standard for .NET API testing with excellent community support'
        },
        {
          framework: {
            name: 'NUnit',
            type: 'unit',
            configFiles: [],
            testPattern: '**/*Tests.cs',
            runCommand: 'dotnet test --filter "Category=Unit"',
            language: 'csharp',
            outputPattern: 'tests/unit/*Tests.cs',
            setupRequired: ['NUnit', 'NUnit3TestAdapter', 'Moq']
          },
          priority: 2,
          marketShare: 30,
          pros: [
            'Mature and stable',
            'Rich assertion library',
            'Parameterized tests'
          ],
          cons: [
            'Less popular than xUnit'
          ],
          reason: 'Solid alternative with mature ecosystem'
        }
      ],
      integration: [
        {
          framework: {
            name: 'WebApplicationFactory',
            type: 'integration',
            configFiles: [],
            testPattern: '**/*IntegrationTests.cs',
            runCommand: 'dotnet test --filter "Category=Integration"',
            language: 'csharp',
            outputPattern: 'tests/integration/*IntegrationTests.cs',
            setupRequired: ['Microsoft.AspNetCore.Mvc.Testing', 'xunit']
          },
          priority: 1,
          marketShare: 80,
          pros: [
            'Official Microsoft approach',
            'In-memory testing',
            'Real HTTP pipeline',
            'Fast execution'
          ],
          cons: [
            'Requires ASP.NET Core'
          ],
          reason: 'Best practice for testing ASP.NET Core APIs with real HTTP requests'
        }
      ],
      e2e: [
        {
          framework: {
            name: 'Playwright',
            type: 'e2e',
            configFiles: [],
            testPattern: '**/*E2ETests.cs',
            runCommand: 'dotnet test --filter "Category=E2E"',
            language: 'csharp',
            outputPattern: 'tests/e2e/*E2ETests.cs',
            setupRequired: ['Microsoft.Playwright', 'Microsoft.Playwright.NUnit']
          },
          priority: 1,
          marketShare: 70,
          pros: [
            'Modern, fast, reliable',
            'Multi-browser support',
            'Great debugging tools',
            'Auto-wait capabilities'
          ],
          cons: [
            'Requires browser installation'
          ],
          reason: 'Industry-leading E2E testing framework for APIs and web apps'
        }
      ]
    },
    library: {
      unit: [
        {
          framework: {
            name: 'xUnit',
            type: 'unit',
            configFiles: [],
            testPattern: '**/*Tests.cs',
            runCommand: 'dotnet test',
            language: 'csharp',
            outputPattern: 'tests/*Tests.cs',
            setupRequired: ['xunit', 'xunit.runner.visualstudio']
          },
          priority: 1,
          marketShare: 70,
          pros: ['Standard for libraries', 'Fast', 'Isolated tests'],
          cons: [],
          reason: 'Best practice for testing .NET libraries'
        }
      ]
    }
  },

  // ==================== TypeScript / JavaScript ====================
  typescript: {
    spa: {
      unit: [
        {
          framework: {
            name: 'Vitest',
            type: 'unit',
            configFiles: ['vitest.config.ts'],
            testPattern: '**/*.test.ts',
            runCommand: 'npm run test:unit',
            language: 'typescript',
            outputPattern: 'src/**/*.test.ts',
            setupRequired: ['vitest', '@vitest/ui']
          },
          priority: 1,
          marketShare: 50,
          pros: [
            'Blazing fast',
            'Vite integration',
            'Jest-compatible API',
            'ESM native'
          ],
          cons: [
            'Newer, smaller ecosystem'
          ],
          reason: 'Modern, fast testing for Vite-based React apps'
        },
        {
          framework: {
            name: 'Jest',
            type: 'unit',
            configFiles: ['jest.config.js'],
            testPattern: '**/*.test.ts',
            runCommand: 'npm test',
            language: 'typescript',
            outputPattern: 'src/**/*.test.ts',
            setupRequired: ['jest', '@types/jest', 'ts-jest']
          },
          priority: 2,
          marketShare: 50,
          pros: [
            'Mature ecosystem',
            'Wide adoption',
            'Rich features'
          ],
          cons: [
            'Slower than Vitest',
            'ESM issues'
          ],
          reason: 'Industry standard with huge ecosystem'
        }
      ],
      component: [
        {
          framework: {
            name: 'React Testing Library',
            type: 'component',
            configFiles: [],
            testPattern: '**/*.test.tsx',
            runCommand: 'npm run test:component',
            language: 'typescript',
            outputPattern: 'src/**/*.test.tsx',
            setupRequired: ['@testing-library/react', '@testing-library/jest-dom', '@testing-library/user-event']
          },
          priority: 1,
          marketShare: 85,
          pros: [
            'Encourages best practices',
            'User-centric testing',
            'Official React recommendation'
          ],
          cons: [],
          reason: 'Industry standard for React component testing'
        }
      ],
      e2e: [
        {
          framework: {
            name: 'Playwright',
            type: 'e2e',
            configFiles: ['playwright.config.ts'],
            testPattern: 'e2e/**/*.spec.ts',
            runCommand: 'npm run test:e2e',
            language: 'typescript',
            outputPattern: 'e2e/**/*.spec.ts',
            setupRequired: ['@playwright/test']
          },
          priority: 1,
          marketShare: 60,
          pros: [
            'Fast, reliable',
            'Multi-browser',
            'Great DX',
            'Trace viewer'
          ],
          cons: [],
          reason: 'Modern E2E testing with excellent reliability'
        },
        {
          framework: {
            name: 'Cypress',
            type: 'e2e',
            configFiles: ['cypress.config.ts'],
            testPattern: 'cypress/e2e/**/*.cy.ts',
            runCommand: 'npm run test:e2e',
            language: 'typescript',
            outputPattern: 'cypress/e2e/**/*.cy.ts',
            setupRequired: ['cypress']
          },
          priority: 2,
          marketShare: 40,
          pros: [
            'Great visual testing',
            'Time-travel debugging',
            'Easy to learn'
          ],
          cons: [
            'Slower than Playwright',
            'Single tab limitation'
          ],
          reason: 'Popular alternative with strong community'
        }
      ]
    },
    'web-api': {
      unit: [
        {
          framework: {
            name: 'Jest',
            type: 'unit',
            configFiles: ['jest.config.js'],
            testPattern: '**/*.test.ts',
            runCommand: 'npm test',
            language: 'typescript',
            outputPattern: 'src/**/*.test.ts',
            setupRequired: ['jest', '@types/jest', 'ts-jest']
          },
          priority: 1,
          marketShare: 70,
          pros: ['Mature', 'Great mocking', 'Wide adoption'],
          cons: [],
          reason: 'Standard for Node.js API testing'
        }
      ],
      integration: [
        {
          framework: {
            name: 'Supertest',
            type: 'integration',
            configFiles: [],
            testPattern: '**/*.integration.test.ts',
            runCommand: 'npm run test:integration',
            language: 'typescript',
            outputPattern: 'test/integration/**/*.test.ts',
            setupRequired: ['supertest', '@types/supertest', 'jest']
          },
          priority: 1,
          marketShare: 80,
          pros: [
            'Fluent API',
            'HTTP assertions',
            'Works with Jest'
          ],
          cons: [],
          reason: 'Industry standard for Express/Nest.js API integration testing'
        }
      ]
    }
  },

  // ==================== Python ====================
  python: {
    'web-api': {
      unit: [
        {
          framework: {
            name: 'pytest',
            type: 'unit',
            configFiles: ['pytest.ini', 'pyproject.toml'],
            testPattern: 'tests/**/test_*.py',
            runCommand: 'pytest tests/unit',
            language: 'python',
            outputPattern: 'tests/unit/test_*.py',
            setupRequired: ['pytest', 'pytest-cov']
          },
          priority: 1,
          marketShare: 85,
          pros: [
            'Most popular',
            'Rich plugin ecosystem',
            'Fixtures system',
            'Parametrization'
          ],
          cons: [],
          reason: 'Industry standard for Python testing'
        }
      ],
      integration: [
        {
          framework: {
            name: 'pytest + httpx',
            type: 'integration',
            configFiles: ['pytest.ini'],
            testPattern: 'tests/**/test_*_integration.py',
            runCommand: 'pytest tests/integration',
            language: 'python',
            outputPattern: 'tests/integration/test_*_integration.py',
            setupRequired: ['pytest', 'httpx', 'pytest-asyncio']
          },
          priority: 1,
          marketShare: 70,
          pros: [
            'Async support',
            'FastAPI integration',
            'Real HTTP calls'
          ],
          cons: [],
          reason: 'Best practice for FastAPI/Django API integration testing'
        }
      ]
    }
  }
};

/**
 * Get recommended frameworks for a specific language, project type, and test type
 */
export function getFrameworkRecommendations(
  language: string,
  projectType: ProjectType,
  testType: TestType
): FrameworkRecommendation[] {
  const langMatrix = FRAMEWORK_RECOMMENDATIONS[language];
  if (!langMatrix) {
    return [];
  }

  const projectMatrix = langMatrix[projectType];
  if (!projectMatrix) {
    return [];
  }

  const recommendations = projectMatrix[testType];
  return recommendations || [];
}

/**
 * Get all recommended frameworks for a project (all test types)
 */
export function getAllFrameworkRecommendations(
  language: string,
  projectType: ProjectType
): Map<TestType, FrameworkRecommendation[]> {
  const result = new Map<TestType, FrameworkRecommendation[]>();
  
  const testTypes: TestType[] = ['unit', 'integration', 'e2e', 'component'];
  
  for (const testType of testTypes) {
    const recommendations = getFrameworkRecommendations(language, projectType, testType);
    if (recommendations.length > 0) {
      result.set(testType, recommendations);
    }
  }
  
  return result;
}

/**
 * Get top priority framework for a test type
 */
export function getTopFrameworkRecommendation(
  language: string,
  projectType: ProjectType,
  testType: TestType
): FrameworkRecommendation | null {
  const recommendations = getFrameworkRecommendations(language, projectType, testType);
  return recommendations.find(r => r.priority === 1) || recommendations[0] || null;
}

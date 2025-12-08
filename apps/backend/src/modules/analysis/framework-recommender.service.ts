import { Injectable } from '@nestjs/common';

export interface FrameworkRecommendation {
  primary: {
    name: string;
    packages: string[];
    description?: string;
  };
  integration?: {
    name: string;
    packages: string[];
    description?: string;
  };
  e2e?: {
    name: string;
    packages: string[];
    description?: string;
  };
  alternatives?: Array<{
    name: string;
    packages: string[];
    description?: string;
  }>;
  mocking?: {
    name: string;
    packages: string[];
    description?: string;
  };
}

@Injectable()
export class FrameworkRecommenderService {
  /**
   * Get framework recommendation based on language and project type
   */
  getRecommendation(language: string, projectType: string): FrameworkRecommendation | null {
    const matrix: Record<string, Record<string, FrameworkRecommendation>> = {
      csharp: {
        'web-api': {
          primary: {
            name: 'xUnit',
            packages: ['xunit', 'xunit.runner.visualstudio', 'Moq'],
            description: 'Modern, widely used in .NET'
          },
          integration: {
            name: 'WebApplicationFactory',
            packages: ['Microsoft.AspNetCore.Mvc.Testing'],
            description: 'For testing API endpoints with real HTTP requests'
          },
          alternatives: [
            {
              name: 'NUnit',
              packages: ['NUnit', 'NUnit3TestAdapter', 'Moq'],
              description: 'Rich assertion library, classic .NET testing'
            },
            {
              name: 'MSTest',
              packages: ['MSTest.TestFramework', 'MSTest.TestAdapter'],
              description: 'Official Microsoft testing framework'
            }
          ],
          mocking: {
            name: 'Moq',
            packages: ['Moq'],
            description: 'Most popular .NET mocking library'
          }
        },
        'library': {
          primary: {
            name: 'xUnit',
            packages: ['xunit', 'xunit.runner.visualstudio', 'Moq'],
            description: 'Modern, widely used in .NET'
          },
          alternatives: [
            {
              name: 'NUnit',
              packages: ['NUnit', 'NUnit3TestAdapter', 'Moq'],
              description: 'Rich assertion library'
            }
          ],
          mocking: {
            name: 'Moq',
            packages: ['Moq'],
            description: 'For dependency mocking'
          }
        }
      },
      javascript: {
        'react-app': {
          primary: {
            name: 'Vitest',
            packages: ['vitest', '@testing-library/react', '@testing-library/jest-dom', '@testing-library/user-event'],
            description: 'Fast, modern testing for React'
          },
          e2e: {
            name: 'Playwright',
            packages: ['@playwright/test'],
            description: 'Modern E2E testing framework'
          },
          alternatives: [
            {
              name: 'Jest',
              packages: ['jest', '@testing-library/react', '@testing-library/jest-dom'],
              description: 'Traditional React testing'
            }
          ]
        },
        'vue-app': {
          primary: {
            name: 'Vitest',
            packages: ['vitest', '@testing-library/vue', '@testing-library/user-event'],
            description: 'Fast, modern testing for Vue'
          },
          e2e: {
            name: 'Playwright',
            packages: ['@playwright/test'],
            description: 'Modern E2E testing'
          }
        },
        'node-api': {
          primary: {
            name: 'Jest',
            packages: ['jest', 'supertest', '@types/jest', '@types/supertest'],
            description: 'Popular for Node.js API testing'
          },
          alternatives: [
            {
              name: 'Vitest',
              packages: ['vitest', 'supertest'],
              description: 'Faster alternative to Jest'
            }
          ]
        },
        'library': {
          primary: {
            name: 'Vitest',
            packages: ['vitest'],
            description: 'Fast unit testing'
          },
          alternatives: [
            {
              name: 'Jest',
              packages: ['jest', '@types/jest'],
              description: 'Traditional choice'
            }
          ]
        }
      },
      python: {
        'fastapi': {
          primary: {
            name: 'pytest',
            packages: ['pytest', 'pytest-asyncio', 'httpx'],
            description: 'Best for async FastAPI testing'
          },
          mocking: {
            name: 'pytest-mock',
            packages: ['pytest-mock'],
            description: 'For mocking dependencies'
          }
        },
        'django': {
          primary: {
            name: 'pytest',
            packages: ['pytest', 'pytest-django'],
            description: 'Modern Django testing'
          },
          alternatives: [
            {
              name: 'unittest',
              packages: [],
              description: 'Built-in, traditional Django testing'
            }
          ]
        },
        'flask': {
          primary: {
            name: 'pytest',
            packages: ['pytest', 'pytest-flask'],
            description: 'Best for Flask testing'
          }
        },
        'library': {
          primary: {
            name: 'pytest',
            packages: ['pytest', 'pytest-cov'],
            description: 'Modern Python testing'
          },
          alternatives: [
            {
              name: 'unittest',
              packages: [],
              description: 'Built-in Python testing'
            }
          ],
          mocking: {
            name: 'pytest-mock',
            packages: ['pytest-mock'],
            description: 'For mocking'
          }
        }
      },
      java: {
        'spring-boot': {
          primary: {
            name: 'JUnit 5',
            packages: ['junit-jupiter', 'spring-boot-starter-test'],
            description: 'Modern Java testing with Spring'
          },
          mocking: {
            name: 'Mockito',
            packages: ['mockito-core'],
            description: 'Most popular Java mocking'
          }
        },
        'library': {
          primary: {
            name: 'JUnit 5',
            packages: ['junit-jupiter'],
            description: 'Modern Java testing'
          },
          alternatives: [
            {
              name: 'TestNG',
              packages: ['testng'],
              description: 'Alternative to JUnit'
            }
          ]
        }
      },
      go: {
        'gin-api': {
          primary: {
            name: 'testing',
            packages: [],
            description: 'Built-in Go testing package'
          },
          integration: {
            name: 'httptest',
            packages: [],
            description: 'Built-in HTTP testing'
          }
        },
        'library': {
          primary: {
            name: 'testing',
            packages: [],
            description: 'Built-in Go testing'
          },
          alternatives: [
            {
              name: 'testify',
              packages: ['github.com/stretchr/testify'],
              description: 'Popular assertion library'
            }
          ]
        }
      },
      rust: {
        'actix-web': {
          primary: {
            name: 'cargo test',
            packages: [],
            description: 'Built-in Rust testing'
          },
          integration: {
            name: 'actix-web test',
            packages: [],
            description: 'Built-in Actix testing utils'
          }
        },
        'library': {
          primary: {
            name: 'cargo test',
            packages: [],
            description: 'Built-in Rust testing'
          }
        }
      }
    };

    const languageMatrix = matrix[language.toLowerCase()];
    if (!languageMatrix) {
      return null;
    }

    // Try exact project type match
    if (languageMatrix[projectType]) {
      return languageMatrix[projectType];
    }

    // Fallback to library
    return languageMatrix['library'] || null;
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): string[] {
    return ['csharp', 'javascript', 'python', 'java', 'go', 'rust'];
  }

  /**
   * Get all project types for a language
   */
  getProjectTypesForLanguage(language: string): string[] {
    const projectTypes: Record<string, string[]> = {
      csharp: ['web-api', 'library'],
      javascript: ['react-app', 'vue-app', 'node-api', 'library'],
      python: ['fastapi', 'django', 'flask', 'library'],
      java: ['spring-boot', 'library'],
      go: ['gin-api', 'library'],
      rust: ['actix-web', 'library']
    };

    return projectTypes[language.toLowerCase()] || ['library'];
  }
}

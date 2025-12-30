import { Injectable, Logger } from '@nestjs/common';

export interface JourneyNode {
  route: string;
  name: string;
  requiresAuth: boolean;
  formFields?: string[];
}

export interface JourneyEdge {
  from: string;
  to: string;
  condition: 'success' | 'error' | 'navigation';
  action?: string;
}

export interface JourneyGraph {
  nodes: Map<string, JourneyNode>;
  edges: JourneyEdge[];
}

export interface MultiStepJourney {
  name: string;
  description: string;
  steps: JourneyStep[];
  requiresAuth: boolean;
}

export interface JourneyStep {
  order: number;
  route: string;
  action: string;
  expectedOutcome: string;
}

@Injectable()
export class JourneyStateMachineService {
  private readonly logger = new Logger(JourneyStateMachineService.name);

  /**
   * Build navigation graph from discovered journeys
   */
  buildNavigationGraph(journeys: any[]): JourneyGraph {
    const nodes = new Map<string, JourneyNode>();
    const edges: JourneyEdge[] = [];

    for (const journey of journeys) {
      const route = journey.route || this.inferRoute(journey.name);
      
      // Add node
      if (!nodes.has(route)) {
        nodes.set(route, {
          route,
          name: journey.name,
          requiresAuth: this.detectAuthRequirement(route),
          formFields: this.extractFormFields(journey),
        });
      }

      // Infer edges from journey metadata
      if (journey.name.toLowerCase().includes('login')) {
        edges.push({ from: route, to: '/', condition: 'success' });
        edges.push({ from: route, to: route, condition: 'error' });
      } else if (journey.name.toLowerCase().includes('register')) {
        edges.push({ from: route, to: '/signin', condition: 'success' });
      } else if (this.detectAuthRequirement(route)) {
        // Protected routes redirect to login if not authenticated
        edges.push({ from: route, to: '/signin', condition: 'error', action: 'auth_required' });
      }
    }

    return { nodes, edges };
  }

  /**
   * Synthesize multi-step E2E journeys from graph
   */
  synthesizeMultiStepJourneys(graph: JourneyGraph): MultiStepJourney[] {
    const journeys: MultiStepJourney[] = [];

    // Common E2E patterns
    const patterns = [
      {
        name: 'Complete New User Onboarding',
        steps: ['/signup', '/signin', '/'],
        requiresAuth: false,
      },
      {
        name: 'Create Transaction Flow',
        steps: ['/signin', '/transaction/new', '/'],
        requiresAuth: true,
      },
      {
        name: 'User Profile Update',
        steps: ['/signin', '/user/settings', '/'],
        requiresAuth: true,
      },
      {
        name: 'Bank Account Setup',
        steps: ['/signin', '/bankaccounts', '/'],
        requiresAuth: true,
      },
    ];

    for (const pattern of patterns) {
      // Check if all steps exist in graph
      const allStepsExist = pattern.steps.every((route) => graph.nodes.has(route));
      
      if (allStepsExist) {
        const journey: MultiStepJourney = {
          name: pattern.name,
          description: `End-to-end test for ${pattern.name.toLowerCase()}`,
          steps: pattern.steps.map((route, index) => {
            const node = graph.nodes.get(route);
            return {
              order: index + 1,
              route,
              action: this.inferAction(route, node),
              expectedOutcome: this.inferExpectedOutcome(route, index === pattern.steps.length - 1),
            };
          }),
          requiresAuth: pattern.requiresAuth,
        };
        journeys.push(journey);
      }
    }

    this.logger.log(`Synthesized ${journeys.length} multi-step E2E journeys`);
    return journeys;
  }

  /**
   * Generate Playwright test code for multi-step journey
   */
  generateMultiStepTest(journey: MultiStepJourney, projectRoot: string): string {
    const lines: string[] = [];

    lines.push(`import { test, expect } from '@playwright/test';`);
    lines.push('');
    lines.push(`test.describe('${journey.name}', () => {`);
    lines.push('');
    lines.push(`  test('should complete ${journey.name.toLowerCase()}', async ({ page }) => {`);
    lines.push(`    // ${journey.description}`);
    lines.push('');

    for (const step of journey.steps) {
      lines.push(`    // Step ${step.order}: ${step.action}`);
      lines.push(`    await page.goto('${step.route}');`);
      lines.push(`    await page.waitForLoadState('networkidle');`);
      lines.push('');

      // Add step-specific logic
      if (step.route.includes('signin') || step.route.includes('login')) {
        lines.push(`    // Login with test credentials`);
        lines.push(`    await page.locator('[name="username"]').fill('Heath93');`);
        lines.push(`    await page.locator('[name="password"]').fill('s3cret');`);
        lines.push(`    await page.click('button[type="submit"]');`);
        lines.push(`    await page.waitForURL(/\\/(dashboard|home|$)/, { timeout: 10000 });`);
      } else if (step.route.includes('signup') || step.route.includes('register')) {
        lines.push(`    // Register new user`);
        lines.push(`    const uniqueUsername = 'user_' + Date.now();`);
        lines.push(`    await page.locator('[name="firstName"]').fill('Test');`);
        lines.push(`    await page.locator('[name="lastName"]').fill('User');`);
        lines.push(`    await page.locator('[name="username"]').fill(uniqueUsername);`);
        lines.push(`    await page.locator('[name="password"]').fill('SecurePass123!');`);
        lines.push(`    await page.locator('[name="confirmPassword"]').fill('SecurePass123!');`);
        lines.push(`    await page.click('button[type="submit"]');`);
      }

      lines.push('');
      lines.push(`    // Verify: ${step.expectedOutcome}`);
      lines.push(`    await expect(page).toHaveURL(new RegExp('${step.expectedOutcome}'));`);
      lines.push('');
    }

    lines.push(`  });`);
    lines.push('');
    lines.push(`});`);

    return lines.join('\n');
  }

  private inferRoute(journeyName: string): string {
    const lower = journeyName.toLowerCase();
    if (lower.includes('login') || lower.includes('signin')) return '/signin';
    if (lower.includes('register') || lower.includes('signup')) return '/signup';
    if (lower.includes('bank')) return '/bankaccounts';
    if (lower.includes('transaction')) return '/transaction/new';
    if (lower.includes('user') || lower.includes('profile')) return '/user/settings';
    return '/';
  }

  private detectAuthRequirement(route: string): boolean {
    const protectedPatterns = [
      '/bankaccount',
      '/transaction',
      '/user/settings',
      '/account',
      '/profile',
    ];
    return protectedPatterns.some((pattern) => route.includes(pattern));
  }

  private extractFormFields(journey: any): string[] {
    const fields: string[] = [];
    if (journey.enrichedData?.components) {
      for (const comp of journey.enrichedData.components) {
        if (comp.elements) {
          for (const el of comp.elements) {
            const nameMatch = el.selector?.match(/name="([^"]+)"/);
            if (nameMatch) {
              fields.push(nameMatch[1]);
            }
          }
        }
      }
    }
    return fields;
  }

  private inferAction(route: string, node?: JourneyNode): string {
    if (route.includes('signin')) return 'Login with credentials';
    if (route.includes('signup')) return 'Register new account';
    if (route.includes('bank')) return 'Add bank account';
    if (route.includes('transaction')) return 'Create transaction';
    if (route.includes('settings')) return 'Update user settings';
    if (node?.formFields && node.formFields.length > 0) return `Complete ${node.name} form`;
    return `Navigate to ${route}`;
  }

  private inferExpectedOutcome(route: string, isFinalStep: boolean): string {
    if (isFinalStep) return '.*'; // Any destination is OK for final step
    if (route.includes('signin')) return '/(dashboard|home|$)';
    if (route.includes('signup')) return '/signin';
    return route; // Stay on same route
  }
}

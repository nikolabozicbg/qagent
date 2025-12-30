import { Injectable } from '@nestjs/common';
import { ApplicationModel, Interaction, ComponentAnalysis } from './holistic-analysis.service';

/**
 * Journey Synthesis Service
 * 
 * Converts holistic application model into realistic E2E test journeys
 * 
 * Philosophy: Journey = sequence of USER ACTIONS, not just page navigations
 * 
 * Example Journey:
 * 1. User sees Homepage
 * 2. Clicks "Login" in Header → navigates to /login
 * 3. Sees Login form
 * 4. Fills email/password inputs
 * 5. Clicks "Submit" button
 * 6. API call: POST /auth/login
 * 7. On success → redirect to /dashboard
 * 8. Sees username in Header
 */
@Injectable()
export class JourneySynthesisService {
  
  /**
   * Synthesize journeys from application model
   */
  synthesizeJourneys(model: ApplicationModel): E2EJourney[] {
    console.log('🎯 Journey Synthesis: Creating E2E test scenarios...');
    
    const journeys: E2EJourney[] = [];
    
    // Strategy 1: Navigation-based journeys
    const navJourneys = this.createNavigationJourneys(model);
    journeys.push(...navJourneys);
    
    // Strategy 2: Form-based journeys (auth, CRUD)
    const formJourneys = this.createFormJourneys(model);
    journeys.push(...formJourneys);
    
    // Strategy 3: Component interaction chains
    const interactionJourneys = this.createInteractionChains(model);
    journeys.push(...interactionJourneys);
    
    // Sort by priority and deduplicate
    const uniqueJourneys = this.deduplicateJourneys(journeys);
    uniqueJourneys.sort((a, b) => b.priority - a.priority);
    
    console.log(`✅ Synthesized ${uniqueJourneys.length} E2E journeys`);
    
    return uniqueJourneys;
  }
  
  /**
   * Strategy 1: Create journeys from navigation chains
   * Fixed: Creates LINEAR journeys (one per source→target), not grouped
   */
  private createNavigationJourneys(model: ApplicationModel): E2EJourney[] {
    const journeys: E2EJourney[] = [];
    
    // Create separate journey for EACH navigation
    for (const interaction of model.interactions) {
      if (interaction.type !== 'navigation') continue;
      
      const sourceName = this.getComponentName(interaction.source);
      const sourceRoute = this.inferRouteFromComponent(interaction.source, model);
      const targetRoute = interaction.target;
      
      // Skip if source and target are same (self-navigation)
      if (sourceRoute === targetRoute) continue;
      
      const journey: E2EJourney = {
        name: `${sourceName}: Navigate to ${targetRoute}`,
        description: `User navigates from ${sourceRoute} to ${targetRoute}`,
        steps: [
          {
            action: 'navigate',
            component: 'User',
            target: sourceRoute,
            description: `Start at ${sourceRoute}`,
            assertions: [`User should be on ${sourceRoute}`]
          },
          {
            action: 'click',
            component: interaction.source,
            target: targetRoute,
            description: `Click link to ${targetRoute} in ${sourceName}`,
            assertions: [
              `Link should be visible`,
              `Link should be clickable`
            ]
          },
          {
            action: 'verify',
            component: targetRoute,
            target: 'page loaded',
            description: `Verify navigation to ${targetRoute}`,
            assertions: [
              `URL should be ${targetRoute}`,
              `Page should load successfully`
            ]
          }
        ],
        priority: this.calculateNavigationPriority(sourceRoute, targetRoute),
        tags: ['navigation', this.getRouteTag(targetRoute)],
        estimatedDuration: 10
      };
      
      journeys.push(journey);
    }
    
    return journeys;
  }
  
  /**
   * Strategy 2: Create journeys from form interactions
   */
  private createFormJourneys(model: ApplicationModel): E2EJourney[] {
    const journeys: E2EJourney[] = [];
    
    const formComponents = model.components.filter(c => c.type === 'form');
    
    for (const formComp of formComponents) {
      const formName = this.getComponentName(formComp.filePath);
      const route = this.inferRoute(formComp, model);
      
      const journey: E2EJourney = {
        name: `Complete ${formName}`,
        description: `User fills and submits ${formName}`,
        steps: [
          {
            action: 'navigate',
            component: 'User',
            target: route,
            description: `Navigate to ${route}`,
            assertions: [`Form should be visible`]
          },
          {
            action: 'fill',
            component: formComp.filePath,
            target: 'form inputs',
            description: `Fill form fields`,
            assertions: ['All required fields should accept input']
          },
          {
            action: 'submit',
            component: formComp.filePath,
            target: 'submit button',
            description: 'Submit the form',
            assertions: [
              'Form should validate',
              'Loading state should show',
              'Success/error feedback should appear'
            ]
          }
        ],
        priority: this.calculateFormPriority(formName),
        tags: ['form', this.getRouteTag(route)],
        estimatedDuration: 30
      };
      
      // Add navigation after submit if we can infer it
      const navAfterSubmit = formComp.interactions.find(i => 
        i.type === 'navigation' && i.trigger === 'programmatic'
      );
      
      if (navAfterSubmit) {
        journey.steps.push({
          action: 'navigate',
          component: formComp.filePath,
          target: navAfterSubmit.target,
          description: `Redirect to ${navAfterSubmit.target} on success`,
          assertions: [`URL should be ${navAfterSubmit.target}`]
        });
      }
      
      journeys.push(journey);
    }
    
    return journeys;
  }
  
  /**
   * Strategy 3: Create interaction chains (component A → B → C)
   */
  private createInteractionChains(model: ApplicationModel): E2EJourney[] {
    const journeys: E2EJourney[] = [];
    
    // Find common user flows: Header → Login → Dashboard
    const layoutComponents = model.components.filter(c => c.type === 'layout');
    
    for (const layout of layoutComponents) {
      const layoutName = this.getComponentName(layout.filePath);
      
      // Header typically has Login/Register links
      const authNavs = layout.interactions.filter(i => 
        i.type === 'navigation' && 
        (i.target.includes('login') || i.target.includes('register'))
      );
      
      if (authNavs.length > 0) {
        const journey: E2EJourney = {
          name: `User Authentication Flow`,
          description: `Complete authentication process from ${layoutName}`,
          steps: [
            {
              action: 'click',
              component: layout.filePath,
              target: authNavs[0].target,
              description: `Click Login/Register in ${layoutName}`,
              assertions: [`Should navigate to ${authNavs[0].target}`]
            },
            {
              action: 'fill',
              component: 'auth form',
              target: 'credentials',
              description: 'Enter email and password',
              assertions: ['Form fields should be visible and editable']
            },
            {
              action: 'submit',
              component: 'auth form',
              target: 'submit button',
              description: 'Submit authentication form',
              assertions: [
                'Loading indicator should appear',
                'API call should be made'
              ]
            },
            {
              action: 'verify',
              component: layout.filePath,
              target: 'authenticated state',
              description: 'Verify user is logged in',
              assertions: [
                'User menu should show',
                'Login button should disappear',
                'Username should be visible'
              ]
            }
          ],
          priority: 95, // Auth is critical
          tags: ['authentication', 'critical'],
          estimatedDuration: 45
        };
        
        journeys.push(journey);
      }
    }
    
    return journeys;
  }
  
  /**
   * Infer route from component file path
   */
  private inferRouteFromComponent(componentPath: string, model: ApplicationModel): string {
    // Find component in model
    const component = model.components.find(c => c.filePath === componentPath);
    if (component && component.routes.length > 0) {
      return component.routes[0];
    }
    
    // Infer from file name
    const name = this.getComponentName(componentPath).toLowerCase();
    if (name.includes('login')) return '/login';
    if (name.includes('register')) return '/register';
    if (name.includes('home')) return '/';
    if (name.includes('editor')) return '/editor';
    if (name.includes('profile')) return '/profile';
    if (name.includes('settings')) return '/settings';
    
    return '/';
  }
  
  /**
   * Calculate navigation priority based on source and target
   */
  private calculateNavigationPriority(sourceRoute: string, targetRoute: string): number {
    let priority = 50;
    
    // Auth navigation = high priority
    if (targetRoute.includes('login') || targetRoute.includes('register')) {
      priority += 35;
    }
    
    // Navigation from auth to dashboard = very high
    if ((sourceRoute.includes('login') || sourceRoute.includes('register')) &&
        (targetRoute === '/' || targetRoute.includes('dashboard'))) {
      priority += 40;
    }
    
    return Math.min(100, priority);
  }
  
  /**
   * Calculate priority based on route importance
   */
  private calculatePriority(route: string, sources: string[]): number {
    let priority = 50; // Base
    
    // Auth routes = high priority
    if (route.includes('login') || route.includes('register')) {
      priority += 40;
    }
    
    // Dashboard/home = high priority
    if (route === '/' || route.includes('dashboard') || route.includes('home')) {
      priority += 30;
    }
    
    // More sources = more important
    priority += sources.length * 5;
    
    return Math.min(100, priority);
  }
  
  /**
   * Calculate form priority
   */
  private calculateFormPriority(formName: string): number {
    const lower = formName.toLowerCase();
    
    if (lower.includes('login') || lower.includes('auth')) return 95;
    if (lower.includes('register') || lower.includes('signup')) return 90;
    if (lower.includes('checkout') || lower.includes('payment')) return 85;
    if (lower.includes('profile') || lower.includes('settings')) return 70;
    
    return 60;
  }
  
  /**
   * Get tag from route
   */
  private getRouteTag(route: string): string {
    if (route.includes('login') || route.includes('register')) return 'auth';
    if (route.includes('dashboard')) return 'dashboard';
    if (route.includes('profile')) return 'profile';
    if (route.includes('settings')) return 'settings';
    if (route.includes('editor')) return 'editor';
    return 'general';
  }
  
  /**
   * Get component name from file path
   */
  private getComponentName(filePath: string): string {
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1];
    return fileName.replace(/\.(tsx?|jsx?)$/, '');
  }
  
  /**
   * Infer route from component - returns route WHERE THE COMPONENT IS RENDERED
   */
  private inferRoute(component: ComponentAnalysis, model: ApplicationModel): string {
    // If component has routes, use first one
    if (component.routes.length > 0) {
      return component.routes[0];
    }
    
    // Infer from component FILE NAME (not navigation targets)
    // Login.js is rendered AT /login, Register.js is rendered AT /register
    const name = this.getComponentName(component.filePath).toLowerCase();
    if (name.includes('login')) return '/login';
    if (name.includes('register')) return '/register';
    if (name.includes('profile')) return '/profile';
    if (name.includes('settings')) return '/settings';
    if (name.includes('editor')) return '/editor';
    
    return '/';
  }
  
  /**
   * Deduplicate similar journeys
   */
  private deduplicateJourneys(journeys: E2EJourney[]): E2EJourney[] {
    const seen = new Set<string>();
    const unique: E2EJourney[] = [];
    
    for (const journey of journeys) {
      const key = journey.name.toLowerCase().replace(/\s+/g, '-');
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(journey);
      }
    }
    
    return unique;
  }
}

/**
 * E2E Journey - complete test scenario
 */
export interface E2EJourney {
  name: string;
  description: string;
  steps: JourneyStep[];
  priority: number;
  tags: string[];
  estimatedDuration: number; // seconds
}

export interface JourneyStep {
  action: 'navigate' | 'click' | 'fill' | 'submit' | 'verify' | 'wait';
  component: string;
  target: string;
  description: string;
  assertions: string[];
}

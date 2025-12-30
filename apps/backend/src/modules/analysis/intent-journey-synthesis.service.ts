import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Intent-based Journey Synthesis Service
 * 
 * COMPLETE APPLICATION UNDERSTANDING:
 * - Analyzes routing structure, auth boundaries, forms, APIs, state, components
 * - Synthesizes REALISTIC E2E user journeys based on app intent
 * - Uses AI + heuristics to detect common patterns
 * - Works with ANY React project structure
 */

export interface AppUnderstanding {
  routes: RouteInfo[];
  authBoundaries: AuthBoundary[];
  forms: FormInfo[];
  crudEntities: CrudEntity[];
  modals: ModalInfo[];
  navigationPatterns: NavigationPattern[];
  stateManagement: StateInfo;
  apiEndpoints: APIEndpoint[];
}

export interface RouteInfo {
  path: string;
  component: string;
  filePath: string;
  isPublic: boolean;
  isProtected: boolean;
  requiresAuth: boolean;
  permissions?: string[];
  children?: RouteInfo[];
}

export interface AuthBoundary {
  type: 'login' | 'register' | 'logout' | 'verify' | 'reset-password';
  route: string;
  component: string;
  redirectsTo?: string;
  triggersStateChange: boolean;
}

export interface FormInfo {
  name: string;
  path: string;
  fields: { name: string; type: string; validation?: string[] }[];
  submitAction: string;
  apiEndpoint?: string;
  parentComponent?: string;
  isModal: boolean;
}

export interface CrudEntity {
  name: string; // e.g., "User", "Role", "EmailTemplate"
  basePath: string; // e.g., "/users"
  operations: {
    list?: { route: string; component: string };
    create?: { route: string; component: string; form: string };
    read?: { route: string; component: string };
    update?: { route: string; component: string; form: string };
    delete?: { component: string; trigger: string };
  };
}

export interface ModalInfo {
  name: string;
  path: string;
  trigger: string; // Button/link that opens modal
  purpose: 'create' | 'edit' | 'delete' | 'view' | 'other';
  parentPage?: string;
  hasForm: boolean;
}

export interface NavigationPattern {
  from: string;
  to: string;
  trigger: string; // Link, button, redirect
  condition?: string; // Auth state, permission
  frequency: 'common' | 'rare'; // How often this navigation happens
}

export interface StateInfo {
  type: 'redux' | 'context' | 'zustand' | 'mobx' | 'none';
  authState?: string[];
  entities: string[];
  actions: string[];
}

export interface APIEndpoint {
  method: string;
  path: string;
  purpose: string;
  usedBy: string[];
}

export interface SynthesizedJourney {
  name: string; // User-friendly name (e.g., "User Login")
  description: string;
  steps: JourneyStep[];
  priority: number;
  tags: string[];
  category: 'authentication' | 'crud' | 'navigation' | 'workflow';
  estimatedDuration: number;
  components: { name: string; path: string }[];
  metadata?: {
    technicalName?: string; // Internal technical name
    formComponent?: string;
  };
}

export interface JourneyStep {
  action: 'navigate' | 'click' | 'fill' | 'submit' | 'verify' | 'wait';
  component: string;
  target: string;
  description: string; // User-friendly description (e.g., "Enter username and password")
  assertions?: string[];
  details?: string; // Additional technical details
}

@Injectable()
export class IntentJourneySynthesisService {

  /**
   * MAIN ENTRY POINT: Complete app understanding → Smart journeys
   */
  async synthesizeJourneys(workspacePath: string): Promise<SynthesizedJourney[]> {
    console.log('🧠 Starting COMPLETE application understanding...');
    
    // Phase 1: Understand EVERYTHING about the app
    const understanding = await this.understandApplication(workspacePath);
    
    console.log(`📊 App Understanding Complete:
  Routes: ${understanding.routes.length}
  Auth Boundaries: ${understanding.authBoundaries.length}
  Forms: ${understanding.forms.length}
  CRUD Entities: ${understanding.crudEntities.length}
  Modals: ${understanding.modals.length}
  Navigation Patterns: ${understanding.navigationPatterns.length}
  APIs: ${understanding.apiEndpoints.length}
`);
    
    // Phase 2: Synthesize realistic user journeys from understanding
    const journeys: SynthesizedJourney[] = [];
    
    // Strategy 1: Authentication flows
    journeys.push(...this.synthesizeAuthJourneys(understanding));
    
    // Strategy 2: CRUD operations
    journeys.push(...this.synthesizeCrudJourneys(understanding));
    
    // Strategy 3: Navigation flows
    journeys.push(...this.synthesizeNavigationJourneys(understanding));
    
    // Strategy 4: Workflow sequences (multi-step business logic)
    journeys.push(...this.synthesizeWorkflowJourneys(understanding));
    
    // Strategy 5: Error recovery paths
    journeys.push(...this.synthesizeErrorRecoveryJourneys(understanding));
    
    // Phase 3: Score and rank journeys
    const rankedJourneys = this.rankJourneysByQuality(journeys, understanding);
    
    console.log(`✅ Synthesized ${rankedJourneys.length} intelligent journeys`);
    
    return rankedJourneys;
  }

  /**
   * Phase 1: Complete Application Understanding
   */
  private async understandApplication(workspacePath: string): Promise<AppUnderstanding> {
    console.log('  🔍 Analyzing application structure...');
    
    const routes = await this.analyzeRoutes(workspacePath);
    const authBoundaries = this.detectAuthBoundaries(routes, workspacePath);
    const forms = await this.analyzeForms(workspacePath);
    const crudEntities = this.detectCrudEntities(routes, forms, workspacePath);
    const modals = await this.analyzeModals(workspacePath);
    const navigationPatterns = this.extractNavigationPatterns(routes, workspacePath);
    const stateManagement = this.analyzeStateManagement(workspacePath);
    const apiEndpoints = await this.extractAPIEndpoints(workspacePath);
    
    return {
      routes,
      authBoundaries,
      forms,
      crudEntities,
      modals,
      navigationPatterns,
      stateManagement,
      apiEndpoints,
    };
  }

  /**
   * Analyze routing structure
   */
  private async analyzeRoutes(workspacePath: string): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];
    
    // Find routing config files
    const routeFiles = this.findFiles(workspacePath, [
      '**/routes/*.{js,jsx,ts,tsx}',
      '**/routes/**/*.{js,jsx,ts,tsx}',
      '**/router/*.{js,jsx,ts,tsx}',
      '**/router/**/*.{js,jsx,ts,tsx}',
      '**/*Route*.{js,jsx,ts,tsx}',
      '**/*Routes*.{js,jsx,ts,tsx}',
      '**/App.{js,jsx,ts,tsx}',
    ]);
    
    for (const file of routeFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        
        // Detect route definitions (React Router, Next.js, etc.)
        const fileRoutes = this.parseRoutesFromFile(content, file, workspacePath);
        routes.push(...fileRoutes);
      } catch (error) {
        // Skip files that can't be read
      }
    }
    
    return routes;
  }

  /**
   * Parse routes from file content
   */
  private parseRoutesFromFile(content: string, filePath: string, workspacePath: string): RouteInfo[] {
    const routes: RouteInfo[] = [];
    
    // Pattern 1: React Router v6 object-based routes
    const objectRouteRegex = /\{\s*path:\s*['"]([^'"]+)['"]\s*,\s*element:\s*(?:<(\w+)|.*?<(\w+))/gs;
    let match;
    
    while ((match = objectRouteRegex.exec(content)) !== null) {
      const routePath = match[1];
      const component = match[2] || match[3];
      
      routes.push({
        path: routePath,
        component,
        filePath: path.relative(workspacePath, filePath),
        isPublic: this.isPublicRoute(content, routePath),
        isProtected: this.isProtectedRoute(content, routePath),
        requiresAuth: this.requiresAuth(content, routePath),
      });
    }
    
    // Pattern 2: JSX <Route> elements
    const jsxRouteRegex = /<Route[^>]*path=['"]([^'"]+)['"][^>]*(?:element=\{<(\w+)|component=\{(\w+))/gs;
    
    while ((match = jsxRouteRegex.exec(content)) !== null) {
      const routePath = match[1];
      const component = match[2] || match[3];
      
      if (!routes.find(r => r.path === routePath)) {
        routes.push({
          path: routePath,
          component,
          filePath: path.relative(workspacePath, filePath),
          isPublic: this.isPublicRoute(content, routePath),
          isProtected: this.isProtectedRoute(content, routePath),
          requiresAuth: this.requiresAuth(content, routePath),
        });
      }
    }
    
    return routes;
  }

  /**
   * Detect authentication boundaries
   */
  private detectAuthBoundaries(routes: RouteInfo[], workspacePath: string): AuthBoundary[] {
    const boundaries: AuthBoundary[] = [];
    
    for (const route of routes) {
      const lower = route.path.toLowerCase();
      
      if (lower.includes('login') || lower === '/') {
        boundaries.push({
          type: 'login',
          route: route.path,
          component: route.component,
          redirectsTo: '/dashboard',
          triggersStateChange: true,
        });
      }
      
      if (lower.includes('register') || lower.includes('signup')) {
        boundaries.push({
          type: 'register',
          route: route.path,
          component: route.component,
          redirectsTo: '/verify',
          triggersStateChange: true,
        });
      }
      
      if (lower.includes('verify')) {
        boundaries.push({
          type: 'verify',
          route: route.path,
          component: route.component,
          redirectsTo: '/login',
          triggersStateChange: true,
        });
      }
      
      if (lower.includes('forgot') || lower.includes('reset')) {
        boundaries.push({
          type: 'reset-password',
          route: route.path,
          component: route.component,
          redirectsTo: '/login',
          triggersStateChange: false,
        });
      }
    }
    
    return boundaries;
  }

  /**
   * Analyze all forms in the app
   */
  private async analyzeForms(workspacePath: string): Promise<FormInfo[]> {
    const forms: FormInfo[] = [];
    
    const formFiles = this.findFiles(workspacePath, [
      '**/*Form*.{js,jsx,ts,tsx}',
      '**/*form*.{js,jsx,ts,tsx}',
    ]);
    
    for (const file of formFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(workspacePath, file);
        
        // Extract form fields
        const fields = this.extractFormFields(content);
        
        if (fields.length > 0) {
          forms.push({
            name: path.basename(file, path.extname(file)),
            path: relativePath,
            fields,
            submitAction: this.extractSubmitAction(content),
            apiEndpoint: this.extractAPIEndpoint(content),
            isModal: relativePath.toLowerCase().includes('modal'),
          });
        }
      } catch (error) {
        // Skip
      }
    }
    
    return forms;
  }

  /**
   * Detect CRUD entities
   */
  private detectCrudEntities(routes: RouteInfo[], forms: FormInfo[], workspacePath: string): CrudEntity[] {
    const entities: Map<string, CrudEntity> = new Map();
    
    // Detect entities from routes
    const entityPatterns = ['user', 'role', 'permission', 'email', 'template', 'product', 'order', 'post', 'article'];
    
    for (const route of routes) {
      for (const pattern of entityPatterns) {
        if (route.path.toLowerCase().includes(pattern)) {
          const entityName = this.capitalize(pattern);
          
          if (!entities.has(entityName)) {
            entities.set(entityName, {
              name: entityName,
              basePath: `/${pattern}s`,
              operations: {},
            });
          }
          
          const entity = entities.get(entityName)!;
          
          // Detect operation type
          if (route.path === `/${pattern}s` || route.path === `/${pattern}`) {
            entity.operations.list = { route: route.path, component: route.component };
          }
        }
      }
    }
    
    // Match forms to CRUD operations
    for (const form of forms) {
      const formLower = form.name.toLowerCase();
      
      for (const [entityName, entity] of entities) {
        const entityLower = entityName.toLowerCase();
        
        if (formLower.includes(entityLower)) {
          if (formLower.includes('create')) {
            entity.operations.create = {
              route: entity.basePath,
              component: form.name,
              form: form.name,
            };
          } else if (formLower.includes('edit') || formLower.includes('update')) {
            entity.operations.update = {
              route: `${entity.basePath}/:id`,
              component: form.name,
              form: form.name,
            };
          }
        }
      }
    }
    
    return Array.from(entities.values());
  }

  /**
   * Analyze modals
   */
  private async analyzeModals(workspacePath: string): Promise<ModalInfo[]> {
    const modals: ModalInfo[] = [];
    
    const modalFiles = this.findFiles(workspacePath, [
      '**/*Modal*.{js,jsx,ts,tsx}',
      '**/*modal*.{js,jsx,ts,tsx}',
      '**/*Dialog*.{js,jsx,ts,tsx}',
    ]);
    
    for (const file of modalFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const name = path.basename(file, path.extname(file));
      const hasForm = /Form|Input|TextField/.test(content);
      
      let purpose: ModalInfo['purpose'] = 'other';
      if (name.toLowerCase().includes('create')) purpose = 'create';
      else if (name.toLowerCase().includes('edit')) purpose = 'edit';
      else if (name.toLowerCase().includes('delete')) purpose = 'delete';
      
      modals.push({
        name,
        path: path.relative(workspacePath, file),
        trigger: 'button', // TODO: detect actual trigger
        purpose,
        hasForm,
      });
    }
    
    return modals;
  }

  /**
   * Extract navigation patterns
   */
  private extractNavigationPatterns(routes: RouteInfo[], workspacePath: string): NavigationPattern[] {
    const patterns: NavigationPattern[] = [];
    
    // Common patterns
    if (routes.find(r => r.path.includes('login')) && routes.find(r => r.path.includes('dashboard'))) {
      patterns.push({
        from: '/login',
        to: '/dashboard',
        trigger: 'form-submit',
        condition: 'authenticated',
        frequency: 'common',
      });
    }
    
    if (routes.find(r => r.path.includes('register'))) {
      patterns.push({
        from: '/login',
        to: '/register',
        trigger: 'link',
        frequency: 'common',
      });
      
      patterns.push({
        from: '/register',
        to: '/login',
        trigger: 'link',
        frequency: 'common',
      });
    }
    
    return patterns;
  }

  /**
   * Analyze state management
   */
  private analyzeStateManagement(workspacePath: string): StateInfo {
    const hasRedux = fs.existsSync(path.join(workspacePath, 'node_modules', 'redux'));
    const hasZustand = fs.existsSync(path.join(workspacePath, 'node_modules', 'zustand'));
    const hasMobx = fs.existsSync(path.join(workspacePath, 'node_modules', 'mobx'));
    
    let type: StateInfo['type'] = 'none';
    if (hasRedux) type = 'redux';
    else if (hasZustand) type = 'zustand';
    else if (hasMobx) type = 'mobx';
    else type = 'context';
    
    return {
      type,
      entities: [],
      actions: [],
    };
  }

  /**
   * Extract API endpoints
   */
  private async extractAPIEndpoints(workspacePath: string): Promise<APIEndpoint[]> {
    // TODO: Scan for axios/fetch calls
    return [];
  }

  /**
   * SYNTHESIS STRATEGIES
   */

  private synthesizeAuthJourneys(understanding: AppUnderstanding): SynthesizedJourney[] {
    const journeys: SynthesizedJourney[] = [];
    
    for (const auth of understanding.authBoundaries) {
      const form = understanding.forms.find(f => 
        f.path.toLowerCase().includes(auth.type)
      );
      
      if (!form) continue;
      
      const steps: JourneyStep[] = [
        {
          action: 'navigate',
          component: 'Browser',
          target: auth.route,
          description: `Navigate to ${auth.route}`,
        },
        {
          action: 'fill',
          component: auth.component,
          target: 'form inputs',
          description: `Fill ${auth.type} form`,
        },
        {
          action: 'submit',
          component: auth.component,
          target: 'submit button',
          description: `Submit ${auth.type} form`,
        },
      ];
      
      if (auth.redirectsTo) {
        steps.push({
          action: 'verify',
          component: 'Browser',
          target: auth.redirectsTo,
          description: `Verify redirect to ${auth.redirectsTo}`,
          assertions: [`URL should be ${auth.redirectsTo}`],
        });
      }
      
      // Convert to user-friendly name
      const userFriendlyName = this.convertToUserFriendlyName(auth.type, 'auth');
      const userFriendlySteps = this.convertStepsToUserFriendly(steps, auth.type);
      
      journeys.push({
        name: userFriendlyName,
        description: `User ${auth.type.replace('-', ' ')}s into the application`,
        steps: userFriendlySteps,
        priority: 1,
        tags: ['authentication', 'critical'],
        category: 'authentication',
        estimatedDuration: 30,
        components: form ? [{ name: form.name, path: form.path }] : [],
        metadata: {
          technicalName: auth.type,
          formComponent: auth.component,
        },
      });
    }
    
    return journeys;
  }

  private synthesizeCrudJourneys(understanding: AppUnderstanding): SynthesizedJourney[] {
    const journeys: SynthesizedJourney[] = [];
    
    for (const entity of understanding.crudEntities) {
      // Create journey
      if (entity.operations.create) {
        const form = understanding.forms.find(f => f.name === entity.operations.create!.form);
        
        const createSteps = [
            {
              action: 'navigate',
              component: 'Browser',
              target: entity.basePath,
              description: `Navigate to ${entity.name} list`,
            },
            {
              action: 'click',
              component: entity.operations.list?.component || 'Page',
              target: 'create button',
              description: `Click create ${entity.name} button`,
            },
            {
              action: 'fill',
              component: entity.operations.create.component,
              target: 'form inputs',
              description: `Fill ${entity.name} form`,
            },
            {
              action: 'submit',
              component: entity.operations.create.component,
              target: 'submit button',
              description: `Submit new ${entity.name}`,
            },
            {
              action: 'verify',
              component: 'Page',
              target: 'success message',
              description: `Verify ${entity.name} created`,
              assertions: [`${entity.name} should appear in list`],
          },
          ] as JourneyStep[];
        
        const userFriendlyName = this.convertToUserFriendlyName(entity.name, 'create');
        const userFriendlySteps = this.convertStepsToUserFriendly(createSteps, 'create', entity.name);
        
        journeys.push({
          name: userFriendlyName,
          description: `User creates a new ${entity.name.toLowerCase()}`,
          steps: userFriendlySteps,
          priority: 2,
          tags: ['crud', 'create'],
          category: 'crud',
          estimatedDuration: 45,
          components: form ? [{ name: form.name, path: form.path }] : [],
          metadata: {
            technicalName: `create-${entity.name}`,
            formComponent: entity.operations.create.component,
          },
        });
      }
      
      // Edit journey
      if (entity.operations.update) {
        const editSteps = [
            {
              action: 'navigate',
              component: 'Browser',
              target: entity.basePath,
              description: `Navigate to ${entity.name} list`,
            },
            {
              action: 'click',
              component: entity.operations.list?.component || 'Page',
              target: 'edit button',
              description: `Click edit ${entity.name}`,
            },
            {
              action: 'fill',
              component: entity.operations.update.component,
              target: 'form inputs',
              description: `Update ${entity.name} fields`,
            },
            {
              action: 'submit',
              component: entity.operations.update.component,
              target: 'submit button',
              description: `Save ${entity.name} changes`,
            },
          ] as JourneyStep[];
        
        const userFriendlyName = this.convertToUserFriendlyName(entity.name, 'edit');
        const userFriendlySteps = this.convertStepsToUserFriendly(editSteps, 'edit', entity.name);
        
        journeys.push({
          name: userFriendlyName,
          description: `User updates an existing ${entity.name.toLowerCase()}`,
          steps: userFriendlySteps,
          priority: 2,
          tags: ['crud', 'edit'],
          category: 'crud',
          estimatedDuration: 40,
          components: [],
          metadata: {
            technicalName: `edit-${entity.name}`,
            formComponent: entity.operations.update.component,
          },
        });
      }
    }
    
    return journeys;
  }

  private synthesizeNavigationJourneys(understanding: AppUnderstanding): SynthesizedJourney[] {
    const journeys: SynthesizedJourney[] = [];
    
    for (const pattern of understanding.navigationPatterns) {
      const navSteps = [
          {
            action: 'navigate',
            component: 'Browser',
            target: pattern.from,
            description: `Start at ${pattern.from}`,
          },
          {
            action: 'click',
            component: 'Page',
            target: pattern.to,
            description: `Click navigation to ${pattern.to}`,
          },
          {
            action: 'verify',
            component: 'Browser',
            target: pattern.to,
            description: `Verify navigation to ${pattern.to}`,
          },
        ] as JourneyStep[];
      
      const fromPage = pattern.from.replace(/^\//,  '').replace(/\//g, ' ').trim() || 'home';
      const toPage = pattern.to.replace(/^\//,  '').replace(/\//g, ' ').trim();
      const userFriendlySteps = this.convertStepsToUserFriendly(navSteps, 'navigate');
      
      journeys.push({
        name: `🧭 Navigate: ${fromPage} → ${toPage}`,
        description: `User navigates from ${fromPage} to ${toPage}`,
        steps: userFriendlySteps,
        priority: 3,
        tags: ['navigation'],
        category: 'navigation',
        estimatedDuration: 10,
        components: [],
        metadata: {
          technicalName: `nav-${pattern.from}-to-${pattern.to}`,
        },
      });
    }
    
    return journeys;
  }

  private synthesizeWorkflowJourneys(understanding: AppUnderstanding): SynthesizedJourney[] {
    const journeys: SynthesizedJourney[] = [];
    
    // Pattern: Register → Verify → Login
    const hasRegister = understanding.authBoundaries.find(a => a.type === 'register');
    const hasVerify = understanding.authBoundaries.find(a => a.type === 'verify');
    const hasLogin = understanding.authBoundaries.find(a => a.type === 'login');
    
    if (hasRegister && hasVerify && hasLogin) {
      const onboardingSteps = [
          {
            action: 'navigate',
            component: 'Browser',
            target: hasRegister.route,
            description: 'Navigate to registration',
          },
          {
            action: 'fill',
            component: hasRegister.component,
            target: 'registration form',
            description: 'Fill registration form',
          },
          {
            action: 'submit',
            component: hasRegister.component,
            target: 'submit',
            description: 'Submit registration',
          },
          {
            action: 'verify',
            component: 'Email',
            target: 'verification link',
            description: 'Check verification email',
          },
          {
            action: 'navigate',
            component: 'Browser',
            target: hasLogin.route,
            description: 'Navigate to login',
          },
          {
            action: 'fill',
            component: hasLogin.component,
            target: 'login form',
            description: 'Enter credentials',
          },
          {
            action: 'submit',
            component: hasLogin.component,
            target: 'submit',
            description: 'Log in',
          }] as JourneyStep[];
        
        const userFriendlySteps = this.convertStepsToUserFriendly(onboardingSteps, 'register');
        
        journeys.push({
        name: '🎉 Complete User Onboarding',
        description: 'New user registers, verifies email, and logs in',
        steps: userFriendlySteps,
        priority: 1,
        tags: ['workflow', 'onboarding', 'critical'],
        category: 'workflow',
        estimatedDuration: 120,
        components: [],
        metadata: {
          technicalName: 'user-onboarding-workflow',
        },
      });
    }
    
    return journeys;
  }

  private synthesizeErrorRecoveryJourneys(understanding: AppUnderstanding): SynthesizedJourney[] {
    const journeys: SynthesizedJourney[] = [];
    
    // Forgot password flow
    const hasReset = understanding.authBoundaries.find(a => a.type === 'reset-password');
    const hasLogin = understanding.authBoundaries.find(a => a.type === 'login');
    
    if (hasReset && hasLogin) {
      const recoverySteps = [
          {
            action: 'navigate',
            component: 'Browser',
            target: hasLogin.route,
            description: 'Navigate to login',
          },
          {
            action: 'click',
            component: hasLogin.component,
            target: 'forgot password link',
            description: 'Click forgot password',
          },
          {
            action: 'fill',
            component: hasReset.component,
            target: 'email input',
            description: 'Enter email',
          },
          {
            action: 'submit',
            component: hasReset.component,
            target: 'submit',
            description: 'Request password reset',
          },
        ] as JourneyStep[];
      
      const userFriendlySteps = this.convertStepsToUserFriendly(recoverySteps, 'reset-password');
      
      journeys.push({
        name: '🔑 Password Recovery',
        description: 'User recovers forgotten password',
        steps: userFriendlySteps,
        priority: 2,
        tags: ['error-recovery', 'authentication'],
        category: 'workflow',
        estimatedDuration: 60,
        components: [],
        metadata: {
          technicalName: 'password-recovery-workflow',
        },
      });
    }
    
    return journeys;
  }

  /**
   * Rank journeys by quality score
   */
  private rankJourneysByQuality(journeys: SynthesizedJourney[], understanding: AppUnderstanding): SynthesizedJourney[] {
    return journeys
      .map(journey => ({
        ...journey,
        qualityScore: this.calculateQualityScore(journey, understanding),
      }))
      .sort((a, b) => {
        // Sort by priority first, then quality score
        if (a.priority !== b.priority) return a.priority - b.priority;
        return b.qualityScore - a.qualityScore;
      });
  }

  private calculateQualityScore(journey: SynthesizedJourney, understanding: AppUnderstanding): number {
    let score = 0;
    
    // Completeness: has multiple steps
    score += Math.min(journey.steps.length * 10, 50);
    
    // Realism: matches real components
    if (journey.components.length > 0) score += 20;
    
    // Testability: has assertions
    const hasAssertions = journey.steps.some(s => s.assertions && s.assertions.length > 0);
    if (hasAssertions) score += 20;
    
    // Coverage: touches critical paths
    if (journey.tags.includes('critical')) score += 10;
    
    return score;
  }

  /**
   * UTILITY METHODS
   */

  private findFiles(workspacePath: string, patterns: string[]): string[] {
    const files: string[] = [];
    
    const searchDir = (dir: string, depth: number = 0) => {
      if (depth > 10) return; // Prevent infinite recursion
      
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          // Skip node_modules, .git, etc.
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            searchDir(fullPath, depth + 1);
          } else if (entry.isFile()) {
            // Check if matches patterns
            for (const pattern of patterns) {
              const regex = this.patternToRegex(pattern);
              if (regex.test(fullPath)) {
                files.push(fullPath);
                break;
              }
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };
    
    searchDir(workspacePath);
    return files;
  }

  private patternToRegex(pattern: string): RegExp {
    // Convert glob pattern to regex
    let regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\{([^}]+)\}/g, '($1)')
      .replace(/,/g, '|');
    
    return new RegExp(regex);
  }

  private isPublicRoute(content: string, routePath: string): boolean {
    return /PublicRoute|public/.test(content);
  }

  private isProtectedRoute(content: string, routePath: string): boolean {
    return /PrivateRoute|protected|requireAuth/.test(content);
  }

  private requiresAuth(content: string, routePath: string): boolean {
    return this.isProtectedRoute(content, routePath);
  }

  private extractFormFields(content: string): { name: string; type: string }[] {
    const fields: { name: string; type: string }[] = [];
    
    // Match Ant Design Form.Item with name prop
    const antdRegex = /<Form\.Item[^>]*name=['"]([^'"]+)['"][^>]*>/g;
    let match;
    
    while ((match = antdRegex.exec(content)) !== null) {
      fields.push({ name: match[1], type: 'text' });
    }
    
    // Match HTML inputs
    const inputRegex = /<input[^>]*name=['"]([^'"]+)['"][^>]*type=['"]([^'"]+)['"][^>]*>/g;
    
    while ((match = inputRegex.exec(content)) !== null) {
      if (!fields.find(f => f.name === match[1])) {
        fields.push({ name: match[1], type: match[2] });
      }
    }
    
    return fields;
  }

  private extractSubmitAction(content: string): string {
    const match = content.match(/onFinish=\{([^}]+)\}|onSubmit=\{([^}]+)\}/);
    return match ? (match[1] || match[2]) : 'unknown';
  }

  private extractAPIEndpoint(content: string): string | undefined {
    const match = content.match(/['"`]\/api\/([^'"`]+)['"`]/);
    return match ? `/api/${match[1]}` : undefined;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Convert technical names to user-friendly names
   */
  private convertToUserFriendlyName(name: string, type: 'auth' | 'create' | 'edit' | 'delete' | 'view'): string {
    // Remove technical prefixes/suffixes
    name = name
      .replace(/Form$/, '')
      .replace(/Modal$/, '')
      .replace(/Component$/, '')
      .replace(/^use/, '')
      .replace(/^get/, '')
      .replace(/^create/, '')
      .replace(/^edit/, '')
      .replace(/^update/, '')
      .replace(/^delete/, '');
    
    // Convert camelCase/PascalCase to Title Case
    name = name
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // Add action prefix based on type
    switch (type) {
      case 'auth':
        if (name.toLowerCase().includes('login')) return '👤 User Login';
        if (name.toLowerCase().includes('register')) return '👥 User Registration';
        if (name.toLowerCase().includes('logout')) return '🚪 User Logout';
        if (name.toLowerCase().includes('reset')) return '🔑 Password Reset';
        if (name.toLowerCase().includes('verify')) return '✅ Email Verification';
        return `🔐 ${name}`;
      
      case 'create':
        return `➕ Create ${name}`;
      
      case 'edit':
        return `✏️ Edit ${name}`;
      
      case 'delete':
        return `🗑️ Delete ${name}`;
      
      case 'view':
        return `👁️ View ${name}`;
      
      default:
        return name;
    }
  }

  /**
   * Convert technical steps to user-friendly descriptions
   */
  private convertStepsToUserFriendly(steps: JourneyStep[], context: string, entityName?: string): JourneyStep[] {
    return steps.map((step, index) => {
      const stepNumber = index + 1;
      let userFriendlyDesc = step.description;
      
      // Convert based on action type
      switch (step.action) {
        case 'navigate':
          if (step.target.includes('login')) {
            userFriendlyDesc = 'Navigate to login page';
          } else if (step.target.includes('register')) {
            userFriendlyDesc = 'Navigate to registration page';
          } else if (step.target.includes('dashboard')) {
            userFriendlyDesc = 'Navigate to dashboard';
          } else if (entityName) {
            userFriendlyDesc = `Open ${entityName.toLowerCase()} page`;
          } else {
            userFriendlyDesc = `Navigate to ${step.target.replace(/^\//,  '')}`;
          }
          break;
        
        case 'fill':
          if (context === 'login') {
            userFriendlyDesc = 'Enter username and password';
          } else if (context === 'register') {
            userFriendlyDesc = 'Fill registration form (username, email, password)';
          } else if (entityName) {
            userFriendlyDesc = `Enter ${entityName.toLowerCase()} details`;
          } else {
            userFriendlyDesc = 'Fill in the form fields';
          }
          break;
        
        case 'click':
          if (step.target.includes('create') || step.target.includes('new')) {
            userFriendlyDesc = entityName ? `Click "New ${entityName}"` : 'Click "Create" button';
          } else if (step.target.includes('edit')) {
            userFriendlyDesc = 'Click "Edit" button';
          } else if (step.target.includes('delete')) {
            userFriendlyDesc = 'Click "Delete" button';
          } else {
            userFriendlyDesc = step.description;
          }
          break;
        
        case 'submit':
          if (context === 'login') {
            userFriendlyDesc = 'Click "Login" button';
          } else if (context === 'register') {
            userFriendlyDesc = 'Submit registration';
          } else if (context === 'create') {
            userFriendlyDesc = `Save new ${entityName?.toLowerCase() || 'item'}`;
          } else {
            userFriendlyDesc = 'Submit the form';
          }
          break;
        
        case 'verify':
          if (step.target.includes('dashboard')) {
            userFriendlyDesc = 'Verify successful login (dashboard loads)';
          } else if (step.target.includes('success') || step.target.includes('message')) {
            userFriendlyDesc = entityName 
              ? `Verify ${entityName.toLowerCase()} was created successfully`
              : 'Verify success message appears';
          } else if (step.assertions && step.assertions.length > 0) {
            userFriendlyDesc = `Verify ${step.assertions[0].toLowerCase()}`;
          } else {
            userFriendlyDesc = step.description;
          }
          break;
        
        case 'wait':
          userFriendlyDesc = 'Wait for page to load';
          break;
        
        default:
          userFriendlyDesc = step.description;
      }
      
      return {
        ...step,
        description: userFriendlyDesc,
        details: step.description !== userFriendlyDesc ? step.description : undefined,
      };
    });
  }
}

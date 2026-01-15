import { Injectable } from '@nestjs/common';
import { AnalysisPayload } from '../types/analysis-payload.types';

/**
 * Deterministic Test Builder
 * 
 * Generates test suite/case/step structure DETERMINISTICALLY from payload.
 * No AI involvement in structure - guarantees 100% coverage.
 * 
 * AI is only used later for:
 * - Enriching descriptions
 * - Suggesting edge cases
 */

// Output types
export interface GeneratedSuite {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
  prerequisites: string[];
  testCases: GeneratedTestCase[];
  coverage: {
    routes: string[];
    forms: string[];
    entities: string[];
  };
}

export interface GeneratedTestCase {
  id: string;
  name: string;
  description: string;
  type: 'happy-path' | 'validation' | 'security' | 'edge-case' | 'crud-create' | 'crud-read' | 'crud-update' | 'crud-delete';
  priority: 'critical' | 'high' | 'medium' | 'low';
  prerequisites: string[];
  testData: Record<string, any>;
  steps: GeneratedStep[];
  expectedOutcome: string;
}

export interface GeneratedStep {
  index: number;
  action: 'navigate' | 'fill' | 'click' | 'select' | 'verify' | 'wait' | 'upload' | 'hover';
  target: string;
  selector: string | null;
  value: string | null;
  description: string;
  waitFor?: string;
  assertion?: {
    type: 'equals' | 'contains' | 'visible' | 'hidden' | 'count' | 'url';
    expected: any;
  };
}

// Internal types for grouping
interface BusinessDomain {
  name: string;
  routes: RouteWithMeta[];
  forms: FormWithMeta[];
  isProtected: boolean;
  entityName: string | null;
  domainType: 'auth' | 'crud' | 'checkout' | 'profile' | 'static' | 'other';
}

interface RouteWithMeta {
  path: string;
  component: string | null;
  isProtected: boolean;
  isDynamic: boolean;
  params: string[];
  routeType: 'list' | 'detail' | 'form' | 'static' | 'auth';
}

interface FormWithMeta {
  id: string;
  name: string;
  route: string | null;
  fields: FieldWithMeta[];
  submitSelector: string;
  hasValidation: boolean;
  formType: 'login' | 'register' | 'reset-password' | 'crud-create' | 'crud-edit' | 'search' | 'filter' | 'other';
}

interface FieldWithMeta {
  name: string;
  type: string;
  selector: string;
  isRequired: boolean;
  label: string | null;
  testValue: string;
  validations: { type: string; value: any }[];
}

@Injectable()
export class DeterministicTestBuilderService {

  /**
   * Main entry: Build test suites deterministically from payload
   */
  build(payload: AnalysisPayload): GeneratedSuite[] {
    console.log('\n🔧 Deterministic Test Builder: Starting...');
    
    // Step 1: Group routes into business domains
    const domains = this.groupIntoDomains(payload);
    console.log(`   Found ${domains.length} business domains`);
    
    // Step 2: Generate suite for each domain
    const suites: GeneratedSuite[] = [];
    
    for (const domain of domains) {
      const suite = this.generateSuiteForDomain(domain, payload);
      if (suite.testCases.length > 0) {
        suites.push(suite);
      }
    }
    
    // Step 3: Ensure 100% route coverage
    const coveredRoutes = new Set(suites.flatMap(s => s.coverage.routes));
    const uncoveredRoutes = payload.routes.filter(r => !coveredRoutes.has(r.path));
    
    if (uncoveredRoutes.length > 0) {
      console.log(`   Adding ${uncoveredRoutes.length} uncovered routes to misc suite`);
      const miscSuite = this.generateMiscSuite(uncoveredRoutes);
      suites.push(miscSuite);
    }
    
    // Log stats
    const totalCases = suites.reduce((sum, s) => sum + s.testCases.length, 0);
    const totalSteps = suites.reduce((sum, s) => 
      sum + s.testCases.reduce((cs, c) => cs + c.steps.length, 0), 0);
    
    console.log(`✅ Generated ${suites.length} suites, ${totalCases} cases, ${totalSteps} steps`);
    console.log(`   Route coverage: ${coveredRoutes.size + uncoveredRoutes.length}/${payload.routes.length} (100%)`);
    
    return suites;
  }

  /**
   * Group routes into business domains based on path structure and purpose
   */
  private groupIntoDomains(payload: AnalysisPayload): BusinessDomain[] {
    const domains: BusinessDomain[] = [];
    const routesByDomain = new Map<string, RouteWithMeta[]>();
    
    // Classify each route
    for (const route of payload.routes) {
      const classification = this.classifyRoute(route.path, route.isProtected);
      const domainKey = classification.domain;
      
      if (!routesByDomain.has(domainKey)) {
        routesByDomain.set(domainKey, []);
      }
      
      routesByDomain.get(domainKey)!.push({
        path: route.path,
        component: route.component,
        isProtected: route.isProtected,
        isDynamic: route.isDynamic,
        params: route.params,
        routeType: classification.routeType,
      });
    }
    
    // Create domain objects with forms
    for (const [domainKey, routes] of routesByDomain) {
      // Find forms that belong to this domain's routes
      const domainForms: FormWithMeta[] = [];
      
      for (const form of payload.forms) {
        const formRoute = form.route;
        if (formRoute && routes.some(r => r.path === formRoute || formRoute.startsWith(r.path))) {
          domainForms.push(this.enrichForm(form));
        }
      }
      
      // Also check forms by name matching
      for (const form of payload.forms) {
        if (domainForms.find(f => f.id === form.id)) continue;
        
        const formNameLower = form.name.toLowerCase();
        const domainKeyLower = domainKey.toLowerCase();
        
        if (formNameLower.includes(domainKeyLower) || 
            domainKeyLower.includes(formNameLower.replace(' form', ''))) {
          domainForms.push(this.enrichForm(form));
        }
      }
      
      const isProtected = routes.some(r => r.isProtected);
      const domainType = this.inferDomainType(domainKey, routes);
      const entityName = this.inferEntityName(domainKey);
      
      domains.push({
        name: domainKey,
        routes,
        forms: domainForms,
        isProtected,
        entityName,
        domainType,
      });
    }
    
    // Sort: critical domains first
    const priorityOrder = ['auth', 'checkout', 'crud', 'profile', 'static', 'other'];
    return domains.sort((a, b) => 
      priorityOrder.indexOf(a.domainType) - priorityOrder.indexOf(b.domainType)
    );
  }

  /**
   * Classify route into domain and type
   */
  private classifyRoute(path: string, isProtected: boolean): { domain: string; routeType: RouteWithMeta['routeType'] } {
    const pathLower = path.toLowerCase();
    const segments = path.split('/').filter(Boolean);
    
    // Auth routes
    if (pathLower.includes('sign-in') || pathLower.includes('login')) {
      return { domain: 'Authentication', routeType: 'auth' };
    }
    if (pathLower.includes('sign-up') || pathLower.includes('register')) {
      return { domain: 'Authentication', routeType: 'auth' };
    }
    if (pathLower.includes('password-reset') || pathLower.includes('forgot')) {
      return { domain: 'Authentication', routeType: 'auth' };
    }
    
    // Cart/Checkout
    if (pathLower.includes('cart')) {
      return { domain: 'Cart', routeType: 'form' };
    }
    if (pathLower.includes('checkout')) {
      return { domain: 'Cart', routeType: 'form' };
    }
    if (pathLower.includes('success') || pathLower.includes('failure') || pathLower.includes('cancel')) {
      return { domain: 'Cart', routeType: 'static' };
    }
    
    // Dashboard/Admin entities
    const adminPrefixes = ['dashboard', 'admin', 'manage', 'cms'];
    for (const prefix of adminPrefixes) {
      if (segments[0]?.toLowerCase() === prefix && segments.length > 1) {
        const entitySegment = segments[1];
        // Skip dynamic params
        if (entitySegment.startsWith('[')) continue;
        
        const entityName = this.capitalizeFirst(entitySegment);
        const routeType = this.inferRouteType(path);
        return { domain: entityName, routeType };
      }
    }
    
    // Dashboard home
    if (pathLower === '/dashboard' || pathLower === '/admin') {
      return { domain: 'Dashboard', routeType: 'static' };
    }
    
    // Shop/Products
    if (pathLower.includes('shop') || pathLower.includes('products')) {
      return { domain: 'Shop', routeType: pathLower.includes('[') ? 'detail' : 'list' };
    }
    if (pathLower.includes('product/')) {
      return { domain: 'Shop', routeType: 'detail' };
    }
    
    // Orders (user-facing)
    if (pathLower.includes('orders') && !pathLower.includes('dashboard')) {
      return { domain: 'Orders', routeType: pathLower.includes('[') ? 'detail' : 'list' };
    }
    
    // Profile
    if (pathLower.includes('profile') || pathLower.includes('account') || pathLower.includes('settings')) {
      return { domain: 'Profile', routeType: 'form' };
    }
    
    // Home
    if (path === '/' || path === '') {
      return { domain: 'Home', routeType: 'static' };
    }
    
    // Other static pages
    const staticPages = ['about', 'contact', 'support', 'help', 'faq', 'terms', 'privacy', 'maintenance'];
    for (const page of staticPages) {
      if (pathLower.includes(page)) {
        return { domain: 'Static Pages', routeType: 'static' };
      }
    }
    
    // Default: use first segment as domain
    if (segments.length > 0 && !segments[0].startsWith('[')) {
      return { domain: this.capitalizeFirst(segments[0]), routeType: 'static' };
    }
    
    return { domain: 'Other', routeType: 'static' };
  }

  /**
   * Infer route type from path structure
   */
  private inferRouteType(path: string): RouteWithMeta['routeType'] {
    if (path.includes('[') && path.includes(']')) {
      // Has dynamic segment - likely detail page
      return 'detail';
    }
    
    // Check for common patterns
    const pathLower = path.toLowerCase();
    if (pathLower.endsWith('/new') || pathLower.endsWith('/create') || pathLower.endsWith('/add')) {
      return 'form';
    }
    if (pathLower.endsWith('/edit') || pathLower.includes('/edit/')) {
      return 'form';
    }
    
    // Default to list for entity pages
    return 'list';
  }

  /**
   * Infer domain type
   */
  private inferDomainType(domainName: string, routes: RouteWithMeta[]): BusinessDomain['domainType'] {
    const nameLower = domainName.toLowerCase();
    
    if (nameLower === 'authentication') return 'auth';
    if (nameLower === 'cart' || nameLower === 'checkout') return 'checkout';
    if (nameLower === 'profile' || nameLower === 'account') return 'profile';
    if (nameLower === 'home' || nameLower === 'static pages') return 'static';
    
    // Check for CRUD pattern: has list + detail routes
    const hasList = routes.some(r => r.routeType === 'list');
    const hasDetail = routes.some(r => r.routeType === 'detail');
    
    if (hasList || hasDetail) return 'crud';
    
    return 'other';
  }

  /**
   * Infer entity name from domain
   */
  private inferEntityName(domainName: string): string | null {
    const skipDomains = ['authentication', 'cart', 'checkout', 'profile', 'home', 'static pages', 'dashboard', 'other'];
    if (skipDomains.includes(domainName.toLowerCase())) return null;
    
    // Singularize
    let entity = domainName;
    if (entity.endsWith('s') && !entity.endsWith('ss')) {
      entity = entity.slice(0, -1);
    }
    
    return entity;
  }

  /**
   * Enrich form with metadata
   */
  private enrichForm(form: any): FormWithMeta {
    const formNameLower = form.name.toLowerCase();
    
    let formType: FormWithMeta['formType'] = 'other';
    if (formNameLower.includes('login') || formNameLower.includes('sign in')) {
      formType = 'login';
    } else if (formNameLower.includes('register') || formNameLower.includes('sign up')) {
      formType = 'register';
    } else if (formNameLower.includes('password') || formNameLower.includes('reset')) {
      formType = 'reset-password';
    } else if (formNameLower.includes('search')) {
      formType = 'search';
    } else if (formNameLower.includes('filter')) {
      formType = 'filter';
    }
    
    const fields: FieldWithMeta[] = form.fields.map((f: any) => ({
      name: f.name,
      type: f.type || 'text',
      selector: f.selector || this.generateSelector(f.name, f.type),
      isRequired: f.isRequired ?? f.required ?? false,
      label: f.label || this.humanize(f.name),
      testValue: this.generateTestValue(f.name, f.type),
      validations: f.validations || [],
    }));
    
    return {
      id: form.id,
      name: form.name,
      route: form.route,
      fields,
      submitSelector: form.submitButton?.selector || 'button[type="submit"]',
      hasValidation: form.hasValidation ?? false,
      formType,
    };
  }

  /**
   * Generate suite for a business domain
   */
  private generateSuiteForDomain(domain: BusinessDomain, payload: AnalysisPayload): GeneratedSuite {
    const suiteId = `suite-${domain.name.toLowerCase().replace(/\s+/g, '-')}`;
    const testCases: GeneratedTestCase[] = [];
    
    // Determine priority based on domain type
    let priority: GeneratedSuite['priority'] = 'medium';
    if (domain.domainType === 'auth') priority = 'critical';
    else if (domain.domainType === 'checkout') priority = 'critical';
    else if (domain.domainType === 'crud') priority = 'high';
    
    // Prerequisites for protected domains
    const prerequisites: string[] = [];
    if (domain.isProtected) {
      prerequisites.push('User must be logged in');
      if (domain.name.toLowerCase() !== 'authentication') {
        prerequisites.push('User must have appropriate permissions');
      }
    }
    
    // Generate test cases based on domain type
    switch (domain.domainType) {
      case 'auth':
        testCases.push(...this.generateAuthTestCases(domain, suiteId));
        break;
      case 'checkout':
        testCases.push(...this.generateCheckoutTestCases(domain, suiteId));
        break;
      case 'crud':
        testCases.push(...this.generateCrudTestCases(domain, suiteId));
        break;
      case 'profile':
        testCases.push(...this.generateProfileTestCases(domain, suiteId));
        break;
      default:
        testCases.push(...this.generateStaticTestCases(domain, suiteId));
    }
    
    // Generate tags
    const tags = [domain.name.toLowerCase()];
    if (domain.isProtected) tags.push('protected');
    if (domain.entityName) tags.push(domain.entityName.toLowerCase());
    tags.push(domain.domainType);
    
    return {
      id: suiteId,
      name: domain.name,
      description: this.generateSuiteDescription(domain),
      category: domain.domainType,
      priority,
      tags,
      prerequisites,
      testCases,
      coverage: {
        routes: domain.routes.map(r => r.path),
        forms: domain.forms.map(f => f.name),
        entities: domain.entityName ? [domain.entityName] : [],
      },
    };
  }

  /**
   * Generate auth test cases
   */
  private generateAuthTestCases(domain: BusinessDomain, suiteId: string): GeneratedTestCase[] {
    const cases: GeneratedTestCase[] = [];
    let caseIndex = 1;
    
    // Find login form and route
    const loginForm = domain.forms.find(f => f.formType === 'login');
    const loginRoute = domain.routes.find(r => 
      r.path.includes('sign-in') || r.path.includes('login')
    );
    
    if (loginForm && loginRoute) {
      // Happy path: successful login
      cases.push({
        id: `${suiteId}-tc-${caseIndex++}`,
        name: 'Login with valid credentials',
        description: 'User successfully logs in with valid email and password',
        type: 'happy-path',
        priority: 'critical',
        prerequisites: [],
        testData: this.generateAuthTestData(loginForm),
        steps: this.generateLoginSteps(loginRoute.path, loginForm),
        expectedOutcome: 'User is redirected to home/dashboard',
      });
      
      // Validation: empty fields
      cases.push({
        id: `${suiteId}-tc-${caseIndex++}`,
        name: 'Login validation - empty fields',
        description: 'Show validation errors when submitting empty form',
        type: 'validation',
        priority: 'high',
        prerequisites: [],
        testData: {},
        steps: this.generateValidationSteps(loginRoute.path, loginForm, 'empty'),
        expectedOutcome: 'Validation errors are displayed for required fields',
      });
      
      // Validation: invalid email
      const emailField = loginForm.fields.find(f => f.name.toLowerCase().includes('email'));
      if (emailField) {
        cases.push({
          id: `${suiteId}-tc-${caseIndex++}`,
          name: 'Login validation - invalid email format',
          description: 'Show validation error for invalid email format',
          type: 'validation',
          priority: 'high',
          prerequisites: [],
          testData: { [emailField.name]: 'invalid-email' },
          steps: this.generateValidationSteps(loginRoute.path, loginForm, 'invalid-email'),
          expectedOutcome: 'Email format validation error is displayed',
        });
      }
      
      // Security: wrong password
      cases.push({
        id: `${suiteId}-tc-${caseIndex++}`,
        name: 'Login with wrong password',
        description: 'Show error when password is incorrect',
        type: 'security',
        priority: 'high',
        prerequisites: [],
        testData: { ...this.generateAuthTestData(loginForm), password: 'WrongPassword123!' },
        steps: this.generateLoginSteps(loginRoute.path, loginForm, true),
        expectedOutcome: 'Authentication error is displayed',
      });
    }
    
    // Find register form and route
    const registerForm = domain.forms.find(f => f.formType === 'register');
    const registerRoute = domain.routes.find(r => 
      r.path.includes('sign-up') || r.path.includes('register')
    );
    
    if (registerForm && registerRoute) {
      cases.push({
        id: `${suiteId}-tc-${caseIndex++}`,
        name: 'Register new user',
        description: 'Successfully register a new user account',
        type: 'happy-path',
        priority: 'critical',
        prerequisites: [],
        testData: this.generateRegisterTestData(registerForm),
        steps: this.generateRegisterSteps(registerRoute.path, registerForm),
        expectedOutcome: 'User is registered and redirected',
      });
      
      cases.push({
        id: `${suiteId}-tc-${caseIndex++}`,
        name: 'Register validation - required fields',
        description: 'Show validation errors for empty required fields',
        type: 'validation',
        priority: 'high',
        prerequisites: [],
        testData: {},
        steps: this.generateValidationSteps(registerRoute.path, registerForm, 'empty'),
        expectedOutcome: 'Validation errors are displayed',
      });
    }
    
    // Password reset
    const resetForm = domain.forms.find(f => f.formType === 'reset-password');
    const resetRoute = domain.routes.find(r => r.path.includes('password-reset'));
    
    if (resetRoute) {
      cases.push({
        id: `${suiteId}-tc-${caseIndex++}`,
        name: 'Request password reset',
        description: 'User requests password reset email',
        type: 'happy-path',
        priority: 'medium',
        prerequisites: [],
        testData: { email: 'user@example.com' },
        steps: this.generatePasswordResetSteps(resetRoute.path, resetForm),
        expectedOutcome: 'Success message about email sent',
      });
    }
    
    // Protected route redirect
    cases.push({
      id: `${suiteId}-tc-${caseIndex++}`,
      name: 'Protected route redirects to login',
      description: 'Unauthenticated user is redirected to login when accessing protected route',
      type: 'security',
      priority: 'critical',
      prerequisites: ['User must be logged out'],
      testData: {},
      steps: [
        {
          index: 0,
          action: 'navigate',
          target: '/dashboard',
          selector: null,
          value: null,
          description: 'Try to access protected dashboard',
        },
        {
          index: 1,
          action: 'verify',
          target: 'url',
          selector: null,
          value: null,
          description: 'Verify redirected to login',
          assertion: { type: 'url', expected: '/sign-in' },
        },
      ],
      expectedOutcome: 'User is redirected to sign-in page',
    });
    
    return cases;
  }

  /**
   * Generate CRUD test cases
   */
  private generateCrudTestCases(domain: BusinessDomain, suiteId: string): GeneratedTestCase[] {
    const cases: GeneratedTestCase[] = [];
    let caseIndex = 1;
    
    const entityName = domain.entityName || domain.name;
    const entityLower = entityName.toLowerCase();
    
    // Find list and detail routes
    const listRoute = domain.routes.find(r => r.routeType === 'list');
    const detailRoute = domain.routes.find(r => r.routeType === 'detail');
    
    // Find forms
    const createForm = domain.forms.find(f => 
      f.formType === 'crud-create' || 
      f.name.toLowerCase().includes('create') ||
      f.name.toLowerCase().includes('add') ||
      f.name.toLowerCase().includes(entityLower)
    ) || domain.forms[0];
    
    // View list
    if (listRoute) {
      cases.push({
        id: `${suiteId}-tc-${caseIndex++}`,
        name: `View ${entityLower} list`,
        description: `Display list of all ${entityLower}s`,
        type: 'crud-read',
        priority: 'high',
        prerequisites: domain.isProtected ? ['User must be logged in as admin'] : [],
        testData: {},
        steps: [
          {
            index: 0,
            action: 'navigate',
            target: listRoute.path,
            selector: null,
            value: null,
            description: `Go to ${entityLower} list page`,
          },
          {
            index: 1,
            action: 'verify',
            target: 'table',
            selector: 'table, [role="table"], .data-table',
            value: null,
            description: `Verify ${entityLower} table is displayed`,
            assertion: { type: 'visible', expected: true },
          },
          {
            index: 2,
            action: 'verify',
            target: 'header',
            selector: 'h1, h2',
            value: null,
            description: 'Verify page title',
            assertion: { type: 'contains', expected: entityName },
          },
        ],
        expectedOutcome: `${entityName} list is displayed with data`,
      });
    }
    
    // Create entity
    if (createForm && listRoute) {
      cases.push({
        id: `${suiteId}-tc-${caseIndex++}`,
        name: `Create new ${entityLower}`,
        description: `Admin creates a new ${entityLower}`,
        type: 'crud-create',
        priority: 'critical',
        prerequisites: domain.isProtected ? ['User must be logged in as admin'] : [],
        testData: this.generateFormTestData(createForm),
        steps: this.generateCreateSteps(listRoute.path, createForm, entityName),
        expectedOutcome: `New ${entityLower} is created and appears in list`,
      });
      
      // Create validation
      cases.push({
        id: `${suiteId}-tc-${caseIndex++}`,
        name: `Create ${entityLower} - validation errors`,
        description: `Show validation errors when creating ${entityLower} with invalid data`,
        type: 'validation',
        priority: 'high',
        prerequisites: domain.isProtected ? ['User must be logged in as admin'] : [],
        testData: {},
        steps: this.generateCreateValidationSteps(listRoute.path, createForm, entityName),
        expectedOutcome: 'Validation errors are displayed',
      });
    }
    
    // View detail
    if (detailRoute) {
      const examplePath = this.generateExamplePath(detailRoute.path, detailRoute.params);
      cases.push({
        id: `${suiteId}-tc-${caseIndex++}`,
        name: `View ${entityLower} details`,
        description: `View detailed information of a ${entityLower}`,
        type: 'crud-read',
        priority: 'high',
        prerequisites: domain.isProtected ? ['User must be logged in as admin'] : [],
        testData: {},
        steps: [
          {
            index: 0,
            action: 'navigate',
            target: examplePath,
            selector: null,
            value: null,
            description: `Go to ${entityLower} details page`,
          },
          {
            index: 1,
            action: 'verify',
            target: 'content',
            selector: 'main, .content, [role="main"]',
            value: null,
            description: `Verify ${entityLower} details are displayed`,
            assertion: { type: 'visible', expected: true },
          },
        ],
        expectedOutcome: `${entityName} details are displayed`,
      });
    }
    
    // Delete entity
    if (listRoute) {
      cases.push({
        id: `${suiteId}-tc-${caseIndex++}`,
        name: `Delete ${entityLower}`,
        description: `Admin deletes a ${entityLower}`,
        type: 'crud-delete',
        priority: 'medium',
        prerequisites: domain.isProtected ? ['User must be logged in as admin'] : [],
        testData: {},
        steps: [
          {
            index: 0,
            action: 'navigate',
            target: listRoute.path,
            selector: null,
            value: null,
            description: `Go to ${entityLower} list page`,
          },
          {
            index: 1,
            action: 'click',
            target: 'delete-button',
            selector: 'button[aria-label*="delete"], button.delete, button.text-red-500, [data-testid*="delete"]',
            value: null,
            description: `Click delete on first ${entityLower}`,
          },
          {
            index: 2,
            action: 'verify',
            target: 'confirm-modal',
            selector: '[role="dialog"], [role="alertdialog"], .modal',
            value: null,
            description: 'Verify confirmation modal appears',
            assertion: { type: 'visible', expected: true },
          },
          {
            index: 3,
            action: 'click',
            target: 'confirm',
            selector: 'button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")',
            value: null,
            description: 'Confirm deletion',
          },
          {
            index: 4,
            action: 'verify',
            target: 'success',
            selector: '.toast, [role="status"], .alert-success',
            value: null,
            description: 'Verify success message',
            assertion: { type: 'visible', expected: true },
          },
        ],
        expectedOutcome: `${entityName} is deleted and removed from list`,
      });
    }
    
    return cases;
  }

  /**
   * Generate checkout test cases
   */
  private generateCheckoutTestCases(domain: BusinessDomain, suiteId: string): GeneratedTestCase[] {
    const cases: GeneratedTestCase[] = [];
    let caseIndex = 1;
    
    // Find cart route
    const cartRoute = domain.routes.find(r => r.path.includes('cart'));
    
    if (cartRoute) {
      // View cart
      cases.push({
        id: `${suiteId}-tc-${caseIndex++}`,
        name: 'View cart with items',
        description: 'Display items in shopping cart',
        type: 'happy-path',
        priority: 'high',
        prerequisites: ['Cart must have items'],
        testData: {},
        steps: [
          {
            index: 0,
            action: 'navigate',
            target: cartRoute.path,
            selector: null,
            value: null,
            description: 'Go to cart page',
          },
          {
            index: 1,
            action: 'verify',
            target: 'cart-items',
            selector: '.cart-items, [data-testid="cart-items"], table',
            value: null,
            description: 'Verify cart items are displayed',
            assertion: { type: 'visible', expected: true },
          },
          {
            index: 2,
            action: 'verify',
            target: 'total',
            selector: '.cart-total, .total, [data-testid="total"]',
            value: null,
            description: 'Verify cart total is displayed',
            assertion: { type: 'visible', expected: true },
          },
        ],
        expectedOutcome: 'Cart displays items with totals',
      });
      
      // Update quantity
      cases.push({
        id: `${suiteId}-tc-${caseIndex++}`,
        name: 'Update item quantity',
        description: 'Change quantity of an item in cart',
        type: 'happy-path',
        priority: 'high',
        prerequisites: ['Cart must have items'],
        testData: { quantity: '2' },
        steps: [
          {
            index: 0,
            action: 'navigate',
            target: cartRoute.path,
            selector: null,
            value: null,
            description: 'Go to cart page',
          },
          {
            index: 1,
            action: 'select',
            target: 'quantity',
            selector: 'select[name="quantity"], input[name="quantity"], [data-testid="quantity"]',
            value: '2',
            description: 'Update quantity to 2',
          },
          {
            index: 2,
            action: 'verify',
            target: 'total-updated',
            selector: '.cart-total, .total',
            value: null,
            description: 'Verify total is updated',
            assertion: { type: 'visible', expected: true },
          },
        ],
        expectedOutcome: 'Item quantity and cart total are updated',
      });
      
      // Empty cart
      cases.push({
        id: `${suiteId}-tc-${caseIndex++}`,
        name: 'View empty cart',
        description: 'Display empty cart message',
        type: 'edge-case',
        priority: 'medium',
        prerequisites: ['Cart must be empty'],
        testData: {},
        steps: [
          {
            index: 0,
            action: 'navigate',
            target: cartRoute.path,
            selector: null,
            value: null,
            description: 'Go to cart page',
          },
          {
            index: 1,
            action: 'verify',
            target: 'empty-message',
            selector: '.empty-cart, [data-testid="empty-cart"]',
            value: null,
            description: 'Verify empty cart message is displayed',
            assertion: { type: 'visible', expected: true },
          },
        ],
        expectedOutcome: 'Empty cart message is displayed',
      });
    }
    
    // Payment result pages
    const successRoute = domain.routes.find(r => r.path.includes('success'));
    if (successRoute) {
      cases.push({
        id: `${suiteId}-tc-${caseIndex++}`,
        name: 'Payment success page',
        description: 'Display payment success message',
        type: 'happy-path',
        priority: 'high',
        prerequisites: [],
        testData: {},
        steps: [
          {
            index: 0,
            action: 'navigate',
            target: successRoute.path,
            selector: null,
            value: null,
            description: 'Go to success page',
          },
          {
            index: 1,
            action: 'verify',
            target: 'success-message',
            selector: '.success, h1, [role="alert"]',
            value: null,
            description: 'Verify success message is displayed',
            assertion: { type: 'visible', expected: true },
          },
        ],
        expectedOutcome: 'Success message is displayed',
      });
    }
    
    const failureRoute = domain.routes.find(r => r.path.includes('failure') || r.path.includes('cancel'));
    if (failureRoute) {
      cases.push({
        id: `${suiteId}-tc-${caseIndex++}`,
        name: 'Payment failure page',
        description: 'Display payment failure message',
        type: 'edge-case',
        priority: 'medium',
        prerequisites: [],
        testData: {},
        steps: [
          {
            index: 0,
            action: 'navigate',
            target: failureRoute.path,
            selector: null,
            value: null,
            description: 'Go to failure page',
          },
          {
            index: 1,
            action: 'verify',
            target: 'error-message',
            selector: '.error, h1, [role="alert"]',
            value: null,
            description: 'Verify failure message is displayed',
            assertion: { type: 'visible', expected: true },
          },
        ],
        expectedOutcome: 'Failure message is displayed',
      });
    }
    
    return cases;
  }

  /**
   * Generate profile test cases
   */
  private generateProfileTestCases(domain: BusinessDomain, suiteId: string): GeneratedTestCase[] {
    const cases: GeneratedTestCase[] = [];
    let caseIndex = 1;
    
    const profileRoute = domain.routes[0];
    const profileForm = domain.forms[0];
    
    if (profileRoute) {
      // View profile
      cases.push({
        id: `${suiteId}-tc-${caseIndex++}`,
        name: 'View profile',
        description: 'Display user profile information',
        type: 'happy-path',
        priority: 'medium',
        prerequisites: ['User must be logged in'],
        testData: {},
        steps: [
          {
            index: 0,
            action: 'navigate',
            target: profileRoute.path,
            selector: null,
            value: null,
            description: 'Go to profile page',
          },
          {
            index: 1,
            action: 'verify',
            target: 'profile-info',
            selector: '.profile, main, [data-testid="profile"]',
            value: null,
            description: 'Verify profile information is displayed',
            assertion: { type: 'visible', expected: true },
          },
        ],
        expectedOutcome: 'Profile information is displayed',
      });
      
      // Edit profile
      if (profileForm) {
        cases.push({
          id: `${suiteId}-tc-${caseIndex++}`,
          name: 'Edit profile',
          description: 'Update user profile information',
          type: 'happy-path',
          priority: 'medium',
          prerequisites: ['User must be logged in'],
          testData: this.generateFormTestData(profileForm),
          steps: this.generateEditProfileSteps(profileRoute.path, profileForm),
          expectedOutcome: 'Profile is updated successfully',
        });
      }
    }
    
    return cases;
  }

  /**
   * Generate static page test cases
   */
  private generateStaticTestCases(domain: BusinessDomain, suiteId: string): GeneratedTestCase[] {
    const cases: GeneratedTestCase[] = [];
    let caseIndex = 1;
    
    for (const route of domain.routes) {
      const pageName = this.getPageNameFromRoute(route.path);
      
      cases.push({
        id: `${suiteId}-tc-${caseIndex++}`,
        name: `View ${pageName}`,
        description: `Navigate to ${pageName} and verify it loads`,
        type: 'happy-path',
        priority: 'low',
        prerequisites: route.isProtected ? ['User must be logged in'] : [],
        testData: {},
        steps: [
          {
            index: 0,
            action: 'navigate',
            target: route.isDynamic ? this.generateExamplePath(route.path, route.params) : route.path,
            selector: null,
            value: null,
            description: `Go to ${pageName}`,
          },
          {
            index: 1,
            action: 'verify',
            target: 'page-content',
            selector: 'main, .content, h1',
            value: null,
            description: 'Verify page loads correctly',
            assertion: { type: 'visible', expected: true },
          },
        ],
        expectedOutcome: `${pageName} loads and displays content`,
      });
    }
    
    return cases;
  }

  /**
   * Generate miscellaneous suite for uncovered routes
   */
  private generateMiscSuite(uncoveredRoutes: any[]): GeneratedSuite {
    const cases: GeneratedTestCase[] = uncoveredRoutes.map((route, index) => ({
      id: `suite-misc-tc-${index + 1}`,
      name: `Navigate to ${route.path}`,
      description: `Verify ${route.path} loads correctly`,
      type: 'happy-path' as const,
      priority: 'low' as const,
      prerequisites: route.isProtected ? ['User must be logged in'] : [],
      testData: {},
      steps: [
        {
          index: 0,
          action: 'navigate' as const,
          target: route.isDynamic ? this.generateExamplePath(route.path, route.params) : route.path,
          selector: null,
          value: null,
          description: `Go to ${route.path}`,
        },
        {
          index: 1,
          action: 'verify' as const,
          target: 'page',
          selector: 'body',
          value: null,
          description: 'Verify page loads',
          assertion: { type: 'visible' as const, expected: true },
        },
      ],
      expectedOutcome: 'Page loads without errors',
    }));
    
    return {
      id: 'suite-misc',
      name: 'Miscellaneous Pages',
      description: 'Navigation tests for uncategorized pages',
      category: 'other',
      priority: 'low',
      tags: ['misc', 'navigation'],
      prerequisites: [],
      testCases: cases,
      coverage: {
        routes: uncoveredRoutes.map(r => r.path),
        forms: [],
        entities: [],
      },
    };
  }

  // ==================== STEP GENERATION HELPERS ====================

  private generateLoginSteps(route: string, form: FormWithMeta, expectFailure: boolean = false): GeneratedStep[] {
    const steps: GeneratedStep[] = [
      {
        index: 0,
        action: 'navigate',
        target: route,
        selector: null,
        value: null,
        description: 'Go to login page',
      },
    ];
    
    let stepIndex = 1;
    
    // Fill form fields
    for (const field of form.fields) {
      steps.push({
        index: stepIndex++,
        action: 'fill',
        target: field.name,
        selector: field.selector,
        value: field.testValue,
        description: `Enter ${field.label || field.name}`,
      });
    }
    
    // Submit
    steps.push({
      index: stepIndex++,
      action: 'click',
      target: 'submit',
      selector: form.submitSelector,
      value: null,
      description: 'Submit login form',
    });
    
    // Verify outcome
    if (expectFailure) {
      steps.push({
        index: stepIndex++,
        action: 'verify',
        target: 'error',
        selector: '.error, [role="alert"], .text-red-500',
        value: null,
        description: 'Verify error message is displayed',
        assertion: { type: 'visible', expected: true },
      });
    } else {
      steps.push({
        index: stepIndex++,
        action: 'verify',
        target: 'url',
        selector: null,
        value: null,
        description: 'Verify redirected to home/dashboard',
        assertion: { type: 'url', expected: '/' },
      });
    }
    
    return steps;
  }

  private generateRegisterSteps(route: string, form: FormWithMeta): GeneratedStep[] {
    const steps: GeneratedStep[] = [
      {
        index: 0,
        action: 'navigate',
        target: route,
        selector: null,
        value: null,
        description: 'Go to registration page',
      },
    ];
    
    let stepIndex = 1;
    
    for (const field of form.fields) {
      steps.push({
        index: stepIndex++,
        action: 'fill',
        target: field.name,
        selector: field.selector,
        value: field.testValue,
        description: `Enter ${field.label || field.name}`,
      });
    }
    
    steps.push({
      index: stepIndex++,
      action: 'click',
      target: 'submit',
      selector: form.submitSelector,
      value: null,
      description: 'Submit registration form',
    });
    
    steps.push({
      index: stepIndex++,
      action: 'verify',
      target: 'success',
      selector: '.success, [role="status"], .toast',
      value: null,
      description: 'Verify registration success',
      assertion: { type: 'visible', expected: true },
    });
    
    return steps;
  }

  private generatePasswordResetSteps(route: string, form?: FormWithMeta): GeneratedStep[] {
    const steps: GeneratedStep[] = [
      {
        index: 0,
        action: 'navigate',
        target: route,
        selector: null,
        value: null,
        description: 'Go to password reset page',
      },
    ];
    
    if (form) {
      let stepIndex = 1;
      for (const field of form.fields) {
        steps.push({
          index: stepIndex++,
          action: 'fill',
          target: field.name,
          selector: field.selector,
          value: field.testValue,
          description: `Enter ${field.label || field.name}`,
        });
      }
      
      steps.push({
        index: stepIndex++,
        action: 'click',
        target: 'submit',
        selector: form.submitSelector,
        value: null,
        description: 'Submit password reset request',
      });
    } else {
      steps.push({
        index: 1,
        action: 'fill',
        target: 'email',
        selector: 'input[name="email"], input[type="email"]',
        value: 'user@example.com',
        description: 'Enter email address',
      });
      
      steps.push({
        index: 2,
        action: 'click',
        target: 'submit',
        selector: 'button[type="submit"]',
        value: null,
        description: 'Submit password reset request',
      });
    }
    
    steps.push({
      index: steps.length,
      action: 'verify',
      target: 'success-message',
      selector: '.success, [role="status"], p',
      value: null,
      description: 'Verify success message about email sent',
      assertion: { type: 'visible', expected: true },
    });
    
    return steps;
  }

  private generateValidationSteps(route: string, form: FormWithMeta, validationType: string): GeneratedStep[] {
    const steps: GeneratedStep[] = [
      {
        index: 0,
        action: 'navigate',
        target: route,
        selector: null,
        value: null,
        description: 'Go to form page',
      },
    ];
    
    let stepIndex = 1;
    
    if (validationType === 'empty') {
      // Just click submit without filling
      steps.push({
        index: stepIndex++,
        action: 'click',
        target: 'submit',
        selector: form.submitSelector,
        value: null,
        description: 'Submit empty form',
      });
    } else if (validationType === 'invalid-email') {
      const emailField = form.fields.find(f => f.name.toLowerCase().includes('email'));
      if (emailField) {
        steps.push({
          index: stepIndex++,
          action: 'fill',
          target: emailField.name,
          selector: emailField.selector,
          value: 'invalid-email',
          description: 'Enter invalid email format',
        });
      }
      
      steps.push({
        index: stepIndex++,
        action: 'click',
        target: 'submit',
        selector: form.submitSelector,
        value: null,
        description: 'Submit form with invalid data',
      });
    }
    
    steps.push({
      index: stepIndex++,
      action: 'verify',
      target: 'validation-error',
      selector: '.error, [role="alert"], .text-red-500, .invalid-feedback',
      value: null,
      description: 'Verify validation error is displayed',
      assertion: { type: 'visible', expected: true },
    });
    
    return steps;
  }

  private generateCreateSteps(listRoute: string, form: FormWithMeta, entityName: string): GeneratedStep[] {
    const steps: GeneratedStep[] = [
      {
        index: 0,
        action: 'navigate',
        target: listRoute,
        selector: null,
        value: null,
        description: `Go to ${entityName.toLowerCase()} list page`,
      },
      {
        index: 1,
        action: 'click',
        target: 'add-button',
        selector: `button:has-text("Add"), button:has-text("Create"), button:has-text("New"), [data-testid*="add"], [data-testid*="create"]`,
        value: null,
        description: `Click Add ${entityName} button`,
      },
      {
        index: 2,
        action: 'verify',
        target: 'form-modal',
        selector: '[role="dialog"], .modal, form',
        value: null,
        description: 'Verify form/modal is displayed',
        assertion: { type: 'visible', expected: true },
      },
    ];
    
    let stepIndex = 3;
    
    // Fill form fields
    for (const field of form.fields) {
      const action = field.type === 'select' ? 'select' : 'fill';
      steps.push({
        index: stepIndex++,
        action,
        target: field.name,
        selector: field.selector,
        value: field.testValue,
        description: `Enter ${field.label || field.name}`,
      });
    }
    
    // Submit
    steps.push({
      index: stepIndex++,
      action: 'click',
      target: 'submit',
      selector: form.submitSelector,
      value: null,
      description: 'Submit form',
    });
    
    // Verify success
    steps.push({
      index: stepIndex++,
      action: 'verify',
      target: 'success',
      selector: '.toast, [role="status"], .alert-success, .bg-green',
      value: null,
      description: 'Verify success message',
      assertion: { type: 'visible', expected: true },
    });
    
    return steps;
  }

  private generateCreateValidationSteps(listRoute: string, form: FormWithMeta, entityName: string): GeneratedStep[] {
    return [
      {
        index: 0,
        action: 'navigate',
        target: listRoute,
        selector: null,
        value: null,
        description: `Go to ${entityName.toLowerCase()} list page`,
      },
      {
        index: 1,
        action: 'click',
        target: 'add-button',
        selector: `button:has-text("Add"), button:has-text("Create"), button:has-text("New")`,
        value: null,
        description: `Click Add ${entityName} button`,
      },
      {
        index: 2,
        action: 'click',
        target: 'submit',
        selector: form.submitSelector,
        value: null,
        description: 'Submit empty form',
      },
      {
        index: 3,
        action: 'verify',
        target: 'validation-errors',
        selector: '.error, [role="alert"], .text-red-500, .invalid-feedback',
        value: null,
        description: 'Verify validation errors are displayed',
        assertion: { type: 'visible', expected: true },
      },
    ];
  }

  private generateEditProfileSteps(route: string, form: FormWithMeta): GeneratedStep[] {
    const steps: GeneratedStep[] = [
      {
        index: 0,
        action: 'navigate',
        target: route,
        selector: null,
        value: null,
        description: 'Go to profile page',
      },
      {
        index: 1,
        action: 'click',
        target: 'edit-button',
        selector: 'button:has-text("Edit"), [data-testid*="edit"]',
        value: null,
        description: 'Click edit button',
      },
    ];
    
    let stepIndex = 2;
    
    // Update a field
    const editableField = form.fields.find(f => !f.name.toLowerCase().includes('email'));
    if (editableField) {
      steps.push({
        index: stepIndex++,
        action: 'fill',
        target: editableField.name,
        selector: editableField.selector,
        value: 'Updated Value',
        description: `Update ${editableField.label || editableField.name}`,
      });
    }
    
    steps.push({
      index: stepIndex++,
      action: 'click',
      target: 'save',
      selector: form.submitSelector,
      value: null,
      description: 'Save changes',
    });
    
    steps.push({
      index: stepIndex++,
      action: 'verify',
      target: 'success',
      selector: '.toast, [role="status"], .success',
      value: null,
      description: 'Verify profile updated successfully',
      assertion: { type: 'visible', expected: true },
    });
    
    return steps;
  }

  // ==================== UTILITY METHODS ====================

  private generateSelector(fieldName: string, fieldType?: string): string {
    const type = fieldType?.toLowerCase() || 'text';
    
    if (type === 'textarea' || fieldName.toLowerCase().includes('description') || fieldName.toLowerCase().includes('content')) {
      return `textarea[name="${fieldName}"]`;
    }
    if (type === 'select' || fieldName.toLowerCase().includes('category') || fieldName.toLowerCase().includes('status')) {
      return `select[name="${fieldName}"]`;
    }
    
    return `input[name="${fieldName}"]`;
  }

  private generateTestValue(fieldName: string, fieldType?: string): string {
    const nameLower = fieldName.toLowerCase();
    
    // Email
    if (nameLower.includes('email')) return 'testuser@example.com';
    
    // Password
    if (nameLower.includes('password')) return 'SecureTestPass123!';
    
    // Name fields
    if (nameLower === 'name' || nameLower.includes('firstname') || nameLower.includes('first_name')) return 'John';
    if (nameLower.includes('lastname') || nameLower.includes('last_name')) return 'Doe';
    if (nameLower.includes('fullname') || nameLower.includes('full_name')) return 'John Doe';
    if (nameLower.includes('username')) return 'johndoe';
    
    // Contact
    if (nameLower.includes('phone') || nameLower.includes('tel')) return '+1-555-123-4567';
    if (nameLower.includes('address')) return '123 Test Street';
    if (nameLower.includes('city')) return 'New York';
    if (nameLower.includes('zip') || nameLower.includes('postal')) return '10001';
    if (nameLower.includes('country')) return 'United States';
    
    // Business
    if (nameLower.includes('title')) return 'Test Item Title';
    if (nameLower.includes('description') || nameLower.includes('content')) return 'This is test description content for validation.';
    if (nameLower.includes('price') || nameLower.includes('amount') || nameLower.includes('cost')) return '99.99';
    if (nameLower.includes('quantity') || nameLower.includes('count') || nameLower.includes('stock')) return '100';
    if (nameLower.includes('sku') || nameLower.includes('code')) return 'TEST-SKU-001';
    if (nameLower.includes('category')) return 'test-category';
    if (nameLower.includes('url') || nameLower.includes('website') || nameLower.includes('link')) return 'https://example.com';
    
    // Dates
    if (fieldType === 'date' || nameLower.includes('date')) return '2024-06-15';
    if (fieldType === 'time' || nameLower.includes('time')) return '14:30';
    
    // Numbers
    if (fieldType === 'number') return '42';
    
    // Default
    return 'Test Value';
  }

  private generateAuthTestData(form: FormWithMeta): Record<string, any> {
    const data: Record<string, any> = {};
    
    for (const field of form.fields) {
      data[field.name] = field.testValue;
    }
    
    return data;
  }

  private generateRegisterTestData(form: FormWithMeta): Record<string, any> {
    const data: Record<string, any> = {};
    const timestamp = Date.now();
    
    for (const field of form.fields) {
      if (field.name.toLowerCase().includes('email')) {
        data[field.name] = `testuser${timestamp}@example.com`;
      } else {
        data[field.name] = field.testValue;
      }
    }
    
    return data;
  }

  private generateFormTestData(form: FormWithMeta): Record<string, any> {
    const data: Record<string, any> = {};
    
    for (const field of form.fields) {
      data[field.name] = field.testValue;
    }
    
    return data;
  }

  private generateExamplePath(path: string, params?: string[]): string {
    let result = path;
    
    const replacements: Record<string, string> = {
      'id': '123',
      'slug': 'test-item',
      'productId': 'prod-123',
      'userId': 'user-123',
      'orderId': 'order-123',
      'token': 'test-token-abc123',
      'logId': 'log-123',
      'category': 'test-category',
    };
    
    if (params) {
      for (const param of params) {
        const value = replacements[param] || `test-${param}`;
        result = result.replace(`[${param}]`, value);
      }
    }
    
    // Handle remaining [xxx] patterns
    result = result.replace(/\[([^\]]+)\]/g, (_, p) => replacements[p] || `test-${p}`);
    
    return result;
  }

  private getPageNameFromRoute(path: string): string {
    if (path === '/' || path === '') return 'Home';
    
    const segments = path.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    
    // Handle dynamic segments
    if (lastSegment.startsWith('[')) {
      return segments.length > 1 
        ? this.capitalizeFirst(segments[segments.length - 2]) + ' Detail'
        : 'Detail Page';
    }
    
    return this.capitalizeFirst(lastSegment);
  }

  private generateSuiteDescription(domain: BusinessDomain): string {
    switch (domain.domainType) {
      case 'auth':
        return 'User authentication and authorization workflows';
      case 'checkout':
        return 'Shopping cart and checkout process';
      case 'crud':
        return `CRUD operations for ${domain.entityName || domain.name}`;
      case 'profile':
        return 'User profile management';
      case 'static':
        return 'Static page navigation and display';
      default:
        return `${domain.name} functionality`;
    }
  }

  private capitalizeFirst(str: string): string {
    if (!str) return str;
    return str.split('-').map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');
  }

  private humanize(str: string): string {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, s => s.toUpperCase())
      .trim();
  }
}

import { Injectable } from '@nestjs/common';
import { AnalysisPayload } from '../types/analysis-payload.types';

/**
 * Universal Test Builder
 * 
 * Generates test suites for ANY application without hardcoded strings.
 * Works by analyzing STRUCTURE, not specific keywords.
 * 
 * Principles:
 * 1. Routes with forms -> form submission tests
 * 2. Routes with /:param -> detail page tests
 * 3. Routes grouped by common prefix -> suite
 * 4. Forms define the test structure
 */

// Output types
export interface UniversalSuite {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
  testCases: UniversalTestCase[];
  coverage: {
    routes: string[];
    forms: string[];
    entities: string[];
  };
}

export interface UniversalTestCase {
  id: string;
  name: string;
  description: string;
  type: 'happy-path' | 'validation' | 'security' | 'edge-case';
  priority: 'critical' | 'high' | 'medium' | 'low';
  steps: UniversalStep[];
  estimatedDuration: number;
}

export interface UniversalStep {
  index: number;
  action: 'navigate' | 'fill' | 'click' | 'select' | 'verify' | 'wait';
  target: string;
  selector: string | null;
  value: string | null;
  description: string;
}

// Internal analysis types
interface RouteAnalysis {
  path: string;
  segments: string[];
  isProtected: boolean;
  isDynamic: boolean;
  params: string[];
  hasForm: boolean;
  form: FormAnalysis | null;
  routePattern: 'root' | 'list' | 'detail' | 'action' | 'static';
  groupKey: string;
}

interface FormAnalysis {
  id: string;
  name: string;
  fields: FieldAnalysis[];
  submitSelector: string;
  hasValidation: boolean;
  formPurpose: 'auth' | 'data-entry' | 'search' | 'settings' | 'other';
}

interface FieldAnalysis {
  name: string;
  type: string;
  selector: string;
  isRequired: boolean;
  label: string;
  testValue: string;
}

interface RouteGroup {
  key: string;
  displayName: string;
  routes: RouteAnalysis[];
  forms: FormAnalysis[];
  hasAuth: boolean;
  hasCrud: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

@Injectable()
export class UniversalTestBuilderService {

  /**
   * Main entry: Build test suites for ANY application
   */
  build(payload: AnalysisPayload): UniversalSuite[] {
    console.log('\n🌐 Universal Test Builder: Starting...');
    
    // Step 1: Analyze all routes
    const analyzedRoutes = this.analyzeRoutes(payload);
    console.log(`   Analyzed ${analyzedRoutes.length} routes`);
    
    // Step 2: Group routes intelligently
    const groups = this.groupRoutes(analyzedRoutes);
    console.log(`   Created ${groups.length} route groups`);
    
    // Step 3: Generate suite for each group
    const suites: UniversalSuite[] = [];
    for (const group of groups) {
      const suite = this.generateSuiteForGroup(group);
      if (suite.testCases.length > 0) {
        suites.push(suite);
      }
    }
    
    // Step 4: Ensure coverage
    const coveredRoutes = new Set(suites.flatMap(s => s.coverage.routes));
    const totalRoutes = payload.routes.length;
    
    // Log stats
    const totalCases = suites.reduce((sum, s) => sum + s.testCases.length, 0);
    const totalSteps = suites.reduce((sum, s) => 
      sum + s.testCases.reduce((cs, c) => cs + c.steps.length, 0), 0);
    
    console.log(`✅ Generated ${suites.length} suites, ${totalCases} cases, ${totalSteps} steps`);
    console.log(`   Route coverage: ${coveredRoutes.size}/${totalRoutes}`);
    
    return suites;
  }

  /**
   * Analyze each route without any hardcoded keywords
   */
  private analyzeRoutes(payload: AnalysisPayload): RouteAnalysis[] {
    const formsByRoute = new Map<string, any>();
    
    // Index forms by route
    for (const form of payload.forms) {
      if (form.route) {
        formsByRoute.set(form.route, form);
      }
    }
    
    return payload.routes.map(route => {
      const segments = route.path.split('/').filter(Boolean);
      const form = formsByRoute.get(route.path);
      
      return {
        path: route.path,
        segments,
        isProtected: route.isProtected,
        isDynamic: route.isDynamic,
        params: route.params,
        hasForm: !!form,
        form: form ? this.analyzeForm(form) : null,
        routePattern: this.detectRoutePattern(route.path, segments, route.isDynamic),
        groupKey: this.computeGroupKey(segments),
      };
    });
  }

  /**
   * Detect route pattern based on structure, not keywords
   */
  private detectRoutePattern(
    path: string, 
    segments: string[], 
    isDynamic: boolean
  ): RouteAnalysis['routePattern'] {
    // Root path
    if (path === '/' || segments.length === 0) {
      return 'root';
    }
    
    // Has dynamic parameter -> detail page
    if (isDynamic) {
      return 'detail';
    }
    
    // Ends with action-like suffix (new, create, edit, etc.)
    const lastSegment = segments[segments.length - 1]?.toLowerCase();
    if (this.isActionSegment(lastSegment)) {
      return 'action';
    }
    
    // Has child routes with dynamic params -> likely a list
    // This is determined later when we have full context
    
    // Default: static page
    return 'static';
  }

  /**
   * Check if segment looks like an action (without hardcoding specific words)
   */
  private isActionSegment(segment: string): boolean {
    if (!segment) return false;
    
    // Action segments are typically short and don't contain hyphens
    // Examples: new, create, edit, add, delete
    // Non-actions: user-settings, my-account, about-us
    return segment.length <= 10 && !segment.includes('-') && 
           !segment.startsWith('[') && /^[a-z]+$/.test(segment);
  }

  /**
   * Compute group key from route segments
   */
  private computeGroupKey(segments: string[]): string {
    if (segments.length === 0) return 'home';
    
    // Filter out dynamic segments
    const staticSegments = segments.filter(s => !s.startsWith('[') && !s.startsWith(':'));
    
    if (staticSegments.length === 0) return 'dynamic';
    
    // Use first 1-2 static segments as group key
    return staticSegments.slice(0, 2).join('/');
  }

  /**
   * Analyze form without assuming specific field purposes
   */
  private analyzeForm(form: any): FormAnalysis {
    const fields: FieldAnalysis[] = (form.fields || []).map((f: any) => ({
      name: f.name,
      type: f.type || 'text',
      selector: f.selector || `input[name="${f.name}"]`,
      isRequired: f.isRequired ?? false,
      label: f.label || this.humanize(f.name),
      testValue: this.generateTestValue(f.name, f.type),
    }));
    
    // Detect form purpose by analyzing field names
    const formPurpose = this.detectFormPurpose(fields);
    
    return {
      id: form.id,
      name: form.name,
      fields,
      submitSelector: form.submitButton?.selector || 'button[type="submit"]',
      hasValidation: form.hasValidation ?? fields.some(f => f.isRequired),
      formPurpose,
    };
  }

  /**
   * Detect form purpose by analyzing fields, not form name
   */
  private detectFormPurpose(fields: FieldAnalysis[]): FormAnalysis['formPurpose'] {
    const fieldNames = fields.map(f => f.name.toLowerCase());
    const fieldTypes = fields.map(f => f.type.toLowerCase());
    
    // Auth form: has password field
    if (fieldTypes.includes('password') || fieldNames.some(n => n.includes('password'))) {
      return 'auth';
    }
    
    // Search form: single field or has "search" in name
    if (fields.length === 1 || fieldNames.some(n => n.includes('search') || n.includes('query'))) {
      return 'search';
    }
    
    // Settings form: has toggle/checkbox fields
    if (fieldTypes.some(t => t === 'checkbox' || t === 'toggle' || t === 'switch')) {
      return 'settings';
    }
    
    // Default: data entry
    return 'data-entry';
  }

  /**
   * Group routes intelligently
   */
  private groupRoutes(routes: RouteAnalysis[]): RouteGroup[] {
    const groupMap = new Map<string, RouteAnalysis[]>();
    
    for (const route of routes) {
      const key = route.groupKey;
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(route);
    }
    
    const groups: RouteGroup[] = [];
    
    for (const [key, groupRoutes] of groupMap) {
      // Collect all forms in this group
      const forms = groupRoutes
        .filter(r => r.form)
        .map(r => r.form!);
      
      // Detect if this group has auth functionality
      const hasAuth = forms.some(f => f.formPurpose === 'auth');
      
      // Detect if this group has CRUD pattern (list + detail routes)
      const hasList = groupRoutes.some(r => r.routePattern === 'static' || r.routePattern === 'list');
      const hasDetail = groupRoutes.some(r => r.routePattern === 'detail');
      const hasAction = groupRoutes.some(r => r.routePattern === 'action');
      const hasCrud = (hasList && hasDetail) || hasAction;
      
      // Determine priority
      let priority: RouteGroup['priority'] = 'medium';
      if (hasAuth) priority = 'critical';
      else if (hasCrud) priority = 'high';
      else if (groupRoutes.some(r => r.isProtected)) priority = 'high';
      
      groups.push({
        key,
        displayName: this.formatDisplayName(key),
        routes: groupRoutes,
        forms,
        hasAuth,
        hasCrud,
        priority,
      });
    }
    
    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return groups.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  /**
   * Format display name from group key
   */
  private formatDisplayName(key: string): string {
    if (key === 'home') return 'Home';
    if (key === 'dynamic') return 'Dynamic Pages';
    
    // Split by / and capitalize each part
    return key
      .split('/')
      .map(part => this.humanize(part))
      .join(' - ');
  }

  /**
   * Generate suite for a route group
   */
  private generateSuiteForGroup(group: RouteGroup): UniversalSuite {
    const suiteId = `suite-${group.key.replace(/\//g, '-').toLowerCase()}`;
    const testCases: UniversalTestCase[] = [];
    let caseIndex = 1;
    
    // 1. Generate tests for each form (most important)
    for (const form of group.forms) {
      const formRoute = group.routes.find(r => r.form?.id === form.id);
      if (!formRoute) continue;
      
      // Happy path: fill and submit form
      testCases.push(this.generateFormSubmitTest(
        `${suiteId}-tc-${caseIndex++}`,
        form,
        formRoute.path,
        group.priority
      ));
      
      // Validation test if form has validation
      if (form.hasValidation) {
        testCases.push(this.generateFormValidationTest(
          `${suiteId}-tc-${caseIndex++}`,
          form,
          formRoute.path
        ));
      }
    }
    
    // 2. Generate navigation tests for routes without forms
    for (const route of group.routes) {
      if (route.hasForm) continue; // Already covered above
      
      testCases.push(this.generateNavigationTest(
        `${suiteId}-tc-${caseIndex++}`,
        route,
        group.displayName
      ));
    }
    
    // Determine category
    let category = 'other';
    if (group.hasAuth) category = 'auth';
    else if (group.hasCrud) category = 'crud';
    else if (group.key === 'home') category = 'static';
    else if (group.routes.every(r => r.routePattern === 'static')) category = 'static';
    
    return {
      id: suiteId,
      name: group.displayName,
      description: this.generateSuiteDescription(group),
      category,
      priority: group.priority,
      tags: this.generateTags(group),
      testCases,
      coverage: {
        routes: group.routes.map(r => r.path),
        forms: group.forms.map(f => f.name),
        entities: this.extractEntities(group),
      },
    };
  }

  /**
   * Generate form submission test
   */
  private generateFormSubmitTest(
    caseId: string,
    form: FormAnalysis,
    routePath: string,
    groupPriority: RouteGroup['priority']
  ): UniversalTestCase {
    const steps: UniversalStep[] = [];
    let stepIndex = 0;
    
    // Navigate to form
    steps.push({
      index: stepIndex++,
      action: 'navigate',
      target: routePath,
      selector: null,
      value: null,
      description: `Go to ${this.humanize(routePath)}`,
    });
    
    // Fill each field
    for (const field of form.fields) {
      steps.push({
        index: stepIndex++,
        action: 'fill',
        target: field.name,
        selector: field.selector,
        value: field.testValue,
        description: `Enter ${field.label}`,
      });
    }
    
    // Submit form
    steps.push({
      index: stepIndex++,
      action: 'click',
      target: 'submit',
      selector: form.submitSelector,
      value: null,
      description: 'Submit form',
    });
    
    // Verify success (generic - works for any form)
    steps.push({
      index: stepIndex++,
      action: 'verify',
      target: form.formPurpose === 'auth' ? 'url' : 'success-indicator',
      selector: form.formPurpose === 'auth' ? null : '.success, [role="status"], .toast, .alert-success, .bg-green',
      value: null,
      description: 'Verify successful submission',
    });
    
    // Determine test name based on form purpose
    let testName = `Submit ${form.name}`;
    if (form.formPurpose === 'auth' && form.fields.some(f => f.name.toLowerCase().includes('email'))) {
      const hasPassword = form.fields.some(f => f.type === 'password');
      const hasConfirmPassword = form.fields.some(f => f.name.toLowerCase().includes('confirm'));
      if (hasConfirmPassword) {
        testName = 'Register new account';
      } else if (hasPassword) {
        testName = 'Login with credentials';
      }
    }
    
    return {
      id: caseId,
      name: testName,
      description: `Successfully submit ${form.name}`,
      type: 'happy-path',
      priority: form.formPurpose === 'auth' ? 'critical' : groupPriority,
      steps,
      estimatedDuration: 5 + (form.fields.length * 5),
    };
  }

  /**
   * Generate form validation test
   */
  private generateFormValidationTest(
    caseId: string,
    form: FormAnalysis,
    routePath: string
  ): UniversalTestCase {
    const steps: UniversalStep[] = [
      {
        index: 0,
        action: 'navigate',
        target: routePath,
        selector: null,
        value: null,
        description: `Go to ${this.humanize(routePath)}`,
      },
      {
        index: 1,
        action: 'click',
        target: 'submit',
        selector: form.submitSelector,
        value: null,
        description: 'Submit empty form',
      },
      {
        index: 2,
        action: 'verify',
        target: 'validation-error',
        selector: '.error, [role="alert"], .text-red-500, .invalid-feedback, .field-error',
        value: null,
        description: 'Verify validation error is displayed',
      },
    ];
    
    return {
      id: caseId,
      name: `${form.name} - validation`,
      description: 'Show validation errors for empty/invalid submission',
      type: 'validation',
      priority: 'high',
      steps,
      estimatedDuration: 15,
    };
  }

  /**
   * Generate simple navigation test for routes without forms
   */
  private generateNavigationTest(
    caseId: string,
    route: RouteAnalysis,
    groupName: string
  ): UniversalTestCase {
    // For dynamic routes, use a placeholder value
    let targetPath = route.path;
    if (route.isDynamic) {
      targetPath = route.path.replace(/\[([^\]]+)\]/g, 'test-$1').replace(/:(\w+)/g, 'test-$1');
    }
    
    // Determine what to verify based on route pattern
    let verifySelector = 'main, .content, h1';
    let verifyDescription = 'Verify page loads correctly';
    
    if (route.routePattern === 'detail') {
      verifySelector = 'main, .detail, .content, article';
      verifyDescription = 'Verify detail content is displayed';
    }
    
    const pageName = this.extractPageName(route.path);
    
    return {
      id: caseId,
      name: `View ${pageName}`,
      description: `Navigate to ${pageName} and verify it loads`,
      type: 'happy-path',
      priority: route.isProtected ? 'medium' : 'low',
      steps: [
        {
          index: 0,
          action: 'navigate',
          target: targetPath,
          selector: null,
          value: null,
          description: `Go to ${pageName}`,
        },
        {
          index: 1,
          action: 'verify',
          target: 'page-content',
          selector: verifySelector,
          value: null,
          description: verifyDescription,
        },
      ],
      estimatedDuration: 10,
    };
  }

  /**
   * Extract page name from path
   */
  private extractPageName(path: string): string {
    if (path === '/') return 'Home';
    
    const segments = path.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    
    if (!lastSegment) return 'Page';
    
    // If dynamic, use the segment before it
    if (lastSegment.startsWith('[') || lastSegment.startsWith(':')) {
      const prevSegment = segments[segments.length - 2];
      if (prevSegment) {
        return this.humanize(prevSegment) + ' Details';
      }
    }
    
    return this.humanize(lastSegment);
  }

  /**
   * Generate suite description
   */
  private generateSuiteDescription(group: RouteGroup): string {
    if (group.hasAuth) {
      return 'User authentication and authorization workflows';
    }
    if (group.hasCrud) {
      return `${group.displayName} management and operations`;
    }
    if (group.forms.length > 0) {
      return `${group.displayName} forms and submissions`;
    }
    return `${group.displayName} page navigation and display`;
  }

  /**
   * Generate tags for suite
   */
  private generateTags(group: RouteGroup): string[] {
    const tags: string[] = [group.key.replace(/\//g, '-')];
    
    if (group.hasAuth) tags.push('authentication');
    if (group.hasCrud) tags.push('crud');
    if (group.routes.some(r => r.isProtected)) tags.push('protected');
    if (group.forms.length > 0) tags.push('forms');
    
    return tags;
  }

  /**
   * Extract entity names from group
   */
  private extractEntities(group: RouteGroup): string[] {
    const entities: string[] = [];
    
    // Use group key as potential entity if it looks like a noun
    if (group.hasCrud && group.key !== 'home') {
      const entityName = this.humanize(group.key.split('/').pop() || group.key);
      entities.push(entityName);
    }
    
    return entities;
  }

  // Helper methods
  
  private humanize(str: string): string {
    return str
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim();
  }

  private generateTestValue(fieldName: string, fieldType: string): string {
    const nameLower = fieldName.toLowerCase();
    const typeLower = (fieldType || 'text').toLowerCase();
    
    // Based on field type
    if (typeLower === 'email' || nameLower.includes('email')) {
      return 'testuser@example.com';
    }
    if (typeLower === 'password' || nameLower.includes('password')) {
      return 'SecureTestPass123!';
    }
    if (typeLower === 'tel' || typeLower === 'phone' || nameLower.includes('phone')) {
      return '+1234567890';
    }
    if (typeLower === 'number' || nameLower.includes('amount') || nameLower.includes('price')) {
      return '100';
    }
    if (typeLower === 'date' || nameLower.includes('date')) {
      return '2024-06-15';
    }
    if (typeLower === 'url' || nameLower.includes('url') || nameLower.includes('website')) {
      return 'https://example.com';
    }
    
    // Based on common field names
    if (nameLower.includes('name') || nameLower.includes('first')) {
      return 'John';
    }
    if (nameLower.includes('last')) {
      return 'Doe';
    }
    if (nameLower.includes('description') || nameLower.includes('comment') || nameLower.includes('message')) {
      return 'This is test content for validation.';
    }
    if (nameLower.includes('address')) {
      return '123 Test Street';
    }
    if (nameLower.includes('city')) {
      return 'Test City';
    }
    if (nameLower.includes('zip') || nameLower.includes('postal')) {
      return '12345';
    }
    
    // Default
    return 'Test Value';
  }
}

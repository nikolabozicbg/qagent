import { Injectable, Logger } from '@nestjs/common';
import {
  ComponentAnalysis,
  AuthBoundary,
  CRUDEntity,
  WorkflowPattern,
  APICall,
  RouteInfo,
} from './types/intelligence.types';
import {
  DetectedPattern,
  AuthPattern,
  CRUDPattern,
  WorkflowPattern as WorkflowPatternType,
  PatternSignature,
  PatternIndicator,
} from './types/patterns.types';

@Injectable()
export class PatternRecognizerService {
  private readonly logger = new Logger(PatternRecognizerService.name);

  /**
   * Detect all patterns in the codebase
   */
  detectPatterns(
    components: ComponentAnalysis[],
    routes: RouteInfo[],
    apiCalls: APICall[],
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Detect auth patterns
    patterns.push(...this.detectAuthPatterns(components, routes, apiCalls));

    // Detect CRUD patterns
    patterns.push(...this.detectCRUDPatterns(components, routes, apiCalls));

    // Detect workflow patterns
    patterns.push(...this.detectWorkflowPatterns(components, routes));

    return patterns;
  }

  /**
   * Detect authentication patterns
   */
  private detectAuthPatterns(
    components: ComponentAnalysis[],
    routes: RouteInfo[],
    apiCalls: APICall[],
  ): AuthPattern[] {
    const patterns: AuthPattern[] = [];

    // Find login patterns
    const loginComponents = components.filter(c => {
      const name = c.name.toLowerCase();
      const hasLoginForm = c.jsx.forms.some(f =>
        f.fields.some(field => field.name.includes('password') || field.name.includes('email') || field.name.includes('username'))
      );
      return (name.includes('login') || name.includes('signin')) && hasLoginForm;
    });

    for (const comp of loginComponents) {
      const loginAPIs = apiCalls.filter(api =>
        api.usedIn === comp.name && (api.endpoint.includes('login') || api.endpoint.includes('auth'))
      );

      patterns.push({
        type: 'auth-login',
        confidence: 0.9,
        components: [comp.name],
        routes: routes.filter(r => r.component === comp.name).map(r => r.path),
        apis: loginAPIs.map(api => api.endpoint),
        category: 'authentication',
        formFields: comp.jsx.forms[0]?.fields.map(f => f.name) || [],
        metadata: {
          hasPasswordField: comp.jsx.forms[0]?.fields.some(f => f.type === 'password'),
        },
      });
    }

    // Find signup patterns
    const signupComponents = components.filter(c => {
      const name = c.name.toLowerCase();
      return name.includes('signup') || name.includes('register');
    });

    for (const comp of signupComponents) {
      const signupAPIs = apiCalls.filter(api =>
        api.usedIn === comp.name && (api.endpoint.includes('register') || api.endpoint.includes('signup'))
      );

      patterns.push({
        type: 'auth-signup',
        confidence: 0.85,
        components: [comp.name],
        routes: routes.filter(r => r.component === comp.name).map(r => r.path),
        apis: signupAPIs.map(api => api.endpoint),
        category: 'authentication',
        formFields: comp.jsx.forms[0]?.fields.map(f => f.name) || [],
        metadata: {},
      });
    }

    // Find protected routes
    const protectedRoutes = routes.filter(r => r.isProtected);
    if (protectedRoutes.length > 0) {
      patterns.push({
        type: 'auth-protected',
        confidence: 0.95,
        components: protectedRoutes.map(r => r.component),
        routes: protectedRoutes.map(r => r.path),
        apis: [],
        category: 'authentication',
        metadata: {
          protectedCount: protectedRoutes.length,
        },
      });
    }

    return patterns;
  }

  /**
   * Detect CRUD patterns
   */
  private detectCRUDPatterns(
    components: ComponentAnalysis[],
    routes: RouteInfo[],
    apiCalls: APICall[],
  ): CRUDPattern[] {
    const patterns: CRUDPattern[] = [];

    // Group API calls by entity (heuristic: similar endpoint bases)
    const entityGroups = this.groupAPIsByEntity(apiCalls);

    for (const [entityName, apis] of Object.entries(entityGroups)) {
      const listAPI = apis.find(api => api.method === 'GET' && !api.endpoint.includes(':'));
      const getAPI = apis.find(api => api.method === 'GET' && api.endpoint.includes(':'));
      const createAPI = apis.find(api => api.method === 'POST');
      const updateAPI = apis.find(api => api.method === 'PUT' || api.method === 'PATCH');
      const deleteAPI = apis.find(api => api.method === 'DELETE');

      const crudOperations = [listAPI, getAPI, createAPI, updateAPI, deleteAPI].filter(Boolean);

      if (crudOperations.length >= 2) {
        // Find related routes
        const relatedRoutes = routes.filter(r =>
          r.path.toLowerCase().includes(entityName.toLowerCase())
        );

        // Find related components
        const relatedComponents = components.filter(c =>
          c.name.toLowerCase().includes(entityName.toLowerCase())
        );

        patterns.push({
          type: 'crud-list',
          confidence: crudOperations.length / 5,
          components: relatedComponents.map(c => c.name),
          routes: relatedRoutes.map(r => r.path),
          apis: apis.map(api => api.endpoint),
          category: 'crud-read',
          entityName,
          endpoints: {
            list: listAPI?.endpoint,
            get: getAPI?.endpoint,
            create: createAPI?.endpoint,
            update: updateAPI?.endpoint,
            delete: deleteAPI?.endpoint,
          },
          metadata: {
            operationCount: crudOperations.length,
          },
        });
      }
    }

    return patterns;
  }

  /**
   * Detect workflow patterns (multi-step forms, wizards)
   */
  private detectWorkflowPatterns(
    components: ComponentAnalysis[],
    routes: RouteInfo[],
  ): WorkflowPatternType[] {
    const patterns: WorkflowPatternType[] = [];

    // Find components with step-related state
    const wizardComponents = components.filter(c => {
      const hasStepState = c.hooks.some(h =>
        h.variables.some(v => v.includes('step') || v.includes('Stage') || v.includes('page'))
      );
      const hasMultipleForms = c.jsx.forms.length > 1;
      return hasStepState || hasMultipleForms;
    });

    for (const comp of wizardComponents) {
      patterns.push({
        type: 'workflow-wizard',
        confidence: 0.7,
        components: [comp.name],
        routes: routes.filter(r => r.component === comp.name).map(r => r.path),
        apis: [],
        category: 'workflow',
        steps: [],
        entryRoute: routes.find(r => r.component === comp.name)?.path || '',
        exitRoute: '',
        canSkipSteps: false,
        hasProgressIndicator: false,
        metadata: {
          formCount: comp.jsx.forms.length,
        },
      });
    }

    return patterns;
  }

  /**
   * Group API calls by entity name (heuristic)
   */
  private groupAPIsByEntity(apiCalls: APICall[]): Record<string, APICall[]> {
    const groups: Record<string, APICall[]> = {};

    for (const api of apiCalls) {
      // Extract entity name from endpoint
      // e.g., /api/transactions/:id -> transactions
      const match = api.endpoint.match(/\/([a-z]+)/i);
      if (match) {
        const entityName = match[1];
        if (!groups[entityName]) {
          groups[entityName] = [];
        }
        groups[entityName].push(api);
      }
    }

    return groups;
  }

  /**
   * Score pattern confidence based on indicators
   */
  scorePattern(indicators: PatternIndicator[], matches: number): number {
    if (indicators.length === 0) return 0;

    const totalWeight = indicators.reduce((sum, ind) => sum + ind.weight, 0);
    const matchedWeight = indicators.slice(0, matches).reduce((sum, ind) => sum + ind.weight, 0);

    return matchedWeight / totalWeight;
  }
}

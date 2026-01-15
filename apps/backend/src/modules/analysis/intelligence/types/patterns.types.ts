/**
 * Pattern recognition types
 */

import { PathCategory } from './graph.types';

export interface DetectedPattern {
  type: PatternType;
  confidence: number;
  components: string[];
  routes: string[];
  apis: string[];
  category: PathCategory;
  metadata: Record<string, any>;
}

export type PatternType =
  | 'auth-login'
  | 'auth-signup'
  | 'auth-logout'
  | 'auth-protected'
  | 'crud-list'
  | 'crud-detail'
  | 'crud-create'
  | 'crud-update'
  | 'crud-delete'
  | 'workflow-wizard'
  | 'workflow-checkout'
  | 'workflow-onboarding'
  | 'navigation-menu'
  | 'navigation-breadcrumb'
  | 'error-404'
  | 'error-boundary';

export interface AuthPattern extends DetectedPattern {
  type: 'auth-login' | 'auth-signup' | 'auth-logout' | 'auth-protected';
  formFields?: string[];
  storageKey?: string;
  redirectTo?: string;
  tokenLocation?: 'localStorage' | 'sessionStorage' | 'cookie' | 'memory';
}

export interface CRUDPattern extends DetectedPattern {
  type: 'crud-list' | 'crud-detail' | 'crud-create' | 'crud-update' | 'crud-delete';
  entityName: string;
  listRoute?: string;
  detailRoute?: string;
  createRoute?: string;
  editRoute?: string;
  endpoints: {
    list?: string;
    get?: string;
    create?: string;
    update?: string;
    delete?: string;
  };
}

export interface WorkflowPattern extends DetectedPattern {
  type: 'workflow-wizard' | 'workflow-checkout' | 'workflow-onboarding';
  steps: WorkflowStepInfo[];
  entryRoute: string;
  exitRoute: string;
  canSkipSteps: boolean;
  hasProgressIndicator: boolean;
}

export interface WorkflowStepInfo {
  order: number;
  route: string;
  component: string;
  purpose: string;
  required: boolean;
  nextTrigger: string;
  prevTrigger?: string;
}

export interface PatternSignature {
  type: PatternType;
  indicators: PatternIndicator[];
  minConfidence: number;
  requiredComponents: number;
}

export interface PatternIndicator {
  type: 'code' | 'structure' | 'behavior';
  pattern: string | RegExp;
  weight: number;
  context?: string;
}

export interface PatternMatch {
  signature: PatternSignature;
  matches: PatternIndicator[];
  confidence: number;
  evidence: string[];
}

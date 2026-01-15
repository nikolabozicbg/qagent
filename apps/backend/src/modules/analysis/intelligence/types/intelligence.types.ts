/**
 * Core types for intelligent code analysis
 */

export interface ComponentAnalysis {
  filePath: string;
  name: string;
  type: 'functional' | 'class' | 'page' | 'layout';
  imports: ImportInfo[];
  exports: ExportInfo[];
  hooks: HookUsage[];
  props: PropDefinition[];
  jsx: JSXStructure;
  dependencies: string[];
}

export interface ImportInfo {
  source: string;
  specifiers: string[];
  isDefault: boolean;
  isDynamic: boolean;
}

export interface ExportInfo {
  name: string;
  isDefault: boolean;
  type: 'component' | 'function' | 'constant' | 'type';
}

export interface HookUsage {
  name: string;
  type: 'state' | 'effect' | 'context' | 'custom' | 'router';
  variables: string[];
  dependencies?: string[];
}

export interface PropDefinition {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
}

export interface JSXStructure {
  elements: JSXElement[];
  forms: FormInfo[];
  links: LinkInfo[];
  conditionals: ConditionalInfo[];
}

export interface JSXElement {
  type: string;
  props: Record<string, any>;
  children: JSXElement[];
  hasEventHandlers: boolean;
  selector?: string; // For test generation
}

export interface FormInfo {
  id?: string;
  fields: FormField[];
  submitHandler?: string;
  submitButton?: string;  // Selector for submit button
  validations: ValidationRule[];
  onSubmitRoute?: string;
}

export interface FormField {
  name: string;
  type: string;
  label?: string;
  placeholder?: string;
  required: boolean;
  validation?: string;
  selector: string;
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message?: string;
}

export interface LinkInfo {
  href: string;
  text: string;
  isInternal: boolean;
  selector: string;
}

export interface ConditionalInfo {
  condition: string;
  branches: string[];
  affects: string[]; // Component names or routes affected
}

export interface APICall {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  isRelative: boolean;
  usedIn: string; // Component/hook name
  triggeredBy?: string; // User action or lifecycle
  requestBody?: string;
  responseHandler?: string;
}

export interface RouteInfo {
  path: string;
  component: string;
  isProtected: boolean;
  layout?: string;
  params: string[];
  queries: string[];
  redirects: RedirectInfo[];
}

export interface RedirectInfo {
  from: string;
  to: string;
  condition?: string;
}

export interface StateTransition {
  from: string;
  to: string;
  trigger: string;
  via: 'useState' | 'useReducer' | 'Context' | 'XState' | 'Redux';
  component: string;
}

export interface CRUDEntity {
  name: string;
  endpoints: {
    list?: string;
    get?: string;
    create?: string;
    update?: string;
    delete?: string;
  };
  routes: {
    list?: string;
    detail?: string;
    create?: string;
    edit?: string;
  };
  components: string[];
  confidence: number;
}

export interface AuthBoundary {
  type: 'login' | 'signup' | 'logout' | 'protected-route';
  component?: string;
  route?: string;
  storageKey?: string;
  redirectTo?: string;
  confidence: number;
}

export interface WorkflowPattern {
  name: string;
  steps: WorkflowStep[];
  type: 'wizard' | 'checkout' | 'onboarding' | 'multi-step-form' | 'custom';
  entryPoint: string;
  exitPoint: string;
  confidence: number;
}

export interface WorkflowStep {
  order: number;
  component: string;
  route?: string;
  purpose: string;
  nextTrigger: string;
  prevTrigger?: string;
}

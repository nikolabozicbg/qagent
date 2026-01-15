/**
 * Plugin System Types
 * 
 * Defines interfaces for all scanner plugins.
 * Plugins are auto-detected based on project dependencies.
 */

import * as ts from 'typescript';

// ============================================
// CORE PLUGIN INTERFACES
// ============================================

export type PluginType = 'framework' | 'form' | 'schema' | 'testing';

/**
 * Base plugin interface - all plugins implement this
 */
export interface ScannerPlugin<T extends PluginResult = PluginResult> {
  /** Unique plugin identifier */
  name: string;
  
  /** Plugin version */
  version: string;
  
  /** Plugin category */
  type: PluginType;
  
  /** 
   * Priority for execution order (higher = runs first)
   * Useful when plugins depend on each other's results
   */
  priority: number;
  
  /**
   * Check if this plugin should be used for the project
   * Called during auto-detection phase
   */
  detect(context: ProjectContext): Promise<boolean>;
  
  /**
   * Analyze the project and return results
   * Called after detection confirms plugin is applicable
   */
  analyze(context: AnalysisContext): Promise<T>;
}

// ============================================
// CONTEXT TYPES
// ============================================

/**
 * Project context - available during detection
 */
export interface ProjectContext {
  projectPath: string;
  packageJson: PackageJson | null;
  fileExists: (relativePath: string) => Promise<boolean>;
  readFile: (relativePath: string) => Promise<string | null>;
  glob: (pattern: string) => Promise<string[]>;
}

/**
 * Analysis context - available during analysis
 */
export interface AnalysisContext extends ProjectContext {
  /** All source files in the project */
  sourceFiles: SourceFileInfo[];
  
  /** TypeScript source files (parsed) */
  parsedFiles: Map<string, ts.SourceFile>;
  
  /** Results from framework plugin (routes, components) */
  frameworkResult?: FrameworkPluginResult;
  
  /** Results from schema plugin (entities) */
  schemaResult?: SchemaPluginResult;
  
  /** Scanner configuration */
  config: ScannerConfig;
}

export interface SourceFileInfo {
  path: string;
  relativePath: string;
  content: string;
  lineCount: number;
}

export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

// ============================================
// PLUGIN RESULT TYPES
// ============================================

/**
 * Base plugin result
 */
export interface PluginResult {
  pluginName: string;
  success: boolean;
  errors?: string[];
}

/**
 * Framework plugin result
 */
export interface FrameworkPluginResult extends PluginResult {
  framework: {
    name: string;
    version: string;
    router: string | null;
    stateManagement: string[];
  };
  routes: RouteInfo[];
  components: ComponentInfo[];
  middleware?: MiddlewareInfo[];
  serverActions?: ServerActionInfo[];
}

export interface RouteInfo {
  path: string;
  component: string | null;
  filePath: string;
  isProtected: boolean;
  isDynamic: boolean;
  params: string[];
  layout?: string;
  forms: string[];
  apis: string[];
}

export interface ComponentInfo {
  name: string;
  filePath: string;
  renderedElements: string[];
  isInteractive: boolean;
  props: PropInfo[];
  hooks: string[];
  hasState: boolean;
  hasEffects: boolean;
  hasForms: boolean;
  complexity: number;
}

export interface PropInfo {
  name: string;
  type: string | null;
  isRequired: boolean;
}

export interface MiddlewareInfo {
  filePath: string;
  matcher: string[];
  type: 'auth' | 'redirect' | 'rewrite' | 'other';
}

export interface ServerActionInfo {
  name: string;
  filePath: string;
  formBinding?: string;
}

/**
 * Form plugin result
 */
export interface FormPluginResult extends PluginResult {
  library: string;
  forms: FormInfo[];
}

export interface FormInfo {
  id: string;
  name: string;
  componentName: string;
  filePath: string;
  route: string | null;
  library: string | null;
  fields: FieldInfo[];
  submitButton: SubmitButtonInfo | null;
  submitEndpoint: string | null;
  hasValidation: boolean;
  validationRules: Record<string, string[]>;
  successRedirect: string | null;
  testData?: Record<string, string>;
}

export interface FieldInfo {
  name: string;
  type: string;
  inputType: string;
  label: string | null;
  placeholder: string | null;
  isRequired: boolean;
  selector: string;
  selectorStrategy: SelectorStrategy;
  validations: FieldValidation[];
  defaultValue: string | null;
}

export interface SubmitButtonInfo {
  text: string | null;
  selector: string;
}

export interface FieldValidation {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'email' | 'min' | 'max' | 'custom';
  value: string | number | null;
  message: string | null;
}

export type SelectorStrategy = 'data-testid' | 'name' | 'label' | 'placeholder' | 'role' | 'id' | 'css';

/**
 * Schema plugin result
 */
export interface SchemaPluginResult extends PluginResult {
  orm: string;
  entities: EntityInfo[];
  relations: RelationInfo[];
}

export interface EntityInfo {
  name: string;
  tableName: string;
  filePath: string;
  fields: EntityFieldInfo[];
  isAuthEntity: boolean;
  crudRoutes?: string[];
}

export interface EntityFieldInfo {
  name: string;
  type: string;
  dbType: string;
  isPrimaryKey: boolean;
  isUnique: boolean;
  isNullable: boolean;
  hasDefault: boolean;
  relation?: string;
}

export interface RelationInfo {
  from: string;
  to: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  fieldName: string;
}

/**
 * Testing plugin result
 */
export interface TestingPluginResult extends PluginResult {
  testFramework: string;
  testFiles: TestFileInfo[];
  coverage: TestCoverage;
}

export interface TestFileInfo {
  filePath: string;
  testCount: number;
  tests: TestInfo[];
}

export interface TestInfo {
  name: string;
  type: 'unit' | 'integration' | 'e2e';
  coveredRoutes: string[];
  coveredComponents: string[];
  coveredForms: string[];
}

export interface TestCoverage {
  routes: { total: number; covered: number; list: string[] };
  components: { total: number; covered: number; list: string[] };
  forms: { total: number; covered: number; list: string[] };
}

// ============================================
// CONFIGURATION
// ============================================

export interface ScannerConfig {
  /** Enable/disable specific plugins */
  plugins: {
    frameworks: string[];
    forms: string[];
    schema: string[];
    testing: string[];
  };
  
  /** Custom patterns for detection */
  patterns: {
    testCredentials: RegExp[];
    protectedRoutes: RegExp[];
    authForms: RegExp[];
    ignoreFiles: RegExp[];
  };
  
  /** Selector generation preferences */
  selectors: {
    priority: SelectorStrategy[];
    customTestIdAttribute?: string;
  };
  
  /** Path configuration */
  paths: {
    ignore: string[];
    include: string[];
    srcRoot: string;
  };
  
  /** Behavior flags */
  behavior: {
    analyzeExistingTests: boolean;
    inferEntitiesFromTypes: boolean;
    generateTestData: boolean;
  };
}

// ============================================
// AGGREGATED RESULT
// ============================================

export interface AggregatedScanResult {
  project: {
    name: string;
    path: string;
    detectedPlugins: string[];
  };
  framework: FrameworkPluginResult | null;
  forms: FormPluginResult[];
  schema: SchemaPluginResult | null;
  testing: TestingPluginResult | null;
  
  /** Merged and deduplicated data */
  merged: {
    routes: RouteInfo[];
    components: ComponentInfo[];
    forms: FormInfo[];
    entities: EntityInfo[];
    existingCoverage: TestCoverage | null;
  };
  
  /** Inferred relationships */
  relationships: {
    entityToRoutes: Record<string, string[]>;
    formToEntity: Record<string, string>;
    routeToForms: Record<string, string[]>;
    navigationLinks: NavigationLink[];
    inferredFlows: InferredFlow[];
  };
}

export interface NavigationLink {
  from: string;
  to: string;
  linkText: string | null;
  selector: string | null;
  type: 'link' | 'redirect' | 'push' | 'replace';
}

export interface InferredFlow {
  name: string;
  description: string;
  steps: string[];
  entities: string[];
  importance: number;
}

// ============================================
// UTILITY TYPES
// ============================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type PluginConstructor<T extends ScannerPlugin = ScannerPlugin> = new () => T;

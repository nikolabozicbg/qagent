/**
 * Core Type Definitions for QAgent Desktop
 * These types match the backend API responses exactly
 */

import { Lock, FileEdit, Compass, DollarSign, Wrench, Navigation, MousePointer, Edit3, Send, CheckCircle, Clock, Zap } from 'lucide-react';

// ============================================================================
// Test Suite Types (matches backend SmartJourneyDiscoveryService)
// ============================================================================

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  category: 'authentication' | 'crud' | 'navigation' | 'workflow' | 'other';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  testCases: TestCase[];
  stats: {
    totalCases: number;
    totalSteps: number;
    estimatedDuration: number; // seconds
  };
  metadata: {
    components: string[];
    routes: string[];
    apis: string[];
    generatedFrom: 'discovery' | 'manual';
  };
}

export interface TestCase {
  id: string;
  suiteId: string;
  name: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  steps: TestStep[];
  status: 'not-generated' | 'passing' | 'failing' | 'flaky' | 'pending' | 'passed' | 'failed' | 'running';
  testData?: Record<string, any>;
  testFilePath?: string;
  tags?: string[];
  estimatedDuration?: number; // Optional since backend metadata.estimatedDuration might not be set
  metadata?: {
    components: string[];
    apis: string[];
    selectors: string[];
    edgeCases?: string[];
    estimatedDuration: number;
  };
  lastRun?: {
    timestamp: string;
    duration: number;
    status: 'passed' | 'failed' | 'running';
    error?: string;
  };
}

export interface TestStep {
  id: string;
  caseId: string;
  index: number;
  action: 'navigate' | 'click' | 'fill' | 'submit' | 'verify' | 'wait' | 'api-call';
  target: string;
  value?: string;
  description: string;
  selector?: string;
  assertions?: string[];
  api?: {
    method: string;
    endpoint: string;
    expectedStatus: number;
  };
  status?: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number; // milliseconds
  error?: TestError;
}

export interface TestError {
  message: string;
  stack?: string;
  screenshot?: string;
  failedAt?: {
    step: number;
    action: string;
  };
  suggestion?: {
    type: 'selector-changed' | 'api-changed' | 'timing-issue' | 'data-issue';
    fix?: string;
  };
}

export interface TestCaseExecution {
  lastRun?: string; // ISO date
  duration?: number; // seconds
  passCount?: number;
  failCount?: number;
  error?: TestError;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface SuiteDiscoveryResult {
  success: boolean;
  suites: TestSuite[];
  totalCases: number;
  totalSteps: number;
  analysisTime: number;
  metadata: {
    analysisLayers: string[];
    coverage: {
      routes: { total: number; covered: number };
      components: { total: number; covered: number };
      apis: { total: number; covered: number };
    };
  };
}

export interface WorkspaceAnalysisResult {
  success: boolean;
  project: {
    name: string;
    path: string;
    framework?: string;
    technologies: string[];
  };
  summary: {
    totalFiles: number;
    totalComponents: number;
    overallCoverage: number;
  };
}

export interface TestGenerationResult {
  success: boolean;
  testCode: string;
  fileName: string;
  stats: {
    linesOfCode: number;
    testCases: number;
  };
  error?: string;
}

// ============================================================================
// Project Configuration
// ============================================================================

export interface AuthConfig {
  enabled: boolean;
  username: string;
  password: string;
  // Auto-detected or manual override
  loginRoute?: string;          // default: '/signin'
  usernameSelector?: string;    // default: '[name="username"]'
  passwordSelector?: string;    // default: '[name="password"]'
  submitSelector?: string;      // default: 'button[type="submit"]'
  successUrlPattern?: string;   // default: '/dashboard|/home'
}

export interface ProjectConfig {
  projectPath: string;
  projectName: string;
  framework: 'playwright' | 'cypress';
  baseUrl: string;
  testDir: string;
  auth?: AuthConfig;
  lastScan?: string; // ISO date
}

// ============================================================================
// UI State Types
// ============================================================================

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
}

export interface Modal {
  id: string;
  type: 'test-generation' | 'test-execution' | 'settings' | 'confirmation';
  title: string;
  data?: any;
}

// ============================================================================
// Priority Helpers
// ============================================================================

export const PRIORITY_ORDER: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#6b7280',
};

export const PRIORITY_BG_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-500/10',
  HIGH: 'bg-orange-500/10',
  MEDIUM: 'bg-yellow-500/10',
  LOW: 'bg-gray-500/10',
};

export const STATUS_COLORS: Record<string, string> = {
  'not-generated': '#6b7280',
  'pending': '#6b7280',
  'passed': '#10b981',
  'passing': '#10b981',
  'failed': '#ef4444',
  'failing': '#ef4444',
  'running': '#3b82f6',
  'flaky': '#eab308',
};

export const STATUS_BG_COLORS: Record<string, string> = {
  'not-generated': 'bg-gray-500/10',
  'passing': 'bg-green-500/10',
  'failing': 'bg-red-500/10',
  'flaky': 'bg-yellow-500/10',
};

// ============================================================================
// Category Helpers
// ============================================================================

export const CATEGORY_ICONS: Record<string, any> = {
  authentication: Lock,
  crud: FileEdit,
  navigation: Compass,
  workflow: DollarSign,
  other: Wrench,
};

export const CATEGORY_NAMES: Record<string, string> = {
  authentication: 'Authentication',
  crud: 'CRUD Operations',
  navigation: 'Navigation',
  workflow: 'Workflows',
  other: 'General',
};

// ============================================================================
// Action Icons
// ============================================================================

export const ACTION_ICONS: Record<string, any> = {
  navigate: Navigation,
  click: MousePointer,
  fill: Edit3,
  submit: Send,
  verify: CheckCircle,
  wait: Clock,
  'api-call': Zap,
};

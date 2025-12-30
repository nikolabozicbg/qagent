/**
 * Risk factor contributing to file risk score
 */
export interface RiskFactor {
  name: string;
  score: number;
  maxScore: number;
  description: string;
}

/**
 * Priority level based on risk score
 */
export type RiskPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * File in the risk queue
 */
export interface RiskQueueItem {
  id: string;
  name: string;
  path: string;
  relativePath: string;
  riskScore: number;  // 0-100
  priority: RiskPriority;
  factors: RiskFactor[];
  hasTest: boolean;
  testPath?: string;
  linesOfCode: number;
  importCount: number;
}

/**
 * Critical path keywords that increase risk
 */
export const CRITICAL_PATH_KEYWORDS = [
  'auth',
  'login',
  'payment',
  'checkout',
  'billing',
  'security',
  'password',
  'token',
  'session',
  'admin',
  'user',
  'account',
];

/**
 * File patterns to include in risk analysis
 */
export const SOURCE_FILE_PATTERNS = [
  '**/*.ts',
  '**/*.tsx',
  '**/*.js',
  '**/*.jsx',
];

/**
 * Directories to exclude from risk analysis
 */
export const EXCLUDED_DIRS = [
  'node_modules',
  'dist',
  'build',
  '.next',
  'coverage',
  '__tests__',
  '__mocks__',
  'test',
  'tests',
  'spec',
  '.git',
];

/**
 * Test file patterns
 */
export const TEST_FILE_PATTERNS = [
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.test.js',
  '**/*.test.jsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/*.spec.js',
  '**/*.spec.jsx',
  '**/__tests__/**/*',
];

/**
 * Get priority from risk score
 */
export function getPriorityFromScore(score: number): RiskPriority {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

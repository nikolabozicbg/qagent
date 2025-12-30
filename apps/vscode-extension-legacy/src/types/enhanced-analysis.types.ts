/**
 * Enhanced Analysis Types
 * 
 * Type definitions for the enhanced analysis response from the backend.
 * Matches the EnhancedAnalysisResponse from backend.
 */

export type TestType = 'unit' | 'integration' | 'e2e' | 'component' | 'visual' | 'mutation' | 'performance' | 'api' | 'hook';
export type ProjectType = 'web-api' | 'spa' | 'library' | 'cli' | 'desktop' | 'mobile' | 'monolith' | 'microservice';
export type Priority = 'high' | 'medium' | 'low' | 'critical';
export type StackType = 'frontend' | 'backend' | 'fullstack' | 'library' | 'monorepo';
export type FrameworkStatus = 'installed' | 'not-configured' | 'missing' | 'deprecated';

/**
 * Complete enhanced analysis response
 */
export interface EnhancedAnalysisResponse {
  project: ProjectInfo;
  testingSetup: TestingSetup;
  coverageByType: CoverageByType;
  files: FileAnalysis[];
  summary: AnalysisSummary;
}

/**
 * Project information
 */
export interface ProjectInfo {
  name: string;
  path: string;
  technologies: TechnologyInfo[];
  primaryType: ProjectType;
  stackType: StackType;
  icon: string;
  stacks: TechnologyStack[];
}

/**
 * Technology Stack (Frontend/Backend separation)
 */
export interface TechnologyStack {
  type: StackType;
  name: string;
  technologies: TechnologyInfo[];
  testTypes: TestTypeMatrix[];
  fileCount: number;
  testedCount: number;
  coverage: number;
  scannedFiles?: any[]; // Store scanned files for tree display
}

/**
 * Test Type Matrix Entry (e.g. Component Tests for Frontend)
 */
export interface TestTypeMatrix {
  testType: TestType;
  framework: FrameworkInfo;
  status: FrameworkStatus;
  coverage: number;
  filesTotal: number;
  filesTested: number;
  filesUntested: number;
  outputPath: string;
  runCommand: string;
  recommendedFiles: string[];
}

/**
 * Framework Information with status
 */
export interface FrameworkInfo {
  name: string;
  version?: string;
  status: FrameworkStatus;
  configFiles?: string[];
  marketShare?: number;
  reason?: string;
  installCommand?: string;
  setupGuide?: string;
}

export interface TechnologyInfo {
  language: string;
  displayName: string;
  projectType: ProjectType;
  confidence: number;
  indicators: string[];
  icon: string;
  color: string;
}

/**
 * Testing setup (installed and recommended frameworks)
 */
export interface TestingSetup {
  installed: InstalledFramework[];
  recommended: FrameworkRecommendation[];
  missingSetup: string[];
}

export interface InstalledFramework {
  name: string;
  version?: string;
  type: TestType;
  language: string;
  runCommand: string;
  outputPattern: string;
}

export interface FrameworkRecommendation {
  framework: Framework;
  priority: number;
  marketShare?: number;
  pros?: string[];
  cons?: string[];
  reason: string;
}

export interface Framework {
  name: string;
  version?: string;
  type: TestType;
  configFiles: string[];
  testPattern: string;
  runCommand: string;
  language: string;
  outputPattern?: string;
  setupRequired?: string[];
}

/**
 * Coverage breakdown by test type
 */
export interface CoverageByType {
  unit: TestTypeCoverage;
  integration: TestTypeCoverage;
  e2e: TestTypeCoverage;
  component: TestTypeCoverage;
}

export interface TestTypeCoverage {
  testType: TestType;
  framework: string | null;
  coverage: number;
  filesTotal: number;
  filesTested: number;
  filesUntested: number;
  outputPath: string;
  runCommand: string;
  installed: boolean;
}

/**
 * File-level analysis
 */
export interface FileAnalysis {
  path: string;
  relativePath: string;
  language: string;
  hasTest: boolean;
  testType?: TestType;
  testFramework?: string;
  testFilePath?: string;
  coverage?: number;
  priority: Priority;
  reason: string;
  linesOfCode: number;
  recommendedTestType: TestType;
  recommendedFramework: string;
  outputPath: string;
  runCommand: string;
  recommendations: TestTypeRecommendation[];
}

export interface TestTypeRecommendation {
  testType: TestType;
  priority: 'primary' | 'secondary' | 'optional';
  framework: string;
  reason: string;
  outputPath: string;
  runCommand: string;
}

/**
 * Analysis summary
 */
export interface AnalysisSummary {
  totalFiles: number;
  testedFiles: number;
  untestedFiles: number;
  overallCoverage: number;
  highPriorityFiles: number;
  detectedLanguages: string[];
  installedFrameworks: number;
  recommendedFrameworks: number;
}

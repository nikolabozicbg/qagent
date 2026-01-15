// Re-export from suite.types for consistency
export type { ProjectConfig, AuthConfig } from './suite.types';

export interface DetectedTech {
  name: string;
  version?: string;
  category: 'framework' | 'library' | 'testing' | 'state' | 'routing' | 'ui';
}

export interface ProjectInsights {
  componentsCount: number;
  routesCount: number;
  apiEndpointsCount: number;
  hasPlaywright: boolean;
  hasCypress: boolean;
}

export interface DiscoveredFlow {
  id: string;
  name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number; // 0-100
  route: string;
  enriched: boolean;
  componentsCount: number;
  apisCount: number;
  steps?: string[];
}

export interface AnalysisProgress {
  stage: 'detecting' | 'analyzing' | 'discovering' | 'enriching' | 'complete';
  percentage: number;
  message: string;
}

export interface TechDetectionResult {
  projectType: 'react-frontend' | 'vue-frontend' | 'angular-frontend' | 'next-fullstack' | 'node-backend' | 'python-backend' | 'monorepo' | 'unknown';
  framework: string | null;
  frameworkVersion: string | null;
  uiLibrary: string | null;
  uiLibraryVersion: string | null;
  stateManagement: string | null;
  testingFrameworks: string[];
  language: 'typescript' | 'javascript' | 'python' | 'unknown';
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'unknown';
  features: string[];
  recommendedTestTypes: string[];
  detectionTime: number;
}

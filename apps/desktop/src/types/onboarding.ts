export interface ProjectConfig {
  projectPath: string;
  baseUrl: string;
  framework: 'playwright' | 'cypress';
  auth?: {
    username: string;
    password: string;
    useSeedData: boolean;
  };
}

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

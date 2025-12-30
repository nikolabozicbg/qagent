/**
 * Discovery progress event types
 */
export type DiscoveryProgressType = 
  | 'init' 
  | 'component' 
  | 'route' 
  | 'api' 
  | 'form' 
  | 'journey' 
  | 'complete';

/**
 * Journey priority levels
 */
export type JourneyPriority = 'critical' | 'high' | 'standard';

/**
 * Journey preview data
 */
export interface JourneyPreview {
  name: string;
  confidence: number;
  priority: JourneyPriority;
}

/**
 * Discovery summary (sent on completion)
 */
export interface DiscoverySummary {
  totalComponents: number;
  totalRoutes: number;
  totalApis: number;
  totalForms: number;
  totalJourneys: number;
  estimatedCoverage: number;
  analysisTime: number;
}

/**
 * Discovery progress data
 */
export interface DiscoveryProgressData {
  // Counters
  componentsCount?: number;
  routesCount?: number;
  apisCount?: number;
  formsCount?: number;
  
  // Current item being analyzed
  currentFile?: string;
  currentType?: string;
  
  // Journey preview (high-value finds)
  journey?: JourneyPreview;
  
  // Progress tracking
  filesAnalyzed?: number;
  totalFiles?: number;
  estimatedTimeRemaining?: number; // seconds
  
  // Final summary (type: complete)
  summary?: DiscoverySummary;
}

/**
 * Discovery progress event
 */
export interface DiscoveryProgress {
  type: DiscoveryProgressType;
  data: DiscoveryProgressData;
}

/**
 * Discovery result (returned after completion)
 */
export interface DiscoveryResult {
  success: boolean;
  summary?: DiscoverySummary;
  error?: string;
}

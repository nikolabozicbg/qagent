import * as vscode from 'vscode';
import { DiscoveredFlow } from '../types';
import { log } from '../extension';

/**
 * BackendAPIService - Communicates with QAgenAI backend
 */
export class BackendAPIService {
  private baseUrl: string;

  constructor() {
    // Get backend URL from settings or default to localhost
    this.baseUrl = vscode.workspace.getConfiguration('qagenai').get('backendUrl') || 'http://localhost:3001';
  }

  /**
   * Check if backend is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      log('Checking backend at:', this.baseUrl);
      
      // Ping health endpoint to check if backend is running
      const response = await fetch(`${this.baseUrl}/system/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000), // 3s timeout
      });
      
      if (!response.ok) {
        log('Backend health check failed:', response.status);
        return false;
      }
      
      const health = await response.json() as { status: string };
      log('Backend is healthy:', health.status);
      return health.status === 'ok';
    } catch (error) {
      log('Backend not available:', (error as Error).message);
      return false;
    }
  }

  /**
   * Discover flows using AI (backend)
   */
  async discoverFlowsWithAI(workspacePath: string): Promise<DiscoveredFlow[]> {
    try {
      log('Calling backend for flow discovery:', workspacePath);
      
      const response = await fetch(`${this.baseUrl}/analyze/flows/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath }),
        signal: AbortSignal.timeout(60000), // 60s timeout for AI
      });

      if (!response.ok) {
        log('Backend error:', response.status);
        throw new Error(`Backend error: ${response.status}`);
      }

      const result = await response.json() as { flows?: DiscoveredFlow[] };
      log('Backend returned:', result.flows?.length || 0, 'flows');
      
      // Map backend response to include 'selected' property
      const flows = (result.flows || []).map(f => ({
        ...f,
        selected: true,
      }));
      
      log('Mapped flows:', flows.length);
      return flows;
    } catch (error) {
      log('Flow discovery failed:', error);
      return [];
    }
  }

  /**
   * Get enhanced workspace analysis
   */
  async analyzeWorkspace(workspacePath: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/analyze/enhanced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Workspace analysis failed:', error);
      return null;
    }
  }

  /**
   * Discover E2E journeys using SMART multi-strategy system
   * This is the NEW system that uses graph + form + intent synthesis (3 parallel strategies)
   * Returns journeys with user-friendly names (emoji icons) and enriched data
   */
  async discoverJourneysHolistic(workspacePath: string): Promise<E2EJourney[]> {
    try {
      log('Calling SMART journey discovery + auto-enrichment:', workspacePath);
      
      // Use NEW endpoint that auto-enriches critical journeys
      const response = await fetch(`${this.baseUrl}/analyze/journeys/discover-and-enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath }),
        signal: AbortSignal.timeout(60000), // 60s timeout
      });

      if (!response.ok) {
        log('Journey discovery error:', response.status);
        throw new Error(`Backend error: ${response.status}`);
      }

      const result = await response.json() as EnrichedJourneyDiscoveryResult;
      log('Journey discovery complete:', {
        total: result.totalJourneys || 0,
        enriched: result.enrichedJourneys || 0,
        time: result.analysisTime + 'ms'
      });
      
      return result.journeys || [];
    } catch (error) {
      log('Journey discovery failed:', error);
      return [];
    }
  }
  
  /**
   * Generate test for a specific journey
   */
  async generateTestForJourney(journey: E2EJourney, workspacePath: string): Promise<TestGenerationResult> {
    try {
      log('Generating test for journey:', journey.name);
      
      const response = await fetch(`${this.baseUrl}/analyze/generate-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journey, workspacePath }),
        signal: AbortSignal.timeout(30000),
      });
      
      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }
      
      const result = await response.json() as TestGenerationResult;
      log('Test generated:', result.fileName, `(${result.stats?.testCases} tests)`);
      
      return result;
    } catch (error) {
      log('Test generation failed:', error);
      throw error;
    }
  }

  /**
   * Update backend URL
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }
}

// Types for journey discovery
export interface E2EJourney {
  name: string; // User-friendly name with emoji (e.g., "👤 User Login")
  description: string;
  steps: JourneyStep[];
  priority: number; // 1 = critical, 2 = medium, 3 = low
  tags: string[];
  category?: 'authentication' | 'crud' | 'navigation' | 'workflow' | null;
  status?: 'enriched' | 'discovery-only';
  estimatedDuration?: number; // seconds
  stepCount?: number;
  components?: { name: string; path: string }[];
  metadata?: {
    technicalName?: string; // Original technical name
    formComponent?: string;
  };
  enrichedData?: EnrichedJourneyData;
}

export interface EnrichedJourneyData {
  components: Array<{
    name: string;
    path: string;
    fields: Array<{
      selector: string;
      type: string;
      allSelectors?: any[];
    }>;
    validations: Array<{
      fieldName: string;
      rules: Array<{ type: string; errorMessage?: string }>;
    }>;
    apis: Array<{
      method: string;
      endpoint: string;
      libraryUsed?: string;
    }>;
    state?: any[];
  }>;
  testDataSuggestions?: {
    validTestData?: Record<string, any>;
    invalidTestData?: Record<string, any>;
  };
  edgeCases: string[];
  estimatedTestCases: number;
  estimatedCodeLines: number;
}

export interface JourneyStep {
  action: 'navigate' | 'click' | 'fill' | 'submit' | 'verify' | 'wait';
  component: string;
  target: string;
  description: string; // User-friendly description
  details?: string; // Technical details
  assertions?: string[];
}

interface EnrichedJourneyDiscoveryResult {
  success: boolean;
  totalJourneys: number;
  enrichedJourneys: number;
  journeys: E2EJourney[];
  analysisTime: number;
  metadata?: {
    nodeCount: number;
    edgeCount: number;
    cycleCount: number;
    componentCount?: number;
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

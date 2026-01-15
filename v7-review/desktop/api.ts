import axios, { AxiosInstance } from 'axios';
import type { SuiteDiscoveryResult, TestGenerationResult, ProjectConfig } from '../types/suite.types';
import type { TechDetectionResult } from '../types/onboarding';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

console.log('🔗 API Service initialized with BASE_URL:', BASE_URL);
console.log('🔍 Environment check:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  isDev: import.meta.env.DEV,
  mode: import.meta.env.MODE
});

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 120000, // 2 minutes for large projects
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Health check
  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }

  // ============================================
  // PROJECT CRUD OPERATIONS
  // ============================================

  // Get all projects
  async getAllProjects(): Promise<ProjectConfig[]> {
    const response = await this.client.get<ProjectConfig[]>('/projects');
    return response.data;
  }

  // Get active project (last opened)
  async getActiveProject(): Promise<ProjectConfig | null> {
    const response = await this.client.get('/projects/active');
    return response.data;
  }

  // Get single project with suites
  async getProject(projectPath: string) {
    const encodedPath = btoa(projectPath); // Browser-compatible base64
    const response = await this.client.get(`/projects/${encodedPath}`);
    return response.data;
  }

  // Activate a project (set as current)
  async activateProject(projectPath: string): Promise<void> {
    const encodedPath = btoa(projectPath);
    await this.client.post(`/projects/${encodedPath}/activate`);
  }

  // Create or update project
  async createProject(config: {
    projectPath: string;
    projectName: string;
    framework: 'playwright' | 'cypress';
    baseUrl: string;
    testDir?: string;
    auth?: {
      enabled: boolean;
      username: string;
      password: string;
      loginRoute?: string;
      usernameSelector?: string;
      passwordSelector?: string;
      submitSelector?: string;
      successUrlPattern?: string;
    };
  }): Promise<ProjectConfig> {
    const response = await this.client.post<ProjectConfig>('/projects', config);
    return response.data;
  }

  // Delete project
  async deleteProject(projectPath: string): Promise<void> {
    const encodedPath = btoa(projectPath); // Browser-compatible base64
    await this.client.delete(`/projects/${encodedPath}`);
  }

  // Get cached suites for a project (without running discovery)
  async getCachedSuites(projectPath: string) {
    const encodedPath = btoa(projectPath); // Browser-compatible base64
    const response = await this.client.get(`/projects/${encodedPath}/suites`);
    return response.data;
  }

  // Get cache statistics
  async getCacheStats() {
    const response = await this.client.get('/projects/stats');
    return response.data;
  }
  
  // Discover suites and cache them in backend (LEGACY - filesystem access)
  async discoverAndCacheSuites(projectPath: string): Promise<SuiteDiscoveryResult> {
    const encodedPath = btoa(projectPath); // Browser-compatible base64
    const response = await this.client.post<SuiteDiscoveryResult>(
      `/projects/${encodedPath}/discover`,
      { projectPath }, // Body contains projectPath for discovery
      { timeout: 180000 } // 3 minutes for large projects
    );
    return response.data;
  }

  // Cloud-ready discovery: client sends pre-scanned payload
  // version: 'v6' = Intelligent LLM-First Discovery (NEW - recommended)
  // version: 'v5' = Universal Discovery (multi-agent, data-driven)
  // version: 'v4' (default) = Graph-based Discovery
  // version: 'v3' = Intelligent Discovery (semantic classification)
  // version: 'v2' = Universal Builder (rule-based)
  async discoverFromPayload(payload: any, version: 'v2' | 'v3' | 'v4' | 'v5' | 'v6' | 'v7' = 'v4'): Promise<SuiteDiscoveryResult> {
    // V6 uses multiple LLM calls, needs longer timeout
    const timeout = (version === 'v6' || version === 'v7') ? 600000 : 180000; // 10 min for V6/V7, 3 min for others
    
    const response = await this.client.post<SuiteDiscoveryResult>(
      `/analyze/discover?version=${version}`,
      payload,
      { timeout }
    );
    return response.data;
  }

  // Combined: scan locally + send to cloud backend
  async discoverSuitesCloud(projectPath: string): Promise<SuiteDiscoveryResult> {
    // Check if running in Electron
    if (!window.electronAPI?.scanProject) {
      // Fallback: use legacy endpoint (requires BE to have fs access)
      console.log('⚠️ Not in Electron - falling back to legacy discovery');
      return this.discoverAndCacheSuites(projectPath);
    }
    
    // Step 1: Scan project locally using Electron
    console.log('📂 Scanning project locally...');
    const scanResult = await window.electronAPI.scanProject(projectPath);
    if (!scanResult.ok || !scanResult.payload) {
      throw new Error(scanResult.error || 'Failed to scan project');
    }
    
    console.log('📤 Sending scanned payload to cloud backend...');
    console.log(`   Routes: ${scanResult.payload.routes.length}`);
    console.log(`   Components: ${scanResult.payload.components.length}`);
    console.log(`   Types: ${scanResult.payload.types.length}`);
    
    // Step 2: Send payload to cloud backend
    return this.discoverFromPayload(scanResult.payload);
  }

  // V5 Combined: scan locally with V5 format + send to cloud backend
  async discoverSuitesCloudV5(projectPath: string): Promise<SuiteDiscoveryResult> {
    // Check if running in Electron
    if (!window.electronAPI?.scanProjectV5) {
      // Fallback: use legacy scanner with V5 backend conversion
      console.log('⚠️ scanProjectV5 not available - using legacy scanner with V5 backend');
      return this.discoverSuitesCloud(projectPath).then(async () => {
        // Re-scan with legacy and send to V5
        const scanResult = await window.electronAPI?.scanProject(projectPath);
        if (!scanResult?.ok || !scanResult.payload) {
          throw new Error(scanResult?.error || 'Failed to scan project');
        }
        return this.discoverFromPayload(scanResult.payload, 'v5');
      });
    }
    
    // Step 1: Scan project locally using V5 Scanner
    console.log('📂 Scanning project with V5 scanner...');
    const scanResult = await window.electronAPI.scanProjectV5(projectPath);
    if (!scanResult.ok || !scanResult.payload) {
      throw new Error(scanResult.error || 'Failed to scan project');
    }
    
    console.log('📤 Sending V5 payload to cloud backend...');
    console.log(`   Pages: ${scanResult.payload.pages.length}`);
    console.log(`   Elements: ${scanResult.payload.elements.length}`);
    console.log(`   Constraints: ${scanResult.payload.constraints.length}`);
    console.log(`   Flows: ${scanResult.payload.flows.length}`);
    
    // Step 2: Send V5 payload to cloud backend
    return this.discoverFromPayload(scanResult.payload, 'v5');
  }

  // V6 Combined: scan locally + send to V6 backend (LLM-First Intelligent Discovery)
  // Uses existing scanner format, V6 backend does the smart processing
  async discoverSuitesCloudV6(projectPath: string): Promise<SuiteDiscoveryResult> {
    // Check if running in Electron
    if (!window.electronAPI?.scanProject) {
      console.log('⚠️ Not in Electron - V6 requires scanner');
      throw new Error('V6 Discovery requires Electron scanner');
    }
    
    // Step 1: Scan project locally (using standard scanner)
    console.log('📂 Scanning project for V6...');
    const scanResult = await window.electronAPI.scanProject(projectPath);
    if (!scanResult.ok || !scanResult.payload) {
      throw new Error(scanResult.error || 'Failed to scan project');
    }
    
    console.log('🧠 Sending to V6 Intelligent Discovery...');
    console.log(`   Routes: ${scanResult.payload.routes.length}`);
    console.log(`   Forms: ${scanResult.payload.forms.length}`);
    
    // Step 2: Send payload to V6 backend (LLM-First processing)
    return this.discoverFromPayload(scanResult.payload, 'v6');
  }

  // V7 Combined: scan locally + send Behavior Graph to V7 backend (Behavior-Driven)
  async discoverSuitesCloudV7(projectPath: string): Promise<SuiteDiscoveryResult> {
    if (!window.electronAPI?.scanProjectV7) {
      throw new Error('V7 Discovery requires Electron scanProjectV7');
    }

    console.log('📂 Scanning project for V7 (Behavior Graph)...');
    const scanResult = await window.electronAPI.scanProjectV7(projectPath);
    if (!scanResult.ok || !scanResult.payload) {
      throw new Error(scanResult.error || 'Failed to scan project for V7');
    }

    console.log('🧠 Sending Behavior Graph to V7 Discovery...');
    console.log(`   Nodes: ${scanResult.payload.graph.nodes.length}`);
    console.log(`   Edges: ${scanResult.payload.graph.edges.length}`);

    return this.discoverFromPayload(scanResult.payload, 'v7');
  }

  // Enhanced workspace analysis (SLOW - use detectTechnology for onboarding)
  async analyzeWorkspace(projectPath: string) {
    const response = await this.client.post('/analyze/enhanced', {
      workspacePath: projectPath,
    });
    return response.data;
  }

  // FAST Technology Detection (<3 seconds)
  async detectTechnology(projectPath: string): Promise<TechDetectionResult> {
    const response = await this.client.post<TechDetectionResult>('/analyze/tech-detect', {
      workspacePath: projectPath,
    });
    return response.data;
  }

  // Smart suite discovery (DSA + AI - backend decides)
  async discoverTestSuites(projectPath: string): Promise<SuiteDiscoveryResult> {
    const response = await this.client.post<SuiteDiscoveryResult>(
      '/analyze/suites/discover',
      { workspacePath: projectPath },
      { timeout: 300000 } // 5 minutes for AI processing
    );
    return response.data;
  }

  // LEGACY: Smart journey discovery with enrichment
  async discoverAndEnrichJourneys(data: {
    projectPath: string;
    baseUrl: string;
    framework: string;
    auth?: {
      username: string;
      password: string;
    };
  }) {
    const response = await this.client.post(
      '/analyze/journeys/discover-and-enrich',
      {
        workspacePath: data.projectPath,
        enrichAll: false // Only enrich critical flows
      },
      {
        timeout: 180000 // 3 minutes for large projects
      }
    );
    return response.data;
  }

  // Generate test suite
  async generateTest(data: {
    flowId: string;
    framework: string;
    config?: Record<string, any>;
  }) {
    const response = await this.client.post('/analyze/generate-test', data);
    return response.data;
  }

  // Test base URL connection
  async testConnection(baseUrl: string) {
    try {
      const response = await axios.get(baseUrl, { timeout: 5000 });
      return { success: true, status: response.status };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Connection failed',
      };
    }
  }

  // Get all flows
  async getFlows(projectPath: string) {
    const response = await this.client.get('/flows', {
      params: { projectPath },
    });
    return response.data;
  }

  // Get single flow by ID
  async getFlow(flowId: string) {
    const response = await this.client.get(`/flows/${flowId}`);
    return response.data;
  }

  // Get dashboard metrics
  async getDashboardMetrics(projectPath: string) {
    const response = await this.client.get('/metrics/dashboard', {
      params: { projectPath },
    });
    return response.data;
  }

  // Get recent activity
  async getRecentActivity(projectPath: string, limit = 10) {
    const response = await this.client.get('/activity/recent', {
      params: { projectPath, limit },
    });
    return response.data;
  }

  // Generate test for a flow
  async generateTestForFlow(data: {
    flowId: string;
    projectPath: string;
    framework: 'playwright' | 'cypress';
    includeEdgeCases?: boolean;
    includeAccessibility?: boolean;
  }) {
    const response = await this.client.post('/test/generate', data, {
      timeout: 60000, // 1 minute
    });
    return response.data;
  }

  // Generate test with streaming (uses /analyze/generate-test)
  async generateTestWithStreaming(data: {
    journey: any;
    workspacePath: string;
  }) {
    const response = await this.client.post('/analyze/generate-test', data, {
      timeout: 120000, // 2 minutes for AI generation
    });
    return response.data;
  }

  // Auth: auto-detect login info
  async autoDetectAuth(projectPath: string) {
    const response = await this.client.post('/analyze/auth/auto-detect', { workspacePath: projectPath });
    return response.data;
  }

  // Auth: generate global setup (auth.setup.ts)
  async generateAuthSetup(data: { projectPath: string; auth: any; testDir?: string }) {
    const response = await this.client.post('/analyze/auth/generate-setup', data);
    return response.data;
  }

  // NEW: Generate test from Case/Steps structure
  async generateFromCase(data: {
    testCase: {
      id: string;
      name: string;
      description?: string;
      priority?: string;
      steps: Array<{
        action: string;
        target: string;
        value?: string;
        selector?: string;
        expectedResult?: string;
        description?: string;
        assertions?: string[];
        api?: { method: string; endpoint: string; expectedStatus?: number };
      }>;
      testData?: Record<string, any>;
      metadata?: {
        components?: string[];
        apis?: string[];
        selectors?: string[];
      };
    };
    suite: {
      id: string;
      name: string;
      category?: string;
    };
    workspacePath: string;
    baseUrl?: string;
  }): Promise<TestGenerationResult> {
    const response = await this.client.post<TestGenerationResult>('/analyze/generate-from-case', data, {
      timeout: 120000,
    });
    return response.data;
  }

  // Run tests - executes locally via Electron IPC
  async runTests(data: {
    projectPath: string;
    testFiles?: string[];
    framework: string;
  }) {
    // Use Electron IPC to run tests locally in user's project
    if (window.electronAPI?.runPlaywrightTests) {
      const result = await window.electronAPI.runPlaywrightTests({
        projectPath: data.projectPath,
        testFiles: data.testFiles
      });
      
      // Transform to expected format with test details
      return {
        success: result.success,
        passed: result.passed,
        failed: result.failed,
        skipped: result.skipped || 0,
        total: result.total,
        totalTests: result.total,
        duration: result.duration,
        error: result.error,
        // Include tests array for TestResults screen
        tests: (result as any).tests || []
      };
    }
    
    // Fallback for non-Electron environment (browser dev)
    throw new Error('Test execution requires Electron environment');
  }

  // Get test results
  async getTestResults(projectPath: string, testId?: string) {
    const response = await this.client.get('/test/results', {
      params: { projectPath, testId },
    });
    return response.data;
  }

  // Save project configuration
  async saveProjectConfig(config: {
    projectPath: string;
    framework: string;
    baseUrl: string;
    testDir: string;
    auth?: any;
  }) {
    const response = await this.client.post('/config/save', config);
    return response.data;
  }

  // Get project configuration
  async getProjectConfig(projectPath: string) {
    const response = await this.client.get('/config', {
      params: { projectPath },
    });
    return response.data;
  }

  // Update flow status after test generation/run
  async updateFlowStatus(data: {
    flowId: string;
    projectPath: string;
    status: 'no-tests' | 'passing' | 'partial' | 'failing';
    testFile?: string;
    lastRun?: string;
    passing?: number;
    total?: number;
  }) {
    const response = await this.client.put(`/flows/${data.flowId}`, data, {
      params: { projectPath: data.projectPath },
    });
    return response.data;
  }

  // ============================================
  // ADMIN OPERATIONS
  // ============================================

  // Reset all database data (for testing/development)
  async resetDatabase(): Promise<{ success: boolean; message: string }> {
    const response = await this.client.post('/admin/reset');
    return response.data;
  }

  // Get database statistics
  async getDbStats(): Promise<{
    totalProjects: number;
    totalSuites: number;
    totalCases: number;
    totalSteps: number;
  }> {
    const response = await this.client.get('/admin/stats');
    return response.data;
  }

  // Update a test case (status, generated code, file path)
  async updateCase(caseId: string, data: {
    status?: 'NOT_GENERATED' | 'GENERATED' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED';
    generatedCode?: string;
    generatedFilePath?: string;
  }): Promise<{ success: boolean; caseId: string }> {
    const response = await this.client.patch(`/projects/cases/${caseId}`, data);
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;

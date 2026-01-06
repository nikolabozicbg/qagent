import axios, { AxiosInstance } from 'axios';

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

  // Enhanced workspace analysis
  async analyzeWorkspace(projectPath: string) {
    const response = await this.client.post('/analyze/enhanced', {
      workspacePath: projectPath,
    });
    return response.data;
  }

  // Smart journey discovery with enrichment
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

  // Run tests
  async runTests(data: {
    projectPath: string;
    testFiles?: string[];
    framework: string;
  }) {
    const response = await this.client.post('/test/run', data);
    return response.data;
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
}

export const apiService = new ApiService();

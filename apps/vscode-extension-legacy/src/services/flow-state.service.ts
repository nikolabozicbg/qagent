import * as vscode from 'vscode';

/**
 * Flow test state
 */
export interface FlowState {
  flowId: string;
  status: 'untested' | 'generated' | 'passing' | 'failing';
  testFilePath?: string;
  generatedAt?: number;
  lastRunAt?: number;
  testResults?: {
    total: number;
    passed: number;
    failed: number;
    duration?: number;
  };
}

/**
 * FlowStateService
 * 
 * Manages flow test states across sessions using VS Code workspace state
 */
export class FlowStateService {
  private static readonly STORAGE_KEY = 'qagenai.flowStates';
  
  constructor(private context: vscode.ExtensionContext) {}
  
  /**
   * Save flow state
   */
  async saveFlowState(state: FlowState): Promise<void> {
    const states = await this.getAllStates();
    const index = states.findIndex(s => s.flowId === state.flowId);
    
    if (index >= 0) {
      states[index] = state;
    } else {
      states.push(state);
    }
    
    await this.context.workspaceState.update(FlowStateService.STORAGE_KEY, states);
  }
  
  /**
   * Get flow state by ID
   */
  async getFlowState(flowId: string): Promise<FlowState | null> {
    const states = await this.getAllStates();
    return states.find(s => s.flowId === flowId) || null;
  }
  
  /**
   * Get all flow states
   */
  async getAllStates(): Promise<FlowState[]> {
    return this.context.workspaceState.get<FlowState[]>(FlowStateService.STORAGE_KEY, []);
  }
  
  /**
   * Update test results after test run
   */
  async updateTestResults(
    flowId: string, 
    results: { total: number; passed: number; failed: number; duration?: number }
  ): Promise<void> {
    const state = await this.getFlowState(flowId);
    
    if (state) {
      state.testResults = results;
      state.lastRunAt = Date.now();
      state.status = results.failed > 0 ? 'failing' : 'passing';
      await this.saveFlowState(state);
    }
  }
  
  /**
   * Mark flow as test generated
   */
  async markAsGenerated(flowId: string, testFilePath: string): Promise<void> {
    let state = await this.getFlowState(flowId);
    
    if (!state) {
      state = {
        flowId,
        status: 'generated',
        testFilePath,
        generatedAt: Date.now()
      };
    } else {
      state.status = 'generated';
      state.testFilePath = testFilePath;
      state.generatedAt = Date.now();
    }
    
    await this.saveFlowState(state);
  }
  
  /**
   * Update partial flow state
   */
  async updateFlowState(flowId: string, updates: Partial<Omit<FlowState, 'flowId'>>): Promise<void> {
    let state = await this.getFlowState(flowId);
    
    if (!state) {
      state = {
        flowId,
        status: 'untested',
        ...updates
      };
    } else {
      Object.assign(state, updates);
    }
    
    await this.saveFlowState(state);
  }
  
  /**
   * Get all states as a map indexed by flowId
   */
  async getAllFlowStates(): Promise<{ [flowId: string]: FlowState }> {
    const states = await this.getAllStates();
    const map: { [flowId: string]: FlowState } = {};
    for (const state of states) {
      map[state.flowId] = state;
    }
    return map;
  }
  
  /**
   * Delete flow state
   */
  async deleteFlowState(flowId: string): Promise<void> {
    const states = await this.getAllStates();
    const filtered = states.filter(s => s.flowId !== flowId);
    await this.context.workspaceState.update(FlowStateService.STORAGE_KEY, filtered);
  }
  
  /**
   * Clear all states (useful for debugging)
   */
  async clearAll(): Promise<void> {
    await this.context.workspaceState.update(FlowStateService.STORAGE_KEY, []);
  }
}

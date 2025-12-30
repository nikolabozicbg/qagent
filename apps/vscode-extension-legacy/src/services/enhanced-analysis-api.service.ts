/**
 * Enhanced Analysis API Service
 * 
 * Responsible for communication with the backend /analyze/enhanced endpoint.
 * Single Responsibility: API calls only, no business logic.
 */

import axios from 'axios';
import { EnhancedAnalysisResponse } from '../types/enhanced-analysis.types';

export class EnhancedAnalysisApiService {
  private readonly baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  /**
   * Analyze workspace and get complete testing ecosystem view
   * 
   * @param workspacePath Absolute path to workspace
   * @returns Enhanced analysis response
   * @throws Error if API call fails
   */
  async analyzeWorkspace(workspacePath: string): Promise<EnhancedAnalysisResponse> {
    try {
      console.log(`[EnhancedAnalysisAPI] Analyzing workspace: ${workspacePath}`);
      
      const response = await axios.post<EnhancedAnalysisResponse>(
        `${this.baseUrl}/analyze/enhanced`,
        { workspacePath },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000 // 60 seconds
        }
      );

      console.log(`[EnhancedAnalysisAPI] Success: ${response.data.summary.overallCoverage}% coverage`);
      return response.data;
    } catch (error) {
      console.error('[EnhancedAnalysisAPI] Failed:', error);
      throw new Error(`Failed to analyze workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Health check - verify backend is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/system/health`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

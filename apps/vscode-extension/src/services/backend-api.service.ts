import * as vscode from 'vscode';
import axios from 'axios';

export class BackendApiService {
    private getApiUrl(): string {
        const config = vscode.workspace.getConfiguration('qagenai');
        return config.get<string>('apiUrl') || 'http://localhost:3001';
    }

    async analyzeWorkspace(workspacePath: string) {
        const apiUrl = this.getApiUrl();
        
        const response = await axios.post(`${apiUrl}/analyze/workspace`, {
            workspacePath
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });

        let report = response.data;
        
        // Fetch setup recommendations and include them in report
        try {
            const recommendationsResponse = await axios.post(`${apiUrl}/analyze/setup-recommendations`, {
                workspacePath: workspacePath
            });
            
            report.stack = recommendationsResponse.data.stack;
            report.recommendations = recommendationsResponse.data.recommendations;
        } catch (error: any) {
            console.error('Failed to fetch recommendations:', error);
        }
        
        return report;
    }

    async getTestTypeRecommendations(fileType: string, frameworks: any) {
        const apiUrl = this.getApiUrl();
        
        const response = await axios.post(`${apiUrl}/analyze/test-type-recommendations`, {
            fileType,
            frameworks
        });
        
        return response.data.recommendations;
    }

    async getSetupRecommendations(workspacePath: string) {
        const apiUrl = this.getApiUrl();
        
        const response = await axios.post(`${apiUrl}/analyze/setup-recommendations`, {
            workspacePath
        });
        
        return response.data;
    }

    async generateTests(code: string, fileName: string, language: string) {
        const apiUrl = this.getApiUrl();
        
        const response = await axios.post(`${apiUrl}/generate/tests`, {
            code,
            fileName,
            language
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });
        
        return response.data.tests;
    }

    async callAgent(query: string, context: any, maxIterations: number = 10) {
        const apiUrl = this.getApiUrl();
        
        const response = await axios.post(`${apiUrl}/generate/agent`, {
            query,
            context,
            maxIterations
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000
        });
        
        return response;
    }
}

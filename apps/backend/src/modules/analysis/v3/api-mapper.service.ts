import { Injectable } from '@nestjs/common';
import { ParsedFile, StringLiteralInfo, HookCall } from './ast-parser.service';
import { StateAnalysis, QueryDefinition } from './state-detector.service';

/**
 * API Layer Mapper v3.0
 * 
 * Phase 2.5: Maps all API calls in the application
 * - Native fetch
 * - Axios
 * - RTK Query endpoints
 * - React Query / TanStack Query
 * - Apollo GraphQL
 * - Custom API wrappers
 */

export interface APIAnalysis {
  endpoints: APIEndpoint[];
  apiClients: APIClient[];
  graphqlOperations: GraphQLOperation[];
  statistics: APIStatistics;
}

export interface APIEndpoint {
  path: string;
  method: HTTPMethod;
  source: 'fetch' | 'axios' | 'rtk-query' | 'react-query' | 'apollo' | 'custom';
  
  // Location
  filePath: string;
  line: number;
  
  // Usage
  usedBy: string[];                    // Components/functions using this
  
  // Details
  hasAuth: boolean;
  hasErrorHandling: boolean;
  responseType: string | null;
}

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export interface APIClient {
  name: string;
  type: 'axios' | 'fetch-wrapper' | 'ky' | 'ofetch' | 'custom';
  baseURL: string | null;
  filePath: string;
  defaultHeaders: Record<string, string>;
  hasInterceptors: boolean;
  hasAuthHeader: boolean;
}

export interface GraphQLOperation {
  name: string;
  type: 'query' | 'mutation' | 'subscription';
  filePath: string;
  variables: string[];
  usedBy: string[];
}

export interface APIStatistics {
  totalEndpoints: number;
  endpointsByMethod: Record<HTTPMethod, number>;
  endpointsBySource: Record<string, number>;
  avgEndpointsPerFile: number;
  hasBaseURL: boolean;
}

@Injectable()
export class APIMapperService {
  
  /**
   * Analyze all API calls
   */
  analyzeAPIs(
    parsedFiles: ParsedFile[],
    stateAnalysis: StateAnalysis
  ): APIAnalysis {
    console.log(`🌐 API Mapper: Analyzing API layer`);
    const startTime = Date.now();
    
    const endpoints: APIEndpoint[] = [];
    const apiClients: APIClient[] = [];
    const graphqlOperations: GraphQLOperation[] = [];
    
    for (const file of parsedFiles) {
      // Detect fetch calls
      this.detectFetchCalls(file, endpoints);
      
      // Detect axios calls
      this.detectAxiosCalls(file, endpoints, apiClients);
      
      // Detect GraphQL operations
      this.detectGraphQL(file, graphqlOperations);
      
      // Detect API wrappers
      this.detectAPIWrappers(file, apiClients);
    }
    
    // Merge with RTK Query / React Query endpoints from state analysis
    this.mergeQueryEndpoints(stateAnalysis.queries, endpoints);
    
    // Deduplicate endpoints
    const uniqueEndpoints = this.deduplicateEndpoints(endpoints);
    
    const statistics = this.calculateStatistics(uniqueEndpoints, apiClients);
    
    const analysisTime = Date.now() - startTime;
    console.log(`   Found ${uniqueEndpoints.length} API endpoints in ${analysisTime}ms`);
    
    return { 
      endpoints: uniqueEndpoints, 
      apiClients, 
      graphqlOperations, 
      statistics 
    };
  }
  
  /**
   * Detect native fetch calls
   */
  private detectFetchCalls(file: ParsedFile, endpoints: APIEndpoint[]): void {
    // Find fetch() calls from string literals
    const apiPaths = file.stringLiterals.filter(s => 
      s.type === 'api-path' || s.type === 'url'
    );
    
    for (const literal of apiPaths) {
      if (literal.context.includes('fetch')) {
        const method = this.inferMethodFromContext(literal.context);
        
        endpoints.push({
          path: literal.value,
          method,
          source: 'fetch',
          filePath: file.filePath,
          line: literal.line,
          usedBy: [],
          hasAuth: this.detectAuthInContext(file, literal.line),
          hasErrorHandling: this.detectErrorHandling(file, literal.line),
          responseType: null,
        });
      }
    }
    
    // Also check function bodies for fetch patterns
    for (const func of file.functions) {
      if (func.body.includes('fetch(')) {
        const urlMatches = func.body.matchAll(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/g);
        for (const match of urlMatches) {
          const existingPath = endpoints.find(e => e.path === match[1]);
          if (!existingPath) {
            endpoints.push({
              path: match[1],
              method: this.inferMethodFromBody(func.body, match[1]),
              source: 'fetch',
              filePath: file.filePath,
              line: func.line,
              usedBy: [func.name],
              hasAuth: func.body.includes('Authorization') || func.body.includes('Bearer'),
              hasErrorHandling: func.body.includes('catch') || func.body.includes('.ok'),
              responseType: null,
            });
          }
        }
      }
    }
  }
  
  /**
   * Detect axios calls
   */
  private detectAxiosCalls(
    file: ParsedFile, 
    endpoints: APIEndpoint[],
    clients: APIClient[]
  ): void {
    const hasAxios = file.imports.some(i => i.source === 'axios');
    if (!hasAxios) return;
    
    // Look for axios instance creation
    for (const func of file.functions) {
      if (func.body.includes('axios.create')) {
        const baseURLMatch = func.body.match(/baseURL:\s*['"`]([^'"`]+)['"`]/);
        
        clients.push({
          name: this.extractAxiosInstanceName(func.body),
          type: 'axios',
          baseURL: baseURLMatch ? baseURLMatch[1] : null,
          filePath: file.filePath,
          defaultHeaders: this.extractDefaultHeaders(func.body),
          hasInterceptors: func.body.includes('interceptors'),
          hasAuthHeader: func.body.includes('Authorization'),
        });
      }
      
      // Detect axios calls
      const axiosMethods = ['get', 'post', 'put', 'delete', 'patch'];
      for (const method of axiosMethods) {
        const pattern = new RegExp(`axios\\.${method}\\s*\\(\\s*['"\`]([^'"\`]+)['"\`]`, 'g');
        const matches = func.body.matchAll(pattern);
        
        for (const match of matches) {
          endpoints.push({
            path: match[1],
            method: method.toUpperCase() as HTTPMethod,
            source: 'axios',
            filePath: file.filePath,
            line: func.line,
            usedBy: [func.name],
            hasAuth: func.body.includes('Authorization'),
            hasErrorHandling: func.body.includes('catch'),
            responseType: null,
          });
        }
      }
    }
  }
  
  /**
   * Detect GraphQL operations
   */
  private detectGraphQL(file: ParsedFile, operations: GraphQLOperation[]): void {
    const hasApollo = file.imports.some(i => 
      i.source.includes('apollo') || i.source.includes('graphql')
    );
    
    if (!hasApollo) return;
    
    // Look for gql tagged templates or useQuery/useMutation
    for (const func of file.functions) {
      // Check for gql`...`
      if (func.body.includes('gql`')) {
        const queryMatch = func.body.match(/gql`\s*(query|mutation|subscription)\s+(\w+)/);
        if (queryMatch) {
          operations.push({
            name: queryMatch[2],
            type: queryMatch[1] as 'query' | 'mutation' | 'subscription',
            filePath: file.filePath,
            variables: [],
            usedBy: [func.name],
          });
        }
      }
    }
    
    // Check for Apollo hooks
    const apolloHooks = file.hooks.filter(h =>
      h.name === 'useQuery' || h.name === 'useMutation' || h.name === 'useSubscription'
    );
    
    for (const hook of apolloHooks) {
      const queryArg = hook.arguments[0]?.value;
      if (queryArg) {
        operations.push({
          name: queryArg,
          type: hook.name === 'useMutation' ? 'mutation' : 
                hook.name === 'useSubscription' ? 'subscription' : 'query',
          filePath: file.filePath,
          variables: [],
          usedBy: hook.parentFunction ? [hook.parentFunction] : [],
        });
      }
    }
  }
  
  /**
   * Detect custom API wrappers
   */
  private detectAPIWrappers(file: ParsedFile, clients: APIClient[]): void {
    // Look for common API wrapper patterns
    for (const func of file.functions) {
      // Check if function creates an API client
      const isAPIWrapper = 
        func.name.toLowerCase().includes('api') ||
        func.name.toLowerCase().includes('client') ||
        func.name.toLowerCase().includes('http');
      
      if (isAPIWrapper && func.isExported) {
        const hasBaseURL = func.body.includes('baseURL') || func.body.includes('BASE_URL');
        
        if (hasBaseURL) {
          clients.push({
            name: func.name,
            type: 'custom',
            baseURL: this.extractBaseURL(func.body),
            filePath: file.filePath,
            defaultHeaders: {},
            hasInterceptors: false,
            hasAuthHeader: func.body.includes('Authorization'),
          });
        }
      }
    }
  }
  
  /**
   * Merge query endpoints from state analysis
   */
  private mergeQueryEndpoints(queries: QueryDefinition[], endpoints: APIEndpoint[]): void {
    for (const query of queries) {
      if (query.endpoint) {
        // Map query library types to API source types
        const sourceMap: Record<string, APIEndpoint['source']> = {
          'rtk-query': 'rtk-query',
          'react-query': 'react-query',
          'apollo': 'apollo',
          'swr': 'custom', // SWR maps to custom since it's not in APIEndpoint source type
        };
        
        endpoints.push({
          path: query.endpoint,
          method: query.method || 'GET',
          source: sourceMap[query.type] || 'custom',
          filePath: query.filePath,
          line: 0,
          usedBy: query.usedIn,
          hasAuth: false,
          hasErrorHandling: true, // RTK Query handles errors
          responseType: null,
        });
      }
    }
  }
  
  /**
   * Deduplicate endpoints by path and method
   */
  private deduplicateEndpoints(endpoints: APIEndpoint[]): APIEndpoint[] {
    const seen = new Map<string, APIEndpoint>();
    
    for (const endpoint of endpoints) {
      const key = `${endpoint.method}:${endpoint.path}`;
      const existing = seen.get(key);
      
      if (existing) {
        // Merge usedBy
        existing.usedBy = [...new Set([...existing.usedBy, ...endpoint.usedBy])];
      } else {
        seen.set(key, { ...endpoint });
      }
    }
    
    return Array.from(seen.values());
  }
  
  // Helper methods
  
  private inferMethodFromContext(context: string): HTTPMethod {
    const lower = context.toLowerCase();
    if (lower.includes('post')) return 'POST';
    if (lower.includes('put')) return 'PUT';
    if (lower.includes('delete')) return 'DELETE';
    if (lower.includes('patch')) return 'PATCH';
    return 'GET';
  }
  
  private inferMethodFromBody(body: string, url: string): HTTPMethod {
    // Look for method specification near the URL
    const urlIndex = body.indexOf(url);
    const context = body.substring(Math.max(0, urlIndex - 200), urlIndex + url.length + 200);
    
    if (context.includes("method: 'POST'") || context.includes('method: "POST"')) return 'POST';
    if (context.includes("method: 'PUT'") || context.includes('method: "PUT"')) return 'PUT';
    if (context.includes("method: 'DELETE'") || context.includes('method: "DELETE"')) return 'DELETE';
    if (context.includes("method: 'PATCH'") || context.includes('method: "PATCH"')) return 'PATCH';
    
    return 'GET';
  }
  
  private detectAuthInContext(file: ParsedFile, line: number): boolean {
    // Simple heuristic: check for Authorization header nearby
    for (const func of file.functions) {
      if (func.line <= line && func.endLine >= line) {
        return func.body.includes('Authorization') || func.body.includes('Bearer');
      }
    }
    return false;
  }
  
  private detectErrorHandling(file: ParsedFile, line: number): boolean {
    for (const func of file.functions) {
      if (func.line <= line && func.endLine >= line) {
        return func.body.includes('catch') || 
               func.body.includes('.ok') ||
               func.body.includes('try {');
      }
    }
    return false;
  }
  
  private extractAxiosInstanceName(body: string): string {
    const match = body.match(/(?:const|let|var)\s+(\w+)\s*=\s*axios\.create/);
    return match ? match[1] : 'axiosInstance';
  }
  
  private extractDefaultHeaders(body: string): Record<string, string> {
    const headers: Record<string, string> = {};
    
    // Simple extraction of Content-Type
    if (body.includes("'Content-Type'") || body.includes('"Content-Type"')) {
      const contentTypeMatch = body.match(/['"]Content-Type['"]\s*:\s*['"]([^'"]+)['"]/);
      if (contentTypeMatch) {
        headers['Content-Type'] = contentTypeMatch[1];
      }
    }
    
    return headers;
  }
  
  private extractBaseURL(body: string): string | null {
    const patterns = [
      /baseURL:\s*['"`]([^'"`]+)['"`]/,
      /BASE_URL\s*=\s*['"`]([^'"`]+)['"`]/,
      /baseUrl:\s*['"`]([^'"`]+)['"`]/,
    ];
    
    for (const pattern of patterns) {
      const match = body.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }
  
  private calculateStatistics(
    endpoints: APIEndpoint[],
    clients: APIClient[]
  ): APIStatistics {
    const endpointsByMethod: Record<HTTPMethod, number> = {
      GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0, OPTIONS: 0, HEAD: 0
    };
    const endpointsBySource: Record<string, number> = {};
    
    for (const endpoint of endpoints) {
      endpointsByMethod[endpoint.method]++;
      endpointsBySource[endpoint.source] = (endpointsBySource[endpoint.source] || 0) + 1;
    }
    
    const filesWithEndpoints = new Set(endpoints.map(e => e.filePath)).size;
    
    return {
      totalEndpoints: endpoints.length,
      endpointsByMethod,
      endpointsBySource,
      avgEndpointsPerFile: filesWithEndpoints > 0 ? endpoints.length / filesWithEndpoints : 0,
      hasBaseURL: clients.some(c => c.baseURL !== null),
    };
  }
  
  /**
   * Find endpoints used by a component
   */
  findComponentEndpoints(analysis: APIAnalysis, componentName: string): APIEndpoint[] {
    return analysis.endpoints.filter(e => e.usedBy.includes(componentName));
  }
  
  /**
   * Get all POST endpoints (likely mutations)
   */
  getMutationEndpoints(analysis: APIAnalysis): APIEndpoint[] {
    return analysis.endpoints.filter(e => 
      e.method === 'POST' || e.method === 'PUT' || e.method === 'DELETE' || e.method === 'PATCH'
    );
  }
}

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * HTTP method type
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * API endpoint parameter
 */
export interface ApiParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie' | 'body';
  required: boolean;
  type: string;
  description?: string;
  example?: any;
}

/**
 * API endpoint response
 */
export interface ApiResponse {
  statusCode: string;
  description: string;
  schema?: any;
  example?: any;
}

/**
 * API endpoint
 */
export interface ApiEndpoint {
  id: string;
  path: string;
  method: HttpMethod;
  summary?: string;
  description?: string;
  operationId?: string;
  tags: string[];
  parameters: ApiParameter[];
  requestBody?: {
    required: boolean;
    contentType: string;
    schema?: any;
    example?: any;
  };
  responses: ApiResponse[];
  security?: string[];
  deprecated: boolean;
  hasMockData: boolean;
  testStatus: 'tested' | 'partial' | 'untested';
  testFilePath?: string;
}

/**
 * API tag/group
 */
export interface ApiTag {
  name: string;
  description?: string;
  endpoints: ApiEndpoint[];
}

/**
 * Parsed OpenAPI spec
 */
export interface ParsedApiSpec {
  title: string;
  version: string;
  description?: string;
  baseUrl: string;
  tags: ApiTag[];
  endpoints: ApiEndpoint[];
  totalEndpoints: number;
  testedEndpoints: number;
  coverage: number;
  securitySchemes: string[];
  specPath: string;
  specFormat: 'openapi' | 'swagger';
}

/**
 * OpenAPIParserService
 * 
 * Parses OpenAPI/Swagger specifications and extracts:
 * - All API endpoints with methods, parameters, responses
 * - Security schemes and authentication requirements
 * - Request/response schemas for test generation
 * - Groups endpoints by tags
 */
export class OpenAPIParserService {
  
  /**
   * Find OpenAPI spec file in workspace
   */
  async findSpecFile(workspaceRoot: string): Promise<string | null> {
    const possiblePaths = [
      'openapi.yaml', 'openapi.yml', 'openapi.json',
      'swagger.yaml', 'swagger.yml', 'swagger.json',
      'api-spec.yaml', 'api-spec.yml', 'api-spec.json',
      'docs/openapi.yaml', 'docs/openapi.yml', 'docs/openapi.json',
      'docs/swagger.yaml', 'docs/swagger.yml', 'docs/swagger.json',
      'api/openapi.yaml', 'api/openapi.yml', 'api/openapi.json',
      '.swagger/swagger.json', // NestJS default
      'swagger.json' // Generated
    ];
    
    for (const relativePath of possiblePaths) {
      const fullPath = path.join(workspaceRoot, relativePath);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    
    // Try to find via glob pattern
    const files = await vscode.workspace.findFiles(
      '**/openapi.{yaml,yml,json}',
      '**/node_modules/**'
    );
    
    if (files.length > 0) {
      return files[0].fsPath;
    }
    
    const swaggerFiles = await vscode.workspace.findFiles(
      '**/swagger.{yaml,yml,json}',
      '**/node_modules/**'
    );
    
    if (swaggerFiles.length > 0) {
      return swaggerFiles[0].fsPath;
    }
    
    return null;
  }
  
  /**
   * Parse OpenAPI specification file
   */
  async parseSpec(specPath: string, workspaceRoot: string): Promise<ParsedApiSpec | null> {
    try {
      const content = fs.readFileSync(specPath, 'utf-8');
      let spec: any;
      
      if (specPath.endsWith('.json')) {
        spec = JSON.parse(content);
      } else {
        // Parse YAML
        spec = this.parseYaml(content);
      }
      
      // Determine spec format
      const isOpenApi3 = spec.openapi && spec.openapi.startsWith('3.');
      const isSwagger2 = spec.swagger && spec.swagger.startsWith('2.');
      
      if (!isOpenApi3 && !isSwagger2) {
        console.error('Unknown API spec format');
        return null;
      }
      
      // Extract base URL
      let baseUrl = '';
      if (isOpenApi3 && spec.servers && spec.servers.length > 0) {
        baseUrl = spec.servers[0].url || '';
      } else if (isSwagger2) {
        const scheme = spec.schemes?.[0] || 'http';
        baseUrl = `${scheme}://${spec.host || 'localhost'}${spec.basePath || ''}`;
      }
      
      // Parse endpoints
      const endpoints: ApiEndpoint[] = [];
      const paths = spec.paths || {};
      
      for (const [pathUrl, pathItem] of Object.entries(paths)) {
        const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
        
        for (const method of methods) {
          const operation = (pathItem as any)[method.toLowerCase()];
          if (!operation) continue;
          
          const endpoint = this.parseEndpoint(
            pathUrl, 
            method, 
            operation, 
            spec,
            workspaceRoot
          );
          endpoints.push(endpoint);
        }
      }
      
      // Group by tags
      const tagMap = new Map<string, ApiEndpoint[]>();
      const tagDescriptions = new Map<string, string>();
      
      // Get tag descriptions from spec
      if (spec.tags) {
        for (const tag of spec.tags) {
          tagDescriptions.set(tag.name, tag.description || '');
        }
      }
      
      for (const endpoint of endpoints) {
        for (const tag of endpoint.tags.length > 0 ? endpoint.tags : ['Untagged']) {
          if (!tagMap.has(tag)) {
            tagMap.set(tag, []);
          }
          tagMap.get(tag)!.push(endpoint);
        }
      }
      
      const tags: ApiTag[] = Array.from(tagMap.entries()).map(([name, eps]) => ({
        name,
        description: tagDescriptions.get(name),
        endpoints: eps
      }));
      
      // Calculate coverage
      const testedEndpoints = endpoints.filter(e => e.testStatus === 'tested').length;
      const coverage = endpoints.length > 0 
        ? Math.round((testedEndpoints / endpoints.length) * 100) 
        : 0;
      
      // Extract security schemes
      const securitySchemes: string[] = [];
      const secDefs = spec.securityDefinitions || spec.components?.securitySchemes || {};
      for (const [name, scheme] of Object.entries(secDefs)) {
        const schemeType = (scheme as any).type || (scheme as any).scheme;
        securitySchemes.push(`${name} (${schemeType})`);
      }
      
      return {
        title: spec.info?.title || 'API',
        version: spec.info?.version || '1.0.0',
        description: spec.info?.description,
        baseUrl,
        tags,
        endpoints,
        totalEndpoints: endpoints.length,
        testedEndpoints,
        coverage,
        securitySchemes,
        specPath,
        specFormat: isOpenApi3 ? 'openapi' : 'swagger'
      };
      
    } catch (error) {
      console.error('Failed to parse OpenAPI spec:', error);
      return null;
    }
  }
  
  /**
   * Parse individual endpoint
   */
  private parseEndpoint(
    pathUrl: string,
    method: HttpMethod,
    operation: any,
    spec: any,
    workspaceRoot: string
  ): ApiEndpoint {
    const id = `${method}-${pathUrl.replace(/\//g, '-').replace(/[{}]/g, '')}`;
    
    // Parse parameters
    const parameters: ApiParameter[] = [];
    const allParams = [...(operation.parameters || [])];
    
    for (const param of allParams) {
      // Handle $ref
      const resolvedParam = param.$ref 
        ? this.resolveRef(param.$ref, spec)
        : param;
      
      parameters.push({
        name: resolvedParam.name,
        in: resolvedParam.in,
        required: resolvedParam.required || false,
        type: resolvedParam.schema?.type || resolvedParam.type || 'string',
        description: resolvedParam.description,
        example: resolvedParam.example || resolvedParam.schema?.example
      });
    }
    
    // Parse request body (OpenAPI 3)
    let requestBody: ApiEndpoint['requestBody'];
    if (operation.requestBody) {
      const content = operation.requestBody.content;
      const contentType = Object.keys(content)[0] || 'application/json';
      const mediaType = content[contentType];
      
      requestBody = {
        required: operation.requestBody.required || false,
        contentType,
        schema: mediaType.schema,
        example: mediaType.example || mediaType.schema?.example
      };
    }
    
    // Parse responses
    const responses: ApiResponse[] = [];
    for (const [statusCode, response] of Object.entries(operation.responses || {})) {
      const resp = response as any;
      const content = resp.content;
      
      responses.push({
        statusCode,
        description: resp.description || '',
        schema: content ? Object.values(content)[0] : undefined,
        example: resp.example
      });
    }
    
    // Check if test exists
    const testStatus = this.checkTestStatus(pathUrl, method, workspaceRoot);
    
    // Parse security
    const security: string[] = [];
    if (operation.security) {
      for (const secReq of operation.security) {
        security.push(...Object.keys(secReq));
      }
    }
    
    return {
      id,
      path: pathUrl,
      method,
      summary: operation.summary,
      description: operation.description,
      operationId: operation.operationId,
      tags: operation.tags || [],
      parameters,
      requestBody,
      responses,
      security,
      deprecated: operation.deprecated || false,
      hasMockData: !!(requestBody?.example || responses.some(r => r.example)),
      testStatus
    };
  }
  
  /**
   * Resolve $ref in OpenAPI spec
   */
  private resolveRef(ref: string, spec: any): any {
    const parts = ref.replace('#/', '').split('/');
    let current = spec;
    
    for (const part of parts) {
      current = current[part];
      if (!current) return {};
    }
    
    return current;
  }
  
  /**
   * Check if endpoint has test
   */
  private checkTestStatus(
    pathUrl: string, 
    method: HttpMethod, 
    workspaceRoot: string
  ): 'tested' | 'partial' | 'untested' {
    // Look for test files that might test this endpoint
    const testPatterns = [
      'test/**/*.spec.ts',
      'test/**/*.test.ts',
      '__tests__/**/*.ts',
      'src/**/*.spec.ts',
      'src/**/*.test.ts'
    ];
    
    // Simplified check - return untested for now
    // In real implementation, we'd parse test files and look for endpoint references
    return 'untested';
  }
  
  /**
   * Simple YAML parser (basic implementation)
   */
  private parseYaml(content: string): any {
    // For a real implementation, use 'yaml' or 'js-yaml' package
    // This is a simplified version for basic YAML
    try {
      // Try to parse as JSON first (in case it's JSON with .yaml extension)
      return JSON.parse(content);
    } catch {
      // Basic YAML parsing - in production, use a proper YAML library
      // This is a placeholder that will work for simple specs
      const lines = content.split('\n');
      const result: any = {};
      let currentKey = '';
      let currentIndent = 0;
      const stack: any[] = [result];
      
      for (const line of lines) {
        if (line.trim().startsWith('#') || !line.trim()) continue;
        
        const match = line.match(/^(\s*)([^:]+):\s*(.*)?$/);
        if (!match) continue;
        
        const [, indent, key, value] = match;
        const indentLevel = indent.length / 2;
        
        while (stack.length > indentLevel + 1) {
          stack.pop();
        }
        
        const current = stack[stack.length - 1];
        
        if (value && value.trim()) {
          // Simple value
          let parsedValue: any = value.trim();
          if (parsedValue === 'true') parsedValue = true;
          else if (parsedValue === 'false') parsedValue = false;
          else if (!isNaN(Number(parsedValue))) parsedValue = Number(parsedValue);
          else if (parsedValue.startsWith('"') && parsedValue.endsWith('"')) {
            parsedValue = parsedValue.slice(1, -1);
          }
          current[key.trim()] = parsedValue;
        } else {
          // Object or array
          const newObj: any = {};
          current[key.trim()] = newObj;
          stack.push(newObj);
        }
      }
      
      return result;
    }
  }
  
  /**
   * Generate test code for an endpoint
   */
  generateTestCode(endpoint: ApiEndpoint, baseUrl: string): string {
    const lines: string[] = [
      `import { test, expect } from '@playwright/test';`,
      ``,
      `test.describe('${endpoint.method} ${endpoint.path}', () => {`
    ];
    
    // Success test
    lines.push(`  test('should return success response', async ({ request }) => {`);
    
    // Build URL with path params
    let url = `${baseUrl}${endpoint.path}`;
    const pathParams = endpoint.parameters.filter(p => p.in === 'path');
    for (const param of pathParams) {
      url = url.replace(`{${param.name}}`, param.example || '1');
    }
    
    lines.push(`    const response = await request.${endpoint.method.toLowerCase()}('${url}'`);
    
    // Add request body if present
    if (endpoint.requestBody) {
      const example = endpoint.requestBody.example || this.generateMockData(endpoint.requestBody.schema);
      lines.push(`, {`);
      lines.push(`      data: ${JSON.stringify(example, null, 6)}`);
      lines.push(`    }`);
    }
    
    lines.push(`    );`);
    lines.push(``);
    lines.push(`    expect(response.ok()).toBeTruthy();`);
    
    // Add response validation
    const successResponse = endpoint.responses.find(r => r.statusCode.startsWith('2'));
    if (successResponse) {
      lines.push(`    expect(response.status()).toBe(${successResponse.statusCode});`);
    }
    
    lines.push(`  });`);
    lines.push(``);
    
    // Validation error test (if has required params)
    const requiredParams = endpoint.parameters.filter(p => p.required);
    if (requiredParams.length > 0 || endpoint.requestBody?.required) {
      lines.push(`  test('should return 400 for invalid request', async ({ request }) => {`);
      lines.push(`    const response = await request.${endpoint.method.toLowerCase()}('${url}', {`);
      lines.push(`      data: {}`);
      lines.push(`    });`);
      lines.push(``);
      lines.push(`    expect(response.status()).toBe(400);`);
      lines.push(`  });`);
      lines.push(``);
    }
    
    lines.push(`});`);
    
    return lines.join('\n');
  }
  
  /**
   * Generate mock data from schema
   */
  private generateMockData(schema: any): any {
    if (!schema) return {};
    
    if (schema.example) return schema.example;
    
    switch (schema.type) {
      case 'object':
        const obj: any = {};
        for (const [key, prop] of Object.entries(schema.properties || {})) {
          obj[key] = this.generateMockData(prop);
        }
        return obj;
      case 'array':
        return [this.generateMockData(schema.items)];
      case 'string':
        if (schema.format === 'email') return 'test@example.com';
        if (schema.format === 'date') return '2024-01-01';
        if (schema.format === 'date-time') return '2024-01-01T00:00:00Z';
        if (schema.enum) return schema.enum[0];
        return 'string';
      case 'number':
      case 'integer':
        return schema.minimum || 1;
      case 'boolean':
        return true;
      default:
        return null;
    }
  }
}

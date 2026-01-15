import { Injectable } from '@nestjs/common';
import * as babel from '@babel/core';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

export interface DiscoveredAPI {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payloadFields?: string[];
  confidence: number;
  location: string; // where in code
}

/**
 * APIDiscoveryService
 * 
 * Uses Babel AST traversal to discover API calls in component code.
 * Detects: fetch(), axios, custom API clients, GraphQL mutations.
 * 
 * Goal: Find `/login` POST call in SignInForm so we can generate proper assertions.
 */
@Injectable()
export class APIDiscoveryService {
  
  /**
   * Discover all API calls in component code
   */
  discoverAPIs(componentCode: string, componentPath: string): DiscoveredAPI[] {
    const apis: DiscoveredAPI[] = [];
    
    try {
      // Parse code with Babel
      const ast = babel.parseSync(componentCode, {
        sourceType: 'module',
        plugins: [
          require('@babel/plugin-syntax-jsx'),
          require('@babel/plugin-syntax-typescript')
        ],
        filename: componentPath
      });
      
      if (!ast) return apis;
      
      // Traverse AST to find API calls
      traverse(ast, {
        CallExpression: (path) => {
          const node = path.node;
          
          // Pattern 1: fetch() calls
          if (t.isIdentifier(node.callee) && node.callee.name === 'fetch') {
            const api = this.parseFetchCall(node);
            if (api) apis.push(api);
            return;
          }
          
          // Pattern 2: useMutation(MUTATION_NAME) for GraphQL
          if (t.isIdentifier(node.callee) && node.callee.name === 'useMutation') {
            const api = this.parseGraphQLMutation(node);
            if (api) apis.push(api);
            return;
          }
          
          // Pattern 3: axios.post(), axios.get(), etc.
          if (t.isMemberExpression(node.callee)) {
            const api = this.parseAxiosCall(node);
            if (api) {
              apis.push(api);
              return;
            }
            
            // Pattern 4: Custom API client: api.login(), api.createUser()
            const customApi = this.parseCustomAPICall(node);
            if (customApi) apis.push(customApi);
          }
        }
      });
      
    } catch (error) {
      console.error(`Failed to parse ${componentPath}:`, error.message);
    }
    
    return this.deduplicateAPIs(apis);
  }
  
  /**
   * Parse fetch() call
   * fetch('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) })
   */
  private parseFetchCall(node: t.CallExpression): DiscoveredAPI | null {
    if (node.arguments.length === 0) return null;
    
    // First argument: URL
    const urlArg = node.arguments[0];
    let endpoint = '';
    
    if (t.isStringLiteral(urlArg)) {
      endpoint = urlArg.value;
    } else if (t.isTemplateLiteral(urlArg)) {
      // Template literal: `/api/users/${id}` → /api/users/:id
      endpoint = this.extractTemplateString(urlArg);
    } else {
      return null; // Dynamic URL, can't determine
    }
    
    // Second argument: options { method, body }
    let method: any = 'GET';
    let payloadFields: string[] = [];
    
    if (node.arguments.length > 1) {
      const optionsArg = node.arguments[1];
      if (t.isObjectExpression(optionsArg)) {
        for (const prop of optionsArg.properties) {
          if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
            if (prop.key.name === 'method' && t.isStringLiteral(prop.value)) {
              method = prop.value.value.toUpperCase();
            }
            if (prop.key.name === 'body') {
              payloadFields = this.extractPayloadFields(prop.value);
            }
          }
        }
      }
    }
    
    return {
      endpoint: this.normalizeEndpoint(endpoint),
      method,
      payloadFields,
      confidence: 95,
      location: 'fetch'
    };
  }
  
  /**
   * Parse axios calls
   * axios.post('/api/login', { username, password })
   * axios({ url: '/api/login', method: 'POST', data: { username, password } })
   */
  private parseAxiosCall(node: t.CallExpression): DiscoveredAPI | null {
    if (!t.isMemberExpression(node.callee)) return null;
    
    const object = node.callee.object;
    const property = node.callee.property;
    
    // Check if it's axios.*
    if (!t.isIdentifier(object) || object.name !== 'axios') return null;
    
    // Method from function name: axios.post → POST
    let method: any = 'GET';
    if (t.isIdentifier(property)) {
      const methodName = property.name.toUpperCase();
      if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(methodName)) {
        method = methodName;
      }
    }
    
    // First argument: URL
    if (node.arguments.length === 0) return null;
    
    const urlArg = node.arguments[0];
    let endpoint = '';
    
    if (t.isStringLiteral(urlArg)) {
      endpoint = urlArg.value;
    } else if (t.isTemplateLiteral(urlArg)) {
      endpoint = this.extractTemplateString(urlArg);
    } else if (t.isObjectExpression(urlArg)) {
      // Config object: axios({ url, method, data })
      return this.parseAxiosConfigObject(urlArg);
    } else {
      return null;
    }
    
    // Second argument: data payload
    let payloadFields: string[] = [];
    if (node.arguments.length > 1) {
      const dataArg = node.arguments[1];
      payloadFields = this.extractPayloadFields(dataArg);
    }
    
    return {
      endpoint: this.normalizeEndpoint(endpoint),
      method,
      payloadFields,
      confidence: 95,
      location: 'axios'
    };
  }
  
  /**
   * Parse axios config object
   * axios({ url: '/api/login', method: 'POST', data: { username, password } })
   */
  private parseAxiosConfigObject(node: t.ObjectExpression): DiscoveredAPI | null {
    let endpoint = '';
    let method: any = 'GET';
    let payloadFields: string[] = [];
    
    for (const prop of node.properties) {
      if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
        if (prop.key.name === 'url' && t.isStringLiteral(prop.value)) {
          endpoint = prop.value.value;
        }
        if (prop.key.name === 'method' && t.isStringLiteral(prop.value)) {
          method = prop.value.value.toUpperCase();
        }
        if (prop.key.name === 'data') {
          payloadFields = this.extractPayloadFields(prop.value);
        }
      }
    }
    
    if (!endpoint) return null;
    
    return {
      endpoint: this.normalizeEndpoint(endpoint),
      method,
      payloadFields,
      confidence: 95,
      location: 'axios-config'
    };
  }
  
  /**
   * Parse custom API client calls
   * api.login({ username, password })
   * apiClient.users.create(data)
   */
  private parseCustomAPICall(node: t.CallExpression): DiscoveredAPI | null {
    if (!t.isMemberExpression(node.callee)) return null;
    
    const object = node.callee.object;
    const property = node.callee.property;
    
    // Check if object is named 'api', 'apiClient', 'client', 'service'
    const apiClientNames = ['api', 'apiClient', 'client', 'service', 'http', 'request'];
    let isAPIClient = false;
    
    if (t.isIdentifier(object)) {
      isAPIClient = apiClientNames.includes(object.name);
    }
    
    if (!isAPIClient) return null;
    
    // Infer endpoint from method name
    if (!t.isIdentifier(property)) return null;
    
    const methodName = property.name;
    const endpoint = this.inferEndpointFromMethod(methodName);
    const method = this.inferHTTPMethod(methodName);
    
    // Extract payload fields
    let payloadFields: string[] = [];
    if (node.arguments.length > 0) {
      payloadFields = this.extractPayloadFields(node.arguments[0]);
    }
    
    return {
      endpoint,
      method,
      payloadFields,
      confidence: 70, // Lower confidence for inferred endpoints
      location: 'custom-api'
    };
  }
  
  /**
   * Parse GraphQL mutation
   * useMutation(LOGIN_MUTATION)
   */
  private parseGraphQLMutation(node: t.CallExpression): DiscoveredAPI | null {
    if (node.arguments.length === 0) return null;
    
    const mutationArg = node.arguments[0];
    if (!t.isIdentifier(mutationArg)) return null;
    
    const mutationName = mutationArg.name;
    const endpoint = `/graphql`; // Generic GraphQL endpoint
    
    return {
      endpoint,
      method: 'POST',
      payloadFields: [],
      confidence: 80,
      location: `graphql:${mutationName}`
    };
  }
  
  /**
   * Extract template literal string
   * `/api/users/${id}` → /api/users/:id
   */
  private extractTemplateString(node: t.TemplateLiteral): string {
    let result = '';
    for (let i = 0; i < node.quasis.length; i++) {
      result += node.quasis[i].value.raw;
      if (i < node.expressions.length) {
        result += ':param'; // Replace ${expr} with :param
      }
    }
    return result;
  }
  
  /**
   * Extract payload fields from object expression
   * { username, password } → ['username', 'password']
   * { username: user, password: pass } → ['username', 'password']
   */
  private extractPayloadFields(node: t.Node): string[] {
    const fields: string[] = [];
    
    if (t.isObjectExpression(node)) {
      for (const prop of node.properties) {
        if (t.isObjectProperty(prop)) {
          if (t.isIdentifier(prop.key)) {
            fields.push(prop.key.name);
          }
        } else if (t.isSpreadElement(prop)) {
          // Handle spread: { ...credentials } → cannot determine fields
          fields.push('...spread');
        }
      }
    } else if (t.isIdentifier(node)) {
      // Variable reference: cannot determine fields statically
      fields.push(`${node.name}.*`);
    }
    
    return fields;
  }
  
  /**
   * Infer endpoint from method name
   * login → /login, createUser → /users, updateProfile → /profile
   */
  private inferEndpointFromMethod(methodName: string): string {
    // Remove common prefixes
    let name = methodName
      .replace(/^(get|post|put|patch|delete|create|update|fetch|load)/i, '')
      .replace(/^(add|remove|delete)/i, '');
    
    // Convert to kebab-case
    const kebab = name
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
    
    // Common mappings
    const mappings: Record<string, string> = {
      'login': '/login',
      'signin': '/login',
      'signup': '/signup',
      'register': '/users',
      'logout': '/logout',
      'user': '/users',
      'profile': '/profile',
      'transaction': '/transactions',
      'account': '/accounts',
      'bankaccount': '/bankaccounts',
      'comment': '/comments'
    };
    
    const lower = name.toLowerCase();
    if (mappings[lower]) return mappings[lower];
    
    return `/${kebab}`;
  }
  
  /**
   * Infer HTTP method from function name
   * login → POST, getUser → GET, updateProfile → PUT, deleteAccount → DELETE
   */
  private inferHTTPMethod(methodName: string): any {
    const lower = methodName.toLowerCase();
    
    if (lower.startsWith('get') || lower.startsWith('fetch') || lower.startsWith('load')) {
      return 'GET';
    }
    if (lower.startsWith('create') || lower.startsWith('add') || lower.includes('login') || lower.includes('signup')) {
      return 'POST';
    }
    if (lower.startsWith('update') || lower.startsWith('edit')) {
      return 'PUT';
    }
    if (lower.startsWith('delete') || lower.startsWith('remove')) {
      return 'DELETE';
    }
    
    return 'POST'; // Default for ambiguous cases
  }
  
  /**
   * Normalize endpoint
   * Remove base URL, trailing slashes
   */
  private normalizeEndpoint(endpoint: string): string {
    // Remove base URL if present
    endpoint = endpoint
      .replace(/^https?:\/\/[^/]+/, '')
      .replace(/^\/api/, ''); // Remove /api prefix
    
    // Ensure starts with /
    if (!endpoint.startsWith('/')) {
      endpoint = '/' + endpoint;
    }
    
    // Remove trailing slash
    endpoint = endpoint.replace(/\/$/, '');
    
    return endpoint;
  }
  
  /**
   * Deduplicate APIs (same endpoint + method)
   */
  private deduplicateAPIs(apis: DiscoveredAPI[]): DiscoveredAPI[] {
    const map = new Map<string, DiscoveredAPI>();
    
    for (const api of apis) {
      const key = `${api.method}:${api.endpoint}`;
      const existing = map.get(key);
      
      // Keep the one with higher confidence
      if (!existing || api.confidence > existing.confidence) {
        map.set(key, api);
      }
    }
    
    return Array.from(map.values());
  }
}

import { Injectable } from '@nestjs/common';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as fs from 'fs';
import * as path from 'path';

// @ts-ignore - Babel traverse default export issue
const traverseDefault = traverse.default || traverse;

export interface StateManagement {
  type: 'xstate' | 'redux' | 'zustand' | 'context' | 'jotai' | 'recoil' | 'mobx';
  confidence: number;
  files: string[]; // State definition files
}

export interface XStateMachine {
  name: string;
  file: string;
  states: string[];
  events: string[];
  services: XStateService[]; // API calls in services
}

export interface XStateService {
  name: string;
  type: 'promise' | 'callback';
  apiCall?: {
    method: string;
    endpoint: string;
  };
}

export interface ReduxAction {
  type: string;
  file: string;
  apiCall?: {
    method: string;
    endpoint: string;
  };
}

/**
 * StateManagementDetector
 * 
 * Detects ALL state management patterns:
 * - XState (machines with services)
 * - Redux (actions, reducers, thunks, RTK Query)
 * - Zustand (stores)
 * - Context API
 * - Jotai, Recoil, MobX
 * 
 * Extracts API calls from state management layer!
 */
@Injectable()
export class StateManagementDetectorService {
  
  /**
   * Detect all state management in project
   */
  detectStateManagement(workspacePath: string): StateManagement[] {
    const detected: StateManagement[] = [];
    
    // Check package.json first
    const packageJsonPath = path.join(workspacePath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      // XState
      if (allDeps['xstate']) {
        detected.push({
          type: 'xstate',
          confidence: 100,
          files: this.findXStateMachines(workspacePath)
        });
      }
      
      // Redux
      if (allDeps['redux'] || allDeps['@reduxjs/toolkit']) {
        detected.push({
          type: 'redux',
          confidence: 100,
          files: this.findReduxFiles(workspacePath)
        });
      }
      
      // Zustand
      if (allDeps['zustand']) {
        detected.push({
          type: 'zustand',
          confidence: 100,
          files: this.findZustandStores(workspacePath)
        });
      }
      
      // Jotai
      if (allDeps['jotai']) {
        detected.push({
          type: 'jotai',
          confidence: 100,
          files: this.findJotaiAtoms(workspacePath)
        });
      }
      
      // Recoil
      if (allDeps['recoil']) {
        detected.push({
          type: 'recoil',
          confidence: 100,
          files: this.findRecoilAtoms(workspacePath)
        });
      }
      
      // MobX
      if (allDeps['mobx'] || allDeps['mobx-react']) {
        detected.push({
          type: 'mobx',
          confidence: 100,
          files: this.findMobXStores(workspacePath)
        });
      }
    }
    
    // Check for Context API (no package needed)
    const contextFiles = this.findContextProviders(workspacePath);
    if (contextFiles.length > 0) {
      detected.push({
        type: 'context',
        confidence: 90,
        files: contextFiles
      });
    }
    
    return detected;
  }
  
  /**
   * Find XState machine files
   */
  private findXStateMachines(workspacePath: string): string[] {
    return this.findFilesByPattern(workspacePath, /Machine\.(ts|tsx|js|jsx)$/);
  }
  
  /**
   * Find Redux files (actions, reducers, slices)
   */
  private findReduxFiles(workspacePath: string): string[] {
    return this.findFilesByPattern(workspacePath, /(action|reducer|slice|store)\.(ts|tsx|js|jsx)$/i);
  }
  
  /**
   * Find Zustand store files
   */
  private findZustandStores(workspacePath: string): string[] {
    return this.findFilesByPattern(workspacePath, /store\.(ts|tsx|js|jsx)$/i);
  }
  
  /**
   * Find Jotai atom files
   */
  private findJotaiAtoms(workspacePath: string): string[] {
    return this.findFilesByPattern(workspacePath, /atom|store/i);
  }
  
  /**
   * Find Recoil atom files
   */
  private findRecoilAtoms(workspacePath: string): string[] {
    return this.findFilesByPattern(workspacePath, /atom|selector/i);
  }
  
  /**
   * Find MobX store files
   */
  private findMobXStores(workspacePath: string): string[] {
    return this.findFilesByPattern(workspacePath, /store\.(ts|tsx|js|jsx)$/i);
  }
  
  /**
   * Find Context API providers
   */
  private findContextProviders(workspacePath: string): string[] {
    return this.findFilesByPattern(workspacePath, /(context|provider)\.(ts|tsx|js|jsx)$/i);
  }
  
  /**
   * Generic file finder
   */
  private findFilesByPattern(dir: string, pattern: RegExp, depth = 0): string[] {
    if (depth > 6) return [];
    
    const results: string[] = [];
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const skip = ['node_modules', '.git', 'dist', 'build', '.next', 'out'];
        if (skip.includes(entry.name)) continue;
        
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          results.push(...this.findFilesByPattern(fullPath, pattern, depth + 1));
        } else if (entry.isFile() && pattern.test(entry.name)) {
          results.push(fullPath);
        }
      }
    } catch {}
    
    return results;
  }
  
  /**
   * Parse XState machine and extract services (API calls)
   */
  parseXStateMachine(filePath: string): XStateMachine | null {
    try {
      const code = fs.readFileSync(filePath, 'utf-8');
      
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
      });
      
      const machine: XStateMachine = {
        name: path.basename(filePath, path.extname(filePath)),
        file: filePath,
        states: [],
        events: [],
        services: []
      };
      
      const self = this;
      traverseDefault(ast, {
        // Find createMachine({ ... }) or Machine({ ... }, { services })
        CallExpression(path: any) {
          const callee = path.node.callee;
          if (callee.type === 'Identifier' && 
              (callee.name === 'createMachine' || callee.name === 'Machine')) {
            const configArg = path.node.arguments[0];
            if (configArg && configArg.type === 'ObjectExpression') {
              self.extractMachineConfig(configArg, machine);
            }
            
            // For v4: services are in second argument
            const optionsArg = path.node.arguments[1];
            if (optionsArg && optionsArg.type === 'ObjectExpression') {
              self.extractServicesFromOptions(optionsArg, machine);
            }
          }
        }
      });
      
      return machine;
    } catch (error) {
      console.error(`Failed to parse XState machine ${filePath}:`, error.message);
      return null;
    }
  }
  
  /**
   * Extract states, events, and services from machine config
   */
  private extractMachineConfig(configNode: any, machine: XStateMachine): void {
    if (!configNode.properties || !Array.isArray(configNode.properties)) return;
    
    for (const prop of configNode.properties) {
      if (prop.type !== 'ObjectProperty' && prop.type !== 'Property') continue;
      
      const keyName = prop.key.name || prop.key.value;
      
      // Extract states
      if (keyName === 'states' && prop.value.type === 'ObjectExpression') {
        if (prop.value.properties) {
          for (const stateProp of prop.value.properties) {
            if (stateProp.key) {
              machine.states.push(stateProp.key.name || stateProp.key.value);
            }
          }
        }
      }
      
      // Extract services (for v5)
      if (keyName === 'services' && prop.value.type === 'ObjectExpression') {
        this.extractServices(prop.value, machine);
      }
    }
  }
  
  /**
   * Extract services from options object (for v4)
   */
  private extractServicesFromOptions(optionsNode: any, machine: XStateMachine): void {
    if (!optionsNode.properties || !Array.isArray(optionsNode.properties)) return;
    
    for (const prop of optionsNode.properties) {
      if (prop.type !== 'ObjectProperty' && prop.type !== 'Property') continue;
      
      const keyName = prop.key.name || prop.key.value;
      
      if (keyName === 'services' && prop.value.type === 'ObjectExpression') {
        this.extractServices(prop.value, machine);
      }
    }
  }
  
  /**
   * Extract services from services object
   */
  private extractServices(servicesNode: any, machine: XStateMachine): void {
    if (!servicesNode.properties || !Array.isArray(servicesNode.properties)) return;
    
    for (const serviceProp of servicesNode.properties) {
      if (serviceProp.type !== 'ObjectProperty' && serviceProp.type !== 'Property') continue;
      
      const serviceName = serviceProp.key.name || serviceProp.key.value;
      const service = this.parseService(serviceProp.value);
      
      if (service) {
        service.name = serviceName;
        machine.services.push(service);
      }
    }
  }
  
  /**
   * Parse service function to find API calls
   */
  private parseService(serviceNode: any): XStateService | null {
    const service: XStateService = {
      name: '',
      type: 'promise'
    };
    
    // Check if service is async function or arrow function
    if (serviceNode.type === 'ArrowFunctionExpression' || serviceNode.type === 'FunctionExpression') {
      const body = serviceNode.body;
      
      // Look for fetch/axios in function body
      const apiCall = this.findAPICallInNode(body);
      if (apiCall) {
        service.apiCall = apiCall;
      }
      
      return service;
    }
    
    return null;
  }
  
  /**
   * Find API call in AST node (recursive)
   */
  private findAPICallInNode(node: any): { method: string; endpoint: string } | null {
    if (!node) return null;
    
    // Handle AwaitExpression - unwrap it
    if (node.type === 'AwaitExpression') {
      return this.findAPICallInNode(node.argument);
    }
    
    // Check for fetch()
    if (node.type === 'CallExpression' && node.callee?.name === 'fetch') {
      const urlArg = node.arguments[0];
      const optionsArg = node.arguments[1];
      
      let endpoint = '';
      let method = 'GET';
      
      if (urlArg && urlArg.type === 'StringLiteral') {
        endpoint = urlArg.value;
      } else if (urlArg && urlArg.type === 'TemplateLiteral') {
        endpoint = this.extractTemplateString(urlArg);
      }
      
      if (optionsArg && optionsArg.type === 'ObjectExpression') {
        for (const prop of optionsArg.properties) {
          if (prop.key?.name === 'method' && prop.value.type === 'StringLiteral') {
            method = prop.value.value;
          }
        }
      }
      
      if (endpoint) {
        return { method, endpoint };
      }
    }
    
    // Check for axios or custom HTTP clients
    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
      const object = node.callee.object;
      const property = node.callee.property;
      
      // Detect HTTP client patterns: axios, httpClient, apiClient, api, client
      const clientNames = ['axios', 'httpClient', 'apiClient', 'api', 'client', 'http'];
      const httpMethods = ['get', 'post', 'put', 'patch', 'delete'];
      
      if (object.name && clientNames.includes(object.name) && property.name) {
        const methodName = property.name.toLowerCase();
        if (httpMethods.includes(methodName)) {
          const method = methodName.toUpperCase();
          const urlArg = node.arguments[0];
          
          if (urlArg) {
            if (urlArg.type === 'StringLiteral') {
              return { method, endpoint: urlArg.value };
            } else if (urlArg.type === 'TemplateLiteral') {
              return { method, endpoint: this.extractTemplateString(urlArg) };
            }
          }
        }
      }
      
      // For promise chains (.then, .catch), recurse into the object
      if (property.name && ['then', 'catch', 'finally'].includes(property.name)) {
        const apiCall = this.findAPICallInNode(object);
        if (apiCall) return apiCall;
      }
    }
    
    // Recursively check child nodes
    const childNodes = this.getChildNodes(node);
    for (const child of childNodes) {
      const result = this.findAPICallInNode(child);
      if (result) return result;
    }
    
    return null;
  }
  
  /**
   * Get child AST nodes
   */
  private getChildNodes(node: any): any[] {
    const children: any[] = [];
    
    if (node.body) {
      if (Array.isArray(node.body)) {
        children.push(...node.body);
      } else {
        children.push(node.body);
      }
    }
    
    if (node.expression) children.push(node.expression);
    if (node.argument) children.push(node.argument); // For AwaitExpression
    if (node.consequent) children.push(node.consequent);
    if (node.alternate) children.push(node.alternate);
    if (node.callee) children.push(node.callee); // For CallExpression
    
    // For CallExpression with MemberExpression callee
    if (node.callee?.object) children.push(node.callee.object);
    
    return children;
  }
  
  /**
   * Extract template literal string
   */
  private extractTemplateString(node: any): string {
    if (node.type !== 'TemplateLiteral') return '';
    
    let result = '';
    for (let i = 0; i < node.quasis.length; i++) {
      result += node.quasis[i].value.raw;
      if (i < node.expressions.length) {
        result += ':param'; // Placeholder for dynamic segments
      }
    }
    return result;
  }
  
  /**
   * Parse Redux actions to find API calls
   */
  parseReduxActions(filePath: string): ReduxAction[] {
    try {
      const code = fs.readFileSync(filePath, 'utf-8');
      const actions: ReduxAction[] = [];
      
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
      });
      
      const self = this;
      traverseDefault(ast, {
        // Find action creators or thunks
        VariableDeclarator(path: any) {
          const id = path.node.id;
          const init = path.node.init;
          
          if (id.type === 'Identifier' && init) {
            // Check if it's a thunk or async action
            if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') {
              const apiCall = self.findAPICallInNode(init.body);
              if (apiCall) {
                actions.push({
                  type: id.name,
                  file: filePath,
                  apiCall
                });
              }
            }
          }
        }
      });
      
      return actions;
    } catch (error) {
      console.error(`Failed to parse Redux actions ${filePath}:`, error.message);
      return [];
    }
  }
}

import { Injectable } from '@nestjs/common';
import { ParsedFile, HookCall } from './ast-parser.service';
import { FrameworkInfo } from './project-scanner.service';

/**
 * State Management Detector v3.0
 * 
 * Phase 2.4: Detects all state management patterns in the application
 * - Redux/RTK Query
 * - Zustand, Jotai, Recoil
 * - React Query/TanStack Query
 * - Context API
 * - URL state
 */

export interface StateAnalysis {
  stores: StoreDefinition[];
  queries: QueryDefinition[];
  contexts: ContextDefinition[];
  statePatterns: StatePattern[];
  statistics: StateStatistics;
}

export interface StoreDefinition {
  name: string;
  type: 'redux' | 'zustand' | 'jotai' | 'recoil' | 'mobx' | 'xstate' | 'context';
  filePath: string;
  actions: StoreAction[];
  selectors: StoreSelector[];
  subscribers: string[];               // Components that use this store
}

export interface StoreAction {
  name: string;
  type: 'sync' | 'async';
  payload: string | null;
}

export interface StoreSelector {
  name: string;
  returnType: string | null;
}

export interface QueryDefinition {
  name: string;
  type: 'rtk-query' | 'react-query' | 'swr' | 'apollo';
  endpoint: string | null;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | null;
  filePath: string;
  usedIn: string[];                    // Components using this query
}

export interface ContextDefinition {
  name: string;
  filePath: string;
  providerComponent: string | null;
  consumers: string[];
  stateShape: Record<string, string>;
}

export interface StatePattern {
  type: string;
  description: string;
  confidence: number;
  evidence: string[];
}

export interface StateStatistics {
  totalStores: number;
  totalQueries: number;
  totalContexts: number;
  stateLibraries: string[];
  avgQueriesPerStore: number;
}

@Injectable()
export class StateDetectorService {
  
  /**
   * Analyze state management in all files
   */
  analyzeState(
    parsedFiles: ParsedFile[],
    frameworkInfo: FrameworkInfo
  ): StateAnalysis {
    console.log(`🗄️  State Detector: Analyzing state management`);
    const startTime = Date.now();
    
    const stores: StoreDefinition[] = [];
    const queries: QueryDefinition[] = [];
    const contexts: ContextDefinition[] = [];
    const statePatterns: StatePattern[] = [];
    
    // Detect from framework info hints
    const possibleLibraries = frameworkInfo.stateManagement;
    
    for (const file of parsedFiles) {
      // Detect Redux/RTK
      this.detectRedux(file, stores, queries);
      
      // Detect RTK Query
      this.detectRTKQuery(file, queries);
      
      // Detect React Query / TanStack Query
      this.detectReactQuery(file, queries);
      
      // Detect Zustand
      this.detectZustand(file, stores);
      
      // Detect Context API
      this.detectContext(file, contexts);
      
      // Detect other patterns
      this.detectOtherPatterns(file, statePatterns);
    }
    
    const statistics = this.calculateStatistics(stores, queries, contexts, possibleLibraries);
    
    const analysisTime = Date.now() - startTime;
    console.log(`   Found ${stores.length} stores, ${queries.length} queries in ${analysisTime}ms`);
    
    return { stores, queries, contexts, statePatterns, statistics };
  }
  
  /**
   * Detect Redux patterns
   */
  private detectRedux(file: ParsedFile, stores: StoreDefinition[], queries: QueryDefinition[]): void {
    // Check for Redux imports
    const hasRedux = file.imports.some(i => 
      i.source.includes('redux') || i.source.includes('@reduxjs/toolkit')
    );
    
    if (!hasRedux) return;
    
    // Look for createSlice
    const hasSlice = file.functions.some(f => 
      f.body.includes('createSlice')
    );
    
    if (hasSlice) {
      // Extract slice name from the file
      const sliceName = this.extractSliceName(file);
      
      stores.push({
        name: sliceName || 'unknownSlice',
        type: 'redux',
        filePath: file.filePath,
        actions: this.extractReduxActions(file),
        selectors: this.extractReduxSelectors(file),
        subscribers: [],
      });
    }
    
    // Look for useSelector/useDispatch usage
    const useSelector = file.hooks.filter(h => h.name === 'useSelector');
    const useDispatch = file.hooks.filter(h => h.name === 'useDispatch');
    
    // Track which components use Redux
    for (const hook of useSelector) {
      if (hook.parentFunction) {
        // Mark component as Redux consumer
      }
    }
  }
  
  /**
   * Detect RTK Query
   */
  private detectRTKQuery(file: ParsedFile, queries: QueryDefinition[]): void {
    // Check for RTK Query imports
    const hasRTKQuery = file.imports.some(i => 
      i.source.includes('@reduxjs/toolkit/query') ||
      i.specifiers.some(s => s.name.includes('Api') || s.name.includes('api'))
    );
    
    if (!hasRTKQuery) return;
    
    // Look for createApi
    const hasCreateApi = file.functions.some(f => 
      f.body.includes('createApi')
    );
    
    if (hasCreateApi) {
      // Extract endpoints from createApi
      const endpoints = this.extractRTKQueryEndpoints(file);
      queries.push(...endpoints);
    }
    
    // Look for RTK Query hooks (useXQuery, useXMutation)
    const queryHooks = file.hooks.filter(h => 
      h.name.endsWith('Query') || h.name.endsWith('Mutation')
    );
    
    for (const hook of queryHooks) {
      const existing = queries.find(q => q.name === hook.name);
      if (!existing) {
        queries.push({
          name: hook.name,
          type: 'rtk-query',
          endpoint: null,
          method: hook.name.includes('Mutation') ? 'POST' : 'GET',
          filePath: file.filePath,
          usedIn: hook.parentFunction ? [hook.parentFunction] : [],
        });
      } else if (hook.parentFunction) {
        existing.usedIn.push(hook.parentFunction);
      }
    }
  }
  
  /**
   * Detect React Query / TanStack Query
   */
  private detectReactQuery(file: ParsedFile, queries: QueryDefinition[]): void {
    const hasReactQuery = file.imports.some(i => 
      i.source.includes('react-query') || 
      i.source.includes('@tanstack/react-query')
    );
    
    if (!hasReactQuery) return;
    
    // Find useQuery and useMutation hooks
    const queryHooks = file.hooks.filter(h => 
      h.name === 'useQuery' || h.name === 'useMutation' ||
      h.name === 'useInfiniteQuery' || h.name === 'useQueries'
    );
    
    for (const hook of queryHooks) {
      // Try to extract query key
      const queryKey = hook.arguments[0]?.value || null;
      
      queries.push({
        name: queryKey || `query-${hook.line}`,
        type: 'react-query',
        endpoint: null,
        method: hook.name === 'useMutation' ? 'POST' : 'GET',
        filePath: file.filePath,
        usedIn: hook.parentFunction ? [hook.parentFunction] : [],
      });
    }
  }
  
  /**
   * Detect Zustand stores
   */
  private detectZustand(file: ParsedFile, stores: StoreDefinition[]): void {
    const hasZustand = file.imports.some(i => i.source === 'zustand');
    
    if (!hasZustand) return;
    
    // Look for create() calls
    const hasCreate = file.functions.some(f => 
      f.body.includes('create(') || f.body.includes('create<')
    );
    
    if (hasCreate) {
      stores.push({
        name: this.extractZustandStoreName(file),
        type: 'zustand',
        filePath: file.filePath,
        actions: [],
        selectors: [],
        subscribers: [],
      });
    }
  }
  
  /**
   * Detect Context API usage
   */
  private detectContext(file: ParsedFile, contexts: ContextDefinition[]): void {
    // Look for createContext
    const hasCreateContext = file.functions.some(f => 
      f.body.includes('createContext')
    );
    
    if (hasCreateContext) {
      contexts.push({
        name: this.extractContextName(file),
        filePath: file.filePath,
        providerComponent: null,
        consumers: [],
        stateShape: {},
      });
    }
    
    // Track useContext usage
    const useContextHooks = file.hooks.filter(h => h.name === 'useContext');
    for (const hook of useContextHooks) {
      // Find or create context entry
      const contextName = hook.arguments[0]?.value || 'UnknownContext';
      let context = contexts.find(c => c.name === contextName);
      
      if (!context) {
        context = {
          name: contextName,
          filePath: file.filePath,
          providerComponent: null,
          consumers: [],
          stateShape: {},
        };
        contexts.push(context);
      }
      
      if (hook.parentFunction) {
        context.consumers.push(hook.parentFunction);
      }
    }
  }
  
  /**
   * Detect other state patterns
   */
  private detectOtherPatterns(file: ParsedFile, patterns: StatePattern[]): void {
    // URL state (query params)
    const hasURLState = file.hooks.some(h => 
      h.name === 'useSearchParams' || h.name === 'useParams'
    );
    
    if (hasURLState) {
      patterns.push({
        type: 'url-state',
        description: 'Uses URL for state management',
        confidence: 0.9,
        evidence: ['useSearchParams or useParams hook found'],
      });
    }
    
    // Local storage
    const hasLocalStorage = file.functions.some(f =>
      f.body.includes('localStorage') || f.body.includes('sessionStorage')
    );
    
    if (hasLocalStorage) {
      patterns.push({
        type: 'browser-storage',
        description: 'Uses browser storage for persistence',
        confidence: 0.85,
        evidence: ['localStorage or sessionStorage usage found'],
      });
    }
  }
  
  // Helper methods
  
  private extractSliceName(file: ParsedFile): string {
    // Try to find slice name from createSlice call
    for (const func of file.functions) {
      if (func.body.includes('createSlice')) {
        const nameMatch = func.body.match(/name:\s*['"`](\w+)['"`]/);
        if (nameMatch) return nameMatch[1];
      }
    }
    
    // Fallback to filename
    const fileName = file.relativePath.split('/').pop() || '';
    return fileName.replace(/\.slice\.(ts|js)x?$/, '').replace(/Slice$/, '');
  }
  
  private extractReduxActions(file: ParsedFile): StoreAction[] {
    const actions: StoreAction[] = [];
    
    // Look for reducers in createSlice
    for (const func of file.functions) {
      if (func.body.includes('reducers:')) {
        // Simple regex to find reducer names
        const reducerMatches = func.body.matchAll(/(\w+)\s*:\s*\(/g);
        for (const match of reducerMatches) {
          actions.push({
            name: match[1],
            type: 'sync',
            payload: null,
          });
        }
      }
    }
    
    return actions;
  }
  
  private extractReduxSelectors(file: ParsedFile): StoreSelector[] {
    const selectors: StoreSelector[] = [];
    
    // Look for exported selectors
    for (const exp of file.exports) {
      if (exp.name.startsWith('select') || exp.name.includes('Selector')) {
        selectors.push({
          name: exp.name,
          returnType: null,
        });
      }
    }
    
    return selectors;
  }
  
  private extractRTKQueryEndpoints(file: ParsedFile): QueryDefinition[] {
    const endpoints: QueryDefinition[] = [];
    
    for (const func of file.functions) {
      if (func.body.includes('createApi')) {
        // Extract endpoint definitions
        const endpointMatches = func.body.matchAll(/(\w+):\s*builder\.(query|mutation)/g);
        for (const match of endpointMatches) {
          endpoints.push({
            name: `use${match[1].charAt(0).toUpperCase() + match[1].slice(1)}${match[2] === 'query' ? 'Query' : 'Mutation'}`,
            type: 'rtk-query',
            endpoint: null,
            method: match[2] === 'mutation' ? 'POST' : 'GET',
            filePath: file.filePath,
            usedIn: [],
          });
        }
      }
    }
    
    return endpoints;
  }
  
  private extractZustandStoreName(file: ParsedFile): string {
    // Try to find store name from export
    for (const exp of file.exports) {
      if (exp.name.includes('Store') || exp.name.includes('use')) {
        return exp.name;
      }
    }
    
    const fileName = file.relativePath.split('/').pop() || '';
    return fileName.replace(/\.(ts|js)x?$/, '');
  }
  
  private extractContextName(file: ParsedFile): string {
    for (const func of file.functions) {
      if (func.body.includes('createContext')) {
        // Try to extract variable name
        const match = func.body.match(/const\s+(\w+)\s*=\s*createContext/);
        if (match) return match[1];
      }
    }
    
    return 'UnknownContext';
  }
  
  private calculateStatistics(
    stores: StoreDefinition[],
    queries: QueryDefinition[],
    contexts: ContextDefinition[],
    libraries: string[]
  ): StateStatistics {
    return {
      totalStores: stores.length,
      totalQueries: queries.length,
      totalContexts: contexts.length,
      stateLibraries: libraries,
      avgQueriesPerStore: stores.length > 0 ? queries.length / stores.length : 0,
    };
  }
  
  /**
   * Find all components that consume a specific store
   */
  findStoreConsumers(analysis: StateAnalysis, storeName: string): string[] {
    const store = analysis.stores.find(s => s.name === storeName);
    return store?.subscribers || [];
  }
  
  /**
   * Find all queries used by a component
   */
  findComponentQueries(analysis: StateAnalysis, componentName: string): QueryDefinition[] {
    return analysis.queries.filter(q => q.usedIn.includes(componentName));
  }
}

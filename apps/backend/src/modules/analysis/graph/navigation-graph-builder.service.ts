import { Injectable } from '@nestjs/common';
import { NavigationGraph, GraphNode, Edge, NodeMetadata, ComponentAnalysis } from '../types/graph.types';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';

/**
 * NavigationGraphBuilder
 * 
 * SOLID Principle: Single Responsibility
 * Responsibility: Build navigation graph from component analysis
 * 
 * This class transforms component data into graph structure.
 * It does NOT discover paths, detect cycles, or calculate complex weights.
 * Those are separate responsibilities.
 */
@Injectable()
export class NavigationGraphBuilderService {
  
  /**
   * Build complete navigation graph from components
   * 
   * Time Complexity: O(N * M) where N = components, M = avg navigations per component
   * Space Complexity: O(V + E) where V = nodes, E = edges
   */
  buildGraph(components: ComponentAnalysis[]): NavigationGraph {
    const graph: NavigationGraph = {
      nodes: new Map(),
      edges: new Map()
    };
    
    console.log(`🔨 Building graph from ${components.length} components...`);
    
    // Phase 1: Create all nodes
    for (const component of components) {
      const node = this.createNode(component);
      graph.nodes.set(node.route, node);
      graph.edges.set(node.route, []); // Initialize empty edge list
    }
    
    console.log(`  ✅ Created ${graph.nodes.size} nodes`);
    
    // Phase 2: Extract and create edges
    let totalNavs = 0;
    let matchedNavs = 0;
    
    for (const component of components) {
      const navigations = this.extractNavigations(component);
      totalNavs += navigations.length;
      
      if (navigations.length > 0) {
        console.log(`  📍 ${component.route}: found ${navigations.length} navigation(s) -> ${navigations.map(n => n.target).join(', ')}`);
      }
      
      for (const nav of navigations) {
        // Only create edge if target exists in graph
        if (graph.nodes.has(nav.target)) {
          const edge = this.createEdge(component.route, nav.target, nav);
          graph.edges.get(component.route)!.push(edge);
          matchedNavs++;
        } else {
          console.log(`    ⚠️  Target '${nav.target}' not found in graph (from ${component.route})`);
        }
      }
    }
    
    const edgeCount = Array.from(graph.edges.values()).reduce((sum, edges) => sum + edges.length, 0);
    console.log(`  ✅ Created ${edgeCount} edges (matched ${matchedNavs}/${totalNavs} navigations)`);
    
    return graph;
  }
  
  /**
   * Create graph node from component
   * Pure transformation - no side effects
   */
  private createNode(component: ComponentAnalysis): GraphNode {
    return {
      route: component.route,
      component: component.componentName,
      metadata: this.analyzeNodeMetadata(component)
    };
  }
  
  /**
   * Analyze component to extract metadata
   * ZERO HARDCODING - everything extracted from code!
   */
  private analyzeNodeMetadata(component: ComponentAnalysis): NodeMetadata {
    const ast = component.ast || this.parseComponent(component.code);
    
    return {
      type: this.inferNodeType(component, ast),
      authRequired: this.detectAuthRequirement(ast),
      apiCalls: this.extractApiCalls(ast),
      stateChanges: this.extractStateChanges(ast),
      uiElements: this.extractUIElements(ast)
    };
  }
  
  /**
   * Parse component code if AST not provided
   */
  private parseComponent(code: string): any {
    try {
      return parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
      });
    } catch (error) {
      console.warn('Failed to parse component:', error.message);
      return null;
    }
  }
  
  /**
   * Infer node type from patterns (NOT hardcoded types!)
   * Uses semantic analysis of code structure
   */
  private inferNodeType(component: ComponentAnalysis, ast: any): NodeMetadata['type'] {
    if (!ast) return 'unknown';
    
    // Check for modal patterns (no full page render)
    const hasModal = this.hasPattern(ast, ['Modal', 'Dialog', 'Popup']);
    if (hasModal) return 'modal';
    
    // Check for redirect (immediate navigation)
    const hasRedirect = this.hasPattern(ast, ['redirect', 'Navigate', 'Redirect']);
    if (hasRedirect) return 'redirect';
    
    // Check for API route (returns Response/JSON)
    const hasApiResponse = this.hasPattern(ast, ['Response', 'NextResponse', 'res.json']);
    if (hasApiResponse) return 'api';
    
    // Default: regular page
    return 'page';
  }
  
  /**
   * Detect if authentication is required
   * Looks for auth guards, wrappers, redirects
   */
  private detectAuthRequirement(ast: any): boolean {
    if (!ast) return false;
    
    // Look for auth patterns in JSX
    const authPatterns = [
      'PrivateRoute',
      'AuthGuard', 
      'Protected',
      'RequireAuth',
      'withAuth'
    ];
    
    return this.hasPattern(ast, authPatterns);
  }
  
  /**
   * Extract API calls from component
   * Returns endpoint strings found in code
   */
  private extractApiCalls(ast: any): string[] {
    if (!ast) return [];
    
    const apiCalls: string[] = [];
    
    try {
      traverse(ast, {
        // fetch('...')
        CallExpression: (path) => {
          if (path.node.callee.type === 'Identifier' && path.node.callee.name === 'fetch') {
            const arg = path.node.arguments[0];
            if (arg && arg.type === 'StringLiteral') {
              apiCalls.push(arg.value);
            }
          }
          
          // axios.get('...'), axios.post('...')
          if (path.node.callee.type === 'MemberExpression') {
            const obj = path.node.callee.object;
            if (obj.type === 'Identifier' && obj.name === 'axios') {
              const arg = path.node.arguments[0];
              if (arg && arg.type === 'StringLiteral') {
                apiCalls.push(arg.value);
              }
            }
          }
        }
      });
    } catch (error) {
      // Ignore traversal errors
    }
    
    return [...new Set(apiCalls)]; // Deduplicate
  }
  
  /**
   * Extract state changes from component
   * Returns state operation patterns found
   */
  private extractStateChanges(ast: any): string[] {
    if (!ast) return [];
    
    const stateChanges: string[] = [];
    
    try {
      traverse(ast, {
        // localStorage.setItem, sessionStorage.setItem
        CallExpression: (path) => {
          if (path.node.callee.type === 'MemberExpression') {
            const obj = path.node.callee.object;
            const prop = path.node.callee.property;
            
            if (obj.type === 'Identifier' && 
                (obj.name === 'localStorage' || obj.name === 'sessionStorage') &&
                prop.type === 'Identifier' &&
                (prop.name === 'setItem' || prop.name === 'removeItem')) {
              
              const key = path.node.arguments[0];
              if (key && key.type === 'StringLiteral') {
                stateChanges.push(`${obj.name}.${prop.name}:${key.value}`);
              }
            }
          }
        },
        
        // useState calls
        VariableDeclarator: (path) => {
          if (path.node.init && path.node.init.type === 'CallExpression') {
            const callee = path.node.init.callee;
            if (callee.type === 'Identifier' && callee.name === 'useState') {
              if (path.node.id.type === 'ArrayPattern') {
                const stateName = path.node.id.elements[0];
                if (stateName && stateName.type === 'Identifier') {
                  stateChanges.push(`useState:${stateName.name}`);
                }
              }
            }
          }
        }
      });
    } catch (error) {
      // Ignore traversal errors
    }
    
    return stateChanges;
  }
  
  /**
   * Extract UI elements from component
   * Returns element types found in JSX (DYNAMIC!)
   */
  private extractUIElements(ast: any): string[] {
    if (!ast) return [];
    
    const elements = new Set<string>();
    
    try {
      traverse(ast, {
        JSXElement: (path) => {
          const name = this.getJSXElementName(path.node);
          if (name) {
            elements.add(name.toLowerCase());
          }
        }
      });
    } catch (error) {
      // Ignore traversal errors
    }
    
    return Array.from(elements);
  }
  
  /**
   * Get JSX element name
   */
  private getJSXElementName(node: any): string | null {
    if (node.openingElement && node.openingElement.name) {
      const nameNode = node.openingElement.name;
      
      if (nameNode.type === 'JSXIdentifier') {
        return nameNode.name;
      }
      
      if (nameNode.type === 'JSXMemberExpression') {
        // Handle: <Layout.Header />
        return this.getJSXMemberName(nameNode);
      }
    }
    
    return null;
  }
  
  /**
   * Get member expression name
   */
  private getJSXMemberName(node: any): string {
    const parts: string[] = [];
    let current = node;
    
    while (current) {
      if (current.type === 'JSXMemberExpression') {
        if (current.property && current.property.name) {
          parts.unshift(current.property.name);
        }
        current = current.object;
      } else if (current.type === 'JSXIdentifier') {
        parts.unshift(current.name);
        break;
      } else {
        break;
      }
    }
    
    return parts.join('.');
  }
  
  /**
   * Check if AST contains any of the patterns
   * Generic pattern matcher - NO HARDCODING of specific types!
   */
  private hasPattern(ast: any, patterns: string[]): boolean {
    if (!ast) return false;
    
    let found = false;
    
    try {
      traverse(ast, {
        Identifier: (path) => {
          if (patterns.some(pattern => path.node.name.includes(pattern))) {
            found = true;
            path.stop(); // Stop traversal early
          }
        },
        JSXIdentifier: (path) => {
          if (patterns.some(pattern => path.node.name.includes(pattern))) {
            found = true;
            path.stop();
          }
        }
      });
    } catch (error) {
      // Ignore traversal errors
    }
    
    return found;
  }
  
  /**
   * Extract navigations from component
   * Finds all navigation patterns in code
   */
  extractNavigations(component: ComponentAnalysis): Navigation[] {
    const ast = component.ast || this.parseComponent(component.code);
    if (!ast) return [];
    
    const navigations: Navigation[] = [];
    
    try {
      traverse(ast, {
        // router.push('/path'), navigate('/path')
        CallExpression: (path) => {
          const nav = this.extractCallNavigation(path.node);
          if (nav) navigations.push(nav);
        },
        
        // <Link href="/path">
        JSXAttribute: (path) => {
          const nav = this.extractLinkNavigation(path.node);
          if (nav) navigations.push(nav);
        }
      });
    } catch (error) {
      console.warn('Navigation extraction failed:', error.message);
    }
    
    return navigations;
  }
  
  /**
   * Extract navigation from function call
   */
  private extractCallNavigation(node: any): Navigation | null {
    // router.push('/path')
    if (node.callee.type === 'MemberExpression') {
      const method = node.callee.property;
      
      if (method.type === 'Identifier' && 
          (method.name === 'push' || method.name === 'replace' || method.name === 'navigate')) {
        
        const arg = node.arguments[0];
        if (arg && arg.type === 'StringLiteral') {
          return {
            target: arg.value,
            trigger: 'programmatic',
            condition: this.extractCondition(node)
          };
        }
      }
    }
    
    // navigate('/path')
    if (node.callee.type === 'Identifier' && node.callee.name === 'navigate') {
      const arg = node.arguments[0];
      if (arg && arg.type === 'StringLiteral') {
        return {
          target: arg.value,
          trigger: 'programmatic',
          condition: this.extractCondition(node)
        };
      }
    }
    
    return null;
  }
  
  /**
   * Extract navigation from Link component
   */
  private extractLinkNavigation(node: any): Navigation | null {
    // Support both Next.js (href) and React Router (to)
    if (node.name && node.value) {
      const attrName = node.name.name;
      
      if ((attrName === 'href' || attrName === 'to') && node.value.type === 'StringLiteral') {
        return {
          target: node.value.value,
          trigger: 'click',
          condition: undefined
        };
      }
    }
    
    return null;
  }
  
  /**
   * Extract condition from navigation context
   * Looks at parent nodes to find if/conditional
   */
  private extractCondition(node: any): string | undefined {
    // Simplified - would need parent path for full implementation
    // For now, return undefined
    return undefined;
  }
  
  /**
   * Create edge from navigation
   */
  private createEdge(from: string, to: string, nav: Navigation): Edge {
    return {
      source: from,
      target: to,
      condition: nav.condition,
      trigger: nav.trigger,
      weight: 1.0, // Base weight - will be calculated by WeightCalculator
      data: nav
    };
  }
}

/**
 * Navigation pattern found in code
 */
interface Navigation {
  target: string;
  trigger: string;
  condition?: string;
}

import { Injectable } from '@nestjs/common';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as fs from 'fs';

export interface ParsedRoute {
  path: string;
  component: string;
  requiresAuth: boolean;
  children?: ParsedRoute[];
  element?: any;
}

/**
 * ReactRouterParserService - Parses React Router config files using AST
 * 
 * Extracts routes from:
 * - const routes = [...] arrays
 * - createBrowserRouter([...]) calls
 * - useRoutes([...]) hooks
 */
@Injectable()
export class ReactRouterParserService {
  
  /**
   * Parse React Router config file and extract all routes
   */
  async parseRoutes(configPath: string): Promise<ParsedRoute[]> {
    console.log(`📖 Parsing React Router config: ${configPath}`);
    
    try {
      const code = fs.readFileSync(configPath, 'utf-8');
      
      // Parse with Babel (supports JSX + TypeScript)
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: [
          require('@babel/plugin-syntax-jsx'),
          require('@babel/plugin-syntax-typescript')
        ],
      });
      
      const routes: ParsedRoute[] = [];
      
      // Find routes array
      traverse(ast, {
        // Look for: const routes = [...]
        VariableDeclarator: (path) => {
          if (path.node.id.type === 'Identifier' && 
              path.node.id.name === 'routes' &&
              path.node.init?.type === 'ArrayExpression') {
            
            console.log('   Found routes array!');
            this.extractRoutesFromArray(path.node.init, routes);
          }
        },
        
        // Look for: createBrowserRouter([...])
        CallExpression: (path) => {
          if (path.node.callee.type === 'Identifier' &&
              path.node.callee.name === 'createBrowserRouter' &&
              path.node.arguments[0]?.type === 'ArrayExpression') {
            
            console.log('   Found createBrowserRouter!');
            this.extractRoutesFromArray(path.node.arguments[0], routes);
          }
        },
      });
      
      console.log(`   ✅ Extracted ${routes.length} routes`);
      return routes;
      
    } catch (error) {
      console.error('   ❌ Failed to parse routes:', error.message);
      return [];
    }
  }
  
  /**
   * Extract routes from ArrayExpression
   */
  private extractRoutesFromArray(arrayNode: any, routes: ParsedRoute[]): void {
    for (const element of arrayNode.elements) {
      if (element?.type === 'ObjectExpression') {
        const route = this.extractRouteFromObject(element);
        if (route) {
          routes.push(route);
        }
      }
    }
  }
  
  /**
   * Extract single route from ObjectExpression
   * Handles: { path: 'login', element: <LoginPage /> }
   */
  private extractRouteFromObject(objNode: any): ParsedRoute | null {
    let path: string | null = null;
    let component: string | null = null;
    let requiresAuth = false;
    let children: ParsedRoute[] | undefined;
    
    for (const prop of objNode.properties) {
      if (prop.type !== 'ObjectProperty') continue;
      
      const keyName = prop.key.name || prop.key.value;
      
      // Extract path
      if (keyName === 'path' && prop.value.type === 'StringLiteral') {
        path = prop.value.value;
      }
      
      // Extract element (component)
      if (keyName === 'element') {
        const elementInfo = this.extractElement(prop.value);
        component = elementInfo.component;
        requiresAuth = elementInfo.requiresAuth;
      }
      
      // Extract children (nested routes)
      if (keyName === 'children' && prop.value.type === 'ArrayExpression') {
        children = [];
        this.extractRoutesFromArray(prop.value, children);
      }
    }
    
    if (path !== null) {
      // Normalize path: ensure leading slash, but don't add extra slashes
      const normalizedPath = path === '' ? '' : ('/' + path.replace(/^\//, ''));
      
      return {
        path: normalizedPath,
        component: component || 'Unknown',
        requiresAuth,
        children,
      };
    }
    
    return null;
  }
  
  /**
   * Extract component name and auth requirements from element
   * Handles: <LoginPage />, <PrivateRoute><Dashboard /></PrivateRoute>
   */
  private extractElement(elementNode: any): { component: string; requiresAuth: boolean } {
    let component = 'Unknown';
    let requiresAuth = false;
    
    if (elementNode.type === 'JSXElement') {
      const elementName = this.getJSXElementName(elementNode);
      
      // Check if wrapped in PrivateRoute
      if (elementName === 'PrivateRoute' || elementName === 'AuthRoute') {
        requiresAuth = true;
        
        // Extract inner component
        const children = elementNode.children || [];
        for (const child of children) {
          if (child.type === 'JSXElement') {
            component = this.getJSXElementName(child);
            break;
          }
        }
      } else {
        component = elementName;
      }
    }
    
    // Handle: <PublicRoute><LoginPage /></PublicRoute>
    if (elementNode.type === 'JSXElement') {
      const wrapperName = this.getJSXElementName(elementNode);
      if (wrapperName === 'PublicRoute') {
        const children = elementNode.children || [];
        for (const child of children) {
          if (child.type === 'JSXElement') {
            component = this.getJSXElementName(child);
            break;
          }
        }
      }
    }
    
    return { component, requiresAuth };
  }
  
  /**
   * Get JSX element name (e.g., LoginPage from <LoginPage />)
   */
  private getJSXElementName(jsxElement: any): string {
    if (jsxElement.openingElement?.name) {
      const nameNode = jsxElement.openingElement.name;
      
      if (nameNode.type === 'JSXIdentifier') {
        return nameNode.name;
      }
      
      if (nameNode.type === 'JSXMemberExpression') {
        // Handle: <Layout.Header />
        return this.getJSXMemberExpressionName(nameNode);
      }
    }
    
    return 'Unknown';
  }
  
  /**
   * Get member expression name (Layout.Header → "Layout.Header")
   */
  private getJSXMemberExpressionName(memberExpr: any): string {
    const parts: string[] = [];
    let current = memberExpr;
    
    while (current) {
      if (current.type === 'JSXMemberExpression') {
        if (current.property?.name) {
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
}

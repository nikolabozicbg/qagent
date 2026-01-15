/**
 * React Router Framework Plugin
 * 
 * Supports:
 * - createBrowserRouter config
 * - <Routes>/<Route> JSX patterns
 * - Loaders and Actions
 */

import * as path from 'path';
import * as ts from 'typescript';
import {
  ScannerPlugin,
  ProjectContext,
  AnalysisContext,
  FrameworkPluginResult,
  RouteInfo,
  ComponentInfo,
} from '../types';

export class ReactRouterPlugin implements ScannerPlugin<FrameworkPluginResult> {
  name = 'react-router';
  version = '1.0.0';
  type = 'framework' as const;
  priority = 90;

  async detect(context: ProjectContext): Promise<boolean> {
    const { packageJson } = context;
    const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies };
    return !!(deps?.['react-router'] || deps?.['react-router-dom']);
  }

  async analyze(context: AnalysisContext): Promise<FrameworkPluginResult> {
    const { packageJson, sourceFiles, parsedFiles } = context;
    
    const routes: RouteInfo[] = [];
    const components: ComponentInfo[] = [];
    
    // Look for route definitions
    for (const file of sourceFiles) {
      const parsed = parsedFiles.get(file.path);
      if (!parsed) continue;

      // Find createBrowserRouter calls
      const routerRoutes = this.findRouterConfig(parsed, file.path, context);
      routes.push(...routerRoutes);

      // Find <Route> components
      const jsxRoutes = this.findJsxRoutes(parsed, file.path, context);
      routes.push(...jsxRoutes);
    }

    // Deduplicate routes by path
    const uniqueRoutes = new Map<string, RouteInfo>();
    for (const route of routes) {
      if (!uniqueRoutes.has(route.path)) {
        uniqueRoutes.set(route.path, route);
      }
    }

    const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies };
    const version = deps?.['react-router-dom'] || deps?.['react-router'] || 'unknown';

    // Detect state management
    const stateManagement: string[] = [];
    if (deps?.['redux'] || deps?.['@reduxjs/toolkit']) stateManagement.push('redux');
    if (deps?.['zustand']) stateManagement.push('zustand');
    if (deps?.['recoil']) stateManagement.push('recoil');
    if (deps?.['mobx']) stateManagement.push('mobx');

    return {
      pluginName: this.name,
      success: true,
      framework: {
        name: 'react',
        version: packageJson?.dependencies?.['react'] || 'unknown',
        router: 'react-router',
        stateManagement,
      },
      routes: Array.from(uniqueRoutes.values()),
      components,
    };
  }

  private findRouterConfig(
    sourceFile: ts.SourceFile,
    filePath: string,
    context: AnalysisContext
  ): RouteInfo[] {
    const routes: RouteInfo[] = [];
    const content = sourceFile.getText();

    // Look for createBrowserRouter call
    if (!content.includes('createBrowserRouter')) return routes;

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && 
          ts.isIdentifier(node.expression) &&
          node.expression.text === 'createBrowserRouter') {
        
        // Parse route array
        if (node.arguments.length > 0 && ts.isArrayLiteralExpression(node.arguments[0])) {
          this.parseRouteArray(node.arguments[0], routes, filePath, '', context);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return routes;
  }

  private parseRouteArray(
    arrayNode: ts.ArrayLiteralExpression,
    routes: RouteInfo[],
    filePath: string,
    parentPath: string,
    context: AnalysisContext
  ): void {
    for (const element of arrayNode.elements) {
      if (ts.isObjectLiteralExpression(element)) {
        let routePath = '';
        let component: string | null = null;
        let children: ts.ArrayLiteralExpression | null = null;

        for (const prop of element.properties) {
          if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
            const propName = prop.name.text;
            
            if (propName === 'path' && ts.isStringLiteral(prop.initializer)) {
              routePath = prop.initializer.text;
            }
            if (propName === 'element' && ts.isJsxElement(prop.initializer)) {
              const tag = prop.initializer.openingElement.tagName.getText();
              component = tag;
            }
            if (propName === 'Component' && ts.isIdentifier(prop.initializer)) {
              component = prop.initializer.text;
            }
            if (propName === 'children' && ts.isArrayLiteralExpression(prop.initializer)) {
              children = prop.initializer;
            }
          }
        }

        const fullPath = parentPath + (routePath.startsWith('/') ? routePath : '/' + routePath);
        const normalizedPath = fullPath.replace(/\/+/g, '/') || '/';

        if (routePath) {
          const isDynamic = normalizedPath.includes(':');
          const params = (normalizedPath.match(/:(\w+)/g) || []).map(p => p.slice(1));

          routes.push({
            path: normalizedPath.replace(/:(\w+)/g, '[$1]'), // Convert :id to [id]
            component,
            filePath,
            isProtected: context.config.patterns.protectedRoutes.some(p => p.test(normalizedPath)),
            isDynamic,
            params,
            forms: [],
            apis: [],
          });
        }

        // Process children routes
        if (children) {
          this.parseRouteArray(children, routes, filePath, normalizedPath, context);
        }
      }
    }
  }

  private findJsxRoutes(
    sourceFile: ts.SourceFile,
    filePath: string,
    context: AnalysisContext
  ): RouteInfo[] {
    const routes: RouteInfo[] = [];

    const visit = (node: ts.Node, parentPath: string = '') => {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const openingElement = ts.isJsxElement(node) ? node.openingElement : node;
        const tagName = openingElement.tagName.getText();

        if (tagName === 'Route') {
          let routePath = '';
          let component: string | null = null;

          for (const attr of openingElement.attributes.properties) {
            if (ts.isJsxAttribute(attr) && attr.name) {
              const attrName = attr.name.getText();
              
              if (attrName === 'path' && attr.initializer) {
                if (ts.isStringLiteral(attr.initializer)) {
                  routePath = attr.initializer.text;
                } else if (ts.isJsxExpression(attr.initializer) && 
                           attr.initializer.expression &&
                           ts.isStringLiteral(attr.initializer.expression)) {
                  routePath = attr.initializer.expression.text;
                }
              }
              
              if ((attrName === 'element' || attrName === 'component') && attr.initializer) {
                if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
                  if (ts.isJsxElement(attr.initializer.expression) || 
                      ts.isJsxSelfClosingElement(attr.initializer.expression)) {
                    const tag = ts.isJsxElement(attr.initializer.expression)
                      ? attr.initializer.expression.openingElement.tagName.getText()
                      : attr.initializer.expression.tagName.getText();
                    component = tag;
                  }
                }
              }
            }
          }

          if (routePath) {
            const fullPath = parentPath + (routePath.startsWith('/') ? routePath : '/' + routePath);
            const normalizedPath = fullPath.replace(/\/+/g, '/') || '/';
            const isDynamic = normalizedPath.includes(':');
            const params = (normalizedPath.match(/:(\w+)/g) || []).map(p => p.slice(1));

            routes.push({
              path: normalizedPath.replace(/:(\w+)/g, '[$1]'),
              component,
              filePath,
              isProtected: context.config.patterns.protectedRoutes.some(p => p.test(normalizedPath)),
              isDynamic,
              params,
              forms: [],
              apis: [],
            });

            // Process nested routes
            if (ts.isJsxElement(node)) {
              for (const child of node.children) {
                visit(child, normalizedPath);
              }
            }
            return;
          }
        }
      }

      ts.forEachChild(node, (child) => visit(child, parentPath));
    };

    visit(sourceFile);
    return routes;
  }
}

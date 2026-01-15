import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ParsedFile, JSXElementInfo, HookCall } from './ast-parser.service';
import { ProjectMetadata, FrameworkInfo } from './project-scanner.service';

/**
 * Navigation Mapper v3.0
 * 
 * Phase 2.6: Maps all navigation in the application
 * - File-based routing (Next.js, Remix)
 * - Config-based routing (React Router)
 * - Link components
 * - Programmatic navigation
 */

export interface NavigationAnalysis {
  routes: RouteDefinition[];
  links: LinkDefinition[];
  programmaticNavigations: ProgrammaticNav[];
  guards: RouteGuard[];
  statistics: NavigationStatistics;
}

export interface RouteDefinition {
  path: string;
  component: string | null;
  filePath: string;
  
  // Metadata
  isProtected: boolean;
  isDynamic: boolean;                  // Has params like [id]
  params: string[];                    // Extracted params
  
  // Layout
  layout: string | null;
  
  // Children
  children: RouteDefinition[];
}

export interface LinkDefinition {
  from: string;                        // Source component
  to: string;                          // Target path
  text: string | null;                 // Link text
  selector: string;                    // How to find this link
  line: number;
  filePath: string;
}

export interface ProgrammaticNav {
  from: string;                        // Source component
  to: string | null;                   // Target (may be dynamic)
  trigger: string;                     // What triggers navigation
  condition: string | null;            // Condition for navigation
  line: number;
  filePath: string;
}

export interface RouteGuard {
  name: string;
  type: 'auth' | 'role' | 'custom';
  protectedRoutes: string[];
  redirectTo: string | null;
}

export interface NavigationStatistics {
  totalRoutes: number;
  totalLinks: number;
  protectedRoutes: number;
  dynamicRoutes: number;
  routingType: 'file-based' | 'config-based' | 'mixed';
}

@Injectable()
export class NavigationMapperService {
  
  /**
   * Analyze navigation in the application
   */
  async analyzeNavigation(
    parsedFiles: ParsedFile[],
    projectMetadata: ProjectMetadata
  ): Promise<NavigationAnalysis> {
    console.log(`🧭 Navigation Mapper: Analyzing navigation`);
    const startTime = Date.now();
    
    const routes: RouteDefinition[] = [];
    const links: LinkDefinition[] = [];
    const programmaticNavigations: ProgrammaticNav[] = [];
    const guards: RouteGuard[] = [];
    
    // Determine routing type
    const framework = projectMetadata.framework;
    
    // Extract routes based on framework
    if (framework.type === 'next') {
      const nextRoutes = await this.extractNextJSRoutes(projectMetadata);
      routes.push(...nextRoutes);
    } else if (framework.router === 'react-router') {
      const reactRouterRoutes = this.extractReactRouterRoutes(parsedFiles);
      routes.push(...reactRouterRoutes);
    }
    
    // Extract links and programmatic navigation
    for (const file of parsedFiles) {
      this.extractLinks(file, links);
      this.extractProgrammaticNav(file, programmaticNavigations);
      this.extractGuards(file, guards);
    }
    
    const statistics = this.calculateStatistics(routes, links, framework);
    
    const analysisTime = Date.now() - startTime;
    console.log(`   Found ${routes.length} routes, ${links.length} links in ${analysisTime}ms`);
    
    return { routes, links, programmaticNavigations, guards, statistics };
  }
  
  /**
   * Extract Next.js App Router routes
   */
  private async extractNextJSRoutes(metadata: ProjectMetadata): Promise<RouteDefinition[]> {
    const routes: RouteDefinition[] = [];
    
    // Find app directory
    const appDir = metadata.sourceFiles.find(f => 
      f.relativePath.includes('/app/') || f.relativePath.startsWith('app/')
    );
    
    if (!appDir) {
      // Try pages directory (Pages Router)
      return this.extractNextJSPagesRoutes(metadata);
    }
    
    // Extract routes from file structure
    const pageFiles = metadata.sourceFiles.filter(f =>
      (f.relativePath.includes('/app/') || f.relativePath.startsWith('app/')) &&
      (f.relativePath.endsWith('page.tsx') || 
       f.relativePath.endsWith('page.jsx') ||
       f.relativePath.endsWith('page.ts') ||
       f.relativePath.endsWith('page.js'))
    );
    
    for (const pageFile of pageFiles) {
      const route = this.parseNextJSRoute(pageFile.relativePath, pageFile.path);
      if (route) {
        routes.push(route);
      }
    }
    
    return routes;
  }
  
  /**
   * Extract Next.js Pages Router routes
   */
  private extractNextJSPagesRoutes(metadata: ProjectMetadata): RouteDefinition[] {
    const routes: RouteDefinition[] = [];
    
    const pageFiles = metadata.sourceFiles.filter(f =>
      (f.relativePath.includes('/pages/') || f.relativePath.startsWith('pages/')) &&
      !f.relativePath.includes('/_') && // Skip _app, _document
      (f.relativePath.endsWith('.tsx') || 
       f.relativePath.endsWith('.jsx') ||
       f.relativePath.endsWith('.ts') ||
       f.relativePath.endsWith('.js'))
    );
    
    for (const pageFile of pageFiles) {
      const route = this.parsePagesRoute(pageFile.relativePath, pageFile.path);
      if (route) {
        routes.push(route);
      }
    }
    
    return routes;
  }
  
  /**
   * Parse Next.js App Router path to route
   */
  private parseNextJSRoute(relativePath: string, fullPath: string): RouteDefinition | null {
    // Extract route from path like: app/(group)/users/[id]/page.tsx
    const match = relativePath.match(/app\/(.+)\/page\.(tsx?|jsx?)$/);
    if (!match) return null;
    
    let routePath = '/' + match[1];
    
    // Handle route groups (parentheses)
    routePath = routePath.replace(/\/\([^)]+\)/g, '');
    
    // Extract params
    const params: string[] = [];
    const paramMatches = routePath.matchAll(/\[([^\]]+)\]/g);
    for (const pm of paramMatches) {
      params.push(pm[1].replace('...', '')); // Handle catch-all [...slug]
    }
    
    // Convert Next.js dynamic segments to standard format
    const isDynamic = params.length > 0;
    routePath = routePath.replace(/\[\.\.\.([^\]]+)\]/g, ':$1*'); // Catch-all
    routePath = routePath.replace(/\[([^\]]+)\]/g, ':$1');        // Regular params
    
    return {
      path: routePath,
      component: null,
      filePath: fullPath,
      isProtected: false,
      isDynamic,
      params,
      layout: null,
      children: [],
    };
  }
  
  /**
   * Parse Next.js Pages Router path to route
   */
  private parsePagesRoute(relativePath: string, fullPath: string): RouteDefinition | null {
    // Extract route from path like: pages/users/[id].tsx
    const match = relativePath.match(/pages\/(.+)\.(tsx?|jsx?)$/);
    if (!match) return null;
    
    let routePath = '/' + match[1];
    
    // Handle index files
    routePath = routePath.replace(/\/index$/, '') || '/';
    
    // Extract params
    const params: string[] = [];
    const paramMatches = routePath.matchAll(/\[([^\]]+)\]/g);
    for (const pm of paramMatches) {
      params.push(pm[1].replace('...', ''));
    }
    
    const isDynamic = params.length > 0;
    routePath = routePath.replace(/\[\.\.\.([^\]]+)\]/g, ':$1*');
    routePath = routePath.replace(/\[([^\]]+)\]/g, ':$1');
    
    return {
      path: routePath,
      component: null,
      filePath: fullPath,
      isProtected: false,
      isDynamic,
      params,
      layout: null,
      children: [],
    };
  }
  
  /**
   * Extract React Router routes from config
   */
  private extractReactRouterRoutes(parsedFiles: ParsedFile[]): RouteDefinition[] {
    const routes: RouteDefinition[] = [];
    
    for (const file of parsedFiles) {
      // Look for Route components
      const routeElements = file.jsxElements.filter(el =>
        el.tagName === 'Route' || el.tagName === 'PrivateRoute' || el.tagName === 'ProtectedRoute'
      );
      
      for (const el of routeElements) {
        const pathAttr = el.attributes.find(a => a.name === 'path');
        const componentAttr = el.attributes.find(a => a.name === 'component' || a.name === 'element');
        
        if (pathAttr?.value) {
          const routePath = pathAttr.value;
          const params = this.extractRouteParams(routePath);
          
          routes.push({
            path: routePath,
            component: componentAttr?.value || null,
            filePath: file.filePath,
            isProtected: el.tagName.includes('Private') || el.tagName.includes('Protected'),
            isDynamic: params.length > 0,
            params,
            layout: null,
            children: [],
          });
        }
      }
      
      // Also look for createBrowserRouter config
      for (const func of file.functions) {
        if (func.body.includes('createBrowserRouter')) {
          const configRoutes = this.parseRouterConfig(func.body, file.filePath);
          routes.push(...configRoutes);
        }
      }
    }
    
    return routes;
  }
  
  /**
   * Parse router config object
   */
  private parseRouterConfig(body: string, filePath: string): RouteDefinition[] {
    const routes: RouteDefinition[] = [];
    
    // Simple regex to find path properties
    const pathMatches = body.matchAll(/path:\s*['"`]([^'"`]+)['"`]/g);
    for (const match of pathMatches) {
      const routePath = match[1];
      const params = this.extractRouteParams(routePath);
      
      routes.push({
        path: routePath,
        component: null,
        filePath,
        isProtected: false,
        isDynamic: params.length > 0,
        params,
        layout: null,
        children: [],
      });
    }
    
    return routes;
  }
  
  /**
   * Extract route parameters
   */
  private extractRouteParams(path: string): string[] {
    const params: string[] = [];
    const matches = path.matchAll(/:([^/]+)/g);
    for (const match of matches) {
      params.push(match[1].replace('?', '')); // Remove optional marker
    }
    return params;
  }
  
  /**
   * Extract Link components
   */
  private extractLinks(file: ParsedFile, links: LinkDefinition[]): void {
    const linkElements = file.jsxElements.filter(el =>
      el.tagName === 'Link' || 
      el.tagName === 'NavLink' ||
      (el.tagName.toLowerCase() === 'a' && el.attributes.some(a => a.name === 'href'))
    );
    
    for (const el of linkElements) {
      const hrefAttr = el.attributes.find(a => 
        a.name === 'to' || a.name === 'href'
      );
      
      if (hrefAttr?.value && !hrefAttr.value.startsWith('http')) {
        links.push({
          from: el.parentFunction || 'unknown',
          to: hrefAttr.value,
          text: el.textContent,
          selector: this.buildLinkSelector(el),
          line: el.line,
          filePath: file.filePath,
        });
      }
    }
  }
  
  /**
   * Build selector for link
   */
  private buildLinkSelector(el: JSXElementInfo): string {
    // Try to find best selector
    const testId = el.attributes.find(a => 
      a.name === 'data-testid' || a.name === 'data-cy'
    );
    if (testId?.value) {
      return `[data-testid="${testId.value}"]`;
    }
    
    // Use href
    const href = el.attributes.find(a => a.name === 'to' || a.name === 'href');
    if (href?.value) {
      return `a[href="${href.value}"]`;
    }
    
    // Use text content
    if (el.textContent) {
      return `a:contains("${el.textContent}")`;
    }
    
    return 'a';
  }
  
  /**
   * Extract programmatic navigation
   */
  private extractProgrammaticNav(file: ParsedFile, navigations: ProgrammaticNav[]): void {
    // Find navigation hooks
    const navHooks = file.hooks.filter(h =>
      h.name === 'useNavigate' || h.name === 'useRouter' || h.name === 'useHistory'
    );
    
    if (navHooks.length === 0) return;
    
    // Look for navigation calls in function bodies
    for (const func of file.functions) {
      // navigate('/path')
      const navigateMatches = func.body.matchAll(/navigate\s*\(\s*['"`]([^'"`]+)['"`]/g);
      for (const match of navigateMatches) {
        navigations.push({
          from: func.name,
          to: match[1],
          trigger: 'function call',
          condition: null,
          line: func.line,
          filePath: file.filePath,
        });
      }
      
      // router.push('/path')
      const pushMatches = func.body.matchAll(/(?:router|history)\.push\s*\(\s*['"`]([^'"`]+)['"`]/g);
      for (const match of pushMatches) {
        navigations.push({
          from: func.name,
          to: match[1],
          trigger: 'router.push',
          condition: null,
          line: func.line,
          filePath: file.filePath,
        });
      }
      
      // window.location
      const locationMatches = func.body.matchAll(/window\.location(?:\.href)?\s*=\s*['"`]([^'"`]+)['"`]/g);
      for (const match of locationMatches) {
        navigations.push({
          from: func.name,
          to: match[1],
          trigger: 'window.location',
          condition: null,
          line: func.line,
          filePath: file.filePath,
        });
      }
    }
  }
  
  /**
   * Extract route guards
   */
  private extractGuards(file: ParsedFile, guards: RouteGuard[]): void {
    // Look for auth guard patterns
    for (const func of file.functions) {
      const isGuard = 
        func.name.toLowerCase().includes('guard') ||
        func.name.toLowerCase().includes('protected') ||
        func.name.toLowerCase().includes('private') ||
        func.name.toLowerCase().includes('authroute');
      
      if (isGuard && func.isComponent) {
        // Check for redirect
        const redirectMatch = func.body.match(/(?:navigate|redirect|push)\s*\(\s*['"`]([^'"`]+)['"`]/);
        
        guards.push({
          name: func.name,
          type: func.name.toLowerCase().includes('role') ? 'role' : 'auth',
          protectedRoutes: [],
          redirectTo: redirectMatch ? redirectMatch[1] : null,
        });
      }
    }
  }
  
  /**
   * Calculate statistics
   */
  private calculateStatistics(
    routes: RouteDefinition[],
    links: LinkDefinition[],
    framework: FrameworkInfo
  ): NavigationStatistics {
    return {
      totalRoutes: routes.length,
      totalLinks: links.length,
      protectedRoutes: routes.filter(r => r.isProtected).length,
      dynamicRoutes: routes.filter(r => r.isDynamic).length,
      routingType: framework.type === 'next' ? 'file-based' : 
                   framework.router ? 'config-based' : 'mixed',
    };
  }
  
  /**
   * Find routes by pattern
   */
  findRoutesByPattern(analysis: NavigationAnalysis, pattern: string): RouteDefinition[] {
    const regex = new RegExp(pattern);
    return analysis.routes.filter(r => regex.test(r.path));
  }
  
  /**
   * Get navigation graph (which routes link to which)
   */
  getNavigationGraph(analysis: NavigationAnalysis): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    for (const link of analysis.links) {
      const existing = graph.get(link.from) || [];
      existing.push(link.to);
      graph.set(link.from, existing);
    }
    
    return graph;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { parse } from '@typescript-eslint/typescript-estree';
import * as fs from 'fs';
import * as path from 'path';
import { JSXAnalyzerService } from './jsx-analyzer.service';
import { UniversalNavigationDiscoveryService } from './universal-navigation-discovery.service';
import {
  ComponentAnalysis,
  APICall,
  FormInfo,
  RouteInfo,
  ImportInfo,
  HookUsage,
  JSXStructure,
  JSXElement,
  FormField,
  ValidationRule,
  LinkInfo,
} from './types/intelligence.types';
import { GraphUtils } from './algorithms/graph-utils';

@Injectable()
export class CodeIntelligenceService {
  private readonly logger = new Logger(CodeIntelligenceService.name);

  constructor(
    private readonly jsxAnalyzer: JSXAnalyzerService,
    private readonly universalNav: UniversalNavigationDiscoveryService,
  ) {}

  /**
   * Parse a component file and extract all intelligence
   */
  async parseComponent(filePath: string): Promise<ComponentAnalysis | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const ast = parse(content, {
        jsx: true,
        loc: true,
        range: true,
        comment: true,
        filePath,
      });

      const fileName = path.basename(filePath, path.extname(filePath));
      
      return {
        filePath,
        name: fileName,
        type: this.inferComponentType(filePath, content),
        imports: this.extractImports(ast),
        exports: this.extractExports(ast),
        hooks: this.extractHooks(ast, content),
        props: this.extractProps(ast),
        jsx: this.extractJSXStructure(ast, content),
        dependencies: this.extractDependencies(ast),
      };
    } catch (error) {
      this.logger.warn(`Failed to parse ${filePath}: ${error.message}`);
      return null;
    }
  }

  /**
   * Analyze all components in workspace
   * Handles both workspace root paths and direct src paths
   */
  async analyzeWorkspace(workspacePath: string): Promise<ComponentAnalysis[]> {
    const components: ComponentAnalysis[] = [];
    
    // Smart path detection: if path already ends with /src, use it directly
    // Otherwise, look for /src subdirectory
    let srcPath: string;
    
    if (workspacePath.endsWith('/src') || workspacePath.endsWith('\\src')) {
      srcPath = workspacePath;
    } else {
      srcPath = path.join(workspacePath, 'src');
    }
    
    // If /src doesn't exist, try using the workspace path directly
    if (!fs.existsSync(srcPath)) {
      if (fs.existsSync(workspacePath) && fs.statSync(workspacePath).isDirectory()) {
        srcPath = workspacePath;
        this.logger.log(`Using workspace path directly: ${srcPath}`);
      } else {
        this.logger.warn(`No valid directory found at ${srcPath} or ${workspacePath}`);
        return [];
      }
    }

    const files = this.findReactFiles(srcPath);
    this.logger.log(`Found ${files.length} React files to analyze in ${srcPath}`);

    for (const file of files) {
      const analysis = await this.parseComponent(file);
      if (analysis) {
        components.push(analysis);
      }
    }

    // Universal navigation discovery - finds ALL navigation regardless of UI library
    this.logger.log(`Running universal navigation discovery...`);
    const universalLinks = this.universalNav.discoverNavigationPoints(components);
    this.logger.log(`Universal discovery found ${universalLinks.length} navigation points`);
    
    // Store universal links for use by graph analyzer
    (this as any)._universalLinks = universalLinks;

    return components;
  }

  /**
   * Get universal navigation links
   */
  getUniversalLinks(): LinkInfo[] {
    return (this as any)._universalLinks || [];
  }

  /**
   * Complete project analysis - returns all intelligence for AI synthesis
   */
  async analyzeProject(workspacePath: string): Promise<{
    components: ComponentAnalysis[];
    forms: FormInfo[];
    routes: RouteInfo[];
    apis: APICall[];
    navigationPoints: Array<{ type: string; label: string; path: string }>;
  }> {
    this.logger.log(`Analyzing project for AI synthesis: ${workspacePath}`);
    
    // Step 1: Analyze all components
    const components = await this.analyzeWorkspace(workspacePath);
    this.logger.log(`   Found ${components.length} components`);
    
    // Step 2: Extract all forms from components
    const forms: FormInfo[] = [];
    for (const component of components) {
      if (component.jsx?.forms) {
        forms.push(...component.jsx.forms);
      }
    }
    this.logger.log(`   Found ${forms.length} forms`);
    
    // Step 3: Extract routes
    const routes = this.extractRoutes(components);
    this.logger.log(`   Found ${routes.length} routes`);
    
    // Step 4: Extract APIs
    const apis = this.extractAPIPatterns(components);
    this.logger.log(`   Found ${apis.length} API calls`);
    
    // Step 5: Get universal navigation points
    const universalLinks = this.getUniversalLinks();
    const navigationPoints = universalLinks.map(link => ({
      type: link.isInternal ? 'internal' : 'external',
      label: link.text || 'Navigation',
      path: link.href
    }));
    this.logger.log(`   Found ${navigationPoints.length} navigation points`);
    
    return {
      components,
      forms,
      routes,
      apis,
      navigationPoints
    };
  }

  /**
   * Extract API calls from components
   */
  extractAPIPatterns(components: ComponentAnalysis[]): APICall[] {
    const apiCalls: APICall[] = [];

    for (const component of components) {
      const content = fs.readFileSync(component.filePath, 'utf-8');
      
      // Detect fetch calls
      const fetchRegex = /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g;
      let match;
      while ((match = fetchRegex.exec(content)) !== null) {
        apiCalls.push({
          method: this.inferHTTPMethod(content, match.index),
          endpoint: match[1],
          isRelative: !match[1].startsWith('http'),
          usedIn: component.name,
        });
      }

      // Detect axios calls
      const axiosRegex = /axios\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
      while ((match = axiosRegex.exec(content)) !== null) {
        apiCalls.push({
          method: match[1].toUpperCase() as any,
          endpoint: match[2],
          isRelative: !match[2].startsWith('http'),
          usedIn: component.name,
        });
      }
    }

    return apiCalls;
  }

  /**
   * Build component dependency graph
   */
  buildComponentGraph(components: ComponentAnalysis[]): GraphUtils<ComponentAnalysis, string> {
    const graph = new GraphUtils<ComponentAnalysis, string>();

    // Add all components as nodes
    for (const component of components) {
      graph.addNode(component.name, component, component.type);
    }

    // Add edges based on imports
    for (const component of components) {
      for (const imp of component.imports) {
        // Find if this import references another component
        const importedComponent = components.find(c => 
          imp.source.includes(c.name) || c.filePath.includes(imp.source)
        );

        if (importedComponent && graph.hasNode(importedComponent.name)) {
          graph.addEdge(component.name, importedComponent.name, 1, 'imports');
        }
      }
    }

    return graph;
  }

  /**
   * Extract routes from React Router configurations
   */
  extractRoutes(components: ComponentAnalysis[]): RouteInfo[] {
    const routes: RouteInfo[] = [];

    for (const component of components) {
      try {
        const content = fs.readFileSync(component.filePath, 'utf-8');
        const ast = parse(content, {
          jsx: true,
          loc: true,
          range: true,
          filePath: component.filePath,
        });

        // Use JSX analyzer to extract routes from AST
        const extractedRoutes = this.jsxAnalyzer.extractRoutes(ast);
        
        for (const route of extractedRoutes) {
          routes.push({
            path: route.path,
            component: route.component,
            isProtected: route.isProtected,
            params: this.extractRouteParams(route.path),
            queries: [],
            redirects: [],
          });
        }
      } catch (error) {
        this.logger.warn(`Failed to extract routes from ${component.filePath}: ${error.message}`);
      }
    }

    return routes;
  }

  // === Private Helper Methods ===

  private findReactFiles(dir: string, files: string[] = []): string[] {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        this.findReactFiles(fullPath, files);
      } else if (stat.isFile() && /\.(tsx?|jsx?)$/.test(item)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private inferComponentType(filePath: string, content: string): 'functional' | 'class' | 'page' | 'layout' {
    if (filePath.includes('/pages/') || filePath.includes('/routes/')) {
      return 'page';
    }
    if (filePath.includes('/layouts/') || filePath.includes('/templates/')) {
      return 'layout';
    }
    if (content.includes('class ') && content.includes('extends')) {
      return 'class';
    }
    return 'functional';
  }

  private extractImports(ast: any): ImportInfo[] {
    const imports: ImportInfo[] = [];

    const traverse = (node: any) => {
      if (node.type === 'ImportDeclaration') {
        imports.push({
          source: node.source.value,
          specifiers: node.specifiers.map((s: any) => s.local.name),
          isDefault: node.specifiers.some((s: any) => s.type === 'ImportDefaultSpecifier'),
          isDynamic: false,
        });
      }

      for (const key in node) {
        if (node[key] && typeof node[key] === 'object') {
          traverse(node[key]);
        }
      }
    };

    traverse(ast);
    return imports;
  }

  private extractExports(ast: any): any[] {
    // Simplified - extract export names
    return [];
  }

  private extractHooks(ast: any, content: string): HookUsage[] {
    const hooks: HookUsage[] = [];
    
    // useState
    const useStateRegex = /const\s+\[([^,\]]+),\s*([^\]]+)\]\s*=\s*useState/g;
    let match;
    while ((match = useStateRegex.exec(content)) !== null) {
      hooks.push({
        name: 'useState',
        type: 'state',
        variables: [match[1].trim(), match[2].trim()],
      });
    }

    // useEffect
    const useEffectRegex = /useEffect\s*\(/g;
    const effectCount = (content.match(useEffectRegex) || []).length;
    for (let i = 0; i < effectCount; i++) {
      hooks.push({
        name: 'useEffect',
        type: 'effect',
        variables: [],
      });
    }

    return hooks;
  }

  private extractProps(ast: any): any[] {
    return [];
  }

  private extractJSXStructure(ast: any, content: string): JSXStructure {
    return {
      elements: [],
      forms: this.jsxAnalyzer.extractForms(ast),
      links: this.jsxAnalyzer.extractLinks(ast),
      conditionals: [],
    };
  }

  // Form and link detection now handled by JSXAnalyzerService

  private extractDependencies(ast: any): string[] {
    return [];
  }

  private inferHTTPMethod(content: string, index: number): 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' {
    const section = content.slice(Math.max(0, index - 100), index + 100);
    
    if (/method:\s*['"]POST['"]/i.test(section)) return 'POST';
    if (/method:\s*['"]PUT['"]/i.test(section)) return 'PUT';
    if (/method:\s*['"]PATCH['"]/i.test(section)) return 'PATCH';
    if (/method:\s*['"]DELETE['"]/i.test(section)) return 'DELETE';
    
    return 'GET';
  }

  private isProtectedRoute(content: string, index: number): boolean {
    const section = content.slice(Math.max(0, index - 200), index + 200);
    return /ProtectedRoute|PrivateRoute|RequireAuth/.test(section);
  }

  private extractRouteParams(routePath: string): string[] {
    const params: string[] = [];
    const paramRegex = /:(\w+)/g;
    let match;
    
    while ((match = paramRegex.exec(routePath)) !== null) {
      params.push(match[1]);
    }
    
    return params;
  }
}

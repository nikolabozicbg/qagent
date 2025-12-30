import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DiscoveredFlow } from '../types';
import { BackendAPIService } from './backend-api.service';
import { log } from '../extension';

/**
 * FlowDiscoveryService - Discovers user flows from codebase
 * 
 * Analyzes:
 * - Route definitions (Next.js pages, React Router, etc.)
 * - Component structure
 * - Auth patterns
 * - Form submissions
 */
export class FlowDiscoveryService {
  private backendAPI: BackendAPIService;

  constructor() {
    this.backendAPI = new BackendAPIService();
  }

  /**
   * Discover user flows in the codebase
   * Uses AI (via backend) if available, otherwise falls back to rule-based
   */
  async discoverFlows(workspaceRoot?: string): Promise<DiscoveredFlow[]> {
    const root = workspaceRoot || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) {
      log('No workspace root found');
      return [];
    }

    log('Discovering flows for:', root);

    // Try AI-powered discovery first (via backend)
    const backendAvailable = await this.backendAPI.isAvailable();
    log('Backend available:', backendAvailable);
    
    if (backendAvailable) {
      const aiFlows = await this.backendAPI.discoverFlowsWithAI(root);
      log('AI flows received:', aiFlows.length);
      if (aiFlows.length > 0) {
        return aiFlows;
      }
    }

    // Fallback to rule-based discovery
    log('Falling back to rule-based discovery');
    const ruleFlows = await this.discoverFlowsRuleBased(root);
    log('Rule-based flows:', ruleFlows.length);
    return ruleFlows;
  }

  /**
   * Rule-based flow discovery (fallback when backend not available)
   */
  private async discoverFlowsRuleBased(root: string): Promise<DiscoveredFlow[]> {
    const flows: DiscoveredFlow[] = [];
    let idCounter = 1;

    // Discover different types of flows
    const authFlows = await this.discoverAuthFlows(root);
    const routeFlows = await this.discoverRouteFlows(root);
    const formFlows = await this.discoverFormFlows(root);

    // Merge and deduplicate
    const allFlows = [...authFlows, ...routeFlows, ...formFlows];
    
    // Assign IDs and deduplicate by name
    const seen = new Set<string>();
    for (const flow of allFlows) {
      if (flow.name && !seen.has(flow.name)) {
        seen.add(flow.name);
        flows.push({
          id: String(idCounter++),
          name: flow.name,
          description: flow.description || '',
          confidence: flow.confidence || 50,
          routes: flow.routes || [],
          components: flow.components || [],
          selected: true,
        });
      }
    }

    return flows.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Discover authentication-related flows
   */
  private async discoverAuthFlows(root: string): Promise<Partial<DiscoveredFlow>[]> {
    const flows: Partial<DiscoveredFlow>[] = [];
    const authPatterns = {
      login: { pattern: /login|sign.?in|authenticate/i, description: 'User authentication flow' },
      logout: { pattern: /logout|sign.?out/i, description: 'User sign out' },
      register: { pattern: /register|sign.?up|create.?account/i, description: 'New user registration' },
      forgotPassword: { pattern: /forgot.?password|reset.?password|recover/i, description: 'Password recovery' },
      profile: { pattern: /profile|account|settings/i, description: 'User profile management' },
    };

    // Search for auth-related files
    const authFiles = await this.findFiles(root, [
      '**/auth/**/*.{ts,tsx,js,jsx}',
      '**/login/**/*.{ts,tsx,js,jsx}',
      '**/sign*/**/*.{ts,tsx,js,jsx}',
      '**/*auth*.{ts,tsx,js,jsx}',
      '**/*login*.{ts,tsx,js,jsx}',
    ]);

    // Check for auth patterns
    for (const [flowName, config] of Object.entries(authPatterns)) {
      const matchingFiles = authFiles.filter(f => config.pattern.test(f));
      if (matchingFiles.length > 0) {
        const routes = this.extractRoutes(matchingFiles, root);
        const components = matchingFiles.map(f => path.basename(f, path.extname(f)));
        
        flows.push({
          name: this.formatFlowName(flowName),
          description: config.description,
          confidence: 85 + Math.min(matchingFiles.length * 3, 10),
          routes,
          components: [...new Set(components)],
        });
      }
    }

    return flows;
  }

  /**
   * Discover route-based flows (Next.js pages, etc.)
   */
  private async discoverRouteFlows(root: string): Promise<Partial<DiscoveredFlow>[]> {
    const flows: Partial<DiscoveredFlow>[] = [];

    // Next.js app router
    const appDir = path.join(root, 'src', 'app');
    const pagesDir = path.join(root, 'src', 'pages');
    const altPagesDir = path.join(root, 'pages');

    const routeDirs = [appDir, pagesDir, altPagesDir].filter(d => fs.existsSync(d));

    for (const routeDir of routeDirs) {
      const pageFiles = await this.findFiles(routeDir, ['**/page.{ts,tsx,js,jsx}', '**/*.{ts,tsx,js,jsx}']);
      
      for (const pageFile of pageFiles) {
        const relativePath = path.relative(routeDir, pageFile);
        const routePath = this.fileToRoute(relativePath);
        
        // Skip API routes and internal routes
        if (routePath.startsWith('/api/') || routePath.startsWith('/_')) continue;
        
        // Group related routes into flows
        const flowName = this.routeToFlowName(routePath);
        if (flowName) {
          const existing = flows.find(f => f.name === flowName);
          if (existing) {
            existing.routes = existing.routes || [];
            if (!existing.routes.includes(routePath)) {
              existing.routes.push(routePath);
            }
          } else {
            flows.push({
              name: flowName,
              description: `User flow for ${flowName.toLowerCase()}`,
              confidence: 75,
              routes: [routePath],
              components: [path.basename(pageFile, path.extname(pageFile))],
            });
          }
        }
      }
    }

    return flows;
  }

  /**
   * Discover form-based flows
   */
  private async discoverFormFlows(root: string): Promise<Partial<DiscoveredFlow>[]> {
    const flows: Partial<DiscoveredFlow>[] = [];
    const formPatterns = {
      checkout: { pattern: /checkout|payment|billing/i, description: 'Checkout and payment flow' },
      contact: { pattern: /contact|support|feedback/i, description: 'Contact form submission' },
      search: { pattern: /search|filter|query/i, description: 'Search functionality' },
      subscription: { pattern: /subscribe|newsletter|subscription/i, description: 'Newsletter subscription' },
    };

    const formFiles = await this.findFiles(root, [
      '**/*form*.{ts,tsx,js,jsx}',
      '**/*checkout*.{ts,tsx,js,jsx}',
      '**/*payment*.{ts,tsx,js,jsx}',
      '**/*contact*.{ts,tsx,js,jsx}',
    ]);

    for (const [flowName, config] of Object.entries(formPatterns)) {
      const matchingFiles = formFiles.filter(f => config.pattern.test(f));
      if (matchingFiles.length > 0) {
        flows.push({
          name: this.formatFlowName(flowName),
          description: config.description,
          confidence: 70 + Math.min(matchingFiles.length * 5, 15),
          routes: [],
          components: matchingFiles.map(f => path.basename(f, path.extname(f))),
        });
      }
    }

    return flows;
  }

  /**
   * Find files matching glob patterns
   */
  private async findFiles(root: string, patterns: string[]): Promise<string[]> {
    const results: string[] = [];
    
    const walk = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
              walk(fullPath);
            }
          } else if (entry.isFile()) {
            results.push(fullPath);
          }
        }
      } catch {
        // Ignore permission errors
      }
    };

    walk(root);

    // Filter by patterns (simplified glob matching)
    return results.filter(file => {
      const relativePath = path.relative(root, file);
      return patterns.some(pattern => {
        const regex = this.globToRegex(pattern);
        return regex.test(relativePath);
      });
    });
  }

  /**
   * Convert glob pattern to regex
   */
  private globToRegex(glob: string): RegExp {
    const escaped = glob
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '{{DOUBLESTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/{{DOUBLESTAR}}/g, '.*')
      .replace(/\{([^}]+)\}/g, (_, group) => `(${group.replace(/,/g, '|')})`);
    return new RegExp(escaped);
  }

  /**
   * Extract routes from file paths
   */
  private extractRoutes(files: string[], root: string): string[] {
    return files.map(f => {
      const relative = path.relative(root, f);
      // Try to extract route from path
      const match = relative.match(/(?:pages?|app)\/(.+?)\.(ts|tsx|js|jsx)$/);
      if (match) {
        return '/' + match[1].replace(/\/page$/, '').replace(/\/index$/, '');
      }
      return '/' + path.basename(f, path.extname(f)).toLowerCase();
    }).filter(r => r !== '/');
  }

  /**
   * Convert file path to route
   */
  private fileToRoute(relativePath: string): string {
    return '/' + relativePath
      .replace(/\\/g, '/')
      .replace(/\/page\.(ts|tsx|js|jsx)$/, '')
      .replace(/\/index\.(ts|tsx|js|jsx)$/, '')
      .replace(/\.(ts|tsx|js|jsx)$/, '')
      .replace(/\[([^\]]+)\]/g, ':$1');
  }

  /**
   * Convert route to flow name
   */
  private routeToFlowName(route: string): string | null {
    const segments = route.split('/').filter(Boolean);
    if (segments.length === 0) return 'Home Page';
    
    const firstSegment = segments[0].replace(/^:/, '');
    
    // Skip dynamic routes at top level
    if (firstSegment.startsWith(':')) return null;
    
    return this.formatFlowName(firstSegment);
  }

  /**
   * Format flow name for display
   */
  private formatFlowName(name: string): string {
    return name
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}

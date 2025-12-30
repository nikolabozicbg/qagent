import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface RoutingFrameworkDetectionResult {
  type: 'react-router' | 'nextjs-app' | 'nextjs-pages' | 'vue-router' | 'remix' | 'unknown';
  confidence: number;
  configPath?: string;
  routesDir?: string;
  metadata?: Record<string, any>;
}

/**
 * RoutingDetectorService - Detects routing framework type
 * 
 * Detects:
 * - React Router (config-based routing)
 * - Next.js App Router (file-based routing)
 * - Next.js Pages Router (file-based routing)
 * - Vue Router (config-based routing)
 * - Remix (file-based routing)
 */
@Injectable()
export class RoutingDetectorService {
  
  /**
   * Detect routing framework used in project
   */
  async detect(workspacePath: string): Promise<RoutingFrameworkDetectionResult> {
    console.log('🔍 Detecting routing framework...');
    
    // Check for React Router (config-based)
    const reactRouterResult = this.detectReactRouter(workspacePath);
    if (reactRouterResult.confidence > 90) {
      console.log('✅ Detected: React Router');
      return reactRouterResult;
    }
    
    // Check for Next.js App Router (file-based)
    const nextAppResult = this.detectNextApp(workspacePath);
    if (nextAppResult.confidence > 90) {
      console.log('✅ Detected: Next.js App Router');
      return nextAppResult;
    }
    
    // Check for Next.js Pages Router (file-based)
    const nextPagesResult = this.detectNextPages(workspacePath);
    if (nextPagesResult.confidence > 90) {
      console.log('✅ Detected: Next.js Pages Router');
      return nextPagesResult;
    }
    
    // Check for Vue Router (config-based)
    const vueRouterResult = this.detectVueRouter(workspacePath);
    if (vueRouterResult.confidence > 90) {
      console.log('✅ Detected: Vue Router');
      return vueRouterResult;
    }
    
    // Check for Remix (file-based)
    const remixResult = this.detectRemix(workspacePath);
    if (remixResult.confidence > 90) {
      console.log('✅ Detected: Remix');
      return remixResult;
    }
    
    console.log('⚠️  Unknown routing framework - will use AI fallback');
    return { type: 'unknown', confidence: 0 };
  }
  
  /**
   * Detect React Router
   * Smart search: Finds any file with 'routes' or 'router' in path that imports react-router-dom
   */
  private detectReactRouter(workspacePath: string): RoutingFrameworkDetectionResult {
    // First try common locations (fast path)
    const commonPaths = [
      path.join(workspacePath, 'app', 'routes', 'index.js'),
      path.join(workspacePath, 'app', 'routes', 'index.tsx'),
      path.join(workspacePath, 'src', 'routes', 'index.js'),
      path.join(workspacePath, 'src', 'routes', 'index.tsx'),
      path.join(workspacePath, 'src', 'router', 'index.js'),
      path.join(workspacePath, 'src', 'router', 'index.tsx'),
    ];
    
    for (const configPath of commonPaths) {
      const result = this.checkReactRouterFile(configPath);
      if (result) return result;
    }
    
    // Fallback: Smart recursive search (slower but finds anything)
    console.log('   Common paths not found, doing smart search...');
    const foundPath = this.findRouterConfig(workspacePath);
    if (foundPath) {
      const result = this.checkReactRouterFile(foundPath);
      if (result) return result;
    }
    
    return { type: 'unknown', confidence: 0 };
  }
  
  /**
   * Check if file is React Router config
   */
  private checkReactRouterFile(filePath: string): RoutingFrameworkDetectionResult | null {
    if (!fs.existsSync(filePath)) return null;
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Check for react-router-dom imports
      if (content.includes('react-router-dom') || content.includes('useRoutes')) {
        return {
          type: 'react-router',
          confidence: 95,
          configPath: filePath,
          metadata: {
            hasUseRoutes: content.includes('useRoutes'),
            hasCreateBrowserRouter: content.includes('createBrowserRouter'),
          }
        };
      }
    } catch {}
    
    return null;
  }
  
  /**
   * Smart recursive search for router config
   * Looks for files with 'route' or 'router' in name/path
   */
  private findRouterConfig(dir: string, depth: number = 0): string | null {
    if (depth > 4) return null; // Limit depth
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        // Skip common ignore directories
        if (['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(entry.name)) {
          continue;
        }
        
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isFile()) {
          // Check if filename suggests router config
          const name = entry.name.toLowerCase();
          if ((name.includes('route') || name.includes('router')) && 
              (name.endsWith('.js') || name.endsWith('.tsx') || name.endsWith('.ts'))) {
            return fullPath;
          }
        } else if (entry.isDirectory()) {
          // Recurse into directories that might contain routes
          const dirName = entry.name.toLowerCase();
          if (dirName.includes('route') || dirName.includes('router') || 
              dirName === 'src' || dirName === 'app' || dirName === 'config') {
            const found = this.findRouterConfig(fullPath, depth + 1);
            if (found) return found;
          }
        }
      }
    } catch {}
    
    return null;
  }
  
  /**
   * Detect Next.js App Router
   * Looks for: app/ directory with page.tsx files
   */
  private detectNextApp(workspacePath: string): RoutingFrameworkDetectionResult {
    const appDir = path.join(workspacePath, 'app');
    
    if (!fs.existsSync(appDir)) {
      return { type: 'unknown', confidence: 0 };
    }
    
    // Check for page.tsx or page.js files
    const hasPageFiles = this.hasFilesMatching(appDir, /page\.(tsx?|jsx?)$/);
    
    // Check for Next.js package
    const packageJsonPath = path.join(workspacePath, 'package.json');
    let hasNextJs = false;
    
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        hasNextJs = !!(pkg.dependencies?.next || pkg.devDependencies?.next);
      } catch {}
    }
    
    if (hasPageFiles && hasNextJs) {
      return {
        type: 'nextjs-app',
        confidence: 95,
        routesDir: appDir
      };
    }
    
    return { type: 'unknown', confidence: 0 };
  }
  
  /**
   * Detect Next.js Pages Router
   * Looks for: pages/ directory
   */
  private detectNextPages(workspacePath: string): RoutingFrameworkDetectionResult {
    const pagesDir = path.join(workspacePath, 'pages');
    
    if (!fs.existsSync(pagesDir)) {
      return { type: 'unknown', confidence: 0 };
    }
    
    // Check for Next.js package
    const packageJsonPath = path.join(workspacePath, 'package.json');
    let hasNextJs = false;
    
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        hasNextJs = !!(pkg.dependencies?.next || pkg.devDependencies?.next);
      } catch {}
    }
    
    if (hasNextJs) {
      return {
        type: 'nextjs-pages',
        confidence: 95,
        routesDir: pagesDir
      };
    }
    
    return { type: 'unknown', confidence: 0 };
  }
  
  /**
   * Detect Vue Router
   * Smart search for vue-router config
   */
  private detectVueRouter(workspacePath: string): RoutingFrameworkDetectionResult {
    // Try common paths first
    const commonPaths = [
      path.join(workspacePath, 'src', 'router', 'index.js'),
      path.join(workspacePath, 'src', 'router', 'index.ts'),
    ];
    
    for (const configPath of commonPaths) {
      if (fs.existsSync(configPath)) {
        try {
          const content = fs.readFileSync(configPath, 'utf-8');
          
          if (content.includes('vue-router') || content.includes('createRouter')) {
            return {
              type: 'vue-router',
              confidence: 95,
              configPath
            };
          }
        } catch {}
      }
    }
    
    // Fallback: Use same smart search
    const foundPath = this.findRouterConfig(workspacePath);
    if (foundPath) {
      try {
        const content = fs.readFileSync(foundPath, 'utf-8');
        if (content.includes('vue-router') || content.includes('createRouter')) {
          return {
            type: 'vue-router',
            confidence: 95,
            configPath: foundPath
          };
        }
      } catch {}
    }
    
    return { type: 'unknown', confidence: 0 };
  }
  
  /**
   * Detect Remix
   * Looks for: app/routes/ directory with route files
   */
  private detectRemix(workspacePath: string): RoutingFrameworkDetectionResult {
    const remixRoutesDir = path.join(workspacePath, 'app', 'routes');
    
    if (!fs.existsSync(remixRoutesDir)) {
      return { type: 'unknown', confidence: 0 };
    }
    
    // Check for Remix package
    const packageJsonPath = path.join(workspacePath, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const hasRemix = !!(pkg.dependencies?.['@remix-run/react'] || 
                          pkg.devDependencies?.['@remix-run/react']);
        
        if (hasRemix) {
          return {
            type: 'remix',
            confidence: 95,
            routesDir: remixRoutesDir
          };
        }
      } catch {}
    }
    
    return { type: 'unknown', confidence: 0 };
  }
  
  /**
   * Helper: Check if directory has files matching pattern
   */
  private hasFilesMatching(dir: string, pattern: RegExp, depth: number = 0): boolean {
    if (depth > 3) return false;
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && pattern.test(entry.name)) {
          return true;
        }
        
        if (entry.isDirectory() && !['node_modules', '.git'].includes(entry.name)) {
          const subDir = path.join(dir, entry.name);
          if (this.hasFilesMatching(subDir, pattern, depth + 1)) {
            return true;
          }
        }
      }
    } catch {}
    
    return false;
  }
}

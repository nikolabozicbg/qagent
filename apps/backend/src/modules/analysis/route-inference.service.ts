import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * RouteInferenceService
 * 
 * Intelligently infers actual application routes from component paths.
 * Uses multi-layer strategy: config parsing → import analysis → pattern matching.
 * 
 * Goal: SignInForm → /signin (not /components/SignInForm)
 */
@Injectable()
export class RouteInferenceService {
  private routeConfigCache = new Map<string, Map<string, string>>();
  
  /**
   * Infer actual route from component information
   * Returns: { route: '/signin', confidence: 95 }
   */
  inferActualRoute(
    componentPath: string, 
    componentCode: string, 
    projectRoot: string
  ): { route: string; confidence: number } {
    const fileName = path.basename(componentPath, path.extname(componentPath));
    
    // Strategy 1: Route config parsing (highest confidence)
    const configRoute = this.findRouteInConfig(componentPath, projectRoot);
    if (configRoute) {
      return { route: configRoute, confidence: 95 };
    }
    
    // Strategy 2: Pattern matching for KNOWN forms (auth, common pages)
    // Check if this is a well-known form before trusting imports
    const wellKnownForms = [
      'SignInForm', 'SignIn', 'LoginForm', 'Login',
      'SignUpForm', 'SignUp', 'RegisterForm', 'Register',
      'BankAccountForm', 'BankAccount',
      'TransactionCreateStepTwo', 'TransactionCreate'
    ];
    
    if (wellKnownForms.includes(fileName)) {
      const patternRoute = this.inferRouteFromPattern(componentPath);
      return { route: patternRoute, confidence: 90 }; // HIGH confidence for known forms
    }
    
    // Strategy 3: Import analysis (find Link/navigate calls)
    const importRoute = this.findRouteInImports(componentCode);
    if (importRoute) {
      return { route: importRoute, confidence: 85 };
    }
    
    // Strategy 4: Pattern matching (fallback for unknown forms)
    const patternRoute = this.inferRouteFromPattern(componentPath);
    return { route: patternRoute, confidence: 70 };
  }
  
  /**
   * Strategy 1: Parse route config files
   * Read App.tsx, routes.tsx, router config to find <Route path="/signin" component={SignInForm}>
   */
  private findRouteInConfig(componentPath: string, projectRoot: string): string | null {
    // Check cache
    if (this.routeConfigCache.has(projectRoot)) {
      const cached = this.routeConfigCache.get(projectRoot);
      const componentName = this.extractComponentName(componentPath);
      return cached?.get(componentName) || null;
    }
    
    // Find route config files
    const configFiles = this.findRouteConfigFiles(projectRoot);
    const routeMap = new Map<string, string>();
    
    for (const configFile of configFiles) {
      try {
        const content = fs.readFileSync(configFile, 'utf-8');
        const routes = this.parseRouteConfig(content);
        
        // Merge into map
        for (const [component, route] of routes) {
          routeMap.set(component, route);
        }
      } catch (error) {
        // Ignore files we can't read
      }
    }
    
    // Cache results
    this.routeConfigCache.set(projectRoot, routeMap);
    
    // Look up component
    const componentName = this.extractComponentName(componentPath);
    return routeMap.get(componentName) || null;
  }
  
  /**
   * Find route configuration files in project
   */
  private findRouteConfigFiles(projectRoot: string): string[] {
    const candidates = [
      'src/App.tsx',
      'src/App.jsx',
      'src/routes.tsx',
      'src/routes.ts',
      'src/router/index.tsx',
      'src/router/routes.tsx',
      'src/config/routes.tsx',
      'app/routes.tsx', // Next.js
    ];
    
    const found: string[] = [];
    for (const candidate of candidates) {
      const fullPath = path.join(projectRoot, '..', candidate);
      if (fs.existsSync(fullPath)) {
        found.push(fullPath);
      }
    }
    
    return found;
  }
  
  /**
   * Parse route config to extract component → route mappings
   * Patterns:
   * - <Route path="/signin" component={SignInForm} />
   * - <Route path="/signin"><SignInForm /></Route>
   * - { path: '/signin', component: SignInForm }
   */
  private parseRouteConfig(content: string): Map<string, string> {
    const routes = new Map<string, string>();
    
    // Pattern 1: <Route path="/signin" component={SignInForm} />
    const pattern1 = /<Route\s+path=["']([^"']+)["']\s+component=\{([^}]+)\}/g;
    let match;
    while ((match = pattern1.exec(content)) !== null) {
      const route = match[1];
      const component = match[2].trim();
      routes.set(component, route);
    }
    
    // Pattern 2: <Route path="/signin" element={<SignInForm />} />
    const pattern2 = /<Route\s+path=["']([^"']+)["']\s+element=\{<([^>\s/]+)/g;
    while ((match = pattern2.exec(content)) !== null) {
      const route = match[1];
      const component = match[2].trim();
      routes.set(component, route);
    }
    
    // Pattern 3: Object notation { path: '/signin', component: SignInForm }
    const pattern3 = /\{\s*path:\s*["']([^"']+)["'],\s*component:\s*([^,}\s]+)/g;
    while ((match = pattern3.exec(content)) !== null) {
      const route = match[1];
      const component = match[2].trim();
      routes.set(component, route);
    }
    
    return routes;
  }
  
  /**
   * Strategy 2: Analyze imports for navigation hints
   * Find: useNavigate('/signin'), Link to="/signin", etc.
   */
  private findRouteInImports(componentCode: string): string | null {
    // Pattern: navigate('/signin') or navigate("/signin")
    const navigatePattern = /navigate\(['"]([^'"]+)['"]\)/;
    const navigateMatch = componentCode.match(navigatePattern);
    if (navigateMatch) {
      return navigateMatch[1];
    }
    
    // Pattern: <Link to="/signin">
    const linkPattern = /<Link\s+to=["']([^"']+)["']/;
    const linkMatch = componentCode.match(linkPattern);
    if (linkMatch) {
      return linkMatch[1];
    }
    
    // Pattern: router.push('/signin')
    const pushPattern = /\.push\(['"]([^'"]+)['"]\)/;
    const pushMatch = componentCode.match(pushPattern);
    if (pushMatch) {
      return pushMatch[1];
    }
    
    return null;
  }
  
  /**
   * Strategy 3: Pattern matching (fallback)
   * SignInForm → /signin, BankAccountForm → /bankaccounts
   */
  private inferRouteFromPattern(componentPath: string): string {
    const fileName = path.basename(componentPath, path.extname(componentPath));
    const lower = fileName.toLowerCase();
    
    // Remove common suffixes
    let name = fileName
      .replace(/Form$/i, '')
      .replace(/Page$/i, '')
      .replace(/Component$/i, '')
      .replace(/Modal$/i, '');
    
    // Known patterns
    const patterns: [RegExp, string][] = [
      [/^SignIn$/i, '/signin'],
      [/^SignUp$/i, '/signup'],
      [/^Register$/i, '/signup'],
      [/^Login$/i, '/signin'],
      [/^BankAccount$/i, '/bankaccounts'],
      [/^Transaction.*Create.*Step.*Two$/i, '/transaction/new'],
      [/^Transaction.*Create$/i, '/transaction/new'],
      [/^TransactionCreate$/i, '/transaction/new'],
      [/^UserSettings$/i, '/user/settings'],
      [/^Profile$/i, '/profile'],
      [/^Home$/i, '/'],
      [/^Dashboard$/i, '/dashboard'],
      [/^About$/i, '/about'],
    ];
    
    for (const [pattern, route] of patterns) {
      if (pattern.test(name)) {
        return route;
      }
    }
    
    // Generic: Convert PascalCase to kebab-case route
    // BankAccount → /bank-account, UserSettings → /user-settings
    const kebabCase = name
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, ''); // Remove leading dash
    
    return `/${kebabCase}`;
  }
  
  /**
   * Extract component name from file path
   * components/SignInForm.tsx → SignInForm
   */
  private extractComponentName(componentPath: string): string {
    return path.basename(componentPath, path.extname(componentPath));
  }
}

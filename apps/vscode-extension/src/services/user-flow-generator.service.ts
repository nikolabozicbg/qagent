import { 
  CrawlResult, 
  DiscoveredRoute, 
  DiscoveredElement,
  DiscoveredForm 
} from './route-crawler.service';

/**
 * User flow step
 */
export interface FlowStep {
  id: string;
  route: string;
  title: string;
  action: 'navigate' | 'click' | 'fill' | 'submit' | 'wait';
  element?: DiscoveredElement;
  description: string;
  screenshot?: string;
}

/**
 * User flow (journey)
 */
export interface UserFlow {
  id: string;
  name: string;
  description: string;
  type: 'auth' | 'checkout' | 'crud' | 'search' | 'navigation' | 'form' | 'custom';
  icon: string;
  steps: FlowStep[];
  routes: string[];
  relatedFiles: RelatedFile[]; // Files involved in this flow
  coverage: number; // 0-100
  testCount: number;
  testedFiles: number;
  totalFiles: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedDuration: string;
}

/**
 * File related to a user flow
 */
export interface RelatedFile {
  path: string;
  name: string;
  type: 'component' | 'hook' | 'service' | 'route' | 'util';
  tested: boolean;
  routes: string[]; // Which routes use this file
}

/**
 * Flow analysis result
 */
export interface FlowAnalysisResult {
  flows: UserFlow[];
  totalRoutes: number;
  routesInFlows: number;
  suggestedTests: number;
  criticalFlows: number;
}

/**
 * UserFlowGeneratorService
 * 
 * Analyzes crawled routes and elements to generate intelligent user flows:
 * - Detects common patterns (auth, checkout, CRUD)
 * - Groups related routes into journeys
 * - Suggests test scenarios for each flow
 * - Prioritizes critical business flows
 */
export class UserFlowGeneratorService {
  
  /**
   * Generate user flows from crawl result
   */
  generateFlows(crawlResult: CrawlResult): FlowAnalysisResult {
    const flows: UserFlow[] = [];
    const routesInFlows = new Set<string>();
    
    // 1. Detect authentication flows
    const authFlow = this.detectAuthFlow(crawlResult.routes);
    if (authFlow) {
      flows.push(authFlow);
      authFlow.routes.forEach(r => routesInFlows.add(r));
    }
    
    // 2. Detect checkout/purchase flows
    const checkoutFlow = this.detectCheckoutFlow(crawlResult.routes);
    if (checkoutFlow) {
      flows.push(checkoutFlow);
      checkoutFlow.routes.forEach(r => routesInFlows.add(r));
    }
    
    // 3. Detect CRUD flows (user management, product management, etc.)
    const crudFlows = this.detectCrudFlows(crawlResult.routes);
    crudFlows.forEach(flow => {
      flows.push(flow);
      flow.routes.forEach(r => routesInFlows.add(r));
    });
    
    // 4. Detect form submission flows
    const formFlows = this.detectFormFlows(crawlResult.routes);
    formFlows.forEach(flow => {
      flows.push(flow);
      flow.routes.forEach(r => routesInFlows.add(r));
    });
    
    // 5. Detect search flows
    const searchFlow = this.detectSearchFlow(crawlResult.routes);
    if (searchFlow) {
      flows.push(searchFlow);
      searchFlow.routes.forEach(r => routesInFlows.add(r));
    }
    
    // 6. Generate navigation flow for remaining important pages
    const navFlow = this.generateNavigationFlow(crawlResult.routes, routesInFlows);
    if (navFlow) {
      flows.push(navFlow);
    }
    
    // Calculate stats
    const criticalFlows = flows.filter(f => f.priority === 'critical').length;
    const suggestedTests = flows.reduce((sum, f) => sum + f.steps.length, 0);
    
    return {
      flows,
      totalRoutes: crawlResult.routes.length,
      routesInFlows: routesInFlows.size,
      suggestedTests,
      criticalFlows
    };
  }
  
  /**
   * Detect authentication flow (login, signup, logout)
   */
  private detectAuthFlow(routes: DiscoveredRoute[]): UserFlow | null {
    const authPatterns = [
      /login/i, /signin/i, /sign-in/i,
      /signup/i, /register/i, /sign-up/i,
      /logout/i, /signout/i, /sign-out/i,
      /auth/i, /password/i, /forgot/i, /reset/i
    ];
    
    const authRoutes = routes.filter(r => 
      authPatterns.some(pattern => pattern.test(r.path))
    );
    
    if (authRoutes.length === 0) return null;
    
    const steps: FlowStep[] = [];
    let stepId = 0;
    
    // Login step
    const loginRoute = authRoutes.find(r => /login|signin|sign-in/i.test(r.path));
    if (loginRoute) {
      steps.push({
        id: `step-${stepId++}`,
        route: loginRoute.path,
        title: 'Login Page',
        action: 'navigate',
        description: 'Navigate to login page',
        screenshot: loginRoute.screenshot
      });
      
      // Add form fill steps if form found
      if (loginRoute.forms.length > 0) {
        const form = loginRoute.forms[0];
        steps.push({
          id: `step-${stepId++}`,
          route: loginRoute.path,
          title: 'Fill Credentials',
          action: 'fill',
          description: 'Enter email and password',
          element: form.fields[0]
        });
        
        steps.push({
          id: `step-${stepId++}`,
          route: loginRoute.path,
          title: 'Submit Login',
          action: 'submit',
          description: 'Click login button',
          element: form.submitButton
        });
      }
    }
    
    // Signup step
    const signupRoute = authRoutes.find(r => /signup|register|sign-up/i.test(r.path));
    if (signupRoute) {
      steps.push({
        id: `step-${stepId++}`,
        route: signupRoute.path,
        title: 'Signup Page',
        action: 'navigate',
        description: 'Navigate to signup page',
        screenshot: signupRoute.screenshot
      });
    }
    
    // Detect related files from routes
    const relatedFiles = this.detectRelatedFiles(authRoutes, 'auth');
    
    return {
      id: 'flow-auth',
      name: 'Authentication Flow',
      description: 'User login, signup, and account management',
      type: 'auth',
      icon: '🔐',
      steps,
      routes: authRoutes.map(r => r.path),
      relatedFiles,
      coverage: 0,
      testCount: 0,
      testedFiles: relatedFiles.filter(f => f.tested).length,
      totalFiles: relatedFiles.length,
      priority: 'critical',
      estimatedDuration: '~5 min'
    };
  }
  
  /**
   * Detect checkout/purchase flow
   */
  private detectCheckoutFlow(routes: DiscoveredRoute[]): UserFlow | null {
    const checkoutPatterns = [
      /cart/i, /basket/i, /bag/i,
      /checkout/i, /payment/i, /pay/i,
      /order/i, /purchase/i, /buy/i,
      /shipping/i, /delivery/i,
      /confirmation/i, /thank/i, /success/i
    ];
    
    const checkoutRoutes = routes.filter(r => 
      checkoutPatterns.some(pattern => pattern.test(r.path))
    );
    
    if (checkoutRoutes.length < 2) return null;
    
    const steps: FlowStep[] = [];
    let stepId = 0;
    
    // Cart step
    const cartRoute = checkoutRoutes.find(r => /cart|basket|bag/i.test(r.path));
    if (cartRoute) {
      steps.push({
        id: `step-${stepId++}`,
        route: cartRoute.path,
        title: 'Shopping Cart',
        action: 'navigate',
        description: 'View cart items',
        screenshot: cartRoute.screenshot
      });
    }
    
    // Checkout step
    const checkoutRoute = checkoutRoutes.find(r => /checkout/i.test(r.path));
    if (checkoutRoute) {
      steps.push({
        id: `step-${stepId++}`,
        route: checkoutRoute.path,
        title: 'Checkout',
        action: 'navigate',
        description: 'Proceed to checkout',
        screenshot: checkoutRoute.screenshot
      });
    }
    
    // Payment step
    const paymentRoute = checkoutRoutes.find(r => /payment|pay/i.test(r.path));
    if (paymentRoute) {
      steps.push({
        id: `step-${stepId++}`,
        route: paymentRoute.path,
        title: 'Payment',
        action: 'navigate',
        description: 'Enter payment details',
        screenshot: paymentRoute.screenshot
      });
    }
    
    // Confirmation step
    const confirmRoute = checkoutRoutes.find(r => /confirm|thank|success/i.test(r.path));
    if (confirmRoute) {
      steps.push({
        id: `step-${stepId++}`,
        route: confirmRoute.path,
        title: 'Order Confirmation',
        action: 'wait',
        description: 'Verify order success',
        screenshot: confirmRoute.screenshot
      });
    }
    
    const relatedFiles = this.detectRelatedFiles(checkoutRoutes, 'checkout');
    
    return {
      id: 'flow-checkout',
      name: 'Checkout Flow',
      description: 'Complete purchase from cart to confirmation',
      type: 'checkout',
      icon: '🛒',
      steps,
      routes: checkoutRoutes.map(r => r.path),
      relatedFiles,
      coverage: 0,
      testCount: 0,
      testedFiles: relatedFiles.filter(f => f.tested).length,
      totalFiles: relatedFiles.length,
      priority: 'critical',
      estimatedDuration: '~8 min'
    };
  }
  
  /**
   * Detect CRUD flows for different resources
   */
  private detectCrudFlows(routes: DiscoveredRoute[]): UserFlow[] {
    const flows: UserFlow[] = [];
    const resourcePatterns = [
      { name: 'Users', pattern: /user/i, icon: '👤' },
      { name: 'Products', pattern: /product/i, icon: '📦' },
      { name: 'Posts', pattern: /post|article|blog/i, icon: '📝' },
      { name: 'Settings', pattern: /setting|config|preference/i, icon: '⚙️' },
      { name: 'Profile', pattern: /profile|account/i, icon: '👤' }
    ];
    
    for (const resource of resourcePatterns) {
      const resourceRoutes = routes.filter(r => resource.pattern.test(r.path));
      
      if (resourceRoutes.length >= 2) {
        const steps: FlowStep[] = [];
        let stepId = 0;
        
        // List page
        const listRoute = resourceRoutes.find(r => 
          r.path.endsWith('s') || /list|all|index/i.test(r.path)
        );
        if (listRoute) {
          steps.push({
            id: `step-${stepId++}`,
            route: listRoute.path,
            title: `View ${resource.name}`,
            action: 'navigate',
            description: `Browse ${resource.name.toLowerCase()} list`,
            screenshot: listRoute.screenshot
          });
        }
        
        // Detail page
        const detailRoute = resourceRoutes.find(r => 
          /\[.*\]|:\w+|\/\d+/.test(r.path) || /detail|view/i.test(r.path)
        );
        if (detailRoute) {
          steps.push({
            id: `step-${stepId++}`,
            route: detailRoute.path,
            title: `View ${resource.name.slice(0, -1)} Detail`,
            action: 'click',
            description: 'View item details',
            screenshot: detailRoute.screenshot
          });
        }
        
        // Edit/Create page
        const editRoute = resourceRoutes.find(r => 
          /edit|create|new|add/i.test(r.path)
        );
        if (editRoute) {
          steps.push({
            id: `step-${stepId++}`,
            route: editRoute.path,
            title: `Edit ${resource.name.slice(0, -1)}`,
            action: 'fill',
            description: 'Edit item details',
            screenshot: editRoute.screenshot
          });
        }
        
        if (steps.length >= 2) {
          const relatedFiles = this.detectRelatedFiles(resourceRoutes, resource.name.toLowerCase());
          
          flows.push({
            id: `flow-${resource.name.toLowerCase()}`,
            name: `${resource.name} Management`,
            description: `Create, view, and edit ${resource.name.toLowerCase()}`,
            type: 'crud',
            icon: resource.icon,
            steps,
            routes: resourceRoutes.map(r => r.path),
            relatedFiles,
            coverage: 0,
            testedFiles: relatedFiles.filter(f => f.tested).length,
            totalFiles: relatedFiles.length,
            testCount: 0,
            priority: 'high',
            estimatedDuration: '~4 min'
          });
        }
      }
    }
    
    return flows;
  }
  
  /**
   * Detect form submission flows
   */
  private detectFormFlows(routes: DiscoveredRoute[]): UserFlow[] {
    const flows: UserFlow[] = [];
    const formPatterns = [
      { name: 'Contact Form', pattern: /contact/i, icon: '✉️' },
      { name: 'Newsletter Signup', pattern: /newsletter|subscribe/i, icon: '📧' },
      { name: 'Feedback Form', pattern: /feedback|review/i, icon: '💬' },
      { name: 'Support Request', pattern: /support|help|ticket/i, icon: '🎫' }
    ];
    
    for (const formType of formPatterns) {
      const formRoutes = routes.filter(r => 
        formType.pattern.test(r.path) && r.forms.length > 0
      );
      
      if (formRoutes.length > 0) {
        const route = formRoutes[0];
        const form = route.forms[0];
        
        const steps: FlowStep[] = [
          {
            id: 'step-0',
            route: route.path,
            title: 'Open Form',
            action: 'navigate',
            description: `Navigate to ${formType.name.toLowerCase()}`,
            screenshot: route.screenshot
          }
        ];
        
        // Add steps for each field
        form.fields.forEach((field, index) => {
          steps.push({
            id: `step-${index + 1}`,
            route: route.path,
            title: `Fill ${field.name || field.ariaLabel || 'Field'}`,
            action: 'fill',
            description: `Enter ${field.name || 'value'}`,
            element: field
          });
        });
        
        // Submit step
        if (form.submitButton) {
          steps.push({
            id: `step-${form.fields.length + 1}`,
            route: route.path,
            title: 'Submit Form',
            action: 'submit',
            description: 'Click submit button',
            element: form.submitButton
          });
        }
        
        const relatedFiles = this.detectRelatedFiles([route], formType.name.toLowerCase());
        
        flows.push({
          id: `flow-${formType.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: formType.name,
          description: `Complete ${formType.name.toLowerCase()} submission`,
          type: 'form',
          icon: formType.icon,
          steps,
          routes: [route.path],
          relatedFiles,
          coverage: 0,
          testCount: 0,
          testedFiles: relatedFiles.filter(f => f.tested).length,
          totalFiles: relatedFiles.length,
          priority: 'medium',
          estimatedDuration: '~2 min'
        });
      }
    }
    
    return flows;
  }
  
  /**
   * Detect search flow
   */
  private detectSearchFlow(routes: DiscoveredRoute[]): UserFlow | null {
    const searchPatterns = [/search/i, /find/i, /query/i, /results/i];
    
    const searchRoutes = routes.filter(r => 
      searchPatterns.some(pattern => pattern.test(r.path)) ||
      r.elements.some(e => e.type === 'input' && /search/i.test(e.name || e.ariaLabel || ''))
    );
    
    if (searchRoutes.length === 0) return null;
    
    const steps: FlowStep[] = [];
    let stepId = 0;
    
    // Find page with search input
    const searchPage = searchRoutes.find(r => 
      r.elements.some(e => e.type === 'input')
    ) || searchRoutes[0];
    
    const searchInput = searchPage.elements.find(e => 
      e.type === 'input' && /search/i.test(e.name || e.ariaLabel || e.id || '')
    );
    
    steps.push({
      id: `step-${stepId++}`,
      route: searchPage.path,
      title: 'Open Search',
      action: 'navigate',
      description: 'Navigate to search page',
      screenshot: searchPage.screenshot
    });
    
    if (searchInput) {
      steps.push({
        id: `step-${stepId++}`,
        route: searchPage.path,
        title: 'Enter Search Query',
        action: 'fill',
        description: 'Type search term',
        element: searchInput
      });
    }
    
    // Results page
    const resultsPage = searchRoutes.find(r => /results/i.test(r.path));
    if (resultsPage && resultsPage !== searchPage) {
      steps.push({
        id: `step-${stepId++}`,
        route: resultsPage.path,
        title: 'View Results',
        action: 'wait',
        description: 'Check search results',
        screenshot: resultsPage.screenshot
      });
    }
    
    const relatedFiles = this.detectRelatedFiles(searchRoutes, 'search');
    
    return {
      id: 'flow-search',
      name: 'Search Flow',
      description: 'Search for content and view results',
      type: 'search',
      icon: '🔍',
      steps,
      routes: searchRoutes.map(r => r.path),
      relatedFiles,
      coverage: 0,
      testCount: 0,
      testedFiles: relatedFiles.filter(f => f.tested).length,
      totalFiles: relatedFiles.length,
      priority: 'high',
      estimatedDuration: '~2 min'
    };
  }
  
  /**
   * Generate navigation flow for main pages with interactive steps
   */
  private generateNavigationFlow(
    routes: DiscoveredRoute[], 
    alreadyInFlows: Set<string>
  ): UserFlow | null {
    // Get main navigation pages not yet in a flow
    const mainPages = routes.filter(r => 
      !alreadyInFlows.has(r.path) &&
      r.depth <= 1 &&
      !this.isUtilityPage(r.path)
    );
    
    if (mainPages.length < 2) return null;
    
    // Limit to 6 pages for concise flow
    const pagesToInclude = mainPages.slice(0, 6);
    const steps: FlowStep[] = [];
    
    // Create interactive journey
    for (let i = 0; i < pagesToInclude.length; i++) {
      const currentPage = pagesToInclude[i];
      const pageTitle = currentPage.title || this.pathToTitle(currentPage.path);
      
      if (i === 0) {
        // First step: direct navigation
        steps.push({
          id: `step-${i}`,
          route: currentPage.path,
          title: `Load ${pageTitle}`,
          action: 'navigate',
          description: `Navigate to ${pageTitle}`,
          screenshot: currentPage.screenshot
        });
      } else {
        // Subsequent steps: click navigation elements
        const previousPage = pagesToInclude[i - 1];
        const previousRoute = routes.find(r => r.path === previousPage.path);
        const navElement = this.findNavigationElement(previousRoute, currentPage.path, routes);
        
        if (navElement) {
          // Found navigation element - create click action
          const elementDesc = navElement.text || navElement.ariaLabel || 'link';
          steps.push({
            id: `step-${i}`,
            route: currentPage.path,
            title: `Navigate to ${pageTitle}`,
            action: 'click',
            element: navElement,
            description: `Click "${elementDesc}" to navigate to ${pageTitle}`,
            screenshot: currentPage.screenshot
          });
        } else {
          // No element found - fallback to direct navigation
          steps.push({
            id: `step-${i}`,
            route: currentPage.path,
            title: `Navigate to ${pageTitle}`,
            action: 'navigate',
            description: `Navigate to ${pageTitle}`,
            screenshot: currentPage.screenshot
          });
        }
      }
    }
    
    const relatedFiles = this.detectRelatedFiles(pagesToInclude, 'navigation');
    
    return {
      id: 'flow-navigation',
      name: 'Main Navigation',
      description: 'Browse main pages of the application',
      type: 'navigation',
      icon: '✨',
      steps,
      routes: pagesToInclude.map(r => r.path),
      relatedFiles,
      coverage: 0,
      testCount: 0,
      testedFiles: relatedFiles.filter(f => f.tested).length,
      totalFiles: relatedFiles.length,
      priority: 'medium',
      estimatedDuration: '~3 min'
    };
  }
  
  /**
   * Check if path is a utility page (404, error, etc.)
   */
  private isUtilityPage(path: string): boolean {
    const utilityPatterns = [
      /404/i, /error/i, /not-found/i,
      /terms/i, /privacy/i, /cookie/i,
      /sitemap/i, /robots/i
    ];
    return utilityPatterns.some(pattern => pattern.test(path));
  }
  
  /**
   * Convert path to readable title
   */
  private pathToTitle(path: string): string {
    if (path === '/') return 'Home';
    
    return path
      .split('/')
      .filter(Boolean)
      .pop()!
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
  
  /**
   * Detect related files from routes
   * This infers which components/hooks/services are likely used in the flow
   */
  private detectRelatedFiles(
    routes: DiscoveredRoute[], 
    flowType: string
  ): RelatedFile[] {
    const files: RelatedFile[] = [];
    const seenFiles = new Set<string>();
    
    for (const route of routes) {
      const routePath = route.path;
      
      // 1. Infer route component file from path
      // /login -> Login.tsx or LoginPage.tsx
      // /auth/signin -> Signin.tsx or AuthSignin.tsx
      const segments = routePath.split('/').filter(Boolean);
      if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        const componentName = this.pathToComponentName(lastSegment);
        const componentFile = `${componentName}.tsx`;
        
        if (!seenFiles.has(componentFile)) {
          files.push({
            path: `src/components/${componentFile}`,
            name: componentFile,
            type: 'component',
            tested: false, // Will be updated by coverage provider
            routes: [routePath]
          });
          seenFiles.add(componentFile);
        }
      }
      
      // 2. Detect form components (only if forms actually exist)
      if (route.forms.length > 0) {
        // Use actual form context, not flow type
        const formName = route.forms[0].fields.length > 2 ? 'Contact' : this.pathToComponentName(flowType);
        const formFile = `${formName}Form.tsx`;
        if (!seenFiles.has(formFile)) {
          files.push({
            path: `src/components/${formFile}`,
            name: formFile,
            type: 'component',
            tested: false,
            routes: [routePath]
          });
          seenFiles.add(formFile);
        }
      }
      
      // 3. Detect hooks based on flow type
      if (flowType === 'auth') {
        const hookFile = 'useAuth.ts';
        if (!seenFiles.has(hookFile)) {
          files.push({
            path: `src/hooks/${hookFile}`,
            name: hookFile,
            type: 'hook',
            tested: false,
            routes: routes.map(r => r.path)
          });
          seenFiles.add(hookFile);
        }
      } else if (flowType === 'checkout') {
        const hookFile = 'useCart.ts';
        if (!seenFiles.has(hookFile)) {
          files.push({
            path: `src/hooks/${hookFile}`,
            name: hookFile,
            type: 'hook',
            tested: false,
            routes: routes.map(r => r.path)
          });
          seenFiles.add(hookFile);
        }
      }
      
      // 4. Detect service/API files
      if (route.apiCalls.length > 0) {
        const serviceFile = `${flowType}Service.ts`;
        if (!seenFiles.has(serviceFile)) {
          files.push({
            path: `src/services/${serviceFile}`,
            name: serviceFile,
            type: 'service',
            tested: false,
            routes: routes.map(r => r.path)
          });
          seenFiles.add(serviceFile);
        }
      }
      
      // 5. Detect button/input components (with smart filtering)
      const buttons = route.elements.filter(e => e.type === 'button');
      if (buttons.length > 0) {
        const btnNames = new Set(
          buttons
            .map(b => b.text)
            .filter((text): text is string => !!text)
            .filter(text => this.isValidButtonText(text))
        );
        btnNames.forEach(btnText => {
          if (btnText) {
            const btnFile = `${this.textToComponentName(btnText)}Button.tsx`;
            if (!seenFiles.has(btnFile)) {
              files.push({
                path: `src/components/${btnFile}`,
                name: btnFile,
                type: 'component',
                tested: false,
                routes: [routePath]
              });
              seenFiles.add(btnFile);
            }
          }
        });
      }
    }
    
    return files;
  }
  
  /**
   * Convert path segment to component name
   * login -> Login
   * sign-up -> SignUp
   */
  private pathToComponentName(segment: string): string {
    return segment
      .split('-')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join('');
  }
  
  /**
   * Convert button text to component name
   * "Sign In" -> SignIn
   */
  private textToComponentName(text: string): string {
    return text
      .split(/\s+/)
      .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
      .join('');
  }
  
  /**
   * Check if button text is valid for component extraction
   * Filter out questions, long sentences, and content text
   */
  private isValidButtonText(text: string): boolean {
    if (!text) return false;
    
    // Skip if too long (likely content, not a button label)
    if (text.length > 25) return false;
    
    // Skip questions
    if (text.includes('?')) return false;
    
    // Skip sentences (multiple words that look like prose)
    const words = text.split(/\s+/);
    if (words.length > 4) return false;
    
    // Skip common content patterns
    const contentPatterns = [
      /^(how|what|why|when|where|who)/i,
      /does.*\?/i,
      /can.*\?/i,
      /learn more about/i,
      /read more/i,
      /click here to/i
    ];
    if (contentPatterns.some(pattern => pattern.test(text))) return false;
    
    // Valid button patterns
    const validPatterns = [
      /^(get|sign|log|buy|start|try|contact|submit|send|save|cancel|close|open|delete|edit|create|add|remove)/i,
      /^(yes|no|ok|cancel)$/i,
      /upgrade|pricing|demo|free trial/i
    ];
    if (validPatterns.some(pattern => pattern.test(text))) return true;
    
    // Default: allow short text (likely buttons)
    return words.length <= 3;
  }
  
  /**
   * Find navigation element from one route to another
   * Searches for buttons/links that navigate between routes
   */
  private findNavigationElement(
    fromRoute: DiscoveredRoute | undefined,
    toRoute: string,
    allRoutes: DiscoveredRoute[]
  ): DiscoveredElement | null {
    if (!fromRoute) return null;
    if (!fromRoute.elements || fromRoute.elements.length === 0) return null;
    
    // Extract the target route name (e.g., '/pricing' -> 'pricing')
    const targetName = toRoute.replace(/^\//, '').toLowerCase();
    const targetWords = targetName.split(/[-_\/]/).filter(w => w.length > 0);
    
    // Priority 1: Exact href match
    for (const element of fromRoute.elements) {
      if ((element.type === 'button' || element.type === 'link') && element.href) {
        // Exact match
        if (element.href === toRoute || element.href === `${toRoute}/`) {
          return element;
        }
        // Ends with target route
        if (element.href.endsWith(toRoute) || element.href.endsWith(`${toRoute}/`)) {
          return element;
        }
      }
    }
    
    // Priority 2: Text exact match (case insensitive)
    for (const element of fromRoute.elements) {
      if (element.type !== 'button' && element.type !== 'link') continue;
      
      if (element.text) {
        const elementText = element.text.toLowerCase().trim();
        
        // Exact match: "pricing" === "pricing"
        if (elementText === targetName) {
          return element;
        }
        
        // Special case: "Home" button -> / route
        if (toRoute === '/' && /^(home|main|index)$/i.test(elementText)) {
          return element;
        }
      }
    }
    
    // Priority 3: Text contains target words
    if (targetWords.length > 0) {
      for (const element of fromRoute.elements) {
        if (element.type !== 'button' && element.type !== 'link') continue;
        
        if (element.text) {
          const elementText = element.text.toLowerCase();
          
          // Check if element text contains ANY target word
          for (const word of targetWords) {
            if (word.length >= 3 && elementText.includes(word)) {
              return element;
            }
          }
        }
      }
    }
    
    // Priority 4: Check aria-label
    for (const element of fromRoute.elements) {
      if (element.type !== 'button' && element.type !== 'link') continue;
      
      if (element.ariaLabel) {
        const ariaLabel = element.ariaLabel.toLowerCase();
        if (targetWords.some(word => word.length >= 3 && ariaLabel.includes(word))) {
          return element;
        }
      }
    }
    
    // Priority 5: Partial href match (fallback)
    for (const element of fromRoute.elements) {
      if (element.type === 'link' && element.href) {
        const href = element.href.toLowerCase();
        if (targetWords.some(word => word.length >= 3 && href.includes(word))) {
          return element;
        }
      }
    }
    
    // No element found - return null to fallback to direct navigation
    return null;
  }
  
  /**
   * Generate assertions for a step
   */
  private generateAssertions(step: FlowStep, route: string): string[] {
    const assertions: string[] = [];
    
    // URL assertion
    const escapedRoute = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (route === '/') {
      assertions.push(`    await expect(page).toHaveURL('${route}');`);
    } else {
      assertions.push(`    await expect(page).toHaveURL(/.*${escapedRoute}/);`);
    }
    
    // Page loaded assertion
    assertions.push(`    await expect(page.locator('body')).toBeVisible();`);
    
    // Content assertions for navigate and click actions
    if (step.action === 'navigate' || step.action === 'click') {
      assertions.push(`    await expect(page.locator('h1').first()).toBeVisible();`);
    }
    
    return assertions;
  }
  
  /**
   * Create Playwright selector from element
   */
  private createSelector(element: DiscoveredElement): string {
    // If element already has a selector, use it
    if (element.selector) return element.selector;
    
    // Generate selector based on element properties
    if (element.text) {
      const cleanText = element.text.replace(/'/g, "\\'");
      if (element.type === 'button') {
        return `button:has-text('${cleanText}')`;
      } else if (element.type === 'link') {
        if (element.href) {
          return `a[href="${element.href}"]`;
        }
        return `a:has-text('${cleanText}')`;
      }
      return `text=${cleanText}`;
    }
    
    // Fallback to generic selector
    if (element.href) {
      return `a[href="${element.href}"]`;
    }
    return element.type || 'button';
  }
  
  /**
   * Generate Playwright test code for a flow
   */
  generateTestCode(flow: UserFlow, baseUrl: string): string {
    const testLines: string[] = [
      `import { test, expect } from '@playwright/test';`,
      ``,
      `test.describe('${flow.name}', () => {`,
    ];
    
    // Generate test for each step
    flow.steps.forEach((step, index) => {
      // Use step description for test name (more descriptive than title)
      const testName = step.description || step.title;
      testLines.push(`  test('${testName}', async ({ page }) => {`);
      
      // For click actions, start from home (or previous route)
      if (step.action === 'click' && index > 0) {
        const prevRoute = flow.steps[index - 1].route;
        testLines.push(`    // Start from previous page`);
        testLines.push(`    await page.goto('${baseUrl}${prevRoute}');`);
        testLines.push(``);
        
        // Create selector for the element
        if (step.element) {
          const selector = this.createSelector(step.element);
          const elementName = step.element.text || 'element';
          
          testLines.push(`    // Click "${elementName}" to navigate`);
          testLines.push(`    const element = page.locator('${selector}').first();`);
          testLines.push(`    await expect(element).toBeVisible();`);
          testLines.push(`    await element.click();`);
          testLines.push(``);
        }
      } else {
        // Direct navigation
        testLines.push(`    await page.goto('${baseUrl}${step.route}');`);
        testLines.push(``);
      }
      
      // Add assertions
      const assertions = this.generateAssertions(step, step.route);
      testLines.push(...assertions);
      
      // Additional action-specific code
      switch (step.action) {
        case 'fill':
          if (step.element) {
            const selector = this.createSelector(step.element);
            testLines.push(``);
            testLines.push(`    await page.locator('${selector}').fill('test value');`);
          }
          break;
        case 'submit':
          if (step.element) {
            const selector = this.createSelector(step.element);
            testLines.push(``);
            testLines.push(`    await page.locator('${selector}').click();`);
            testLines.push(`    await page.waitForLoadState('networkidle');`);
          }
          break;
        case 'wait':
          testLines.push(``);
          testLines.push(`    await page.waitForLoadState('networkidle');`);
          break;
      }
      
      testLines.push(`  });`);
      testLines.push(``);
    });
    
    testLines.push(`});`);
    
    return testLines.join('\n');
  }
}

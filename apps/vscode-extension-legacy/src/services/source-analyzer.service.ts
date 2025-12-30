import * as fs from 'fs';
import * as path from 'path';
import { DetectedElement, AdditionalTestOption, SourceAnalysis } from '../webviews/test-preview.webview';

/**
 * SourceAnalyzerService
 * 
 * Analyzes source files to detect testable elements:
 * - React components (JSX returns)
 * - Functions and methods
 * - Hooks (useState, useEffect, custom hooks)
 * - DOM elements with user interactions
 * - API calls
 * - Event handlers
 */
export class SourceAnalyzerService {
  
  /**
   * Analyze a source file and return detected testable elements
   */
  async analyzeFile(filePath: string): Promise<SourceAnalysis> {
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath);
    
    const detectedElements: DetectedElement[] = [];
    
    // Detect based on file type
    if (ext === '.tsx' || ext === '.jsx') {
      // React component file
      detectedElements.push(...this.detectReactElements(sourceCode, fileName));
    } else if (ext === '.ts' || ext === '.js') {
      // Service/utility file
      detectedElements.push(...this.detectFunctions(sourceCode, fileName));
    }
    
    // Build additional test options based on what we found
    const additionalOptions = this.buildAdditionalOptions(sourceCode, detectedElements);
    
    return {
      sourceCode,
      detectedElements,
      additionalOptions
    };
  }
  
  /**
   * Detect React-specific elements (components, hooks, JSX)
   */
  private detectReactElements(sourceCode: string, fileName: string): DetectedElement[] {
    const elements: DetectedElement[] = [];
    let idCounter = 0;
    
    // 1. Detect imported/used components (e.g., <Header />, <Footer />)
    const jsxComponentRegex = /<([A-Z][a-zA-Z0-9]*)\s*[^>]*\/?>/g;
    const foundComponents = new Set<string>();
    let match;
    
    while ((match = jsxComponentRegex.exec(sourceCode)) !== null) {
      const componentName = match[1];
      if (!foundComponents.has(componentName) && !this.isHtmlElement(componentName)) {
        foundComponents.add(componentName);
        elements.push({
          id: `el-${idCounter++}`,
          name: `<${componentName} />`,
          type: 'component',
          description: `Test ${componentName} renders correctly`,
          selected: true
        });
      }
    }
    
    // 2. Detect hooks usage
    const hooksRegex = /use([A-Z][a-zA-Z]*)\s*\(/g;
    const foundHooks = new Set<string>();
    
    while ((match = hooksRegex.exec(sourceCode)) !== null) {
      const hookName = `use${match[1]}`;
      if (!foundHooks.has(hookName)) {
        foundHooks.add(hookName);
        elements.push({
          id: `el-${idCounter++}`,
          name: hookName,
          type: 'hook',
          description: this.getHookDescription(hookName),
          selected: hookName === 'useState' || hookName === 'useEffect' // Auto-select common hooks
        });
      }
    }
    
    // 3. Detect event handlers (onClick, onSubmit, onChange, etc.)
    const eventHandlerRegex = /on([A-Z][a-zA-Z]*)\s*=\s*\{?\s*([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const foundHandlers = new Set<string>();
    
    while ((match = eventHandlerRegex.exec(sourceCode)) !== null) {
      const eventType = match[1];
      const handlerName = match[2];
      const key = `${eventType}-${handlerName}`;
      
      if (!foundHandlers.has(key) && handlerName !== 'undefined') {
        foundHandlers.add(key);
        elements.push({
          id: `el-${idCounter++}`,
          name: `on${eventType} → ${handlerName}()`,
          type: 'function',
          description: `Test ${eventType.toLowerCase()} event handling`,
          selected: ['Click', 'Submit', 'Change'].includes(eventType)
        });
      }
    }
    
    // 4. Detect form elements
    if (sourceCode.includes('<form') || sourceCode.includes('<Form')) {
      elements.push({
        id: `el-${idCounter++}`,
        name: '<form>',
        type: 'element',
        description: 'Test form submission and validation',
        selected: true
      });
    }
    
    // 5. Detect navigation/links
    const linkRegex = /<(Link|a)\s+[^>]*href\s*=\s*["']([^"']+)["']/g;
    const foundLinks = new Set<string>();
    
    while ((match = linkRegex.exec(sourceCode)) !== null) {
      const href = match[2];
      if (!foundLinks.has(href) && !href.startsWith('http')) {
        foundLinks.add(href);
      }
    }
    
    if (foundLinks.size > 0) {
      elements.push({
        id: `el-${idCounter++}`,
        name: `Navigation (${foundLinks.size} links)`,
        type: 'element',
        description: 'Test internal navigation links work',
        selected: true
      });
    }
    
    // 6. Detect async operations (fetch, axios, etc.)
    if (sourceCode.includes('fetch(') || sourceCode.includes('axios') || 
        sourceCode.includes('useSWR') || sourceCode.includes('useQuery')) {
      elements.push({
        id: `el-${idCounter++}`,
        name: 'API Calls',
        type: 'effect',
        description: 'Test data fetching and loading states',
        selected: true
      });
    }
    
    // 7. Detect conditional rendering
    const conditionalCount = (sourceCode.match(/\{[^}]*\?\s*</g) || []).length +
                            (sourceCode.match(/\{[^}]*&&\s*</g) || []).length;
    if (conditionalCount > 0) {
      elements.push({
        id: `el-${idCounter++}`,
        name: `Conditional Rendering (${conditionalCount})`,
        type: 'element',
        description: 'Test different render states',
        selected: false
      });
    }
    
    // 8. Detect the main export (default component)
    const defaultExportMatch = sourceCode.match(/export\s+default\s+(?:function\s+)?([A-Z][a-zA-Z0-9]*)/);
    if (defaultExportMatch) {
      const componentName = defaultExportMatch[1];
      // Add as first element if not already detected
      if (!foundComponents.has(componentName)) {
        elements.unshift({
          id: `el-${idCounter++}`,
          name: `${componentName} (main)`,
          type: 'component',
          description: `Test main component renders without errors`,
          selected: true
        });
      }
    }
    
    return elements;
  }
  
  /**
   * Detect functions in service/utility files
   */
  private detectFunctions(sourceCode: string, fileName: string): DetectedElement[] {
    const elements: DetectedElement[] = [];
    let idCounter = 0;
    
    // Detect exported functions
    const functionRegex = /export\s+(?:async\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;
    
    while ((match = functionRegex.exec(sourceCode)) !== null) {
      const funcName = match[1];
      elements.push({
        id: `el-${idCounter++}`,
        name: `${funcName}()`,
        type: 'function',
        description: `Test ${funcName} function`,
        selected: true
      });
    }
    
    // Detect exported arrow functions
    const arrowRegex = /export\s+const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(?:async\s*)?\(/g;
    
    while ((match = arrowRegex.exec(sourceCode)) !== null) {
      const funcName = match[1];
      elements.push({
        id: `el-${idCounter++}`,
        name: `${funcName}()`,
        type: 'function',
        description: `Test ${funcName} function`,
        selected: true
      });
    }
    
    // Detect class methods (for services)
    const methodRegex = /(?:async\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g;
    const foundMethods = new Set<string>();
    
    while ((match = methodRegex.exec(sourceCode)) !== null) {
      const methodName = match[1];
      // Skip constructors and common lifecycle methods
      if (!['constructor', 'render', 'componentDidMount'].includes(methodName) && 
          !foundMethods.has(methodName)) {
        foundMethods.add(methodName);
        elements.push({
          id: `el-${idCounter++}`,
          name: `${methodName}()`,
          type: 'function',
          description: `Test ${methodName} method`,
          selected: elements.length < 5 // Auto-select first 5
        });
      }
    }
    
    return elements;
  }
  
  /**
   * Build additional test options based on detected content
   */
  private buildAdditionalOptions(sourceCode: string, elements: DetectedElement[]): AdditionalTestOption[] {
    const options: AdditionalTestOption[] = [];
    let idCounter = 0;
    
    // Mobile responsive tests (if has responsive classes or media queries)
    if (sourceCode.includes('md:') || sourceCode.includes('lg:') || 
        sourceCode.includes('@media') || sourceCode.includes('useMediaQuery')) {
      options.push({
        id: `opt-${idCounter++}`,
        label: 'Mobile Responsive',
        description: 'Test on different viewport sizes',
        selected: false
      });
    }
    
    // Dark mode tests
    if (sourceCode.includes('dark:') || sourceCode.includes('theme') || 
        sourceCode.includes('colorMode') || sourceCode.includes('darkMode')) {
      options.push({
        id: `opt-${idCounter++}`,
        label: 'Dark Mode',
        description: 'Test theme switching',
        selected: false
      });
    }
    
    // Accessibility tests (always offer)
    options.push({
      id: `opt-${idCounter++}`,
      label: 'Accessibility (a11y)',
      description: 'Test keyboard navigation and ARIA',
      selected: false
    });
    
    // Error handling (if has try/catch or error states)
    if (sourceCode.includes('catch') || sourceCode.includes('error') || 
        sourceCode.includes('Error') || sourceCode.includes('isError')) {
      options.push({
        id: `opt-${idCounter++}`,
        label: 'Error Handling',
        description: 'Test error states and boundaries',
        selected: false
      });
    }
    
    // Loading states
    if (sourceCode.includes('loading') || sourceCode.includes('isLoading') || 
        sourceCode.includes('Skeleton') || sourceCode.includes('Spinner')) {
      options.push({
        id: `opt-${idCounter++}`,
        label: 'Loading States',
        description: 'Test loading indicators',
        selected: false
      });
    }
    
    // Edge cases (always offer)
    options.push({
      id: `opt-${idCounter++}`,
      label: 'Edge Cases',
      description: 'Test empty states, limits, boundaries',
      selected: false
    });
    
    return options;
  }
  
  /**
   * Get description for common hooks
   */
  private getHookDescription(hookName: string): string {
    const descriptions: Record<string, string> = {
      'useState': 'Test state changes and updates',
      'useEffect': 'Test side effects and cleanup',
      'useContext': 'Test context consumption',
      'useReducer': 'Test reducer state management',
      'useCallback': 'Test memoized callbacks',
      'useMemo': 'Test memoized values',
      'useRef': 'Test ref handling',
      'useRouter': 'Test navigation behavior',
      'useParams': 'Test URL parameter handling',
      'useSearchParams': 'Test query parameter handling'
    };
    return descriptions[hookName] || `Test ${hookName} hook behavior`;
  }
  
  /**
   * Check if name is a standard HTML element (not a component)
   */
  private isHtmlElement(name: string): boolean {
    const htmlElements = [
      'div', 'span', 'p', 'a', 'button', 'input', 'form', 'label',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'td', 'th', 'nav', 'header',
      'footer', 'main', 'section', 'article', 'aside', 'svg', 'path'
    ];
    return htmlElements.includes(name.toLowerCase());
  }
}

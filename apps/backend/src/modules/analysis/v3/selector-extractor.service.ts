import { Injectable } from '@nestjs/common';
import { ParsedFile, JSXElementInfo, AttributeInfo } from './ast-parser.service';

/**
 * Selector Extractor v3.0
 * 
 * Phase 2.7: Extracts and prioritizes selectors for test automation
 * - data-testid, data-cy, data-test (highest priority)
 * - aria-label (accessibility + testable)
 * - role attribute
 * - id attribute
 * - text content
 * - className combinations
 */

export interface SelectorAnalysis {
  selectors: ElementSelector[];
  selectorMap: Map<string, ElementSelector>;  // Keyed by unique element ID
  statistics: SelectorStatistics;
}

export interface ElementSelector {
  elementId: string;                   // Unique identifier
  tagName: string;
  component: string | null;            // Parent component
  filePath: string;
  line: number;
  
  // Primary selector
  primary: SelectorDefinition;
  
  // Fallback selectors in priority order
  fallbacks: SelectorDefinition[];
  
  // Element context
  isInteractive: boolean;
  textContent: string | null;
  role: string | null;
  
  // Quality
  stabilityScore: number;              // 0-1, how stable this selector is
}

export interface SelectorDefinition {
  selector: string;                    // The actual selector string
  strategy: SelectorStrategy;
  confidence: number;                  // 0-1
  isUnique: boolean;                   // Is this selector unique on the page?
}

export type SelectorStrategy = 
  | 'testId'       // data-testid, data-cy, data-test
  | 'ariaLabel'    // aria-label
  | 'role'         // role attribute
  | 'text'         // Text content
  | 'id'           // id attribute
  | 'name'         // name attribute
  | 'placeholder'  // placeholder attribute
  | 'className'    // Class combination
  | 'css'          // CSS selector
  | 'xpath';       // XPath (fallback)

export interface SelectorStatistics {
  totalElements: number;
  elementsWithTestId: number;
  elementsWithAriaLabel: number;
  elementsWithRole: number;
  interactiveElements: number;
  avgSelectorsPerElement: number;
  coverageScore: number;               // Overall test selector coverage
}

// Interactive elements that are typically tested
const INTERACTIVE_TAGS = new Set([
  'button', 'input', 'select', 'textarea', 'a',
  'form', 'dialog', 'details', 'summary',
  'checkbox', 'radio', 'switch',
]);

// Selector strategy priority (higher = better)
const STRATEGY_PRIORITY: Record<SelectorStrategy, number> = {
  testId: 10,
  ariaLabel: 8,
  role: 7,
  id: 6,
  name: 5,
  placeholder: 4,
  text: 3,
  className: 2,
  css: 1,
  xpath: 0,
};

@Injectable()
export class SelectorExtractorService {
  
  /**
   * Extract selectors from all parsed files
   */
  extractSelectors(parsedFiles: ParsedFile[]): SelectorAnalysis {
    console.log(`🎯 Selector Extractor: Extracting test selectors`);
    const startTime = Date.now();
    
    const selectors: ElementSelector[] = [];
    const selectorMap = new Map<string, ElementSelector>();
    
    for (const file of parsedFiles) {
      const fileSelectors = this.extractFromFile(file);
      
      for (const selector of fileSelectors) {
        selectors.push(selector);
        selectorMap.set(selector.elementId, selector);
      }
    }
    
    const statistics = this.calculateStatistics(selectors);
    
    const analysisTime = Date.now() - startTime;
    console.log(`   Extracted ${selectors.length} element selectors in ${analysisTime}ms`);
    
    return { selectors, selectorMap, statistics };
  }
  
  /**
   * Extract selectors from a single file
   */
  private extractFromFile(file: ParsedFile): ElementSelector[] {
    const selectors: ElementSelector[] = [];
    
    for (const element of file.jsxElements) {
      // Focus on interactive elements primarily
      const isInteractive = this.isInteractiveElement(element);
      
      // Always extract from elements with test attributes
      const hasTestAttr = element.attributes.some(a => 
        a.name === 'data-testid' || a.name === 'data-cy' || a.name === 'data-test'
      );
      
      if (isInteractive || hasTestAttr) {
        const selector = this.buildElementSelector(element, file);
        if (selector) {
          selectors.push(selector);
        }
      }
    }
    
    return selectors;
  }
  
  /**
   * Check if element is interactive
   */
  private isInteractiveElement(element: JSXElementInfo): boolean {
    const tagLower = element.tagName.toLowerCase();
    
    // Check tag name
    if (INTERACTIVE_TAGS.has(tagLower)) return true;
    
    // Check for onClick handler
    if (element.attributes.some(a => a.name === 'onClick')) return true;
    
    // Check for role attribute that implies interactivity
    const roleAttr = element.attributes.find(a => a.name === 'role');
    if (roleAttr?.value) {
      const interactiveRoles = ['button', 'link', 'checkbox', 'radio', 'textbox', 'combobox', 'listbox', 'menuitem'];
      if (interactiveRoles.includes(roleAttr.value)) return true;
    }
    
    // Check if it's a component that looks interactive
    if (element.isComponent) {
      const nameLower = element.tagName.toLowerCase();
      return nameLower.includes('button') || 
             nameLower.includes('input') ||
             nameLower.includes('field') ||
             nameLower.includes('select') ||
             nameLower.includes('link');
    }
    
    return false;
  }
  
  /**
   * Build selector definition for element
   */
  private buildElementSelector(element: JSXElementInfo, file: ParsedFile): ElementSelector | null {
    const attrs = new Map(element.attributes.map(a => [a.name, a.value]));
    
    const allSelectors: SelectorDefinition[] = [];
    
    // 1. Test ID selectors (highest priority)
    const testId = attrs.get('data-testid') || attrs.get('data-cy') || attrs.get('data-test');
    if (testId) {
      const attrName = attrs.has('data-testid') ? 'data-testid' : 
                       attrs.has('data-cy') ? 'data-cy' : 'data-test';
      allSelectors.push({
        selector: `[${attrName}="${testId}"]`,
        strategy: 'testId',
        confidence: 1,
        isUnique: true,
      });
    }
    
    // 2. Aria label
    const ariaLabel = attrs.get('aria-label');
    if (ariaLabel) {
      allSelectors.push({
        selector: `[aria-label="${ariaLabel}"]`,
        strategy: 'ariaLabel',
        confidence: 0.9,
        isUnique: false, // May not be unique
      });
    }
    
    // 3. Role attribute
    const role = attrs.get('role');
    if (role) {
      allSelectors.push({
        selector: `[role="${role}"]`,
        strategy: 'role',
        confidence: 0.7, // Roles are often not unique
        isUnique: false,
      });
    }
    
    // 4. ID attribute
    const id = attrs.get('id');
    if (id && !id.includes('{')) { // Skip dynamic IDs
      allSelectors.push({
        selector: `#${id}`,
        strategy: 'id',
        confidence: 0.95,
        isUnique: true,
      });
    }
    
    // 5. Name attribute
    const name = attrs.get('name');
    if (name && !name.includes('{')) {
      allSelectors.push({
        selector: `[name="${name}"]`,
        strategy: 'name',
        confidence: 0.85,
        isUnique: false,
      });
    }
    
    // 6. Placeholder
    const placeholder = attrs.get('placeholder');
    if (placeholder && !placeholder.includes('{')) {
      allSelectors.push({
        selector: `[placeholder="${placeholder}"]`,
        strategy: 'placeholder',
        confidence: 0.7,
        isUnique: false,
      });
    }
    
    // 7. Text content (for buttons and links)
    if (element.textContent && element.textContent.length < 50) {
      const text = element.textContent.trim();
      if (text) {
        allSelectors.push({
          selector: this.buildTextSelector(element.tagName, text),
          strategy: 'text',
          confidence: 0.6,
          isUnique: false,
        });
      }
    }
    
    // 8. Class-based selector (fallback)
    const className = attrs.get('className') || attrs.get('class');
    if (className && !className.includes('{')) {
      // Extract stable classes (avoid dynamic/utility classes)
      const stableSelector = this.buildClassSelector(element.tagName, className);
      if (stableSelector) {
        allSelectors.push({
          selector: stableSelector,
          strategy: 'className',
          confidence: 0.4,
          isUnique: false,
        });
      }
    }
    
    // 9. CSS fallback
    if (allSelectors.length === 0) {
      allSelectors.push({
        selector: this.buildCSSFallback(element, attrs),
        strategy: 'css',
        confidence: 0.3,
        isUnique: false,
      });
    }
    
    // Sort by priority
    allSelectors.sort((a, b) => 
      STRATEGY_PRIORITY[b.strategy] - STRATEGY_PRIORITY[a.strategy]
    );
    
    if (allSelectors.length === 0) return null;
    
    const [primary, ...fallbacks] = allSelectors;
    
    return {
      elementId: `${file.relativePath}:${element.line}:${element.tagName}`,
      tagName: element.tagName,
      component: element.parentFunction,
      filePath: file.filePath,
      line: element.line,
      primary,
      fallbacks,
      isInteractive: this.isInteractiveElement(element),
      textContent: element.textContent,
      role: role || null,
      stabilityScore: this.calculateStabilityScore(primary, fallbacks),
    };
  }
  
  /**
   * Build text-based selector
   */
  private buildTextSelector(tagName: string, text: string): string {
    // Escape special characters
    const escaped = text.replace(/"/g, '\\"');
    
    // For Playwright/Cypress compatibility
    const tag = tagName.toLowerCase();
    if (tag === 'button' || tag === 'a') {
      return `${tag}:has-text("${escaped}")`;
    }
    
    return `text="${escaped}"`;
  }
  
  /**
   * Build class-based selector
   */
  private buildClassSelector(tagName: string, className: string): string | null {
    // Split classes and filter out dynamic/utility ones
    const classes = className.split(/\s+/);
    
    const stableClasses = classes.filter(cls => {
      // Skip dynamic classes (computed values)
      if (cls.includes('$') || cls.includes('{')) return false;
      
      // Skip common utility classes (Tailwind, Bootstrap)
      const utilityPatterns = [
        /^(p|m|px|py|mx|my|pt|pb|pl|pr|mt|mb|ml|mr)-\d/,
        /^(w|h|min-w|min-h|max-w|max-h)-/,
        /^(flex|grid|block|inline|hidden)$/,
        /^(text|bg|border)-/,
        /^(sm|md|lg|xl|2xl):/,
      ];
      
      return !utilityPatterns.some(p => p.test(cls));
    });
    
    if (stableClasses.length === 0) return null;
    
    // Take first 2 stable classes
    const selectedClasses = stableClasses.slice(0, 2);
    return `${tagName.toLowerCase()}.${selectedClasses.join('.')}`;
  }
  
  /**
   * Build CSS fallback selector
   */
  private buildCSSFallback(element: JSXElementInfo, attrs: Map<string, string | null>): string {
    const tag = element.tagName.toLowerCase();
    const parts: string[] = [tag];
    
    // Add type for inputs
    const type = attrs.get('type');
    if (type && tag === 'input') {
      parts.push(`[type="${type}"]`);
    }
    
    return parts.join('');
  }
  
  /**
   * Calculate stability score
   */
  private calculateStabilityScore(
    primary: SelectorDefinition,
    fallbacks: SelectorDefinition[]
  ): number {
    // Base score from primary selector strategy
    let score = primary.confidence;
    
    // Bonus for unique selectors
    if (primary.isUnique) {
      score += 0.1;
    }
    
    // Bonus for having good fallbacks
    const goodFallbacks = fallbacks.filter(f => f.confidence > 0.6);
    score += goodFallbacks.length * 0.05;
    
    return Math.min(1, score);
  }
  
  /**
   * Calculate statistics
   */
  private calculateStatistics(selectors: ElementSelector[]): SelectorStatistics {
    const totalElements = selectors.length;
    const elementsWithTestId = selectors.filter(s => s.primary.strategy === 'testId').length;
    const elementsWithAriaLabel = selectors.filter(s => 
      s.primary.strategy === 'ariaLabel' || s.fallbacks.some(f => f.strategy === 'ariaLabel')
    ).length;
    const elementsWithRole = selectors.filter(s => s.role !== null).length;
    const interactiveElements = selectors.filter(s => s.isInteractive).length;
    
    const totalSelectors = selectors.reduce(
      (sum, s) => sum + 1 + s.fallbacks.length, 
      0
    );
    
    // Coverage score: percentage of interactive elements with good selectors
    const goodSelectors = selectors.filter(s => 
      s.isInteractive && (s.primary.strategy === 'testId' || s.primary.strategy === 'ariaLabel' || s.primary.strategy === 'id')
    ).length;
    const coverageScore = interactiveElements > 0 ? goodSelectors / interactiveElements : 0;
    
    return {
      totalElements,
      elementsWithTestId,
      elementsWithAriaLabel,
      elementsWithRole,
      interactiveElements,
      avgSelectorsPerElement: totalElements > 0 ? totalSelectors / totalElements : 0,
      coverageScore,
    };
  }
  
  /**
   * Get best selector for an element
   */
  getBestSelector(analysis: SelectorAnalysis, elementId: string): string | null {
    const element = analysis.selectorMap.get(elementId);
    return element?.primary.selector || null;
  }
  
  /**
   * Find selectors by component
   */
  findSelectorsByComponent(analysis: SelectorAnalysis, componentName: string): ElementSelector[] {
    return analysis.selectors.filter(s => s.component === componentName);
  }
  
  /**
   * Find selectors by strategy
   */
  findSelectorsByStrategy(analysis: SelectorAnalysis, strategy: SelectorStrategy): ElementSelector[] {
    return analysis.selectors.filter(s => s.primary.strategy === strategy);
  }
  
  /**
   * Get Cypress-compatible selector
   */
  getCypressSelector(selector: ElementSelector): string {
    const { primary } = selector;
    
    switch (primary.strategy) {
      case 'testId':
        return primary.selector.replace('[data-testid=', '[data-cy=').replace('[data-test=', '[data-cy=');
      case 'text':
        return `.contains("${selector.textContent}")`;
      default:
        return primary.selector;
    }
  }
  
  /**
   * Get Playwright-compatible selector
   */
  getPlaywrightSelector(selector: ElementSelector): string {
    const { primary } = selector;
    
    switch (primary.strategy) {
      case 'testId':
        const testIdMatch = primary.selector.match(/\["?([^"=\]]+)"?="([^"]+)"\]/);
        if (testIdMatch) {
          return `getByTestId('${testIdMatch[2]}')`;
        }
        return primary.selector;
      case 'ariaLabel':
        const labelMatch = primary.selector.match(/\[aria-label="([^"]+)"\]/);
        if (labelMatch) {
          return `getByLabel('${labelMatch[1]}')`;
        }
        return primary.selector;
      case 'role':
        if (selector.textContent) {
          return `getByRole('${selector.role}', { name: '${selector.textContent}' })`;
        }
        return `getByRole('${selector.role}')`;
      case 'text':
        return `getByText('${selector.textContent}')`;
      case 'placeholder':
        const placeholderMatch = primary.selector.match(/\[placeholder="([^"]+)"\]/);
        if (placeholderMatch) {
          return `getByPlaceholder('${placeholderMatch[1]}')`;
        }
        return primary.selector;
      default:
        return `locator('${primary.selector}')`;
    }
  }
}

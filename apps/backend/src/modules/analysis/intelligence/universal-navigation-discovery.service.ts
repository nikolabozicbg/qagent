import { Injectable, Logger } from '@nestjs/common';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { ComponentAnalysis, LinkInfo } from './types/intelligence.types';

/**
 * Universal Navigation Discovery
 * Detects navigation in ANY React app regardless of UI library
 * Uses behavior analysis instead of hardcoded component names
 */
@Injectable()
export class UniversalNavigationDiscoveryService {
  private readonly logger = new Logger(UniversalNavigationDiscoveryService.name);

  /**
   * Find ALL navigation points using multi-strategy approach
   */
  discoverNavigationPoints(components: ComponentAnalysis[]): LinkInfo[] {
    const allPoints: LinkInfo[] = [];

    for (const component of components) {
      try {
        const content = require('fs').readFileSync(component.filePath, 'utf-8');
        const ast = require('@typescript-eslint/typescript-estree').parse(content, {
          jsx: true,
          loc: true,
          range: true,
        });

        // Strategy 1: Props-based detection (to, href, path props on ANY component)
        allPoints.push(...this.findPropBasedNavigation(ast, component));

        // Strategy 2: Click handlers with navigation calls
        allPoints.push(...this.findClickHandlerNavigation(ast, component));

        // Strategy 3: Navigation hooks usage
        allPoints.push(...this.findHookBasedNavigation(ast, component, content));

        // Strategy 4: Programmatic navigation
        allPoints.push(...this.findProgrammaticNavigation(ast, component));

      } catch (error) {
        this.logger.warn(`Failed to analyze ${component.name}: ${error.message}`);
      }
    }

    // Deduplicate
    return this.deduplicateLinks(allPoints);
  }

  /**
   * Strategy 1: Find ANY component with to/href/path prop
   */
  private findPropBasedNavigation(ast: any, component: ComponentAnalysis): LinkInfo[] {
    const links: LinkInfo[] = [];
    const navigationProps = ['to', 'href', 'path', 'route', 'url', 'link'];

    this.traverse(ast, (node) => {
      if (node.type === AST_NODE_TYPES.JSXElement) {
        const openingElement = node.openingElement;
        
        // Check if ANY of navigation props exist
        for (const propName of navigationProps) {
          const prop = this.findProp(openingElement, propName);
          if (prop) {
            const value = this.extractPropValue(prop);
            if (value && !value.startsWith('http')) {
              links.push({
                href: value,
                text: this.extractText(node) || value,
                isInternal: true,
                selector: `[${propName}="${value}"]`,
              });
            }
          }
        }

        // Check for component={RouterLink} or component={Link}
        const componentProp = this.findProp(openingElement, 'component');
        if (componentProp) {
          const compValue = this.extractPropValue(componentProp);
          if (compValue && compValue.toLowerCase().includes('link')) {
            const toProp = this.findProp(openingElement, 'to') || this.findProp(openingElement, 'href');
            if (toProp) {
              const href = this.extractPropValue(toProp);
              links.push({
                href,
                text: this.extractText(node) || href,
                isInternal: !href.startsWith('http'),
                selector: `[href="${href}"]`,
              });
            }
          }
        }
      }
    });

    return links;
  }

  /**
   * Strategy 2: Find onClick handlers that call navigation functions
   */
  private findClickHandlerNavigation(ast: any, component: ComponentAnalysis): LinkInfo[] {
    const links: LinkInfo[] = [];
    const navigationCalls = [
      'navigate', 'push', 'replace', 'history.push', 'router.push',
      'history.replace', 'Router.push', 'navigate.push', 'useNavigate',
      'history.go', 'window.location'
    ];

    this.traverse(ast, (node) => {
      if (node.type === AST_NODE_TYPES.JSXElement) {
        const onClickProp = this.findProp(node.openingElement, 'onClick');
        if (onClickProp) {
          const handlerCode = this.extractHandlerCode(onClickProp);
          
          // Check if handler contains navigation call
          for (const navCall of navigationCalls) {
            if (handlerCode.includes(navCall)) {
              const destination = this.extractNavigationDestination(handlerCode);
              if (destination) {
                links.push({
                  href: destination,
                  text: this.extractText(node) || 'Click handler',
                  isInternal: !destination.startsWith('http'),
                  selector: this.generateSelector(node),
                });
              }
            }
          }
        }
      }
    });

    return links;
  }

  /**
   * Strategy 3: Find components that use navigation hooks
   */
  private findHookBasedNavigation(ast: any, component: ComponentAnalysis, content: string): LinkInfo[] {
    const links: LinkInfo[] = [];
    
    // Check if component imports navigation hooks
    const navigationHooks = ['useNavigate', 'useHistory', 'useRouter', 'useNavigation'];
    const usesNavHook = navigationHooks.some(hook => content.includes(hook));
    
    if (usesNavHook) {
      // Find all navigation calls in this component
      const navCalls = this.findNavigationCalls(content);
      for (const call of navCalls) {
        links.push({
          href: call.destination,
          text: `Navigate to ${call.destination}`,
          isInternal: true,
          selector: call.destination,
        });
      }
    }

    return links;
  }

  /**
   * Strategy 4: Programmatic navigation (window.location, etc.)
   */
  private findProgrammaticNavigation(ast: any, component: ComponentAnalysis): LinkInfo[] {
    const links: LinkInfo[] = [];

    this.traverse(ast, (node) => {
      // window.location.href = ...
      if (node.type === AST_NODE_TYPES.AssignmentExpression) {
        const left = this.getNodeCode(node.left);
        if (left.includes('window.location') || left.includes('location.href')) {
          const destination = this.extractLiteralValue(node.right);
          if (destination) {
            links.push({
              href: destination,
              text: `Redirect to ${destination}`,
              isInternal: !destination.startsWith('http'),
              selector: destination,
            });
          }
        }
      }
    });

    return links;
  }

  /**
   * Find all navigation() or push() calls in code
   */
  private findNavigationCalls(content: string): Array<{ destination: string }> {
    const calls: Array<{ destination: string }> = [];
    
    // Match patterns like: navigate('/path'), push('/path'), history.push('/path')
    const patterns = [
      /navigate\(['"`]([^'"`]+)['"`]\)/g,
      /push\(['"`]([^'"`]+)['"`]\)/g,
      /history\.push\(['"`]([^'"`]+)['"`]\)/g,
      /router\.push\(['"`]([^'"`]+)['"`]\)/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        calls.push({ destination: match[1] });
      }
    }

    return calls;
  }

  /**
   * Extract navigation destination from handler code
   */
  private extractNavigationDestination(code: string): string | null {
    // Try to find string literals in navigate/push calls
    const match = code.match(/(?:navigate|push|replace)\s*\(\s*['"`]([^'"`]+)['"`]/);
    return match ? match[1] : null;
  }

  /**
   * Extract handler code from onClick prop
   */
  private extractHandlerCode(prop: any): string {
    if (!prop.value) return '';
    
    if (prop.value.type === AST_NODE_TYPES.JSXExpressionContainer) {
      return this.getNodeCode(prop.value.expression);
    }
    
    return '';
  }

  /**
   * Get code representation of AST node
   */
  private getNodeCode(node: any): string {
    if (!node) return '';
    
    // Simplified - would need proper code generation
    if (node.type === AST_NODE_TYPES.Identifier) {
      return node.name;
    }
    if (node.type === AST_NODE_TYPES.MemberExpression) {
      return `${this.getNodeCode(node.object)}.${this.getNodeCode(node.property)}`;
    }
    if (node.type === AST_NODE_TYPES.CallExpression) {
      return `${this.getNodeCode(node.callee)}()`;
    }
    
    return '';
  }

  /**
   * Extract literal value from node
   */
  private extractLiteralValue(node: any): string | null {
    if (node.type === AST_NODE_TYPES.Literal) {
      return String(node.value);
    }
    return null;
  }

  /**
   * Generate selector for element
   */
  private generateSelector(node: any): string {
    const tagName = node.openingElement?.name?.name || 'div';
    return tagName.toLowerCase();
  }

  /**
   * Extract text content from JSX element
   */
  private extractText(node: any): string | null {
    if (!node.children) return null;

    for (const child of node.children) {
      if (child.type === AST_NODE_TYPES.JSXText) {
        const text = child.value.trim();
        if (text) return text;
      }
    }

    return null;
  }

  /**
   * Find prop by name
   */
  private findProp(openingElement: any, propName: string): any {
    if (!openingElement.attributes) return null;

    return openingElement.attributes.find((attr: any) =>
      attr.type === AST_NODE_TYPES.JSXAttribute && attr.name.name === propName
    );
  }

  /**
   * Extract prop value
   */
  private extractPropValue(prop: any): string {
    if (!prop.value) return '';

    if (prop.value.type === AST_NODE_TYPES.Literal) {
      return String(prop.value.value);
    }

    if (prop.value.type === AST_NODE_TYPES.JSXExpressionContainer) {
      const expr = prop.value.expression;
      
      if (expr.type === AST_NODE_TYPES.Literal) {
        return String(expr.value);
      }
      
      if (expr.type === AST_NODE_TYPES.Identifier) {
        return expr.name;
      }
    }

    return '';
  }

  /**
   * Traverse AST
   */
  private traverse(node: any, callback: (node: any) => void): void {
    if (!node || typeof node !== 'object') return;

    callback(node);

    for (const key in node) {
      if (key === 'parent') continue;
      
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(item => this.traverse(item, callback));
      } else if (value && typeof value === 'object') {
        this.traverse(value, callback);
      }
    }
  }

  /**
   * Deduplicate links
   */
  private deduplicateLinks(links: LinkInfo[]): LinkInfo[] {
    const seen = new Map<string, LinkInfo>();

    for (const link of links) {
      if (!seen.has(link.href)) {
        seen.set(link.href, link);
      }
    }

    return Array.from(seen.values());
  }
}

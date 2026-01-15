import { Injectable } from '@nestjs/common';
import { ParsedFile, FunctionInfo, JSXElementInfo, HookCall } from './ast-parser.service';
import { DependencyGraph, GraphNode } from './dependency-graph.service';

/**
 * Component Analyzer v3.0
 * 
 * Phase 2.1: Analyzes React components and extracts their signatures
 * - Props schema (name, type, required)
 * - Rendered elements
 * - Child components
 * - Compound component patterns
 * - HOC patterns
 */

export interface ComponentAnalysis {
  components: ComponentSignature[];
  componentMap: Map<string, ComponentSignature>;
  statistics: ComponentStatistics;
}

export interface ComponentSignature {
  name: string;
  filePath: string;
  relativePath: string;
  
  // Props
  props: PropDefinition[];
  hasChildren: boolean;
  
  // Rendered output
  renderedElements: RenderedElement[];
  childComponents: string[];          // Names of child components used
  
  // Patterns
  patterns: ComponentPattern[];
  
  // State & Effects
  hooks: ComponentHook[];
  hasLocalState: boolean;
  hasEffects: boolean;
  
  // Metadata
  isExported: boolean;
  isDefaultExport: boolean;
  line: number;
  complexity: number;                 // Calculated from various factors
}

export interface PropDefinition {
  name: string;
  type: string | null;
  isRequired: boolean;
  defaultValue: string | null;
  description: string | null;         // From JSDoc if available
}

export interface RenderedElement {
  tagName: string;
  isComponent: boolean;
  count: number;                      // How many times rendered
  attributes: ElementAttribute[];
  hasTextContent: boolean;
  isInteractive: boolean;             // button, input, link, etc.
}

export interface ElementAttribute {
  name: string;
  isStatic: boolean;
  staticValue: string | null;
}

export interface ComponentPattern {
  type: 'hoc' | 'render-prop' | 'compound' | 'controlled' | 'uncontrolled' | 
        'container' | 'presentational' | 'provider' | 'consumer' | 'portal' |
        'forward-ref' | 'memo' | 'lazy';
  confidence: number;
  evidence: string;
}

export interface ComponentHook {
  name: string;
  isBuiltIn: boolean;
  isCustom: boolean;
  category: 'state' | 'effect' | 'context' | 'ref' | 'memo' | 'callback' | 'custom';
}

export interface ComponentStatistics {
  totalComponents: number;
  avgPropsPerComponent: number;
  avgChildComponents: number;
  avgComplexity: number;
  patternsFound: Record<string, number>;
}

// Interactive HTML elements
const INTERACTIVE_ELEMENTS = new Set([
  'button', 'input', 'select', 'textarea', 'a', 'form',
  'details', 'dialog', 'menu', 'menuitem',
]);

@Injectable()
export class ComponentAnalyzerService {
  
  /**
   * Analyze all components from parsed files
   */
  analyzeComponents(
    parsedFiles: ParsedFile[],
    dependencyGraph: DependencyGraph
  ): ComponentAnalysis {
    console.log(`🔬 Component Analyzer: Analyzing components`);
    const startTime = Date.now();
    
    const components: ComponentSignature[] = [];
    const componentMap = new Map<string, ComponentSignature>();
    
    for (const file of parsedFiles) {
      // Find React components (functions that return JSX)
      const fileComponents = this.extractComponents(file, dependencyGraph);
      
      for (const comp of fileComponents) {
        components.push(comp);
        componentMap.set(comp.name, comp);
      }
    }
    
    // Second pass: resolve child component references
    this.resolveChildComponents(components, componentMap);
    
    const statistics = this.calculateStatistics(components);
    
    const analysisTime = Date.now() - startTime;
    console.log(`   Analyzed ${components.length} components in ${analysisTime}ms`);
    
    return { components, componentMap, statistics };
  }
  
  /**
   * Extract components from a single file
   */
  private extractComponents(
    file: ParsedFile,
    graph: DependencyGraph
  ): ComponentSignature[] {
    const components: ComponentSignature[] = [];
    
    // Find functions that render JSX
    for (const func of file.functions) {
      if (func.isComponent) {
        const signature = this.analyzeComponent(func, file, graph);
        components.push(signature);
      }
    }
    
    return components;
  }
  
  /**
   * Analyze a single component
   */
  private analyzeComponent(
    func: FunctionInfo,
    file: ParsedFile,
    graph: DependencyGraph
  ): ComponentSignature {
    // Extract props from parameters
    const props = this.extractProps(func);
    
    // Find all JSX elements in this component
    const componentJSX = file.jsxElements.filter(
      el => el.parentFunction === func.name
    );
    
    // Analyze rendered elements
    const renderedElements = this.analyzeRenderedElements(componentJSX);
    
    // Find child components
    const childComponents = componentJSX
      .filter(el => el.isComponent)
      .map(el => el.tagName);
    
    // Analyze hooks used
    const componentHooks = file.hooks.filter(
      h => h.parentFunction === func.name
    );
    const hooks = this.categorizeHooks(componentHooks);
    
    // Detect patterns
    const patterns = this.detectPatterns(func, file, componentHooks, componentJSX);
    
    // Calculate complexity
    const complexity = this.calculateComplexity(
      props.length,
      renderedElements.length,
      childComponents.length,
      hooks.length,
      patterns.length
    );
    
    // Check export status
    const isDefaultExport = file.exports.some(
      exp => exp.type === 'default' && (exp.name === func.name || exp.name === 'default')
    );
    
    return {
      name: func.name,
      filePath: file.filePath,
      relativePath: file.relativePath,
      props,
      hasChildren: props.some(p => p.name === 'children'),
      renderedElements,
      childComponents: [...new Set(childComponents)],
      patterns,
      hooks,
      hasLocalState: hooks.some(h => h.category === 'state'),
      hasEffects: hooks.some(h => h.category === 'effect'),
      isExported: func.isExported,
      isDefaultExport,
      line: func.line,
      complexity,
    };
  }
  
  /**
   * Extract props from function parameters
   */
  private extractProps(func: FunctionInfo): PropDefinition[] {
    const props: PropDefinition[] = [];
    
    // Handle destructured props: ({ name, age }) => ...
    // Or single props parameter: (props) => ...
    for (const param of func.parameters) {
      // Check if it's an object destructuring pattern
      if (param.name.startsWith('{')) {
        // Parse destructured props
        const propsStr = param.name.slice(1, -1); // Remove { }
        const propNames = propsStr.split(',').map(p => p.trim());
        
        for (const propName of propNames) {
          if (!propName) continue;
          
          // Handle default values: name = 'default'
          const [name, defaultValue] = propName.split('=').map(s => s.trim());
          
          props.push({
            name: name.split(':')[0].trim(), // Handle renaming: name: localName
            type: param.type, // Type from parameter
            isRequired: !defaultValue,
            defaultValue: defaultValue || null,
            description: null,
          });
        }
      } else if (param.name === 'props' || param.type?.includes('Props')) {
        // Single props object - try to infer from type
        // In a full implementation, we'd parse the type definition
        props.push({
          name: 'props',
          type: param.type,
          isRequired: !param.isOptional,
          defaultValue: param.defaultValue,
          description: null,
        });
      }
    }
    
    return props;
  }
  
  /**
   * Analyze rendered JSX elements
   */
  private analyzeRenderedElements(elements: JSXElementInfo[]): RenderedElement[] {
    const elementMap = new Map<string, RenderedElement>();
    
    for (const el of elements) {
      const existing = elementMap.get(el.tagName);
      
      if (existing) {
        existing.count++;
        // Merge attributes
        for (const attr of el.attributes) {
          if (!existing.attributes.some(a => a.name === attr.name)) {
            existing.attributes.push({
              name: attr.name,
              isStatic: !attr.isExpression,
              staticValue: attr.value,
            });
          }
        }
      } else {
        elementMap.set(el.tagName, {
          tagName: el.tagName,
          isComponent: el.isComponent,
          count: 1,
          attributes: el.attributes.map(attr => ({
            name: attr.name,
            isStatic: !attr.isExpression,
            staticValue: attr.value,
          })),
          hasTextContent: !!el.textContent,
          isInteractive: INTERACTIVE_ELEMENTS.has(el.tagName.toLowerCase()),
        });
      }
    }
    
    return Array.from(elementMap.values());
  }
  
  /**
   * Categorize hooks by their purpose
   */
  private categorizeHooks(hooks: HookCall[]): ComponentHook[] {
    return hooks.map(hook => {
      let category: ComponentHook['category'] = 'custom';
      
      if (hook.name === 'useState' || hook.name === 'useReducer') {
        category = 'state';
      } else if (hook.name === 'useEffect' || hook.name === 'useLayoutEffect') {
        category = 'effect';
      } else if (hook.name === 'useContext') {
        category = 'context';
      } else if (hook.name === 'useRef' || hook.name === 'useImperativeHandle') {
        category = 'ref';
      } else if (hook.name === 'useMemo' || hook.name === 'useDeferredValue') {
        category = 'memo';
      } else if (hook.name === 'useCallback') {
        category = 'callback';
      }
      
      return {
        name: hook.name,
        isBuiltIn: hook.isBuiltIn,
        isCustom: !hook.isBuiltIn,
        category,
      };
    });
  }
  
  /**
   * Detect component patterns
   */
  private detectPatterns(
    func: FunctionInfo,
    file: ParsedFile,
    hooks: HookCall[],
    jsx: JSXElementInfo[]
  ): ComponentPattern[] {
    const patterns: ComponentPattern[] = [];
    
    // HOC detection: function that returns a function returning JSX
    if (func.body.includes('return (') && func.body.includes('=>')) {
      const wrappedFuncMatch = func.body.match(/return\s+\([^)]*\)\s*=>/);
      if (wrappedFuncMatch) {
        patterns.push({
          type: 'hoc',
          confidence: 0.7,
          evidence: 'Returns a function that returns JSX',
        });
      }
    }
    
    // Render prop detection: prop named 'render' or 'children' used as function
    const hasRenderProp = func.body.includes('render(') || 
                          func.body.includes('children(') ||
                          func.body.includes('render={') ||
                          func.body.includes('children={');
    if (hasRenderProp) {
      patterns.push({
        type: 'render-prop',
        confidence: 0.8,
        evidence: 'Uses render prop pattern',
      });
    }
    
    // Provider detection: uses Context.Provider
    if (jsx.some(el => el.tagName.includes('Provider'))) {
      patterns.push({
        type: 'provider',
        confidence: 0.9,
        evidence: 'Renders a Provider component',
      });
    }
    
    // Consumer detection: uses useContext
    if (hooks.some(h => h.name === 'useContext')) {
      patterns.push({
        type: 'consumer',
        confidence: 0.9,
        evidence: 'Uses useContext hook',
      });
    }
    
    // Portal detection: uses createPortal
    if (func.body.includes('createPortal')) {
      patterns.push({
        type: 'portal',
        confidence: 1,
        evidence: 'Uses createPortal',
      });
    }
    
    // Memo detection: wrapped with memo
    const isMemo = file.imports.some(i => 
      i.specifiers.some(s => s.name === 'memo')
    ) && func.body.includes('memo(');
    if (isMemo) {
      patterns.push({
        type: 'memo',
        confidence: 1,
        evidence: 'Wrapped with memo()',
      });
    }
    
    // ForwardRef detection
    const isForwardRef = func.body.includes('forwardRef');
    if (isForwardRef) {
      patterns.push({
        type: 'forward-ref',
        confidence: 1,
        evidence: 'Uses forwardRef',
      });
    }
    
    // Controlled component: has value + onChange
    const hasValue = jsx.some(el => 
      el.attributes.some(a => a.name === 'value')
    );
    const hasOnChange = jsx.some(el => 
      el.attributes.some(a => a.name === 'onChange')
    );
    if (hasValue && hasOnChange) {
      patterns.push({
        type: 'controlled',
        confidence: 0.9,
        evidence: 'Has value and onChange props',
      });
    }
    
    // Container vs Presentational
    const hasStateFetching = hooks.some(h => 
      h.name.includes('Query') || h.name.includes('Fetch') || h.name.includes('Data')
    );
    const hasComplexLogic = hooks.filter(h => h.name === 'useEffect').length > 1;
    
    if (hasStateFetching || hasComplexLogic) {
      patterns.push({
        type: 'container',
        confidence: 0.7,
        evidence: 'Contains data fetching or complex effects',
      });
    } else if (hooks.length === 0 || hooks.every(h => h.name === 'useRef')) {
      patterns.push({
        type: 'presentational',
        confidence: 0.8,
        evidence: 'No state or effects, pure rendering',
      });
    }
    
    return patterns;
  }
  
  /**
   * Calculate component complexity score (1-10)
   */
  private calculateComplexity(
    propsCount: number,
    elementsCount: number,
    childrenCount: number,
    hooksCount: number,
    patternsCount: number
  ): number {
    let score = 1;
    
    // Props complexity
    if (propsCount > 5) score += 1;
    if (propsCount > 10) score += 1;
    
    // Render complexity
    if (elementsCount > 5) score += 1;
    if (elementsCount > 15) score += 1;
    
    // Composition complexity
    if (childrenCount > 3) score += 1;
    if (childrenCount > 7) score += 1;
    
    // State/effect complexity
    if (hooksCount > 2) score += 1;
    if (hooksCount > 5) score += 1;
    
    // Pattern complexity
    if (patternsCount > 1) score += 1;
    
    return Math.min(10, score);
  }
  
  /**
   * Resolve child component references
   */
  private resolveChildComponents(
    components: ComponentSignature[],
    componentMap: Map<string, ComponentSignature>
  ): void {
    // This enriches child component info with actual component references
    // For now, we keep it as name strings
    // Could be enhanced to include the actual ComponentSignature reference
  }
  
  /**
   * Calculate statistics
   */
  private calculateStatistics(components: ComponentSignature[]): ComponentStatistics {
    const patternsFound: Record<string, number> = {};
    
    let totalProps = 0;
    let totalChildren = 0;
    let totalComplexity = 0;
    
    for (const comp of components) {
      totalProps += comp.props.length;
      totalChildren += comp.childComponents.length;
      totalComplexity += comp.complexity;
      
      for (const pattern of comp.patterns) {
        patternsFound[pattern.type] = (patternsFound[pattern.type] || 0) + 1;
      }
    }
    
    const count = components.length || 1;
    
    return {
      totalComponents: components.length,
      avgPropsPerComponent: totalProps / count,
      avgChildComponents: totalChildren / count,
      avgComplexity: totalComplexity / count,
      patternsFound,
    };
  }
  
  /**
   * Find components that render a specific element
   */
  findComponentsRendering(
    analysis: ComponentAnalysis,
    elementName: string
  ): ComponentSignature[] {
    return analysis.components.filter(comp =>
      comp.renderedElements.some(el => 
        el.tagName.toLowerCase() === elementName.toLowerCase()
      )
    );
  }
  
  /**
   * Find components by pattern
   */
  findComponentsByPattern(
    analysis: ComponentAnalysis,
    patternType: ComponentPattern['type']
  ): ComponentSignature[] {
    return analysis.components.filter(comp =>
      comp.patterns.some(p => p.type === patternType)
    );
  }
  
  /**
   * Get component hierarchy (what renders what)
   */
  getComponentHierarchy(
    analysis: ComponentAnalysis
  ): Map<string, string[]> {
    const hierarchy = new Map<string, string[]>();
    
    for (const comp of analysis.components) {
      hierarchy.set(comp.name, comp.childComponents);
    }
    
    return hierarchy;
  }
}

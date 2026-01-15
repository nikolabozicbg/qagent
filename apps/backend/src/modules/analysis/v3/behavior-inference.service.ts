import { Injectable } from '@nestjs/common';
import { ParsedFile, HookCall, EventHandlerInfo, JSXElementInfo } from './ast-parser.service';
import { ComponentSignature, ComponentAnalysis } from './component-analyzer.service';

/**
 * Behavior Inference Engine v3.0
 * 
 * Phase 2.2: Infers component behaviors from code patterns
 * - Dynamic behavior detection (not hardcoded)
 * - Confidence scoring based on evidence
 * - Pattern matching on AST structures
 */

export interface BehaviorAnalysis {
  componentBehaviors: Map<string, ComponentBehaviors>;
  behaviorCatalog: BehaviorDefinition[];
  statistics: BehaviorStatistics;
}

export interface ComponentBehaviors {
  componentName: string;
  filePath: string;
  behaviors: InferredBehavior[];
  primaryBehavior: string | null;      // Most confident behavior
  behaviorScore: number;               // Overall behavioral complexity
}

export interface InferredBehavior {
  category: BehaviorCategory;
  tag: string;                         // Specific behavior tag
  confidence: number;                  // 0-1
  evidence: BehaviorEvidence[];        // What proves this behavior
}

export interface BehaviorEvidence {
  type: 'hook' | 'handler' | 'element' | 'attribute' | 'import' | 'pattern';
  source: string;                      // What we found
  line: number;
  weight: number;                      // How strong this evidence is
}

export interface BehaviorDefinition {
  tag: string;
  category: BehaviorCategory;
  description: string;
  count: number;                       // How many components have this
}

export interface BehaviorStatistics {
  totalBehaviors: number;
  behaviorsByCategory: Record<string, number>;
  avgBehaviorsPerComponent: number;
  mostCommonBehaviors: string[];
}

// Behavior categories - these are fixed high-level categories
export type BehaviorCategory = 
  | 'input'         // Accepts user input
  | 'action'        // Triggers actions
  | 'data'          // Handles data
  | 'state'         // Manages state
  | 'auth'          // Authentication related
  | 'display'       // Presentation
  | 'feedback'      // User feedback
  | 'navigation'    // Navigation related
  | 'form'          // Form handling
  | 'validation';   // Input validation

@Injectable()
export class BehaviorInferenceService {
  
  /**
   * Analyze behaviors for all components
   */
  analyzeBehaviors(
    componentAnalysis: ComponentAnalysis,
    parsedFiles: ParsedFile[]
  ): BehaviorAnalysis {
    console.log(`🧠 Behavior Inference: Analyzing ${componentAnalysis.components.length} components`);
    const startTime = Date.now();
    
    const componentBehaviors = new Map<string, ComponentBehaviors>();
    const behaviorCounts = new Map<string, number>();
    
    // Create file lookup
    const fileMap = new Map<string, ParsedFile>();
    for (const file of parsedFiles) {
      fileMap.set(file.filePath, file);
    }
    
    // Analyze each component
    for (const comp of componentAnalysis.components) {
      const file = fileMap.get(comp.filePath);
      if (!file) continue;
      
      const behaviors = this.inferBehaviors(comp, file);
      
      const primaryBehavior = behaviors.length > 0
        ? behaviors.reduce((a, b) => a.confidence > b.confidence ? a : b).tag
        : null;
      
      const behaviorScore = this.calculateBehaviorScore(behaviors);
      
      componentBehaviors.set(comp.name, {
        componentName: comp.name,
        filePath: comp.filePath,
        behaviors,
        primaryBehavior,
        behaviorScore,
      });
      
      // Count behaviors
      for (const b of behaviors) {
        behaviorCounts.set(b.tag, (behaviorCounts.get(b.tag) || 0) + 1);
      }
    }
    
    // Build behavior catalog
    const behaviorCatalog = this.buildCatalog(behaviorCounts);
    
    // Calculate statistics
    const statistics = this.calculateStatistics(componentBehaviors, behaviorCatalog);
    
    const analysisTime = Date.now() - startTime;
    console.log(`   Inferred ${statistics.totalBehaviors} behaviors in ${analysisTime}ms`);
    
    return { componentBehaviors, behaviorCatalog, statistics };
  }
  
  /**
   * Infer behaviors for a single component
   */
  private inferBehaviors(
    comp: ComponentSignature,
    file: ParsedFile
  ): InferredBehavior[] {
    const behaviors: InferredBehavior[] = [];
    
    // Analyze based on hooks
    this.inferFromHooks(comp, file.hooks, behaviors);
    
    // Analyze based on event handlers
    this.inferFromHandlers(file.eventHandlers, behaviors, comp.name);
    
    // Analyze based on JSX elements
    this.inferFromElements(comp, file.jsxElements, behaviors);
    
    // Analyze based on imports
    this.inferFromImports(file.imports, behaviors);
    
    // Merge and deduplicate
    return this.mergeBehaviors(behaviors);
  }
  
  /**
   * Infer behaviors from hooks
   */
  private inferFromHooks(
    comp: ComponentSignature,
    hooks: HookCall[],
    behaviors: InferredBehavior[]
  ): void {
    const compHooks = hooks.filter(h => h.parentFunction === comp.name);
    
    for (const hook of compHooks) {
      // State management
      if (hook.name === 'useState') {
        behaviors.push({
          category: 'state',
          tag: 'manages-local-state',
          confidence: 0.9,
          evidence: [{
            type: 'hook',
            source: 'useState',
            line: hook.line,
            weight: 0.9,
          }],
        });
      }
      
      if (hook.name === 'useReducer') {
        behaviors.push({
          category: 'state',
          tag: 'manages-complex-state',
          confidence: 0.9,
          evidence: [{
            type: 'hook',
            source: 'useReducer',
            line: hook.line,
            weight: 0.9,
          }],
        });
      }
      
      // Effects / Side effects
      if (hook.name === 'useEffect') {
        behaviors.push({
          category: 'data',
          tag: 'has-side-effects',
          confidence: 0.8,
          evidence: [{
            type: 'hook',
            source: 'useEffect',
            line: hook.line,
            weight: 0.8,
          }],
        });
      }
      
      // Context consumption
      if (hook.name === 'useContext') {
        behaviors.push({
          category: 'state',
          tag: 'consumes-context',
          confidence: 0.95,
          evidence: [{
            type: 'hook',
            source: 'useContext',
            line: hook.line,
            weight: 0.95,
          }],
        });
      }
      
      // Data fetching hooks
      if (hook.name.includes('Query') || hook.name.includes('Fetch')) {
        behaviors.push({
          category: 'data',
          tag: 'fetches-data',
          confidence: 0.95,
          evidence: [{
            type: 'hook',
            source: hook.name,
            line: hook.line,
            weight: 0.95,
          }],
        });
      }
      
      // Mutation hooks
      if (hook.name.includes('Mutation') || hook.name.includes('mutate')) {
        behaviors.push({
          category: 'data',
          tag: 'mutates-data',
          confidence: 0.95,
          evidence: [{
            type: 'hook',
            source: hook.name,
            line: hook.line,
            weight: 0.95,
          }],
        });
      }
      
      // Form hooks
      if (hook.name === 'useForm' || hook.name === 'useFormik' || hook.name === 'useFormContext') {
        behaviors.push({
          category: 'form',
          tag: 'manages-form',
          confidence: 0.95,
          evidence: [{
            type: 'hook',
            source: hook.name,
            line: hook.line,
            weight: 0.95,
          }],
        });
      }
      
      // Navigation hooks
      if (hook.name === 'useNavigate' || hook.name === 'useRouter' || hook.name === 'useLocation') {
        behaviors.push({
          category: 'navigation',
          tag: 'handles-navigation',
          confidence: 0.9,
          evidence: [{
            type: 'hook',
            source: hook.name,
            line: hook.line,
            weight: 0.9,
          }],
        });
      }
      
      // Auth hooks
      if (hook.name === 'useAuth' || hook.name === 'useUser' || hook.name === 'useSession') {
        behaviors.push({
          category: 'auth',
          tag: 'handles-auth',
          confidence: 0.9,
          evidence: [{
            type: 'hook',
            source: hook.name,
            line: hook.line,
            weight: 0.9,
          }],
        });
      }
      
      // Modal/Dialog hooks
      if (hook.name.includes('Modal') || hook.name.includes('Dialog') || hook.name.includes('Popup')) {
        behaviors.push({
          category: 'display',
          tag: 'manages-modal',
          confidence: 0.85,
          evidence: [{
            type: 'hook',
            source: hook.name,
            line: hook.line,
            weight: 0.85,
          }],
        });
      }
    }
  }
  
  /**
   * Infer behaviors from event handlers
   */
  private inferFromHandlers(
    handlers: EventHandlerInfo[],
    behaviors: InferredBehavior[],
    componentName: string
  ): void {
    // Group handlers by type
    const handlerTypes = new Map<string, EventHandlerInfo[]>();
    for (const handler of handlers) {
      const existing = handlerTypes.get(handler.name) || [];
      existing.push(handler);
      handlerTypes.set(handler.name, existing);
    }
    
    // onClick handlers
    if (handlerTypes.has('onClick')) {
      behaviors.push({
        category: 'action',
        tag: 'handles-clicks',
        confidence: 0.9,
        evidence: handlerTypes.get('onClick')!.map(h => ({
          type: 'handler' as const,
          source: 'onClick',
          line: h.line,
          weight: 0.7,
        })),
      });
    }
    
    // onSubmit handlers
    if (handlerTypes.has('onSubmit')) {
      behaviors.push({
        category: 'form',
        tag: 'handles-form-submit',
        confidence: 0.95,
        evidence: handlerTypes.get('onSubmit')!.map(h => ({
          type: 'handler' as const,
          source: 'onSubmit',
          line: h.line,
          weight: 0.95,
        })),
      });
    }
    
    // onChange handlers
    if (handlerTypes.has('onChange')) {
      behaviors.push({
        category: 'input',
        tag: 'handles-input-changes',
        confidence: 0.85,
        evidence: handlerTypes.get('onChange')!.map(h => ({
          type: 'handler' as const,
          source: 'onChange',
          line: h.line,
          weight: 0.8,
        })),
      });
    }
    
    // onFocus/onBlur
    if (handlerTypes.has('onFocus') || handlerTypes.has('onBlur')) {
      behaviors.push({
        category: 'input',
        tag: 'handles-focus',
        confidence: 0.7,
        evidence: [
          ...(handlerTypes.get('onFocus') || []).map(h => ({
            type: 'handler' as const,
            source: 'onFocus',
            line: h.line,
            weight: 0.6,
          })),
          ...(handlerTypes.get('onBlur') || []).map(h => ({
            type: 'handler' as const,
            source: 'onBlur',
            line: h.line,
            weight: 0.6,
          })),
        ],
      });
    }
    
    // Keyboard events
    if (handlerTypes.has('onKeyDown') || handlerTypes.has('onKeyUp') || handlerTypes.has('onKeyPress')) {
      behaviors.push({
        category: 'input',
        tag: 'handles-keyboard',
        confidence: 0.8,
        evidence: [
          ...(handlerTypes.get('onKeyDown') || []).map(h => ({
            type: 'handler' as const,
            source: 'onKeyDown',
            line: h.line,
            weight: 0.7,
          })),
        ],
      });
    }
    
    // Scroll events
    if (handlerTypes.has('onScroll')) {
      behaviors.push({
        category: 'display',
        tag: 'handles-scroll',
        confidence: 0.75,
        evidence: handlerTypes.get('onScroll')!.map(h => ({
          type: 'handler' as const,
          source: 'onScroll',
          line: h.line,
          weight: 0.7,
        })),
      });
    }
    
    // Drag and drop
    if (handlerTypes.has('onDrag') || handlerTypes.has('onDrop')) {
      behaviors.push({
        category: 'action',
        tag: 'handles-drag-drop',
        confidence: 0.85,
        evidence: [
          ...(handlerTypes.get('onDrag') || []).map(h => ({
            type: 'handler' as const,
            source: 'onDrag',
            line: h.line,
            weight: 0.8,
          })),
          ...(handlerTypes.get('onDrop') || []).map(h => ({
            type: 'handler' as const,
            source: 'onDrop',
            line: h.line,
            weight: 0.8,
          })),
        ],
      });
    }
  }
  
  /**
   * Infer behaviors from JSX elements
   */
  private inferFromElements(
    comp: ComponentSignature,
    elements: JSXElementInfo[],
    behaviors: InferredBehavior[]
  ): void {
    const compElements = elements.filter(e => e.parentFunction === comp.name);
    const tagCounts = new Map<string, number>();
    
    for (const el of compElements) {
      tagCounts.set(el.tagName.toLowerCase(), (tagCounts.get(el.tagName.toLowerCase()) || 0) + 1);
    }
    
    // Input elements
    if (tagCounts.has('input') || tagCounts.has('textarea')) {
      behaviors.push({
        category: 'input',
        tag: 'accepts-text-input',
        confidence: 0.9,
        evidence: compElements
          .filter(e => e.tagName.toLowerCase() === 'input' || e.tagName.toLowerCase() === 'textarea')
          .map(e => ({
            type: 'element' as const,
            source: e.tagName,
            line: e.line,
            weight: 0.9,
          })),
      });
    }
    
    // Select/dropdown
    if (tagCounts.has('select')) {
      behaviors.push({
        category: 'input',
        tag: 'accepts-selection',
        confidence: 0.9,
        evidence: compElements
          .filter(e => e.tagName.toLowerCase() === 'select')
          .map(e => ({
            type: 'element' as const,
            source: 'select',
            line: e.line,
            weight: 0.9,
          })),
      });
    }
    
    // Form element
    if (tagCounts.has('form')) {
      behaviors.push({
        category: 'form',
        tag: 'renders-form',
        confidence: 0.95,
        evidence: compElements
          .filter(e => e.tagName.toLowerCase() === 'form')
          .map(e => ({
            type: 'element' as const,
            source: 'form',
            line: e.line,
            weight: 0.95,
          })),
      });
    }
    
    // Buttons
    if (tagCounts.has('button')) {
      behaviors.push({
        category: 'action',
        tag: 'has-action-buttons',
        confidence: 0.85,
        evidence: compElements
          .filter(e => e.tagName.toLowerCase() === 'button')
          .map(e => ({
            type: 'element' as const,
            source: 'button',
            line: e.line,
            weight: 0.8,
          })),
      });
    }
    
    // Links
    if (tagCounts.has('a') || tagCounts.has('link')) {
      behaviors.push({
        category: 'navigation',
        tag: 'has-links',
        confidence: 0.85,
        evidence: compElements
          .filter(e => e.tagName.toLowerCase() === 'a' || e.tagName.toLowerCase() === 'link')
          .map(e => ({
            type: 'element' as const,
            source: e.tagName,
            line: e.line,
            weight: 0.8,
          })),
      });
    }
    
    // Lists
    if (tagCounts.has('ul') || tagCounts.has('ol') || tagCounts.has('li')) {
      behaviors.push({
        category: 'display',
        tag: 'renders-list',
        confidence: 0.8,
        evidence: compElements
          .filter(e => ['ul', 'ol', 'li'].includes(e.tagName.toLowerCase()))
          .slice(0, 3) // Limit evidence
          .map(e => ({
            type: 'element' as const,
            source: e.tagName,
            line: e.line,
            weight: 0.7,
          })),
      });
    }
    
    // Tables
    if (tagCounts.has('table') || tagCounts.has('tr') || tagCounts.has('td')) {
      behaviors.push({
        category: 'display',
        tag: 'renders-table',
        confidence: 0.85,
        evidence: compElements
          .filter(e => ['table', 'tr', 'td', 'th'].includes(e.tagName.toLowerCase()))
          .slice(0, 3)
          .map(e => ({
            type: 'element' as const,
            source: e.tagName,
            line: e.line,
            weight: 0.8,
          })),
      });
    }
    
    // Images
    if (tagCounts.has('img') || tagCounts.has('image')) {
      behaviors.push({
        category: 'display',
        tag: 'displays-images',
        confidence: 0.9,
        evidence: compElements
          .filter(e => e.tagName.toLowerCase() === 'img')
          .map(e => ({
            type: 'element' as const,
            source: 'img',
            line: e.line,
            weight: 0.9,
          })),
      });
    }
    
    // Check for loading indicators
    const hasLoading = compElements.some(e => 
      e.textContent?.toLowerCase().includes('loading') ||
      e.attributes.some(a => 
        a.name === 'className' && a.value?.toLowerCase().includes('loading')
      )
    );
    if (hasLoading) {
      behaviors.push({
        category: 'feedback',
        tag: 'shows-loading',
        confidence: 0.7,
        evidence: [{
          type: 'pattern',
          source: 'loading indicator',
          line: 0,
          weight: 0.7,
        }],
      });
    }
    
    // Check for error displays
    const hasError = compElements.some(e =>
      e.textContent?.toLowerCase().includes('error') ||
      e.attributes.some(a =>
        a.name === 'className' && a.value?.toLowerCase().includes('error')
      )
    );
    if (hasError) {
      behaviors.push({
        category: 'feedback',
        tag: 'shows-error',
        confidence: 0.7,
        evidence: [{
          type: 'pattern',
          source: 'error display',
          line: 0,
          weight: 0.7,
        }],
      });
    }
  }
  
  /**
   * Infer behaviors from imports
   */
  private inferFromImports(
    imports: ParsedFile['imports'],
    behaviors: InferredBehavior[]
  ): void {
    for (const imp of imports) {
      const source = imp.source.toLowerCase();
      
      // Toast/notification libraries
      if (source.includes('toast') || source.includes('notification') || source.includes('snackbar')) {
        behaviors.push({
          category: 'feedback',
          tag: 'shows-notifications',
          confidence: 0.85,
          evidence: [{
            type: 'import',
            source: imp.source,
            line: imp.line,
            weight: 0.85,
          }],
        });
      }
      
      // Modal/dialog libraries
      if (source.includes('modal') || source.includes('dialog')) {
        behaviors.push({
          category: 'display',
          tag: 'uses-modal',
          confidence: 0.85,
          evidence: [{
            type: 'import',
            source: imp.source,
            line: imp.line,
            weight: 0.85,
          }],
        });
      }
      
      // Validation libraries
      if (source.includes('yup') || source.includes('zod') || source.includes('joi')) {
        behaviors.push({
          category: 'validation',
          tag: 'uses-schema-validation',
          confidence: 0.9,
          evidence: [{
            type: 'import',
            source: imp.source,
            line: imp.line,
            weight: 0.9,
          }],
        });
      }
      
      // File upload
      if (source.includes('dropzone') || source.includes('upload')) {
        behaviors.push({
          category: 'input',
          tag: 'handles-file-upload',
          confidence: 0.9,
          evidence: [{
            type: 'import',
            source: imp.source,
            line: imp.line,
            weight: 0.9,
          }],
        });
      }
      
      // Date picker
      if (source.includes('datepicker') || source.includes('date-picker') || source.includes('calendar')) {
        behaviors.push({
          category: 'input',
          tag: 'handles-date-input',
          confidence: 0.9,
          evidence: [{
            type: 'import',
            source: imp.source,
            line: imp.line,
            weight: 0.9,
          }],
        });
      }
    }
  }
  
  /**
   * Merge and deduplicate behaviors
   */
  private mergeBehaviors(behaviors: InferredBehavior[]): InferredBehavior[] {
    const merged = new Map<string, InferredBehavior>();
    
    for (const behavior of behaviors) {
      const existing = merged.get(behavior.tag);
      
      if (existing) {
        // Merge evidence and take higher confidence
        existing.evidence.push(...behavior.evidence);
        existing.confidence = Math.max(existing.confidence, behavior.confidence);
      } else {
        merged.set(behavior.tag, { ...behavior });
      }
    }
    
    // Sort by confidence
    return Array.from(merged.values())
      .sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Calculate overall behavior score
   */
  private calculateBehaviorScore(behaviors: InferredBehavior[]): number {
    if (behaviors.length === 0) return 0;
    
    // Weight by confidence and category importance
    const categoryWeights: Record<BehaviorCategory, number> = {
      form: 1.5,
      auth: 1.5,
      data: 1.3,
      action: 1.2,
      input: 1.1,
      navigation: 1.1,
      validation: 1.1,
      state: 1.0,
      feedback: 0.9,
      display: 0.8,
    };
    
    let score = 0;
    for (const b of behaviors) {
      score += b.confidence * (categoryWeights[b.category] || 1);
    }
    
    return Math.min(10, score);
  }
  
  /**
   * Build behavior catalog
   */
  private buildCatalog(behaviorCounts: Map<string, number>): BehaviorDefinition[] {
    const catalog: BehaviorDefinition[] = [];
    
    for (const [tag, count] of behaviorCounts) {
      // Determine category from tag
      let category: BehaviorCategory = 'display';
      if (tag.includes('input') || tag.includes('accepts')) category = 'input';
      if (tag.includes('action') || tag.includes('click') || tag.includes('handles')) category = 'action';
      if (tag.includes('data') || tag.includes('fetch') || tag.includes('mutate')) category = 'data';
      if (tag.includes('state') || tag.includes('context')) category = 'state';
      if (tag.includes('auth') || tag.includes('user')) category = 'auth';
      if (tag.includes('form') || tag.includes('submit')) category = 'form';
      if (tag.includes('valid')) category = 'validation';
      if (tag.includes('nav') || tag.includes('link') || tag.includes('route')) category = 'navigation';
      if (tag.includes('loading') || tag.includes('error') || tag.includes('notification')) category = 'feedback';
      
      catalog.push({
        tag,
        category,
        description: this.generateDescription(tag),
        count,
      });
    }
    
    return catalog.sort((a, b) => b.count - a.count);
  }
  
  /**
   * Generate human-readable description
   */
  private generateDescription(tag: string): string {
    return tag
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  /**
   * Calculate statistics
   */
  private calculateStatistics(
    componentBehaviors: Map<string, ComponentBehaviors>,
    catalog: BehaviorDefinition[]
  ): BehaviorStatistics {
    const behaviorsByCategory: Record<string, number> = {};
    let totalBehaviors = 0;
    
    for (const comp of componentBehaviors.values()) {
      totalBehaviors += comp.behaviors.length;
      
      for (const b of comp.behaviors) {
        behaviorsByCategory[b.category] = (behaviorsByCategory[b.category] || 0) + 1;
      }
    }
    
    return {
      totalBehaviors,
      behaviorsByCategory,
      avgBehaviorsPerComponent: componentBehaviors.size > 0 
        ? totalBehaviors / componentBehaviors.size 
        : 0,
      mostCommonBehaviors: catalog.slice(0, 10).map(b => b.tag),
    };
  }
  
  /**
   * Find components with specific behavior
   */
  findComponentsWithBehavior(
    analysis: BehaviorAnalysis,
    behaviorTag: string
  ): string[] {
    const result: string[] = [];
    
    for (const [name, comp] of analysis.componentBehaviors) {
      if (comp.behaviors.some(b => b.tag === behaviorTag)) {
        result.push(name);
      }
    }
    
    return result;
  }
  
  /**
   * Find components by category
   */
  findComponentsByCategory(
    analysis: BehaviorAnalysis,
    category: BehaviorCategory
  ): string[] {
    const result: string[] = [];
    
    for (const [name, comp] of analysis.componentBehaviors) {
      if (comp.behaviors.some(b => b.category === category)) {
        result.push(name);
      }
    }
    
    return result;
  }
}

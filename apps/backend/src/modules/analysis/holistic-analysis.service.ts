import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';

/**
 * Holistic Application Analysis Service
 * 
 * Philosophy: E2E tests don't just test "pages" - they test INTERACTIONS
 * 
 * This service analyzes:
 * - Pages (routes)
 * - Components (Header, Modal, Form)
 * - User interactions (clicks, submits, inputs)
 * - API calls
 * - State changes
 * - Navigation flows
 * 
 * Goal: Build complete application behavior graph
 */
@Injectable()
export class HolisticAnalysisService {
  
  /**
   * Analyze entire application holistically
   */
  async analyzeApplication(workspacePath: string): Promise<ApplicationModel> {
    console.log('🌐 Holistic Analysis: Analyzing ENTIRE application...');
    
    const startTime = Date.now();
    const allFiles = this.findAllSourceFiles(workspacePath);
    
    console.log(`   Found ${allFiles.length} source files`);
    
    const model: ApplicationModel = {
      components: [],
      interactions: [],
      apiCalls: [],
      routes: [],
      stateOperations: []
    };
    
    // Analyze every file
    for (const filePath of allFiles.slice(0, 200)) {
      const analysis = this.analyzeFile(filePath, workspacePath);
      if (analysis) {
        model.components.push(analysis);
        
        // Extract interactions
        model.interactions.push(...analysis.interactions);
        model.apiCalls.push(...analysis.apiCalls);
        model.routes.push(...analysis.routes);
        model.stateOperations.push(...analysis.stateOperations);
      }
    }
    
    // SECOND PASS: Discover React Router routes and map them to components
    console.log('   🔍 Discovering React Router routes...');
    const routeMappings = this.discoverRouterConfiguration(workspacePath);
    console.log(`   Found ${routeMappings.length} route → component mappings`);
    
    // Apply route mappings to components
    for (const mapping of routeMappings) {
      const component = model.components.find(c => 
        c.fileName === mapping.componentName || 
        c.filePath.endsWith(`/${mapping.componentName}.js`) ||
        c.filePath.endsWith(`/${mapping.componentName}.tsx`)
      );
      
      if (component) {
        component.routes = [mapping.path];
        console.log(`   ✓ Mapped ${mapping.componentName} → ${mapping.path}`);
      }
    }
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Analyzed ${model.components.length} components in ${duration}ms`);
    console.log(`   📍 ${model.routes.length} routes`);
    console.log(`   🖱️  ${model.interactions.length} interactions`);
    console.log(`   🌐 ${model.apiCalls.length} API calls`);
    console.log(`   💾 ${model.stateOperations.length} state operations`);
    
    return model;
  }
  
  /**
   * Analyze single file for all aspects
   */
  private analyzeFile(filePath: string, workspacePath: string): ComponentAnalysis | null {
    try {
      const code = fs.readFileSync(filePath, 'utf-8');
      const relativePath = path.relative(workspacePath, filePath);
      const fileName = path.basename(filePath);
      
      // Parse AST
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: [
          require('@babel/plugin-syntax-jsx'),
          require('@babel/plugin-syntax-typescript')
        ]
      });
      
      const analysis: ComponentAnalysis = {
        filePath: relativePath,
        fileName,
        type: this.inferComponentType(fileName, code),
        interactions: [],
        apiCalls: [],
        routes: [],
        stateOperations: [],
        renders: []
      };
      
      // Extract everything via AST traversal
      traverse(ast, {
        // Navigation (Link, navigate, router.push)
        JSXElement: (path) => {
          const elementName = this.getJSXElementName(path.node);
          
          if (elementName === 'Link' || elementName === 'NavLink') {
            const toAttr = this.getJSXAttribute(path.node, 'to');
            const hrefAttr = this.getJSXAttribute(path.node, 'href');
            const target = toAttr || hrefAttr;
            
            if (target) {
              analysis.interactions.push({
                type: 'navigation',
                trigger: 'click',
                target,
                source: relativePath
              });
              // DON'T add link targets to routes - routes should be WHERE component is rendered
            }
          }
          
          // Button clicks
          if (elementName === 'button' || elementName === 'Button') {
            const onClick = this.getJSXAttribute(path.node, 'onClick');
            if (onClick) {
              analysis.interactions.push({
                type: 'click',
                trigger: 'onClick',
                target: onClick,
                source: relativePath
              });
            }
          }
          
          // Form submits
          if (elementName === 'form' || elementName === 'Form') {
            const onSubmit = this.getJSXAttribute(path.node, 'onSubmit');
            if (onSubmit) {
              analysis.interactions.push({
                type: 'submit',
                trigger: 'onSubmit',
                target: onSubmit,
                source: relativePath
              });
            }
          }
        },
        
        // API calls (fetch, axios, etc.)
        CallExpression: (path) => {
          const callee = path.node.callee;
          
          // fetch('...')
          if (callee.type === 'Identifier' && callee.name === 'fetch') {
            const arg = path.node.arguments[0];
            if (arg && arg.type === 'StringLiteral') {
              analysis.apiCalls.push({
                method: 'GET', // Default
                endpoint: arg.value,
                source: relativePath
              });
            }
          }
          
          // axios.get/post/etc
          if (callee.type === 'MemberExpression' && 
              callee.object.type === 'Identifier' && 
              callee.object.name === 'axios' &&
              callee.property.type === 'Identifier') {
            const method = callee.property.name.toUpperCase();
            const arg = path.node.arguments[0];
            if (arg && arg.type === 'StringLiteral') {
              analysis.apiCalls.push({
                method,
                endpoint: arg.value,
                source: relativePath
              });
            }
          }
          
          // router.push, navigate
          if (callee.type === 'MemberExpression' && 
              callee.property.type === 'Identifier' &&
              (callee.property.name === 'push' || 
               callee.property.name === 'replace' ||
               callee.property.name === 'navigate')) {
            const arg = path.node.arguments[0];
            if (arg && arg.type === 'StringLiteral') {
              analysis.interactions.push({
                type: 'navigation',
                trigger: 'programmatic',
                target: arg.value,
                source: relativePath
              });
              // DON'T add navigation targets to routes - routes should be WHERE component is rendered
            }
          }
        },
        
        // State operations
        VariableDeclarator: (path) => {
          // useState
          if (path.node.init?.type === 'CallExpression' &&
              path.node.init.callee.type === 'Identifier' &&
              path.node.init.callee.name === 'useState') {
            if (path.node.id.type === 'ArrayPattern') {
              const stateName = path.node.id.elements[0];
              if (stateName && stateName.type === 'Identifier') {
                analysis.stateOperations.push({
                  type: 'useState',
                  name: stateName.name,
                  source: relativePath
                });
              }
            }
          }
        }
      });
      
      return analysis;
      
    } catch (error) {
      // Skip files that can't be parsed
      return null;
    }
  }
  
  /**
   * Infer component type (Page, Layout, Form, etc.)
   */
  private inferComponentType(fileName: string, code: string): ComponentType {
    const lower = fileName.toLowerCase();
    
    if (lower.includes('page') || lower === 'index.tsx' || lower === 'index.jsx') {
      return 'page';
    }
    
    if (lower.includes('header') || lower.includes('footer') || 
        lower.includes('nav') || lower.includes('sidebar')) {
      return 'layout';
    }
    
    if (lower.includes('form') || code.includes('<form') || code.includes('onSubmit')) {
      return 'form';
    }
    
    if (lower.includes('modal') || lower.includes('dialog')) {
      return 'modal';
    }
    
    if (lower.includes('button')) {
      return 'button';
    }
    
    return 'component';
  }
  
  /**
   * Get JSX element name
   */
  private getJSXElementName(node: any): string | null {
    if (node.openingElement?.name) {
      const name = node.openingElement.name;
      if (name.type === 'JSXIdentifier') {
        return name.name;
      }
    }
    return null;
  }
  
  /**
   * Get JSX attribute value
   */
  private getJSXAttribute(node: any, attrName: string): string | null {
    if (!node.openingElement?.attributes) return null;
    
    for (const attr of node.openingElement.attributes) {
      if (attr.type === 'JSXAttribute' && 
          attr.name?.name === attrName &&
          attr.value?.type === 'StringLiteral') {
        return attr.value.value;
      }
    }
    return null;
  }
  
  /**
   * Discover React Router configuration (Route -> Component mappings)
   */
  private discoverRouterConfiguration(workspacePath: string): RouteMapping[] {
    const mappings: RouteMapping[] = [];
    const allFiles = this.findAllSourceFiles(workspacePath);
    
    for (const filePath of allFiles) {
      try {
        const code = fs.readFileSync(filePath, 'utf-8');
        
        // Only analyze files that use React Router
        if (!code.includes('react-router') && !code.includes('<Route')) {
          continue;
        }
        
        const ast = parser.parse(code, {
          sourceType: 'module',
          plugins: [
            require('@babel/plugin-syntax-jsx'),
            require('@babel/plugin-syntax-typescript')
          ]
        });
        
        traverse(ast, {
          JSXElement: (path) => {
            const elementName = this.getJSXElementName(path.node);
            
            // <Route path="/login" component={Login} />
            if (elementName === 'Route') {
              const pathAttr = this.getJSXAttribute(path.node, 'path');
              const componentAttr = this.getJSXAttributeExpression(path.node, 'component');
              
              if (pathAttr && componentAttr) {
                mappings.push({
                  path: pathAttr,
                  componentName: componentAttr
                });
              }
            }
          }
        });
      } catch (error) {
        // Skip files that can't be parsed
      }
    }
    
    return mappings;
  }
  
  /**
   * Get JSX attribute expression value (e.g., component={Login})
   */
  private getJSXAttributeExpression(node: any, attrName: string): string | null {
    if (!node.openingElement?.attributes) return null;
    
    for (const attr of node.openingElement.attributes) {
      if (attr.type === 'JSXAttribute' && 
          attr.name?.name === attrName &&
          attr.value?.type === 'JSXExpressionContainer' &&
          attr.value.expression?.type === 'Identifier') {
        return attr.value.expression.name;
      }
    }
    return null;
  }
  
  /**
   * Find all source files
   */
  private findAllSourceFiles(workspacePath: string): string[] {
    const files: string[] = [];
    const visited = new Set<string>();
    
    const traverse = (dir: string, depth: number = 0) => {
      if (depth > 10 || visited.has(dir)) return;
      if (!fs.existsSync(dir)) return;
      
      visited.add(dir);
      
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const skipDirs = [
              'node_modules', '.git', 'dist', 'build', '.next', 
              'coverage', '.cache', 'public', 'static'
            ];
            if (skipDirs.includes(entry.name)) continue;
            
            traverse(path.join(dir, entry.name), depth + 1);
          } else if (entry.isFile()) {
            if (/\.(tsx?|jsx?)$/.test(entry.name) && 
                !entry.name.includes('.test.') && 
                !entry.name.includes('.spec.')) {
              files.push(path.join(dir, entry.name));
            }
          }
        }
      } catch (error) {
        // Skip
      }
    };
    
    const srcDirs = [
      path.join(workspacePath, 'src'),
      path.join(workspacePath, 'app'),
      workspacePath
    ];
    
    for (const srcDir of srcDirs) {
      if (fs.existsSync(srcDir)) {
        traverse(srcDir);
        break;
      }
    }
    
    return files;
  }
}

/**
 * Complete application model
 */
export interface ApplicationModel {
  components: ComponentAnalysis[];
  interactions: Interaction[];
  apiCalls: APICall[];
  routes: string[];
  stateOperations: StateOperation[];
}

export interface ComponentAnalysis {
  filePath: string;
  fileName: string;
  type: ComponentType;
  interactions: Interaction[];
  apiCalls: APICall[];
  routes: string[];
  stateOperations: StateOperation[];
  renders: string[];
}

export type ComponentType = 'page' | 'layout' | 'form' | 'modal' | 'button' | 'component';

export interface Interaction {
  type: 'click' | 'submit' | 'navigation' | 'input';
  trigger: string;
  target: string;
  source: string;
}

export interface APICall {
  method: string;
  endpoint: string;
  source: string;
}

export interface StateOperation {
  type: string;
  name: string;
  source: string;
}

export interface RouteMapping {
  path: string;
  componentName: string;
}

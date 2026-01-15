import { Injectable } from '@nestjs/common';
import * as ts from 'typescript';
import * as fs from 'fs/promises';
import { SourceFile } from './project-scanner.service';

/**
 * AST Parser Engine v3.0
 * 
 * Phase 1.2: Parses TypeScript/JSX files and extracts all relevant information
 * - Imports & Exports
 * - Functions & Classes
 * - JSX structure
 * - Hooks & Event handlers
 * - Attributes (data-*, aria-*, id, className)
 */

export interface ParsedFile {
  filePath: string;
  relativePath: string;
  imports: ImportInfo[];
  exports: ExportInfo[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
  jsxElements: JSXElementInfo[];
  hooks: HookCall[];
  eventHandlers: EventHandlerInfo[];
  stringLiterals: StringLiteralInfo[];
  attributes: AttributeInfo[];
  comments: CommentInfo[];
  typeDeclarations: TypeDeclarationInfo[]; // v4: For entity extraction
}

export interface TypeDeclarationInfo {
  name: string;
  type: 'interface' | 'type' | 'enum';
  properties: TypePropertyInfo[];
  isExported: boolean;
  line: number;
}

export interface TypePropertyInfo {
  name: string;
  type: string;
  optional: boolean;
}

export interface ImportInfo {
  source: string;                    // 'react', './Button', '@/components/ui'
  specifiers: ImportSpecifier[];
  isDefault: boolean;
  isNamespace: boolean;              // import * as X
  isDynamic: boolean;                // import()
  line: number;
}

export interface ImportSpecifier {
  name: string;                      // Original exported name
  alias: string | null;              // Local alias if renamed
}

export interface ExportInfo {
  name: string;
  type: 'default' | 'named' | 'all'; // export default, export {}, export * from
  isReExport: boolean;               // export * from 'x'
  reExportSource: string | null;
  line: number;
}

export interface FunctionInfo {
  name: string;
  isAsync: boolean;
  isArrowFunction: boolean;
  isExported: boolean;
  isComponent: boolean;              // Returns JSX
  parameters: ParameterInfo[];
  returnType: string | null;
  body: string;                      // For analysis
  line: number;
  endLine: number;
}

export interface ParameterInfo {
  name: string;
  type: string | null;
  isOptional: boolean;
  defaultValue: string | null;
}

export interface ClassInfo {
  name: string;
  isExported: boolean;
  extends: string | null;
  implements: string[];
  methods: FunctionInfo[];
  properties: PropertyInfo[];
  line: number;
}

export interface PropertyInfo {
  name: string;
  type: string | null;
  isStatic: boolean;
  isReadonly: boolean;
}

export interface JSXElementInfo {
  tagName: string;                   // 'div', 'Button', 'Link'
  isComponent: boolean;              // Starts with uppercase
  attributes: JSXAttributeInfo[];
  children: JSXElementInfo[];
  textContent: string | null;        // Text inside element
  parentFunction: string | null;     // Which function renders this
  line: number;
}

export interface JSXAttributeInfo {
  name: string;
  value: string | null;              // Static value
  isExpression: boolean;             // {variable} vs "string"
  expressionText: string | null;     // The expression if dynamic
}

export interface HookCall {
  name: string;                      // useState, useEffect, useMyCustomHook
  isBuiltIn: boolean;                // React built-in vs custom
  arguments: HookArgument[];
  line: number;
  parentFunction: string | null;
}

export interface HookArgument {
  index: number;
  type: 'literal' | 'identifier' | 'function' | 'array' | 'object' | 'expression';
  value: string;
}

export interface EventHandlerInfo {
  name: string;                      // onClick, onSubmit, onChange
  handlerName: string | null;        // handleClick, handleSubmit
  isInline: boolean;                 // () => {} vs {handleClick}
  targetElement: string | null;      // button, input, form
  line: number;
}

export interface StringLiteralInfo {
  value: string;
  type: 'url' | 'api-path' | 'text' | 'selector' | 'unknown';
  context: string;                   // Where it's used
  line: number;
}

export interface AttributeInfo {
  type: 'testId' | 'ariaLabel' | 'role' | 'id' | 'className' | 'name';
  value: string;
  element: string;
  line: number;
}

export interface CommentInfo {
  text: string;
  type: 'line' | 'block';
  line: number;
}

@Injectable()
export class ASTParserService {
  
  /**
   * Parse all source files in parallel
   */
  async parseFiles(sourceFiles: SourceFile[]): Promise<ParsedFile[]> {
    console.log(`🔍 AST Parser: Parsing ${sourceFiles.length} files`);
    const startTime = Date.now();
    
    // Filter to only parse component/hook/store/api files (skip tests, configs)
    const filesToParse = sourceFiles.filter(f => 
      f.type !== 'test' && f.type !== 'config' && f.type !== 'style'
    );
    
    // Parse in batches to avoid memory issues
    const batchSize = 50;
    const results: ParsedFile[] = [];
    
    for (let i = 0; i < filesToParse.length; i += batchSize) {
      const batch = filesToParse.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(file => this.parseFile(file))
      );
      results.push(...batchResults.filter((r): r is ParsedFile => r !== null));
    }
    
    const parseTime = Date.now() - startTime;
    console.log(`   Parsed ${results.length} files in ${parseTime}ms`);
    
    return results;
  }
  
  /**
   * Parse single file
   */
  async parseFile(sourceFile: SourceFile): Promise<ParsedFile | null> {
    try {
      const content = await fs.readFile(sourceFile.path, 'utf-8');
      return this.parseContent(content, sourceFile.path, sourceFile.relativePath);
    } catch (error) {
      // console.warn(`Failed to parse ${sourceFile.path}:`, error);
      return null;
    }
  }
  
  /**
   * Parse file content using TypeScript compiler
   */
  parseContent(content: string, filePath: string, relativePath: string): ParsedFile {
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith('.tsx') || filePath.endsWith('.jsx')
        ? ts.ScriptKind.TSX
        : ts.ScriptKind.TS
    );
    
    const result: ParsedFile = {
      filePath,
      relativePath,
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      jsxElements: [],
      hooks: [],
      eventHandlers: [],
      stringLiterals: [],
      attributes: [],
      comments: [],
      typeDeclarations: [],
    };
    
    // Track current function context for JSX/hooks
    let currentFunction: string | null = null;
    
    const visit = (node: ts.Node) => {
      // Imports
      if (ts.isImportDeclaration(node)) {
        this.extractImport(node, sourceFile, result);
      }
      
      // Exports
      if (ts.isExportDeclaration(node)) {
        this.extractExportDeclaration(node, sourceFile, result);
      }
      if (ts.isExportAssignment(node)) {
        this.extractExportAssignment(node, sourceFile, result);
      }
      
      // Functions (including arrow functions)
      if (ts.isFunctionDeclaration(node)) {
        const funcInfo = this.extractFunction(node, sourceFile, content);
        if (funcInfo) {
          result.functions.push(funcInfo);
          currentFunction = funcInfo.name;
        }
      }
      
      // Variable declarations (for arrow function components)
      if (ts.isVariableStatement(node)) {
        this.extractVariableDeclarations(node, sourceFile, content, result);
      }
      
      // Classes
      if (ts.isClassDeclaration(node)) {
        const classInfo = this.extractClass(node, sourceFile, content);
        if (classInfo) {
          result.classes.push(classInfo);
        }
      }
      
      // Type declarations (interfaces, types) - v4 for entity extraction
      if (ts.isInterfaceDeclaration(node)) {
        const typeInfo = this.extractInterfaceDeclaration(node, sourceFile);
        if (typeInfo) {
          result.typeDeclarations.push(typeInfo);
        }
      }
      if (ts.isTypeAliasDeclaration(node)) {
        const typeInfo = this.extractTypeAlias(node, sourceFile);
        if (typeInfo) {
          result.typeDeclarations.push(typeInfo);
        }
      }
      
      // JSX Elements
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const jsxInfo = this.extractJSXElement(node, sourceFile, currentFunction);
        if (jsxInfo) {
          result.jsxElements.push(jsxInfo);
          // Extract attributes for selectors
          this.extractTestableAttributes(jsxInfo, result);
        }
      }
      
      // Hook calls
      if (ts.isCallExpression(node)) {
        const hookInfo = this.extractHookCall(node, sourceFile, currentFunction);
        if (hookInfo) {
          result.hooks.push(hookInfo);
        }
        
        // Also check for string literals in API calls
        this.extractStringLiterals(node, sourceFile, result);
      }
      
      // Event handlers (JSX attributes like onClick)
      if (ts.isJsxAttribute(node)) {
        const handlerInfo = this.extractEventHandler(node, sourceFile);
        if (handlerInfo) {
          result.eventHandlers.push(handlerInfo);
        }
      }
      
      ts.forEachChild(node, visit);
    };
    
    // Extract comments
    this.extractComments(sourceFile, result);
    
    ts.forEachChild(sourceFile, visit);
    
    return result;
  }
  
  /**
   * Extract import declaration
   */
  private extractImport(node: ts.ImportDeclaration, sourceFile: ts.SourceFile, result: ParsedFile) {
    const moduleSpecifier = node.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) return;
    
    const source = moduleSpecifier.text;
    const specifiers: ImportSpecifier[] = [];
    let isDefault = false;
    let isNamespace = false;
    
    const importClause = node.importClause;
    if (importClause) {
      // Default import: import X from 'x'
      if (importClause.name) {
        isDefault = true;
        specifiers.push({ name: 'default', alias: importClause.name.text });
      }
      
      // Named imports: import { X, Y as Z } from 'x'
      if (importClause.namedBindings) {
        if (ts.isNamespaceImport(importClause.namedBindings)) {
          isNamespace = true;
          specifiers.push({ name: '*', alias: importClause.namedBindings.name.text });
        } else if (ts.isNamedImports(importClause.namedBindings)) {
          for (const element of importClause.namedBindings.elements) {
            specifiers.push({
              name: element.propertyName?.text || element.name.text,
              alias: element.propertyName ? element.name.text : null,
            });
          }
        }
      }
    }
    
    result.imports.push({
      source,
      specifiers,
      isDefault,
      isNamespace,
      isDynamic: false,
      line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    });
  }
  
  /**
   * Extract export declaration
   */
  private extractExportDeclaration(node: ts.ExportDeclaration, sourceFile: ts.SourceFile, result: ParsedFile) {
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    
    // Re-export: export * from 'x' or export { x } from 'y'
    if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          result.exports.push({
            name: element.name.text,
            type: 'named',
            isReExport: true,
            reExportSource: node.moduleSpecifier.text,
            line,
          });
        }
      } else {
        result.exports.push({
          name: '*',
          type: 'all',
          isReExport: true,
          reExportSource: node.moduleSpecifier.text,
          line,
        });
      }
    } else if (node.exportClause && ts.isNamedExports(node.exportClause)) {
      // Named exports: export { x, y }
      for (const element of node.exportClause.elements) {
        result.exports.push({
          name: element.name.text,
          type: 'named',
          isReExport: false,
          reExportSource: null,
          line,
        });
      }
    }
  }
  
  /**
   * Extract export assignment (export default)
   */
  private extractExportAssignment(node: ts.ExportAssignment, sourceFile: ts.SourceFile, result: ParsedFile) {
    let name = 'default';
    if (ts.isIdentifier(node.expression)) {
      name = node.expression.text;
    }
    
    result.exports.push({
      name,
      type: 'default',
      isReExport: false,
      reExportSource: null,
      line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    });
  }
  
  /**
   * Extract function declaration
   */
  private extractFunction(
    node: ts.FunctionDeclaration,
    sourceFile: ts.SourceFile,
    content: string
  ): FunctionInfo | null {
    if (!node.name) return null;
    
    const name = node.name.text;
    const isExported = node.modifiers?.some(m => 
      m.kind === ts.SyntaxKind.ExportKeyword
    ) || false;
    
    const parameters = this.extractParameters(node.parameters);
    const returnType = node.type ? node.type.getText(sourceFile) : null;
    
    const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
    
    // Check if returns JSX
    const isComponent = this.functionReturnsJSX(node);
    
    return {
      name,
      isAsync: node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false,
      isArrowFunction: false,
      isExported,
      isComponent,
      parameters,
      returnType,
      body: content.substring(node.getStart(), node.getEnd()),
      line: startLine,
      endLine,
    };
  }
  
  /**
   * Extract variable declarations (arrow function components)
   */
  private extractVariableDeclarations(
    node: ts.VariableStatement,
    sourceFile: ts.SourceFile,
    content: string,
    result: ParsedFile
  ) {
    const isExported = node.modifiers?.some(m => 
      m.kind === ts.SyntaxKind.ExportKeyword
    ) || false;
    
    for (const declaration of node.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      
      const name = declaration.name.text;
      const initializer = declaration.initializer;
      
      if (initializer && ts.isArrowFunction(initializer)) {
        const parameters = this.extractParameters(initializer.parameters);
        const isComponent = this.functionReturnsJSX(initializer);
        
        const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
        
        result.functions.push({
          name,
          isAsync: initializer.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false,
          isArrowFunction: true,
          isExported,
          isComponent,
          parameters,
          returnType: initializer.type ? initializer.type.getText(sourceFile) : null,
          body: content.substring(initializer.getStart(), initializer.getEnd()),
          line: startLine,
          endLine,
        });
      }
    }
  }
  
  /**
   * Extract class declaration
   */
  private extractClass(
    node: ts.ClassDeclaration,
    sourceFile: ts.SourceFile,
    content: string
  ): ClassInfo | null {
    if (!node.name) return null;
    
    const name = node.name.text;
    const isExported = node.modifiers?.some(m => 
      m.kind === ts.SyntaxKind.ExportKeyword
    ) || false;
    
    let extendsClause: string | null = null;
    const implementsList: string[] = [];
    
    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
          extendsClause = clause.types[0]?.getText(sourceFile) || null;
        } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
          for (const type of clause.types) {
            implementsList.push(type.getText(sourceFile));
          }
        }
      }
    }
    
    const methods: FunctionInfo[] = [];
    const properties: PropertyInfo[] = [];
    
    for (const member of node.members) {
      if (ts.isMethodDeclaration(member) && member.name) {
        methods.push({
          name: member.name.getText(sourceFile),
          isAsync: member.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false,
          isArrowFunction: false,
          isExported: false,
          isComponent: false,
          parameters: this.extractParameters(member.parameters),
          returnType: member.type ? member.type.getText(sourceFile) : null,
          body: '',
          line: sourceFile.getLineAndCharacterOfPosition(member.getStart()).line + 1,
          endLine: sourceFile.getLineAndCharacterOfPosition(member.getEnd()).line + 1,
        });
      }
      
      if (ts.isPropertyDeclaration(member) && member.name) {
        properties.push({
          name: member.name.getText(sourceFile),
          type: member.type ? member.type.getText(sourceFile) : null,
          isStatic: member.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) || false,
          isReadonly: member.modifiers?.some(m => m.kind === ts.SyntaxKind.ReadonlyKeyword) || false,
        });
      }
    }
    
    return {
      name,
      isExported,
      extends: extendsClause,
      implements: implementsList,
      methods,
      properties,
      line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    };
  }
  
  /**
   * Extract JSX element
   */
  private extractJSXElement(
    node: ts.JsxElement | ts.JsxSelfClosingElement,
    sourceFile: ts.SourceFile,
    currentFunction: string | null
  ): JSXElementInfo | null {
    let tagName: string;
    let attributes: JSXAttributeInfo[] = [];
    
    if (ts.isJsxElement(node)) {
      tagName = node.openingElement.tagName.getText(sourceFile);
      attributes = this.extractJSXAttributes(node.openingElement.attributes, sourceFile);
    } else {
      tagName = node.tagName.getText(sourceFile);
      attributes = this.extractJSXAttributes(node.attributes, sourceFile);
    }
    
    // Check if component (uppercase first letter)
    const isComponent = /^[A-Z]/.test(tagName);
    
    // Extract text content for elements with text
    let textContent: string | null = null;
    if (ts.isJsxElement(node) && node.children.length === 1) {
      const child = node.children[0];
      if (ts.isJsxText(child)) {
        const trimmed = child.text.trim();
        if (trimmed) {
          textContent = trimmed;
        }
      }
    }
    
    return {
      tagName,
      isComponent,
      attributes,
      children: [], // Could recursively extract but keeping flat for now
      textContent,
      parentFunction: currentFunction,
      line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    };
  }
  
  /**
   * Extract JSX attributes
   */
  private extractJSXAttributes(
    attributes: ts.JsxAttributes,
    sourceFile: ts.SourceFile
  ): JSXAttributeInfo[] {
    const result: JSXAttributeInfo[] = [];
    
    for (const attr of attributes.properties) {
      if (ts.isJsxAttribute(attr) && attr.name) {
        const name = attr.name.getText(sourceFile);
        let value: string | null = null;
        let isExpression = false;
        let expressionText: string | null = null;
        
        if (attr.initializer) {
          if (ts.isStringLiteral(attr.initializer)) {
            value = attr.initializer.text;
          } else if (ts.isJsxExpression(attr.initializer)) {
            isExpression = true;
            if (attr.initializer.expression) {
              expressionText = attr.initializer.expression.getText(sourceFile);
              // If it's a simple identifier, use it as value
              if (ts.isIdentifier(attr.initializer.expression)) {
                value = attr.initializer.expression.text;
              }
            }
          }
        }
        
        result.push({ name, value, isExpression, expressionText });
      }
    }
    
    return result;
  }
  
  /**
   * Extract hook call
   */
  private extractHookCall(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    currentFunction: string | null
  ): HookCall | null {
    if (!ts.isIdentifier(node.expression)) return null;
    
    const name = node.expression.text;
    
    // Check if it's a hook (starts with "use")
    if (!name.startsWith('use')) return null;
    
    const builtInHooks = new Set([
      'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback',
      'useMemo', 'useRef', 'useImperativeHandle', 'useLayoutEffect',
      'useDebugValue', 'useDeferredValue', 'useTransition', 'useId',
      'useSyncExternalStore', 'useInsertionEffect',
    ]);
    
    const args: HookArgument[] = node.arguments.map((arg, index) => {
      let type: HookArgument['type'] = 'expression';
      let value = arg.getText(sourceFile);
      
      if (ts.isStringLiteral(arg) || ts.isNumericLiteral(arg)) {
        type = 'literal';
      } else if (ts.isIdentifier(arg)) {
        type = 'identifier';
      } else if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
        type = 'function';
      } else if (ts.isArrayLiteralExpression(arg)) {
        type = 'array';
      } else if (ts.isObjectLiteralExpression(arg)) {
        type = 'object';
      }
      
      return { index, type, value };
    });
    
    return {
      name,
      isBuiltIn: builtInHooks.has(name),
      arguments: args,
      line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
      parentFunction: currentFunction,
    };
  }
  
  /**
   * Extract event handler from JSX attribute
   */
  private extractEventHandler(
    node: ts.JsxAttribute,
    sourceFile: ts.SourceFile
  ): EventHandlerInfo | null {
    if (!node.name) return null;
    
    const name = node.name.getText(sourceFile);
    
    // Check if it's an event handler (starts with "on")
    if (!name.startsWith('on') || name.length < 3) return null;
    
    let handlerName: string | null = null;
    let isInline = false;
    
    if (node.initializer && ts.isJsxExpression(node.initializer)) {
      const expr = node.initializer.expression;
      if (expr) {
        if (ts.isIdentifier(expr)) {
          handlerName = expr.text;
        } else if (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr)) {
          isInline = true;
        }
      }
    }
    
    // Get parent element
    let targetElement: string | null = null;
    let parent: ts.Node | undefined = node.parent;
    while (parent) {
      if (ts.isJsxOpeningElement(parent)) {
        targetElement = parent.tagName.getText(sourceFile);
        break;
      }
      if (ts.isJsxSelfClosingElement(parent)) {
        targetElement = parent.tagName.getText(sourceFile);
        break;
      }
      parent = parent.parent;
    }
    
    return {
      name,
      handlerName,
      isInline,
      targetElement,
      line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    };
  }
  
  /**
   * Extract string literals for API paths, URLs, etc.
   */
  private extractStringLiterals(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    result: ParsedFile
  ) {
    for (const arg of node.arguments) {
      if (ts.isStringLiteral(arg)) {
        const value = arg.text;
        let type: StringLiteralInfo['type'] = 'unknown';
        
        // Detect type
        if (value.startsWith('http://') || value.startsWith('https://')) {
          type = 'url';
        } else if (value.startsWith('/api/') || value.startsWith('/v1/') || value.includes('/api/')) {
          type = 'api-path';
        } else if (value.startsWith('[data-') || value.startsWith('#') || value.startsWith('.')) {
          type = 'selector';
        } else if (value.length > 0) {
          type = 'text';
        }
        
        if (type !== 'unknown') {
          result.stringLiterals.push({
            value,
            type,
            context: node.expression.getText(sourceFile),
            line: sourceFile.getLineAndCharacterOfPosition(arg.getStart()).line + 1,
          });
        }
      }
    }
  }
  
  /**
   * Extract testable attributes from JSX element
   */
  private extractTestableAttributes(element: JSXElementInfo, result: ParsedFile) {
    for (const attr of element.attributes) {
      let type: AttributeInfo['type'] | null = null;
      
      if (attr.name === 'data-testid' || attr.name === 'data-cy' || attr.name === 'data-test') {
        type = 'testId';
      } else if (attr.name === 'aria-label') {
        type = 'ariaLabel';
      } else if (attr.name === 'role') {
        type = 'role';
      } else if (attr.name === 'id') {
        type = 'id';
      } else if (attr.name === 'className' || attr.name === 'class') {
        type = 'className';
      } else if (attr.name === 'name') {
        type = 'name';
      }
      
      if (type && attr.value) {
        result.attributes.push({
          type,
          value: attr.value,
          element: element.tagName,
          line: element.line,
        });
      }
    }
  }
  
  /**
   * Extract comments from source file
   */
  private extractComments(sourceFile: ts.SourceFile, result: ParsedFile) {
    const text = sourceFile.getFullText();
    const commentRanges = [
      ...ts.getLeadingCommentRanges(text, 0) || [],
    ];
    
    // This is a simplified approach - full comment extraction would require
    // walking the entire file's trivia
    for (const range of commentRanges) {
      const commentText = text.substring(range.pos, range.end);
      result.comments.push({
        text: commentText,
        type: range.kind === ts.SyntaxKind.SingleLineCommentTrivia ? 'line' : 'block',
        line: sourceFile.getLineAndCharacterOfPosition(range.pos).line + 1,
      });
    }
  }
  
  /**
   * Extract function parameters
   */
  private extractParameters(params: ts.NodeArray<ts.ParameterDeclaration>): ParameterInfo[] {
    return params.map(param => ({
      name: param.name.getText(),
      type: param.type ? param.type.getText() : null,
      isOptional: !!param.questionToken || !!param.initializer,
      defaultValue: param.initializer ? param.initializer.getText() : null,
    }));
  }
  
  /**
   * Check if function returns JSX
   */
  private functionReturnsJSX(node: ts.FunctionDeclaration | ts.ArrowFunction): boolean {
    let hasJSX = false;
    
    const checkNode = (n: ts.Node) => {
      if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) {
        hasJSX = true;
        return;
      }
      ts.forEachChild(n, checkNode);
    };
    
    if (node.body) {
      checkNode(node.body);
    }
    
    return hasJSX;
  }
  
  /**
   * Extract interface declaration (v4 - for entity extraction)
   */
  private extractInterfaceDeclaration(
    node: ts.InterfaceDeclaration,
    sourceFile: ts.SourceFile
  ): TypeDeclarationInfo | null {
    const name = node.name.text;
    
    const properties: TypePropertyInfo[] = [];
    
    for (const member of node.members) {
      if (ts.isPropertySignature(member) && member.name) {
        properties.push({
          name: member.name.getText(sourceFile),
          type: member.type ? member.type.getText(sourceFile) : 'any',
          optional: !!member.questionToken,
        });
      }
    }
    
    const isExported = node.modifiers?.some(
      m => m.kind === ts.SyntaxKind.ExportKeyword
    ) ?? false;
    
    return {
      name,
      type: 'interface',
      properties,
      isExported,
      line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    };
  }
  
  /**
   * Extract type alias declaration (v4 - for entity extraction)
   */
  private extractTypeAlias(
    node: ts.TypeAliasDeclaration,
    sourceFile: ts.SourceFile
  ): TypeDeclarationInfo | null {
    const name = node.name.text;
    
    const properties: TypePropertyInfo[] = [];
    
    // Only extract if it's an object type
    if (ts.isTypeLiteralNode(node.type)) {
      for (const member of node.type.members) {
        if (ts.isPropertySignature(member) && member.name) {
          properties.push({
            name: member.name.getText(sourceFile),
            type: member.type ? member.type.getText(sourceFile) : 'any',
            optional: !!member.questionToken,
          });
        }
      }
    }
    
    const isExported = node.modifiers?.some(
      m => m.kind === ts.SyntaxKind.ExportKeyword
    ) ?? false;
    
    return {
      name,
      type: 'type',
      properties,
      isExported,
      line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    };
  }
}

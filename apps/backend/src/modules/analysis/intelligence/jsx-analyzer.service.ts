import { Injectable, Logger } from '@nestjs/common';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { FormInfo, FormField, ValidationRule, LinkInfo } from './types/intelligence.types';

/**
 * Deep JSX AST Analyzer
 * Traverses JSX tree to extract forms, fields, links, interactions
 */
@Injectable()
export class JSXAnalyzerService {
  private readonly logger = new Logger(JSXAnalyzerService.name);

  /**
   * Extract all forms from JSX AST
   */
  extractForms(ast: any): FormInfo[] {
    const forms: FormInfo[] = [];
    
    this.traverse(ast, (node) => {
      // Find JSX elements with tag name 'form' or 'Form'
      if (this.isJSXElement(node, ['form', 'Form'])) {
        const form = this.analyzeFormElement(node);
        if (form) {
          forms.push(form);
        }
      }
    });

    return forms;
  }

  /**
   * Extract all links from JSX AST
   */
  extractLinks(ast: any): LinkInfo[] {
    const links: LinkInfo[] = [];

    this.traverse(ast, (node) => {
      // Standard Link components
      if (this.isJSXElement(node, ['Link', 'NavLink', 'a'])) {
        const link = this.analyzeLinkElement(node);
        if (link) {
          links.push(link);
        }
      }
      
      // Material-UI and other components with 'to' prop or 'component={RouterLink}'
      if (this.isJSXElement(node, ['ListItem', 'Button', 'MenuItem', 'ListItemButton'])) {
        const link = this.analyzeMUILinkElement(node);
        if (link) {
          links.push(link);
        }
      }
    });

    return links;
  }

  /**
   * Extract routes from Route components
   */
  extractRoutes(ast: any): Array<{ path: string; component: string; isProtected: boolean }> {
    const routes: Array<{ path: string; component: string; isProtected: boolean }> = [];

    this.traverse(ast, (node) => {
      if (this.isJSXElement(node, ['Route'])) {
        const route = this.analyzeRouteElement(node);
        if (route) {
          routes.push(route);
        }
      }
    });

    return routes;
  }

  /**
   * Analyze a form element and extract all details
   */
  private analyzeFormElement(formNode: any): FormInfo | null {
    const onSubmitProp = this.findProp(formNode, 'onSubmit');
    const submitHandler = onSubmitProp ? this.extractPropValue(onSubmitProp) : undefined;

    // Extract all input fields within this form
    const fields = this.extractFieldsFromForm(formNode);
    
    // Extract validation rules
    const validations = this.extractValidations(formNode, fields);

    if (fields.length === 0) {
      return null;
    }

    return {
      id: this.findProp(formNode, 'id')?.value?.value,
      fields,
      submitHandler,
      validations,
    };
  }

  /**
   * Extract all input fields from a form node
   */
  private extractFieldsFromForm(formNode: any): FormField[] {
    const fields: FormField[] = [];

    this.traverse(formNode, (node) => {
      // Find input, textarea, select elements
      if (this.isJSXElement(node, ['input', 'Input', 'textarea', 'TextArea', 'select', 'Select'])) {
        const field = this.analyzeFieldElement(node);
        if (field) {
          fields.push(field);
        }
      }

      // Find Material-UI or other component library fields
      if (this.isJSXElement(node, ['TextField', 'TextInput', 'FormControl', 'FormField'])) {
        const field = this.analyzeComponentField(node);
        if (field) {
          fields.push(field);
        }
      }
    });

    return fields;
  }

  /**
   * Analyze a native HTML input field
   */
  private analyzeFieldElement(node: any): FormField | null {
    const nameProp = this.findProp(node, 'name');
    const typeProp = this.findProp(node, 'type');
    const labelProp = this.findProp(node, 'label') || this.findProp(node, 'placeholder');
    const requiredProp = this.findProp(node, 'required');

    if (!nameProp) return null;

    const name = this.extractPropValue(nameProp);
    const type = typeProp ? this.extractPropValue(typeProp) : 'text';
    const label = labelProp ? this.extractPropValue(labelProp) : undefined;
    const required = requiredProp !== undefined;

    return {
      name,
      type,
      label,
      required,
      selector: `input[name="${name}"]`,
    };
  }

  /**
   * Analyze a component library field (e.g. Material-UI TextField)
   */
  private analyzeComponentField(node: any): FormField | null {
    const nameProp = this.findProp(node, 'name') || this.findProp(node, 'id');
    const labelProp = this.findProp(node, 'label');
    const typeProp = this.findProp(node, 'type');
    const requiredProp = this.findProp(node, 'required');

    if (!nameProp) return null;

    const name = this.extractPropValue(nameProp);
    const type = typeProp ? this.extractPropValue(typeProp) : 'text';
    const label = labelProp ? this.extractPropValue(labelProp) : undefined;
    const required = requiredProp !== undefined;

    return {
      name,
      type,
      label,
      required,
      selector: `[name="${name}"]`,
    };
  }

  /**
   * Extract validation rules from form
   */
  private extractValidations(formNode: any, fields: FormField[]): ValidationRule[] {
    const validations: ValidationRule[] = [];

    // Check for Yup schema validation
    this.traverse(formNode, (node) => {
      if (node.type === AST_NODE_TYPES.MemberExpression) {
        const validation = this.extractYupValidation(node, fields);
        if (validation) {
          validations.push(validation);
        }
      }
    });

    return validations;
  }

  /**
   * Extract Yup validation schema
   */
  private extractYupValidation(node: any, fields: FormField[]): ValidationRule | null {
    // Look for patterns like: yup.string().required(), yup.string().email()
    // This is simplified - real implementation would need deeper analysis
    return null;
  }

  /**
   * Analyze a Link element
   */
  private analyzeLinkElement(node: any): LinkInfo | null {
    const toProp = this.findProp(node, 'to') || this.findProp(node, 'href');
    if (!toProp) return null;

    const href = this.extractPropValue(toProp);
    const text = this.extractTextContent(node);

    return {
      href,
      text: text || href,
      isInternal: !href.startsWith('http'),
      selector: `a[href="${href}"]`,
    };
  }

  /**
   * Analyze MUI component used as link (e.g., ListItem component={RouterLink})
   */
  private analyzeMUILinkElement(node: any): LinkInfo | null {
    const componentProp = this.findProp(node, 'component');
    const toProp = this.findProp(node, 'to');
    
    // Check if it has both component={RouterLink} and to prop
    if (!toProp) return null;
    if (!componentProp) return null;
    
    const componentValue = this.extractPropValue(componentProp);
    if (!componentValue.includes('Link')) return null;

    const href = this.extractPropValue(toProp);
    const text = this.extractTextContent(node);

    return {
      href,
      text: text || href,
      isInternal: !href.startsWith('http'),
      selector: `[href="${href}"]`,
    };
  }

  /**
   * Analyze a Route element
   */
  private analyzeRouteElement(node: any): { path: string; component: string; isProtected: boolean } | null {
    const pathProp = this.findProp(node, 'path');
    if (!pathProp) return null;

    const path = this.extractPropValue(pathProp);
    
    // Extract component from element prop (React Router v6)
    const elementProp = this.findProp(node, 'element');
    const componentProp = this.findProp(node, 'component');
    
    let component = 'Unknown';
    if (elementProp) {
      component = this.extractComponentName(elementProp.value);
    } else if (componentProp) {
      component = this.extractPropValue(componentProp);
    } else if (node.children && node.children.length > 0) {
      // React Router v5 syntax: <Route><Component /></Route>
      component = this.extractComponentFromChildren(node.children);
    }

    // Check if route is wrapped in ProtectedRoute/PrivateRoute
    const isProtected = this.isProtectedRoute(node);

    return { path, component, isProtected };
  }

  /**
   * Check if a route is protected
   */
  private isProtectedRoute(node: any): boolean {
    // Check parent elements for ProtectedRoute, PrivateRoute, RequireAuth
    let current = node.parent;
    while (current) {
      if (this.isJSXElement(current, ['ProtectedRoute', 'PrivateRoute', 'RequireAuth', 'AuthGuard'])) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  /**
   * Extract component name from element prop
   */
  private extractComponentName(value: any): string {
    if (value.type === AST_NODE_TYPES.JSXElement) {
      const openingElement = value.openingElement;
      if (openingElement.name.type === AST_NODE_TYPES.JSXIdentifier) {
        return openingElement.name.name;
      }
    }
    return 'Unknown';
  }

  /**
   * Extract component name from Route children (React Router v5)
   */
  private extractComponentFromChildren(children: any[]): string {
    for (const child of children) {
      if (child.type === AST_NODE_TYPES.JSXElement) {
        const openingElement = child.openingElement;
        if (openingElement.name.type === AST_NODE_TYPES.JSXIdentifier) {
          const name = openingElement.name.name;
          // Skip Redirect, Fragment, etc.
          if (!['Redirect', 'Fragment', 'div', 'span'].includes(name)) {
            return name;
          }
        }
      }
      // Recursively check nested children
      if (child.children && child.children.length > 0) {
        const nested = this.extractComponentFromChildren(child.children);
        if (nested !== 'Unknown') return nested;
      }
    }
    return 'Unknown';
  }

  /**
   * Extract text content from JSX element
   */
  private extractTextContent(node: any): string | null {
    if (node.children) {
      for (const child of node.children) {
        if (child.type === AST_NODE_TYPES.JSXText) {
          return child.value.trim();
        }
        if (child.type === AST_NODE_TYPES.JSXExpressionContainer) {
          if (child.expression.type === AST_NODE_TYPES.Literal) {
            return String(child.expression.value);
          }
        }
      }
    }
    return null;
  }

  /**
   * Find a prop by name in JSX element
   */
  private findProp(node: any, propName: string): any {
    if (!node.openingElement?.attributes) return undefined;

    return node.openingElement.attributes.find((attr: any) => {
      return attr.type === AST_NODE_TYPES.JSXAttribute && attr.name.name === propName;
    });
  }

  /**
   * Extract value from JSX attribute
   */
  private extractPropValue(prop: any): string {
    if (!prop.value) {
      // Boolean props like `required` have no value
      return 'true';
    }

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

      if (expr.type === AST_NODE_TYPES.ArrowFunctionExpression ||
          expr.type === AST_NODE_TYPES.FunctionExpression) {
        return 'function';
      }
      
      if (expr.type === AST_NODE_TYPES.MemberExpression) {
        // Handle obj.prop syntax
        return this.extractMemberExpressionName(expr);
      }
    }

    return '';
  }

  /**
   * Extract name from member expression (e.g., React.Component)
   */
  private extractMemberExpressionName(expr: any): string {
    const parts: string[] = [];
    let current = expr;
    
    while (current) {
      if (current.type === AST_NODE_TYPES.Identifier) {
        parts.unshift(current.name);
        break;
      }
      if (current.type === AST_NODE_TYPES.MemberExpression) {
        if (current.property.type === AST_NODE_TYPES.Identifier) {
          parts.unshift(current.property.name);
        }
        current = current.object;
      } else {
        break;
      }
    }
    
    return parts.join('.');
  }

  /**
   * Check if node is a JSX element with given tag names
   */
  private isJSXElement(node: any, tagNames: string[]): boolean {
    if (node.type !== AST_NODE_TYPES.JSXElement) return false;
    
    const openingElement = node.openingElement;
    if (openingElement.name.type === AST_NODE_TYPES.JSXIdentifier) {
      return tagNames.includes(openingElement.name.name);
    }

    return false;
  }

  /**
   * Traverse AST tree with callback
   */
  private traverse(node: any, callback: (node: any) => void): void {
    if (!node || typeof node !== 'object') return;

    callback(node);

    // Traverse all properties
    for (const key in node) {
      if (key === 'parent') continue; // Avoid circular refs

      const value = node[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object') {
            item.parent = node; // Set parent reference
            this.traverse(item, callback);
          }
        }
      } else if (value && typeof value === 'object') {
        value.parent = node; // Set parent reference
        this.traverse(value, callback);
      }
    }
  }
}

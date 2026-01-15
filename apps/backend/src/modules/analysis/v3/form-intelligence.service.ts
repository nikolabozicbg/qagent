import { Injectable } from '@nestjs/common';
import { ParsedFile, JSXElementInfo, HookCall, EventHandlerInfo } from './ast-parser.service';
import { ComponentAnalysis, ComponentSignature } from './component-analyzer.service';

/**
 * Form Intelligence v3.0
 * 
 * Phase 2.3: Detects and analyzes forms regardless of implementation
 * - Detects form boundaries (form tag, hook scope, handler scope)
 * - Extracts fields with types and validation
 * - Maps submit handlers and API endpoints
 * - Detects error handling patterns
 */

export interface FormAnalysis {
  forms: FormDefinition[];
  formMap: Map<string, FormDefinition>;
  orphanFields: FormField[];           // Fields not associated with a form
  statistics: FormStatistics;
}

export interface FormDefinition {
  id: string;
  name: string;                        // Inferred or from form attribute
  componentName: string;
  filePath: string;
  line: number;
  
  // Structure
  fields: FormField[];
  submitButtons: SubmitButton[];
  
  // Behavior
  submitHandler: SubmitHandler | null;
  validationSchema: ValidationInfo | null;
  
  // Flow
  successFlow: FormSuccessFlow | null;
  errorHandling: ErrorHandling | null;
  
  // Metadata
  formLibrary: string | null;          // react-hook-form, formik, etc.
  isControlled: boolean;
  hasClientValidation: boolean;
  hasApiCall: boolean;
  complexity: number;
}

export interface FormField {
  name: string;
  type: InputType;
  label: string | null;
  placeholder: string | null;
  isRequired: boolean;
  defaultValue: string | null;
  
  // Validation
  validation: FieldValidation[];
  
  // Selectors
  selector: FieldSelector;
  
  // Location
  line: number;
}

export type InputType = 
  | 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
  | 'date' | 'datetime' | 'time'
  | 'checkbox' | 'radio' | 'switch'
  | 'select' | 'multiselect'
  | 'textarea'
  | 'file'
  | 'hidden'
  | 'custom';

export interface FieldValidation {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'email' | 'custom';
  value: string | number | null;
  message: string | null;
}

export interface FieldSelector {
  primary: string;
  strategy: 'testId' | 'name' | 'label' | 'placeholder' | 'id' | 'css';
  fallbacks: string[];
}

export interface SubmitButton {
  text: string | null;
  type: 'submit' | 'button';
  selector: FieldSelector;
  line: number;
}

export interface SubmitHandler {
  name: string | null;
  isAsync: boolean;
  apiEndpoint: string | null;
  apiMethod: string | null;
}

export interface ValidationInfo {
  library: 'yup' | 'zod' | 'joi' | 'native' | 'custom';
  schemaName: string | null;
  rules: Record<string, string[]>;     // Field -> validation rules
}

export interface FormSuccessFlow {
  type: 'redirect' | 'toast' | 'reset' | 'close-modal' | 'callback' | 'unknown';
  target: string | null;               // Redirect path or toast message
}

export interface ErrorHandling {
  hasFieldErrors: boolean;
  hasFormError: boolean;
  showsToast: boolean;
  errorComponent: string | null;
}

export interface FormStatistics {
  totalForms: number;
  totalFields: number;
  avgFieldsPerForm: number;
  formLibraries: Record<string, number>;
  fieldTypes: Record<string, number>;
}

@Injectable()
export class FormIntelligenceService {
  
  /**
   * Analyze forms across all components
   */
  analyzeForms(
    componentAnalysis: ComponentAnalysis,
    parsedFiles: ParsedFile[]
  ): FormAnalysis {
    console.log(`📝 Form Intelligence: Analyzing forms`);
    const startTime = Date.now();
    
    const forms: FormDefinition[] = [];
    const formMap = new Map<string, FormDefinition>();
    const allFields: FormField[] = [];
    
    // Create file lookup
    const fileMap = new Map<string, ParsedFile>();
    for (const file of parsedFiles) {
      fileMap.set(file.filePath, file);
    }
    
    // Analyze each component for forms
    for (const comp of componentAnalysis.components) {
      const file = fileMap.get(comp.filePath);
      if (!file) continue;
      
      const componentForms = this.extractForms(comp, file);
      
      for (const form of componentForms) {
        forms.push(form);
        formMap.set(form.id, form);
        allFields.push(...form.fields);
      }
    }
    
    // Find orphan fields (fields not in any form)
    const orphanFields = this.findOrphanFields(parsedFiles, forms);
    
    const statistics = this.calculateStatistics(forms);
    
    const analysisTime = Date.now() - startTime;
    console.log(`   Found ${forms.length} forms with ${allFields.length} fields in ${analysisTime}ms`);
    
    return { forms, formMap, orphanFields, statistics };
  }
  
  /**
   * Extract forms from a component
   */
  private extractForms(comp: ComponentSignature, file: ParsedFile): FormDefinition[] {
    const forms: FormDefinition[] = [];
    
    // Find form elements
    const formElements = file.jsxElements.filter(
      el => el.tagName.toLowerCase() === 'form' && el.parentFunction === comp.name
    );
    
    // Find form hooks
    const formHooks = file.hooks.filter(
      h => (h.name === 'useForm' || h.name === 'useFormik' || h.name === 'useFormContext') &&
           h.parentFunction === comp.name
    );
    
    // Method 1: Form tag based
    for (const formEl of formElements) {
      const form = this.analyzeFormElement(formEl, comp, file);
      if (form) {
        forms.push(form);
      }
    }
    
    // Method 2: Form hook based (if no form tag found)
    if (forms.length === 0 && formHooks.length > 0) {
      for (const hook of formHooks) {
        const form = this.analyzeFormHook(hook, comp, file);
        if (form) {
          forms.push(form);
        }
      }
    }
    
    // Method 3: Infer from submit handlers
    if (forms.length === 0) {
      const submitHandlers = file.eventHandlers.filter(
        h => h.name === 'onSubmit'
      );
      if (submitHandlers.length > 0) {
        const form = this.inferFormFromSubmit(comp, file);
        if (form) {
          forms.push(form);
        }
      }
    }
    
    return forms;
  }
  
  /**
   * Analyze form from form element
   */
  private analyzeFormElement(
    formEl: JSXElementInfo,
    comp: ComponentSignature,
    file: ParsedFile
  ): FormDefinition | null {
    const formId = `form-${comp.name}-${formEl.line}`;
    
    // Get form name from attributes
    const nameAttr = formEl.attributes.find(a => a.name === 'name');
    const idAttr = formEl.attributes.find(a => a.name === 'id');
    const name = nameAttr?.value || idAttr?.value || `${comp.name}Form`;
    
    // Find fields within form scope
    const fields = this.extractFields(file, comp.name, formEl.line);
    
    // Find submit buttons
    const submitButtons = this.extractSubmitButtons(file, comp.name);
    
    // Analyze submit handler
    const submitHandler = this.analyzeSubmitHandler(file, comp.name);
    
    // Detect form library
    const formLibrary = this.detectFormLibrary(file);
    
    // Detect validation
    const validationSchema = this.detectValidation(file, comp.name);
    
    // Analyze success flow
    const successFlow = this.analyzeSuccessFlow(file, comp.name);
    
    // Analyze error handling
    const errorHandling = this.analyzeErrorHandling(file, comp.name);
    
    return {
      id: formId,
      name,
      componentName: comp.name,
      filePath: file.filePath,
      line: formEl.line,
      fields,
      submitButtons,
      submitHandler,
      validationSchema,
      successFlow,
      errorHandling,
      formLibrary,
      isControlled: this.isControlledForm(file, comp.name),
      hasClientValidation: validationSchema !== null || fields.some(f => f.validation.length > 0),
      hasApiCall: submitHandler?.apiEndpoint !== null,
      complexity: this.calculateFormComplexity(fields, submitHandler, validationSchema),
    };
  }
  
  /**
   * Analyze form from hook
   */
  private analyzeFormHook(
    hook: HookCall,
    comp: ComponentSignature,
    file: ParsedFile
  ): FormDefinition | null {
    const formId = `form-${comp.name}-hook-${hook.line}`;
    
    const fields = this.extractFields(file, comp.name, 0);
    const submitButtons = this.extractSubmitButtons(file, comp.name);
    const submitHandler = this.analyzeSubmitHandler(file, comp.name);
    const validationSchema = this.detectValidation(file, comp.name);
    
    return {
      id: formId,
      name: `${comp.name}Form`,
      componentName: comp.name,
      filePath: file.filePath,
      line: hook.line,
      fields,
      submitButtons,
      submitHandler,
      validationSchema,
      successFlow: this.analyzeSuccessFlow(file, comp.name),
      errorHandling: this.analyzeErrorHandling(file, comp.name),
      formLibrary: hook.name === 'useFormik' ? 'formik' : 
                   hook.name === 'useForm' ? 'react-hook-form' : null,
      isControlled: true,
      hasClientValidation: true,
      hasApiCall: submitHandler?.apiEndpoint !== null,
      complexity: this.calculateFormComplexity(fields, submitHandler, validationSchema),
    };
  }
  
  /**
   * Infer form from submit handler
   */
  private inferFormFromSubmit(
    comp: ComponentSignature,
    file: ParsedFile
  ): FormDefinition | null {
    const fields = this.extractFields(file, comp.name, 0);
    if (fields.length === 0) return null;
    
    return {
      id: `form-${comp.name}-inferred`,
      name: `${comp.name}Form`,
      componentName: comp.name,
      filePath: file.filePath,
      line: comp.line,
      fields,
      submitButtons: this.extractSubmitButtons(file, comp.name),
      submitHandler: this.analyzeSubmitHandler(file, comp.name),
      validationSchema: null,
      successFlow: null,
      errorHandling: null,
      formLibrary: null,
      isControlled: this.isControlledForm(file, comp.name),
      hasClientValidation: false,
      hasApiCall: false,
      complexity: fields.length,
    };
  }
  
  /**
   * Extract form fields
   */
  private extractFields(
    file: ParsedFile,
    componentName: string,
    formLine: number
  ): FormField[] {
    const fields: FormField[] = [];
    const inputElements = file.jsxElements.filter(
      el => this.isInputElement(el.tagName) && el.parentFunction === componentName
    );
    
    for (const el of inputElements) {
      const field = this.parseFieldElement(el);
      if (field) {
        fields.push(field);
      }
    }
    
    return fields;
  }
  
  /**
   * Check if element is an input
   */
  private isInputElement(tagName: string): boolean {
    const lower = tagName.toLowerCase();
    return ['input', 'textarea', 'select'].includes(lower) ||
           /input|field|select|checkbox|radio|switch/i.test(tagName);
  }
  
  /**
   * Parse field from JSX element
   */
  private parseFieldElement(el: JSXElementInfo): FormField | null {
    const attrs = new Map(el.attributes.map(a => [a.name, a.value]));
    
    const name = attrs.get('name') || attrs.get('id') || '';
    if (!name && !attrs.get('data-testid')) return null;
    
    const type = this.inferInputType(el, attrs);
    
    // Build selector
    const selector = this.buildFieldSelector(el, attrs);
    
    // Extract validation from attributes
    const validation = this.extractFieldValidation(attrs);
    
    return {
      name: name || selector.primary,
      type,
      label: attrs.get('aria-label') || attrs.get('placeholder') || null,
      placeholder: attrs.get('placeholder') || null,
      isRequired: attrs.has('required') || attrs.get('aria-required') === 'true',
      defaultValue: attrs.get('defaultValue') || attrs.get('value') || null,
      validation,
      selector,
      line: el.line,
    };
  }
  
  /**
   * Infer input type from element and attributes
   */
  private inferInputType(el: JSXElementInfo, attrs: Map<string, string | null>): InputType {
    const tagLower = el.tagName.toLowerCase();
    
    if (tagLower === 'textarea') return 'textarea';
    if (tagLower === 'select') return 'select';
    
    const typeAttr = attrs.get('type')?.toLowerCase();
    if (typeAttr) {
      if (['text', 'email', 'password', 'number', 'tel', 'url', 'date', 'time', 'file', 'hidden'].includes(typeAttr)) {
        return typeAttr as InputType;
      }
      if (typeAttr === 'checkbox') return 'checkbox';
      if (typeAttr === 'radio') return 'radio';
      if (typeAttr === 'datetime-local') return 'datetime';
    }
    
    // Infer from name/id
    const name = (attrs.get('name') || '').toLowerCase();
    if (name.includes('email')) return 'email';
    if (name.includes('password')) return 'password';
    if (name.includes('phone') || name.includes('tel')) return 'tel';
    if (name.includes('date')) return 'date';
    
    return 'text';
  }
  
  /**
   * Build selector for field
   */
  private buildFieldSelector(el: JSXElementInfo, attrs: Map<string, string | null>): FieldSelector {
    const fallbacks: string[] = [];
    let primary = '';
    let strategy: FieldSelector['strategy'] = 'css';
    
    // Priority: testId > name > label > placeholder > id
    const testId = attrs.get('data-testid') || attrs.get('data-cy') || attrs.get('data-test');
    if (testId) {
      primary = `[data-testid="${testId}"]`;
      strategy = 'testId';
    }
    
    const name = attrs.get('name');
    if (name) {
      const nameSelector = `[name="${name}"]`;
      if (!primary) {
        primary = nameSelector;
        strategy = 'name';
      } else {
        fallbacks.push(nameSelector);
      }
    }
    
    const id = attrs.get('id');
    if (id) {
      const idSelector = `#${id}`;
      if (!primary) {
        primary = idSelector;
        strategy = 'id';
      } else {
        fallbacks.push(idSelector);
      }
    }
    
    const placeholder = attrs.get('placeholder');
    if (placeholder) {
      const placeholderSelector = `[placeholder="${placeholder}"]`;
      if (!primary) {
        primary = placeholderSelector;
        strategy = 'placeholder';
      } else {
        fallbacks.push(placeholderSelector);
      }
    }
    
    if (!primary) {
      primary = el.tagName.toLowerCase();
    }
    
    return { primary, strategy, fallbacks };
  }
  
  /**
   * Extract validation from attributes
   */
  private extractFieldValidation(attrs: Map<string, string | null>): FieldValidation[] {
    const validations: FieldValidation[] = [];
    
    if (attrs.has('required')) {
      validations.push({ type: 'required', value: null, message: null });
    }
    
    const minLength = attrs.get('minLength') || attrs.get('minlength');
    if (minLength) {
      validations.push({ type: 'minLength', value: parseInt(minLength, 10), message: null });
    }
    
    const maxLength = attrs.get('maxLength') || attrs.get('maxlength');
    if (maxLength) {
      validations.push({ type: 'maxLength', value: parseInt(maxLength, 10), message: null });
    }
    
    const pattern = attrs.get('pattern');
    if (pattern) {
      validations.push({ type: 'pattern', value: pattern, message: null });
    }
    
    const min = attrs.get('min');
    if (min) {
      validations.push({ type: 'min', value: parseFloat(min), message: null });
    }
    
    const max = attrs.get('max');
    if (max) {
      validations.push({ type: 'max', value: parseFloat(max), message: null });
    }
    
    const type = attrs.get('type');
    if (type === 'email') {
      validations.push({ type: 'email', value: null, message: null });
    }
    
    return validations;
  }
  
  /**
   * Extract submit buttons
   */
  private extractSubmitButtons(file: ParsedFile, componentName: string): SubmitButton[] {
    const buttons: SubmitButton[] = [];
    
    const buttonElements = file.jsxElements.filter(
      el => (el.tagName.toLowerCase() === 'button' || el.tagName === 'Button') &&
            el.parentFunction === componentName
    );
    
    for (const el of buttonElements) {
      const attrs = new Map(el.attributes.map(a => [a.name, a.value]));
      const typeAttr = attrs.get('type');
      const isTypeSubmit = typeAttr === 'submit';
      
      // Check if it's a submit button
      const isSubmit = isTypeSubmit || 
                       el.textContent?.toLowerCase().includes('submit') ||
                       el.textContent?.toLowerCase().includes('save') ||
                       el.textContent?.toLowerCase().includes('login') ||
                       el.textContent?.toLowerCase().includes('register') ||
                       el.textContent?.toLowerCase().includes('sign');
      
      if (isSubmit) {
        buttons.push({
          text: el.textContent,
          type: 'submit',
          selector: this.buildFieldSelector(el, attrs),
          line: el.line,
        });
      }
    }
    
    return buttons;
  }
  
  /**
   * Analyze submit handler
   */
  private analyzeSubmitHandler(file: ParsedFile, componentName: string): SubmitHandler | null {
    const submitHandler = file.eventHandlers.find(
      h => h.name === 'onSubmit'
    );
    
    if (!submitHandler) return null;
    
    // Try to find API endpoint from string literals
    const apiEndpoints = file.stringLiterals.filter(s => s.type === 'api-path');
    
    return {
      name: submitHandler.handlerName,
      isAsync: false, // Would need deeper analysis
      apiEndpoint: apiEndpoints[0]?.value || null,
      apiMethod: null,
    };
  }
  
  /**
   * Detect form library
   */
  private detectFormLibrary(file: ParsedFile): string | null {
    for (const imp of file.imports) {
      if (imp.source.includes('react-hook-form')) return 'react-hook-form';
      if (imp.source.includes('formik')) return 'formik';
      if (imp.source.includes('final-form')) return 'react-final-form';
    }
    return null;
  }
  
  /**
   * Detect validation schema
   */
  private detectValidation(file: ParsedFile, componentName: string): ValidationInfo | null {
    for (const imp of file.imports) {
      if (imp.source === 'yup' || imp.source.includes('yup')) {
        return { library: 'yup', schemaName: null, rules: {} };
      }
      if (imp.source === 'zod' || imp.source.includes('zod')) {
        return { library: 'zod', schemaName: null, rules: {} };
      }
      if (imp.source === 'joi' || imp.source.includes('joi')) {
        return { library: 'joi', schemaName: null, rules: {} };
      }
    }
    return null;
  }
  
  /**
   * Analyze success flow
   */
  private analyzeSuccessFlow(file: ParsedFile, componentName: string): FormSuccessFlow | null {
    // Check for navigation after submit
    const hasNavigate = file.hooks.some(h => 
      h.name === 'useNavigate' && h.parentFunction === componentName
    );
    if (hasNavigate) {
      return { type: 'redirect', target: null };
    }
    
    // Check for toast imports
    const hasToast = file.imports.some(i => 
      i.source.includes('toast') || i.source.includes('notification')
    );
    if (hasToast) {
      return { type: 'toast', target: null };
    }
    
    return null;
  }
  
  /**
   * Analyze error handling
   */
  private analyzeErrorHandling(file: ParsedFile, componentName: string): ErrorHandling | null {
    const hasErrorState = file.hooks.some(h =>
      h.name === 'useState' && h.parentFunction === componentName
    );
    
    return {
      hasFieldErrors: hasErrorState,
      hasFormError: hasErrorState,
      showsToast: file.imports.some(i => i.source.includes('toast')),
      errorComponent: null,
    };
  }
  
  /**
   * Check if form is controlled
   */
  private isControlledForm(file: ParsedFile, componentName: string): boolean {
    const hasValue = file.jsxElements.some(el =>
      el.attributes.some(a => a.name === 'value' && a.isExpression) &&
      el.parentFunction === componentName
    );
    return hasValue;
  }
  
  /**
   * Calculate form complexity
   */
  private calculateFormComplexity(
    fields: FormField[],
    submitHandler: SubmitHandler | null,
    validation: ValidationInfo | null
  ): number {
    let complexity = fields.length;
    
    if (submitHandler?.apiEndpoint) complexity += 2;
    if (validation) complexity += 2;
    if (fields.some(f => f.validation.length > 0)) complexity += 1;
    
    return Math.min(10, complexity);
  }
  
  /**
   * Find orphan fields
   */
  private findOrphanFields(
    parsedFiles: ParsedFile[],
    forms: FormDefinition[]
  ): FormField[] {
    // This would find input elements not associated with any form
    // For simplicity, returning empty for now
    return [];
  }
  
  /**
   * Calculate statistics
   */
  private calculateStatistics(forms: FormDefinition[]): FormStatistics {
    const fieldTypes: Record<string, number> = {};
    const formLibraries: Record<string, number> = {};
    let totalFields = 0;
    
    for (const form of forms) {
      totalFields += form.fields.length;
      
      for (const field of form.fields) {
        fieldTypes[field.type] = (fieldTypes[field.type] || 0) + 1;
      }
      
      if (form.formLibrary) {
        formLibraries[form.formLibrary] = (formLibraries[form.formLibrary] || 0) + 1;
      }
    }
    
    return {
      totalForms: forms.length,
      totalFields,
      avgFieldsPerForm: forms.length > 0 ? totalFields / forms.length : 0,
      formLibraries,
      fieldTypes,
    };
  }
  
  /**
   * Find form by component name
   */
  findFormByComponent(analysis: FormAnalysis, componentName: string): FormDefinition | null {
    return analysis.forms.find(f => f.componentName === componentName) || null;
  }
  
  /**
   * Get all forms with API calls
   */
  getFormsWithApiCalls(analysis: FormAnalysis): FormDefinition[] {
    return analysis.forms.filter(f => f.hasApiCall);
  }
}

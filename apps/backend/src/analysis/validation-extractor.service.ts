import { Injectable, Logger } from '@nestjs/common';

export interface ValidationRule {
  type:
    | 'required'
    | 'minLength'
    | 'maxLength'
    | 'pattern'
    | 'email'
    | 'min'
    | 'max'
    | 'custom';
  field: string;
  value?: any;
  pattern?: string;
  errorMessage?: string;
  errorSelector?: string;
}

export interface FieldValidation {
  fieldName: string;
  rules: ValidationRule[];
  errorElementSelector?: string;
}

@Injectable()
export class ValidationExtractorService {
  private readonly logger = new Logger(ValidationExtractorService.name);

  /**
   * Extract all validation rules from component source code
   */
  extractValidations(sourceCode: string): FieldValidation[] {
    const validations: FieldValidation[] = [];

    // Pattern 1: Inline validation logic (if statements)
    const inlineValidations = this.extractInlineValidations(sourceCode);
    validations.push(...inlineValidations);

    // Pattern 2: Yup schema validation
    const yupValidations = this.extractYupValidations(sourceCode);
    validations.push(...yupValidations);

    // Pattern 3: React Hook Form validation
    const rhfValidations = this.extractReactHookFormValidations(sourceCode);
    validations.push(...rhfValidations);

    // Pattern 4: HTML5 validation attributes
    const html5Validations = this.extractHTML5Validations(sourceCode);
    validations.push(...html5Validations);

    // Pattern 5: Ant Design / Generic rules array prop
    const rulesArrayValidations = this.extractRulesArrayValidations(sourceCode);
    validations.push(...rulesArrayValidations);

    return this.mergeValidations(validations);
  }

  /**
   * Extract inline validation logic (if/else checks)
   */
  private extractInlineValidations(sourceCode: string): FieldValidation[] {
    const validations: FieldValidation[] = [];

    // Pattern: if (!field) { error = "message" }
    const requiredPattern = /if\s*\(!(\w+)\)\s*{[^}]*['"](.*?)['"]/g;
    let match;

    while ((match = requiredPattern.exec(sourceCode)) !== null) {
      const fieldName = match[1];
      const errorMessage = match[2];

      validations.push({
        fieldName,
        rules: [
          {
            type: 'required',
            field: fieldName,
            errorMessage,
          },
        ],
      });
    }

    // Pattern: if (field.length < N) { error = "message" }
    const minLengthPattern =
      /if\s*\((\w+)\.length\s*<\s*(\d+)\)\s*{[^}]*['"](.*?)['"]/g;
    while ((match = minLengthPattern.exec(sourceCode)) !== null) {
      const fieldName = match[1];
      const minLength = parseInt(match[2]);
      const errorMessage = match[3];

      const existing = validations.find((v) => v.fieldName === fieldName);
      if (existing) {
        existing.rules.push({
          type: 'minLength',
          field: fieldName,
          value: minLength,
          errorMessage,
        });
      } else {
        validations.push({
          fieldName,
          rules: [
            {
              type: 'minLength',
              field: fieldName,
              value: minLength,
              errorMessage,
            },
          ],
        });
      }
    }

    // Pattern: if (!/regex/.test(field)) { error = "message" }
    const patternPattern =
      /if\s*\(!\/(.+?)\/\.test\((\w+)\)\)\s*{[^}]*['"](.*?)['"]/g;
    while ((match = patternPattern.exec(sourceCode)) !== null) {
      const pattern = match[1];
      const fieldName = match[2];
      const errorMessage = match[3];

      const existing = validations.find((v) => v.fieldName === fieldName);
      const rule: ValidationRule = {
        type: 'pattern',
        field: fieldName,
        pattern: `/${pattern}/`,
        errorMessage,
      };

      // Check if it's email validation
      if (pattern.includes('@') || errorMessage.toLowerCase().includes('email')) {
        rule.type = 'email';
      }

      if (existing) {
        existing.rules.push(rule);
      } else {
        validations.push({
          fieldName,
          rules: [rule],
        });
      }
    }

    return validations;
  }

  /**
   * Extract Yup schema validations
   */
  private extractYupValidations(sourceCode: string): FieldValidation[] {
    const validations: FieldValidation[] = [];

    // Pattern: yup.string().required("message")
    const yupPattern =
      /(\w+):\s*yup\.string\(\)\.([^,]+)(?:\.([^,]+))*/g;
    let match;

    while ((match = yupPattern.exec(sourceCode)) !== null) {
      const fieldName = match[1];
      const validation = match[0];
      const rules: ValidationRule[] = [];

      // Check for required
      if (validation.includes('.required(')) {
        const messageMatch = validation.match(/required\(['"](.+?)['"]\)/);
        rules.push({
          type: 'required',
          field: fieldName,
          errorMessage: messageMatch ? messageMatch[1] : 'This field is required',
        });
      }

      // Check for min length
      const minMatch = validation.match(/min\((\d+),\s*['"](.+?)['"]\)/);
      if (minMatch) {
        rules.push({
          type: 'minLength',
          field: fieldName,
          value: parseInt(minMatch[1]),
          errorMessage: minMatch[2],
        });
      }

      // Check for max length
      const maxMatch = validation.match(/max\((\d+),\s*['"](.+?)['"]\)/);
      if (maxMatch) {
        rules.push({
          type: 'maxLength',
          field: fieldName,
          value: parseInt(maxMatch[1]),
          errorMessage: maxMatch[2],
        });
      }

      // Check for email
      if (validation.includes('.email(')) {
        const emailMessageMatch = validation.match(/email\(['"](.+?)['"]\)/);
        rules.push({
          type: 'email',
          field: fieldName,
          errorMessage: emailMessageMatch
            ? emailMessageMatch[1]
            : 'Invalid email',
        });
      }

      if (rules.length > 0) {
        validations.push({ fieldName, rules });
      }
    }

    return validations;
  }

  /**
   * Extract React Hook Form validations
   */
  private extractReactHookFormValidations(
    sourceCode: string,
  ): FieldValidation[] {
    const validations: FieldValidation[] = [];

    // Pattern: register("field", { required: "message", minLength: { value: N, message: "msg" } })
    const registerPattern = /register\(['"](\w+)['"],\s*{([^}]+)}/g;
    let match;

    while ((match = registerPattern.exec(sourceCode)) !== null) {
      const fieldName = match[1];
      const rulesStr = match[2];
      const rules: ValidationRule[] = [];

      // Check for required
      const requiredMatch = rulesStr.match(/required:\s*['"](.+?)['"]/);
      if (requiredMatch) {
        rules.push({
          type: 'required',
          field: fieldName,
          errorMessage: requiredMatch[1],
        });
      }

      // Check for minLength
      const minLengthMatch = rulesStr.match(
        /minLength:\s*{\s*value:\s*(\d+),\s*message:\s*['"](.+?)['"]/,
      );
      if (minLengthMatch) {
        rules.push({
          type: 'minLength',
          field: fieldName,
          value: parseInt(minLengthMatch[1]),
          errorMessage: minLengthMatch[2],
        });
      }

      // Check for maxLength
      const maxLengthMatch = rulesStr.match(
        /maxLength:\s*{\s*value:\s*(\d+),\s*message:\s*['"](.+?)['"]/,
      );
      if (maxLengthMatch) {
        rules.push({
          type: 'maxLength',
          field: fieldName,
          value: parseInt(maxLengthMatch[1]),
          errorMessage: maxLengthMatch[2],
        });
      }

      // Check for pattern
      const patternMatch = rulesStr.match(
        /pattern:\s*{\s*value:\s*\/(.+?)\/,\s*message:\s*['"](.+?)['"]/,
      );
      if (patternMatch) {
        rules.push({
          type: 'pattern',
          field: fieldName,
          pattern: `/${patternMatch[1]}/`,
          errorMessage: patternMatch[2],
        });
      }

      if (rules.length > 0) {
        validations.push({ fieldName, rules });
      }
    }

    return validations;
  }

  /**
   * Extract Ant Design / Generic rules array prop validations
   * Pattern: <FormInput name="field" rules={[{ required: true, message: "..." }]} />
   */
  private extractRulesArrayValidations(sourceCode: string): FieldValidation[] {
    const validations: FieldValidation[] = [];

    // Simplified approach: Find components that have rules= prop
    // Match EITHER: name="field" ... rules={[ ... ]} OR rules={[ ... ]} ... name="field"
    // Pattern 1: name THEN rules
    const nameFirstPattern = /name=["'](\w+)["'][\s\S]{1,800}?rules=\{\s*\[([\s\S]*?)\]\s*\}/g;
    // Pattern 2: rules THEN name  
    const rulesFirstPattern = /rules=\{\s*\[([\s\S]*?)\]\s*\}[\s\S]{1,800}?name=["'](\w+)["']/g;
    let match;
    let matchCount = 0;

    // Process name-first pattern
    while ((match = nameFirstPattern.exec(sourceCode)) !== null) {
      matchCount++;
      const fieldName = match[1];
      const rulesStr = match[2];
      
      this.logger.debug(`[RulesArray] Match ${matchCount} (name-first): field="${fieldName}" (rules length: ${rulesStr.length})`);
      this.extractRulesFromString(fieldName, rulesStr, validations);
    }

    // Process rules-first pattern
    while ((match = rulesFirstPattern.exec(sourceCode)) !== null) {
      matchCount++;
      const rulesStr = match[1];
      const fieldName = match[2];
      
      this.logger.debug(`[RulesArray] Match ${matchCount} (rules-first): field="${fieldName}" (rules length: ${rulesStr.length})`);
      this.extractRulesFromString(fieldName, rulesStr, validations);
    }

    this.logger.log(`[RulesArray] Total matches: ${matchCount}, Total validations: ${validations.length}`);
    return validations;
  }

  /**
   * Extract validation rules from rules string
   */
  private extractRulesFromString(
    fieldName: string,
    rulesStr: string,
    validations: FieldValidation[]
  ): void {
    this.logger.debug(`[RulesArray] Rules preview: ${rulesStr.substring(0, 100).replace(/\n/g, ' ')}...`);

      const rules: ValidationRule[] = [];

      // Parse required
      if (/required:\s*true/.test(rulesStr)) {
        const messageMatch = rulesStr.match(/message:\s*[<"']([^<>"']+)["'>]/);
        rules.push({
          type: 'required',
          field: fieldName,
          errorMessage: messageMatch ? messageMatch[1] : 'This field is required',
        });
        this.logger.debug(`[RulesArray] Added required rule for ${fieldName}`);
      }

      // Parse whitespace (trim validation)
      if (/whitespace:\s*true/.test(rulesStr)) {
        rules.push({
          type: 'custom',
          field: fieldName,
          errorMessage: 'This field cannot be only whitespace',
        });
      }

      // Parse min/max length
      const minMatch = rulesStr.match(/min:\s*(\d+)/);
      if (minMatch) {
        const messageMatch = rulesStr.match(/message:\s*["']([^"']+)["']/);
        rules.push({
          type: 'minLength',
          field: fieldName,
          value: parseInt(minMatch[1]),
          errorMessage: messageMatch ? messageMatch[1] : `Minimum length is ${minMatch[1]}`,
        });
      }

      const maxMatch = rulesStr.match(/max:\s*(\d+)/);
      if (maxMatch) {
        const messageMatch = rulesStr.match(/message:\s*["']([^"']+)["']/);
        rules.push({
          type: 'maxLength',
          field: fieldName,
          value: parseInt(maxMatch[1]),
          errorMessage: messageMatch ? messageMatch[1] : `Maximum length is ${maxMatch[1]}`,
        });
      }

      // Parse pattern
      const patternMatch = rulesStr.match(/pattern:\s*\/(.+?)\//);  
      if (patternMatch) {
        const messageMatch = rulesStr.match(/message:\s*["']([^"']+)["']/);
        const rule: ValidationRule = {
          type: 'pattern',
          field: fieldName,
          pattern: `/${patternMatch[1]}/`,
          errorMessage: messageMatch ? messageMatch[1] : 'Invalid format',
        };
        
        // Check if it's email validation
        if (patternMatch[1].includes('@') || (messageMatch && messageMatch[1].toLowerCase().includes('email'))) {
          rule.type = 'email';
        }
        
        rules.push(rule);
      }

      // Parse type: email
      if (/type:\s*["']email["']/.test(rulesStr)) {
        rules.push({
          type: 'email',
          field: fieldName,
          errorMessage: 'Invalid email address',
        });
      }

      if (rules.length > 0) {
        this.logger.debug(`[RulesArray] Added validation for ${fieldName}: ${rules.length} rules`);
        validations.push({ fieldName, rules });
      } else {
        this.logger.debug(`[RulesArray] No rules parsed for ${fieldName}`);
      }
  }

  /**
   * Check if component is input-like based on name and props
   */
  private isInputComponent(componentName: string, propsStr: string): boolean {
    // Check component name
    const inputNamePattern = /Input|Field|Text|Form/i;
    if (inputNamePattern.test(componentName)) {
      return true;
    }

    // Check if it has input-like props
    const hasInputProps = /name=["']|rules=\{|type=["'](?:text|password|email|number)/.test(propsStr);
    return hasInputProps;
  }

  /**
   * Extract HTML5 validation attributes
   */
  private extractHTML5Validations(sourceCode: string): FieldValidation[] {
    const validations: FieldValidation[] = [];

    // Pattern: <input ... required ... />
    const requiredPattern =
      /<input[^>]*(?:name|data-testid)=["'](\w+)["'][^>]*required[^>]*>/g;
    let match;

    while ((match = requiredPattern.exec(sourceCode)) !== null) {
      const fieldName = match[1];
      validations.push({
        fieldName,
        rules: [
          {
            type: 'required',
            field: fieldName,
            errorMessage: 'This field is required',
          },
        ],
      });
    }

    // Pattern: <input type="email" ... />
    const emailPattern =
      /<input[^>]*type=["']email["'][^>]*(?:name|data-testid)=["'](\w+)["'][^>]*>/g;
    while ((match = emailPattern.exec(sourceCode)) !== null) {
      const fieldName = match[1];
      const existing = validations.find((v) => v.fieldName === fieldName);
      const rule: ValidationRule = {
        type: 'email',
        field: fieldName,
        errorMessage: 'Invalid email address',
      };

      if (existing) {
        existing.rules.push(rule);
      } else {
        validations.push({ fieldName, rules: [rule] });
      }
    }

    return validations;
  }

  /**
   * Merge validations for the same field
   */
  private mergeValidations(validations: FieldValidation[]): FieldValidation[] {
    const merged = new Map<string, FieldValidation>();

    for (const validation of validations) {
      if (merged.has(validation.fieldName)) {
        const existing = merged.get(validation.fieldName)!;
        existing.rules.push(...validation.rules);
      } else {
        merged.set(validation.fieldName, validation);
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Find error element selector for a field
   */
  findErrorSelector(sourceCode: string, fieldName: string): string | undefined {
    // Pattern: {errors?.field && <span data-testid="field-error">
    const pattern = new RegExp(
      `errors\\?\\.${fieldName}.*?data-testid=["']([^"']+)["']`,
      's',
    );
    const match = sourceCode.match(pattern);
    return match ? `[data-testid="${match[1]}"]` : undefined;
  }
}

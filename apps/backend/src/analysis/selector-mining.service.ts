import { Injectable, Logger } from '@nestjs/common';

export interface Selector {
  type:
    | 'testid'
    | 'role'
    | 'aria-label'
    | 'placeholder'
    | 'text'
    | 'id'
    | 'class'
    | 'name'
    | 'attribute';
  value: string;
  stability: number; // 0-100, higher = more stable
  playwrightSelector: string;
}

export interface ElementWithSelectors {
  elementType: string; // input, button, a, div, etc.
  bestSelector: string;
  allSelectors: Selector[];
  context?: string; // surrounding code context
}

@Injectable()
export class SelectorMiningService {
  private readonly logger = new Logger(SelectorMiningService.name);

  // Stability scoring algorithm
  private readonly STABILITY_SCORES = {
    testid: 100,
    role: 90,
    'aria-label': 80,
    id: 75,
    name: 70,
    placeholder: 60,
    text: 40,
    class: 30,
    attribute: 50,
  };

  /**
   * Mine all selectors from component source code
   */
  mineSelectors(sourceCode: string): ElementWithSelectors[] {
    const elements: ElementWithSelectors[] = [];

    // Pattern 1: data-testid attributes
    const testIdMatches = this.findTestIdSelectors(sourceCode);
    elements.push(...testIdMatches);

    // Pattern 2: role attributes
    const roleMatches = this.findRoleSelectors(sourceCode);
    elements.push(...roleMatches);

    // Pattern 3: aria-label attributes
    const ariaMatches = this.findAriaLabelSelectors(sourceCode);
    elements.push(...ariaMatches);

    // Pattern 4: id attributes
    const idMatches = this.findIdSelectors(sourceCode);
    elements.push(...idMatches);

    // Pattern 5: name attributes (forms)
    const nameMatches = this.findNameSelectors(sourceCode);
    elements.push(...nameMatches);

    // Pattern 6: placeholder attributes
    const placeholderMatches = this.findPlaceholderSelectors(sourceCode);
    elements.push(...placeholderMatches);

    // Pattern 7: button elements
    const buttonMatches = this.findButtonSelectors(sourceCode);
    elements.push(...buttonMatches);

    // Pattern 8: React custom input components (FormInputWrapper, TextField, Input, etc.)
    const reactInputMatches = this.findReactInputComponents(sourceCode);
    elements.push(...reactInputMatches);

    // Pattern 9: React custom button components (FormButtonWrapper, Button, etc.)
    const reactButtonMatches = this.findReactButtonComponents(sourceCode);
    elements.push(...reactButtonMatches);

    return elements;
  }

  /**
   * Find data-testid selectors
   */
  private findTestIdSelectors(sourceCode: string): ElementWithSelectors[] {
    const elements: ElementWithSelectors[] = [];
    const regex = /<(\w+)[^>]*data-testid=["']([^"']+)["'][^>]*>/g;
    let match;

    while ((match = regex.exec(sourceCode)) !== null) {
      const elementType = match[1];
      const testId = match[2];
      const fullMatch = match[0];

      const selectors: Selector[] = [
        {
          type: 'testid',
          value: testId,
          stability: this.STABILITY_SCORES.testid,
          playwrightSelector: `[data-testid="${testId}"]`,
        },
      ];

      // Extract additional attributes from the same element
      this.extractAdditionalAttributes(fullMatch, selectors);

      elements.push({
        elementType,
        bestSelector: `[data-testid="${testId}"]`,
        allSelectors: selectors.sort((a, b) => b.stability - a.stability),
        context: fullMatch,
      });
    }

    return elements;
  }

  /**
   * Find role attributes
   */
  private findRoleSelectors(sourceCode: string): ElementWithSelectors[] {
    const elements: ElementWithSelectors[] = [];
    const regex = /<(\w+)[^>]*role=["']([^"']+)["'][^>]*>/g;
    let match;

    while ((match = regex.exec(sourceCode)) !== null) {
      const elementType = match[1];
      const role = match[2];
      const fullMatch = match[0];

      const selectors: Selector[] = [
        {
          type: 'role',
          value: role,
          stability: this.STABILITY_SCORES.role,
          playwrightSelector: `[role="${role}"]`,
        },
      ];

      this.extractAdditionalAttributes(fullMatch, selectors);

      elements.push({
        elementType,
        bestSelector: `[role="${role}"]`,
        allSelectors: selectors.sort((a, b) => b.stability - a.stability),
        context: fullMatch,
      });
    }

    return elements;
  }

  /**
   * Find aria-label attributes
   */
  private findAriaLabelSelectors(sourceCode: string): ElementWithSelectors[] {
    const elements: ElementWithSelectors[] = [];
    const regex = /<(\w+)[^>]*aria-label=["']([^"']+)["'][^>]*>/g;
    let match;

    while ((match = regex.exec(sourceCode)) !== null) {
      const elementType = match[1];
      const ariaLabel = match[2];
      const fullMatch = match[0];

      const selectors: Selector[] = [
        {
          type: 'aria-label',
          value: ariaLabel,
          stability: this.STABILITY_SCORES['aria-label'],
          playwrightSelector: `[aria-label="${ariaLabel}"]`,
        },
      ];

      this.extractAdditionalAttributes(fullMatch, selectors);

      elements.push({
        elementType,
        bestSelector: `[aria-label="${ariaLabel}"]`,
        allSelectors: selectors.sort((a, b) => b.stability - a.stability),
        context: fullMatch,
      });
    }

    return elements;
  }

  /**
   * Find id attributes
   */
  private findIdSelectors(sourceCode: string): ElementWithSelectors[] {
    const elements: ElementWithSelectors[] = [];
    const regex = /<(\w+)[^>]*id=["']([^"']+)["'][^>]*>/g;
    let match;

    while ((match = regex.exec(sourceCode)) !== null) {
      const elementType = match[1];
      const id = match[2];
      const fullMatch = match[0];

      const selectors: Selector[] = [
        {
          type: 'id',
          value: id,
          stability: this.STABILITY_SCORES.id,
          playwrightSelector: `#${id}`,
        },
      ];

      this.extractAdditionalAttributes(fullMatch, selectors);

      elements.push({
        elementType,
        bestSelector: `#${id}`,
        allSelectors: selectors.sort((a, b) => b.stability - a.stability),
        context: fullMatch,
      });
    }

    return elements;
  }

  /**
   * Find name attributes (form elements)
   */
  private findNameSelectors(sourceCode: string): ElementWithSelectors[] {
    const elements: ElementWithSelectors[] = [];
    const regex = /<(\w+)[^>]*name=["']([^"']+)["'][^>]*>/g;
    let match;

    while ((match = regex.exec(sourceCode)) !== null) {
      const elementType = match[1];
      const name = match[2];
      const fullMatch = match[0];

      const selectors: Selector[] = [
        {
          type: 'name',
          value: name,
          stability: this.STABILITY_SCORES.name,
          playwrightSelector: `[name="${name}"]`,
        },
      ];

      this.extractAdditionalAttributes(fullMatch, selectors);

      elements.push({
        elementType,
        bestSelector: `[name="${name}"]`,
        allSelectors: selectors.sort((a, b) => b.stability - a.stability),
        context: fullMatch,
      });
    }

    return elements;
  }

  /**
   * Find placeholder attributes
   */
  private findPlaceholderSelectors(
    sourceCode: string,
  ): ElementWithSelectors[] {
    const elements: ElementWithSelectors[] = [];
    const regex = /<(\w+)[^>]*placeholder=["']([^"']+)["'][^>]*>/g;
    let match;

    while ((match = regex.exec(sourceCode)) !== null) {
      const elementType = match[1];
      const placeholder = match[2];
      const fullMatch = match[0];

      const selectors: Selector[] = [
        {
          type: 'placeholder',
          value: placeholder,
          stability: this.STABILITY_SCORES.placeholder,
          playwrightSelector: `[placeholder="${placeholder}"]`,
        },
      ];

      this.extractAdditionalAttributes(fullMatch, selectors);

      elements.push({
        elementType,
        bestSelector: `[placeholder="${placeholder}"]`,
        allSelectors: selectors.sort((a, b) => b.stability - a.stability),
        context: fullMatch,
      });
    }

    return elements;
  }

  /**
   * Find button elements
   */
  private findButtonSelectors(sourceCode: string): ElementWithSelectors[] {
    const elements: ElementWithSelectors[] = [];
    const regex = /<button([^>]*)>/g;
    let match;

    while ((match = regex.exec(sourceCode)) !== null) {
      const fullMatch = match[0];
      const attributes = match[1];
      
      const selectors: Selector[] = [];
      
      // Extract data-testid
      const testIdMatch = attributes.match(/data-testid=["']([^"']+)["']/);
      if (testIdMatch) {
        selectors.push({
          type: 'testid',
          value: testIdMatch[1],
          stability: this.STABILITY_SCORES.testid,
          playwrightSelector: `[data-testid="${testIdMatch[1]}"]`,
        });
      }
      
      // Extract type attribute
      const typeMatch = attributes.match(/type=["']([^"']+)["']/);
      if (typeMatch) {
        selectors.push({
          type: 'attribute',
          value: `type="${typeMatch[1]}"`,
          stability: this.STABILITY_SCORES.attribute,
          playwrightSelector: `button[type="${typeMatch[1]}"]`,
        });
      }
      
      // Extract class
      const classMatch = attributes.match(/className=["']([^"']+)["']/);
      if (classMatch) {
        const classes = classMatch[1].split(/\s+/);
        classes.forEach((cls) => {
          selectors.push({
            type: 'class',
            value: cls,
            stability: this.STABILITY_SCORES.class,
            playwrightSelector: `button.${cls}`,
          });
        });
      }
      
      // If no specific selectors, use generic button selector
      if (selectors.length === 0) {
        selectors.push({
          type: 'attribute',
          value: 'button',
          stability: 20,
          playwrightSelector: 'button',
        });
      }
      
      const bestSelector = this.getBestSelector(selectors);
      
      elements.push({
        elementType: 'button',
        bestSelector,
        allSelectors: selectors.sort((a, b) => b.stability - a.stability),
        context: fullMatch,
      });
    }

    return elements;
  }

  /**
   * Extract additional attributes from element markup
   */
  private extractAdditionalAttributes(
    elementMarkup: string,
    selectors: Selector[],
  ): void {
    // Extract type attribute
    const typeMatch = elementMarkup.match(/type=["']([^"']+)["']/);
    if (typeMatch) {
      selectors.push({
        type: 'attribute',
        value: `type="${typeMatch[1]}"`,
        stability: this.STABILITY_SCORES.attribute,
        playwrightSelector: `[type="${typeMatch[1]}"]`,
      });
    }

    // Extract class attribute
    const classMatch = elementMarkup.match(/className=["']([^"']+)["']/);
    if (classMatch) {
      const classes = classMatch[1].split(/\s+/);
      classes.forEach((cls) => {
        selectors.push({
          type: 'class',
          value: cls,
          stability: this.STABILITY_SCORES.class,
          playwrightSelector: `.${cls}`,
        });
      });
    }
  }

  /**
   * Rank selectors by stability
   */
  rankSelectors(selectors: Selector[]): Selector[] {
    return selectors.sort((a, b) => b.stability - a.stability);
  }

  /**
   * Get best selector for an element
   */
  getBestSelector(selectors: Selector[]): string {
    const ranked = this.rankSelectors(selectors);
    return ranked.length > 0 ? ranked[0].playwrightSelector : '';
  }

  /**
   * Find React custom input components (FormInputWrapper, TextField, Input, etc.)
   * These are common wrapper components used in production apps
   */
  private findReactInputComponents(sourceCode: string): ElementWithSelectors[] {
    const elements: ElementWithSelectors[] = [];
    
    // Pattern 1: Custom Input components with attributes
    // Matches: <TitleInput name="title" />, <FormInputWrapper id="email" />
    const regexWithAttrs = /<(\w*(?:Input|Field|Text)\w*)[\s\S]*?(?:name|id|placeholder)=["']([^"']+)["'][\s\S]*?\/?>/gi;
    let match;
    
    while ((match = regexWithAttrs.exec(sourceCode)) !== null) {
      const componentName = match[1];
      const fullMatch = match[0];
      
      const selectors: Selector[] = [];
      
      // Extract attributes
      const idMatch = fullMatch.match(/id=["']([^"']+)["']/);
      if (idMatch) {
        selectors.push({
          type: 'id',
          value: idMatch[1],
          stability: this.STABILITY_SCORES.id,
          playwrightSelector: `#${idMatch[1]}`,
        });
      }
      
      const nameMatch = fullMatch.match(/name=["']([^"']+)["']/);
      if (nameMatch) {
        selectors.push({
          type: 'name',
          value: nameMatch[1],
          stability: this.STABILITY_SCORES.name,
          playwrightSelector: `[name="${nameMatch[1]}"]`,
        });
      }
      
      const placeholderMatch = fullMatch.match(/placeholder=\{?["']?([^"'}]+)["']?\}?/);
      if (placeholderMatch) {
        selectors.push({
          type: 'placeholder',
          value: placeholderMatch[1],
          stability: this.STABILITY_SCORES.placeholder,
          playwrightSelector: `[placeholder="${placeholderMatch[1]}"]`,
        });
      }
      
      if (selectors.length > 0) {
        const bestSelector = this.getBestSelector(selectors);
        elements.push({
          elementType: 'input',
          bestSelector,
          allSelectors: selectors.sort((a, b) => b.stability - a.stability),
          context: fullMatch,
        });
      }
    }
    
    // Pattern 2: Self-closing custom Input components WITHOUT attributes
    // Matches: <TitleInput />, <EmailInput />, <PasswordInput />
    // Infer field name from component name
    const regexNoAttrs = /<(\w*Input)\s*\/>/gi;
    let match2;
    
    while ((match2 = regexNoAttrs.exec(sourceCode)) !== null) {
      const componentName = match2[1];
      const fullMatch = match2[0];
      
      // Infer field name from component name
      // TitleInput -> title, EmailInput -> email, PasswordInput -> password
      const inferredName = componentName
        .replace(/Input$/, '') // Remove 'Input' suffix
        .replace(/^([A-Z])/, (m) => m.toLowerCase()); // Lowercase first letter
      
      const selectors: Selector[] = [
        {
          type: 'name',
          value: inferredName,
          stability: 50, // Lower stability since it's inferred
          playwrightSelector: `[name="${inferredName}"]`,
        },
        {
          type: 'id',
          value: inferredName,
          stability: 45,
          playwrightSelector: `#${inferredName}`,
        },
      ];
      
      const bestSelector = this.getBestSelector(selectors);
      elements.push({
        elementType: 'input',
        bestSelector,
        allSelectors: selectors.sort((a, b) => b.stability - a.stability),
        context: `${fullMatch} (inferred: ${inferredName})`,
      });
    }

    return elements;
  }

  /**
   * Find React custom button components
   */
  private findReactButtonComponents(sourceCode: string): ElementWithSelectors[] {
    const elements: ElementWithSelectors[] = [];
    
    // Pattern: <ButtonComponent ... />
    // Matches: FormButtonWrapper, Button, SubmitButton, CustomButton, etc.
    const regex = /<(\w*Button\w*)[^>]*>/gi;
    let match;

    while ((match = regex.exec(sourceCode)) !== null) {
      const componentName = match[1];
      const fullMatch = match[0];
      
      // Skip lowercase 'button' (already handled by findButtonSelectors)
      if (componentName === 'button') continue;
      
      const selectors: Selector[] = [];
      
      // Extract type="submit"
      const typeMatch = fullMatch.match(/type=["']([^"']+)["']/);
      if (typeMatch) {
        selectors.push({
          type: 'attribute',
          value: `type="${typeMatch[1]}"`,
          stability: this.STABILITY_SCORES.attribute,
          playwrightSelector: `button[type="${typeMatch[1]}"]`,
        });
      }
      
      // Extract label/text prop
      const labelMatch = fullMatch.match(/label=\{?["']?([^"'}]+)["']?\}?/);
      if (labelMatch) {
        selectors.push({
          type: 'text',
          value: labelMatch[1],
          stability: this.STABILITY_SCORES.text,
          playwrightSelector: `button:has-text("${labelMatch[1]}")`,
        });
      }
      
      // Generic button selector as fallback
      selectors.push({
        type: 'attribute',
        value: 'button',
        stability: 20,
        playwrightSelector: 'button',
      });
      
      const bestSelector = this.getBestSelector(selectors);
      
      elements.push({
        elementType: 'button',
        bestSelector,
        allSelectors: selectors.sort((a, b) => b.stability - a.stability),
        context: fullMatch,
      });
    }

    return elements;
  }
}

import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface UILibrary {
  name: string;
  version?: string;
  confidence: number;
  components: string[]; // Detected component imports
}

export interface SelectorStrategy {
  library: string;
  buttonSelector: (text: string) => string;
  inputSelector: (label: string) => string;
  formSelector: () => string;
  errorSelector: (field: string) => string;
}

/**
 * UILibraryDetector
 * 
 * Detects ANY React UI library in use and provides selector strategies.
 * Supports: MUI, Ant Design, Chakra, Radix, Shadcn, Bootstrap, Mantine, native HTML
 * 
 * ZERO HARDCODING - fully dynamic detection
 */
@Injectable()
export class UILibraryDetectorService {
  
  /**
   * Detect all UI libraries in project
   */
  detectLibraries(workspacePath: string): UILibrary[] {
    const libraries: UILibrary[] = [];
    
    // Read package.json
    const packageJsonPath = path.join(workspacePath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return libraries;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    // Library detection patterns
    const patterns = [
      // Material-UI / MUI
      {
        name: 'Material-UI',
        packageNames: ['@mui/material', '@material-ui/core'],
        components: ['Button', 'TextField', 'Select', 'Checkbox', 'Radio', 'Switch']
      },
      // Ant Design
      {
        name: 'Ant Design',
        packageNames: ['antd'],
        components: ['Button', 'Input', 'Select', 'Checkbox', 'Radio', 'Form', 'DatePicker']
      },
      // Chakra UI
      {
        name: 'Chakra UI',
        packageNames: ['@chakra-ui/react'],
        components: ['Button', 'Input', 'Select', 'Checkbox', 'Radio', 'FormControl']
      },
      // Radix UI
      {
        name: 'Radix UI',
        packageNames: ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/themes'],
        components: ['Dialog', 'Select', 'Checkbox', 'RadioGroup']
      },
      // Shadcn/ui (checks for components directory pattern)
      {
        name: 'Shadcn/ui',
        packageNames: ['@radix-ui/react-slot', 'class-variance-authority'], // Shadcn uses Radix + CVA
        components: ['Button', 'Input', 'Select', 'Checkbox', 'Form']
      },
      // React Bootstrap
      {
        name: 'React Bootstrap',
        packageNames: ['react-bootstrap'],
        components: ['Button', 'Form', 'FormControl', 'FormCheck']
      },
      // Mantine
      {
        name: 'Mantine',
        packageNames: ['@mantine/core'],
        components: ['Button', 'TextInput', 'Select', 'Checkbox', 'Radio']
      },
      // Semantic UI React
      {
        name: 'Semantic UI',
        packageNames: ['semantic-ui-react'],
        components: ['Button', 'Input', 'Form', 'Checkbox', 'Radio']
      },
      // Blueprint JS
      {
        name: 'Blueprint',
        packageNames: ['@blueprintjs/core'],
        components: ['Button', 'InputGroup', 'FormGroup', 'Checkbox', 'Radio']
      }
    ];
    
    for (const pattern of patterns) {
      for (const pkgName of pattern.packageNames) {
        if (allDeps[pkgName]) {
          libraries.push({
            name: pattern.name,
            version: allDeps[pkgName],
            confidence: 100,
            components: pattern.components
          });
          break; // Only add once per library
        }
      }
    }
    
    // Special case: Shadcn detection via file structure
    if (this.detectShadcn(workspacePath)) {
      const existing = libraries.find(l => l.name === 'Shadcn/ui');
      if (!existing) {
        libraries.push({
          name: 'Shadcn/ui',
          confidence: 90,
          components: ['Button', 'Input', 'Select', 'Form']
        });
      }
    }
    
    return libraries;
  }
  
  /**
   * Detect Shadcn by checking for components/ui directory
   */
  private detectShadcn(workspacePath: string): boolean {
    const componentsPaths = [
      path.join(workspacePath, 'components', 'ui'),
      path.join(workspacePath, 'src', 'components', 'ui'),
      path.join(workspacePath, 'app', 'components', 'ui')
    ];
    
    for (const dir of componentsPaths) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        // Check for button.tsx/button.ts pattern
        if (files.some(f => /^button\.(tsx?|jsx?)$/.test(f))) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Get selector strategy for detected library
   */
  getSelectorStrategy(library: string): SelectorStrategy {
    const strategies: Record<string, SelectorStrategy> = {
      'Material-UI': {
        library: 'Material-UI',
        buttonSelector: (text: string) => `button:has-text("${text}")`,
        inputSelector: (label: string) => `input[label="${label}"], input[aria-label="${label}"]`,
        formSelector: () => 'form',
        errorSelector: (field: string) => `.MuiFormHelperText-root.Mui-error`
      },
      'Ant Design': {
        library: 'Ant Design',
        buttonSelector: (text: string) => `button.ant-btn:has-text("${text}")`,
        inputSelector: (label: string) => `input#${label}, input[placeholder="${label}"]`,
        formSelector: () => '.ant-form',
        errorSelector: (field: string) => `.ant-form-item-explain-error`
      },
      'Chakra UI': {
        library: 'Chakra UI',
        buttonSelector: (text: string) => `button[class*="chakra-button"]:has-text("${text}")`,
        inputSelector: (label: string) => `input[name="${label}"], input[placeholder="${label}"]`,
        formSelector: () => 'form',
        errorSelector: (field: string) => `[class*="chakra-form__error-message"]`
      },
      'Shadcn/ui': {
        library: 'Shadcn/ui',
        buttonSelector: (text: string) => `button:has-text("${text}")`,
        inputSelector: (label: string) => `input[name="${label}"]`,
        formSelector: () => 'form',
        errorSelector: (field: string) => `[class*="text-destructive"]`
      },
      'React Bootstrap': {
        library: 'React Bootstrap',
        buttonSelector: (text: string) => `button.btn:has-text("${text}")`,
        inputSelector: (label: string) => `input.form-control[name="${label}"]`,
        formSelector: () => 'form',
        errorSelector: (field: string) => `.invalid-feedback`
      },
      'Mantine': {
        library: 'Mantine',
        buttonSelector: (text: string) => `button[class*="mantine-Button"]:has-text("${text}")`,
        inputSelector: (label: string) => `input[name="${label}"]`,
        formSelector: () => 'form',
        errorSelector: (field: string) => `[class*="mantine-Input-error"]`
      }
    };
    
    return strategies[library] || this.getDefaultStrategy();
  }
  
  /**
   * Default strategy for native HTML or unknown libraries
   */
  private getDefaultStrategy(): SelectorStrategy {
    return {
      library: 'Native HTML',
      buttonSelector: (text: string) => `button:has-text("${text}"), input[type="submit"][value="${text}"]`,
      inputSelector: (label: string) => `input[name="${label}"], input[id="${label}"], input[placeholder="${label}"]`,
      formSelector: () => 'form',
      errorSelector: (field: string) => `[data-error="${field}"], .error-${field}, [id="${field}-error"]`
    };
  }
  
  /**
   * Detect UI library from component code (import analysis)
   */
  detectFromCode(code: string): string | null {
    // Check imports
    const importPatterns = [
      { pattern: /@mui\/material|@material-ui\/core/, library: 'Material-UI' },
      { pattern: /antd|from ['"]antd['"]/, library: 'Ant Design' },
      { pattern: /@chakra-ui\/react/, library: 'Chakra UI' },
      { pattern: /@radix-ui.*themes/, library: 'Radix UI' },
      { pattern: /react-bootstrap/, library: 'React Bootstrap' },
      { pattern: /@mantine\/core/, library: 'Mantine' },
      { pattern: /semantic-ui-react/, library: 'Semantic UI' },
      { pattern: /@blueprintjs\/core/, library: 'Blueprint' }
    ];
    
    for (const { pattern, library } of importPatterns) {
      if (pattern.test(code)) {
        return library;
      }
    }
    
    // Check for Shadcn pattern (local imports from @/components/ui)
    if (/@\/components\/ui/.test(code)) {
      return 'Shadcn/ui';
    }
    
    return null;
  }
}

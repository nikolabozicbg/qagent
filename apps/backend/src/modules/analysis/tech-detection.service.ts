import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Fast Technology Detection Service
 * 
 * Quickly detects project type, frameworks, and tech stack
 * without doing full code analysis. Target: < 3 seconds
 */

export interface TechDetectionResult {
  projectType: 'react-frontend' | 'vue-frontend' | 'angular-frontend' | 'next-fullstack' | 'node-backend' | 'python-backend' | 'monorepo' | 'unknown';
  framework: string | null;
  frameworkVersion: string | null;
  uiLibrary: string | null;
  uiLibraryVersion: string | null;
  stateManagement: string | null;
  testingFrameworks: string[];
  language: 'typescript' | 'javascript' | 'python' | 'unknown';
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'unknown';
  features: string[];  // Detected features like 'authentication', 'forms', 'crud'
  recommendedTestTypes: string[];
  detectionTime: number;
}

@Injectable()
export class TechDetectionService {
  
  /**
   * Fast tech stack detection - reads only package.json and key config files
   */
  async detectTechStack(workspacePath: string): Promise<TechDetectionResult> {
    const startTime = Date.now();
    
    const result: TechDetectionResult = {
      projectType: 'unknown',
      framework: null,
      frameworkVersion: null,
      uiLibrary: null,
      uiLibraryVersion: null,
      stateManagement: null,
      testingFrameworks: [],
      language: 'unknown',
      packageManager: 'unknown',
      features: [],
      recommendedTestTypes: [],
      detectionTime: 0
    };
    
    // Check package.json
    const packageJsonPath = path.join(workspacePath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      this.analyzePackageJson(packageJson, result);
    }
    
    // Check for Python project
    const requirementsPath = path.join(workspacePath, 'requirements.txt');
    const pyprojectPath = path.join(workspacePath, 'pyproject.toml');
    if (fs.existsSync(requirementsPath) || fs.existsSync(pyprojectPath)) {
      result.projectType = 'python-backend';
      result.language = 'python';
      result.recommendedTestTypes = ['API Tests', 'Unit Tests', 'Integration Tests'];
    }
    
    // Detect language from files
    this.detectLanguage(workspacePath, result);
    
    // Detect package manager
    this.detectPackageManager(workspacePath, result);
    
    // Detect features from folder structure
    this.detectFeatures(workspacePath, result);
    
    // Set recommended test types based on project type
    this.setRecommendedTestTypes(result);
    
    result.detectionTime = Date.now() - startTime;
    
    return result;
  }
  
  /**
   * Extract clean version number from semver string
   */
  private extractVersion(version: string | undefined): string | null {
    if (!version) return null;
    // Remove ^, ~, >=, etc. and get clean version
    const match = version.match(/(\d+\.\d+(?:\.\d+)?)/);
    return match ? match[1] : null;
  }
  
  private analyzePackageJson(packageJson: any, result: TechDetectionResult): void {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Detect framework
    if (deps['react'] || deps['react-dom']) {
      result.projectType = 'react-frontend';
      result.framework = 'React';
      result.frameworkVersion = this.extractVersion(deps['react'] || deps['react-dom']);
      if (deps['next']) {
        result.projectType = 'next-fullstack';
        result.framework = 'Next.js';
        result.frameworkVersion = this.extractVersion(deps['next']);
      }
    } else if (deps['vue']) {
      result.projectType = 'vue-frontend';
      result.framework = 'Vue';
      result.frameworkVersion = this.extractVersion(deps['vue']);
      if (deps['nuxt']) {
        result.framework = 'Nuxt';
        result.frameworkVersion = this.extractVersion(deps['nuxt']);
      }
    } else if (deps['@angular/core']) {
      result.projectType = 'angular-frontend';
      result.framework = 'Angular';
      result.frameworkVersion = this.extractVersion(deps['@angular/core']);
    } else if (deps['express'] || deps['fastify'] || deps['@nestjs/core'] || deps['koa']) {
      result.projectType = 'node-backend';
      result.framework = deps['@nestjs/core'] ? 'NestJS' : 
                         deps['express'] ? 'Express' :
                         deps['fastify'] ? 'Fastify' : 'Koa';
      result.frameworkVersion = this.extractVersion(
        deps['@nestjs/core'] || deps['express'] || deps['fastify'] || deps['koa']
      );
    }
    
    // Detect UI library
    if (deps['@mui/material'] || deps['@material-ui/core']) {
      result.uiLibrary = 'Material-UI';
      result.uiLibraryVersion = this.extractVersion(deps['@mui/material'] || deps['@material-ui/core']);
    } else if (deps['antd']) {
      result.uiLibrary = 'Ant Design';
      result.uiLibraryVersion = this.extractVersion(deps['antd']);
    } else if (deps['@chakra-ui/react']) {
      result.uiLibrary = 'Chakra UI';
      result.uiLibraryVersion = this.extractVersion(deps['@chakra-ui/react']);
    } else if (deps['tailwindcss']) {
      result.uiLibrary = 'Tailwind CSS';
      result.uiLibraryVersion = this.extractVersion(deps['tailwindcss']);
    } else if (deps['bootstrap'] || deps['react-bootstrap']) {
      result.uiLibrary = 'Bootstrap';
      result.uiLibraryVersion = this.extractVersion(deps['bootstrap'] || deps['react-bootstrap']);
    }
    
    // Detect state management
    if (deps['xstate'] || deps['@xstate/react']) {
      result.stateManagement = 'XState';
    } else if (deps['redux'] || deps['@reduxjs/toolkit']) {
      result.stateManagement = 'Redux';
    } else if (deps['mobx'] || deps['mobx-react']) {
      result.stateManagement = 'MobX';
    } else if (deps['zustand']) {
      result.stateManagement = 'Zustand';
    } else if (deps['recoil']) {
      result.stateManagement = 'Recoil';
    } else if (deps['redux-saga']) {
      result.stateManagement = 'Redux Saga';
    }
    
    // Detect testing frameworks
    if (deps['playwright'] || deps['@playwright/test']) {
      result.testingFrameworks.push('Playwright');
    }
    if (deps['cypress']) {
      result.testingFrameworks.push('Cypress');
    }
    if (deps['jest']) {
      result.testingFrameworks.push('Jest');
    }
    if (deps['vitest']) {
      result.testingFrameworks.push('Vitest');
    }
    if (deps['mocha']) {
      result.testingFrameworks.push('Mocha');
    }
    if (deps['@testing-library/react']) {
      result.testingFrameworks.push('React Testing Library');
    }
  }
  
  private detectLanguage(workspacePath: string, result: TechDetectionResult): void {
    const tsconfigPath = path.join(workspacePath, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      result.language = 'typescript';
      return;
    }
    
    // Check for .ts files in src or app
    const srcPath = path.join(workspacePath, 'src');
    const appPath = path.join(workspacePath, 'app');
    
    const checkDir = fs.existsSync(srcPath) ? srcPath : 
                     fs.existsSync(appPath) ? appPath : workspacePath;
    
    try {
      const files = fs.readdirSync(checkDir);
      if (files.some(f => f.endsWith('.ts') || f.endsWith('.tsx'))) {
        result.language = 'typescript';
      } else if (files.some(f => f.endsWith('.js') || f.endsWith('.jsx'))) {
        result.language = 'javascript';
      }
    } catch {
      // Ignore errors
    }
  }
  
  private detectPackageManager(workspacePath: string, result: TechDetectionResult): void {
    if (fs.existsSync(path.join(workspacePath, 'pnpm-lock.yaml'))) {
      result.packageManager = 'pnpm';
    } else if (fs.existsSync(path.join(workspacePath, 'yarn.lock'))) {
      result.packageManager = 'yarn';
    } else if (fs.existsSync(path.join(workspacePath, 'package-lock.json'))) {
      result.packageManager = 'npm';
    }
  }
  
  private detectFeatures(workspacePath: string, result: TechDetectionResult): void {
    const srcPath = fs.existsSync(path.join(workspacePath, 'src')) 
      ? path.join(workspacePath, 'src')
      : fs.existsSync(path.join(workspacePath, 'app'))
        ? path.join(workspacePath, 'app')
        : workspacePath;
    
    // Quick scan for common feature patterns
    const featurePatterns = [
      { pattern: /auth|login|signin|signup|register/i, feature: 'Authentication' },
      { pattern: /form|input|validation/i, feature: 'Forms' },
      { pattern: /crud|create|update|delete|edit/i, feature: 'CRUD Operations' },
      { pattern: /dashboard/i, feature: 'Dashboard' },
      { pattern: /api|fetch|axios|request/i, feature: 'API Integration' },
      { pattern: /route|navigation|nav/i, feature: 'Routing' },
      { pattern: /modal|dialog|popup/i, feature: 'Modals' },
      { pattern: /table|list|grid/i, feature: 'Data Tables' },
    ];
    
    try {
      const scanDir = (dir: string, depth = 0): void => {
        if (depth > 2) return; // Only scan 2 levels deep for speed
        
        const items = fs.readdirSync(dir);
        for (const item of items) {
          if (item.startsWith('.') || item === 'node_modules') continue;
          
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            // Check folder name against patterns
            for (const { pattern, feature } of featurePatterns) {
              if (pattern.test(item) && !result.features.includes(feature)) {
                result.features.push(feature);
              }
            }
            scanDir(fullPath, depth + 1);
          } else if (stat.isFile() && /\.(tsx?|jsx?|vue)$/.test(item)) {
            // Check file name against patterns
            for (const { pattern, feature } of featurePatterns) {
              if (pattern.test(item) && !result.features.includes(feature)) {
                result.features.push(feature);
              }
            }
          }
        }
      };
      
      scanDir(srcPath);
    } catch {
      // Ignore errors
    }
  }
  
  private setRecommendedTestTypes(result: TechDetectionResult): void {
    if (result.recommendedTestTypes.length > 0) return; // Already set
    
    switch (result.projectType) {
      case 'react-frontend':
      case 'vue-frontend':
      case 'angular-frontend':
        result.recommendedTestTypes = ['E2E Tests', 'Component Tests', 'Visual Regression'];
        if (result.features.includes('Forms')) {
          result.recommendedTestTypes.push('Form Validation Tests');
        }
        if (result.features.includes('Authentication')) {
          result.recommendedTestTypes.push('Auth Flow Tests');
        }
        break;
        
      case 'node-backend':
        result.recommendedTestTypes = ['API Tests', 'Integration Tests', 'Unit Tests'];
        break;
        
      case 'python-backend':
        result.recommendedTestTypes = ['API Tests', 'Unit Tests', 'Integration Tests'];
        break;
        
      default:
        result.recommendedTestTypes = ['E2E Tests', 'Unit Tests'];
    }
  }
}

import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

export interface DetectedFramework {
  name: string;
  version: string;
  configFile?: string;
}

export interface DetectedFrameworks {
  unit?: DetectedFramework;
  e2e?: DetectedFramework;
  component?: DetectedFramework;
}

@Injectable()
export class FrameworkDetectorService {
  /**
   * Detect test frameworks in the workspace
   */
  async detectFrameworks(workspacePath: string): Promise<DetectedFrameworks> {
    console.log(`🔍 Detecting test frameworks in: ${workspacePath}`);
    
    const packageJsonPath = path.join(workspacePath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      console.log('   ⚠️  No package.json found');
      return {};
    }
    
    let packageJson;
    try {
      const content = fs.readFileSync(packageJsonPath, 'utf-8');
      packageJson = JSON.parse(content);
    } catch (error) {
      console.error('   ❌ Failed to parse package.json:', error.message);
      console.error('   💡 Tip: Check for trailing commas or invalid JSON syntax');
      return {};
    }
    
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    const frameworks: DetectedFrameworks = {};
    
    // Detect unit testing frameworks
    const unitFramework = await this.detectUnitFramework(allDeps, workspacePath);
    if (unitFramework) {
      frameworks.unit = unitFramework;
      console.log(`   ✅ Unit: ${unitFramework.name} v${unitFramework.version}`);
    }
    
    // Detect E2E frameworks
    const e2eFramework = await this.detectE2EFramework(allDeps, workspacePath);
    if (e2eFramework) {
      frameworks.e2e = e2eFramework;
      console.log(`   ✅ E2E: ${e2eFramework.name} v${e2eFramework.version}`);
    }
    
    // Detect component testing libraries
    const componentFramework = this.detectComponentFramework(allDeps);
    if (componentFramework) {
      frameworks.component = componentFramework;
      console.log(`   ✅ Component: ${componentFramework.name} v${componentFramework.version}`);
    }
    
    if (Object.keys(frameworks).length === 0) {
      console.log('   ❌ No test frameworks detected');
    }
    
    return frameworks;
  }
  
  /**
   * Detect unit testing framework (Jest, Vitest, Mocha)
   */
  private async detectUnitFramework(
    deps: Record<string, string>,
    workspacePath: string
  ): Promise<DetectedFramework | null> {
    // Check Jest
    if (deps['jest'] || deps['@types/jest']) {
      const configFile = await this.findConfigFile(workspacePath, [
        'jest.config.js',
        'jest.config.ts',
        'jest.config.json'
      ]);
      
      return {
        name: 'jest',
        version: this.cleanVersion(deps['jest'] || deps['@types/jest']),
        configFile
      };
    }
    
    // Check Vitest
    if (deps['vitest']) {
      const configFile = await this.findConfigFile(workspacePath, [
        'vitest.config.ts',
        'vitest.config.js',
        'vite.config.ts' // Vitest can use vite config
      ]);
      
      return {
        name: 'vitest',
        version: this.cleanVersion(deps['vitest']),
        configFile
      };
    }
    
    // Check Mocha
    if (deps['mocha']) {
      const configFile = await this.findConfigFile(workspacePath, [
        '.mocharc.json',
        '.mocharc.js',
        'mocha.opts'
      ]);
      
      return {
        name: 'mocha',
        version: this.cleanVersion(deps['mocha']),
        configFile
      };
    }
    
    return null;
  }
  
  /**
   * Detect E2E testing framework (Playwright, Cypress, WebdriverIO)
   */
  private async detectE2EFramework(
    deps: Record<string, string>,
    workspacePath: string
  ): Promise<DetectedFramework | null> {
    // Check Playwright
    if (deps['@playwright/test'] || deps['playwright']) {
      const configFile = await this.findConfigFile(workspacePath, [
        'playwright.config.ts',
        'playwright.config.js'
      ]);
      
      return {
        name: 'playwright',
        version: this.cleanVersion(deps['@playwright/test'] || deps['playwright']),
        configFile
      };
    }
    
    // Check Cypress
    if (deps['cypress']) {
      const configFile = await this.findConfigFile(workspacePath, [
        'cypress.config.ts',
        'cypress.config.js',
        'cypress.json'
      ]);
      
      return {
        name: 'cypress',
        version: this.cleanVersion(deps['cypress']),
        configFile
      };
    }
    
    // Check WebdriverIO
    if (deps['webdriverio'] || deps['@wdio/cli']) {
      const configFile = await this.findConfigFile(workspacePath, [
        'wdio.conf.ts',
        'wdio.conf.js'
      ]);
      
      return {
        name: 'webdriverio',
        version: this.cleanVersion(deps['webdriverio'] || deps['@wdio/cli']),
        configFile
      };
    }
    
    return null;
  }
  
  /**
   * Detect component testing libraries (React Testing Library, Vue Test Utils)
   */
  private detectComponentFramework(deps: Record<string, string>): DetectedFramework | null {
    // Check React Testing Library
    if (deps['@testing-library/react']) {
      return {
        name: '@testing-library/react',
        version: this.cleanVersion(deps['@testing-library/react'])
      };
    }
    
    // Check Vue Test Utils
    if (deps['@vue/test-utils']) {
      return {
        name: '@vue/test-utils',
        version: this.cleanVersion(deps['@vue/test-utils'])
      };
    }
    
    // Check Angular Testing
    if (deps['@angular/core'] && deps['@angular/core'].includes('angular')) {
      return {
        name: '@angular/core/testing',
        version: this.cleanVersion(deps['@angular/core'])
      };
    }
    
    return null;
  }
  
  /**
   * Find config file in workspace
   */
  private async findConfigFile(
    workspacePath: string,
    configFileNames: string[]
  ): Promise<string | undefined> {
    for (const fileName of configFileNames) {
      const filePath = path.join(workspacePath, fileName);
      if (fs.existsSync(filePath)) {
        return fileName;
      }
    }
    
    return undefined;
  }
  
  /**
   * Clean version string (remove ^, ~, etc.)
   */
  private cleanVersion(version: string): string {
    return version.replace(/^[\^~>=<]/, '');
  }

  /**
   * Detect project stack from package.json dependencies
   */
  detectStack(packageJsonPath: string): string[] {
    if (!fs.existsSync(packageJsonPath)) {
      return [];
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    const stack: string[] = [];

    // Backend frameworks
    if (allDeps['@nestjs/core']) stack.push('NestJS');
    if (allDeps['express'] && !allDeps['@nestjs/core']) stack.push('Express');
    if (allDeps['fastify']) stack.push('Fastify');
    if (allDeps['koa']) stack.push('Koa');

    // Frontend frameworks
    if (allDeps['react']) stack.push('React');
    if (allDeps['vue']) stack.push('Vue');
    if (allDeps['@angular/core']) stack.push('Angular');
    if (allDeps['svelte']) stack.push('Svelte');

    // Meta frameworks
    if (allDeps['next']) stack.push('Next.js');
    if (allDeps['nuxt']) stack.push('Nuxt');
    if (allDeps['@remix-run/react']) stack.push('Remix');

    // Build tools
    if (allDeps['vite']) stack.push('Vite');
    if (allDeps['webpack']) stack.push('Webpack');

    // Language
    if (allDeps['typescript']) stack.push('TypeScript');

    return stack;
  }

  /**
   * Generate setup recommendations based on detected stack and existing frameworks
   */
  generateSetupRecommendations(
    stack: string[],
    existingFrameworks: DetectedFrameworks = {}
  ): {
    unit?: { name: string; packages: string[]; reason: string; status?: 'installed' | 'missing' };
    e2e?: { name: string; packages: string[]; reason: string; status?: 'installed' | 'missing' };
    component?: { name: string; packages: string[]; reason: string; status?: 'installed' | 'missing' };
    additionalPackages?: Array<{ name: string; packages: string[]; reason: string }>;
  } {
    const recommendations: any = {};
    const additionalPackages: Array<{ name: string; packages: string[]; reason: string }> = [];

    // NestJS - recommend Jest
    if (stack.includes('NestJS')) {
      // Check if Jest already exists
      if (existingFrameworks.unit?.name === 'jest') {
        recommendations.unit = {
          name: 'jest',
          packages: [],
          reason: 'Already installed ✅',
          status: 'installed'
        };
        
        // Suggest additional useful packages for NestJS + Jest
        additionalPackages.push({
          name: 'jest-mock-extended',
          packages: ['jest-mock-extended'],
          reason: 'Advanced mocking utilities for TypeScript (auto-mocking with type safety)'
        });
        additionalPackages.push({
          name: '@golevelup/ts-jest',
          packages: ['@golevelup/ts-jest'],
          reason: 'NestJS-specific testing utilities (auto-mock providers, spy decorators)'
        });
      } else {
        recommendations.unit = {
          name: 'jest',
          packages: ['jest', '@types/jest', 'ts-jest', '@nestjs/testing'],
          reason: 'Jest is the default testing framework for NestJS with built-in support',
          status: 'missing'
        };
      }
      
      // Check if Supertest exists
      if (existingFrameworks.e2e?.name === 'supertest') {
        recommendations.e2e = {
          name: 'supertest',
          packages: [],
          reason: 'Already installed ✅',
          status: 'installed'
        };
      } else {
        recommendations.e2e = {
          name: 'supertest',
          packages: ['supertest', '@types/supertest'],
          reason: 'Supertest is ideal for testing HTTP APIs in NestJS',
          status: 'missing'
        };
      }
      
      // Suggest E2E alternative
      if (!existingFrameworks.e2e) {
        additionalPackages.push({
          name: 'pactum',
          packages: ['pactum'],
          reason: 'Modern REST API testing tool with fluent syntax (alternative to Supertest)'
        });
      }
      
      // Coverage and reporting
      additionalPackages.push({
        name: 'jest-html-reporter',
        packages: ['jest-html-reporter'],
        reason: 'Generate beautiful HTML test reports'
      });
    }
    // Express/Fastify/Koa - recommend Jest + Supertest
    else if (stack.includes('Express') || stack.includes('Fastify') || stack.includes('Koa')) {
      recommendations.unit = {
        name: 'jest',
        packages: ['jest', '@types/jest', 'ts-jest'],
        reason: 'Jest is the most popular testing framework for Node.js'
      };
      recommendations.e2e = {
        name: 'supertest',
        packages: ['supertest', '@types/supertest'],
        reason: 'Supertest is perfect for testing Express APIs'
      };
    }
    // React with Vite - recommend Vitest
    else if (stack.includes('React') && stack.includes('Vite')) {
      recommendations.unit = {
        name: 'vitest',
        packages: ['vitest', '@vitest/ui'],
        reason: 'Vitest is 10x faster than Jest and built for Vite'
      };
      recommendations.component = {
        name: '@testing-library/react',
        packages: ['@testing-library/react', '@testing-library/jest-dom', '@testing-library/user-event'],
        reason: 'React Testing Library is the industry standard for React component testing'
      };
      recommendations.e2e = {
        name: 'playwright',
        packages: ['@playwright/test'],
        reason: 'Playwright is the best modern E2E testing framework'
      };
    }
    // React without Vite - recommend Jest
    else if (stack.includes('React')) {
      recommendations.unit = {
        name: 'jest',
        packages: ['jest', '@types/jest', 'ts-jest'],
        reason: 'Jest is the most popular testing framework for React'
      };
      recommendations.component = {
        name: '@testing-library/react',
        packages: ['@testing-library/react', '@testing-library/jest-dom'],
        reason: 'React Testing Library is the industry standard'
      };
      recommendations.e2e = {
        name: 'playwright',
        packages: ['@playwright/test'],
        reason: 'Playwright is the best modern E2E testing framework'
      };
    }
    // Vue - recommend Vitest
    else if (stack.includes('Vue')) {
      recommendations.unit = {
        name: 'vitest',
        packages: ['vitest', '@vitest/ui'],
        reason: 'Vitest is the recommended testing framework for Vue 3'
      };
      recommendations.component = {
        name: '@vue/test-utils',
        packages: ['@vue/test-utils'],
        reason: 'Official Vue testing utilities'
      };
      recommendations.e2e = {
        name: 'playwright',
        packages: ['@playwright/test'],
        reason: 'Playwright is recommended for Vue E2E testing'
      };
    }
    // Next.js - recommend Jest + Playwright
    else if (stack.includes('Next.js')) {
      recommendations.unit = {
        name: 'jest',
        packages: ['jest', '@types/jest', 'ts-jest'],
        reason: 'Jest is officially supported by Next.js'
      };
      recommendations.component = {
        name: '@testing-library/react',
        packages: ['@testing-library/react', '@testing-library/jest-dom'],
        reason: 'React Testing Library for Next.js components'
      };
      recommendations.e2e = {
        name: 'playwright',
        packages: ['@playwright/test'],
        reason: 'Playwright is recommended by Next.js for E2E testing'
      };
    }
    // Default fallback - recommend Jest
    else {
      if (existingFrameworks.unit) {
        recommendations.unit = {
          name: existingFrameworks.unit.name,
          packages: [],
          reason: 'Already installed ✅',
          status: 'installed'
        };
      } else {
        recommendations.unit = {
          name: 'jest',
          packages: ['jest', '@types/jest'],
          reason: 'Jest is the most popular JavaScript testing framework',
          status: 'missing'
        };
      }
    }

    // Add additional packages to recommendations
    if (additionalPackages.length > 0) {
      recommendations.additionalPackages = additionalPackages;
    }

    return recommendations;
  }

  /**
   * Detect file type based on filename patterns
   */
  detectFileType(filePath: string): string {
    const fileName = path.basename(filePath).toLowerCase();
    
    // Backend patterns
    if (fileName.includes('.service.')) return 'service';
    if (fileName.includes('.controller.')) return 'controller';
    if (fileName.includes('.repository.')) return 'repository';
    if (fileName.includes('.middleware.')) return 'middleware';
    if (fileName.includes('.guard.')) return 'guard';
    if (fileName.includes('.interceptor.')) return 'interceptor';
    if (fileName.includes('.pipe.')) return 'pipe';
    if (fileName.includes('.filter.')) return 'filter';
    if (fileName.includes('.resolver.')) return 'resolver';
    
    // Frontend patterns
    if (fileName.match(/\.(tsx|jsx)$/)) {
      // Check if it's a component (capitalized filename)
      const baseName = fileName.split('.')[0];
      if (baseName[0] === baseName[0].toUpperCase()) {
        return 'component';
      }
      return 'view';
    }
    
    // Generic patterns
    if (fileName.includes('.util.') || fileName.includes('.helper.')) return 'utility';
    if (fileName.includes('.model.') || fileName.includes('.entity.')) return 'model';
    if (fileName.includes('.dto.') || fileName.includes('.interface.')) return 'dto';
    
    return 'generic';
  }

  /**
   * Get context-aware test type recommendations
   */
  getTestTypeRecommendations(fileType: string, frameworks: DetectedFrameworks): Array<{
    id: string;
    label: string;
    framework?: string;
    detail: string;
    recommended?: boolean;
  }> {
    const recommendations = [];
    
    switch (fileType) {
      case 'service':
        if (frameworks.unit) {
          recommendations.push({
            id: 'unit',
            label: '🧪 Unit Tests',
            framework: frameworks.unit.name,
            detail: 'Mock dependencies, test business logic in isolation',
            recommended: true
          });
          
          recommendations.push({
            id: 'integration',
            label: '🔗 Integration Tests',
            framework: `${frameworks.unit.name} + Real Dependencies`,
            detail: 'Test with real database and external services'
          });
        }
        break;
        
      case 'controller':
        if (frameworks.unit) {
          recommendations.push({
            id: 'api',
            label: '🌐 API Tests',
            framework: 'Supertest',
            detail: 'Test HTTP endpoints, request/response',
            recommended: true
          });
          
          recommendations.push({
            id: 'integration',
            label: '🔗 Integration Tests',
            framework: frameworks.unit.name,
            detail: 'Test with full application context'
          });
        }
        break;
        
      case 'component':
        if (frameworks.component) {
          recommendations.push({
            id: 'component',
            label: '⚛️  Component Tests',
            framework: frameworks.component.name,
            detail: 'Test rendering, props, user interactions',
            recommended: true
          });
        }
        
        if (frameworks.e2e) {
          recommendations.push({
            id: 'e2e',
            label: '🌐 E2E Tests',
            framework: frameworks.e2e.name,
            detail: 'Test full user flow in real browser'
          });
        }
        
        recommendations.push({
          id: 'accessibility',
          label: '♿ Accessibility Tests',
          framework: 'axe-core',
          detail: 'Check WCAG compliance, keyboard navigation'
        });
        break;
        
      case 'repository':
        if (frameworks.unit) {
          recommendations.push({
            id: 'integration',
            label: '🗄️  Database Tests',
            framework: `${frameworks.unit.name} + In-memory DB`,
            detail: 'Test queries with real database',
            recommended: true
          });
          
          recommendations.push({
            id: 'unit',
            label: '🧪 Unit Tests',
            framework: frameworks.unit.name,
            detail: 'Test repository logic with mocked ORM'
          });
        }
        break;
        
      case 'utility':
      case 'generic':
        if (frameworks.unit) {
          recommendations.push({
            id: 'unit',
            label: '🧪 Unit Tests',
            framework: frameworks.unit.name,
            detail: 'Test pure functions and utilities',
            recommended: true
          });
        }
        break;
    }
    
    // Always add Smart option
    recommendations.push({
      id: 'smart',
      label: '✨ Smart (AI decides)',
      detail: 'Let AI analyze code and choose best test type'
    });
    
    return recommendations;
  }
}

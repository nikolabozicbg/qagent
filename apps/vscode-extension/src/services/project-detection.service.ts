import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DetectedStack } from '../types';

/**
 * ProjectDetectionService - Detects frameworks and tools in any project
 * 
 * Analyzes:
 * - package.json dependencies
 * - Config files (tsconfig, vite, playwright, etc.)
 * - Folder structure (monorepo detection)
 */
export class ProjectDetectionService {
  
  /**
   * Detect full stack from workspace
   */
  async detectStack(workspaceRoot?: string): Promise<DetectedStack> {
    const root = workspaceRoot || this.getWorkspaceRoot();
    if (!root) {
      return { isMonorepo: false };
    }

    const packageJson = await this.readPackageJson(root);
    const allDeps = this.getAllDependencies(packageJson);

    const frontend = this.detectFrontend(allDeps, root);
    const backend = this.detectBackend(allDeps, root);

    const stack: DetectedStack = {
      projectType: this.determineProjectType(frontend, backend),
      frontend,
      backend,
      e2e: await this.detectE2E(allDeps, root),
      unit: this.detectUnitTesting(allDeps),
      api: await this.detectApiSpec(root),
      isMonorepo: await this.detectMonorepo(root),
    };

    // Clean up undefined values
    if (!stack.frontend) delete stack.frontend;
    if (!stack.backend) delete stack.backend;
    if (!stack.e2e) delete stack.e2e;
    if (!stack.unit) delete stack.unit;
    if (!stack.api) delete stack.api;

    return stack;
  }

  /**
   * Determine project type based on detected frameworks
   */
  private determineProjectType(
    frontend: DetectedStack['frontend'] | undefined,
    backend: DetectedStack['backend'] | undefined
  ): 'frontend' | 'backend' | 'fullstack' {
    if (frontend && backend) return 'fullstack';
    if (frontend) return 'frontend';
    if (backend) return 'backend';
    return 'frontend'; // Default to frontend if nothing detected
  }

  // ============================================
  // Frontend Detection
  // ============================================

  private detectFrontend(deps: Record<string, string>, root: string): DetectedStack['frontend'] | undefined {
    // React
    if (deps['react']) {
      return {
        framework: deps['next'] ? 'Next.js' : 'React',
        version: deps['react'],
        buildTool: this.detectBuildTool(deps, root),
      };
    }

    // Vue
    if (deps['vue']) {
      return {
        framework: deps['nuxt'] ? 'Nuxt' : 'Vue',
        version: deps['vue'],
        buildTool: this.detectBuildTool(deps, root),
      };
    }

    // Angular
    if (deps['@angular/core']) {
      return {
        framework: 'Angular',
        version: deps['@angular/core'],
        buildTool: 'Angular CLI',
      };
    }

    // Svelte
    if (deps['svelte']) {
      return {
        framework: deps['@sveltejs/kit'] ? 'SvelteKit' : 'Svelte',
        version: deps['svelte'],
        buildTool: 'Vite',
      };
    }

    return undefined;
  }

  private detectBuildTool(deps: Record<string, string>, root: string): string | undefined {
    if (deps['vite'] || this.fileExists(root, 'vite.config.ts') || this.fileExists(root, 'vite.config.js')) {
      return 'Vite';
    }
    if (deps['webpack'] || this.fileExists(root, 'webpack.config.js')) {
      return 'Webpack';
    }
    if (deps['esbuild']) {
      return 'esbuild';
    }
    if (deps['next']) {
      return 'Next.js';
    }
    return undefined;
  }

  // ============================================
  // Backend Detection
  // ============================================

  private detectBackend(deps: Record<string, string>, root: string): DetectedStack['backend'] | undefined {
    // NestJS
    if (deps['@nestjs/core']) {
      return {
        framework: 'NestJS',
        version: deps['@nestjs/core'],
        orm: this.detectORM(deps),
      };
    }

    // Express
    if (deps['express']) {
      return {
        framework: 'Express',
        version: deps['express'],
        orm: this.detectORM(deps),
      };
    }

    // Fastify
    if (deps['fastify']) {
      return {
        framework: 'Fastify',
        version: deps['fastify'],
        orm: this.detectORM(deps),
      };
    }

    // Koa
    if (deps['koa']) {
      return {
        framework: 'Koa',
        version: deps['koa'],
        orm: this.detectORM(deps),
      };
    }

    return undefined;
  }

  private detectORM(deps: Record<string, string>): string | undefined {
    if (deps['typeorm']) return 'TypeORM';
    if (deps['prisma'] || deps['@prisma/client']) return 'Prisma';
    if (deps['sequelize']) return 'Sequelize';
    if (deps['mongoose']) return 'Mongoose';
    if (deps['drizzle-orm']) return 'Drizzle';
    if (deps['knex']) return 'Knex';
    return undefined;
  }

  // ============================================
  // E2E Testing Detection
  // ============================================

  private async detectE2E(deps: Record<string, string>, root: string): Promise<DetectedStack['e2e'] | undefined> {
    // Playwright
    if (deps['@playwright/test'] || deps['playwright']) {
      const configPath = await this.findConfigFile(root, [
        'playwright.config.ts',
        'playwright.config.js',
        'playwright.config.mjs',
      ]);
      return {
        framework: 'Playwright',
        installed: true,
        configPath: configPath ? path.relative(root, configPath) : undefined,
      };
    }

    // Cypress
    if (deps['cypress']) {
      const configPath = await this.findConfigFile(root, [
        'cypress.config.ts',
        'cypress.config.js',
        'cypress.json',
      ]);
      return {
        framework: 'Cypress',
        installed: true,
        configPath: configPath ? path.relative(root, configPath) : undefined,
      };
    }

    // Check if config exists even without dependency
    const playwrightConfig = await this.findConfigFile(root, ['playwright.config.ts', 'playwright.config.js']);
    if (playwrightConfig) {
      return {
        framework: 'Playwright',
        installed: false,
        configPath: path.relative(root, playwrightConfig),
      };
    }

    const cypressConfig = await this.findConfigFile(root, ['cypress.config.ts', 'cypress.config.js', 'cypress.json']);
    if (cypressConfig) {
      return {
        framework: 'Cypress',
        installed: false,
        configPath: path.relative(root, cypressConfig),
      };
    }

    return undefined;
  }

  // ============================================
  // Unit Testing Detection
  // ============================================

  private detectUnitTesting(deps: Record<string, string>): DetectedStack['unit'] | undefined {
    if (deps['jest'] || deps['@jest/core']) {
      return { framework: 'Jest', installed: true };
    }
    if (deps['vitest']) {
      return { framework: 'Vitest', installed: true };
    }
    if (deps['mocha']) {
      return { framework: 'Mocha', installed: true };
    }
    if (deps['@testing-library/react']) {
      return { framework: 'React Testing Library', installed: true };
    }
    return undefined;
  }

  // ============================================
  // API Spec Detection
  // ============================================

  private async detectApiSpec(root: string): Promise<DetectedStack['api'] | undefined> {
    // OpenAPI / Swagger
    const openapiFiles = [
      'openapi.json', 'openapi.yaml', 'openapi.yml',
      'swagger.json', 'swagger.yaml', 'swagger.yml',
      'api-spec.json', 'api-spec.yaml',
    ];
    
    for (const file of openapiFiles) {
      if (this.fileExists(root, file)) {
        return { spec: 'openapi', path: file };
      }
    }

    // Postman
    const postmanPattern = /\.postman_collection\.json$/;
    const files = await this.listFiles(root);
    const postmanFile = files.find(f => postmanPattern.test(f));
    if (postmanFile) {
      return { spec: 'postman', path: postmanFile };
    }

    // HAR
    const harFile = files.find(f => f.endsWith('.har'));
    if (harFile) {
      return { spec: 'har', path: harFile };
    }

    return undefined;
  }

  // ============================================
  // Monorepo Detection
  // ============================================

  private async detectMonorepo(root: string): Promise<boolean> {
    // Check for monorepo patterns
    const monorepoIndicators = [
      'apps',
      'packages',
      'libs',
      'projects',
    ];

    for (const dir of monorepoIndicators) {
      const dirPath = path.join(root, dir);
      if (this.directoryExists(dirPath)) {
        return true;
      }
    }

    // Check for workspace config
    const packageJson = await this.readPackageJson(root);
    if (packageJson?.workspaces) {
      return true;
    }

    // Check for monorepo tools
    if (this.fileExists(root, 'pnpm-workspace.yaml') ||
        this.fileExists(root, 'lerna.json') ||
        this.fileExists(root, 'nx.json') ||
        this.fileExists(root, 'turbo.json')) {
      return true;
    }

    return false;
  }

  // ============================================
  // Helper Methods
  // ============================================

  private getWorkspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  private async readPackageJson(root: string): Promise<Record<string, unknown> | null> {
    const pkgPath = path.join(root, 'package.json');
    try {
      const content = fs.readFileSync(pkgPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private getAllDependencies(packageJson: Record<string, unknown> | null): Record<string, string> {
    if (!packageJson) return {};
    
    const deps = (packageJson.dependencies as Record<string, string>) || {};
    const devDeps = (packageJson.devDependencies as Record<string, string>) || {};
    
    return { ...deps, ...devDeps };
  }

  private fileExists(root: string, filename: string): boolean {
    return fs.existsSync(path.join(root, filename));
  }

  private directoryExists(dirPath: string): boolean {
    try {
      return fs.statSync(dirPath).isDirectory();
    } catch {
      return false;
    }
  }

  private async findConfigFile(root: string, candidates: string[]): Promise<string | null> {
    for (const candidate of candidates) {
      const fullPath = path.join(root, candidate);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    return null;
  }

  private async listFiles(root: string): Promise<string[]> {
    try {
      return fs.readdirSync(root).filter(f => {
        const stat = fs.statSync(path.join(root, f));
        return stat.isFile();
      });
    } catch {
      return [];
    }
  }
}

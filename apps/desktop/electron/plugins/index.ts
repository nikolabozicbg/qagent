/**
 * Plugin Registry
 * 
 * Central registry for all scanner plugins.
 * Handles auto-detection, loading, and execution of plugins.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import {
  ScannerPlugin,
  PluginType,
  ProjectContext,
  AnalysisContext,
  PackageJson,
  ScannerConfig,
  AggregatedScanResult,
  FrameworkPluginResult,
  FormPluginResult,
  FormInfo,
  SchemaPluginResult,
  TestingPluginResult,
  SourceFileInfo,
  DeepPartial,
} from './types';

// Import all plugins
import { NextJSPlugin } from './frameworks/nextjs.plugin';
import { ReactRouterPlugin } from './frameworks/react-router.plugin';
import { VuePlugin } from './frameworks/vue.plugin';
import { ReactHookFormPlugin } from './forms/react-hook-form.plugin';
import { FormikPlugin } from './forms/formik.plugin';
import { NativeHtmlFormPlugin } from './forms/native-html.plugin';
import { AntdFormPlugin } from './forms/antd-form.plugin';
import { PrismaPlugin } from './schema/prisma.plugin';
import { TypeORMPlugin } from './schema/typeorm.plugin';
import { DrizzlePlugin } from './schema/drizzle.plugin';
import { JestPlugin } from './testing/jest.plugin';
import { VitestPlugin } from './testing/vitest.plugin';
import { PlaywrightPlugin } from './testing/playwright.plugin';

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_CONFIG: ScannerConfig = {
  plugins: {
    frameworks: ['nextjs', 'react-router', 'vue'],
    forms: ['react-hook-form', 'formik', 'native-html', 'antd-form'],
    schema: ['prisma', 'typeorm', 'drizzle'],
    testing: ['jest', 'vitest', 'playwright'],
  },
  patterns: {
    testCredentials: [
      /(?:test|demo|admin|super)\s*(?:user|admin)?[:\s]+([^\s/]+)\s*[/|]\s*([^\s]+)/i,
      /email[:\s]+([^\s]+@[^\s]+)\s*[,\n]\s*password[:\s]+([^\s]+)/i,
    ],
    protectedRoutes: [
      /\/dashboard/i,
      /\/admin/i,
      /\/settings/i,
      /\/profile/i,
      /\/account/i,
    ],
    authForms: [
      /login/i,
      /sign[-_]?in/i,
      /sign[-_]?up/i,
      /register/i,
      /auth/i,
    ],
    ignoreFiles: [
      /\.test\./,
      /\.spec\./,
      /\.stories\./,
      /__tests__/,
      /__mocks__/,
    ],
  },
  selectors: {
    priority: ['data-testid', 'name', 'label', 'placeholder', 'role'],
    customTestIdAttribute: undefined,
  },
  paths: {
    ignore: [
      'node_modules', '.git', '.next', '.nuxt', 'dist', 'build', 'out',
      '.cache', 'coverage', '.turbo', '.nx', '__pycache__', '.venv',
    ],
    include: ['src', 'app', 'pages', 'components', 'lib', 'utils'],
    srcRoot: 'src',
  },
  behavior: {
    analyzeExistingTests: true,
    inferEntitiesFromTypes: true,
    generateTestData: true,
  },
};

// ============================================
// PLUGIN REGISTRY
// ============================================

export class PluginRegistry {
  private plugins: Map<string, ScannerPlugin> = new Map();
  private config: ScannerConfig;

  constructor(config: DeepPartial<ScannerConfig> = {}) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, config);
    this.registerBuiltinPlugins();
  }

  private mergeConfig(
    base: ScannerConfig,
    override: DeepPartial<ScannerConfig>
  ): ScannerConfig {
    return {
      plugins: { ...base.plugins, ...(override.plugins as any) },
      patterns: { ...base.patterns, ...(override.patterns as any) },
      selectors: { ...base.selectors, ...(override.selectors as any) },
      paths: { ...base.paths, ...(override.paths as any) },
      behavior: { ...base.behavior, ...(override.behavior as any) },
    };
  }

  /**
   * Register all built-in plugins
   */
  private registerBuiltinPlugins(): void {
    // Framework plugins
    this.register(new NextJSPlugin());
    this.register(new ReactRouterPlugin());
    this.register(new VuePlugin());

    // Form plugins
    this.register(new ReactHookFormPlugin());
    this.register(new FormikPlugin());
    this.register(new NativeHtmlFormPlugin());
    this.register(new AntdFormPlugin());

    // Schema plugins
    this.register(new PrismaPlugin());
    this.register(new TypeORMPlugin());
    this.register(new DrizzlePlugin());

    // Testing plugins
    this.register(new JestPlugin());
    this.register(new VitestPlugin());
    this.register(new PlaywrightPlugin());
  }

  /**
   * Register a plugin
   */
  register(plugin: ScannerPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): ScannerPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by type
   */
  getPluginsByType(type: PluginType): ScannerPlugin[] {
    return this.getPlugins()
      .filter(p => p.type === type)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Create project context for detection
   */
  async createProjectContext(projectPath: string): Promise<ProjectContext> {
    let packageJson: PackageJson | null = null;

    try {
      const pkgPath = path.join(projectPath, 'package.json');
      const content = await fs.readFile(pkgPath, 'utf-8');
      packageJson = JSON.parse(content);
    } catch {
      // No package.json
    }

    return {
      projectPath,
      packageJson,
      fileExists: async (relativePath: string) => {
        try {
          await fs.access(path.join(projectPath, relativePath));
          return true;
        } catch {
          return false;
        }
      },
      readFile: async (relativePath: string) => {
        try {
          return await fs.readFile(path.join(projectPath, relativePath), 'utf-8');
        } catch {
          return null;
        }
      },
      glob: async (pattern: string) => {
        // Simple glob implementation - in production, use a proper glob library
        return this.simpleGlob(projectPath, pattern);
      },
    };
  }

  /**
   * Simple glob implementation
   */
  private async simpleGlob(baseDir: string, pattern: string): Promise<string[]> {
    const results: string[] = [];
    const ext = path.extname(pattern) || '';
    
    const walk = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(baseDir, fullPath);
          
          // Skip ignored directories
          if (entry.isDirectory()) {
            if (this.config.paths.ignore.includes(entry.name)) continue;
            await walk(fullPath);
          } else if (entry.isFile()) {
            // Match extension if specified
            if (ext && !entry.name.endsWith(ext)) continue;
            
            // Check against ignore patterns
            const shouldIgnore = this.config.patterns.ignoreFiles.some(
              p => p.test(relativePath)
            );
            if (shouldIgnore) continue;
            
            results.push(relativePath);
          }
        }
      } catch {
        // Skip directories that can't be read
      }
    };

    await walk(baseDir);
    return results;
  }

  /**
   * Detect which plugins are applicable for the project
   */
  async detectPlugins(projectPath: string): Promise<ScannerPlugin[]> {
    const context = await this.createProjectContext(projectPath);
    const applicablePlugins: ScannerPlugin[] = [];

    for (const plugin of this.getPlugins()) {
      // Check if plugin is enabled in config
      const pluginList = this.config.plugins[`${plugin.type}s` as keyof typeof this.config.plugins];
      if (!pluginList?.includes(plugin.name)) continue;

      try {
        const isApplicable = await plugin.detect(context);
        if (isApplicable) {
          applicablePlugins.push(plugin);
          console.log(`   ✓ Detected: ${plugin.name}`);
        }
      } catch (err) {
        console.warn(`   ⚠ Plugin detection failed: ${plugin.name}`, err);
      }
    }

    return applicablePlugins;
  }

  /**
   * Run all applicable plugins and aggregate results
   */
  async scan(projectPath: string): Promise<AggregatedScanResult> {
    console.log('\n🔌 Plugin-based Scanner');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Project: ${projectPath}`);
    console.log('');

    // Phase 1: Detect plugins
    console.log('📡 Phase 1: Detecting applicable plugins...');
    const applicablePlugins = await this.detectPlugins(projectPath);
    console.log(`   Found ${applicablePlugins.length} applicable plugins\n`);

    // Phase 2: Create analysis context
    console.log('📂 Phase 2: Loading source files...');
    const analysisContext = await this.createAnalysisContext(projectPath);
    console.log(`   Loaded ${analysisContext.sourceFiles.length} files\n`);

    // Phase 3: Run framework plugins first
    console.log('🏗️  Phase 3: Running framework plugins...');
    let frameworkResult: FrameworkPluginResult | null = null;
    const frameworkPlugins = applicablePlugins.filter(p => p.type === 'framework');
    
    for (const plugin of frameworkPlugins) {
      try {
        const result = await plugin.analyze(analysisContext) as FrameworkPluginResult;
        if (result.success) {
          frameworkResult = result;
          analysisContext.frameworkResult = result;
          console.log(`   ✓ ${plugin.name}: ${result.routes.length} routes, ${result.components.length} components`);
          break; // Use first successful framework plugin
        }
      } catch (err) {
        console.warn(`   ⚠ ${plugin.name} failed:`, err);
      }
    }

    // Phase 4: Run schema plugins
    console.log('\n📊 Phase 4: Running schema plugins...');
    let schemaResult: SchemaPluginResult | null = null;
    const schemaPlugins = applicablePlugins.filter(p => p.type === 'schema');
    
    for (const plugin of schemaPlugins) {
      try {
        const result = await plugin.analyze(analysisContext) as SchemaPluginResult;
        if (result.success) {
          schemaResult = result;
          analysisContext.schemaResult = result;
          console.log(`   ✓ ${plugin.name}: ${result.entities.length} entities`);
          break;
        }
      } catch (err) {
        console.warn(`   ⚠ ${plugin.name} failed:`, err);
      }
    }

    // Phase 5: Run form plugins
    console.log('\n📝 Phase 5: Running form plugins...');
    const formResults: FormPluginResult[] = [];
    const formPlugins = applicablePlugins.filter(p => p.type === 'form');
    
    for (const plugin of formPlugins) {
      try {
        const result = await plugin.analyze(analysisContext) as FormPluginResult;
        if (result.success && result.forms.length > 0) {
          formResults.push(result);
          console.log(`   ✓ ${plugin.name}: ${result.forms.length} forms`);
        }
      } catch (err) {
        console.warn(`   ⚠ ${plugin.name} failed:`, err);
      }
    }

    // Phase 6: Run testing plugins
    console.log('\n🧪 Phase 6: Running testing plugins...');
    let testingResult: TestingPluginResult | null = null;
    const testingPlugins = applicablePlugins.filter(p => p.type === 'testing');
    
    if (this.config.behavior.analyzeExistingTests) {
      for (const plugin of testingPlugins) {
        try {
          const result = await plugin.analyze(analysisContext) as TestingPluginResult;
          if (result.success) {
            testingResult = result;
            console.log(`   ✓ ${plugin.name}: ${result.testFiles.length} test files`);
            break;
          }
        } catch (err) {
          console.warn(`   ⚠ ${plugin.name} failed:`, err);
        }
      }
    } else {
      console.log('   (Skipped - disabled in config)');
    }

    // Phase 7: Aggregate results
    console.log('\n🔗 Phase 7: Aggregating results...');
    const aggregated = this.aggregateResults(
      projectPath,
      applicablePlugins,
      frameworkResult,
      formResults,
      schemaResult,
      testingResult
    );

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Scan complete:`);
    console.log(`   Routes: ${aggregated.merged.routes.length}`);
    console.log(`   Forms: ${aggregated.merged.forms.length}`);
    console.log(`   Entities: ${aggregated.merged.entities.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return aggregated;
  }

  /**
   * Create full analysis context
   */
  private async createAnalysisContext(projectPath: string): Promise<AnalysisContext> {
    const projectContext = await this.createProjectContext(projectPath);
    const sourceFiles: SourceFileInfo[] = [];
    const parsedFiles = new Map<string, ts.SourceFile>();

    // Find and load all source files
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    
    const walk = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(projectPath, fullPath);
          
          if (entry.isDirectory()) {
            if (this.config.paths.ignore.includes(entry.name)) continue;
            await walk(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (!extensions.includes(ext)) continue;
            
            // Check ignore patterns
            const shouldIgnore = this.config.patterns.ignoreFiles.some(
              p => p.test(relativePath)
            );
            if (shouldIgnore) continue;

            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              const lineCount = content.split('\n').length;
              
              sourceFiles.push({
                path: fullPath,
                relativePath,
                content,
                lineCount,
              });

              // Parse TypeScript
              const scriptKind = ext === '.tsx' || ext === '.jsx' 
                ? ts.ScriptKind.TSX 
                : ts.ScriptKind.TS;
              
              const sourceFile = ts.createSourceFile(
                fullPath,
                content,
                ts.ScriptTarget.Latest,
                true,
                scriptKind
              );
              parsedFiles.set(fullPath, sourceFile);
            } catch {
              // Skip files that can't be read
            }
          }
        }
      } catch {
        // Skip directories that can't be read
      }
    };

    await walk(projectPath);

    return {
      ...projectContext,
      sourceFiles,
      parsedFiles,
      config: this.config,
    };
  }

  /**
   * Aggregate all plugin results
   */
  private aggregateResults(
    projectPath: string,
    plugins: ScannerPlugin[],
    frameworkResult: FrameworkPluginResult | null,
    formResults: FormPluginResult[],
    schemaResult: SchemaPluginResult | null,
    testingResult: TestingPluginResult | null
  ): AggregatedScanResult {
    // Merge forms from all form plugins
    const allForms = formResults.flatMap(r => r.forms);
    
    // Deduplicate forms by id
    const uniqueForms: Map<string, FormInfo> = new Map();
    for (const form of allForms) {
      if (!uniqueForms.has(form.id)) {
        uniqueForms.set(form.id, form);
      }
    }

    // Build relationships
    const entityToRoutes: Record<string, string[]> = {};
    const formToEntity: Record<string, string> = {};
    const routeToForms: Record<string, string[]> = {};

    // Map entities to routes based on naming
    if (schemaResult) {
      for (const entity of schemaResult.entities) {
        const entityLower = entity.name.toLowerCase();
        const matchingRoutes = (frameworkResult?.routes || [])
          .filter(r => r.path.toLowerCase().includes(entityLower))
          .map(r => r.path);
        
        if (matchingRoutes.length > 0) {
          entityToRoutes[entity.name] = matchingRoutes;
        }
      }
    }

    // Map forms to routes
    for (const form of uniqueForms.values()) {
      if (form.route) {
        if (!routeToForms[form.route]) {
          routeToForms[form.route] = [];
        }
        routeToForms[form.route].push(form.id);
      }

      // Try to match form to entity
      if (schemaResult) {
        for (const entity of schemaResult.entities) {
          if (form.name.toLowerCase().includes(entity.name.toLowerCase())) {
            formToEntity[form.id] = entity.name;
            break;
          }
        }
      }
    }

    return {
      project: {
        name: frameworkResult?.framework.name || path.basename(projectPath),
        path: projectPath,
        detectedPlugins: plugins.map(p => p.name),
      },
      framework: frameworkResult,
      forms: formResults,
      schema: schemaResult,
      testing: testingResult,
      merged: {
        routes: frameworkResult?.routes || [],
        components: frameworkResult?.components || [],
        forms: Array.from(uniqueForms.values()),
        entities: schemaResult?.entities || [],
        existingCoverage: testingResult?.coverage || null,
      },
      relationships: {
        entityToRoutes,
        formToEntity,
        routeToForms,
        navigationLinks: [], // Will be populated by framework plugin
        inferredFlows: [],   // Will be computed separately
      },
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): ScannerConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(config: DeepPartial<ScannerConfig>): void {
    this.config = this.mergeConfig(this.config, config);
  }
}

// Export singleton instance
export const pluginRegistry = new PluginRegistry();

// Export types
export * from './types';

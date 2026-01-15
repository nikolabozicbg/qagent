import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Project Scanner v3.0
 * 
 * Phase 1.1: Scans project and gathers all metadata
 * - Finds all source files
 * - Parses package.json
 * - Resolves path aliases from tsconfig
 * - Detects framework from dependencies (not hardcoded patterns)
 */

export interface ProjectMetadata {
  rootPath: string;
  name: string;
  sourceFiles: SourceFile[];
  packageJson: PackageJsonInfo;
  tsConfig: TSConfigInfo | null;
  sourceRoots: string[];
  framework: FrameworkInfo;
  monorepo: MonorepoInfo | null;
}

export interface SourceFile {
  path: string;
  relativePath: string;
  extension: string;
  size: number;
  type: 'component' | 'hook' | 'util' | 'api' | 'store' | 'config' | 'test' | 'style' | 'unknown';
}

export interface PackageJsonInfo {
  name: string;
  version: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  allDeps: string[]; // Combined list of dep names
}

export interface TSConfigInfo {
  compilerOptions: {
    baseUrl?: string;
    paths?: Record<string, string[]>;
    jsx?: string;
    target?: string;
    module?: string;
  };
  include?: string[];
  exclude?: string[];
  pathAliases: Map<string, string>; // Resolved: @/* -> src/*
}

export interface FrameworkInfo {
  name: string;
  version: string;
  type: 'react' | 'next' | 'vue' | 'angular' | 'svelte' | 'unknown';
  router: string | null;
  stateManagement: string[];
  testingLibraries: string[];
  buildTool: string | null;
  confidence: number;
}

export interface MonorepoInfo {
  type: 'nx' | 'lerna' | 'turborepo' | 'yarn-workspaces' | 'pnpm-workspaces' | null;
  packages: string[];
}

// Directories to ignore during scanning
const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.nuxt',
  'dist',
  'build',
  'out',
  '.cache',
  'coverage',
  '.turbo',
  '.nx',
]);

// File extensions to include
const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.vue', '.svelte',
]);

@Injectable()
export class ProjectScannerService {
  
  /**
   * Main entry: Scan entire project
   */
  async scanProject(projectPath: string): Promise<ProjectMetadata> {
    console.log(`📂 Project Scanner: Scanning ${projectPath}`);
    const startTime = Date.now();
    
    // 1. Read package.json
    const packageJson = await this.readPackageJson(projectPath);
    
    // 2. Read tsconfig
    const tsConfig = await this.readTSConfig(projectPath);
    
    // 3. Detect framework from dependencies
    const framework = this.detectFramework(packageJson);
    
    // 4. Find source roots
    const sourceRoots = this.findSourceRoots(projectPath, tsConfig);
    
    // 5. Scan all source files
    const sourceFiles = await this.scanSourceFiles(projectPath, sourceRoots);
    
    // 6. Detect monorepo
    const monorepo = await this.detectMonorepo(projectPath);
    
    const scanTime = Date.now() - startTime;
    console.log(`   Found ${sourceFiles.length} source files in ${scanTime}ms`);
    
    return {
      rootPath: projectPath,
      name: packageJson.name || path.basename(projectPath),
      sourceFiles,
      packageJson,
      tsConfig,
      sourceRoots,
      framework,
      monorepo,
    };
  }
  
  /**
   * Read and parse package.json
   */
  private async readPackageJson(projectPath: string): Promise<PackageJsonInfo> {
    try {
      const pkgPath = path.join(projectPath, 'package.json');
      const content = await fs.readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(content);
      
      const dependencies = pkg.dependencies || {};
      const devDependencies = pkg.devDependencies || {};
      
      return {
        name: pkg.name || '',
        version: pkg.version || '',
        dependencies,
        devDependencies,
        scripts: pkg.scripts || {},
        allDeps: [...Object.keys(dependencies), ...Object.keys(devDependencies)],
      };
    } catch {
      return {
        name: '',
        version: '',
        dependencies: {},
        devDependencies: {},
        scripts: {},
        allDeps: [],
      };
    }
  }
  
  /**
   * Read and parse tsconfig.json (or jsconfig.json)
   */
  private async readTSConfig(projectPath: string): Promise<TSConfigInfo | null> {
    const configNames = ['tsconfig.json', 'jsconfig.json'];
    
    for (const configName of configNames) {
      try {
        const configPath = path.join(projectPath, configName);
        const content = await fs.readFile(configPath, 'utf-8');
        // Remove comments (tsconfig allows them)
        const cleanContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
        const config = JSON.parse(cleanContent);
        
        const compilerOptions = config.compilerOptions || {};
        const pathAliases = this.resolvePathAliases(
          compilerOptions.baseUrl || '.',
          compilerOptions.paths || {},
          projectPath
        );
        
        return {
          compilerOptions: {
            baseUrl: compilerOptions.baseUrl,
            paths: compilerOptions.paths,
            jsx: compilerOptions.jsx,
            target: compilerOptions.target,
            module: compilerOptions.module,
          },
          include: config.include,
          exclude: config.exclude,
          pathAliases,
        };
      } catch {
        continue;
      }
    }
    
    return null;
  }
  
  /**
   * Resolve path aliases from tsconfig paths
   */
  private resolvePathAliases(
    baseUrl: string,
    paths: Record<string, string[]>,
    projectPath: string
  ): Map<string, string> {
    const aliases = new Map<string, string>();
    
    for (const [alias, targets] of Object.entries(paths)) {
      if (targets.length > 0) {
        // Remove wildcards for the key
        const aliasKey = alias.replace('/*', '').replace('*', '');
        const targetPath = targets[0].replace('/*', '').replace('*', '');
        const resolved = path.join(projectPath, baseUrl, targetPath);
        aliases.set(aliasKey, resolved);
      }
    }
    
    return aliases;
  }
  
  /**
   * Detect framework from package.json dependencies
   * No hardcoded framework names - infer from patterns
   */
  private detectFramework(pkg: PackageJsonInfo): FrameworkInfo {
    const deps = pkg.allDeps;
    
    // Detect main framework
    let name = 'unknown';
    let type: FrameworkInfo['type'] = 'unknown';
    let version = '';
    let confidence = 0;
    
    // Next.js detection
    if (deps.includes('next')) {
      name = 'next';
      type = 'next';
      version = pkg.dependencies['next'] || pkg.devDependencies['next'] || '';
      confidence = 1;
    }
    // React detection
    else if (deps.includes('react')) {
      name = 'react';
      type = 'react';
      version = pkg.dependencies['react'] || pkg.devDependencies['react'] || '';
      confidence = 0.9;
    }
    // Vue detection
    else if (deps.includes('vue')) {
      name = 'vue';
      type = 'vue';
      version = pkg.dependencies['vue'] || pkg.devDependencies['vue'] || '';
      confidence = 1;
    }
    // Angular detection
    else if (deps.includes('@angular/core')) {
      name = 'angular';
      type = 'angular';
      version = pkg.dependencies['@angular/core'] || pkg.devDependencies['@angular/core'] || '';
      confidence = 1;
    }
    // Svelte detection
    else if (deps.includes('svelte')) {
      name = 'svelte';
      type = 'svelte';
      version = pkg.dependencies['svelte'] || pkg.devDependencies['svelte'] || '';
      confidence = 1;
    }
    
    // Detect router
    let router: string | null = null;
    if (deps.includes('react-router') || deps.includes('react-router-dom')) {
      router = 'react-router';
    } else if (deps.includes('@tanstack/react-router')) {
      router = 'tanstack-router';
    } else if (deps.includes('vue-router')) {
      router = 'vue-router';
    } else if (type === 'next') {
      router = 'next-router';
    }
    
    // Detect state management
    const stateManagement: string[] = [];
    if (deps.includes('redux') || deps.includes('@reduxjs/toolkit')) {
      stateManagement.push('redux');
    }
    if (deps.includes('@reduxjs/toolkit')) {
      // Check if RTK Query might be used (it's part of @reduxjs/toolkit)
      stateManagement.push('rtk-query-possible');
    }
    if (deps.includes('zustand')) stateManagement.push('zustand');
    if (deps.includes('jotai')) stateManagement.push('jotai');
    if (deps.includes('recoil')) stateManagement.push('recoil');
    if (deps.includes('mobx') || deps.includes('mobx-react')) stateManagement.push('mobx');
    if (deps.includes('xstate')) stateManagement.push('xstate');
    if (deps.includes('@tanstack/react-query') || deps.includes('react-query')) {
      stateManagement.push('react-query');
    }
    if (deps.includes('swr')) stateManagement.push('swr');
    if (deps.includes('@apollo/client') || deps.includes('apollo-client')) {
      stateManagement.push('apollo');
    }
    if (deps.includes('vuex')) stateManagement.push('vuex');
    if (deps.includes('pinia')) stateManagement.push('pinia');
    if (deps.includes('ngrx') || deps.includes('@ngrx/store')) stateManagement.push('ngrx');
    
    // Detect testing libraries
    const testingLibraries: string[] = [];
    if (deps.includes('cypress')) testingLibraries.push('cypress');
    if (deps.includes('playwright') || deps.includes('@playwright/test')) {
      testingLibraries.push('playwright');
    }
    if (deps.includes('jest')) testingLibraries.push('jest');
    if (deps.includes('vitest')) testingLibraries.push('vitest');
    if (deps.includes('@testing-library/react') || deps.includes('@testing-library/vue')) {
      testingLibraries.push('testing-library');
    }
    
    // Detect build tool
    let buildTool: string | null = null;
    if (deps.includes('vite')) buildTool = 'vite';
    else if (deps.includes('webpack')) buildTool = 'webpack';
    else if (deps.includes('esbuild')) buildTool = 'esbuild';
    else if (deps.includes('parcel')) buildTool = 'parcel';
    else if (type === 'next') buildTool = 'next';
    
    return {
      name,
      version,
      type,
      router,
      stateManagement,
      testingLibraries,
      buildTool,
      confidence,
    };
  }
  
  /**
   * Find source root directories
   */
  private findSourceRoots(projectPath: string, tsConfig: TSConfigInfo | null): string[] {
    const roots: string[] = [];
    
    // Common source directories
    const commonRoots = ['src', 'app', 'lib', 'pages', 'components'];
    
    for (const root of commonRoots) {
      const fullPath = path.join(projectPath, root);
      // We'll check existence during scan
      roots.push(fullPath);
    }
    
    // Add from tsconfig include
    if (tsConfig?.include) {
      for (const include of tsConfig.include) {
        const cleanPath = include.replace(/\/\*\*.*/, '').replace(/\*.*/, '');
        if (cleanPath && !cleanPath.startsWith('node_modules')) {
          roots.push(path.join(projectPath, cleanPath));
        }
      }
    }
    
    return [...new Set(roots)];
  }
  
  /**
   * Scan all source files recursively
   */
  private async scanSourceFiles(projectPath: string, sourceRoots: string[]): Promise<SourceFile[]> {
    const files: SourceFile[] = [];
    
    // Scan from project root as fallback
    const dirsToScan = [projectPath];
    
    for (const dir of dirsToScan) {
      await this.scanDirectory(dir, projectPath, files);
    }
    
    return files;
  }
  
  /**
   * Recursively scan a directory
   */
  private async scanDirectory(
    dirPath: string,
    projectRoot: string,
    files: SourceFile[]
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip ignored directories
          if (IGNORE_DIRS.has(entry.name)) continue;
          // Skip hidden directories
          if (entry.name.startsWith('.')) continue;
          
          await this.scanDirectory(fullPath, projectRoot, files);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          
          if (SOURCE_EXTENSIONS.has(ext)) {
            const stat = await fs.stat(fullPath);
            const relativePath = path.relative(projectRoot, fullPath);
            
            files.push({
              path: fullPath,
              relativePath,
              extension: ext,
              size: stat.size,
              type: this.inferFileType(relativePath, entry.name),
            });
          }
        }
      }
    } catch {
      // Directory might not exist, skip
    }
  }
  
  /**
   * Infer file type from path patterns
   */
  private inferFileType(relativePath: string, fileName: string): SourceFile['type'] {
    const lowerPath = relativePath.toLowerCase();
    const lowerName = fileName.toLowerCase();
    
    // Test files
    if (lowerName.includes('.test.') || lowerName.includes('.spec.') ||
        lowerPath.includes('__tests__') || lowerPath.includes('/test/') ||
        lowerPath.startsWith('test/') || lowerPath.includes('/tests/')) {
      return 'test';
    }
    
    // Style files (even though we filter by extension, some might slip through)
    if (lowerName.endsWith('.css.ts') || lowerName.endsWith('.styles.ts')) {
      return 'style';
    }
    
    // Config files
    if (lowerName.includes('.config.') || lowerName === 'config.ts' ||
        lowerPath.includes('/config/') || lowerName.includes('setup')) {
      return 'config';
    }
    
    // Hooks
    if (lowerName.startsWith('use') || lowerPath.includes('/hooks/')) {
      return 'hook';
    }
    
    // API files
    if (lowerPath.includes('/api/') || lowerPath.includes('/services/') ||
        lowerName.includes('.api.') || lowerName.includes('.service.')) {
      return 'api';
    }
    
    // Store files
    if (lowerPath.includes('/store/') || lowerPath.includes('/redux/') ||
        lowerPath.includes('/state/') || lowerName.includes('.slice.') ||
        lowerName.includes('.store.') || lowerName.includes('.reducer.')) {
      return 'store';
    }
    
    // Utility files
    if (lowerPath.includes('/utils/') || lowerPath.includes('/helpers/') ||
        lowerPath.includes('/lib/') || lowerName.includes('.util.') ||
        lowerName.includes('.helper.')) {
      return 'util';
    }
    
    // Components (TSX/JSX files in component-like paths)
    if (lowerPath.includes('/components/') || lowerPath.includes('/pages/') ||
        lowerPath.includes('/views/') || lowerPath.includes('/screens/') ||
        lowerName.endsWith('.tsx') || lowerName.endsWith('.jsx')) {
      return 'component';
    }
    
    return 'unknown';
  }
  
  /**
   * Detect monorepo structure
   */
  private async detectMonorepo(projectPath: string): Promise<MonorepoInfo | null> {
    // Check for nx
    try {
      await fs.access(path.join(projectPath, 'nx.json'));
      const workspaceJson = await this.readJsonFile(path.join(projectPath, 'workspace.json'));
      const packages = workspaceJson?.projects ? Object.keys(workspaceJson.projects) : [];
      return { type: 'nx', packages };
    } catch {}
    
    // Check for lerna
    try {
      await fs.access(path.join(projectPath, 'lerna.json'));
      const lernaJson = await this.readJsonFile(path.join(projectPath, 'lerna.json'));
      return { type: 'lerna', packages: lernaJson?.packages || [] };
    } catch {}
    
    // Check for turborepo
    try {
      await fs.access(path.join(projectPath, 'turbo.json'));
      return { type: 'turborepo', packages: [] };
    } catch {}
    
    // Check for yarn workspaces in package.json
    try {
      const pkg = await this.readJsonFile(path.join(projectPath, 'package.json'));
      if (pkg?.workspaces) {
        return {
          type: 'yarn-workspaces',
          packages: Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces.packages || [],
        };
      }
    } catch {}
    
    // Check for pnpm workspaces
    try {
      await fs.access(path.join(projectPath, 'pnpm-workspace.yaml'));
      return { type: 'pnpm-workspaces', packages: [] };
    } catch {}
    
    return null;
  }
  
  /**
   * Helper: Read JSON file safely
   */
  private async readJsonFile(filePath: string): Promise<any> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}

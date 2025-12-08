import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { ProjectType } from '../language-providers/base/language-provider.interface';

export interface ProjectTypeDetection {
  projectType: ProjectType;
  confidence: number; // 0-100
  indicators: string[]; // Why we detected this type
  language: string;
}

@Injectable()
export class ProjectTypeDetectorService {
  /**
   * Detect project types for all languages in workspace
   * Returns multiple detections for polyglot projects
   */
  async detectProjectTypes(workspacePath: string): Promise<ProjectTypeDetection[]> {
    const detections: ProjectTypeDetection[] = [];
    
    // Check for C# projects
    const csharpDetection = await this.detectCSharpProjectType(workspacePath);
    if (csharpDetection) {
      detections.push(csharpDetection);
    }
    
    // Check for TypeScript/JavaScript projects
    const tsDetection = await this.detectJavaScriptProjectType(workspacePath);
    if (tsDetection) {
      detections.push(tsDetection);
    }
    
    // Check for Python projects
    const pythonDetection = await this.detectPythonProjectType(workspacePath);
    if (pythonDetection) {
      detections.push(pythonDetection);
    }
    
    return detections;
  }
  
  /**
   * Get primary project type (highest confidence)
   */
  async getPrimaryProjectType(workspacePath: string): Promise<ProjectTypeDetection | null> {
    const detections = await this.detectProjectTypes(workspacePath);
    if (detections.length === 0) {
      return null;
    }
    
    // Sort by confidence and return highest
    return detections.sort((a, b) => b.confidence - a.confidence)[0];
  }
  
  /**
   * Legacy method for backward compatibility
   */
  async detectProjectType(workspacePath: string, language: string): Promise<string> {
    const lang = language.toLowerCase();
    let detection: ProjectTypeDetection | null = null;

    if (lang === 'csharp' || lang === 'c#') {
      detection = await this.detectCSharpProjectType(workspacePath);
    } else if (lang === 'javascript' || lang === 'typescript') {
      detection = await this.detectJavaScriptProjectType(workspacePath);
    } else if (lang === 'python') {
      detection = await this.detectPythonProjectType(workspacePath);
    }

    return detection?.projectType || 'library';
  }

  /**
   * Detect C# project type
   */
  private async detectCSharpProjectType(workspacePath: string): Promise<ProjectTypeDetection | null> {
    const indicators: string[] = [];
    let projectType: ProjectType = 'library';
    let confidence = 0;
    
    try {
      // Recursively find all .csproj files in workspace
      const csprojFiles = await glob('**/*.csproj', {
        cwd: workspacePath,
        absolute: true,
        ignore: ['**/node_modules/**', '**/bin/**', '**/obj/**', '**/.git/**']
      });
      if (csprojFiles.length === 0) {
        return null; // Not a C# project
      }
      
      confidence = 50; // Base confidence for having .csproj
      indicators.push(`C# project detected (.csproj found: ${csprojFiles.length})`);
      
      // Look for Program.cs anywhere in the repo
      const programFiles = await glob('**/Program.cs', {
        cwd: workspacePath,
        absolute: true,
        ignore: ['**/node_modules/**', '**/bin/**', '**/obj/**', '**/.git/**']
      });
      for (const programPath of programFiles) {
        const content = await fs.readFile(programPath, 'utf-8');
        if (content.includes('WebApplication') || content.includes('WebHost') || content.includes('UseStartup')) {
          projectType = 'web-api';
          confidence = Math.max(confidence, 95);
          indicators.push(`ASP.NET Core bootstrap detected in ${path.relative(workspacePath, programPath)}`);
          break;
        }
      }

      // Check for any Controllers directory
      const controllersMatches = await glob('**/Controllers/**', {
        cwd: workspacePath,
        nodir: false,
        absolute: false,
        ignore: ['**/node_modules/**', '**/bin/**', '**/obj/**', '**/.git/**']
      });
      if (controllersMatches.length > 0) {
        projectType = 'web-api';
        confidence = Math.max(confidence, 90);
        indicators.push('Controllers folder present');
      }

      // Check for Startup.cs anywhere (older ASP.NET Core)
      const startupFiles = await glob('**/Startup.cs', {
        cwd: workspacePath,
        absolute: true,
        ignore: ['**/node_modules/**', '**/bin/**', '**/obj/**', '**/.git/**']
      });
      if (startupFiles.length > 0) {
        projectType = 'web-api';
        confidence = Math.max(confidence, 90);
        indicators.push('Startup.cs found (ASP.NET Core)');
      }

      // Inspect first csproj to infer type
      const csprojContent = await fs.readFile(csprojFiles[0], 'utf-8');
      if (csprojContent.includes('Microsoft.NET.Sdk.Web')) {
        projectType = 'web-api';
        confidence = Math.max(confidence, 95);
        indicators.push('Microsoft.NET.Sdk.Web detected in .csproj');
      }
      
      if (csprojContent.includes('Microsoft.AspNetCore')) {
        projectType = 'web-api';
        confidence = Math.max(confidence, 90);
        indicators.push('Microsoft.AspNetCore package reference found in .csproj');
      }
      
      // Check for console app
      if (csprojContent.includes('<OutputType>Exe</OutputType>') && projectType === 'library') {
        projectType = 'cli';
        confidence = Math.max(confidence, 85);
        indicators.push('Console application (OutputType=Exe)');
      }

    } catch (error) {
      console.warn('Error detecting C# project type:', error);
      return null;
    }

    return {
      projectType,
      confidence,
      indicators,
      language: 'csharp'
    };
  }

  /**
   * Detect JavaScript/TypeScript project type
   */
  private async detectJavaScriptProjectType(workspacePath: string): Promise<ProjectTypeDetection | null> {
    const indicators: string[] = [];
    let projectType: ProjectType = 'library';
    let confidence = 0;
    
    try {
      const packageJsonPath = path.join(workspacePath, 'package.json');
      if (!await this.fileExists(packageJsonPath)) {
        return null; // Not a JS/TS project
      }
      
      confidence = 50; // Base confidence for having package.json
      indicators.push('JavaScript/TypeScript project detected (package.json found)');

      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Check for React
      if (deps.react) {
        projectType = 'spa';
        confidence = 90;
        indicators.push('React SPA detected');
        
        if (deps.next) {
          indicators.push('Next.js framework');
          confidence = 95;
        } else if (deps.vite) {
          indicators.push('Vite build tool');
        }
      }

      // Check for Vue
      if (deps.vue) {
        projectType = 'spa';
        confidence = 90;
        indicators.push('Vue.js SPA detected');
        
        if (deps.nuxt) {
          indicators.push('Nuxt.js framework');
          confidence = 95;
        }
      }

      // Check for Angular
      if (deps['@angular/core']) {
        projectType = 'spa';
        confidence = 95;
        indicators.push('Angular SPA detected');
      }

      // Check for Node.js API frameworks
      if (deps.express || deps['@nestjs/core'] || deps.koa || deps.fastify) {
        projectType = 'web-api';
        confidence = 90;
        
        if (deps['@nestjs/core']) {
          indicators.push('NestJS API framework detected');
          confidence = 98;
        } else if (deps.express) {
          indicators.push('Express.js server detected');
        } else if (deps.fastify) {
          indicators.push('Fastify server detected');
        }
      }

      // Check for Electron
      if (deps.electron) {
        projectType = 'desktop';
        confidence = 95;
        indicators.push('Electron desktop application detected');
      }
      
      // Check for React Native
      if (deps['react-native']) {
        projectType = 'mobile';
        confidence = 95;
        indicators.push('React Native mobile app detected');
      }
      
      // Check for CLI tools
      if (deps.commander || deps.yargs || deps.inquirer) {
        projectType = 'cli';
        confidence = 80;
        indicators.push('CLI tool dependencies detected');
        
        if (packageJson.bin) {
          confidence = 95;
          indicators.push('Binary command defined in package.json');
        }
      }

    } catch (error) {
      console.warn('Error detecting JS/TS project type:', error);
      return null;
    }

    return {
      projectType,
      confidence,
      indicators,
      language: 'typescript'
    };
  }

  /**
   * Detect Python project type
   */
  private async detectPythonProjectType(workspacePath: string): Promise<ProjectTypeDetection | null> {
    const indicators: string[] = [];
    let projectType: ProjectType = 'library';
    let confidence = 0;
    
    try {
      // Check for Python project markers
      const hasRequirements = await this.fileExists(path.join(workspacePath, 'requirements.txt'));
      const hasPyproject = await this.fileExists(path.join(workspacePath, 'pyproject.toml'));
      const hasSetup = await this.fileExists(path.join(workspacePath, 'setup.py'));
      
      if (!hasRequirements && !hasPyproject && !hasSetup) {
        return null; // Not a Python project
      }
      
      confidence = 50; // Base confidence for Python project
      indicators.push('Python project detected');
      
      // Check requirements.txt
      const requirements = await this.readRequirements(workspacePath);

      if (requirements.includes('fastapi')) {
        projectType = 'web-api';
        confidence = 95;
        indicators.push('FastAPI web framework detected');
      } else if (requirements.includes('django')) {
        projectType = 'web-api';
        confidence = 95;
        indicators.push('Django web framework detected');
      } else if (requirements.includes('flask')) {
        projectType = 'web-api';
        confidence = 90;
        indicators.push('Flask web framework detected');
      }

      // Check for main.py
      const mainPath = path.join(workspacePath, 'main.py');
      if (await this.fileExists(mainPath)) {
        const content = await fs.readFile(mainPath, 'utf-8');
        if (content.includes('from fastapi') || content.includes('import fastapi')) {
          projectType = 'web-api';
          confidence = Math.max(confidence, 95);
          indicators.push('FastAPI imports in main.py');
        } else if (content.includes('from flask') || content.includes('import flask')) {
          projectType = 'web-api';
          confidence = Math.max(confidence, 90);
          indicators.push('Flask imports in main.py');
        }
      }

      // Check for manage.py (Django)
      if (await this.fileExists(path.join(workspacePath, 'manage.py'))) {
        projectType = 'web-api';
        confidence = Math.max(confidence, 95);
        indicators.push('manage.py found (Django project)');
      }
      
      // Check for CLI frameworks
      if (requirements.includes('click') || requirements.includes('argparse')) {
        projectType = 'cli';
        confidence = 80;
        indicators.push('CLI framework detected');
      }

    } catch (error) {
      console.warn('Error detecting Python project type:', error);
      return null;
    }

    return {
      projectType,
      confidence,
      indicators,
      language: 'python'
    };
  }

  /**
   * Detect Java project type
   */
  private async detectJavaProjectType(workspacePath: string): Promise<string> {
    try {
      // Check pom.xml for Spring Boot
      const pomPath = path.join(workspacePath, 'pom.xml');
      if (await this.fileExists(pomPath)) {
        const content = await fs.readFile(pomPath, 'utf-8');
        if (content.includes('spring-boot-starter')) {
          return 'spring-boot';
        }
      }

      // Check build.gradle for Spring Boot
      const gradlePath = path.join(workspacePath, 'build.gradle');
      if (await this.fileExists(gradlePath)) {
        const content = await fs.readFile(gradlePath, 'utf-8');
        if (content.includes('spring-boot')) {
          return 'spring-boot';
        }
      }

    } catch (error) {
      // Ignore errors
    }

    return 'library';
  }

  /**
   * Detect Go project type
   */
  private async detectGoProjectType(workspacePath: string): Promise<string> {
    try {
      // Check go.mod for gin
      const goModPath = path.join(workspacePath, 'go.mod');
      if (await this.fileExists(goModPath)) {
        const content = await fs.readFile(goModPath, 'utf-8');
        if (content.includes('github.com/gin-gonic/gin')) {
          return 'gin-api';
        }
      }

      // Check for main.go with gin
      const mainPath = path.join(workspacePath, 'main.go');
      if (await this.fileExists(mainPath)) {
        const content = await fs.readFile(mainPath, 'utf-8');
        if (content.includes('"github.com/gin-gonic/gin"')) {
          return 'gin-api';
        }
      }

    } catch (error) {
      // Ignore errors
    }

    return 'library';
  }

  /**
   * Detect Rust project type
   */
  private async detectRustProjectType(workspacePath: string): Promise<string> {
    try {
      // Check Cargo.toml for actix-web
      const cargoPath = path.join(workspacePath, 'Cargo.toml');
      if (await this.fileExists(cargoPath)) {
        const content = await fs.readFile(cargoPath, 'utf-8');
        if (content.includes('actix-web')) {
          return 'actix-web';
        }
      }

    } catch (error) {
      // Ignore errors
    }

    return 'library';
  }

  // Helper methods

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  private async findFiles(dirPath: string, pattern: string): Promise<string[]> {
    try {
      const files = await fs.readdir(dirPath);
      const matchingFiles: string[] = [];

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
          // Simple pattern matching (e.g., *.csproj)
          const regex = new RegExp(pattern.replace('*', '.*'));
          if (regex.test(file)) {
            matchingFiles.push(filePath);
          }
        }
      }

      return matchingFiles;
    } catch {
      return [];
    }
  }

  private async readRequirements(workspacePath: string): Promise<string> {
    const files = [
      'requirements.txt',
      'requirements-dev.txt',
      'dev-requirements.txt',
      'pyproject.toml'
    ];

    for (const file of files) {
      const filePath = path.join(workspacePath, file);
      if (await this.fileExists(filePath)) {
        try {
          return await fs.readFile(filePath, 'utf-8');
        } catch {
          continue;
        }
      }
    }

    return '';
  }
}

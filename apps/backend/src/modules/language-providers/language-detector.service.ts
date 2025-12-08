import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface LanguageIndicator {
  files: string[];
  priority: number; // Higher = more definitive
}

@Injectable()
export class LanguageDetectorService {
  private readonly indicators: Record<string, LanguageIndicator> = {
    javascript: {
      files: ['package.json', 'tsconfig.json', 'yarn.lock', 'package-lock.json'],
      priority: 10
    },
    python: {
      files: ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile', 'poetry.lock'],
      priority: 10
    },
    csharp: {
      files: ['*.csproj', '*.sln', 'nuget.config'],
      priority: 10
    },
    java: {
      files: ['pom.xml', 'build.gradle', 'build.gradle.kts', 'settings.gradle'],
      priority: 10
    },
    go: {
      files: ['go.mod', 'go.sum'],
      priority: 10
    },
    rust: {
      files: ['Cargo.toml', 'Cargo.lock'],
      priority: 10
    },
    ruby: {
      files: ['Gemfile', 'Gemfile.lock', 'Rakefile'],
      priority: 10
    },
    php: {
      files: ['composer.json', 'composer.lock'],
      priority: 10
    }
  };

  private readonly extensionMap: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'javascript',
    '.tsx': 'javascript',
    '.mjs': 'javascript',
    '.cjs': 'javascript',
    '.py': 'python',
    '.cs': 'csharp',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.rb': 'ruby',
    '.php': 'php'
  };

  async detectLanguages(workspacePath: string): Promise<string[]> {
    const detectedLanguages = new Map<string, number>();

    // Step 1: Check for language indicator files (high confidence)
    for (const [language, indicator] of Object.entries(this.indicators)) {
      for (const pattern of indicator.files) {
        const files = await glob(path.join(workspacePath, pattern), {
          nodir: true,
          absolute: false
        });

        if (files.length > 0) {
          const currentPriority = detectedLanguages.get(language) || 0;
          detectedLanguages.set(language, Math.max(currentPriority, indicator.priority));
          break;
        }
      }
    }

    // Step 2: If no indicators found, scan file extensions (fallback)
    if (detectedLanguages.size === 0) {
      await this.detectByExtensions(workspacePath, detectedLanguages);
    }

    // Sort by priority and return language names
    return Array.from(detectedLanguages.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([lang]) => lang);
  }

  private async detectByExtensions(
    workspacePath: string,
    detectedLanguages: Map<string, number>
  ): Promise<void> {
    const pattern = path.join(workspacePath, '**/*');
    const files = await glob(pattern, {
      nodir: true,
      ignore: [
        '**/node_modules/**',
        '**/venv/**',
        '**/env/**',
        '**/bin/**',
        '**/obj/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**'
      ],
      absolute: false
    });

    const extensionCounts = new Map<string, number>();

    for (const file of files) {
      const ext = path.extname(file);
      if (this.extensionMap[ext]) {
        const count = extensionCounts.get(ext) || 0;
        extensionCounts.set(ext, count + 1);
      }
    }

    // Convert extension counts to language priorities
    for (const [ext, count] of extensionCounts) {
      const language = this.extensionMap[ext];
      const currentCount = detectedLanguages.get(language) || 0;
      detectedLanguages.set(language, currentCount + count);
    }
  }

  async getPrimaryLanguage(workspacePath: string): Promise<string | null> {
    const languages = await this.detectLanguages(workspacePath);
    return languages.length > 0 ? languages[0] : null;
  }

  async isMultiLanguageProject(workspacePath: string): Promise<boolean> {
    const languages = await this.detectLanguages(workspacePath);
    return languages.length > 1;
  }
}

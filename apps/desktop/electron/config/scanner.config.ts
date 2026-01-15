/**
 * Scanner Configuration
 * 
 * Loads user configuration from project's qagent.config.js/ts
 * Falls back to auto-detection if not present.
 */

import * as path from 'path';
import { promises as fs } from 'fs';
import { ScannerConfig, DeepPartial } from '../plugins/types';
import { DEFAULT_CONFIG } from '../plugins/index';

/**
 * Load scanner configuration from project root
 */
export async function loadScannerConfig(
  projectPath: string
): Promise<DeepPartial<ScannerConfig>> {
  const configPaths = [
    'qagent.config.js',
    'qagent.config.ts',
    'qagent.config.json',
    '.qagentrc',
    '.qagentrc.json',
  ];

  for (const configFile of configPaths) {
    const configPath = path.join(projectPath, configFile);
    
    try {
      await fs.access(configPath);
      
      // For JSON files, read and parse directly
      if (configFile.endsWith('.json') || configFile === '.qagentrc') {
        const content = await fs.readFile(configPath, 'utf-8');
        return JSON.parse(content);
      }
      
      // For JS/TS files, we'd need to dynamically import
      // In Electron context, we can use require
      // Note: This is simplified - in production, handle TS compilation
      if (configFile.endsWith('.js')) {
        // Clear require cache to get fresh config
        delete require.cache[require.resolve(configPath)];
        const config = require(configPath);
        return config.default || config;
      }
      
    } catch {
      // Config file not found or invalid, try next
      continue;
    }
  }

  // No config file found, return empty (will use defaults)
  return {};
}

/**
 * Merge user config with defaults
 */
export function mergeWithDefaults(
  userConfig: DeepPartial<ScannerConfig>
): ScannerConfig {
  return {
    plugins: {
      ...DEFAULT_CONFIG.plugins,
      ...userConfig.plugins,
    },
    patterns: {
      ...DEFAULT_CONFIG.patterns,
      ...userConfig.patterns,
    },
    selectors: {
      ...DEFAULT_CONFIG.selectors,
      ...userConfig.selectors,
    },
    paths: {
      ...DEFAULT_CONFIG.paths,
      ...userConfig.paths,
    },
    behavior: {
      ...DEFAULT_CONFIG.behavior,
      ...userConfig.behavior,
    },
  };
}

/**
 * Generate example config file content
 */
export function generateExampleConfig(): string {
  return `/**
 * QAgent Scanner Configuration
 * 
 * This file allows you to customize how QAgent analyzes your project.
 */

module.exports = {
  // Enable/disable specific plugin categories
  plugins: {
    frameworks: ['nextjs', 'react-router', 'vue'],
    forms: ['react-hook-form', 'formik', 'native-html', 'antd-form'],
    schema: ['prisma', 'typeorm', 'drizzle'],
    testing: ['jest', 'vitest', 'playwright'],
  },

  // Custom patterns for detection
  patterns: {
    // Patterns to identify test credentials in code
    testCredentials: [
      /test.*?:\\s*([^\\s/]+)\\s*\\/\\s*([^\\s]+)/i,
    ],
    
    // Routes that require authentication
    protectedRoutes: [
      /\\/dashboard/i,
      /\\/admin/i,
      /\\/settings/i,
    ],
    
    // Forms related to authentication
    authForms: [
      /login/i,
      /sign[-_]?in/i,
      /register/i,
    ],
  },

  // Selector generation preferences
  selectors: {
    // Order of preference for selector generation
    priority: ['data-testid', 'name', 'label', 'placeholder', 'role'],
    
    // Custom test ID attribute (e.g., 'data-cy' for Cypress)
    customTestIdAttribute: undefined,
  },

  // Path configuration
  paths: {
    // Directories to ignore during scanning
    ignore: ['node_modules', '.git', 'dist', 'build'],
    
    // Directories to include (leave empty to scan all)
    include: [],
    
    // Source root directory
    srcRoot: 'src',
  },

  // Behavior flags
  behavior: {
    // Analyze existing tests to avoid duplication
    analyzeExistingTests: true,
    
    // Infer entities from TypeScript types
    inferEntitiesFromTypes: true,
    
    // Generate test data suggestions
    generateTestData: true,
  },
};
`;
}

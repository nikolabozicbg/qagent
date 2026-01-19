"use strict";
/**
 * Scanner Configuration
 *
 * Loads user configuration from project's qagent.config.js/ts
 * Falls back to auto-detection if not present.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadScannerConfig = loadScannerConfig;
exports.mergeWithDefaults = mergeWithDefaults;
exports.generateExampleConfig = generateExampleConfig;
const path = __importStar(require("path"));
const fs_1 = require("fs");
const index_1 = require("../plugins/index");
/**
 * Load scanner configuration from project root
 */
async function loadScannerConfig(projectPath) {
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
            await fs_1.promises.access(configPath);
            // For JSON files, read and parse directly
            if (configFile.endsWith('.json') || configFile === '.qagentrc') {
                const content = await fs_1.promises.readFile(configPath, 'utf-8');
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
        }
        catch {
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
function mergeWithDefaults(userConfig) {
    return {
        plugins: {
            ...index_1.DEFAULT_CONFIG.plugins,
            ...userConfig.plugins,
        },
        patterns: {
            ...index_1.DEFAULT_CONFIG.patterns,
            ...userConfig.patterns,
        },
        selectors: {
            ...index_1.DEFAULT_CONFIG.selectors,
            ...userConfig.selectors,
        },
        paths: {
            ...index_1.DEFAULT_CONFIG.paths,
            ...userConfig.paths,
        },
        behavior: {
            ...index_1.DEFAULT_CONFIG.behavior,
            ...userConfig.behavior,
        },
    };
}
/**
 * Generate example config file content
 */
function generateExampleConfig() {
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

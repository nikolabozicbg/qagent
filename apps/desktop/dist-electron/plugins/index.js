"use strict";
/**
 * Plugin Registry
 *
 * Central registry for all scanner plugins.
 * Handles auto-detection, loading, and execution of plugins.
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pluginRegistry = exports.PluginRegistry = exports.DEFAULT_CONFIG = void 0;
const fs_1 = require("fs");
const path = __importStar(require("path"));
const ts = __importStar(require("typescript"));
// Import all plugins
const nextjs_plugin_1 = require("./frameworks/nextjs.plugin");
const react_router_plugin_1 = require("./frameworks/react-router.plugin");
const vue_plugin_1 = require("./frameworks/vue.plugin");
const react_hook_form_plugin_1 = require("./forms/react-hook-form.plugin");
const formik_plugin_1 = require("./forms/formik.plugin");
const native_html_plugin_1 = require("./forms/native-html.plugin");
const antd_form_plugin_1 = require("./forms/antd-form.plugin");
const prisma_plugin_1 = require("./schema/prisma.plugin");
const typeorm_plugin_1 = require("./schema/typeorm.plugin");
const drizzle_plugin_1 = require("./schema/drizzle.plugin");
const jest_plugin_1 = require("./testing/jest.plugin");
const vitest_plugin_1 = require("./testing/vitest.plugin");
const playwright_plugin_1 = require("./testing/playwright.plugin");
// ============================================
// DEFAULT CONFIGURATION
// ============================================
exports.DEFAULT_CONFIG = {
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
class PluginRegistry {
    constructor(config = {}) {
        this.plugins = new Map();
        this.config = this.mergeConfig(exports.DEFAULT_CONFIG, config);
        this.registerBuiltinPlugins();
    }
    mergeConfig(base, override) {
        return {
            plugins: { ...base.plugins, ...override.plugins },
            patterns: { ...base.patterns, ...override.patterns },
            selectors: { ...base.selectors, ...override.selectors },
            paths: { ...base.paths, ...override.paths },
            behavior: { ...base.behavior, ...override.behavior },
        };
    }
    /**
     * Register all built-in plugins
     */
    registerBuiltinPlugins() {
        // Framework plugins
        this.register(new nextjs_plugin_1.NextJSPlugin());
        this.register(new react_router_plugin_1.ReactRouterPlugin());
        this.register(new vue_plugin_1.VuePlugin());
        // Form plugins
        this.register(new react_hook_form_plugin_1.ReactHookFormPlugin());
        this.register(new formik_plugin_1.FormikPlugin());
        this.register(new native_html_plugin_1.NativeHtmlFormPlugin());
        this.register(new antd_form_plugin_1.AntdFormPlugin());
        // Schema plugins
        this.register(new prisma_plugin_1.PrismaPlugin());
        this.register(new typeorm_plugin_1.TypeORMPlugin());
        this.register(new drizzle_plugin_1.DrizzlePlugin());
        // Testing plugins
        this.register(new jest_plugin_1.JestPlugin());
        this.register(new vitest_plugin_1.VitestPlugin());
        this.register(new playwright_plugin_1.PlaywrightPlugin());
    }
    /**
     * Register a plugin
     */
    register(plugin) {
        this.plugins.set(plugin.name, plugin);
    }
    /**
     * Get all registered plugins
     */
    getPlugins() {
        return Array.from(this.plugins.values());
    }
    /**
     * Get plugins by type
     */
    getPluginsByType(type) {
        return this.getPlugins()
            .filter(p => p.type === type)
            .sort((a, b) => b.priority - a.priority);
    }
    /**
     * Create project context for detection
     */
    async createProjectContext(projectPath) {
        let packageJson = null;
        try {
            const pkgPath = path.join(projectPath, 'package.json');
            const content = await fs_1.promises.readFile(pkgPath, 'utf-8');
            packageJson = JSON.parse(content);
        }
        catch {
            // No package.json
        }
        return {
            projectPath,
            packageJson,
            fileExists: async (relativePath) => {
                try {
                    await fs_1.promises.access(path.join(projectPath, relativePath));
                    return true;
                }
                catch {
                    return false;
                }
            },
            readFile: async (relativePath) => {
                try {
                    return await fs_1.promises.readFile(path.join(projectPath, relativePath), 'utf-8');
                }
                catch {
                    return null;
                }
            },
            glob: async (pattern) => {
                // Simple glob implementation - in production, use a proper glob library
                return this.simpleGlob(projectPath, pattern);
            },
        };
    }
    /**
     * Simple glob implementation
     */
    async simpleGlob(baseDir, pattern) {
        const results = [];
        const ext = path.extname(pattern) || '';
        const walk = async (dir) => {
            try {
                const entries = await fs_1.promises.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    const relativePath = path.relative(baseDir, fullPath);
                    // Skip ignored directories
                    if (entry.isDirectory()) {
                        if (this.config.paths.ignore.includes(entry.name))
                            continue;
                        await walk(fullPath);
                    }
                    else if (entry.isFile()) {
                        // Match extension if specified
                        if (ext && !entry.name.endsWith(ext))
                            continue;
                        // Check against ignore patterns
                        const shouldIgnore = this.config.patterns.ignoreFiles.some(p => p.test(relativePath));
                        if (shouldIgnore)
                            continue;
                        results.push(relativePath);
                    }
                }
            }
            catch {
                // Skip directories that can't be read
            }
        };
        await walk(baseDir);
        return results;
    }
    /**
     * Detect which plugins are applicable for the project
     */
    async detectPlugins(projectPath) {
        const context = await this.createProjectContext(projectPath);
        const applicablePlugins = [];
        for (const plugin of this.getPlugins()) {
            // Check if plugin is enabled in config
            const pluginList = this.config.plugins[`${plugin.type}s`];
            if (!pluginList?.includes(plugin.name))
                continue;
            try {
                const isApplicable = await plugin.detect(context);
                if (isApplicable) {
                    applicablePlugins.push(plugin);
                    console.log(`   ✓ Detected: ${plugin.name}`);
                }
            }
            catch (err) {
                console.warn(`   ⚠ Plugin detection failed: ${plugin.name}`, err);
            }
        }
        return applicablePlugins;
    }
    /**
     * Run all applicable plugins and aggregate results
     */
    async scan(projectPath) {
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
        let frameworkResult = null;
        const frameworkPlugins = applicablePlugins.filter(p => p.type === 'framework');
        for (const plugin of frameworkPlugins) {
            try {
                const result = await plugin.analyze(analysisContext);
                if (result.success) {
                    frameworkResult = result;
                    analysisContext.frameworkResult = result;
                    console.log(`   ✓ ${plugin.name}: ${result.routes.length} routes, ${result.components.length} components`);
                    break; // Use first successful framework plugin
                }
            }
            catch (err) {
                console.warn(`   ⚠ ${plugin.name} failed:`, err);
            }
        }
        // Phase 4: Run schema plugins
        console.log('\n📊 Phase 4: Running schema plugins...');
        let schemaResult = null;
        const schemaPlugins = applicablePlugins.filter(p => p.type === 'schema');
        for (const plugin of schemaPlugins) {
            try {
                const result = await plugin.analyze(analysisContext);
                if (result.success) {
                    schemaResult = result;
                    analysisContext.schemaResult = result;
                    console.log(`   ✓ ${plugin.name}: ${result.entities.length} entities`);
                    break;
                }
            }
            catch (err) {
                console.warn(`   ⚠ ${plugin.name} failed:`, err);
            }
        }
        // Phase 5: Run form plugins
        console.log('\n📝 Phase 5: Running form plugins...');
        const formResults = [];
        const formPlugins = applicablePlugins.filter(p => p.type === 'form');
        for (const plugin of formPlugins) {
            try {
                const result = await plugin.analyze(analysisContext);
                if (result.success && result.forms.length > 0) {
                    formResults.push(result);
                    console.log(`   ✓ ${plugin.name}: ${result.forms.length} forms`);
                }
            }
            catch (err) {
                console.warn(`   ⚠ ${plugin.name} failed:`, err);
            }
        }
        // Phase 6: Run testing plugins
        console.log('\n🧪 Phase 6: Running testing plugins...');
        let testingResult = null;
        const testingPlugins = applicablePlugins.filter(p => p.type === 'testing');
        if (this.config.behavior.analyzeExistingTests) {
            for (const plugin of testingPlugins) {
                try {
                    const result = await plugin.analyze(analysisContext);
                    if (result.success) {
                        testingResult = result;
                        console.log(`   ✓ ${plugin.name}: ${result.testFiles.length} test files`);
                        break;
                    }
                }
                catch (err) {
                    console.warn(`   ⚠ ${plugin.name} failed:`, err);
                }
            }
        }
        else {
            console.log('   (Skipped - disabled in config)');
        }
        // Phase 7: Aggregate results
        console.log('\n🔗 Phase 7: Aggregating results...');
        const aggregated = this.aggregateResults(projectPath, applicablePlugins, frameworkResult, formResults, schemaResult, testingResult);
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
    async createAnalysisContext(projectPath) {
        const projectContext = await this.createProjectContext(projectPath);
        const sourceFiles = [];
        const parsedFiles = new Map();
        // Find and load all source files
        const extensions = ['.ts', '.tsx', '.js', '.jsx'];
        const walk = async (dir) => {
            try {
                const entries = await fs_1.promises.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    const relativePath = path.relative(projectPath, fullPath);
                    if (entry.isDirectory()) {
                        if (this.config.paths.ignore.includes(entry.name))
                            continue;
                        await walk(fullPath);
                    }
                    else if (entry.isFile()) {
                        const ext = path.extname(entry.name);
                        if (!extensions.includes(ext))
                            continue;
                        // Check ignore patterns
                        const shouldIgnore = this.config.patterns.ignoreFiles.some(p => p.test(relativePath));
                        if (shouldIgnore)
                            continue;
                        try {
                            const content = await fs_1.promises.readFile(fullPath, 'utf-8');
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
                            const sourceFile = ts.createSourceFile(fullPath, content, ts.ScriptTarget.Latest, true, scriptKind);
                            parsedFiles.set(fullPath, sourceFile);
                        }
                        catch {
                            // Skip files that can't be read
                        }
                    }
                }
            }
            catch {
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
    aggregateResults(projectPath, plugins, frameworkResult, formResults, schemaResult, testingResult) {
        // Merge forms from all form plugins
        const allForms = formResults.flatMap(r => r.forms);
        // Deduplicate forms by id
        const uniqueForms = new Map();
        for (const form of allForms) {
            if (!uniqueForms.has(form.id)) {
                uniqueForms.set(form.id, form);
            }
        }
        // Build relationships
        const entityToRoutes = {};
        const formToEntity = {};
        const routeToForms = {};
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
                inferredFlows: [], // Will be computed separately
            },
        };
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = this.mergeConfig(this.config, config);
    }
}
exports.PluginRegistry = PluginRegistry;
// Export singleton instance
exports.pluginRegistry = new PluginRegistry();
// Export types
__exportStar(require("./types"), exports);

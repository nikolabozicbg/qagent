"use strict";
/**
 * Next.js Framework Plugin
 *
 * Supports:
 * - App Router (app/ directory)
 * - Pages Router (pages/ directory)
 * - Middleware detection
 * - Server Actions
 * - Layout detection
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
exports.NextJSPlugin = void 0;
const path = __importStar(require("path"));
const ts = __importStar(require("typescript"));
class NextJSPlugin {
    constructor() {
        this.name = 'nextjs';
        this.version = '1.0.0';
        this.type = 'framework';
        this.priority = 100;
        this.routerType = null;
    }
    async detect(context) {
        const { packageJson } = context;
        if (!packageJson?.dependencies?.['next'] && !packageJson?.devDependencies?.['next']) {
            return false;
        }
        // Check for app or pages directory
        const hasAppDir = await context.fileExists('app') || await context.fileExists('src/app');
        const hasPagesDir = await context.fileExists('pages') || await context.fileExists('src/pages');
        if (hasAppDir) {
            this.routerType = 'app';
        }
        else if (hasPagesDir) {
            this.routerType = 'pages';
        }
        return hasAppDir || hasPagesDir;
    }
    async analyze(context) {
        const { packageJson, projectPath, sourceFiles, parsedFiles } = context;
        const routes = [];
        const components = [];
        const middleware = [];
        const serverActions = [];
        const navigationLinks = [];
        // Determine router type and base path
        let basePath = '';
        if (await context.fileExists('src/app')) {
            basePath = 'src/app';
            this.routerType = 'app';
        }
        else if (await context.fileExists('app')) {
            basePath = 'app';
            this.routerType = 'app';
        }
        else if (await context.fileExists('src/pages')) {
            basePath = 'src/pages';
            this.routerType = 'pages';
        }
        else if (await context.fileExists('pages')) {
            basePath = 'pages';
            this.routerType = 'pages';
        }
        // Extract routes based on router type
        if (this.routerType === 'app') {
            await this.extractAppRouterRoutes(context, basePath, routes);
        }
        else {
            await this.extractPagesRouterRoutes(context, basePath, routes);
        }
        // Extract components from all files
        for (const file of sourceFiles) {
            const parsed = parsedFiles.get(file.path);
            if (!parsed)
                continue;
            const component = this.extractComponent(parsed, file.path, file.content);
            if (component) {
                components.push(component);
            }
            // Extract navigation links
            const links = this.extractNavigationLinks(parsed, file.path);
            navigationLinks.push(...links);
            // Check for server actions
            if (this.routerType === 'app') {
                const actions = this.extractServerActions(parsed, file.path);
                serverActions.push(...actions);
            }
        }
        // Check for middleware
        const middlewareFile = sourceFiles.find(f => f.relativePath === 'middleware.ts' || f.relativePath === 'src/middleware.ts');
        if (middlewareFile) {
            const parsed = parsedFiles.get(middlewareFile.path);
            if (parsed) {
                const mw = this.extractMiddleware(parsed, middlewareFile.path);
                if (mw)
                    middleware.push(mw);
            }
        }
        // Get version
        const version = packageJson?.dependencies?.['next'] ||
            packageJson?.devDependencies?.['next'] ||
            'unknown';
        // Detect state management
        const stateManagement = [];
        const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies };
        if (deps?.['redux'] || deps?.['@reduxjs/toolkit'])
            stateManagement.push('redux');
        if (deps?.['zustand'])
            stateManagement.push('zustand');
        if (deps?.['recoil'])
            stateManagement.push('recoil');
        if (deps?.['jotai'])
            stateManagement.push('jotai');
        if (deps?.['mobx'])
            stateManagement.push('mobx');
        return {
            pluginName: this.name,
            success: true,
            framework: {
                name: 'next',
                version,
                router: this.routerType === 'app' ? 'app-router' : 'pages-router',
                stateManagement,
            },
            routes,
            components,
            middleware,
            serverActions,
        };
    }
    /**
     * Extract routes from App Router (app/ directory)
     */
    async extractAppRouterRoutes(context, basePath, routes) {
        const { sourceFiles, parsedFiles, projectPath } = context;
        // Find all page.tsx files
        const pageFiles = sourceFiles.filter(f => {
            const rel = f.relativePath;
            return rel.startsWith(basePath) &&
                (rel.endsWith('/page.tsx') || rel.endsWith('/page.ts') ||
                    rel.endsWith('/page.jsx') || rel.endsWith('/page.js'));
        });
        for (const file of pageFiles) {
            // Convert file path to route
            const relativePath = path.relative(basePath, path.dirname(file.relativePath));
            let routePath = '/' + relativePath
                .replace(/\\/g, '/')
                .replace(/\(.*?\)\//g, '') // Remove route groups like (auth)/
                .replace(/\[\.\.\.(\w+)\]/g, '*') // [...slug] -> *
                .replace(/\[(\w+)\]/g, '[$1]'); // [id] stays as [id]
            if (routePath === '/.')
                routePath = '/';
            // Check for dynamic params
            const isDynamic = routePath.includes('[');
            const params = (routePath.match(/\[(\w+)\]/g) || [])
                .map(p => p.slice(1, -1));
            // Check for layout
            const layoutPath = path.join(path.dirname(file.path), 'layout.tsx');
            const hasLayout = sourceFiles.some(f => f.path === layoutPath);
            // Determine if protected (check for auth middleware or layout)
            const isProtected = this.isRouteProtected(routePath, context.config);
            // Extract component name
            const parsed = parsedFiles.get(file.path);
            const componentName = parsed ? this.findExportedComponent(parsed) : null;
            routes.push({
                path: routePath,
                component: componentName,
                filePath: file.path,
                isProtected,
                isDynamic,
                params,
                layout: hasLayout ? layoutPath : undefined,
                forms: [],
                apis: [],
            });
        }
    }
    /**
     * Extract routes from Pages Router (pages/ directory)
     */
    async extractPagesRouterRoutes(context, basePath, routes) {
        const { sourceFiles, parsedFiles } = context;
        // Find all page files (excluding _app, _document, api)
        const pageFiles = sourceFiles.filter(f => {
            const rel = f.relativePath;
            if (!rel.startsWith(basePath))
                return false;
            if (rel.includes('/api/'))
                return false;
            if (rel.includes('_app.') || rel.includes('_document.') || rel.includes('_error.'))
                return false;
            const ext = path.extname(rel);
            return ['.tsx', '.ts', '.jsx', '.js'].includes(ext);
        });
        for (const file of pageFiles) {
            const relativePath = path.relative(basePath, file.relativePath);
            const ext = path.extname(relativePath);
            let routePath = '/' + relativePath
                .replace(/\\/g, '/')
                .replace(ext, '')
                .replace(/\/index$/, '')
                .replace(/\[\.\.\.(\w+)\]/g, '*')
                .replace(/\[(\w+)\]/g, '[$1]');
            if (routePath === '')
                routePath = '/';
            const isDynamic = routePath.includes('[');
            const params = (routePath.match(/\[(\w+)\]/g) || [])
                .map(p => p.slice(1, -1));
            const isProtected = this.isRouteProtected(routePath, context.config);
            const parsed = parsedFiles.get(file.path);
            const componentName = parsed ? this.findExportedComponent(parsed) : null;
            routes.push({
                path: routePath,
                component: componentName,
                filePath: file.path,
                isProtected,
                isDynamic,
                params,
                forms: [],
                apis: [],
            });
        }
    }
    /**
     * Check if route is protected based on patterns
     */
    isRouteProtected(routePath, config) {
        return config.patterns.protectedRoutes.some(p => p.test(routePath));
    }
    /**
     * Find exported component name from source file
     */
    findExportedComponent(sourceFile) {
        let componentName = null;
        const visit = (node) => {
            // export default function Name
            if (ts.isFunctionDeclaration(node) &&
                node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) &&
                node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword)) {
                componentName = node.name?.text || 'default';
            }
            // export default Name
            if (ts.isExportAssignment(node) && !node.isExportEquals) {
                if (ts.isIdentifier(node.expression)) {
                    componentName = node.expression.text;
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return componentName;
    }
    /**
     * Extract component info from source file
     */
    extractComponent(sourceFile, filePath, content) {
        let componentName = null;
        const hooks = [];
        const renderedElements = [];
        let hasState = false;
        let hasEffects = false;
        let hasForms = false;
        let isInteractive = false;
        const visit = (node) => {
            // Find function components
            if (ts.isFunctionDeclaration(node) && node.name) {
                const name = node.name.text;
                if (name[0] === name[0].toUpperCase()) {
                    componentName = name;
                }
            }
            // Find hooks
            if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
                const hookName = node.expression.text;
                if (hookName.startsWith('use')) {
                    hooks.push(hookName);
                    if (hookName === 'useState')
                        hasState = true;
                    if (hookName === 'useEffect' || hookName === 'useLayoutEffect')
                        hasEffects = true;
                    if (hookName === 'useForm')
                        hasForms = true;
                }
            }
            // Find JSX elements
            if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
                const tag = ts.isJsxElement(node)
                    ? node.openingElement.tagName.getText()
                    : node.tagName.getText();
                if (!renderedElements.includes(tag)) {
                    renderedElements.push(tag);
                }
                // Check for interactive elements
                const tagLower = tag.toLowerCase();
                if (['button', 'input', 'select', 'textarea', 'a', 'form'].includes(tagLower)) {
                    isInteractive = true;
                }
                if (tagLower === 'form')
                    hasForms = true;
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        if (!componentName)
            return null;
        return {
            name: componentName,
            filePath,
            renderedElements,
            isInteractive,
            props: [], // Would need more detailed analysis
            hooks,
            hasState,
            hasEffects,
            hasForms,
            complexity: this.calculateComplexity(content),
        };
    }
    /**
     * Calculate component complexity (0-1)
     */
    calculateComplexity(content) {
        const lines = content.split('\n').length;
        const hooks = (content.match(/use\w+\(/g) || []).length;
        const conditions = (content.match(/\?|if\s*\(|switch\s*\(/g) || []).length;
        // Simple heuristic
        const score = (lines / 500) + (hooks / 10) + (conditions / 20);
        return Math.min(1, score);
    }
    /**
     * Extract navigation links from source file
     */
    extractNavigationLinks(sourceFile, filePath) {
        const links = [];
        const fileName = path.basename(filePath, path.extname(filePath));
        const visit = (node) => {
            // Find <Link href="...">
            if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
                const openingElement = ts.isJsxElement(node) ? node.openingElement : node;
                const tagName = openingElement.tagName.getText();
                if (tagName === 'Link') {
                    const hrefAttr = openingElement.attributes.properties.find(attr => {
                        if (ts.isJsxAttribute(attr)) {
                            return attr.name.getText() === 'href';
                        }
                        return false;
                    });
                    if (hrefAttr && ts.isJsxAttribute(hrefAttr) && hrefAttr.initializer) {
                        let href = null;
                        if (ts.isStringLiteral(hrefAttr.initializer)) {
                            href = hrefAttr.initializer.text;
                        }
                        else if (ts.isJsxExpression(hrefAttr.initializer) &&
                            hrefAttr.initializer.expression &&
                            ts.isStringLiteral(hrefAttr.initializer.expression)) {
                            href = hrefAttr.initializer.expression.text;
                        }
                        if (href && href.startsWith('/')) {
                            // Try to get link text
                            let linkText = null;
                            if (ts.isJsxElement(node) && node.children.length > 0) {
                                const textChild = node.children.find(c => ts.isJsxText(c));
                                if (textChild) {
                                    linkText = textChild.getText().trim();
                                }
                            }
                            links.push({
                                from: fileName,
                                to: href,
                                linkText,
                                selector: `a[href="${href}"]`,
                                type: 'link',
                            });
                        }
                    }
                }
            }
            // Find router.push() calls
            if (ts.isCallExpression(node)) {
                const expr = node.expression;
                if (ts.isPropertyAccessExpression(expr)) {
                    const method = expr.name.getText();
                    if ((method === 'push' || method === 'replace') && node.arguments.length > 0) {
                        const arg = node.arguments[0];
                        if (ts.isStringLiteral(arg) && arg.text.startsWith('/')) {
                            links.push({
                                from: fileName,
                                to: arg.text,
                                linkText: null,
                                selector: null,
                                type: method,
                            });
                        }
                    }
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return links;
    }
    /**
     * Extract server actions from source file
     */
    extractServerActions(sourceFile, filePath) {
        const actions = [];
        // Check for 'use server' directive
        const hasUseServer = sourceFile.getText().includes("'use server'") ||
            sourceFile.getText().includes('"use server"');
        if (!hasUseServer)
            return actions;
        const visit = (node) => {
            // Find exported async functions
            if (ts.isFunctionDeclaration(node) && node.name) {
                const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
                const isAsync = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword);
                if (isExported && isAsync) {
                    actions.push({
                        name: node.name.text,
                        filePath,
                    });
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return actions;
    }
    /**
     * Extract middleware info
     */
    extractMiddleware(sourceFile, filePath) {
        let matcher = [];
        let type = 'other';
        const content = sourceFile.getText();
        // Find config.matcher
        const matcherMatch = content.match(/matcher:\s*\[([\s\S]*?)\]/);
        if (matcherMatch) {
            const patterns = matcherMatch[1].match(/'[^']+'/g) || [];
            matcher = patterns.map(p => p.slice(1, -1));
        }
        // Determine middleware type
        if (content.includes('auth') || content.includes('session') || content.includes('token')) {
            type = 'auth';
        }
        else if (content.includes('redirect')) {
            type = 'redirect';
        }
        else if (content.includes('rewrite')) {
            type = 'rewrite';
        }
        return {
            filePath,
            matcher,
            type,
        };
    }
}
exports.NextJSPlugin = NextJSPlugin;

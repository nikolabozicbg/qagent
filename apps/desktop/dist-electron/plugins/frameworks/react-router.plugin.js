"use strict";
/**
 * React Router Framework Plugin
 *
 * Supports:
 * - createBrowserRouter config
 * - <Routes>/<Route> JSX patterns
 * - Loaders and Actions
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
exports.ReactRouterPlugin = void 0;
const ts = __importStar(require("typescript"));
class ReactRouterPlugin {
    constructor() {
        this.name = 'react-router';
        this.version = '1.0.0';
        this.type = 'framework';
        this.priority = 90;
    }
    async detect(context) {
        const { packageJson } = context;
        const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies };
        return !!(deps?.['react-router'] || deps?.['react-router-dom']);
    }
    async analyze(context) {
        const { packageJson, sourceFiles, parsedFiles } = context;
        const routes = [];
        const components = [];
        // Look for route definitions
        for (const file of sourceFiles) {
            const parsed = parsedFiles.get(file.path);
            if (!parsed)
                continue;
            // Find createBrowserRouter calls
            const routerRoutes = this.findRouterConfig(parsed, file.path, context);
            routes.push(...routerRoutes);
            // Find <Route> components
            const jsxRoutes = this.findJsxRoutes(parsed, file.path, context);
            routes.push(...jsxRoutes);
        }
        // Deduplicate routes by path
        const uniqueRoutes = new Map();
        for (const route of routes) {
            if (!uniqueRoutes.has(route.path)) {
                uniqueRoutes.set(route.path, route);
            }
        }
        const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies };
        const version = deps?.['react-router-dom'] || deps?.['react-router'] || 'unknown';
        // Detect state management
        const stateManagement = [];
        if (deps?.['redux'] || deps?.['@reduxjs/toolkit'])
            stateManagement.push('redux');
        if (deps?.['zustand'])
            stateManagement.push('zustand');
        if (deps?.['recoil'])
            stateManagement.push('recoil');
        if (deps?.['mobx'])
            stateManagement.push('mobx');
        return {
            pluginName: this.name,
            success: true,
            framework: {
                name: 'react',
                version: packageJson?.dependencies?.['react'] || 'unknown',
                router: 'react-router',
                stateManagement,
            },
            routes: Array.from(uniqueRoutes.values()),
            components,
        };
    }
    findRouterConfig(sourceFile, filePath, context) {
        const routes = [];
        const content = sourceFile.getText();
        // Look for createBrowserRouter call
        if (!content.includes('createBrowserRouter'))
            return routes;
        const visit = (node) => {
            if (ts.isCallExpression(node) &&
                ts.isIdentifier(node.expression) &&
                node.expression.text === 'createBrowserRouter') {
                // Parse route array
                if (node.arguments.length > 0 && ts.isArrayLiteralExpression(node.arguments[0])) {
                    this.parseRouteArray(node.arguments[0], routes, filePath, '', context);
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return routes;
    }
    parseRouteArray(arrayNode, routes, filePath, parentPath, context) {
        for (const element of arrayNode.elements) {
            if (ts.isObjectLiteralExpression(element)) {
                let routePath = '';
                let component = null;
                let children = null;
                for (const prop of element.properties) {
                    if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
                        const propName = prop.name.text;
                        if (propName === 'path' && ts.isStringLiteral(prop.initializer)) {
                            routePath = prop.initializer.text;
                        }
                        if (propName === 'element' && ts.isJsxElement(prop.initializer)) {
                            const tag = prop.initializer.openingElement.tagName.getText();
                            component = tag;
                        }
                        if (propName === 'Component' && ts.isIdentifier(prop.initializer)) {
                            component = prop.initializer.text;
                        }
                        if (propName === 'children' && ts.isArrayLiteralExpression(prop.initializer)) {
                            children = prop.initializer;
                        }
                    }
                }
                const fullPath = parentPath + (routePath.startsWith('/') ? routePath : '/' + routePath);
                const normalizedPath = fullPath.replace(/\/+/g, '/') || '/';
                if (routePath) {
                    const isDynamic = normalizedPath.includes(':');
                    const params = (normalizedPath.match(/:(\w+)/g) || []).map(p => p.slice(1));
                    routes.push({
                        path: normalizedPath.replace(/:(\w+)/g, '[$1]'), // Convert :id to [id]
                        component,
                        filePath,
                        isProtected: context.config.patterns.protectedRoutes.some(p => p.test(normalizedPath)),
                        isDynamic,
                        params,
                        forms: [],
                        apis: [],
                    });
                }
                // Process children routes
                if (children) {
                    this.parseRouteArray(children, routes, filePath, normalizedPath, context);
                }
            }
        }
    }
    findJsxRoutes(sourceFile, filePath, context) {
        const routes = [];
        const visit = (node, parentPath = '') => {
            if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
                const openingElement = ts.isJsxElement(node) ? node.openingElement : node;
                const tagName = openingElement.tagName.getText();
                if (tagName === 'Route') {
                    let routePath = '';
                    let component = null;
                    for (const attr of openingElement.attributes.properties) {
                        if (ts.isJsxAttribute(attr) && attr.name) {
                            const attrName = attr.name.getText();
                            if (attrName === 'path' && attr.initializer) {
                                if (ts.isStringLiteral(attr.initializer)) {
                                    routePath = attr.initializer.text;
                                }
                                else if (ts.isJsxExpression(attr.initializer) &&
                                    attr.initializer.expression &&
                                    ts.isStringLiteral(attr.initializer.expression)) {
                                    routePath = attr.initializer.expression.text;
                                }
                            }
                            if ((attrName === 'element' || attrName === 'component') && attr.initializer) {
                                if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
                                    if (ts.isJsxElement(attr.initializer.expression) ||
                                        ts.isJsxSelfClosingElement(attr.initializer.expression)) {
                                        const tag = ts.isJsxElement(attr.initializer.expression)
                                            ? attr.initializer.expression.openingElement.tagName.getText()
                                            : attr.initializer.expression.tagName.getText();
                                        component = tag;
                                    }
                                }
                            }
                        }
                    }
                    if (routePath) {
                        const fullPath = parentPath + (routePath.startsWith('/') ? routePath : '/' + routePath);
                        const normalizedPath = fullPath.replace(/\/+/g, '/') || '/';
                        const isDynamic = normalizedPath.includes(':');
                        const params = (normalizedPath.match(/:(\w+)/g) || []).map(p => p.slice(1));
                        routes.push({
                            path: normalizedPath.replace(/:(\w+)/g, '[$1]'),
                            component,
                            filePath,
                            isProtected: context.config.patterns.protectedRoutes.some(p => p.test(normalizedPath)),
                            isDynamic,
                            params,
                            forms: [],
                            apis: [],
                        });
                        // Process nested routes
                        if (ts.isJsxElement(node)) {
                            for (const child of node.children) {
                                visit(child, normalizedPath);
                            }
                        }
                        return;
                    }
                }
            }
            ts.forEachChild(node, (child) => visit(child, parentPath));
        };
        visit(sourceFile);
        return routes;
    }
}
exports.ReactRouterPlugin = ReactRouterPlugin;

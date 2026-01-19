"use strict";
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
exports.scanProjectV7 = scanProjectV7;
const fs_1 = require("fs");
const path = __importStar(require("path"));
const ts = __importStar(require("typescript"));
const IGNORE_DIRS = new Set([
    'node_modules', '.git', '.next', 'dist', 'build', 'out',
    '.cache', 'coverage', '.turbo', '.nx'
]);
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
async function scanProjectV7(projectPath) {
    const projectName = path.basename(projectPath);
    const sourceFiles = [];
    await walk(projectPath, sourceFiles);
    const routes = await extractNextRoutes(projectPath);
    const pageIdByFile = new Map();
    const nodes = [];
    const edges = [];
    // Phase 2.1: file-level caches for deterministic one-hop call-through
    const sfCache = new Map();
    const functionIndexCache = new Map();
    const exportsCache = new Map();
    const importIndexCache = new Map();
    const moduleResolveCache = new Map();
    // Pages
    for (const r of routes) {
        const pageId = `page:${r.route}`;
        nodes.push({
            id: pageId,
            type: 'Page',
            route: r.route,
            filePath: r.filePath,
        });
        pageIdByFile.set(r.filePath, pageId);
    }
    // Parse files for forms and user actions + AST-based behavior signals
    for (const filePath of sourceFiles) {
        const ext = path.extname(filePath);
        if (!SOURCE_EXTENSIONS.has(ext))
            continue;
        const content = await fs_1.promises.readFile(filePath, 'utf-8').catch(() => null);
        if (!content)
            continue;
        const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ext === '.tsx' || ext === '.jsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
        const rel = path.relative(projectPath, filePath);
        sfCache.set(rel, sf);
        const pageIdForFile = pageIdByFile.get(rel);
        const imports = collectImports(sf);
        importIndexCache.set(rel, imports);
        // Phase 2.1: deterministically resolve relative imports (one-hop only) so call-through can inline.
        await prewarmRelativeImports(projectPath, rel, imports, {
            sfCache,
            functionIndexCache,
            exportsCache,
            importIndexCache,
            moduleResolveCache,
        });
        const navVars = collectNavigationVariables(sf);
        const mutationVars = collectMutationVariables(sf);
        const functionIndex = indexFunctions(sf);
        functionIndexCache.set(rel, functionIndex);
        exportsCache.set(rel, collectExportedNames(sf));
        // C) Conditional → Navigation (page-level only when deterministically tied to a Page file)
        // Detect: if (...) redirect('<literal>') / ternary returning redirect('<literal>')
        if (pageIdForFile) {
            const conditionalRedirect = findDeterministicRedirectInConditionals(sf);
            if (conditionalRedirect && conditionalRedirect.unique) {
                const condId = stableId(`cond:${rel}:${conditionalRedirect.line}`);
                const navId = stableId(`nav:${conditionalRedirect.to}:${rel}:${conditionalRedirect.line}`);
                nodes.push({
                    id: condId,
                    type: 'Conditional',
                    condition: conditionalRedirect.conditionText || undefined,
                    filePath: rel,
                    line: conditionalRedirect.line,
                });
                nodes.push({
                    id: navId,
                    type: 'Navigation',
                    to: conditionalRedirect.to,
                    filePath: rel,
                    line: conditionalRedirect.line,
                });
                edges.push({
                    id: `edge:${condId}:blocks:${pageIdForFile}`,
                    type: 'blocks',
                    source: condId,
                    target: pageIdForFile,
                });
                edges.push({
                    id: `edge:${condId}:redirects_to:${navId}`,
                    type: 'redirects_to',
                    source: condId,
                    target: navId,
                });
            }
        }
        // Forms (<form onSubmit={...}>)
        findJSXElements(sf, 'form').forEach(el => {
            const onSubmitExpr = getJSXPropExpressionNode(el, 'onSubmit');
            const formId = stableId(`form:${rel}:${sf.getLineAndCharacterOfPosition(el.pos).line + 1}`);
            const fields = collectInputFieldNames(el);
            nodes.push({
                id: formId,
                type: 'Form',
                filePath: rel,
                line: sf.getLineAndCharacterOfPosition(el.pos).line + 1,
                fields: fields.map(name => ({ name })),
            });
            if (onSubmitExpr) {
                const line = sf.getLineAndCharacterOfPosition(el.pos).line + 1;
                const actionId = stableId(`ua:submit:${rel}:${line}`);
                nodes.push({
                    id: actionId,
                    type: 'UserAction',
                    actionType: 'submit',
                    label: onSubmitExpr.getText(sf),
                    filePath: rel,
                    line,
                });
                edges.push({
                    id: `edge:${actionId}:triggers:${formId}`,
                    type: 'triggers',
                    source: actionId,
                    target: formId,
                });
                // A) UserAction → Navigation (in handler): router.push/replace('<literal>') OR redirect('<literal>')
                // B) UserAction → ApiCall (in handler): fetch('<literal>') OR axios.<method>('<literal>') OR importedClient.<method>('<literal>')
                const handler = resolveHandlerExpression(onSubmitExpr, functionIndex);
                if (handler) {
                    const nav = detectDeterministicNavigationFromHandler(handler, sf, navVars);
                    if (nav && nav.unique) {
                        const navId = stableId(`nav:${nav.to}:${rel}:${nav.line}`);
                        nodes.push({ id: navId, type: 'Navigation', to: nav.to, filePath: rel, line: nav.line });
                        edges.push({
                            id: `edge:${actionId}:results_in:${navId}`,
                            type: 'results_in',
                            source: actionId,
                            target: navId,
                        });
                    }
                    const api = detectDeterministicApiCallFromHandler(handler, sf, rel, imports, {
                        projectPath,
                        sfCache,
                        functionIndexCache,
                        exportsCache,
                        importIndexCache,
                        moduleResolveCache,
                    });
                    const apiId = api && api.unique
                        ? stableId(`api:${api.method}:${api.endpoint}:${rel}:${api.line}`)
                        : null;
                    if (api && api.unique && apiId) {
                        nodes.push({ id: apiId, type: 'ApiCall', method: api.method, endpoint: api.endpoint, filePath: rel, line: api.line });
                        edges.push({
                            id: `edge:${actionId}:triggers:${apiId}`,
                            type: 'triggers',
                            source: actionId,
                            target: apiId,
                        });
                    }
                    const mutations = detectDeterministicStateMutationsFromHandler(handler, sf, rel, mutationVars, {
                        projectPath,
                        sfCache,
                        functionIndexCache,
                        exportsCache,
                        importIndexCache,
                        moduleResolveCache,
                    });
                    if (mutations.length > 0) {
                        const stateIds = [];
                        for (const m of mutations) {
                            const stateId = stableId(`state:${m.mutationType}:${m.stateKey}:${rel}:${m.line}`);
                            stateIds.push(stateId);
                            nodes.push({
                                id: stateId,
                                type: 'StateMutation',
                                mutationType: m.mutationType,
                                stateKey: m.stateKey,
                                filePath: rel,
                                line: m.line,
                            });
                        }
                        // Add a causal edge only when deterministic (single unique mutation)
                        const uniqueKeys = new Set(mutations.map(m => `${m.mutationType}:${m.stateKey}`));
                        if (uniqueKeys.size === 1 && stateIds.length >= 1) {
                            const stateId = stateIds[0];
                            if (apiId) {
                                edges.push({ id: `edge:${apiId}:results_in:${stateId}`, type: 'results_in', source: apiId, target: stateId });
                            }
                            else {
                                edges.push({ id: `edge:${actionId}:results_in:${stateId}`, type: 'results_in', source: actionId, target: stateId });
                            }
                        }
                    }
                    const cond = detectDeterministicConditionalRedirectFromHandler(handler, sf);
                    if (cond && cond.unique) {
                        const condId = stableId(`cond:${rel}:${cond.line}`);
                        const navId = stableId(`nav:${cond.to}:${rel}:${cond.line}`);
                        nodes.push({ id: condId, type: 'Conditional', condition: cond.conditionText || undefined, filePath: rel, line: cond.line });
                        nodes.push({ id: navId, type: 'Navigation', to: cond.to, filePath: rel, line: cond.line });
                        edges.push({ id: `edge:${condId}:blocks:${actionId}`, type: 'blocks', source: condId, target: actionId });
                        edges.push({ id: `edge:${condId}:redirects_to:${navId}`, type: 'redirects_to', source: condId, target: navId });
                    }
                }
            }
        });
        // Buttons with onClick
        findJSXElements(sf, 'button').forEach(el => {
            const onClickExpr = getJSXPropExpressionNode(el, 'onClick');
            if (!onClickExpr)
                return;
            const line = sf.getLineAndCharacterOfPosition(el.pos).line + 1;
            const actionId = stableId(`ua:click:${rel}:${line}`);
            nodes.push({
                id: actionId,
                type: 'UserAction',
                actionType: 'click',
                label: onClickExpr.getText(sf),
                filePath: rel,
                line,
            });
            const handler = resolveHandlerExpression(onClickExpr, functionIndex);
            if (handler) {
                const nav = detectDeterministicNavigationFromHandler(handler, sf, navVars);
                if (nav && nav.unique) {
                    const navId = stableId(`nav:${nav.to}:${rel}:${nav.line}`);
                    nodes.push({ id: navId, type: 'Navigation', to: nav.to, filePath: rel, line: nav.line });
                    edges.push({ id: `edge:${actionId}:results_in:${navId}`, type: 'results_in', source: actionId, target: navId });
                }
                const api = detectDeterministicApiCallFromHandler(handler, sf, rel, imports, {
                    projectPath,
                    sfCache,
                    functionIndexCache,
                    exportsCache,
                    importIndexCache,
                    moduleResolveCache,
                });
                const apiId = api && api.unique
                    ? stableId(`api:${api.method}:${api.endpoint}:${rel}:${api.line}`)
                    : null;
                if (api && api.unique && apiId) {
                    nodes.push({ id: apiId, type: 'ApiCall', method: api.method, endpoint: api.endpoint, filePath: rel, line: api.line });
                    edges.push({ id: `edge:${actionId}:triggers:${apiId}`, type: 'triggers', source: actionId, target: apiId });
                }
                const mutations = detectDeterministicStateMutationsFromHandler(handler, sf, rel, mutationVars, {
                    projectPath,
                    sfCache,
                    functionIndexCache,
                    exportsCache,
                    importIndexCache,
                    moduleResolveCache,
                });
                if (mutations.length > 0) {
                    const stateIds = [];
                    for (const m of mutations) {
                        const stateId = stableId(`state:${m.mutationType}:${m.stateKey}:${rel}:${m.line}`);
                        stateIds.push(stateId);
                        nodes.push({
                            id: stateId,
                            type: 'StateMutation',
                            mutationType: m.mutationType,
                            stateKey: m.stateKey,
                            filePath: rel,
                            line: m.line,
                        });
                    }
                    const uniqueKeys = new Set(mutations.map(m => `${m.mutationType}:${m.stateKey}`));
                    if (uniqueKeys.size === 1 && stateIds.length >= 1) {
                        const stateId = stateIds[0];
                        if (apiId) {
                            edges.push({ id: `edge:${apiId}:results_in:${stateId}`, type: 'results_in', source: apiId, target: stateId });
                        }
                        else {
                            edges.push({ id: `edge:${actionId}:results_in:${stateId}`, type: 'results_in', source: actionId, target: stateId });
                        }
                    }
                }
                const cond = detectDeterministicConditionalRedirectFromHandler(handler, sf);
                if (cond && cond.unique) {
                    const condId = stableId(`cond:${rel}:${cond.line}`);
                    const navId = stableId(`nav:${cond.to}:${rel}:${cond.line}`);
                    nodes.push({ id: condId, type: 'Conditional', condition: cond.conditionText || undefined, filePath: rel, line: cond.line });
                    nodes.push({ id: navId, type: 'Navigation', to: cond.to, filePath: rel, line: cond.line });
                    edges.push({ id: `edge:${condId}:blocks:${actionId}`, type: 'blocks', source: condId, target: actionId });
                    edges.push({ id: `edge:${condId}:redirects_to:${navId}`, type: 'redirects_to', source: condId, target: navId });
                }
            }
        });
        // Link navigations (Next.js <Link href="/path">)
        findJSXElements(sf, 'Link').forEach(el => {
            const href = getJSXPropStringLiteral(el, 'href');
            if (!href)
                return;
            const navId = stableId(`nav:${href}:${rel}:${sf.getLineAndCharacterOfPosition(el.pos).line + 1}`);
            nodes.push({
                id: navId,
                type: 'Navigation',
                to: href,
                filePath: rel,
                line: sf.getLineAndCharacterOfPosition(el.pos).line + 1,
            });
        });
    }
    // Deduplicate nodes by id
    const nodeById = new Map();
    for (const n of nodes) {
        if (!nodeById.has(n.id))
            nodeById.set(n.id, n);
    }
    // Deduplicate edges by id
    const edgeById = new Map();
    for (const e of edges) {
        if (!edgeById.has(e.id))
            edgeById.set(e.id, e);
    }
    return {
        version: 'v7',
        project: {
            name: projectName,
            framework: { name: detectFrameworkName(projectPath), router: 'UNKNOWN' },
        },
        graph: {
            nodes: Array.from(nodeById.values()),
            edges: Array.from(edgeById.values()),
        },
    };
}
async function walk(dir, out) {
    const entries = await fs_1.promises.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const ent of entries) {
        if (ent.isDirectory()) {
            if (IGNORE_DIRS.has(ent.name))
                continue;
            await walk(path.join(dir, ent.name), out);
        }
        else {
            out.push(path.join(dir, ent.name));
        }
    }
}
function detectFrameworkName(projectPath) {
    // Deterministic best-effort: if next exists in package.json deps
    try {
        const pkg = require(path.join(projectPath, 'package.json'));
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        if (deps.next)
            return 'next';
        if (deps.react)
            return 'react';
    }
    catch { }
    return 'unknown';
}
async function extractNextRoutes(projectPath) {
    const routes = [];
    // App Router
    const appDir = path.join(projectPath, 'app');
    const hasApp = await fs_1.promises.stat(appDir).then(s => s.isDirectory()).catch(() => false);
    if (hasApp) {
        const pageFiles = [];
        await findFiles(appDir, pageFiles, (p) => /page\.(tsx?|jsx?)$/.test(p));
        for (const file of pageFiles) {
            const rel = path.relative(projectPath, file);
            const route = routeFromNextAppPage(rel);
            if (route)
                routes.push({ route, filePath: rel });
        }
    }
    // Pages Router
    const pagesDir = path.join(projectPath, 'pages');
    const hasPages = await fs_1.promises.stat(pagesDir).then(s => s.isDirectory()).catch(() => false);
    if (hasPages) {
        const pageFiles = [];
        await findFiles(pagesDir, pageFiles, (p) => /\.(tsx?|jsx?)$/.test(p));
        for (const file of pageFiles) {
            const rel = path.relative(projectPath, file);
            const route = routeFromNextPagesFile(rel);
            if (route)
                routes.push({ route, filePath: rel });
        }
    }
    // Dedupe
    const seen = new Set();
    return routes.filter(r => {
        if (seen.has(r.route))
            return false;
        seen.add(r.route);
        return true;
    });
}
async function findFiles(dir, out, pred) {
    const entries = await fs_1.promises.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (IGNORE_DIRS.has(ent.name))
                continue;
            await findFiles(full, out, pred);
        }
        else {
            if (pred(full))
                out.push(full);
        }
    }
}
function routeFromNextAppPage(relPath) {
    // relPath like app/(group)/products/[id]/page.tsx
    const m = relPath.match(/^app\/(.+)\/page\.(tsx?|jsx?)$/);
    if (!m)
        return null;
    let route = '/' + m[1];
    // remove route groups
    route = route.replace(/\/\([^)]+\)/g, '');
    route = route.replace(/\/+$/, '');
    if (route === '')
        route = '/';
    return route;
}
function routeFromNextPagesFile(relPath) {
    // relPath like pages/products/[id].tsx
    const m = relPath.match(/^pages\/(.+)\.(tsx?|jsx?)$/);
    if (!m)
        return null;
    let route = '/' + m[1];
    route = route.replace(/\/index$/i, '');
    route = route.replace(/\/+$/, '');
    if (route === '')
        route = '/';
    return route;
}
function findJSXElements(sourceFile, tagName) {
    const out = [];
    const visit = (node) => {
        if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
            const name = node.tagName.getText(sourceFile);
            if (name === tagName)
                out.push(node);
        }
        ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return out;
}
function getJSXPropExpressionText(el, propName) {
    const expr = getJSXPropExpressionNode(el, propName);
    return expr ? expr.getText() : null;
}
function getJSXPropExpressionNode(el, propName) {
    const attrs = el.attributes.properties;
    for (const a of attrs) {
        if (!ts.isJsxAttribute(a))
            continue;
        if (a.name.getText() !== propName)
            continue;
        if (!a.initializer)
            return null;
        if (ts.isJsxExpression(a.initializer) && a.initializer.expression) {
            return a.initializer.expression;
        }
    }
    return null;
}
function getJSXPropStringLiteral(el, propName) {
    const attrs = el.attributes.properties;
    for (const a of attrs) {
        if (!ts.isJsxAttribute(a))
            continue;
        if (a.name.getText() !== propName)
            continue;
        if (!a.initializer)
            return null;
        if (ts.isStringLiteral(a.initializer))
            return a.initializer.text;
        if (ts.isJsxExpression(a.initializer) && a.initializer.expression && ts.isStringLiteral(a.initializer.expression)) {
            return a.initializer.expression.text;
        }
    }
    return null;
}
function collectInputFieldNames(_formEl) {
    // Intentionally empty in MVP; field extraction requires walking the JSX subtree deterministically.
    // Unknown fields should remain UNKNOWN downstream.
    return [];
}
function collectImports(sf) {
    const axiosNames = new Set();
    const clientNames = new Set();
    const relativeNamedImports = new Map();
    const relativeDefaultImports = new Map();
    for (const st of sf.statements) {
        if (!ts.isImportDeclaration(st))
            continue;
        const moduleName = st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier) ? st.moduleSpecifier.text : null;
        const clause = st.importClause;
        if (!clause || !moduleName)
            continue;
        const isRelative = moduleName.startsWith('.');
        // default import: import axios from 'axios'
        if (clause.name) {
            const local = clause.name.text;
            if (moduleName === 'axios') {
                axiosNames.add(local);
            }
            else {
                // generic explicit client import (allowed pattern)
                clientNames.add(local);
            }
            if (isRelative) {
                relativeDefaultImports.set(local, { module: moduleName });
            }
        }
        // namespace import: import * as axios from 'axios'
        if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
            const local = clause.namedBindings.name.text;
            if (moduleName === 'axios') {
                axiosNames.add(local);
            }
            else {
                clientNames.add(local);
            }
            // No deterministic function resolution for namespace imports.
        }
        // named imports: import { foo as bar } from './x'
        if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
            for (const spec of clause.namedBindings.elements) {
                const local = spec.name.text;
                const imported = (spec.propertyName ? spec.propertyName.text : spec.name.text);
                clientNames.add(local);
                // also treat named 'axios' import from 'axios'
                if (moduleName === 'axios') {
                    clientNames.delete(local);
                    axiosNames.add(local);
                }
                if (isRelative) {
                    relativeNamedImports.set(local, { module: moduleName, imported });
                }
            }
        }
    }
    return { axiosNames, clientNames, relativeNamedImports, relativeDefaultImports };
}
function collectNavigationVariables(sf) {
    // Deterministic AST-only detection of common router patterns.
    // - Next.js: const router = useRouter();
    // - "useNavigation" (best-effort): const nav = useNavigation(); (treated as router-like object)
    // - React Router: const navigate = useNavigate(); (treated as navigate function)
    const routerObjects = new Set();
    const navigateFunctions = new Set();
    const visit = (node) => {
        if (ts.isVariableDeclaration(node) &&
            ts.isIdentifier(node.name) &&
            node.initializer &&
            ts.isCallExpression(node.initializer)) {
            const call = node.initializer;
            if (ts.isIdentifier(call.expression)) {
                const hookName = call.expression.text;
                if (hookName === 'useRouter' || hookName === 'useNavigation') {
                    routerObjects.add(node.name.text);
                }
                if (hookName === 'useNavigate') {
                    navigateFunctions.add(node.name.text);
                }
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(sf);
    return { routerObjects, navigateFunctions };
}
function collectMutationVariables(sf) {
    // Deterministic AST-only detection of common state mutation entrypoints.
    // - Redux: const dispatch = useDispatch();
    // - React Query: const qc = useQueryClient();
    const dispatchFunctions = new Set();
    const queryClients = new Set();
    const visit = (node) => {
        if (ts.isVariableDeclaration(node) &&
            ts.isIdentifier(node.name) &&
            node.initializer &&
            ts.isCallExpression(node.initializer)) {
            const call = node.initializer;
            if (ts.isIdentifier(call.expression)) {
                const hookName = call.expression.text;
                if (hookName === 'useDispatch') {
                    dispatchFunctions.add(node.name.text);
                }
                if (hookName === 'useQueryClient') {
                    queryClients.add(node.name.text);
                }
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(sf);
    return { dispatchFunctions, queryClients };
}
function indexFunctions(sf) {
    const byName = new Map();
    const visit = (node) => {
        if (ts.isFunctionDeclaration(node) && node.name) {
            byName.set(node.name.text, node);
        }
        if (ts.isVariableStatement(node)) {
            for (const decl of node.declarationList.declarations) {
                if (!ts.isIdentifier(decl.name))
                    continue;
                const name = decl.name.text;
                const init = decl.initializer;
                if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
                    byName.set(name, init);
                }
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(sf);
    return { byName };
}
function resolveHandlerExpression(expr, index) {
    // Inline arrow/function
    if (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr))
        return expr;
    // Identifier reference
    if (ts.isIdentifier(expr)) {
        return index.byName.get(expr.text) || null;
    }
    // Call expressions like handleSubmit(onSubmit): we can only use this if the first argument is identifier pointing to a function.
    if (ts.isCallExpression(expr) && expr.arguments.length >= 1) {
        const a0 = expr.arguments[0];
        if (ts.isIdentifier(a0)) {
            return index.byName.get(a0.text) || null;
        }
    }
    return null;
}
function detectDeterministicNavigationFromHandler(fn, sf, navVars) {
    const destinations = [];
    const visit = (node) => {
        if (ts.isCallExpression(node)) {
            const dest = extractDeterministicNavigation(node, sf, navVars);
            if (dest)
                destinations.push(dest);
        }
        ts.forEachChild(node, visit);
    };
    if (fn.body)
        visit(fn.body);
    if (destinations.length === 0)
        return null;
    // If multiple unique destinations exist, it's ambiguous -> omit edge
    const unique = new Map();
    for (const d of destinations) {
        unique.set(d.to, d.line);
        if (unique.size > 1)
            return { unique: false, to: destinations[0].to, line: destinations[0].line };
    }
    const [to] = unique.keys();
    const line = unique.get(to);
    return { unique: true, to, line };
}
function extractDeterministicNavigation(call, sf, navVars) {
    const line = sf.getLineAndCharacterOfPosition(call.getStart(sf)).line + 1;
    // Next.js / router-like objects: router.push('<literal>') / router.replace('<literal>')
    // Also support router.back() (no args) as a deterministic navigation event.
    if (ts.isPropertyAccessExpression(call.expression)) {
        const recv = call.expression.expression;
        const method = call.expression.name.text;
        if (ts.isIdentifier(recv) && navVars.routerObjects.has(recv.text)) {
            if (method === 'push' || method === 'replace') {
                if (call.arguments.length < 1)
                    return null;
                const to = getStringLiteral(call.arguments[0]);
                if (!to)
                    return null;
                return { to, line };
            }
            if (method === 'back') {
                // No route argument exists; represent as a deterministic navigation event.
                // We do not guess a route.
                return { to: 'BACK', line };
            }
        }
    }
    // React Router: navigate('/x') where navigate is a function returned by useNavigate()
    if (ts.isIdentifier(call.expression) && navVars.navigateFunctions.has(call.expression.text)) {
        if (call.arguments.length < 1)
            return null;
        const to = getStringLiteral(call.arguments[0]);
        if (!to)
            return null;
        return { to, line };
    }
    // redirect('<literal>')
    if (ts.isIdentifier(call.expression) && call.expression.text === 'redirect') {
        if (call.arguments.length < 1)
            return null;
        const to = getStringLiteral(call.arguments[0]);
        if (!to)
            return null;
        return { to, line };
    }
    return null;
}
function detectDeterministicApiCallFromHandler(fn, sf, relPath, imports, inlineCtx) {
    const calls = [];
    const visit = (node) => {
        if (ts.isCallExpression(node)) {
            // Phase 2 base detection
            const api = extractDeterministicApiCall(node, sf, imports);
            if (api)
                calls.push(api);
            // Phase 2.1: one-hop call-through
            const callee = resolveOneHopCallee(node, relPath, inlineCtx);
            if (callee && callee.fn.body) {
                const targetImports = inlineCtx.importIndexCache.get(callee.relPath) || collectImports(callee.sf);
                const scan = (n) => {
                    if (ts.isCallExpression(n)) {
                        const found = extractDeterministicApiCall(n, callee.sf, targetImports);
                        if (found)
                            calls.push(found);
                    }
                    ts.forEachChild(n, scan);
                };
                // one-hop only: we scan the callee body but do not inline further.
                scan(callee.fn.body);
            }
        }
        ts.forEachChild(node, visit);
    };
    if (fn.body)
        visit(fn.body);
    if (calls.length === 0)
        return null;
    // Ambiguous if more than one unique endpoint
    const unique = new Map();
    for (const c of calls) {
        unique.set(c.endpoint, { method: c.method, line: c.line });
        if (unique.size > 1)
            return { unique: false, endpoint: calls[0].endpoint, method: calls[0].method, line: calls[0].line };
    }
    const [endpoint] = unique.keys();
    const { method, line } = unique.get(endpoint);
    return { unique: true, endpoint, method, line };
}
function extractDeterministicApiCall(call, sf, imports) {
    if (call.arguments.length < 1)
        return null;
    const endpoint = getDeterministicEndpoint(call.arguments[0]);
    if (!endpoint)
        return null;
    const line = sf.getLineAndCharacterOfPosition(call.getStart(sf)).line + 1;
    // fetch(url, { method: 'POST' })
    // Phase 2 rule: method MUST be literal, otherwise omit.
    if (ts.isIdentifier(call.expression) && call.expression.text === 'fetch') {
        const method = extractMethodFromOptions(call.arguments[1]);
        if (!method)
            return null;
        return { endpoint, method, line };
    }
    // axios.<method>(url)
    // apiClient.<method>(url) where apiClient identifier is explicitly imported
    if (ts.isPropertyAccessExpression(call.expression)) {
        const recv = call.expression.expression;
        const methodName = call.expression.name.text;
        const method = methodName.toUpperCase();
        if (ts.isIdentifier(recv) && imports.axiosNames.has(recv.text)) {
            return { endpoint, method, line };
        }
        if (ts.isIdentifier(recv) && imports.clientNames.has(recv.text)) {
            return { endpoint, method, line };
        }
    }
    return null;
}
function extractMethodFromOptions(arg) {
    if (!arg || !ts.isObjectLiteralExpression(arg))
        return undefined;
    for (const p of arg.properties) {
        if (!ts.isPropertyAssignment(p))
            continue;
        const name = p.name.getText();
        if (name !== 'method')
            continue;
        const v = getStringLiteral(p.initializer);
        if (v)
            return v.toUpperCase();
    }
    return undefined;
}
function detectDeterministicStateMutationsFromHandler(fn, sf, relPath, vars, inlineCtx) {
    const out = [];
    if (!fn.body)
        return out;
    const visit = (node) => {
        if (ts.isCallExpression(node)) {
            const m = extractDeterministicStateMutation(node, sf, vars);
            if (m)
                out.push(m);
            // Phase 2.1: one-hop call-through
            const callee = resolveOneHopCallee(node, relPath, inlineCtx);
            if (callee && callee.fn.body) {
                const targetVars = collectMutationVariables(callee.sf);
                const scan = (n) => {
                    if (ts.isCallExpression(n)) {
                        const mm = extractDeterministicStateMutation(n, callee.sf, targetVars);
                        if (mm)
                            out.push(mm);
                    }
                    ts.forEachChild(n, scan);
                };
                scan(callee.fn.body);
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(fn.body);
    return out;
}
function extractDeterministicStateMutation(call, sf, vars) {
    const line = sf.getLineAndCharacterOfPosition(call.getStart(sf)).line + 1;
    // Redux dispatch({ type: 'SOME_ACTION' })
    if (ts.isIdentifier(call.expression) && vars.dispatchFunctions.has(call.expression.text)) {
        if (call.arguments.length < 1)
            return null;
        const a0 = call.arguments[0];
        if (!ts.isObjectLiteralExpression(a0))
            return null;
        const typeLit = getObjectStringProperty(a0, 'type');
        if (!typeLit)
            return null;
        return { stateKey: typeLit, mutationType: 'dispatch', line };
    }
    // localStorage/sessionStorage token set/remove (deterministic key only)
    // localStorage.setItem('token', ...)
    // localStorage.removeItem('token')
    if (ts.isPropertyAccessExpression(call.expression)) {
        const recv = call.expression.expression;
        const method = call.expression.name.text;
        if (ts.isIdentifier(recv) && (recv.text === 'localStorage' || recv.text === 'sessionStorage')) {
            if (method === 'setItem' && call.arguments.length >= 2) {
                const key = getStringLiteral(call.arguments[0]);
                if (!key)
                    return null;
                return { stateKey: key, mutationType: 'storage_set', line };
            }
            if (method === 'removeItem' && call.arguments.length >= 1) {
                const key = getStringLiteral(call.arguments[0]);
                if (!key)
                    return null;
                return { stateKey: key, mutationType: 'storage_remove', line };
            }
        }
        // React Query cache mutation: queryClient.invalidateQueries(key) / setQueryData(key, ...)
        if (ts.isIdentifier(recv) && vars.queryClients.has(recv.text)) {
            if (method === 'invalidateQueries' && call.arguments.length >= 1) {
                const key = getDeterministicQueryKey(call.arguments[0]);
                if (!key)
                    return null;
                return { stateKey: key, mutationType: 'query_invalidate', line };
            }
            if (method === 'setQueryData' && call.arguments.length >= 2) {
                const key = getDeterministicQueryKey(call.arguments[0]);
                if (!key)
                    return null;
                return { stateKey: key, mutationType: 'query_set', line };
            }
        }
    }
    return null;
}
function getObjectStringProperty(obj, propName) {
    for (const p of obj.properties) {
        if (!ts.isPropertyAssignment(p))
            continue;
        const name = ts.isIdentifier(p.name) ? p.name.text : p.name.getText();
        if (name !== propName)
            continue;
        const v = getStringLiteral(p.initializer);
        if (v)
            return v;
    }
    return null;
}
function getDeterministicQueryKey(expr) {
    // Accept string literal
    const lit = getStringLiteral(expr);
    if (lit)
        return lit;
    // Accept array literal of string literals; use first element as stable key
    if (ts.isArrayLiteralExpression(expr) && expr.elements.length > 0) {
        const first = expr.elements[0];
        if (!ts.isExpression(first))
            return null;
        const firstLit = getStringLiteral(first);
        if (firstLit)
            return firstLit;
    }
    return null;
}
function detectDeterministicConditionalRedirectFromHandler(fn, sf) {
    if (!fn.body)
        return null;
    const redirects = [];
    const visit = (node) => {
        // if (...) redirect('<literal>')
        if (ts.isIfStatement(node)) {
            const call = extractRedirectCallFromStatement(node.thenStatement);
            const lit = call ? getStringLiteral(call.arguments[0]) : null;
            if (call && lit) {
                const line = sf.getLineAndCharacterOfPosition(call.getStart(sf)).line + 1;
                redirects.push({ to: lit, line, conditionText: node.expression.getText(sf) });
            }
        }
        // ternary: cond ? redirect('<literal>') : ...
        if (ts.isConditionalExpression(node)) {
            const call = extractRedirectCallFromExpression(node.whenTrue) || extractRedirectCallFromExpression(node.whenFalse);
            const lit = call ? getStringLiteral(call.arguments[0]) : null;
            if (call && lit) {
                const line = sf.getLineAndCharacterOfPosition(call.getStart(sf)).line + 1;
                redirects.push({ to: lit, line, conditionText: node.condition.getText(sf) });
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(fn.body);
    if (redirects.length === 0)
        return null;
    const unique = new Set(redirects.map(r => r.to));
    if (unique.size !== 1) {
        return { unique: false, to: redirects[0].to, line: redirects[0].line, conditionText: redirects[0].conditionText };
    }
    return { unique: true, to: redirects[0].to, line: redirects[0].line, conditionText: redirects[0].conditionText };
}
function findDeterministicRedirectInConditionals(sf) {
    const redirects = [];
    const visit = (node) => {
        if (ts.isIfStatement(node)) {
            const call = extractRedirectCallFromStatement(node.thenStatement);
            const lit = call ? getStringLiteral(call.arguments[0]) : null;
            if (call && lit) {
                const line = sf.getLineAndCharacterOfPosition(call.getStart(sf)).line + 1;
                redirects.push({ to: lit, line, conditionText: node.expression.getText(sf) });
            }
        }
        if (ts.isConditionalExpression(node)) {
            const call = extractRedirectCallFromExpression(node.whenTrue) || extractRedirectCallFromExpression(node.whenFalse);
            const lit = call ? getStringLiteral(call.arguments[0]) : null;
            if (call && lit) {
                const line = sf.getLineAndCharacterOfPosition(call.getStart(sf)).line + 1;
                redirects.push({ to: lit, line, conditionText: node.condition.getText(sf) });
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(sf);
    if (redirects.length === 0)
        return null;
    const unique = new Set(redirects.map(r => r.to));
    if (unique.size !== 1) {
        return { unique: false, to: redirects[0].to, line: redirects[0].line, conditionText: redirects[0].conditionText };
    }
    return { unique: true, to: redirects[0].to, line: redirects[0].line, conditionText: redirects[0].conditionText };
}
function extractRedirectCallFromStatement(stmt) {
    if (ts.isExpressionStatement(stmt)) {
        return extractRedirectCallFromExpression(stmt.expression);
    }
    if (ts.isBlock(stmt) && stmt.statements.length === 1) {
        const only = stmt.statements[0];
        if (ts.isExpressionStatement(only)) {
            return extractRedirectCallFromExpression(only.expression);
        }
    }
    return null;
}
function extractRedirectCallFromExpression(expr) {
    if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression) && expr.expression.text === 'redirect') {
        if (expr.arguments.length >= 1 && getStringLiteral(expr.arguments[0]))
            return expr;
    }
    return null;
}
function getStringLiteral(expr) {
    if (ts.isStringLiteral(expr))
        return expr.text;
    if (ts.isNoSubstitutionTemplateLiteral(expr))
        return expr.text;
    return null;
}
function getDeterministicEndpoint(expr) {
    // Phase 2 rule: URL must be a string literal OR a template with a static prefix.
    const lit = getStringLiteral(expr);
    if (lit)
        return lit;
    // Template with expressions: `/api/users/${id}` -> head.text == "/api/users/"
    if (ts.isTemplateExpression(expr)) {
        const prefix = expr.head.text;
        // Require a non-empty prefix to be useful and deterministic.
        if (prefix && prefix.length > 0)
            return prefix;
    }
    return null;
}
function collectExportedNames(sf) {
    const exported = new Set();
    for (const st of sf.statements) {
        // export function foo() {}
        if (ts.isFunctionDeclaration(st) && st.name && hasExportModifier(st)) {
            exported.add(st.name.text);
        }
        // export const foo = () => {}
        if (ts.isVariableStatement(st) && hasExportModifier(st)) {
            for (const decl of st.declarationList.declarations) {
                if (ts.isIdentifier(decl.name))
                    exported.add(decl.name.text);
            }
        }
        // export { foo, bar as baz } from './x'
        if (ts.isExportDeclaration(st) && st.exportClause && ts.isNamedExports(st.exportClause)) {
            for (const el of st.exportClause.elements) {
                exported.add(el.name.text);
            }
        }
    }
    return exported;
}
function hasExportModifier(node) {
    const mods = node.modifiers;
    if (!mods)
        return false;
    return mods.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
}
async function resolveRelativeModuleToFile(projectPath, fromRelPath, moduleSpecifier, cache) {
    const key = `${fromRelPath}::${moduleSpecifier}`;
    if (cache.has(key))
        return cache.get(key);
    const fromDir = path.dirname(fromRelPath);
    const base = path.normalize(path.join(fromDir, moduleSpecifier));
    const candidates = [
        base,
        `${base}.ts`,
        `${base}.tsx`,
        `${base}.js`,
        `${base}.jsx`,
        path.join(base, 'index.ts'),
        path.join(base, 'index.tsx'),
        path.join(base, 'index.js'),
        path.join(base, 'index.jsx'),
    ].map(p => p.replace(/\\/g, '/'));
    for (const rel of candidates) {
        const abs = path.join(projectPath, rel);
        const ok = await fs_1.promises.stat(abs).then(s => s.isFile()).catch(() => false);
        if (ok) {
            cache.set(key, rel);
            return rel;
        }
    }
    cache.set(key, null);
    return null;
}
async function prewarmRelativeImports(projectPath, fromRelPath, imports, caches) {
    const moduleSpecifiers = new Set();
    for (const v of imports.relativeNamedImports.values())
        moduleSpecifiers.add(v.module);
    for (const v of imports.relativeDefaultImports.values())
        moduleSpecifiers.add(v.module);
    for (const mod of moduleSpecifiers) {
        const key = `${fromRelPath}::${mod}`;
        if (!caches.moduleResolveCache.has(key)) {
            const resolved = await resolveRelativeModuleToFile(projectPath, fromRelPath, mod, caches.moduleResolveCache);
            // resolveRelativeModuleToFile already cached the key
            if (!resolved)
                continue;
            // Ensure target file is parsed and indexed so call-through can deterministically inline.
            if (!caches.sfCache.has(resolved)) {
                const abs = path.join(projectPath, resolved);
                const content = await fs_1.promises.readFile(abs, 'utf-8').catch(() => null);
                if (!content)
                    continue;
                const ext = path.extname(resolved);
                const sf = ts.createSourceFile(resolved, content, ts.ScriptTarget.Latest, true, ext === '.tsx' || ext === '.jsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
                caches.sfCache.set(resolved, sf);
                caches.importIndexCache.set(resolved, collectImports(sf));
                caches.functionIndexCache.set(resolved, indexFunctions(sf));
                caches.exportsCache.set(resolved, collectExportedNames(sf));
            }
        }
    }
}
function resolveOneHopCallee(call, fromRelPath, ctx) {
    // One-hop only. Only supports call expressions where callee is an identifier: foo(...)
    if (!ts.isIdentifier(call.expression))
        return null;
    const name = call.expression.text;
    // 1) Local function in same file
    const localIdx = ctx.functionIndexCache.get(fromRelPath);
    const localFn = localIdx?.byName.get(name) || null;
    if (localFn) {
        const sf = ctx.sfCache.get(fromRelPath);
        if (!sf)
            return null;
        return { relPath: fromRelPath, sf, fn: localFn };
    }
    // 2) Relative import (named or default)
    const imports = ctx.importIndexCache.get(fromRelPath);
    if (!imports)
        return null;
    const named = imports.relativeNamedImports.get(name);
    const def = imports.relativeDefaultImports.get(name);
    const resolveCachedTarget = (moduleSpecifier) => {
        const key = `${fromRelPath}::${moduleSpecifier}`;
        const existing = ctx.moduleResolveCache.get(key);
        return existing === undefined ? null : existing;
    };
    if (named) {
        const targetRel = resolveCachedTarget(named.module);
        if (!targetRel)
            return null;
        const targetSf = ctx.sfCache.get(targetRel);
        if (!targetSf)
            return null;
        const targetIdx = ctx.functionIndexCache.get(targetRel);
        const exports = ctx.exportsCache.get(targetRel);
        if (!targetIdx || !exports)
            return null;
        if (!exports.has(named.imported))
            return null;
        const fn = targetIdx.byName.get(named.imported) || null;
        if (!fn)
            return null;
        return { relPath: targetRel, sf: targetSf, fn };
    }
    if (def) {
        const targetRel = resolveCachedTarget(def.module);
        if (!targetRel)
            return null;
        const targetSf = ctx.sfCache.get(targetRel);
        if (!targetSf)
            return null;
        // Find export default
        for (const st of targetSf.statements) {
            if (ts.isExportAssignment(st) && !st.isExportEquals) {
                const expr = st.expression;
                if (ts.isIdentifier(expr)) {
                    const targetIdx = ctx.functionIndexCache.get(targetRel);
                    if (!targetIdx)
                        return null;
                    const fn = targetIdx.byName.get(expr.text) || null;
                    if (fn)
                        return { relPath: targetRel, sf: targetSf, fn };
                }
                if (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr)) {
                    return { relPath: targetRel, sf: targetSf, fn: expr };
                }
            }
            if (ts.isFunctionDeclaration(st) && hasExportModifier(st) && st.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword)) {
                if (st.name)
                    return { relPath: targetRel, sf: targetSf, fn: st };
            }
        }
    }
    return null;
}
function stableId(s) {
    // Deterministic stable id without crypto
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (h * 31 + s.charCodeAt(i)) >>> 0;
    }
    return `${s.split(':')[0]}:${h.toString(16)}`;
}

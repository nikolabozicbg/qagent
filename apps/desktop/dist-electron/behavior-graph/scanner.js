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
    const nodes = [];
    const edges = [];
    // Pages
    for (const r of routes) {
        nodes.push({
            id: `page:${r.route}`,
            type: 'Page',
            route: r.route,
            filePath: r.filePath,
        });
    }
    // Parse files for forms and user actions
    for (const filePath of sourceFiles) {
        const ext = path.extname(filePath);
        if (!SOURCE_EXTENSIONS.has(ext))
            continue;
        const content = await fs_1.promises.readFile(filePath, 'utf-8').catch(() => null);
        if (!content)
            continue;
        const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ext === '.tsx' || ext === '.jsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
        const rel = path.relative(projectPath, filePath);
        // Forms (<form onSubmit={...}>)
        findJSXElements(sf, 'form').forEach(el => {
            const onSubmit = getJSXPropExpressionText(el, 'onSubmit');
            const formId = stableId(`form:${rel}:${sf.getLineAndCharacterOfPosition(el.pos).line + 1}`);
            const fields = collectInputFieldNames(el);
            nodes.push({
                id: formId,
                type: 'Form',
                filePath: rel,
                line: sf.getLineAndCharacterOfPosition(el.pos).line + 1,
                fields: fields.map(name => ({ name })),
            });
            if (onSubmit) {
                const actionId = stableId(`ua:submit:${rel}:${sf.getLineAndCharacterOfPosition(el.pos).line + 1}`);
                nodes.push({
                    id: actionId,
                    type: 'UserAction',
                    actionType: 'submit',
                    label: onSubmit,
                    filePath: rel,
                    line: sf.getLineAndCharacterOfPosition(el.pos).line + 1,
                });
                edges.push({
                    id: `edge:${actionId}:triggers:${formId}`,
                    type: 'triggers',
                    source: actionId,
                    target: formId,
                });
            }
        });
        // Buttons with onClick
        findJSXElements(sf, 'button').forEach(el => {
            const onClick = getJSXPropExpressionText(el, 'onClick');
            if (!onClick)
                return;
            const actionId = stableId(`ua:click:${rel}:${sf.getLineAndCharacterOfPosition(el.pos).line + 1}`);
            nodes.push({
                id: actionId,
                type: 'UserAction',
                actionType: 'click',
                label: onClick,
                filePath: rel,
                line: sf.getLineAndCharacterOfPosition(el.pos).line + 1,
            });
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
    const attrs = el.attributes.properties;
    for (const a of attrs) {
        if (!ts.isJsxAttribute(a))
            continue;
        if (a.name.getText() !== propName)
            continue;
        if (!a.initializer)
            return null;
        if (ts.isJsxExpression(a.initializer) && a.initializer.expression) {
            return a.initializer.expression.getText();
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
function collectInputFieldNames(formEl) {
    // Best-effort: this only sees the opening element. We don't have subtree here.
    // Deterministic MVP: UNKNOWN fields unless name can be read from immediate JSX (not available).
    return [];
}
function stableId(s) {
    // Deterministic stable id without crypto
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (h * 31 + s.charCodeAt(i)) >>> 0;
    }
    return `${s.split(':')[0]}:${h.toString(16)}`;
}

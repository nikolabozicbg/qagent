"use strict";
/**
 * Project Scanner for Electron
 *
 * Scans local project files and generates AnalysisPayload
 * to send to cloud backend.
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
exports.ProjectScanner = void 0;
exports.scanProject = scanProject;
exports.convertToV5ScannerPayload = convertToV5ScannerPayload;
exports.scanProjectV5 = scanProjectV5;
const fs_1 = require("fs");
const path = __importStar(require("path"));
const ts = __importStar(require("typescript"));
const smart_analyzer_1 = require("./smart-analyzer");
// Directories to ignore
const IGNORE_DIRS = new Set([
    'node_modules', '.git', '.next', '.nuxt', 'dist', 'build', 'out',
    '.cache', 'coverage', '.turbo', '.nx', '__pycache__', '.venv'
]);
// Source file extensions
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
class ProjectScanner {
    constructor(projectPath) {
        this.sourceFiles = [];
        this.components = [];
        this.routes = [];
        this.forms = [];
        this.apis = [];
        this.types = [];
        this.selectors = [];
        this.behaviors = [];
        this.framework = {
            name: 'unknown',
            version: '',
            router: null,
            stateManagement: []
        };
        // Smart analysis data
        this.smartForms = [];
        this.navigationLinks = [];
        this.testCredentials = [];
        this.routeToFilePath = new Map();
        this.projectPath = projectPath;
    }
    async scan() {
        console.log(`📂 Scanning project: ${this.projectPath}`);
        // 1. Detect framework from package.json
        await this.detectFramework();
        // 2. Find all source files
        await this.findSourceFiles(this.projectPath);
        console.log(`   Found ${this.sourceFiles.length} source files`);
        // 3. Parse each file (basic extraction)
        let totalLines = 0;
        for (const filePath of this.sourceFiles) {
            try {
                const content = await fs_1.promises.readFile(filePath, 'utf-8');
                totalLines += content.split('\n').length;
                await this.parseFile(filePath, content);
            }
            catch (err) {
                // Skip files that can't be read
            }
        }
        // 4. Extract routes from file structure (Next.js) or router config
        await this.extractRoutes();
        // 4.5 Link forms to routes (forms were extracted before routes)
        this.linkFormsToRoutes();
        // 5. SMART ANALYSIS: Mine test data
        console.log(`   🔍 Mining test data...`);
        const minedData = await smart_analyzer_1.testDataMiner.mineTestData(this.projectPath, this.sourceFiles);
        this.testCredentials = minedData.credentials;
        console.log(`   Found ${this.testCredentials.length} test credentials`);
        // 6. SMART ANALYSIS: Analyze forms and navigation in route files
        console.log(`   📝 Analyzing forms and navigation...`);
        await this.runSmartAnalysis();
        console.log(`   Found ${this.smartForms.length} forms, ${this.navigationLinks.length} nav links`);
        // 7. Merge smart forms into forms array (convert format)
        this.mergeSmartForms();
        // 8. Build relationships (now with navigation data)
        const relationships = this.buildRelationships();
        return {
            project: {
                name: path.basename(this.projectPath),
                framework: this.framework,
                stats: {
                    totalFiles: this.sourceFiles.length,
                    totalLines
                }
            },
            components: this.components,
            routes: this.routes,
            forms: this.forms,
            apis: this.apis,
            types: this.types,
            selectors: this.selectors,
            behaviors: this.behaviors,
            relationships
        };
    }
    /**
     * Run smart analysis on route files
     */
    async runSmartAnalysis() {
        // Process each route file with smart analyzers
        for (const route of this.routes) {
            try {
                const content = await fs_1.promises.readFile(route.filePath, 'utf-8');
                const sourceFile = ts.createSourceFile(route.filePath, content, ts.ScriptTarget.Latest, true, route.filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
                // Analyze forms with smart analyzer
                const forms = smart_analyzer_1.smartFormAnalyzer.analyzeFile(sourceFile, route.filePath, route.path, content);
                this.smartForms.push(...forms);
                // Extract navigation links
                const componentName = path.basename(route.filePath, path.extname(route.filePath));
                const links = smart_analyzer_1.navigationFlowAnalyzer.extractNavigationLinks(sourceFile, route.path, componentName);
                this.navigationLinks.push(...links);
                // Map route to file for later reference
                this.routeToFilePath.set(route.path, route.filePath);
            }
            catch {
                // Skip files that can't be analyzed
            }
        }
        // Add test credentials to forms
        if (this.testCredentials.length > 0) {
            for (const form of this.smartForms) {
                if (form.name.toLowerCase().includes('login') || form.name.toLowerCase().includes('sign')) {
                    const cred = this.testCredentials[0];
                    form.testData = {
                        email: cred.email,
                        password: cred.password,
                        ...(cred.role ? { role: cred.role } : {})
                    };
                }
            }
        }
    }
    /**
     * Link forms to their corresponding routes
     * PRIORITY: File path match > semantic/name-based match
     * This ensures forms are linked to their actual page, not just matching names
     */
    linkFormsToRoutes() {
        // Build a map of filePath -> route
        const fileToRoute = new Map();
        for (const route of this.routes) {
            fileToRoute.set(route.filePath, route.path);
        }
        // Update each form's route
        for (const form of this.forms) {
            if (form.route)
                continue; // Already has route
            // 1) FIRST PRIORITY: File path mapping (most reliable)
            if (form.filePath) {
                const routePath = fileToRoute.get(form.filePath);
                if (routePath) {
                    form.route = routePath;
                    continue;
                }
                // Try to match by file path containing route path segment
                for (const route of this.routes) {
                    // Check if form's file is under route's directory
                    if (form.filePath.includes(route.filePath.replace(/\/page\.[tj]sx?$/, ''))) {
                        form.route = route.path;
                        break;
                    }
                }
                if (form.route)
                    continue;
            }
            // 2) SECOND PRIORITY: Semantic/name-based match (fallback only)
            const formNameLower = (form.name || '').toLowerCase();
            let bestMatch = null;
            for (const route of this.routes) {
                const pathLower = route.path.toLowerCase();
                const lastSegment = pathLower.split('/').filter(Boolean).pop() || '';
                let score = 0;
                // Registration/Signup forms -> signup routes
                const isRegisterForm = formNameLower.includes('register') || formNameLower.includes('registration');
                const isSignupRoute = lastSegment === 'signup' || lastSegment === 'sign-up' || lastSegment === 'register';
                if (isRegisterForm && isSignupRoute)
                    score = 10;
                // Login/Signin forms -> signin routes
                const isLoginForm = formNameLower.includes('login') || formNameLower.includes('sign in') || formNameLower.includes('signin');
                const isSigninRoute = lastSegment === 'signin' || lastSegment === 'sign-in' || lastSegment === 'login';
                if (isLoginForm && isSigninRoute)
                    score = 10;
                // NOTE: Removed password/reset matching here as it was causing false positives
                // Password forms should be matched by file path instead
                if (score > 0 && (!bestMatch || score > bestMatch.score)) {
                    bestMatch = { route: route.path, score };
                }
            }
            if (bestMatch) {
                form.route = bestMatch.route;
            }
        }
        console.log(`   🔗 Linked ${this.forms.filter(f => f.route).length}/${this.forms.length} forms to routes`);
    }
    /**
     * Merge smart forms into the standard forms array
     */
    mergeSmartForms() {
        for (const sf of this.smartForms) {
            // Convert SmartFormInfo to FormInfo
            const formInfo = {
                id: sf.id,
                name: sf.name,
                componentName: sf.component,
                filePath: sf.filePath,
                route: sf.route,
                fields: sf.fields.map(f => ({
                    name: f.name,
                    id: f.id || null,
                    type: f.inputType,
                    label: f.label,
                    placeholder: f.placeholder,
                    isRequired: f.isRequired,
                    selector: f.selector,
                    selectorStrategy: f.selectorStrategy,
                    validations: f.validations.map(v => ({
                        type: v.type,
                        value: v.value,
                        message: v.message
                    })),
                    // Additional attributes for intelligent discovery
                    autocomplete: f.autocomplete || null,
                    ariaLabel: f.ariaLabel || null,
                    dataTestId: f.dataTestId || null,
                    dataTest: f.dataTest || null,
                    dataCy: f.dataCy || null,
                    defaultValue: f.defaultValue,
                })),
                submitButton: sf.submitButton ? {
                    text: sf.submitButton.text,
                    selector: sf.submitButton.selector
                } : null,
                submitEndpoint: sf.submitAction.endpoint,
                hasValidation: sf.validationSchema !== null || sf.fields.some(f => f.validations.length > 0),
                validationRules: {},
                successRedirect: sf.successRedirect,
                library: sf.library,
                testData: sf.testData
            };
            // Check if form already exists (by file path - forms from same file are duplicates)
            const existingIndex = this.forms.findIndex(f => f.id === sf.id ||
                f.filePath === sf.filePath // Same file = duplicate, regardless of name
            );
            if (existingIndex >= 0) {
                // Replace with smarter version (which has better name inference)
                this.forms[existingIndex] = formInfo;
            }
            else {
                this.forms.push(formInfo);
            }
        }
    }
    async detectFramework() {
        // Search for package.json in common locations (monorepo support)
        const possiblePackageJsonPaths = [
            path.join(this.projectPath, 'package.json'),
            path.join(this.projectPath, 'src', 'package.json'),
            path.join(this.projectPath, 'src', 'client', 'package.json'),
            path.join(this.projectPath, 'client', 'package.json'),
            path.join(this.projectPath, 'frontend', 'package.json'),
            path.join(this.projectPath, 'web', 'package.json'),
        ];
        // Collect all deps from all package.json files found
        const allDeps = {};
        for (const pkgPath of possiblePackageJsonPaths) {
            try {
                const content = await fs_1.promises.readFile(pkgPath, 'utf-8');
                const pkg = JSON.parse(content);
                const deps = { ...pkg.dependencies, ...pkg.devDependencies };
                Object.assign(allDeps, deps);
            }
            catch {
                // Try next location
            }
        }
        // If no deps found, return early
        if (Object.keys(allDeps).length === 0)
            return;
        // Detect framework
        if (allDeps['next']) {
            this.framework.name = 'next';
            this.framework.version = allDeps['next'];
            this.framework.router = 'app-router'; // Assume app router for newer versions
        }
        else if (allDeps['react']) {
            this.framework.name = 'react';
            this.framework.version = allDeps['react'];
            if (allDeps['react-router'] || allDeps['react-router-dom']) {
                this.framework.router = 'react-router';
            }
        }
        else if (allDeps['vue']) {
            this.framework.name = 'vue';
            this.framework.version = allDeps['vue'];
        }
        // Detect state management
        if (allDeps['redux'] || allDeps['@reduxjs/toolkit']) {
            this.framework.stateManagement.push('redux');
        }
        if (allDeps['zustand']) {
            this.framework.stateManagement.push('zustand');
        }
        if (allDeps['mobx']) {
            this.framework.stateManagement.push('mobx');
        }
        if (allDeps['recoil']) {
            this.framework.stateManagement.push('recoil');
        }
    }
    async findSourceFiles(dir) {
        try {
            const entries = await fs_1.promises.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (IGNORE_DIRS.has(entry.name))
                    continue;
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    await this.findSourceFiles(fullPath);
                }
                else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    if (SOURCE_EXTENSIONS.has(ext)) {
                        this.sourceFiles.push(fullPath);
                    }
                }
            }
        }
        catch {
            // Skip directories that can't be read
        }
    }
    async parseFile(filePath, content) {
        const relativePath = path.relative(this.projectPath, filePath);
        try {
            const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, filePath.endsWith('.tsx') || filePath.endsWith('.jsx')
                ? ts.ScriptKind.TSX
                : ts.ScriptKind.TS);
            // Extract components, types, etc.
            this.extractFromAST(sourceFile, filePath, relativePath);
        }
        catch {
            // Skip files that can't be parsed
        }
    }
    extractFromAST(sourceFile, filePath, relativePath) {
        const fileContent = sourceFile.getText();
        // Check if file uses react-hook-form
        const usesReactHookForm = fileContent.includes('useForm') || fileContent.includes('react-hook-form');
        const visit = (node) => {
            // Extract interfaces and types
            if (ts.isInterfaceDeclaration(node)) {
                this.extractInterface(node, filePath);
            }
            else if (ts.isTypeAliasDeclaration(node)) {
                this.extractTypeAlias(node, filePath);
            }
            // Extract function components
            if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
                this.extractComponent(node, sourceFile, filePath, relativePath);
            }
            // Extract API calls
            if (ts.isCallExpression(node)) {
                this.extractAPICall(node, filePath, relativePath);
            }
            // Extract JSX elements for selectors and forms
            if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
                this.extractJSXElement(node, filePath, relativePath);
                this.extractFormFromJSX(node, filePath, relativePath, usesReactHookForm);
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
    }
    extractFormFromJSX(node, filePath, relativePath, usesReactHookForm) {
        const openingElement = ts.isJsxElement(node) ? node.openingElement : node;
        const tagName = openingElement.tagName.getText().toLowerCase();
        // Check for <form> elements
        if (tagName === 'form') {
            const componentName = this.findParentComponent(relativePath);
            const formId = `form-${componentName.toLowerCase()}-${this.forms.length + 1}`;
            // Extract form fields from children
            const fields = [];
            let submitButton = null;
            let submitEndpoint = null;
            // Find all input-like elements within the form
            if (ts.isJsxElement(node)) {
                this.extractFormFields(node, fields, filePath);
                submitButton = this.findSubmitButton(node);
            }
            // Check onSubmit handler for endpoint
            const onSubmitAttr = this.findJsxAttribute(openingElement, 'onSubmit');
            if (onSubmitAttr) {
                const onSubmitText = onSubmitAttr.getText();
                // Look for API calls in submit handler
                const apiMatch = onSubmitText.match(/signIn|signUp|login|register|submit|create|update/i);
                if (apiMatch) {
                    submitEndpoint = apiMatch[0].toLowerCase();
                }
            }
            // Find route for this file
            const route = this.routes.find(r => r.filePath === filePath);
            this.forms.push({
                id: formId,
                name: this.inferFormName(componentName, filePath),
                componentName,
                filePath,
                route: route?.path || null,
                fields,
                submitButton,
                submitEndpoint,
                hasValidation: usesReactHookForm || fields.some(f => f.validations.length > 0),
                validationRules: {},
                successRedirect: this.findSuccessRedirect(filePath),
                library: usesReactHookForm ? 'react-hook-form' : null
            });
        }
    }
    extractFormFields(node, fields, filePath, parentControllerName) {
        const visit = (child, controllerName) => {
            if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
                const opening = ts.isJsxElement(child) ? child.openingElement : child;
                const tag = opening.tagName.getText();
                const tagLower = tag.toLowerCase();
                // Check for react-hook-form Controller component
                // <Controller name="fieldName" render={({ field }) => <input {...field} />} />
                if (tag === 'Controller') {
                    const controllerNameAttr = this.findJsxAttribute(opening, 'name');
                    const controllerFieldName = this.getAttributeValue(controllerNameAttr) || this.getAttributeValueFromExpression(controllerNameAttr);
                    if (controllerFieldName && ts.isJsxElement(child)) {
                        // Visit children with controller name context
                        ts.forEachChild(child, c => visit(c, controllerFieldName));
                    }
                    else if (controllerFieldName) {
                        // Self-closing Controller - extract field info from Controller props
                        const typeAttr = this.findJsxAttribute(opening, 'type');
                        const rulesAttr = this.findJsxAttribute(opening, 'rules');
                        fields.push({
                            name: controllerFieldName,
                            id: null,
                            type: this.getAttributeValue(typeAttr) || 'text',
                            label: this.inferLabelFromName(controllerFieldName),
                            placeholder: null,
                            isRequired: rulesAttr ? rulesAttr.getText().includes('required') : false,
                            selector: `[name="${controllerFieldName}"]`,
                            selectorStrategy: 'name',
                            validations: [],
                            autocomplete: null,
                            ariaLabel: null,
                            dataTestId: null,
                            dataTest: null,
                            dataCy: null,
                            defaultValue: null
                        });
                    }
                    return; // Don't process Controller as an input
                }
                // Check for input-like elements (including custom Input components)
                // Support both native elements and common React component patterns
                const isInputElement = tagLower === 'input' || tagLower === 'textarea' || tagLower === 'select';
                const isCustomInputComponent = /^(Input|TextField|TextInput|PasswordField|Select|Checkbox|RadioGroup|DatePicker|TimePicker|NumberInput|PhoneInput|EmailInput|SearchInput|TextArea|FormInput|FormField|Field)$/i.test(tag);
                if (isInputElement || isCustomInputComponent) {
                    // Extract all attributes
                    const nameAttr = this.findJsxAttribute(opening, 'name');
                    const idAttr = this.findJsxAttribute(opening, 'id');
                    const typeAttr = this.findJsxAttribute(opening, 'type');
                    const placeholderAttr = this.findJsxAttribute(opening, 'placeholder');
                    const labelAttr = this.findJsxAttribute(opening, 'label');
                    const autocompleteAttr = this.findJsxAttribute(opening, 'autoComplete') || this.findJsxAttribute(opening, 'autocomplete');
                    const ariaLabelAttr = this.findJsxAttribute(opening, 'aria-label');
                    const dataTestIdAttr = this.findJsxAttribute(opening, 'data-testid');
                    const dataTestAttr = this.findJsxAttribute(opening, 'data-test');
                    const dataCyAttr = this.findJsxAttribute(opening, 'data-cy');
                    const defaultValueAttr = this.findJsxAttribute(opening, 'defaultValue');
                    const validationAttr = this.findJsxAttribute(opening, 'validation');
                    const requiredAttr = this.findJsxAttribute(opening, 'required');
                    // Try to get field name from multiple sources (priority order)
                    let fieldName = this.getAttributeValue(nameAttr);
                    // For custom components, also try to get name from JSX expression: name={"email"} or name={'email'}
                    if (!fieldName && nameAttr) {
                        fieldName = this.getAttributeValueFromExpression(nameAttr);
                    }
                    // If no name attribute, check for react-hook-form register spread: {...register('fieldName')}
                    if (!fieldName) {
                        fieldName = this.extractRegisterFieldName(opening);
                    }
                    // If inside a Controller, use the controller's name
                    if (!fieldName && controllerName) {
                        fieldName = controllerName;
                    }
                    // If still no name, try id
                    if (!fieldName && idAttr) {
                        fieldName = this.getAttributeValue(idAttr) || this.getAttributeValueFromExpression(idAttr);
                    }
                    // Try to get from label if it looks like a field identifier
                    if (!fieldName && labelAttr) {
                        const labelValue = this.getAttributeValue(labelAttr);
                        if (labelValue && /^[a-z][a-zA-Z0-9_]*$/.test(labelValue)) {
                            fieldName = labelValue;
                        }
                    }
                    // Try to extract from placeholder (e.g., "e.g., Color, Size, Material" -> "color")
                    if (!fieldName && placeholderAttr) {
                        const placeholderValue = this.getAttributeValue(placeholderAttr);
                        const inferredName = this.inferFieldNameFromPlaceholder(placeholderValue);
                        if (inferredName) {
                            fieldName = inferredName;
                        }
                    }
                    // Try to extract from value attribute (e.g., value={newAttribute.name} -> "name")
                    if (!fieldName) {
                        const valueAttr = this.findJsxAttribute(opening, 'value');
                        if (valueAttr) {
                            const inferredName = this.inferFieldNameFromValue(valueAttr);
                            if (inferredName) {
                                fieldName = inferredName;
                            }
                        }
                    }
                    // Try to extract from aria-label
                    if (!fieldName && ariaLabelAttr) {
                        const ariaValue = this.getAttributeValue(ariaLabelAttr);
                        const inferredName = this.labelToFieldName(ariaValue);
                        if (inferredName) {
                            fieldName = inferredName;
                        }
                    }
                    // Fallback to generic name
                    if (!fieldName) {
                        fieldName = `field-${fields.length + 1}`;
                    }
                    const fieldId = this.getAttributeValue(idAttr);
                    const fieldType = this.getAttributeValue(typeAttr) || 'text';
                    const placeholder = this.getAttributeValue(placeholderAttr);
                    const label = this.getAttributeValue(labelAttr);
                    const autocomplete = this.getAttributeValue(autocompleteAttr);
                    const ariaLabel = this.getAttributeValue(ariaLabelAttr);
                    const dataTestId = this.getAttributeValue(dataTestIdAttr);
                    const dataTest = this.getAttributeValue(dataTestAttr);
                    const dataCy = this.getAttributeValue(dataCyAttr);
                    const defaultValue = this.getAttributeValue(defaultValueAttr);
                    // Generate selector with priority: data-testid > name > id
                    let selector = null;
                    let selectorStrategy = 'name';
                    if (dataTestId) {
                        selector = `[data-testid="${dataTestId}"]`;
                        selectorStrategy = 'data-testid';
                    }
                    else if (nameAttr) {
                        selector = `[name="${fieldName}"]`;
                        selectorStrategy = 'name';
                    }
                    else if (fieldId) {
                        selector = `#${fieldId}`;
                        selectorStrategy = 'id';
                    }
                    // Extract validations from validation prop
                    const validations = [];
                    if (validationAttr) {
                        const valText = validationAttr.getText();
                        if (valText.includes('required')) {
                            validations.push({ type: 'required', value: null, message: `${fieldName} is required` });
                        }
                        if (valText.includes('minLength')) {
                            const minMatch = valText.match(/minLength.*?value:\s*(\d+)/);
                            validations.push({
                                type: 'minLength',
                                value: minMatch ? parseInt(minMatch[1]) : 1,
                                message: null
                            });
                        }
                        if (valText.includes('email') || fieldType === 'email') {
                            validations.push({ type: 'email', value: null, message: 'Invalid email' });
                        }
                        if (valText.includes('pattern')) {
                            validations.push({ type: 'pattern', value: null, message: 'Invalid format' });
                        }
                    }
                    // Check for required attribute
                    const isRequired = requiredAttr !== null || validations.some(v => v.type === 'required');
                    if (requiredAttr && !validations.some(v => v.type === 'required')) {
                        validations.push({ type: 'required', value: null, message: `${fieldName} is required` });
                    }
                    fields.push({
                        name: fieldName,
                        id: fieldId,
                        type: fieldType,
                        label: label || placeholder || this.inferLabelFromName(fieldName),
                        placeholder,
                        isRequired,
                        selector,
                        selectorStrategy,
                        validations,
                        // Additional attributes for V3 intelligent discovery
                        autocomplete,
                        ariaLabel,
                        dataTestId,
                        dataTest,
                        dataCy,
                        defaultValue
                    });
                }
            }
            ts.forEachChild(child, c => visit(c, controllerName));
        };
        ts.forEachChild(node, c => visit(c, parentControllerName));
    }
    /**
     * Extract field name from react-hook-form register spread
     * Handles patterns like: {...register('email')} or {...register("password")}
     */
    extractRegisterFieldName(element) {
        for (const prop of element.attributes.properties) {
            if (ts.isJsxSpreadAttribute(prop)) {
                const text = prop.getText();
                // Match {...register('fieldName')} or {...register("fieldName")}
                const registerMatch = text.match(/register\s*\(\s*['"]([^'"]+)['"]/);
                if (registerMatch) {
                    return registerMatch[1];
                }
                // Also match register patterns with options: {...register('field', { required: true })}
                const registerWithOptionsMatch = text.match(/register\s*\(\s*['"]([^'"]+)['"]\s*,/);
                if (registerWithOptionsMatch) {
                    return registerWithOptionsMatch[1];
                }
            }
        }
        return null;
    }
    inferLabelFromName(name) {
        // Convert camelCase/snake_case to Title Case
        return name
            .replace(/([A-Z])/g, ' $1')
            .replace(/[_-]/g, ' ')
            .replace(/^./, s => s.toUpperCase())
            .trim();
    }
    /**
     * Infer field name from placeholder text
     * Examples:
     *   "Enter your email" -> "email"
     *   "e.g., Color, Size, Material" -> "color" (first item)
     *   "Search products..." -> "search"
     */
    inferFieldNameFromPlaceholder(placeholder) {
        if (!placeholder)
            return null;
        const lower = placeholder.toLowerCase();
        // Common field keywords to look for
        const fieldKeywords = [
            'email', 'password', 'username', 'name', 'phone', 'address', 'city',
            'state', 'zip', 'country', 'title', 'description', 'message', 'comment',
            'search', 'query', 'date', 'time', 'url', 'price', 'quantity', 'amount',
            'color', 'size', 'material', 'category', 'brand', 'sku', 'code'
        ];
        // Check for "e.g., X, Y, Z" pattern
        const egMatch = placeholder.match(/e\.?g\.?,?\s*([a-zA-Z]+)/i);
        if (egMatch) {
            const firstExample = egMatch[1].toLowerCase();
            if (fieldKeywords.includes(firstExample)) {
                return firstExample;
            }
            // Return the example even if not in keywords list
            return firstExample;
        }
        // Check for "Enter your X" or "Your X" pattern
        const enterMatch = lower.match(/(?:enter|type|input)?\s*(?:your|the)?\s*([a-z]+)/i);
        if (enterMatch) {
            const word = enterMatch[1];
            if (fieldKeywords.includes(word)) {
                return word;
            }
        }
        // Check if placeholder itself is a field keyword
        for (const keyword of fieldKeywords) {
            if (lower.includes(keyword)) {
                return keyword;
            }
        }
        // Extract first word if it looks like a field name
        const firstWord = lower.split(/[\s,.:;!?]+/)[0];
        if (firstWord && firstWord.length > 2 && /^[a-z]+$/.test(firstWord)) {
            return firstWord;
        }
        return null;
    }
    /**
     * Infer field name from value attribute expression
     * Examples:
     *   value={newAttribute.name} -> "name"
     *   value={formData.email} -> "email"
     *   value={state.user.firstName} -> "firstName"
     */
    inferFieldNameFromValue(valueAttr) {
        if (!valueAttr.initializer)
            return null;
        if (ts.isJsxExpression(valueAttr.initializer) && valueAttr.initializer.expression) {
            const expr = valueAttr.initializer.expression;
            const text = expr.getText();
            // Match property access: foo.bar.name or foo["bar"] 
            const propMatch = text.match(/\.([a-zA-Z_][a-zA-Z0-9_]*)\s*$/);
            if (propMatch) {
                const propName = propMatch[1];
                // Exclude common non-field names
                if (!['length', 'value', 'target', 'current', 'data', 'state', 'props'].includes(propName)) {
                    return propName;
                }
            }
            // Match bracket access: foo["name"]
            const bracketMatch = text.match(/\[\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]\s*\]\s*$/);
            if (bracketMatch) {
                return bracketMatch[1];
            }
        }
        return null;
    }
    /**
     * Convert label text to field name
     * Examples:
     *   "First Name" -> "firstName"
     *   "Email Address" -> "email"
     */
    labelToFieldName(label) {
        if (!label)
            return null;
        // Common label-to-field mappings
        const labelMappings = {
            'email address': 'email',
            'e-mail': 'email',
            'password': 'password',
            'confirm password': 'confirmPassword',
            'first name': 'firstName',
            'last name': 'lastName',
            'full name': 'fullName',
            'phone number': 'phone',
            'phone': 'phone',
            'mobile': 'phone',
            'zip code': 'zipCode',
            'postal code': 'postalCode',
        };
        const lower = label.toLowerCase().trim();
        if (labelMappings[lower]) {
            return labelMappings[lower];
        }
        // Convert to camelCase: "First Name" -> "firstName"
        const words = lower.split(/\s+/);
        if (words.length > 0) {
            return words[0] + words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
        }
        return null;
    }
    findSubmitButton(formNode) {
        let submitButton = null;
        const visit = (child) => {
            if (submitButton)
                return;
            if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
                const opening = ts.isJsxElement(child) ? child.openingElement : child;
                const tag = opening.tagName.getText().toLowerCase();
                if (tag === 'button') {
                    const typeAttr = this.findJsxAttribute(opening, 'type');
                    const typeValue = this.getAttributeValue(typeAttr);
                    // Default button type in form is "submit"
                    if (!typeAttr || typeValue === 'submit') {
                        // Try to get button text
                        let buttonText = null;
                        if (ts.isJsxElement(child)) {
                            // Look for text content (simplified)
                            const childText = child.getText();
                            const textMatch = childText.match(/>([^<{]+)</); // Simple text between > and <
                            if (textMatch) {
                                buttonText = textMatch[1].trim();
                            }
                            // Also check for string literals like "Sign In"
                            const stringMatch = childText.match(/"([^"]+)"|'([^']+)'/);
                            if (!buttonText && stringMatch) {
                                buttonText = (stringMatch[1] || stringMatch[2]).trim();
                            }
                        }
                        submitButton = {
                            text: buttonText,
                            selector: 'button[type="submit"], form button:not([type])'
                        };
                    }
                }
            }
            ts.forEachChild(child, visit);
        };
        ts.forEachChild(formNode, visit);
        return submitButton;
    }
    findJsxAttribute(element, attrName) {
        for (const prop of element.attributes.properties) {
            if (ts.isJsxAttribute(prop) && prop.name?.getText() === attrName) {
                return prop;
            }
        }
        return null;
    }
    getAttributeValue(attr) {
        if (!attr || !attr.initializer)
            return null;
        if (ts.isStringLiteral(attr.initializer)) {
            return attr.initializer.text;
        }
        if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
            if (ts.isStringLiteral(attr.initializer.expression)) {
                return attr.initializer.expression.text;
            }
        }
        return null;
    }
    /**
     * Get attribute value from JSX expression like name={"email"} or name={someVar}
     * Falls back to extracting string from the raw text
     */
    getAttributeValueFromExpression(attr) {
        if (!attr || !attr.initializer)
            return null;
        // Handle name="value" (string literal)
        if (ts.isStringLiteral(attr.initializer)) {
            return attr.initializer.text;
        }
        // Handle name={"value"} or name={'value'} (JSX expression with string)
        if (ts.isJsxExpression(attr.initializer)) {
            const expr = attr.initializer.expression;
            if (expr) {
                // Direct string literal: name={"email"}
                if (ts.isStringLiteral(expr)) {
                    return expr.text;
                }
                // Identifier: name={fieldName} - try to extract from text
                if (ts.isIdentifier(expr)) {
                    // If it's a simple identifier that looks like a field name, use it
                    const name = expr.text;
                    if (/^[a-z][a-zA-Z0-9_]*$/.test(name) && !['control', 'register', 'field', 'props', 'data', 'value', 'ref'].includes(name)) {
                        return name;
                    }
                }
            }
            // Fallback: try to extract string from raw text
            const rawText = attr.initializer.getText();
            const stringMatch = rawText.match(/[{]\s*["']([^"']+)["']\s*[}]/);
            if (stringMatch) {
                return stringMatch[1];
            }
        }
        return null;
    }
    inferFormName(componentName, filePath) {
        // Infer form name from component or file
        if (componentName.toLowerCase().includes('signin') || componentName.toLowerCase().includes('login')) {
            return 'Login Form';
        }
        if (componentName.toLowerCase().includes('signup') || componentName.toLowerCase().includes('register')) {
            return 'Registration Form';
        }
        if (componentName.toLowerCase().includes('reset')) {
            return 'Password Reset Form';
        }
        if (filePath.includes('sign-in'))
            return 'Login Form';
        if (filePath.includes('sign-up'))
            return 'Registration Form';
        if (filePath.includes('password-reset'))
            return 'Password Reset Form';
        return `${componentName} Form`;
    }
    findSuccessRedirect(filePath) {
        // This would need file content - simplified for now
        if (filePath.includes('sign-in') || filePath.includes('sign-up')) {
            return '/';
        }
        return null;
    }
    extractInterface(node, filePath) {
        const name = node.name.text;
        const properties = [];
        for (const member of node.members) {
            if (ts.isPropertySignature(member) && member.name) {
                properties.push({
                    name: member.name.getText(),
                    type: member.type?.getText() || 'unknown',
                    isOptional: !!member.questionToken
                });
            }
        }
        // Infer semantic type
        let semanticType = null;
        if (name.endsWith('Props'))
            semanticType = 'props';
        else if (name.endsWith('State'))
            semanticType = 'state';
        else if (properties.length >= 2 && !name.includes('Props') && !name.includes('State')) {
            semanticType = 'entity';
        }
        this.types.push({
            name,
            kind: 'interface',
            filePath,
            properties,
            semanticType,
            usedBy: []
        });
    }
    extractTypeAlias(node, filePath) {
        const name = node.name.text;
        const properties = [];
        if (ts.isTypeLiteralNode(node.type)) {
            for (const member of node.type.members) {
                if (ts.isPropertySignature(member) && member.name) {
                    properties.push({
                        name: member.name.getText(),
                        type: member.type?.getText() || 'unknown',
                        isOptional: !!member.questionToken
                    });
                }
            }
        }
        this.types.push({
            name,
            kind: 'type',
            filePath,
            properties,
            semanticType: null,
            usedBy: []
        });
    }
    extractComponent(node, sourceFile, filePath, relativePath) {
        // Check if it returns JSX
        const text = node.getText(sourceFile);
        if (!text.includes('return') && !text.includes('=>'))
            return;
        if (!text.includes('<') || !text.includes('>'))
            return;
        let name = 'Anonymous';
        if (ts.isFunctionDeclaration(node) && node.name) {
            name = node.name.text;
        }
        else if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
            name = node.parent.name.text;
        }
        // Skip non-component functions (lowercase)
        if (name[0] !== name[0].toUpperCase())
            return;
        // Extract hooks
        const hooks = [];
        const hookMatches = text.match(/use[A-Z]\w+/g);
        if (hookMatches) {
            hooks.push(...new Set(hookMatches));
        }
        // Check for forms
        const hasForms = text.includes('<form') || text.includes('useForm') || text.includes('onSubmit');
        this.components.push({
            name,
            filePath,
            renderedElements: [],
            isInteractive: text.includes('onClick') || text.includes('onSubmit') || text.includes('<button'),
            props: [],
            hooks,
            hasState: hooks.some(h => h === 'useState'),
            hasEffects: hooks.some(h => h === 'useEffect'),
            hasForms,
            complexity: Math.min(text.length / 500, 1)
        });
    }
    extractAPICall(node, filePath, relativePath) {
        const text = node.getText();
        // Check for fetch, axios, or useSWR
        if (text.includes('fetch(') || text.includes('axios.') || text.includes('useSWR')) {
            // Try to extract URL
            const urlMatch = text.match(/['"`](\/api\/[^'"`]+|https?:\/\/[^'"`]+)['"`]/);
            if (urlMatch) {
                const apiPath = urlMatch[1];
                // Determine method
                let method = 'GET';
                if (text.includes('.post') || text.includes('method: "POST"') || text.includes("method: 'POST'")) {
                    method = 'POST';
                }
                else if (text.includes('.put') || text.includes('method: "PUT"')) {
                    method = 'PUT';
                }
                else if (text.includes('.delete') || text.includes('method: "DELETE"')) {
                    method = 'DELETE';
                }
                // Find component name
                const componentName = this.findParentComponent(relativePath);
                // Check if already exists
                const existing = this.apis.find(a => a.path === apiPath && a.method === method);
                if (existing) {
                    if (!existing.calledFrom.some(c => c.filePath === filePath)) {
                        existing.calledFrom.push({ component: componentName, filePath });
                    }
                }
                else {
                    this.apis.push({
                        method,
                        path: apiPath,
                        calledFrom: [{ component: componentName, filePath }],
                        requestType: null,
                        responseType: null,
                        hasAuth: text.includes('Authorization') || text.includes('Bearer')
                    });
                }
            }
        }
    }
    extractJSXElement(node, filePath, relativePath) {
        const openingElement = ts.isJsxElement(node) ? node.openingElement : node;
        const tagName = openingElement.tagName.getText();
        // Look for data-testid, id, or aria-label
        const attributes = openingElement.attributes;
        for (const attr of attributes.properties) {
            if (ts.isJsxAttribute(attr) && attr.name) {
                const attrName = attr.name.getText();
                if (attrName === 'data-testid' || attrName === 'data-test' || attrName === 'id') {
                    const value = attr.initializer && ts.isStringLiteral(attr.initializer)
                        ? attr.initializer.text
                        : attr.initializer?.getText()?.replace(/[{}"']/g, '');
                    if (value) {
                        const selector = attrName === 'id' ? `#${value}` : `[${attrName}="${value}"]`;
                        const componentName = this.findParentComponent(relativePath);
                        // Determine if interactive
                        const isInteractive = ['button', 'input', 'select', 'textarea', 'a', 'form'].includes(tagName.toLowerCase());
                        this.selectors.push({
                            element: tagName,
                            selector,
                            strategy: attrName === 'data-testid' ? 'testId' : attrName === 'id' ? 'id' : 'attribute',
                            component: componentName,
                            filePath,
                            isInteractive,
                            interactionType: this.inferInteractionType(tagName)
                        });
                    }
                }
            }
        }
    }
    findParentComponent(relativePath) {
        // Find component that owns this file
        const matchingComponent = this.components.find(c => c.filePath.includes(relativePath) || relativePath.includes(path.basename(c.filePath, path.extname(c.filePath))));
        return matchingComponent?.name || path.basename(relativePath, path.extname(relativePath));
    }
    inferInteractionType(tagName) {
        const tag = tagName.toLowerCase();
        if (tag === 'button')
            return 'click';
        if (tag === 'input' || tag === 'textarea')
            return 'fill';
        if (tag === 'select')
            return 'select';
        if (tag === 'a')
            return 'click';
        if (tag === 'form')
            return 'submit';
        return null;
    }
    async extractRoutes() {
        // 1. First, try file-based routing (Next.js, etc.)
        if (this.framework.name === 'next') {
            await this.extractNextRoutes();
        }
        // 2. GENERIC: Extract routes from ANY JSX/TSX file by searching for path patterns
        await this.extractGenericJSXRoutes();
    }
    /**
     * Generic route extractor - works with ANY framework
     * Searches ALL source files for path="..." patterns in JSX
     * This catches React Router, Vue Router, custom routers, etc.
     */
    async extractGenericJSXRoutes() {
        const foundPaths = new Set();
        for (const filePath of this.sourceFiles) {
            try {
                const content = await fs_1.promises.readFile(filePath, 'utf-8');
                // Extract all path="..." or path='...' patterns from JSX
                // This works regardless of router library
                const pathPatterns = [
                    /path=["'](\/[^"']*)["']/g, // path="/foo" or path='/foo'
                    /to=["'](\/[^"']*)["']/g, // to="/foo" (Link components)
                    /href=["'](\/[^"']*)["']/g, // href="/foo" (Next.js Link)
                    /route:[\s]*["'](\/[^"']*)["']/g, // route: "/foo" (config objects)
                    /path:[\s]*["'](\/[^"']*)["']/g, // path: "/foo" (config objects)
                ];
                for (const pattern of pathPatterns) {
                    let match;
                    while ((match = pattern.exec(content)) !== null) {
                        const routePath = match[1];
                        // Skip invalid or non-navigable routes
                        if (!routePath ||
                            routePath.startsWith('/api') ||
                            routePath.startsWith('/_') ||
                            routePath.includes('.') ||
                            routePath.startsWith('#') ||
                            routePath === '/*' || // Catch-all wildcard
                            routePath.endsWith('*') || // Wildcard routes
                            routePath.includes('(') || // Regex patterns
                            routePath.includes(')') || // Regex patterns
                            routePath.includes('?') || // Optional patterns
                            routePath.length === 1 && routePath !== '/' // Single chars except /
                        ) {
                            continue;
                        }
                        // Check if this path was already found
                        const normalizedPath = this.normalizeRoutePath(routePath);
                        if (foundPaths.has(normalizedPath))
                            continue;
                        foundPaths.add(normalizedPath);
                        // Check if route already exists
                        if (this.routes.some(r => r.path === normalizedPath))
                            continue;
                        // Extract dynamic params from path like /user/:id or /user/[id]
                        const params = this.extractRouteParams(normalizedPath);
                        // Infer if route is protected based on file location or name
                        const isProtected = this.inferRouteProtection(filePath, normalizedPath);
                        this.routes.push({
                            path: normalizedPath,
                            component: this.findComponentNameForFile(filePath),
                            filePath,
                            isProtected,
                            isDynamic: params.length > 0,
                            params,
                            forms: [],
                            apis: []
                        });
                    }
                }
            }
            catch {
                // Skip files that can't be read
            }
        }
        console.log(`   📍 Generic extractor found ${foundPaths.size} routes`);
    }
    /**
     * Normalize route path to consistent format
     */
    normalizeRoutePath(routePath) {
        // Convert [param] to :param style
        let normalized = routePath.replace(/\[([^\]]+)\]/g, ':$1');
        // Remove trailing slashes
        normalized = normalized.replace(/\/+$/, '');
        // Ensure leading slash
        if (!normalized.startsWith('/')) {
            normalized = '/' + normalized;
        }
        return normalized || '/';
    }
    /**
     * Extract dynamic parameters from route path
     */
    extractRouteParams(routePath) {
        const params = [];
        // Match :param or [param] style
        const pattern = /:([^/]+)|\[([^\]]+)\]/g;
        let match;
        while ((match = pattern.exec(routePath)) !== null) {
            params.push(match[1] || match[2]);
        }
        return params;
    }
    /**
     * Infer if a route is protected based on file location and route path
     */
    inferRouteProtection(filePath, routePath) {
        const pathLower = routePath.toLowerCase();
        const fileLower = filePath.toLowerCase();
        // Check for protection indicators
        const protectedPatterns = [
            'private', 'protected', 'authenticated', 'auth',
            'dashboard', 'admin', 'settings', 'account', 'profile',
            'user/', 'users/', 'my-'
        ];
        return protectedPatterns.some(p => pathLower.includes(p) || fileLower.includes(p));
    }
    /**
     * Find component name for a file
     */
    findComponentNameForFile(filePath) {
        const component = this.components.find(c => c.filePath === filePath);
        return component?.name || null;
    }
    async extractNextRoutes() {
        // Look for app/ directory in common locations (App Router)
        const possibleAppDirs = [
            path.join(this.projectPath, 'app'),
            path.join(this.projectPath, 'src', 'app'),
            path.join(this.projectPath, 'src', 'client', 'app'),
        ];
        let foundAppDir = false;
        for (const appDir of possibleAppDirs) {
            try {
                await fs_1.promises.access(appDir);
                await this.scanNextAppRouter(appDir, '');
                foundAppDir = true;
                console.log(`   📁 Found Next.js App Router at: ${appDir}`);
                break;
            }
            catch {
                // Try next location
            }
        }
        if (!foundAppDir) {
            // Try pages/ directory in common locations
            const possiblePagesDirs = [
                path.join(this.projectPath, 'pages'),
                path.join(this.projectPath, 'src', 'pages'),
                path.join(this.projectPath, 'src', 'client', 'pages'),
            ];
            for (const pagesDir of possiblePagesDirs) {
                try {
                    await fs_1.promises.access(pagesDir);
                    await this.scanNextPagesRouter(pagesDir, '');
                    console.log(`   📁 Found Next.js Pages Router at: ${pagesDir}`);
                    break;
                }
                catch {
                    // Try next location
                }
            }
        }
    }
    async scanNextAppRouter(dir, routePath) {
        try {
            const entries = await fs_1.promises.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name.startsWith('_') || entry.name.startsWith('.'))
                    continue;
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    // Handle route groups (parentheses)
                    let newPath = routePath;
                    if (!entry.name.startsWith('(')) {
                        // Handle dynamic segments
                        if (entry.name.startsWith('[')) {
                            newPath = `${routePath}/${entry.name}`;
                        }
                        else {
                            newPath = `${routePath}/${entry.name}`;
                        }
                    }
                    await this.scanNextAppRouter(fullPath, newPath);
                }
                else if (entry.name === 'page.tsx' || entry.name === 'page.jsx' || entry.name === 'page.ts' || entry.name === 'page.js') {
                    const finalPath = routePath || '/';
                    // Extract params from path
                    const params = [];
                    const paramMatches = finalPath.matchAll(/\[([^\]]+)\]/g);
                    for (const match of paramMatches) {
                        params.push(match[1].replace('...', ''));
                    }
                    this.routes.push({
                        path: finalPath.replace(/\[([^\]]+)\]/g, '[$1]'), // Normalize
                        component: null,
                        filePath: fullPath,
                        isProtected: false, // Would need to check for middleware
                        isDynamic: params.length > 0,
                        params,
                        forms: [],
                        apis: []
                    });
                }
            }
        }
        catch {
            // Skip directories that can't be read
        }
    }
    async scanNextPagesRouter(dir, routePath) {
        try {
            const entries = await fs_1.promises.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name.startsWith('_') || entry.name.startsWith('.'))
                    continue;
                if (entry.name === 'api')
                    continue; // Skip API routes
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    const newPath = entry.name.startsWith('[')
                        ? `${routePath}/${entry.name}`
                        : `${routePath}/${entry.name}`;
                    await this.scanNextPagesRouter(fullPath, newPath);
                }
                else {
                    const ext = path.extname(entry.name);
                    if (SOURCE_EXTENSIONS.has(ext)) {
                        const baseName = path.basename(entry.name, ext);
                        const finalPath = baseName === 'index'
                            ? (routePath || '/')
                            : `${routePath}/${baseName}`;
                        const params = [];
                        const paramMatches = finalPath.matchAll(/\[([^\]]+)\]/g);
                        for (const match of paramMatches) {
                            params.push(match[1].replace('...', ''));
                        }
                        this.routes.push({
                            path: finalPath,
                            component: null,
                            filePath: fullPath,
                            isProtected: false,
                            isDynamic: params.length > 0,
                            params,
                            forms: [],
                            apis: []
                        });
                    }
                }
            }
        }
        catch {
            // Skip directories that can't be read
        }
    }
    buildRelationships() {
        const componentToTypes = {};
        const componentToApis = {};
        const routeToComponent = {};
        const entityToRoutes = {};
        const formToEntity = {};
        // Build component -> APIs
        for (const api of this.apis) {
            for (const caller of api.calledFrom) {
                if (!componentToApis[caller.component]) {
                    componentToApis[caller.component] = [];
                }
                componentToApis[caller.component].push(`${api.method} ${api.path}`);
            }
        }
        // Build entity -> routes (infer from route paths)
        for (const type of this.types.filter(t => t.semanticType === 'entity')) {
            const entityName = type.name.toLowerCase();
            const matchingRoutes = this.routes
                .filter(r => r.path.toLowerCase().includes(entityName))
                .map(r => r.path);
            if (matchingRoutes.length > 0) {
                entityToRoutes[type.name] = matchingRoutes;
            }
        }
        // Build form -> entity mapping
        for (const form of this.forms) {
            // Try to infer entity from form name
            const formNameLower = form.name.toLowerCase();
            for (const type of this.types.filter(t => t.semanticType === 'entity')) {
                if (formNameLower.includes(type.name.toLowerCase())) {
                    formToEntity[form.id] = type.name;
                    break;
                }
            }
        }
        // Convert navigation links to relationship format
        const navigationLinks = this.navigationLinks.map(link => ({
            from: link.from,
            to: link.to,
            linkText: link.linkText,
            selector: link.selector
        }));
        // Build flow graph and infer user journeys
        const protectedRoutes = this.routes
            .filter(r => r.path.includes('dashboard') || r.path.includes('admin') || r.path.includes('settings'))
            .map(r => r.path);
        const flowGraph = smart_analyzer_1.navigationFlowAnalyzer.buildFlowGraph(this.navigationLinks, this.routes.map(r => r.path), protectedRoutes);
        // Get user journeys from flow graph + route-based inference
        const graphJourneys = smart_analyzer_1.navigationFlowAnalyzer.inferUserJourneys(flowGraph);
        const routeFlows = this.inferFlows();
        // Merge journeys, prioritizing graph-based ones
        const inferredFlows = [];
        const seenNames = new Set();
        for (const journey of graphJourneys) {
            inferredFlows.push({
                name: journey.name,
                description: `User journey: ${journey.name}`,
                steps: journey.steps,
                entities: this.inferEntitiesFromSteps(journey.steps),
                importance: journey.importance
            });
            seenNames.add(journey.name.toLowerCase());
        }
        for (const flow of routeFlows) {
            if (!seenNames.has(flow.name.toLowerCase())) {
                inferredFlows.push(flow);
            }
        }
        // Sort by importance
        inferredFlows.sort((a, b) => b.importance - a.importance);
        return {
            componentToTypes,
            componentToApis,
            routeToComponent,
            navigationLinks,
            formToEntity,
            entityToRoutes,
            inferredFlows
        };
    }
    inferEntitiesFromSteps(steps) {
        const entities = [];
        for (const step of steps) {
            // Extract potential entity names from route paths
            const segments = step.split('/').filter(s => s && !s.startsWith('['));
            for (const seg of segments) {
                const singular = seg.replace(/s$/, '');
                const capitalized = singular.charAt(0).toUpperCase() + singular.slice(1);
                // Check if it matches a known type
                if (this.types.some(t => t.name.toLowerCase() === singular.toLowerCase())) {
                    if (!entities.includes(capitalized)) {
                        entities.push(capitalized);
                    }
                }
            }
        }
        // Default to User for auth routes
        if (steps.some(s => s.includes('sign') || s.includes('auth') || s.includes('login'))) {
            if (!entities.includes('User')) {
                entities.push('User');
            }
        }
        return entities;
    }
    inferFlows() {
        const flows = [];
        // Group routes by common prefixes to infer flows
        const routeGroups = new Map();
        for (const route of this.routes) {
            const segments = route.path.split('/').filter(Boolean);
            if (segments.length > 0) {
                const prefix = segments[0];
                if (!routeGroups.has(prefix)) {
                    routeGroups.set(prefix, []);
                }
                routeGroups.get(prefix).push(route.path);
            }
        }
        // Create flows from groups
        for (const [prefix, routes] of routeGroups) {
            if (routes.length >= 2) {
                // Infer entity from prefix
                const entityName = prefix.charAt(0).toUpperCase() + prefix.slice(1).replace(/s$/, '');
                flows.push({
                    name: `${entityName} Flow`,
                    description: `User journey for ${entityName.toLowerCase()} management`,
                    steps: routes.sort(),
                    entities: [entityName],
                    importance: routes.length >= 3 ? 0.8 : 0.5
                });
            }
        }
        // Add auth flow if sign-in/sign-up routes exist
        const authRoutes = this.routes
            .filter(r => r.path.includes('sign') || r.path.includes('login') || r.path.includes('auth'))
            .map(r => r.path);
        if (authRoutes.length > 0) {
            flows.push({
                name: 'Authentication',
                description: 'User authentication flow',
                steps: authRoutes,
                entities: ['User'],
                importance: 0.9
            });
        }
        return flows.sort((a, b) => b.importance - a.importance);
    }
}
exports.ProjectScanner = ProjectScanner;
// Export function for IPC handler
async function scanProject(projectPath) {
    const scanner = new ProjectScanner(projectPath);
    return scanner.scan();
}
// Selector priority order (higher index = higher priority)
const SELECTOR_PRIORITY = {
    'css': 1,
    'id': 2,
    'name': 3,
    'placeholder': 4,
    'aria-label': 5,
    'data-test': 6,
    'data-cy': 7,
    'data-testid': 8,
};
/**
 * Rank selectors by priority and return sorted array
 */
function rankSelectors(field, elementType) {
    const selectors = [];
    // data-testid (highest priority)
    if (field.dataTestId) {
        selectors.push({
            value: `[data-testid="${field.dataTestId}"]`,
            strategy: 'data-testid',
            confidence: 1.0,
            source: 'attribute'
        });
    }
    // data-cy (Cypress)
    if (field.dataCy) {
        selectors.push({
            value: `[data-cy="${field.dataCy}"]`,
            strategy: 'data-cy',
            confidence: 0.95,
            source: 'attribute'
        });
    }
    // data-test
    if (field.dataTest) {
        selectors.push({
            value: `[data-test="${field.dataTest}"]`,
            strategy: 'data-test',
            confidence: 0.9,
            source: 'attribute'
        });
    }
    // aria-label
    if (field.ariaLabel) {
        selectors.push({
            value: `[aria-label="${field.ariaLabel}"]`,
            strategy: 'aria-label',
            confidence: 0.85,
            source: 'attribute'
        });
    }
    // name attribute
    if (field.name) {
        selectors.push({
            value: `${elementType}[name="${field.name}"]`,
            strategy: 'name',
            confidence: 0.8,
            source: 'attribute'
        });
    }
    // id attribute
    if (field.id) {
        selectors.push({
            value: `#${field.id}`,
            strategy: 'id',
            confidence: 0.75,
            source: 'attribute'
        });
    }
    // placeholder (as last resort)
    if (field.placeholder) {
        selectors.push({
            value: `${elementType}[placeholder="${field.placeholder}"]`,
            strategy: 'placeholder',
            confidence: 0.6,
            source: 'attribute'
        });
    }
    // Sort by confidence (highest first)
    selectors.sort((a, b) => b.confidence - a.confidence);
    return selectors;
}
/**
 * Extract constraints from field validations with examples
 */
function extractConstraints(field, elementId, formId) {
    const constraints = [];
    // Required constraint
    if (field.isRequired) {
        constraints.push({
            id: `${elementId}-required`,
            elementId,
            type: 'required',
            rule: 'required',
            message: field.validations.find(v => v.type === 'required')?.message || 'This field is required',
            validExamples: ['test', 'example@email.com', '12345'],
            invalidExamples: ['', ' '],
            source: 'html5'
        });
    }
    // Process each validation rule
    for (const validation of field.validations) {
        const constraintId = `${elementId}-${validation.type}`;
        switch (validation.type) {
            case 'minLength':
                const minLen = Number(validation.value) || 1;
                constraints.push({
                    id: constraintId,
                    elementId,
                    type: 'minLength',
                    rule: `minLength:${minLen}`,
                    message: validation.message,
                    validExamples: [generateStringOfLength(minLen), generateStringOfLength(minLen + 5)],
                    invalidExamples: minLen > 1 ? [generateStringOfLength(minLen - 1)] : [],
                    source: 'html5'
                });
                break;
            case 'maxLength':
                const maxLen = Number(validation.value) || 100;
                constraints.push({
                    id: constraintId,
                    elementId,
                    type: 'maxLength',
                    rule: `maxLength:${maxLen}`,
                    message: validation.message,
                    validExamples: [generateStringOfLength(Math.min(maxLen, 10)), generateStringOfLength(maxLen)],
                    invalidExamples: [generateStringOfLength(maxLen + 1)],
                    source: 'html5'
                });
                break;
            case 'pattern':
                const pattern = String(validation.value);
                constraints.push({
                    id: constraintId,
                    elementId,
                    type: 'pattern',
                    rule: `pattern:${pattern}`,
                    message: validation.message,
                    validExamples: generatePatternExamples(pattern, true),
                    invalidExamples: generatePatternExamples(pattern, false),
                    source: 'html5'
                });
                break;
            case 'email':
                constraints.push({
                    id: constraintId,
                    elementId,
                    type: 'email',
                    rule: 'email',
                    message: validation.message || 'Please enter a valid email address',
                    validExamples: ['test@example.com', 'user.name@domain.org', 'a@b.co'],
                    invalidExamples: ['invalid', '@nodomain.com', 'no@', 'spaces in@email.com'],
                    source: 'html5'
                });
                break;
            case 'min':
                const minVal = Number(validation.value) || 0;
                constraints.push({
                    id: constraintId,
                    elementId,
                    type: 'min',
                    rule: `min:${minVal}`,
                    message: validation.message,
                    validExamples: [String(minVal), String(minVal + 10)],
                    invalidExamples: [String(minVal - 1)],
                    source: 'html5'
                });
                break;
            case 'max':
                const maxVal = Number(validation.value) || 100;
                constraints.push({
                    id: constraintId,
                    elementId,
                    type: 'max',
                    rule: `max:${maxVal}`,
                    message: validation.message,
                    validExamples: [String(maxVal), String(Math.floor(maxVal / 2))],
                    invalidExamples: [String(maxVal + 1)],
                    source: 'html5'
                });
                break;
        }
    }
    // Infer email constraint from field type or name
    if (field.type === 'email' || field.name.toLowerCase().includes('email')) {
        if (!constraints.some(c => c.type === 'email')) {
            constraints.push({
                id: `${elementId}-email-inferred`,
                elementId,
                type: 'email',
                rule: 'email',
                message: 'Please enter a valid email address',
                validExamples: ['test@example.com', 'user@domain.org'],
                invalidExamples: ['invalid', 'no@', '@domain.com'],
                source: 'inferred'
            });
        }
    }
    // Infer password constraints from field type or name
    if (field.type === 'password' || field.name.toLowerCase().includes('password')) {
        if (!constraints.some(c => c.type === 'minLength')) {
            constraints.push({
                id: `${elementId}-password-minLength-inferred`,
                elementId,
                type: 'minLength',
                rule: 'minLength:8',
                message: 'Password must be at least 8 characters',
                validExamples: ['Password1!', 'SecurePass123'],
                invalidExamples: ['short', '1234567'],
                source: 'inferred'
            });
        }
    }
    return constraints;
}
/**
 * Generate a string of specified length
 */
function generateStringOfLength(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars[i % chars.length];
    }
    return result;
}
/**
 * Generate examples that match or don't match a pattern
 */
function generatePatternExamples(pattern, valid) {
    // Common pattern handlers
    if (pattern.includes('@') || pattern.toLowerCase().includes('email')) {
        return valid
            ? ['test@example.com', 'user@domain.org']
            : ['invalid', 'no-at-sign'];
    }
    if (pattern.includes('^[a-z') || pattern.includes('^[A-Za-z')) {
        return valid
            ? ['validtext', 'alphabetic']
            : ['123invalid', '!@#$%'];
    }
    if (pattern.includes('^[0-9') || pattern.includes('^\\d')) {
        return valid
            ? ['12345', '9876543210']
            : ['notanumber', 'abc123'];
    }
    if (pattern.includes('phone') || pattern.includes('tel')) {
        return valid
            ? ['+1234567890', '555-123-4567']
            : ['invalid', 'abc'];
    }
    // Default fallback
    return valid
        ? ['validvalue', 'test123']
        : ['', '!@#$%^'];
}
/**
 * Detect element role from field info
 */
function detectElementRole(field) {
    const nameLower = field.name.toLowerCase();
    if (field.type === 'email' || nameLower.includes('email'))
        return 'email';
    if (field.type === 'password' || nameLower.includes('password'))
        return 'password';
    if (field.type === 'submit')
        return 'submit';
    if (field.type === 'tel' || nameLower.includes('phone'))
        return 'phone';
    if (nameLower.includes('name') && nameLower.includes('user'))
        return 'username';
    if (nameLower.includes('first') && nameLower.includes('name'))
        return 'firstName';
    if (nameLower.includes('last') && nameLower.includes('name'))
        return 'lastName';
    if (nameLower === 'name' || nameLower.includes('fullname'))
        return 'fullName';
    return 'form-field';
}
/**
 * Convert AnalysisPayload to V5ScannerPayload
 */
function convertToV5ScannerPayload(payload) {
    const pages = [];
    const elements = [];
    const forms = [];
    const constraints = [];
    const flows = [];
    // Element ID counter
    let elementCounter = 0;
    // Create pages from routes
    for (const route of payload.routes) {
        const pageId = `page-${route.path.replace(/[^a-zA-Z0-9]/g, '-')}`;
        pages.push({
            id: pageId,
            path: route.path,
            title: route.component || route.path,
            isProtected: route.isProtected,
            isDynamic: route.isDynamic,
            params: route.params,
            elementIds: [], // Will be populated
            formIds: [], // Will be populated
        });
    }
    // Create elements and forms
    for (const form of payload.forms) {
        const pageId = form.route
            ? `page-${form.route.replace(/[^a-zA-Z0-9]/g, '-')}`
            : pages[0]?.id || 'page-unknown';
        const formId = `form-${form.id}`;
        const fieldIds = [];
        const constraintIds = [];
        let submitButtonId = null;
        // Process form fields
        for (const field of form.fields) {
            const elementId = `element-${++elementCounter}`;
            fieldIds.push(elementId);
            // Determine element type
            const elementType = field.type === 'textarea' ? 'textarea'
                : field.type === 'select' ? 'select'
                    : 'input';
            // Get ranked selectors
            const selectors = rankSelectors(field, elementType);
            elements.push({
                id: elementId,
                type: elementType,
                role: detectElementRole(field),
                selectors,
                bestSelector: selectors[0]?.value || field.selector || `${elementType}[name="${field.name}"]`,
                label: field.label,
                placeholder: field.placeholder,
                defaultValue: field.defaultValue,
                pageId,
                formId,
            });
            // Extract constraints for this field
            const fieldConstraints = extractConstraints(field, elementId, formId);
            for (const constraint of fieldConstraints) {
                constraints.push(constraint);
                constraintIds.push(constraint.id);
            }
            // Add to page's element list
            const page = pages.find(p => p.id === pageId);
            if (page && !page.elementIds.includes(elementId)) {
                page.elementIds.push(elementId);
            }
        }
        // Add submit button if present
        if (form.submitButton) {
            const buttonElementId = `element-${++elementCounter}`;
            submitButtonId = buttonElementId;
            const buttonSelectors = [];
            if (form.submitButton.selector) {
                buttonSelectors.push({
                    value: form.submitButton.selector,
                    strategy: 'css',
                    confidence: 0.7,
                    source: 'generated'
                });
            }
            buttonSelectors.push({
                value: `button[type="submit"]`,
                strategy: 'css',
                confidence: 0.6,
                source: 'generated'
            });
            elements.push({
                id: buttonElementId,
                type: 'button',
                role: 'submit',
                selectors: buttonSelectors,
                bestSelector: buttonSelectors[0]?.value || 'button[type="submit"]',
                label: form.submitButton.text,
                placeholder: null,
                defaultValue: null,
                pageId,
                formId,
            });
            // Add to page's element list
            const page = pages.find(p => p.id === pageId);
            if (page && !page.elementIds.includes(buttonElementId)) {
                page.elementIds.push(buttonElementId);
            }
        }
        forms.push({
            id: formId,
            name: form.name,
            pageId,
            fieldIds,
            submitButtonId,
            submitEndpoint: form.submitEndpoint,
            successRedirect: form.successRedirect,
            constraintIds,
        });
        // Add to page's form list
        const page = pages.find(p => p.id === pageId);
        if (page && !page.formIds.includes(formId)) {
            page.formIds.push(formId);
        }
    }
    // Add navigation elements from selectors
    for (const selector of payload.selectors) {
        if (selector.isInteractive && selector.interactionType === 'navigation') {
            const elementId = `element-${++elementCounter}`;
            elements.push({
                id: elementId,
                type: 'link',
                role: 'navigation',
                selectors: [{
                        value: selector.selector,
                        strategy: selector.strategy,
                        confidence: 0.8,
                        source: 'attribute'
                    }],
                bestSelector: selector.selector,
                label: selector.element,
                placeholder: null,
                defaultValue: null,
                pageId: pages[0]?.id || 'page-unknown',
                formId: null,
            });
        }
    }
    // Convert inferred flows
    for (const inferredFlow of payload.relationships.inferredFlows) {
        const flowId = `flow-${inferredFlow.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const steps = inferredFlow.steps.map((stepPath, index) => {
            const pageId = `page-${stepPath.replace(/[^a-zA-Z0-9]/g, '-')}`;
            const page = pages.find(p => p.id === pageId);
            return {
                order: index + 1,
                pageId,
                action: page?.formIds.length ? 'fill-form' : 'navigate',
                targetElementId: page?.formIds[0] ? forms.find(f => f.id === page.formIds[0])?.fieldIds[0] || null : null,
                description: `Visit ${stepPath}${page?.formIds.length ? ' and complete form' : ''}`
            };
        });
        flows.push({
            id: flowId,
            name: inferredFlow.name,
            description: inferredFlow.description,
            steps,
            entities: inferredFlow.entities,
            importance: inferredFlow.importance,
            source: 'inferred'
        });
    }
    // Detect test framework from project info
    let detectedTestFramework = null;
    // Note: This would need to be enhanced with actual detection logic
    return {
        version: 'v5',
        project: {
            name: payload.project.name,
            framework: payload.project.framework.name,
            frameworkVersion: payload.project.framework.version,
            router: payload.project.framework.router,
        },
        pages,
        elements,
        forms,
        constraints,
        flows,
        config: {
            detectedTestFramework,
            selectorPriority: ['data-testid', 'data-cy', 'data-test', 'aria-label', 'name', 'id'],
            baseUrl: null,
            authEndpoint: payload.apis.find(a => a.path.includes('auth') || a.path.includes('login') || a.path.includes('sign'))?.path || null,
        },
        _raw: {
            types: payload.types,
            apis: payload.apis,
            relationships: payload.relationships,
        }
    };
}
/**
 * Scan project and return V5 payload directly
 */
async function scanProjectV5(projectPath) {
    const legacyPayload = await scanProject(projectPath);
    return convertToV5ScannerPayload(legacyPayload);
}

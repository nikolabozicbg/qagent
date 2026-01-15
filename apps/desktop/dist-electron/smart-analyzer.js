"use strict";
/**
 * Smart Analyzer for Electron Scanner
 *
 * Advanced analysis capabilities:
 * - Smart Form Extraction (useForm, validation schemas)
 * - Intelligent Selector Strategy
 * - Test Data Mining
 * - Navigation Flow Graph
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
exports.testDataMiner = exports.navigationFlowAnalyzer = exports.smartFormAnalyzer = exports.TestDataMiner = exports.NavigationFlowAnalyzer = exports.SmartFormAnalyzer = void 0;
const ts = __importStar(require("typescript"));
const path = __importStar(require("path"));
const fs_1 = require("fs");
// ============================================
// SMART FORM ANALYZER
// ============================================
class SmartFormAnalyzer {
    constructor() {
        this.typeDefinitions = new Map();
        this.componentImports = new Map(); // component name -> file path
    }
    /**
     * Analyze a file for forms using multiple strategies
     */
    analyzeFile(sourceFile, filePath, routePath, fileContent) {
        const forms = [];
        // First pass: collect type definitions and imports
        this.collectTypeDefinitions(sourceFile);
        this.collectImports(sourceFile, filePath);
        // Find useForm calls
        const useFormCalls = this.findUseFormCalls(sourceFile);
        // Find form elements
        const formElements = this.findFormElements(sourceFile);
        // For each useForm, try to match with a form element
        for (const useFormCall of useFormCalls) {
            const formInfo = this.analyzeUseForm(useFormCall, sourceFile, filePath, routePath, fileContent);
            if (formInfo) {
                // Try to find matching form element for submit info
                const matchingForm = formElements.find(f => this.isFormInSameScope(useFormCall.node, f));
                if (matchingForm) {
                    this.enrichWithFormElement(formInfo, matchingForm, sourceFile);
                }
                forms.push(formInfo);
            }
        }
        // Also analyze form elements without useForm (native forms)
        for (const formEl of formElements) {
            if (!forms.some(f => f.filePath === filePath)) {
                const nativeForm = this.analyzeNativeForm(formEl, sourceFile, filePath, routePath);
                if (nativeForm && nativeForm.fields.length > 0) {
                    forms.push(nativeForm);
                }
            }
        }
        // Extract test data from file content
        const testData = this.extractTestData(fileContent, filePath);
        for (const form of forms) {
            form.testData = testData;
        }
        return forms;
    }
    collectTypeDefinitions(sourceFile) {
        const visit = (node) => {
            if (ts.isInterfaceDeclaration(node)) {
                this.typeDefinitions.set(node.name.text, node);
            }
            else if (ts.isTypeAliasDeclaration(node)) {
                this.typeDefinitions.set(node.name.text, node);
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
    }
    collectImports(sourceFile, currentFilePath) {
        const visit = (node) => {
            if (ts.isImportDeclaration(node) && node.importClause) {
                const moduleSpecifier = node.moduleSpecifier.text;
                // Handle named imports
                if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
                    for (const element of node.importClause.namedBindings.elements) {
                        const importName = element.name.text;
                        const resolvedPath = this.resolveImportPath(moduleSpecifier, currentFilePath);
                        if (resolvedPath) {
                            this.componentImports.set(importName, resolvedPath);
                        }
                    }
                }
                // Handle default imports
                if (node.importClause.name) {
                    const importName = node.importClause.name.text;
                    const resolvedPath = this.resolveImportPath(moduleSpecifier, currentFilePath);
                    if (resolvedPath) {
                        this.componentImports.set(importName, resolvedPath);
                    }
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
    }
    resolveImportPath(moduleSpecifier, currentFilePath) {
        if (moduleSpecifier.startsWith('.') || moduleSpecifier.startsWith('@/')) {
            // Relative or aliased import
            const dir = path.dirname(currentFilePath);
            if (moduleSpecifier.startsWith('@/')) {
                // Common alias pattern - would need tsconfig to resolve properly
                return moduleSpecifier.replace('@/', '');
            }
            return path.resolve(dir, moduleSpecifier);
        }
        return null; // External package
    }
    findUseFormCalls(sourceFile) {
        const calls = [];
        const visit = (node) => {
            if (ts.isCallExpression(node)) {
                const expr = node.expression;
                if (ts.isIdentifier(expr) && expr.text === 'useForm') {
                    let typeArg = null;
                    if (node.typeArguments && node.typeArguments.length > 0) {
                        typeArg = node.typeArguments[0].getText(sourceFile);
                    }
                    calls.push({ node, typeArg });
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return calls;
    }
    findFormElements(sourceFile) {
        const forms = [];
        const visit = (node) => {
            if (ts.isJsxElement(node)) {
                const tagName = node.openingElement.tagName.getText(sourceFile).toLowerCase();
                if (tagName === 'form') {
                    forms.push(node);
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return forms;
    }
    analyzeUseForm(useFormCall, sourceFile, filePath, routePath, fileContent) {
        const { node, typeArg } = useFormCall;
        // Get component name from file path
        const componentName = this.inferComponentName(filePath);
        // Get fields from type interface
        let fields = [];
        if (typeArg) {
            fields = this.extractFieldsFromType(typeArg, sourceFile);
        }
        // Also try to get fields from defaultValues
        if (node.arguments.length > 0 && fields.length === 0) {
            fields = this.extractFieldsFromDefaultValues(node.arguments[0], sourceFile);
        }
        // Find validation schema (zod/yup)
        const validationSchema = this.detectValidationSchema(fileContent);
        // Find submit action
        const submitAction = this.findSubmitAction(sourceFile, fileContent);
        // Find success redirect
        const successRedirect = this.findSuccessRedirect(fileContent);
        const formId = `form-${componentName.toLowerCase()}-${Date.now()}`;
        return {
            id: formId,
            name: this.inferFormName(componentName, filePath),
            route: routePath,
            component: componentName,
            filePath,
            library: 'react-hook-form',
            typeInterface: typeArg,
            fields,
            submitButton: this.inferSubmitButton(sourceFile),
            submitAction,
            successRedirect,
            validationSchema,
            testData: {}
        };
    }
    extractFieldsFromType(typeName, sourceFile) {
        const fields = [];
        const typeDecl = this.typeDefinitions.get(typeName);
        if (!typeDecl)
            return fields;
        let members;
        if (ts.isInterfaceDeclaration(typeDecl)) {
            members = typeDecl.members;
        }
        else if (ts.isTypeAliasDeclaration(typeDecl) && ts.isTypeLiteralNode(typeDecl.type)) {
            members = typeDecl.type.members;
        }
        if (!members)
            return fields;
        for (const member of members) {
            if (ts.isPropertySignature(member) && member.name) {
                const fieldName = member.name.getText(sourceFile);
                const fieldType = member.type?.getText(sourceFile) || 'string';
                const isOptional = !!member.questionToken;
                // Infer input type from field name and type
                const inputType = this.inferInputType(fieldName, fieldType);
                fields.push({
                    name: fieldName,
                    id: null,
                    type: fieldType,
                    inputType,
                    label: this.humanize(fieldName),
                    placeholder: null,
                    isRequired: !isOptional,
                    selector: this.generateSelector(fieldName, inputType),
                    selectorStrategy: 'name',
                    validations: isOptional ? [] : [{ type: 'required', value: null, message: `${fieldName} is required` }],
                    defaultValue: null,
                    // Additional attributes (populated later by JSX analysis)
                    autocomplete: this.inferAutocomplete(fieldName, inputType),
                    ariaLabel: null,
                    dataTestId: null,
                    dataTest: null,
                    dataCy: null,
                });
            }
        }
        return fields;
    }
    extractFieldsFromDefaultValues(arg, sourceFile) {
        const fields = [];
        if (!ts.isObjectLiteralExpression(arg))
            return fields;
        // Look for defaultValues property
        for (const prop of arg.properties) {
            if (ts.isPropertyAssignment(prop) && prop.name.getText(sourceFile) === 'defaultValues') {
                if (ts.isObjectLiteralExpression(prop.initializer)) {
                    for (const field of prop.initializer.properties) {
                        if (ts.isPropertyAssignment(field) || ts.isShorthandPropertyAssignment(field)) {
                            const fieldName = field.name?.getText(sourceFile) || '';
                            const inputType = this.inferInputType(fieldName, 'string');
                            let defaultValue = null;
                            if (ts.isPropertyAssignment(field) && ts.isStringLiteral(field.initializer)) {
                                defaultValue = field.initializer.text;
                            }
                            fields.push({
                                name: fieldName,
                                id: null,
                                type: 'string',
                                inputType,
                                label: this.humanize(fieldName),
                                placeholder: null,
                                isRequired: true,
                                selector: this.generateSelector(fieldName, inputType),
                                selectorStrategy: 'name',
                                validations: [{ type: 'required', value: null, message: null }],
                                defaultValue,
                                // Additional attributes
                                autocomplete: this.inferAutocomplete(fieldName, inputType),
                                ariaLabel: null,
                                dataTestId: null,
                                dataTest: null,
                                dataCy: null,
                            });
                        }
                    }
                }
            }
        }
        return fields;
    }
    inferInputType(fieldName, fieldType) {
        const name = fieldName.toLowerCase();
        if (name.includes('email'))
            return 'email';
        if (name.includes('password') || name.includes('pwd'))
            return 'password';
        if (name.includes('phone') || name.includes('tel'))
            return 'tel';
        if (name.includes('url') || name.includes('website'))
            return 'url';
        if (name.includes('date') || name.includes('birthday') || name.includes('dob'))
            return 'date';
        if (name.includes('time'))
            return 'time';
        if (name.includes('number') || name.includes('amount') || name.includes('price') || name.includes('quantity'))
            return 'number';
        if (name.includes('search'))
            return 'search';
        if (fieldType === 'number')
            return 'number';
        if (fieldType === 'boolean')
            return 'checkbox';
        return 'text';
    }
    generateSelector(fieldName, inputType) {
        // Priority: name attribute is most reliable for forms
        return `input[name="${fieldName}"]`;
    }
    /**
     * Infer HTML autocomplete attribute from field name and type
     * Based on HTML Standard: https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls
     */
    inferAutocomplete(fieldName, inputType) {
        const name = fieldName.toLowerCase();
        // Authentication fields
        if (inputType === 'password') {
            if (name.includes('confirm') || name.includes('repeat') || name.includes('verify') || name.includes('new')) {
                return 'new-password';
            }
            return 'current-password';
        }
        if (name === 'username' || name.includes('user') && name.includes('name'))
            return 'username';
        if (inputType === 'email' || name.includes('email'))
            return 'email';
        // Name fields
        if (name.includes('firstname') || name.includes('first_name') || name.includes('given'))
            return 'given-name';
        if (name.includes('lastname') || name.includes('last_name') || name.includes('family') || name.includes('surname'))
            return 'family-name';
        if (name === 'name' || name === 'fullname' || name === 'full_name')
            return 'name';
        // Contact fields
        if (name.includes('phone') || name.includes('mobile') || inputType === 'tel')
            return 'tel';
        // Address fields
        if (name.includes('street') || name.includes('address1') || name.includes('address_1'))
            return 'address-line1';
        if (name.includes('address2') || name.includes('address_2') || name.includes('apt') || name.includes('suite'))
            return 'address-line2';
        if (name.includes('city') || name.includes('locality'))
            return 'address-level2';
        if (name.includes('state') || name.includes('province') || name.includes('region'))
            return 'address-level1';
        if (name.includes('zip') || name.includes('postal'))
            return 'postal-code';
        if (name.includes('country'))
            return 'country-name';
        // Payment fields
        if (name.includes('cardnum') || name.includes('card_num') || name.includes('ccnumber'))
            return 'cc-number';
        if (name.includes('cardname') || name.includes('card_name') || name.includes('ccname'))
            return 'cc-name';
        if (name.includes('expiry') || name.includes('exp'))
            return 'cc-exp';
        if (name.includes('cvv') || name.includes('cvc') || name.includes('csc'))
            return 'cc-csc';
        // Organization
        if (name.includes('company') || name.includes('org'))
            return 'organization';
        return null;
    }
    detectValidationSchema(content) {
        if (content.includes('zodResolver') || content.includes('z.object') || content.includes('z.string')) {
            return 'zod';
        }
        if (content.includes('yupResolver') || content.includes('yup.object') || content.includes('yup.string')) {
            return 'yup';
        }
        return null;
    }
    findSubmitAction(sourceFile, content) {
        // Look for common mutation/API patterns
        const patterns = [
            // RTK Query mutations
            /use(\w+)Mutation/g,
            // fetch/axios calls
            /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g,
            /axios\.(post|put|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
            // API calls
            /api\.(post|put|patch|create|update)\s*\(/g
        ];
        // Check for mutation hook usage
        const mutationMatch = content.match(/use(\w+)Mutation/);
        if (mutationMatch) {
            return {
                type: 'mutation',
                endpoint: mutationMatch[1].replace(/Mutation$/, '').toLowerCase(),
                method: 'POST'
            };
        }
        // Check for direct API calls
        const fetchMatch = content.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/);
        if (fetchMatch) {
            const method = content.includes('POST') ? 'POST' : content.includes('PUT') ? 'PUT' : 'POST';
            return {
                type: 'api',
                endpoint: fetchMatch[1],
                method
            };
        }
        return { type: null, endpoint: null, method: null };
    }
    findSuccessRedirect(content) {
        // Look for router.push after form submission
        const patterns = [
            /router\.push\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/,
            /router\.replace\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/,
            /redirect\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/,
            /navigate\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/
        ];
        for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match) {
                return match[1];
            }
        }
        return null;
    }
    inferSubmitButton(sourceFile) {
        let result = null;
        const visit = (node) => {
            if (result)
                return;
            if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
                const opening = ts.isJsxElement(node) ? node.openingElement : node;
                const tagName = opening.tagName.getText(sourceFile).toLowerCase();
                if (tagName === 'button') {
                    // Check type attribute
                    let isSubmit = true; // default for buttons in forms
                    let buttonText = null;
                    for (const prop of opening.attributes.properties) {
                        if (ts.isJsxAttribute(prop) && prop.name) {
                            const attrName = prop.name.getText(sourceFile);
                            if (attrName === 'type' && prop.initializer) {
                                const value = ts.isStringLiteral(prop.initializer)
                                    ? prop.initializer.text
                                    : null;
                                if (value && value !== 'submit') {
                                    isSubmit = false;
                                }
                            }
                        }
                    }
                    if (isSubmit) {
                        // Try to extract button text
                        if (ts.isJsxElement(node)) {
                            const text = this.extractJsxText(node);
                            buttonText = text;
                        }
                        result = {
                            text: buttonText,
                            selector: 'button[type="submit"]',
                            selectorStrategy: 'role'
                        };
                    }
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return result || { text: 'Submit', selector: 'button[type="submit"]', selectorStrategy: 'role' };
    }
    extractJsxText(node) {
        let text = '';
        for (const child of node.children) {
            if (ts.isJsxText(child)) {
                text += child.text.trim();
            }
            else if (ts.isJsxExpression(child) && child.expression) {
                if (ts.isStringLiteral(child.expression)) {
                    text += child.expression.text;
                }
            }
        }
        return text || null;
    }
    analyzeNativeForm(formElement, sourceFile, filePath, routePath) {
        const componentName = this.inferComponentName(filePath);
        const fields = this.extractFieldsFromFormElement(formElement, sourceFile);
        return {
            id: `form-native-${componentName.toLowerCase()}`,
            name: this.inferFormName(componentName, filePath),
            route: routePath,
            component: componentName,
            filePath,
            library: 'native',
            typeInterface: null,
            fields,
            submitButton: this.inferSubmitButton(sourceFile),
            submitAction: { type: null, endpoint: null, method: null },
            successRedirect: null,
            validationSchema: null,
            testData: {}
        };
    }
    extractFieldsFromFormElement(formElement, sourceFile) {
        const fields = [];
        const visit = (node) => {
            if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
                const opening = ts.isJsxElement(node) ? node.openingElement : node;
                const tagName = opening.tagName.getText(sourceFile);
                // Check for input-like elements
                if (this.isInputLikeElement(tagName)) {
                    const field = this.extractFieldFromElement(opening, sourceFile, tagName);
                    if (field) {
                        fields.push(field);
                    }
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(formElement);
        return fields;
    }
    isInputLikeElement(tagName) {
        const inputTags = ['input', 'textarea', 'select', 'Input', 'TextField', 'TextInput', 'PasswordField', 'Select'];
        return inputTags.includes(tagName) || inputTags.includes(tagName.toLowerCase());
    }
    extractFieldFromElement(element, sourceFile, tagName) {
        let name = null;
        let id = null;
        let type = 'text';
        let placeholder = null;
        let label = null;
        let isRequired = false;
        let autocomplete = null;
        let ariaLabel = null;
        let dataTestId = null;
        let dataTest = null;
        let dataCy = null;
        let defaultValue = null;
        for (const prop of element.attributes.properties) {
            // Check for spread attributes like {...register('fieldName')}
            if (ts.isJsxSpreadAttribute(prop)) {
                const text = prop.getText(sourceFile);
                const registerMatch = text.match(/register\s*\(\s*['"]([^'"]+)['"]/);
                if (registerMatch && !name) {
                    name = registerMatch[1];
                }
            }
            if (ts.isJsxAttribute(prop) && prop.name) {
                const attrName = prop.name.getText(sourceFile);
                const value = this.getAttributeValue(prop, sourceFile);
                switch (attrName) {
                    case 'name':
                        name = value;
                        break;
                    case 'id':
                        id = value;
                        break;
                    case 'type':
                        type = value || 'text';
                        break;
                    case 'placeholder':
                        placeholder = value;
                        break;
                    case 'label':
                        label = value;
                        break;
                    case 'required':
                        isRequired = true;
                        break;
                    case 'autoComplete':
                    case 'autocomplete':
                        autocomplete = value;
                        break;
                    case 'aria-label':
                        ariaLabel = value;
                        break;
                    case 'data-testid':
                        dataTestId = value;
                        break;
                    case 'data-test':
                        dataTest = value;
                        break;
                    case 'data-cy':
                        dataCy = value;
                        break;
                    case 'defaultValue':
                        defaultValue = value;
                        break;
                    case 'validation':
                        // Check if validation includes required
                        if (prop.initializer) {
                            const valText = prop.initializer.getText(sourceFile);
                            if (valText.includes('required')) {
                                isRequired = true;
                            }
                        }
                        break;
                }
            }
        }
        // If no name found, try id as fallback
        if (!name && id) {
            name = id;
        }
        if (!name)
            return null;
        const inputType = this.inferInputType(name, type);
        // Determine selector strategy
        let selector;
        let selectorStrategy = 'name';
        if (dataTestId) {
            selector = `[data-testid="${dataTestId}"]`;
            selectorStrategy = 'testid';
        }
        else {
            selector = this.generateSelector(name, inputType);
            selectorStrategy = 'name';
        }
        return {
            name,
            id,
            type,
            inputType,
            label: label || placeholder || this.humanize(name),
            placeholder,
            isRequired,
            selector,
            selectorStrategy,
            validations: isRequired ? [{ type: 'required', value: null, message: null }] : [],
            defaultValue,
            autocomplete,
            ariaLabel,
            dataTestId,
            dataTest,
            dataCy,
        };
    }
    getAttributeValue(attr, sourceFile) {
        if (!attr.initializer)
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
    inferComponentName(filePath) {
        const basename = path.basename(filePath, path.extname(filePath));
        if (basename === 'page' || basename === 'index') {
            // Use parent folder name
            const parentDir = path.basename(path.dirname(filePath));
            return this.pascalCase(parentDir);
        }
        return this.pascalCase(basename);
    }
    inferFormName(componentName, filePath) {
        const lower = componentName.toLowerCase();
        const pathLower = filePath.toLowerCase();
        if (lower.includes('signin') || lower.includes('login') || pathLower.includes('sign-in') || pathLower.includes('login')) {
            return 'Login Form';
        }
        if (lower.includes('signup') || lower.includes('register') || pathLower.includes('sign-up') || pathLower.includes('register')) {
            return 'Registration Form';
        }
        if (lower.includes('reset') || pathLower.includes('reset')) {
            return 'Password Reset Form';
        }
        if (lower.includes('contact') || pathLower.includes('contact')) {
            return 'Contact Form';
        }
        if (lower.includes('checkout') || pathLower.includes('checkout')) {
            return 'Checkout Form';
        }
        if (lower.includes('profile') || pathLower.includes('profile')) {
            return 'Profile Form';
        }
        if (lower.includes('settings') || pathLower.includes('settings')) {
            return 'Settings Form';
        }
        return `${componentName} Form`;
    }
    humanize(str) {
        return str
            .replace(/([A-Z])/g, ' $1')
            .replace(/[-_]/g, ' ')
            .replace(/^\s/, '')
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
    }
    pascalCase(str) {
        return str
            .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
            .replace(/^(.)/, (_, c) => c.toUpperCase());
    }
    isFormInSameScope(useFormNode, formElement) {
        // Simple heuristic: they're in the same function
        let useFormParent = useFormNode.parent;
        let formParent = formElement.parent;
        while (useFormParent && !ts.isFunctionDeclaration(useFormParent) && !ts.isArrowFunction(useFormParent)) {
            useFormParent = useFormParent.parent;
        }
        while (formParent && !ts.isFunctionDeclaration(formParent) && !ts.isArrowFunction(formParent)) {
            formParent = formParent.parent;
        }
        return useFormParent === formParent;
    }
    enrichWithFormElement(formInfo, formElement, sourceFile) {
        // Extract additional fields from the actual form element if we missed any
        const elementFields = this.extractFieldsFromFormElement(formElement, sourceFile);
        for (const ef of elementFields) {
            if (!formInfo.fields.some(f => f.name === ef.name)) {
                formInfo.fields.push(ef);
            }
            else {
                // Enrich existing field with more info
                const existing = formInfo.fields.find(f => f.name === ef.name);
                if (existing) {
                    if (!existing.placeholder && ef.placeholder) {
                        existing.placeholder = ef.placeholder;
                    }
                    if (!existing.label && ef.label) {
                        existing.label = ef.label;
                    }
                }
            }
        }
    }
    /**
     * Extract test data from file content (credentials, example values)
     */
    extractTestData(content, filePath) {
        const testData = {};
        // Look for hardcoded test credentials in comments or JSX
        const emailPatterns = [
            /['"]([\w.+-]+@example\.com)['"]/g,
            /['"](test[\w]*@[\w.]+)['"]/g,
            /['"](admin@[\w.]+)['"]/g,
            /['"](user@[\w.]+)['"]/g,
            /email:\s*['"]([^'"]+)['"]/g,
            /username:\s*['"]([^'"]+)['"]/g
        ];
        const passwordPatterns = [
            /password['"]*:\s*['"]([^'"]+)['"]/gi,
            /pwd['"]*:\s*['"]([^'"]+)['"]/gi,
            /['"]password\d*['"]/gi
        ];
        for (const pattern of emailPatterns) {
            const matches = content.matchAll(pattern);
            for (const match of matches) {
                if (match[1] && match[1].includes('@')) {
                    testData.email = match[1];
                    break;
                }
            }
            if (testData.email)
                break;
        }
        for (const pattern of passwordPatterns) {
            const matches = content.matchAll(pattern);
            for (const match of matches) {
                if (match[1] && match[1].length >= 4) {
                    testData.password = match[1];
                    break;
                }
            }
            if (testData.password)
                break;
        }
        return testData;
    }
}
exports.SmartFormAnalyzer = SmartFormAnalyzer;
// ============================================
// NAVIGATION FLOW ANALYZER
// ============================================
class NavigationFlowAnalyzer {
    /**
     * Extract navigation links from a source file
     */
    extractNavigationLinks(sourceFile, currentRoute, componentName) {
        const links = [];
        const fromContext = currentRoute || componentName;
        const visit = (node) => {
            // <Link href="...">
            if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
                const opening = ts.isJsxElement(node) ? node.openingElement : node;
                const tagName = opening.tagName.getText(sourceFile);
                if (tagName === 'Link' || tagName === 'a') {
                    const href = this.getJsxAttributeValue(opening, 'href', sourceFile);
                    if (href && href.startsWith('/')) {
                        let linkText = null;
                        if (ts.isJsxElement(node)) {
                            linkText = this.extractTextContent(node, sourceFile);
                        }
                        links.push({
                            from: fromContext,
                            to: href,
                            linkText,
                            selector: linkText ? `text="${linkText}"` : `a[href="${href}"]`,
                            type: 'link'
                        });
                    }
                }
            }
            // router.push('/path')
            if (ts.isCallExpression(node)) {
                const expr = node.expression;
                if (ts.isPropertyAccessExpression(expr)) {
                    const method = expr.name.getText(sourceFile);
                    const obj = expr.expression.getText(sourceFile);
                    if ((obj === 'router' || obj.endsWith('Router')) &&
                        (method === 'push' || method === 'replace')) {
                        if (node.arguments.length > 0) {
                            const arg = node.arguments[0];
                            if (ts.isStringLiteral(arg) && arg.text.startsWith('/')) {
                                links.push({
                                    from: fromContext,
                                    to: arg.text,
                                    linkText: null,
                                    selector: null,
                                    type: method === 'push' ? 'push' : 'replace'
                                });
                            }
                        }
                    }
                }
                // redirect('/path')
                if (ts.isIdentifier(expr) && expr.text === 'redirect') {
                    if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
                        const target = node.arguments[0].text;
                        if (target.startsWith('/')) {
                            links.push({
                                from: fromContext,
                                to: target,
                                linkText: null,
                                selector: null,
                                type: 'redirect'
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
    getJsxAttributeValue(element, attrName, sourceFile) {
        for (const prop of element.attributes.properties) {
            if (ts.isJsxAttribute(prop) && prop.name?.getText(sourceFile) === attrName) {
                if (prop.initializer) {
                    if (ts.isStringLiteral(prop.initializer)) {
                        return prop.initializer.text;
                    }
                    if (ts.isJsxExpression(prop.initializer) && prop.initializer.expression) {
                        if (ts.isStringLiteral(prop.initializer.expression)) {
                            return prop.initializer.expression.text;
                        }
                    }
                }
            }
        }
        return null;
    }
    extractTextContent(node, sourceFile) {
        let text = '';
        const visit = (child) => {
            if (ts.isJsxText(child)) {
                text += child.text.trim();
            }
            else if (ts.isJsxExpression(child) && child.expression && ts.isStringLiteral(child.expression)) {
                text += child.expression.text;
            }
            ts.forEachChild(child, visit);
        };
        for (const child of node.children) {
            visit(child);
        }
        return text.trim() || null;
    }
    /**
     * Build a flow graph from navigation links
     */
    buildFlowGraph(links, routes, protectedRoutes) {
        const nodes = new Set(routes);
        const edges = [];
        // Add edges from links
        for (const link of links) {
            nodes.add(link.to);
            if (link.from.startsWith('/')) {
                nodes.add(link.from);
            }
            edges.push({
                from: link.from,
                to: link.to,
                label: link.linkText
            });
        }
        // Identify entry points (routes with no incoming edges from other routes)
        const routesWithIncoming = new Set(edges.filter(e => e.from.startsWith('/')).map(e => e.to));
        const entryPoints = routes.filter(r => !routesWithIncoming.has(r) ||
            r === '/' ||
            r.includes('sign-in') ||
            r.includes('login'));
        // Auth routes
        const authRoutes = routes.filter(r => r.includes('sign') ||
            r.includes('login') ||
            r.includes('auth') ||
            r.includes('register'));
        return {
            nodes: Array.from(nodes),
            edges,
            entryPoints,
            authRoutes,
            protectedRoutes
        };
    }
    /**
     * Infer user journeys from flow graph
     */
    inferUserJourneys(graph) {
        const journeys = [];
        // Auth journey: sign-up/sign-in -> redirect
        const authStart = graph.authRoutes.find(r => r.includes('sign-in') || r.includes('login'));
        if (authStart) {
            const authEdges = graph.edges.filter(e => e.from === authStart || e.from.includes(authStart));
            if (authEdges.length > 0) {
                journeys.push({
                    name: 'Authentication',
                    steps: [authStart, ...authEdges.map(e => e.to)],
                    importance: 0.95
                });
            }
        }
        // New user journey
        const signUp = graph.authRoutes.find(r => r.includes('sign-up') || r.includes('register'));
        if (signUp) {
            const signUpEdges = graph.edges.filter(e => e.from === signUp || e.from.includes(signUp));
            journeys.push({
                name: 'New User Registration',
                steps: [signUp, ...signUpEdges.map(e => e.to)],
                importance: 0.9
            });
        }
        // Protected area navigation
        if (graph.protectedRoutes.length > 0) {
            journeys.push({
                name: 'Protected Area Navigation',
                steps: graph.protectedRoutes.slice(0, 5),
                importance: 0.7
            });
        }
        return journeys.filter(j => j.steps.length > 0);
    }
}
exports.NavigationFlowAnalyzer = NavigationFlowAnalyzer;
// ============================================
// TEST DATA MINER
// ============================================
class TestDataMiner {
    /**
     * Scan project for test credentials and example data
     */
    async mineTestData(projectPath, sourceFiles) {
        const credentials = [];
        const envVariables = {};
        const exampleData = { emails: [], passwords: [], names: [] };
        // Check .env files
        const envFiles = ['.env.example', '.env.local.example', '.env.development', '.env.test'];
        for (const envFile of envFiles) {
            try {
                const envPath = path.join(projectPath, envFile);
                const content = await fs_1.promises.readFile(envPath, 'utf-8');
                this.parseEnvFile(content, envVariables);
            }
            catch {
                // File doesn't exist
            }
        }
        // Scan source files for test data
        for (const filePath of sourceFiles) {
            try {
                const content = await fs_1.promises.readFile(filePath, 'utf-8');
                // Look for test credential patterns
                const creds = this.findCredentials(content, filePath);
                credentials.push(...creds);
                // Look for example data
                this.findExampleData(content, exampleData);
            }
            catch {
                // Skip files that can't be read
            }
        }
        // Deduplicate
        const uniqueCredentials = this.deduplicateCredentials(credentials);
        return { credentials: uniqueCredentials, envVariables, exampleData };
    }
    parseEnvFile(content, variables) {
        const lines = content.split('\n');
        for (const line of lines) {
            const match = line.match(/^([A-Z_]+)=(.*)$/);
            if (match) {
                const [, key, value] = match;
                if (key.includes('TEST') || key.includes('USER') || key.includes('PASSWORD') || key.includes('EMAIL')) {
                    variables[key] = value.replace(/['"]/g, '');
                }
            }
        }
    }
    findCredentials(content, filePath) {
        const credentials = [];
        // Pattern: Testing accounts comment block
        const testAccountsPattern = /Testing\s*(?:Accounts?|Users?)[:\s]*\n([\s\S]*?)(?:\n\s*\n|\*\/|<\/)/i;
        const accountsMatch = content.match(testAccountsPattern);
        if (accountsMatch) {
            const block = accountsMatch[1];
            const accountLines = block.match(/(\w+):\s*([\w.@+-]+)\s*\/\s*([\w!@#$%^&*]+)/g);
            if (accountLines) {
                for (const line of accountLines) {
                    const parts = line.match(/(\w+):\s*([\w.@+-]+)\s*\/\s*([\w!@#$%^&*]+)/);
                    if (parts) {
                        credentials.push({
                            role: parts[1].toLowerCase(),
                            email: parts[2],
                            password: parts[3],
                            source: filePath
                        });
                    }
                }
            }
        }
        // Pattern: Email + password near each other
        const emailMatch = content.match(/['"]([a-zA-Z0-9._%+-]+@(?:example\.com|test\.com|[\w.]+))['"]/);
        const passwordMatch = content.match(/password['"]*[:\s]*['"]([^'"]+)['"]/i);
        if (emailMatch && passwordMatch) {
            credentials.push({
                email: emailMatch[1],
                password: passwordMatch[1],
                source: filePath
            });
        }
        return credentials;
    }
    findExampleData(content, data) {
        // Find example emails
        const emails = content.match(/['"]([a-zA-Z0-9._%+-]+@example\.com)['"]/g);
        if (emails) {
            for (const match of emails) {
                const email = match.replace(/['"]/g, '');
                if (!data.emails.includes(email)) {
                    data.emails.push(email);
                }
            }
        }
        // Find example names
        const names = content.match(/['"](?:John|Jane|Test|Demo|Example)\s+(?:Doe|User|Account)['"]/g);
        if (names) {
            for (const match of names) {
                const name = match.replace(/['"]/g, '');
                if (!data.names.includes(name)) {
                    data.names.push(name);
                }
            }
        }
    }
    deduplicateCredentials(credentials) {
        const seen = new Set();
        return credentials.filter(c => {
            const key = `${c.email}:${c.password}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
}
exports.TestDataMiner = TestDataMiner;
// ============================================
// EXPORTS
// ============================================
exports.smartFormAnalyzer = new SmartFormAnalyzer();
exports.navigationFlowAnalyzer = new NavigationFlowAnalyzer();
exports.testDataMiner = new TestDataMiner();

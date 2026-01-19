"use strict";
/**
 * React Hook Form Plugin
 *
 * Full support for:
 * - useForm hook detection
 * - Type interface parsing for fields
 * - Zod/Yup validation schema detection
 * - Field registration patterns
 * - Submit action detection
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
exports.ReactHookFormPlugin = void 0;
const path = __importStar(require("path"));
const ts = __importStar(require("typescript"));
class ReactHookFormPlugin {
    constructor() {
        this.name = 'react-hook-form';
        this.version = '1.0.0';
        this.type = 'form';
        this.priority = 100;
        this.typeDefinitions = new Map();
    }
    async detect(context) {
        const { packageJson } = context;
        const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies };
        return !!deps?.['react-hook-form'];
    }
    async analyze(context) {
        const { sourceFiles, parsedFiles, frameworkResult } = context;
        const forms = [];
        // Build route-to-file mapping
        const routeToFile = new Map();
        if (frameworkResult) {
            for (const route of frameworkResult.routes) {
                routeToFile.set(route.filePath, route.path);
            }
        }
        // Analyze each source file
        for (const file of sourceFiles) {
            // Quick check for useForm
            if (!file.content.includes('useForm'))
                continue;
            const parsed = parsedFiles.get(file.path);
            if (!parsed)
                continue;
            // Collect type definitions from this file
            this.collectTypeDefinitions(parsed);
            // Find useForm calls
            const fileForms = this.analyzeFile(parsed, file.path, file.content, routeToFile, context);
            forms.push(...fileForms);
        }
        return {
            pluginName: this.name,
            success: true,
            library: 'react-hook-form',
            forms,
        };
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
    analyzeFile(sourceFile, filePath, content, routeToFile, context) {
        const forms = [];
        const componentName = this.findComponentName(sourceFile) || path.basename(filePath, path.extname(filePath));
        const route = routeToFile.get(filePath) || null;
        const visit = (node) => {
            // Look for useForm calls
            if (ts.isCallExpression(node)) {
                const callText = node.expression.getText();
                if (callText === 'useForm' || callText.endsWith('.useForm')) {
                    const form = this.analyzeUseFormCall(node, sourceFile, filePath, componentName, route, context);
                    if (form)
                        forms.push(form);
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        // Enrich forms with JSX analysis
        for (const form of forms) {
            this.enrichFormWithJSX(form, sourceFile, content);
        }
        return forms;
    }
    analyzeUseFormCall(node, sourceFile, filePath, componentName, route, context) {
        const fields = [];
        let typeInterfaceName = null;
        let validationSchema = null;
        // Check for type argument: useForm<FormData>()
        if (node.typeArguments && node.typeArguments.length > 0) {
            const typeArg = node.typeArguments[0];
            typeInterfaceName = typeArg.getText();
            // Try to find the interface and extract fields
            const typeDef = this.typeDefinitions.get(typeInterfaceName);
            if (typeDef) {
                const extractedFields = this.extractFieldsFromType(typeDef, context);
                fields.push(...extractedFields);
            }
        }
        // Check for options argument
        if (node.arguments.length > 0 && ts.isObjectLiteralExpression(node.arguments[0])) {
            const options = node.arguments[0];
            for (const prop of options.properties) {
                if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
                    const propName = prop.name.text;
                    // Check for resolver (Zod/Yup)
                    if (propName === 'resolver') {
                        const resolverText = prop.initializer.getText();
                        if (resolverText.includes('zodResolver')) {
                            validationSchema = 'zod';
                            // Try to extract schema name and parse validations
                            const schemaMatch = resolverText.match(/zodResolver\((\w+)\)/);
                            if (schemaMatch) {
                                this.extractZodValidations(schemaMatch[1], sourceFile, fields);
                            }
                        }
                        else if (resolverText.includes('yupResolver')) {
                            validationSchema = 'yup';
                        }
                    }
                    // Check for defaultValues
                    if (propName === 'defaultValues' && ts.isObjectLiteralExpression(prop.initializer)) {
                        this.extractFieldsFromDefaultValues(prop.initializer, fields, context);
                    }
                }
            }
        }
        // Generate form ID and name
        const formId = `form-${componentName.toLowerCase()}-rhf`;
        const formName = this.inferFormName(componentName, route);
        // Detect submit action
        const submitAction = this.findSubmitAction(sourceFile);
        return {
            id: formId,
            name: formName,
            componentName,
            filePath,
            route,
            library: 'react-hook-form',
            fields,
            submitButton: null, // Will be enriched later
            submitEndpoint: submitAction.endpoint,
            hasValidation: validationSchema !== null || fields.some(f => f.validations.length > 0),
            validationRules: {},
            successRedirect: submitAction.redirect,
        };
    }
    extractFieldsFromType(typeDef, context) {
        const fields = [];
        const selectorPriority = context.config.selectors.priority;
        const processMembers = (members) => {
            for (const member of members) {
                if (ts.isPropertySignature(member) && member.name) {
                    const fieldName = member.name.getText();
                    const typeText = member.type?.getText() || 'string';
                    const isOptional = !!member.questionToken;
                    // Infer input type from field name and type
                    const inputType = this.inferInputType(fieldName, typeText);
                    // Generate selector based on priority
                    const selector = this.generateSelector(fieldName, inputType, selectorPriority);
                    fields.push({
                        name: fieldName,
                        type: typeText,
                        inputType,
                        label: this.humanize(fieldName),
                        placeholder: null,
                        isRequired: !isOptional,
                        selector,
                        selectorStrategy: this.getSelectorStrategy(selectorPriority[0]),
                        validations: isOptional ? [] : [{ type: 'required', value: null, message: null }],
                        defaultValue: null,
                    });
                }
            }
        };
        if (ts.isInterfaceDeclaration(typeDef)) {
            processMembers(typeDef.members);
        }
        else if (ts.isTypeAliasDeclaration(typeDef) && ts.isTypeLiteralNode(typeDef.type)) {
            processMembers(typeDef.type.members);
        }
        return fields;
    }
    extractFieldsFromDefaultValues(defaultValues, existingFields, context) {
        const selectorPriority = context.config.selectors.priority;
        for (const prop of defaultValues.properties) {
            if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
                const fieldName = prop.name.text;
                // Check if field already exists
                const existing = existingFields.find(f => f.name === fieldName);
                if (existing) {
                    // Update default value
                    if (ts.isStringLiteral(prop.initializer)) {
                        existing.defaultValue = prop.initializer.text;
                    }
                }
                else {
                    // Add new field
                    const value = prop.initializer.getText();
                    const inputType = this.inferInputType(fieldName, typeof value);
                    existingFields.push({
                        name: fieldName,
                        type: 'string',
                        inputType,
                        label: this.humanize(fieldName),
                        placeholder: null,
                        isRequired: false,
                        selector: this.generateSelector(fieldName, inputType, selectorPriority),
                        selectorStrategy: this.getSelectorStrategy(selectorPriority[0]),
                        validations: [],
                        defaultValue: ts.isStringLiteral(prop.initializer) ? prop.initializer.text : null,
                    });
                }
            }
        }
    }
    extractZodValidations(schemaName, sourceFile, fields) {
        const content = sourceFile.getText();
        // Find schema definition
        const schemaRegex = new RegExp(`const\\s+${schemaName}\\s*=\\s*z\\.object\\(\\{([^}]+)\\}`, 's');
        const match = content.match(schemaRegex);
        if (!match)
            return;
        const schemaContent = match[1];
        // Parse field validations
        const fieldRegex = /(\w+):\s*z\.(\w+)\(\)[^,]*/g;
        let fieldMatch;
        while ((fieldMatch = fieldRegex.exec(schemaContent)) !== null) {
            const fieldName = fieldMatch[0].split(':')[0].trim();
            const fieldDef = fieldMatch[0];
            const field = fields.find(f => f.name === fieldName);
            if (!field)
                continue;
            // Extract validations
            if (fieldDef.includes('.min(')) {
                const minMatch = fieldDef.match(/\.min\((\d+)/);
                if (minMatch) {
                    field.validations.push({
                        type: 'minLength',
                        value: parseInt(minMatch[1]),
                        message: null,
                    });
                }
            }
            if (fieldDef.includes('.max(')) {
                const maxMatch = fieldDef.match(/\.max\((\d+)/);
                if (maxMatch) {
                    field.validations.push({
                        type: 'maxLength',
                        value: parseInt(maxMatch[1]),
                        message: null,
                    });
                }
            }
            if (fieldDef.includes('.email(')) {
                field.validations.push({ type: 'email', value: null, message: null });
            }
        }
    }
    enrichFormWithJSX(form, sourceFile, content) {
        const visit = (node) => {
            // Find submit button
            if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
                const opening = ts.isJsxElement(node) ? node.openingElement : node;
                const tagName = opening.tagName.getText().toLowerCase();
                if (tagName === 'button') {
                    const typeAttr = this.getJsxAttribute(opening, 'type');
                    if (!typeAttr || typeAttr === 'submit') {
                        let buttonText = null;
                        if (ts.isJsxElement(node)) {
                            const text = node.children
                                .filter(c => ts.isJsxText(c))
                                .map(c => c.getText().trim())
                                .join('');
                            if (text)
                                buttonText = text;
                        }
                        form.submitButton = {
                            text: buttonText,
                            selector: 'button[type="submit"]',
                        };
                    }
                }
                // Find labels for fields
                if (tagName === 'label') {
                    const htmlFor = this.getJsxAttribute(opening, 'htmlFor');
                    if (htmlFor) {
                        const field = form.fields.find(f => f.name === htmlFor);
                        if (field && ts.isJsxElement(node)) {
                            const labelText = node.children
                                .filter(c => ts.isJsxText(c))
                                .map(c => c.getText().trim())
                                .join('');
                            if (labelText)
                                field.label = labelText;
                        }
                    }
                }
                // Find placeholders and update fields
                if (tagName === 'input' || tagName === 'textarea') {
                    const name = this.getJsxAttribute(opening, 'name');
                    const placeholder = this.getJsxAttribute(opening, 'placeholder');
                    if (name) {
                        const field = form.fields.find(f => f.name === name);
                        if (field && placeholder) {
                            field.placeholder = placeholder;
                        }
                    }
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
    }
    findSubmitAction(sourceFile) {
        let endpoint = null;
        let redirect = null;
        const content = sourceFile.getText();
        // Look for common API patterns
        const apiPatterns = [
            /fetch\s*\(\s*['"`]([^'"`]+)['"`]/,
            /axios\.\w+\s*\(\s*['"`]([^'"`]+)['"`]/,
            /\.mutate\s*\(\s*\{[^}]*url:\s*['"`]([^'"`]+)['"`]/,
            /signIn|signUp|login|register/i,
        ];
        for (const pattern of apiPatterns) {
            const match = content.match(pattern);
            if (match) {
                endpoint = match[1] || match[0];
                break;
            }
        }
        // Look for redirect patterns
        const redirectPatterns = [
            /router\.push\s*\(\s*['"`]([^'"`]+)['"`]\)/,
            /redirect\s*\(\s*['"`]([^'"`]+)['"`]\)/,
            /window\.location\s*=\s*['"`]([^'"`]+)['"`]/,
        ];
        for (const pattern of redirectPatterns) {
            const match = content.match(pattern);
            if (match) {
                redirect = match[1];
                break;
            }
        }
        return { endpoint, redirect };
    }
    findComponentName(sourceFile) {
        let name = null;
        const visit = (node) => {
            if (ts.isFunctionDeclaration(node) && node.name) {
                const funcName = node.name.text;
                if (funcName[0] === funcName[0].toUpperCase()) {
                    name = funcName;
                }
            }
            if (!name)
                ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return name;
    }
    inferInputType(fieldName, typeText) {
        const nameLower = fieldName.toLowerCase();
        if (nameLower.includes('email'))
            return 'email';
        if (nameLower.includes('password'))
            return 'password';
        if (nameLower.includes('phone') || nameLower.includes('tel'))
            return 'tel';
        if (nameLower.includes('url') || nameLower.includes('website'))
            return 'url';
        if (nameLower.includes('date'))
            return 'date';
        if (nameLower.includes('time'))
            return 'time';
        if (typeText === 'number')
            return 'number';
        if (typeText === 'boolean')
            return 'checkbox';
        return 'text';
    }
    generateSelector(fieldName, inputType, priority) {
        // Default to name-based selector
        const tag = inputType === 'textarea' ? 'textarea' : 'input';
        return `${tag}[name="${fieldName}"]`;
    }
    getSelectorStrategy(strategy) {
        const validStrategies = ['data-testid', 'name', 'label', 'placeholder', 'role', 'id', 'css'];
        return validStrategies.includes(strategy)
            ? strategy
            : 'name';
    }
    getJsxAttribute(element, attrName) {
        for (const attr of element.attributes.properties) {
            if (ts.isJsxAttribute(attr) && attr.name.getText() === attrName && attr.initializer) {
                if (ts.isStringLiteral(attr.initializer)) {
                    return attr.initializer.text;
                }
                if (ts.isJsxExpression(attr.initializer) &&
                    attr.initializer.expression &&
                    ts.isStringLiteral(attr.initializer.expression)) {
                    return attr.initializer.expression.text;
                }
            }
        }
        return null;
    }
    inferFormName(componentName, route) {
        // Try to infer from route
        if (route) {
            if (route.includes('sign-in') || route.includes('login'))
                return 'Login Form';
            if (route.includes('sign-up') || route.includes('register'))
                return 'Registration Form';
            if (route.includes('password-reset'))
                return 'Password Reset Form';
            if (route.includes('profile'))
                return 'Profile Form';
        }
        // Infer from component name
        const name = componentName
            .replace(/Page$/, '')
            .replace(/Form$/, '')
            .replace(/([A-Z])/g, ' $1')
            .trim();
        return `${name} Form`;
    }
    humanize(str) {
        return str
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/^./, s => s.toUpperCase())
            .trim();
    }
}
exports.ReactHookFormPlugin = ReactHookFormPlugin;

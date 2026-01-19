"use strict";
/**
 * Prisma Schema Plugin
 *
 * Full support for:
 * - schema.prisma parsing
 * - Model extraction
 * - Relation detection
 * - Entity to route mapping
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
exports.PrismaPlugin = void 0;
const path = __importStar(require("path"));
class PrismaPlugin {
    constructor() {
        this.name = 'prisma';
        this.version = '1.0.0';
        this.type = 'schema';
        this.priority = 100;
    }
    async detect(context) {
        const { packageJson } = context;
        const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies };
        // Check for prisma dependency
        if (!deps?.['@prisma/client'] && !deps?.['prisma']) {
            return false;
        }
        // Check for schema.prisma file
        const hasSchema = await context.fileExists('prisma/schema.prisma') ||
            await context.fileExists('schema.prisma');
        return hasSchema;
    }
    async analyze(context) {
        const entities = [];
        const relations = [];
        // Find and read schema file
        let schemaContent = null;
        let schemaPath = '';
        if (await context.fileExists('prisma/schema.prisma')) {
            schemaPath = 'prisma/schema.prisma';
            schemaContent = await context.readFile(schemaPath);
        }
        else if (await context.fileExists('schema.prisma')) {
            schemaPath = 'schema.prisma';
            schemaContent = await context.readFile(schemaPath);
        }
        if (!schemaContent) {
            return {
                pluginName: this.name,
                success: false,
                errors: ['Could not read schema.prisma'],
                orm: 'prisma',
                entities: [],
                relations: [],
            };
        }
        // Parse schema
        const fullSchemaPath = path.join(context.projectPath, schemaPath);
        this.parseSchema(schemaContent, fullSchemaPath, entities, relations);
        // Map entities to routes based on framework result
        if (context.frameworkResult) {
            this.mapEntitiesToRoutes(entities, context.frameworkResult.routes);
        }
        return {
            pluginName: this.name,
            success: true,
            orm: 'prisma',
            entities,
            relations,
        };
    }
    parseSchema(content, filePath, entities, relations) {
        // Find all model definitions
        const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
        let match;
        while ((match = modelRegex.exec(content)) !== null) {
            const modelName = match[1];
            const modelBody = match[2];
            const fields = [];
            const modelRelations = [];
            // Parse each line in the model
            const lines = modelBody.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@'))
                    continue;
                const field = this.parseFieldLine(trimmed);
                if (field) {
                    fields.push(field);
                    // Track relations
                    if (field.relation) {
                        modelRelations.push(field.relation);
                        // Add to relations list
                        const relationType = this.inferRelationType(trimmed, field);
                        relations.push({
                            from: modelName,
                            to: field.relation,
                            type: relationType,
                            fieldName: field.name,
                        });
                    }
                }
            }
            // Determine if this is an auth entity
            const isAuthEntity = this.isAuthEntity(modelName, fields);
            entities.push({
                name: modelName,
                tableName: this.toSnakeCase(modelName),
                filePath,
                fields,
                isAuthEntity,
            });
        }
    }
    parseFieldLine(line) {
        // Basic field pattern: fieldName Type @attributes
        const fieldMatch = line.match(/^(\w+)\s+(\w+)(\[\])?\??(\s+.*)?$/);
        if (!fieldMatch)
            return null;
        const [, name, type, isArray, attributes] = fieldMatch;
        const attrString = attributes || '';
        // Skip Prisma directives that start with @@
        if (name.startsWith('@'))
            return null;
        // Check for @relation
        const relationMatch = attrString.match(/@relation\([^)]*\)/);
        let relation;
        if (relationMatch || this.isPrismaModelType(type)) {
            relation = type;
        }
        return {
            name,
            type: isArray ? `${type}[]` : type,
            dbType: this.prismaTypeToDbType(type),
            isPrimaryKey: attrString.includes('@id'),
            isUnique: attrString.includes('@unique') || attrString.includes('@id'),
            isNullable: line.includes('?'),
            hasDefault: attrString.includes('@default'),
            relation,
        };
    }
    isPrismaModelType(type) {
        // Common Prisma scalar types
        const scalarTypes = [
            'String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json',
            'BigInt', 'Decimal', 'Bytes'
        ];
        return !scalarTypes.includes(type);
    }
    prismaTypeToDbType(type) {
        const typeMap = {
            'String': 'varchar',
            'Int': 'integer',
            'Float': 'float',
            'Boolean': 'boolean',
            'DateTime': 'timestamp',
            'Json': 'json',
            'BigInt': 'bigint',
            'Decimal': 'decimal',
            'Bytes': 'bytea',
        };
        return typeMap[type] || 'unknown';
    }
    inferRelationType(line, field) {
        if (line.includes('[]')) {
            return 'one-to-many';
        }
        if (line.includes('@relation') && line.includes('references')) {
            return 'many-to-one';
        }
        return 'one-to-one';
    }
    isAuthEntity(modelName, fields) {
        const nameLower = modelName.toLowerCase();
        // Check name
        if (nameLower === 'user' || nameLower === 'account' || nameLower === 'session') {
            return true;
        }
        // Check fields
        const hasEmail = fields.some(f => f.name.toLowerCase() === 'email');
        const hasPassword = fields.some(f => f.name.toLowerCase().includes('password') ||
            f.name.toLowerCase() === 'hash');
        return hasEmail && hasPassword;
    }
    mapEntitiesToRoutes(entities, routes) {
        for (const entity of entities) {
            const entityLower = entity.name.toLowerCase();
            const entityPlural = entityLower + 's';
            const matchingRoutes = routes
                .filter(r => {
                const pathLower = r.path.toLowerCase();
                return pathLower.includes(entityLower) || pathLower.includes(entityPlural);
            })
                .map(r => r.path);
            if (matchingRoutes.length > 0) {
                entity.crudRoutes = matchingRoutes;
            }
        }
    }
    toSnakeCase(str) {
        return str
            .replace(/([A-Z])/g, '_$1')
            .toLowerCase()
            .replace(/^_/, '');
    }
}
exports.PrismaPlugin = PrismaPlugin;

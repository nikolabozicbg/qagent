/**
 * Prisma Schema Plugin
 * 
 * Full support for:
 * - schema.prisma parsing
 * - Model extraction
 * - Relation detection
 * - Entity to route mapping
 */

import * as path from 'path';
import {
  ScannerPlugin,
  ProjectContext,
  AnalysisContext,
  SchemaPluginResult,
  EntityInfo,
  EntityFieldInfo,
  RelationInfo,
} from '../types';

export class PrismaPlugin implements ScannerPlugin<SchemaPluginResult> {
  name = 'prisma';
  version = '1.0.0';
  type = 'schema' as const;
  priority = 100;

  async detect(context: ProjectContext): Promise<boolean> {
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

  async analyze(context: AnalysisContext): Promise<SchemaPluginResult> {
    const entities: EntityInfo[] = [];
    const relations: RelationInfo[] = [];

    // Find and read schema file
    let schemaContent: string | null = null;
    let schemaPath = '';

    if (await context.fileExists('prisma/schema.prisma')) {
      schemaPath = 'prisma/schema.prisma';
      schemaContent = await context.readFile(schemaPath);
    } else if (await context.fileExists('schema.prisma')) {
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

  private parseSchema(
    content: string,
    filePath: string,
    entities: EntityInfo[],
    relations: RelationInfo[]
  ): void {
    // Find all model definitions
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    let match;

    while ((match = modelRegex.exec(content)) !== null) {
      const modelName = match[1];
      const modelBody = match[2];

      const fields: EntityFieldInfo[] = [];
      const modelRelations: string[] = [];

      // Parse each line in the model
      const lines = modelBody.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;

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

  private parseFieldLine(line: string): EntityFieldInfo | null {
    // Basic field pattern: fieldName Type @attributes
    const fieldMatch = line.match(/^(\w+)\s+(\w+)(\[\])?\??(\s+.*)?$/);
    if (!fieldMatch) return null;

    const [, name, type, isArray, attributes] = fieldMatch;
    const attrString = attributes || '';

    // Skip Prisma directives that start with @@
    if (name.startsWith('@')) return null;

    // Check for @relation
    const relationMatch = attrString.match(/@relation\([^)]*\)/);
    let relation: string | undefined;
    
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

  private isPrismaModelType(type: string): boolean {
    // Common Prisma scalar types
    const scalarTypes = [
      'String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 
      'BigInt', 'Decimal', 'Bytes'
    ];
    return !scalarTypes.includes(type);
  }

  private prismaTypeToDbType(type: string): string {
    const typeMap: Record<string, string> = {
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

  private inferRelationType(line: string, field: EntityFieldInfo): RelationInfo['type'] {
    if (line.includes('[]')) {
      return 'one-to-many';
    }
    if (line.includes('@relation') && line.includes('references')) {
      return 'many-to-one';
    }
    return 'one-to-one';
  }

  private isAuthEntity(modelName: string, fields: EntityFieldInfo[]): boolean {
    const nameLower = modelName.toLowerCase();
    
    // Check name
    if (nameLower === 'user' || nameLower === 'account' || nameLower === 'session') {
      return true;
    }

    // Check fields
    const hasEmail = fields.some(f => f.name.toLowerCase() === 'email');
    const hasPassword = fields.some(f => 
      f.name.toLowerCase().includes('password') || 
      f.name.toLowerCase() === 'hash'
    );

    return hasEmail && hasPassword;
  }

  private mapEntitiesToRoutes(
    entities: EntityInfo[],
    routes: { path: string }[]
  ): void {
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

  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }
}

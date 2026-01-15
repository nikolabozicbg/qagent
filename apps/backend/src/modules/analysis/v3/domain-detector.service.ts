import { Injectable } from '@nestjs/common';
import { ParsedFile } from './ast-parser.service';
import { NavigationAnalysis, RouteDefinition } from './navigation-mapper.service';
import { APIAnalysis } from './api-mapper.service';
import { FormAnalysis } from './form-intelligence.service';

/**
 * Domain Detector Service v4.0
 * 
 * ZERO HARDCODING - No predefined domain types!
 * 
 * Extracts semantic signals from code and builds a rich domain profile
 * that AI can use to understand what the application does.
 * 
 * Instead of "is this e-commerce or SaaS?", we ask:
 * - What entities exist? (Product, User, Order, etc.)
 * - What actions are possible? (buy, subscribe, post, etc.)
 * - What flows exist? (checkout, onboarding, etc.)
 * - What's the relationship between entities?
 * 
 * AI then synthesizes this into meaningful test suites.
 */

export interface DomainAnalysis {
  // Extracted semantic data - NO hardcoded categories
  applicationProfile: ApplicationProfile;
  entities: SemanticEntity[];
  actions: SemanticAction[];
  flows: SemanticFlow[];
  relationships: EntityRelationship[];
  
  // Feature clusters (dynamically discovered)
  featureClusters: FeatureCluster[];
  
  // For AI prompt
  semanticSummary: string;
}

/**
 * Application profile - dynamically built, not from enum
 */
export interface ApplicationProfile {
  // Inferred from analysis, not hardcoded
  inferredPurpose: string;           // "Online store selling products", "Team collaboration platform", etc.
  primaryEntities: string[];         // Top 5 most important entities
  coreActions: string[];             // Main things users can do
  userTypes: string[];               // Types of users (customer, admin, seller, etc.)
  
  // Characteristics (boolean flags dynamically detected)
  characteristics: Map<string, boolean>;  // hasPayments, hasUserContent, hasRealtime, etc.
  
  // Confidence in analysis
  analysisConfidence: number;
}

/**
 * Entity extracted from code - represents a business object
 */
export interface SemanticEntity {
  name: string;
  
  // Inferred semantics
  semanticType: string;              // "transactable", "content", "actor", "reference" - inferred, not enum
  importance: number;                // 0-1, calculated from usage
  
  // Source evidence
  sources: EntitySource[];
  
  // Properties
  properties: EntityProperty[];
  
  // Detected capabilities
  capabilities: EntityCapability[];
  
  // Relations to other entities
  relatedTo: string[];
}

export interface EntitySource {
  type: 'interface' | 'type' | 'class' | 'schema' | 'inferred';
  filePath: string;
  line: number;
  confidence: number;
}

export interface EntityProperty {
  name: string;
  type: string;
  semanticHint: string | null;       // "identifier", "timestamp", "money", "reference", etc.
  isRequired: boolean;
}

export interface EntityCapability {
  action: string;                    // "create", "read", "update", "delete", "list", "search", "export", etc.
  evidence: string;                  // What proves this capability exists
  route?: string;
  api?: string;
  form?: string;
}

/**
 * Action that can be performed in the app
 */
export interface SemanticAction {
  name: string;                      // "purchase", "subscribe", "post", "message", etc.
  verb: string;                      // The action verb
  object: string | null;             // What it acts on
  
  // Where this action happens
  routes: string[];
  apis: string[];
  forms: string[];
  
  // Importance
  isCritical: boolean;               // Is this a conversion/goal action?
  importance: number;
}

/**
 * User flow through the application
 */
export interface SemanticFlow {
  name: string;                      // Dynamically generated name
  description: string;
  
  // Flow characteristics
  type: string;                      // "conversion", "crud", "exploration", "communication" - inferred
  importance: number;
  
  // Steps
  steps: FlowStep[];
  
  // What entities are involved
  involvedEntities: string[];
  
  // Entry and exit
  entryPoints: string[];
  exitPoints: string[];
}

export interface FlowStep {
  route: string;
  description: string;
  action: string;
  entity?: string;
  isOptional: boolean;
}

/**
 * Relationship between entities
 */
export interface EntityRelationship {
  from: string;
  to: string;
  relationshipType: string;          // "contains", "belongs-to", "references", "creates" - inferred
  cardinality: string;               // "one-to-one", "one-to-many", "many-to-many"
  evidence: string;
}

/**
 * Feature cluster - group of related functionality
 */
export interface FeatureCluster {
  name: string;                      // Dynamically generated
  description: string;
  
  // What's in this cluster
  entities: string[];
  routes: string[];
  forms: string[];
  apis: string[];
  
  // Priority for testing
  testPriority: number;              // 0-1
  suggestedTestCount: number;
  
  // Suggested test scenarios
  suggestedScenarios: string[];
}

@Injectable()
export class DomainDetectorService {
  
  /**
   * Analyze application domain - NO HARDCODING
   */
  analyzeDomain(
    parsedFiles: ParsedFile[],
    navigationAnalysis: NavigationAnalysis,
    apiAnalysis: APIAnalysis,
    formAnalysis: FormAnalysis
  ): DomainAnalysis {
    console.log(`🎯 Domain Detector v4.0: Semantic analysis (zero hardcoding)`);
    const startTime = Date.now();
    
    // Step 1: Extract all entities from code
    const entities = this.extractEntities(parsedFiles);
    console.log(`   Found ${entities.length} semantic entities`);
    
    // Step 2: Extract all possible actions
    const actions = this.extractActions(
      navigationAnalysis,
      apiAnalysis,
      formAnalysis,
      entities
    );
    console.log(`   Found ${actions.length} semantic actions`);
    
    // Step 3: Build entity relationships
    const relationships = this.buildRelationships(entities, parsedFiles);
    
    // Step 4: Discover user flows
    const flows = this.discoverFlows(
      navigationAnalysis,
      formAnalysis,
      entities,
      actions
    );
    console.log(`   Discovered ${flows.length} user flows`);
    
    // Step 5: Cluster into features
    const featureClusters = this.clusterFeatures(
      entities,
      actions,
      flows,
      navigationAnalysis,
      formAnalysis,
      apiAnalysis
    );
    console.log(`   Grouped into ${featureClusters.length} feature clusters`);
    
    // Step 6: Build application profile
    const applicationProfile = this.buildApplicationProfile(
      entities,
      actions,
      flows,
      featureClusters
    );
    
    // Step 7: Generate semantic summary for AI
    const semanticSummary = this.generateSemanticSummary(
      applicationProfile,
      entities,
      actions,
      flows,
      featureClusters
    );
    
    const analysisTime = Date.now() - startTime;
    console.log(`   Purpose: "${applicationProfile.inferredPurpose}"`);
    console.log(`   Analysis time: ${analysisTime}ms`);
    
    return {
      applicationProfile,
      entities,
      actions,
      flows,
      relationships,
      featureClusters,
      semanticSummary,
    };
  }
  
  /**
   * Extract semantic entities from code
   */
  private extractEntities(parsedFiles: ParsedFile[]): SemanticEntity[] {
    const entities: SemanticEntity[] = [];
    const entityMap = new Map<string, SemanticEntity>();
    
    for (const file of parsedFiles) {
      // Extract from TypeScript interfaces/types
      for (const typeDecl of file.typeDeclarations || []) {
        const entity = this.parseTypeToEntity(typeDecl, file);
        if (entity) {
          this.mergeEntity(entityMap, entity);
        }
      }
      
      // Infer entities from function/variable names
      this.inferEntitiesFromCode(file, entityMap);
    }
    
    // Calculate importance based on usage
    for (const entity of entityMap.values()) {
      entity.importance = this.calculateEntityImportance(entity, entityMap);
      entities.push(entity);
    }
    
    // Sort by importance
    return entities.sort((a, b) => b.importance - a.importance);
  }
  
  /**
   * Parse TypeScript type to entity
   */
  private parseTypeToEntity(typeDecl: any, file: ParsedFile): SemanticEntity | null {
    const name = typeDecl.name;
    
    // Skip utility types
    if (this.isUtilityType(name)) return null;
    
    const properties = (typeDecl.properties || []).map((p: any) => ({
      name: p.name,
      type: p.type || 'unknown',
      semanticHint: this.inferPropertySemantics(p.name, p.type),
      isRequired: !p.optional,
    }));
    
    // Need at least 2 properties to be considered an entity
    if (properties.length < 2) return null;
    
    // Infer semantic type from properties and name
    const semanticType = this.inferEntitySemanticType(name, properties);
    
    return {
      name,
      semanticType,
      importance: 0, // Calculated later
      sources: [{
        type: 'interface',
        filePath: file.filePath,
        line: typeDecl.line,
        confidence: 0.9,
      }],
      properties,
      capabilities: [],
      relatedTo: properties
        .filter((p: EntityProperty) => p.semanticHint === 'reference')
        .map((p: EntityProperty) => this.extractReferencedEntity(p.name))
        .filter(Boolean) as string[],
    };
  }
  
  /**
   * Infer property semantics from name and type
   */
  private inferPropertySemantics(name: string, type: string): string | null {
    const nameLower = name.toLowerCase();
    const typeLower = (type || '').toLowerCase();
    
    // Identifiers
    if (nameLower === 'id' || nameLower === 'uuid' || nameLower === '_id') {
      return 'identifier';
    }
    
    // References to other entities
    if (nameLower.endsWith('id') || nameLower.endsWith('ids')) {
      return 'reference';
    }
    
    // Timestamps
    if (nameLower.includes('date') || nameLower.includes('time') || 
        nameLower.includes('created') || nameLower.includes('updated') ||
        typeLower === 'date') {
      return 'timestamp';
    }
    
    // Money/price
    if (nameLower.includes('price') || nameLower.includes('amount') || 
        nameLower.includes('cost') || nameLower.includes('total') ||
        nameLower.includes('balance')) {
      return 'money';
    }
    
    // Status/state
    if (nameLower.includes('status') || nameLower.includes('state') ||
        nameLower.includes('type') || nameLower.includes('kind')) {
      return 'status';
    }
    
    // User info
    if (nameLower.includes('email') || nameLower.includes('name') ||
        nameLower.includes('phone') || nameLower.includes('address')) {
      return 'contact-info';
    }
    
    // Content
    if (nameLower.includes('title') || nameLower.includes('description') ||
        nameLower.includes('content') || nameLower.includes('body') ||
        nameLower.includes('text')) {
      return 'content';
    }
    
    // Media
    if (nameLower.includes('image') || nameLower.includes('photo') ||
        nameLower.includes('url') || nameLower.includes('avatar') ||
        nameLower.includes('thumbnail')) {
      return 'media';
    }
    
    // Quantity
    if (nameLower.includes('count') || nameLower.includes('quantity') ||
        nameLower.includes('number') || typeLower === 'number') {
      return 'quantity';
    }
    
    // Boolean flags
    if (typeLower === 'boolean' || nameLower.startsWith('is') || 
        nameLower.startsWith('has') || nameLower.startsWith('can')) {
      return 'flag';
    }
    
    // Arrays/collections
    if (typeLower.includes('[]') || nameLower.endsWith('s') && 
        !['status', 'address'].includes(nameLower)) {
      return 'collection';
    }
    
    return null;
  }
  
  /**
   * Infer entity semantic type
   */
  private inferEntitySemanticType(name: string, properties: EntityProperty[]): string {
    const nameLower = name.toLowerCase();
    const propNames = properties.map(p => p.name.toLowerCase());
    const semantics = properties.map(p => p.semanticHint).filter(Boolean);
    
    // Has money properties = transactable
    if (semantics.includes('money')) {
      return 'transactable';
    }
    
    // Has email/password = actor (user)
    if (propNames.some(p => p.includes('email') || p.includes('password'))) {
      return 'actor';
    }
    
    // Has content properties = content
    if (semantics.filter(s => s === 'content').length >= 2) {
      return 'content';
    }
    
    // Mostly references = junction/relationship
    if (semantics.filter(s => s === 'reference').length >= 2) {
      return 'junction';
    }
    
    // Small with only id and name = reference/lookup
    if (properties.length <= 3 && propNames.includes('name')) {
      return 'reference';
    }
    
    // Default based on name patterns
    if (nameLower.includes('user') || nameLower.includes('account') || 
        nameLower.includes('member') || nameLower.includes('customer')) {
      return 'actor';
    }
    
    if (nameLower.includes('setting') || nameLower.includes('config') ||
        nameLower.includes('preference')) {
      return 'configuration';
    }
    
    if (nameLower.includes('log') || nameLower.includes('event') ||
        nameLower.includes('history')) {
      return 'event';
    }
    
    return 'entity'; // Generic
  }
  
  /**
   * Extract referenced entity from property name
   */
  private extractReferencedEntity(propName: string): string | null {
    // userId -> User
    if (propName.endsWith('Id')) {
      const entity = propName.slice(0, -2);
      return entity.charAt(0).toUpperCase() + entity.slice(1);
    }
    
    // userIds -> User
    if (propName.endsWith('Ids')) {
      const entity = propName.slice(0, -3);
      return entity.charAt(0).toUpperCase() + entity.slice(1);
    }
    
    return null;
  }
  
  /**
   * Check if type is a utility type
   */
  private isUtilityType(name: string): boolean {
    const patterns = [
      /Props$/i, /State$/i, /Context$/i, /Config$/i, /Options$/i,
      /Response$/i, /Request$/i, /Params$/i, /Args$/i, /Result$/i,
      /Handler$/i, /Callback$/i, /Ref$/i, /Hook$/i, /Action$/i,
      /^I[A-Z]/, /^T[A-Z]/, /DTO$/i, /Input$/i, /Output$/i,
    ];
    return patterns.some(p => p.test(name));
  }
  
  /**
   * Infer entities from code patterns
   */
  private inferEntitiesFromCode(
    file: ParsedFile,
    entityMap: Map<string, SemanticEntity>
  ): void {
    // Extract entity names from functions like getUser, createProduct, etc.
    const patterns = [
      /(?:get|fetch|load|find)(\w+?)(?:ById|s)?$/i,
      /(?:create|add|save|insert)(\w+)$/i,
      /(?:update|edit|modify)(\w+)$/i,
      /(?:delete|remove)(\w+)$/i,
      /use(\w+?)(?:Query|Mutation|Data)$/i,
    ];
    
    for (const func of file.functions) {
      for (const pattern of patterns) {
        const match = func.name.match(pattern);
        if (match && match[1]) {
          const entityName = this.singularize(match[1]);
          
          if (entityName.length > 2 && !this.isUtilityType(entityName) && !entityMap.has(entityName)) {
            // Determine capability from function name
            let capability: EntityCapability | null = null;
            if (/get|fetch|load|find/i.test(func.name)) {
              capability = { action: 'read', evidence: `Function: ${func.name}` };
            } else if (/create|add|save|insert/i.test(func.name)) {
              capability = { action: 'create', evidence: `Function: ${func.name}` };
            } else if (/update|edit|modify/i.test(func.name)) {
              capability = { action: 'update', evidence: `Function: ${func.name}` };
            } else if (/delete|remove/i.test(func.name)) {
              capability = { action: 'delete', evidence: `Function: ${func.name}` };
            }
            
            const entity: SemanticEntity = {
              name: entityName,
              semanticType: 'entity',
              importance: 0,
              sources: [{
                type: 'inferred',
                filePath: file.filePath,
                line: func.line,
                confidence: 0.6,
              }],
              properties: [],
              capabilities: capability ? [capability] : [],
              relatedTo: [],
            };
            
            entityMap.set(entityName, entity);
          } else if (entityMap.has(entityName)) {
            // Add capability to existing entity
            const existing = entityMap.get(entityName)!;
            if (/get|fetch|load|find/i.test(func.name)) {
              this.addCapability(existing, 'read', `Function: ${func.name}`);
            } else if (/create|add|save|insert/i.test(func.name)) {
              this.addCapability(existing, 'create', `Function: ${func.name}`);
            } else if (/update|edit|modify/i.test(func.name)) {
              this.addCapability(existing, 'update', `Function: ${func.name}`);
            } else if (/delete|remove/i.test(func.name)) {
              this.addCapability(existing, 'delete', `Function: ${func.name}`);
            }
          }
        }
      }
    }
  }
  
  /**
   * Add capability to entity if not exists
   */
  private addCapability(entity: SemanticEntity, action: string, evidence: string): void {
    if (!entity.capabilities.some(c => c.action === action)) {
      entity.capabilities.push({ action, evidence });
    }
  }
  
  /**
   * Merge entity into map
   */
  private mergeEntity(map: Map<string, SemanticEntity>, entity: SemanticEntity): void {
    const existing = map.get(entity.name);
    if (existing) {
      // Merge sources
      existing.sources.push(...entity.sources);
      // Merge properties (dedupe)
      const propNames = new Set(existing.properties.map(p => p.name));
      for (const prop of entity.properties) {
        if (!propNames.has(prop.name)) {
          existing.properties.push(prop);
        }
      }
      // Merge capabilities
      for (const cap of entity.capabilities) {
        this.addCapability(existing, cap.action, cap.evidence);
      }
      // Merge relations
      existing.relatedTo = [...new Set([...existing.relatedTo, ...entity.relatedTo])];
      // Take higher confidence semantic type
      if (entity.sources[0]?.confidence > (existing.sources[0]?.confidence || 0)) {
        existing.semanticType = entity.semanticType;
      }
    } else {
      map.set(entity.name, entity);
    }
  }
  
  /**
   * Calculate entity importance
   */
  private calculateEntityImportance(
    entity: SemanticEntity, 
    allEntities: Map<string, SemanticEntity>
  ): number {
    let score = 0;
    
    // More sources = more important
    score += Math.min(entity.sources.length * 0.1, 0.3);
    
    // More properties = more important
    score += Math.min(entity.properties.length * 0.02, 0.2);
    
    // More capabilities = more important
    score += entity.capabilities.length * 0.1;
    
    // Transactable entities are important
    if (entity.semanticType === 'transactable') score += 0.2;
    
    // Actors are important
    if (entity.semanticType === 'actor') score += 0.2;
    
    // Referenced by others = important
    let referenceCount = 0;
    for (const other of allEntities.values()) {
      if (other.relatedTo.includes(entity.name)) {
        referenceCount++;
      }
    }
    score += Math.min(referenceCount * 0.05, 0.2);
    
    // High confidence sources
    const maxConfidence = Math.max(...entity.sources.map(s => s.confidence));
    score += maxConfidence * 0.1;
    
    return Math.min(score, 1);
  }
  
  /**
   * Extract semantic actions
   */
  private extractActions(
    navigationAnalysis: NavigationAnalysis,
    apiAnalysis: APIAnalysis,
    formAnalysis: FormAnalysis,
    entities: SemanticEntity[]
  ): SemanticAction[] {
    const actions: SemanticAction[] = [];
    const actionMap = new Map<string, SemanticAction>();
    
    // Extract from routes
    for (const route of navigationAnalysis.routes) {
      const routeActions = this.extractActionsFromRoute(route, entities);
      for (const action of routeActions) {
        this.mergeAction(actionMap, action);
      }
    }
    
    // Extract from APIs
    for (const endpoint of apiAnalysis.endpoints) {
      const apiAction = this.extractActionFromAPI(endpoint, entities);
      if (apiAction) {
        this.mergeAction(actionMap, apiAction);
      }
    }
    
    // Extract from forms
    for (const form of formAnalysis.forms) {
      const formAction = this.extractActionFromForm(form, entities);
      if (formAction) {
        this.mergeAction(actionMap, formAction);
      }
    }
    
    // Calculate importance
    for (const action of actionMap.values()) {
      action.importance = this.calculateActionImportance(action);
      actions.push(action);
    }
    
    return actions.sort((a, b) => b.importance - a.importance);
  }
  
  /**
   * Extract actions from route
   */
  private extractActionsFromRoute(
    route: RouteDefinition, 
    entities: SemanticEntity[]
  ): SemanticAction[] {
    const actions: SemanticAction[] = [];
    const pathParts = route.path.toLowerCase().split('/').filter(Boolean);
    
    // Common action patterns in routes
    const actionPatterns: Record<string, { verb: string; isCritical: boolean }> = {
      'checkout': { verb: 'complete', isCritical: true },
      'cart': { verb: 'manage', isCritical: true },
      'sign-in': { verb: 'authenticate', isCritical: true },
      'login': { verb: 'authenticate', isCritical: true },
      'sign-up': { verb: 'register', isCritical: true },
      'register': { verb: 'register', isCritical: true },
      'create': { verb: 'create', isCritical: false },
      'edit': { verb: 'edit', isCritical: false },
      'new': { verb: 'create', isCritical: false },
      'settings': { verb: 'configure', isCritical: false },
      'profile': { verb: 'view', isCritical: false },
      'search': { verb: 'search', isCritical: false },
    };
    
    for (const part of pathParts) {
      // Skip dynamic segments
      if (part.startsWith(':') || part.startsWith('[')) continue;
      
      const pattern = actionPatterns[part];
      if (pattern) {
        actions.push({
          name: `${pattern.verb}-${part}`,
          verb: pattern.verb,
          object: this.findRelatedEntity(part, entities),
          routes: [route.path],
          apis: [],
          forms: [],
          isCritical: pattern.isCritical,
          importance: 0,
        });
      }
      
      // Check if part matches an entity
      const matchedEntity = entities.find(e => 
        e.name.toLowerCase() === part || 
        this.pluralize(e.name.toLowerCase()) === part
      );
      
      if (matchedEntity) {
        actions.push({
          name: `view-${matchedEntity.name.toLowerCase()}`,
          verb: 'view',
          object: matchedEntity.name,
          routes: [route.path],
          apis: [],
          forms: [],
          isCritical: false,
          importance: 0,
        });
      }
    }
    
    return actions;
  }
  
  /**
   * Extract action from API endpoint
   */
  private extractActionFromAPI(
    endpoint: any, 
    entities: SemanticEntity[]
  ): SemanticAction | null {
    const method = endpoint.method;
    const path = endpoint.path.toLowerCase();
    
    // Map HTTP method to verb
    const methodVerbs: Record<string, string> = {
      'GET': 'fetch',
      'POST': 'create',
      'PUT': 'update',
      'PATCH': 'modify',
      'DELETE': 'delete',
    };
    
    const verb = methodVerbs[method] || 'interact';
    const object = this.extractEntityFromPath(path, entities);
    
    return {
      name: `${verb}-${object || 'data'}`,
      verb,
      object,
      routes: [],
      apis: [endpoint.path],
      forms: [],
      isCritical: method === 'POST' && (path.includes('order') || path.includes('payment')),
      importance: 0,
    };
  }
  
  /**
   * Extract action from form
   */
  private extractActionFromForm(
    form: any, 
    entities: SemanticEntity[]
  ): SemanticAction | null {
    const formName = (form.name || '').toLowerCase();
    
    // Infer verb from form name
    let verb = 'submit';
    if (formName.includes('login') || formName.includes('signin')) verb = 'authenticate';
    else if (formName.includes('register') || formName.includes('signup')) verb = 'register';
    else if (formName.includes('create') || formName.includes('new')) verb = 'create';
    else if (formName.includes('edit') || formName.includes('update')) verb = 'update';
    else if (formName.includes('search')) verb = 'search';
    else if (formName.includes('checkout')) verb = 'checkout';
    else if (formName.includes('contact')) verb = 'contact';
    
    return {
      name: `${verb}-${formName || 'form'}`,
      verb,
      object: this.findRelatedEntity(formName, entities),
      routes: [],
      apis: form.submitHandler?.apiEndpoint ? [form.submitHandler.apiEndpoint] : [],
      forms: [form.name],
      isCritical: ['authenticate', 'register', 'checkout'].includes(verb),
      importance: 0,
    };
  }
  
  /**
   * Find related entity for a term
   */
  private findRelatedEntity(term: string, entities: SemanticEntity[]): string | null {
    const termLower = term.toLowerCase();
    
    for (const entity of entities) {
      const entityLower = entity.name.toLowerCase();
      if (termLower.includes(entityLower) || entityLower.includes(termLower)) {
        return entity.name;
      }
    }
    
    return null;
  }
  
  /**
   * Extract entity name from API path
   */
  private extractEntityFromPath(path: string, entities: SemanticEntity[]): string | null {
    const parts = path.split('/').filter(p => p && !p.startsWith(':') && !p.startsWith('{'));
    
    for (const part of parts.reverse()) {
      const singular = this.singularize(part);
      const match = entities.find(e => 
        e.name.toLowerCase() === singular.toLowerCase() ||
        e.name.toLowerCase() === part.toLowerCase()
      );
      if (match) return match.name;
    }
    
    // Return last meaningful part
    return parts[parts.length - 1] || null;
  }
  
  /**
   * Merge action into map
   */
  private mergeAction(map: Map<string, SemanticAction>, action: SemanticAction): void {
    const existing = map.get(action.name);
    if (existing) {
      existing.routes = [...new Set([...existing.routes, ...action.routes])];
      existing.apis = [...new Set([...existing.apis, ...action.apis])];
      existing.forms = [...new Set([...existing.forms, ...action.forms])];
      existing.isCritical = existing.isCritical || action.isCritical;
    } else {
      map.set(action.name, action);
    }
  }
  
  /**
   * Calculate action importance
   */
  private calculateActionImportance(action: SemanticAction): number {
    let score = 0;
    
    if (action.isCritical) score += 0.4;
    
    // More touchpoints = more important
    score += action.routes.length * 0.1;
    score += action.apis.length * 0.1;
    score += action.forms.length * 0.15;
    
    // Critical verbs
    const criticalVerbs = ['authenticate', 'register', 'checkout', 'create', 'delete'];
    if (criticalVerbs.includes(action.verb)) score += 0.2;
    
    return Math.min(score, 1);
  }
  
  /**
   * Build entity relationships
   */
  private buildRelationships(
    entities: SemanticEntity[],
    parsedFiles: ParsedFile[]
  ): EntityRelationship[] {
    const relationships: EntityRelationship[] = [];
    
    for (const entity of entities) {
      for (const related of entity.relatedTo) {
        // Find cardinality from property
        const refProp = entity.properties.find(p => 
          this.extractReferencedEntity(p.name) === related
        );
        
        const cardinality = refProp?.name.endsWith('Ids') || refProp?.semanticHint === 'collection'
          ? 'one-to-many'
          : 'many-to-one';
        
        relationships.push({
          from: entity.name,
          to: related,
          relationshipType: 'references',
          cardinality,
          evidence: `Property: ${refProp?.name}`,
        });
      }
    }
    
    return relationships;
  }
  
  /**
   * Discover user flows
   */
  private discoverFlows(
    navigationAnalysis: NavigationAnalysis,
    formAnalysis: FormAnalysis,
    entities: SemanticEntity[],
    actions: SemanticAction[]
  ): SemanticFlow[] {
    const flows: SemanticFlow[] = [];
    const routes = navigationAnalysis.routes;
    
    // Group routes by base path to find flow patterns
    const routeGroups = this.groupRoutesByFeature(routes);
    
    for (const [feature, featureRoutes] of routeGroups) {
      // Skip if only one route
      if (featureRoutes.length < 2) continue;
      
      const flow = this.buildFlowFromRoutes(
        feature,
        featureRoutes,
        formAnalysis,
        entities,
        actions
      );
      
      if (flow) {
        flows.push(flow);
      }
    }
    
    // Add auth flow if detected
    const authFlow = this.detectAuthFlow(routes, formAnalysis);
    if (authFlow) flows.push(authFlow);
    
    // Add checkout/conversion flow if detected
    const conversionFlow = this.detectConversionFlow(routes, actions);
    if (conversionFlow) flows.push(conversionFlow);
    
    return flows;
  }
  
  /**
   * Group routes by feature
   */
  private groupRoutesByFeature(routes: RouteDefinition[]): Map<string, RouteDefinition[]> {
    const groups = new Map<string, RouteDefinition[]>();
    
    for (const route of routes) {
      const parts = route.path.split('/').filter(Boolean);
      const feature = parts[0] || 'home';
      
      if (!groups.has(feature)) {
        groups.set(feature, []);
      }
      groups.get(feature)!.push(route);
    }
    
    return groups;
  }
  
  /**
   * Build flow from related routes
   */
  private buildFlowFromRoutes(
    feature: string,
    routes: RouteDefinition[],
    formAnalysis: FormAnalysis,
    entities: SemanticEntity[],
    actions: SemanticAction[]
  ): SemanticFlow | null {
    const steps: FlowStep[] = [];
    
    // Sort routes by specificity (simpler paths first)
    const sortedRoutes = routes.sort((a, b) => 
      a.path.split('/').length - b.path.split('/').length
    );
    
    for (const route of sortedRoutes) {
      const action = this.inferRouteAction(route);
      steps.push({
        route: route.path,
        description: `${action} ${feature}`,
        action,
        entity: this.findRelatedEntity(feature, entities) || undefined,
        isOptional: route.isDynamic,
      });
    }
    
    if (steps.length < 2) return null;
    
    // Determine flow type
    const type = this.inferFlowType(feature, steps, actions);
    
    return {
      name: `${this.capitalize(feature)} Flow`,
      description: `User flow for ${feature} functionality`,
      type,
      importance: this.calculateFlowImportance(type, steps, entities),
      steps,
      involvedEntities: [this.findRelatedEntity(feature, entities)].filter(Boolean) as string[],
      entryPoints: [steps[0].route],
      exitPoints: [steps[steps.length - 1].route],
    };
  }
  
  /**
   * Infer action from route
   */
  private inferRouteAction(route: RouteDefinition): string {
    const path = route.path.toLowerCase();
    
    if (path.includes('new') || path.includes('create')) return 'create';
    if (path.includes('edit') || path.includes('update')) return 'edit';
    if (route.isDynamic) return 'view-detail';
    return 'browse';
  }
  
  /**
   * Infer flow type
   */
  private inferFlowType(
    feature: string,
    steps: FlowStep[],
    actions: SemanticAction[]
  ): string {
    const featureLower = feature.toLowerCase();
    
    // Check if feature has critical actions
    const hasCriticalAction = actions.some(a => 
      a.isCritical && (a.routes.some(r => r.includes(feature)) || a.forms.some(f => f.includes(feature)))
    );
    
    if (hasCriticalAction) return 'conversion';
    
    // CRUD detection
    const hasCreate = steps.some(s => s.action === 'create');
    const hasEdit = steps.some(s => s.action === 'edit');
    if (hasCreate || hasEdit) return 'crud';
    
    // Auth detection
    if (['auth', 'login', 'signin', 'signup', 'register'].some(a => featureLower.includes(a))) {
      return 'authentication';
    }
    
    return 'navigation';
  }
  
  /**
   * Calculate flow importance
   */
  private calculateFlowImportance(
    type: string,
    steps: FlowStep[],
    entities: SemanticEntity[]
  ): number {
    let score = 0.3; // Base score
    
    // Type weights
    const typeWeights: Record<string, number> = {
      'conversion': 0.4,
      'authentication': 0.3,
      'crud': 0.2,
      'navigation': 0.1,
    };
    score += typeWeights[type] || 0;
    
    // More steps = more complex = more important
    score += Math.min(steps.length * 0.05, 0.2);
    
    // Involves important entities
    for (const step of steps) {
      if (step.entity) {
        const entity = entities.find(e => e.name === step.entity);
        if (entity && entity.importance > 0.5) {
          score += 0.1;
        }
      }
    }
    
    return Math.min(score, 1);
  }
  
  /**
   * Detect auth flow
   */
  private detectAuthFlow(
    routes: RouteDefinition[],
    formAnalysis: FormAnalysis
  ): SemanticFlow | null {
    const authRoutes = routes.filter(r => 
      r.path.includes('sign') || r.path.includes('login') || 
      r.path.includes('register') || r.path.includes('auth')
    );
    
    if (authRoutes.length === 0) return null;
    
    const steps: FlowStep[] = authRoutes.map(r => ({
      route: r.path,
      description: this.describeAuthRoute(r.path),
      action: r.path.includes('sign-up') || r.path.includes('register') ? 'register' : 'authenticate',
      isOptional: false,
    }));
    
    return {
      name: 'Authentication Flow',
      description: 'User authentication and registration',
      type: 'authentication',
      importance: 0.9,
      steps,
      involvedEntities: ['User'],
      entryPoints: steps.map(s => s.route),
      exitPoints: ['/dashboard', '/'],
    };
  }
  
  /**
   * Describe auth route
   */
  private describeAuthRoute(path: string): string {
    if (path.includes('sign-in') || path.includes('login')) return 'Sign in with credentials';
    if (path.includes('sign-up') || path.includes('register')) return 'Create new account';
    if (path.includes('password')) return 'Reset password';
    return 'Authenticate';
  }
  
  /**
   * Detect conversion flow (checkout, subscribe, etc.)
   */
  private detectConversionFlow(
    routes: RouteDefinition[],
    actions: SemanticAction[]
  ): SemanticFlow | null {
    const conversionRoutes = routes.filter(r =>
      r.path.includes('checkout') || r.path.includes('cart') ||
      r.path.includes('subscribe') || r.path.includes('payment') ||
      r.path.includes('success')
    );
    
    if (conversionRoutes.length < 2) return null;
    
    const steps: FlowStep[] = conversionRoutes
      .sort((a, b) => {
        // Order: cart -> checkout -> payment -> success
        const order = ['cart', 'checkout', 'payment', 'success'];
        const aIndex = order.findIndex(o => a.path.includes(o));
        const bIndex = order.findIndex(o => b.path.includes(o));
        return aIndex - bIndex;
      })
      .map(r => ({
        route: r.path,
        description: this.describeConversionRoute(r.path),
        action: 'proceed',
        isOptional: false,
      }));
    
    return {
      name: 'Conversion Flow',
      description: 'Purchase or subscription completion',
      type: 'conversion',
      importance: 1.0,
      steps,
      involvedEntities: ['Cart', 'Order', 'Payment'].filter(e => 
        routes.some(r => r.path.toLowerCase().includes(e.toLowerCase()))
      ),
      entryPoints: [steps[0]?.route || '/cart'],
      exitPoints: [steps[steps.length - 1]?.route || '/success'],
    };
  }
  
  /**
   * Describe conversion route
   */
  private describeConversionRoute(path: string): string {
    if (path.includes('cart')) return 'Review cart items';
    if (path.includes('checkout')) return 'Enter checkout details';
    if (path.includes('payment')) return 'Complete payment';
    if (path.includes('success')) return 'View confirmation';
    return 'Continue';
  }
  
  /**
   * Cluster features - FULLY GENERIC semantic grouping
   * 
   * Groups routes by what ENTITY they operate on.
   * Zero hardcoding - works for any application.
   */
  private clusterFeatures(
    entities: SemanticEntity[],
    actions: SemanticAction[],
    flows: SemanticFlow[],
    navigationAnalysis: NavigationAnalysis,
    formAnalysis: FormAnalysis,
    apiAnalysis: APIAnalysis
  ): FeatureCluster[] {
    const allRoutePaths = navigationAnalysis.routes.map(r => r.path);
    
    // Step 1: Map each route to its primary entity
    const routeToEntity = this.mapRoutesToEntities(
      navigationAnalysis.routes,
      entities,
      allRoutePaths
    );
    
    // Step 2: Group routes by entity
    const entityToRoutes = new Map<string, string[]>();
    for (const [route, entity] of routeToEntity.entries()) {
      if (!entityToRoutes.has(entity)) {
        entityToRoutes.set(entity, []);
      }
      entityToRoutes.get(entity)!.push(route);
    }
    
    // Step 3: Create clusters from flows (sorted by importance)
    const clusters: FeatureCluster[] = [];
    const usedRoutes = new Set<string>();
    
    const sortedFlows = [...flows].sort((a, b) => b.importance - a.importance);
    
    for (const flow of sortedFlows) {
      const flowRoutes = flow.steps.map(s => s.route);
      const unusedRoutes = flowRoutes.filter(r => !usedRoutes.has(r));
      
      // Skip if most routes already claimed
      if (unusedRoutes.length < flowRoutes.length * 0.5) continue;
      
      clusters.push({
        name: flow.name.replace(' Flow', ''),
        description: flow.description,
        entities: flow.involvedEntities,
        routes: flowRoutes,
        forms: this.findFormsForRoutes(flowRoutes, formAnalysis),
        apis: this.findApisForEntities(flow.involvedEntities, apiAnalysis),
        testPriority: flow.importance,
        suggestedTestCount: Math.max(3, flowRoutes.length),
        suggestedScenarios: this.generateTestScenarios(flow, entities),
      });
      
      flowRoutes.forEach(r => usedRoutes.add(r));
    }
    
    // Step 4: Create clusters for remaining entity groups
    for (const [entityName, routes] of entityToRoutes.entries()) {
      const unusedRoutes = routes.filter(r => !usedRoutes.has(r));
      if (unusedRoutes.length === 0) continue;
      if (entityName === 'Unknown') continue;
      
      const entity = entities.find(e => e.name === entityName);
      const priority = entity ? entity.importance : 0.4;
      
      const hasCRUD = entity && entity.capabilities.length >= 2;
      const clusterName = hasCRUD 
        ? `${entityName} Management`
        : entityName;
      
      clusters.push({
        name: clusterName,
        description: `Operations for ${entityName}`,
        entities: [entityName],
        routes: unusedRoutes,
        forms: this.findFormsForRoutes(unusedRoutes, formAnalysis),
        apis: this.findApisForEntities([entityName], apiAnalysis),
        testPriority: priority,
        suggestedTestCount: Math.max(2, Math.ceil(unusedRoutes.length * 1.5)),
        suggestedScenarios: entity 
          ? this.generateEntityScenarios(entity)
          : [`View ${entityName}`, `Interact with ${entityName}`],
      });
      
      unusedRoutes.forEach(r => usedRoutes.add(r));
    }
    
    // Step 5: Merge unclustered routes into best-fit clusters
    const unclustered = allRoutePaths.filter(r => !usedRoutes.has(r));
    for (const route of unclustered) {
      const bestCluster = this.findBestClusterForRoute(route, clusters);
      if (bestCluster) {
        bestCluster.routes.push(route);
        bestCluster.suggestedTestCount++;
      }
    }
    
    return clusters.sort((a, b) => b.testPriority - a.testPriority);
  }
  
  /**
   * Map each route to its primary entity - fully generic
   */
  private mapRoutesToEntities(
    routes: RouteDefinition[],
    entities: SemanticEntity[],
    allRoutePaths: string[]
  ): Map<string, string> {
    const routeToEntity = new Map<string, string>();
    
    for (const route of routes) {
      const entity = this.inferEntityForRoute(route, entities, allRoutePaths);
      routeToEntity.set(route.path, entity);
    }
    
    return routeToEntity;
  }
  
  /**
   * Infer which entity a route operates on - NO HARDCODING
   */
  private inferEntityForRoute(
    route: RouteDefinition,
    entities: SemanticEntity[],
    allRoutePaths: string[]
  ): string {
    const path = route.path.toLowerCase();
    const pathSegments = path.split('/').filter(Boolean);
    
    // Strategy 1: Direct entity name match in path
    for (const entity of entities) {
      const entityLower = entity.name.toLowerCase();
      const entityPlural = entityLower + 's';
      
      if (pathSegments.some(seg => 
        seg === entityLower || 
        seg === entityPlural ||
        (seg.length > 3 && seg.includes(entityLower))
      )) {
        return entity.name;
      }
    }
    
    // Strategy 2: Check component name
    if (route.component) {
      const compLower = route.component.toLowerCase();
      for (const entity of entities) {
        if (compLower.includes(entity.name.toLowerCase())) {
          return entity.name;
        }
      }
    }
    
    // Strategy 3: Get last meaningful segment (skip containers and dynamic segments)
    const meaningfulSegments = pathSegments.filter(s => 
      !s.startsWith('[') && 
      !s.startsWith(':') &&
      !this.isContainerSegment(s, allRoutePaths)
    );
    
    const lastSegment = meaningfulSegments.pop();
    
    if (lastSegment) {
      // Try to match with entities (singular/plural)
      const singular = lastSegment.replace(/s$/, '');
      for (const entity of entities) {
        const entityLower = entity.name.toLowerCase();
        if (singular === entityLower || lastSegment === entityLower) {
          return entity.name;
        }
      }
      // Return as inferred entity
      return this.capitalize(singular);
    }
    
    return 'Unknown';
  }
  
  /**
   * Detect if a segment is just a container (has sub-routes but isn't a destination itself)
   */
  private isContainerSegment(segment: string, allRoutePaths: string[]): boolean {
    const asPrefix = `/${segment}/`;
    const routesUnderIt = allRoutePaths.filter(r => r.toLowerCase().includes(asPrefix));
    const hasExactMatch = allRoutePaths.some(r => 
      r.toLowerCase() === `/${segment}` || r.toLowerCase().endsWith(`/${segment}`)
    );
    
    // It's a container if many routes use it as prefix but it's not a destination
    return routesUnderIt.length > 2 && !hasExactMatch;
  }
  
  /**
   * Find forms for routes
   */
  private findFormsForRoutes(routes: string[], formAnalysis: FormAnalysis): string[] {
    return formAnalysis.forms
      .filter(f => routes.some(r => {
        const segments = r.split('/').filter(s => s && !s.startsWith('['));
        return segments.some(seg => f.filePath.toLowerCase().includes(seg));
      }))
      .map(f => f.name);
  }
  
  /**
   * Find APIs for entities
   */
  private findApisForEntities(entityNames: string[], apiAnalysis: APIAnalysis): string[] {
    return apiAnalysis.endpoints
      .filter(e => entityNames.some(entity => 
        e.path.toLowerCase().includes(entity.toLowerCase())
      ))
      .map(e => `${e.method} ${e.path}`);
  }
  
  /**
   * Find best cluster for unclustered route
   */
  private findBestClusterForRoute(
    route: string,
    clusters: FeatureCluster[]
  ): FeatureCluster | null {
    const pathSegments = route.toLowerCase().split('/').filter(Boolean);
    
    let bestMatch: FeatureCluster | null = null;
    let bestScore = 0;
    
    for (const cluster of clusters) {
      let score = 0;
      
      // Entity name match
      for (const entity of cluster.entities) {
        if (pathSegments.some(s => s.includes(entity.toLowerCase()))) {
          score += 3;
        }
      }
      
      // Route segment overlap
      for (const clusterRoute of cluster.routes) {
        const clusterSegments = clusterRoute.toLowerCase().split('/').filter(Boolean);
        const shared = pathSegments.filter(s => clusterSegments.includes(s));
        score += shared.length;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = cluster;
      }
    }
    
    return bestScore > 0 ? bestMatch : null;
  }
  
  /**
   * Generate test scenarios for a flow
   */
  private generateTestScenarios(flow: SemanticFlow, entities: SemanticEntity[]): string[] {
    const scenarios: string[] = [];
    
    // Happy path
    scenarios.push(`Complete ${flow.name.toLowerCase()} successfully`);
    
    // Validation scenarios for forms
    if (flow.type === 'authentication' || flow.type === 'conversion') {
      scenarios.push(`${flow.name} with invalid input`);
      scenarios.push(`${flow.name} with empty required fields`);
    }
    
    // Navigation
    if (flow.steps.length > 2) {
      scenarios.push(`Navigate through ${flow.name.toLowerCase()}`);
    }
    
    // Error handling
    if (flow.type === 'conversion') {
      scenarios.push(`Handle ${flow.name.toLowerCase()} failure`);
    }
    
    return scenarios;
  }
  
  /**
   * Generate test scenarios for an entity
   */
  private generateEntityScenarios(entity: SemanticEntity): string[] {
    const scenarios: string[] = [];
    
    for (const cap of entity.capabilities) {
      scenarios.push(`${this.capitalize(cap.action)} ${entity.name}`);
    }
    
    if (!entity.capabilities.some(c => c.action === 'read')) {
      scenarios.push(`View ${entity.name} details`);
    }
    
    if (!entity.capabilities.some(c => c.action === 'list')) {
      scenarios.push(`List ${entity.name}s`);
    }
    
    return scenarios;
  }
  
  /**
   * Build application profile
   */
  private buildApplicationProfile(
    entities: SemanticEntity[],
    actions: SemanticAction[],
    flows: SemanticFlow[],
    featureClusters: FeatureCluster[]
  ): ApplicationProfile {
    // Build characteristics dynamically
    const characteristics = new Map<string, boolean>();
    
    // Detect characteristics from entities and actions
    characteristics.set('hasUserAccounts', entities.some(e => 
      e.name.toLowerCase().includes('user') || e.semanticType === 'actor'
    ));
    
    characteristics.set('hasTransactions', entities.some(e => 
      e.semanticType === 'transactable' || e.properties.some(p => p.semanticHint === 'money')
    ));
    
    characteristics.set('hasUserContent', entities.some(e =>
      e.semanticType === 'content' && e.capabilities.some(c => c.action === 'create')
    ));
    
    characteristics.set('hasCRUD', entities.some(e =>
      e.capabilities.length >= 3
    ));
    
    characteristics.set('hasAuthentication', flows.some(f => 
      f.type === 'authentication'
    ));
    
    characteristics.set('hasConversionFunnel', flows.some(f =>
      f.type === 'conversion'
    ));
    
    // Infer purpose from all signals
    const inferredPurpose = this.inferApplicationPurpose(
      entities,
      actions,
      flows,
      characteristics
    );
    
    // Primary entities (top 5 by importance)
    const primaryEntities = entities
      .slice(0, 5)
      .map(e => e.name);
    
    // Core actions (critical ones)
    const coreActions = actions
      .filter(a => a.isCritical || a.importance > 0.5)
      .map(a => a.verb)
      .filter((v, i, arr) => arr.indexOf(v) === i) // unique
      .slice(0, 7);
    
    // User types
    const userTypes = this.inferUserTypes(entities, flows);
    
    // Confidence based on evidence
    const confidence = this.calculateAnalysisConfidence(entities, actions, flows);
    
    return {
      inferredPurpose,
      primaryEntities,
      coreActions,
      userTypes,
      characteristics,
      analysisConfidence: confidence,
    };
  }
  
  /**
   * Infer application purpose - THIS IS WHERE AI HELPS
   */
  private inferApplicationPurpose(
    entities: SemanticEntity[],
    actions: SemanticAction[],
    flows: SemanticFlow[],
    characteristics: Map<string, boolean>
  ): string {
    const parts: string[] = [];
    
    // What does the app manage?
    const coreEntities = entities
      .filter(e => e.semanticType !== 'reference' && e.importance > 0.4)
      .slice(0, 3)
      .map(e => e.name.toLowerCase());
    
    if (coreEntities.length > 0) {
      parts.push(`manages ${coreEntities.join(', ')}`);
    }
    
    // What can users do?
    const criticalActions = actions
      .filter(a => a.isCritical)
      .map(a => a.verb);
    
    if (criticalActions.includes('checkout') || criticalActions.includes('purchase')) {
      parts.push('with purchasing capability');
    } else if (criticalActions.includes('register') || criticalActions.includes('subscribe')) {
      parts.push('with user registration');
    }
    
    // Characteristics
    if (characteristics.get('hasConversionFunnel')) {
      parts.push('featuring a conversion funnel');
    }
    
    if (characteristics.get('hasUserContent')) {
      parts.push('where users can create content');
    }
    
    // Build sentence
    if (parts.length === 0) {
      return 'Web application with various features';
    }
    
    return `Application that ${parts.join(' ')}`;
  }
  
  /**
   * Infer user types
   */
  private inferUserTypes(entities: SemanticEntity[], flows: SemanticFlow[]): string[] {
    const types: Set<string> = new Set();
    
    // From entities
    for (const entity of entities) {
      if (entity.semanticType === 'actor') {
        types.add(entity.name.toLowerCase());
      }
      
      const name = entity.name.toLowerCase();
      if (['admin', 'customer', 'seller', 'buyer', 'member', 'guest'].some(t => name.includes(t))) {
        types.add(name);
      }
    }
    
    // From flows
    if (flows.some(f => f.type === 'authentication')) {
      types.add('authenticated-user');
    }
    
    // Default
    if (types.size === 0) {
      types.add('user');
    }
    
    return Array.from(types);
  }
  
  /**
   * Calculate analysis confidence
   */
  private calculateAnalysisConfidence(
    entities: SemanticEntity[],
    actions: SemanticAction[],
    flows: SemanticFlow[]
  ): number {
    let confidence = 0.3; // Base
    
    // More entities with high-confidence sources
    const highConfidenceEntities = entities.filter(e => 
      e.sources.some(s => s.confidence > 0.8)
    );
    confidence += Math.min(highConfidenceEntities.length * 0.05, 0.3);
    
    // Flows detected
    confidence += Math.min(flows.length * 0.1, 0.2);
    
    // Critical actions detected
    const criticalActionCount = actions.filter(a => a.isCritical).length;
    confidence += Math.min(criticalActionCount * 0.05, 0.15);
    
    return Math.min(confidence, 0.95);
  }
  
  /**
   * Generate semantic summary for AI
   */
  private generateSemanticSummary(
    profile: ApplicationProfile,
    entities: SemanticEntity[],
    actions: SemanticAction[],
    flows: SemanticFlow[],
    clusters: FeatureCluster[]
  ): string {
    let summary = `# Application Analysis\n\n`;
    
    summary += `## Overview\n`;
    summary += `${profile.inferredPurpose}\n\n`;
    
    summary += `## Primary Entities\n`;
    for (const entity of entities.slice(0, 8)) {
      const caps = entity.capabilities.map(c => c.action).join(', ') || 'view';
      summary += `- **${entity.name}** (${entity.semanticType}): ${caps}\n`;
    }
    summary += '\n';
    
    summary += `## User Flows\n`;
    for (const flow of flows) {
      summary += `- **${flow.name}** [${flow.type}, priority: ${(flow.importance * 100).toFixed(0)}%]\n`;
      summary += `  Steps: ${flow.steps.map(s => s.route).join(' → ')}\n`;
    }
    summary += '\n';
    
    summary += `## Feature Clusters for Testing\n`;
    for (const cluster of clusters) {
      summary += `### ${cluster.name}\n`;
      summary += `Routes: ${cluster.routes.slice(0, 5).join(', ')}\n`;
      summary += `Suggested scenarios:\n`;
      for (const scenario of cluster.suggestedScenarios.slice(0, 4)) {
        summary += `- ${scenario}\n`;
      }
      summary += '\n';
    }
    
    summary += `## Characteristics\n`;
    for (const [key, value] of profile.characteristics) {
      if (value) {
        summary += `- ${key}: Yes\n`;
      }
    }
    
    return summary;
  }
  
  // Utility methods
  
  private singularize(word: string): string {
    if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
    if (word.endsWith('es') && !word.endsWith('ss')) return word.slice(0, -2);
    if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
    return word;
  }
  
  private pluralize(word: string): string {
    if (word.endsWith('y')) return word.slice(0, -1) + 'ies';
    if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch') || word.endsWith('sh')) {
      return word + 'es';
    }
    return word + 's';
  }
  
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

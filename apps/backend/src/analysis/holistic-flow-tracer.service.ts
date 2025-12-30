import { Injectable, Logger } from '@nestjs/common';
import { ComponentExtractorService } from './component-extractor.service';
import { SelectorMiningService, ElementWithSelectors } from './selector-mining.service';
import { ValidationExtractorService, FieldValidation } from './validation-extractor.service';
import { APIDetectorService, APICall } from './api-detector.service';
import { APIDiscoveryService, DiscoveredAPI } from '../modules/analysis/api-discovery.service';
import { StateAnalyzerService, StateVariable } from './state-analyzer.service';

export interface JourneyStep {
  action: string;
  component: string;
  target: string;
  description: string;
  assertions?: string[];
}

export interface E2EJourney {
  name: string;
  description: string;
  priority: number;
  tags: string[];
  steps: JourneyStep[];
}

export interface EnrichedComponentAnalysis {
  component: string;
  sourceCode: string;
  elements: ElementWithSelectors[];
  validations: FieldValidation[];
  apiCalls: APICall[];
  stateVariables: StateVariable[];
  navigationFlow?: {
    onSuccess?: string;
    onError?: string;
  };
}

export interface EnrichedJourneyContext {
  journey: E2EJourney;
  componentsAnalysis: EnrichedComponentAnalysis[];
  testDataSuggestions: {
    validTestData: Record<string, any>;
    invalidTestData: Record<string, any>;
  };
  edgeCases: string[];
}

@Injectable()
export class HolisticFlowTracerService {
  private readonly logger = new Logger(HolisticFlowTracerService.name);

  constructor(
    private readonly componentExtractor: ComponentExtractorService,
    private readonly selectorMining: SelectorMiningService,
    private readonly validationExtractor: ValidationExtractorService,
    private readonly apiDetector: APIDetectorService,
    private readonly apiDiscovery: APIDiscoveryService,
    private readonly stateAnalyzer: StateAnalyzerService,
  ) {}

  /**
   * Trace journey through all components and enrich with holistic analysis
   */
  async traceJourney(
    journey: E2EJourney,
    projectRoot: string,
  ): Promise<EnrichedJourneyContext> {
    this.logger.log(`Tracing journey: ${journey.name}`);

    // Step 1: Extract unique components from journey steps
    const componentPaths = this.extractComponentPaths(journey);
    this.logger.log(`Found ${componentPaths.length} components to analyze`);

    // Step 2: Analyze each component
    const componentsAnalysis: EnrichedComponentAnalysis[] = [];

    for (const componentPath of componentPaths) {
      const analysis = await this.analyzeComponent(
        componentPath,
        projectRoot,
      );
      if (analysis) {
        componentsAnalysis.push(analysis);
      }
    }

    // Step 3: Generate test data suggestions
    const testDataSuggestions = this.generateTestDataSuggestions(
      componentsAnalysis,
    );

    // Step 4: Identify edge cases
    const edgeCases = this.identifyEdgeCases(componentsAnalysis);

    this.logger.log(
      `Journey analysis complete: ${componentsAnalysis.length} components, ${edgeCases.length} edge cases`,
    );

    return {
      journey,
      componentsAnalysis,
      testDataSuggestions,
      edgeCases,
    };
  }

  /**
   * Extract unique component paths from journey steps
   * Supports both journey.steps[].component and journey.components[] formats
   */
  private extractComponentPaths(journey: any): string[] {
    const paths = new Set<string>();

    // Format 1: journey.steps[] with component field
    if (journey.steps && Array.isArray(journey.steps)) {
      for (const step of journey.steps) {
        if (
          step.component &&
          step.component !== 'User' &&
          !step.component.startsWith('/')
        ) {
          paths.add(step.component);
        }
      }
    }

    // Format 2: journey.components[] array (from VS Code extension)
    if (journey.components && Array.isArray(journey.components)) {
      for (const comp of journey.components) {
        const compPath = typeof comp === 'string' ? comp : comp.path;
        if (compPath && !compPath.startsWith('/')) {
          paths.add(compPath);
        }
      }
    }

    return Array.from(paths);
  }

  /**
   * Analyze a single component with all services
   */
  private async analyzeComponent(
    componentPath: string,
    projectRoot: string,
  ): Promise<EnrichedComponentAnalysis | null> {
    try {
      // Extract component source code
      const metadata = await this.componentExtractor.extractComponent(
        componentPath,
        projectRoot,
      );

      if (!metadata.exists || !metadata.sourceCode) {
        this.logger.warn(`Component not found or empty: ${componentPath}`);
        return null;
      }

      this.logger.debug(`Analyzing component: ${componentPath}`);

      // Mine selectors
      const elements = this.selectorMining.mineSelectors(metadata.sourceCode);

      // Extract validations
      const validations = this.validationExtractor.extractValidations(
        metadata.sourceCode,
      );

      // Enrich validations with error selectors
      for (const validation of validations) {
        validation.errorElementSelector =
          this.validationExtractor.findErrorSelector(
            metadata.sourceCode,
            validation.fieldName,
          );
      }

      // Detect API calls - use BOTH old and new for maximum coverage
      const oldAPIs = this.apiDetector.detectAPICalls(metadata.sourceCode);
      const newAPIs = this.apiDiscovery.discoverAPIs(metadata.sourceCode, componentPath);
      
      // Convert new API format to old format and merge
      const convertedAPIs: APICall[] = newAPIs.map(api => ({
        method: api.method,
        endpoint: api.endpoint,
        fullURL: api.endpoint,
        libraryUsed: api.location === 'fetch' ? 'fetch' : 
                     api.location === 'axios' || api.location === 'axios-config' ? 'axios' : 'custom'
      }));
      
      const apiCalls = [...oldAPIs, ...convertedAPIs];
      
      // Deduplicate by endpoint + method
      const uniqueAPIs = Array.from(
        new Map(apiCalls.map(api => [`${api.method}:${api.endpoint}`, api])).values()
      );
      
      this.logger.debug(`Discovered ${uniqueAPIs.length} APIs (${oldAPIs.length} regex + ${newAPIs.length} AST)`);
      const apiCallsFinal = uniqueAPIs;

      // Analyze state
      const stateVariables = this.stateAnalyzer.analyzeState(
        metadata.sourceCode,
      );

      // Extract navigation flow
      const navigationFlow = this.extractNavigationFlow(
        metadata.sourceCode,
        apiCallsFinal,
      );

      return {
        component: componentPath,
        sourceCode: metadata.sourceCode,
        elements,
        validations,
        apiCalls: apiCallsFinal,
        stateVariables,
        navigationFlow,
      };
    } catch (error) {
      this.logger.error(
        `Error analyzing component ${componentPath}:`,
        error.message,
      );
      return null;
    }
  }

  /**
   * Extract navigation flow from component
   */
  private extractNavigationFlow(
    sourceCode: string,
    apiCalls: APICall[],
  ): { onSuccess?: string; onError?: string } {
    const flow: { onSuccess?: string; onError?: string } = {};

    // Check API calls for navigation
    for (const apiCall of apiCalls) {
      if (apiCall.successHandling?.navigationTarget) {
        flow.onSuccess = apiCall.successHandling.navigationTarget;
      }
    }

    // Look for navigate() calls
    const navigatePattern = /navigate\(['"](\/[^'"]+)['"]\)/g;
    const match = navigatePattern.exec(sourceCode);
    if (match && !flow.onSuccess) {
      flow.onSuccess = match[1];
    }

    return flow;
  }

  /**
   * Generate test data suggestions based on validations
   */
  private generateTestDataSuggestions(
    componentsAnalysis: EnrichedComponentAnalysis[],
  ): {
    validTestData: Record<string, any>;
    invalidTestData: Record<string, any>;
  } {
    const validTestData: Record<string, any> = {};
    const invalidTestData: Record<string, any> = {};

    for (const component of componentsAnalysis) {
      for (const validation of component.validations) {
        const fieldName = validation.fieldName;

        // Generate valid test data
        validTestData[fieldName] = this.generateValidData(validation);

        // Generate invalid test data for each rule
        for (const rule of validation.rules) {
          const invalidKey = `${fieldName}_${rule.type}`;
          invalidTestData[invalidKey] = {
            [fieldName]: this.generateInvalidData(rule),
            expectedError: rule.errorMessage,
            errorSelector: validation.errorElementSelector,
          };
        }
      }
    }

    return { validTestData, invalidTestData };
  }

  /**
   * Generate valid test data for a field
   */
  private generateValidData(validation: FieldValidation): any {
    const emailRule = validation.rules.find((r) => r.type === 'email');
    if (emailRule) {
      return 'test.user@example.com';
    }

    const minLengthRule = validation.rules.find((r) => r.type === 'minLength');
    if (minLengthRule && typeof minLengthRule.value === 'number') {
      // Generate string with minLength + 2
      return 'A'.repeat(minLengthRule.value + 2);
    }

    const patternRule = validation.rules.find((r) => r.type === 'pattern');
    if (patternRule) {
      // For common patterns, return sensible defaults
      return 'ValidValue123';
    }

    return 'Valid Input';
  }

  /**
   * Generate invalid test data for a validation rule
   */
  private generateInvalidData(rule: any): any {
    switch (rule.type) {
      case 'required':
        return '';
      case 'email':
        return 'not-an-email';
      case 'minLength':
        return 'A'.repeat(Math.max(0, rule.value - 1));
      case 'maxLength':
        return 'A'.repeat(rule.value + 1);
      case 'pattern':
        return 'Invalid@#$';
      default:
        return 'Invalid';
    }
  }

  /**
   * Identify edge cases from component analysis
   */
  private identifyEdgeCases(
    componentsAnalysis: EnrichedComponentAnalysis[],
  ): string[] {
    const edgeCases: string[] = [];

    for (const component of componentsAnalysis) {
      // Edge case: Minimum/maximum length boundaries
      for (const validation of component.validations) {
        const minRule = validation.rules.find((r) => r.type === 'minLength');
        if (minRule && typeof minRule.value === 'number') {
          edgeCases.push(
            `${validation.fieldName}: Test with exactly ${minRule.value} characters (minimum boundary)`,
          );
        }

        const maxRule = validation.rules.find((r) => r.type === 'maxLength');
        if (maxRule && typeof maxRule.value === 'number') {
          edgeCases.push(
            `${validation.fieldName}: Test with exactly ${maxRule.value} characters (maximum boundary)`,
          );
        }
      }

      // Edge case: Loading states
      const loadingState = component.stateVariables.find(
        (s) => s.name === 'loading' || s.name === 'isLoading',
      );
      if (loadingState) {
        edgeCases.push('Test button disabled state during loading');
      }

      // Edge case: API errors
      for (const apiCall of component.apiCalls) {
        if (apiCall.errorHandling) {
          edgeCases.push(
            `Test API error handling for ${apiCall.method} ${apiCall.endpoint}`,
          );
        }
      }

      // Edge case: Network failures
      if (component.apiCalls.length > 0) {
        edgeCases.push('Test network failure scenario');
      }
    }

    return edgeCases;
  }

  /**
   * Find element selector for a specific action
   */
  findElementForAction(
    component: EnrichedComponentAnalysis,
    actionType: 'submit' | 'input' | 'button',
  ): string | undefined {
    const elements = component.elements;

    switch (actionType) {
      case 'submit':
        // Look for submit button
        const submitBtn = elements.find(
          (e) =>
            e.elementType === 'button' &&
            (e.context?.includes('type="submit"') ||
              e.bestSelector.includes('submit')),
        );
        return submitBtn?.bestSelector;

      case 'input':
        // Return first input element
        const input = elements.find((e) => e.elementType === 'input');
        return input?.bestSelector;

      case 'button':
        // Return first button
        const button = elements.find((e) => e.elementType === 'button');
        return button?.bestSelector;

      default:
        return undefined;
    }
  }
}

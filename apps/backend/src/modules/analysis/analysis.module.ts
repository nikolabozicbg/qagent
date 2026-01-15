import { Module } from '@nestjs/common';
import { FlowsModule } from '../flows/flows.module';
import { CodebaseAnalyzerService } from './codebase-analyzer.service';
import { FrameworkDetectorService } from './framework-detector.service';
import { AnalysisController } from './analysis.controller';
import { LanguageDetectorService } from '../language-providers/language-detector.service';
import { ProviderRegistryService } from '../language-providers/provider-registry.service';
import { JavaScriptProvider } from '../language-providers/javascript/javascript.provider';
import { PythonProvider } from '../language-providers/python/python.provider';
import { CSharpProvider } from '../language-providers/csharp/csharp.provider';
import { FrameworkRecommenderService } from './framework-recommender.service';
import { ProjectTypeDetectorService } from './project-type-detector.service';
import { EnhancedAnalysisService } from './enhanced-analysis.service';
import { FlowDiscoveryService } from './flow-discovery.service';
import { RoutingDetectorService } from './routing-detector.service';
import { ReactRouterParserService } from './react-router-parser.service';
import { AIProviderService } from '../../services/ai-provider.service';
import { NavigationGraphService } from './graph/navigation-graph.service';
import { NavigationGraphBuilderService } from './graph/navigation-graph-builder.service';
import { WeightCalculatorService } from './graph/weight-calculator.service';
import { PathDiscoveryService } from './graph/path-discovery.service';
import { CycleDetectorService } from './graph/cycle-detector.service';
import { SmartFileDiscoveryService } from './smart-file-discovery.service';
import { IntentJourneySynthesisService } from './intent-journey-synthesis.service';
import { RouteInferenceService } from './route-inference.service';
import { APIDiscoveryService } from './api-discovery.service';
import { SeedDataParserService } from './seed-data-parser.service';
import { AuthSetupService } from './auth-setup.service';
import { ValidationDiscoveryService } from './validation-discovery.service';
import { JourneyStateMachineService } from './journey-state-machine.service';
import { HolisticFlowTracerService } from '../../analysis/holistic-flow-tracer.service';
import { ComponentExtractorService } from '../../analysis/component-extractor.service';
import { SelectorMiningService } from '../../analysis/selector-mining.service';
import { ValidationExtractorService } from '../../analysis/validation-extractor.service';
import { APIDetectorService } from '../../analysis/api-detector.service';
import { StateAnalyzerService } from '../../analysis/state-analyzer.service';
import { AnalysisGateway } from './analysis.gateway';
import { UILibraryDetectorService } from '../../analysis/ui-library-detector.service';
import { StateManagementDetectorService } from '../../analysis/state-management-detector.service';
import { SmartJourneyDiscoveryService } from './smart-journey-discovery.service';
import { CodeIntelligenceService } from './intelligence/code-intelligence.service';
import { PatternRecognizerService } from './intelligence/pattern-recognizer.service';
import { HolisticSynthesizerService } from './intelligence/holistic-synthesizer.service';
import { JSXAnalyzerService } from './intelligence/jsx-analyzer.service';
import { GraphFlowAnalyzerService } from './intelligence/graph-flow-analyzer.service';
import { UniversalNavigationDiscoveryService } from './intelligence/universal-navigation-discovery.service';
import { AISynthesizerService } from './intelligence/ai-synthesizer.service';
import { TechDetectionService } from './tech-detection.service';

// V3 Discovery Services
import { ProjectScannerService } from './v3/project-scanner.service';
import { ASTParserService } from './v3/ast-parser.service';
import { DependencyGraphService } from './v3/dependency-graph.service';
import { ComponentAnalyzerService } from './v3/component-analyzer.service';
import { BehaviorInferenceService } from './v3/behavior-inference.service';
import { FormIntelligenceService } from './v3/form-intelligence.service';
import { StateDetectorService } from './v3/state-detector.service';
import { APIMapperService } from './v3/api-mapper.service';
import { NavigationMapperService } from './v3/navigation-mapper.service';
import { SelectorExtractorService } from './v3/selector-extractor.service';
import { DiscoveryOrchestratorService } from './v3/discovery-orchestrator.service';
import { DomainDetectorService } from './v3/domain-detector.service';
import { CloudDiscoveryService } from './cloud-discovery.service';

@Module({
  imports: [FlowsModule],
  controllers: [AnalysisController],
  providers: [
    AnalysisGateway,
    CodebaseAnalyzerService,
    FrameworkDetectorService,
    LanguageDetectorService,
    ProviderRegistryService,
    JavaScriptProvider,
    PythonProvider,
    CSharpProvider,
    FrameworkRecommenderService,
    ProjectTypeDetectorService,
    EnhancedAnalysisService,
    FlowDiscoveryService,
    RoutingDetectorService,
    ReactRouterParserService,
    AIProviderService,
    NavigationGraphService,
    NavigationGraphBuilderService,
    WeightCalculatorService,
    PathDiscoveryService,
    CycleDetectorService,
    SmartFileDiscoveryService,
    IntentJourneySynthesisService,
    RouteInferenceService,
    APIDiscoveryService,
    SeedDataParserService,
    AuthSetupService,
    ValidationDiscoveryService,
    JourneyStateMachineService,
    HolisticFlowTracerService,
    ComponentExtractorService,
    SelectorMiningService,
    ValidationExtractorService,
    APIDetectorService,
    StateAnalyzerService,
    UILibraryDetectorService,
    StateManagementDetectorService,
    SmartJourneyDiscoveryService,
    JSXAnalyzerService,
    UniversalNavigationDiscoveryService,
    GraphFlowAnalyzerService,
    CodeIntelligenceService,
    PatternRecognizerService,
    HolisticSynthesizerService,
    AISynthesizerService,
    TechDetectionService,
    // V3 Discovery Services
    ProjectScannerService,
    ASTParserService,
    DependencyGraphService,
    ComponentAnalyzerService,
    BehaviorInferenceService,
    FormIntelligenceService,
    StateDetectorService,
    APIMapperService,
    NavigationMapperService,
    SelectorExtractorService,
    DiscoveryOrchestratorService,
    DomainDetectorService,
    CloudDiscoveryService,
  ],
  exports: [CodebaseAnalyzerService, FrameworkDetectorService, EnhancedAnalysisService, FlowDiscoveryService, NavigationGraphService, AnalysisGateway, SmartJourneyDiscoveryService, HolisticSynthesizerService, TechDetectionService, DiscoveryOrchestratorService]
})
export class AnalysisModule {}

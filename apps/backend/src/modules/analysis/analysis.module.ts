import { Module } from '@nestjs/common';
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

@Module({
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
    StateAnalyzerService
  ],
  exports: [CodebaseAnalyzerService, FrameworkDetectorService, EnhancedAnalysisService, FlowDiscoveryService, NavigationGraphService]
})
export class AnalysisModule {}

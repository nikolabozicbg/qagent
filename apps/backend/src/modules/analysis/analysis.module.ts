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

@Module({
  controllers: [AnalysisController],
  providers: [
    CodebaseAnalyzerService,
    FrameworkDetectorService,
    LanguageDetectorService,
    ProviderRegistryService,
    JavaScriptProvider,
    PythonProvider,
    CSharpProvider,
    FrameworkRecommenderService,
    ProjectTypeDetectorService,
    EnhancedAnalysisService
  ],
  exports: [CodebaseAnalyzerService, FrameworkDetectorService, EnhancedAnalysisService]
})
export class AnalysisModule {}

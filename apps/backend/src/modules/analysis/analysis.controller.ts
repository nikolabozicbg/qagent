import { Body, Controller, Post } from '@nestjs/common';
import { CodebaseAnalyzerService, AnalysisReport } from './codebase-analyzer.service';
import { FrameworkDetectorService, DetectedFrameworks } from './framework-detector.service';
import { LanguageDetectorService } from '../language-providers/language-detector.service';
import { ProviderRegistryService } from '../language-providers/provider-registry.service';
import { FrameworkRecommenderService } from './framework-recommender.service';
import { ProjectTypeDetectorService } from './project-type-detector.service';
import { EnhancedAnalysisService, EnhancedAnalysisResponse } from './enhanced-analysis.service';

@Controller('analyze')
export class AnalysisController {
  constructor(
    private readonly analyzerService: CodebaseAnalyzerService,
    private readonly frameworkDetector: FrameworkDetectorService,
    private readonly languageDetector: LanguageDetectorService,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly frameworkRecommender: FrameworkRecommenderService,
    private readonly projectTypeDetector: ProjectTypeDetectorService,
    private readonly enhancedAnalysisService: EnhancedAnalysisService
  ) {}

  @Post('workspace')
  async analyzeWorkspace(
    @Body() body: { workspacePath: string }
  ): Promise<AnalysisReport> {
    console.log(`📊 API: Analyzing workspace: ${body.workspacePath}`);
    
    const result = await this.analyzerService.analyzeWorkspace(body.workspacePath);
    
    console.log(`   ✅ Analysis complete: ${result.coveragePercent}% coverage`);
    
    return result;
  }

  /**
   * NEW: Enhanced analysis with complete Testing Ecosystem view
   */
  @Post('enhanced')
  async analyzeWorkspaceEnhanced(
    @Body() body: { workspacePath: string }
  ): Promise<EnhancedAnalysisResponse> {
    console.log(`🚀 API: Enhanced Analysis: ${body.workspacePath}`);
    
    const result = await this.enhancedAnalysisService.analyzeWorkspace(body.workspacePath);
    
    console.log(`   ✅ Enhanced Analysis complete: ${result.summary.overallCoverage}% coverage`);
    console.log(`   📊 Technologies: ${result.project.technologies.map(t => t.displayName).join(', ')}`);
    console.log(`   🛠️  Installed: ${result.testingSetup.installed.length} frameworks`);
    console.log(`   💡 Recommended: ${result.testingSetup.recommended.length} frameworks`);
    
    return result;
  }

  @Post('test-type-recommendations')
  async getTestTypeRecommendations(
    @Body() body: { fileType: string; frameworks: DetectedFrameworks }
  ) {
    console.log(`🎯 API: Getting test type recommendations for ${body.fileType}`);
    
    const recommendations = this.frameworkDetector.getTestTypeRecommendations(
      body.fileType,
      body.frameworks
    );
    
    return { recommendations };
  }

  @Post('setup-recommendations')
  async getSetupRecommendations(
    @Body() body: { workspacePath: string }
  ) {
    console.log(`🧙 API: Getting setup recommendations for ${body.workspacePath}`);
    
    const packageJsonPath = `${body.workspacePath}/package.json`;
    
    // Detect stack
    const stack = this.frameworkDetector.detectStack(packageJsonPath);
    console.log(`   Detected stack: ${stack.join(', ')}`);
    
    // Detect existing frameworks
    const existingFrameworks = await this.frameworkDetector.detectFrameworks(body.workspacePath);
    console.log(`   Existing frameworks:`, existingFrameworks);
    
    // Generate recommendations (considering what already exists)
    const recommendations = this.frameworkDetector.generateSetupRecommendations(stack, existingFrameworks);
    
    return {
      stack,
      existingFrameworks,
      recommendations
    };
  }

  @Post('setup/recommendations')
  async getMultiLanguageSetupRecommendations(
    @Body() body: { workspacePath: string }
  ) {
    console.log(`🚀 API: Getting multi-language setup recommendations for ${body.workspacePath}`);
    
    try {
      // 1. Detect languages
      const languages = await this.languageDetector.detectLanguages(body.workspacePath);
      console.log(`   Detected languages: ${languages.join(', ')}`);
      
      if (languages.length === 0) {
        return {
          error: 'No supported languages detected',
          recommendations: []
        };
      }
      
      // 2. Get providers for detected languages
      const providers = this.providerRegistry.getProviders(languages);
      
      // 3. For each provider, check frameworks and generate recommendations
      const recommendations = [];
      
      for (const provider of providers) {
        const language = provider.getMetadata().language;
        
        // Detect project type
        const projectType = await this.projectTypeDetector.detectProjectType(
          body.workspacePath,
          language
        );
        
        console.log(`   ${language}: Project type = ${projectType}`);
        
        // Check for installed frameworks
        const frameworks = await provider.detectFrameworks(body.workspacePath);
        console.log(`   ${language}: Found ${frameworks.length} frameworks`);
        
        if (frameworks.length === 0) {
          // No frameworks found - recommend!
          const rec = this.frameworkRecommender.getRecommendation(language, projectType);
          
          if (rec) {
            recommendations.push({
              language,
              projectType,
              hasFrameworks: false,
              recommendation: rec
            });
          }
        } else {
          // Frameworks already installed - show them
          recommendations.push({
            language,
            projectType,
            hasFrameworks: true,
            installedFrameworks: frameworks
          });
        }
      }
      
      console.log(`   ✅ Generated ${recommendations.length} recommendations`);
      
      return {
        workspacePath: body.workspacePath,
        languages,
        recommendations
      };
      
    } catch (error) {
      console.error('   ❌ Error generating recommendations:', error);
      return {
        error: error.message,
        recommendations: []
      };
    }
  }
}

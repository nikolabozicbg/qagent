import { Injectable } from '@nestjs/common';
import { CodebaseAnalyzerService } from './codebase-analyzer.service';
import { ProjectTypeDetectorService, ProjectTypeDetection } from './project-type-detector.service';
import { ProviderRegistryService } from '../language-providers/provider-registry.service';
import { LanguageDetectorService } from '../language-providers/language-detector.service';
import { FrameworkRecommendation, TestType } from '../language-providers/base/language-provider.interface';

/**
 * Enhanced Analysis Response - Complete Testing Ecosystem View
 */
export interface EnhancedAnalysisResponse {
  project: ProjectInfo;
  testingSetup: TestingSetup;
  coverageByType: CoverageByType;
  files: FileAnalysis[];
  summary: AnalysisSummary;
}

export interface ProjectInfo {
  name: string;
  path: string;
  technologies: TechnologyInfo[];
  primaryType: string; // 'web-api', 'spa', etc.
  icon: string;
}

export interface TechnologyInfo {
  language: string;
  displayName: string;
  projectType: string;
  confidence: number;
  indicators: string[];
  icon: string;
  color: string;
}

export interface TestingSetup {
  installed: InstalledFramework[];
  recommended: FrameworkRecommendation[];
  missingSetup: string[];
}

export interface InstalledFramework {
  name: string;
  version?: string;
  type: TestType;
  language: string;
  runCommand: string;
  outputPattern: string;
}

export interface CoverageByType {
  unit: TestTypeCoverage;
  integration: TestTypeCoverage;
  e2e: TestTypeCoverage;
  component: TestTypeCoverage;
}

export interface TestTypeCoverage {
  testType: TestType;
  framework: string | null;
  coverage: number; // percentage
  filesTotal: number;
  filesTested: number;
  filesUntested: number;
  outputPath: string;
  runCommand: string;
  installed: boolean;
}

export interface FileAnalysis {
  path: string;
  relativePath: string;
  language: string;
  type: 'component' | 'page' | 'hook' | 'service' | 'util' | 'controller' | 'model' | 'other'; // File classification for TreeView filtering
  hasTest: boolean;
  testType?: TestType;
  testFramework?: string;
  testFilePath?: string;
  coverage?: number;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  linesOfCode: number;
  // Primary recommendation (for backward compatibility)
  recommendedTestType: TestType;
  recommendedFramework: string;
  outputPath: string;
  runCommand: string;
  // ALL recommendations for this file
  recommendations: TestTypeRecommendation[];
}

export interface TestTypeRecommendation {
  testType: TestType;
  priority: 'primary' | 'secondary' | 'optional';
  framework: string;
  reason: string;
  outputPath: string;
  runCommand: string;
}

export interface AnalysisSummary {
  totalFiles: number;
  testedFiles: number;
  untestedFiles: number;
  overallCoverage: number;
  highPriorityFiles: number;
  detectedLanguages: string[];
  installedFrameworks: number;
  recommendedFrameworks: number;
}

@Injectable()
export class EnhancedAnalysisService {
  constructor(
    private readonly codebaseAnalyzer: CodebaseAnalyzerService,
    private readonly projectTypeDetector: ProjectTypeDetectorService,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly languageDetector: LanguageDetectorService,
  ) {}

  /**
   * Perform complete enhanced analysis of workspace
   */
  async analyzeWorkspace(workspacePath: string): Promise<EnhancedAnalysisResponse> {
    console.log(`🔍 Enhanced Analysis: ${workspacePath}`);

    // 1. Detect languages
    const languages = await this.languageDetector.detectLanguages(workspacePath);
    console.log(`   Languages: ${languages.join(', ')}`);

    // 2. Detect project types (polyglot support)
    const projectTypeDetections = await this.projectTypeDetector.detectProjectTypes(workspacePath);
    const primaryDetection = projectTypeDetections.sort((a, b) => b.confidence - a.confidence)[0];
    
    console.log(`   Primary: ${primaryDetection?.projectType} (${primaryDetection?.confidence}%)`);

    // 3. Get providers for detected languages
    const providers = this.providerRegistry.getProviders(languages);

    // 4. Detect installed frameworks
    const installedFrameworks: InstalledFramework[] = [];
    for (const provider of providers) {
      const frameworks = await provider.detectFrameworks(workspacePath);
      installedFrameworks.push(...frameworks.map(f => ({
        name: f.name,
        version: f.version,
        type: f.type,
        language: f.language,
        runCommand: f.runCommand,
        outputPattern: f.outputPattern || f.testPattern
      })));
    }
    console.log(`   Installed frameworks: ${installedFrameworks.length}`);

    // 5. Get framework recommendations
    const recommendedFrameworks: FrameworkRecommendation[] = [];
    if (primaryDetection) {
      for (const provider of providers) {
        const recs = await provider.recommendFrameworks(
          primaryDetection.projectType,
          workspacePath
        );
        recommendedFrameworks.push(...recs);
      }
    }
    console.log(`   Recommended frameworks: ${recommendedFrameworks.length}`);

    // 6. Run basic coverage analysis
    const basicAnalysis = await this.codebaseAnalyzer.analyzeWorkspace(workspacePath);

    // 7. Build coverage by test type
    const coverageByType = this.buildCoverageByType(
      basicAnalysis.gaps,
      installedFrameworks,
      recommendedFrameworks,
      primaryDetection
    );

    // 8. Enhance file analysis with recommendations
    const enhancedFiles = await this.enhanceFileAnalysis(
      basicAnalysis.gaps,
      providers,
      primaryDetection,
      workspacePath
    );

    // 9. Build project info
    const projectInfo = this.buildProjectInfo(
      workspacePath,
      projectTypeDetections,
      providers
    );

    // 10. Build testing setup info
    const testingSetup: TestingSetup = {
      installed: installedFrameworks,
      recommended: recommendedFrameworks.slice(0, 5), // Top 5
      missingSetup: this.identifyMissingSetup(installedFrameworks, recommendedFrameworks)
    };

    // 11. Build summary
    const summary: AnalysisSummary = {
      totalFiles: basicAnalysis.totalFiles,
      testedFiles: basicAnalysis.testedFiles,
      untestedFiles: basicAnalysis.untestedFiles,
      overallCoverage: basicAnalysis.coveragePercent,
      highPriorityFiles: enhancedFiles.filter(f => f.priority === 'high').length,
      detectedLanguages: languages,
      installedFrameworks: installedFrameworks.length,
      recommendedFrameworks: recommendedFrameworks.length
    };

    console.log(`   ✅ Enhanced Analysis Complete: ${summary.overallCoverage}% coverage`);

    return {
      project: projectInfo,
      testingSetup,
      coverageByType,
      files: enhancedFiles,
      summary
    };
  }

  /**
   * Build project info from detections
   */
  private buildProjectInfo(
    workspacePath: string,
    detections: ProjectTypeDetection[],
    providers: any[]
  ): ProjectInfo {
    const primaryDetection = detections[0];
    const projectName = workspacePath.split('/').pop() || 'Unknown';

    const technologies: TechnologyInfo[] = detections.map(det => {
      const provider = providers.find(p => p.getMetadata().language === det.language);
      const metadata = provider?.getMetadata();

      return {
        language: det.language,
        displayName: metadata?.displayName || det.language,
        projectType: det.projectType,
        confidence: det.confidence,
        indicators: det.indicators,
        icon: metadata?.icon || '📦',
        color: metadata?.color || '#666666'
      };
    });

    return {
      name: projectName,
      path: workspacePath,
      technologies,
      primaryType: primaryDetection?.projectType || 'library',
      icon: technologies[0]?.icon || '📦'
    };
  }

  /**
   * Build coverage breakdown by test type
   */
  private buildCoverageByType(
    files: any[],
    installedFrameworks: InstalledFramework[],
    recommendedFrameworks: FrameworkRecommendation[],
    primaryDetection: ProjectTypeDetection | undefined
  ): CoverageByType {
    const testTypes: TestType[] = ['unit', 'integration', 'e2e', 'component'];
    const result: any = {};

    for (const testType of testTypes) {
      // Find installed framework for this test type
      const installedFramework = installedFrameworks.find(f => f.type === testType);
      
      // Find recommended framework
      const recommendedFramework = recommendedFrameworks.find(
        r => r.framework.type === testType && r.priority === 1
      );

      // Calculate coverage for this test type (simplified for now)
      const filesForThisType = files.filter(f => 
        this.shouldFileHaveTestType(f.filePath, testType, primaryDetection?.projectType)
      );
      
      const testedFilesForType = filesForThisType.filter(f => f.hasTest).length;
      const coverage = filesForThisType.length > 0 
        ? Math.round((testedFilesForType / filesForThisType.length) * 100)
        : 0;

      result[testType] = {
        testType,
        framework: installedFramework?.name || recommendedFramework?.framework.name || null,
        coverage,
        filesTotal: filesForThisType.length,
        filesTested: testedFilesForType,
        filesUntested: filesForThisType.length - testedFilesForType,
        outputPath: installedFramework?.outputPattern || recommendedFramework?.framework.outputPattern || 'tests/',
        runCommand: installedFramework?.runCommand || recommendedFramework?.framework.runCommand || 'npm test',
        installed: !!installedFramework
      };
    }

    return result as CoverageByType;
  }

  /**
   * Determine if file should have specific test type
   */
  private shouldFileHaveTestType(filePath: string, testType: TestType, projectType?: string): boolean {
    const fileName = filePath.toLowerCase();

    if (testType === 'unit') {
      // Most files should have unit tests
      return fileName.includes('service') || fileName.includes('util') || fileName.includes('helper');
    } else if (testType === 'integration') {
      // Controllers, repositories
      return fileName.includes('controller') || fileName.includes('repository') || fileName.includes('endpoint');
    } else if (testType === 'component') {
      // React/Vue components
      return fileName.endsWith('.jsx') || fileName.endsWith('.tsx') || fileName.endsWith('.vue');
    } else if (testType === 'e2e') {
      // Pages, main flows
      return fileName.includes('page') || fileName.includes('app');
    }

    return false;
  }

  /**
   * Enhance file analysis with provider recommendations
   */
  private async enhanceFileAnalysis(
    gaps: any[],
    providers: any[],
    primaryDetection: ProjectTypeDetection | undefined,
    workspacePath: string
  ): Promise<FileAnalysis[]> {
    const enhanced: FileAnalysis[] = [];

    for (const gap of gaps) {
      // Find provider for this file's language
      const provider = providers.find(p => p.getMetadata().language === gap.language);
      
      if (!provider || !primaryDetection) {
        // Fallback to basic analysis
        enhanced.push({
          path: gap.filePath,
          relativePath: gap.relativePath,
          language: gap.language || 'unknown',
          type: this.classifyFileType(gap.filePath),
          hasTest: gap.hasTest,
          priority: gap.priority,
          reason: gap.reason,
          linesOfCode: gap.linesOfCode,
          recommendedTestType: 'unit',
          recommendedFramework: 'default',
          outputPath: '',
          runCommand: '',
          recommendations: []
        });
        continue;
      }

      // Get test type recommendations from provider
      const recommendations = provider.recommendTestType(gap.filePath, primaryDetection.projectType);
      const primaryRec = recommendations.find(r => r.priority === 'primary') || recommendations[0];

      enhanced.push({
        path: gap.filePath,
        relativePath: gap.relativePath,
        language: gap.language,
        type: this.classifyFileType(gap.filePath),
        hasTest: gap.hasTest,
        testType: primaryRec?.testType,
        priority: gap.priority,
        reason: gap.reason,
        linesOfCode: gap.linesOfCode,
        // Primary recommendation (backward compatibility)
        recommendedTestType: primaryRec?.testType || 'unit',
        recommendedFramework: primaryRec?.framework || 'default',
        outputPath: primaryRec?.outputPath || '',
        runCommand: primaryRec?.runCommand || '',
        // ALL recommendations
        recommendations: recommendations || []
      });
    }

    return enhanced;
  }

  /**
   * Classify file type based on file path and name patterns
   */
  private classifyFileType(filePath: string): 'component' | 'page' | 'hook' | 'service' | 'util' | 'controller' | 'model' | 'other' {
    const fileName = filePath.split('/').pop() || '';
    const lowerFileName = fileName.toLowerCase();
    const lowerPath = filePath.toLowerCase();
    
    // Pages (Next.js, Nuxt, etc.) - HIGHEST PRIORITY for E2E
    if (lowerFileName.includes('page.') || lowerPath.includes('/pages/') || lowerPath.includes('/app/') && lowerFileName.startsWith('page')) {
      return 'page';
    }
    
    // React/Vue Components
    if ((fileName.endsWith('.tsx') || fileName.endsWith('.vue')) && 
        (lowerFileName.includes('component') || /^[A-Z]/.test(fileName))) {
      return 'component';
    }
    
    // React Hooks
    if (lowerFileName.startsWith('use') && (fileName.endsWith('.ts') || fileName.endsWith('.tsx'))) {
      return 'hook';
    }
    
    // Controllers (API routes)
    if (lowerFileName.includes('controller') || lowerFileName.includes('route') || lowerFileName.includes('endpoint')) {
      return 'controller';
    }
    
    // Services (business logic)
    if (lowerFileName.includes('service')) {
      return 'service';
    }
    
    // Utilities/Helpers
    if (lowerFileName.includes('util') || lowerFileName.includes('helper')) {
      return 'util';
    }
    
    // Models/Entities
    if (lowerFileName.includes('model') || lowerFileName.includes('entity') || lowerFileName.includes('schema')) {
      return 'model';
    }
    
    return 'other';
  }

  /**
   * Identify what's missing from testing setup
   */
  private identifyMissingSetup(
    installed: InstalledFramework[],
    recommended: FrameworkRecommendation[]
  ): string[] {
    const missing: string[] = [];
    const installedNames = new Set(installed.map(f => f.name.toLowerCase()));

    // Check top recommendations
    for (const rec of recommended.slice(0, 3)) {
      if (!installedNames.has(rec.framework.name.toLowerCase())) {
        missing.push(`${rec.framework.name} for ${rec.framework.type} testing - ${rec.reason}`);
      }
    }

    return missing;
  }
}

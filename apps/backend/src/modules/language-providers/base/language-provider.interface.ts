export type TestType = 'unit' | 'integration' | 'e2e' | 'component' | 'visual' | 'mutation' | 'performance';
export type ProjectType = 'web-api' | 'spa' | 'library' | 'cli' | 'desktop' | 'mobile' | 'monolith' | 'microservice';

export interface Framework {
  name: string;
  version?: string;
  type: TestType;
  configFiles: string[];
  testPattern: string;
  runCommand: string;
  language: string;
  outputPattern?: string; // e.g., "tests/unit/*.test.ts"
  setupRequired?: string[]; // Required packages to install
}

export interface LanguageMetadata {
  language: string;
  displayName: string;
  fileExtensions: string[];
  icon: string;
  color: string;
}

export interface CoverageData {
  totalLines: number;
  coveredLines: number;
  coveragePercent: number;
  uncoveredLines: number[];
}

export interface FrameworkRecommendation {
  framework: Framework;
  priority: number; // 1 = highest, 2 = second choice, etc.
  marketShare?: number; // percentage
  pros?: string[];
  cons?: string[];
  reason: string; // Why recommended for this project
}

export interface TestTypeRecommendation {
  testType: TestType;
  priority: 'primary' | 'secondary' | 'optional';
  framework: string; // Recommended framework name
  reason: string;
  outputPath: string; // Where test file should be created
  runCommand: string; // How to execute this test
}

export interface LanguageProvider {
  // Metadata
  getMetadata(): LanguageMetadata;
  
  // Framework detection (what exists)
  detectFrameworks(workspacePath: string): Promise<Framework[]>;
  
  // Framework recommendations (what should be added) - NEW
  recommendFrameworks(projectType: ProjectType, workspacePath: string): Promise<FrameworkRecommendation[]>;
  
  // File scanning
  findSourceFiles(workspacePath: string): Promise<string[]>;
  findTestFiles(workspacePath: string): Promise<string[]>;
  
  // Test matching
  getTestFileForSource(sourceFile: string): string | null;
  getSourceFileForTest(testFile: string): string | null;
  
  // Test type recommendations for specific file - NEW
  recommendTestType(sourceFile: string, projectType: ProjectType): TestTypeRecommendation[];
  
  // Output path generation per test type - NEW
  getOutputPath(sourceFile: string, testType: TestType, framework: string, workspacePath: string): string;
  
  // Coverage parsing (optional)
  parseCoverageReport?(coveragePath: string): Promise<CoverageData>;
  
  // Prompt generation
  getTestGenerationPrompt(sourceCode: string, framework: Framework): string;
  
  // Mock generation (optional)
  generateMockTemplate?(className: string, framework: Framework): string;
}

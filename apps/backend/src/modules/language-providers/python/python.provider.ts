import * as path from 'path';
import { BaseLanguageProvider } from '../base/base-language-provider';
import { Framework, LanguageMetadata, ProjectType, FrameworkRecommendation, TestType, TestTypeRecommendation } from '../base/language-provider.interface';
import { getAllFrameworkRecommendations } from '../../analysis/framework-recommendations';

export class PythonProvider extends BaseLanguageProvider {
  getMetadata(): LanguageMetadata {
    return {
      language: 'python',
      displayName: 'Python',
      fileExtensions: ['.py'],
      icon: '🐍',
      color: '#3776ab'
    };
  }

  async detectFrameworks(workspacePath: string): Promise<Framework[]> {
    const frameworks: Framework[] = [];

    // Check for pytest
    const hasPytestIni = await this.fileExists(path.join(workspacePath, 'pytest.ini'));
    const hasPytestConfig = await this.fileExists(path.join(workspacePath, 'pyproject.toml'));
    const hasRequirements = await this.checkRequirements(workspacePath, 'pytest');

    if (hasPytestIni || hasPytestConfig || hasRequirements) {
      frameworks.push({
        name: 'pytest',
        version: await this.getPytestVersion(workspacePath),
        type: 'unit',
        configFiles: ['pytest.ini', 'pyproject.toml', 'setup.cfg'],
        testPattern: '**/test_*.py',
        runCommand: 'pytest',
        language: 'python'
      });
    }

    // Check for unittest (built-in, always available)
    const hasUnittestTests = await this.hasUnittestTests(workspacePath);
    if (hasUnittestTests) {
      frameworks.push({
        name: 'unittest',
        version: 'built-in',
        type: 'unit',
        configFiles: [],
        testPattern: '**/test_*.py',
        runCommand: 'python -m unittest discover',
        language: 'python'
      });
    }

    // Check for behave (BDD)
    const hasBehave = await this.fileExists(path.join(workspacePath, 'features'));
    const hasBehaveRequirement = await this.checkRequirements(workspacePath, 'behave');

    if (hasBehave || hasBehaveRequirement) {
      frameworks.push({
        name: 'behave',
        version: await this.getBehaveVersion(workspacePath),
        type: 'integration',
        configFiles: ['behave.ini'],
        testPattern: 'features/**/*.feature',
        runCommand: 'behave',
        language: 'python'
      });
    }

    return frameworks;
  }

  async findSourceFiles(workspacePath: string): Promise<string[]> {
    const pattern = path.join(workspacePath, '**/*.py');
    return this.findFiles(pattern, {
      ignore: [
        '**/test_*.py',
        '**/*_test.py',
        '**/tests/**',
        '**/venv/**',
        '**/env/**',
        '**/.venv/**',
        '**/__pycache__/**',
        '**/site-packages/**',
        '**/dist/**',
        '**/build/**'
      ]
    });
  }

  async findTestFiles(workspacePath: string): Promise<string[]> {
    const pattern = path.join(workspacePath, '**/test_*.py');
    return this.findFiles(pattern, {
      ignore: [
        '**/venv/**',
        '**/env/**',
        '**/.venv/**',
        '**/__pycache__/**'
      ]
    });
  }

  getTestFileForSource(sourceFile: string): string | null {
    const dir = this.getDirName(sourceFile);
    const filename = this.getBaseName(sourceFile);
    
    // user_service.py → test_user_service.py
    return path.join(dir, `test_${filename}`);
  }

  getSourceFileForTest(testFile: string): string | null {
    // test_user_service.py → user_service.py
    const filename = this.getBaseName(testFile);
    if (filename.startsWith('test_')) {
      return testFile.replace(/test_/, '');
    }
    return null;
  }

  getTestGenerationPrompt(sourceCode: string, framework: Framework): string {
    const frameworkName = framework.name;
    
    let prompt = `Generate comprehensive ${frameworkName} tests for this Python code.\n\n`;
    
    if (frameworkName === 'pytest') {
      prompt += `Use pytest's test functions and assertions.\n`;
      prompt += `Include:\n`;
      prompt += `- Fixtures for test setup with @pytest.fixture\n`;
      prompt += `- Parametrized tests with @pytest.mark.parametrize for multiple cases\n`;
      prompt += `- Use assert statements (not unittest.assertEqual)\n`;
      prompt += `- Mock external dependencies using pytest-mock or unittest.mock\n`;
      prompt += `- Test both success and error cases\n\n`;
    } else if (frameworkName === 'unittest') {
      prompt += `Use unittest.TestCase class structure.\n`;
      prompt += `Include:\n`;
      prompt += `- setUp and tearDown methods\n`;
      prompt += `- self.assertEqual, self.assertTrue, etc. assertions\n`;
      prompt += `- Mock external dependencies using unittest.mock\n`;
      prompt += `- Test both success and error cases\n\n`;
    }
    
    prompt += `Source code:\n\`\`\`python\n${sourceCode}\n\`\`\`\n\n`;
    prompt += `Generate a complete test file with proper imports and comprehensive test coverage.`;
    
    return prompt;
  }

  generateMockTemplate(className: string, framework: Framework): string {
    if (framework.name === 'pytest') {
      return `@pytest.fixture\ndef mock_${className.toLowerCase()}(mocker):\n    return mocker.Mock(spec=${className})`;
    } else if (framework.name === 'unittest') {
      return `mock_${className.toLowerCase()} = Mock(spec=${className})`;
    }
    
    return `mock_${className.toLowerCase()} = Mock()`;
  }
  
  /**
   * Recommend testing frameworks based on project type
   */
  async recommendFrameworks(projectType: ProjectType, workspacePath: string): Promise<FrameworkRecommendation[]> {
    // Get recommendations from centralized matrix
    const allRecommendations = getAllFrameworkRecommendations('python', projectType);
    
    const recommendations: FrameworkRecommendation[] = [];
    
    // Convert Map to array, filtering out what's already installed
    const installedFrameworks = await this.detectFrameworks(workspacePath);
    const installedNames = new Set(installedFrameworks.map(f => f.name.toLowerCase()));
    
    for (const [testType, recs] of allRecommendations.entries()) {
      for (const rec of recs) {
        // Only recommend if not already installed
        if (!installedNames.has(rec.framework.name.toLowerCase())) {
          recommendations.push(rec);
        }
      }
    }
    
    // Sort by priority
    return recommendations.sort((a, b) => a.priority - b.priority);
  }
  
  /**
   * Recommend test type for a specific source file
   */
  recommendTestType(sourceFile: string, projectType: ProjectType): TestTypeRecommendation[] {
    const fileName = path.basename(sourceFile).toLowerCase();
    const recommendations: TestTypeRecommendation[] = [];
    
    // Views/Routes (FastAPI/Django) → Integration tests
    if (fileName.includes('view') || fileName.includes('route') || fileName.includes('endpoint')) {
      recommendations.push({
        testType: 'integration',
        priority: 'primary',
        framework: 'pytest + httpx',
        reason: 'API endpoint - test with real HTTP client',
        outputPath: this.getOutputPath(sourceFile, 'integration', 'pytest', ''),
        runCommand: 'pytest tests/integration'
      });
    }
    // Models (Django/SQLAlchemy) → Integration tests with real DB
    else if (fileName.includes('model')) {
      recommendations.push({
        testType: 'integration',
        priority: 'primary',
        framework: 'pytest + database',
        reason: 'Data model - test with real database',
        outputPath: this.getOutputPath(sourceFile, 'integration', 'pytest', ''),
        runCommand: 'pytest tests/integration'
      });
    }
    // Services/Business Logic → Unit tests
    else if (fileName.includes('service') || fileName.includes('util') || fileName.includes('helper')) {
      recommendations.push({
        testType: 'unit',
        priority: 'primary',
        framework: 'pytest',
        reason: 'Business logic - fast isolated tests',
        outputPath: this.getTestFileForSource(sourceFile) || '',
        runCommand: 'pytest tests/unit'
      });
    }
    // Default: Unit tests
    else {
      recommendations.push({
        testType: 'unit',
        priority: 'primary',
        framework: 'pytest',
        reason: 'General Python code - unit tests',
        outputPath: this.getTestFileForSource(sourceFile) || '',
        runCommand: 'pytest'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Generate output path for test file based on test type
   */
  getOutputPath(sourceFile: string, testType: TestType, framework: string, workspacePath: string): string {
    const fileName = this.getBaseName(sourceFile);
    const testFileName = `test_${fileName}`;
    
    // Python convention: tests directory with subdirectories by type
    if (testType === 'integration') {
      return path.join('tests', 'integration', testFileName);
    } else if (testType === 'e2e') {
      return path.join('tests', 'e2e', testFileName);
    } else {
      // Unit tests in tests/unit/
      return path.join('tests', 'unit', testFileName);
    }
  }

  // Helper methods
  private async checkRequirements(workspacePath: string, packageName: string): Promise<boolean> {
    const requirementsPaths = [
      'requirements.txt',
      'requirements-dev.txt',
      'dev-requirements.txt'
    ];

    for (const reqFile of requirementsPaths) {
      const reqPath = path.join(workspacePath, reqFile);
      if (await this.fileExists(reqPath)) {
        const content = await this.readFile(reqPath);
        if (content.includes(packageName)) {
          return true;
        }
      }
    }

    // Check pyproject.toml
    const pyprojectPath = path.join(workspacePath, 'pyproject.toml');
    if (await this.fileExists(pyprojectPath)) {
      const content = await this.readFile(pyprojectPath);
      if (content.includes(packageName)) {
        return true;
      }
    }

    return false;
  }

  private async getPytestVersion(workspacePath: string): Promise<string | undefined> {
    // Try to extract from requirements.txt
    const reqPath = path.join(workspacePath, 'requirements.txt');
    if (await this.fileExists(reqPath)) {
      const content = await this.readFile(reqPath);
      const match = content.match(/pytest[=<>]+([0-9.]+)/);
      if (match) {
        return match[1];
      }
    }
    return undefined;
  }

  private async getBehaveVersion(workspacePath: string): Promise<string | undefined> {
    const reqPath = path.join(workspacePath, 'requirements.txt');
    if (await this.fileExists(reqPath)) {
      const content = await this.readFile(reqPath);
      const match = content.match(/behave[=<>]+([0-9.]+)/);
      if (match) {
        return match[1];
      }
    }
    return undefined;
  }

  private async hasUnittestTests(workspacePath: string): Promise<boolean> {
    const testFiles = await this.findTestFiles(workspacePath);
    
    for (const testFile of testFiles.slice(0, 5)) { // Check first 5 files
      const content = await this.readFile(testFile);
      if (content.includes('import unittest') || content.includes('from unittest')) {
        return true;
      }
    }
    
    return false;
  }
}

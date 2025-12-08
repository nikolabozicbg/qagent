import * as path from 'path';
import { BaseLanguageProvider } from '../base/base-language-provider';
import { Framework, LanguageMetadata, ProjectType, FrameworkRecommendation, TestType, TestTypeRecommendation } from '../base/language-provider.interface';
import { getAllFrameworkRecommendations } from '../../analysis/framework-recommendations';

export class CSharpProvider extends BaseLanguageProvider {
  getMetadata(): LanguageMetadata {
    return {
      language: 'csharp',
      displayName: 'C#',
      fileExtensions: ['.cs'],
      icon: '🔷',
      color: '#239120'
    };
  }

  async detectFrameworks(workspacePath: string): Promise<Framework[]> {
    const frameworks: Framework[] = [];
    
    // Find all .csproj files
    const csprojFiles = await this.findFiles(path.join(workspacePath, '**/*.csproj'));
    
    for (const csproj of csprojFiles) {
      const content = await this.readFile(csproj);
      
      // Check for xUnit
      if (content.includes('xunit') || content.includes('xUnit')) {
        const version = this.extractPackageVersion(content, 'xunit');
        frameworks.push({
          name: 'xUnit',
          version,
          type: 'unit',
          configFiles: [],
          testPattern: '**/*Tests.cs',
          runCommand: 'dotnet test',
          language: 'csharp'
        });
      }
      
      // Check for NUnit
      if (content.includes('NUnit')) {
        const version = this.extractPackageVersion(content, 'NUnit');
        frameworks.push({
          name: 'NUnit',
          version,
          type: 'unit',
          configFiles: [],
          testPattern: '**/*Tests.cs',
          runCommand: 'dotnet test',
          language: 'csharp'
        });
      }
      
      // Check for MSTest
      if (content.includes('MSTest')) {
        const version = this.extractPackageVersion(content, 'MSTest.TestFramework');
        frameworks.push({
          name: 'MSTest',
          version,
          type: 'unit',
          configFiles: [],
          testPattern: '**/*Tests.cs',
          runCommand: 'dotnet test',
          language: 'csharp'
        });
      }
    }
    
    // Remove duplicates
    return this.deduplicateFrameworks(frameworks);
  }

  async findSourceFiles(workspacePath: string): Promise<string[]> {
    const pattern = path.join(workspacePath, '**/*.cs');
    return this.findFiles(pattern, {
      ignore: [
        '**/*Tests.cs',
        '**/*Test.cs',
        '**/obj/**',
        '**/bin/**',
        '**/packages/**',
        '**/.vs/**'
      ]
    });
  }

  async findTestFiles(workspacePath: string): Promise<string[]> {
    const patterns = [
      path.join(workspacePath, '**/*Tests.cs'),
      path.join(workspacePath, '**/*Test.cs')
    ];
    
    const allTests: string[] = [];
    for (const pattern of patterns) {
      const tests = await this.findFiles(pattern, {
        ignore: [
          '**/obj/**',
          '**/bin/**'
        ]
      });
      allTests.push(...tests);
    }
    
    // Remove duplicates
    return [...new Set(allTests)];
  }

  getTestFileForSource(sourceFile: string): string | null {
    // UserService.cs → UserServiceTests.cs
    const withoutExt = this.removeExtension(sourceFile);
    return `${withoutExt}Tests.cs`;
  }

  getSourceFileForTest(testFile: string): string | null {
    // UserServiceTests.cs → UserService.cs
    if (testFile.endsWith('Tests.cs')) {
      return testFile.replace(/Tests\.cs$/, '.cs');
    } else if (testFile.endsWith('Test.cs')) {
      return testFile.replace(/Test\.cs$/, '.cs');
    }
    return null;
  }

  getTestGenerationPrompt(sourceCode: string, framework: Framework): string {
    const frameworkName = framework.name;
    
    let prompt = `Generate comprehensive ${frameworkName} tests for this C# code.\n\n`;
    
    if (frameworkName === 'xUnit') {
      prompt += `Use xUnit's testing attributes and patterns.\n`;
      prompt += `Include:\n`;
      prompt += `- [Fact] for simple tests\n`;
      prompt += `- [Theory] with [InlineData] for parameterized tests\n`;
      prompt += `- Assert.Equal, Assert.True, Assert.Throws for assertions\n`;
      prompt += `- Constructor for test setup (IDisposable for cleanup if needed)\n`;
      prompt += `- Mock dependencies using Moq or NSubstitute\n\n`;
    } else if (frameworkName === 'NUnit') {
      prompt += `Use NUnit's testing attributes and patterns.\n`;
      prompt += `Include:\n`;
      prompt += `- [Test] attribute for test methods\n`;
      prompt += `- [TestCase] for parameterized tests\n`;
      prompt += `- [SetUp] and [TearDown] for setup/cleanup\n`;
      prompt += `- Assert.That, Assert.AreEqual, Assert.Throws\n`;
      prompt += `- Mock dependencies using Moq or NSubstitute\n\n`;
    } else if (frameworkName === 'MSTest') {
      prompt += `Use MSTest's testing attributes and patterns.\n`;
      prompt += `Include:\n`;
      prompt += `- [TestMethod] attribute for test methods\n`;
      prompt += `- [DataRow] for parameterized tests\n`;
      prompt += `- [TestInitialize] and [TestCleanup] for setup/cleanup\n`;
      prompt += `- Assert.AreEqual, Assert.IsTrue, Assert.ThrowsException\n`;
      prompt += `- Mock dependencies using Moq\n\n`;
    }
    
    prompt += `Source code:\n\`\`\`csharp\n${sourceCode}\n\`\`\`\n\n`;
    prompt += `Generate a complete test class with proper using statements and comprehensive test coverage.`;
    
    return prompt;
  }

  generateMockTemplate(className: string, framework: Framework): string {
    // C# typically uses Moq for mocking across all frameworks
    return `var mock${className} = new Mock<${className}>();`;
  }
  
  /**
   * Recommend testing frameworks based on project type
   */
  async recommendFrameworks(projectType: ProjectType, workspacePath: string): Promise<FrameworkRecommendation[]> {
    // Get recommendations from centralized matrix
    const allRecommendations = getAllFrameworkRecommendations('csharp', projectType);
    
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
    
    // Controllers → Integration tests (primary)
    if (fileName.includes('controller')) {
      recommendations.push({
        testType: 'integration',
        priority: 'primary',
        framework: 'WebApplicationFactory',
        reason: 'API Controller - test with real HTTP pipeline',
        outputPath: this.getOutputPath(sourceFile, 'integration', 'WebApplicationFactory', ''),
        runCommand: 'dotnet test --filter "Category=Integration"'
      });
      
      // Also recommend unit tests as secondary
      recommendations.push({
        testType: 'unit',
        priority: 'secondary',
        framework: 'xUnit',
        reason: 'Controller logic - fast isolated tests',
        outputPath: this.getTestFileForSource(sourceFile) || '',
        runCommand: 'dotnet test --filter "Category=Unit"'
      });
    }
    // Services → Unit tests (primary)
    else if (fileName.includes('service')) {
      recommendations.push({
        testType: 'unit',
        priority: 'primary',
        framework: 'xUnit',
        reason: 'Business logic - fast isolated tests with mocked dependencies',
        outputPath: this.getTestFileForSource(sourceFile) || '',
        runCommand: 'dotnet test --filter "Category=Unit"'
      });
    }
    // Middleware → Integration tests
    else if (fileName.includes('middleware')) {
      recommendations.push({
        testType: 'integration',
        priority: 'primary',
        framework: 'WebApplicationFactory',
        reason: 'Middleware - test with real HTTP pipeline',
        outputPath: this.getOutputPath(sourceFile, 'integration', 'WebApplicationFactory', ''),
        runCommand: 'dotnet test --filter "Category=Integration"'
      });
    }
    // Repositories/Data Access → Integration tests
    else if (fileName.includes('repository') || fileName.includes('dbcontext')) {
      recommendations.push({
        testType: 'integration',
        priority: 'primary',
        framework: 'xUnit + Testcontainers',
        reason: 'Data access - test with real database',
        outputPath: this.getOutputPath(sourceFile, 'integration', 'xUnit', ''),
        runCommand: 'dotnet test --filter "Category=Integration"'
      });
    }
    // Default: Unit tests
    else {
      recommendations.push({
        testType: 'unit',
        priority: 'primary',
        framework: 'xUnit',
        reason: 'General C# code - unit tests with mocking',
        outputPath: this.getTestFileForSource(sourceFile) || '',
        runCommand: 'dotnet test --filter "Category=Unit"'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Generate output path for test file based on test type
   */
  getOutputPath(sourceFile: string, testType: TestType, framework: string, workspacePath: string): string {
    const withoutExt = this.removeExtension(sourceFile);
    const baseName = path.basename(withoutExt);
    
    // C# convention: separate test project
    if (testType === 'integration') {
      // ProjectName.Tests/Integration/ClassNameIntegrationTests.cs
      return `Tests/Integration/${baseName}IntegrationTests.cs`;
    } else if (testType === 'e2e') {
      return `Tests/E2E/${baseName}E2ETests.cs`;
    } else {
      // Unit tests: ProjectName.Tests/ClassNameTests.cs
      return `Tests/${baseName}Tests.cs`;
    }
  }

  // Helper methods
  private extractPackageVersion(csprojContent: string, packageName: string): string | undefined {
    const regex = new RegExp(`<PackageReference Include="${packageName}"[^>]*Version="([^"]+)"`);
    const match = csprojContent.match(regex);
    return match ? match[1] : undefined;
  }

  private deduplicateFrameworks(frameworks: Framework[]): Framework[] {
    const seen = new Set<string>();
    return frameworks.filter(fw => {
      if (seen.has(fw.name)) {
        return false;
      }
      seen.add(fw.name);
      return true;
    });
  }
}

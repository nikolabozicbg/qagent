/**
 * Test Type Matrix Tree Builder
 * 
 * Builds tree nodes for Test Type Matrix per stack (Frontend/Backend).
 * Structure:
 * 
 * 💻 FRONTEND (React + Next.js) — 22% coverage
 *   ├─ 🧪 COMPONENT TESTS (React Testing Library)
 *   │   Coverage: 27% (12/45 files)
 *   │   Framework: RTL v14 + Jest v29 ✅
 *   │   Run: npm test
 *   │   [Run All] [Generate Missing]
 *   ├─ 🌐 E2E TESTS (Playwright)
 *   │   Coverage: 0% (0/8 flows)
 *   │   Framework: ❌ Not installed
 *   │   [Install Playwright] [Setup Guide]
 */

import * as vscode from 'vscode';
import { TechnologyStack, TestTypeMatrix, FrameworkStatus } from '../types/enhanced-analysis.types';

export interface TestTypeMatrixNode {
  label: string;
  description?: string;
  tooltip?: string | vscode.MarkdownString;
  iconPath?: vscode.ThemeIcon;
  collapsibleState: vscode.TreeItemCollapsibleState;
  children?: TestTypeMatrixNode[];
  contextValue?: string;
  command?: vscode.Command;
  
  // Data fields
  stack?: TechnologyStack;
  testTypeMatrix?: TestTypeMatrix;
  filePath?: string; // For file nodes
  hasTest?: boolean; // For file nodes
  testFilePath?: string; // For file nodes
}

export class TestTypeMatrixTreeBuilder {
  
  /**
   * Build tree node for a single technology stack
   */
  buildStackNode(stack: TechnologyStack): TestTypeMatrixNode {
    const coveragePercent = Math.round(stack.coverage);
    
    // Clean label - icon handled by ThemeIcon
    const stackLabel = stack.name;
    
    // Clean description
    const stackDescription = `${coveragePercent}% • ${stack.testedCount}/${stack.fileCount} files`;
    
    // Build children (test type nodes)
    const children = stack.testTypes.map(testType => this.buildTestTypeNode(testType, stack.type, stack));
    
    return {
      label: stackLabel,
      description: stackDescription,
      tooltip: this.buildStackTooltip(stack),
      iconPath: this.getStackIcon(stack.type, coveragePercent),
      collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      children,
      contextValue: `stack-${stack.type}`,
      stack
    };
  }
  
  /**
   * Build test type node (e.g. Component Tests, Unit Tests)
   */
  private buildTestTypeNode(testType: TestTypeMatrix, stackType: string, stack?: TechnologyStack): TestTypeMatrixNode {
    const label = this.formatTestTypeLabel(testType.testType);
    
    // Calculate coverage percentage
    const coveragePercent = testType.filesTotal > 0 
      ? Math.round((testType.filesTested / testType.filesTotal) * 100)
      : 0;
    
    // Clean label with framework name
    const frameworkName = testType.framework.name;
    const fullLabel = testType.status === 'installed'
      ? `${label} (${frameworkName})`
      : label;
    
    // Modern clean description - hide 0% when no files
    let description: string;
    if (testType.status === 'installed') {
      if (testType.filesTotal === 0) {
        description = `No files • Run: ${testType.runCommand}`;
      } else {
        description = `${coveragePercent}% • ${testType.filesTested}/${testType.filesTotal} files • Run: ${testType.runCommand}`;
      }
    } else if (testType.status === 'not-configured') {
      description = `⚙ Setup required`;
    } else {
      description = `+ Add framework`;
    }
    
    // Make test type nodes expandable if they have files
    const hasFiles = testType.filesTotal > 0;
    const collapsibleState = hasFiles 
      ? vscode.TreeItemCollapsibleState.Collapsed 
      : vscode.TreeItemCollapsibleState.None;
    
    return {
      label: fullLabel,
      description,
      tooltip: this.buildTestTypeTooltip(testType),
      iconPath: this.getTestTypeIcon(testType.testType, testType.status, coveragePercent),
      collapsibleState,
      contextValue: this.getTestTypeContextValue(testType),
      testTypeMatrix: testType,
      stack // Store stack reference for file access
    };
  }
  
  /**
   * Get icon for stack type with purple theme
   */
  private getStackIcon(stackType: string, coveragePercent: number): vscode.ThemeIcon {
    // Use purple theme colors
    const color = new vscode.ThemeColor('charts.purple');
    
    switch (stackType) {
      case 'frontend':
        return new vscode.ThemeIcon('browser', color);
      case 'backend':
        return new vscode.ThemeIcon('server', color);
      default:
        return new vscode.ThemeIcon('package', color);
    }
  }
  
  /**
   * Get color based on coverage percentage - purple theme palette
   */
  private getCoverageColor(percent: number): vscode.ThemeColor {
    if (percent >= 80) return new vscode.ThemeColor('testing.iconPassed');  // Green
    if (percent >= 50) return new vscode.ThemeColor('charts.purple');        // Purple
    if (percent >= 25) return new vscode.ThemeColor('charts.blue');          // Blue
    if (percent > 0) return new vscode.ThemeColor('charts.yellow');          // Yellow
    return new vscode.ThemeColor('descriptionForeground');                   // Gray
  }
  
  /**
   * Get modern icon for test type with status-based coloring
   */
  private getTestTypeIcon(testType: string, status: string, coveragePercent: number): vscode.ThemeIcon {
    // Choose icon based on test type
    let iconName: string;
    switch (testType) {
      case 'component':
        iconName = 'symbol-misc'; // Component/puzzle piece
        break;
      case 'e2e':
        iconName = 'globe'; // E2E/browser
        break;
      case 'visual':
        iconName = 'eye'; // Visual
        break;
      case 'unit':
        iconName = 'beaker'; // Unit test
        break;
      case 'integration':
        iconName = 'git-merge'; // Integration
        break;
      case 'api':
        iconName = 'cloud'; // API
        break;
      case 'hook':
        iconName = 'pulse'; // Hook/lifecycle
        break;
      default:
        iconName = 'beaker';
    }
    
    // Color based on status and coverage
    let color: vscode.ThemeColor;
    if (status === 'missing') {
      color = new vscode.ThemeColor('disabledForeground');
    } else if (status === 'not-configured') {
      color = new vscode.ThemeColor('charts.orange');
    } else {
      color = this.getCoverageColor(coveragePercent);
    }
    
    return new vscode.ThemeIcon(iconName, color);
  }
  
  /**
   * Get framework status icon (legacy - keeping for compatibility)
   */
  private getFrameworkStatusIcon(status: FrameworkStatus): vscode.ThemeIcon {
    switch (status) {
      case 'installed':
        return new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
      case 'not-configured':
        return new vscode.ThemeIcon('gear', new vscode.ThemeColor('charts.orange'));
      case 'missing':
        return new vscode.ThemeIcon('add', new vscode.ThemeColor('disabledForeground'));
      case 'deprecated':
        return new vscode.ThemeIcon('warning', new vscode.ThemeColor('testing.iconFailed'));
      default:
        return new vscode.ThemeIcon('circle-outline');
    }
  }
  
  /**
   * Format test type label (capitalize, E2E stays E2E)
   */
  private formatTestTypeLabel(testType: string): string {
    const labelMap: Record<string, string> = {
      'component': 'Component Tests',
      'e2e': 'E2E Tests',
      'visual': 'Visual Tests',
      'unit': 'Unit Tests',
      'integration': 'Integration Tests',
      'api': 'API Tests',
      'hook': 'Hook Tests'
    };
    return labelMap[testType] || testType;
  }
  
  /**
   * Progress bar removed - using colored icons instead
   */
  private getMiniProgressBar(percent: number): string {
    return ''; // Removed - cleaner without text progress bars
  }
  
  /**
   * Legacy progress bar (kept for compatibility)
   */
  private getProgressBar(percent: number): string {
    return '';
  }
  
  /**
   * Build stack tooltip
   */
  private buildStackTooltip(stack: TechnologyStack): vscode.MarkdownString {
    const coveragePercent = Math.round(stack.coverage);
    const techList = stack.technologies.map(t => `- ${t.displayName}`).join('\n');
    
    const md = new vscode.MarkdownString(
      `**${stack.name} Stack**\n\n` +
      `Type: ${stack.type}\n` +
      `Coverage: ${coveragePercent}%\n\n` +
      `**Technologies:**\n${techList}\n\n` +
      `---\n\n` +
      `Files analyzed: ${stack.fileCount}\n` +
      `Files with tests: ${stack.testedCount}\n` +
      `Files without tests: ${stack.fileCount - stack.testedCount}\n\n` +
      `Expand to view test types`
    );
    md.supportHtml = true;
    return md;
  }
  
  /**
   * Build test type tooltip
   */
  private buildTestTypeTooltip(testType: TestTypeMatrix): vscode.MarkdownString {
    const label = this.formatTestTypeLabel(testType.testType);
    const coveragePercent = testType.filesTotal > 0 
      ? Math.round((testType.filesTested / testType.filesTotal) * 100)
      : 0;
    
    let content = `**${label}**\n\n`;
    
    // Framework info
    content += `**Framework:** ${testType.framework.name}`;
    if (testType.framework.version) {
      content += ` v${testType.framework.version}`;
    }
    content += `\n`;
    content += `**Status:** ${this.getStatusText(testType.status)}\n\n`;
    
    // Coverage info
    if (testType.status === 'installed') {
      content += `**Coverage:** ${coveragePercent}%\n`;
      content += `Files with tests: ${testType.filesTested}\n`;
      content += `Files without tests: ${testType.filesUntested}\n`;
      content += `Total files: ${testType.filesTotal}\n\n`;
      content += `---\n\n`;
      content += `**Run command:** \`${testType.runCommand}\`\n`;
      content += `**Output:** \`${testType.outputPath}\`\n\n`;
    } else {
      content += `**Reason:** ${testType.framework.reason}\n\n`;
      if (testType.framework.marketShare) {
        content += `**Market share:** ${testType.framework.marketShare}%\n`;
      }
      content += `---\n\n`;
      if (testType.framework.installCommand) {
        content += `**Install:**\n\`\`\`bash\n${testType.framework.installCommand}\n\`\`\`\n\n`;
      }
      if (testType.framework.setupGuide) {
        content += `[Setup Guide](${testType.framework.setupGuide})\n`;
      }
    }
    
    const md = new vscode.MarkdownString(content);
    md.supportHtml = true;
    md.isTrusted = true;
    return md;
  }
  
  /**
   * Get status text
   */
  private getStatusText(status: FrameworkStatus): string {
    switch (status) {
      case 'installed':
        return '✅ Installed';
      case 'not-configured':
        return '⚠️ Not configured';
      case 'missing':
        return '❌ Not installed';
      case 'deprecated':
        return '⚠️ Deprecated';
      default:
        return status;
    }
  }
  
  /**
   * Get context value for test type (used for commands)
   */
  private getTestTypeContextValue(testType: TestTypeMatrix): string {
    const baseContext = `testType-${testType.testType}`;
    if (testType.status === 'installed') {
      return `${baseContext}-installed`;
    } else if (testType.status === 'not-configured') {
      return `${baseContext}-notConfigured`;
    } else {
      return `${baseContext}-missing`;
    }
  }
  
  /**
   * Build file children for a test type node
   */
  buildFileChildren(testType: TestTypeMatrix, scannedFiles: any[]): TestTypeMatrixNode[] {
    const children: TestTypeMatrixNode[] = [];
    
    // Filter files for this test type
    const filesForType = scannedFiles.filter(file => {
      // Determine if file belongs to this test type
      if (testType.testType === 'component' && file.type === 'component') return true;
      if (testType.testType === 'hook' && file.type === 'hook') return true;
      if (testType.testType === 'e2e' && file.type === 'page') return true;
      if (testType.testType === 'unit' && (file.type === 'service' || file.type === 'util')) return true;
      if (testType.testType === 'integration' && file.type === 'controller') return true;
      return false;
    });
    
    if (filesForType.length === 0) {
      return children;
    }
    
    // Separate tested and untested files
    const testedFiles = filesForType.filter(f => f.hasTest);
    const untestedFiles = filesForType.filter(f => !f.hasTest);
    
    // Add "Untested Files" section (expanded by default)
    if (untestedFiles.length > 0) {
      const untestedSection: TestTypeMatrixNode = {
        label: `Needs Tests`,
        description: `${untestedFiles.length} files`,
        iconPath: new vscode.ThemeIcon('circle-large-outline', new vscode.ThemeColor('charts.yellow')),
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        contextValue: 'untestedFilesSection',
        children: untestedFiles.map(file => this.buildFileNode(file, false, testType)),
        testTypeMatrix: testType
      };
      children.push(untestedSection);
    }
    
    // Add "Tested Files" section (collapsed by default)
    if (testedFiles.length > 0) {
      const testedSection: TestTypeMatrixNode = {
        label: `Covered`,
        description: `${testedFiles.length} files`,
        iconPath: new vscode.ThemeIcon('pass-filled', new vscode.ThemeColor('testing.iconPassed')),
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        contextValue: 'testedFilesSection',
        children: testedFiles.map(file => this.buildFileNode(file, true, testType)),
        testTypeMatrix: testType
      };
      children.push(testedSection);
    }
    
    return children;
  }
  
  /**
   * Build individual file node with modern styling
   */
  private buildFileNode(file: any, hasTest: boolean, testTypeMatrix?: TestTypeMatrix): TestTypeMatrixNode {
    const fileName = file.relativePath.split('/').pop() || file.relativePath;
    const dirPath = file.relativePath.replace(fileName, '').replace(/\/$/, '');
    
    // Softer colors - gray for untested instead of red
    const icon = hasTest ? 'pass' : 'circle-outline';
    const iconColor = hasTest 
      ? new vscode.ThemeColor('testing.iconPassed')
      : new vscode.ThemeColor('descriptionForeground');  // Gray instead of red
    
    return {
      label: fileName,
      description: dirPath,
      tooltip: this.buildFileTooltip(file, hasTest),
      iconPath: new vscode.ThemeIcon(icon, iconColor),
      collapsibleState: vscode.TreeItemCollapsibleState.None,
      contextValue: hasTest ? 'fileWithTest' : 'fileWithoutTest',
      command: {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [vscode.Uri.file(file.path)]
      },
      filePath: file.path,
      hasTest,
      testFilePath: file.testFilePath,
      testTypeMatrix
    };
  }
  
  /**
   * Build file tooltip
   */
  private buildFileTooltip(file: any, hasTest: boolean): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**${file.relativePath}**\n\n`);
    md.appendMarkdown(`Type: ${file.type}\n`);
    md.appendMarkdown(`Language: ${file.language}\n\n`);
    
    if (hasTest && file.testFilePath) {
      md.appendMarkdown(`**Test File:** ✅\n`);
      md.appendMarkdown(`\`${file.testFilePath.split('/').pop()}\`\n\n`);
      md.appendMarkdown(`[Open Test File](command:vscode.open?${encodeURIComponent(JSON.stringify([vscode.Uri.file(file.testFilePath)]))})`);
    } else {
      md.appendMarkdown(`**Status:** ❌ No test file\n\n`);
      md.appendMarkdown(`Click to generate test`);
    }
    
    md.isTrusted = true;
    return md;
  }
}

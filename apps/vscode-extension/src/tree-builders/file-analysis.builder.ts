/**
 * File Analysis Tree Builder
 * 
 * Builds tree nodes for file-level analysis.
 * Shows: prioritized list of files with test recommendations.
 */

import * as vscode from 'vscode';
import { FileAnalysis, AnalysisSummary, TestTypeRecommendation } from '../types/enhanced-analysis.types';

export interface FileAnalysisNode {
  label: string;
  description?: string;
  tooltip?: string;
  iconPath?: vscode.ThemeIcon;
  collapsibleState: vscode.TreeItemCollapsibleState;
  children?: FileAnalysisNode[];
  contextValue?: string;
  filePath?: string;
  recommendation?: TestTypeRecommendation;
}

export class FileAnalysisBuilder {
  private readonly MAX_FILES_TO_SHOW = 50;

  /**
   * Build file analysis section
   * 
   * Structure:
   * 🔴 NO TESTS (72 files)
   *   ├─ Controllers/UserController.cs (Priority: 10)
   *   │  └─ 💡 Integration test recommended
   *   ├─ Services/AuthService.cs (Priority: 9)
   *   │  └─ 💡 Unit test recommended
   *   └─ ... (22 more)
   * 
   * ✅ TESTED (2 files)
   *   └─ Services/ConfigService.cs
   */
  build(summary: AnalysisSummary, fileAnalysis: FileAnalysis[]): FileAnalysisNode {
    const children: FileAnalysisNode[] = [];

    // Sort files by priority (high to low), then by hasTest (false first)
    const sortedFiles = [...fileAnalysis].sort((a, b) => {
      if (a.hasTest !== b.hasTest) {
        return a.hasTest ? 1 : -1; // Untested first
      }
      // Priority is high|medium|low, convert to numbers
      const priorityToNumber = (p: string) => p === 'high' ? 3 : p === 'medium' ? 2 : 1;
      return priorityToNumber(b.priority) - priorityToNumber(a.priority);
    });

    // Split into tested and untested
    const untestedFiles = sortedFiles.filter(f => !f.hasTest);
    const testedFiles = sortedFiles.filter(f => f.hasTest);

    // Build untested section (collapsed if many files)
    if (untestedFiles.length > 0) {
      children.push(this.buildUntestedSection(untestedFiles, summary.untestedFiles));
    }

    // Build tested section
    if (testedFiles.length > 0) {
      children.push(this.buildTestedSection(testedFiles, summary.testedFiles));
    }

    return {
      label: 'File Analysis',
      description: `${summary.untestedFiles} without tests • ${summary.testedFiles} tested`,
      iconPath: new vscode.ThemeIcon('file-code', new vscode.ThemeColor('charts.green')),
      collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      children,
      contextValue: 'fileAnalysis'
    };
  }

  private buildUntestedSection(files: FileAnalysis[], totalCount: number): FileAnalysisNode {
    const children: FileAnalysisNode[] = [];
    const filesToShow = Math.min(files.length, this.MAX_FILES_TO_SHOW);

    // Show top priority files
    for (let i = 0; i < filesToShow; i++) {
      children.push(this.buildFileNode(files[i]));
    }

    // Add "show more" indicator if there are more files
    if (files.length > this.MAX_FILES_TO_SHOW) {
      children.push({
        label: `... ${files.length - this.MAX_FILES_TO_SHOW} more files`,
        iconPath: new vscode.ThemeIcon('ellipsis'),
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        contextValue: 'moreFiles'
      });
    }

    return {
      label: 'Files Without Tests',
      description: `${totalCount} file${totalCount !== 1 ? 's' : ''}`,
      iconPath: new vscode.ThemeIcon('error', 
        new vscode.ThemeColor('testing.iconFailed')),
      collapsibleState: files.length > 10 
        ? vscode.TreeItemCollapsibleState.Collapsed 
        : vscode.TreeItemCollapsibleState.Expanded,
      children,
      contextValue: 'untestedFiles'
    };
  }

  private buildTestedSection(files: FileAnalysis[], totalCount: number): FileAnalysisNode {
    const children: FileAnalysisNode[] = [];
    const filesToShow = Math.min(files.length, this.MAX_FILES_TO_SHOW);

    // Show tested files
    for (let i = 0; i < filesToShow; i++) {
      children.push(this.buildFileNode(files[i]));
    }

    // Add "show more" indicator if there are more files
    if (files.length > this.MAX_FILES_TO_SHOW) {
      children.push({
        label: `... ${files.length - this.MAX_FILES_TO_SHOW} more files`,
        iconPath: new vscode.ThemeIcon('ellipsis'),
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        contextValue: 'moreFiles'
      });
    }

    return {
      label: 'Files With Tests',
      description: `${totalCount} file${totalCount !== 1 ? 's' : ''}`,
      iconPath: new vscode.ThemeIcon('pass-filled', 
        new vscode.ThemeColor('testing.iconPassed')),
      collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
      children,
      contextValue: 'testedFiles'
    };
  }

  private buildFileNode(file: FileAnalysis): FileAnalysisNode {
    const children: FileAnalysisNode[] = [];
    const fileName = this.getFileName(file.path);
    const layerBadge = this.getLayerBadge(file.path);

    // Add ALL recommendations if available
    if (file.recommendations && file.recommendations.length > 0) {
      for (let i = 0; i < file.recommendations.length; i++) {
        const rec = file.recommendations[i];
        const isPrimary = rec.priority === 'primary';
        const { icon, badge } = this.getRecommendationStyle(rec.priority);
        
        // Build description with output path visible inline
        const outputPathShort = rec.outputPath 
          ? this.shortenPath(rec.outputPath) 
          : '';
        const description = outputPathShort 
          ? `${badge} → ${outputPathShort}`
          : badge;
        
        // VISION: Add "BEST" label for primary recommendation
        const testTypeLabel = `${rec.testType.charAt(0).toUpperCase() + rec.testType.slice(1)} test`;
        const label = isPrimary
          ? `${testTypeLabel} • ${rec.framework} • BEST`
          : `${testTypeLabel} • ${rec.framework}`;
        
        // VISION: Star icon for primary (BEST) recommendation
        const iconName = isPrimary ? 'star-full' : icon;
        const iconColor = isPrimary 
          ? new vscode.ThemeColor('charts.yellow')
          : this.getRecommendationColor(rec.priority);
        
        children.push({
          label,
          description,
          tooltip: this.buildRecommendationTooltipFromRec(rec),
          iconPath: new vscode.ThemeIcon(iconName, iconColor),
          collapsibleState: vscode.TreeItemCollapsibleState.None,
          contextValue: 'testTypeRecommendation',
          recommendation: rec,
          filePath: file.path  // IMPORTANT: pass parent file path!
        });
      }
    } else if (file.recommendedTestType) {
      // Fallback for backward compatibility
      const outputPathShort = file.outputPath 
        ? this.shortenPath(file.outputPath)
        : '';
      const description = outputPathShort
        ? `${file.reason} → ${outputPathShort}`
        : file.reason;
      
      children.push({
        label: `${file.recommendedTestType} test recommended`,
        description,
        tooltip: this.buildRecommendationTooltip(file),
        iconPath: new vscode.ThemeIcon('light-bulb'),
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        contextValue: 'recommendation'
      });
    }

    // VISION: Add Risk indicator (Risk-First Proactivity)
    let riskIndicator = '';
    if (!file.hasTest) {
      if (file.priority === 'critical') riskIndicator = '🔴 ';
      else if (file.priority === 'high') riskIndicator = '🟠 ';
    }

    // VISION: Add layer badge to label
    const labelWithBadge = `${riskIndicator}${layerBadge} ${fileName}`;
    
    return {
      label: labelWithBadge,
      description: file.hasTest 
        ? `Tested • ${file.linesOfCode || 0} LOC` 
        : `${this.getPriorityLabel(file.priority)} priority • ${file.linesOfCode || 0} LOC`,
      tooltip: this.buildFileTooltip(file),
      iconPath: this.getFileIcon(file),
      collapsibleState: children.length > 0 
        ? vscode.TreeItemCollapsibleState.Collapsed 
        : vscode.TreeItemCollapsibleState.None,
      children: children.length > 0 ? children : undefined,
      contextValue: file.hasTest ? 'fileWithTest' : 'fileWithoutTest',
      filePath: file.path
    };
  }

  private getFileName(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    return parts[parts.length - 1] || filePath;
  }

  private getFileIcon(file: FileAnalysis): vscode.ThemeIcon {
    if (file.hasTest) {
      return new vscode.ThemeIcon('pass-filled', 
        new vscode.ThemeColor('testing.iconPassed'));
    }
    
    // Priority-based icons for untested files
    const priority = file.priority;
    if (priority === 'high') {
      return new vscode.ThemeIcon('warning', 
        new vscode.ThemeColor('testing.iconFailed'));
    } else if (priority === 'medium') {
      return new vscode.ThemeIcon('circle-large-outline', 
        new vscode.ThemeColor('charts.orange'));
    }
    
    return new vscode.ThemeIcon('circle-outline');
  }

  private buildFileTooltip(file: FileAnalysis): string {
    const lines = [
      `File: ${file.path}`,
      '',
      `Has Test: ${file.hasTest ? 'Yes ✓' : 'No'}`,
      `Priority: ${file.priority}`
    ];

    if (file.recommendedTestType) {
      lines.push('');
      lines.push('Recommendation:');
      lines.push(`  Test Type: ${file.recommendedTestType}`);
      lines.push(`  Framework: ${file.recommendedFramework}`);
      lines.push(`  Reason: ${file.reason}`);
      
      if (file.outputPath) {
        lines.push(`  Output Path: ${file.outputPath}`);
      }
    }

    return lines.join('\n');
  }

  private buildRecommendationTooltip(file: FileAnalysis): string {
    if (!file.recommendedTestType) {
      return '';
    }

    const lines = [
      `Recommended Test Type: ${file.recommendedTestType}`,
      `Framework: ${file.recommendedFramework}`,
      '',
      `Reason: ${file.reason}`
    ];

    if (file.outputPath) {
      lines.push('');
      lines.push(`Output path:`);
      lines.push(file.outputPath);
    }

    return lines.join('\n');
  }

  private buildRecommendationTooltipFromRec(rec: TestTypeRecommendation): string {
    const lines = [
      `**${rec.testType.toUpperCase()} Test Recommendation**`,
      '',
      `Test Type: ${rec.testType}`,
      `Framework: ${rec.framework}`,
      `Priority: ${rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)}`,
      '',
      'Reason:',
      rec.reason
    ];

    if (rec.outputPath) {
      lines.push('');
      lines.push(`Output path: ${rec.outputPath}`);
    }

    if (rec.runCommand) {
      lines.push(`Run command: ${rec.runCommand}`);
    }

    lines.push('');
    lines.push('Click to generate test with AI');

    return lines.join('\n');
  }

  // ===== HELPER FUNCTIONS =====

  /**
   * Get priority label
   */
  private getPriorityLabel(priority: string): string {
    const labelMap: Record<string, string> = {
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low'
    };
    return labelMap[priority] || priority;
  }

  /**
   * Get layer badge based on file path (VISION heuristics)
   * TODO: Replace with backend layer detection when available
   */
  private getLayerBadge(filePath: string): string {
    const lowerPath = filePath.toLowerCase();
    
    // API Layer - controllers, routes, endpoints, services (backend)
    if (lowerPath.includes('controller') || 
        lowerPath.includes('route') || 
        lowerPath.includes('endpoint') ||
        (lowerPath.includes('service') && !lowerPath.includes('component')) ||
        lowerPath.includes('/api/')) {
      return '🌐'; // Globe - API
    }
    
    // Database Layer - repositories, models, entities, migrations
    if (lowerPath.includes('repository') || 
        lowerPath.includes('database') || 
        lowerPath.includes('model') ||
        lowerPath.includes('entity') ||
        lowerPath.includes('migration') ||
        lowerPath.includes('schema')) {
      return '🗄️'; // File cabinet - Database
    }
    
    // UI Layer - components, views, pages (frontend)
    if (lowerPath.includes('component') || 
        lowerPath.includes('view') || 
        lowerPath.includes('page') ||
        lowerPath.includes('ui/') ||
        lowerPath.includes('.tsx') ||
        lowerPath.includes('.jsx')) {
      return '🎨'; // Palette - UI
    }
    
    // Infrastructure - config, middleware, utils
    if (lowerPath.includes('config') ||
        lowerPath.includes('middleware') ||
        lowerPath.includes('infrastructure') ||
        lowerPath.includes('util')) {
      return '🏭'; // Building - Infrastructure
    }
    
    // Default - generic code file
    return '📝'; // Memo - Generic
  }

  /**
   * Shorten file path for inline display
   * Examples:
   * - "tests/api/payment-service.test.ts" -> "tests/api/payment-service.test.ts"
   * - "src/very/long/path/to/file/test.ts" -> "...long/path/to/file/test.ts"
   */
  private shortenPath(fullPath: string): string {
    const MAX_LENGTH = 40;
    
    if (fullPath.length <= MAX_LENGTH) {
      return fullPath;
    }
    
    // Take last 40 characters with ellipsis
    return '...' + fullPath.slice(-MAX_LENGTH);
  }

  /**
   * Get recommendation style based on priority
   */
  private getRecommendationStyle(priority: string): { icon: string; badge: string } {
    const styles: Record<string, { icon: string; badge: string }> = {
      'primary': {
        icon: 'star-full',
        badge: 'Recommended'
      },
      'secondary': {
        icon: 'lightbulb',
        badge: 'Alternative'
      },
      'optional': {
        icon: 'circle-outline',
        badge: 'Optional'
      }
    };
    return styles[priority] || styles['optional'];
  }

  /**
   * Get color for recommendation icon
   */
  private getRecommendationColor(priority: string): vscode.ThemeColor | undefined {
    const colorMap: Record<string, string> = {
      'primary': 'charts.yellow',
      'secondary': 'charts.blue',
      'optional': 'descriptionForeground'
    };
    const color = colorMap[priority];
    return color ? new vscode.ThemeColor(color) : undefined;
  }

}

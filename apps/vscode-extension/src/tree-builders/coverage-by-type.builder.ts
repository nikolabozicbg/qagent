/**
 * Coverage By Type Tree Builder
 * 
 * Builds tree nodes for coverage breakdown by test type.
 * Shows: Unit, Integration, E2E, Component coverage percentages.
 */

import * as vscode from 'vscode';
import { CoverageByType, TestTypeCoverage } from '../types/enhanced-analysis.types';

export interface CoverageByTypeNode {
  label: string;
  description?: string;
  tooltip?: string;
  iconPath?: vscode.ThemeIcon;
  collapsibleState: vscode.TreeItemCollapsibleState;
  children?: CoverageByTypeNode[];
  contextValue?: string;
}

export class CoverageByTypeBuilder {
  /**
   * Build coverage by type section
   * 
   * Structure:
   * 📊 COVERAGE BY TYPE
   *   ├─ Unit: 2% (2/95) ✅
   *   ├─ Integration: 0% (0/27) ❌
   *   ├─ E2E: 0% (0/3) ❌
   *   └─ Component: N/A
   */
  build(coverageByType: CoverageByType): CoverageByTypeNode {
    const children: CoverageByTypeNode[] = [];

    // Always show these types in order
    const typeOrder: Array<keyof CoverageByType> = ['unit', 'integration', 'e2e', 'component'];

    for (const type of typeOrder) {
      const coverage = coverageByType[type];
      if (coverage) {
        children.push(this.buildCoverageNode(type, coverage));
      }
    }

    return {
      label: 'Coverage by Test Type',
      description: this.buildOverallDescription(coverageByType),
      iconPath: new vscode.ThemeIcon('graph-line', new vscode.ThemeColor('charts.blue')),
      collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      children,
      contextValue: 'coverageByType'
    };
  }
  private buildCoverageNode(type: string, coverage: TestTypeCoverage): CoverageByTypeNode {
    const percentage = this.calculatePercentage(coverage.filesTested, coverage.filesTotal);
    const label = this.formatTypeLabel(type);
    const icon = this.getTestTypeIcon(type, coverage.installed);
    const statusIcon = this.getStatusIcon(percentage, coverage.installed);
    
    // VISION-compliant: Label with progress bar
    const labelWithProgressBar = coverage.installed
      ? `${label}  ${this.getProgressBar(percentage)}`
      : label;
    
    // Clean, professional description
    const description = coverage.installed 
      ? `${coverage.filesTested}/${coverage.filesTotal} files`
      : `Not configured • ${coverage.filesTotal} files`;

    return {
      label: labelWithProgressBar,
      description,
      tooltip: this.buildCoverageTooltip(type, coverage, percentage),
      iconPath: statusIcon,
      collapsibleState: vscode.TreeItemCollapsibleState.None,
      contextValue: `coverage-${type}`
    };
  }

  /**
   * Generate visual progress bar (VISION format)
   * Example: "60% ████████░░"
   */
  private getProgressBar(percent: number): string {
    const totalBlocks = 10;
    const filledBlocks = Math.round((percent / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    
    const filled = '█'.repeat(filledBlocks);
    const empty = '░'.repeat(emptyBlocks);
    
    return `${percent}% ${filled}${empty}`;
  }

  private calculatePercentage(tested: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((tested / total) * 100);
  }

  private getStatusIcon(percentage: number, isInstalled: boolean): vscode.ThemeIcon {
    if (!isInstalled) {
      return new vscode.ThemeIcon('circle-outline', 
        new vscode.ThemeColor('descriptionForeground'));
    }
    
    // Use proper VS Code testing icons
    if (percentage >= 80) {
      return new vscode.ThemeIcon('pass-filled', 
        new vscode.ThemeColor('testing.iconPassed'));
    } else if (percentage >= 50) {
      return new vscode.ThemeIcon('circle-filled', 
        new vscode.ThemeColor('charts.yellow'));
    } else if (percentage > 0) {
      return new vscode.ThemeIcon('warning', 
        new vscode.ThemeColor('charts.orange'));
    } else {
      return new vscode.ThemeIcon('error', 
        new vscode.ThemeColor('testing.iconFailed'));
    }
  }

  /**
   * Get appropriate icon for test type
   */
  private getTestTypeIcon(type: string, isInstalled: boolean): string {
    const iconMap: Record<string, string> = {
      'unit': 'beaker',
      'integration': 'git-merge',
      'e2e': 'browser',
      'component': 'symbol-class'
    };
    return iconMap[type] || 'beaker';
  }

  private formatTypeLabel(type: string): string {
    // Capitalize first letter, keep rest as-is (E2E stays E2E)
    if (type === 'e2e') {
      return 'E2E';
    }
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  private buildCoverageTooltip(type: string, coverage: TestTypeCoverage, percentage: number): string {
    const label = this.formatTypeLabel(type);
    const statusText = this.getStatusText(percentage, coverage.installed);
    
    const lines = [
      `**${label} Test Coverage**`,
      '',
      `Status: ${statusText}`,
      `Coverage: ${percentage}%`,
      '',
      `Files with tests: ${coverage.filesTested}`,
      `Files without tests: ${coverage.filesUntested}`,
      `Total testable files: ${coverage.filesTotal}`,
    ];

    if (!coverage.installed) {
      lines.push('');
      lines.push('Framework not configured');
      lines.push('Check Testing Setup section for recommendations');
    } else {
      lines.push('');
      lines.push('Right-click to run tests');
    }

    return lines.join('\n');
  }

  /**
   * Get human-readable status text
   */
  private getStatusText(percentage: number, installed: boolean): string {
    if (!installed) return 'Not configured';
    if (percentage >= 80) return 'Excellent';
    if (percentage >= 50) return 'Good';
    if (percentage > 0) return 'Needs improvement';
    return 'No coverage';
  }

  private buildOverallDescription(coverageByType: CoverageByType): string {
    // Calculate overall coverage across all types
    let totalTested = 0;
    let totalFiles = 0;

    const types: Array<keyof CoverageByType> = ['unit', 'integration', 'e2e', 'component'];
    for (const type of types) {
      const coverage = coverageByType[type];
      if (coverage) {
        totalTested += coverage.filesTested;
        totalFiles += coverage.filesTotal;
      }
    }

    if (totalFiles === 0) {
      return 'No files to analyze';
    }

    const percentage = Math.round((totalTested / totalFiles) * 100);
    return `${percentage}% • ${totalTested}/${totalFiles} files covered`;
  }

}

/**
 * Status Bar Service
 * 
 * Manages status bar item showing coverage percentage and gaps.
 * Provides quick access to actions from status bar.
 */

import * as vscode from 'vscode';
import { AnalysisReport } from '../coverageTreeProvider';

export class StatusBarService {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    // Create status bar item (left side, high priority)
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBarItem.command = 'qagenai.showCoverageView';
  }

  /**
   * Update status bar with coverage information
   */
  updateCoverage(report: AnalysisReport | null): void {
    if (!report) {
      this.hide();
      return;
    }

    const { coveragePercent, untestedFiles, testedFiles, totalFiles } = report;
    const gaps = untestedFiles;
    
    // Determine icon and color based on coverage
    const { icon, color } = this.getCoverageStatus(coveragePercent);
    
    // Build status text
    const statusText = gaps > 0 
      ? `${icon} ${coveragePercent}% | ${gaps} gaps`
      : `${icon} ${coveragePercent}%`;
    
    this.statusBarItem.text = statusText;
    this.statusBarItem.tooltip = this.buildTooltip(report);
    this.statusBarItem.backgroundColor = color;
    
    this.show();
  }

  /**
   * Show analyzing state
   */
  showAnalyzing(): void {
    this.statusBarItem.text = '$(sync~spin) Analyzing...';
    this.statusBarItem.tooltip = 'QAgenAI is analyzing your workspace';
    this.statusBarItem.backgroundColor = undefined;
    this.show();
  }

  /**
   * Show generating state
   */
  showGenerating(fileName: string): void {
    this.statusBarItem.text = `$(gear~spin) Generating test for ${fileName}`;
    this.statusBarItem.tooltip = 'QAgenAI is generating tests';
    this.statusBarItem.backgroundColor = undefined;
    this.show();
  }

  /**
   * Show running tests state
   */
  showRunningTests(count: number): void {
    this.statusBarItem.text = `$(debug-start) Running ${count} tests...`;
    this.statusBarItem.tooltip = 'QAgenAI is executing tests';
    this.statusBarItem.backgroundColor = undefined;
    this.show();
  }

  /**
   * Show test results (temporary, 5 seconds)
   */
  showTestResults(passed: number, failed: number): void {
    const icon = failed > 0 ? '$(error)' : '$(pass)';
    const color = failed > 0 
      ? new vscode.ThemeColor('statusBarItem.errorBackground')
      : new vscode.ThemeColor('statusBarItem.warningBackground');
    
    this.statusBarItem.text = `${icon} ${passed} passed, ${failed} failed`;
    this.statusBarItem.tooltip = 'Click to view test results';
    this.statusBarItem.backgroundColor = color;
    this.show();

    // Reset to coverage after 5 seconds
    setTimeout(() => {
      this.statusBarItem.backgroundColor = undefined;
    }, 5000);
  }

  /**
   * Show celebration for milestone (80%+ coverage)
   */
  showMilestone(percentage: number): void {
    this.statusBarItem.text = `$(pass-filled) ${percentage}% coverage!`;
    this.statusBarItem.tooltip = `Excellent coverage! Keep up the great work!`;
    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    this.show();

    // Reset after 3 seconds
    setTimeout(() => {
      this.statusBarItem.backgroundColor = undefined;
    }, 3000);
  }

  /**
   * Get coverage status icon and color
   */
  private getCoverageStatus(percentage: number): { icon: string; color: vscode.ThemeColor | undefined } {
    if (percentage >= 80) {
      return {
        icon: '$(pass-filled)',
        color: undefined // Green (default success)
      };
    } else if (percentage >= 60) {
      return {
        icon: '$(circle-filled)',
        color: undefined // Blue (default)
      };
    } else if (percentage >= 40) {
      return {
        icon: '$(warning)',
        color: new vscode.ThemeColor('statusBarItem.warningBackground') // Orange
      };
    } else {
      return {
        icon: '$(error)',
        color: new vscode.ThemeColor('statusBarItem.errorBackground') // Red
      };
    }
  }

  /**
   * Build tooltip with coverage details
   */
  private buildTooltip(report: AnalysisReport): vscode.MarkdownString {
    const { coveragePercent, testedFiles, untestedFiles, totalFiles } = report;
    const status = this.getCoverageStatusText(coveragePercent);
    
    const tooltip = new vscode.MarkdownString();
    tooltip.appendMarkdown(`**QAgenAI Test Coverage**\n\n`);
    tooltip.appendMarkdown(`Status: ${status} (${coveragePercent}%)\n\n`);
    tooltip.appendMarkdown(`Files with tests: ${testedFiles}\n`);
    tooltip.appendMarkdown(`Files without tests: ${untestedFiles}\n`);
    tooltip.appendMarkdown(`Total files: ${totalFiles}\n\n`);
    tooltip.appendMarkdown(`---\n\n`);
    tooltip.appendMarkdown(`Click to open Coverage View`);
    tooltip.isTrusted = true;
    
    return tooltip;
  }

  /**
   * Get human-readable coverage status
   */
  private getCoverageStatusText(percentage: number): string {
    if (percentage >= 80) return 'Excellent';
    if (percentage >= 60) return 'Good';
    if (percentage >= 40) return 'Fair';
    if (percentage >= 20) return 'Needs improvement';
    return 'Poor';
  }

  /**
   * Show status bar item
   */
  show(): void {
    this.statusBarItem.show();
  }

  /**
   * Hide status bar item
   */
  hide(): void {
    this.statusBarItem.hide();
  }

  /**
   * Dispose status bar item
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }
}

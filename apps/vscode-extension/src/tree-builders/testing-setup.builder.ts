/**
 * Testing Setup Tree Builder
 * 
 * Builds tree nodes for testing setup section.
 * Shows: installed frameworks, recommended frameworks.
 */

import * as vscode from 'vscode';
import { TestingSetup } from '../types/enhanced-analysis.types';

export interface TestingSetupNode {
  label: string;
  description?: string;
  tooltip?: string;
  iconPath?: vscode.ThemeIcon;
  collapsibleState: vscode.TreeItemCollapsibleState;
  children?: TestingSetupNode[];
  contextValue?: string;
  frameworkInfo?: {
    name: string;
    type: string;
    packages: string[];
    reason: string;
  };
}

export class TestingSetupBuilder {
  /**
   * Build testing setup section
   * 
   * Structure:
   * 🛠️ TESTING SETUP
   *   ├─ ✅ Installed
   *   │  └─ xUnit v2.9.3 (Unit)
   *   └─ 💡 Recommended
   *      ├─ WebApplicationFactory (Integration)
   *      └─ Playwright (E2E)
   */
  build(testingSetup: TestingSetup): TestingSetupNode {
    const children: TestingSetupNode[] = [];

    // Installed frameworks section
    const installedNode = this.buildInstalledSection(testingSetup.installed);
    children.push(installedNode);

    // Recommended frameworks section
    const recommendedNode = this.buildRecommendedSection(testingSetup.recommended);
    children.push(recommendedNode);

    return {
      label: 'Testing Setup',
      description: testingSetup.installed.length > 0 
        ? `${testingSetup.installed.length} framework${testingSetup.installed.length !== 1 ? 's' : ''} configured`
        : 'Configuration needed',
      iconPath: new vscode.ThemeIcon('tools', new vscode.ThemeColor('charts.purple')),
      collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      children,
      contextValue: 'testingSetup'
    };
  }

  private buildInstalledSection(installed: any[]): TestingSetupNode {
    const children: TestingSetupNode[] = [];

    if (installed.length === 0) {
      children.push({
        label: 'No frameworks installed',
        iconPath: new vscode.ThemeIcon('warning'),
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        contextValue: 'empty'
      });
    } else {
      for (const fw of installed) {
        children.push({
          label: fw.name,
          description: `v${fw.version || '?'} • ${this.formatTestType(fw.type)}`,
          tooltip: this.buildInstalledTooltip(fw),
          iconPath: new vscode.ThemeIcon('pass-filled', new vscode.ThemeColor('testing.iconPassed')),
          collapsibleState: vscode.TreeItemCollapsibleState.None,
          contextValue: 'installedFramework'
        });
      }
    }

    return {
      label: 'Installed',
      description: `${installed.length} framework${installed.length !== 1 ? 's' : ''}`,
      iconPath: new vscode.ThemeIcon('check-all'),
      collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      children,
      contextValue: 'installed'
    };
  }

  private buildRecommendedSection(recommended: any[]): TestingSetupNode {
    const children: TestingSetupNode[] = [];

    if (recommended.length === 0) {
      children.push({
        label: 'No recommendations',
        iconPath: new vscode.ThemeIcon('info'),
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        contextValue: 'empty'
      });
    } else {
      // Show top 5 recommendations
      for (const rec of recommended.slice(0, 5)) {
        const priorityLevel = this.getPriorityLevel(rec.priority);
        const icon = priorityLevel === 'high' ? 'star-full' : 'lightbulb';
        const iconColor = priorityLevel === 'high' ? 'charts.yellow' : 'charts.blue';
        
        children.push({
          label: rec.framework.name,
          description: `${priorityLevel.charAt(0).toUpperCase() + priorityLevel.slice(1)} priority • ${this.formatTestType(rec.framework.type)}`,
          tooltip: this.buildRecommendedTooltip(rec),
          iconPath: new vscode.ThemeIcon(icon, new vscode.ThemeColor(iconColor)),
          collapsibleState: vscode.TreeItemCollapsibleState.None,
          contextValue: 'recommendedFramework',
          frameworkInfo: {
            name: rec.framework.name,
            type: rec.framework.type,
            packages: rec.framework.setupRequired || [],
            reason: rec.reason
          }
        });
      }
    }

    return {
      label: 'Recommended',
      description: `${recommended.length} framework${recommended.length !== 1 ? 's' : ''}`,
      iconPath: new vscode.ThemeIcon('light-bulb'),
      collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      children,
      contextValue: 'recommended'
    };
  }

  private formatTestType(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  private buildInstalledTooltip(fw: any): string {
    return [
      `**${fw.name}** v${fw.version || '?'}`,
      '',
      `Type: ${this.formatTestType(fw.type)}`,
      `Language: ${fw.language}`,
      '',
      `Run command: ${fw.runCommand}`,
      `Output pattern: ${fw.outputPattern}`,
      '',
      'Status: Installed and ready'
    ].join('\n');
  }

  private buildRecommendedTooltip(rec: any): string {
    const priorityLevel = this.getPriorityLevel(rec.priority);
    const lines = [
      `**${rec.framework.name}**`,
      '',
      `Type: ${this.formatTestType(rec.framework.type)}`,
      `Priority: ${priorityLevel.charAt(0).toUpperCase() + priorityLevel.slice(1)}`,
      '',
      'Recommendation reason:',
      rec.reason
    ];

    if (rec.framework.setupRequired && rec.framework.setupRequired.length > 0) {
      lines.push('');
      lines.push('Installation required:');
      rec.framework.setupRequired.forEach((pkg: string) => {
        lines.push(`  • ${pkg}`);
      });
      lines.push('');
      lines.push('Right-click to install');
    }

    return lines.join('\n');
  }

  // ===== HELPER FUNCTIONS =====

  /**
   * Get priority level normalized
   * Handles both string ('high', 'medium', 'low') and number (1, 2, 3)
   */
  private getPriorityLevel(priority: string | number): string {
    // If number, convert to string
    if (typeof priority === 'number') {
      if (priority === 1) return 'high';
      if (priority === 2) return 'medium';
      return 'low';
    }
    // If string, normalize
    return priority.toLowerCase();
  }
}

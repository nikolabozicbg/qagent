/**
 * Project Info Tree Builder
 * 
 * Builds tree nodes for project information section.
 * Shows: technology, project type, confidence.
 */

import * as vscode from 'vscode';
import { ProjectInfo } from '../types/enhanced-analysis.types';

export interface ProjectInfoNode {
  label: string;
  description?: string;
  tooltip?: string;
  iconPath?: vscode.ThemeIcon;
  collapsibleState: vscode.TreeItemCollapsibleState;
  children?: ProjectInfoNode[];
  contextValue?: string;
}

export class ProjectInfoBuilder {
  /**
   * Build project info section
   * 
   * Structure:
   * 📍 PROJECT INFO
   *   └─ 🔷 C# (.NET 9.0) - Web API (95%)
   */
  build(projectInfo: ProjectInfo): ProjectInfoNode {
    const children: ProjectInfoNode[] = [];

    // Add technologies with professional badges
    for (const tech of projectInfo.technologies) {
      const confidenceText = tech.confidence >= 90 ? 'Verified' : 
                            tech.confidence >= 80 ? 'High confidence' : 
                            'Detected';
      
      children.push({
        label: `${tech.displayName} • ${this.formatProjectType(tech.projectType)}`,
        description: `${confidenceText} (${tech.confidence}%)`,
        tooltip: this.buildTechnologyTooltip(tech),
        iconPath: this.getTechnologyIcon(tech.language, tech.confidence),
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        contextValue: 'technology'
      });
    }

    // If no technologies detected, show message
    if (children.length === 0) {
      children.push({
        label: 'No technologies detected',
        iconPath: new vscode.ThemeIcon('question'),
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        contextValue: 'empty'
      });
    }

    return {
      label: 'Project Information',
      description: projectInfo.name,
      iconPath: new vscode.ThemeIcon('folder-library', new vscode.ThemeColor('charts.blue')),
      collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      children,
      contextValue: 'projectInfo'
    };
  }

  private formatProjectType(type: string): string {
    const typeMap: Record<string, string> = {
      'web-api': 'Web API',
      'spa': 'SPA',
      'library': 'Library',
      'cli': 'CLI',
      'desktop': 'Desktop',
      'mobile': 'Mobile'
    };
    return typeMap[type] || type;
  }

  private buildTechnologyTooltip(tech: any): string {
    const status = this.getConfidenceStatus(tech.confidence);
    
    const lines = [
      `**${tech.displayName} Project**`,
      '',
      `Type: ${this.formatProjectType(tech.projectType)}`,
      `Confidence: ${status} (${tech.confidence}%)`,
      '',
      '**Detected from:**'
    ];
    
    tech.indicators.slice(0, 5).forEach((ind: string) => {
      lines.push(`  • ${ind}`);
    });

    if (tech.indicators.length > 5) {
      lines.push(`  ... and ${tech.indicators.length - 5} more indicators`);
    }

    return lines.join('\n');
  }

  // ===== VISUAL ENHANCEMENT HELPERS =====

  /**
   * Get ThemeIcon for technology with color
   */
  private getTechnologyIcon(language: string, confidence: number): vscode.ThemeIcon {
    const iconMap: Record<string, string> = {
      'csharp': 'symbol-namespace',
      'typescript': 'symbol-interface',
      'javascript': 'symbol-function',
      'python': 'symbol-class',
      'java': 'symbol-package',
      'go': 'symbol-method',
      'rust': 'symbol-struct',
      'ruby': 'symbol-property',
      'php': 'symbol-variable'
    };
    
    const icon = iconMap[language.toLowerCase()] || 'code';
    
    // Color based on confidence - use semantic colors
    if (confidence >= 90) {
      return new vscode.ThemeIcon(icon, new vscode.ThemeColor('testing.iconPassed'));
    } else if (confidence >= 70) {
      return new vscode.ThemeIcon(icon, new vscode.ThemeColor('charts.blue'));
    } else {
      return new vscode.ThemeIcon(icon, new vscode.ThemeColor('charts.orange'));
    }
  }

  /**
   * Get status text based on confidence
   */
  private getConfidenceStatus(confidence: number): string {
    if (confidence >= 95) return 'Very high';
    if (confidence >= 85) return 'High';
    if (confidence >= 70) return 'Medium';
    return 'Low';
  }
}

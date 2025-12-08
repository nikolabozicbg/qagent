import * as vscode from 'vscode';
import * as path from 'path';
import { EnhancedAnalysisResponse, TechnologyStack } from './types/enhanced-analysis.types';
import {
  ProjectInfoBuilder, ProjectInfoNode,
  TestingSetupBuilder, TestingSetupNode,
  CoverageByTypeBuilder, CoverageByTypeNode,
  FileAnalysisBuilder, FileAnalysisNode
} from './tree-builders';
import { ProjectDetectionService } from './services/project-detection.service';
import { TestTypeMatrixTreeBuilder, TestTypeMatrixNode } from './tree-builders/test-type-matrix.builder';

export interface CoverageGap {
  filePath: string;
  relativePath: string;
  hasTest: boolean;
  linesOfCode: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  fileType: string;
}

export interface DetectedFramework {
  name: string;
  version: string;
  configFile?: string;
}

export interface DetectedFrameworks {
  unit?: DetectedFramework;
  e2e?: DetectedFramework;
  component?: DetectedFramework;
}

export interface AnalysisReport {
  totalFiles: number;
  testedFiles: number;
  untestedFiles: number;
  coveragePercent: number;
  frameworks: DetectedFrameworks;
  gaps: CoverageGap[];
  stack?: string[];
  recommendations?: any;
}

export class CoverageTreeProvider implements vscode.TreeDataProvider<CoverageItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<CoverageItem | undefined | null> = new vscode.EventEmitter<CoverageItem | undefined | null>();
  readonly onDidChangeTreeData: vscode.Event<CoverageItem | undefined | null> = this._onDidChangeTreeData.event;

  // Event for notifying webview of data changes
  private _onDidChangeData: vscode.EventEmitter<TechnologyStack[]> = new vscode.EventEmitter<TechnologyStack[]>();
  readonly onDidChangeData: vscode.Event<TechnologyStack[]> = this._onDidChangeData.event;

  private report: AnalysisReport | null = null;
  private enhancedReport: EnhancedAnalysisResponse | null = null;
  private detectedStacks: TechnologyStack[] = [];
  
  // Tree builders
  private projectInfoBuilder = new ProjectInfoBuilder();
  private testingSetupBuilder = new TestingSetupBuilder();
  private coverageByTypeBuilder = new CoverageByTypeBuilder();
  private fileAnalysisBuilder = new FileAnalysisBuilder();
  private testTypeMatrixBuilder = new TestTypeMatrixTreeBuilder();
  
  // Services
  private projectDetectionService = new ProjectDetectionService();

  constructor() {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  setReport(report: AnalysisReport): void {
    this.report = report;
    this.refresh();
  }

  setEnhancedReport(report: EnhancedAnalysisResponse): void {
    this.enhancedReport = report;
    this.refresh();
  }

  getReport(): AnalysisReport | null {
    return this.report;
  }

  getEnhancedReport(): EnhancedAnalysisResponse | null {
    return this.enhancedReport;
  }

  /**
   * Get detected stacks
   */
  getStacks(): TechnologyStack[] {
    return this.detectedStacks;
  }

  /**
   * Detect technology stacks (Frontend/Backend) in workspace
   */
  async detectAndDisplayStacks(workspaceRoot: string): Promise<void> {
    // Clear previous stacks to prevent stale data
    this.detectedStacks = [];
    // Note: Keep enhancedReport/report - they're set separately and used for data
    
    // Detect new stacks
    this.detectedStacks = await this.projectDetectionService.detectStacks(workspaceRoot);
    
    // Notify webview of data change
    this._onDidChangeData.fire(this.detectedStacks);
    
    this.refresh();
  }

  getTreeItem(element: CoverageItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: CoverageItem): Thenable<CoverageItem[]> {
    console.log('[TreeProvider] getChildren called. Stacks:', this.detectedStacks.length, 'Enhanced:', !!this.enhancedReport, 'Legacy:', !!this.report);
    
    // NEW: If stacks are detected, use new structure
    if (this.detectedStacks.length > 0) {
      console.log('[TreeProvider] Using stack-based view');
      return this.getStackBasedChildren(element);
    }
    
    // Prefer enhanced report if available, fallback to legacy report
    if (this.enhancedReport) {
      console.log('[TreeProvider] Using enhanced view');
      return this.getEnhancedChildren(element);
    }
    
    if (!this.report) {
      return Promise.resolve([]);
    }

    if (!element) {
      // Root level - show summary + categories
      return Promise.resolve(this.getRootItems());
    }

    // Critical Actions Card children
    if (element.contextValue === 'criticalActionsCard') {
      const children = (element as any).criticalActionChildren || [];
      return Promise.resolve(children);
    }

    // Category children - show files (including priority categories)
    if (element.contextValue === 'category' || element.contextValue === 'priorityCategory') {
      return Promise.resolve(this.getCategoryChildren(element.category!));
    }
    
    // Frameworks section children
    if (element.contextValue === 'frameworksSection') {
      return Promise.resolve(this.getFrameworksChildren());
    }
    if (element.contextValue === 'additionalPackagesCategory') {
      return Promise.resolve(this.getAdditionalPackagesChildren());
    }

    return Promise.resolve([]);
  }

  private getEnhancedChildren(element?: CoverageItem): Thenable<CoverageItem[]> {
    if (!this.enhancedReport) {
      return Promise.resolve([]);
    }

    if (!element) {
      // Root level - build enhanced tree
      return Promise.resolve(this.buildEnhancedTree());
    }

    // Return children from builder nodes
    if (element.builderNode?.children) {
      const children = element.builderNode.children.map(node => 
        this.convertBuilderNodeToItem(node)
      );
      return Promise.resolve(children);
    }

    return Promise.resolve([]);
  }

  private getRootItems(): CoverageItem[] {
    if (!this.report) return [];

    const items: CoverageItem[] = [];

    // Quality Debt Inbox - TOP PRIORITY section (The "Radar")
    const inboxItem = this.buildQualityInbox();
    if (inboxItem) {
      items.push(inboxItem);
    }

    // Summary item with professional design
    const summaryLabel = `Coverage: ${this.report.coveragePercent}%`;
    const summaryDescription = `${this.report.testedFiles} of ${this.report.totalFiles} files tested`;
    const summaryItem = new CoverageItem(
      summaryLabel,
      summaryDescription,
      vscode.TreeItemCollapsibleState.None
    );
    summaryItem.contextValue = 'summary';
    // Use dynamic icon based on coverage percentage
    const iconName = this.getCoverageIcon(this.report.coveragePercent);
    summaryItem.iconPath = new vscode.ThemeIcon(iconName, this.getCoverageIconColor(this.report.coveragePercent));
    
    // Professional tooltip
    const status = this.getCoverageStatusText(this.report.coveragePercent);
    summaryItem.tooltip = new vscode.MarkdownString(
      `**Test Coverage Analysis**\n\n` +
      `Overall: ${status} (${this.report.coveragePercent}%)\n\n` +
      `Files with tests: ${this.report.testedFiles}\n` +
      `Files without tests: ${this.report.untestedFiles}\n` +
      `Total files: ${this.report.totalFiles}\n\n` +
      `---\n\n` +
      `Click refresh button in toolbar to re-analyze`
    );
    summaryItem.tooltip.supportHtml = true;
    items.push(summaryItem);

    // Critical Actions Card - TOP PRIORITY section
    // Replaced by Quality Debt Inbox above
    // const criticalActionsItem = this.buildCriticalActionsCard();
    // if (criticalActionsItem) {
    //   items.push(criticalActionsItem);
    // }

    // Testing Setup section with professional design
    const hasFrameworks = this.report.frameworks && Object.keys(this.report.frameworks).length > 0;
    const hasRecommendations = this.report.recommendations;
    
    if (hasFrameworks || hasRecommendations) {
      const frameworkCount = hasFrameworks ? Object.keys(this.report.frameworks).length : 0;
      const frameworksLabel = 'Testing Setup';
      const frameworksDesc = hasFrameworks 
        ? `${frameworkCount} framework${frameworkCount > 1 ? 's' : ''} detected` 
        : 'Configuration available';
      
      const frameworksItem = new CoverageItem(
        frameworksLabel,
        frameworksDesc,
        vscode.TreeItemCollapsibleState.Expanded
      );
      frameworksItem.contextValue = 'frameworksSection';
      frameworksItem.iconPath = new vscode.ThemeIcon('tools', new vscode.ThemeColor('charts.blue'));
      
      // Professional tooltip
      frameworksItem.tooltip = new vscode.MarkdownString(
        `**Testing Infrastructure**\n\n` +
        (hasFrameworks 
          ? `Detected ${frameworkCount} testing framework(s)\n\nExpand to view details` 
          : `No testing frameworks detected\n\nExpand to see recommendations`)
      );
      items.push(frameworksItem);
    }

    // Files without tests - RISK-FIRST ORGANIZATION
    // We organize by CRITICAL → HIGH → MEDIUM → LOW with smart collapsing
    const noTestGaps = this.report.gaps.filter(g => !g.hasTest);
    if (noTestGaps.length > 0) {
      // Group by priority (supporting 'critical' as highest tier)
      const criticalFiles = noTestGaps.filter(g => g.priority === 'critical');
      const highFiles = noTestGaps.filter(g => g.priority === 'high');
      const mediumFiles = noTestGaps.filter(g => g.priority === 'medium');
      const lowFiles = noTestGaps.filter(g => g.priority === 'low');
      
      // CRITICAL priority group (always expanded if exists)
      if (criticalFiles.length > 0) {
        const criticalItem = new CoverageItem(
          'CRITICAL Priority',
          `${criticalFiles.length} files require immediate attention`,
          vscode.TreeItemCollapsibleState.Expanded
        );
        criticalItem.contextValue = 'priorityCategory';
        criticalItem.category = 'noTests_critical';
        criticalItem.iconPath = new vscode.ThemeIcon(
          'flame',
          new vscode.ThemeColor('testing.iconFailed')
        );
        criticalItem.tooltip = new vscode.MarkdownString(
          `**CRITICAL Priority Files**\n\n` +
          `${criticalFiles.length} files with critical security or production impact\n\n` +
          `---\n\n` +
          `Expand to view files`
        );
        items.push(criticalItem);
      }
      
      // HIGH priority group (always expanded if exists)
      if (highFiles.length > 0) {
        const highItem = new CoverageItem(
          'High Priority',
          `${highFiles.length} files need tests`,
          vscode.TreeItemCollapsibleState.Expanded
        );
        highItem.contextValue = 'priorityCategory';
        highItem.category = 'noTests_high';
        highItem.iconPath = new vscode.ThemeIcon(
          'alert',
          new vscode.ThemeColor('testing.iconFailed')
        );
        highItem.tooltip = new vscode.MarkdownString(
          `**High Priority Files**\n\n` +
          `${highFiles.length} files with important business logic\n\n` +
          `---\n\n` +
          `Expand to view files`
        );
        items.push(highItem);
      }
      
      // MEDIUM priority group (collapsed by default)
      if (mediumFiles.length > 0) {
        const mediumItem = new CoverageItem(
          'Medium Priority',
          `${mediumFiles.length} files`,
          vscode.TreeItemCollapsibleState.Collapsed
        );
        mediumItem.contextValue = 'priorityCategory';
        mediumItem.category = 'noTests_medium';
        mediumItem.iconPath = new vscode.ThemeIcon(
          'warning',
          new vscode.ThemeColor('charts.orange')
        );
        mediumItem.tooltip = new vscode.MarkdownString(
          `**Medium Priority Files**\n\n` +
          `${mediumFiles.length} files with moderate importance\n\n` +
          `---\n\n` +
          `Click to expand`
        );
        items.push(mediumItem);
      }
      
      // LOW priority group (collapsed by default)
      if (lowFiles.length > 0) {
        const lowItem = new CoverageItem(
          'Low Priority',
          `${lowFiles.length} files`,
          vscode.TreeItemCollapsibleState.Collapsed
        );
        lowItem.contextValue = 'priorityCategory';
        lowItem.category = 'noTests_low';
        lowItem.iconPath = new vscode.ThemeIcon(
          'info',
          new vscode.ThemeColor('charts.blue')
        );
        lowItem.tooltip = new vscode.MarkdownString(
          `**Low Priority Files**\n\n` +
          `${lowFiles.length} files with lower risk\n\n` +
          `---\n\n` +
          `Click to expand`
        );
        items.push(lowItem);
      }
    }

    // Partial coverage category - professional design
    const partialGaps = this.report.gaps.filter(g => g.hasTest && g.priority === 'medium');
    if (partialGaps.length > 0) {
      const partialItem = new CoverageItem(
        'Partial Coverage',
        `${partialGaps.length} files need improvement`,
        vscode.TreeItemCollapsibleState.Collapsed
      );
      partialItem.contextValue = 'category';
      partialItem.category = 'partial';
      partialItem.iconPath = new vscode.ThemeIcon(
        'warning',
        new vscode.ThemeColor('charts.orange')
      );
      
      // Professional tooltip
      partialItem.tooltip = new vscode.MarkdownString(
        `**Partially Tested Files**\n\n` +
        `${partialGaps.length} files with incomplete coverage\n\n` +
        `---\n\n` +
        `Click Improve button to enhance test coverage`
      );
      items.push(partialItem);
    }

    // Good coverage category - professional design
    const goodGaps = this.report.gaps.filter(g => g.hasTest && g.priority === 'low');
    if (goodGaps.length > 0) {
      const goodItem = new CoverageItem(
        'Well-Tested Files',
        `${goodGaps.length} files with good coverage`,
        vscode.TreeItemCollapsibleState.Collapsed
      );
      goodItem.contextValue = 'category';
      goodItem.category = 'good';
      goodItem.iconPath = new vscode.ThemeIcon(
        'pass-filled',
        new vscode.ThemeColor('testing.iconPassed')
      );
      
      // Professional tooltip
      goodItem.tooltip = new vscode.MarkdownString(
        `**Well-Tested Files**\n\n` +
        `${goodGaps.length} files with good test coverage\n\n` +
        `Keep up the great work!`
      );
      items.push(goodItem);
    }

    return items;
  }

  private getCategoryChildren(category: string): CoverageItem[] {
    if (!this.report) return [];

    let gaps: CoverageGap[] = [];

    switch (category) {
      // Risk-first priority categories
      case 'noTests_critical':
        gaps = this.report.gaps.filter(g => !g.hasTest && g.priority === 'critical');
        break;
      case 'noTests_high':
        gaps = this.report.gaps.filter(g => !g.hasTest && g.priority === 'high');
        break;
      case 'noTests_medium':
        gaps = this.report.gaps.filter(g => !g.hasTest && g.priority === 'medium');
        break;
      case 'noTests_low':
        gaps = this.report.gaps.filter(g => !g.hasTest && g.priority === 'low');
        break;
      
      // Backward compatibility for old categories
      case 'noTests':
        gaps = this.report.gaps.filter(g => !g.hasTest);
        // Sort by priority: critical -> high -> medium -> low
        gaps.sort((a, b) => {
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          const aOrder = priorityOrder[a.priority] ?? 999;
          const bOrder = priorityOrder[b.priority] ?? 999;
          return aOrder - bOrder;
        });
        break;
      case 'partial':
        gaps = this.report.gaps.filter(g => g.hasTest && g.priority === 'medium');
        break;
      case 'good':
        gaps = this.report.gaps.filter(g => g.hasTest && g.priority === 'low');
        break;
    }

    return gaps.map(gap => {
      const fileName = path.basename(gap.relativePath);
      const icon = this.getIconForPriority(gap.priority, gap.hasTest);
      
      // Clean filename without emoji badges
      const label = fileName;
      
      const item = new CoverageItem(
        label,
        gap.reason,
        vscode.TreeItemCollapsibleState.None
      );
      
      item.contextValue = gap.hasTest ? 'fileWithTest' : 'fileWithoutTest';
      item.iconPath = new vscode.ThemeIcon(icon, this.getIconColor(gap.priority, gap.hasTest));
      
      // Professional tooltip with structured info
      const priorityLabel = gap.priority.charAt(0).toUpperCase() + gap.priority.slice(1);
      item.tooltip = new vscode.MarkdownString(
        `**${gap.relativePath}**\n\n` +
        `Lines of Code: ${gap.linesOfCode}\n` +
        `Priority: ${priorityLabel}\n` +
        `Reason: ${gap.reason}\n\n` +
        `---\n\n` +
        `Click to open file in editor`
      );
      item.tooltip.supportHtml = true;
      item.filePath = gap.filePath;
      item.gap = gap;
      
      // Make it clickable - opens the file
      item.command = {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [vscode.Uri.file(gap.filePath)]
      };

      return item;
    });
  }

  // Removed getRiskBadge - no longer using emoji badges

  /**
   * Build Quality Debt Inbox (The "Radar") 📡
   * Shows top 3 critical items requiring immediate attention.
   * "Zero-Touch Intelligence" - The agent prioritizes work for you.
   */
  private buildQualityInbox(): CoverageItem | null {
    if (!this.report) return null;

    const inboxItems: CoverageItem[] = [];
    const noTestGaps = this.report.gaps.filter(g => !g.hasTest);
    
    // 1. CRITICAL RISKS (High Churn + No Tests)
    // Prioritize 'critical' items
    const criticalRisks = noTestGaps.filter(g => g.priority === 'critical');
    
    // 2. RECENT REGRESSIONS (Coverage dropped)
    // Mock logic for now - in real implementation, this comes from backend comparison
    // We'll treat 'high' priority items as potential regressions for now
    const highRisks = noTestGaps.filter(g => g.priority === 'high');

    // Combine and limit to Top 3 for the Inbox
    const allRisks = [...criticalRisks, ...highRisks];
    const topRisks = allRisks.slice(0, 3);

    if (topRisks.length === 0 && !this.report.recommendations) {
      return null;
    }

    // Build Inbox Children
    
    // A. Risk Items
    topRisks.forEach(gap => {
      const fileName = path.basename(gap.relativePath);
      const item = new CoverageItem(
        `${fileName}`,
        'Untested & High Churn', // "Evidence" from prompt
        vscode.TreeItemCollapsibleState.None
      );
      item.contextValue = 'inboxItem';
      // 🔴 Pulsing Red Dot effect (Visual Cue)
      item.iconPath = new vscode.ThemeIcon('flame', new vscode.ThemeColor('testing.iconFailed'));
      item.tooltip = new vscode.MarkdownString(
        `**🔴 Critical Risk Detected**\n\n` +
        `File: \`${fileName}\`\n` +
        `Reason: ${gap.reason}\n\n` +
        `This file is critical, frequently changed, and has **0% coverage**.\n` +
        `---\n` +
        `[⚡ Generate Tests](command:qagenai.generateTestsForFile?${encodeURIComponent(JSON.stringify(gap.filePath))})`
      );
      item.command = {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [vscode.Uri.file(gap.filePath)]
      };
      inboxItems.push(item);
    });

    // B. Setup Action (if needed)
    const hasFrameworks = this.report.frameworks && Object.keys(this.report.frameworks).length > 0;
    if (!hasFrameworks && this.report.recommendations && inboxItems.length < 3) {
      const setupItem = new CoverageItem(
        'Setup Testing Framework',
        'Required',
        vscode.TreeItemCollapsibleState.None
      );
      setupItem.contextValue = 'criticalAction';
      setupItem.iconPath = new vscode.ThemeIcon('gear', new vscode.ThemeColor('charts.yellow'));
      setupItem.command = {
        command: 'qagenai.showSetupWizard',
        title: 'Setup Testing'
      };
      inboxItems.push(setupItem);
    }

    // Only show Inbox if there are items
    if (inboxItems.length === 0) return null;

    // Create Inbox Container
    const inbox = new CoverageItem(
      'Quality Debt Inbox',
      `${inboxItems.length} alert${inboxItems.length === 1 ? '' : 's'}`,
      vscode.TreeItemCollapsibleState.Expanded
    );
    inbox.contextValue = 'qualityInbox';
    inbox.iconPath = new vscode.ThemeIcon('bell-dot', new vscode.ThemeColor('charts.red')); // "Radar" feel
    
    // Store children
    (inbox as any).criticalActionChildren = inboxItems;

    return inbox;
  }

  // Removed buildCriticalActionsCard in favor of buildQualityInbox

  private getIconColor(priority: string, hasTest: boolean): vscode.ThemeColor | undefined {
    if (hasTest) {
      return new vscode.ThemeColor('testing.iconPassed');
    }

    switch (priority) {
      case 'critical':
        return new vscode.ThemeColor('testing.iconFailed');
      case 'high':
        return new vscode.ThemeColor('errorForeground');
      case 'medium':
        return new vscode.ThemeColor('editorWarning.foreground');
      case 'low':
        return new vscode.ThemeColor('editorInfo.foreground');
      default:
        return undefined;
    }
  }


  private getCoverageIcon(percent: number): string {
    if (percent >= 80) return 'check-all'; // Excellent
    if (percent >= 60) return 'graph'; // Good
    if (percent >= 40) return 'graph-line'; // Fair
    return 'warning'; // Poor
  }

  /**
   * Generate visual progress bar
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

  private getCoverageIconColor(percent: number): vscode.ThemeColor {
    if (percent >= 80) return new vscode.ThemeColor('testing.iconPassed');
    if (percent >= 60) return new vscode.ThemeColor('charts.blue');
    if (percent >= 40) return new vscode.ThemeColor('charts.orange');
    return new vscode.ThemeColor('testing.iconFailed');
  }

  private getIconForPriority(priority: string, hasTest: boolean): string {
    if (hasTest) {
      return 'check';
    }

    switch (priority) {
      case 'critical':
        return 'flame';
      case 'high':
        return 'alert';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'file';
    }
  }

  private getFrameworksChildren(): CoverageItem[] {
    if (!this.report) return [];
    
    const items: CoverageItem[] = [];
    
    // Show detected frameworks
    if (this.report.frameworks && Object.keys(this.report.frameworks).length > 0) {
      const { unit, e2e, component } = this.report.frameworks;
      
      if (unit) {
        const item = new CoverageItem(
          `${unit.name} v${unit.version}`,
          'Unit Testing',
          vscode.TreeItemCollapsibleState.None
        );
        item.contextValue = 'installedFramework';
        item.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
        items.push(item);
      }
      
      if (e2e) {
        const item = new CoverageItem(
          `${e2e.name} v${e2e.version}`,
          'E2E Testing',
          vscode.TreeItemCollapsibleState.None
        );
        item.contextValue = 'installedFramework';
        item.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
        items.push(item);
      }
      
      if (component) {
        const item = new CoverageItem(
          `${component.name} v${component.version}`,
          'Component Testing',
          vscode.TreeItemCollapsibleState.None
        );
        item.contextValue = 'installedFramework';
        item.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
        items.push(item);
      }
    }
    
    // Show missing/recommended frameworks
    if (this.report.recommendations) {
      const { unit, e2e, component, additionalPackages } = this.report.recommendations;
      
      // Missing frameworks
      if (unit && unit.status === 'missing' && unit.packages.length > 0) {
        const item = new CoverageItem(
          `${unit.name}`,
          `Unit Testing • ${unit.packages.length} packages`,
          vscode.TreeItemCollapsibleState.None
        );
        item.contextValue = 'missingFramework';
        item.iconPath = new vscode.ThemeIcon('package', new vscode.ThemeColor('charts.yellow'));
        item.tooltip = `${unit.reason}\n\nInstall: ${unit.packages.join(', ')}`;
        item.frameworkInfo = {
          name: unit.name,
          type: 'unit',
          packages: unit.packages,
          reason: unit.reason
        };
        items.push(item);
      }
      
      if (e2e && e2e.status === 'missing' && e2e.packages.length > 0) {
        const item = new CoverageItem(
          `${e2e.name}`,
          `E2E Testing • ${e2e.packages.length} packages`,
          vscode.TreeItemCollapsibleState.None
        );
        item.contextValue = 'missingFramework';
        item.iconPath = new vscode.ThemeIcon('package', new vscode.ThemeColor('charts.yellow'));
        item.tooltip = `${e2e.reason}\n\nInstall: ${e2e.packages.join(', ')}`;
        item.frameworkInfo = {
          name: e2e.name,
          type: 'e2e',
          packages: e2e.packages,
          reason: e2e.reason
        };
        items.push(item);
      }
      
      if (component && component.status === 'missing' && component.packages.length > 0) {
        const item = new CoverageItem(
          `${component.name}`,
          `Component Testing • ${component.packages.length} packages`,
          vscode.TreeItemCollapsibleState.None
        );
        item.contextValue = 'missingFramework';
        item.iconPath = new vscode.ThemeIcon('package', new vscode.ThemeColor('charts.yellow'));
        item.tooltip = `${component.reason}\n\nInstall: ${component.packages.join(', ')}`;
        item.frameworkInfo = {
          name: component.name,
          type: 'component',
          packages: component.packages,
          reason: component.reason
        };
        items.push(item);
      }
      
      // Additional recommended packages
      if (additionalPackages && additionalPackages.length > 0) {
        const additionalItem = new CoverageItem(
          `Additional Packages`,
          `${additionalPackages.length} recommended`,
          vscode.TreeItemCollapsibleState.Collapsed
        );
        additionalItem.contextValue = 'additionalPackagesCategory';
        additionalItem.iconPath = new vscode.ThemeIcon('star-full', new vscode.ThemeColor('charts.yellow'));
        items.push(additionalItem);
      }
    }
    
    // Setup button if nothing is set up
    if (items.length === 0) {
      const setupItem = new CoverageItem(
        'Setup Testing Framework',
        'Get recommendations',
        vscode.TreeItemCollapsibleState.None
      );
      setupItem.contextValue = 'setupButton';
      setupItem.iconPath = new vscode.ThemeIcon('rocket', new vscode.ThemeColor('charts.blue'));
      setupItem.command = {
        command: 'qagenai.showSetupWizard',
        title: 'Setup Testing'
      };
      items.push(setupItem);
    }
    
    return items;
  }
  
  private getAdditionalPackagesChildren(): CoverageItem[] {
    if (!this.report?.recommendations?.additionalPackages) return [];
    const items: CoverageItem[] = [];
    for (const pkg of this.report.recommendations.additionalPackages) {
      const item = new CoverageItem(
        pkg.name,
        pkg.reason,
        vscode.TreeItemCollapsibleState.None
      );
      item.contextValue = 'missingFramework';
      item.iconPath = new vscode.ThemeIcon('package', new vscode.ThemeColor('charts.yellow'));
      item.frameworkInfo = {
        name: pkg.name,
        type: 'unknown',
        packages: pkg.packages,
        reason: pkg.reason
      };
      items.push(item);
    }
    return items;
  }
  
  private buildFrameworksLabel(): string {
    if (!this.report?.frameworks) return '';

    const parts: string[] = [];
    const { unit, e2e, component } = this.report.frameworks;

    if (unit) {
      parts.push(`${unit.name} v${unit.version}`);
    }
    if (e2e) {
      parts.push(`${e2e.name} v${e2e.version}`);
    }
    if (component) {
      parts.push(`${component.name} v${component.version}`);
    }

    return parts.join(' + ');
  }

  // ===== ENHANCED ANALYSIS METHODS =====

  private buildEnhancedTree(): CoverageItem[] {
    if (!this.enhancedReport) return [];

    const items: CoverageItem[] = [];

    // 1. Overall coverage summary
    const summaryItem = this.buildSummaryItem();
    items.push(summaryItem);

    // 2. Project Info section
    const projectInfoNode = this.projectInfoBuilder.build(this.enhancedReport.project);
    items.push(this.convertBuilderNodeToItem(projectInfoNode));

    // 3. Testing Setup section
    const testingSetupNode = this.testingSetupBuilder.build(this.enhancedReport.testingSetup);
    items.push(this.convertBuilderNodeToItem(testingSetupNode));

    // 4. Coverage By Type section
    const coverageByTypeNode = this.coverageByTypeBuilder.build(this.enhancedReport.coverageByType);
    items.push(this.convertBuilderNodeToItem(coverageByTypeNode));

    // 5. File Analysis section
    const fileAnalysisNode = this.fileAnalysisBuilder.build(
      this.enhancedReport.summary,
      this.enhancedReport.files
    );
    items.push(this.convertBuilderNodeToItem(fileAnalysisNode));

    return items;
  }

  private buildSummaryItem(): CoverageItem {
    if (!this.enhancedReport) {
      return new CoverageItem('No data', '', vscode.TreeItemCollapsibleState.None);
    }

    const { summary } = this.enhancedReport;
    const coveragePercent = Math.round((summary.testedFiles / summary.totalFiles) * 100);

    const summaryLabel = `Test Coverage: ${coveragePercent}%`;
    const summaryDescription = `${summary.testedFiles}/${summary.totalFiles} files covered`;
    
    const summaryItem = new CoverageItem(
      summaryLabel,
      summaryDescription,
      vscode.TreeItemCollapsibleState.None
    );
    summaryItem.contextValue = 'summary';
    
    const iconName = this.getCoverageIcon(coveragePercent);
    summaryItem.iconPath = new vscode.ThemeIcon(iconName, this.getCoverageIconColor(coveragePercent));
    
    // Professional tooltip
    const status = this.getCoverageStatusText(coveragePercent);
    
    summaryItem.tooltip = new vscode.MarkdownString(
      `**Test Coverage Analysis**\n\n` +
      `Overall coverage: ${status} (${coveragePercent}%)\n\n` +
      `Files with tests: ${summary.testedFiles}\n` +
      `Files without tests: ${summary.untestedFiles}\n` +
      `Total analyzed: ${summary.totalFiles}\n\n` +
      `---\n\n` +
      `Click refresh button to re-analyze`
    );
    summaryItem.tooltip.supportHtml = true;
    summaryItem.tooltip.isTrusted = true;
    
    return summaryItem;
  }

  private convertBuilderNodeToItem(node: ProjectInfoNode | TestingSetupNode | CoverageByTypeNode | FileAnalysisNode): CoverageItem {
    const item = new CoverageItem(
      node.label,
      node.description || '',
      node.collapsibleState
    );

    item.contextValue = node.contextValue;
    item.iconPath = node.iconPath;
    item.tooltip = node.tooltip;
    item.builderNode = node; // Store reference to access children later

    // If node has filePath (for file nodes), add command to open
    if ('filePath' in node && node.filePath) {
      item.filePath = node.filePath;
      item.command = {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [vscode.Uri.file(node.filePath)]
      };
    }

    // If node has frameworkInfo (for framework recommendation nodes)
    if ('frameworkInfo' in node && node.frameworkInfo) {
      item.frameworkInfo = node.frameworkInfo;
    }

    // If node has recommendation (for test type recommendation nodes)
    if ('recommendation' in node && node.recommendation) {
      item.recommendation = node.recommendation;
    }

    return item;
  }

  // ===== STACK-BASED TREE METHODS (NEW) =====
  
  /**
   * Get children for stack-based tree structure
   */
  private getStackBasedChildren(element?: CoverageItem): Thenable<CoverageItem[]> {
    if (!element) {
      // Root level - build stack-based tree
      return Promise.resolve(this.buildStackBasedTree());
    }
    
    // Handle setup tree children (recommendations, detected stacks)
    if ((element as any).criticalActionChildren) {
      return Promise.resolve((element as any).criticalActionChildren);
    }
    
    // If element is a test type node, build file children dynamically
    if (element.testTypeMatrixNode?.testTypeMatrix && element.testTypeMatrixNode?.stack) {
      const testType = element.testTypeMatrixNode.testTypeMatrix;
      const stack = element.testTypeMatrixNode.stack;
      
      if (stack.scannedFiles && stack.scannedFiles.length > 0) {
        const fileChildren = this.testTypeMatrixBuilder.buildFileChildren(testType, stack.scannedFiles);
        const items = fileChildren.map(node => this.convertTestTypeMatrixNodeToItem(node));
        return Promise.resolve(items);
      }
    }
    
    // If element has static TestTypeMatrixNode children, return them
    if (element.testTypeMatrixNode?.children) {
      const children = element.testTypeMatrixNode.children.map(node => 
        this.convertTestTypeMatrixNodeToItem(node)
      );
      return Promise.resolve(children);
    }
    
    return Promise.resolve([]);
  }
  
  /**
   * Build stack-based tree (Frontend/Backend with Test Type Matrix)
   */
  private buildStackBasedTree(): CoverageItem[] {
    const items: CoverageItem[] = [];
    
    // Check if any stack has frameworks installed
    const hasAnyFramework = this.detectedStacks.some(stack => 
      stack.testTypes && stack.testTypes.some(tt => tt.status === 'installed')
    );
    
    // Also check enhanced report if available
    const enhancedHasFramework = (this.enhancedReport?.testingSetup?.installed?.length ?? 0) > 0;
    
    if (!hasAnyFramework && !enhancedHasFramework) {
      // No frameworks - show setup UI
      return this.buildSetupTree();
    }
    
    // 1. Overall summary
    const summaryItem = this.buildOverallSummary();
    items.push(summaryItem);
    
    // 2. Technology stacks (Frontend/Backend)
    for (const stack of this.detectedStacks) {
      const stackNode = this.testTypeMatrixBuilder.buildStackNode(stack);
      const stackItem = this.convertTestTypeMatrixNodeToItem(stackNode);
      items.push(stackItem);
    }
    
    return items;
  }
  
  /**
   * Build setup tree when no frameworks are installed
   */
  private buildSetupTree(): CoverageItem[] {
    const items: CoverageItem[] = [];
    
    // 1. Setup Required Header
    const setupHeader = new CoverageItem(
      '🚀 Set Up Testing',
      'No test framework detected',
      vscode.TreeItemCollapsibleState.None
    );
    setupHeader.contextValue = 'setupHeader';
    setupHeader.iconPath = new vscode.ThemeIcon('beaker', new vscode.ThemeColor('charts.yellow'));
    setupHeader.tooltip = new vscode.MarkdownString(
      `**Testing Setup Required**\n\n` +
      `No test framework was detected in your project.\n\n` +
      `Choose a framework below to get started.`
    );
    items.push(setupHeader);
    
    // 2. Recommendations from enhanced report
    if (this.enhancedReport?.testingSetup?.recommended) {
      const recommendationsHeader = new CoverageItem(
        '💡 Recommended Frameworks',
        'Click to install',
        vscode.TreeItemCollapsibleState.Expanded
      );
      recommendationsHeader.contextValue = 'recommendationsSection';
      recommendationsHeader.iconPath = new vscode.ThemeIcon('lightbulb', new vscode.ThemeColor('charts.purple'));
      
      // Store children
      const recChildren: CoverageItem[] = [];
      for (const rec of this.enhancedReport.testingSetup.recommended.slice(0, 5)) {
        const testType = rec.framework.type || 'unit';
        const recItem = new CoverageItem(
          rec.framework.name,
          `${testType} • ${rec.reason}`,
          vscode.TreeItemCollapsibleState.None
        );
        recItem.contextValue = 'frameworkRecommendation';
        recItem.iconPath = new vscode.ThemeIcon('package', new vscode.ThemeColor('charts.blue'));
        recItem.frameworkInfo = {
          name: rec.framework.name,
          type: testType,
          packages: rec.framework.setupRequired || [],
          reason: rec.reason
        };
        recItem.tooltip = new vscode.MarkdownString(
          `**${rec.framework.name}**\n\n` +
          `Type: ${testType} testing\n` +
          `Reason: ${rec.reason}\n\n` +
          `Click to install this framework`
        );
        recItem.command = {
          command: 'qagenai.installFramework',
          title: 'Install Framework',
          arguments: [recItem]
        };
        recChildren.push(recItem);
      }
      (recommendationsHeader as any).criticalActionChildren = recChildren;
      items.push(recommendationsHeader);
    }
    
    // 3. Quick info about detected stacks
    if (this.detectedStacks.length > 0) {
      const stacksInfo = new CoverageItem(
        '📁 Detected Projects',
        this.detectedStacks.map(s => s.name).join(', '),
        vscode.TreeItemCollapsibleState.Collapsed
      );
      stacksInfo.contextValue = 'detectedStacks';
      stacksInfo.iconPath = new vscode.ThemeIcon('folder-library', new vscode.ThemeColor('charts.blue'));
      
      // Store stack children
      const stackChildren: CoverageItem[] = this.detectedStacks.map(stack => {
        const lang = stack.technologies?.[0]?.language || 'Unknown';
        const stackItem = new CoverageItem(
          stack.name,
          `${lang} • ${stack.fileCount} files`,
          vscode.TreeItemCollapsibleState.None
        );
        stackItem.contextValue = 'stackInfo';
        stackItem.iconPath = new vscode.ThemeIcon(
          stack.type === 'frontend' ? 'browser' : 'server',
          new vscode.ThemeColor('charts.purple')
        );
        return stackItem;
      });
      (stacksInfo as any).criticalActionChildren = stackChildren;
      items.push(stacksInfo);
    }
    
    return items;
  }
  
  /**
   * Build overall summary item with modern styling
   */
  private buildOverallSummary(): CoverageItem {
    // Calculate overall coverage from stacks
    let totalFiles = 0;
    let totalTested = 0;
    
    for (const stack of this.detectedStacks) {
      totalFiles += stack.fileCount;
      totalTested += stack.testedCount;
    }
    
    const coveragePercent = totalFiles > 0 ? Math.round((totalTested / totalFiles) * 100) : 0;
    
    const summaryItem = new CoverageItem(
      `Coverage: ${coveragePercent}%`,
      `${totalTested} of ${totalFiles} files tested`,
      vscode.TreeItemCollapsibleState.None
    );
    summaryItem.contextValue = 'overallSummary';
    
    // Modern coverage icon with dynamic color
    summaryItem.iconPath = this.getCoverageStatusIcon(coveragePercent);
    
    const status = this.getCoverageStatusText(coveragePercent);
    summaryItem.tooltip = new vscode.MarkdownString(
      `**Test Coverage Analysis**\n\n` +
      `Overall: ${status} (${coveragePercent}%)\n\n` +
      `Files with tests: ${totalTested}\n` +
      `Files without tests: ${totalFiles - totalTested}\n` +
      `Total files: ${totalFiles}\n\n` +
      `---\n\n` +
      `Stacks detected: ${this.detectedStacks.map(s => s.name).join(', ')}`
    );
    summaryItem.tooltip.supportHtml = true;
    
    return summaryItem;
  }
  
  /**
   * Get status-based icon for coverage - purple theme
   */
  private getCoverageStatusIcon(percent: number): vscode.ThemeIcon {
    if (percent >= 80) {
      return new vscode.ThemeIcon('pass-filled', new vscode.ThemeColor('testing.iconPassed'));  // Green
    }
    if (percent >= 50) {
      return new vscode.ThemeIcon('pulse', new vscode.ThemeColor('charts.purple'));  // Purple pulse
    }
    if (percent >= 20) {
      return new vscode.ThemeIcon('pulse', new vscode.ThemeColor('charts.blue'));  // Blue pulse
    }
    if (percent > 0) {
      return new vscode.ThemeIcon('pulse', new vscode.ThemeColor('charts.yellow'));  // Yellow pulse
    }
    return new vscode.ThemeIcon('circle-large-outline', new vscode.ThemeColor('descriptionForeground'));  // Gray
  }
  
  /**
   * Convert TestTypeMatrixNode to CoverageItem
   */
  private convertTestTypeMatrixNodeToItem(node: TestTypeMatrixNode): CoverageItem {
    const item = new CoverageItem(
      node.label,
      node.description || '',
      node.collapsibleState
    );
    
    item.contextValue = node.contextValue;
    item.iconPath = node.iconPath;
    item.tooltip = node.tooltip;
    item.command = node.command;
    item.testTypeMatrixNode = node; // Store reference to access children
    
    // IMPORTANT: Copy filePath from node if it exists
    if (node.filePath) {
      item.filePath = node.filePath;
    }
    
    return item;
  }

  // ===== HELPER FUNCTIONS =====

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
}

export class CoverageItem extends vscode.TreeItem {
  public frameworkInfo?: {
    name: string;
    type: string;
    packages: string[];
    reason: string;
  };
  public builderNode?: ProjectInfoNode | TestingSetupNode | CoverageByTypeNode | FileAnalysisNode;
  public testTypeMatrixNode?: TestTypeMatrixNode;
  public recommendation?: any;
  
  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public category?: string,
    public filePath?: string,
    public gap?: CoverageGap
  ) {
    super(label, collapsibleState);
    this.description = description;
  }
}

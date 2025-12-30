import * as vscode from 'vscode';
import { TechnologyStack, TestTypeMatrix } from '../types/enhanced-analysis.types';
import { TestQualityReport } from '../services/test-quality-analyzer.service';
import { UserFlow, FlowAnalysisResult } from '../services/user-flow-generator.service';
import { CrawlResult, DiscoveredRoute } from '../services/route-crawler.service';
import { ParsedApiSpec, ApiEndpoint } from '../services/openapi-parser.service';
import { FlowState } from '../services/flow-state.service';

interface CoverageData {
  totalFiles: number;
  testedFiles: number;
  coveragePercent: number;
  stacks: TechnologyStack[];
  qualityReport?: TestQualityReport;
  flowAnalysis?: FlowAnalysisResult;
  crawlResult?: CrawlResult;
  apiSpec?: ParsedApiSpec;
  isScanning?: boolean;
  appStatus?: 'stopped' | 'starting' | 'running' | 'error';
  flowStates?: { [flowId: string]: FlowState };
}

interface FileItem {
  name: string;
  path: string;
  dir: string;
  tested: boolean;
  testType: string;
}

/**
 * Coverage WebView Provider - Modern Dashboard Design
 */
export class CoverageWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'qagenai.coverageView';
  
  private _view?: vscode.WebviewView;
  private _data: CoverageData | null = null;
  
  constructor(private readonly _extensionUri: vscode.Uri) {}
  
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };
    
    webviewView.webview.html = this._getHtmlContent();
    
    webviewView.webview.onDidReceiveMessage(message => {
      this._handleMessage(message);
    });
  }
  
  public updateData(stacks: TechnologyStack[], qualityReport?: TestQualityReport) {
    let totalFiles = 0;
    let testedFiles = 0;
    
    for (const stack of stacks) {
      totalFiles += stack.fileCount;
      testedFiles += stack.testedCount;
    }
    
    const coveragePercent = totalFiles > 0 
      ? Math.round((testedFiles / totalFiles) * 100) 
      : 0;
    
    this._data = { totalFiles, testedFiles, coveragePercent, stacks, qualityReport };
    
    if (this._view) {
      this._view.webview.html = this._getHtmlContent();
    }
  }
  
  public updateQualityReport(report: TestQualityReport) {
    if (this._data) {
      this._data.qualityReport = report;
      if (this._view) {
        this._view.webview.html = this._getHtmlContent();
      }
    }
  }
  
  public updateFlowAnalysis(flowAnalysis: FlowAnalysisResult, crawlResult?: CrawlResult | null, flowStates?: { [flowId: string]: FlowState }) {
    if (this._data) {
      this._data.flowAnalysis = flowAnalysis;
      if (crawlResult) this._data.crawlResult = crawlResult;
      if (flowStates) this._data.flowStates = flowStates;
      this._data.isScanning = false;
    } else {
      this._data = {
        totalFiles: 0,
        testedFiles: 0,
        coveragePercent: 0,
        stacks: [],
        flowAnalysis,
        crawlResult: crawlResult || undefined,
        flowStates,
        isScanning: false
      };
    }
    if (this._view) {
      this._view.webview.html = this._getHtmlContent('flows'); // Auto-switch to Flows tab
    }
  }
  
  public updateApiSpec(apiSpec: ParsedApiSpec) {
    if (this._data) {
      this._data.apiSpec = apiSpec;
    } else {
      this._data = {
        totalFiles: 0,
        testedFiles: 0,
        coveragePercent: 0,
        stacks: [],
        apiSpec
      };
    }
    if (this._view) {
      this._view.webview.html = this._getHtmlContent();
    }
  }
  
  public updateAppStatus(status: 'stopped' | 'starting' | 'running' | 'error') {
    if (this._data) {
      this._data.appStatus = status;
      this._data.isScanning = status === 'starting';
      if (this._view) {
        this._view.webview.html = this._getHtmlContent();
      }
    }
  }
  
  private _handleMessage(message: any) {
    switch (message.command) {
      case 'runTests':
        vscode.commands.executeCommand('qagenai.runTests', message.testType);
        break;
      case 'generateTests':
        vscode.commands.executeCommand('qagenai.generateTestsForFile', message.filePath);
        break;
      case 'openFile':
        vscode.commands.executeCommand('vscode.open', vscode.Uri.file(message.filePath));
        break;
      case 'refresh':
        vscode.commands.executeCommand('qagenai.analyzeWorkspace');
        break;
      case 'installFramework':
        vscode.commands.executeCommand('qagenai.installTestFramework', message.framework);
        break;
      case 'viewQualityDetails':
        vscode.commands.executeCommand('qagenai.showQualityReport');
        break;
      case 'analyzeQuality':
        vscode.commands.executeCommand('qagenai.analyzeTestQuality');
        break;
      case 'scanApp':
        vscode.commands.executeCommand('qagenai.scanApp');
        break;
      case 'stopApp':
        vscode.commands.executeCommand('qagenai.stopApp');
        break;
      case 'generateFlowTest':
        vscode.commands.executeCommand('qagenai.generateFlowTest', message.flowId);
        break;
      case 'viewRoute':
        vscode.commands.executeCommand('qagenai.viewRoute', message.route);
        break;
      case 'generateApiTest':
        vscode.commands.executeCommand('qagenai.generateApiTest', message.endpointId);
        break;
      case 'generateAllApiTests':
        vscode.commands.executeCommand('qagenai.generateAllApiTests');
        break;
      case 'generateBatchTests':
        vscode.commands.executeCommand('qagenai.generateBatchTests', message.filePaths, message.testType);
        break;
    }
  }
  
  private _getHtmlContent(activeTab: string = 'overview'): string {
    const data = this._data;
    
    if (!data || data.stacks.length === 0) {
      return this._getLoadingHtml();
    }
    
    const { installedTypes, setupTypes } = this._categorizeTestTypes(data.stacks);
    const files = this._buildFileData(data.stacks);
    const untestedCount = data.totalFiles - data.testedFiles;
    
    // Separate files by test type
    const unitFiles = files.filter(f => f.testType === 'unit');
    const componentFiles = files.filter(f => ['component', 'hook', 'visual'].includes(f.testType));
    const e2eFiles = files.filter(f => f.testType === 'e2e');
    const apiFiles = files.filter(f => ['api', 'integration'].includes(f.testType));
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QAgenAI - Test Coverage</title>
  <style>${this._getPremiumStyles()}</style>
</head>
<body>
  <div class="app">
    <!-- Premium Header -->
    <div class="header-bar">
      <div class="header-brand">
        <svg class="brand-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
        <span class="brand-title">QAgenAI</span>
      </div>
    </div>
    
    <!-- Navigation Tabs -->
    <div class="nav-tabs">
      <button class="nav-tab ${activeTab === 'overview' ? 'active' : ''}" data-tab="overview">
        <svg class="tab-icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
        </svg>
        <span>Overview</span>
      </button>
      <button class="nav-tab ${activeTab === 'unit' ? 'active' : ''}" data-tab="unit">
        <svg class="tab-icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        </svg>
        <span>Unit</span>
        ${this._getUnitBadge(data)}
      </button>
      <button class="nav-tab ${activeTab === 'component' ? 'active' : ''}" data-tab="component">
        <svg class="tab-icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="4" y="4" width="16" height="16" rx="2"/>
          <rect x="9" y="9" width="6" height="6" rx="1"/>
        </svg>
        <span>Component</span>
        ${this._getComponentBadge(data)}
      </button>
      <button class="nav-tab ${activeTab === 'e2e' ? 'active' : ''}" data-tab="e2e">
        <svg class="tab-icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <span>E2E</span>
        ${data.flowAnalysis ? `<span class="tab-badge">${data.flowAnalysis.flows.length}</span>` : ''}
      </button>
      ${data.apiSpec ? `<button class="nav-tab ${activeTab === 'api' ? 'active' : ''}" data-tab="api">
        <svg class="tab-icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        <span>API</span>
        <span class="tab-badge">${data.apiSpec.totalEndpoints}</span>
      </button>` : ''}
      <button class="nav-tab ${activeTab === 'quality' ? 'active' : ''}" data-tab="quality">
        <svg class="tab-icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span>Quality</span>
      </button>
    </div>
    
    <!-- Overview Tab -->
    <div class="tab-content ${activeTab === 'overview' ? 'active' : ''}" id="tab-overview">
      <!-- Detected Stack -->
      ${this._buildTechStackSection(data.stacks)}
      
      <!-- Coverage Hero Card -->
      <div class="coverage-hero-card">
        <div class="hero-content">
          <div class="hero-ring-container">
            <svg class="hero-ring" viewBox="0 0 120 120">
              <circle class="hero-ring-bg" cx="60" cy="60" r="52"/>
              <circle class="hero-ring-progress" cx="60" cy="60" r="52" 
                stroke-dasharray="${data.coveragePercent * 3.27} 327"
                style="stroke: ${this._getScoreColor(data.coveragePercent)}"/>
            </svg>
            <div class="hero-ring-content">
              <div class="hero-percentage">${data.coveragePercent}<span class="hero-unit">%</span></div>
              <div class="hero-label">Coverage</div>
            </div>
          </div>
          
          <div class="hero-stats">
            <div class="hero-stat-card tested">
              <div class="stat-icon-wrapper green">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div class="stat-info">
                <div class="stat-number">${data.testedFiles}</div>
                <div class="stat-label">Tested</div>
              </div>
            </div>
            
            <div class="hero-stat-card untested">
              <div class="stat-icon-wrapper orange">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4M12 16h.01"/>
                </svg>
              </div>
              <div class="stat-info">
                <div class="stat-number">${untestedCount}</div>
                <div class="stat-label">Need Tests</div>
              </div>
            </div>
            
            <div class="hero-stat-card frameworks">
              <div class="stat-icon-wrapper purple">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M3 9h18M9 21V9"/>
                </svg>
              </div>
              <div class="stat-info">
                <div class="stat-number">${installedTypes.length}<span class="stat-total">/${installedTypes.length + setupTypes.length}</span></div>
                <div class="stat-label">Frameworks</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Test Strategy Section -->
      <div class="section-header-premium">
        <div class="section-title">TEST STRATEGY</div>
        <div class="section-subtitle">Organize your testing approach by test type</div>
      </div>
      
      ${this._buildStrategySection('ISOLATED TESTING', `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>`, 'Test individual functions & components', installedTypes, setupTypes, data, ['unit', 'component', 'hook', 'visual'])}
      
      ${this._buildStrategySection('INTEGRATION TESTING', `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`, 'Test complete user journeys & flows', installedTypes, setupTypes, data, ['e2e'])}
      
      ${this._buildStrategySection('API TESTING', `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`, 'Test endpoints & contracts', installedTypes, setupTypes, data, ['api', 'integration'])}
    </div>
    
    <!-- Unit Tab -->
    <div class="tab-content ${activeTab === 'unit' ? 'active' : ''}" id="tab-unit">
      ${this._buildUnitTab(files, data)}
    </div>
    
    <!-- Component Tab -->
    <div class="tab-content ${activeTab === 'component' ? 'active' : ''}" id="tab-component">
      ${this._buildComponentTab(files, data)}
    </div>
    
    <!-- E2E Tab -->
    <div class="tab-content ${activeTab === 'e2e' ? 'active' : ''}" id="tab-e2e">
      ${this._buildE2ETab(data)}
    </div>
    
    <!-- API Tab -->
    ${data.apiSpec ? this._buildApiTab(data.apiSpec) : ''}
    
    <!-- Quality Tab -->
    <div class="tab-content ${activeTab === 'quality' ? 'active' : ''}" id="tab-quality">
      ${data.qualityReport ? `
        <div class="test-tab-header">
          <div class="tab-header-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="tab-header-info">
            <h2 class="tab-title">TEST QUALITY</h2>
            <p class="tab-desc">Analyze test effectiveness & identify issues</p>
          </div>
        </div>
        
        <div class="quality-score-card">
          <div class="quality-ring-container">
            <svg class="quality-ring" viewBox="0 0 100 100">
              <circle class="ring-bg" cx="50" cy="50" r="42"/>
              <circle class="ring-progress" cx="50" cy="50" r="42" 
                stroke-dasharray="${data.qualityReport.overallScore * 2.64} 264"
                style="--color: ${this._getScoreColor(data.qualityReport.overallScore)}"/>
            </svg>
            <div class="ring-content">
              <span class="ring-value">${data.qualityReport.overallScore}</span>
              <span class="ring-unit">%</span>
            </div>
          </div>
          <div class="quality-breakdown">
            <div class="quality-stat good">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span class="stat-num">${data.qualityReport.goodTests}</span>
              <span class="stat-label">Good</span>
            </div>
            <div class="quality-stat warn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              </svg>
              <span class="stat-num">${data.qualityReport.warningTests}</span>
              <span class="stat-label">Warnings</span>
            </div>
            <div class="quality-stat error">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15" stroke="white" stroke-width="2"/>
                <line x1="9" y1="9" x2="15" y2="15" stroke="white" stroke-width="2"/>
              </svg>
              <span class="stat-num">${data.qualityReport.errorTests}</span>
              <span class="stat-label">Errors</span>
            </div>
          </div>
        </div>
        
        ${data.qualityReport.topIssues.length > 0 ? `
        <div class="section-label-premium">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          TOP ISSUES
        </div>
        <div class="issues-list-premium">
          ${data.qualityReport.topIssues.slice(0, 5).map(issue => `
            <div class="issue-card ${issue.severity}">
              <div class="issue-icon">
                ${issue.severity === 'error' ? `
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12" stroke="white" stroke-width="2"/>
                    <line x1="12" y1="16" x2="12.01" y2="16" stroke="white" stroke-width="2"/>
                  </svg>
                ` : `
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  </svg>
                `}
              </div>
              <div class="issue-content">
                <div class="issue-message">${this._escapeHtml(issue.message)}</div>
              </div>
            </div>
          `).join('')}
        </div>
        ` : `
        <div class="quality-success">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <div class="success-title">All tests look good!</div>
          <div class="success-desc">No quality issues detected</div>
        </div>
        `}
        <button class="btn-secondary" onclick="viewQualityDetails()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 9 20 9"/>
          </svg>
          View Full Report
        </button>
      ` : `
        <div class="tab-empty-state">
          <div class="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="empty-title">No quality analysis yet</div>
          <div class="empty-desc">Run quality analysis to find empty tests, missing assertions, and other issues</div>
          <button class="empty-action" onclick="analyzeQuality()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            Analyze Test Quality
          </button>
        </div>
      `}
    </div>
  </div>
  
  <script>
    const vscode = acquireVsCodeApi();
    const allFiles = ${JSON.stringify(files)};
    
    // Initialize UI components
    function initializeUI() {
      console.log('[QAgenAI] Initializing UI...');
      
      // Tab switching
      const tabs = document.querySelectorAll('.nav-tab');
      console.log('[QAgenAI] Found', tabs.length, 'tabs');
      
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          console.log('[QAgenAI] Tab clicked:', tab.dataset.tab);
          
          document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
          tab.classList.add('active');
          
          const targetTab = document.getElementById('tab-' + tab.dataset.tab);
          console.log('[QAgenAI] Target tab element:', targetTab);
          
          if (targetTab) {
            targetTab.classList.add('active');
            console.log('[QAgenAI] Tab switched successfully to:', tab.dataset.tab);
          } else {
            console.error('[QAgenAI] Target tab not found for:', tab.dataset.tab);
          }
        });
      });
      
      // File filtering
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const filter = btn.dataset.filter;
          const filtered = filter === 'all' ? allFiles : allFiles.filter(f => f.testType === filter);
          const filesList = document.getElementById('files-list');
          if (filesList) {
            filesList.innerHTML = renderFiles(filtered);
          }
        });
      });
      
      // Restore tab on page load if needed
      const state = vscode.getState();
      if (state && state.returnToTab) {
        // Wait a bit for DOM to be fully ready
        setTimeout(() => {
          const targetTab = document.querySelector('[data-tab="' + state.returnToTab + '"]');
          if (targetTab) {
            targetTab.click();
          }
          // Clear the state
          vscode.setState({});
        }, 100);
      }
    }
    
    // Initialize after DOM is loaded (with fallback)
    try {
      console.log('[QAgenAI] Document ready state:', document.readyState);
      
      if (document.readyState === 'loading') {
        console.log('[QAgenAI] Waiting for DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', initializeUI);
      } else {
        console.log('[QAgenAI] DOM already loaded, initializing immediately');
        initializeUI();
      }
    } catch (error) {
      console.error('[QAgenAI] Error during initialization:', error);
    }
    
    function renderFiles(files) {
      if (files.length === 0) return '<div class="empty-state">No files found</div>';
      const untested = files.filter(f => !f.tested);
      const tested = files.filter(f => f.tested);
      return [...untested, ...tested].map(f => \`
        <div class="file-row \${f.tested ? 'tested' : ''}" \${f.tested ? \`onclick="openFile('\${esc(f.path)}')"\` : ''}>
          <span class="file-icon">\${f.tested 
            ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>' 
            : '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>'}</span>
          <span class="file-name">\${f.name}</span>
          <span class="file-path">\${f.dir}</span>
          \${!f.tested ? \`
            <div class="file-item-actions">
              <button class="btn-generate-component" onclick="generateComponentTest('\${esc(f.path)}')">Component</button>
              <button class="btn-generate-e2e" onclick="generateE2ETest('\${esc(f.path)}')">E2E</button>
            </div>
          \` : ''}
        </div>
      \`).join('');
    }
    
    function esc(s) { return s.replace(/'/g, "\\\\'"); }
    function openFile(p) { vscode.postMessage({ command: 'openFile', filePath: p }); }
    function generateTests(p) { vscode.postMessage({ command: 'generateTests', filePath: p }); }
    function generateComponentTest(p) { vscode.postMessage({ command: 'generateTests', filePath: p, testType: 'component' }); }
    function generateE2ETest(p) { vscode.postMessage({ command: 'generateTests', filePath: p, testType: 'e2e' }); }
    function generateFileTest(p, testType) { vscode.postMessage({ command: 'generateTests', filePath: p, testType }); }
    function runTests(t) { vscode.postMessage({ command: 'runTests', testType: t }); }
    function installFramework(f) { vscode.postMessage({ command: 'installFramework', framework: f }); }
    function refresh() { vscode.postMessage({ command: 'refresh' }); }
    function refreshAndStay(targetTab) {
      // Store current tab in state before refresh
      const state = vscode.getState() || {};
      state.returnToTab = targetTab;
      vscode.setState(state);
      vscode.postMessage({ command: 'refresh' });
    }
    function analyzeQuality() { vscode.postMessage({ command: 'analyzeQuality' }); }
    function viewQualityDetails() { vscode.postMessage({ command: 'viewQualityDetails' }); }
    function scanApp() { vscode.postMessage({ command: 'scanApp' }); }
    function stopApp() { vscode.postMessage({ command: 'stopApp' }); }
    function generateFlowTest(flowId) { vscode.postMessage({ command: 'generateFlowTest', flowId }); }
    function viewRoute(route) { vscode.postMessage({ command: 'viewRoute', route }); }
    function generateApiTest(endpointId) { vscode.postMessage({ command: 'generateApiTest', endpointId }); }
    function generateAllApiTests() { vscode.postMessage({ command: 'generateAllApiTests' }); }
    
    // Filter files by priority
    function filterFiles(priority, testType, evt) {
      const chips = document.querySelectorAll('.filter-chip');
      chips.forEach(chip => chip.classList.remove('active'));
      
      // Add active class to clicked chip (handle both event and direct call)
      if (evt && evt.target) {
        evt.target.classList.add('active');
      } else {
        // Find chip by data-filter attribute
        const targetChip = document.querySelector('.filter-chip[data-filter="' + priority + '"]');
        if (targetChip) {
          targetChip.classList.add('active');
        }
      }
      
      const cards = document.querySelectorAll('.file-card-premium');
      cards.forEach(card => {
        if (priority === 'all') {
          card.style.display = 'block';
        } else {
          if (card.classList.contains(priority)) {
            card.style.display = 'block';
          } else {
            card.style.display = 'none';
          }
        }
      });
    }
    
    // Generate tests for all untested files at once
    function generateAllTests(testType) {
      const cards = document.querySelectorAll('.file-card-premium.untested');
      const filePaths = [];
      
      cards.forEach(card => {
        const filePath = card.getAttribute('data-file-path');
        if (filePath) {
          filePaths.push(filePath);
        }
      });
      
      if (filePaths.length === 0) return;
      
      // Send batch request
      vscode.postMessage({ 
        command: 'generateBatchTests', 
        filePaths, 
        testType 
      });
    }
  </script>
</body>
</html>`;
  }
  
  private _buildTechStackSection(stacks: TechnologyStack[]): string {
    const techs: Array<{name: string; icon: string; color: string}> = [];
    
    for (const stack of stacks) {
      // Detect from stack name or type
      const stackName = stack.name.toLowerCase();
      
      if (stackName.includes('next') || stackName.includes('nextjs')) {
        techs.push({ name: 'Next.js', icon: this._getTechIcon('nextjs'), color: '#000' });
      }
      if (stackName.includes('react')) {
        techs.push({ name: 'React', icon: this._getTechIcon('react'), color: '#61DAFB' });
      }
      if (stackName.includes('vue')) {
        techs.push({ name: 'Vue', icon: this._getTechIcon('vue'), color: '#4FC08D' });
      }
      if (stackName.includes('angular')) {
        techs.push({ name: 'Angular', icon: this._getTechIcon('angular'), color: '#DD0031' });
      }
      if (stackName.includes('svelte')) {
        techs.push({ name: 'Svelte', icon: this._getTechIcon('svelte'), color: '#FF3E00' });
      }
      if (stackName.includes('node') || stackName.includes('express')) {
        techs.push({ name: 'Node.js', icon: this._getTechIcon('nodejs'), color: '#339933' });
      }
      if (stackName.includes('typescript') || stack.name.includes('TypeScript')) {
        techs.push({ name: 'TypeScript', icon: this._getTechIcon('typescript'), color: '#3178C6' });
      }
    }
    
    // Deduplicate
    const unique = techs.filter((t, i, arr) => arr.findIndex(x => x.name === t.name) === i);
    
    // If no techs detected from stack name, try to infer from frameworks
    if (unique.length === 0) {
      for (const stack of stacks) {
        for (const tt of stack.testTypes) {
          const fw = tt.framework.name.toLowerCase();
          if (fw.includes('playwright') || fw.includes('cypress')) {
            // Likely a web app
            unique.push({ name: 'Web App', icon: this._getTechIcon('web'), color: '#6366F1' });
            break;
          }
        }
      }
    }
    
    if (unique.length === 0) return '';
    
    return `
      <div class="tech-stack">
        ${unique.map(t => `
          <div class="tech-chip">
            <span class="tech-icon">${t.icon}</span>
            <span class="tech-name">${t.name}</span>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  private _getTechIcon(tech: string): string {
    const icons: Record<string, string> = {
      'react': `<svg width="16" height="16" viewBox="0 0 24 24" fill="#61DAFB"><circle cx="12" cy="12" r="2.5"/><ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="#61DAFB" stroke-width="1.5"/><ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="#61DAFB" stroke-width="1.5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="#61DAFB" stroke-width="1.5" transform="rotate(120 12 12)"/></svg>`,
      'nextjs': `<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>`,
      'vue': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M2 3h4l6 10.5L18 3h4L12 21 2 3z" fill="#4FC08D"/><path d="M6.5 3H12l6 10.5L12 3h5.5L12 14 6.5 3z" fill="#35495E"/></svg>`,
      'angular': `<svg width="16" height="16" viewBox="0 0 24 24" fill="#DD0031"><path d="M12 2L2 6.5l1.5 13L12 22l8.5-2.5 1.5-13L12 2zm0 2.5l6.5 2.5-1 8.5L12 18l-5.5-2.5-1-8.5L12 4.5z"/></svg>`,
      'svelte': `<svg width="16" height="16" viewBox="0 0 24 24" fill="#FF3E00"><path d="M20.5 5.5c-2.5-3.5-7.5-4-10.5-1.5L5 8c-2.5 2-3 5.5-1.5 8.5 1 2 3 3 5 3.5-.5 1-1 2.5-.5 4 1 2.5 4 4 6.5 3.5 2-.5 3.5-2 4-4l1-1.5c2.5-2 3-5.5 1.5-8.5z"/></svg>`,
      'nodejs': `<svg width="16" height="16" viewBox="0 0 24 24" fill="#339933"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.5l6 3.3v6.4l-6 3.3-6-3.3V7.8l6-3.3z"/></svg>`,
      'typescript': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="3" fill="#3178C6"/><path d="M6 12h8M10 8v8" stroke="white" stroke-width="2"/><path d="M15.5 16c1.5 0 2.5-1 2.5-2s-1-1.5-2.5-2c-1.5-.5-2.5-1-2.5-2s1-2 2.5-2" stroke="white" stroke-width="1.5" fill="none"/></svg>`,
      'web': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`
    };
    return icons[tech] || icons['web'];
  }
  
  private _buildFrameworkRow(testType: TestTypeMatrix, installed: boolean): string {
    const percent = testType.filesTotal > 0 
      ? Math.round((testType.filesTested / testType.filesTotal) * 100) 
      : 0;
    const logo = this._getFrameworkLogo(testType.framework.name);
    
    return `
      <div class="fw-row ${installed ? '' : 'not-installed'}">
        <div class="fw-logo">${logo}</div>
        <div class="fw-info">
          <span class="fw-name">${testType.framework.name}</span>
          <span class="fw-type">${this._formatTestType(testType.testType)}</span>
        </div>
        ${installed ? `
          <div class="fw-progress-mini">
            <div class="fw-bar">
              <div class="fw-bar-fill" style="width: ${percent}%"></div>
            </div>
            <span class="fw-pct">${percent}%</span>
          </div>
          <button class="fw-run" onclick="runTests('${testType.testType}'); event.stopPropagation();">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>
          </button>
        ` : `
          <button class="fw-install" onclick="installFramework('${testType.framework.name}'); event.stopPropagation();">
            Install
          </button>
        `}
      </div>
    `;
  }
  
  private _buildFrameworkCard(testType: TestTypeMatrix, installed: boolean, data: CoverageData): string {
    const percent = testType.filesTotal > 0 
      ? Math.round((testType.filesTested / testType.filesTotal) * 100) 
      : 0;
    const logo = this._getFrameworkLogo(testType.framework.name);
    
    // Determine what this framework tests and navigation
    let purpose = '';
    let purposeIcon = '';
    let tabNavigation = '';
    let navigationLabel = '';
    
    const tt = testType.testType.toLowerCase();
    if (tt === 'e2e' || testType.framework.name.toLowerCase().includes('playwright') || testType.framework.name.toLowerCase().includes('cypress')) {
      purpose = 'Tests user flows & journeys';
      purposeIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>';
      tabNavigation = 'flows';
      navigationLabel = 'View Flows';
    } else if (tt === 'api' || tt === 'integration') {
      purpose = 'Tests API endpoints';
      purposeIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
      tabNavigation = 'api';
      navigationLabel = 'View API Tests';
    } else if (tt === 'visual' || testType.framework.name.toLowerCase().includes('chromatic') || testType.framework.name.toLowerCase().includes('storybook')) {
      purpose = 'Tests visual components';
      purposeIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
      tabNavigation = 'files';
      navigationLabel = 'View Files';
    } else {
      // Component, Unit, Hook tests
      purpose = 'Tests files & components';
      purposeIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></svg>';
      tabNavigation = 'files';
      navigationLabel = 'View Files';
    }
    
    // Get tab index for navigation
    let tabIndex = 2; // files default
    if (tabNavigation === 'flows') tabIndex = 1;
    else if (tabNavigation === 'api') tabIndex = data.qualityReport ? 3 : 2;
    
    return `
      <div class="framework-card ${installed ? 'installed' : 'not-installed'}">
        <div class="fw-card-header">
          <div class="fw-card-logo">${logo}</div>
          <div class="fw-card-info">
            <div class="fw-card-name">${testType.framework.name}</div>
            <div class="fw-card-type">${this._formatTestType(testType.testType)}</div>
          </div>
        ${installed ? `
            <div class="fw-status-badge fw-installed">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>
              Installed
            </div>
          ` : `
            <div class="fw-status-badge fw-not-installed">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>
              Setup Required
            </div>
          `}
        </div>
        
        <!-- Purpose Badge -->
        <div class="fw-purpose">
          <span class="fw-purpose-icon">${purposeIcon}</span>
          <span class="fw-purpose-text">${purpose}</span>
        </div>
        
        ${installed ? `
          <div class="fw-card-progress">
            <div class="fw-progress-bar">
              <div class="fw-progress-fill" style="width: ${percent}%; background: ${this._getScoreColor(percent)}"></div>
            </div>
            <div class="fw-progress-stats">
              <span class="fw-stat">${testType.filesTested} / ${testType.filesTotal} files</span>
              <span class="fw-stat-percent">${percent}%</span>
            </div>
          </div>
          <div class="fw-card-actions">
            <button class="fw-card-btn fw-btn-run" onclick="runTests('${testType.testType}'); event.stopPropagation();">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>
              Run Tests
            </button>
            <button class="fw-card-btn fw-btn-view" onclick="document.querySelectorAll('.nav-tab')[${tabIndex}].click(); event.stopPropagation();">
              ${navigationLabel} ›
            </button>
          </div>
        ` : `
          <div class="fw-card-description">Install ${testType.framework.name} to start ${purpose.toLowerCase()}</div>
          <button class="fw-card-btn fw-btn-install" onclick="installFramework('${testType.framework.name}'); event.stopPropagation();">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14m-7-7l7 7 7-7"/></svg>
            Install ${testType.framework.name}
          </button>
        `}
      </div>
    `;
  }
  
  private _buildPremiumFilesTab(files: FileItem[], data: CoverageData): string {
    // Filter out E2E files - those belong in Flows tab
    const relevantFiles = files.filter(f => f.testType !== 'e2e');
    const untested = relevantFiles.filter(f => !f.tested);
    const tested = relevantFiles.filter(f => f.tested);
    
    // Group by test type
    const unitFiles = relevantFiles.filter(f => f.testType === 'unit');
    const componentFiles = relevantFiles.filter(f => ['component', 'hook', 'visual'].includes(f.testType));
    const apiFiles = relevantFiles.filter(f => f.testType === 'api' || f.testType === 'integration');
    
    const totalFiles = relevantFiles.length;
    const testedFiles = tested.length;
    const untestedFiles = untested.length;
    const percent = totalFiles > 0 ? Math.round((testedFiles / totalFiles) * 100) : 0;
    
    if (totalFiles === 0) {
      return `
        <div class="files-empty-state">
          <div class="empty-icon-svg">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div class="empty-title">No Files Found</div>
          <div class="empty-desc">Run workspace analysis to discover files that need testing</div>
        </div>
      `;
    }
    
    return `
      <!-- Hero Dashboard -->
      <div class="files-hero">
        <div class="files-hero-header">
          <div class="files-hero-title">
            <span class="files-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </span>
            <div>
              <h3>Files</h3>
              <p>Test individual files & components</p>
            </div>
          </div>
        </div>
        
        <div class="files-stats-grid">
          <div class="files-stat-card">
            <div class="stat-ring-mini">
              <svg class="ring-mini" viewBox="0 0 36 36">
                <circle class="ring-mini-bg" cx="18" cy="18" r="16"/>
                <circle class="ring-mini-progress" cx="18" cy="18" r="16" 
                  stroke-dasharray="${percent} 100"
                  style="--color: ${this._getScoreColor(percent)}"/>
              </svg>
              <span class="stat-ring-value">${percent}%</span>
            </div>
            <div class="stat-info">
              <span class="stat-label">Coverage</span>
              <span class="stat-value">${testedFiles}/${totalFiles}</span>
            </div>
          </div>
          
          ${untestedFiles > 0 ? `
          <div class="files-recommendation-card">
            <div class="rec-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <div class="rec-info">
              <div class="rec-title">Generate tests for ${untestedFiles} files</div>
              <div class="rec-desc">Speed up testing with batch generation</div>
            </div>
          </div>
          ` : `
          <div class="files-success-card">
            <div class="success-icon">🎉</div>
            <div class="success-info">
              <div class="success-title">All files have tests!</div>
              <div class="success-desc">Great work! Your code is well tested.</div>
            </div>
          </div>
          `}
        </div>
      </div>
      
      <!-- Test Groups -->
      ${unitFiles.length > 0 ? this._buildTestGroup('unit', '📦', 'Unit Tests', 'Functions, utilities & helpers', unitFiles, data) : ''}
      ${componentFiles.length > 0 ? this._buildTestGroup('component', '🎨', 'Component Tests', 'React/Vue components & UI', componentFiles, data) : ''}
      ${apiFiles.length > 0 ? this._buildTestGroup('api', '✦', 'API Tests', 'Endpoints & integrations', apiFiles, data) : ''}
    `;
  }
  
  private _buildTestGroup(type: string, icon: string, title: string, description: string, files: FileItem[], data: CoverageData): string {
    const untested = files.filter(f => !f.tested);
    const tested = files.filter(f => f.tested);
    const percent = files.length > 0 ? Math.round((tested.length / files.length) * 100) : 0;
    
    // Group by directory
    const byDirectory = new Map<string, FileItem[]>();
    for (const file of files) {
      const dir = file.dir || '/';
      if (!byDirectory.has(dir)) {
        byDirectory.set(dir, []);
      }
      byDirectory.get(dir)!.push(file);
    }
    
    return `
      <div class="test-group" data-type="${type}">
        <div class="test-group-header">
          <div class="test-group-title">
            <span class="test-group-icon">${icon}</span>
            <div>
              <div class="test-group-name">${title}</div>
              <div class="test-group-desc">${description}</div>
            </div>
          </div>
          <div class="test-group-stats">
            <span class="test-group-count">${tested.length}/${files.length}</span>
            <div class="test-group-progress">
              <div class="test-group-progress-bar">
                <div class="test-group-progress-fill" style="width: ${percent}%; background: ${this._getScoreColor(percent)}"></div>
              </div>
              <span class="test-group-percent">${percent}%</span>
            </div>
          </div>
        </div>
        
        <div class="test-group-content">
          ${Array.from(byDirectory.entries()).map(([dir, dirFiles]) => 
            this._buildDirectorySection(dir, dirFiles, type, data)
          ).join('')}
        </div>
      </div>
    `;
  }
  
  private _buildDirectorySection(directory: string, files: FileItem[], groupType: string, data: CoverageData): string {
    const untested = files.filter(f => !f.tested);
    const displayDir = directory === '/' ? 'Root' : directory;
    
    return `
      <div class="directory-section" data-directory="${directory}">
        <div class="directory-header" onclick="this.parentElement.classList.toggle('collapsed')">
          <span class="directory-arrow">▾</span>
          <span class="directory-icon">📁</span>
          <span class="directory-name">${this._escapeHtml(displayDir)}</span>
          <span class="directory-count">${files.length} files</span>
          ${untested.length > 0 ? `<span class="directory-badge">${untested.length} untested</span>` : ''}
        </div>
        <div class="directory-files">
          ${files.map(f => this._buildPremiumFileCard(f, groupType, data)).join('')}
        </div>
      </div>
    `;
  }
  
  private _buildPremiumFileCard(file: FileItem, groupType: string, data?: CoverageData): string {
    const recommendation = this._getSmartRecommendation(file, groupType);
    
    // Check if framework is installed
    const hasFramework = data?.stacks.some(stack => 
      stack.testTypes.some(tt => tt.status === 'installed')
    ) ?? true;
    
    return `
      <div class="file-card ${file.tested ? 'tested' : 'untested'}" ${file.tested ? `onclick="openFile('${file.path.replace(/'/g, "\\'")}')"`  : ''}>
        <div class="file-card-header">
          <span class="file-status-icon">${file.tested ? '✓' : '○'}</span>
          <div class="file-card-info">
            <div class="file-card-name">${this._escapeHtml(file.name)}</div>
            <div class="file-card-path">${this._escapeHtml(file.dir)}</div>
          </div>
          <span class="file-type-badge file-type-${file.testType}">${this._formatTestType(file.testType)}</span>
        </div>
        
        ${!file.tested && recommendation ? `
          <div class="file-recommendation">
            <span class="rec-icon-small">💡</span>
            <span class="rec-text">${recommendation}</span>
          </div>
          
          ${hasFramework ? `
            <button class="file-card-action" onclick="generateFileTest('${file.path.replace(/'/g, "\\'")}',' ${groupType}'); event.stopPropagation();">
              ⚡ Generate ${groupType === 'unit' ? 'Unit' : 'Component'} Test
            </button>
          ` : `
            <div class="file-card-warning">
              <span class="warning-icon">⚠️</span>
              <span class="warning-text">Install ${groupType === 'unit' ? 'Jest' : 'testing framework'} to generate tests</span>
            </div>
            <button class="file-card-action disabled" disabled title="Install Jest first">
              🔒 Framework Required
            </button>
          `}
        ` : ''}
        
        ${file.tested ? `
          <div class="file-tested-badge">
            <span class="tested-icon">✓</span>
            <span class="tested-text">Test exists</span>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  
  private _categorizeTestTypes(stacks: TechnologyStack[]) {
    const installedTypes: { stack: TechnologyStack; testType: TestTypeMatrix }[] = [];
    const setupTypes: { stack: TechnologyStack; testType: TestTypeMatrix }[] = [];
    
    for (const stack of stacks) {
      for (const tt of stack.testTypes) {
        if (tt.status === 'installed') {
          installedTypes.push({ stack, testType: tt });
        } else {
          setupTypes.push({ stack, testType: tt });
        }
      }
    }
    
    return { installedTypes, setupTypes };
  }
  
  private _buildFileData(stacks: TechnologyStack[]): FileItem[] {
    const files: FileItem[] = [];
    const seenPaths = new Set<string>();
    
    for (const stack of stacks) {
      if (stack.scannedFiles) {
        for (const file of stack.scannedFiles) {
          const testType = this._determineTestType(file.relativePath, file.path, stack);
          const key = `${file.path}-${testType}`;
          
          if (!seenPaths.has(key)) {
            seenPaths.add(key);
            const name = file.relativePath.split('/').pop() || file.relativePath;
            const dir = file.relativePath.replace(name, '').replace(/\/$/, '');
            files.push({ name, path: file.path, dir, tested: file.hasTest, testType });
          }
        }
      }
    }
    
    return files;
  }
  
  private _determineTestType(relativePath: string, absolutePath: string, stack: TechnologyStack): string {
    const fileName = relativePath.split('/').pop() || '';
    
    const nextAppRouterFiles = ['page.tsx', 'page.jsx', 'layout.tsx', 'layout.jsx', 
                                'template.tsx', 'error.tsx', 'loading.tsx', 'not-found.tsx'];
    if (absolutePath.includes('/app/') && nextAppRouterFiles.includes(fileName)) {
      return 'e2e';
    }
    if (absolutePath.includes('/api/') || absolutePath.includes('/routes/')) return 'api';
    if (fileName.includes('.stories.')) return 'visual';
    if (fileName.startsWith('use') && fileName.endsWith('.ts')) return 'hook';
    if (absolutePath.includes('/components/')) return 'component';
    if (absolutePath.includes('/utils/') || absolutePath.includes('/lib/')) return 'unit';
    
    return stack.testTypes[0]?.testType || 'component';
  }
  
  private _getScoreColor(score: number): string {
    if (score >= 80) return '#22c55e';
    if (score >= 50) return '#eab308';
    return '#ef4444';
  }
  
  private _formatTestType(type: string): string {
    const names: Record<string, string> = {
      'component': 'Component', 'e2e': 'E2E', 'visual': 'Visual',
      'unit': 'Unit', 'integration': 'Integration', 'api': 'API', 'hook': 'Hook'
    };
    return names[type] || type;
  }
  
  private _escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  
  private _countTestedFlows(data: CoverageData): number {
    if (!data.flowAnalysis || !data.flowStates) return 0;
    return Object.values(data.flowStates).filter(state => 
      state.status === 'generated' || state.status === 'passing' || state.status === 'failing'
    ).length;
  }
  
  private _getFrameworkLogo(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('playwright')) return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#2D4A22"/><path d="M7 6v12l10-6L7 6z" fill="#45BA4B"/></svg>`;
    if (n.includes('jest')) return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#99425B"/><path d="M12 5v6l5 3-5 3v-6L7 8l5-3z" fill="white"/></svg>`;
    if (n.includes('chromatic')) return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#FC521F"/><circle cx="12" cy="12" r="5" fill="white"/><circle cx="12" cy="12" r="2.5" fill="#FC521F"/></svg>`;
    if (n.includes('cypress')) return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#1B1E2E"/><circle cx="12" cy="12" r="6" stroke="#69D3A7" stroke-width="2" fill="none"/></svg>`;
    if (n.includes('vitest')) return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#1E1E20"/><path d="M7 7l5 10 5-10" stroke="#FCC72B" stroke-width="2" fill="none"/></svg>`;
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#6366F1"/><path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`;
  }
  
  private _getLoadingHtml(): string {
    return `<!DOCTYPE html>
<html><head><style>
  body { font-family: system-ui, -apple-system, sans-serif; background: transparent; display: flex; align-items: center; justify-content: center; min-height: 300px; }
  .loader { text-align: center; color: rgba(255,255,255,0.6); }
  .spinner { width: 32px; height: 32px; border: 2px solid rgba(255,255,255,0.1); border-top-color: #a855f7; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style></head>
<body><div class="loader"><div class="spinner"></div>Analyzing...</div></body></html>`;
  }
  
  private _getPremiumStyles(): string {
    return `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      :root {
        --bg: #09090b;
        --card: rgba(255,255,255,0.02);
        --card-hover: rgba(255,255,255,0.04);
        --border: rgba(255,255,255,0.06);
        --border-hover: rgba(255,255,255,0.12);
        --text: rgba(255,255,255,0.92);
        --muted: rgba(255,255,255,0.45);
        --purple: #a855f7;
        --purple-glow: rgba(168,85,247,0.15);
        --green: #22c55e;
        --yellow: #f59e0b;
        --red: #ef4444;
        --gradient: linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(59,130,246,0.04) 100%);
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
        background: transparent;
        color: var(--text);
        font-size: 13px;
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
      }
      .app { padding: 12px; }
      
      /* Navigation Tabs - Pill style */
      .nav-tabs {
        display: flex;
        gap: 2px;
        margin-bottom: 16px;
        background: var(--card);
        padding: 3px;
        border-radius: 10px;
        border: 1px solid var(--border);
      }
      .nav-tab {
        flex: 1;
        background: none;
        border: none;
        color: var(--muted);
        font-size: 11px;
        font-weight: 500;
        padding: 7px 10px;
        border-radius: 7px;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        position: relative;
      }
      .nav-tab:hover { color: var(--text); }
      .nav-tab.active { 
        color: white; 
        background: var(--purple);
        box-shadow: 0 2px 8px rgba(168,85,247,0.3);
      }
      .tab-icon-svg {
        flex-shrink: 0;
      }
      .nav-tab.active .tab-icon-svg {
        filter: drop-shadow(0 0 4px rgba(255,255,255,0.5));
      }
      .tab-badge {
        background: var(--yellow);
        color: #000;
        font-size: 9px;
        font-weight: 700;
        padding: 2px 5px;
        border-radius: 6px;
        min-width: 16px;
        text-align: center;
      }
      .nav-tab.active .tab-badge { background: white; }
      
      /* Tab Content */
      .tab-content { display: none; }
      .tab-content.active { display: block; animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
      @keyframes slideUp { 
        from { opacity: 0; transform: translateY(8px); } 
        to { opacity: 1; transform: translateY(0); } 
      }
      
      /* Premium Coverage Hero Card */
      .coverage-hero-card {
        background: linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(59,130,246,0.05) 100%);
        border: 1px solid rgba(168,85,247,0.2);
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 20px;
        position: relative;
        overflow: hidden;
      }
      .coverage-hero-card::before {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        width: 200px;
        height: 200px;
        background: radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%);
        pointer-events: none;
      }
      .hero-content {
        display: flex;
        align-items: center;
        gap: 32px;
        position: relative;
        z-index: 1;
      }
      .hero-ring-container {
        position: relative;
        width: 120px;
        height: 120px;
        flex-shrink: 0;
      }
      .hero-ring {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
        filter: drop-shadow(0 0 12px currentColor);
      }
      .hero-ring-bg {
        fill: none;
        stroke: rgba(255,255,255,0.06);
        stroke-width: 6;
      }
      .hero-ring-progress {
        fill: none;
        stroke-width: 6;
        stroke-linecap: round;
        transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .hero-ring-content {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      .hero-percentage {
        font-size: 36px;
        font-weight: 900;
        color: var(--text);
        line-height: 1;
        letter-spacing: -2px;
      }
      .hero-unit {
        font-size: 18px;
        font-weight: 700;
        margin-left: 2px;
      }
      .hero-label {
        font-size: 10px;
        font-weight: 600;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.8px;
        margin-top: 4px;
      }
      .hero-stats {
        display: flex;
        gap: 16px;
        flex: 1;
      }
      .hero-stat-card {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: rgba(0,0,0,0.2);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 12px;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .hero-stat-card:hover {
        background: rgba(0,0,0,0.3);
        border-color: rgba(255,255,255,0.1);
        transform: translateY(-2px);
      }
      .stat-icon-wrapper {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        flex-shrink: 0;
      }
      .stat-icon-wrapper.green {
        background: rgba(34,197,94,0.15);
        color: #22c55e;
      }
      .stat-icon-wrapper.orange {
        background: rgba(251,146,60,0.15);
        color: #fb923c;
      }
      .stat-icon-wrapper.purple {
        background: rgba(168,85,247,0.15);
        color: #a855f7;
      }
      .stat-info {
        flex: 1;
        min-width: 0;
      }
      .stat-number {
        font-size: 28px;
        font-weight: 800;
        color: var(--text);
        line-height: 1;
        letter-spacing: -1px;
        margin-bottom: 4px;
      }
      .stat-total {
        font-size: 16px;
        font-weight: 600;
        color: var(--muted);
        margin-left: 2px;
      }
      .stat-label {
        font-size: 10px;
        font-weight: 600;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .ring-container { position: relative; width: 64px; height: 64px; flex-shrink: 0; z-index: 1; }
      .ring { width: 100%; height: 100%; transform: rotate(-90deg); filter: drop-shadow(0 0 8px var(--color)); }
      .ring-bg { fill: none; stroke: rgba(255,255,255,0.06); stroke-width: 5; }
      .ring-progress { 
        fill: none; 
        stroke: var(--color); 
        stroke-width: 5; 
        stroke-linecap: round; 
        transition: stroke-dasharray 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .ring-content {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      /* Analyze Workspace CTA Card */
      .analyze-cta-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 18px 20px;
        background: linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(168,85,247,0.08) 100%);
        border: 1px solid rgba(59,130,246,0.25);
        border-radius: 12px;
        margin-bottom: 20px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }
      .analyze-cta-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, #3b82f6, #a855f7);
        opacity: 0.6;
      }
      .analyze-cta-card:hover {
        border-color: rgba(59,130,246,0.4);
        box-shadow: 0 4px 16px rgba(59,130,246,0.2);
        transform: translateY(-1px);
      }
      .cta-icon-large {
        width: 52px;
        height: 52px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(59,130,246,0.15);
        border-radius: 12px;
        color: #3b82f6;
        flex-shrink: 0;
        transition: all 0.3s;
      }
      .analyze-cta-card:hover .cta-icon-large {
        transform: rotate(180deg);
        background: rgba(59,130,246,0.25);
      }
      .cta-content {
        flex: 1;
        min-width: 0;
      }
      .cta-title-large {
        font-size: 14px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 4px;
        letter-spacing: 0.3px;
      }
      .cta-desc-large {
        font-size: 11px;
        color: var(--muted);
        line-height: 1.4;
      }
      .cta-btn-large {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        border: none;
        border-radius: 8px;
        color: white;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(59,130,246,0.3);
        flex-shrink: 0;
      }
      .cta-btn-large:hover {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59,130,246,0.4);
      }
      .cta-btn-large:active {
        transform: scale(0.98);
      }
      .cta-btn-large svg {
        width: 16px;
        height: 16px;
      }
      
      /* Test Categories Cards - Premium Business Design */
      .test-categories {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 20px;
      }
      .category-card {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 16px;
        background: linear-gradient(135deg, rgba(168,85,247,0.05) 0%, rgba(139,92,246,0.02) 100%);
        border: 1px solid var(--border);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }
      .category-card::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: linear-gradient(180deg, var(--purple), #8b5cf6);
        opacity: 0;
        transition: opacity 0.25s;
      }
      .category-card:hover::before {
        opacity: 1;
      }
      .category-card:hover {
        background: linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(139,92,246,0.04) 100%);
        border-color: rgba(168,85,247,0.3);
        transform: translateX(4px);
        box-shadow: 0 4px 12px rgba(168,85,247,0.15);
      }
      .category-icon {
        font-size: 28px;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(168,85,247,0.12);
        border-radius: 10px;
        flex-shrink: 0;
        transition: all 0.25s;
      }
      .category-card:hover .category-icon {
        background: rgba(168,85,247,0.18);
        transform: scale(1.05);
      }
      .category-icon-files {
        color: #a855f7;
      }
      .category-icon-flows {
        color: #3b82f6;
      }
      .category-icon-api {
        color: #f59e0b;
      }
      .category-info {
        flex: 1;
      }
      .category-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 2px;
        letter-spacing: 0.3px;
      }
      .category-subtitle {
        font-size: 11px;
        color: var(--muted);
        margin-bottom: 6px;
      }
      .category-stats {
        font-size: 12px;
        color: var(--muted);
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .cat-tested {
        color: var(--green);
        font-weight: 700;
      }
      .cat-total {
        font-weight: 600;
      }
      .cat-percent {
        margin-left: auto;
        padding: 3px 8px;
        background: rgba(168,85,247,0.15);
        border-radius: 6px;
        color: var(--purple);
        font-weight: 700;
        font-size: 11px;
      }
      .category-arrow {
        font-size: 24px;
        color: var(--muted);
        transition: all 0.25s;
      }
      .category-card:hover .category-arrow {
        color: var(--purple);
        transform: translateX(4px);
      }
      
      /* Framework Cards Grid - Premium Design */
      .frameworks-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }
      .framework-card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .framework-card:hover {
        background: var(--card-hover);
        border-color: var(--border-hover);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      .framework-card.installed {
        border-left: 3px solid var(--green);
      }
      .framework-card.not-installed {
        border-left: 3px solid var(--yellow);
        opacity: 0.8;
      }
      .fw-card-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }
      .fw-card-logo {
        flex-shrink: 0;
      }
      .fw-card-info {
        flex: 1;
        min-width: 0;
      }
      .fw-card-name {
        font-size: 13px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 2px;
      }
      .fw-card-type {
        font-size: 10px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .fw-purpose {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 10px;
        background: rgba(168,85,247,0.08);
        border-radius: 8px;
        margin-bottom: 12px;
      }
      .fw-purpose-icon {
        font-size: 16px;
        color: var(--purple);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .fw-purpose-icon svg {
        width: 14px;
        height: 14px;
      }
      .fw-purpose-text {
        font-size: 11px;
        color: var(--text);
        font-weight: 500;
      }
      .fw-status-badge {
        font-size: 9px;
        font-weight: 600;
        padding: 4px 8px;
        border-radius: 8px;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .fw-status-badge svg {
        width: 10px;
        height: 10px;
      }
      .fw-installed {
        background: rgba(34,197,94,0.15);
        color: var(--green);
      }
      .fw-not-installed {
        background: rgba(245,158,11,0.15);
        color: var(--yellow);
      }
      .fw-card-progress {
        margin-bottom: 12px;
      }
      .fw-progress-bar {
        height: 6px;
        background: rgba(255,255,255,0.08);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 6px;
      }
      .fw-progress-fill {
        height: 100%;
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 3px;
      }
      .fw-progress-stats {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
      }
      .fw-stat {
        color: var(--muted);
      }
      .fw-stat-percent {
        font-weight: 700;
        color: var(--text);
      }
      .fw-card-description {
        font-size: 11px;
        color: var(--muted);
        margin-bottom: 12px;
        line-height: 1.5;
      }
      .fw-card-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .fw-card-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px;
        border: none;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }
      .fw-btn-run {
        background: linear-gradient(135deg, var(--purple), #8b5cf6);
        color: white;
        box-shadow: 0 2px 8px rgba(168,85,247,0.2);
      }
      .fw-btn-run:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(168,85,247,0.3);
      }
      .fw-btn-view {
        background: rgba(59,130,246,0.1);
        color: #3b82f6;
        border: 1px solid rgba(59,130,246,0.3);
      }
      .fw-btn-view:hover {
        background: rgba(59,130,246,0.15);
        border-color: #3b82f6;
      }
      .fw-btn-install {
        width: 100%;
        background: rgba(245,158,11,0.15);
        color: var(--yellow);
        border: 1px solid rgba(245,158,11,0.3);
      }
      .fw-btn-install:hover {
        background: rgba(245,158,11,0.25);
        border-color: var(--yellow);
      }
      .ring-value { font-size: 18px; font-weight: 700; letter-spacing: -0.5px; }
      .ring-unit { font-size: 10px; color: var(--muted); margin-left: 1px; }
      .coverage-stats { display: flex; gap: 16px; z-index: 1; }
      .cov-stat { display: flex; flex-direction: column; }
      .cov-num { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.1; }
      .cov-num.green { color: var(--green); }
      .cov-num.yellow { color: var(--yellow); }
      .cov-label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.3px; }
      
      /* Section Label */
      .section-label {
        font-size: 9px;
        font-weight: 600;
        letter-spacing: 0.8px;
        color: var(--muted);
        margin-bottom: 8px;
        text-transform: uppercase;
      }
      
      /* Frameworks List */
      .frameworks-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
      .fw-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 10px;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
      }
      .fw-row:hover { 
        background: var(--card-hover); 
        border-color: var(--border-hover);
        transform: translateY(-1px);
      }
      .fw-row.not-installed { opacity: 0.5; border-style: dashed; }
      .fw-row.not-installed:hover { opacity: 0.7; }
      .fw-logo { 
        flex-shrink: 0; 
        display: flex; 
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
      }
      .fw-info { flex: 1; min-width: 0; }
      .fw-name { font-weight: 600; display: block; font-size: 13px; }
      .fw-type { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.3px; }
      .fw-progress-mini { display: flex; align-items: center; gap: 8px; }
      .fw-bar { 
        width: 44px; 
        height: 3px; 
        background: rgba(255,255,255,0.08); 
        border-radius: 2px; 
        overflow: hidden; 
      }
      .fw-bar-fill { 
        height: 100%; 
        background: linear-gradient(90deg, var(--green), #4ade80); 
        border-radius: 2px;
        transition: width 0.4s ease;
      }
      .fw-pct { font-size: 11px; font-weight: 700; color: var(--green); min-width: 28px; text-align: right; }
      .fw-run {
        width: 30px; height: 30px;
        display: flex; align-items: center; justify-content: center;
        background: linear-gradient(135deg, var(--purple), #9333ea);
        border: none; border-radius: 8px;
        color: white; cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(168,85,247,0.25);
      }
      .fw-run:hover { transform: scale(1.08); box-shadow: 0 4px 12px rgba(168,85,247,0.35); }
      .fw-run:active { transform: scale(0.95); }
      .fw-install {
        padding: 6px 12px;
        background: transparent;
        border: 1px dashed rgba(255,255,255,0.15);
        border-radius: 6px;
        color: var(--muted);
        font-size: 10px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      .fw-install:hover { 
        border-color: var(--purple); 
        color: var(--purple); 
        background: var(--purple-glow);
      }
      
      /* Quality CTA */
      .quality-cta {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .quality-cta:hover { 
        border-color: var(--purple); 
        background: var(--purple-glow);
        transform: translateY(-1px);
      }
      .cta-icon { 
        color: var(--purple); 
        display: flex;
        padding: 8px;
        background: var(--purple-glow);
        border-radius: 8px;
      }
      .cta-text { flex: 1; }
      .cta-title { font-weight: 600; display: block; font-size: 13px; }
      .cta-desc { font-size: 11px; color: var(--muted); }
      .cta-arrow { color: var(--muted); transition: transform 0.2s; }
      .quality-cta:hover .cta-arrow { transform: translateX(3px); color: var(--purple); }
      
      /* Files Filter - Segmented control */
      .files-filter {
        display: flex;
        gap: 0;
        margin-bottom: 12px;
        background: var(--card);
        padding: 3px;
        border-radius: 8px;
        border: 1px solid var(--border);
        overflow-x: auto;
      }
      .filter-btn {
        background: transparent;
        border: none;
        color: var(--muted);
        font-size: 10px;
        font-weight: 500;
        padding: 5px 10px;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.15s;
        white-space: nowrap;
      }
      .filter-btn:hover { color: var(--text); }
      .filter-btn.active { 
        background: var(--purple); 
        color: white; 
        box-shadow: 0 2px 6px rgba(168,85,247,0.25);
      }
      
      /* Files List */
      .files-list { 
        display: flex; 
        flex-direction: column; 
        gap: 1px; 
        max-height: 380px; 
        overflow-y: auto;
        margin: 0 -4px;
        padding: 0 4px;
      }
      .files-list::-webkit-scrollbar { width: 4px; }
      .files-list::-webkit-scrollbar-track { background: transparent; }
      .files-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
      .file-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s;
        border: 1px solid transparent;
      }
      .file-row:hover { 
        background: var(--card-hover); 
        border-color: var(--border);
      }
      .file-row.tested { opacity: 0.4; }
      .file-row.tested:hover { opacity: 0.6; }
      .file-icon { 
        width: 18px; 
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        border-radius: 4px;
      }
      .file-row:not(.tested) .file-icon { color: var(--yellow); background: rgba(245,158,11,0.15); }
      .file-row.tested .file-icon { color: var(--green); background: rgba(34,197,94,0.15); }
      .file-name { 
        flex: 1; 
        font-weight: 500; 
        font-size: 12px;
        white-space: nowrap; 
        overflow: hidden; 
        text-overflow: ellipsis; 
      }
      .file-path { 
        font-size: 10px; 
        color: var(--muted); 
        max-width: 70px; 
        white-space: nowrap; 
        overflow: hidden; 
        text-overflow: ellipsis; 
      }
      .file-action { 
        font-size: 9px; 
        font-weight: 600;
        color: var(--purple); 
        opacity: 0; 
        transition: all 0.15s; 
        white-space: nowrap;
        padding: 3px 8px;
        background: var(--purple-glow);
        border-radius: 4px;
      }
      .file-row:hover .file-action { opacity: 1; }
      
      /* File Item Actions - Dual Buttons */
      .file-item-actions {
        display: flex;
        gap: 6px;
        opacity: 0;
        transition: all 0.2s;
      }
      .file-row:hover .file-item-actions { opacity: 1; }
      .btn-generate-component,
      .btn-generate-e2e {
        font-size: 10px;
        font-weight: 600;
        padding: 5px 12px;
        border: 1px solid var(--border);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
        background: var(--card);
      }
      .btn-generate-component {
        color: #3b82f6;
        border-color: rgba(59,130,246,0.3);
      }
      .btn-generate-component:hover {
        background: rgba(59,130,246,0.15);
        border-color: #3b82f6;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(59,130,246,0.3);
      }
      .btn-generate-e2e {
        color: var(--purple);
        border-color: rgba(168,85,247,0.3);
      }
      .btn-generate-e2e:hover {
        background: var(--purple-glow);
        border-color: var(--purple);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(168,85,247,0.3);
      }
      
      /* Quality Tab */
      .quality-header { 
        display: flex; 
        align-items: center; 
        gap: 16px; 
        margin-bottom: 16px;
        padding: 16px;
        background: var(--gradient);
        border-radius: 12px;
        border: 1px solid var(--border);
      }
      .quality-score { 
        font-size: 36px; 
        font-weight: 800; 
        letter-spacing: -1px;
        line-height: 1;
      }
      .quality-summary { display: flex; flex-direction: column; gap: 3px; }
      .qs { font-size: 11px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
      .qs::before { content: ''; width: 6px; height: 6px; border-radius: 50%; }
      .qs.good { color: var(--green); }
      .qs.good::before { background: var(--green); }
      .qs.warn { color: var(--yellow); }
      .qs.warn::before { background: var(--yellow); }
      .qs.error { color: var(--red); }
      .qs.error::before { background: var(--red); }
      
      .issues-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
      .issue-item {
        display: flex; align-items: flex-start; gap: 10px;
        padding: 10px 12px;
        background: var(--card);
        border-radius: 8px;
        font-size: 12px;
        border: 1px solid var(--border);
        transition: all 0.15s;
      }
      .issue-item:hover { border-color: var(--border-hover); }
      .issue-item.error { border-left: 3px solid var(--red); }
      .issue-item.warning { border-left: 3px solid var(--yellow); }
      .issue-badge { 
        font-weight: 700; 
        font-size: 11px;
        width: 18px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      }
      .issue-item.error .issue-badge { color: white; background: var(--red); }
      .issue-item.warning .issue-badge { color: #000; background: var(--yellow); }
      .issue-text { flex: 1; color: var(--text); line-height: 1.4; font-size: 11px; }
      
      .btn-secondary {
        width: 100%;
        padding: 11px;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text);
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .btn-secondary:hover { 
        border-color: var(--purple); 
        background: var(--purple-glow);
        transform: translateY(-1px);
      }
      
      .empty-state { 
        text-align: center; 
        padding: 32px 16px; 
        color: var(--muted); 
        font-size: 12px;
        background: var(--card);
        border-radius: 10px;
        border: 1px dashed var(--border);
      }
      
      /* Tech Stack */
      .tech-stack {
        display: flex;
        gap: 6px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }
      .tech-chip {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 20px;
        font-size: 11px;
        font-weight: 500;
        transition: all 0.2s;
      }
      .tech-chip:hover {
        border-color: var(--border-hover);
        background: var(--card-hover);
      }
      .tech-icon {
        display: flex;
        align-items: center;
      }
      .tech-name {
        color: var(--text);
      }
      
      /* Header Bar */
      .header-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      .header-title {
        font-size: 13px;
        font-weight: 700;
        color: var(--text);
      }
      .scan-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: linear-gradient(135deg, var(--purple), #9333ea);
        border: none;
        border-radius: 8px;
        color: white;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(168,85,247,0.25);
      }
      .scan-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(168,85,247,0.35);
      }
      .scan-btn.scanning {
        background: var(--card);
        color: var(--purple);
        box-shadow: none;
        border: 1px solid var(--purple);
      }
      .scan-btn.running {
        background: var(--green);
      }
      .scan-spinner {
        width: 12px;
        height: 12px;
        border: 2px solid rgba(168,85,247,0.3);
        border-top-color: var(--purple);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      
      /* Flow Card */
      .flow-card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 12px;
        margin-bottom: 10px;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .flow-card:hover {
        border-color: var(--border-hover);
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0,0,0,0.1);
      }
      .flow-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px;
        cursor: pointer;
        background: var(--gradient);
      }
      .flow-icon {
        font-size: 20px;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--purple-glow);
        border-radius: 10px;
      }
      .flow-info {
        flex: 1;
        min-width: 0;
      }
      .flow-name {
        font-weight: 600;
        font-size: 13px;
        display: block;
        margin-bottom: 2px;
      }
      .flow-desc {
        font-size: 11px;
        color: var(--muted);
        display: block;
      }
      .flow-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .flow-coverage {
        font-size: 10px;
        font-weight: 600;
        padding: 4px 8px;
        background: rgba(255,255,255,0.05);
        border-radius: 10px;
        border: 1px solid var(--border);
      }
      .flow-priority {
        font-size: 9px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 10px;
        text-transform: uppercase;
      }
      .flow-priority.critical { background: rgba(239,68,68,0.15); color: var(--red); }
      .flow-priority.high { background: rgba(245,158,11,0.15); color: var(--yellow); }
      .flow-priority.medium { background: rgba(168,85,247,0.15); color: var(--purple); }
      .flow-priority.low { background: var(--card); color: var(--muted); }
      .flow-generate {
        padding: 6px 12px;
        background: var(--purple);
        border: none;
        border-radius: 6px;
        color: white;
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }
      .flow-generate:hover {
        background: #9333ea;
        transform: scale(1.02);
      }
      .flow-body {
        padding: 0;
        display: none;
        border-top: 1px solid var(--border);
      }
      .flow-card.expanded .flow-body {
        display: block;
        animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      @keyframes slideDown {
        from { opacity: 0; max-height: 0; }
        to { opacity: 1; max-height: 1000px; }
      }
      
      /* Flow Sections */
      .flow-section {
        padding: 12px 14px;
        border-bottom: 1px solid var(--border);
      }
      .flow-section:last-child {
        border-bottom: none;
      }
      .flow-section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
        font-size: 11px;
        font-weight: 600;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .flow-section-icon {
        font-size: 14px;
      }
      
      /* Flow Routes */
      .flow-routes {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .flow-route-item {
        padding: 6px 10px;
        background: rgba(255,255,255,0.02);
        border-left: 2px solid var(--purple);
        border-radius: 4px;
        font-family: 'SF Mono', 'Consolas', monospace;
        font-size: 11px;
      }
      .route-path {
        color: var(--text);
      }
      
      /* Flow Files */
      .flow-files {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .flow-file-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        background: rgba(255,255,255,0.02);
        border: 1px solid var(--border);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .flow-file-item:hover {
        background: rgba(255,255,255,0.04);
        border-color: var(--purple);
        transform: translateX(4px);
      }
      .flow-file-item.untested {
        border-left: 3px solid var(--yellow);
      }
      .flow-file-item.tested {
        opacity: 0.6;
        border-left: 3px solid var(--green);
      }
      .file-status {
        width: 18px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        border-radius: 50%;
      }
      .flow-file-item.untested .file-status {
        background: rgba(245,158,11,0.15);
        color: var(--yellow);
      }
      .flow-file-item.tested .file-status {
        background: rgba(34,197,94,0.15);
        color: var(--green);
      }
      .file-name {
        flex: 1;
        font-size: 12px;
        font-weight: 500;
      }
      .file-type-badge {
        font-size: 9px;
        font-weight: 600;
        padding: 2px 6px;
        background: var(--purple-glow);
        color: var(--purple);
        border-radius: 4px;
        text-transform: uppercase;
      }
      .file-gen-hint {
        font-size: 12px;
        opacity: 0;
        transition: opacity 0.2s;
      }
      .flow-file-item:hover .file-gen-hint {
        opacity: 1;
      }
      
      /* Flow Steps - Updated */
      .flow-steps {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .flow-step {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 0;
        border-top: 1px solid var(--border);
      }
      .flow-step:first-child {
        border-top: none;
      }
      .step-connector {
        width: 28px;
        display: flex;
        flex-direction: column;
        align-items: center;
        flex-shrink: 0;
      }
      .step-num {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--purple);
        color: white;
        border-radius: 50%;
        font-size: 10px;
        font-weight: 700;
        box-shadow: 0 2px 6px rgba(168,85,247,0.3);
      }
      .step-dot {
        width: 8px;
        height: 8px;
        background: var(--purple);
        border-radius: 50%;
      }
      .step-line {
        width: 2px;
        height: 20px;
        background: linear-gradient(180deg, var(--purple) 0%, var(--border) 100%);
        margin: 4px 0;
      }
      .step-info {
        flex: 1;
      }
      .step-title {
        font-size: 12px;
        font-weight: 500;
      }
      .step-action {
        font-size: 10px;
        color: var(--muted);
      }
      
      /* API Endpoint Row */
      .api-endpoint {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 8px;
        margin-bottom: 6px;
        transition: all 0.15s;
      }
      .api-endpoint:hover {
        border-color: var(--border-hover);
        background: var(--card-hover);
      }
      .api-method {
        font-size: 9px;
        font-weight: 700;
        padding: 4px 8px;
        border-radius: 4px;
        min-width: 50px;
        text-align: center;
      }
      .api-method.GET { background: rgba(34,197,94,0.15); color: var(--green); }
      .api-method.POST { background: rgba(59,130,246,0.15); color: #3b82f6; }
      .api-method.PUT { background: rgba(245,158,11,0.15); color: var(--yellow); }
      .api-method.PATCH { background: rgba(168,85,247,0.15); color: var(--purple); }
      .api-method.DELETE { background: rgba(239,68,68,0.15); color: var(--red); }
      .api-path {
        flex: 1;
        font-family: 'SF Mono', 'Consolas', monospace;
        font-size: 11px;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .api-status {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        font-size: 10px;
      }
      .api-status svg {
        width: 12px;
        height: 12px;
      }
      .api-status.tested { background: rgba(34,197,94,0.15); color: var(--green); }
      .api-status.untested { background: rgba(245,158,11,0.15); color: var(--yellow); }
      .api-action {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
        font-weight: 600;
        color: var(--purple);
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: all 0.15s;
        opacity: 0;
      }
      .api-action svg {
        width: 12px;
        height: 12px;
      }
      .api-endpoint:hover .api-action {
        opacity: 1;
      }
      .api-action:hover {
        background: var(--purple-glow);
      }
      
      /* Scan CTA */
      .scan-cta {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 32px 16px;
        background: var(--gradient);
        border: 1px dashed var(--border);
        border-radius: 12px;
        text-align: center;
      }
      .scan-cta-icon {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--purple-glow);
        border-radius: 12px;
        margin-bottom: 12px;
        color: var(--purple);
      }
      .scan-cta-title {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .scan-cta-desc {
        font-size: 11px;
        color: var(--muted);
        margin-bottom: 16px;
      }
      .scan-cta-btn {
        padding: 10px 20px;
        background: linear-gradient(135deg, var(--purple), #9333ea);
        border: none;
        border-radius: 8px;
        color: white;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 4px 12px rgba(168,85,247,0.3);
      }
      .scan-cta-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(168,85,247,0.4);
      }
      
      /* Flow Card V2 - Visual Journey Design with Glassmorphism */
      .flow-card-v2 {
        background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
        backdrop-filter: blur(10px);
        border: 1px solid var(--border);
        border-radius: 16px;
        margin-bottom: 16px;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.05);
      }
      .flow-card-v2:hover {
        border-color: rgba(168,85,247,0.4);
        box-shadow: 0 8px 24px rgba(168,85,247,0.15), inset 0 1px 0 rgba(255,255,255,0.08);
        transform: translateY(-2px);
      }
      
      /* Header V2 - Premium Gradient */
      .flow-header-v2 {
        display: flex;
        gap: 16px;
        padding: 20px;
        background: linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(59,130,246,0.08) 50%, rgba(139,92,246,0.10) 100%);
        border-bottom: 1px solid rgba(168,85,247,0.2);
        position: relative;
        overflow: hidden;
      }
      .flow-header-v2::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(168,85,247,0.5), transparent);
      }
      .flow-icon-large {
        font-size: 48px;
        flex-shrink: 0;
      }
      .flow-info-v2 {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .flow-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
      }
      .flow-name-v2 {
        font-size: 16px;
        font-weight: 700;
        color: var(--text);
      }
      .flow-badges {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .flow-status-badge {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.1);
        backdrop-filter: blur(4px);
        transition: all 0.2s;
      }
      .status-icon {
        font-size: 12px;
      }
      .flow-status-untested .flow-status-badge {
        color: rgba(156,163,175,1);
      }
      .flow-status-generated .flow-status-badge {
        color: rgba(245,158,11,1);
      }
      .flow-status-passing .flow-status-badge {
        color: rgba(34,197,94,1);
      }
      .flow-status-failing .flow-status-badge {
        color: rgba(239,68,68,1);
      }
      .flow-priority-badge {
        font-size: 9px;
        font-weight: 700;
        padding: 5px 12px;
        border-radius: 12px;
        text-transform: uppercase;
        border: 1px solid;
        backdrop-filter: blur(4px);
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .flow-priority-badge.critical { 
        background: linear-gradient(135deg, rgba(239,68,68,0.25), rgba(220,38,38,0.15));
        color: var(--red); 
        border-color: rgba(239,68,68,0.3);
      }
      .flow-priority-badge.high { 
        background: linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.15));
        color: var(--yellow); 
        border-color: rgba(245,158,11,0.3);
      }
      .flow-priority-badge.medium { 
        background: linear-gradient(135deg, rgba(168,85,247,0.25), rgba(147,51,234,0.15));
        color: var(--purple); 
        border-color: rgba(168,85,247,0.3);
      }
      .flow-priority-badge.low { 
        background: linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05));
        color: var(--muted); 
        border-color: rgba(255,255,255,0.1);
      }
      .flow-desc-v2 {
        font-size: 12px;
        color: rgba(255,255,255,0.6);
        line-height: 1.5;
      }
      .flow-stats {
        display: flex;
        gap: 16px;
        margin-top: 4px;
      }
      .stat-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: rgba(255,255,255,0.7);
      }
      .stat-icon { font-size: 14px; }
      .stat-value { font-weight: 600; }
      
      /* Test File Info */
      .test-file-info {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        background: rgba(168,85,247,0.08);
        border: 1px solid rgba(168,85,247,0.2);
        border-radius: 8px;
        font-size: 11px;
        margin-top: 4px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .test-file-info:hover {
        background: rgba(168,85,247,0.12);
        border-color: rgba(168,85,247,0.3);
      }
      .test-file-icon {
        color: var(--purple);
        font-size: 12px;
      }
      .test-file-path {
        font-family: 'SF Mono', monospace;
        color: var(--purple);
        font-weight: 500;
      }
      
      /* Flow Progress Bar */
      .flow-progress-bar {
        height: 4px;
        background: rgba(255,255,255,0.1);
        overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #a855f7, #8b5cf6);
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      /* Quick Actions */
      .quick-actions {
        margin-bottom: 16px;
      }
      .action-card {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 16px;
        background: linear-gradient(135deg, rgba(168,85,247,0.05), rgba(139,92,246,0.02));
        border: 1px solid var(--border);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .action-card:hover {
        background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(139,92,246,0.04));
        border-color: rgba(168,85,247,0.3);
        transform: translateX(4px);
        box-shadow: 0 4px 12px rgba(168,85,247,0.15);
      }
      .action-icon {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(168,85,247,0.12);
        border-radius: 10px;
        color: var(--purple);
        flex-shrink: 0;
      }
      .action-info {
        flex: 1;
      }
      .action-title {
        display: block;
        font-size: 13px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 2px;
      }
      .action-desc {
        display: block;
        font-size: 11px;
        color: var(--muted);
      }
      .action-arrow {
        color: var(--muted);
        transition: all 0.25s;
      }
      .action-card:hover .action-arrow {
        color: var(--purple);
        transform: translateX(4px);
      }
      
      /* Premium Files Tab */
      .files-empty-state {
        text-align: center;
        padding: 64px 24px;
      }
      .empty-icon {
        font-size: 48px;
        margin-bottom: 12px;
      }
      .empty-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 6px;
      }
      .empty-desc {
        font-size: 12px;
        color: var(--muted);
      }
      
      /* Files Hero Section */
      .files-hero {
        margin-bottom: 20px;
      }
      .files-hero-header {
        margin-bottom: 16px;
      }
      .files-hero-title {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .files-icon {
        font-size: 32px;
        color: var(--purple);
      }
      .files-hero-title h3 {
        font-size: 18px;
        font-weight: 700;
        color: var(--text);
        margin: 0;
        margin-bottom: 2px;
      }
      .files-hero-title p {
        font-size: 12px;
        color: var(--muted);
        margin: 0;
      }
      
      /* Files Stats Grid */
      .files-stats-grid {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 12px;
      }
      .files-stat-card {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 16px;
        background: linear-gradient(135deg, rgba(168,85,247,0.05), rgba(139,92,246,0.02));
        border: 1px solid var(--border);
        border-radius: 12px;
      }
      .stat-ring-mini {
        position: relative;
        width: 48px;
        height: 48px;
      }
      .ring-mini {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }
      .ring-mini-bg {
        fill: none;
        stroke: rgba(255,255,255,0.06);
        stroke-width: 3;
      }
      .ring-mini-progress {
        fill: none;
        stroke: var(--color);
        stroke-width: 3;
        stroke-linecap: round;
        transition: stroke-dasharray 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .stat-ring-value {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 800;
        color: var(--text);
      }
      .stat-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .stat-label {
        font-size: 11px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .stat-value {
        font-size: 16px;
        font-weight: 700;
        color: var(--text);
      }
      
      /* Recommendation Card */
      .files-recommendation-card {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 16px;
        background: linear-gradient(135deg, rgba(168,85,247,0.12), rgba(139,92,246,0.06));
        border: 1px solid rgba(168,85,247,0.3);
        border-radius: 12px;
      }
      .rec-icon {
        font-size: 28px;
      }
      .rec-info {
        flex: 1;
      }
      .rec-title {
        font-size: 13px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 2px;
      }
      .rec-desc {
        font-size: 11px;
        color: var(--muted);
      }
      
      /* Success Card */
      .files-success-card {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 16px;
        background: linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.06));
        border: 1px solid rgba(34,197,94,0.3);
        border-radius: 12px;
      }
      .success-icon {
        font-size: 28px;
      }
      .success-info {
        flex: 1;
      }
      .success-title {
        font-size: 13px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 2px;
      }
      .success-desc {
        font-size: 11px;
        color: var(--muted);
      }
      
      /* Test Groups */
      .test-group {
        margin-bottom: 20px;
      }
      .test-group-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(139,92,246,0.04));
        border: 1px solid var(--border);
        border-radius: 12px 12px 0 0;
      }
      .test-group-title {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .test-group-icon {
        font-size: 24px;
      }
      .test-group-name {
        font-size: 14px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 2px;
      }
      .test-group-desc {
        font-size: 11px;
        color: var(--muted);
      }
      .test-group-stats {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .test-group-count {
        font-size: 13px;
        font-weight: 700;
        color: var(--text);
      }
      .test-group-progress {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .test-group-progress-bar {
        width: 80px;
        height: 6px;
        background: rgba(255,255,255,0.08);
        border-radius: 3px;
        overflow: hidden;
      }
      .test-group-progress-fill {
        height: 100%;
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 3px;
      }
      .test-group-percent {
        font-size: 11px;
        font-weight: 600;
        color: var(--text);
      }
      .test-group-generate-all {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 8px 14px;
        background: linear-gradient(135deg, var(--purple), #8b5cf6);
        border: none;
        border-radius: 8px;
        color: white;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(168,85,247,0.2);
      }
      .test-group-generate-all:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(168,85,247,0.3);
      }
      .test-group-content {
        padding: 12px;
        background: rgba(255,255,255,0.01);
        border: 1px solid var(--border);
        border-top: none;
        border-radius: 0 0 12px 12px;
      }
      
      /* Directory Section */
      .directory-section {
        margin-bottom: 12px;
        border: 1px solid var(--border);
        border-radius: 10px;
        overflow: hidden;
        transition: all 0.2s;
      }
      .directory-section.collapsed .directory-files {
        display: none;
      }
      .directory-section.collapsed .directory-arrow {
        transform: rotate(-90deg);
      }
      .directory-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        background: var(--card);
        cursor: pointer;
        transition: all 0.2s;
      }
      .directory-header:hover {
        background: var(--card-hover);
      }
      .directory-arrow {
        font-size: 14px;
        color: var(--muted);
        transition: transform 0.2s;
      }
      .directory-icon {
        font-size: 16px;
      }
      .directory-name {
        flex: 1;
        font-size: 12px;
        font-weight: 600;
        color: var(--text);
      }
      .directory-count {
        font-size: 11px;
        color: var(--muted);
      }
      .directory-badge {
        font-size: 10px;
        font-weight: 600;
        padding: 3px 8px;
        background: rgba(245,158,11,0.15);
        color: var(--yellow);
        border-radius: 6px;
      }
      .directory-files {
        padding: 8px;
        background: rgba(0,0,0,0.1);
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      /* Premium File Cards */
      .file-card {
        padding: 12px;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 10px;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .file-card.untested {
        border-left: 3px solid var(--yellow);
      }
      .file-card.tested {
        opacity: 0.6;
        cursor: pointer;
      }
      .file-card:hover {
        background: var(--card-hover);
        border-color: var(--border-hover);
        transform: translateX(2px);
      }
      .file-card-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }
      .file-status-icon {
        font-size: 16px;
        width: 20px;
        text-align: center;
      }
      .file-card-info {
        flex: 1;
        min-width: 0;
      }
      .file-card-name {
        font-size: 12px;
        font-weight: 600;
        color: var(--text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .file-card-path {
        font-size: 10px;
        color: var(--muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .file-type-badge {
        font-size: 9px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 6px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .file-type-unit {
        background: rgba(59,130,246,0.15);
        color: #3b82f6;
      }
      .file-type-component {
        background: rgba(168,85,247,0.15);
        color: var(--purple);
      }
      .file-type-hook {
        background: rgba(245,158,11,0.15);
        color: var(--yellow);
      }
      .file-type-visual {
        background: rgba(236,72,153,0.15);
        color: #ec4899;
      }
      .file-type-api {
        background: rgba(34,197,94,0.15);
        color: var(--green);
      }
      
      /* File Recommendation */
      .file-recommendation {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 10px;
        background: rgba(168,85,247,0.08);
        border-radius: 8px;
        margin-bottom: 8px;
      }
      .rec-icon-small {
        font-size: 14px;
      }
      .rec-text {
        font-size: 11px;
        color: var(--text);
        font-weight: 500;
      }
      
      /* File Card Warning */
      .file-card-warning {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 10px;
        background: rgba(245,158,11,0.1);
        border: 1px solid rgba(245,158,11,0.3);
        border-radius: 8px;
        margin-bottom: 8px;
      }
      .warning-icon {
        font-size: 14px;
      }
      .warning-text {
        font-size: 11px;
        color: var(--yellow);
        font-weight: 500;
      }
      
      /* File Card Action Button */
      .file-card-action {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px;
        background: linear-gradient(135deg, var(--purple), #8b5cf6);
        border: none;
        border-radius: 8px;
        color: white;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(168,85,247,0.2);
      }
      .file-card-action:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(168,85,247,0.3);
      }
      .file-card-action.disabled,
      .file-card-action:disabled {
        background: rgba(156,163,175,0.2);
        color: rgba(156,163,175,0.6);
        cursor: not-allowed;
        box-shadow: none;
      }
      .file-card-action.disabled:hover,
      .file-card-action:disabled:hover {
        transform: none;
        box-shadow: none;
      }
      
      /* File Tested Badge */
      .file-tested-badge {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 10px;
        background: rgba(34,197,94,0.1);
        border-radius: 8px;
      }
      .tested-icon {
        font-size: 14px;
        color: var(--green);
      }
      .tested-text {
        font-size: 11px;
        color: var(--green);
        font-weight: 600;
      }
      
      /* Journey Section */
      .flow-journey {
        padding: 20px;
      }
      .journey-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--muted);
      }
      .journey-icon { font-size: 16px; }
      .journey-title { flex: 1; }
      
      .journey-step {
        margin-bottom: 12px;
      }
      .journey-step-header {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px;
        background: rgba(255,255,255,0.02);
        border: 1px solid var(--border);
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .journey-step-header:hover {
        background: rgba(255,255,255,0.04);
        border-color: var(--purple);
        transform: translateX(2px);
      }
      .step-number-large {
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #a855f7, #8b5cf6, #7c3aed);
        color: white;
        border-radius: 50%;
        font-size: 17px;
        font-weight: 800;
        flex-shrink: 0;
        box-shadow: 0 4px 16px rgba(168,85,247,0.4), 0 0 0 4px rgba(168,85,247,0.1);
        position: relative;
        transition: all 0.3s;
      }
      .journey-step-header:hover .step-number-large {
        box-shadow: 0 6px 20px rgba(168,85,247,0.5), 0 0 0 6px rgba(168,85,247,0.15);
        transform: scale(1.05);
      }
      .step-main-info {
        flex: 1;
        min-width: 0;
      }
      .step-title-v2 {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .step-action-v2 {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .action-badge {
        font-size: 9px;
        font-weight: 600;
        padding: 3px 8px;
        background: rgba(168,85,247,0.15);
        color: var(--purple);
        border-radius: 6px;
        text-transform: capitalize;
      }
      .route-badge {
        font-size: 10px;
        font-family: 'SF Mono', monospace;
        color: rgba(255,255,255,0.5);
      }
      .step-files-badge {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        padding: 6px 12px;
        background: rgba(255,255,255,0.05);
        border: 1px solid var(--border);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .step-files-badge:hover {
        background: rgba(255,255,255,0.08);
        border-color: var(--purple);
      }
      .untested-count {
        background: var(--yellow);
        color: #000;
        font-size: 9px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 10px;
        min-width: 18px;
        text-align: center;
      }
      
      /* Step Files List */
      .step-files-list {
        display: none;
        flex-direction: column;
        gap: 4px;
        margin-top: 8px;
        padding-left: 54px;
      }
      .step-files-list.expanded {
        display: flex;
      }
      .step-file-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        background: rgba(255,255,255,0.02);
        border: 1px solid var(--border);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .step-file-item:hover {
        background: rgba(255,255,255,0.04);
        border-color: var(--purple);
      }
      .step-file-item.untested {
        border-left: 3px solid var(--yellow);
      }
      .file-status-mini {
        font-size: 10px;
        width: 16px;
        text-align: center;
      }
      .file-name-mini {
        flex: 1;
        font-size: 11px;
        font-weight: 500;
      }
      .file-type-mini {
        font-size: 8px;
        font-weight: 600;
        padding: 2px 5px;
        background: rgba(168,85,247,0.1);
        color: var(--purple);
        border-radius: 3px;
        text-transform: uppercase;
      }
      
      .journey-arrow {
        text-align: center;
        font-size: 24px;
        color: var(--purple);
        margin: 8px 0;
      }
      
      /* Flow Actions */
      .flow-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        background: rgba(255,255,255,0.02);
        border-top: 1px solid var(--border);
      }
      .btn-show-all {
        background: rgba(255,255,255,0.05);
        border: 1px solid var(--border);
        color: var(--text);
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .btn-show-all:hover {
        background: rgba(255,255,255,0.08);
        border-color: var(--purple);
      }
      .btn-show-all .hide-text { display: none; }
      .flow-card-v2.show-all-files .btn-show-all .show-text { display: none; }
      .flow-card-v2.show-all-files .btn-show-all .hide-text { display: block; }
      
      /* Action Buttons - Premium Design */
      .action-buttons {
        display: flex;
        gap: 8px;
      }
      .btn-action {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 8px 12px;
        border: 1px solid;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .btn-run {
        background: linear-gradient(135deg, rgba(168,85,247,0.15), rgba(139,92,246,0.1));
        border-color: rgba(168,85,247,0.4);
        color: var(--purple);
      }
      .btn-run:hover {
        background: linear-gradient(135deg, rgba(168,85,247,0.25), rgba(139,92,246,0.15));
        border-color: var(--purple);
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(168,85,247,0.2);
      }
      .btn-open {
        background: rgba(59,130,246,0.1);
        border-color: rgba(59,130,246,0.4);
        color: #3b82f6;
      }
      .btn-open:hover {
        background: rgba(59,130,246,0.15);
        border-color: #3b82f6;
        transform: translateY(-1px);
      }
      .btn-regen {
        background: rgba(245,158,11,0.1);
        border-color: rgba(245,158,11,0.4);
        color: var(--yellow);
      }
      .btn-regen:hover {
        background: rgba(245,158,11,0.15);
        border-color: var(--yellow);
        transform: translateY(-1px);
      }
      .btn-skip {
        background: rgba(255,255,255,0.03);
        border: 1px solid var(--border);
        color: rgba(255,255,255,0.6);
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .btn-skip:hover {
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.8);
      }
      .btn-generate-flow {
        background: linear-gradient(135deg, var(--purple), #9333ea);
        border: none;
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 4px 12px rgba(168,85,247,0.3);
      }
      .btn-generate-flow:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(168,85,247,0.4);
      }
      
      /* All Files View */
      .all-files-view {
        display: none;
        padding: 20px;
        border-top: 1px solid var(--border);
        background: rgba(0,0,0,0.2);
      }
      .flow-card-v2.show-all-files .all-files-view {
        display: block;
      }
      .all-files-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--muted);
      }
      .files-count {
        background: rgba(255,255,255,0.1);
        padding: 4px 10px;
        border-radius: 10px;
      }
      .all-files-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 8px;
      }
      .file-card {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        background: rgba(255,255,255,0.02);
        border: 1px solid var(--border);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .file-card:hover {
        background: rgba(255,255,255,0.04);
        border-color: var(--purple);
        transform: translateY(-1px);
      }
      .file-card.untested {
        border-left: 3px solid var(--yellow);
      }
      .file-card.tested {
        opacity: 0.5;
      }
      .file-status-icon {
        font-size: 12px;
      }
      .file-card-info {
        flex: 1;
        min-width: 0;
      }
      .file-card-name {
        display: block;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .file-card-type {
        display: block;
        font-size: 9px;
        color: var(--muted);
        text-transform: uppercase;
      }
      
      /* Premium Header */
      .header-brand {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .brand-icon {
        color: var(--purple);
        filter: drop-shadow(0 0 8px rgba(168,85,247,0.4));
      }
      .brand-title {
        font-size: 13px;
        font-weight: 700;
        background: linear-gradient(135deg, var(--purple), #ec4899);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        letter-spacing: 0.5px;
      }
      
      /* Premium Section Header */
      .section-header-premium {
        margin-bottom: 20px;
      }
      .section-title {
        font-size: 11px;
        font-weight: 700;
        color: var(--text);
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 6px;
      }
      .section-subtitle {
        font-size: 13px;
        color: var(--muted);
        font-weight: 400;
      }
      
      /* Premium Strategy Section */
      .strategy-section-premium {
        margin-bottom: 24px;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 20px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }
      .strategy-section-premium::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, var(--accent), var(--accent-light));
        opacity: 0;
        transition: opacity 0.3s;
      }
      .strategy-section-premium:hover {
        border-color: var(--accent);
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      }
      .strategy-section-premium:hover::before {
        opacity: 1;
      }
      
      /* Color Variants */
      .strategy-section-premium.blue {
        --accent: #3b82f6;
        --accent-light: #60a5fa;
        --accent-glow: rgba(59,130,246,0.15);
      }
      .strategy-section-premium.purple {
        --accent: #a855f7;
        --accent-light: #c084fc;
        --accent-glow: rgba(168,85,247,0.15);
      }
      .strategy-section-premium.orange {
        --accent: #f59e0b;
        --accent-light: #fbbf24;
        --accent-glow: rgba(245,158,11,0.15);
      }
      
      .strategy-header-premium {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 20px;
      }
      .strategy-icon-premium {
        width: 56px;
        height: 56px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--accent-glow);
        border-radius: 12px;
        flex-shrink: 0;
        color: var(--accent);
        transition: all 0.3s;
      }
      .strategy-section-premium:hover .strategy-icon-premium {
        transform: scale(1.05);
        box-shadow: 0 0 20px var(--accent-glow);
      }
      .strategy-info-premium {
        flex: 1;
        min-width: 0;
      }
      .strategy-title-premium {
        font-size: 14px;
        font-weight: 700;
        color: var(--text);
        text-transform: uppercase;
        letter-spacing: 0.8px;
        margin-bottom: 4px;
      }
      .strategy-desc-premium {
        font-size: 12px;
        color: var(--muted);
        line-height: 1.4;
      }
      .strategy-count {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--accent-glow);
        color: var(--accent);
        font-size: 18px;
        font-weight: 800;
        border-radius: 10px;
        flex-shrink: 0;
      }
      .strategy-frameworks-premium {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 12px;
      }
      
      /* Compact Framework Cards */
      .framework-card-compact {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 12px;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .framework-card-compact:hover {
        background: var(--card-hover);
        border-color: var(--border-hover);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      .framework-card-compact.installed {
        border-left: 3px solid var(--green);
      }
      .framework-card-compact.not-installed {
        border-left: 3px solid var(--yellow);
        opacity: 0.85;
      }
      .fwc-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      }
      .fwc-logo {
        flex-shrink: 0;
      }
      .fwc-info {
        flex: 1;
        min-width: 0;
      }
      .fwc-name {
        font-size: 12px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 1px;
      }
      .fwc-type {
        font-size: 9px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .fwc-status {
        font-size: 13px;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .fwc-status.installed {
        color: var(--green);
        background: rgba(34,197,94,0.15);
      }
      .fwc-status.not-installed {
        color: var(--yellow);
        background: rgba(245,158,11,0.15);
      }
      .fwc-purpose {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 10px;
        color: var(--muted);
        padding: 8px 10px;
        background: rgba(255,255,255,0.03);
        border-radius: 6px;
        margin-bottom: 10px;
      }
      .purpose-icon {
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .purpose-icon svg {
        width: 14px;
        height: 14px;
      }
        font-size: 10px;
        color: var(--text);
        font-weight: 500;
      }
      .fwc-progress {
        margin-bottom: 10px;
      }
      .fwc-bar {
        height: 5px;
        background: rgba(255,255,255,0.08);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 5px;
      }
      .fwc-fill {
        height: 100%;
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 3px;
      }
      .fwc-stats {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 10px;
        color: var(--muted);
      }
      .fwc-percent {
        font-weight: 700;
        color: var(--text);
      }
      .fwc-actions {
        display: flex;
        gap: 6px;
      }
      .fwc-btn {
        flex: 1;
        padding: 7px 10px;
        border: none;
        border-radius: 6px;
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }
      .fwc-btn.primary {
        background: var(--purple);
        color: white;
        box-shadow: 0 2px 6px rgba(168,85,247,0.3);
      }
      .fwc-btn.primary:hover {
        background: #9333ea;
        transform: translateY(-1px);
        box-shadow: 0 4px 10px rgba(168,85,247,0.4);
      }
      .fwc-btn.secondary {
        background: var(--card-hover);
        color: var(--text);
        border: 1px solid var(--border);
      }
      .fwc-btn.secondary:hover {
        border-color: var(--purple);
        color: var(--purple);
        transform: translateY(-1px);
      }
      .fwc-btn.install {
        width: 100%;
        background: linear-gradient(135deg, var(--yellow), #f59e0b);
        color: #000;
        box-shadow: 0 2px 6px rgba(245,158,11,0.3);
      }
      .fwc-btn.install:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 10px rgba(245,158,11,0.4);
      }
      .fwc-install-msg {
        font-size: 10px;
        color: var(--muted);
        margin-bottom: 8px;
        text-align: center;
      }
      
      /* Test Tab Header */
      .test-tab-header {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 16px;
        background: var(--gradient);
        border-radius: 12px;
        border: 1px solid var(--border);
        margin-bottom: 14px;
      }
      .tab-header-icon {
        font-size: 32px;
        width: 56px;
        height: 56px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--purple-glow);
        border-radius: 14px;
        flex-shrink: 0;
      }
      .tab-header-icon-svg {
        width: 56px;
        height: 56px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--purple-glow);
        border-radius: 14px;
        flex-shrink: 0;
        color: var(--purple);
      }
      .tab-header-icon-svg svg {
        width: 28px;
        height: 28px;
      }
      .tab-header-info {
        flex: 1;
      }
      .tab-title {
        font-size: 16px;
        font-weight: 800;
        color: var(--text);
        margin-bottom: 4px;
        letter-spacing: -0.5px;
      }
      .tab-desc {
        font-size: 12px;
        color: var(--muted);
        margin-bottom: 6px;
      }
      .tab-framework {
        font-size: 10px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .tab-framework strong {
        color: var(--purple);
        font-weight: 600;
      }
      
      /* Test Tab Stats */
      .test-tab-stats {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 12px;
        margin-bottom: 16px;
      }
      .stat-card-mini {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 10px;
      }
      .stat-ring-container {
        position: relative;
        width: 48px;
        height: 48px;
        flex-shrink: 0;
      }
      .stat-ring {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }
      .ring-bg-mini {
        fill: none;
        stroke: rgba(255,255,255,0.08);
        stroke-width: 3;
      }
      .ring-progress-mini {
        fill: none;
        stroke-width: 3;
        stroke-linecap: round;
        transition: stroke-dasharray 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .stat-ring-value {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 700;
        color: var(--text);
      }
      .stat-info-mini {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .stat-label {
        font-size: 10px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .stat-value {
        font-size: 16px;
        font-weight: 700;
        color: var(--text);
      }
      
      .stat-card-rec {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px;
        background: linear-gradient(135deg, rgba(168,85,247,0.12), rgba(168,85,247,0.04));
        border: 1px solid rgba(168,85,247,0.3);
        border-radius: 10px;
      }
      .rec-icon-mini {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--purple);
        border-radius: 8px;
        color: white;
        flex-shrink: 0;
      }
      .rec-info-mini {
        flex: 1;
      }
      .rec-title {
        font-size: 12px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 2px;
      }
      .rec-desc {
        font-size: 10px;
        color: var(--muted);
      }
      
      .stat-card-success {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px;
        background: linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04));
        border: 1px solid rgba(34,197,94,0.3);
        border-radius: 10px;
      }
      .success-icon-mini {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--green);
        border-radius: 8px;
        color: white;
        font-size: 16px;
        font-weight: 700;
        flex-shrink: 0;
      }
      .success-info-mini {
        flex: 1;
      }
      .success-title {
        font-size: 12px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 2px;
      }
      .success-desc {
        font-size: 10px;
        color: var(--muted);
      }
      
      .scan-app-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 14px 20px;
        background: linear-gradient(135deg, var(--purple), #9333ea);
        border: none;
        border-radius: 10px;
        color: white;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 12px rgba(168,85,247,0.3);
      }
      .scan-app-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(168,85,247,0.4);
      }
      .scan-app-btn svg {
        flex-shrink: 0;
      }
      
      /* File Directory */
      .test-files-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .file-directory {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 10px;
        overflow: hidden;
        transition: all 0.2s;
      }
      .file-directory.collapsed .dir-files {
        display: none;
      }
      .file-directory.collapsed .dir-arrow {
        transform: rotate(0deg);
      }
      .dir-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: rgba(255,255,255,0.02);
        cursor: pointer;
        transition: all 0.15s;
      }
      .dir-header:hover {
        background: rgba(255,255,255,0.04);
      }
      .dir-arrow {
        color: var(--muted);
        transition: transform 0.2s;
        transform: rotate(90deg);
        flex-shrink: 0;
      }
      .dir-icon {
        color: var(--purple);
        flex-shrink: 0;
      }
      .dir-name {
        flex: 1;
        font-size: 11px;
        font-weight: 600;
        color: var(--text);
      }
      .dir-count {
        font-size: 10px;
        color: var(--muted);
        padding: 2px 6px;
        background: rgba(255,255,255,0.06);
        border-radius: 6px;
      }
      .dir-badge-untested {
        font-size: 9px;
        font-weight: 600;
        padding: 2px 6px;
        background: rgba(245,158,11,0.15);
        color: var(--yellow);
        border-radius: 6px;
      }
      .dir-files {
        display: flex;
        flex-direction: column;
        gap: 1px;
        padding: 4px;
      }
      
      /* Premium File Row */
      .file-row-premium {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 8px;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid transparent;
      }
      .file-row-premium:hover {
        background: rgba(255,255,255,0.04);
        border-color: var(--border);
      }
      .file-row-premium.tested {
        opacity: 0.5;
        cursor: pointer;
      }
      .file-row-premium.tested:hover {
        opacity: 0.7;
      }
      .file-row-premium.untested {
        border-left: 2px solid var(--yellow);
      }
      .file-row-premium .file-status-icon {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        flex-shrink: 0;
      }
      .file-row-premium .file-status-icon.tested {
        background: rgba(34,197,94,0.15);
        color: var(--green);
      }
      .file-row-premium .file-status-icon.untested {
        background: rgba(245,158,11,0.15);
        color: var(--yellow);
      }
      .file-row-premium .file-info {
        flex: 1;
        min-width: 0;
      }
      .file-row-premium .file-name {
        font-size: 12px;
        font-weight: 600;
        color: var(--text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 2px;
      }
      .file-row-premium .file-path {
        font-size: 10px;
        color: var(--muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .file-row-premium .file-recommendation {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
        color: var(--purple);
        margin-top: 4px;
      }
      .file-row-premium .file-badge {
        font-size: 9px;
        font-weight: 600;
        padding: 4px 8px;
        border-radius: 6px;
      }
      .file-row-premium .file-badge.tested {
        background: rgba(34,197,94,0.15);
        color: var(--green);
      }
      .file-row-premium .file-action-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 7px 12px;
        background: var(--purple);
        border: none;
        border-radius: 6px;
        color: white;
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
        opacity: 0;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        white-space: nowrap;
        box-shadow: 0 2px 6px rgba(168,85,247,0.3);
      }
      .file-row-premium:hover .file-action-btn {
        opacity: 1;
      }
      .file-row-premium .file-action-btn:hover {
        background: #9333ea;
        transform: translateY(-1px);
        box-shadow: 0 4px 10px rgba(168,85,247,0.4);
      }
      .file-row-premium .file-warning {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
        color: var(--muted);
        padding: 6px 10px;
        background: rgba(255,255,255,0.04);
        border-radius: 6px;
        border: 1px dashed var(--border);
      }
      
      /* Premium File Cards */
      .file-card-premium {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 12px;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        margin-bottom: 8px;
      }
      .file-card-premium:hover {
        background: var(--card-hover);
        border-color: var(--border-hover);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0,0,0,0.15);
      }
      .file-card-premium.tested {
        opacity: 0.6;
        cursor: pointer;
      }
      .file-card-premium.tested:hover {
        opacity: 1;
      }
      .card-status-bar {
        height: 3px;
        width: 100%;
      }
      .card-status-bar.tested {
        background: linear-gradient(90deg, #22c55e, #16a34a);
      }
      .card-status-bar.high {
        background: linear-gradient(90deg, #ef4444, #dc2626);
      }
      .card-status-bar.medium {
        background: linear-gradient(90deg, #f59e0b, #d97706);
      }
      .card-status-bar.low {
        background: linear-gradient(90deg, #3b82f6, #2563eb);
      }
      .card-content {
        padding: 16px;
      }
      .card-header {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 12px;
      }
      .status-icon {
        width: 24px;
        height: 24px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .status-icon.tested {
        background: rgba(34,197,94,0.15);
        color: var(--green);
      }
      .status-icon.untested {
        background: rgba(245,158,11,0.15);
        color: var(--yellow);
      }
      .file-title {
        flex: 1;
        min-width: 0;
      }
      .file-name-premium {
        font-size: 13px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 4px;
        letter-spacing: 0.2px;
      }
      .file-path-premium {
        font-size: 11px;
        color: var(--muted);
        font-family: 'SF Mono', Monaco, Consolas, monospace;
      }
      .priority-badge {
        font-size: 9px;
        font-weight: 700;
        padding: 5px 10px;
        border-radius: 6px;
        white-space: nowrap;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .priority-badge.high {
        background: rgba(239,68,68,0.15);
        color: #ef4444;
      }
      .priority-badge.medium {
        background: rgba(245,158,11,0.15);
        color: #f59e0b;
      }
      .priority-badge.low {
        background: rgba(59,130,246,0.15);
        color: #3b82f6;
      }
      .priority-badge.success {
        background: rgba(34,197,94,0.15);
        color: var(--green);
      }
      .card-recommendation {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 10px 12px;
        background: rgba(59,130,246,0.08);
        border-radius: 8px;
        margin-bottom: 12px;
        border-left: 3px solid #3b82f6;
      }
      .card-recommendation svg {
        flex-shrink: 0;
        color: #3b82f6;
        margin-top: 1px;
      }
      .card-recommendation span {
        font-size: 11px;
        line-height: 1.5;
        color: var(--text);
      }
      .card-metrics {
        margin-bottom: 12px;
      }
      .metric-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .metric-label {
        font-size: 10px;
        color: var(--muted);
        font-weight: 600;
        min-width: 70px;
      }
      .complexity-bar {
        flex: 1;
        height: 6px;
        background: rgba(255,255,255,0.06);
        border-radius: 3px;
        overflow: hidden;
      }
      .complexity-fill {
        height: 100%;
        background: linear-gradient(90deg, #22c55e, #f59e0b, #ef4444);
        transition: width 0.3s ease;
        border-radius: 3px;
      }
      .metric-value {
        font-size: 11px;
        font-weight: 700;
        color: var(--text);
        min-width: 32px;
        text-align: right;
      }
      .card-actions {
        display: flex;
        gap: 8px;
      }
      .card-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        white-space: nowrap;
      }
      .card-btn.primary {
        background: linear-gradient(135deg, #a855f7, #9333ea);
        color: white;
        box-shadow: 0 3px 10px rgba(168,85,247,0.3);
      }
      .card-btn.primary:hover {
        background: linear-gradient(135deg, #9333ea, #7e22ce);
        transform: translateY(-1px);
        box-shadow: 0 5px 14px rgba(168,85,247,0.4);
      }
      .card-btn.secondary {
        background: rgba(255,255,255,0.06);
        color: var(--text);
        border: 1px solid var(--border);
      }
      .card-btn.secondary:hover {
        background: rgba(255,255,255,0.1);
        border-color: var(--border-hover);
      }
      .card-warning {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px 16px;
        background: rgba(255,255,255,0.04);
        border: 1px dashed var(--border);
        border-radius: 8px;
        font-size: 10px;
        color: var(--muted);
      }
      
      /* Premium Status Bar */
      .test-tab-status-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(59,130,246,0.08));
        border: 1px solid rgba(168,85,247,0.2);
        border-radius: 12px;
        margin-bottom: 16px;
        backdrop-filter: blur(10px);
      }
      .status-left {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
      }
      .status-framework-badge {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: rgba(34,197,94,0.15);
        border: 1px solid rgba(34,197,94,0.3);
        border-radius: 8px;
        font-size: 11px;
        font-weight: 700;
        color: var(--green);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .status-separator {
        width: 1px;
        height: 20px;
        background: var(--border);
        opacity: 0.5;
      }
      .status-metrics {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .status-metric-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
      }
      .metric-label {
        color: var(--muted);
        font-weight: 500;
      }
      .metric-value {
        font-weight: 700;
        color: var(--text);
      }
      .status-run-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 9px 18px;
        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        border: none;
        border-radius: 9px;
        color: white;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 3px 10px rgba(139,92,246,0.3);
      }
      .status-run-btn:hover:not(:disabled) {
        background: linear-gradient(135deg, #7c3aed, #6d28d9);
        transform: translateY(-1px);
        box-shadow: 0 5px 14px rgba(139,92,246,0.4);
      }
      .status-run-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      /* Filter Bar & Batch Actions */
      .files-filter-section {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 18px;
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 12px;
        margin-bottom: 16px;
      }
      .files-filter-section.success {
        background: linear-gradient(135deg, rgba(34,197,94,0.08), rgba(16,185,129,0.08));
        border-color: rgba(34,197,94,0.3);
      }
      .filter-summary {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        font-weight: 700;
        color: var(--text);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        white-space: nowrap;
      }
      .filter-summary svg {
        color: var(--yellow);
        flex-shrink: 0;
      }
      .filter-summary.success {
        color: var(--green);
      }
      .filter-summary.success svg {
        color: var(--green);
      }
      .filter-chips {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      }
      .filter-chip {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 7px 12px;
        background: rgba(255,255,255,0.04);
        border: 1px solid var(--border);
        border-radius: 8px;
        font-size: 11px;
        font-weight: 600;
        color: var(--muted);
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
      }
      .filter-chip:hover {
        background: rgba(255,255,255,0.08);
        border-color: var(--border-hover);
        color: var(--text);
      }
      .filter-chip.active {
        background: linear-gradient(135deg, rgba(168,85,247,0.15), rgba(147,51,234,0.15));
        border-color: rgba(168,85,247,0.4);
        color: #a855f7;
      }
      .filter-chip.high:hover {
        background: rgba(239,68,68,0.1);
        border-color: rgba(239,68,68,0.3);
      }
      .filter-chip.medium:hover {
        background: rgba(245,158,11,0.1);
        border-color: rgba(245,158,11,0.3);
      }
      .filter-chip.low:hover {
        background: rgba(59,130,246,0.1);
        border-color: rgba(59,130,246,0.3);
      }
      .chip-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .chip-dot.high {
        background: #ef4444;
      }
      .chip-dot.medium {
        background: #f59e0b;
      }
      .chip-dot.low {
        background: #3b82f6;
      }
      .batch-action-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 9px 16px;
        background: linear-gradient(135deg, #22c55e, #16a34a);
        border: none;
        border-radius: 9px;
        color: white;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 3px 10px rgba(34,197,94,0.25);
        white-space: nowrap;
      }
      .batch-action-btn:hover {
        background: linear-gradient(135deg, #16a34a, #15803d);
        transform: translateY(-1px);
        box-shadow: 0 5px 14px rgba(34,197,94,0.35);
      }
      
      /* Pro Tips Section */
      .pro-tips-section {
        margin-top: 24px;
        padding: 20px;
        background: linear-gradient(135deg, rgba(139,92,246,0.05), rgba(59,130,246,0.05));
        border: 1px solid rgba(139,92,246,0.2);
        border-radius: 12px;
        backdrop-filter: blur(8px);
      }
      .pro-tips-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
        color: #8b5cf6;
      }
      .pro-tips-header svg {
        flex-shrink: 0;
      }
      .pro-tips-header span {
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .pro-tips-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .tip-item {
        display: flex;
        gap: 12px;
        align-items: flex-start;
      }
      .tip-number {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        flex-shrink: 0;
      }
      .tip-text {
        flex: 1;
        font-size: 12px;
        line-height: 1.6;
        color: var(--text);
      }
      .tip-text strong {
        color: #8b5cf6;
        font-weight: 700;
      }
      
      /* Empty States */
      .tab-empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 24px;
        text-align: center;
      }
      .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.4;
      }
      .empty-icon-svg {
        width: 56px;
        height: 56px;
        margin-bottom: 16px;
        opacity: 0.5;
        color: var(--muted);
      }
      .empty-icon-svg svg {
        width: 100%;
        height: 100%;
      }
      .empty-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 8px;
      }
      .empty-desc {
        font-size: 12px;
        color: var(--muted);
        margin-bottom: 20px;
        max-width: 320px;
      }
      .empty-action {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 10px 20px;
        background: var(--purple);
        border: none;
        border-radius: 8px;
        color: white;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 4px 12px rgba(168,85,247,0.3);
      }
      .empty-action:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(168,85,247,0.4);
      }
      .empty-actions {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
      }
      .empty-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 10px 18px;
        border: none;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .empty-btn.primary {
        background: var(--purple);
        color: white;
        box-shadow: 0 2px 8px rgba(168,85,247,0.3);
      }
      .empty-btn.primary:hover {
        background: #9333ea;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(168,85,247,0.4);
      }
      .empty-btn.secondary {
        background: var(--card);
        color: var(--text);
        border: 1px solid var(--border);
      }
      .empty-btn.secondary:hover {
        background: var(--card-hover);
        border-color: var(--border-hover);
        transform: translateY(-1px);
      }
      .empty-hint {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: rgba(59,130,246,0.08);
        border: 1px solid rgba(59,130,246,0.2);
        border-radius: 8px;
        font-size: 11px;
        color: var(--muted);
        max-width: 400px;
      }
      .empty-hint svg {
        flex-shrink: 0;
        color: #3b82f6;
      }
      
      /* Flows Section */
      .flows-section {
        margin-bottom: 20px;
      }
      .section-label-premium {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 10px;
        font-weight: 700;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.8px;
        margin-bottom: 10px;
      }
      
      /* Premium Flow Cards */
      .flow-card-premium {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 10px;
        margin-bottom: 10px;
        overflow: hidden;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .flow-card-premium:hover {
        border-color: var(--border-hover);
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0,0,0,0.12);
      }
      .flow-card-premium.flow-untested {
        border-left: 3px solid var(--yellow);
      }
      .flow-card-premium.flow-passing {
        border-left: 3px solid var(--green);
      }
      .flow-card-premium.flow-failing {
        border-left: 3px solid var(--red);
      }
      .flow-main {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px;
      }
      .flow-icon-premium {
        font-size: 28px;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--purple-glow);
        border-radius: 12px;
        flex-shrink: 0;
      }
      .flow-content {
        flex: 1;
        min-width: 0;
      }
      .flow-title-premium {
        font-size: 13px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 6px;
      }
      .flow-journey-preview {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 8px;
        flex-wrap: wrap;
      }
      .journey-step-mini {
        font-size: 10px;
        color: var(--muted);
        padding: 3px 8px;
        background: rgba(255,255,255,0.04);
        border-radius: 6px;
      }
      .journey-arrow {
        color: var(--muted);
        font-size: 10px;
      }
      .flow-meta {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .flow-meta-item {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
        color: var(--muted);
      }
      .flow-test-file {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
        color: var(--purple);
        padding: 4px 8px;
        background: var(--purple-glow);
        border-radius: 6px;
        margin-top: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .flow-test-file:hover {
        background: rgba(168,85,247,0.2);
      }
      .flow-status-premium {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
      }
      .status-icon-premium {
        font-size: 20px;
      }
      .status-label-premium {
        font-size: 9px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .flow-actions-premium {
        display: flex;
        gap: 8px;
        padding: 12px 14px;
        border-top: 1px solid var(--border);
        background: rgba(0,0,0,0.2);
      }
      .flow-btn-premium {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 8px 12px;
        border: none;
        border-radius: 6px;
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .flow-btn-premium.primary {
        background: var(--purple);
        color: white;
        box-shadow: 0 2px 6px rgba(168,85,247,0.3);
      }
      .flow-btn-premium.primary:hover {
        background: #9333ea;
        transform: translateY(-1px);
        box-shadow: 0 4px 10px rgba(168,85,247,0.4);
      }
      .flow-btn-premium.secondary {
        background: var(--card);
        color: var(--text);
        border: 1px solid var(--border);
      }
      .flow-btn-premium.secondary:hover {
        border-color: var(--purple);
        color: var(--purple);
        background: var(--purple-glow);
        transform: translateY(-1px);
      }
      
      /* Quality Tab Components */
      .quality-score-card {
        display: flex;
        align-items: center;
        gap: 24px;
        padding: 20px;
        background: var(--gradient);
        border-radius: 12px;
        border: 1px solid var(--border);
        margin-bottom: 20px;
      }
      .quality-ring-container {
        position: relative;
        width: 100px;
        height: 100px;
        flex-shrink: 0;
      }
      .quality-ring {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
        filter: drop-shadow(0 0 12px var(--color));
      }
      .quality-breakdown {
        display: flex;
        gap: 20px;
        flex: 1;
      }
      .quality-stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        flex: 1;
      }
      .quality-stat svg {
        flex-shrink: 0;
      }
      .quality-stat.good svg {
        color: var(--green);
      }
      .quality-stat.warn svg {
        color: var(--yellow);
      }
      .quality-stat.error svg {
        color: var(--red);
      }
      .quality-stat .stat-num {
        font-size: 24px;
        font-weight: 800;
        color: var(--text);
        line-height: 1;
      }
      .quality-stat .stat-label {
        font-size: 10px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      /* Issue Cards */
      .issues-list-premium {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 16px;
      }
      .issue-card {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 14px;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 10px;
        transition: all 0.2s;
      }
      .issue-card:hover {
        border-color: var(--border-hover);
        transform: translateX(2px);
      }
      .issue-card.error {
        border-left: 3px solid var(--red);
      }
      .issue-card.warning {
        border-left: 3px solid var(--yellow);
      }
      .issue-icon {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        flex-shrink: 0;
      }
      .issue-card.error .issue-icon {
        background: rgba(239,68,68,0.15);
        color: var(--red);
      }
      .issue-card.warning .issue-icon {
        background: rgba(245,158,11,0.15);
        color: var(--yellow);
      }
      .issue-content {
        flex: 1;
        min-width: 0;
      }
      .issue-message {
        font-size: 12px;
        color: var(--text);
        line-height: 1.5;
      }
      
      /* Quality Success State */
      .quality-success {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 24px;
        text-align: center;
      }
      .quality-success svg {
        color: var(--green);
        margin-bottom: 16px;
      }
      .quality-success .success-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 6px;
      }
      .quality-success .success-desc {
        font-size: 12px;
        color: var(--muted);
      }
    `;
  }
  
  private _buildScanButton(data: CoverageData): string {
    if (data.isScanning || data.appStatus === 'starting') {
      return `
        <button class="scan-btn scanning">
          <div class="scan-spinner"></div>
          Scanning...
        </button>
      `;
    }
    
    if (data.appStatus === 'running') {
      return `
        <button class="scan-btn running" onclick="stopApp()">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
          Stop
        </button>
      `;
    }
    
    return `
      <button class="scan-btn" onclick="scanApp()">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 2a10 10 0 0 1 0 20"/>
        </svg>
        Scan App
      </button>
    `;
  }
  
  private _getUnitBadge(data: CoverageData): string {
    const files = this._buildFileData(data.stacks).filter(f => f.testType === 'unit');
    const untested = files.filter(f => !f.tested).length;
    return untested > 0 ? `<span class="tab-badge">${untested}</span>` : '';
  }
  
  private _getComponentBadge(data: CoverageData): string {
    const files = this._buildFileData(data.stacks).filter(f => ['component', 'hook', 'visual'].includes(f.testType));
    const untested = files.filter(f => !f.tested).length;
    return untested > 0 ? `<span class="tab-badge">${untested}</span>` : '';
  }
  
  private _buildStrategySection(title: string, iconSvg: string, description: string, installedTypes: any[], setupTypes: any[], data: CoverageData, testTypes: string[]): string {
    const relevantInstalled = installedTypes.filter(({ testType }) => testTypes.includes(testType.testType.toLowerCase()));
    const relevantSetup = setupTypes.filter(({ testType }) => testTypes.includes(testType.testType.toLowerCase()));
    
    if (relevantInstalled.length === 0 && relevantSetup.length === 0) {
      return '';
    }
    
    // Get color based on title
    let colorClass = 'purple';
    if (title.includes('ISOLATED')) colorClass = 'blue';
    else if (title.includes('INTEGRATION')) colorClass = 'purple';
    else if (title.includes('API')) colorClass = 'orange';
    
    return `
      <div class="strategy-section-premium ${colorClass}">
        <div class="strategy-header-premium">
          <div class="strategy-icon-premium">${iconSvg}</div>
          <div class="strategy-info-premium">
            <div class="strategy-title-premium">${title}</div>
            <div class="strategy-desc-premium">${description}</div>
          </div>
          <div class="strategy-count">${relevantInstalled.length + relevantSetup.length}</div>
        </div>
        
        <div class="strategy-frameworks-premium">
          ${relevantInstalled.map(({ testType }) => this._buildStrategyFrameworkCard(testType, true, data, testTypes)).join('')}
          ${relevantSetup.map(({ testType }) => this._buildStrategyFrameworkCard(testType, false, data, testTypes)).join('')}
        </div>
      </div>
    `;
  }
  
  private _buildStrategyFrameworkCard(testType: TestTypeMatrix, installed: boolean, data: CoverageData, testTypes: string[]): string {
    const percent = testType.filesTotal > 0 ? Math.round((testType.filesTested / testType.filesTotal) * 100) : 0;
    const logo = this._getFrameworkLogo(testType.framework.name);
    
    // Determine which tab this framework belongs to
    let targetTab = 'unit';
    let targetLabel = 'View Unit';
    const tt = testType.testType.toLowerCase();
    
    if (tt === 'e2e') {
      targetTab = 'e2e';
      targetLabel = 'View E2E';
    } else if (['api', 'integration'].includes(tt)) {
      targetTab = 'api';
      targetLabel = 'View API';
    } else if (['component', 'hook', 'visual'].includes(tt)) {
      targetTab = 'component';
      targetLabel = 'View Component';
    }
    
    const getTestIconSvg = () => {
      if (tt === 'e2e') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>';
      if (tt === 'api' || tt === 'integration') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
      if (tt === 'visual') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></svg>';
    };
    const testIcon = getTestIconSvg();
    const testLabel = tt === 'e2e' ? 'E2E flows' : tt === 'api' || tt === 'integration' ? 'API endpoints' : tt === 'visual' ? 'visual components' : tt === 'component' ? 'components' : 'functions';
    
    return `
      <div class="framework-card-compact ${installed ? 'installed' : 'not-installed'}">
        <div class="fwc-header">
          <div class="fwc-logo">${logo}</div>
          <div class="fwc-info">
            <div class="fwc-name">${testType.framework.name}</div>
            <div class="fwc-type">${this._formatTestType(testType.testType)}</div>
          </div>
          ${installed ? `
            <div class="fwc-status installed">✓</div>
          ` : `
            <div class="fwc-status not-installed">○</div>
          `}
        </div>
        
        <div class="fwc-purpose">
          <span class="purpose-icon">${testIcon}</span>
          <span class="purpose-text">Tests ${testLabel}</span>
        </div>
        
        ${installed ? `
          <div class="fwc-progress">
            <div class="fwc-bar">
              <div class="fwc-fill" style="width: ${percent}%; background: ${this._getScoreColor(percent)}"></div>
            </div>
            <div class="fwc-stats">
              <span>${testType.filesTested}/${testType.filesTotal} ${tt === 'e2e' ? 'flows' : 'files'}</span>
              <span class="fwc-percent">${percent}%</span>
            </div>
          </div>
          <div class="fwc-actions">
            <button class="fwc-btn primary" onclick="runTests('${testType.testType}'); event.stopPropagation();">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>
              Run
            </button>
            <button class="fwc-btn secondary" onclick="document.querySelector('[data-tab=${targetTab}]').click(); event.stopPropagation();">
              ${targetLabel} →
            </button>
          </div>
        ` : `
          <div class="fwc-install-msg">Install to start testing ${testLabel}</div>
          <button class="fwc-btn install" onclick="installFramework('${testType.framework.name}'); event.stopPropagation();">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14m-7-7l7 7 7-7"/></svg>
            Install ${testType.framework.name}
          </button>
        `}
      </div>
    `;
  }
  
  private _buildUnitTab(files: FileItem[], data: CoverageData): string {
    const unitFiles = files.filter(f => f.testType === 'unit');
    const iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></svg>`;
    return this._buildTestFilesTab(
      'UNIT TESTING',
      iconSvg,
      'Test functions, utilities & business logic',
      'Jest',
      unitFiles,
      data,
      'unit'
    );
  }
  
  private _buildComponentTab(files: FileItem[], data: CoverageData): string {
    const componentFiles = files.filter(f => ['component', 'hook', 'visual'].includes(f.testType));
    const iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
    return this._buildTestFilesTab(
      'COMPONENT TESTING',
      iconSvg,
      'Test React/Vue components, hooks & UI elements',
      'Jest, React Testing Library',
      componentFiles,
      data,
      'component'
    );
  }
  
  private _buildTestFilesTab(title: string, icon: string, description: string, framework: string, files: FileItem[], data: CoverageData, testType: string): string {
    const tested = files.filter(f => f.tested);
    const untested = files.filter(f => !f.tested);
    const percent = files.length > 0 ? Math.round((tested.length / files.length) * 100) : 0;
    
    // Check if framework is installed
    const frameworkInstalled = data.stacks.some(stack => 
      stack.testTypes.some(tt => 
        (testType === 'unit' && tt.testType.toLowerCase() === 'unit' && tt.status === 'installed') ||
        (testType === 'component' && ['component', 'hook'].includes(tt.testType.toLowerCase()) && tt.status === 'installed')
      )
    );
    
    // Get framework name for install button (lowercase for backend matching)
    const frameworkKey = testType === 'unit' ? 'jest' : 'testing-library';
    const frameworkDisplayName = testType === 'unit' ? 'Jest' : 'React Testing Library';
    
    // If framework is NOT installed, show install CTA first
    if (!frameworkInstalled) {
      const isUnit = testType === 'unit';
      const testWhat = isUnit ? 'unit tests' : 'component tests';
      
      return `
        <div class="tab-empty-state">
          <div class="empty-icon-svg">${icon}</div>
          <div class="empty-title">${frameworkDisplayName} not installed</div>
          <div class="empty-desc">Install ${frameworkDisplayName} to enable ${testWhat} for your workspace. After installation, files will be automatically analyzed.</div>
          
          <button class="empty-action" onclick="installFramework('${frameworkKey}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14m-7-7l7 7 7-7"/>
            </svg>
            Install ${frameworkDisplayName}
          </button>
          
          <div class="empty-hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            <span>After installing, workspace will be analyzed automatically</span>
          </div>
        </div>
      `;
    }
    
    // Framework is installed but no files found
    if (files.length === 0) {
      const isUnit = testType === 'unit';
      
      if (isUnit) {
        // For Unit tests - show Jest installed status + guidance
        return `
          <div class="tab-empty-state">
            <div class="empty-icon-svg">${icon}</div>
            <div class="empty-title">Jest is installed ✓</div>
            <div class="empty-desc">Ready for unit testing, but no standalone unit test files detected yet.</div>
            
            <!-- Framework Status Card -->
            <div style="margin: 24px 0; padding: 16px; background: var(--vscode-editor-background); border-radius: 8px; border: 1px solid var(--vscode-widget-border);">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <div style="width: 40px; height: 40px; border-radius: 8px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); display: flex; align-items: center; justify-content: center;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                <div style="flex: 1;">
                  <div style="font-weight: 600; font-size: 15px; margin-bottom: 2px;">Jest v30.2.0</div>
                  <div style="font-size: 12px; color: var(--vscode-descriptionForeground);">JavaScript Testing Framework</div>
                </div>
              </div>
              <div style="font-size: 13px; line-height: 1.5; color: var(--vscode-descriptionForeground);">
                Unit testing is for utility functions, helpers, reducers, and business logic. For React components, use the <strong>Component</strong> tab instead.
              </div>
            </div>
            
            <!-- What to test -->
            <div style="padding: 16px; background: var(--vscode-editor-background); border-radius: 8px; border-left: 3px solid #3b82f6;">
              <div style="font-weight: 600; color: #3b82f6; margin-bottom: 12px; font-size: 14px;">📝 What can you test with Jest?</div>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8; color: var(--vscode-descriptionForeground);">
                <li><strong>Redux reducers & actions</strong> - Pure functions for state management</li>
                <li><strong>Utility functions</strong> - Helpers, formatters, validators</li>
                <li><strong>Business logic</strong> - Calculations, transformations</li>
                <li><strong>Constants & configs</strong> - API endpoints, settings</li>
              </ul>
            </div>
            
            <button class="empty-action" onclick="document.querySelector('[data-tab=component]').click()" style="margin-top: 16px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              View Component Tests
            </button>
          </div>
        `;
      } else {
        // For Component tests
        const suggestions = 'React/Vue components, custom hooks, or UI elements';
        
        return `
          <div class="tab-empty-state">
            <div class="empty-icon-svg">${icon}</div>
            <div class="empty-title">No ${title.split(' ')[0].toLowerCase()} files detected</div>
            <div class="empty-desc">Your workspace doesn't contain ${suggestions}. This might be expected for your project type.</div>
            
            <div class="empty-hint">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
              </svg>
              <span>Check Overview tab to see other available test types</span>
            </div>
          </div>
        `;
      }
    }
    
    // Calculate priority distribution
    const highPriority = files.filter(f => !f.tested && this._calculatePriority(f) === 'high');
    const mediumPriority = files.filter(f => !f.tested && this._calculatePriority(f) === 'medium');
    const lowPriority = files.filter(f => !f.tested && this._calculatePriority(f) === 'low');
    
    return `
      <div class="test-tab-header">
        <div class="tab-header-icon-svg">${icon}</div>
        <div class="tab-header-info">
          <h2 class="tab-title">${title}</h2>
          <p class="tab-desc">${description}</p>
          <div class="tab-framework">Framework: <strong>${framework}</strong></div>
        </div>
      </div>
      
      <!-- Premium Status Bar -->
      <div class="test-tab-status-bar">
        <div class="status-left">
          <div class="status-framework-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            ${framework.split(',')[0].trim()}
          </div>
          <div class="status-separator"></div>
          <div class="status-metrics">
            <span class="status-metric-item">
              <span class="metric-label">Coverage:</span>
              <span class="metric-value" style="color: ${this._getScoreColor(percent)}">${percent}%</span>
            </span>
            <span class="status-metric-item">
              <span class="metric-label">${tested.length}/${files.length} files tested</span>
            </span>
          </div>
        </div>
        <button class="status-run-btn" onclick="runTests('${testType}')" ${files.length === 0 ? 'disabled' : ''}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7L8 5z"/>
          </svg>
          Run All Tests
        </button>
      </div>
      
      ${untested.length > 0 ? `
      <!-- Filter Bar & Batch Actions -->
      <div class="files-filter-section">
        <div class="filter-summary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          <span><strong>${untested.length}</strong> ${untested.length === 1 ? 'FILE NEEDS' : 'FILES NEED'} ${testType.toUpperCase()} TESTS</span>
        </div>
        
        <div class="filter-chips">
          <button class="filter-chip active" data-filter="all" onclick="filterFiles('all', '${testType}')">
            All Files
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 10l5 5 5-5H7z"/>
            </svg>
          </button>
          ${highPriority.length > 0 ? `
          <button class="filter-chip high" data-filter="high" onclick="filterFiles('high', '${testType}')">
            <span class="chip-dot high"></span>
            High Priority (${highPriority.length})
          </button>
          ` : ''}
          ${mediumPriority.length > 0 ? `
          <button class="filter-chip medium" data-filter="medium" onclick="filterFiles('medium', '${testType}')">
            <span class="chip-dot medium"></span>
            Medium (${mediumPriority.length})
          </button>
          ` : ''}
          ${lowPriority.length > 0 ? `
          <button class="filter-chip low" data-filter="low" onclick="filterFiles('low', '${testType}')">
            <span class="chip-dot low"></span>
            Low (${lowPriority.length})
          </button>
          ` : ''}
        </div>
        
        <button class="batch-action-btn" onclick="generateAllTests('${testType}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          Generate All Tests
        </button>
      </div>
      ` : `
      <!-- Success State -->
      <div class="files-filter-section success">
        <div class="filter-summary success">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <span><strong>All ${files.length} files tested!</strong> Great coverage 🎉</span>
        </div>
      </div>
      `}
      
      <div class="test-files-list">
        ${this._buildFilesList(files, frameworkInstalled, testType)}
      </div>
      
      ${untested.length > 0 ? `
      <!-- Pro Tips Footer -->
      <div class="pro-tips-section">
        <div class="pro-tips-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span>Pro Tips</span>
        </div>
        <div class="pro-tips-content">
          ${testType === 'unit' ? `
          <div class="tip-item">
            <div class="tip-number">1</div>
            <div class="tip-text"><strong>Start with high priority:</strong> Focus on reducers and business logic first - they're the backbone of your app</div>
          </div>
          <div class="tip-item">
            <div class="tip-number">2</div>
            <div class="tip-text"><strong>Test pure functions:</strong> Utility functions and helpers are easiest to test with predictable inputs/outputs</div>
          </div>
          <div class="tip-item">
            <div class="tip-number">3</div>
            <div class="tip-text"><strong>Batch generate:</strong> Use "Generate All Tests" to create test scaffolds for all untested files at once</div>
          </div>
          ` : `
          <div class="tip-item">
            <div class="tip-number">1</div>
            <div class="tip-text"><strong>Test user interactions:</strong> Focus on clicks, form inputs, and navigation - that's what users actually do</div>
          </div>
          <div class="tip-item">
            <div class="tip-number">2</div>
            <div class="tip-text"><strong>Check rendering:</strong> Verify components display correctly with different props and states</div>
          </div>
          <div class="tip-item">
            <div class="tip-number">3</div>
            <div class="tip-text"><strong>Mock dependencies:</strong> Use React Testing Library to mock API calls and external services</div>
          </div>
          `}
        </div>
      </div>
      ` : ''}
    `;
  }
  
  private _buildFilesList(files: FileItem[], frameworkInstalled: boolean, testType: string): string {
    // Group by directory
    const byDirectory = new Map<string, FileItem[]>();
    for (const file of files) {
      const dir = file.dir || '/';
      if (!byDirectory.has(dir)) {
        byDirectory.set(dir, []);
      }
      byDirectory.get(dir)!.push(file);
    }
    
    return Array.from(byDirectory.entries()).map(([dir, dirFiles]) => {
      const untested = dirFiles.filter(f => !f.tested);
      const displayDir = dir === '/' ? 'Root' : dir;
      
      return `
        <div class="file-directory">
          <div class="dir-header" onclick="this.parentElement.classList.toggle('collapsed')">
            <svg class="dir-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
            <svg class="dir-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <span class="dir-name">${this._escapeHtml(displayDir)}</span>
            <span class="dir-count">${dirFiles.length}</span>
            ${untested.length > 0 ? `<span class="dir-badge-untested">${untested.length} untested</span>` : ''}
          </div>
          <div class="dir-files">
            ${dirFiles.map(file => this._buildFileRow(file, frameworkInstalled, testType)).join('')}
          </div>
        </div>
      `;
    }).join('');
  }
  
  private _buildFileRow(file: FileItem, frameworkInstalled: boolean, testType: string): string {
    if (file.tested) {
      return `
        <div class="file-card-premium tested" onclick="openFile('${file.path.replace(/'/g, "\\'")}')"> 
          <div class="card-status-bar tested"></div>
          <div class="card-content">
            <div class="card-header">
              <div class="status-icon tested">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
            <div class="file-title">
              <div class="file-name-premium">${this._escapeHtml(file.name)}</div>
              <div class="file-path-premium">${this._escapeHtml(file.dir || '')}</div>
            </div>
            <div class="priority-badge success">✓ Tested</div>
            </div>
          </div>
        </div>
      `;
    }
    
    // For untested files - create premium card with metrics
    const priority = this._calculatePriority(file);
    const priorityLabel = priority === 'high' ? 'HIGH PRIORITY' : priority === 'medium' ? 'MEDIUM' : 'LOW';
    const priorityClass = priority === 'high' ? 'high' : priority === 'medium' ? 'medium' : 'low';
    const priorityIcon = priority === 'high' ? '⚠️' : priority === 'medium' ? '⚠️' : 'ℹ️';
    
    const recommendation = this._getSmartRecommendation(file, testType);
    const complexityScore = this._estimateComplexity(file);
    const complexityPercent = Math.min(complexityScore * 10, 100);
    
    return `
      <div class="file-card-premium untested ${priorityClass}" data-file-path="${this._escapeHtml(file.path)}">
        <div class="card-status-bar ${priorityClass}"></div>
        <div class="card-content">
          <div class="card-header">
            <div class="status-icon untested">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="6"/>
              </svg>
            </div>
            <div class="file-title">
              <div class="file-name-premium">${this._escapeHtml(file.name)}</div>
              <div class="file-path-premium">${this._escapeHtml(file.dir || '')}</div>
            </div>
            <div class="priority-badge ${priorityClass}" title="${priority === 'high' ? 'Critical business logic - high impact on app functionality' : priority === 'medium' ? 'Supporting utilities and helpers - moderate importance' : 'Configuration and constants - low complexity'}">${priorityIcon} ${priorityLabel}</div>
          </div>
          
          ${recommendation ? `
          <div class="card-recommendation">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            <span>${recommendation}</span>
          </div>
          ` : ''}
          
          <div class="card-metrics">
            <div class="metric-item" title="Estimated test complexity based on file type and structure. Higher = more test cases needed.">
              <span class="metric-label">Complexity</span>
              <div class="complexity-bar">
                <div class="complexity-fill" style="width: ${complexityPercent}%"></div>
              </div>
              <span class="metric-value">${complexityScore}/10</span>
            </div>
          </div>
          
          <div class="card-actions">
            ${frameworkInstalled ? `
              <button class="card-btn primary" onclick="generateFileTest('${file.path.replace(/'/g, "\\'")}', '${testType}'); event.stopPropagation();">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                Generate Test
              </button>
              <button class="card-btn secondary" onclick="openFile('${file.path.replace(/'/g, "\\'")}'); event.stopPropagation();">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                View Code
              </button>
            ` : `
              <div class="card-warning">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Framework required to generate tests
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }
  
  private _calculatePriority(file: FileItem): 'high' | 'medium' | 'low' {
    const fileName = file.name.toLowerCase();
    
    // High priority - core business logic
    if (fileName.includes('reducer') || fileName.includes('store') || fileName.includes('action')) {
      return 'high';
    }
    
    // Medium priority - utilities and helpers
    if (fileName.includes('util') || fileName.includes('helper') || fileName.includes('service')) {
      return 'medium';
    }
    
    // Low priority - constants and simple files
    if (fileName.includes('constant') || fileName.includes('config') || fileName.includes('type')) {
      return 'low';
    }
    
    return 'medium'; // default
  }
  
  private _estimateComplexity(file: FileItem): number {
    const fileName = file.name.toLowerCase();
    
    // High complexity (7-10)
    if (fileName.includes('reducer') || fileName.includes('controller')) {
      return 8;
    }
    
    // Medium complexity (4-6)
    if (fileName.includes('service') || fileName.includes('util') || fileName.includes('store')) {
      return 5;
    }
    
    // Low complexity (1-3)
    if (fileName.includes('constant') || fileName.includes('type') || fileName.includes('config')) {
      return 2;
    }
    
    return 4; // default medium
  }
  
  private _getSmartRecommendation(file: FileItem, testType: string): string {
    const fileName = file.name.toLowerCase();
    
    if (testType === 'unit') {
      if (fileName.includes('reducer')) {
        return 'Test state transitions & action handlers';
      }
      if (fileName.includes('store')) {
        return 'Test store initialization & middleware';
      }
      if (fileName.includes('action')) {
        return 'Test action creators & types';
      }
      if (fileName.includes('util') || fileName.includes('helper')) {
        return 'Test utility functions & edge cases';
      }
      if (fileName.includes('constant')) {
        return 'Constants typically don\'t need tests';
      }
      return 'Test functions in isolation';
    }
    
    // For component testing
    if (fileName.includes('button') || fileName.includes('input')) {
      return 'Test props, events & rendering';
    }
    if (fileName.includes('form')) {
      return 'Test validation & submission';
    }
    if (fileName.includes('modal')) {
      return 'Test open/close & interactions';
    }
    
    return 'Test component behavior';
  }
  
  private _getFileRecommendation(file: FileItem): string {
    const fileName = file.name.toLowerCase();
    
    if (fileName.includes('util') || fileName.includes('helper')) {
      return 'Test utility functions & edge cases';
    }
    if (fileName.includes('format') || fileName.includes('parse')) {
      return 'Test formatting & parsing logic';
    }
    if (fileName.includes('validate')) {
      return 'Test validation rules & errors';
    }
    if (fileName.includes('button') || fileName.includes('input')) {
      return 'Test props, events & rendering';
    }
    if (fileName.includes('form')) {
      return 'Test validation & submission';
    }
    if (fileName.includes('modal') || fileName.includes('dialog')) {
      return 'Test open/close & interactions';
    }
    if (fileName.startsWith('use')) {
      return 'Test hook logic & state updates';
    }
    
    return '';
  }
  
  private _buildE2ETab(data: CoverageData): string {
    const e2eIconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>`;
    
    if (!data.flowAnalysis || data.flowAnalysis.flows.length === 0) {
      return `
        <div class="tab-empty-state">
          <div class="empty-icon-svg">${e2eIconSvg}</div>
          <div class="empty-title">No E2E flows discovered</div>
          <div class="empty-desc">Scan your running application to automatically discover user journeys and generate E2E tests</div>
          <button class="empty-action" onclick="scanApp()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2a10 10 0 0 1 0 20"/>
            </svg>
            Scan Application
          </button>
        </div>
      `;
    }
    
    const flows = data.flowAnalysis.flows;
    const criticalFlows = flows.filter(f => f.priority === 'critical');
    const standardFlows = flows.filter(f => f.priority !== 'critical');
    
    const testedFlows = this._countTestedFlows(data);
    const percent = flows.length > 0 ? Math.round((testedFlows / flows.length) * 100) : 0;
    
    return `
      <div class="test-tab-header">
        <div class="tab-header-icon-svg">${e2eIconSvg}</div>
        <div class="tab-header-info">
          <h2 class="tab-title">E2E TESTING</h2>
          <p class="tab-desc">Test complete user journeys & critical flows</p>
          <div class="tab-framework">Framework: <strong>Playwright</strong></div>
        </div>
      </div>
      
      <div class="test-tab-stats">
        <div class="stat-card-mini">
          <div class="stat-ring-container">
            <svg class="stat-ring" viewBox="0 0 36 36">
              <circle class="ring-bg-mini" cx="18" cy="18" r="15.915"/>
              <circle class="ring-progress-mini" cx="18" cy="18" r="15.915" 
                stroke-dasharray="${percent} 100"
                style="stroke: ${this._getScoreColor(percent)}"/>
            </svg>
            <span class="stat-ring-value">${percent}%</span>
          </div>
          <div class="stat-info-mini">
            <span class="stat-label">Flows Tested</span>
            <span class="stat-value">${testedFlows}/${flows.length}</span>
          </div>
        </div>
        
        <button class="scan-app-btn" onclick="scanApp()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2a10 10 0 0 1 0 20"/>
          </svg>
          <span>Scan Application</span>
        </button>
      </div>
      
      ${criticalFlows.length > 0 ? `
      <div class="flows-section">
        <div class="section-label-premium">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          CRITICAL FLOWS
        </div>
        ${criticalFlows.map(flow => this._buildFlowCardPremium(flow, data)).join('')}
      </div>
      ` : ''}
      
      ${standardFlows.length > 0 ? `
      <div class="flows-section">
        <div class="section-label-premium">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20M2 12h20"/>
          </svg>
          STANDARD FLOWS
        </div>
        ${standardFlows.map(flow => this._buildFlowCardPremium(flow, data)).join('')}
      </div>
      ` : ''}
    `;
  }
  
  private _buildFlowCardPremium(flow: UserFlow, data: CoverageData): string {
    const flowState = data.flowStates?.[flow.id];
    const status = flowState?.status || 'untested';
    const testFile = flowState?.testFilePath;
    
    const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
      untested: { label: 'No test', color: '#6b7280', icon: '○' },
      generated: { label: 'Generated', color: '#f59e0b', icon: '●' },
      passing: { label: 'Passing', color: '#22c55e', icon: '✓' },
      failing: { label: 'Failing', color: '#ef4444', icon: '✗' }
    };
    const statusInfo = statusConfig[status];
    
    return `
      <div class="flow-card-premium flow-${status}">
        <div class="flow-main">
          <div class="flow-icon-premium">${flow.icon}</div>
          <div class="flow-content">
            <div class="flow-title-premium">${this._escapeHtml(flow.name)}</div>
            <div class="flow-journey-preview">
              ${flow.steps.map((step, i) => `
                <span class="journey-step-mini">${this._getRouteTitle(step.route)}</span>
                ${i < flow.steps.length - 1 ? '<span class="journey-arrow">→</span>' : ''}
              `).join('')}
            </div>
            <div class="flow-meta">
              <span class="flow-meta-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                ${flow.steps.length} steps
              </span>
              <span class="flow-meta-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                ${flow.totalFiles} files
              </span>
            </div>
            ${testFile ? `
            <div class="flow-test-file" onclick="openFile('${testFile}'); event.stopPropagation();">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              ${testFile.split('/').pop()}
            </div>
            ` : ''}
          </div>
          <div class="flow-status-premium" style="color: ${statusInfo.color}">
            <span class="status-icon-premium">${statusInfo.icon}</span>
            <span class="status-label-premium">${statusInfo.label}</span>
          </div>
        </div>
        <div class="flow-actions-premium">
          ${status !== 'untested' ? `
            <button class="flow-btn-premium secondary" onclick="runTests('e2e'); event.stopPropagation();">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>
              Run Test
            </button>
            ${testFile ? `
            <button class="flow-btn-premium secondary" onclick="openFile('${testFile}'); event.stopPropagation();">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              View Code
            </button>
            ` : ''}
          ` : `
            <button class="flow-btn-premium primary" onclick="generateFlowTest('${flow.id}'); event.stopPropagation();">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              Generate E2E Test
            </button>
          `}
        </div>
      </div>
    `;
  }
  
  private _getRouteTitle(route: string): string {
    const parts = route.split('/').filter(Boolean);
    if (parts.length === 0) return 'Home';
    const last = parts[parts.length - 1];
    return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ');
  }
  
  private _buildFlowCard(flow: UserFlow): string {
    const filesCoverage = flow.totalFiles > 0 
      ? Math.round((flow.testedFiles / flow.totalFiles) * 100) 
      : 0;
    const untestedFiles = flow.totalFiles - flow.testedFiles;
    
    // Get flow state from data
    const flowState = this._data?.flowStates?.[flow.id];
    const status = flowState?.status || 'untested';
    const testFile = flowState?.testFilePath || null;
    
    // Group files by route for better context
    const filesPerRoute = this._groupFilesByRoute(flow);
    
    // Generate smart flow name
    const smartName = this._getSmartFlowName(flow);
    
    // Status configuration
    const statusConfig = {
      untested: { label: 'Not Tested', color: 'rgba(156,163,175,0.2)', icon: '○' },
      generated: { label: 'Generated', color: 'rgba(245,158,11,0.2)', icon: '●' },
      passing: { label: 'Passing', color: 'rgba(34,197,94,0.2)', icon: '✓' },
      failing: { label: 'Failing', color: 'rgba(239,68,68,0.2)', icon: '✗' }
    };
    const statusInfo = statusConfig[status];
    
    return `
      <div class="flow-card-v2 flow-status-${status}">
        <div class="flow-header-v2">
          <div class="flow-icon-large">${flow.icon}</div>
          <div class="flow-info-v2">
            <div class="flow-title-row">
              <span class="flow-name-v2">${this._escapeHtml(smartName)}</span>
              <div class="flow-badges">
                <span class="flow-status-badge" style="background: ${statusInfo.color}">
                  <span class="status-icon">${statusInfo.icon}</span>
                  ${statusInfo.label}
                </span>
                <span class="flow-priority-badge ${flow.priority}">${flow.priority}</span>
              </div>
            </div>
            <span class="flow-desc-v2">${this._escapeHtml(flow.description)}</span>
            <div class="flow-stats">
              <span class="stat-item">
                <span class="stat-icon">◆</span>
                <span class="stat-value">${flow.routes.length} routes</span>
              </span>
              <span class="stat-item">
                <span class="stat-icon">▸</span>
                <span class="stat-value" style="color: ${untestedFiles > 0 ? 'var(--yellow)' : 'var(--green)'}">${flow.testedFiles}/${flow.totalFiles} tested</span>
              </span>
            </div>
            ${testFile ? `
            <div class="test-file-info">
              <span class="test-file-icon">◆</span>
              <span class="test-file-path" onclick="openFile('${testFile}'); event.stopPropagation();">${testFile}</span>
            </div>
            ` : ''}
          </div>
        </div>
        
        ${testFile ? `
        <div class="flow-progress-bar">
          <div class="progress-fill" style="width: ${status === 'passing' ? '100' : status === 'generated' ? '50' : '0'}%"></div>
        </div>
        ` : ''}
        
        <div class="flow-journey">
          <div class="journey-header">
            <span class="journey-icon">⇗</span>
            <span class="journey-title">USER JOURNEY</span>
          </div>
          
          ${flow.steps.map((step, index) => {
            const stepFiles = filesPerRoute.get(step.route) || [];
            const stepUntested = stepFiles.filter(f => !f.tested).length;
            const routeTitle = this._getRouteTitle(step.route);
            
            return `
              <div class="journey-step">
                <div class="journey-step-header">
                  <div class="step-number-large">${index + 1}</div>
                  <div class="step-main-info">
                    <div class="step-title-v2">${routeTitle}</div>
                    <div class="step-action-v2">
                      <span class="action-badge ${step.action}">${step.action}</span>
                      <span class="route-badge">${this._escapeHtml(step.route)}</span>
                    </div>
                  </div>
                  ${stepFiles.length > 0 ? `
                    <div class="step-files-badge" onclick="document.getElementById('step-${index}-files').classList.toggle('expanded'); event.stopPropagation();">
                      ▸ ${stepFiles.length} files
                      ${stepUntested > 0 ? `<span class="untested-count">${stepUntested}</span>` : ''}
                    </div>
                  ` : ''}
                </div>
                
                ${stepFiles.length > 0 ? `
                  <div class="step-files-list" id="step-${index}-files">
                    ${stepFiles.map(file => `
                      <div class="step-file-item ${file.tested ? 'tested' : 'untested'}" onclick="openFile('${file.path}'); event.stopPropagation();">
                        <span class="file-status-mini">${file.tested 
                          ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>' 
                          : '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>'}</span>
                        <span class="file-name-mini">${this._escapeHtml(file.name)}</span>
                        <span class="file-type-mini">${file.type}</span>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
                
                ${index < flow.steps.length - 1 ? '<div class="journey-arrow">↓</div>' : ''}
              </div>
            `;
          }).join('')}
        </div>
        
        <div class="flow-actions">
          <button class="btn-show-all" onclick="this.closest('.flow-card-v2').classList.toggle('show-all-files'); event.stopPropagation();">
            <span class="show-text">▾ Show All Files (${flow.relatedFiles.length})</span>
            <span class="hide-text">▴ Hide Files</span>
          </button>
          <div class="action-buttons">
            ${testFile ? `
              <button class="btn-action btn-run" onclick="event.stopPropagation();">▶ Run Test</button>
              <button class="btn-action btn-open" onclick="openFile('${testFile}'); event.stopPropagation();">◆ Open Test</button>
              <button class="btn-action btn-regen" onclick="generateFlowTest('${flow.id}'); event.stopPropagation();">⟳ Regenerate</button>
            ` : `
              <button class="btn-skip" onclick="event.stopPropagation();">Skip</button>
              <button class="btn-generate-flow" onclick="generateFlowTest('${flow.id}'); event.stopPropagation();">
                ⚡ Generate E2E Test
              </button>
            `}
          </div>
        </div>
        
        <!-- All Files View (hidden by default) -->
        <div class="all-files-view">
          <div class="all-files-header">
            <span>◆ All Related Files</span>
            <span class="files-count">${flow.relatedFiles.length} total</span>
          </div>
          <div class="all-files-grid">
            ${flow.relatedFiles.map(file => `
              <div class="file-card ${file.tested ? 'tested' : 'untested'}" onclick="openFile('${file.path}'); event.stopPropagation();">
                <span class="file-status-icon">${file.tested 
                  ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>' 
                  : '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>'}</span>
                <div class="file-card-info">
                  <span class="file-card-name">${this._escapeHtml(file.name)}</span>
                  <span class="file-card-type">${file.type}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Group files by route for better organization
   */
  private _groupFilesByRoute(flow: UserFlow): Map<string, any[]> {
    const map = new Map<string, any[]>();
    
    if (!flow.relatedFiles) return map;
    
    // For each file, associate it with routes it's used in
    for (const file of flow.relatedFiles) {
      if (file.routes && file.routes.length > 0) {
        for (const route of file.routes) {
          if (!map.has(route)) {
            map.set(route, []);
          }
          map.get(route)!.push(file);
        }
      } else {
        // If no specific route, add to all routes
        for (const route of flow.routes) {
          if (!map.has(route)) {
            map.set(route, []);
          }
          map.get(route)!.push(file);
        }
      }
    }
    
    return map;
  }
  
  /**
   * Generate smart flow name based on routes
   */
  private _getSmartFlowName(flow: UserFlow): string {
    const routes = flow.routes.map(r => r.toLowerCase());
    
    // Authentication flows
    if (routes.some(r => r.includes('login')) || routes.some(r => r.includes('signin'))) {
      return '🔐 User Authentication Flow';
    }
    if (routes.some(r => r.includes('signup')) || routes.some(r => r.includes('register'))) {
      return '✨ User Registration Flow';
    }
    
    // E-commerce flows
    if (routes.some(r => r.includes('checkout')) || routes.some(r => r.includes('payment'))) {
      return '💳 Checkout Flow';
    }
    if (routes.some(r => r.includes('cart'))) {
      return '🛒 Cart Flow';
    }
    if (routes.some(r => r.includes('product'))) {
      return '🏷️ Products Flow';
    }
    
    // Content flows
    if (routes.some(r => r.includes('blog')) || routes.some(r => r.includes('article'))) {
      return '📝 Content Flow';
    }
    if (routes.some(r => r.includes('search'))) {
      return '🔍 Search Flow';
    }
    
    // Account management
    if (routes.some(r => r.includes('profile')) || routes.some(r => r.includes('account'))) {
      return '👤 Account Flow';
    }
    if (routes.some(r => r.includes('settings'))) {
      return '⚙️ Settings Flow';
    }
    if (routes.some(r => r.includes('dashboard'))) {
      return '📊 Dashboard Flow';
    }
    
    // Informational
    if (routes.some(r => r.includes('pricing'))) {
      return '💰 Pricing Flow';
    }
    if (routes.some(r => r.includes('contact'))) {
      return '📧 Contact Flow';
    }
    if (routes.some(r => r.includes('about'))) {
      return 'ℹ️ About Flow';
    }
    
    // Default: Main Navigation
    if (routes.includes('/') && routes.length >= 2) {
      return '✨ Main Navigation Flow';
    }
    
    // Fallback to original name
    return flow.name;
  }
  
  private _buildApiTab(apiSpec: ParsedApiSpec): string {
    return `
      <div class="tab-content" id="tab-api">
        <div class="quality-header">
          <div class="quality-score" style="color: ${this._getScoreColor(apiSpec.coverage)}">
            ${apiSpec.coverage}%
          </div>
          <div class="quality-summary">
            <span class="qs good">${apiSpec.testedEndpoints} tested</span>
            <span class="qs warn">${apiSpec.totalEndpoints - apiSpec.testedEndpoints} untested</span>
          </div>
        </div>
        
        <div class="section-label">API ENDPOINTS (${apiSpec.totalEndpoints})</div>
        <div class="api-list">
          ${apiSpec.endpoints.map(ep => `
            <div class="api-endpoint">
              <span class="api-method ${ep.method}">${ep.method}</span>
              <span class="api-path">${this._escapeHtml(ep.path)}</span>
              <span class="api-status ${ep.testStatus === 'tested' ? 'tested' : 'untested'}">
                ${ep.testStatus === 'tested' 
                  ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>' 
                  : '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>'}
              </span>
              ${ep.testStatus !== 'tested' ? `
                <span class="api-action" onclick="generateApiTest('${ep.id}'); event.stopPropagation();">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                  Generate
                </span>
              ` : ''}
            </div>
          `).join('')}
        </div>
        
        ${apiSpec.totalEndpoints - apiSpec.testedEndpoints > 0 ? `
          <button class="btn-secondary" style="margin-top: 14px" onclick="generateAllApiTests()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Generate All Missing Tests
          </button>
        ` : ''}
      </div>
    `;
  }
}

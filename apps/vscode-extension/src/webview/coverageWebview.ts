/**
 * Coverage Webview - Advanced UI with Glassmorphism & Animations
 * 
 * Provides a cutting-edge, award-winning visualization of test coverage
 * with smooth animations, progress indicators, and interactive elements.
 */

import * as vscode from 'vscode';
import { EnhancedAnalysisResponse } from '../types/enhanced-analysis.types';

export class CoverageWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'qagenai.coverageWebview';
  private _view?: vscode.WebviewView;
  private _analysisData?: EnhancedAnalysisResponse;

  constructor(
    private readonly _extensionUri: vscode.Uri,
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(data => {
      switch (data.type) {
        case 'generateTest':
          vscode.commands.executeCommand('qagenai.generateTestsForFile', data.filePath);
          break;
        case 'installFramework':
          vscode.commands.executeCommand('qagenai.installFramework', data.framework);
          break;
        case 'analyzeWorkspace':
          vscode.commands.executeCommand('qagenai.analyzeWorkspace');
          break;
      }
    });
  }

  public updateData(data: EnhancedAnalysisResponse) {
    this._analysisData = data;
    if (this._view) {
      this._view.webview.postMessage({ type: 'updateData', data });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Test Coverage</title>
      <style>
        /* ===== CSS RESET & BASE ===== */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        :root {
          --bg-primary: var(--vscode-sideBar-background);
          --bg-secondary: var(--vscode-editor-background);
          --text-primary: var(--vscode-foreground);
          --text-secondary: var(--vscode-descriptionForeground);
          --accent: var(--vscode-focusBorder);
          --success: var(--vscode-testing-iconPassed);
          --warning: var(--vscode-editorWarning-foreground);
          --error: var(--vscode-testing-iconFailed);
          --border: var(--vscode-panel-border);
          
          /* Glassmorphism variables */
          --glass-bg: rgba(255, 255, 255, 0.05);
          --glass-border: rgba(255, 255, 255, 0.1);
          --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.1);
          --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.15);
          --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.2);
        }

        body {
          font-family: var(--vscode-font-family);
          font-size: var(--vscode-font-size);
          color: var(--text-primary);
          background: var(--bg-primary);
          padding: 16px;
          line-height: 1.6;
        }

        /* ===== GLASSMORPHISM CARDS ===== */
        .card {
          background: var(--glass-bg);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
          box-shadow: var(--shadow-md);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
          border-color: var(--accent);
        }

        /* ===== ANIMATED PROGRESS RING ===== */
        .coverage-hero {
          text-align: center;
          padding: 32px 20px;
          background: linear-gradient(135deg, var(--glass-bg) 0%, rgba(0, 0, 0, 0.1) 100%);
          border-radius: 16px;
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
        }

        .coverage-hero::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, var(--accent) 0%, transparent 70%);
          opacity: 0.1;
          animation: pulse 4s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.1; }
          50% { transform: scale(1.1); opacity: 0.15; }
        }

        .coverage-ring {
          width: 160px;
          height: 160px;
          margin: 0 auto 20px;
          position: relative;
        }

        .coverage-percentage {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 48px;
          font-weight: 700;
          background: linear-gradient(135deg, var(--accent) 0%, var(--success) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s ease-in-out infinite;
        }

        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        /* ===== PROGRESS BARS ===== */
        .progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          overflow: hidden;
          margin: 8px 0;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--success) 0%, var(--accent) 100%);
          border-radius: 4px;
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
          animation: shimmer-slide 2s ease-in-out infinite;
        }

        @keyframes shimmer-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* ===== SECTION HEADERS ===== */
        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          font-size: 18px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .section-icon {
          font-size: 24px;
          animation: bounce 2s ease-in-out infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        /* ===== STATS GRID ===== */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          margin: 16px 0;
        }

        .stat-card {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          padding: 16px;
          text-align: center;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .stat-card:hover {
          transform: scale(1.05);
          border-color: var(--accent);
          background: rgba(255, 255, 255, 0.08);
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          display: block;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 12px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* ===== FRAMEWORK BADGES ===== */
        .framework-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .framework-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: linear-gradient(135deg, var(--glass-bg) 0%, rgba(0, 0, 0, 0.1) 100%);
          border: 1px solid var(--glass-border);
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .framework-badge:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .framework-badge.installed {
          border-color: var(--success);
          background: linear-gradient(135deg, rgba(0, 255, 0, 0.1) 0%, var(--glass-bg) 100%);
        }

        .framework-badge.recommended {
          border-color: var(--warning);
          background: linear-gradient(135deg, rgba(255, 200, 0, 0.1) 0%, var(--glass-bg) 100%);
          cursor: pointer;
        }

        /* ===== BUTTONS ===== */
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          position: relative;
          overflow: hidden;
        }

        .btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }

        .btn:hover::before {
          width: 300px;
          height: 300px;
        }

        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }

        .btn:active {
          transform: translateY(0);
        }

        /* ===== FILE LIST ===== */
        .file-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          margin-bottom: 8px;
          transition: all 0.2s ease;
        }

        .file-item:hover {
          background: rgba(255, 255, 255, 0.08);
          transform: translateX(4px);
          border-left: 3px solid var(--accent);
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .priority-badge {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse-badge 2s ease-in-out infinite;
        }

        @keyframes pulse-badge {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }

        .priority-high { background: var(--error); }
        .priority-medium { background: var(--warning); }
        .priority-low { background: var(--success); }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 600px) {
          .stats-grid {
            grid-template-columns: 1fr 1fr;
          }
          
          .coverage-ring {
            width: 120px;
            height: 120px;
          }
          
          .coverage-percentage {
            font-size: 36px;
          }
        }

        /* ===== LOADING STATE ===== */
        .skeleton {
          background: linear-gradient(90deg, var(--glass-bg) 25%, rgba(255, 255, 255, 0.1) 50%, var(--glass-bg) 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s ease-in-out infinite;
          border-radius: 4px;
        }

        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      </style>
    </head>
    <body>
      <div id="app">
        <div class="coverage-hero">
          <div class="coverage-ring">
            <svg width="160" height="160">
              <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255, 255, 255, 0.1)" stroke-width="12"/>
              <circle id="progress-circle" cx="80" cy="80" r="70" fill="none" stroke="url(#gradient)" stroke-width="12" 
                stroke-linecap="round" transform="rotate(-90 80 80)"
                stroke-dasharray="440" stroke-dashoffset="440"/>
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:var(--success);stop-opacity:1" />
                  <stop offset="100%" style="stop-color:var(--accent);stop-opacity:1" />
                </linearGradient>
              </defs>
            </svg>
            <div class="coverage-percentage" id="coverage-percent">0%</div>
          </div>
          <h2>Test Coverage</h2>
          <p style="color: var(--text-secondary); margin-top: 8px;">Loading analysis...</p>
        </div>

        <div class="card">
          <div class="section-header">
            <span class="section-icon">📊</span>
            <span>Coverage by Type</span>
          </div>
          <div id="coverage-types">
            <!-- Dynamic content -->
          </div>
        </div>

        <div class="card">
          <div class="section-header">
            <span class="section-icon">🛠️</span>
            <span>Testing Frameworks</span>
          </div>
          <div class="framework-list" id="frameworks">
            <!-- Dynamic content -->
          </div>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <button class="btn" onclick="analyzeWorkspace()">
            🔄 Refresh Analysis
          </button>
        </div>
      </div>

      <script>
        const vscode = acquireVsCodeApi();

        function analyzeWorkspace() {
          vscode.postMessage({ type: 'analyzeWorkspace' });
        }

        function generateTest(filePath) {
          vscode.postMessage({ type: 'generateTest', filePath });
        }

        function installFramework(framework) {
          vscode.postMessage({ type: 'installFramework', framework });
        }

        // Animate progress ring
        function animateProgressRing(percent) {
          const circle = document.getElementById('progress-circle');
          const percentText = document.getElementById('coverage-percent');
          const circumference = 2 * Math.PI * 70;
          const offset = circumference - (percent / 100 * circumference);
          
          setTimeout(() => {
            circle.style.transition = 'stroke-dashoffset 2s cubic-bezier(0.4, 0, 0.2, 1)';
            circle.style.strokeDashoffset = offset;
          }, 100);

          // Animate percentage number
          let current = 0;
          const increment = percent / 50;
          const timer = setInterval(() => {
            current += increment;
            if (current >= percent) {
              current = percent;
              clearInterval(timer);
            }
            percentText.textContent = Math.round(current) + '%';
          }, 40);
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
          const message = event.data;
          if (message.type === 'updateData') {
            updateUI(message.data);
          }
        });

        function updateUI(data) {
          const hasFrameworks = data.testingSetup && data.testingSetup.installed && data.testingSetup.installed.length > 0;
          
          if (!hasFrameworks) {
            // Show setup UI when no frameworks installed
            showSetupUI(data);
            return;
          }
          
          // Show normal coverage UI
          showCoverageUI(data);
        }
        
        function showSetupUI(data) {
          const app = document.getElementById('app');
          const recommendations = data.testingSetup?.recommended || [];
          const projectType = data.project?.primaryType || 'project';
          const language = data.project?.technologies?.[0]?.language || 'Unknown';
          
          app.innerHTML = \`
            <div class="coverage-hero" style="background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, var(--glass-bg) 100%);">
              <div style="font-size: 64px; margin-bottom: 16px;">🚀</div>
              <h2>Set Up Testing</h2>
              <p style="color: var(--text-secondary); margin-top: 8px;">No test framework detected for your \${language} \${projectType}</p>
            </div>
            
            <div class="card">
              <div class="section-header">
                <span class="section-icon">💡</span>
                <span>Recommended Frameworks</span>
              </div>
              <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 13px;">
                Click a framework to install and configure it automatically
              </p>
              <div id="recommendations">
                \${recommendations.slice(0, 5).map(rec => \`
                  <div class="file-item" style="cursor: pointer;" onclick="installFramework('\${rec.framework.name}')">
                    <div class="file-info">
                      <span style="font-size: 24px;">\${getFrameworkIcon(rec.framework.name)}</span>
                      <div>
                        <div style="font-weight: 600;">\${rec.framework.name}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">\${rec.reason}</div>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">\${rec.testType} testing</div>
                      </div>
                    </div>
                    <button class="btn" style="padding: 8px 16px; font-size: 12px;">Install</button>
                  </div>
                \`).join('')}
              </div>
            </div>
            
            <div class="card" style="text-align: center;">
              <p style="color: var(--text-secondary); margin-bottom: 12px;">Already have testing set up?</p>
              <button class="btn" onclick="analyzeWorkspace()" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
                🔄 Re-analyze Project
              </button>
            </div>
          \`;
        }
        
        function getFrameworkIcon(name) {
          const icons = {
            'Jest': '🃏',
            'Vitest': '⚡',
            'Playwright': '🎭',
            'Cypress': '🌲',
            'React Testing Library': '⚛️',
            'Mocha': '☕',
            'pytest': '🐍',
            'xUnit': '🔬',
            'NUnit': '🧪',
            'MSTest': '🔷'
          };
          return icons[name] || '📦';
        }
        
        function showCoverageUI(data) {
          // Update coverage percentage
          const percent = Math.round((data.summary.testedFiles / data.summary.totalFiles) * 100);
          animateProgressRing(percent);

          // Update coverage types
          const typesHTML = ['unit', 'integration', 'e2e', 'component']
            .map(type => {
              const coverage = data.coverageByType?.[type];
              if (!coverage) return '';
              const percent = Math.round((coverage.filesTested / coverage.filesTotal) * 100);
              return \`
                <div style="margin: 12px 0;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>\${type.toUpperCase()}</span>
                    <span>\${percent}%</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: \${percent}%"></div>
                  </div>
                </div>
              \`;
            })
            .join('');
          
          const typesEl = document.getElementById('coverage-types');
          if (typesEl) typesEl.innerHTML = typesHTML;

          // Update frameworks
          const frameworksHTML = (data.testingSetup?.installed || [])
            .map(fw => \`<span class="framework-badge installed">✅ \${fw.name}</span>\`)
            .join('') +
            (data.testingSetup?.recommended || []).slice(0, 3)
              .map(rec => \`<span class="framework-badge recommended" onclick="installFramework('\${rec.framework.name}')">💡 \${rec.framework.name}</span>\`)
              .join('');
          
          const frameworksEl = document.getElementById('frameworks');
          if (frameworksEl) frameworksEl.innerHTML = frameworksHTML;
        }
      </script>
    </body>
    </html>`;
  }
}

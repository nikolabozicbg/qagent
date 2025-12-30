import * as vscode from 'vscode';
import * as path from 'path';
import { SmartTestGeneratorService } from '../services/smart-test-generator.service';

/**
 * Detected testable element from source file analysis
 */
export interface DetectedElement {
  id: string;
  name: string;           // e.g. "<Header />", "handleSubmit()"
  type: 'component' | 'function' | 'hook' | 'element' | 'effect';
  description: string;    // e.g. "Test navigation links, logo"
  selected: boolean;      // Whether to include in generated tests
  testCode?: string;      // Generated test for this element
}

/**
 * Additional test options
 */
export interface AdditionalTestOption {
  id: string;
  label: string;
  description: string;
  selected: boolean;
}

/**
 * Source file analysis result
 */
export interface SourceAnalysis {
  sourceCode: string;           // Snippet of source code
  detectedElements: DetectedElement[];
  additionalOptions: AdditionalTestOption[];
}

/**
 * Test preview data
 */
export interface TestPreviewData {
  testCode: string;
  testFilePath: string;
  sourceFilePath: string;
  framework: string;
  testType: string;
  coverage?: {
    estimated: number;
    testCases: number;
  };
  // NEW: Smart analysis data
  analysis?: SourceAnalysis;
  // NEW: Flow-based test data
  flowData?: FlowTestData;
}

/**
 * Flow test data (for E2E flows)
 */
export interface FlowTestData {
  flowId: string;
  flowName: string;
  flowType: 'auth' | 'checkout' | 'crud' | 'search' | 'navigation' | 'form' | 'custom';
  icon: string;
  routes: string[];
  steps: FlowStepData[];
  relatedFiles: FlowFileData[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  coverage: {
    testedFiles: number;
    totalFiles: number;
  };
}

export interface FlowStepData {
  id: string;
  title: string;
  route: string;
  action: 'navigate' | 'click' | 'fill' | 'submit' | 'wait';
  description: string;
  selected: boolean;
}

export interface FlowFileData {
  path: string;
  name: string;
  type: 'component' | 'hook' | 'service' | 'route' | 'util';
  tested: boolean;
  selected: boolean;
}

/**
 * Preview action types
 */
export enum PreviewAction {
  CREATE = 'create',
  EDIT = 'edit',
  CANCEL = 'cancel'
}

/**
 * Webview provider for test preview modal
 */
export class TestPreviewWebviewProvider {
  private panel: vscode.WebviewPanel | null = null;
  private extensionUri: vscode.Uri;
  private resolveAction: ((action: PreviewAction, code?: string) => void) | null = null;
  private smartGenerator = new SmartTestGeneratorService();
  private currentData: TestPreviewData | null = null;
  
  constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri;
  }
  
  /**
   * Show preview modal and wait for user action
   */
  async showPreview(data: TestPreviewData): Promise<{ action: PreviewAction; code?: string }> {
    console.log('[TestPreview] showPreview called, existing panel:', !!this.panel);
    return new Promise((resolve) => {
      console.log('[TestPreview] Setting resolveAction');
      this.resolveAction = (action: PreviewAction, code?: string) => {
        console.log('[TestPreview] resolveAction executed:', action);
        resolve({ action, code });
      };
      
      this.createPanel(data);
      console.log('[TestPreview] After createPanel, resolveAction:', !!this.resolveAction);
    });
  }
  
  /**
   * Create webview panel
   */
  private createPanel(data: TestPreviewData) {
    // Dispose existing panel without triggering its cancel callback
    // The old panel's onDidDispose will fire but resolveAction will already be the new one
    if (this.panel) {
      const oldPanel = this.panel;
      this.panel = null; // Clear reference so old onDidDispose doesn't match
      oldPanel.dispose();
    }
    
    // Store current data for regeneration
    this.currentData = data;
    
    // Generate smart tests based on analysis
    if (data.analysis) {
      const selectedElements = data.analysis.detectedElements.filter(e => e.selected);
      const selectedOptions = data.analysis.additionalOptions.filter(o => o.selected);
      
      console.log('[TestPreview] Generating tests for:', data.sourceFilePath);
      console.log('[TestPreview] Framework:', data.framework);
      console.log('[TestPreview] Selected elements:', selectedElements.length);
      
      data.testCode = this.smartGenerator.generateTestCode(
        data.sourceFilePath,
        data.framework,
        data.testType,
        selectedElements,
        selectedOptions
      );
      
      console.log('[TestPreview] Generated testCode length:', data.testCode?.length);
      console.log('[TestPreview] Generated testCode preview:', data.testCode?.substring(0, 200));
    }
    
    // Create panel
    const newPanel = vscode.window.createWebviewPanel(
      'qagenaiTestPreview',
      'Test Preview',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [this.extensionUri]
      }
    );
    this.panel = newPanel;
    
    // Set HTML content
    this.panel.webview.html = this.getHtmlContent(data);
    
    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage((message) => {
      this.handleMessage(message);
    });
    
    // Handle panel disposal - capture panel reference to check if it's still current
    newPanel.onDidDispose(() => {
      console.log('[TestPreview] onDidDispose fired, isCurrentPanel:', this.panel === newPanel, ', resolveAction:', !!this.resolveAction);
      // Only handle if this is still the current panel (not replaced by a newer one)
      if (this.panel === newPanel) {
        this.panel = null;
        // If user closes panel without action, treat as cancel
        if (this.resolveAction) {
          console.log('[TestPreview] Calling resolveAction(CANCEL) from onDidDispose');
          this.resolveAction(PreviewAction.CANCEL);
          this.resolveAction = null;
        }
      } else {
        console.log('[TestPreview] Ignoring onDidDispose from old panel');
      }
    });
  }
  
  /**
   * Handle messages from webview
   */
  private handleMessage(message: any) {
    console.log('[WebView] Received message:', message.command, message);
    
    switch (message.command) {
      case 'selectionChanged':
        // Regenerate tests based on new selection
        this.handleSelectionChange(message.selectedElements, message.selectedOptions);
        return; // Don't close panel
        
      case 'create':
        console.log('[WebView] CREATE action - resolveAction exists:', !!this.resolveAction);
        console.log('[WebView] Code length:', message.code?.length);
        if (this.resolveAction) {
          console.log('[WebView] Calling resolveAction with CREATE');
          const resolve = this.resolveAction;
          this.resolveAction = null; // Clear BEFORE dispose to prevent onDidDispose from using it
          resolve(PreviewAction.CREATE, message.code);
          this.panel?.dispose();
        } else {
          console.error('[WebView] ERROR: resolveAction is null!');
        }
        break;
        
      case 'edit':
        if (this.resolveAction) {
          const resolve = this.resolveAction;
          this.resolveAction = null;
          resolve(PreviewAction.EDIT, message.code);
          this.panel?.dispose();
        }
        break;
        
      case 'cancel':
        if (this.resolveAction) {
          const resolve = this.resolveAction;
          this.resolveAction = null;
          resolve(PreviewAction.CANCEL);
          this.panel?.dispose();
        }
        break;
    }
  }
  
  /**
   * Handle selection change and regenerate tests
   */
  private handleSelectionChange(selectedElementIds: string[], selectedOptionIds: string[]) {
    if (!this.currentData?.analysis || !this.panel) return;
    
    // Update selection state in analysis
    const selectedElements = this.currentData.analysis.detectedElements.filter(
      el => selectedElementIds.includes(el.id)
    );
    const selectedOptions = this.currentData.analysis.additionalOptions.filter(
      opt => selectedOptionIds.includes(opt.id)
    );
    
    // Regenerate test code
    const newTestCode = this.smartGenerator.generateTestCode(
      this.currentData.sourceFilePath,
      this.currentData.framework,
      this.currentData.testType,
      selectedElements,
      selectedOptions
    );
    
    // Update the webview with new test code
    this.panel.webview.postMessage({
      command: 'updateTestCode',
      testCode: newTestCode,
      testCount: selectedElements.length + selectedOptions.length
    });
  }
  
  /**
   * Generate HTML content for preview
   */
  private getHtmlContent(data: TestPreviewData): string {
    // Check if this is a flow-based test
    if (data.flowData) {
      return this.getFlowHtmlContent(data);
    }
    
    const fileName = path.basename(data.testFilePath);
    const sourceFileName = path.basename(data.sourceFilePath);
    const testCount = data.analysis?.detectedElements.filter(e => e.selected).length || data.coverage?.testCases || 1;
    const coverageText = `${testCount} tests • ${data.testType}`;
    
    // Build detected elements HTML with modern styling
    const elementsHtml = data.analysis?.detectedElements.map(el => `
      <label class="element-item ${el.selected ? 'selected' : ''}">
        <input type="checkbox" 
               data-element-id="${el.id}" 
               ${el.selected ? 'checked' : ''}
               onchange="toggleElement('${el.id}')">
        <div class="element-icon ${el.type}">${this.getElementIcon(el.type)}</div>
        <div class="element-info">
          <span class="element-name">${this.escapeHtml(el.name)}</span>
          <span class="element-desc">${this.escapeHtml(el.description)}</span>
        </div>
      </label>
    `).join('') || '';
    
    // Build additional options HTML with modern styling
    const additionalHtml = data.analysis?.additionalOptions.map(opt => `
      <label class="option-item ${opt.selected ? 'selected' : ''}">
        <input type="checkbox" 
               data-option-id="${opt.id}" 
               ${opt.selected ? 'checked' : ''}
               onchange="toggleOption('${opt.id}')">
        <div class="option-info">
          <span class="option-label">${this.escapeHtml(opt.label)}</span>
          <span class="option-desc">${this.escapeHtml(opt.description)}</span>
        </div>
      </label>
    `).join('') || '';
    
    // Source code preview (truncated) - NOT escaped here, will be escaped in highlightCode
    const sourcePreview = data.analysis?.sourceCode 
      ? data.analysis.sourceCode.substring(0, 800) + (data.analysis.sourceCode.length > 800 ? '\n// ...' : '')
      : '';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    :root {
      --accent-purple: #a855f7;
      --accent-green: #22c55e;
      --accent-blue: #3b82f6;
      --accent-orange: #f97316;
      --accent-pink: #ec4899;
    }
    
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: linear-gradient(180deg, var(--vscode-editor-background) 0%, rgba(0,0,0,0.02) 100%);
      padding: 24px;
      line-height: 1.6;
    }
    
    .container { max-width: 1200px; margin: 0 auto; }
    
    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--accent-purple), var(--accent-pink));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    .header h1 { 
      font-size: 20px; 
      font-weight: 600;
      background: linear-gradient(90deg, #fff, rgba(255,255,255,0.8));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .badge {
      padding: 8px 16px;
      background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue));
      color: white;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(168, 85, 247, 0.3);
    }
    
    /* Info Section */
    .info-section {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      padding: 16px 20px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      backdrop-filter: blur(10px);
    }
    .info-item { 
      flex: 1;
      padding: 8px 16px;
      background: rgba(255,255,255,0.02);
      border-radius: 8px;
    }
    .info-label {
      font-size: 10px;
      text-transform: uppercase;
      color: var(--accent-purple);
      margin-bottom: 4px;
      letter-spacing: 1px;
      font-weight: 600;
    }
    .info-value { font-size: 14px; font-weight: 500; color: #fff; }
    
    /* Two Column Layout */
    .two-column {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }
    
    /* Section Title */
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: rgba(255,255,255,0.5);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title .icon {
      font-size: 14px;
    }
    
    /* Code Container */
    .code-container {
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    }
    .code-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: rgba(255,255,255,0.05);
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .file-name { 
      font-size: 13px; 
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .file-icon {
      color: var(--accent-blue);
    }
    .framework-badge {
      font-size: 11px;
      padding: 4px 10px;
      background: linear-gradient(135deg, var(--accent-purple), var(--accent-pink));
      color: white;
      border-radius: 12px;
      font-weight: 500;
    }
    .code-content {
      padding: 16px;
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', var(--vscode-editor-font-family);
      font-size: 13px;
      line-height: 1.6;
      max-height: 300px;
      overflow: auto;
    }
    .code-content pre { margin: 0; white-space: pre-wrap; }
    
    /* Syntax Highlighting */
    .code-content .keyword { color: #c678dd; }
    .code-content .string { color: #98c379; }
    .code-content .function { color: #61afef; }
    .code-content .comment { color: #5c6370; font-style: italic; }
    .code-content .number { color: #d19a66; }
    .code-content .operator { color: #56b6c2; }
    .code-content .tag { color: #e06c75; }
    .code-content .attr { color: #d19a66; }
    
    /* Detected Elements */
    .elements-section {
      margin-bottom: 24px;
    }
    .elements-list {
      background: rgba(0,0,0,0.2);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      overflow: hidden;
      max-height: 320px;
      overflow-y: auto;
    }
    .element-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .element-item:last-child { border-bottom: none; }
    .element-item:hover { background: rgba(255,255,255,0.05); }
    .element-item.selected { 
      background: rgba(168, 85, 247, 0.15);
      border-left: 3px solid var(--accent-purple);
    }
    .element-item input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: var(--accent-purple);
      cursor: pointer;
    }
    .element-icon { 
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    .element-icon.component { background: rgba(168, 85, 247, 0.2); }
    .element-icon.function { background: rgba(59, 130, 246, 0.2); }
    .element-icon.hook { background: rgba(236, 72, 153, 0.2); }
    .element-info { flex: 1; }
    .element-name {
      display: block;
      font-size: 14px;
      font-weight: 600;
      font-family: 'SF Mono', var(--vscode-editor-font-family);
      color: #fff;
    }
    .element-desc {
      display: block;
      font-size: 12px;
      color: rgba(255,255,255,0.5);
      margin-top: 2px;
    }
    
    /* Additional Options */
    .options-section {
      margin-bottom: 24px;
    }
    .options-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .option-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: rgba(0,0,0,0.2);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .option-item:hover { 
      border-color: rgba(168, 85, 247, 0.5);
      background: rgba(168, 85, 247, 0.1);
    }
    .option-item.selected {
      border-color: var(--accent-purple);
      background: rgba(168, 85, 247, 0.15);
    }
    .option-item input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: var(--accent-purple);
    }
    .option-info { flex: 1; }
    .option-label { font-size: 13px; font-weight: 600; display: block; color: #fff; }
    .option-desc { font-size: 11px; color: rgba(255,255,255,0.5); display: block; margin-top: 2px; }
    
    /* Actions */
    .actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    button {
      padding: 12px 24px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    button:hover { transform: translateY(-1px); }
    .btn-primary { 
      background: linear-gradient(135deg, var(--accent-purple), var(--accent-pink));
      color: white;
      box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4);
    }
    .btn-primary:hover {
      box-shadow: 0 6px 20px rgba(168, 85, 247, 0.5);
    }
    .btn-secondary { 
      background: rgba(255,255,255,0.1);
      color: white;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .btn-secondary:hover {
      background: rgba(255,255,255,0.15);
    }
    .btn-cancel { 
      background: transparent;
      color: rgba(255,255,255,0.7);
    }
    .btn-cancel:hover {
      color: white;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-left">
        <div class="header-icon">✨</div>
        <h1>Test Preview</h1>
      </div>
      <div class="badge">${testCount} tests • ${this.escapeHtml(data.testType)}</div>
    </div>
    
    <div class="info-section">
      <div class="info-item">
        <div class="info-label">Framework</div>
        <div class="info-value">${this.escapeHtml(data.framework)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Test Type</div>
        <div class="info-value">${this.escapeHtml(data.testType)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Source File</div>
        <div class="info-value">${this.escapeHtml(sourceFileName)}</div>
      </div>
    </div>
    
    ${data.analysis ? `
    <!-- Two Column: Source + Detected Elements -->
    <div class="two-column">
      <div>
        <div class="section-title"><span class="icon">📄</span> Source Code</div>
        <div class="code-container">
          <div class="code-toolbar">
            <span class="file-name"><span class="file-icon">📎</span> ${this.escapeHtml(sourceFileName)}</span>
          </div>
      <div class="code-content">
            <pre id="sourceCodeContent"></pre>
          </div>
        </div>
      </div>
      
      <div>
        <div class="section-title"><span class="icon">🎯</span> Detected Elements</div>
        <div class="elements-list">
          ${elementsHtml || '<div style="padding: 20px; color: rgba(255,255,255,0.5); text-align: center;">No elements detected</div>'}
        </div>
      </div>
    </div>
    
    <!-- Additional Test Options -->
    ${data.analysis.additionalOptions.length > 0 ? `
    <div class="options-section">
      <div class="section-title"><span class="icon">➕</span> Additional Tests</div>
      <div class="options-grid">
        ${additionalHtml}
      </div>
    </div>
    ` : ''}
    ` : ''}
    
    <!-- Generated Tests -->
    <div class="section-title"><span class="icon">📝</span> Generated Tests</div>
    <div class="code-container">
      <div class="code-toolbar">
        <span class="file-name"><span class="file-icon">📄</span> ${this.escapeHtml(fileName)}</span>
        <span class="framework-badge">${this.escapeHtml(data.framework)}</span>
      </div>
      <div class="code-content" style="max-height: 400px;">
        <pre id="codeContent"></pre>
      </div>
    </div>
    
    <div class="actions">
      <button class="btn-cancel" onclick="sendMessage('cancel')">
        Cancel
      </button>
      <button class="btn-secondary" onclick="sendMessage('edit')">
        ✏️ Edit in Editor
      </button>
      <button class="btn-primary" onclick="sendMessage('create')">
        ✓ Create ${testCount} Test${testCount > 1 ? 's' : ''}
      </button>
    </div>
  </div>
  
  <script>
    const vscode = acquireVsCodeApi();
    let selectedElements = ${JSON.stringify(data.analysis?.detectedElements.filter(e => e.selected).map(e => e.id) || [])};
    let selectedOptions = ${JSON.stringify(data.analysis?.additionalOptions.filter(o => o.selected).map(o => o.id) || [])};
    
    // Store raw code (without HTML escaping) for submission
    let rawTestCode = ${JSON.stringify(data.testCode)};
    const rawSourceCode = ${JSON.stringify(sourcePreview)};
    
    function toggleElement(id) {
      const idx = selectedElements.indexOf(id);
      if (idx > -1) {
        selectedElements.splice(idx, 1);
      } else {
        selectedElements.push(id);
      }
      updateUI();
    }
    
    function toggleOption(id) {
      const idx = selectedOptions.indexOf(id);
      if (idx > -1) {
        selectedOptions.splice(idx, 1);
      } else {
        selectedOptions.push(id);
      }
      updateUI();
    }
    
    function updateUI() {
      // Update visual selection state
      document.querySelectorAll('.element-item').forEach(el => {
        const checkbox = el.querySelector('input');
        el.classList.toggle('selected', checkbox.checked);
      });
      document.querySelectorAll('.option-item').forEach(el => {
        const checkbox = el.querySelector('input');
        el.classList.toggle('selected', checkbox.checked);
      });
      
      // Request regeneration with new selection
      vscode.postMessage({ 
        command: 'selectionChanged', 
        selectedElements, 
        selectedOptions 
      });
    }
    
    function sendMessage(command) {
      console.log('[Webview Script] sendMessage called:', command);
      // Use raw test code instead of reading from DOM (which has HTML entities)
      console.log('[Webview Script] Code length:', rawTestCode?.length);
      vscode.postMessage({ command, code: rawTestCode, selectedElements, selectedOptions });
      console.log('[Webview Script] Message posted');
    }
    
    // Listen for messages from extension (test regeneration)
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'updateTestCode') {
        // Update raw code store
        rawTestCode = message.testCode;
        // Update the code preview
        const codeEl = document.getElementById('codeContent');
        if (codeEl) {
          codeEl.textContent = message.testCode;
        }
        // Update button text with new count
        const createBtn = document.querySelector('.btn-primary');
        if (createBtn && message.testCount !== undefined) {
          createBtn.textContent = '✅ Create ' + message.testCount + ' Test' + (message.testCount > 1 ? 's' : '');
        }
        // Update badge
        const badge = document.querySelector('.badge');
        if (badge && message.testCount !== undefined) {
          badge.textContent = message.testCount + ' tests • E2e';
        }
      }
    });
    
    // Simple escape function for display
    function escapeForDisplay(code) {
      if (!code) return '';
      return code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
    
    // Apply code on page load (use textContent for safe display)
    var srcEl = document.getElementById('sourceCodeContent');
    var codeEl = document.getElementById('codeContent');
    if (srcEl && rawSourceCode) srcEl.textContent = rawSourceCode;
    if (codeEl && rawTestCode) codeEl.textContent = rawTestCode;
  </script>
</body>
</html>`;
  }
  
  /**
   * Generate flow-specific HTML content
   */
  private getFlowHtmlContent(data: TestPreviewData): string {
    const flow = data.flowData!;
    const fileName = path.basename(data.testFilePath);
    const selectedSteps = flow.steps.filter(s => s.selected);
    const selectedFiles = flow.relatedFiles.filter(f => f.selected);
    const filesCoverage = Math.round((flow.coverage.testedFiles / flow.coverage.totalFiles) * 100);
    
    // Build flow steps HTML
    const stepsHtml = flow.steps.map((step, index) => `
      <label class="flow-step-item ${step.selected ? 'selected' : ''}">
        <input type="checkbox" 
               data-step-id="${step.id}" 
               ${step.selected ? 'checked' : ''}
               onchange="toggleStep('${step.id}')">
        <div class="step-number">${index + 1}</div>
        <div class="step-info">
          <span class="step-title">${this.escapeHtml(step.title)}</span>
          <span class="step-action">${step.action} • ${this.escapeHtml(step.route)}</span>
        </div>
      </label>
    `).join('');
    
    // Build related files HTML
    const filesHtml = flow.relatedFiles.map(file => `
      <label class="file-item ${file.selected ? 'selected' : ''} ${file.tested ? 'tested' : 'untested'}">
        <input type="checkbox" 
               data-file-path="${this.escapeHtml(file.path)}" 
               ${file.selected ? 'checked' : ''}
               onchange="toggleFile('${this.escapeHtml(file.path)}')">
        <span class="file-status">${file.tested ? '✓' : '○'}</span>
        <span class="file-name">${this.escapeHtml(file.name)}</span>
        <span class="file-type-badge">${file.type}</span>
      </label>
    `).join('');
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Flow Test Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --accent-purple: #a855f7;
      --accent-green: #22c55e;
      --accent-yellow: #f59e0b;
      --accent-red: #ef4444;
    }
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 24px;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    
    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .flow-icon { font-size: 32px; }
    .header h1 { font-size: 20px; font-weight: 600; }
    .priority-badge {
      padding: 6px 12px;
      background: var(--accent-${flow.priority === 'critical' ? 'red' : flow.priority === 'high' ? 'yellow' : 'purple'});
      color: white;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    
    /* Info Section */
    .info-section {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      padding: 16px;
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
    }
    .info-item { flex: 1; }
    .info-label {
      font-size: 10px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.5);
      margin-bottom: 4px;
      font-weight: 600;
    }
    .info-value { font-size: 14px; font-weight: 500; }
    
    /* Grid Layout */
    .two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: rgba(255,255,255,0.5);
      margin-bottom: 12px;
    }
    
    /* Flow Steps */
    .flow-steps { display: flex; flex-direction: column; gap: 6px; }
    .flow-step-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .flow-step-item:hover { background: rgba(255,255,255,0.04); border-color: var(--accent-purple); }
    .flow-step-item.selected { border-color: var(--accent-purple); background: rgba(168,85,247,0.1); }
    .step-number {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--accent-purple);
      color: white;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .step-info { flex: 1; }
    .step-title { display: block; font-weight: 500; font-size: 13px; }
    .step-action { display: block; font-size: 11px; color: rgba(255,255,255,0.5); }
    
    /* Related Files */
    .files-list { display: flex; flex-direction: column; gap: 4px; }
    .file-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .file-item:hover { border-color: var(--accent-purple); }
    .file-item.selected { border-color: var(--accent-purple); background: rgba(168,85,247,0.05); }
    .file-item.untested { border-left: 3px solid var(--accent-yellow); }
    .file-item.tested { opacity: 0.6; }
    .file-status {
      width: 20px;
      text-align: center;
      font-size: 12px;
    }
    .file-name { flex: 1; font-size: 12px; }
    .file-type-badge {
      font-size: 9px;
      font-weight: 600;
      padding: 2px 6px;
      background: rgba(168,85,247,0.15);
      color: var(--accent-purple);
      border-radius: 4px;
      text-transform: uppercase;
    }
    
    /* Code Preview */
    .code-container {
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 24px;
    }
    .code-toolbar {
      padding: 12px 16px;
      background: rgba(0,0,0,0.2);
      border-bottom: 1px solid rgba(255,255,255,0.05);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .file-name { font-size: 12px; font-weight: 500; }
    .code-content {
      padding: 16px;
      overflow-x: auto;
    }
    .code-content pre {
      font-family: 'SF Mono', 'Consolas', monospace;
      font-size: 12px;
      line-height: 1.6;
      margin: 0;
    }
    
    /* Actions */
    .actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    button {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-cancel {
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.7);
    }
    .btn-cancel:hover { background: rgba(255,255,255,0.1); }
    .btn-primary {
      background: linear-gradient(135deg, var(--accent-purple), #9333ea);
      color: white;
      box-shadow: 0 4px 12px rgba(168,85,247,0.3);
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(168,85,247,0.4); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-left">
        <span class="flow-icon">${flow.icon}</span>
        <div>
          <h1>${this.escapeHtml(flow.flowName)}</h1>
          <p style="font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 4px;">${flow.routes.length} routes • ${flow.steps.length} steps</p>
        </div>
      </div>
      <span class="priority-badge">${flow.priority}</span>
    </div>
    
    <div class="info-section">
      <div class="info-item">
        <div class="info-label">Test Type</div>
        <div class="info-value">E2E Flow</div>
      </div>
      <div class="info-item">
        <div class="info-label">Framework</div>
        <div class="info-value">${this.escapeHtml(data.framework)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">File Coverage</div>
        <div class="info-value" style="color: ${filesCoverage > 50 ? 'var(--accent-green)' : 'var(--accent-yellow)'}">${flow.coverage.testedFiles}/${flow.coverage.totalFiles} (${filesCoverage}%)</div>
      </div>
    </div>
    
    <div class="two-column">
      <div>
        <div class="section-title">📋 FLOW STEPS (${flow.steps.length})</div>
        <div class="flow-steps">
          ${stepsHtml}
        </div>
      </div>
      <div>
        <div class="section-title">📁 RELATED FILES (${flow.relatedFiles.length})</div>
        <div class="files-list">
          ${filesHtml}
        </div>
      </div>
    </div>
    
    <div class="section-title">📝 GENERATED TEST</div>
    <div class="code-container">
      <div class="code-toolbar">
        <span class="file-name">📄 ${this.escapeHtml(fileName)}</span>
      </div>
      <div class="code-content">
        <pre id="codeContent"></pre>
      </div>
    </div>
    
    <div class="actions">
      <button class="btn-cancel" onclick="sendMessage('cancel')">Cancel</button>
      <button class="btn-primary" onclick="sendMessage('create')">✓ Create Test File</button>
    </div>
  </div>
  
  <script>
    const vscode = acquireVsCodeApi();
    let rawTestCode = ${JSON.stringify(data.testCode)};
    let selectedSteps = ${JSON.stringify(selectedSteps.map(s => s.id))};
    let selectedFiles = ${JSON.stringify(selectedFiles.map(f => f.path))};
    
    function toggleStep(id) {
      const idx = selectedSteps.indexOf(id);
      if (idx > -1) selectedSteps.splice(idx, 1);
      else selectedSteps.push(id);
      updateUI();
    }
    
    function toggleFile(path) {
      const idx = selectedFiles.indexOf(path);
      if (idx > -1) selectedFiles.splice(idx, 1);
      else selectedFiles.push(path);
      updateUI();
    }
    
    function updateUI() {
      document.querySelectorAll('.flow-step-item').forEach(el => {
        el.classList.toggle('selected', el.querySelector('input').checked);
      });
      document.querySelectorAll('.file-item').forEach(el => {
        el.classList.toggle('selected', el.querySelector('input').checked);
      });
    }
    
    function sendMessage(command) {
      vscode.postMessage({ command, code: rawTestCode });
    }
    
    // Display code
    document.getElementById('codeContent').textContent = rawTestCode;
  </script>
</body>
</html>`;
  }
  
  /**
   * Get icon for element type
   */
  private getElementIcon(type: string): string {
    switch (type) {
      case 'component': return '🧩';
      case 'function': return '⚡';
      case 'hook': return '🪝';
      case 'element': return '📦';
      case 'effect': return '🔄';
      default: return '📄';
    }
  }
  
  /**
   * Basic syntax highlighting for code
   */
  private highlightCode(code: string): string {
    // First escape HTML
    let highlighted = this.escapeHtml(code);
    
    // Keywords
    const keywords = ['import', 'export', 'from', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'async', 'await', 'describe', 'it', 'test', 'expect', 'beforeEach', 'afterEach', 'class', 'extends', 'new', 'this', 'true', 'false', 'null', 'undefined'];
    keywords.forEach(kw => {
      const regex = new RegExp(`\\b(${kw})\\b`, 'g');
      highlighted = highlighted.replace(regex, '<span class="keyword">$1</span>');
    });
    
    // Strings (single and double quotes)
    highlighted = highlighted.replace(/(&apos;[^&]*&apos;|&#039;[^&]*&#039;)/g, '<span class="string">$1</span>');
    highlighted = highlighted.replace(/(&quot;[^&]*&quot;)/g, '<span class="string">$1</span>');
    highlighted = highlighted.replace(/(`[^`]*`)/g, '<span class="string">$1</span>');
    
    // Comments
    highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>');
    highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
    
    // Functions (word followed by parenthesis)
    highlighted = highlighted.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, '<span class="function">$1</span>(');
    
    // Numbers
    highlighted = highlighted.replace(/\b(\d+)\b/g, '<span class="number">$1</span>');
    
    return highlighted;
  }
  
  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

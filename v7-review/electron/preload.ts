import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // File system
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  selectFolder: () => ipcRenderer.invoke('open-file-dialog'), // Alias for clarity
  saveTestFile: (filePath: string, contents: string) => 
    ipcRenderer.invoke('fs:saveTestFile', filePath, contents),
  readFile: (filePath: string) => 
    ipcRenderer.invoke('fs:readFile', filePath),
  openInEditor: (filePath: string) => 
    ipcRenderer.invoke('fs:openInEditor', filePath),
  
  // Playwright setup
  checkPlaywright: (projectPath: string) =>
    ipcRenderer.invoke('playwright:check', projectPath),
  installPlaywright: (projectPath: string) =>
    ipcRenderer.invoke('playwright:install', projectPath),
  readPlaywrightConfig: (projectPath: string) =>
    ipcRenderer.invoke('playwright:read-config', projectPath),
  createPlaywrightConfig: (projectPath: string, config: { baseURL: string; testDir?: string }) =>
    ipcRenderer.invoke('playwright:create-config', projectPath, config),
  
  // Test execution
  runPlaywrightTests: (options: { projectPath: string; testFiles?: string[] }) =>
    ipcRenderer.invoke('test:run-playwright', options),
  
  // Test execution events (one-way from main to renderer)
  onTestConsole: (callback: (data: { timestamp: string; level: string; message: string }) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('test:console', subscription);
    return () => ipcRenderer.removeListener('test:console', subscription);
  },
  
  onTestComplete: (callback: (data: { passed: number; failed: number; skipped: number; total: number; duration: number }) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('test:complete', subscription);
    return () => ipcRenderer.removeListener('test:complete', subscription);
  },
  
  // Playwright installation events
  onPlaywrightInstallProgress: (callback: (data: { message: string }) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('playwright:install:progress', subscription);
    return () => ipcRenderer.removeListener('playwright:install:progress', subscription);
  },
  
  onPlaywrightInstallComplete: (callback: (data: { success: boolean; error?: string }) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('playwright:install:complete', subscription);
    return () => ipcRenderer.removeListener('playwright:install:complete', subscription);
  },
  
  // Project scanning for cloud discovery
  scanProject: (projectPath: string) =>
    ipcRenderer.invoke('project:scan', projectPath),
  
  // V5 Project scanning (enhanced with ranked selectors, constraints, flows)
  scanProjectV5: (projectPath: string) =>
    ipcRenderer.invoke('project:scan-v5', projectPath),

  // V7 Project scanning (Behavior Graph)
  scanProjectV7: (projectPath: string) =>
    ipcRenderer.invoke('project:scan-v7', projectPath),
  
  // Platform info
  platform: process.platform
});

// Type declaration for TypeScript
export interface AnalysisPayload {
  project: {
    name: string;
    framework: { name: string; version: string; router: string | null; stateManagement: string[] };
    stats: { totalFiles: number; totalLines: number };
  };
  components: any[];
  routes: any[];
  forms: any[];
  apis: any[];
  types: any[];
  selectors: any[];
  behaviors: any[];
  relationships: any;
}

// V5 Scanner Payload Types
export interface V5ScannerPayload {
  version: 'v5';
  project: {
    name: string;
    framework: string;
    frameworkVersion: string;
    router: string | null;
  };
  pages: V5PageInfo[];
  elements: V5ElementInfo[];
  forms: V5FormInfo[];
  constraints: V5ConstraintInfo[];
  flows: V5FlowInfo[];
  config: V5ConfigInfo;
  _raw: any;
}

export interface V5PageInfo {
  id: string;
  path: string;
  title: string;
  isProtected: boolean;
  isDynamic: boolean;
  params: string[];
  elementIds: string[];
  formIds: string[];
}

export interface V5ElementInfo {
  id: string;
  type: string;
  role: string;
  selectors: { value: string; strategy: string; confidence: number; source: string }[];
  bestSelector: string;
  label: string | null;
  placeholder: string | null;
  defaultValue: string | null;
  pageId: string;
  formId: string | null;
}

export interface V5FormInfo {
  id: string;
  name: string;
  pageId: string;
  fieldIds: string[];
  submitButtonId: string | null;
  submitEndpoint: string | null;
  successRedirect: string | null;
  constraintIds: string[];
}

export interface V5ConstraintInfo {
  id: string;
  elementId: string;
  type: string;
  rule: string;
  message: string | null;
  validExamples: string[];
  invalidExamples: string[];
  source: string;
}

export interface V5FlowInfo {
  id: string;
  name: string;
  description: string;
  steps: { order: number; pageId: string; action: string; targetElementId: string | null; description: string }[];
  entities: string[];
  importance: number;
  source: string;
}

export interface V5ConfigInfo {
  detectedTestFramework: string | null;
  selectorPriority: string[];
  baseUrl: string | null;
  authEndpoint: string | null;
}

export interface ElectronAPI {
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  getAppVersion: () => Promise<string>;
  openFileDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  selectFolder: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  saveTestFile: (filePath: string, contents: string) => Promise<{ ok: boolean; path?: string; error?: string }>;
  readFile: (filePath: string) => Promise<{ ok: boolean; contents?: string; error?: string }>;
  openInEditor: (filePath: string) => Promise<{ ok: boolean; error?: string }>;
  
  // Project scanning
  scanProject: (projectPath: string) => Promise<{ ok: boolean; payload?: AnalysisPayload; error?: string }>;
  scanProjectV5: (projectPath: string) => Promise<{ ok: boolean; payload?: V5ScannerPayload; error?: string }>;
  scanProjectV7: (projectPath: string) => Promise<{ ok: boolean; payload?: any; error?: string }>;
  
  // Playwright setup
  checkPlaywright: (projectPath: string) => Promise<{ ok: boolean; hasPlaywright: boolean; isInstalled: boolean; version?: string; error?: string }>;
  installPlaywright: (projectPath: string) => Promise<{ ok: boolean; output?: string; error?: string }>;
  readPlaywrightConfig: (projectPath: string) => Promise<{ ok: boolean; configPath?: string; testDir?: string; baseURL?: string; error?: string }>;
  createPlaywrightConfig: (projectPath: string, config: { baseURL: string; testDir?: string }) => Promise<{ ok: boolean; configPath?: string; error?: string }>;
  
  // Test execution
  runPlaywrightTests: (options: { projectPath: string; testFiles?: string[] }) => Promise<{
    success: boolean;
    passed: number;
    failed: number;
    skipped?: number;
    total: number;
    duration: number;
    error?: string;
    stdout?: string;
    stderr?: string;
  }>;
  onTestConsole: (callback: (data: { timestamp: string; level: string; message: string }) => void) => () => void;
  onTestComplete: (callback: (data: { passed: number; failed: number; skipped: number; total: number; duration: number }) => void) => () => void;
  onPlaywrightInstallProgress: (callback: (data: { message: string }) => void) => () => void;
  onPlaywrightInstallComplete: (callback: (data: { success: boolean; error?: string }) => void) => () => void;
  platform: NodeJS.Platform;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

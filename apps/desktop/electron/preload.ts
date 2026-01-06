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
  
  // Platform info
  platform: process.platform
});

// Type declaration for TypeScript
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
  platform: NodeJS.Platform;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

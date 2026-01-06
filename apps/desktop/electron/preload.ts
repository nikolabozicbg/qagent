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
  platform: NodeJS.Platform;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

import { io, Socket } from 'socket.io-client';
import * as vscode from 'vscode';

export interface DiscoveryProgress {
  type: 'init' | 'component' | 'route' | 'api' | 'form' | 'journey' | 'complete';
  data: {
    // Counters
    componentsCount?: number;
    routesCount?: number;
    apisCount?: number;
    formsCount?: number;
    
    // Current item being analyzed
    currentFile?: string;
    currentType?: string;
    
    // Journey preview (high-value finds)
    journey?: {
      name: string;
      confidence: number;
      priority: 'critical' | 'high' | 'standard';
    };
    
    // Progress
    filesAnalyzed?: number;
    totalFiles?: number;
    estimatedTimeRemaining?: number; // seconds
    
    // Final summary (type: complete)
    summary?: {
      totalComponents: number;
      totalRoutes: number;
      totalApis: number;
      totalForms: number;
      totalJourneys: number;
      estimatedCoverage: number;
      analysisTime: number;
    };
  };
}

export type ProgressCallback = (progress: DiscoveryProgress) => void;

/**
 * DiscoveryLiveService - WebSocket client for real-time discovery updates
 * 
 * Connects to backend WebSocket and streams live discovery progress
 * to VSCode UI (webviews, progress notifications)
 */
export class DiscoveryLiveService {
  private socket: Socket | null = null;
  private isConnected = false;
  private progressCallbacks: ProgressCallback[] = [];

  constructor(
    private readonly backendUrl: string = 'http://localhost:3001'
  ) {}

  /**
   * Connect to WebSocket and join discovery session
   */
  async connect(workspacePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Connect to /discovery namespace
      this.socket = io(`${this.backendUrl}/discovery`, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 3,
        timeout: 5000,
      });

      this.socket.on('connect', () => {
        console.log('[DiscoveryLive] Connected to WebSocket');
        this.isConnected = true;
        
        // Join workspace-specific discovery room
        this.socket!.emit('joinDiscovery', { workspacePath });
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('[DiscoveryLive] Connection error:', error);
        this.isConnected = false;
        reject(new Error(`WebSocket connection failed: ${error.message}`));
      });

      this.socket.on('disconnect', () => {
        console.log('[DiscoveryLive] Disconnected from WebSocket');
        this.isConnected = false;
      });

      // Listen for progress events
      this.socket.on('progress', (progress: DiscoveryProgress) => {
        console.log('[DiscoveryLive] Progress update:', progress.type, progress.data);
        this.notifyCallbacks(progress);
      });
    });
  }

  /**
   * Register callback for progress updates
   */
  onProgress(callback: ProgressCallback): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * Remove progress callback
   */
  offProgress(callback: ProgressCallback): void {
    this.progressCallbacks = this.progressCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.progressCallbacks = [];
    }
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Notify all registered callbacks
   */
  private notifyCallbacks(progress: DiscoveryProgress): void {
    for (const callback of this.progressCallbacks) {
      try {
        callback(progress);
      } catch (error) {
        console.error('[DiscoveryLive] Error in progress callback:', error);
      }
    }
  }

  /**
   * Show live discovery progress in VSCode progress notification
   */
  async showLiveProgress(
    workspacePath: string,
    title: string = '🧠 Smart Discovery in Progress'
  ): Promise<DiscoveryProgress | null> {
    return new Promise(async (resolve, reject) => {
      try {
        await this.connect(workspacePath);

        let lastProgress: DiscoveryProgress | null = null;

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title,
            cancellable: false,
          },
          async (progress) => {
            // Setup progress callback
            const callback = (discoveryProgress: DiscoveryProgress) => {
              lastProgress = discoveryProgress;

              // Update VSCode progress notification
              if (discoveryProgress.type === 'init') {
                progress.report({ message: 'Initializing scan...' });
              } else if (discoveryProgress.type === 'component') {
                progress.report({
                  message: `📦 ${discoveryProgress.data.componentsCount} components • ` +
                           `🛣️ ${discoveryProgress.data.routesCount} routes • ` +
                           `🌐 ${discoveryProgress.data.apisCount} APIs`,
                  increment: 2
                });
              } else if (discoveryProgress.type === 'journey') {
                const journey = discoveryProgress.data.journey;
                if (journey) {
                  progress.report({
                    message: `✨ Found: ${journey.name} (${Math.round(journey.confidence * 100)}% confidence)`,
                    increment: 5
                  });
                }
              } else if (discoveryProgress.type === 'complete') {
                const summary = discoveryProgress.data.summary;
                if (summary) {
                  progress.report({
                    message: `✅ Complete! ${summary.totalJourneys} journeys • ${Math.round(summary.estimatedCoverage)}% coverage`,
                    increment: 100
                  });
                }
                // Disconnect and resolve
                this.disconnect();
                resolve(discoveryProgress);
              }

              // Show current file being analyzed
              if (discoveryProgress.data.currentFile) {
                progress.report({
                  message: `🔍 Analyzing: ${discoveryProgress.data.currentFile}`,
                });
              }
            };

            this.onProgress(callback);

            // Wait for completion (callback will resolve)
            return new Promise<void>((resolveProgress) => {
              // Setup timeout (max 2 minutes)
              setTimeout(() => {
                this.disconnect();
                reject(new Error('Discovery timeout after 2 minutes'));
              }, 120000);
            });
          }
        );
      } catch (error) {
        this.disconnect();
        reject(error);
      }
    });
  }
}

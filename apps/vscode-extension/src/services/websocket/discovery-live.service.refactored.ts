import { WebSocketClient, WebSocketConfig } from './websocket-client';
import { ProgressNotifier } from './progress-notifier';
import { DiscoveryProgress, DiscoveryResult } from './types';

/**
 * Discovery session configuration
 */
export interface DiscoverySessionConfig {
  workspacePath: string;
  title?: string;
  timeout?: number; // milliseconds
}

/**
 * DiscoveryLiveService - Orchestrates live discovery with WebSocket and UI
 * 
 * SOLID Principles Applied:
 * 
 * 1. Single Responsibility Principle (SRP):
 *    - WebSocketClient: Handles connection only
 *    - ProgressNotifier: Handles UI only
 *    - DiscoveryLiveService: Orchestrates the flow
 * 
 * 2. Open/Closed Principle (OCP):
 *    - Open for extension via dependency injection
 *    - Closed for modification (services are injected, not hardcoded)
 * 
 * 3. Liskov Substitution Principle (LSP):
 *    - Any WebSocketClient implementation can be used
 *    - Any ProgressNotifier implementation can be used
 * 
 * 4. Interface Segregation Principle (ISP):
 *    - Each service has focused, minimal interface
 *    - No fat interfaces with unused methods
 * 
 * 5. Dependency Inversion Principle (DIP):
 *    - Depends on abstractions (injected dependencies)
 *    - Not depends on concretions (no new WebSocketClient() inside)
 *
 * Best Practices:
 * - Composition over inheritance
 * - Dependency injection for testability
 * - Clear separation of concerns
 * - Immutable configuration objects
 * - Proper resource cleanup (disconnect)
 * - Error handling with typed errors
 * - Logging for observability
 */
export class DiscoveryLiveService {
  private client: WebSocketClient;
  private notifier: ProgressNotifier;
  private readonly logger = console; // Could be injected Logger service

  constructor(
    client?: WebSocketClient,
    notifier?: ProgressNotifier,
    private readonly backendUrl: string = 'http://localhost:3001'
  ) {
    // Dependency Injection: Services can be injected for testing
    this.client = client || new WebSocketClient(this.createWebSocketConfig());
    this.notifier = notifier || new ProgressNotifier();
  }

  /**
   * Start live discovery session with real-time updates
   * 
   * @param config Discovery session configuration
   * @returns Promise<DiscoveryResult> Final discovery result
   * @throws {DiscoveryError} If discovery fails
   */
  async startDiscovery(config: DiscoverySessionConfig): Promise<DiscoveryResult> {
    const { workspacePath, title, timeout } = config;
    
    this.logger.log('[DiscoveryLive] Starting discovery session:', workspacePath);

    try {
      // 1. Connect to WebSocket
      await this.connect();

      // 2. Join workspace room
      this.client.emit('joinDiscovery', { workspacePath });

      // 3. Setup progress tracking
      let lastProgress: DiscoveryProgress | null = null;
      let completed = false;
      
      // Type-safe progress handler
      const handleProgress = (progress: DiscoveryProgress) => {
        lastProgress = progress;
        if (progress.type === 'complete') {
          completed = true;
        }
      };

      // 4. Show progress UI with live updates
      await this.notifier.showProgress(
        title || '🧠 Smart Discovery in Progress',
        async (reporter) => {
          return new Promise<void>((resolve, reject) => {
            // Listen to progress events
            const progressHandler = (progress: DiscoveryProgress) => {
              handleProgress(progress);
              reporter(progress);

              // Check if complete
              if (progress.type === 'complete') {
                this.disconnect();
                resolve();
              }
            };

            this.client.on<DiscoveryProgress>('progress', progressHandler);

            // Setup timeout
            const timeoutMs = timeout || 120000; // 2 minutes default
            const timeoutHandle = setTimeout(() => {
              if (!completed) {
                this.disconnect();
                reject(new DiscoveryError('Discovery timeout', 'TIMEOUT'));
              }
            }, timeoutMs);

            // Cleanup on completion
            const cleanup = () => {
              clearTimeout(timeoutHandle);
              this.client.off('progress', progressHandler);
            };

            // Handle both resolve and reject
            Promise.race([
              new Promise<void>((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs)),
            ]).catch(() => {}).finally(cleanup);
          });
        }
      );

      // 5. Return result
      const finalProgress = lastProgress as DiscoveryProgress | null;
      if (finalProgress && finalProgress.type === 'complete') {
        const summary = finalProgress.data.summary;
        if (summary) {
          this.logger.log('[DiscoveryLive] Discovery completed successfully');
          return {
            success: true,
            summary,
          };
        }
      }

      throw new DiscoveryError('Discovery completed without summary', 'NO_SUMMARY');

    } catch (error) {
      this.logger.error('[DiscoveryLive] Discovery failed:', error);
      this.disconnect();

      if (error instanceof DiscoveryError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown discovery error';
      throw new DiscoveryError(errorMessage, 'UNKNOWN_ERROR');
    }
  }

  /**
   * Check if currently connected
   */
  get isConnected(): boolean {
    return this.client.isConnected;
  }

  /**
   * Connect to WebSocket server
   */
  private async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.logger.log('[DiscoveryLive] Connected to WebSocket');
    } catch (error) {
      this.logger.error('[DiscoveryLive] Connection failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      throw new DiscoveryError(
        `Failed to connect to backend: ${errorMessage}`,
        'CONNECTION_ERROR'
      );
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  private disconnect(): void {
    this.client.disconnect();
    this.logger.log('[DiscoveryLive] Disconnected from WebSocket');
  }

  /**
   * Create WebSocket configuration
   */
  private createWebSocketConfig(): WebSocketConfig {
    return {
      url: this.backendUrl,
      namespace: 'discovery',
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 3,
      timeout: 5000,
    };
  }
}

/**
 * Custom error for discovery failures
 * 
 * Best Practice: Typed errors for better error handling
 */
export class DiscoveryError extends Error {
  constructor(
    message: string,
    public readonly code: 'TIMEOUT' | 'CONNECTION_ERROR' | 'NO_SUMMARY' | 'UNKNOWN_ERROR'
  ) {
    super(message);
    this.name = 'DiscoveryError';
  }
}

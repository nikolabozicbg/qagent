import { io, Socket } from 'socket.io-client';

/**
 * WebSocket connection configuration
 */
export interface WebSocketConfig {
  url: string;
  namespace: string;
  transports?: string[];
  reconnection?: boolean;
  reconnectionAttempts?: number;
  timeout?: number;
}

/**
 * Event listener callback
 */
export type EventCallback<T = any> = (data: T) => void;

/**
 * WebSocketClient - Single Responsibility: Manage WebSocket connection
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles connection lifecycle
 * - Open/Closed: Extensible via event system, closed for modification
 * - Liskov Substitution: Can be replaced with any IWebSocketClient implementation
 * - Dependency Inversion: Depends on abstractions (EventCallback), not concretions
 */
export class WebSocketClient {
  private socket: Socket | null = null;
  private _isConnected = false;
  private eventHandlers: Map<string, EventCallback[]> = new Map();

  constructor(private readonly config: WebSocketConfig) {}

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${this.config.url}/${this.config.namespace}`;
      
      this.socket = io(url, {
        transports: this.config.transports || ['websocket'],
        reconnection: this.config.reconnection ?? true,
        reconnectionAttempts: this.config.reconnectionAttempts ?? 3,
        timeout: this.config.timeout ?? 5000,
      });

      this.socket.on('connect', () => {
        this._isConnected = true;
        this.notifyHandlers('connect', null);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        this._isConnected = false;
        this.notifyHandlers('connect_error', error);
        reject(new Error(`WebSocket connection failed: ${error.message}`));
      });

      this.socket.on('disconnect', () => {
        this._isConnected = false;
        this.notifyHandlers('disconnect', null);
      });
    });
  }

  /**
   * Emit event to server
   */
  emit<T = any>(event: string, data: T): void {
    if (!this.socket) {
      throw new Error('WebSocket not connected');
    }
    this.socket.emit(event, data);
  }

  /**
   * Listen to server events
   */
  on<T = any>(event: string, callback: EventCallback<T>): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
      
      // Register with socket.io
      if (this.socket) {
        this.socket.on(event, (data) => this.notifyHandlers(event, data));
      }
    }
    
    this.eventHandlers.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off<T = any>(event: string, callback: EventCallback<T>): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this._isConnected = false;
      this.eventHandlers.clear();
    }
  }

  /**
   * Check connection status
   */
  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Notify all registered handlers for an event
   */
  private notifyHandlers<T>(event: string, data: T): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      }
    }
  }
}

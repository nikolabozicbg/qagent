import { io, Socket } from 'socket.io-client';
import { AnalysisProgress, DetectedTech } from '@/types/onboarding';

const WS_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type ProgressCallback = (progress: AnalysisProgress) => void;
type TechDetectedCallback = (tech: DetectedTech) => void;
type CompleteCallback = (data: any) => void;
type ErrorCallback = (error: string) => void;
type TestGenerationProgressCallback = (progress: { step: string; percentage: number; message: string }) => void;
type TestRunUpdateCallback = (update: { testFile: string; status: string; duration?: number; error?: string }) => void;
type MetricsUpdateCallback = (metrics: any) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private namespace = '/discovery';

  connect() {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(`${WS_URL}${this.namespace}`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Event listeners
  onProgress(callback: ProgressCallback) {
    this.socket?.on('progress', callback);
  }

  onTechDetected(callback: TechDetectedCallback) {
    this.socket?.on('tech-detected', callback);
  }

  onComplete(callback: CompleteCallback) {
    this.socket?.on('complete', callback);
  }

  onError(callback: ErrorCallback) {
    this.socket?.on('error', callback);
  }

  // Remove listeners
  offProgress(callback?: ProgressCallback) {
    this.socket?.off('progress', callback);
  }

  offTechDetected(callback?: TechDetectedCallback) {
    this.socket?.off('tech-detected', callback);
  }

  offComplete(callback?: CompleteCallback) {
    this.socket?.off('complete', callback);
  }

  offError(callback?: ErrorCallback) {
    this.socket?.off('error', callback);
  }

  // Test generation events
  onTestGenerationProgress(callback: TestGenerationProgressCallback) {
    this.socket?.on('test:generation:progress', callback);
  }

  offTestGenerationProgress(callback?: TestGenerationProgressCallback) {
    this.socket?.off('test:generation:progress', callback);
  }

  onTestGenerationStep(callback: (data: { step: string; message: string }) => void) {
    this.socket?.on('test:generation:step', callback);
  }

  offTestGenerationStep(callback?: (data: { step: string; message: string }) => void) {
    this.socket?.off('test:generation:step', callback);
  }

  onTestGenerationDecision(callback: (data: { decision: string; reason?: string }) => void) {
    this.socket?.on('test:generation:decision', callback);
  }

  offTestGenerationDecision(callback?: (data: { decision: string; reason?: string }) => void) {
    this.socket?.off('test:generation:decision', callback);
  }

  onTestGenerationComplete(callback: CompleteCallback) {
    this.socket?.on('test:generation:complete', callback);
  }

  offTestGenerationComplete(callback?: CompleteCallback) {
    this.socket?.off('test:generation:complete', callback);
  }

  // Test run events
  onTestRunUpdate(callback: TestRunUpdateCallback) {
    this.socket?.on('test:run:update', callback);
  }

  offTestRunUpdate(callback?: TestRunUpdateCallback) {
    this.socket?.off('test:run:update', callback);
  }

  onTestRunConsole(callback: (data: { timestamp: string; level: string; message: string }) => void) {
    this.socket?.on('test:run:console', callback);
  }

  offTestRunConsole(callback?: (data: { timestamp: string; level: string; message: string }) => void) {
    this.socket?.off('test:run:console', callback);
  }

  onTestRunNetwork(callback: (data: { method: string; url: string; status: number; duration: number }) => void) {
    this.socket?.on('test:run:network', callback);
  }

  offTestRunNetwork(callback?: (data: { method: string; url: string; status: number; duration: number }) => void) {
    this.socket?.off('test:run:network', callback);
  }

  onTestRunArtifact(callback: (data: { type: string; path: string; testId: string }) => void) {
    this.socket?.on('test:run:artifact', callback);
  }

  offTestRunArtifact(callback?: (data: { type: string; path: string; testId: string }) => void) {
    this.socket?.off('test:run:artifact', callback);
  }

  onTestRunComplete(callback: CompleteCallback) {
    this.socket?.on('test:run:complete', callback);
  }

  offTestRunComplete(callback?: CompleteCallback) {
    this.socket?.off('test:run:complete', callback);
  }

  // Metrics updates
  onMetricsUpdate(callback: MetricsUpdateCallback) {
    this.socket?.on('metrics:update', callback);
  }

  offMetricsUpdate(callback?: MetricsUpdateCallback) {
    this.socket?.off('metrics:update', callback);
  }

  // Flow updates
  onFlowUpdate(callback: (flow: any) => void) {
    this.socket?.on('flow:update', callback);
  }

  offFlowUpdate(callback?: (flow: any) => void) {
    this.socket?.off('flow:update', callback);
  }

  // Check if connected
  isConnected() {
    return this.socket?.connected || false;
  }

  // Emit events (for sending data to server)
  emit(event: string, data?: any) {
    this.socket?.emit(event, data);
  }
}

export const wsService = new WebSocketService();

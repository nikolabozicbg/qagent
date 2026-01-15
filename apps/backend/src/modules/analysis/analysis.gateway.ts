import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

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

@WebSocketGateway({
  namespace: 'discovery',
  cors: {
    origin: '*', // In production, specify VSCode extension origin
  },
})
export class AnalysisGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AnalysisGateway.name);

  /**
   * Client connects to discovery WebSocket
   */
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * Client disconnects
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Emit discovery progress to specific client
   */
  emitProgress(clientId: string, progress: DiscoveryProgress) {
    this.server.to(clientId).emit('progress', progress);
  }

  /**
   * Emit progress to all connected clients (broadcast)
   */
  broadcastProgress(progress: DiscoveryProgress) {
    this.server.emit('progress', progress);
  }

  /**
   * Client joins a discovery session (workspace-specific room)
   */
  @SubscribeMessage('joinDiscovery')
  handleJoinDiscovery(
    @MessageBody() data: { workspacePath: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `discovery:${data.workspacePath}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined discovery room: ${room}`);
    
    // Send initial "connected" message
    this.emitProgress(client.id, {
      type: 'init',
      data: {
        componentsCount: 0,
        routesCount: 0,
        apisCount: 0,
        formsCount: 0,
        filesAnalyzed: 0,
        totalFiles: 0,
      },
    });
  }

  /**
   * Helper: Emit progress to workspace-specific room
   */
  emitToWorkspace(workspacePath: string, progress: DiscoveryProgress) {
    const room = `discovery:${workspacePath}`;
    this.server.to(room).emit('progress', progress);
  }

  /**
   * Test Generation WebSocket Events
   */
  emitTestGenerationProgress(workspacePath: string, data: {
    step: string;
    percentage: number;
    message: string;
  }) {
    const room = `discovery:${workspacePath}`;
    this.server.to(room).emit('test:generation:progress', data);
  }

  emitTestGenerationStep(workspacePath: string, data: {
    step: string;
    message: string;
  }) {
    const room = `discovery:${workspacePath}`;
    this.server.to(room).emit('test:generation:step', data);
  }

  emitTestGenerationDecision(workspacePath: string, data: {
    decision: string;
    reason?: string;
  }) {
    const room = `discovery:${workspacePath}`;
    this.server.to(room).emit('test:generation:decision', data);
  }

  emitTestGenerationComplete(workspacePath: string, data: {
    code: string;
    filePath: string;
    stats?: {
      lines: number;
      testCases: number;
      assertions: number;
    };
    testCases?: Array<{ name: string; type: string }>;
  }) {
    const room = `discovery:${workspacePath}`;
    this.server.to(room).emit('test:generation:complete', data);
  }

  emitTestGenerationError(workspacePath: string, error: string) {
    const room = `discovery:${workspacePath}`;
    this.server.to(room).emit('test:generation:error', { error });
  }

  /**
   * Test Execution WebSocket Events
   */
  emitTestRunUpdate(workspacePath: string, data: {
    testFile: string;
    status: 'running' | 'passed' | 'failed' | 'skipped';
    duration?: number;
    error?: string;
  }) {
    const room = `discovery:${workspacePath}`;
    this.server.to(room).emit('test:run:update', data);
  }

  emitTestRunConsole(workspacePath: string, data: {
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
  }) {
    const room = `discovery:${workspacePath}`;
    this.server.to(room).emit('test:run:console', data);
  }

  emitTestRunNetwork(workspacePath: string, data: {
    method: string;
    url: string;
    status: number;
    duration: number;
  }) {
    const room = `discovery:${workspacePath}`;
    this.server.to(room).emit('test:run:network', data);
  }

  emitTestRunArtifact(workspacePath: string, data: {
    type: 'screenshot' | 'video' | 'trace';
    path: string;
    testId: string;
  }) {
    const room = `discovery:${workspacePath}`;
    this.server.to(room).emit('test:run:artifact', data);
  }

  emitTestRunComplete(workspacePath: string, data: {
    passed: number;
    failed: number;
    total: number;
    duration: number;
  }) {
    const room = `discovery:${workspacePath}`;
    this.server.to(room).emit('test:run:complete', data);
  }
}

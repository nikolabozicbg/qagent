/**
 * WebSocket Module - Live Discovery with Real-Time Updates
 * 
 * Architecture:
 * ============
 * 
 * ┌─────────────────────────────────────────────────────────┐
 * │              DiscoveryLiveService                       │
 * │                 (Orchestrator)                          │
 * │  - Coordinates discovery flow                           │
 * │  - Manages lifecycle                                    │
 * │  - Error handling                                       │
 * └───────────────────┬────────────────────┬────────────────┘
 *                     │                    │
 *          ┌──────────▼────────┐  ┌────────▼───────────┐
 *          │ WebSocketClient   │  │ ProgressNotifier   │
 *          │  (Connection)     │  │    (UI Display)    │
 *          │                   │  │                    │
 *          │ - Connect/        │  │ - Format progress  │
 *          │   Disconnect      │  │ - Show VSCode UI   │
 *          │ - Event handling  │  │ - Strategy pattern │
 *          └───────────────────┘  └────────────────────┘
 * 
 * SOLID Principles Applied:
 * =========================
 * 
 * 1. Single Responsibility (SRP):
 *    ✓ WebSocketClient: Only manages connection
 *    ✓ ProgressNotifier: Only handles UI
 *    ✓ DiscoveryLiveService: Only orchestrates
 * 
 * 2. Open/Closed (OCP):
 *    ✓ Extensible via dependency injection
 *    ✓ Closed for modification
 *    ✓ Strategy pattern for formatting
 * 
 * 3. Liskov Substitution (LSP):
 *    ✓ Any IProgressFormatter can be used
 *    ✓ Services can be mocked for testing
 * 
 * 4. Interface Segregation (ISP):
 *    ✓ Minimal, focused interfaces
 *    ✓ No fat interfaces
 * 
 * 5. Dependency Inversion (DIP):
 *    ✓ Depends on abstractions
 *    ✓ Dependencies injected
 * 
 * Best Practices:
 * ===============
 * - Composition over inheritance
 * - Dependency injection
 * - Typed errors (DiscoveryError)
 * - Immutable config objects
 * - Proper resource cleanup
 * - Logging for observability
 * - Clear separation of concerns
 * 
 * Usage Example:
 * ==============
 * ```typescript
 * const service = new DiscoveryLiveService();
 * 
 * const result = await service.startDiscovery({
 *   workspacePath: '/path/to/project',
 *   title: '🧠 Analyzing your app...',
 *   timeout: 120000
 * });
 * 
 * if (result.success) {
 *   console.log(`Found ${result.summary.totalJourneys} journeys`);
 * }
 * ```
 * 
 * Testing:
 * ========
 * ```typescript
 * // Mock dependencies for testing
 * const mockClient = new MockWebSocketClient();
 * const mockNotifier = new MockProgressNotifier();
 * 
 * const service = new DiscoveryLiveService(
 *   mockClient,
 *   mockNotifier,
 *   'http://test-backend'
 * );
 * ```
 */

// Core services
export { WebSocketClient } from './websocket-client';
export type { WebSocketConfig, EventCallback } from './websocket-client';

export { ProgressNotifier, DefaultProgressFormatter } from './progress-notifier';
export type { IProgressFormatter } from './progress-notifier';

export { DiscoveryLiveService, DiscoveryError } from './discovery-live.service.refactored';
export type { DiscoverySessionConfig } from './discovery-live.service.refactored';

// Types
export type {
  DiscoveryProgress,
  DiscoveryProgressType,
  DiscoveryProgressData,
  DiscoveryResult,
  DiscoverySummary,
  JourneyPreview,
  JourneyPriority,
} from './types';

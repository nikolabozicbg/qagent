# WebSocket Module - Live Discovery

**Date:** December 30, 2024
**Status:** ✅ Implemented with SOLID principles

---

## 🎯 Purpose

Provides real-time WebSocket communication between VSCode extension and backend for live discovery progress updates.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│              DiscoveryLiveService                       │
│                 (Orchestrator)                          │
│  • Coordinates discovery flow                           │
│  • Manages lifecycle                                    │
│  • Error handling                                       │
└───────────────────┬────────────────────┬────────────────┘
                    │                    │
         ┌──────────▼────────┐  ┌────────▼───────────┐
         │ WebSocketClient   │  │ ProgressNotifier   │
         │  (Connection)     │  │    (UI Display)    │
         │                   │  │                    │
         │ • Connect/        │  │ • Format progress  │
         │   Disconnect      │  │ • Show VSCode UI   │
         │ • Event handling  │  │ • Strategy pattern │
         └───────────────────┘  └────────────────────┘
```

## 📦 Components

### 1. WebSocketClient
**Responsibility:** Manage WebSocket connection lifecycle

**Features:**
- Connect/disconnect
- Event emission and subscription
- Error handling
- Reconnection logic

**SOLID:**
- ✅ SRP: Only handles connection
- ✅ OCP: Extensible via event system
- ✅ DIP: Depends on Socket abstraction

### 2. ProgressNotifier
**Responsibility:** Display progress in VSCode UI

**Features:**
- Format progress messages (Strategy pattern)
- Show VSCode progress notifications
- Cancellation support
- Custom formatters

**SOLID:**
- ✅ SRP: Only handles UI display
- ✅ OCP: Extensible via IProgressFormatter
- ✅ LSP: Any formatter can be used
- ✅ ISP: Minimal interface

### 3. DiscoveryLiveService
**Responsibility:** Orchestrate live discovery flow

**Features:**
- Start/stop discovery
- Coordinate WebSocket + UI
- Timeout handling
- Typed error handling

**SOLID:**
- ✅ SRP: Only orchestrates
- ✅ OCP: Closed for modification
- ✅ DIP: Dependencies injected

## 🚀 Usage

### Basic Usage

```typescript
import { DiscoveryLiveService } from './services/websocket';

const service = new DiscoveryLiveService();

try {
  const result = await service.startDiscovery({
    workspacePath: '/Users/me/my-project',
    title: '🧠 Smart Discovery in Progress',
    timeout: 120000 // 2 minutes
  });

  if (result.success) {
    console.log(`✅ Found ${result.summary.totalJourneys} journeys`);
    console.log(`📊 Coverage: ${result.summary.estimatedCoverage}%`);
  }
} catch (error) {
  if (error instanceof DiscoveryError) {
    switch (error.code) {
      case 'TIMEOUT':
        vscode.window.showErrorMessage('Discovery timed out');
        break;
      case 'CONNECTION_ERROR':
        vscode.window.showErrorMessage('Cannot connect to backend');
        break;
    }
  }
}
```

### Advanced: Custom Progress Formatter

```typescript
import { 
  DiscoveryLiveService,
  IProgressFormatter,
  ProgressNotifier 
} from './services/websocket';

// Custom formatter with emoji based on priority
class EmojiProgressFormatter implements IProgressFormatter {
  format(progress: DiscoveryProgress) {
    if (progress.type === 'journey') {
      const emoji = progress.data.journey.priority === 'critical' ? '🔴' : '🟡';
      return {
        message: `${emoji} ${progress.data.journey.name}`,
        increment: 5
      };
    }
    return { message: 'Processing...' };
  }
}

const notifier = new ProgressNotifier(new EmojiProgressFormatter());
const service = new DiscoveryLiveService(undefined, notifier);
```

### Testing: Mock Dependencies

```typescript
import { WebSocketClient, ProgressNotifier } from './services/websocket';

// Mock WebSocket client
class MockWebSocketClient extends WebSocketClient {
  async connect() {
    // Simulate connection
    return Promise.resolve();
  }
  
  emit(event: string, data: any) {
    // Simulate event emission
    console.log('Emitted:', event, data);
  }
}

// Mock progress notifier
class MockProgressNotifier extends ProgressNotifier {
  async showProgress(title, onUpdate) {
    // Simulate progress without VSCode UI
    await onUpdate((progress) => {
      console.log('Progress:', progress);
    });
  }
}

// Test with mocks
const service = new DiscoveryLiveService(
  new MockWebSocketClient(),
  new MockProgressNotifier()
);

const result = await service.startDiscovery({
  workspacePath: '/test/project'
});
```

## 📊 Progress Events

### Event Types

- `init`: Discovery started, initial state
- `component`: Component discovered
- `route`: Route discovered
- `api`: API endpoint discovered
- `form`: Form discovered
- `journey`: High-value journey found
- `complete`: Discovery finished

### Event Data Structure

```typescript
{
  type: 'component',
  data: {
    componentsCount: 47,
    routesCount: 12,
    apisCount: 23,
    formsCount: 8,
    currentFile: 'src/components/LoginForm.tsx',
    currentType: 'component'
  }
}
```

```typescript
{
  type: 'journey',
  data: {
    journey: {
      name: 'User Authentication',
      confidence: 0.95,
      priority: 'critical'
    }
  }
}
```

```typescript
{
  type: 'complete',
  data: {
    summary: {
      totalComponents: 47,
      totalRoutes: 12,
      totalApis: 23,
      totalForms: 8,
      totalJourneys: 6,
      estimatedCoverage: 87,
      analysisTime: 38000
    }
  }
}
```

## 🎯 SOLID Principles Summary

| Principle | Implementation |
|-----------|----------------|
| **SRP** | 3 classes, each with single responsibility |
| **OCP** | Extensible via DI, closed for modification |
| **LSP** | Interfaces allow substitution |
| **ISP** | Minimal, focused interfaces |
| **DIP** | All dependencies injected |

## ✅ Best Practices Applied

- ✅ **Composition over inheritance**
- ✅ **Dependency injection** for testability
- ✅ **Typed errors** (DiscoveryError with codes)
- ✅ **Immutable config** objects
- ✅ **Resource cleanup** (disconnect on completion)
- ✅ **Logging** for observability
- ✅ **Strategy pattern** for formatting
- ✅ **Clear separation** of concerns

## 🧪 Testing Strategy

1. **Unit Tests:**
   - WebSocketClient: Connection, events, errors
   - ProgressNotifier: Formatting, UI display
   - DiscoveryLiveService: Flow orchestration

2. **Integration Tests:**
   - Full discovery flow with mocked backend
   - Timeout handling
   - Error recovery

3. **E2E Tests:**
   - Real backend + WebSocket
   - VSCode UI interaction
   - Multiple concurrent discoveries

## 📝 Next Steps

1. ✅ Backend WebSocket gateway implemented
2. ✅ Frontend service refactored with SOLID
3. ⏳ Integrate with existing discovery flow
4. ⏳ Add Progress Webview (visual dashboard)
5. ⏳ Write unit tests
6. ⏳ E2E testing on real projects

## 🐛 Known Issues

None - Clean implementation with proper error handling

## 📚 References

- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Socket.IO Client](https://socket.io/docs/v4/client-api/)
- [VSCode Extension API](https://code.visualstudio.com/api)
- [Dependency Injection](https://en.wikipedia.org/wiki/Dependency_injection)

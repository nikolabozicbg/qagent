# 🧠 Smart E2E Journey Generation

## Overview

QAgenAI's **Smart E2E Journey Generation** is an intelligent system that analyzes your ENTIRE application to discover realistic user journeys and generate E2E tests automatically.

Unlike traditional approaches that only analyze page components, our holistic system understands:
- **Pages & Routes** - Where users can navigate
- **Forms & Interactions** - What users can do
- **Components & Layouts** - How the UI is structured
- **Navigation Flows** - How users move through the app

## Architecture

### Backend Services

#### 1. **HolisticAnalysisService** (`holistic-analysis.service.ts`)
- Analyzes ALL source files (not just pages)
- Extracts interactions, API calls, state operations
- Discovers React Router configuration
- Maps components to routes

#### 2. **JourneySynthesisService** (`journey-synthesis.service.ts`)
- Synthesizes E2E journeys from application model
- Uses 3 strategies:
  - **Navigation-based**: Discovers page→page flows
  - **Form-based**: Creates form submission journeys
  - **Interaction chains**: Identifies complex multi-step flows
- Prioritizes journeys (auth = 90-95, forms = 60-85)
- Generates linear step sequences (navigate → fill → submit → verify)

#### 3. **NavigationGraphServices** (Foundation layer)
- Graph-based analysis with DSA algorithms
- Tarjan's SCC for cycle detection
- DFS with intelligent pruning
- Weight calculation for edge importance

### VS Code Extension

#### 1. **BackendAPIService**
- `discoverJourneysHolistic()` - Calls holistic analysis endpoint
- Returns `E2EJourney[]` with steps and assertions

#### 2. **OnboardingService** (Integration Layer)
- `discoverFlows()` - Entry point for flow discovery
- Calls `BackendAPIService.discoverJourneysHolistic()`
- Converts `E2EJourney` → `DiscoveredFlow` for dashboard compatibility
- Stores journey data in `_journeyData` field
- Fallback to rule-based discovery if backend unavailable

#### 3. **TestGenerationService**
- `generateE2ETest()` - Main test generation entry point
- **Smart routing:**
  - If flow has `_journeyData` → use `JourneyTestGeneratorService`
  - If no journey data → fallback to AI generation
- Ensures backward compatibility with existing flows

#### 4. **JourneyTestGeneratorService**
- Converts journeys to Playwright test code
- Generates intelligent selectors
- Creates realistic test data
- Adds assertions for each step
- Public API: `buildTestCode()`, `getTestFileName()`

#### 5. **DashboardWebviewProvider**
- Displays journeys as flows with status (draft/generated/passing)
- Handles "Generate Test" (✨) and "Run Test" (▶️) actions
- Preserves journey data through flow lifecycle

## How It Works

### Full Integration Flow

```
1. User opens VS Code → Onboarding starts
   ↓
2. User clicks "Discover Flows" in onboarding
   ↓
3. OnboardingService.discoverFlows()
   ↓
4. Backend: HolisticAnalysisService.analyzeApplication()
   - Scans all source files
   - Extracts components, interactions, routes
   - Discovers React Router configuration
   ↓
5. Backend: JourneySynthesisService.synthesizeJourneys()
   - Strategy 1: Navigation journeys
   - Strategy 2: Form journeys
   - Strategy 3: Interaction chains
   ↓
6. Returns E2EJourney[] to extension
   ↓
7. OnboardingService converts to DiscoveredFlow[]
   - Maps priority → confidence
   - Extracts routes from steps
   - Stores full journey in _journeyData
   ↓
8. Dashboard displays journeys as flows
   ↓
9. User clicks ✨ "Generate Test"
   ↓
10. TestGenerationService.generateE2ETest(flow)
    - Detects _journeyData exists
    - Calls JourneyTestGeneratorService
    ↓
11. JourneyTestGeneratorService.buildTestCode()
    - Converts journey steps → Playwright actions
    - Generates selectors (CSS, role, testid)
    - Adds assertions per step
    ↓
12. Test file saved to workspace
    ↓
13. User clicks ▶️ "Run Test"
    ↓
14. PlaywrightService executes test
```

### Backend Analysis Pipeline

```
Project Files →
  HolisticAnalysisService:
    - Parse AST (Babel)
    - Extract interactions (clicks, navigations, submits)
    - Discover routes (React Router <Route> tags)
    - Map components → routes
      ↓
  ApplicationModel:
    - 38 components
    - 12 interactions
    - 5 routes
      ↓
  JourneySynthesisService:
    - Navigation journeys: Header → /login
    - Form journeys: Login form submission
    - Interaction chains: Complete auth flow
      ↓
  E2EJourney[] (15 journeys)
    - Priority: 90-95 (auth), 60-85 (forms)
    - Linear steps: navigate → fill → submit → verify
```

## Generated Journey Structure

```typescript
interface E2EJourney {
  name: string;                    // "Complete Login"
  description: string;             // "User fills and submits Login"
  steps: JourneyStep[];            // 3-4 step linear flow
  priority: number;                // 0-100 (auth=95, forms=60-85)
  tags: string[];                  // ["form", "auth"]
  estimatedDuration: number;       // seconds
}

interface JourneyStep {
  action: 'navigate' | 'click' | 'fill' | 'submit' | 'verify';
  component: string;               // Source file
  target: string;                  // URL or selector
  description: string;             // Human-readable
  assertions: string[];            // Expected outcomes
}
```

## Example Journeys

### Auth Flow Journey
```json
{
  "name": "Complete Login",
  "priority": 95,
  "steps": [
    { "action": "navigate", "target": "/login" },
    { "action": "fill", "target": "form inputs" },
    { "action": "submit", "target": "submit button" }
  ]
}
```

### Generated Test
```typescript
import { test, expect } from '@playwright/test';

test.describe('Complete Login', () => {
  test('User fills and submits Login (Priority: 95)', async ({ page }) => {
    // Step 1: Navigate to /login
    await page.goto('/login');

    // Step 2: Fill form fields
    await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
    await page.fill('input[name="password"], input[type="password"]', 'password123');

    // Step 3: Submit the form
    await page.click('button[type="submit"]');
    // Expected: Form should validate
    // Expected: Loading state should show
    // Expected: Success/error feedback should appear
  });
});
```

## Usage

### Primary Method: Onboarding Wizard (Integrated)
1. Open VS Code in your project
2. QAgenAI onboarding wizard starts automatically (first run)
3. Complete steps: Framework Detection → E2E Setup
4. **Step 4: Flow Discovery** - Click "Discover Flows"
   - Backend performs holistic analysis
   - Discovers 15-20+ smart journeys (depending on project)
   - High-priority journeys (≥85) auto-selected
5. Complete onboarding → Journeys appear in Dashboard
6. **Generate Tests:**
   - Click ✨ on any journey in Dashboard
   - Extension detects holistic journey data
   - Generates Playwright test with linear steps
   - Test file auto-saved to project
7. **Run Tests:**
   - Click ▶️ to execute test with Playwright
   - View results in terminal

### Alternative: Direct Command
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "QAgenAI: Generate Smart E2E Tests"
3. Select journeys to generate
4. Tests are created in `tests/e2e/`

### Via Code
```typescript
// Backend
const { HolisticAnalysisService } = require('./holistic-analysis.service');
const { JourneySynthesisService } = require('./journey-synthesis.service');

const holisticService = new HolisticAnalysisService();
const journeyService = new JourneySynthesisService();

const model = await holisticService.analyzeApplication(workspacePath);
const journeys = journeyService.synthesizeJourneys(model);
```

## API Endpoints

### `POST /analyze/holistic`
Performs holistic analysis and returns E2E journeys.

**Request:**
```json
{
  "workspacePath": "/path/to/project"
}
```

**Response:**
```json
{
  "success": true,
  "model": {
    "totalComponents": 38,
    "componentsByType": {
      "forms": 5,
      "layouts": 1,
      "other": 32
    },
    "totalInteractions": 12,
    "uniqueRoutes": ["/", "/login", "/register"]
  },
  "journeys": [
    {
      "name": "Complete Login",
      "description": "User fills and submits Login",
      "priority": 95,
      "tags": ["form", "auth"],
      "stepCount": 3,
      "steps": [...]
    }
  ]
}
```

## Test Results

### react-redux-realworld-example-app
- **Components analyzed**: 38
- **Forms detected**: 5
- **Journeys generated**: 15
- **High priority flows**: 6 (auth-related)

### truthy-frontend
- **Components analyzed**: 200
- **Forms detected**: 15
- **Journeys generated**: 21
- **High priority flows**: 6
  - Login/Register forms
  - Profile management
  - Email template CRUD

## Key Features

✅ **Zero Hardcoding** - Works with ANY project structure
✅ **Smart Route Discovery** - Analyzes React Router config
✅ **Seamless Integration** - Built into onboarding wizard
✅ **Linear Flows** - Generates sequential step-by-step journeys
✅ **Priority-Based** - Auth flows = 90-95, forms = 60-85
✅ **Realistic Tests** - Includes assertions and test data
✅ **Multi-Strategy** - Navigation, forms, and interaction chains
✅ **Dual Generation** - Holistic journeys + AI fallback
✅ **Backward Compatible** - Works with existing flows
✅ **Auto-Selection** - High-priority journeys pre-selected
✅ **One-Click Run** - Generate and execute tests from dashboard

## Implementation Details

### Data Flow Through System

1. **Backend**: `E2EJourney` (journey-synthesis.service.ts)
   ```typescript
   interface E2EJourney {
     name: string;
     description: string;
     steps: JourneyStep[];
     priority: number;  // 0-100
     tags: string[];
     estimatedDuration: number;
   }
   ```

2. **Extension Bridge**: `DiscoveredFlow` (onboarding.types.ts)
   ```typescript
   interface DiscoveredFlow {
     id: string;
     name: string;
     confidence: number;  // Mapped from priority
     routes: string[];     // Extracted from steps
     components: string[]; // Extracted from steps
     _journeyData?: E2EJourney; // Full journey stored here
   }
   ```

3. **Dashboard**: `DashboardFlow` (dashboard.types.ts)
   ```typescript
   interface DashboardFlow extends DiscoveredFlow {
     status: 'draft' | 'generated' | 'passing' | 'failing';
   }
   ```

### Smart Routing Logic

```typescript
// In TestGenerationService.generateE2ETest()
const journeyData = flow._journeyData;

if (journeyData) {
  // Use holistic journey data (SMART PATH)
  return generateTestFromJourney(journeyData);
} else {
  // Fallback to AI generation (LEGACY PATH)
  return callBackendAIGeneration(flow);
}
```

### Conversion: Journey → DiscoveredFlow

```typescript
// In OnboardingService.discoverFlows()
const flows = journeys.map(journey => ({
  id: String(index + 1),
  name: journey.name,
  confidence: journey.priority,  // 95 → 95
  routes: extractRoutesFromJourney(journey),
  components: extractComponentsFromJourney(journey),
  selected: journey.priority >= 85,
  _journeyData: journey  // Store full journey
}));
```

## Future Improvements

- [ ] Selector extraction from actual DOM
- [ ] API call mocking suggestions
- [ ] Error path testing (negative flows)
- [ ] Vue/Angular/Svelte support
- [ ] Custom journey templates
- [ ] Test coverage mapping
- [ ] Multi-page journey support (currently single-form focused)
- [ ] Dynamic data generation for form fills
- [ ] Screenshot comparison on failures

## Development

### Run Backend
```bash
cd apps/backend
npm run start:dev
```

### Test Holistic Analysis
```bash
curl -X POST http://localhost:3001/analyze/holistic \
  -H "Content-Type: application/json" \
  -d '{"workspacePath": "/path/to/project"}' | jq
```

### Build Extension
```bash
cd apps/vscode-extension
npm run compile
```

## Credits

Built with:
- TypeScript
- NestJS (backend)
- VS Code Extension API
- Babel Parser (AST analysis)
- Graph Theory & DSA algorithms

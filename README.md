# QAgenAI

**AI-Powered E2E Test Generation for VS Code**

QAgenAI is a VS Code extension that automatically discovers user journeys in your React application and generates Playwright E2E tests without any hardcoding. Uses advanced AST analysis and graph algorithms to understand your entire application holistically.

## 🎯 Features

- ✨ **Smart Journey Discovery** - Holistic analysis of components, forms, routes, and interactions
- 🧠 **Zero Hardcoding** - Works with any React project structure
- 🚀 **One-Click Generation** - Generate and run tests from integrated dashboard
- 📊 **Priority-Based** - Auto-selects critical flows (auth, forms)
- 🔄 **Linear Flows** - Realistic step-by-step user journeys
- ⚡ **Fast Analysis** - 2-3 seconds for 200+ files

## Structure

```
qagenai/
├── apps/
│   ├── vscode-extension/  (VS Code Extension - TypeScript)
│   ├── backend/           (NestJS - Analysis Engine)
│   └── frontend/          (Next.js 14 - Future UI)
├── packages/
│   ├── ui/                (shared components)
│   └── config/            (shared configs)
├── docs/
│   ├── SMART_E2E_GENERATION.md      (System architecture)
│   └── INTEGRATION_SUMMARY.md       (Integration details)
├── turbo.json
├── package.json
└── README.md
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run development servers:
```bash
npm run dev
```

3. Build all apps:
```bash
npm run build
```

## 🚀 Quick Start

### For Users (VS Code Extension)

1. Install QAgenAI extension from VS Code Marketplace
2. Open your React project in VS Code
3. Onboarding wizard starts automatically
4. Click "Discover Flows" to analyze your app
5. Generate and run tests from dashboard

### For Development

1. **Start Backend (Analysis Engine)**
```bash
cd apps/backend
npm install
npm run start:dev
# Backend runs at http://localhost:3001
```

2. **Launch VS Code Extension**
```bash
cd apps/vscode-extension
npm install
npm run compile
# Press F5 in VS Code to launch Extension Development Host
```

3. **Test the System**
```bash
# Test holistic analysis
curl -X POST http://localhost:3001/analyze/holistic \
  -H "Content-Type: application/json" \
  -d '{"workspacePath": "/path/to/react/project"}' | jq

# Returns 15+ smart journeys
```

## 📚 Documentation

- **[Smart E2E Generation](./docs/SMART_E2E_GENERATION.md)** - Full system architecture, API docs, examples
- **[Integration Summary](./docs/INTEGRATION_SUMMARY.md)** - How it all works together, data flow, key innovations

## 🏛️ Architecture

### Backend (NestJS)
- **HolisticAnalysisService** - AST parsing, component analysis, route discovery
- **JourneySynthesisService** - Journey generation using 3 strategies
- **NavigationGraphServices** - Graph algorithms, cycle detection (Tarjan)

### Extension (TypeScript)
- **OnboardingService** - Integrated flow discovery
- **TestGenerationService** - Smart routing to holistic or AI generation
- **JourneyTestGeneratorService** - Journey → Playwright code converter
- **DashboardWebviewProvider** - Flow management UI

### Frontend (Next.js) - Coming Soon
- Web-based dashboard
- Advanced analytics
- Team collaboration

## Apps

- **vscode-extension**: VS Code extension (TypeScript)
- **backend**: NestJS analysis engine (http://localhost:3001)
- **frontend**: Next.js 14 application (http://localhost:3000)

## Packages

- **ui**: Shared React components
- **config**: Shared TypeScript and ESLint configurations

## 🧪 Test Results

### react-redux-realworld-example-app
- 38 components analyzed
- 15 journeys discovered
- 9 high-priority flows
- Analysis time: ~2 seconds

### truthy-frontend
- 200 components analyzed
- 21 journeys discovered
- 6 high-priority flows
- Analysis time: ~3 seconds

## 🔧 Tech Stack

- **Backend**: NestJS, TypeScript, Babel Parser
- **Extension**: VS Code Extension API, TypeScript
- **Frontend**: Next.js 14, React, TailwindCSS
- **Testing**: Playwright
- **Algorithms**: Graph theory, AST analysis, Tarjan's SCC

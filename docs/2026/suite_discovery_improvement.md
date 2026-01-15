# QAgent v3.0 - Suite Discovery Improvement Plan

## Cilj: Najbolji mogući rezultat bez kompromisa

---

## OVERVIEW

### Problem sa trenutnim sistemom
- Hardcoded patterns za specifične library-je
- Ne razume custom komponente
- Ne detektuje sve forme (samo `<form>` tag)
- Ne prepoznaje sve state management sisteme
- Generiše generičke suite-ove umesto domain-aware

### Rešenje: Behavior-Based Dynamic Analysis
- Zero hardcoding - sve se otkriva iz koda
- Behavior signatures umesto tipova
- Graph-based relationship mapping
- AI-powered synthesis sa kontekstom

---

## ARHITEKTURA

```
USER KLIKNE "DISCOVER"
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ELECTRON APP (FE)                          │
│  1. Uzima project path                                         │
│  2. Šalje request: GET /discover/stream (SSE)                  │
│  3. Prima progress updates                                     │
│  4. Prima finalni rezultat                                     │
│  5. Renderuje suites/cases/steps                               │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NESTJS BACKEND                             │
│                                                                 │
│  FAZA 1: Extraction (5-15 sec)                                 │
│  FAZA 2: Understanding (3-10 sec)                              │
│  FAZA 3: Graph + Synthesis (5-20 sec)                          │
│                                                                 │
│  TOTAL: 15-45 sekundi za prosečnu aplikaciju                   │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
    REZULTAT: Suites → Cases → Steps (sa selektorima)
```

---

## FAZA 1: TOTALNA EKSTRAKCIJA

### 1.1 Project Scanner

**Šta radi**: Skenira projekat i prikuplja sve metapodatke

**Input**: Project root path

**Output**:
- Lista svih source fajlova
- package.json parsed (dependencies, scripts)
- Config fajlovi (tsconfig, next.config, vite.config, etc.)
- Source root directories

**Detalji implementacije**:
- Rekurzivno skeniranje sa ignorisanjem (node_modules, dist, .git)
- Detekcija framework-a iz package.json bez hardcoded liste
- Detekcija monorepo strukture (lerna, nx, turborepo)
- Razrešavanje path aliasa iz tsconfig/jsconfig

---

### 1.2 AST Parser Engine

**Šta radi**: Parsira svaki source fajl u AST i izvlači sve relevantne informacije

**Input**: File content + file path

**Output** (za svaki fajl):
- Imports (šta importuje, odakle)
- Exports (šta exportuje, kako)
- Functions/Classes (sve deklaracije)
- JSX struktura (celo JSX stablo)
- Hooks (svi hook pozivi sa argumentima)
- Event handlers (svi handleri)
- String literals (URL-ovi, API paths, text)
- Atributi (data-*, aria-*, id, className, role)

**Detalji implementacije**:
- TypeScript parser (podržava .ts, .tsx, .js, .jsx)
- Visitor pattern za AST traversal
- Čuvanje source lokacije (line, column) za svaki node
- Ekstrakcija komentara (mogu sadržati test hints)
- Paralelno parsiranje za performanse

---

### 1.3 Dependency Graph Builder

**Šta radi**: Gradi kompletni graph zavisnosti između fajlova

**Input**: AST entities sa imports/exports

**Output**:
- Directed graph: file → imports → files
- Resolved paths (aliasi razrešeni)
- External vs internal dependencies
- Circular dependency detection

**Detalji implementacije**:
- Razrešavanje svih path aliasa (@/, ~/, etc.)
- Mapiranje barrel exports (index.ts re-exports)
- Detekcija dynamic imports
- Detekcija lazy loading patterns

---

## FAZA 2: SEMANTIČKO RAZUMEVANJE

### 2.1 Component Analyzer

**Šta radi**: Analizira svaku komponentu i izvlači njen "potpis"

**Input**: AST entity

**Output** (ComponentSignature):
- Props schema (name, type, required, default)
- Rendered elements (šta JSX proizvodi)
- Child components (koje komponente renderuje)
- Slots (children, named slots)
- Portals (renderovanje izvan DOM hijerarhije)

**Detalji implementacije**:
- TypeScript type inference za props
- JSX tree analysis za rendered output
- Detekcija compound components (Menu.Item pattern)
- Detekcija HOC patterns
- Detekcija render props patterns

---

### 2.2 Behavior Inference Engine

**Šta radi**: Određuje ŠTA komponenta RADI na osnovu koda

**Input**: ComponentSignature + AST

**Output** (Behaviors):
- Lista behavior tag-ova sa confidence score-om
- Evidence za svaki behavior (koji kod to dokazuje)

**Behavior categories** (otkrivaju se dinamički, ne hardcode):
- Input behaviors (accepts-text, accepts-selection, accepts-file, etc.)
- Action behaviors (submits-data, triggers-navigation, opens-modal, etc.)
- Data behaviors (fetches-data, mutates-data, caches-data, etc.)
- State behaviors (reads-state, writes-state, subscribes-state, etc.)
- Auth behaviors (requires-auth, checks-permission, guards-route, etc.)
- Display behaviors (renders-list, renders-detail, renders-empty, etc.)
- Feedback behaviors (shows-loading, shows-error, shows-success, etc.)

**Detalji implementacije**:
- Pattern matching na AST strukture
- Hook analysis (useState, useEffect, custom hooks)
- Event handler analysis
- API call detection (fetch, axios, RTK Query, React Query, Apollo, etc.)
- Confidence scoring based on evidence strength

---

### 2.3 Form Intelligence

**Šta radi**: Detektuje i analizira sve forme bez obzira na implementaciju

**Input**: Components sa "submits-data" behavior

**Output** (FormDefinition):
- Fields (svi inputi koji pripadaju formi)
- Validation rules (per field + form level)
- Submit handler (šta se dešava na submit)
- API endpoint (koji API se poziva)
- Success flow (redirect, toast, reset)
- Error handling (kako se prikazuju greške)

**Detalji implementacije**:
- Detekcija form granica (form tag, hook scope, event handler scope)
- Field grouping by common parent/handler
- Validation extraction (zod, yup, joi, native, custom)
- Submit handler tracing
- Error state detection

---

### 2.4 State Management Detector

**Šta radi**: Pronalazi sve načine čuvanja state-a u aplikaciji

**Input**: All AST entities

**Output** (StateStores):
- Store definitions (name, shape, location)
- Actions/mutations (šta menja state)
- Selectors (šta čita state)
- Subscriptions (ko sluša promene)

**Podržani patterns** (detektuju se iz koda, ne hardcode):
- Redux/Redux Toolkit
- Zustand
- Jotai
- Recoil
- MobX
- XState
- React Query/TanStack Query
- SWR
- Apollo Client
- Context API
- URL state (query params)
- Local/Session Storage

---

### 2.5 API Layer Mapper

**Šta radi**: Pronalazi sve API pozive i njihove definicije

**Input**: All AST entities

**Output** (APIDefinitions):
- Endpoints (method, path, params, body, response)
- Client configuration (baseURL, headers, auth)
- Usage mapping (koji component poziva koji endpoint)
- Trigger mapping (šta triggeruje API poziv)

**Podržani patterns**:
- fetch() native
- axios
- ky
- RTK Query endpoints
- React Query hooks
- SWR hooks
- Apollo queries/mutations
- tRPC procedures
- Custom API wrappers

---

### 2.6 Navigation Mapper

**Šta radi**: Mapira sve načine navigacije u aplikaciji

**Input**: All AST entities + Project structure

**Output** (NavigationMap):
- Routes (path, component, params, guards)
- Links (source, target, trigger)
- Programmatic navigations (source, target, condition)
- Redirects (from, to, condition)

**Podržani patterns**:
- Next.js App Router (file-based)
- Next.js Pages Router (file-based)
- React Router (config-based)
- TanStack Router
- Link components
- Programmatic navigation (router.push, navigate, etc.)
- Window.location changes

---

### 2.7 Selector Extractor

**Šta radi**: Izvlači sve dostupne selektore za svaki interaktivni element

**Input**: All JSX structures

**Output** (SelectorMap):
- Element ID → Selector chain (prioritized)
- Selector type (testId, aria, role, text, css)
- Selector stability score
- Fallback selectors

**Prioriteti**:
1. data-testid, data-cy, data-test (najstabilniji)
2. aria-label (accessibility + testable)
3. role attribute (semantic)
4. id attribute (ako je stabilan)
5. Unique text content (za buttons/links)
6. Unique class combination (ako je stabilan pattern)
7. DOM path (fallback)

---

### 2.8 Auth Flow Detector

**Šta radi**: Razume authentication i authorization u aplikaciji

**Input**: All analyzed data

**Output** (AuthIntelligence):
- Auth provider type
- Login/Register/Logout flows
- Token storage location
- Protected routes
- Role-based access rules
- Session management

---

## FAZA 3: GRAPH I SINTEZA

### 3.1 Application Graph Constructor

**Šta radi**: Gradi unified knowledge graph cele aplikacije

**Input**: Svi outputs iz Faze 2

**Output** (ApplicationGraph):
- Nodes: sve entities (components, routes, APIs, stores, forms)
- Edges: sve relationships sa tipom i evidence

**Edge types** (dinamički, ne hardcoded):
- renders (component → component)
- navigates-to (source → route)
- calls-api (component → endpoint)
- reads-from (component → store)
- writes-to (component → store)
- submits-to (form → endpoint)
- validates-with (field → validation)
- protects (guard → route)
- triggers (event → handler → effect)

---

### 3.2 Graph Analysis Engine

**Šta radi**: Primenjuje algoritme na graph za insights

**Input**: ApplicationGraph

**Output** (GraphAnalysis):
- Node importance scores (PageRank)
- Feature clusters (Louvain clustering)
- Critical paths (entry → goal)
- Bottlenecks (high centrality nodes)
- Entry points (nodes with no incoming navigation)
- Exit points (logout, external links)

**Algoritmi**:
- PageRank za importance
- Louvain za clustering
- Betweenness centrality za bottlenecks
- BFS/DFS za path finding
- Tarjan za strongly connected components

---

### 3.3 User Journey Extractor

**Šta radi**: Izvlači smislene user journeys iz grafa

**Input**: GraphAnalysis + NavigationMap

**Output** (UserJourneys):
- Entry points (gde user može ući)
- Critical journeys (najvažniji flows)
- Happy paths (uspešni scenariji)
- Error paths (failure scenariji)
- Edge cases (granice, empty states)

---

### 3.4 Domain Detector

**Šta radi**: Prepoznaje domenu aplikacije za kontekstualno generisanje

**Input**: GraphAnalysis + Entities + Journeys

**Output** (DomainProfile):
- Primary domain (ecommerce, saas, social, etc.)
- Business entities (User, Product, Order, etc.)
- Critical flows (checkout, signup, etc.)
- Domain-specific patterns

---

### 3.5 AI Prompt Builder

**Šta radi**: Priprema optimalni prompt za AI

**Input**: Sve prethodno

**Output** (AIPrompt):
- System prompt (QA architect role + domain context)
- Application summary (graph summary, entities, flows)
- Selector map (available selectors per element)
- Constraints (max suites, max cases, priorities)

---

### 3.6 AI Test Synthesizer

**Šta radi**: Poziva AI za generisanje test suite-ova

**Input**: AIPrompt

**Output** (RawTestSuites):
- Suites sa cases i steps
- Raw AI response

---

### 3.7 Validation & Enrichment

**Šta radi**: Validira i obogaćuje AI output

**Input**: RawTestSuites + SelectorMap + All context

**Output** (ValidatedTestSuites):
- Validated selectors (postoje u kodu)
- Enriched steps (fallback selectors, metadata)
- Priority scores
- Coverage metrics

---

## OUTPUT STRUKTURA

```typescript
interface TestSuite {
  id: string;
  projectId: string;
  
  name: string;                    // "User Authentication"
  description: string;
  feature: string;                 // Cluster name from graph
  priority: number;                // 1-100, calculated
  tags: string[];                  // Auto-extracted
  
  testCases: TestCase[];
  
  metadata: {
    coverage: {
      components: string[];
      routes: string[];
      apis: string[];
    };
    estimatedDuration: number;     // seconds
    complexity: number;            // 1-10
    confidence: number;            // AI confidence 0-1
  };
  
  status: 'discovered' | 'reviewed' | 'approved' | 'generated';
}

interface TestCase {
  id: string;
  suiteId: string;
  
  name: string;                    // "Login with valid credentials"
  description: string;
  type: string;                    // "happy-path", "validation", "error", "edge-case"
  priority: number;
  
  preconditions: string[];         // ["User is logged out"]
  expectedOutcome: string;
  
  steps: TestStep[];
  
  testData: {
    fixtures: Record<string, any>;
    generators: string[];          // "faker.email", "faker.password"
  };
  
  metadata: {
    relatedApis: string[];
    relatedComponents: string[];
    estimatedDuration: number;
  };
}

interface TestStep {
  id: string;
  caseId: string;
  sequence: number;
  
  action: string;                  // "navigate", "click", "fill", "select", "assert"
  target: string;                  // Human-readable target
  value?: string;                  // For fill/select actions
  
  selector: {
    primary: string;
    strategy: string;              // "testId", "role", "aria", "text", "css"
    fallbacks: string[];
    confidence: number;
  };
  
  assertion?: {
    type: string;                  // "visible", "text", "value", "url", "count"
    expected: any;
    timeout?: number;
  };
  
  description: string;             // "Enter email address"
  
  metadata: {
    component?: string;
    api?: string;
    stateChange?: string;
  };
}
```

---

## API ENDPOINTS

```
Discovery:
  GET  /api/analysis/discover/stream?projectPath=...  (SSE)
  POST /api/analysis/discover                         (sync)

Projects:
  GET    /api/projects
  POST   /api/projects
  GET    /api/projects/:id
  PUT    /api/projects/:id
  DELETE /api/projects/:id

Suites:
  GET    /api/projects/:projectId/suites
  POST   /api/projects/:projectId/suites
  GET    /api/suites/:id
  PUT    /api/suites/:id
  DELETE /api/suites/:id

Cases:
  GET    /api/suites/:suiteId/cases
  POST   /api/suites/:suiteId/cases
  GET    /api/cases/:id
  PUT    /api/cases/:id
  DELETE /api/cases/:id

Steps:
  GET    /api/cases/:caseId/steps
  POST   /api/cases/:caseId/steps
  PUT    /api/steps/:id
  DELETE /api/steps/:id

Generation:
  POST   /api/generation/suite/:id
  POST   /api/generation/case/:id

Execution:
  POST   /api/execution/run
  GET    /api/execution/:id/stream
  GET    /api/execution/:id/results
```

---

## IMPLEMENTATION TIMELINE

| Faza | Komponenta | Trajanje | Kompleksnost |
|------|------------|----------|--------------|
| 1.1 | Project Scanner | 2 dana | Niska |
| 1.2 | AST Parser Engine | 5 dana | Visoka |
| 1.3 | Dependency Graph Builder | 2 dana | Srednja |
| 2.1 | Component Analyzer | 4 dana | Visoka |
| 2.2 | Behavior Inference Engine | 5 dana | Vrlo visoka |
| 2.3 | Form Intelligence | 4 dana | Visoka |
| 2.4 | State Management Detector | 4 dana | Visoka |
| 2.5 | API Layer Mapper | 3 dana | Srednja |
| 2.6 | Navigation Mapper | 3 dana | Srednja |
| 2.7 | Selector Extractor | 2 dana | Srednja |
| 2.8 | Auth Flow Detector | 2 dana | Srednja |
| 3.1 | Application Graph Constructor | 3 dana | Srednja |
| 3.2 | Graph Analysis Engine | 4 dana | Visoka |
| 3.3 | User Journey Extractor | 3 dana | Srednja |
| 3.4 | Domain Detector | 2 dana | Srednja |
| 3.5 | AI Prompt Builder | 3 dana | Visoka |
| 3.6 | AI Test Synthesizer | 2 dana | Srednja |
| 3.7 | Validation & Enrichment | 3 dana | Srednja |
| 4.1 | Suite Storage | 2 dana | Niska |
| 4.2 | API Layer | 3 dana | Srednja |
| 4.3 | Frontend Integration | 5 dana | Srednja |

**TOTAL: ~65 radnih dana (13 nedelja / 3 meseca)**

---

## SPRINT PLAN

**Sprint 1 (2 nedelje)**: Foundation
- 1.1 Project Scanner
- 1.2 AST Parser Engine
- 1.3 Dependency Graph Builder

**Sprint 2 (2 nedelje)**: Core Intelligence
- 2.1 Component Analyzer
- 2.2 Behavior Inference Engine (basic)
- 2.7 Selector Extractor

**Sprint 3 (2 nedelje)**: Forms & State
- 2.3 Form Intelligence
- 2.4 State Management Detector
- 2.5 API Layer Mapper

**Sprint 4 (2 nedelje)**: Navigation & Auth
- 2.6 Navigation Mapper
- 2.8 Auth Flow Detector
- 2.2 Behavior Inference Engine (advanced)

**Sprint 5 (2 nedelje)**: Graph & Analysis
- 3.1 Application Graph Constructor
- 3.2 Graph Analysis Engine
- 3.3 User Journey Extractor

**Sprint 6 (2 nedelje)**: AI Synthesis
- 3.4 Domain Detector
- 3.5 AI Prompt Builder
- 3.6 AI Test Synthesizer
- 3.7 Validation & Enrichment

**Sprint 7 (1 nedelja)**: Integration
- 4.1 Suite Storage
- 4.2 API Layer
- 4.3 Frontend Integration

---

## KLJUČNI PRINCIPI

1. **ZERO HARDCODING** - Nikada ne pretpostavljati framework, library, ili pattern
2. **EXTRACT EVERYTHING** - Izvući sve iz koda, pa onda klasifikovati
3. **GRAPH-FIRST** - Sve veze modelovati kao graf
4. **AI-ASSISTED** - AI za semantičko razumevanje i sintezu, ne za guessing
5. **SELECTOR-FROM-CODE** - Selektori se izvlače, nikad ne izmišljaju
6. **DOMAIN-AWARE** - Razumeti domenu aplikacije za relevantne testove
7. **DEDUPLICATION** - Jedan test per user intent, ne per navigation path

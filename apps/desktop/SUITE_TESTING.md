# Suite-Based Architecture - Testing Guide

## ✅ Completed Implementation

The QAgent desktop app has been fully migrated to a Suite/Case/Step architecture.

### What's New
- **Backend API**: `POST /analyze/suites/discover` returns TestSuite[] directly
- **Type System**: Complete TypeScript types for Suite/Case/Step in `suite.types.ts`
- **State Management**: Zustand stores (`useSuiteStore`, `useProjectStore`)
- **Premium IDE Layout**: 
  - UnifiedSidebar with project management
  - Projects section with switcher (collapsible)
  - Navigation section with Dashboard/Suites/Flows/Settings
  - Context menu (right-click) for projects
  - Inline project renaming
  - WebSocket connection status
- **UI Components**: `SuiteCard`, `CaseCard`, `StepItem`
- **Screens**: 
  - Dashboard (Suite-based stats, priority suites)
  - SuitesList (All suites with search/filter/sort)
  - SuiteDetail (Test cases within a suite)
  - CaseDetail (Steps within a test case)
- **Onboarding**: Updated to discover Suites instead of Flows

## 🚀 How to Test

### 1. Start Backend
```bash
cd apps/backend
npm run dev
```
Backend should start on `http://localhost:3001`

### 2. Start Desktop App
```bash
cd apps/desktop  
npm run dev
```
Electron app will launch

### 3. Test Flow

#### Step 1: Project Selection
- Dashboard shows "No Project Selected"
- Click "Select Project Folder" or drag & drop a folder
- Project should appear in header

#### Step 2: Discover Suites
- Click "Discover Suites" button in Dashboard header
- Watch loading spinner
- Toast notification: "Discovered X test suites"
- Dashboard updates with stats:
  - Total suites
  - Total test cases  
  - Total test steps
  - Priority suites appear in left panel

#### Step 3: View All Suites
- Click "Test Suites" in sidebar OR
- Click "View All Suites" button
- See SuitesList screen with:
  - Stats bar (total suites, critical, high priority, cases, steps)
  - Search bar
  - Filter buttons (priority, category)
  - Sort dropdown
  - Grid of SuiteCards

#### Step 4: View Suite Detail
- Click on any suite card
- See SuiteDetail screen with:
  - Suite header (name, category, priority)
  - Stats (total cases, passed, failed, pending, steps, duration)
  - Search/filter for cases
  - Grid of CaseCards

#### Step 5: View Case Detail
- Click on any test case
- See CaseDetail screen with:
  - Case header (name, status, priority)
  - Breadcrumb (suite name is clickable)
  - Stats (steps, passed, failed, pending)
  - Test file path (if generated)
  - Tags
  - Last run info
  - List of StepItems with:
    - Step number
    - Action icon
    - Selector
    - Assertions
    - Status badge

### 4. Test Features

#### Search
- In SuitesList: Search by suite name, category, description
- In SuiteDetail: Search by case name, description
- Should update results in real-time

#### Filters
- In SuitesList: Filter by priority (CRITICAL, HIGH, MEDIUM, LOW) or category
- In SuiteDetail: Filter by case status (passed, failed, pending, running)
- Should show only matching items

#### Sort
- In SuitesList: Sort by priority, name, total cases, category
- Should reorder suites instantly

#### Navigation
- Clicking suite card → opens SuiteDetail
- Clicking case card → opens CaseDetail
- Clicking suite name in CaseDetail → back to SuiteDetail
- Back button → previous screen

## 🎯 Expected Data Structure

### Backend Response (`POST /analyze/suites/discover`)
```json
{
  "success": true,
  "suites": [
    {
      "id": "suite-authentication",
      "name": "🔐 Authentication Suite",
      "category": "authentication",
      "priority": "CRITICAL",
      "description": "Test cases for authentication functionality",
      "testCases": [
        {
          "id": "case-authentication-0",
          "suiteId": "suite-authentication",
          "name": "Login",
          "description": "User logs in with credentials",
          "priority": "CRITICAL",
          "status": "pending",
          "steps": [
            {
              "id": "case-authentication-0-step-0",
              "action": "navigate",
              "target": "/login",
              "selector": null,
              "description": "Navigate to Login page",
              "status": "pending"
            },
            {
              "id": "case-authentication-0-step-1",
              "action": "fill",
              "target": "form",
              "selector": "input[name='email']",
              "description": "Fill email field",
              "status": "pending"
            }
          ],
          "estimatedDuration": 10
        }
      ],
      "stats": {
        "totalCases": 5,
        "totalSteps": 25,
        "estimatedDuration": 50
      },
      "metadata": {
        "routes": ["/login", "/register"],
        "components": ["Login.tsx", "Register.tsx"],
        "apis": ["/api/auth/login"]
      }
    }
  ],
  "totalCases": 15,
  "totalSteps": 75,
  "analysisTime": 1234
}
```

## 🎨 Premium IDE Architecture

### Layout Structure:
```
┌──────────────────────────────────────────────────────────┐
│  Titlebar (Window controls + App title)                │
├────────────┬─────────────────────────────────────────────┤
│            │ ● Project1  [Dashboard] [Suites] [Flows]..│
│  Projects  ├─────────────────────────────────────────────┤
│  Sidebar   │                                            │
│            │  Main Content Area                         │
│ [+] New    │  (Maximum width & height!)                │
│            │                                            │
│ ● Project1 │  ┌──────────────────────────────────────┐ │
│   Project2 │  │                                       │ │
│   Project3 │  │  Content for active tab               │ │
│            │  │  & selected project                   │ │
│            │  │                                       │ │
│            │  │  FULL SCREEN CONTENT!                │ │
│            │  │                                       │ │
│            │  └──────────────────────────────────────┘ │
│            │                                            │
│ ○ :3001    │                                            │
└────────────┴─────────────────────────────────────────────┘
```

### Key Features:
- **Top Navigation Tabs**: Browser-style tabs for Dashboard/Suites/Flows/Settings
- **Project Indicator**: Active project shown in top bar with pulse animation
- **Project Switcher**: Click any project in sidebar to switch
- **Context Menu**: Right-click on project → Rename/Settings/Remove
- **Inline Rename**: Edit project names with Enter/Escape
- **New Project**: Plus button → Launches onboarding wizard
- **WebSocket Status**: Green/Red dot shows backend connection
- **Maximum Space**: Top nav + minimal sidebar = max content area

## 🐛 Known Issues / TODO

1. **Test Generation**: Generate button exists but not connected yet
2. **Test Execution**: Run button exists but not connected yet  
3. **Auto-refresh**: Suites don't auto-refresh when backend data changes
4. **Error Handling**: Basic toast messages, could be more detailed

## 📝 Notes

- **Architecture (Hybrid Layout)**: 
  - **Sidebar (collapsible)** - Hidden by default, toggle with Cmd+B or [≡] button
  - **TopNav** - Sidebar toggle + ProjectSelector dropdown + Tab navigation
  - **ProjectSelector** - Rich dropdown with search, project stats, New/Open actions
  - **Content** - Full width when sidebar hidden, maximum space for suites/cases/steps

- **Key Components**:
  - `ProjectSelector.tsx` - Dropdown for quick project switching
  - `UnifiedSidebar.tsx` - Collapsible project list with close button
  - `TopNav.tsx` - Menu toggle + project selector + tabs
  - `MainLayout.tsx` - Conditional sidebar rendering
  - `SuiteCard.tsx`, `CaseCard.tsx`, `StepItem.tsx` - Suite components

- **State Management**:
  - `useProjectStore` - Projects + sidebar visibility (persisted to localStorage)
  - `useSuiteStore` - Test suites/cases/steps (immer middleware)

- **Keyboard Shortcuts**:
  - `Cmd+B` - Toggle sidebar
  - `Cmd+K` - Command palette
  - `Cmd+1-3` - Quick tab navigation
  - See full list with `Cmd+/`

- **Old files**: Dashboard-old.tsx, ProjectSidebar.tsx, Sidebar.tsx (deprecated)
- **Backend**: Still supports legacy `/analyze/journeys/discover` endpoint
- **Design System**: Glassmorphism, consistent spacing, smooth 200ms animations
- **Color Scheme**: 
  - Status: success (#10b981), error (#ef4444), warning (#f97316), pending (#6b7280)
  - Priority: CRITICAL (#ef4444), HIGH (#f97316), MEDIUM (#eab308), LOW (#6b7280)
  - Primary: #00D4FF, Background: #0A0E14
- **Icons**: Lucide React components for all icons

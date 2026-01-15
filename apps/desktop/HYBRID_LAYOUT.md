# 🎨 Hybrid Layout - Quick Reference

## Overview
Premium IDE-style layout with collapsible sidebar and rich project selector dropdown.

## Key Features

### ✅ Maximum Screen Space
- **Sidebar hidden by default** - More room for content
- **Full-width layout** - Ideal for viewing suites/cases/steps
- **Toggle when needed** - Cmd+B or click [≡]

### 📁 Project Selector Dropdown
Click `[📁 Project Name ▾]` in TopNav to:
- **Quick switch** between recent projects
- **Search** projects by name or path
- **View stats** (suite count, case count)
- **Create new** project (➕ New Project...)
- **Open existing** project (📂 Open Existing...)
- **Project settings** (⚙️ when project is active)

### 🎹 Keyboard Shortcuts
- `Cmd+B` - Toggle sidebar visibility
- `Cmd+K` - Open command palette
- `Cmd+1` - Go to Dashboard
- `Cmd+2` - Go to Test Suites
- `Cmd+3` - Go to Settings
- `Cmd+/` - Show all shortcuts
- `Escape` - Close dropdowns/modals

### 🗂️ Sidebar (When Visible)
- **Project list** with active indicator
- **Quick actions**: [+] New Project, [X] Close Sidebar
- **Context menu**: Right-click project → Rename/Settings/Remove
- **Inline rename**: Edit mode with Enter/Escape
- **WebSocket status**: Connection indicator at bottom

## Usage Examples

### Starting Fresh (No Projects)
1. App opens → TopNav shows `[📁 No Project Selected ▾]`
2. Click dropdown → `➕ New Project...`
3. Follow onboarding wizard
4. Project activates automatically

### Switching Projects
**Fast way (without sidebar):**
1. Click `[📁 Project ▾]` in TopNav
2. Select project from dropdown
3. Dashboard loads with new project

**With sidebar:**
1. Press `Cmd+B` to show sidebar
2. Click on any project in list
3. Sidebar stays open for more browsing

### Maximum Focus Mode
1. Hide sidebar (`Cmd+B` or `[≡]`)
2. Content uses full width
3. Project selector always accessible in TopNav

## UI States

### Default (Sidebar Hidden)
```
┌────────────────────────────────────┐
│ [≡] [📁 Project ▾] [Tabs...]      │ TopNav
├────────────────────────────────────┤
│                                    │
│   FULL WIDTH CONTENT              │
│   Perfect for suite/case/step     │
│   viewing with maximum space      │
│                                    │
└────────────────────────────────────┘
```

### With Sidebar
```
┌──────────┬─────────────────────────┐
│ Projects │ [📁 Project ▾] [Tabs...│
│          ├─────────────────────────┤
│ [+] [X]  │                         │
│          │   Main Content         │
│ ● Proj1  │                         │
│   Proj2  │                         │
│          │                         │
│ ○ :3001  │                         │
└──────────┴─────────────────────────┘
```

## Implementation Details

### New Components
- `ProjectSelector.tsx` - Rich dropdown (380px width, search, stats, actions)
- Updated `TopNav.tsx` - Added Menu button + ProjectSelector
- Updated `UnifiedSidebar.tsx` - Added close button, toggle support
- Updated `MainLayout.tsx` - Conditional sidebar rendering

### State Management
```typescript
useProjectStore:
  - sidebarVisible: boolean (default: false)
  - toggleSidebar()
  - setSidebarVisible(visible)
  - currentProject: ProjectConfig | null
  - recentProjects: ProjectConfig[]
```

### Persistence
- Sidebar visibility state saved to localStorage
- Recent projects list (max 5) persisted
- Last active project restored on app restart

## Benefits

✅ **More space** - Content area maximized by default  
✅ **Quick access** - Project selector always visible  
✅ **Flexible** - User chooses when to show sidebar  
✅ **Professional** - VSCode/IntelliJ-style UX  
✅ **Keyboard-friendly** - All actions have shortcuts  
✅ **Clean UI** - Not cluttered, focused workflow  

## Visual Mockups

Full visual mockups with all states available in:
- `FULL_VISUAL_MOCKUP.md` - Complete 6-screen flow
- `HYBRID_LAYOUT_MOCKUP.md` - Detailed 3-state diagram

---

**Quick Start**: Press `Cmd+B` to toggle sidebar, or click `[≡]` in TopNav! 🚀

# 🎨 Hybrid Layout - Opcija 3

## Vizuelni prikaz:

### 1️⃣ **Sa skrivenim sidebar-om (DEFAULT)** - Maksimalan prostor
```
┌──────────────────────────────────────────────────────────────────┐
│  QAgent                                               ─  □  ✕   │ Titlebar
├──────────────────────────────────────────────────────────────────┤
│ [≡] [📁 My E-Commerce App ▾]  Dashboard  Suites  Flows  Results│ TopNav
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│                                                                   │
│              🎯 FULL WIDTH CONTENT AREA                         │
│                                                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│  │ Suite Card │  │ Suite Card │  │ Suite Card │               │
│  │            │  │            │  │            │               │
│  │  Login     │  │  Checkout  │  │  Search    │               │
│  │  8 cases   │  │  12 cases  │  │  5 cases   │               │
│  └────────────┘  └────────────┘  └────────────┘               │
│                                                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│  │ Suite Card │  │ Suite Card │  │ Suite Card │               │
│  └────────────┘  └────────────┘  └────────────┘               │
│                                                                   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

### 2️⃣ **Sa otvorenim sidebar-om** - Toggle sa [≡] dugmetom
```
┌──────────────────────────────────────────────────────────────────┐
│  QAgent                                               ─  □  ✕   │
├──────────────┬───────────────────────────────────────────────────┤
│              │ [📁 My E-Commerce App ▾]  Dashboard  Suites  Flows│
│  PROJECTS    ├───────────────────────────────────────────────────┤
│  [≡] Close   │                                                   │
│              │           CONTENT AREA                           │
│  [+] New     │                                                   │
│              │  ┌────────────┐  ┌────────────┐                 │
│ ● E-Commerce │  │ Suite Card │  │ Suite Card │                 │
│   Blog Site  │  │            │  │            │                 │
│   Admin Panel│  │  Login     │  │  Checkout  │                 │
│   API Tests  │  │  8 cases   │  │  12 cases  │                 │
│              │  └────────────┘  └────────────┘                 │
│              │                                                   │
│ ○ :3001      │  ┌────────────┐  ┌────────────┐                 │
│              │  │ Suite Card │  │ Suite Card │                 │
└──────────────┴───────────────────────────────────────────────────┘
```

---

### 3️⃣ **Project Selector Dropdown** - Klik na [📁 My E-Commerce App ▾]
```
┌──────────────────────────────────────────────────────────────────┐
│  QAgent                                               ─  □  ✕   │
├──────────────────────────────────────────────────────────────────┤
│ [≡] [📁 My E-Commerce App ▾]  Dashboard  Suites  Flows  Results│
│      ┌─────────────────────────────────┐                        │
│      │ 🔍 Search projects...           │                        │
│      ├─────────────────────────────────┤                        │
│      │ ● My E-Commerce App             │ <- Active             │
│      │   /Users/me/projects/ecommerce  │                        │
│      ├─────────────────────────────────┤                        │
│      │   Blog Site                     │                        │
│      │   /Users/me/projects/blog       │                        │
│      ├─────────────────────────────────┤                        │
│      │   Admin Panel                   │                        │
│      │   /Users/me/projects/admin      │                        │
│      ├─────────────────────────────────┤                        │
│      │   API Test Suite                │                        │
│      │   /Users/me/projects/api-tests  │                        │
│      ├─────────────────────────────────┤                        │
│      │ ➕ New Project...               │ <- Otvara onboarding  │
│      │ 📂 Open Project...              │ <- File picker        │
│      │ ⏱️  Recent Projects        ▸    │                        │
│      └─────────────────────────────────┘                        │
│                                                                   │
│              CONTENT AREA                                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Ključne karakteristike:

### **TopNav komponente:**
```
[≡]  - Toggle sidebar (pokazuje/skriva projekte)
[📁 Project Name ▾]  - Dropdown za brz switching
[Dashboard] [Suites] [Flows] [Results] [Settings]  - Tab navigacija
```

### **Sidebar (opciono):**
- Toggle sa `Cmd+B` ili `[≡]` dugme
- Lista svih projekata
- `[+] New` - Otvara onboarding wizard
- WebSocket status indicator
- Hover za full path tooltip

### **Project Dropdown:**
- Search bar za filtriranje
- Ikona statusa (● active, ○ inactive)
- Full path ispod imena
- `➕ New Project` - Direktno u dropdown
- `📂 Open Project` - File picker
- Keyboard navigation (Arrow keys + Enter)

---

## 🚀 User Flow:

### **Scenario 1: Novi korisnik**
1. App se otvara → Nema projekata
2. TopNav pokazuje: `[📁 No Project Selected ▾]`
3. Klik na dropdown → `➕ New Project...`
4. Onboarding wizard → Kreiranje projekta
5. Automatski se aktivira novi projekat

### **Scenario 2: Switching projekata**
- **Brzo:** Klik na `[📁 Project ▾]` → Select drugi projekat
- **Sa sidebar-om:** `[≡]` → Klik na projekat u listi

### **Scenario 3: Rad sa projektom**
- Sidebar skriven (više prostora)
- Tabs za navigaciju (Dashboard, Suites, Flows...)
- Fokus na suites/cases/steps

---

## 💡 Prednosti ovog pristupa:

✅ **Maximum screen space** - Sidebar samo kad treba  
✅ **Quick switching** - Dropdown je uvek dostupan  
✅ **Professional** - VSCode/IntelliJ stil  
✅ **Flexible** - Korisnik bira da li hoće sidebar  
✅ **Keyboard friendly** - Cmd+B, Arrow keys  
✅ **Clean UI** - Nije cluttered  
✅ **Search projects** - Brzo pronalaženje sa puno projekata  

---

## 🎨 Design detalji:

### **Boje i stilovi:**
```css
TopNav Height: 48px
Sidebar Width: 240px (kad je otvoren)
Project Dropdown: 320px width, max 400px height
Active Project: #00D4FF indicator
Hover: rgba(255,255,255,0.1)
Glassmorphism: backdrop-blur-xl, bg-black/40
```

### **Animacije:**
- Sidebar slide: 200ms ease-out
- Dropdown fade: 150ms ease-in-out
- Tab switch: opacity 200ms

---

## 🔧 Implementacija:

### **Nove komponente:**
1. `ProjectSelector.tsx` - Dropdown sa search i listom
2. `TopNav.tsx` - Update sa sidebar toggle + project selector
3. `UnifiedSidebar.tsx` - Opciono (collapse/expand)

### **State management:**
```typescript
useProjectStore:
  - sidebarVisible: boolean
  - toggleSidebar()
  - currentProject
  - projects[]
```

### **Keyboard shortcuts:**
- `Cmd+B` - Toggle sidebar
- `Cmd+K` - Open project selector
- `Cmd+N` - New project
- `Cmd+O` - Open project
- `Cmd+1-5` - Switch tabs

---

Ovako bi izgledao **Hybrid pristup**! 🎉

Sviđa ti se? Želiš li neke izmene ili da odmah implementiramo?

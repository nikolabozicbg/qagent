# QAgent - Complete Setup Guide 🚀

## Project Overview

**QAgent** is an AI-powered test generation platform that converts specification documents into comprehensive test suites.

- **Frontend**: Next.js 14 + Tailwind CSS + shadcn/ui
- **Backend**: NestJS (to be implemented)
- **Monorepo**: Turborepo

---

## 📁 Project Structure

```
qagent/
├── apps/
│   ├── frontend/          Next.js 14 application
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx                # Landing page
│   │   │   │   ├── upload/page.tsx         # Upload page
│   │   │   │   ├── result/page.tsx         # Results page
│   │   │   │   └── layout.tsx              # Root layout
│   │   │   ├── components/
│   │   │   │   ├── ui/                     # shadcn components
│   │   │   │   ├── subscription/           # Pro modal & paywall
│   │   │   │   └── UploadBox.tsx           # Upload component
│   │   │   ├── hooks/
│   │   │   │   └── useSubscription.ts      # Subscription state
│   │   │   └── lib/
│   │   │       ├── utils.ts                # Utilities
│   │   │       └── copy.ts                 # Clipboard helper
│   │   ├── public/
│   │   │   ├── logo.svg                    # QAgent logo
│   │   │   └── favicon.svg                 # Favicon
│   │   └── brand/                          # Brand assets
│   │
│   └── backend/           NestJS API (placeholder)
│
├── packages/
│   ├── ui/                Shared components
│   └── config/            Shared configs
│
├── FRONTEND_SETUP.md      Initial setup docs
├── MVP_FEATURES.md        MVP feature list
├── SUBSCRIPTION_SYSTEM.md Paywall documentation
└── README.md              This file
```

---

## 🎯 Features

### ✅ Implemented

#### **Landing Page** (`/`)
- Hero section with branding
- 3-step process explanation
- Feature showcase
- Call-to-action

#### **Upload Page** (`/upload`)
- File upload (PDF, DOCX, TXT)
- File validation (type & size)
- Progress tracking
- Multi-step loading states
- Error handling

#### **Result Page** (`/result`)
- Tabbed interface with icons
- 4 output types:
  - 💡 Scenarios
  - 🧪 Test Cases
  - 🧫 Gherkin
  - 💻 Automation (Pro)
- Copy to clipboard (Pro)
- Export as JSON/TXT (Pro)
- Pro/Free tier indicators

#### **Subscription System**
- Mock Pro/Free tiers
- Pro modal with email capture
- Paywall on premium features
- Easy demo mode toggle

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 10+

### Installation

```bash
# Clone & install
cd qagent
npm install

# Start frontend
cd apps/frontend
npm run dev
```

Frontend: **http://localhost:3000**

### Build

```bash
# Test production build
cd apps/frontend
npm run build
```

---

## 🔧 Configuration

### Environment Variables

**File:** `apps/frontend/.env.local`

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### Toggle Pro Mode (Demo)

**File:** `apps/frontend/src/hooks/useSubscription.ts`

```typescript
// Free mode (default)
const [isPro] = useState(false);

// Pro mode (for demos)
const [isPro] = useState(true);
```

---

## 📋 Available Scripts

### Root Level
```bash
npm run dev        # Start all apps in dev mode
npm run build      # Build all apps
npm run lint       # Lint all code
npm run test       # Run all tests
npm run clean      # Clean build artifacts
```

### Frontend Only
```bash
cd apps/frontend
npm run dev        # Start dev server
npm run build      # Production build
npm start          # Start production server
npm run lint       # Lint code
```

---

## 🎨 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3
- **Components**: shadcn/ui
- **Icons**: Lucide React
- **HTTP**: Axios
- **Notifications**: Sonner
- **Build**: Turbopack

### Backend (Placeholder)
- **Framework**: NestJS
- **Database**: TBD
- **AI**: OpenAI API (planned)

---

## 📊 Build Stats

```
Route                    Size        First Load JS
/                        11.4 kB     98.3 kB
/upload                  2.01 kB     129 kB
/result                  18 kB       145 kB
```

**Total Size**: ~31.4 kB (gzipped)

---

## 🔒 Pro Features

### Free Tier
- ✅ Upload specifications
- ✅ Generate test suites
- ✅ View 3 output formats:
  - Scenarios
  - Test Cases
  - Gherkin

### Pro Tier
- ✅ All Free features
- ✅ Automation code generation
- ✅ Copy to clipboard
- ✅ Export as JSON/TXT
- ✅ Unlimited generations
- ✅ Priority support

---

## 🎬 User Flow

```
1. Landing Page
   └─> Click "Try it now"

2. Upload Page
   └─> Select file (PDF/DOCX/TXT)
   └─> Click "Generate Test Suite"

3. Processing
   └─> Extracting text...
   └─> Generating tests...

4. Result Page
   └─> View scenarios, test cases, gherkin
   └─> (Pro) Export or copy results
   └─> (Pro) View automation code
```

---

## 📚 Documentation

- **[FRONTEND_SETUP.md](FRONTEND_SETUP.md)** - Initial setup & installation
- **[MVP_FEATURES.md](MVP_FEATURES.md)** - Complete feature list
- **[SUBSCRIPTION_SYSTEM.md](SUBSCRIPTION_SYSTEM.md)** - Paywall documentation

---

## 🧪 Testing

### Manual Testing Checklist

#### Free Mode
- [ ] Upload validates file types
- [ ] Upload validates file size (10MB max)
- [ ] Progress messages display
- [ ] Results show 3 free tabs
- [ ] Automation tab is locked
- [ ] Copy shows "(Pro)" and is disabled
- [ ] Export shows "(Pro)" and is disabled
- [ ] Pro modal appears on click
- [ ] Email capture works

#### Pro Mode
- [ ] All 4 tabs are enabled
- [ ] Copy button works
- [ ] Export JSON works
- [ ] Export TXT works
- [ ] No Pro modals appear
- [ ] No locked features

---

## 🚧 Roadmap

### Phase 1 - MVP ✅ DONE
- [x] Landing page
- [x] File upload
- [x] Result display
- [x] Pro/Free tiers
- [x] Email capture

### Phase 2 - Backend
- [ ] NestJS API setup
- [ ] File processing (PDF/DOCX/TXT)
- [ ] OpenAI integration
- [ ] Test generation logic
- [ ] Result storage

### Phase 3 - Auth & Payments
- [ ] User authentication (Clerk/Auth0)
- [ ] Stripe integration
- [ ] Subscription management
- [ ] User dashboard
- [ ] Usage tracking

### Phase 4 - Advanced Features
- [ ] Test history
- [ ] Custom templates
- [ ] Team collaboration
- [ ] API access
- [ ] Webhooks

---

## 🐛 Known Issues

### Current
- Backend not implemented (mock only)
- Email capture has no storage
- isPro state resets on refresh

### To Fix
- Implement real backend
- Add database for emails
- Add user authentication
- Persistent subscription state

---

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

---

## 📝 Scripts Reference

### Enhancement Scripts

Located in root directory:

- `enhance-frontend.sh` - Initial frontend setup
- `enhance-mvp.sh` - Add MVP features
- `add-subscription.sh` - Add paywall system

All scripts are idempotent and can be re-run safely.

---

## 🎯 Demo Instructions

### For Presentations (Pro Mode)

1. **Enable Pro Mode**:
   ```bash
   # Edit: apps/frontend/src/hooks/useSubscription.ts
   const [isPro] = useState(true);
   ```

2. **Rebuild**:
   ```bash
   cd apps/frontend
   npm run build
   npm run dev
   ```

3. **Demo Flow**:
   - Show landing page
   - Upload sample file
   - Show all 4 tabs unlocked
   - Demonstrate copy & export
   - Show automation code

### For User Testing (Free Mode)

1. **Ensure Free Mode**:
   ```bash
   # apps/frontend/src/hooks/useSubscription.ts
   const [isPro] = useState(false);
   ```

2. **Test Flow**:
   - Upload file
   - View free tabs
   - Try Pro features → Modal appears
   - Enter email
   - Verify toast notification

---

## 📧 Contact & Support

- **Project**: QAgent
- **Version**: 1.0.0-mvp
- **Status**: MVP Complete
- **Last Updated**: 2025-11-17

---

## ✨ Quick Tips

### Fastest Way to Test
```bash
cd apps/frontend && npm run dev
# Open http://localhost:3000
```

### Toggle Pro Mode
```typescript
// apps/frontend/src/hooks/useSubscription.ts
const [isPro] = useState(true); // or false
```

### Clear Build Cache
```bash
npm run clean
npm install
```

### View All Ports
```
Frontend: http://localhost:3000
Backend:  http://localhost:3001 (not implemented)
```

---

**Status**: ✅ Frontend MVP Complete  
**Build**: ✅ Successful  
**Ready For**: Demo, User Testing, Backend Integration

**Next Step**: Implement backend API

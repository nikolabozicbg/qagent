# Live Discovery E2E Test Guide

**Date:** December 30, 2024
**Feature:** Real-time WebSocket discovery with live progress updates

---

## ✅ Prerequisites

1. **Backend running** (you start it manually)
   ```bash
   cd apps/backend
   npm run start:dev
   ```
   - Should see: `Nest application successfully started`
   - Port: `3001`

2. **VSCode extension compiled**
   ```bash
   cd apps/vscode-extension
   npm run compile
   ```
   - ✅ Already done

3. **Test project open**
   - Open Cypress Real World App in VSCode
   - Path: `/Users/nikolabozic/Projects/cypress-realworld-app`

---

## 🧪 Test Steps

### Step 1: Open Command Palette
- Press `Cmd+Shift+P` (Mac)
- Type: `QAgenAI: Live Smart Discovery`
- Select command

### Step 2: Watch Live Progress
You should see **VSCode notification** with live updates:

```
🧠 Smart Discovery in Progress

📦 47 components • 🛣️ 12 routes • 🌐 23 APIs
```

Then:
```
✨ Found: User Authentication (95% confidence)
✨ Found: User Registration (95% confidence)
✨ Found: Article Creation (95% confidence)
```

Finally:
```
✅ Complete! 6 journeys • 87% coverage
```

### Step 3: Check Results
After completion, you should see message:
```
✅ Discovery complete! Found X journeys (87% coverage) in Ys
```

---

## 🔍 What to Check

### ✅ Frontend (VSCode)
1. **Command appears** in palette
2. **Progress notification shows**
3. **Live updates display** (components, routes, APIs count)
4. **Journey discoveries show** with confidence scores
5. **Completion message** appears
6. **No errors** in Output panel (QAgenAI)

### ✅ Backend (Terminal)
1. **WebSocket connection** log:
   ```
   Client connected: <socket-id>
   Client <id> joined discovery room: discovery:/path/to/project
   ```

2. **Discovery events** logged:
   ```
   🧠 Smart Journey Discovery started...
   📦 Analyzed 47 components
   ✅ Total discovered: 6 journeys
   ```

3. **WebSocket emissions** (should see in logs)

---

## 🐛 Troubleshooting

### Problem: "Backend not available"
**Solution:**
- Check backend is running on port 3001
- Run: `curl http://localhost:3001/system/health`
- Should return: `{"status":"ok"}`

### Problem: "Connection failed"
**Solution:**
- Check WebSocket namespace is correct (`/discovery`)
- Check CORS settings in backend
- Try: `curl http://localhost:3001/socket.io/`

### Problem: "No progress updates"
**Solution:**
- Check backend logs for event emissions
- Check VSCode Output panel (QAgenAI) for connection logs
- Verify `gateway.emitToWorkspace()` is being called

### Problem: TypeScript errors
**Solution:**
- Recompile extension: `npm run compile`
- Reload VSCode window: `Cmd+Shift+P` → `Developer: Reload Window`

---

## 📊 Expected Output

### Backend Logs
```
[Nest] INFO Client connected: abc123
[Nest] INFO Client abc123 joined discovery room: discovery:/Users/.../cypress-realworld-app
🧠 Smart Journey Discovery started...
📦 Analyzed 47 components
🔬 Running parallel journey discovery strategies...
  • Strategy 1: Graph-based navigation analysis
    → Found 6 graph journeys
  • Strategy 2: Form-based journey detection
    → Found 0 form journeys
  • Strategy 3: Intent-based synthesis
    → Found 0 synthesized journeys
✅ Total discovered: 6 journeys
```

### VSCode Output (QAgenAI)
```
[09:45:23] Starting live smart discovery...
[DiscoveryLive] Starting discovery session: /Users/.../cypress-realworld-app
[DiscoveryLive] Connected to WebSocket
[DiscoveryLive] Progress update: init
[DiscoveryLive] Progress update: component { componentsCount: 47 }
[DiscoveryLive] Progress update: route { routesCount: 6 }
[DiscoveryLive] Progress update: journey { name: 'User Authentication' }
[DiscoveryLive] Progress update: complete { totalJourneys: 6 }
[DiscoveryLive] Discovery completed successfully
Discovery completed: 6 journeys, 87% coverage
[DiscoveryLive] Disconnected from WebSocket
```

### VSCode Notification Timeline
```
[0s]  🧠 Smart Discovery in Progress
      Initializing scan...

[2s]  📦 47 components • 🛣️ 0 routes • 🌐 0 APIs

[5s]  📦 47 components • 🛣️ 6 routes • 🌐 0 APIs

[7s]  ✨ Found: User Authentication (95% confidence)

[8s]  ✨ Found: User Registration (95% confidence)

[9s]  ✨ Found: Article Creation (95% confidence)

[10s] ✅ Complete! 6 journeys • 87% coverage
```

---

## 🎯 Success Criteria

- [x] Backend compiles without errors
- [x] Extension compiles without errors
- [ ] WebSocket connection established
- [ ] Live progress updates visible
- [ ] Journey discoveries show in real-time
- [ ] Completion event received
- [ ] Dashboard refreshes with new data
- [ ] No errors in console/logs

---

## 🚀 Next Steps After Test

If test passes:
1. ✅ Mark Phase 1.1 as complete
2. Move to Phase 1.2: Dashboard redesign
3. Add Progress Webview (visual dashboard)

If test fails:
1. Check logs for specific error
2. Debug WebSocket connection
3. Verify event emission
4. Fix and retry

---

## 📝 Notes

- Backend WebSocket: `http://localhost:3001/discovery`
- Extension uses: `socket.io-client` v4.8.3
- Backend uses: `@nestjs/websockets` v10.x + `socket.io`
- SOLID architecture: 3 services (WebSocketClient, ProgressNotifier, DiscoveryLiveService)

**Ready to test!** 🎉

Make sure:
1. Backend is running (`npm run start:dev` in apps/backend)
2. Open Cypress RWA in VSCode
3. Run command: `QAgenAI: Live Smart Discovery`

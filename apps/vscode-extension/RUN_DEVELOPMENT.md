# Running QAgenAI Extension in Development Mode

## Problem
When you use "Reload Window", VS Code reloads the **installed** extension, not your development version with latest code changes.

## Solution: Run Extension in Debug Mode

### Step 1: Open Extension Project
1. Open **NEW VS Code window**
2. File → Open Folder
3. Select: `/Users/nikolabozic/Projects/qagent/apps/vscode-extension`

### Step 2: Start Debug Mode
1. Press **F5** (or Run → Start Debugging)
2. This opens **Extension Development Host** window
3. This window runs your **latest compiled code**

### Step 3: Test in Development Host
In the **Extension Development Host** window:
1. Open your React project (truthy-frontend)
2. Run QAgenAI commands
3. Tests will be generated with **latest backend code**

### Step 4: View Output
In the **original** VS Code window (extension dev):
- View → Output → Select "QAgenAI" from dropdown
- See extension logs in real-time

## Alternative: Rebuild and Reinstall Extension

If you want to test as installed extension:

```bash
cd /Users/nikolabozic/Projects/qagent/apps/vscode-extension

# Build VSIX package
npm run package

# Install in VS Code
code --install-extension qagenai-0.1.0.vsix --force
```

Then reload VS Code window.

## Verify Extension Code

Check if extension uses backend API:

```bash
grep "backendAPI.generateTestForJourney" out/extension.js
```

Should output:
```
187:   const testResult = await backendAPI.generateTestForJourney(journey, workspaceRoot);
```

## Current Status

✅ Backend is correct (returns unique test names)
✅ Extension code is correct (calls backend API)
❌ Extension runtime is using OLD CODE (installed version, not development)

**Solution**: Use F5 debug mode or rebuild + reinstall extension.

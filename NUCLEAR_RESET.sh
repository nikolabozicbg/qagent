#!/bin/bash

echo "☢️  NUCLEAR RESET - QAgenAI VS Code Extension"
echo "This will delete ALL extension state and caches"
echo ""

WORKSPACE_PATH="/Users/nikolabozic/Projects/react-redux-realworld-example-app"

# 1. Find and clear workspace storage
echo "1️⃣  Clearing workspace storage..."
WORKSPACE_STORAGE_DIRS=$(find ~/Library/Application\ Support/Code/User/workspaceStorage -type f -name "workspace.json" -exec grep -l "$WORKSPACE_PATH" {} \; 2>/dev/null | sed 's|/workspace.json||')

if [ -n "$WORKSPACE_STORAGE_DIRS" ]; then
  for DIR in $WORKSPACE_STORAGE_DIRS; do
    STATE_FILE="$DIR/state.vscdb"
    if [ -f "$STATE_FILE" ]; then
      echo "   🗑️  Deleting: $STATE_FILE"
      rm -f "$STATE_FILE"
    fi
  done
  echo "   ✅ workspaceState cleared"
else
  echo "   ⚠️  No workspace storage found"
fi

# 2. Clear global state
echo ""
echo "2️⃣  Clearing globalState..."
GLOBAL_STORAGE=~/Library/Application\ Support/Code/User/globalStorage/state.vscdb
if [ -f "$GLOBAL_STORAGE" ]; then
  echo "   🗑️  Deleting: $GLOBAL_STORAGE"
  rm -f "$GLOBAL_STORAGE"
  echo "   ✅ globalState cleared"
else
  echo "   ⚠️  globalState not found"
fi

# 3. Clear extension logs
echo ""
echo "3️⃣  Clearing extension logs..."
find ~/Library/Application\ Support/Code/logs -name "*qagenai*" -delete 2>/dev/null
echo "   ✅ Logs cleared"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ NUCLEAR RESET COMPLETE!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📋 Next steps:"
echo "1. RELOAD VS Code (Cmd+Shift+P → 'Developer: Reload Window')"
echo "2. Open react-redux-realworld-example-app workspace"
echo "3. Click QAgenAI sidebar icon"
echo "4. Start onboarding:"
echo "   - Framework detection (auto)"
echo "   - E2E setup → Playwright install (uses --legacy-peer-deps)"
echo "   - Flow discovery (holistic analysis)"
echo "5. Generate test for 'Complete Login' flow"
echo ""
echo "Expected result: Test with REAL selectors!"
echo "  ✅ await page.fill('[placeholder=\"Email\"]', ...)"
echo "  ✅ await page.fill('[placeholder=\"Password\"]', ...)"
echo "  ✅ await page.click('button[type=\"submit\"]')"
echo "  ✅ API validation with /auth/login"
echo ""

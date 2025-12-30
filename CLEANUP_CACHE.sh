#!/bin/bash

echo "🧹 Cleaning QAgenAI Extension Cache..."
echo ""

# VS Code storage locations
VSCODE_GLOBAL="$HOME/Library/Application Support/Code/User/globalStorage/undefined_publisher.qagenai"
VSCODE_WORKSPACE="$HOME/Library/Application Support/Code/User/workspaceStorage"

echo "📍 Searching for cached flows..."

# Find all workspace storage with QAgenAI data
FOUND=0
for dir in "$VSCODE_WORKSPACE"/*; do
  if [ -f "$dir/state.vscdb" ]; then
    if strings "$dir/state.vscdb" 2>/dev/null | grep -q "qagenai"; then
      echo "   Found: $dir"
      FOUND=$((FOUND + 1))
      
      # Backup
      cp "$dir/state.vscdb" "$dir/state.vscdb.backup.$(date +%s)" 2>/dev/null
      
      # Clear QAgen AI workspace state by removing the database
      # VS Code will recreate it fresh
      rm -f "$dir/state.vscdb" 2>/dev/null
      echo "   ✅ Cleared workspace cache"
    fi
  fi
done

# Clear global state
if [ -d "$VSCODE_GLOBAL" ]; then
  echo "   Found global storage"
  mv "$VSCODE_GLOBAL" "${VSCODE_GLOBAL}.backup.$(date +%s)" 2>/dev/null
  echo "   ✅ Cleared global cache"
  FOUND=$((FOUND + 1))
fi

if [ $FOUND -eq 0 ]; then
  echo "   ℹ️  No cached data found (clean state)"
else
  echo ""
  echo "✅ Cache cleared! ($FOUND locations)"
  echo ""
  echo "📝 Next steps:"
  echo "   1. Reload VS Code extension (Cmd+R or F5)"
  echo "   2. Open Dashboard"
  echo "   3. Discover Flows (will fetch fresh data with _journeyData)"
  echo "   4. Generate Test"
fi

echo ""
echo "🎯 All backups saved with timestamp suffix"

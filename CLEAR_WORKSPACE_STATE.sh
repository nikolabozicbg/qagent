#!/bin/bash

# QAgenAI - Clear VS Code Workspace State (flows cache)
# This clears the workspaceState where flows are cached WITHOUT journeyData

echo "🧹 Clearing VS Code Workspace State (flows cache)..."

# React Redux Realworld App
WORKSPACE_PATH="/Users/nikolabozic/Projects/react-redux-realworld-example-app"

# Find all workspace storage directories
WORKSPACE_STORAGE_DIRS=$(find ~/Library/Application\ Support/Code/User/workspaceStorage -type f -name "workspace.json" -exec grep -l "$WORKSPACE_PATH" {} \; | sed 's|/workspace.json||' 2>/dev/null)

if [ -z "$WORKSPACE_STORAGE_DIRS" ]; then
  echo "❌ No workspace storage found for $WORKSPACE_PATH"
  echo "✅ Nothing to clean!"
  exit 0
fi

echo "Found workspace storage directories:"
echo "$WORKSPACE_STORAGE_DIRS"

# Clear state.vscdb files
echo ""
for DIR in $WORKSPACE_STORAGE_DIRS; do
  STATE_FILE="$DIR/state.vscdb"
  if [ -f "$STATE_FILE" ]; then
    echo "🗑️  Deleting: $STATE_FILE"
    rm -f "$STATE_FILE"
  fi
done

echo ""
echo "✅ Workspace state cleared!"
echo ""
echo "📋 Next steps:"
echo "1. Reload VS Code window (Cmd+Shift+P → 'Developer: Reload Window')"
echo "2. Run 'Discover Flows' again"
echo "3. Generate test - should now use journeyData!"

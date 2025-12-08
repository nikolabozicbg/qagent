#!/bin/bash

# ============================================
# Clean Test Frameworks & Tests Script
# Run this to reset project for fresh testing
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🧹 Cleaning test frameworks and tests from: $PROJECT_DIR"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to confirm action
confirm() {
    read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
}

echo -e "${YELLOW}⚠️  This will remove:${NC}"
echo "   - All test files (*.test.*, *.spec.*)"
echo "   - Test directories (__tests__, tests/)"
echo "   - Jest configuration"
echo "   - Playwright configuration & tests"
echo "   - Vitest configuration"
echo "   - Test-related dependencies from package.json"
echo ""

confirm

cd "$PROJECT_DIR"

# ============================================
# 1. Remove test files
# ============================================
echo -e "\n${GREEN}[1/6]${NC} Removing test files..."

# Remove .test. and .spec. files
find . -type f \( -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.test.js" -o -name "*.test.jsx" \) \
    -not -path "./node_modules/*" -delete 2>/dev/null && echo "   ✓ Removed *.test.* files" || echo "   - No *.test.* files found"

find . -type f \( -name "*.spec.ts" -o -name "*.spec.tsx" -o -name "*.spec.js" -o -name "*.spec.jsx" \) \
    -not -path "./node_modules/*" -delete 2>/dev/null && echo "   ✓ Removed *.spec.* files" || echo "   - No *.spec.* files found"

# ============================================
# 2. Remove test directories
# ============================================
echo -e "\n${GREEN}[2/6]${NC} Removing test directories..."

# Remove __tests__ directories
find . -type d -name "__tests__" -not -path "./node_modules/*" -exec rm -rf {} + 2>/dev/null && \
    echo "   ✓ Removed __tests__ directories" || echo "   - No __tests__ directories found"

# Remove tests/ directory at root
[ -d "./tests" ] && rm -rf "./tests" && echo "   ✓ Removed tests/ directory" || echo "   - No tests/ directory found"

# Remove e2e/ directory
[ -d "./e2e" ] && rm -rf "./e2e" && echo "   ✓ Removed e2e/ directory" || echo "   - No e2e/ directory found"

# Remove playwright test results
[ -d "./test-results" ] && rm -rf "./test-results" && echo "   ✓ Removed test-results/" || true
[ -d "./playwright-report" ] && rm -rf "./playwright-report" && echo "   ✓ Removed playwright-report/" || true

# ============================================
# 3. Remove config files
# ============================================
echo -e "\n${GREEN}[3/6]${NC} Removing test configuration files..."

# Jest configs
[ -f "jest.config.js" ] && rm "jest.config.js" && echo "   ✓ Removed jest.config.js" || true
[ -f "jest.config.ts" ] && rm "jest.config.ts" && echo "   ✓ Removed jest.config.ts" || true
[ -f "jest.config.mjs" ] && rm "jest.config.mjs" && echo "   ✓ Removed jest.config.mjs" || true
[ -f "jest.setup.js" ] && rm "jest.setup.js" && echo "   ✓ Removed jest.setup.js" || true
[ -f "jest.setup.ts" ] && rm "jest.setup.ts" && echo "   ✓ Removed jest.setup.ts" || true

# Playwright configs
[ -f "playwright.config.ts" ] && rm "playwright.config.ts" && echo "   ✓ Removed playwright.config.ts" || true
[ -f "playwright.config.js" ] && rm "playwright.config.js" && echo "   ✓ Removed playwright.config.js" || true

# Vitest configs
[ -f "vitest.config.ts" ] && rm "vitest.config.ts" && echo "   ✓ Removed vitest.config.ts" || true
[ -f "vitest.config.js" ] && rm "vitest.config.js" && echo "   ✓ Removed vitest.config.js" || true

# ============================================
# 4. Remove test dependencies
# ============================================
echo -e "\n${GREEN}[4/6]${NC} Removing test dependencies..."

# List of test-related packages to remove
TEST_PACKAGES=(
    "@playwright/test"
    "playwright"
    "jest"
    "@types/jest"
    "ts-jest"
    "@testing-library/react"
    "@testing-library/jest-dom"
    "@testing-library/user-event"
    "vitest"
    "@vitest/ui"
    "chromatic"
    "@chromatic-com/storybook"
    "cypress"
)

for pkg in "${TEST_PACKAGES[@]}"; do
    if grep -q "\"$pkg\"" package.json 2>/dev/null; then
        npm uninstall "$pkg" --save-dev 2>/dev/null && echo "   ✓ Uninstalled $pkg" || true
    fi
done

# ============================================
# 5. Remove test scripts from package.json
# ============================================
echo -e "\n${GREEN}[5/6]${NC} Cleaning package.json scripts..."

# Use node to clean scripts (safer than sed for JSON)
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const testScripts = ['test', 'test:watch', 'test:coverage', 'test:e2e', 'e2e', 'playwright', 'vitest'];
let removed = [];

if (pkg.scripts) {
    testScripts.forEach(s => {
        if (pkg.scripts[s]) {
            delete pkg.scripts[s];
            removed.push(s);
        }
    });
}

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
if (removed.length > 0) {
    console.log('   ✓ Removed scripts: ' + removed.join(', '));
} else {
    console.log('   - No test scripts found');
}
"

# ============================================
# 6. Clean coverage directories
# ============================================
echo -e "\n${GREEN}[6/6]${NC} Cleaning coverage data..."

[ -d "./coverage" ] && rm -rf "./coverage" && echo "   ✓ Removed coverage/" || echo "   - No coverage/ directory"
[ -d "./.nyc_output" ] && rm -rf "./.nyc_output" && echo "   ✓ Removed .nyc_output/" || true

# ============================================
# Done
# ============================================
echo ""
echo -e "${GREEN}✅ Clean complete!${NC}"
echo ""
echo "Project is now ready for fresh test framework installation."
echo "Use QAgenAI extension to set up testing from scratch."
echo ""

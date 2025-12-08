// Test script to verify E2E detection logic
const path = require('path');

// Simulate the detection logic from agent.service.ts
function detectE2ETest(filePath) {
  const sourceDir = path.dirname(filePath);
  
  const isE2ETest = sourceDir.includes('/e2e') || sourceDir.includes('\\e2e') || 
                    sourceDir.includes('/tests/e2e') || sourceDir.includes('\\tests\\e2e') ||
                    sourceDir.includes('/integration') || sourceDir.includes('\\integration');
  
  return {
    filePath,
    sourceDir,
    isE2ETest
  };
}

// Test cases
const testCases = [
  '/Users/nikolabozic/Projects/qagent/apps/frontend/tests/e2e/page.spec.tsx',
  '/Users/nikolabozic/Projects/qagent/apps/frontend/src/components/Button.tsx',
  '/Users/nikolabozic/Projects/qagent/apps/backend/tests/integration/api.test.ts',
  '/Users/nikolabozic/Projects/qagent/apps/backend/src/services/payment.service.ts',
];

console.log('🧪 E2E Detection Test Results:\n');

testCases.forEach(filePath => {
  const result = detectE2ETest(filePath);
  console.log(`📁 ${path.basename(filePath)}`);
  console.log(`   Directory: ${result.sourceDir}`);
  console.log(`   Is E2E: ${result.isE2ETest ? '✅ YES' : '❌ NO'}`);
  console.log('');
});

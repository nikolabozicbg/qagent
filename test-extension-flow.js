#!/usr/bin/env node
/**
 * Test Extension Flow - Simulates VS Code extension test generation
 * 
 * This script:
 * 1. Gets enriched context from backend (like OnboardingService does)
 * 2. Passes it to test generator (like TestGenerationService does)
 * 3. Generates Playwright test code
 * 4. Validates test quality
 */

const fs = require('fs');
const path = require('path');

// Mock console.log for VS Code's log function
global.console = {
  ...console,
  log: (...args) => console.info('[TEST]', ...args)
};

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  TESTING EXTENSION FLOW - TEST GENERATION                ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // STEP 1: Get enriched context from backend (simulating OnboardingService)
  console.log('📊 STEP 1: Getting enriched journey context from backend...');
  
  const journey = {
    name: 'User Login Journey',
    description: 'User authentication flow',
    steps: [],
    components: [
      { name: 'loginForm', path: 'app/containers/LoginPage/loginForm.js' }
    ]
  };

  const backendUrl = 'http://localhost:3001';
  const response = await fetch(`${backendUrl}/analyze/journey-context`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      journey,
      workspacePath: '/Users/nikolabozic/Projects/truthy-frontend'
    })
  });

  if (!response.ok) {
    console.error('❌ Backend error:', response.status);
    process.exit(1);
  }

  const result = await response.json();
  if (!result.success) {
    console.error('❌ Journey analysis failed:', result.error);
    process.exit(1);
  }

  const enrichedContext = result.context;
  console.log('✅ Enriched context received');
  console.log(`   Components: ${enrichedContext.componentsAnalysis.length}`);
  console.log(`   Elements: ${enrichedContext.componentsAnalysis[0].elements.length}`);
  console.log(`   Validations: ${enrichedContext.componentsAnalysis[0].validations.length}`);
  console.log(`   APIs: ${enrichedContext.componentsAnalysis[0].apiCalls.length}\n`);

  // STEP 2: Load test generator service (simulating TestGenerationService)
  console.log('🤖 STEP 2: Loading EnhancedTestGeneratorService...');
  
  // Load the compiled JS from VS Code extension
  const { EnhancedTestGeneratorService } = require('./apps/vscode-extension/out/services/enhanced-test-generator.service.js');
  
  const generator = new EnhancedTestGeneratorService();
  console.log('✅ Generator loaded\n');

  // STEP 3: Generate test
  console.log('⚙️  STEP 3: Generating Playwright test...');
  
  const testCode = await generator.generateTest(enrichedContext);
  const filename = generator.getTestFileName(enrichedContext.journey.name);
  
  console.log(`✅ Test generated: ${filename}`);
  console.log(`   Lines of code: ${testCode.split('\n').length}\n`);

  // STEP 4: Save and analyze test
  const outputPath = `/tmp/${filename}`;
  fs.writeFileSync(outputPath, testCode);
  console.log(`💾 Test saved to: ${outputPath}\n`);

  // STEP 5: Validate test quality
  console.log('🔍 STEP 4: VALIDATING TEST QUALITY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const validation = {
    hasImports: testCode.includes('import { test, expect }'),
    hasDescribe: testCode.includes('test.describe'),
    hasHappyPath: testCode.includes('should successfully complete'),
    usesRealSelectors: testCode.includes('#username') || testCode.includes('#password'),
    hasValidationTests: testCode.includes('VALIDATION TESTS'),
    hasAPIValidation: testCode.includes('waitForResponse'),
    hasErrorHandling: testCode.includes('ERROR HANDLING') || testCode.includes('error'),
    linesOfCode: testCode.split('\n').length,
  };

  console.log('Test Quality Metrics:');
  console.log(`  ${validation.hasImports ? '✅' : '❌'} Proper imports (Playwright)`);
  console.log(`  ${validation.hasDescribe ? '✅' : '❌'} test.describe block`);
  console.log(`  ${validation.hasHappyPath ? '✅' : '❌'} Happy path test case`);
  console.log(`  ${validation.usesRealSelectors ? '✅' : '❌'} Real selectors from code (#username, #password)`);
  console.log(`  ${validation.hasValidationTests ? '✅' : '❌'} Validation test cases`);
  console.log(`  ${validation.hasAPIValidation ? '✅' : '❌'} API response validation`);
  console.log(`  ${validation.hasErrorHandling ? '✅' : '❌'} Error handling tests`);
  console.log(`  📏 Lines of code: ${validation.linesOfCode}`);

  const passedChecks = Object.values(validation).filter(v => v === true).length;
  const totalChecks = 7;
  const score = Math.round((passedChecks / totalChecks) * 100);

  console.log(`\n📊 Quality Score: ${score}% (${passedChecks}/${totalChecks} checks passed)\n`);

  // STEP 6: Display test preview
  console.log('📝 STEP 5: TEST CODE PREVIEW (first 40 lines)');
  console.log('═══════════════════════════════════════════════════════════\n');
  const lines = testCode.split('\n');
  lines.slice(0, 40).forEach((line, i) => {
    console.log(`${String(i + 1).padStart(3)}| ${line}`);
  });
  if (lines.length > 40) {
    console.log(`...\n(${lines.length - 40} more lines)\n`);
  }

  // FINAL VERDICT
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  if (score >= 85) {
    console.log('║  ✅ VERDICT: EXCELLENT - Test generation working!        ║');
  } else if (score >= 70) {
    console.log('║  ⚠️  VERDICT: GOOD - Minor improvements needed           ║');
  } else {
    console.log('║  ❌ VERDICT: NEEDS IMPROVEMENT                           ║');
  }
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log(`Full test available at: ${outputPath}`);
  console.log(`\nTo run test: cd /Users/nikolabozic/Projects/truthy-frontend && npx playwright test ${filename}\n`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

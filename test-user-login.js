#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'http://localhost:3001';
const WORKSPACE_PATH = '/Users/nikolabozic/Projects/truthy-frontend';

console.log('🧪 TESTING USER LOGIN JOURNEY');
console.log('================================\n');

async function test() {
  // Step 1: Get journeys
  const discoverRes = await fetch(`${BACKEND_URL}/analyze/journeys/discover-and-enrich`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspacePath: WORKSPACE_PATH }),
  });
  const data = await discoverRes.json();
  
  // Find User Login journey
  const userLoginJourney = data.journeys.find(j => j.name.includes('User Login'));
  
  console.log('📋 Journey:', userLoginJourney.name);
  console.log(`   Fields: ${userLoginJourney.enrichedData.components[0].fields.length}`);
  console.log(`   Validations: ${userLoginJourney.enrichedData.components[0].validations.length}\n`);
  
  // Step 2: Generate test
  console.log('📍 Generating test...');
  const genRes = await fetch(`${BACKEND_URL}/analyze/generate-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ journey: userLoginJourney, workspacePath: WORKSPACE_PATH }),
  });
  
  const result = await genRes.json();
  console.log(`✅ Generated: ${result.fileName}`);
  console.log(`   Test cases: ${result.stats.testCases}\n`);
  
  // Step 3: Save test
  const testPath = path.join(WORKSPACE_PATH, 'tests', result.fileName);
  fs.writeFileSync(testPath, result.testCode, 'utf-8');
  console.log(`📁 Saved: ${testPath}\n`);
  
  // Step 4: Analyze test names
  console.log('📍 Test case names:');
  const lines = result.testCode.split('\n');
  const testCalls = lines.filter(l => l.trim().startsWith('test('));
  testCalls.forEach((line, i) => {
    const match = line.match(/test\('([^']+)'/);
    if (match) {
      console.log(`   ${i+1}. ${match[1]}`);
    }
  });
  
  // Check duplicates
  const names = testCalls.map(l => l.match(/test\('([^']+)'/)?.[1]).filter(Boolean);
  const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
  
  console.log(`\n✅ Unique test names: ${duplicates.length === 0 ? 'YES' : 'NO'}`);
  if (duplicates.length > 0) {
    console.log('❌ Duplicates:', duplicates);
  }
  
  // Step 5: Run test
  console.log('\n📍 Running Playwright test...\n');
  const { execSync } = require('child_process');
  try {
    execSync(`npx playwright test "${result.fileName}" --reporter=list`, {
      cwd: WORKSPACE_PATH,
      stdio: 'inherit',
      timeout: 60000
    });
    console.log('\n✅ Tests completed!');
  } catch (error) {
    console.log('\n❌ Some tests failed (expected if app not running)');
  }
}

test().catch(console.error);

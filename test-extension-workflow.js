#!/usr/bin/env node

/**
 * TEST EXTENSION WORKFLOW
 * Simulates exact extension behavior without VS Code
 */

const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'http://localhost:3001';
const WORKSPACE_PATH = '/Users/nikolabozic/Projects/truthy-frontend';

console.log('🧪 TESTING EXTENSION WORKFLOW');
console.log('================================\n');

async function testWorkflow() {
  try {
    // STEP 1: Discover journeys (like Generate Smart E2E command)
    console.log('📍 STEP 1: Discovering journeys...');
    const discoverResponse = await fetch(`${BACKEND_URL}/analyze/journeys/discover-and-enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspacePath: WORKSPACE_PATH }),
    });
    
    if (!discoverResponse.ok) {
      throw new Error(`Discovery failed: ${discoverResponse.status}`);
    }
    
    const discoverResult = await discoverResponse.json();
    console.log(`✅ Discovered ${discoverResult.journeys?.length || 0} journeys`);
    console.log(`   Enriched: ${discoverResult.enrichedJourneys || 0}`);
    console.log(`   Time: ${discoverResult.analysisTime}ms\n`);
    
    if (!discoverResult.journeys || discoverResult.journeys.length === 0) {
      console.log('❌ No journeys found!');
      return;
    }
    
    // Show discovered journeys
    console.log('📋 Discovered Journeys:');
    discoverResult.journeys.forEach((j, i) => {
      console.log(`   ${i + 1}. ${j.name} (Priority: ${j.priority}, Status: ${j.status})`);
      if (j.enrichedData) {
        console.log(`      - Components: ${j.enrichedData.components?.length || 0}`);
        console.log(`      - Estimated tests: ${j.enrichedData.estimatedTestCases || 0}`);
      }
    });
    console.log('');
    
    // STEP 2: Generate test for first journey (like clicking ✨ in dashboard)
    const firstJourney = discoverResult.journeys[0];
    console.log(`📍 STEP 2: Generating test for "${firstJourney.name}"...`);
    
    const generateResponse = await fetch(`${BACKEND_URL}/analyze/generate-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        journey: firstJourney,
        workspacePath: WORKSPACE_PATH 
      }),
    });
    
    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      throw new Error(`Test generation failed: ${generateResponse.status} ${errorText}`);
    }
    
    const generateResult = await generateResponse.json();
    console.log(`✅ Test generated: ${generateResult.fileName}`);
    console.log(`   Lines: ${generateResult.stats?.linesOfCode || 0}`);
    console.log(`   Test cases: ${generateResult.stats?.testCases || 0}\n`);
    
    // STEP 3: Save test file (like extension does)
    const testDir = path.join(WORKSPACE_PATH, 'tests');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testPath = path.join(testDir, generateResult.fileName);
    fs.writeFileSync(testPath, generateResult.testCode, 'utf-8');
    console.log(`📁 Test saved: ${testPath}\n`);
    
    // STEP 4: Analyze generated test
    console.log('📍 STEP 3: Analyzing generated test...');
    const testLines = generateResult.testCode.split('\n');
    const testCalls = testLines.filter(l => l.trim().startsWith('test('));
    
    console.log(`   Total test cases: ${testCalls.length}`);
    testCalls.forEach((line, i) => {
      const match = line.match(/test\('([^']+)'/);
      if (match) {
        console.log(`   ${i + 1}. ${match[1]}`);
      }
    });
    console.log('');
    
    // Check for duplicates
    const testNames = testCalls.map(l => {
      const match = l.match(/test\('([^']+)'/);
      return match ? match[1] : '';
    }).filter(n => n);
    
    const duplicates = testNames.filter((name, index) => testNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      console.log(`❌ DUPLICATE TEST NAMES FOUND:`);
      duplicates.forEach(d => console.log(`   - "${d}"`));
      console.log('');
    } else {
      console.log(`✅ All test names are unique!\n`);
    }
    
    // STEP 5: Run the test
    console.log('📍 STEP 4: Running Playwright test...');
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout, stderr } = await execAsync(
        `npx playwright test "${generateResult.fileName}"`,
        { cwd: WORKSPACE_PATH, timeout: 60000 }
      );
      
      console.log(stdout);
      if (stderr) console.error(stderr);
      
      console.log('✅ Tests completed!\n');
    } catch (error) {
      console.log('❌ Test execution failed:');
      console.log(error.stdout || error.message);
      console.log('');
    }
    
    // FINAL REPORT
    console.log('================================');
    console.log('📊 FINAL REPORT');
    console.log('================================');
    console.log(`✅ Journey discovery: SUCCESS`);
    console.log(`✅ Test generation: SUCCESS`);
    console.log(`✅ Test file saved: ${testPath}`);
    console.log(`✅ Test uniqueness: ${duplicates.length === 0 ? 'PASS' : 'FAIL'}`);
    console.log('================================\n');
    
  } catch (error) {
    console.error('❌ Workflow failed:', error.message);
    process.exit(1);
  }
}

testWorkflow();

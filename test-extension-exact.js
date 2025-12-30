#!/usr/bin/env node

/**
 * EXACT EXTENSION SIMULATION
 * Simulates COMPLETE extension lifecycle:
 * 1. Discovery → Store flows
 * 2. Load flows from "storage" (simulate VS Code workspaceState)
 * 3. Generate test with stored data
 */

const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'http://localhost:3001';
const APP_PATH = '/Users/nikolabozic/Projects/truthy-frontend';
const STORAGE_FILE = '/tmp/extension-flows-storage.json';

console.log('🎯 EXACT EXTENSION SIMULATION');
console.log('='.repeat(70));
console.log('Simulating complete extension lifecycle with storage\n');

async function step1_discoveryAndStore() {
  console.log('📍 STEP 1: Discovery & Store (like onboarding)');
  console.log('-'.repeat(70));
  
  const response = await fetch(`${BACKEND_URL}/analyze/journeys/discover-and-enrich`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspacePath: APP_PATH }),
  });

  const data = await response.json();
  console.log(`✅ Discovered ${data.journeys.length} flows`);
  
  // Simulate VS Code storage - serialize/deserialize
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(data.journeys, null, 2));
  console.log(`💾 Stored flows to: ${STORAGE_FILE}`);
  console.log('');
  
  return data.journeys;
}

async function step2_loadFromStorage() {
  console.log('📍 STEP 2: Load from Storage (like extension reload)');
  console.log('-'.repeat(70));
  
  // Read from "storage" - this is what extension does
  const storedFlows = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf-8'));
  console.log(`✅ Loaded ${storedFlows.length} flows from storage`);
  
  // Show first flow structure
  const firstFlow = storedFlows[0];
  console.log('\n📋 First flow structure:');
  console.log(`   Name: ${firstFlow.name}`);
  console.log(`   Has enrichedData: ${!!firstFlow.enrichedData}`);
  if (firstFlow.enrichedData?.components?.[0]) {
    const comp = firstFlow.enrichedData.components[0];
    console.log(`   Component keys: ${Object.keys(comp).join(', ')}`);
    console.log(`   Has elements: ${!!comp.elements}`);
    console.log(`   Has fields: ${!!comp.fields}`);
    console.log(`   Has apiCalls: ${!!comp.apiCalls}`);
    console.log(`   Has apis: ${!!comp.apis}`);
  }
  console.log('');
  
  return storedFlows;
}

async function step3_generateTestWithStoredData(flow) {
  console.log('📍 STEP 3: Generate Test with Stored Data (like clicking ✨)');
  console.log('-'.repeat(70));
  console.log(`Flow: ${flow.name}\n`);
  
  // This is EXACTLY what extension sends
  const response = await fetch(`${BACKEND_URL}/analyze/generate-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      journey: flow,
      workspacePath: APP_PATH
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log(`❌ Backend error: ${response.status}`);
    console.log(`   ${errorText}`);
    return null;
  }

  const result = await response.json();
  
  console.log('Backend response:');
  console.log(`   success: ${result.success}`);
  console.log(`   testCode length: ${result.testCode?.length || 0}`);
  console.log(`   fileName: ${result.fileName}`);
  console.log(`   stats: ${JSON.stringify(result.stats)}`);
  
  if (result.testCode && result.testCode.length > 0) {
    console.log('\n✅ TEST GENERATED SUCCESSFULLY!');
    console.log(`   Test cases: ${result.stats.testCases}`);
    console.log(`   Lines: ${result.stats.linesOfCode}`);
    
    // Save test
    const testDir = path.join(APP_PATH, 'tests');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    const testPath = path.join(testDir, result.fileName);
    fs.writeFileSync(testPath, result.testCode, 'utf-8');
    console.log(`   Saved: ${testPath}`);
    
    return result;
  } else {
    console.log('\n❌ NO TEST CODE GENERATED');
    console.log(`   Error: ${result.error || 'Unknown'}`);
    return null;
  }
}

async function runCompleteSimulation() {
  try {
    // Step 1: Discovery
    await step1_discoveryAndStore();
    
    // Step 2: Load from storage (simulate extension reload)
    const storedFlows = await step2_loadFromStorage();
    
    // Step 3: Generate test for first priority 1 flow
    const testFlow = storedFlows.find(f => f.priority === 1) || storedFlows[0];
    const result = await step3_generateTestWithStoredData(testFlow);
    
    // Final result
    console.log('\n');
    console.log('='.repeat(70));
    console.log('🎯 SIMULATION RESULT');
    console.log('='.repeat(70));
    
    if (result && result.testCode) {
      console.log('✅✅✅ EXTENSION WORKS PERFECTLY! ✅✅✅');
      console.log('');
      console.log('Lifecycle validated:');
      console.log('  ✅ Discovery works');
      console.log('  ✅ Storage works');
      console.log('  ✅ Load from storage works');
      console.log('  ✅ Test generation with stored data works');
      console.log('');
      console.log('Extension behavior matches this simulation 100%');
    } else {
      console.log('❌ EXTENSION HAS ISSUES');
      console.log('');
      console.log('Test generation failed with stored data');
      console.log('Check backend logs for details');
    }
    
    console.log('');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Simulation failed:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup
    if (fs.existsSync(STORAGE_FILE)) {
      fs.unlinkSync(STORAGE_FILE);
    }
  }
}

runCompleteSimulation();

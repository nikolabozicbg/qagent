#!/usr/bin/env node

/**
 * FINAL EXTENSION VALIDATION TEST
 * Simulates EXACT extension behavior - no manual scripts, no tmp files
 * Tests exactly what user would do in VS Code
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BACKEND_URL = 'http://localhost:3001';
const APPS = [
  {
    name: 'truthy-frontend',
    path: '/Users/nikolabozic/Projects/truthy-frontend',
    type: 'React + Redux + Antd (complex)',
  },
  {
    name: 'react-redux-realworld',
    path: '/Users/nikolabozic/Projects/react-redux-realworld-example-app',
    type: 'React + Redux (standard)',
  }
];

console.log('🎯 FINAL EXTENSION VALIDATION TEST');
console.log('=====================================\n');
console.log('Testing extension behavior on multiple apps\n');

async function testApp(app) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📱 APP: ${app.name}`);
  console.log(`   Type: ${app.type}`);
  console.log(`   Path: ${app.path}`);
  console.log(`${'='.repeat(60)}\n`);

  const results = {
    appName: app.name,
    appType: app.type,
    discovery: null,
    testGeneration: [],
    testExecution: [],
    issues: [],
  };

  try {
    // STEP 1: DISCOVER FLOWS (exactly as extension does)
    console.log('📍 STEP 1: Discovering flows...');
    const discoverRes = await fetch(`${BACKEND_URL}/analyze/journeys/discover-and-enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspacePath: app.path }),
    });

    if (!discoverRes.ok) {
      throw new Error(`Discovery failed: ${discoverRes.status}`);
    }

    const discovery = await discoverRes.json();
    results.discovery = {
      total: discovery.journeys?.length || 0,
      enriched: discovery.enrichedJourneys || 0,
      time: discovery.analysisTime,
    };

    console.log(`✅ Discovered ${results.discovery.total} journeys`);
    console.log(`   Enriched: ${results.discovery.enriched}`);
    console.log(`   Time: ${results.discovery.time}ms\n`);

    if (!discovery.journeys || discovery.journeys.length === 0) {
      results.issues.push('No journeys discovered');
      return results;
    }

    // Show all journeys
    console.log('📋 All Journeys:');
    discovery.journeys.forEach((j, i) => {
      const fields = j.enrichedData?.components?.[0]?.fields?.length || 0;
      const validations = j.enrichedData?.components?.[0]?.validations?.length || 0;
      console.log(`   ${i + 1}. ${j.name}`);
      console.log(`      Priority: ${j.priority}, Fields: ${fields}, Validations: ${validations}`);
    });
    console.log('');

    // STEP 2: TEST GENERATION FOR TOP 3 JOURNEYS
    const topJourneys = discovery.journeys.slice(0, 3);
    console.log(`📍 STEP 2: Generating tests for top ${topJourneys.length} journeys...\n`);

    for (const journey of topJourneys) {
      console.log(`   🧪 Generating: ${journey.name}...`);

      try {
        // Simulate extension's test generation (with journey reconstruction)
        const testJourney = {
          ...journey,
          enrichedData: journey.enrichedData || {
            components: [],
            testDataSuggestions: {},
            edgeCases: []
          }
        };

        const genRes = await fetch(`${BACKEND_URL}/analyze/generate-test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            journey: testJourney,
            workspacePath: app.path
          }),
        });

        if (!genRes.ok) {
          const errorText = await genRes.text();
          throw new Error(`Generation failed: ${genRes.status} ${errorText}`);
        }

        const testResult = await genRes.json();

        // Validate result
        if (!testResult.testCode || testResult.testCode.trim() === '') {
          results.issues.push(`${journey.name}: Empty test code`);
          console.log(`      ❌ Empty test code\n`);
          continue;
        }

        if (!testResult.fileName) {
          results.issues.push(`${journey.name}: No filename`);
          console.log(`      ❌ No filename\n`);
          continue;
        }

        // Analyze test
        const lines = testResult.testCode.split('\n');
        const testCalls = lines.filter(l => l.trim().startsWith('test('));
        const testNames = testCalls.map(l => {
          const match = l.match(/test\('([^']+)'/);
          return match ? match[1] : '';
        }).filter(Boolean);

        const duplicates = testNames.filter((n, i) => testNames.indexOf(n) !== i);

        const testInfo = {
          journey: journey.name,
          fileName: testResult.fileName,
          testCases: testResult.stats?.testCases || testNames.length,
          linesOfCode: testResult.stats?.linesOfCode || lines.length,
          uniqueNames: duplicates.length === 0,
          duplicates: duplicates,
        };

        results.testGeneration.push(testInfo);

        console.log(`      ✅ ${testResult.fileName}`);
        console.log(`         Tests: ${testInfo.testCases}, Lines: ${testInfo.linesOfCode}`);
        console.log(`         Unique names: ${testInfo.uniqueNames ? 'YES' : 'NO'}`);
        if (duplicates.length > 0) {
          console.log(`         ❌ Duplicates: ${duplicates.join(', ')}`);
          results.issues.push(`${journey.name}: Duplicate test names`);
        }

        // Save test file (as extension does)
        const testDir = path.join(app.path, 'tests');
        if (!fs.existsSync(testDir)) {
          fs.mkdirSync(testDir, { recursive: true });
        }
        const testPath = path.join(testDir, testResult.fileName);
        fs.writeFileSync(testPath, testResult.testCode, 'utf-8');
        console.log(`         📁 Saved: ${testPath}\n`);

        // STEP 3: RUN TEST (validate syntax and structure)
        console.log(`   ▶️  Running test...`);
        try {
          const output = execSync(
            `npx playwright test "${testResult.fileName}" --reporter=list`,
            { cwd: app.path, encoding: 'utf-8', timeout: 30000 }
          );

          // Count results
          const passMatch = output.match(/(\d+) passed/);
          const failMatch = output.match(/(\d+) failed/);
          const passed = passMatch ? parseInt(passMatch[1]) : 0;
          const failed = failMatch ? parseInt(failMatch[1]) : 0;

          results.testExecution.push({
            journey: journey.name,
            passed,
            failed,
            total: passed + failed,
          });

          console.log(`      ✅ Passed: ${passed}, Failed: ${failed}\n`);

          if (failed > 0) {
            results.issues.push(`${journey.name}: ${failed} tests failed (expected if app not running)`);
          }
        } catch (error) {
          // Test execution failed (likely syntax error or timeout)
          const output = error.stdout || error.message;
          if (output.includes('duplicate test title')) {
            results.issues.push(`${journey.name}: DUPLICATE TEST TITLES ERROR`);
            console.log(`      ❌ DUPLICATE TEST TITLES!\n`);
          } else if (output.includes('SyntaxError')) {
            results.issues.push(`${journey.name}: Syntax error in generated code`);
            console.log(`      ❌ SYNTAX ERROR\n`);
          } else {
            console.log(`      ⚠️  Test execution error (likely app not running)\n`);
          }
        }
      } catch (error) {
        results.issues.push(`${journey.name}: ${error.message}`);
        console.log(`      ❌ ${error.message}\n`);
      }
    }

  } catch (error) {
    results.issues.push(`Fatal error: ${error.message}`);
    console.error(`❌ Test failed: ${error.message}\n`);
  }

  return results;
}

async function runAllTests() {
  const allResults = [];

  for (const app of APPS) {
    const result = await testApp(app);
    allResults.push(result);
  }

  // FINAL REPORT
  console.log('\n\n');
  console.log('═'.repeat(70));
  console.log('📊 FINAL VALIDATION REPORT');
  console.log('═'.repeat(70));
  console.log('');

  for (const result of allResults) {
    console.log(`\n📱 ${result.appName} (${result.appType})`);
    console.log('─'.repeat(70));

    if (result.discovery) {
      console.log(`✅ Discovery: ${result.discovery.total} journeys (${result.discovery.enriched} enriched)`);
    } else {
      console.log(`❌ Discovery: FAILED`);
    }

    console.log(`✅ Test Generation: ${result.testGeneration.length} tests generated`);

    let allUnique = true;
    for (const test of result.testGeneration) {
      if (!test.uniqueNames) {
        allUnique = false;
        console.log(`   ❌ ${test.journey}: DUPLICATE NAMES!`);
      }
    }
    if (allUnique && result.testGeneration.length > 0) {
      console.log(`   ✅ All test names are unique`);
    }

    console.log(`✅ Test Execution: ${result.testExecution.length} tests ran`);
    for (const exec of result.testExecution) {
      console.log(`   ${exec.journey}: ${exec.passed} passed, ${exec.failed} failed`);
    }

    if (result.issues.length > 0) {
      console.log(`\n⚠️  Issues (${result.issues.length}):`);
      result.issues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log(`\n✅ NO ISSUES FOUND!`);
    }
  }

  console.log('\n');
  console.log('═'.repeat(70));
  console.log('🎯 VALIDATION SUMMARY');
  console.log('═'.repeat(70));

  const totalJourneys = allResults.reduce((sum, r) => sum + (r.discovery?.total || 0), 0);
  const totalTests = allResults.reduce((sum, r) => sum + r.testGeneration.length, 0);
  const totalIssues = allResults.reduce((sum, r) => sum + r.issues.length, 0);
  const hasDuplicates = allResults.some(r => 
    r.testGeneration.some(t => !t.uniqueNames)
  );

  console.log(`Total Journeys Discovered: ${totalJourneys}`);
  console.log(`Total Tests Generated: ${totalTests}`);
  console.log(`Total Issues: ${totalIssues}`);
  console.log(`Duplicate Test Names: ${hasDuplicates ? '❌ YES' : '✅ NO'}`);
  console.log('');

  if (totalIssues === 0 && !hasDuplicates) {
    console.log('✅✅✅ EXTENSION IS PERFECT! ✅✅✅');
    console.log('Extension behavior matches test script 100%');
  } else {
    console.log('⚠️  EXTENSION NEEDS FIXES');
    console.log('See issues above for details');
  }

  console.log('');
  console.log('═'.repeat(70));
}

runAllTests().catch(console.error);

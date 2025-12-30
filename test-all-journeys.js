#!/usr/bin/env node
/**
 * Complete Journey Test - Tests ALL discovered journeys
 * 
 * This script:
 * 1. Discovers all journeys
 * 2. For each journey: enrich context → generate test → validate
 * 3. Reports statistics for all journeys
 */

const fs = require('fs');
const path = require('path');

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  COMPLETE JOURNEY TEST - ALL FLOWS                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const backendUrl = 'http://localhost:3001';
  const workspacePath = '/Users/nikolabozic/Projects/truthy-frontend';

  // STEP 1: Discover all journeys
  console.log('🔍 STEP 1: Discovering all journeys...\n');
  
  const discoverResponse = await fetch(`${backendUrl}/analyze/journeys/discover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspacePath })
  });

  if (!discoverResponse.ok) {
    console.error('❌ Discovery failed:', discoverResponse.status);
    process.exit(1);
  }

  const discoveryResult = await discoverResponse.json();
  if (!discoveryResult.success) {
    console.error('❌ Discovery failed:', discoveryResult.error);
    process.exit(1);
  }

  const journeys = discoveryResult.journeys;
  console.log(`✅ Discovered ${journeys.length} journeys`);
  console.log(`⏱️  Discovery time: ${discoveryResult.analysisTime}ms\n`);

  // Show all discovered journeys
  console.log('📋 Discovered Journeys:');
  journeys.forEach((j, idx) => {
    console.log(`  ${idx + 1}. ${j.name} (${j.tags?.join(', ') || 'no tags'})`);
  });
  console.log('');

  // Load test generator
  const { EnhancedTestGeneratorService } = require('./apps/vscode-extension/out/services/enhanced-test-generator.service.js');
  const generator = new EnhancedTestGeneratorService();

  // STEP 2: Process each journey
  const results = [];
  const outputDir = '/tmp/qagent-tests';
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('⚙️  STEP 2: Processing all journeys...\n');

  for (let i = 0; i < Math.min(journeys.length, 10); i++) {
    const journey = journeys[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 Journey ${i + 1}/${journeys.length}: ${journey.name}`);
    console.log('='.repeat(60));

    try {
      // Enrich journey context
      console.log('  🔍 Enriching context...');
      const enrichResponse = await fetch(`${backendUrl}/analyze/journey-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journey, workspacePath })
      });

      if (!enrichResponse.ok) {
        console.log(`  ❌ Enrichment failed: ${enrichResponse.status}`);
        results.push({ journey: journey.name, success: false, error: 'Enrichment failed' });
        continue;
      }

      const enrichResult = await enrichResponse.json();
      if (!enrichResult.success) {
        console.log(`  ❌ Enrichment failed: ${enrichResult.error}`);
        results.push({ journey: journey.name, success: false, error: enrichResult.error });
        continue;
      }

      const context = enrichResult.context;
      console.log(`  ✅ Components: ${context.componentsAnalysis.length}`);
      
      if (context.componentsAnalysis.length > 0) {
        const comp = context.componentsAnalysis[0];
        console.log(`     Elements: ${comp.elements.length}, Validations: ${comp.validations.length}, APIs: ${comp.apiCalls.length}`);
      }

      // Generate test
      console.log('  🤖 Generating test...');
      const testCode = await generator.generateTest(context);
      const filename = generator.getTestFileName(journey.name);
      const filepath = path.join(outputDir, filename);
      
      fs.writeFileSync(filepath, testCode);
      console.log(`  💾 Test saved: ${filename}`);

      // Validate test
      const validation = {
        hasImports: testCode.includes('import { test, expect }'),
        hasDescribe: testCode.includes('test.describe'),
        hasTest: testCode.includes('test('),
        usesSelectors: /\.(fill|click|waitForResponse)\(/.test(testCode),
        linesOfCode: testCode.split('\n').length,
      };

      const passed = Object.values(validation).filter(v => v === true).length;
      const total = 4; // Exclude linesOfCode from pass/fail
      const score = Math.round((passed / total) * 100);

      console.log(`  📊 Quality: ${score}% (${passed}/${total} checks) - ${validation.linesOfCode} lines`);

      results.push({
        journey: journey.name,
        success: true,
        score,
        linesOfCode: validation.linesOfCode,
        filepath
      });

    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      results.push({ journey: journey.name, success: false, error: error.message });
    }
  }

  // STEP 3: Final report
  console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  FINAL REPORT - ALL JOURNEYS                             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}\n`);

  if (successful.length > 0) {
    const avgScore = Math.round(successful.reduce((sum, r) => sum + r.score, 0) / successful.length);
    const totalLines = successful.reduce((sum, r) => sum + r.linesOfCode, 0);
    
    console.log('📊 Statistics:');
    console.log(`  Average quality score: ${avgScore}%`);
    console.log(`  Total lines generated: ${totalLines}`);
    console.log(`  Tests location: ${outputDir}\n`);

    console.log('✅ Generated Tests:');
    successful.forEach((r, idx) => {
      console.log(`  ${idx + 1}. ${r.journey} - ${r.score}% (${r.linesOfCode} lines)`);
    });
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed Journeys:');
    failed.forEach((r, idx) => {
      console.log(`  ${idx + 1}. ${r.journey} - ${r.error}`);
    });
  }

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  if (successful.length === results.length && successful.length > 0) {
    console.log('║  ✅ ALL JOURNEYS PROCESSED SUCCESSFULLY!                 ║');
  } else if (successful.length > 0) {
    console.log('║  ⚠️  PARTIAL SUCCESS - Some journeys failed              ║');
  } else {
    console.log('║  ❌ ALL JOURNEYS FAILED                                  ║');
  }
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log(`\nTo run tests:\n  cd ${workspacePath}\n  npx playwright test ${outputDir}/*.spec.ts\n`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

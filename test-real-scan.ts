/**
 * Test V4 Discovery with REAL ecommerce app scan
 * Uses the same scanner as Electron app
 */

import { scanProject } from './apps/desktop/electron/scanner';
import http from 'http';

const ECOMMERCE_PATH = '/Users/nikolabozic/Projects/ecommerce';

async function post(url: string, data: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

interface Issue {
  type: 'error' | 'warning';
  suite: string;
  case?: string;
  step?: number;
  message: string;
  fix?: string;
}

async function main() {
  console.log('🔬 V4 Discovery - Full Verification Test\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Step 1: Scan the ecommerce project
  console.log('📂 Step 1: Scanning ecommerce project...');
  console.log(`   Path: ${ECOMMERCE_PATH}\n`);
  
  const payload = await scanProject(ECOMMERCE_PATH);
  
  console.log('📊 Scan Results:');
  console.log(`   Routes: ${payload.routes.length}`);
  console.log(`   Forms: ${payload.forms.length}`);
  console.log(`   Components: ${payload.components.length}`);
  console.log('');
  
  // Analyze field quality from scanner
  let totalFields = 0;
  let fieldsWithRealName = 0;
  let fieldsWithGenericName = 0;
  let fieldsWithSelector = 0;
  
  // Debug: Show sign-in form specifically
  const signInForm = payload.forms.find((f: any) => f.route === '/sign-in' || f.filePath?.includes('sign-in'));
  if (signInForm) {
    console.log('🔍 DEBUG: Sign-In Form');
    console.log(`   Name: ${signInForm.name}`);
    console.log(`   Route: ${signInForm.route}`);
    console.log(`   Fields: ${signInForm.fields.map((f: any) => f.name).join(', ')}`);
    console.log('');
  }
  
  // Show forms with generic fields
  console.log('🔍 Forms with generic field names:');
  for (const form of payload.forms) {
    const genericFields = form.fields.filter((f: any) => /^(field|input)-\d+$/.test(f.name));
    if (genericFields.length > 0) {
      console.log(`   ${form.name}: ${genericFields.map((f: any) => f.name).join(', ')}`);
    }
  }
  console.log('');
  
  for (const form of payload.forms) {
    for (const field of form.fields) {
      totalFields++;
      if (field.selector) fieldsWithSelector++;
      if (field.name && !/^(field|input)-\d+$/.test(field.name)) {
        fieldsWithRealName++;
      } else {
        fieldsWithGenericName++;
      }
    }
  }
  
  console.log('📊 Scanner Field Quality:');
  console.log(`   Total fields: ${totalFields}`);
  console.log(`   Fields with real names: ${fieldsWithRealName} (${(fieldsWithRealName/totalFields*100).toFixed(1)}%)`);
  console.log(`   Fields with generic names: ${fieldsWithGenericName}`);
  console.log(`   Fields with selectors: ${fieldsWithSelector}`);
  console.log('');
  
  
  // Step 2: Send to V4 Discovery
  console.log('📤 Step 2: Sending to V4 Discovery endpoint...\n');
  
  const result = await post('http://localhost:3001/analyze/discover?version=v4', payload);
  
  if (!result.success) {
    console.log('❌ Discovery failed');
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 DETAILED VERIFICATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const issues: Issue[] = [];
  let totalSteps = 0;
  let stepsWithSelectors = 0; // Steps that SHOULD have selectors (fill, click)
  let stepsWithRealSelectors = 0;
  let stepsWithFillAction = 0; // For value quality calculation
  let stepsWithRealValues = 0;
  let stepsWithGenericNames = 0;
  
  // Analyze each suite
  for (const suite of result.suites || []) {
    console.log(`\n📦 SUITE: ${suite.name}`);
    console.log(`   Route: ${suite.coverage?.routes?.[0] || 'unknown'}`);
    console.log(`   Cases: ${suite.testCases?.length || 0}`);
    
    // Check suite name quality
    if (suite.name.includes('field-') || suite.name.includes('form-')) {
      issues.push({
        type: 'error',
        suite: suite.name,
        message: 'Suite has generic name',
        fix: 'Should derive name from route path'
      });
    }
    
    for (const testCase of suite.testCases || []) {
      console.log(`\n   📋 CASE: ${testCase.name}`);
      console.log(`      Type: ${testCase.type}`);
      
      for (const step of testCase.steps || []) {
        totalSteps++;
        
        // Check selectors
        if (step.action === 'fill' || step.action === 'click') {
          stepsWithSelectors++; // Count steps that should have selectors
          
          if (step.selector) {
            // Check if selector is real (has name, id, or data-testid)
            if (step.selector.includes('[name=') || 
                step.selector.includes('#') || 
                step.selector.includes('[data-testid=') ||
                step.selector.includes('button[type=')) {
              stepsWithRealSelectors++;
              console.log(`      ✅ ${step.action}: ${step.selector}${step.value ? ` → "${step.value}"` : ''}`);
            } else if (step.selector.includes('field-') || step.selector === 'input' || step.selector === 'button') {
              issues.push({
                type: 'error',
                suite: suite.name,
                case: testCase.name,
                step: step.index,
                message: `Generic selector: ${step.selector}`,
                fix: 'Should use [name="fieldName"] or [data-testid="..."]'
              });
              console.log(`      ❌ ${step.action}: ${step.selector} (GENERIC!)`);
            } else {
              stepsWithRealSelectors++;
              console.log(`      ✅ ${step.action}: ${step.selector}${step.value ? ` → "${step.value}"` : ''}`);
            }
          } else {
            issues.push({
              type: 'error',
              suite: suite.name,
              case: testCase.name,
              step: step.index,
              message: `Missing selector for ${step.action}`,
            });
            console.log(`      ❌ ${step.action}: NO SELECTOR`);
          }
          
          // Check values for fill actions
          if (step.action === 'fill') {
            stepsWithFillAction++;
            if (step.value && step.value !== 'Test Value' && step.value !== '') {
              stepsWithRealValues++;
            } else if (step.value === 'Test Value') {
              issues.push({
                type: 'warning',
                suite: suite.name,
                case: testCase.name,
                step: step.index,
                message: `Generic test value for field`,
                fix: 'Should use field-type specific value'
              });
            }
          }
        } else if (step.action === 'navigate') {
          console.log(`      🔗 navigate: ${step.target}`);
        } else if (step.action === 'assert') {
          console.log(`      ✓ assert: ${step.target}`);
        }
        
        // Check for generic field names in target
        if (step.target && (step.target.includes('field-1') || step.target.includes('field-2'))) {
          stepsWithGenericNames++;
          issues.push({
            type: 'error',
            suite: suite.name,
            case: testCase.name,
            step: step.index,
            message: `Generic field name in target: ${step.target}`,
          });
        }
      }
    }
  }
  
  // Print summary
  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 VERIFICATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log(`Total Suites: ${result.suites?.length || 0}`);
  console.log(`Total Cases: ${result.summary?.totalCases || 0}`);
  console.log(`Total Steps: ${totalSteps}`);
  console.log('');
  
  const selectorQuality = stepsWithSelectors > 0 ? (stepsWithRealSelectors / stepsWithSelectors * 100).toFixed(1) : 0;
  const valueQuality = stepsWithFillAction > 0 ? (stepsWithRealValues / stepsWithFillAction * 100).toFixed(1) : 0;
  
  console.log('Quality Metrics:');
  console.log(`   Selector Quality: ${selectorQuality}% (${stepsWithRealSelectors}/${stepsWithSelectors} steps with real selectors)`);
  console.log(`   Value Quality: ${valueQuality}% (${stepsWithRealValues}/${stepsWithFillAction} fill steps with field-specific values)`);
  console.log(`   Generic Names: ${stepsWithGenericNames} steps with generic field names`);
  console.log('');
  
  // Issues breakdown
  const errors = issues.filter(i => i.type === 'error');
  const warnings = issues.filter(i => i.type === 'warning');
  
  console.log(`Issues Found: ${issues.length} (${errors.length} errors, ${warnings.length} warnings)`);
  
  if (errors.length > 0) {
    console.log('\n❌ ERRORS:');
    for (const error of errors.slice(0, 10)) { // Show first 10
      console.log(`   [${error.suite}] ${error.message}`);
      if (error.fix) console.log(`      Fix: ${error.fix}`);
    }
    if (errors.length > 10) {
      console.log(`   ... and ${errors.length - 10} more errors`);
    }
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    for (const warning of warnings.slice(0, 5)) {
      console.log(`   [${warning.suite}] ${warning.message}`);
    }
    if (warnings.length > 5) {
      console.log(`   ... and ${warnings.length - 5} more warnings`);
    }
  }
  
  // Final verdict
  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (errors.length === 0 && parseFloat(selectorQuality as string) >= 90) {
    console.log('✅ PASSED - V4 Discovery is working correctly!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } else {
    console.log('❌ NEEDS FIXES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\nTo pass: Fix ${errors.length} errors and achieve >90% selector quality`);
  }
  
  // Return issues for programmatic use
  return { issues, selectorQuality, valueQuality, totalSteps, errors: errors.length };
}

main().catch(console.error);

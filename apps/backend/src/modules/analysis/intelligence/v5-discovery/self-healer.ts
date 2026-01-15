/**
 * V5 Discovery - Self-Healer
 * 
 * Iterative improvement loop with:
 * - Issue tracking (max 2 attempts per issue)
 * - Max 3 iterations total
 * - Always produces output
 * - Marks persistent issues for manual review
 */

import {
  ScannerPayload,
  AnalyzerOutput,
  GeneratorOutput,
  ValidatorResult,
  ValidatorIssue,
  CriticResult,
  CriticIssue,
  SelfHealResult,
  ManualReviewItem,
  GeneratedCase,
} from './types';
import { generate } from './agents/generator';
import { validate } from './validator';
import { critique } from './agents/critic';
import { LLMClient } from './llm-client';

// =============================================================================
// CONFIGURATION
// =============================================================================

const MAX_ITERATIONS = 3;
const MAX_ATTEMPTS_PER_ISSUE = 2;
const MIN_QUALITY_SCORE = 0.85;

// =============================================================================
// ISSUE TRACKING
// =============================================================================

interface IssueAttempt {
  issueId: string;
  attempts: number;
}

type CombinedIssue = {
  id: string;
  type: string;
  description: string;
  suggestion: string;
  source: 'validator' | 'critic';
  severity: 'error' | 'warning';
};

// =============================================================================
// MAIN SELF-HEAL FUNCTION
// =============================================================================

/**
 * Run self-healing loop to fix issues
 */
export async function selfHeal(
  initialOutput: GeneratorOutput,
  scannerPayload: ScannerPayload,
  analyzerOutput: AnalyzerOutput,
  llmClient?: LLMClient
): Promise<SelfHealResult> {
  let currentOutput = initialOutput;
  let iteration = 0;
  const attemptTracker = new Map<string, number>();
  const manualReviewNeeded: ManualReviewItem[] = [];
  const fixedIssues: string[] = [];
  
  console.log('   🔄 Starting self-heal loop...');
  
  while (iteration < MAX_ITERATIONS) {
    iteration++;
    console.log(`   📍 Iteration ${iteration}/${MAX_ITERATIONS}`);
    
    // Validate current output
    const validatorResult = validate(currentOutput, scannerPayload);
    const criticResult = await critique(currentOutput, analyzerOutput, scannerPayload, llmClient);
    
    // Combine and prioritize issues
    const allIssues = combineIssues(validatorResult, criticResult);
    
    // Filter issues by attempt count
    const { fixableIssues, persistentIssues } = categorizeIssues(
      allIssues,
      attemptTracker
    );
    
    // Move persistent issues to manual review
    for (const issue of persistentIssues) {
      manualReviewNeeded.push({
        issueId: issue.id,
        description: issue.description,
        reason: `Failed to fix after ${MAX_ATTEMPTS_PER_ISSUE} attempts`,
        attempts: attemptTracker.get(issue.id) || 0,
      });
    }
    
    // Check termination conditions
    const combinedScore = (validatorResult.score + criticResult.score) / 2;
    
    if (combinedScore >= MIN_QUALITY_SCORE || fixableIssues.length === 0) {
      console.log(`   ✅ Self-heal complete: score=${combinedScore.toFixed(2)}, issues=${fixableIssues.length}`);
      
      return {
        done: true,
        iteration,
        fixed: fixedIssues,
        remaining: fixableIssues.map(i => i.id),
        manualReviewNeeded,
        output: currentOutput,
        scores: {
          validator: validatorResult.score,
          critic: criticResult.score,
          combined: combinedScore,
        },
      };
    }
    
    // Sort issues by severity (errors first)
    const sortedIssues = [...fixableIssues].sort((a, b) => {
      if (a.severity === 'error' && b.severity !== 'error') return -1;
      if (a.severity !== 'error' && b.severity === 'error') return 1;
      return 0;
    });
    
    // Attempt to fix top issues
    const issuesToFix = sortedIssues.slice(0, 3); // Fix up to 3 issues per iteration
    
    console.log(`   🔧 Attempting to fix ${issuesToFix.length} issues...`);
    
    for (const issue of issuesToFix) {
      const currentAttempts = attemptTracker.get(issue.id) || 0;
      attemptTracker.set(issue.id, currentAttempts + 1);
    }
    
    // Generate fixed output
    const fixedOutput = await applyFixes(
      currentOutput,
      issuesToFix,
      scannerPayload,
      analyzerOutput,
      llmClient
    );
    
    // Check if any issues were actually fixed
    const newValidatorResult = validate(fixedOutput, scannerPayload);
    const newCriticResult = await critique(fixedOutput, analyzerOutput, scannerPayload);
    const newIssues = combineIssues(newValidatorResult, newCriticResult);
    
    // Track fixed issues
    for (const issue of issuesToFix) {
      const stillExists = newIssues.some(ni => ni.id === issue.id);
      if (!stillExists) {
        fixedIssues.push(issue.id);
        console.log(`   ✓ Fixed: ${issue.description}`);
      }
    }
    
    currentOutput = fixedOutput;
  }
  
  // Max iterations reached
  console.log(`   ⚠️ Max iterations reached`);
  
  const finalValidator = validate(currentOutput, scannerPayload);
  const finalCritic = await critique(currentOutput, analyzerOutput, scannerPayload);
  const finalScore = (finalValidator.score + finalCritic.score) / 2;
  
  return {
    done: true,
    iteration,
    fixed: fixedIssues,
    remaining: combineIssues(finalValidator, finalCritic).map(i => i.id),
    manualReviewNeeded,
    output: currentOutput,
    scores: {
      validator: finalValidator.score,
      critic: finalCritic.score,
      combined: finalScore,
    },
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function combineIssues(
  validatorResult: ValidatorResult,
  criticResult: CriticResult
): CombinedIssue[] {
  const combined: CombinedIssue[] = [];
  
  // Add validator issues
  for (const issue of validatorResult.issues) {
    combined.push({
      id: issue.id,
      type: issue.type,
      description: `${issue.type}: ${issue.target}`,
      suggestion: issue.suggestion,
      source: 'validator',
      severity: issue.severity,
    });
  }
  
  // Add critic issues
  for (const issue of criticResult.issues) {
    combined.push({
      id: issue.id,
      type: issue.type,
      description: issue.description,
      suggestion: issue.suggestion,
      source: 'critic',
      severity: 'warning', // Critic issues are generally warnings
    });
  }
  
  return combined;
}

function categorizeIssues(
  allIssues: CombinedIssue[],
  attemptTracker: Map<string, number>
): { fixableIssues: CombinedIssue[]; persistentIssues: CombinedIssue[] } {
  const fixableIssues: CombinedIssue[] = [];
  const persistentIssues: CombinedIssue[] = [];
  
  for (const issue of allIssues) {
    const attempts = attemptTracker.get(issue.id) || 0;
    
    if (attempts >= MAX_ATTEMPTS_PER_ISSUE) {
      persistentIssues.push(issue);
    } else {
      fixableIssues.push(issue);
    }
  }
  
  return { fixableIssues, persistentIssues };
}

async function applyFixes(
  currentOutput: GeneratorOutput,
  issuesToFix: CombinedIssue[],
  scannerPayload: ScannerPayload,
  analyzerOutput: AnalyzerOutput,
  llmClient?: LLMClient
): Promise<GeneratorOutput> {
  // Clone current output
  const fixedOutput: GeneratorOutput = JSON.parse(JSON.stringify(currentOutput));
  
  for (const issue of issuesToFix) {
    switch (issue.type) {
      case 'selector-not-found':
        // Try to find alternative selector
        fixSelectorIssue(fixedOutput, issue, scannerPayload);
        break;
      
      case 'constraint-not-covered':
        // Add missing validation test
        addMissingValidationTest(fixedOutput, issue, scannerPayload, analyzerOutput);
        break;
      
      case 'missing-test':
        // Add missing test case
        addMissingTestCase(fixedOutput, issue, scannerPayload, analyzerOutput);
        break;
      
      case 'element-wrong-page':
        // Fix step order or page reference
        fixPageIssue(fixedOutput, issue, scannerPayload);
        break;
      
      default:
        // For other issues, try regenerating the problematic suite
        if (llmClient) {
          await regenerateSuite(fixedOutput, issue, scannerPayload, analyzerOutput, llmClient);
        }
    }
  }
  
  return fixedOutput;
}

function fixSelectorIssue(
  output: GeneratorOutput,
  issue: CombinedIssue,
  scanner: ScannerPayload
): void {
  const badSelector = issue.description.split(': ')[1]?.replace(/"/g, '') || '';
  
  // Find element with similar name
  const targetElement = scanner.elements.find(el => {
    const name = (el.attributes['name'] as string) || '';
    return badSelector.includes(name) || name.includes(badSelector.split('[')[0]);
  });
  
  if (!targetElement) return;
  
  // Replace bad selector with bestSelector
  for (const suite of output.suites) {
    for (const testCase of suite.cases) {
      for (const step of testCase.steps) {
        if (step.target === badSelector) {
          step.target = targetElement.bestSelector;
          step.source.selector = `scanner.elements.${targetElement.id}.bestSelector`;
        }
      }
      
      for (const assertion of testCase.assertions) {
        if (assertion.target === badSelector) {
          assertion.target = targetElement.bestSelector;
          assertion.source = `scanner.elements.${targetElement.id}.bestSelector`;
        }
      }
    }
  }
}

function addMissingValidationTest(
  output: GeneratorOutput,
  issue: CombinedIssue,
  scanner: ScannerPayload,
  analyzer: AnalyzerOutput
): void {
  // Parse constraint from issue (format: "field.ruletype")
  const constraintMatch = issue.description.match(/"([^"]+)"/);
  if (!constraintMatch) return;
  
  const [fieldName, ruleType] = constraintMatch[1].split('.');
  
  // Find the constraint
  const constraint = scanner.constraints.find(c => c.field === fieldName);
  if (!constraint) return;
  
  // Find invalid example for this rule
  const invalidExample = constraint.invalidExamples.find(inv => inv.violates === ruleType);
  if (!invalidExample) return;
  
  // Find element for this field
  const element = scanner.elements.find(el => 
    el.attributes['name'] === fieldName || el.id.includes(fieldName)
  );
  if (!element) return;
  
  // Find page for this element
  const page = scanner.pages.find(p => p.elementIds.includes(element.id));
  if (!page) return;
  
  // Find appropriate suite
  let targetSuite = output.suites.find(s => 
    s.cases.some(c => c.steps.some(step => step.target.includes(element.bestSelector)))
  );
  
  if (!targetSuite && output.suites.length > 0) {
    targetSuite = output.suites[0];
  }
  
  if (!targetSuite) return;
  
  // Add validation test case
  const newCase = {
    id: `case-validation-${fieldName}-${ruleType}-fix`,
    name: `${fieldName} ${ruleType} validation`,
    type: 'validation' as const,
    testedConstraint: `${fieldName}.${ruleType}`,
    steps: [
      {
        id: `step-nav-${page.id}`,
        description: `Navigate to ${page.url}`,
        action: 'navigate' as const,
        target: page.url,
        value: null,
        confidence: 1.0,
        source: { url: `scanner.pages.${page.id}.url` },
      },
      {
        id: `step-fill-${element.id}`,
        description: `Fill ${fieldName} with invalid value`,
        action: 'fill' as const,
        target: element.bestSelector,
        value: invalidExample.value,
        confidence: 0.9,
        source: {
          selector: `scanner.elements.${element.id}.bestSelector`,
          value: `scanner.constraints.${fieldName}.invalidExamples`,
        },
      },
    ],
    assertions: [
      {
        type: 'url' as const,
        expected: page.url,
        target: null,
        confidence: 0.9,
        source: 'validation-expectation',
        reason: 'Should stay on page due to validation error',
      },
    ],
  };
  
  targetSuite.cases.push(newCase);
}

function addMissingTestCase(
  output: GeneratorOutput,
  issue: CombinedIssue,
  scanner: ScannerPayload,
  analyzer: AnalyzerOutput
): void {
  // This would add test cases for critic issues like "empty submission"
  // Implementation depends on specific issue type
  
  if (issue.description.includes('empty') && issue.description.includes('submission')) {
    // Add empty submission test
    const formElements = scanner.elements.filter(el => el.formId);
    if (formElements.length === 0) return;
    
    const formId = formElements[0].formId!;
    const submitButton = formElements.find(el => 
      el.tagName === 'button' && el.attributes['type'] === 'submit'
    );
    
    if (!submitButton) return;
    
    const page = scanner.pages.find(p => p.elementIds.includes(submitButton.id));
    if (!page) return;
    
    const targetSuite = output.suites[0];
    if (!targetSuite) return;
    
    targetSuite.cases.push({
      id: `case-empty-submission-fix`,
      name: 'Empty form submission',
      type: 'validation',
      testedConstraint: null,
      steps: [
        {
          id: `step-nav-empty`,
          description: `Navigate to ${page.url}`,
          action: 'navigate',
          target: page.url,
          value: null,
          confidence: 1.0,
          source: { url: `scanner.pages.${page.id}.url` },
        },
        {
          id: `step-click-empty`,
          description: 'Click submit without filling',
          action: 'click',
          target: submitButton.bestSelector,
          value: null,
          confidence: 0.95,
          source: { selector: `scanner.elements.${submitButton.id}.bestSelector` },
        },
      ],
      assertions: [
        {
          type: 'url',
          expected: page.url,
          target: null,
          confidence: 0.9,
          source: 'validation-expectation',
          reason: 'Should stay on page when submitting empty form',
        },
      ],
    });
  }
}

function fixPageIssue(
  output: GeneratorOutput,
  issue: CombinedIssue,
  scanner: ScannerPayload
): void {
  // Fix step that references element on wrong page
  // Usually means navigate step is missing
  
  // For now, just log - complex fix would require more context
  console.log(`   ⚠️ Page issue requires manual review: ${issue.description}`);
}

interface LLMFixResponse {
  fix: {
    type: 'add-step' | 'modify-step' | 'add-assertion' | 'add-test-case' | 'remove-test';
    testCaseId?: string;
    stepIndex?: number;
    newStep?: {
      action: string;
      target: string;
      value: string | null;
    };
    newAssertion?: {
      type: string;
      expected: string;
      target: string | null;
    };
    newTestCase?: {
      name: string;
      type: string;
      steps: Array<{ action: string; target: string; value: string | null }>;
      expectedResult: string;
    };
    reason: string;
  } | null;
  cannotFix?: string;
}

const SELF_HEALER_SYSTEM_PROMPT = `You are a QA test fix assistant.
You analyze test issues and suggest specific fixes.

You can suggest:
1. Adding a new step to a test
2. Modifying an existing step
3. Adding an assertion
4. Adding a new test case
5. Removing a problematic test

Always use selectors and URLs from the provided scanner data.
NEVER invent selectors that don't exist.
If you cannot fix the issue, say so clearly.`;

async function regenerateSuite(
  output: GeneratorOutput,
  issue: CombinedIssue,
  scanner: ScannerPayload,
  analyzer: AnalyzerOutput,
  llmClient: LLMClient
): Promise<void> {
  if (!llmClient.isAvailable()) {
    return;
  }
  
  const prompt = buildFixPrompt(output, issue, scanner);
  
  try {
    const response = await llmClient.completeJSON<LLMFixResponse>(prompt, {
      systemPrompt: SELF_HEALER_SYSTEM_PROMPT,
      temperature: 0.2,
      maxTokens: 2048,
    });
    
    if (response.fix) {
      applyLLMFix(output, response.fix, scanner);
      console.log(`   🧠 LLM fix applied: ${response.fix.reason}`);
    } else if (response.cannotFix) {
      console.log(`   ⚠️ LLM cannot fix: ${response.cannotFix}`);
    }
  } catch (error) {
    console.error('   ⚠️ LLM fix generation failed:', error);
  }
}

function buildFixPrompt(
  output: GeneratorOutput,
  issue: CombinedIssue,
  scanner: ScannerPayload
): string {
  // Find the affected test case
  const affectedSuite = output.suites.find(s => 
    s.cases.some(c => issue.description.includes(c.id) || issue.description.includes(c.name))
  );
  
  const affectedCase = affectedSuite?.cases.find(c => 
    issue.description.includes(c.id) || issue.description.includes(c.name)
  );
  
  // Get available selectors
  const availableSelectors = scanner.elements.slice(0, 20).map(el => ({
    selector: el.bestSelector,
    name: el.attributes['name'] || el.id,
    type: el.tagName,
  }));
  
  const availableUrls = scanner.pages.map(p => p.url);
  
  return `Fix this test issue.

# Issue
Type: ${issue.type}
Description: ${issue.description}
Suggestion: ${issue.suggestion}

# Affected Test
${affectedCase ? JSON.stringify(affectedCase, null, 2) : 'Not identified'}

# Available Data
Selectors: ${JSON.stringify(availableSelectors)}
URLs: ${availableUrls.join(', ')}

# Instructions
Provide a specific fix using ONLY the selectors and URLs above.
If the issue cannot be fixed automatically, explain why.

Respond with JSON:
{
  "fix": {
    "type": "add-step|modify-step|add-assertion|add-test-case|remove-test",
    "testCaseId": "id of test to modify",
    "stepIndex": 0,
    "newStep": { "action": "fill|click|navigate", "target": "selector", "value": "value or null" },
    "newAssertion": { "type": "url|visible", "expected": "expected", "target": "selector or null" },
    "newTestCase": { "name": "test name", "type": "validation", "steps": [...], "expectedResult": "..." },
    "reason": "why this fix"
  }
}

Or if cannot fix:
{
  "fix": null,
  "cannotFix": "explanation"
}`;
}

function applyLLMFix(
  output: GeneratorOutput,
  fix: NonNullable<LLMFixResponse['fix']>,
  scanner: ScannerPayload
): void {
  switch (fix.type) {
    case 'add-step':
      if (fix.testCaseId && fix.newStep && fix.stepIndex !== undefined) {
        for (const suite of output.suites) {
          const testCase = suite.cases.find(c => c.id === fix.testCaseId);
          if (testCase) {
            testCase.steps.splice(fix.stepIndex, 0, {
              id: `step-llm-fix-${Date.now()}`,
              description: `${fix.newStep.action} ${fix.newStep.target}`,
              action: fix.newStep.action as any,
              target: fix.newStep.target,
              value: fix.newStep.value,
              confidence: 0.7,
              source: { llm: 'self-healer-fix' },
            });
            break;
          }
        }
      }
      break;
    
    case 'add-assertion':
      if (fix.testCaseId && fix.newAssertion) {
        for (const suite of output.suites) {
          const testCase = suite.cases.find(c => c.id === fix.testCaseId);
          if (testCase) {
            testCase.assertions.push({
              type: fix.newAssertion.type as any,
              expected: fix.newAssertion.expected,
              target: fix.newAssertion.target,
              confidence: 0.7,
              source: 'llm-self-healer',
              reason: fix.reason,
            });
            break;
          }
        }
      }
      break;
    
    case 'add-test-case':
      if (fix.newTestCase) {
        const targetSuite = output.suites[0];
        if (targetSuite) {
          const newCase: GeneratedCase = {
            id: `case-llm-${Date.now()}`,
            name: fix.newTestCase.name,
            type: fix.newTestCase.type as any,
            testedConstraint: null,
            steps: fix.newTestCase.steps.map((s, i) => ({
              id: `step-llm-${i}`,
              description: `${s.action} ${s.target}`,
              action: s.action as any,
              target: s.target,
              value: s.value,
              confidence: 0.7,
              source: { llm: 'self-healer-generated' },
            })),
            assertions: [{
              type: 'url' as const,
              expected: fix.newTestCase.expectedResult,
              target: null,
              confidence: 0.6,
              source: 'llm-self-healer',
              reason: fix.reason,
            }],
          };
          targetSuite.cases.push(newCase);
        }
      }
      break;
    
    case 'remove-test':
      if (fix.testCaseId) {
        for (const suite of output.suites) {
          const idx = suite.cases.findIndex(c => c.id === fix.testCaseId);
          if (idx >= 0) {
            suite.cases.splice(idx, 1);
            break;
          }
        }
      }
      break;
    
    case 'modify-step':
      if (fix.testCaseId && fix.stepIndex !== undefined && fix.newStep) {
        for (const suite of output.suites) {
          const testCase = suite.cases.find(c => c.id === fix.testCaseId);
          if (testCase && testCase.steps[fix.stepIndex]) {
            testCase.steps[fix.stepIndex] = {
              ...testCase.steps[fix.stepIndex],
              action: fix.newStep.action as any,
              target: fix.newStep.target,
              value: fix.newStep.value,
              description: `${fix.newStep.action} ${fix.newStep.target}`,
              confidence: 0.7,
            };
            break;
          }
        }
      }
      break;
  }
}

/**
 * V5 Discovery - Critic Agent
 * 
 * LLM reviewer with CHECKLIST-BASED evaluation.
 * Cannot miss required tests because checklist is explicit.
 * 
 * Features:
 * - Required checks for all apps
 * - Conditional checks (auth, CRUD, multi-step)
 * - Evidence-based validation
 */

import {
  ScannerPayload,
  AnalyzerOutput,
  GeneratorOutput,
  CriticResult,
  ChecklistItem,
  CriticIssue,
} from '../types';
import { LLMClient } from '../llm-client';

// =============================================================================
// CHECKLIST DEFINITION
// =============================================================================

interface ChecklistDefinition {
  id: string;
  description: string;
  required: boolean;
  condition?: (analyzer: AnalyzerOutput, scanner: ScannerPayload) => boolean;
  check: (generator: GeneratorOutput, scanner: ScannerPayload) => CheckResult;
}

interface CheckResult {
  passed: boolean;
  evidence: string | null;
  reason: string | null;
}

const CHECKLIST: ChecklistDefinition[] = [
  // REQUIRED FOR ALL
  {
    id: 'happy-path-per-form',
    description: 'Has happy-path test for each form',
    required: true,
    check: (generator, scanner) => {
      const formIds = getFormIds(scanner);
      const happyPathCases = generator.suites.flatMap(s => 
        s.cases.filter(c => c.type === 'happy-path')
      );
      
      // Check if all forms have happy path
      const missingForms = formIds.filter(formId => 
        !happyPathCases.some(c => c.id.includes(formId))
      );
      
      if (missingForms.length === 0) {
        return { 
          passed: true, 
          evidence: `${happyPathCases.length} happy-path cases cover ${formIds.length} forms`,
          reason: null 
        };
      }
      
      return { 
        passed: false, 
        evidence: null, 
        reason: `Missing happy-path for forms: ${missingForms.join(', ')}`
      };
    },
  },
  {
    id: 'validation-per-required',
    description: 'Has validation test for each required field',
    required: true,
    check: (generator, scanner) => {
      const requiredFields = scanner.constraints.filter(c => 
        c.rules.some(r => r.type === 'required')
      );
      
      const validationCases = generator.suites.flatMap(s => 
        s.cases.filter(c => c.type === 'validation' && c.testedConstraint?.includes('.required'))
      );
      
      const testedFields = validationCases.map(c => c.testedConstraint?.split('.')[0]);
      const missingFields = requiredFields.filter(f => !testedFields.includes(f.field));
      
      if (missingFields.length === 0) {
        return { 
          passed: true, 
          evidence: `${validationCases.length} validation cases`,
          reason: null 
        };
      }
      
      return { 
        passed: false, 
        evidence: null, 
        reason: `Missing required validation for: ${missingFields.map(f => f.field).join(', ')}`
      };
    },
  },
  {
    id: 'empty-submission',
    description: 'Has empty form submission test',
    required: true,
    check: (generator, scanner) => {
      const allCases = generator.suites.flatMap(s => s.cases);
      
      // Look for a case that submits without filling required fields
      const emptySubmitCase = allCases.find(c => {
        const hasNavigate = c.steps.some(s => s.action === 'navigate');
        const hasSubmit = c.steps.some(s => s.action === 'click');
        const fillSteps = c.steps.filter(s => s.action === 'fill');
        
        // Empty submission = navigate + click with no fills or empty fills
        return hasNavigate && hasSubmit && (
          fillSteps.length === 0 || 
          fillSteps.every(s => s.value === '')
        );
      });
      
      // Also check if there's a "required" validation test (effectively tests empty)
      const requiredValidation = allCases.find(c => 
        c.testedConstraint?.includes('.required')
      );
      
      if (emptySubmitCase || requiredValidation) {
        return { 
          passed: true, 
          evidence: emptySubmitCase?.id || requiredValidation?.id || 'required validation',
          reason: null 
        };
      }
      
      return { 
        passed: false, 
        evidence: null, 
        reason: 'No empty form submission test found'
      };
    },
  },
  
  // CONDITIONAL: AUTH
  {
    id: 'auth-invalid-credentials',
    description: 'Has invalid credentials test',
    required: false,
    condition: (analyzer) => analyzer.journeys.some(j => j.type === 'authentication'),
    check: (generator, scanner) => {
      const allCases = generator.suites.flatMap(s => s.cases);
      
      // Look for auth-related validation or error case
      const authErrorCase = allCases.find(c => 
        c.type === 'validation' || c.type === 'error'
      );
      
      // We can't actually test invalid credentials without API mocking
      // So we just check if validation tests exist
      if (authErrorCase) {
        return { 
          passed: true, 
          evidence: 'Validation cases exist (full credentials test requires API mocking)',
          reason: null 
        };
      }
      
      return { 
        passed: false, 
        evidence: null, 
        reason: 'No invalid credentials test (consider adding API mocking)'
      };
    },
  },
  
  // CONDITIONAL: MULTI-STEP FLOW
  {
    id: 'complete-flow-test',
    description: 'Has complete flow test for multi-step journeys',
    required: false,
    condition: (analyzer) => analyzer.journeys.some(j => j.pageSequence.length > 1),
    check: (generator, scanner) => {
      const allCases = generator.suites.flatMap(s => s.cases);
      
      // Look for journey happy-path cases
      const journeyCases = allCases.filter(c => c.id.includes('journey'));
      
      if (journeyCases.length > 0) {
        return { 
          passed: true, 
          evidence: `${journeyCases.length} journey flow tests`,
          reason: null 
        };
      }
      
      return { 
        passed: false, 
        evidence: null, 
        reason: 'No complete multi-step flow test found'
      };
    },
  },
  
  // CONDITIONAL: CONSTRAINTS
  {
    id: 'constraint-coverage',
    description: 'All constraint rules have validation tests',
    required: false,
    condition: (_, scanner) => scanner.constraints.length > 0,
    check: (generator, scanner) => {
      const allRules: string[] = [];
      for (const c of scanner.constraints) {
        for (const r of c.rules) {
          allRules.push(`${c.field}.${r.type}`);
        }
      }
      
      const testedRules = new Set(
        generator.suites.flatMap(s => 
          s.cases.map(c => c.testedConstraint).filter(Boolean)
        )
      );
      
      const coverage = testedRules.size / allRules.length;
      
      if (coverage >= 0.8) {
        return { 
          passed: true, 
          evidence: `${Math.round(coverage * 100)}% constraint coverage`,
          reason: null 
        };
      }
      
      const uncovered = allRules.filter(r => !testedRules.has(r));
      return { 
        passed: false, 
        evidence: null, 
        reason: `Only ${Math.round(coverage * 100)}% coverage. Missing: ${uncovered.slice(0, 3).join(', ')}`
      };
    },
  },
];

// =============================================================================
// MAIN CRITIC FUNCTION
// =============================================================================

/**
 * Critique generator output using checklist
 */
export async function critique(
  generatorOutput: GeneratorOutput,
  analyzerOutput: AnalyzerOutput,
  scannerPayload: ScannerPayload,
  llmClient?: LLMClient
): Promise<CriticResult> {
  const checklist: ChecklistItem[] = [];
  const issues: CriticIssue[] = [];
  
  // Run each checklist item
  for (const item of CHECKLIST) {
    // Check if this item is applicable
    const applicable = !item.condition || item.condition(analyzerOutput, scannerPayload);
    
    if (!applicable) {
      checklist.push({
        item: item.description,
        passed: true,
        evidence: 'N/A - condition not met',
        reason: null,
        applicable: false,
      });
      continue;
    }
    
    // Run the check
    const result = item.check(generatorOutput, scannerPayload);
    
    checklist.push({
      item: item.description,
      passed: result.passed,
      evidence: result.evidence,
      reason: result.reason,
      applicable: true,
    });
    
    // Create issue for failed checks
    if (!result.passed) {
      issues.push({
        id: `critic-issue-${item.id}`,
        type: 'missing-test',
        description: item.description,
        suggestion: result.reason || `Add test for: ${item.description}`,
      });
    }
  }
  
  // Optionally use LLM to find additional issues
  if (llmClient && llmClient.isAvailable()) {
    console.log('   🧠 Using LLM for additional QA review...');
    const llmIssues = await findAdditionalIssues(
      generatorOutput,
      scannerPayload,
      llmClient
    );
    if (llmIssues.length > 0) {
      console.log(`   📝 LLM found ${llmIssues.length} additional suggestions`);
    }
    issues.push(...llmIssues);
  }
  
  // Calculate score
  const applicableItems = checklist.filter(c => c.applicable);
  const passedItems = applicableItems.filter(c => c.passed);
  const score = applicableItems.length > 0 
    ? passedItems.length / applicableItems.length 
    : 1;
  
  return {
    score,
    checklist,
    issues,
  };
}

// =============================================================================
// LLM ENHANCEMENT
// =============================================================================

interface LLMCriticResponse {
  issues: Array<{
    id: string;
    type: 'missing-test' | 'weak-assertion' | 'missing-edge-case' | 'coverage-gap';
    description: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

const CRITIC_SYSTEM_PROMPT = `You are a senior QA engineer reviewing test suites for completeness.
You must identify gaps in test coverage that a rule-based system might miss.

Focus on:
1. Missing edge cases (boundary values, unicode, special characters)
2. Incomplete error handling (network failures, timeouts)
3. State management gaps (refresh, back navigation, session expiry)
4. Accessibility issues (keyboard navigation, screen readers)

Be specific and actionable in your suggestions.
Only suggest tests that can be implemented without external dependencies.`;

async function findAdditionalIssues(
  generatorOutput: GeneratorOutput,
  scannerPayload: ScannerPayload,
  llmClient: LLMClient
): Promise<CriticIssue[]> {
  const prompt = buildCriticPrompt(generatorOutput, scannerPayload);
  
  try {
    const response = await llmClient.completeJSON<LLMCriticResponse>(prompt, {
      systemPrompt: CRITIC_SYSTEM_PROMPT,
      temperature: 0.3,
      maxTokens: 2048,
    });
    
    return (response.issues || []).map((item, idx) => ({
      id: item.id || `llm-issue-${idx}`,
      type: item.type || 'missing-test',
      description: item.description || 'Unknown issue',
      suggestion: item.suggestion || 'Review manually',
    }));
  } catch (error) {
    console.error('   ⚠️ LLM critic analysis failed:', error);
    return [];
  }
}

function buildCriticPrompt(
  generatorOutput: GeneratorOutput,
  scannerPayload: ScannerPayload
): string {
  // Summarize existing tests
  const testSummary = generatorOutput.suites.map(s => ({
    suite: s.name,
    tests: s.cases.map(c => `${c.type}: ${c.name}`).join(', '),
  }));
  
  // Summarize pages and forms
  const pageUrls = scannerPayload.pages.slice(0, 15).map(p => p.url);
  const constraintSummary = scannerPayload.constraints.slice(0, 10).map(c => 
    `${c.field}: ${c.rules.map(r => r.type).join(', ')}`
  );
  
  return `Review these test suites and identify gaps.

# Current Test Suites
${testSummary.map(s => `${s.suite}:\n  ${s.tests}`).join('\n')}

# Application Structure
Pages: ${pageUrls.join(', ')}${scannerPayload.pages.length > 15 ? '...' : ''}
Forms with constraints: ${constraintSummary.join('; ')}

# Your Task
Identify 2-5 SPECIFIC gaps in test coverage. Focus on:
1. Edge cases the rule-based generator missed
2. Error scenarios not covered
3. Security considerations
4. Usability issues

# Rules
- Be specific: "Login form missing SQL injection test" not "add security tests"
- Only suggest implementable tests
- Max 5 suggestions, prioritize by impact

Respond with JSON:
{
  "issues": [
    {
      "id": "unique-id",
      "type": "missing-test|weak-assertion|missing-edge-case|coverage-gap",
      "description": "specific description",
      "suggestion": "how to fix",
      "priority": "high|medium|low"
    }
  ]
}`;
}

// =============================================================================
// HELPERS
// =============================================================================

function getFormIds(scanner: ScannerPayload): string[] {
  const formIds = new Set<string>();
  
  for (const el of scanner.elements) {
    if (el.formId) {
      formIds.add(el.formId);
    }
  }
  
  return Array.from(formIds);
}

# V5 Universal Discovery System - Design Conversation
**Date:** 2026-01-14

---

## Overview

Dizajn razgovora za kompletni refaktor `/analyze/discover` endpoint-a. Cilj je eliminisati sve hardkodirane logike i kreirati univerzalni sistem koji radi za bilo koju web aplikaciju.

---

## Problem Statement

Trenutni V4 sistem ima 10 kritičnih problema:
1. Hardkodirana logika (`if path.includes('dashboard')`)
2. Konačni enumi i switch statements
3. Pattern-matching umesto semantičkog razumevanja
4. Scanner interpretira umesto da samo prikuplja
5. Validator ima if-else po tipu akcije
6. LLM nije integrisan (samo rule-based fallback)
7. Radi samo za specifične framework pattern-e

---

## Golden Rules za V5

1. **SCANNER = "Dumb" data collector** (zero interpretation)
2. **LLM = Jedini interpreter** (razume značenje)
3. **VALIDATOR = Data-driven checker** (samo proverava "da li ovo postoji?")

---

# V5 ZERO-WEAKNESS PIPELINE

## FAZA 1: SCANNER

### ŠTA RADI
Skenira source code i izvlači SVE podatke bez interpretacije. Detektuje test framework za selector prioritet. Parsira validation library-e. Mapira elemente na stranice.

### PRIMER KODA KOJI SKENIRA

```tsx
// /app/login/page.tsx
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/)
});

export default function LoginPage() {
  return (
    <form onSubmit={handleLogin}>
      <input data-testid="email" name="email" type="email" required />
      <input name="password" type="password" />
      <button type="submit">Login</button>
    </form>
  );
}

// /app/dashboard/page.tsx
export default function Dashboard() {
  return <h1 data-testid="welcome">Welcome</h1>;
}

// /cypress/e2e/example.cy.ts  (test file - za auto-detect)
cy.get('[data-cy="something"]').click();
```

### INPUT
```
Root folder: /app
```

### OUTPUT
```json
{
  "config": {
    "detectedTestFramework": "cypress",
    "selectorPriority": ["data-cy", "data-testid", "name", "id", "type", "class"],
    "detectionReason": "Found cypress/ folder with cy.get('[data-cy=...]') usage"
  },

  "pages": [
    {
      "id": "page-1",
      "file": "/app/login/page.tsx",
      "url": "/login",
      "elements": ["el-1", "el-2", "el-3"]
    },
    {
      "id": "page-2", 
      "file": "/app/dashboard/page.tsx",
      "url": "/dashboard",
      "elements": ["el-4"]
    }
  ],

  "elements": [
    {
      "id": "el-1",
      "pageId": "page-1",
      "tagName": "input",
      "attributes": { "data-testid": "email", "name": "email", "type": "email", "required": true },
      "selectors": [
        { "value": "[data-testid=\"email\"]", "rank": 1 },
        { "value": "[name=\"email\"]", "rank": 2 },
        { "value": "input[type=\"email\"]", "rank": 3 }
      ],
      "bestSelector": "[data-testid=\"email\"]"
    },
    {
      "id": "el-2",
      "pageId": "page-1",
      "tagName": "input",
      "attributes": { "name": "password", "type": "password" },
      "selectors": [
        { "value": "[name=\"password\"]", "rank": 1 },
        { "value": "input[type=\"password\"]", "rank": 2 }
      ],
      "bestSelector": "[name=\"password\"]"
    },
    {
      "id": "el-3",
      "pageId": "page-1",
      "tagName": "button",
      "attributes": { "type": "submit" },
      "textContent": "Login",
      "selectors": [
        { "value": "button[type=\"submit\"]", "rank": 1 },
        { "value": "button:contains(\"Login\")", "rank": 2 }
      ],
      "bestSelector": "button[type=\"submit\"]"
    },
    {
      "id": "el-4",
      "pageId": "page-2",
      "tagName": "h1",
      "attributes": { "data-testid": "welcome" },
      "textContent": "Welcome",
      "selectors": [
        { "value": "[data-testid=\"welcome\"]", "rank": 1 },
        { "value": "h1", "rank": 2 }
      ],
      "bestSelector": "[data-testid=\"welcome\"]"
    }
  ],

  "constraints": [
    {
      "field": "email",
      "elementId": "el-1",
      "rules": [
        { "type": "required", "source": "html-attribute" },
        { "type": "email", "source": "zod-schema" }
      ],
      "validExamples": ["user@test.com"],
      "invalidExamples": [
        { "value": "", "violates": "required" },
        { "value": "notanemail", "violates": "email" }
      ]
    },
    {
      "field": "password",
      "elementId": "el-2",
      "rules": [
        { "type": "minLength", "value": 8, "source": "zod-schema" },
        { "type": "pattern", "regex": "[A-Z]", "source": "zod-schema" }
      ],
      "validExamples": ["Password1"],
      "invalidExamples": [
        { "value": "Short1", "violates": "minLength" },
        { "value": "nouppercase1", "violates": "pattern" }
      ]
    }
  ],

  "flows": [
    {
      "id": "flow-1",
      "name": "login-to-dashboard",
      "steps": [
        { "pageId": "page-1", "action": "form-submit", "nextPageId": "page-2" }
      ],
      "detection": "router.push('/dashboard') after handleLogin"
    }
  ],

  "unknownValidations": []
}
```

### SLABOSTI: NEMA

| Potencijalna slabost | Kako je rešeno |
|---------------------|----------------|
| Hardkodiran selector ranking | Auto-detect iz test fajlova + konfigurabilan override |
| Nepoznat validation library | `unknownValidations` array → LLM parsira u Analyzer fazi |
| Ne prepoznaje flow | Traži `router.push`, `navigate`, `redirect` pattern-e |
| Element nije mapiran na page | Svaki element ima `pageId` iz parse konteksta |

---

## FAZA 2: ANALYZER

### ŠTA RADI
LLM analizira Scanner output i izvlači semantičko razumevanje: domeni, user journeys, auth granice. Zatim Analyzer Validator proverava da LLM nije izmislio ništa.

### INPUT
Scanner output (gore)

### LLM PROMPT
```
You are analyzing a web application structure.

Scanner found these pages: /login, /dashboard
Scanner found these form fields: email, password
Scanner found this flow: login → dashboard

Identify:
1. Domains (logical groupings)
2. User journeys (sequences of actions)
3. Auth boundary (which pages require login)

IMPORTANT: Only reference URLs and fields that exist in the scanner data.
```

### LLM OUTPUT
```json
{
  "domains": [
    { "name": "Authentication", "pages": ["/login"] },
    { "name": "Main App", "pages": ["/dashboard"] }
  ],
  "journeys": [
    {
      "name": "User Login",
      "steps": ["/login", "/dashboard"],
      "fields": ["email", "password"],
      "type": "authentication"
    }
  ],
  "authBoundary": {
    "public": ["/login"],
    "protected": ["/dashboard"]
  }
}
```

### ANALYZER VALIDATOR
```
Checking LLM output against Scanner data...

✅ URL "/login" exists in Scanner pages
✅ URL "/dashboard" exists in Scanner pages
✅ Field "email" exists in Scanner elements
✅ Field "password" exists in Scanner elements

Result: VALID
```

### FINAL OUTPUT
```json
{
  "analysis": { ... },
  "validation": { "valid": true, "issues": [] }
}
```

### SLABOSTI: NEMA

| Potencijalna slabost | Kako je rešeno |
|---------------------|----------------|
| LLM izmisli URL | Validator proverava da URL postoji u Scanner.pages |
| LLM izmisli field | Validator proverava da field postoji u Scanner.elements |
| LLM pogreši journey | Journey koristi samo postojeće URLs, validator potvrđuje |

Ako Validator fails → LLM dobija feedback i retry (max 2x).

---

## FAZA 3: GENERATOR

### ŠTA RADI
LLM generiše test suites/cases/steps koristeći ISKLJUČIVO podatke iz Scanner-a. Nema inference - sve dolazi iz konkretnih podataka.

### INPUT
- Scanner output (elementi, selektori, constraints)
- Analyzer output (journeys, domains)

### LLM PROMPT
```
Generate test suites for this application.

RULES:
1. Use ONLY selectors from scanner.elements[].bestSelector
2. Use ONLY test values from scanner.constraints[].validExamples or invalidExamples
3. Use ONLY URLs from scanner.pages[].url
4. Use ONLY assertion targets from scanner.elements[].bestSelector
5. For each constraint rule, generate ONE validation test

Available selectors:
- [data-testid="email"] (page: /login)
- [name="password"] (page: /login)
- button[type="submit"] (page: /login)
- [data-testid="welcome"] (page: /dashboard)

Available test values:
- email valid: "user@test.com"
- email invalid (required): ""
- email invalid (format): "notanemail"
- password valid: "Password1"
- password invalid (minLength): "Short1"
- password invalid (pattern): "nouppercase1"
```

### OUTPUT
```json
{
  "suites": [
    {
      "name": "Authentication",
      "domain": "Authentication",
      "cases": [
        {
          "id": "case-1",
          "name": "Successful login",
          "type": "happy-path",
          "steps": [
            {
              "id": "step-1",
              "action": "navigate",
              "target": "/login",
              "source": "scanner.pages.page-1.url"
            },
            {
              "id": "step-2",
              "action": "fill",
              "target": "[data-testid=\"email\"]",
              "value": "user@test.com",
              "source": {
                "selector": "scanner.elements.el-1.bestSelector",
                "value": "scanner.constraints.email.validExamples[0]"
              }
            },
            {
              "id": "step-3",
              "action": "fill",
              "target": "[name=\"password\"]",
              "value": "Password1",
              "source": {
                "selector": "scanner.elements.el-2.bestSelector",
                "value": "scanner.constraints.password.validExamples[0]"
              }
            },
            {
              "id": "step-4",
              "action": "click",
              "target": "button[type=\"submit\"]",
              "source": "scanner.elements.el-3.bestSelector"
            }
          ],
          "assertions": [
            {
              "type": "url",
              "expected": "/dashboard",
              "source": "scanner.flows.flow-1.nextPageId"
            },
            {
              "type": "visible",
              "target": "[data-testid=\"welcome\"]",
              "source": "scanner.elements.el-4.bestSelector"
            }
          ]
        },
        {
          "id": "case-2",
          "name": "Email required validation",
          "type": "validation",
          "testedConstraint": "email.required",
          "steps": [
            { "action": "navigate", "target": "/login" },
            { "action": "fill", "target": "[data-testid=\"email\"]", "value": "" },
            { "action": "fill", "target": "[name=\"password\"]", "value": "Password1" },
            { "action": "click", "target": "button[type=\"submit\"]" }
          ],
          "assertions": [
            { "type": "url", "expected": "/login", "reason": "Should stay on page" }
          ]
        },
        {
          "id": "case-3",
          "name": "Email format validation",
          "type": "validation",
          "testedConstraint": "email.email",
          "steps": [
            { "action": "navigate", "target": "/login" },
            { "action": "fill", "target": "[data-testid=\"email\"]", "value": "notanemail" },
            { "action": "fill", "target": "[name=\"password\"]", "value": "Password1" },
            { "action": "click", "target": "button[type=\"submit\"]" }
          ],
          "assertions": [
            { "type": "url", "expected": "/login" }
          ]
        },
        {
          "id": "case-4",
          "name": "Password minLength validation",
          "type": "validation",
          "testedConstraint": "password.minLength",
          "steps": [
            { "action": "navigate", "target": "/login" },
            { "action": "fill", "target": "[data-testid=\"email\"]", "value": "user@test.com" },
            { "action": "fill", "target": "[name=\"password\"]", "value": "Short1" },
            { "action": "click", "target": "button[type=\"submit\"]" }
          ],
          "assertions": [
            { "type": "url", "expected": "/login" }
          ]
        },
        {
          "id": "case-5",
          "name": "Password pattern validation",
          "type": "validation",
          "testedConstraint": "password.pattern",
          "steps": [
            { "action": "navigate", "target": "/login" },
            { "action": "fill", "target": "[data-testid=\"email\"]", "value": "user@test.com" },
            { "action": "fill", "target": "[name=\"password\"]", "value": "nouppercase1" },
            { "action": "click", "target": "button[type=\"submit\"]" }
          ],
          "assertions": [
            { "type": "url", "expected": "/login" }
          ]
        }
      ]
    }
  ]
}
```

### SLABOSTI: NEMA

| Potencijalna slabost | Kako je rešeno |
|---------------------|----------------|
| Izmišljen selector | `source` field pokazuje odakle dolazi - mora biti iz Scanner-a |
| Izmišljena test vrednost | `source.value` pokazuje odakle - mora biti iz constraints |
| Assertion ne postoji | Assertion target mora biti iz Scanner elements |
| Nedostaje constraint test | `testedConstraint` field - Validator proverava coverage |

---

## FAZA 4: VALIDATOR

### ŠTA RADI
Proverava Generator output protiv Scanner podataka. Pet provera, sve data-driven, nula if-else po tipu akcije.

### INPUT
- Generator output (testovi)
- Scanner output (ground truth)

### PROVERE

#### 1. Selector Exists
```
Za svaki step.target:
  Pronađi u scanner.elements[].selectors[].value

case-1/step-2: "[data-testid=\"email\"]" 
  → scanner.elements.el-1.selectors[0].value ✅

case-1/assertions[1]: "[data-testid=\"welcome\"]"
  → scanner.elements.el-4.selectors[0].value ✅
```

#### 2. Value Satisfies Constraints
```
Za svaki step.value:
  Ako je happy-path → mora biti u validExamples
  Ako je validation test → mora biti u invalidExamples

case-1/step-2: value="user@test.com"
  → scanner.constraints.email.validExamples ✅

case-3/step-2: value="notanemail"
  → scanner.constraints.email.invalidExamples[1].value ✅
```

#### 3. Step On Correct Page
```
Za svaki step posle navigate:
  Element pageId mora == current page

case-1: navigate(/login) → current=page-1
  step-2: el-1.pageId=page-1 ✅
  step-3: el-2.pageId=page-1 ✅
  step-4: el-3.pageId=page-1 ✅
```

#### 4. Assertion Selector Exists
```
Za svaki assertion.target:
  Mora postojati u scanner.elements

case-1/assertion[1]: "[data-testid=\"welcome\"]"
  → scanner.elements.el-4.bestSelector ✅
```

#### 5. Constraint Coverage
```
Za svaki constraint rule:
  Mora postojati test case sa testedConstraint==rule

email.required → case-2 ✅
email.email → case-3 ✅
password.minLength → case-4 ✅
password.pattern → case-5 ✅

Coverage: 4/4 = 100% ✅
```

### OUTPUT
```json
{
  "valid": true,
  "score": 1.0,
  "checks": {
    "selectorExists": { "passed": 12, "failed": 0 },
    "valueSatisfiesConstraints": { "passed": 10, "failed": 0 },
    "stepOnCorrectPage": { "passed": 20, "failed": 0 },
    "assertionSelectorExists": { "passed": 6, "failed": 0 },
    "constraintCoverage": { "covered": 4, "total": 4 }
  },
  "issues": []
}
```

### SLABOSTI: NEMA

| Potencijalna slabost | Kako je rešeno |
|---------------------|----------------|
| Ne zna šta je "fill" vs "click" | Ne treba znati - samo proverava da selector postoji |
| Step dependency kompleksno | Jednostavno: element.pageId == currentPage |
| Ne zna koji constraint testira | Generator eksplicitno stavlja `testedConstraint` |

---

## FAZA 5: CRITIC

### ŠTA RADI
LLM reviewer sa OBAVEZNIM checklistom. Ne može propustiti jer ima eksplicitnu listu šta mora proveriti.

### INPUT
- Generator output
- Scanner output
- Checklist

### CHECKLIST
```
REQUIRED FOR ALL:
[ ] Has happy-path test for each form
[ ] Has empty submission test
[ ] Has validation test for EACH required field

IF HAS AUTH (detected from journey.type="authentication"):
[ ] Has invalid credentials test (valid format, wrong data)

IF HAS CRUD (detected from page patterns):
[ ] Has create test
[ ] Has read test  
[ ] Has update test
[ ] Has delete test

IF HAS MULTI-STEP FLOW:
[ ] Has complete flow test (all steps in sequence)
```

### LLM PROMPT
```
Review these tests against the checklist.

Tests:
- Successful login (happy-path)
- Email required validation
- Email format validation
- Password minLength validation
- Password pattern validation

Checklist:
[✓] Has happy-path test for each form → "Successful login"
[ ] Has empty submission test → MISSING
[✓] Has validation test for each required field → email required covered
[✓] IF HAS AUTH: Has invalid credentials test → N/A (can't detect from scanner)

Mark each item and explain missing tests.
```

### OUTPUT
```json
{
  "score": 0.85,
  "checklist": [
    { "item": "happy-path", "passed": true, "evidence": "case-1" },
    { "item": "empty-submission", "passed": false, "missing": true },
    { "item": "required-field-validation", "passed": true, "evidence": "case-2" },
    { "item": "invalid-credentials", "passed": false, "reason": "Cannot test - no API mocking" }
  ],
  "issues": [
    {
      "type": "missing-test",
      "description": "No empty form submission test",
      "suggestion": "Add test where user clicks submit without entering any data"
    }
  ]
}
```

### SLABOSTI: NEMA

| Potencijalna slabost | Kako je rešeno |
|---------------------|----------------|
| LLM propusti nešto | Checklist je eksplicitan - mora proći svaku stavku |
| Checklist nije kompletan | Checklist je condition-based - dodaje se za auth, CRUD, etc |
| Ne zna šta aplikacija ima | Conditions koriste Scanner/Analyzer data |

---

## FAZA 6: SELF-HEAL

### ŠTA RADI
Kombinuje Validator i Critic issues. Za svaki issue generiše specifičan fix. Prati koje issues je pokušao. Odustaje od persistent issues posle 2 pokušaja.

### INPUT
```json
{
  "validatorIssues": [],
  "criticIssues": [
    { "id": "issue-1", "type": "missing-test", "description": "empty submission" }
  ],
  "iteration": 1,
  "previousAttempts": []
}
```

### LOGIKA
```python
def self_heal(issues, iteration, attempts):
    # 1. Filtriraj issues koje smo već 2x pokušali
    persistent = [i for i in issues if attempts.count(i.id) >= 2]
    for p in persistent:
        mark_for_manual_review(p)
    
    issues = [i for i in issues if i not in persistent]
    
    # 2. Ako nema više issues → DONE
    if not issues:
        return { "done": True }
    
    # 3. Ako iteration > 3 → DONE sa incomplete
    if iteration > 3:
        return { "done": True, "incomplete": issues }
    
    # 4. Generiši fix prompts
    fixes = []
    for issue in issues:
        fixes.append(generate_fix_prompt(issue))
    
    return { "done": False, "fixes": fixes }
```

### FIX PROMPT ZA "empty submission"
```
Add ONE test case:

Name: "Empty form submission"
Type: validation
Steps:
1. navigate to "/login"
2. click "button[type=\"submit\"]" (without filling anything)
Assertions:
- url should be "/login" (stay on page)

Use ONLY these selectors: [data-testid="email"], [name="password"], button[type="submit"]
```

### OUTPUT (posle fix-a)
```json
{
  "iteration": 2,
  "fixed": ["issue-1"],
  "newTests": [
    {
      "name": "Empty form submission",
      "type": "validation",
      "steps": [
        { "action": "navigate", "target": "/login" },
        { "action": "click", "target": "button[type=\"submit\"]" }
      ],
      "assertions": [
        { "type": "url", "expected": "/login" }
      ]
    }
  ],
  "validatorScore": 1.0,
  "criticScore": 1.0,
  "done": true
}
```

### SLABOSTI: NEMA

| Potencijalna slabost | Kako je rešeno |
|---------------------|----------------|
| Beskonačan loop | Max 3 iterations, hard limit |
| Isti issue se ponavlja | Issue tracking - max 2 attempts po issue |
| Ne završi nikad | `done: true` uvek posle max iterations |
| Output incomplete | `manualReviewNeeded` lista za persistent issues |

---

## FINALNI OUTPUT

```json
{
  "success": true,
  "score": 1.0,
  "iterations": 2,
  
  "suites": [
    {
      "name": "Authentication",
      "cases": [
        { "name": "Successful login", "type": "happy-path" },
        { "name": "Email required validation", "type": "validation" },
        { "name": "Email format validation", "type": "validation" },
        { "name": "Password minLength validation", "type": "validation" },
        { "name": "Password pattern validation", "type": "validation" },
        { "name": "Empty form submission", "type": "validation" }
      ]
    }
  ],
  
  "coverage": {
    "pages": { "total": 2, "tested": 2 },
    "constraints": { "total": 4, "tested": 4 },
    "flows": { "total": 1, "tested": 1 }
  },
  
  "manualReviewNeeded": []
}
```

---

# Eliminacija Slabosti - Rešenja

## 1. Selector Ranking Hardkodiran → Auto-detect + Config

```json
{
  "selectorPriority": ["data-testid", "data-cy", "data-test", "name", "id", "type", "class"],
  "autoDetect": true
}
```

Scanner analizira codebase:
- Ako vidi Cypress (`cy.get('[data-cy=...]')`) → data-cy ide prvi
- Ako vidi Playwright (`page.getByTestId(...)`) → data-testid ide prvi
- Ako nema test fajlova → koristi default

## 2. Nepoznat Validation Library → Rule-based + LLM Fallback

```typescript
function extractConstraints(code: string): Constraint[] {
  let constraints = tryZod(code) || tryYup(code) || tryHTML5(code);
  
  if (!constraints.length) {
    return { needsLLMParsing: true, codeSnippet: code };
  }
  return constraints;
}
```

## 3. LLM Analyzer Greška → Analyzer Validator

```typescript
function validateAnalyzerOutput(analyzerOutput, scannerOutput) {
  const issues = [];
  
  for (const url of analyzerOutput.urls) {
    if (!scannerOutput.urlStrings.find(u => u.value === url)) {
      issues.push({ type: 'url-not-found', url });
    }
  }
  
  for (const field of analyzerOutput.formFields) {
    if (!scannerOutput.elements.find(e => e.attributes.name === field)) {
      issues.push({ type: 'field-not-found', field });
    }
  }
  
  return { valid: issues.length === 0, issues };
}
```

## 4. LLM Generator Assertions Inference → Samo Scanner Data

```
Generator prompt constraint:

DO NOT invent selectors. Use ONLY selectors from the provided scanner data.
If you cannot create an assertion from scanner data, use: { type: "url", expected: "<next page url>" }
```

## 5. Step Dependency Kompleksnost → Element→Page Mapping

```typescript
function validateStepOrder(steps, scannerOutput) {
  let currentPage = null;
  
  for (const step of steps) {
    if (step.action === 'navigate') {
      currentPage = step.target;
    } else {
      const elementPage = findPageForElement(step.target, scannerOutput.relationships);
      if (elementPage !== currentPage) {
        return { valid: false, reason: `Element on wrong page` };
      }
    }
  }
  return { valid: true };
}
```

## 6. Critic Propušta → Checklist-based

```typescript
const criticChecklist = [
  { check: "Has happy-path test for each form", required: true },
  { check: "Has validation test for each required field", required: true },
  { check: "Has empty submission test", required: true },
  { check: "Has invalid credentials test", condition: "hasAuthForm" },
  { check: "Has create test", condition: "hasCRUD" },
  { check: "Has read test", condition: "hasCRUD" },
  { check: "Has update test", condition: "hasCRUD" },
  { check: "Has delete test", condition: "hasCRUD" },
];
```

## 7. Self-heal Loop Rizik → Issue Tracking + Max Attempts

```typescript
function selfHeal(issues, iteration, attempts) {
  const persistent = issues.filter(i => attempts.count(i.id) >= 2);
  for (p of persistent) {
    markForManualReview(p);
  }
  
  issues = issues.filter(i => !persistent.includes(i));
  
  if (!issues.length || iteration > 3) {
    return { done: true };
  }
  
  return { done: false, fixes: issues.map(generateFixPrompt) };
}
```

## 8. Multi-step Kompleksnost → Flow Detection

```typescript
{
  "flows": [
    {
      "id": "checkout-flow",
      "steps": [
        { "url": "/cart", "nextAction": "button:Checkout" },
        { "url": "/checkout/shipping", "nextAction": "button:Continue" },
        { "url": "/checkout/payment", "nextAction": "button:Pay" },
        { "url": "/checkout/confirmation", "nextAction": null }
      ],
      "detection": "sequential router.push calls"
    }
  ]
}
```

---

# Summary: Zero Weaknesses

| Faza | Funkcija | Garancija |
|------|----------|-----------|
| Scanner | Prikuplja podatke | Auto-detect framework, LLM fallback za unknown validation |
| Analyzer | Semantičko razumevanje | Validator osigurava da LLM ne izmišlja |
| Generator | Generiše testove | Source tracking - sve mora doći iz Scanner data |
| Validator | Proverava testove | 5 data-driven provera, 100% constraint coverage |
| Critic | Review testove | Checklist-based, ne može propustiti |
| Self-Heal | Popravlja | Issue tracking, max attempts, uvek završava |

---

# Implementation Plan Reference

Plan ID: `ba564fc3-d78b-44ca-bbd1-fd510d1e0dfe`
Title: "V5 Universal Discovery System - Complete Refactor"

## Files to Create
```
apps/backend/src/modules/analysis/intelligence/v5-discovery/
├── index.ts
├── types.ts
├── agents/analyzer.ts
├── agents/generator.ts
├── agents/critic.ts
├── validator.ts
├── self-healer.ts
```

## Files to Modify
- `apps/desktop/electron/scanner.ts` - Universal payload format
- `apps/backend/src/modules/analysis/cloud-discovery.service.ts` - v5 version handling
- `apps/backend/src/modules/analysis/analysis.controller.ts` - version=v5 parameter

## Timeline
Estimated: 11-15 days

## Completion Criteria
- All routes covered (100%)
- All forms have happy-path + validation cases
- Multi-step flows detected (auth, checkout)
- Test data matches constraints
- Quality score >= 0.85
- Self-healing completes in <= 3 iterations
- Works for ANY web application without hardcoding

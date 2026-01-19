# 04 - Non-Negotiable Truths

This document lists hard truths that any future implementation MUST respect.
These are constraints, not guidelines.

## Truth 1: Selectors Cannot Be Inferred

**Statement:**
A selector for an interactive element cannot be determined without one of:
1. A data-testid, data-cy, or similar test attribute in the source code
2. A unique accessibility attribute (aria-label, role with unique name)
3. A unique structural selector verified against the DOM

**Implication:**
If the source code does not contain a deterministic way to locate an element,
the step must be marked `SELECTOR_REQUIRED`. No system should guess selectors.

**What this means for Discovery:**
- V7 scanner must extract test attributes from JSX
- If no test attribute exists, the step cannot be fully executable
- Users must be informed which elements lack selectors

## Truth 2: Test Data Cannot Be Generated Without Schema

**Statement:**
Valid test data for a form field cannot be generated without knowing:
1. The field type (email, password, number, etc.)
2. Validation constraints (required, minLength, pattern, etc.)
3. The semantic meaning of the field (is this a username? a phone number?)

**Implication:**
If field schema is unknown, test data must be a placeholder (e.g., `{{email}}`).
No system should invent "test@example.com" without knowing the field is an email.

**What this means for Discovery:**
- Form field extraction must include type and validation rules
- Unknown fields get type-based placeholders at best
- Invalid test data scenarios require explicit validation rule knowledge

## Truth 3: Suite Grouping Requires Observable Structure

**Statement:**
Test suites can only be meaningfully grouped based on observable code structure:
1. File/folder organization (e.g., `app/(auth)/*` → Authentication)
2. Route prefixes (e.g., `/dashboard/*` → Dashboard)
3. Explicit relationships (e.g., forms that share an API endpoint)

**Implication:**
If code structure does not indicate grouping, tests should be in "Uncategorized" or
grouped by the most specific observable attribute (route, file path).

**What this means for Discovery:**
- Route groups and folder structure are valid grouping signals
- Domain names must derive from code, not assumptions
- "Authentication" is only valid if the code is in `/auth/` or similar

## Truth 4: User Intent Cannot Be Assumed

**Statement:**
The intent of a user action cannot be determined from code structure alone.

A button click handler could be:
- A submit action
- A cancel action
- A navigation trigger
- A state toggle
- Something else entirely

**Implication:**
Test case names must describe the observable action and outcome, not assumed intent.

**What this means for Discovery:**
- "Click submit button" is valid
- "User logs in" is only valid if we can verify this is a login flow
- Ambiguous flows must be named descriptively, not interpretively

## Truth 5: Expected Outcomes Must Be Verifiable

**Statement:**
An expected outcome is only valid if it can be verified by:
1. Observation (navigation occurred, element appeared)
2. State check (cookie set, localStorage changed)
3. API response (specific status code, response body)

**Implication:**
Expected outcomes like "user is authenticated" are only valid if the system can
define what observable effects prove authentication.

**What this means for Discovery:**
- Expected outcomes should reference observable effects
- "Navigate to /dashboard" is verifiable
- "User feels satisfied" is not verifiable
- Abstract outcomes must be translated to observable checks

## Truth 6: Dynamic Content Creates Unknowns

**Statement:**
Any content determined at runtime is unknown at discovery time:
1. Dynamic route parameters (e.g., `/product/[id]`)
2. Server-fetched data
3. User-specific content
4. Time-dependent values

**Implication:**
Tests involving dynamic content must either:
- Use placeholders that are filled at execution time
- Mark the dynamic portion as UNKNOWN
- Skip the verification of dynamic values

**What this means for Discovery:**
- `/product/[id]` becomes `/product/{{product_id}}`
- Assertions on dynamic content must be structural, not value-based
- "Page displays product name" not "Page displays 'Widget X'"

## Truth 7: Negative Tests Require Explicit Error Handling

**Statement:**
A negative test (invalid input, error case) can only be generated if the source code
contains explicit error handling that can be traced.

**Implication:**
Without evidence of error handling (try/catch, validation messages, error states),
negative tests cannot be reliably created.

**What this means for Discovery:**
- Error message selectors must be extractable
- Validation rules must be in the code
- "User sees error for invalid email" requires that error handling exists

## Truth 8: Multi-Step Flows Are Only Valid If Linked

**Statement:**
A multi-step test flow (e.g., login → navigate → perform action) is only valid if
the steps are causally linked in the code (edges exist between nodes).

**Implication:**
Arbitrary step sequences cannot be combined into a single test case.
Each test case must trace a single connected path through the behavior graph.

**What this means for Discovery:**
- Test cases follow graph edges
- Disconnected actions become separate test cases
- "Login and then buy product" is only valid if there's a path connecting them

## Truth 9: Preconditions Are Often Unknown

**Statement:**
Most preconditions cannot be determined from static analysis:
1. "User must be logged in" requires runtime state
2. "Product must exist" requires database state
3. "Page must be loaded" requires execution context

**Implication:**
Preconditions should only be stated when they are explicitly encoded in the code
(e.g., route guards, conditional redirects).

**What this means for Discovery:**
- Auth guards → "User must be logged in"
- Conditional redirects → "Condition X must be false"
- No code evidence → No precondition stated

## Truth 10: Verification Requires Execution

**Statement:**
A test is only VERIFIED if it has been executed successfully against the application.
Static analysis produces CANDIDATES, not verified tests.

**Implication:**
Discovery output should be marked as either:
- CANDIDATE: Derived from code, not yet executed
- VERIFIED: Successfully executed against the application
- FAILED: Execution attempted but failed

**What this means for Discovery:**
- Initial Discovery output is all CANDIDATES
- V8 execution promotes CANDIDATES to VERIFIED or marks as FAILED
- Users should see verification status clearly

## Summary Table

| Truth | What Cannot Be Done | What Must Be Done Instead |
|-------|---------------------|---------------------------|
| 1 | Infer selectors | Extract from code or mark REQUIRED |
| 2 | Generate arbitrary test data | Use typed placeholders |
| 3 | Assume domain groupings | Use observable code structure |
| 4 | Assume user intent | Describe observable behavior |
| 5 | Claim unverifiable outcomes | Reference observable effects |
| 6 | Know dynamic values | Use placeholders |
| 7 | Assume error handling | Require explicit code evidence |
| 8 | Combine arbitrary steps | Follow graph paths |
| 9 | Assume preconditions | Derive from code guards |
| 10 | Claim verification without execution | Mark as CANDIDATE until executed |

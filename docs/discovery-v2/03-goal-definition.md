# 03 - Goal Definition

This document defines what "meaningful" means for suites, cases, and steps.

## What is a "Meaningful" Test Suite?

### Definition
A test suite is a logical grouping of related test cases that share a common domain, feature, or context.

### Required Information

A meaningful suite MUST contain:

1. **Name** - A human-readable identifier that describes the domain or feature
   - Example: "User Authentication"
   - NOT: "NAV_TO:/dashboard"
   - NOT: "UNCLUSTERED"
   - NOT: "suite-1"

2. **Description** - A brief explanation of what this suite tests
   - Example: "Tests for user login, registration, and password recovery"
   - NOT: empty
   - NOT: auto-generated from file paths

3. **Scope** - Clear boundaries of what is included
   - Must be derivable from the test cases within
   - Should not overlap arbitrarily with other suites

4. **Ordering** - A meaningful sequence (if applicable)
   - Critical tests should be identifiable
   - Dependencies between suites should be explicit if they exist

### Must NOT Guess

A meaningful suite MUST NOT:

1. **Invent domains** - If the source code does not indicate a domain, the suite should be named "Uncategorized: [context]"
2. **Assume feature boundaries** - Grouping should be based on observable code structure, not assumed application architecture
3. **Create empty suites** - Every suite must contain at least one test case

## What is a "Meaningful" Test Case?

### Definition
A test case is a single testable scenario that verifies one behavior of the application.

### Required Information

A meaningful case MUST contain:

1. **Name** - A human-readable description of what is being tested
   - Example: "User can log in with valid credentials"
   - NOT: "goal:ua:submit:sign-in/page.tsx:63"
   - NOT: "Test Case 1"

2. **Description** - What this test verifies
   - Example: "Verifies that a user with valid email and password can access the application"
   - NOT: empty

3. **Preconditions** - What must be true before the test runs
   - Example: "User account exists", "User is not logged in"
   - Can be empty if no preconditions exist

4. **Steps** - The sequence of actions to execute (see step definition)

5. **Expected Outcome** - What should happen when the test succeeds
   - Example: "User is redirected to dashboard"
   - NOT: "Navigation observed"

6. **Source Traceability** - Where in the source code this test originates
   - File path
   - Line number (if available)
   - Component or function name (if available)

### Must NOT Guess

A meaningful case MUST NOT:

1. **Invent scenarios** - Each case must map to an actual code path
2. **Assume user intent** - If the purpose is unclear, mark it as "Purpose unclear: [observed behavior]"
3. **Generate synthetic test names** - Names must reflect actual functionality, not generated patterns
4. **Claim coverage** - Do not imply coverage of scenarios that cannot be verified

## What is a "Meaningful" Test Step?

### Definition
A test step is a single atomic action within a test case that can be executed and observed.

### Required Information

A meaningful step MUST contain:

1. **Action Type** - What kind of action this is
   - Must be one of: navigate, click, fill, select, check, submit, wait, assert
   - NOT: generic "action"

2. **Target** - What element or location the action targets
   - For navigation: URL or route
   - For interaction: Element description or selector
   - NOT: empty
   - NOT: "unknown"

3. **Selector** (for interactive steps) - How to locate the element
   - Must be a valid CSS selector, data-testid, or accessibility selector
   - If no selector is available, mark as "SELECTOR_REQUIRED"
   - NOT: empty without acknowledgment

4. **Value** (for input steps) - What value to enter
   - For fill actions: the text to enter
   - For select actions: the option to select
   - Can be a placeholder indicating type: "{{email}}", "{{password}}"
   - NOT: empty for actions that require values

5. **Description** - Human-readable explanation of the step
   - Example: "Enter email address in login form"
   - NOT: "fill"
   - NOT: empty

6. **Expected Outcome** (optional) - What should happen after this step
   - Example: "Email field should contain the entered value"
   - Can be empty for intermediate steps

### Must NOT Guess

A meaningful step MUST NOT:

1. **Invent selectors** - If a selector cannot be determined from source code, it must be marked as required
2. **Assume values** - Test data placeholders are acceptable; invented values are not
3. **Skip required information** - Missing target or action type makes the step unexecutable
4. **Claim executability** - Do not mark a step as ready to execute if selectors are missing

## Verification Criteria

### For Suites
A suite is verified meaningful if:
- [ ] Name is human-readable and describes the domain/feature
- [ ] Contains at least one test case
- [ ] All contained cases are related to the suite's domain
- [ ] No invented or assumed domains

### For Cases
A case is verified meaningful if:
- [ ] Name describes what is being tested
- [ ] Steps are provided and ordered
- [ ] Expected outcome is stated
- [ ] Source traceability exists
- [ ] No invented scenarios

### For Steps
A step is verified meaningful if:
- [ ] Action type is specified and valid
- [ ] Target is specified or marked as required
- [ ] Selector is specified or marked as required
- [ ] Description is human-readable
- [ ] No invented selectors or values

## Example of Meaningful vs. Not Meaningful

### Not Meaningful (Current System Output)

```
Suite: NAV_TO:/dashboard
  Case: goal:ua:submit:sign-in/page.tsx:63
    Step: { type: "submit", selector: undefined }
```

### Meaningful (Goal State)

```
Suite: User Authentication
  Description: Tests for user login functionality
  
  Case: User can log in with valid credentials
    Description: Verifies successful authentication with valid email and password
    Preconditions: User account exists, User is not logged in
    Steps:
      1. Navigate to /sign-in
         Expected: Login page loads
      2. Fill email field with {{valid_email}}
         Selector: [data-testid="email-input"]
         Expected: Email field contains value
      3. Fill password field with {{valid_password}}
         Selector: [data-testid="password-input"]
         Expected: Password field contains value
      4. Click submit button
         Selector: [data-testid="submit-button"]
         Expected: Form submits
    Expected Outcome: User is redirected to /dashboard, user session is created
    Source: app/(auth)/sign-in/page.tsx:63
```

## Quality Levels

### Level 0: Raw Output (Current State)
- Technical identifiers
- Missing selectors
- No descriptions
- Arbitrary grouping

### Level 1: Structured Output
- Proper hierarchy (suite → case → step)
- Source traceability
- Action types identified
- Missing information explicitly marked

### Level 2: Descriptive Output
- Human-readable names
- Descriptions for suites, cases, and steps
- Logical grouping
- Clear expected outcomes

### Level 3: Executable Output
- All selectors present
- Test data specified or templated
- Assertions defined
- Ready to run against live application

The goal of Discovery V2 is to achieve at minimum Level 2, with Level 3 for elements where
information is verifiably present in source code.

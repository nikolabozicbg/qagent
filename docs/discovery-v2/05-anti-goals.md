# 05 - Anti-Goals

This document explicitly lists what Discovery will NEVER try to do,
even if it seems useful or tempting.

## Anti-Goal 1: Full Test Coverage

**What it would mean:**
Generating tests for every possible code path, user scenario, and edge case.

**Why it is out of scope:**
1. Full coverage is impossible from static analysis alone
2. Many scenarios require runtime context (data states, user permissions)
3. Combinatorial explosion makes it impractical
4. Quality matters more than quantity

**What Discovery does instead:**
Produces tests for observable, deterministic flows found in code.
Coverage gaps are acknowledged, not hidden.

## Anti-Goal 2: Business Intent Inference

**What it would mean:**
Understanding WHY a feature exists and what business goal it serves.

Examples of business intent:
- "This login flow is for enterprise SSO users"
- "This checkout is optimized for mobile conversion"
- "This form collects data for marketing segmentation"

**Why it is out of scope:**
1. Business intent is not in the code
2. The same code structure can serve different business purposes
3. Inferring intent requires domain expertise Discovery does not have

**What Discovery does instead:**
Describes WHAT the code does, not WHY it exists.
"Form submits to /api/login" not "User authenticates for session management."

## Anti-Goal 3: Automatic Selector Generation

**What it would mean:**
Generating selectors for elements that don't have test attributes.

Examples:
- Creating CSS selectors based on class names
- Using XPath for deeply nested elements
- Generating selectors from element position

**Why it is out of scope:**
1. Generated selectors are fragile
2. Class names and positions change frequently
3. Only data-testid or accessibility attributes are stable
4. Guessed selectors lead to flaky tests

**What Discovery does instead:**
Extracts selectors that exist in code.
Marks missing selectors as `SELECTOR_REQUIRED`.
Does NOT invent selectors.

## Anti-Goal 4: Test Data Generation

**What it would mean:**
Creating realistic test data for form fields and API calls.

Examples:
- Generating valid email addresses
- Creating fake user profiles
- Producing valid credit card numbers

**Why it is out of scope:**
1. Without knowing validation rules, generated data may be invalid
2. Some data requires external sources (existing users, products)
3. Test data should be explicit, not generated
4. Generated data obscures what is actually being tested

**What Discovery does instead:**
Uses typed placeholders: `{{email}}`, `{{password}}`, `{{product_id}}`.
Users or test runners fill in actual values.

## Anti-Goal 5: Visual Regression Testing

**What it would mean:**
Testing that the UI looks correct visually.

Examples:
- Screenshot comparisons
- Layout verification
- Style consistency checks

**Why it is out of scope:**
1. Visual testing requires baseline screenshots
2. Visual differences may be intentional
3. Different from functional testing
4. Requires separate tooling and workflow

**What Discovery does instead:**
Focuses on functional behavior: navigation, form submission, state changes.
Does NOT attempt to verify visual appearance.

## Anti-Goal 6: Performance Testing

**What it would mean:**
Measuring and verifying application performance.

Examples:
- Page load times
- API response latency
- Animation frame rates

**Why it is out of scope:**
1. Performance varies by environment
2. Requires specialized measurement
3. Different testing methodology
4. Not discoverable from static code analysis

**What Discovery does instead:**
Tests functional correctness, not speed.

## Anti-Goal 7: Security Testing

**What it would mean:**
Identifying and testing security vulnerabilities.

Examples:
- SQL injection testing
- XSS attack vectors
- Authentication bypass attempts

**Why it is out of scope:**
1. Security testing requires adversarial mindset
2. Many security issues are not visible in code structure
3. Specialized security tools exist for this purpose
4. False positives can be dangerous

**What Discovery does instead:**
Does NOT attempt security testing.
May identify that authentication exists, but does not test its security.

## Anti-Goal 8: API Contract Testing

**What it would mean:**
Verifying that APIs conform to their specifications.

Examples:
- OpenAPI schema validation
- Response format verification
- Error code consistency

**Why it is out of scope:**
1. Requires API specifications that may not exist
2. API testing is a separate discipline
3. Frontend code may not contain full API contracts
4. Backend changes independently of frontend

**What Discovery does instead:**
Identifies API calls made by the frontend.
Does NOT validate API responses beyond what the frontend expects.

## Anti-Goal 9: Cross-Browser Testing

**What it would mean:**
Ensuring tests work across different browsers.

Examples:
- Chrome vs Firefox vs Safari behavior
- Browser-specific CSS issues
- JavaScript engine differences

**Why it is out of scope:**
1. Browser differences are runtime concerns
2. Same test may need different selectors per browser
3. Cross-browser is a test execution concern, not discovery

**What Discovery does instead:**
Produces browser-agnostic test definitions.
Execution layer handles browser selection.

## Anti-Goal 10: Flaky Test Prevention

**What it would mean:**
Ensuring discovered tests will not be flaky when executed.

**Why it is out of scope:**
1. Flakiness is often due to timing, not test design
2. Cannot predict execution environment
3. Some tests will inherently be less stable
4. Flakiness is discovered through execution, not analysis

**What Discovery does instead:**
Marks tests that may be unstable (e.g., involving animations, timers).
Does NOT guarantee flakiness prevention.

## Anti-Goal 11: Test Maintenance

**What it would mean:**
Automatically updating tests when code changes.

**Why it is out of scope:**
1. Requires understanding of intentional vs accidental changes
2. Code changes may invalidate test premises
3. Test updates often need human judgment
4. Maintenance is an ongoing process, not a one-time discovery

**What Discovery does instead:**
Provides source traceability so users can identify affected tests.
Does NOT automatically maintain or update tests.

## Anti-Goal 12: Natural Language Test Generation

**What it would mean:**
Allowing users to describe tests in natural language and generating code.

Examples:
- "Test that users can checkout"
- "Verify the search works"

**Why it is out of scope:**
1. Natural language is ambiguous
2. Would require AI interpretation
3. Results would be unpredictable
4. Discovery is about FINDING tests, not CREATING from wishes

**What Discovery does instead:**
Discovers tests from actual code.
Does NOT accept natural language test descriptions.

## Summary

Discovery is about finding and structuring what exists in code.

It is NOT about:
- Imagining what could be tested
- Generating data or selectors
- Understanding business purpose
- Testing non-functional requirements
- Maintaining tests over time

Any feature request that falls into these categories should be rejected
or handled by a different system.

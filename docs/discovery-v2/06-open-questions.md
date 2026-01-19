# 06 - Open Questions

This document lists questions that MUST be answered before any architecture or implementation begins.
No proposed answers are included. These require external input and validation.

## Q1: Form Field Extraction

The V7 scanner currently returns `fields: []` for all forms (see `collectInputFieldNames` in scanner.ts).

**Questions:**
- Should form field extraction be added to the V7 scanner?
- If so, what information must be extracted per field? (name, type, label, validation rules, selector)
- How should fields inside component libraries (e.g., MUI, Chakra) be handled?
- What about dynamically rendered fields (e.g., fields added via JavaScript)?

## Q2: Selector Extraction Strategy

The current system does not extract selectors from source code.

**Questions:**
- Which selector types should be prioritized? (data-testid, aria-label, id, name, role)
- Should the system extract selectors from JSX attributes at scan time?
- How should selectors in third-party components be handled?
- What is the fallback when no stable selector exists?

## Q3: Test Case Naming

Current test cases are named by goal ID (e.g., `goal:ua:submit:sign-in/page.tsx:63`).

**Questions:**
- Should names be derived from code structure (route + action)?
- Should names include the expected outcome?
- What naming convention should be enforced? (e.g., "Verb + Object + Condition")
- How should duplicate/similar names be handled?

## Q4: Suite Grouping Logic

Current grouping is by navigation destination, which is not meaningful.

**Questions:**
- Should grouping be based on file/folder structure?
- Should grouping be based on route prefixes?
- Should grouping consider shared API endpoints?
- What happens when a test fits multiple potential suites?
- Should users be able to influence grouping?

## Q5: Handling of UNKNOWN Values

The system produces many UNKNOWN markers.

**Questions:**
- Should UNKNOWN tests be included in the output?
- Should they be in a separate section?
- How should they be visually differentiated in the UI?
- What information should be shown to help users resolve UNKNOWNs?

## Q6: Test Data Placeholders

Test data cannot be generated, so placeholders are used.

**Questions:**
- What placeholder syntax should be used? (e.g., `{{field_type}}`, `$field_type$`, `<field_type>`)
- Should placeholders be typed? (e.g., `{{email}}` vs `{{string}}`)
- How should users fill in placeholder values?
- Should there be a way to define fixtures or data sets?

## Q7: Verification vs. Candidate Status

Tests should be marked as CANDIDATE until executed.

**Questions:**
- How should verification status be stored and displayed?
- Should CANDIDATE tests be editable by users?
- What happens when a VERIFIED test is re-discovered after code changes?
- Should there be a "stale" status for tests that may no longer be valid?

## Q8: Multi-Step Flow Boundaries

Test cases follow graph paths, but path boundaries may be ambiguous.

**Questions:**
- What determines where one test case ends and another begins?
- Should navigation to a new page always start a new test case?
- How should loops in the behavior graph be handled?
- What about paths with multiple valid endpoints?

## Q9: Negative/Error Test Cases

Error scenarios require explicit error handling in code.

**Questions:**
- How should error handling be detected in the scanner?
- Should negative tests be generated automatically when validation rules exist?
- How should error message assertions be structured?
- What if error handling exists but error selectors are unknown?

## Q10: Protected Routes and Authentication

Some routes require authentication (detected via guards/conditionals).

**Questions:**
- How should auth-required tests be marked?
- Should there be a special "authentication setup" step?
- How does this interact with test data (credentials)?
- Should auth flows be tested separately from protected content?

## Q11: Dynamic Route Parameters

Routes like `/product/[id]` have dynamic segments.

**Questions:**
- How should dynamic segments be represented in test navigation steps?
- Should there be a mechanism to bind test data to route parameters?
- What if the same route pattern has multiple tested values?
- How should route parameters affect test case naming?

## Q12: Execution Mapping Ownership

V8 requires execution mappings (selectors, actions) that don't exist in V7/goals.

**Questions:**
- Where should execution mappings be generated?
- Should they be part of Discovery output or a separate step?
- Who owns selector-to-element mapping: scanner, backend, or execution layer?
- How should mapping failures be reported to users?

## Q13: Incremental Discovery

Discovery currently runs as a full scan.

**Questions:**
- Should Discovery support incremental updates (only scan changed files)?
- How would incremental discovery affect existing test suites?
- What is the merge strategy for new tests with existing tests?
- Should users be notified of changes between discoveries?

## Q14: Output Format

The current output is JSON structures displayed in UI.

**Questions:**
- Should Discovery produce exportable test files (e.g., Playwright scripts)?
- What export formats should be supported?
- Should the output include comments explaining each test?
- How should the output handle tests that cannot be fully generated?

## Q15: User Intervention Points

Some information requires user input.

**Questions:**
- At what points should users be asked to provide information?
- How should SELECTOR_REQUIRED steps be resolved by users?
- Should there be a "mapping wizard" for incomplete tests?
- How persistent should user-provided information be?

## Q16: Error Handling During Discovery

Discovery may fail partially (some files unparseable, some paths ambiguous).

**Questions:**
- Should partial results be shown if some files fail to parse?
- How should ambiguous paths be presented to users?
- Should there be a "discovery health" indicator?
- What logging/debugging information should be available?

## Q17: Scale and Performance

Large codebases may have thousands of potential tests.

**Questions:**
- Is there a practical limit on the number of tests to discover?
- Should discovery be paginated or streamed?
- How should performance be measured and optimized?
- What is acceptable discovery time for different project sizes?

## Q18: Version Compatibility

The system has V7 scanner, V7 goals, V8 execution.

**Questions:**
- Should V7 and V8 be unified or remain separate?
- What happens if V7 output format changes?
- How should version mismatches be handled?
- Is there a migration path for existing discovered tests?

---

**Note:** These questions must be answered with stakeholder input before proceeding to architecture or implementation. Each answer will constrain the design space and should be documented in a separate decisions document.

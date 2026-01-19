# 02 - Problem Statement

This document describes why the current system does NOT produce meaningful suites/cases/steps.

## Core Problem

The current system produces **goals**, not **tests**.

A goal is: "UserAction X leads to Navigation Y"
A test is: "Verify that when a user submits valid login credentials, they are redirected to the dashboard"

The gap between these two is where the system fails.

## Why Suites Are Not Meaningful

### Current behavior
Suites are grouped by `NAV_TO:<destination>` or labeled "UNCLUSTERED".

### Why this fails
1. **Navigation destination is not a domain** - `/dashboard` tells you nothing about what is being tested
2. **Multiple unrelated tests end at the same destination** - Login, signup, password reset all may navigate to `/`
3. **UNCLUSTERED is useless** - It is an admission of failure to categorize
4. **No semantic grouping** - Tests for "checkout flow" and "inventory management" are not grouped together

### What is missing
- Domain knowledge (what part of the application is this?)
- Feature understanding (what capability is being tested?)
- Relationship awareness (which tests are related?)

## Why Test Cases Are Not Meaningful

### Current behavior
Test cases are named by goal ID, e.g., `goal:ua:submit:sign-in/page.tsx:63`

### Why this fails
1. **Goal IDs are internal identifiers** - They mean nothing to a human
2. **No description of what is being tested** - "Submit sign-in form" is not a test description
3. **No indication of expected behavior** - What should happen if this test passes?
4. **No differentiation between scenarios** - Happy path, error case, and edge case all look the same

### What is missing
- Human-readable test names
- Clear success criteria
- Scenario differentiation (positive/negative/edge)
- Context about preconditions

## Why Test Steps Are Not Meaningful

### Current behavior
Steps are raw action objects: `{ type: "click", selector: "..." }`

### Why this fails
1. **Selectors are often missing** - V7 does not extract selectors
2. **No descriptions** - "click" says nothing about intent
3. **No expected outcomes per step** - What should happen after this step?
4. **No test data** - Form fields have no values
5. **Assertions are generic** - Observed effects, not semantic assertions

### What is missing
- Selector extraction from source code
- Step descriptions ("Click the submit button")
- Per-step expected outcomes
- Meaningful test data
- Semantic assertions ("User should see success message")

## The Abstraction Gap

The system has three abstraction levels:

1. **Source Code** - Forms, buttons, handlers, routes
2. **Behavior Graph** - Nodes and edges representing code structure
3. **Goals** - UserAction → Terminal outcome paths

What is missing:

4. **Test Semantics** - What does this goal mean as a test?
5. **Test Structure** - How should this be organized for human consumption?
6. **Test Execution** - What selectors, data, and assertions are needed?

The system jumps from level 3 to attempting level 6, skipping levels 4 and 5 entirely.

## Missing Conceptual Elements

### Element 1: Form Field Information

**What exists:** Form nodes with `fields: []` empty array
**What is needed:** Field names, types, validation rules, labels
**Why it matters:** Cannot generate test data without knowing what data to provide

### Element 2: Selectors

**What exists:** Nothing in V7/goals; V8 requires external mappings
**What is needed:** Stable selectors for each interactive element
**Why it matters:** Cannot execute tests without selectors

### Element 3: Test Data

**What exists:** Nothing
**What is needed:** Valid and invalid values for form fields
**Why it matters:** Cannot test form validation without test data

### Element 4: Assertions

**What exists:** V8 observes effects (navigation, API calls, state changes)
**What is needed:** Semantic assertions ("login succeeded", "error message displayed")
**Why it matters:** Observed effects are not human-readable test outcomes

### Element 5: Semantic Names

**What exists:** Technical identifiers (goal IDs, file paths, line numbers)
**What is needed:** Human-readable names and descriptions
**Why it matters:** Tests must be understandable by QA engineers

### Element 6: Logical Grouping

**What exists:** Grouping by navigation destination
**What is needed:** Grouping by feature, domain, or user journey
**Why it matters:** Related tests should be together

## Where the Abstraction Breaks

### Break Point 1: V7 Scanner

The V7 scanner extracts structural information but not semantic information.

It knows:
- There is a form at line 63
- The form has an onSubmit handler

It does not know:
- This is a login form
- The form has email and password fields
- The expected outcome is authentication

### Break Point 2: Goal Extraction

Goal extraction traces causal paths but not test intent.

It knows:
- UserAction X leads to Navigation Y

It does not know:
- This path represents "successful login"
- This path requires valid credentials
- The navigation is conditional on authentication

### Break Point 3: V8 Execution

V8 can execute actions and observe effects but not interpret them.

It knows:
- Navigation occurred from /sign-in to /dashboard
- An API call to /auth/login returned 200

It does not know:
- This means "login succeeded"
- A 401 would mean "invalid credentials"
- The test should assert user state, not just navigation

## Summary

The current system produces **accurate but meaningless** output because:

1. It extracts structure, not semantics
2. It traces paths, not tests
3. It observes effects, not outcomes
4. It generates identifiers, not names
5. It groups by destination, not domain

To produce meaningful suites/cases/steps, the system must bridge the gap between
"what the code does" and "what the user is testing."

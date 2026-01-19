# 00 - Context

## What is Discovery?

Discovery is the phase in the Electron app where the system analyzes a user's application
and produces test artifacts. It occurs after the user has completed setup (project selection,
framework detection, base URL configuration).

The user expectation is:
1. Point at a project
2. Provide a base URL
3. Click "Discover"
4. See meaningful test suites, cases, and steps

The user should NOT need to:
- Manually map selectors
- Manually group tests
- Configure what to test
- Understand the underlying analysis

## What the User Expects in Step 4

When the user reaches Step 4 (Discovery), they expect to see:

1. **Test Suites** - Logical groupings of related tests (e.g., "Authentication", "Product Management")
2. **Test Cases** - Individual test scenarios within a suite (e.g., "User can sign in with valid credentials")
3. **Test Steps** - The sequence of actions that comprise a test case (e.g., "Fill email field", "Click submit")

Each of these must be:
- Immediately understandable (human-readable names)
- Actionable (can be executed against the running application)
- Verifiable (has assertions or expected outcomes)

## Why Suites/Cases/Steps Are the Final Artifact

The final output is **not**:
- A behavior graph (internal representation)
- Goals or intents (abstract)
- Component lists or route maps (raw data)
- Coverage metrics (statistics)

The final output **is** executable test structure because:

1. **It is what the user will run** - Tests execute against the real application
2. **It maps to testing mental model** - QA engineers think in terms of test cases and steps
3. **It is verifiable** - Each step can succeed or fail with observable outcomes
4. **It is actionable** - No further transformation needed to use it

The transformation from raw application data to test structure is the core responsibility
of the Discovery phase.

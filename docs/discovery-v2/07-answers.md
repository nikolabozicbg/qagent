# 07 - Answers to Open Questions

Each answer references constraints from 04-non-negotiable-truths.md and 05-anti-goals.md.

---

## A1: Form Field Extraction

**Option A:** Add form field extraction to V7 scanner. Extract: name, type, selector (if data-testid exists), validation attributes.

**Option B:** Do not extract fields. Mark all form steps as requiring manual field mapping.

**Tradeoffs:**
- Option A: More complete test steps, but fields in component libraries may not be extractable.
- Option B: Simpler scanner, but forms become unusable without user intervention.

**RECOMMENDED: Option A**

**Justification:**
- Truth 2 states test data requires field type and validation constraints.
- Without field extraction, placeholders cannot be typed (e.g., `{{email}}` vs `{{string}}`).
- Dynamic fields and component library fields should be marked UNKNOWN per Truth 6.

---

## A2: Selector Extraction Strategy

**Option A:** Extract only `data-testid`, `data-cy`, `data-test` attributes. Mark all others as `SELECTOR_REQUIRED`.

**Option B:** Extract `data-testid`, `aria-label`, `id`, `name` in priority order. Fall back to `SELECTOR_REQUIRED`.

**Tradeoffs:**
- Option A: Most stable selectors only, but many elements will lack selectors.
- Option B: More selectors extracted, but `id` and `name` may be less stable.

**RECOMMENDED: Option A**

**Justification:**
- Truth 1 states selectors cannot be inferred; only explicit test attributes are reliable.
- Anti-Goal 3 explicitly prohibits generating selectors from class names or position.
- `id` and `name` are not test attributes and may change without test awareness.

---

## A3: Test Case Naming

**Option A:** Derive names from observable structure: `[Route]: [Action Type] [Target]`. Example: `/sign-in: Submit form`.

**Option B:** Use goal ID as name, display human-readable description separately.

**Tradeoffs:**
- Option A: Readable names, but may have duplicates for similar actions.
- Option B: Unique names, but unreadable without description lookup.

**RECOMMENDED: Option A**

**Justification:**
- Truth 4 prohibits assuming user intent; names must describe observable behavior.
- Anti-Goal 2 prohibits business intent inference; names cannot be semantic (e.g., "User logs in").
- Duplicates should be disambiguated with file path or line number suffix.

---

## A4: Suite Grouping Logic

**Option A:** Group by file/folder structure. `app/(auth)/*` → "auth" suite.

**Option B:** Group by route prefix. `/dashboard/*` → "dashboard" suite.

**Tradeoffs:**
- Option A: Reflects developer organization, but folder structure may not be domain-aligned.
- Option B: Reflects URL structure, but unrelated pages may share prefixes.

**RECOMMENDED: Option A**

**Justification:**
- Truth 3 requires observable structure; folder organization is the most explicit signal.
- Route prefixes can be misleading (e.g., `/api/auth` and `/dashboard/auth` are different).
- Tests fitting multiple suites should use most specific folder path.

---

## A5: Handling of UNKNOWN Values

**Option A:** Include UNKNOWN tests in output with clear visual marker. Show what is unknown.

**Option B:** Exclude UNKNOWN tests from output. Show count only.

**Tradeoffs:**
- Option A: Users see all discovered flows, but output may be cluttered.
- Option B: Clean output, but users lose visibility into what was found but incomplete.

**RECOMMENDED: Option A**

**Justification:**
- Truth 1 requires informing users which elements lack selectors.
- Anti-Goal 1 acknowledges coverage gaps should be visible, not hidden.
- Users need to see UNKNOWNs to decide whether to provide missing information.

---

## A6: Test Data Placeholders

**Option A:** Use `{{field_type}}` syntax. Type placeholders by field type when known (e.g., `{{email}}`).

**Option B:** Use `{{field_name}}` syntax. Name placeholders by field name regardless of type.

**Tradeoffs:**
- Option A: Indicates what kind of data is needed, but requires field type extraction.
- Option B: Simpler, but users don't know what data format is expected.

**RECOMMENDED: Option A**

**Justification:**
- Truth 2 states test data requires field type knowledge.
- Anti-Goal 4 prohibits generating actual values; typed placeholders are the alternative.
- When type is unknown, use `{{field_name:unknown}}`.

---

## A7: Verification vs. Candidate Status

**Option A:** Store status as property on each test case: `CANDIDATE`, `VERIFIED`, `FAILED`.

**Option B:** Store status separately from test definition. Tests are immutable; verification is metadata.

**Tradeoffs:**
- Option A: Status is visible with test, but test definitions change with execution.
- Option B: Clean separation, but requires linking tests to verification records.

**RECOMMENDED: Option A**

**Justification:**
- Truth 10 requires marking tests as CANDIDATE until executed.
- Users need to see status clearly; embedding in test case makes it visible.
- Re-discovered tests after code changes should reset to CANDIDATE (no "STALE" status needed; absence of VERIFIED implies CANDIDATE).

---

## A8: Multi-Step Flow Boundaries

**Option A:** One test case per graph path from UserAction to terminal node. Navigation starts new case only if no edge exists.

**Option B:** One test case per page. Multiple user actions on same page are separate cases.

**Tradeoffs:**
- Option A: Follows actual code paths, but cases may be long.
- Option B: Simpler boundaries, but breaks causal chains.

**RECOMMENDED: Option A**

**Justification:**
- Truth 8 states multi-step flows are only valid if linked by edges.
- Arbitrary boundaries would violate the requirement that steps are causally connected.
- Loops should be detected and marked UNKNOWN (cannot test infinite loops).

---

## A9: Negative/Error Test Cases

**Option A:** Generate negative tests only when explicit validation rules and error selectors are found in code.

**Option B:** Do not generate negative tests. Only positive (happy path) tests.

**Tradeoffs:**
- Option A: More test coverage, but requires robust error handling detection.
- Option B: Simpler, but misses important test scenarios.

**RECOMMENDED: Option A**

**Justification:**
- Truth 7 states negative tests require explicit error handling evidence.
- If validation rules exist and error message selector is extractable, negative test is valid.
- If error handling exists but selector is unknown, mark step as `SELECTOR_REQUIRED`.

---

## A10: Protected Routes and Authentication

**Option A:** Mark tests on protected routes with precondition "Requires authentication". Do not add setup steps.

**Option B:** Add implicit "authentication setup" step referencing the auth flow.

**Tradeoffs:**
- Option A: Clear precondition, but test cannot execute without external auth.
- Option B: More complete, but creates dependency between tests.

**RECOMMENDED: Option A**

**Justification:**
- Truth 9 states preconditions should only be stated when encoded in code (guards, redirects).
- Anti-Goal 4 prohibits generating data; credentials cannot be invented.
- Auth flows should be separate test cases; protected routes should list auth as precondition.

---

## A11: Dynamic Route Parameters

**Option A:** Represent as placeholder: `/product/{{product_id}}`. Require user to provide value at execution.

**Option B:** Mark entire route as UNKNOWN. Do not generate navigation step.

**Tradeoffs:**
- Option A: Test is structured but requires user input.
- Option B: No incomplete tests, but loses coverage of dynamic routes.

**RECOMMENDED: Option A**

**Justification:**
- Truth 6 states dynamic content should use placeholders.
- Route parameter naming should match the segment name (e.g., `[id]` → `{{id}}`).
- Test case name should include placeholder: `/product/{{id}}: View product`.

---

## A12: Execution Mapping Ownership

**Option A:** Scanner extracts selectors. Discovery outputs include selectors. V8 consumes directly.

**Option B:** Discovery outputs selector placeholders. Separate mapping step before V8.

**Tradeoffs:**
- Option A: Simpler pipeline, but scanner must handle all selector logic.
- Option B: Separation of concerns, but adds complexity.

**RECOMMENDED: Option A**

**Justification:**
- Truth 1 requires extracting selectors from code; this belongs in scanner.
- Anti-Goal 3 prohibits generating selectors; what scanner finds is final.
- Mapping failures (missing selectors) are already marked `SELECTOR_REQUIRED` in Discovery output.

---

## A13: Incremental Discovery

**Option A:** Full scan only. No incremental support.

**Option B:** Support incremental by tracking file hashes and re-scanning changed files.

**Tradeoffs:**
- Option A: Simpler, but slower for large codebases.
- Option B: Faster, but merge logic is complex.

**RECOMMENDED: Option A**

**Justification:**
- Anti-Goal 11 states Discovery does not maintain tests over time.
- Incremental discovery implies test maintenance (detecting what changed).
- Full scan provides consistent, predictable output.

---

## A14: Output Format

**Option A:** JSON structure only. Export to test files is a separate tool.

**Option B:** Include exportable Playwright/Cypress scripts in output.

**Tradeoffs:**
- Option A: Discovery stays focused, but users need additional step to run tests.
- Option B: More useful output, but Discovery must know test frameworks.

**RECOMMENDED: Option A**

**Justification:**
- Discovery produces test structure, not executable code.
- Anti-Goal 9 notes execution concerns (like browser) are separate.
- Export tool can consume JSON and generate framework-specific code.

---

## A15: User Intervention Points

**Option A:** After Discovery completes, show all `SELECTOR_REQUIRED` and `UNKNOWN` items. User resolves before execution.

**Option B:** During Discovery, pause and prompt for missing information.

**Tradeoffs:**
- Option A: Discovery is fast, but user faces all issues at once.
- Option B: Interactive, but slow and disruptive.

**RECOMMENDED: Option A**

**Justification:**
- Discovery should complete without user input (per user expectation in 00-context.md).
- User intervention is post-discovery review, not mid-discovery interruption.
- User-provided data should persist for future discoveries (fixture file or similar).

---

## A16: Error Handling During Discovery

**Option A:** Show partial results. Mark unparseable files as errors. Continue with parseable files.

**Option B:** Fail entire Discovery if any file fails to parse.

**Tradeoffs:**
- Option A: User sees something, but output may be incomplete.
- Option B: Consistent output, but one bad file blocks everything.

**RECOMMENDED: Option A**

**Justification:**
- Anti-Goal 1 acknowledges coverage gaps; partial results are acceptable.
- Failed files should be listed with error details for user to fix.
- Ambiguous paths should be included and marked UNKNOWN per Truth 6.

---

## A17: Scale and Performance

**Option A:** No hard limit. Stream results as they are discovered.

**Option B:** Cap at N tests (e.g., 1000). Require filtering for larger codebases.

**Tradeoffs:**
- Option A: Complete coverage, but UI may struggle with large output.
- Option B: Predictable performance, but arbitrary limit loses tests.

**RECOMMENDED: Option A**

**Justification:**
- Anti-Goal 1 states full coverage is not the goal; Discovery finds what exists.
- Streaming prevents blocking; UI can paginate if needed.
- Performance should be addressed by scanner optimization, not artificial limits.

---

## A18: Version Compatibility

**Option A:** Keep V7 and V8 separate. V7 produces goals, V8 consumes them. Version mismatches fail explicitly.

**Option B:** Unify into single versioned format.

**Tradeoffs:**
- Option A: Clear separation, but requires maintaining compatibility contract.
- Option B: Simpler, but larger change scope.

**RECOMMENDED: Option A**

**Justification:**
- Truth 10 distinguishes static analysis (V7) from execution verification (V8).
- Version mismatches should fail with clear error; no silent degradation.
- Migration path: re-run Discovery when format changes; VERIFIED status resets to CANDIDATE.

---

## Summary of Recommendations

| Question | Recommended | Key Constraint |
|----------|-------------|----------------|
| Q1: Form Fields | Extract with scanner | Truth 2 |
| Q2: Selectors | data-testid only | Truth 1, Anti-Goal 3 |
| Q3: Naming | Route + Action | Truth 4, Anti-Goal 2 |
| Q4: Grouping | Folder structure | Truth 3 |
| Q5: UNKNOWNs | Include with marker | Truth 1, Anti-Goal 1 |
| Q6: Placeholders | {{field_type}} syntax | Truth 2, Anti-Goal 4 |
| Q7: Status | Property on test case | Truth 10 |
| Q8: Flow Boundaries | Graph path edges | Truth 8 |
| Q9: Negative Tests | Only with explicit evidence | Truth 7 |
| Q10: Auth | Precondition only | Truth 9, Anti-Goal 4 |
| Q11: Dynamic Routes | Placeholder syntax | Truth 6 |
| Q12: Mapping Ownership | Scanner | Truth 1, Anti-Goal 3 |
| Q13: Incremental | Full scan only | Anti-Goal 11 |
| Q14: Output Format | JSON only | Anti-Goal 9 |
| Q15: User Intervention | Post-discovery | User expectation |
| Q16: Errors | Partial results | Anti-Goal 1 |
| Q17: Scale | No limit, stream | Anti-Goal 1 |
| Q18: Versioning | Keep V7/V8 separate | Truth 10 |

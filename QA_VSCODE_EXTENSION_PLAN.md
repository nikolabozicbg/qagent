# QAgenAI — VS Code QA Extension (QA‑first, single‑mode)

Version: 1.0 (Revised)  
Date: Dec 15, 2025

## Decision (what changed)
- Remove Dev vs QA modes. Ship a single, QA‑first experience.
- Keep file‑level actions ("Generate test for current file") as contextual shortcuts, not a separate mode.

Why this is better
- Lower cognitive load; faster onboarding; clearer positioning.
- One code path to maintain; fewer settings; consistent analytics.
- Matches target buyer (QA) while still serving devs via context menu/CodeLens.

---

## Target user and value
- Primary: QA engineers automating end‑to‑end flows without heavy coding.
- Secondary: Developers who want quick test generation aligned to a repo plan.
- Core value: Turn user flows (Login, Checkout) into stable, production‑grade Playwright suites; keep them healthy as the app evolves.

---

## Product pillars
1) Flow‑first: Flows and suites as first‑class citizens (not files).
2) Repo‑aware: Scan, prioritize gaps, and suggest where tests matter most.
3) Stable by default: Selector policy, self‑healing hints, optional PR patches.
4) Open code: Generates readable Playwright/Jest code (no vendor lock‑in).

---

## First‑run flow (QA‑first)
1) Welcome (no mode toggle)  
2) Framework detection (FE/BE/E2E; Playwright readiness)  
3) E2E setup: Base URL, auth, optional import of recording/trace  
4) Quick scan: test inventory, gaps, risk queue draft  
5) Flow discovery (optional): propose flows (Login, Checkout); select any  
6) Ready: Open Dashboard (Risk Queue, Impact, Flow Library, Self‑healing)

---

## Daily flow
- Dashboard shows: Repo Snapshot • Test Health • Risk Queue • Impact (git diff) • Flow Library • Self‑healing.
- Typical actions: Run impacted • Generate critical • Edit/Generate/Run a flow • Apply self‑healing patch.

---

## Key features (MVP → v1.2)
MVP (Weeks 1–6)
- Repo Scan (JS/TS): framework/test runner detection; gap analysis; risk queue.
- Flow Library: Import recording (DevTools JSON/Playwright trace) or Describe flow (plain English) → Preview → Generate.
- Generator: POM + fixtures + selector policy (testid/role/label) + assertions; project‑aligned structure.
- Runner integration: Run/Report (screenshots, videos, trace links).
- Impact Mode: git diff → impacted tests/flows; Run Impacted; Generate for impacted.
- Self‑healing hints: suggest selector fixes; optional PR patch.

v1.1 (Weeks 7–8)
- Flow discovery crawl; confidence scoring; quick add to library.
- API/OpenAPI import → basic API tests.

v1.2 (Weeks 9–10)
- Team sharing of flows; export/import bundles; CI recipe generator.

Out of scope for MVP
- Separate Dev mode and unit/component coverage dashboards.
- Non‑JS/TS stacks (Python/Java) — evaluate post‑PMF.

---

## UX summary (panels)
- Dashboard: Repo Snapshot • Test Health ring • Quick actions • Risk Queue • Impact • Flow Library • Self‑healing.
- Flow Library: list of flows (Login, Checkout…), with Edit (NL or step editor), Generate, Run.
- Preview modal: "Will generate" (cases, POM/fixtures/selectors), Estimated coverage lift; Generate locally / as PR.
- Self‑healing: patch preview (selector deltas) + Create PR.

---

## Generation pipeline (high level)
Input → Normalize steps → Selectors (scored) → Assertions (oracle mining) → POM/fixtures/data → Code → Verify (one run) → Report/Export.

---

## Telemetry and success metrics
- TTFV (URL → first passing test) < 10 min.  
- Avg. tests generated per user (week 1) ≥ 3.  
- % runs via "Run Impacted" ≥ 25%.  
- Self‑healing acceptance rate ≥ 30%.  
- NPS ≥ 40.

---

## Implementation plan (high level)
Weeks 1–2: Repo scanner + Dashboard skeleton + Risk Queue.  
Weeks 3–4: Flow Library + Generator + Preview.  
Weeks 5–6: Runner + Impact Mode + Self‑healing hints + First‑run wizard.  
Weeks 7–8: Flow discovery + OpenAPI ingest (v1.1).  

---

## Open questions
- Auth helpers: ship adapters for common auth (form, token, Magic link)?
- Selector policy defaults: enforce testid lint PR for critical screens?
- Minimal CI bootstrap: provide ready‑to‑copy GH Actions file at export?

---

## Next actions
- Remove mode toggle from onboarding in mockups and code.
- Keep file‑level generation as context commands only.
- Validate MVP with 5–10 QA engineers using the first‑run wizard + Flow Library.

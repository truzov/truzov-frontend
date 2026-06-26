# Project Roadmap: Truzov

This document outlines upcoming product milestones, functional features, and architectural changes planned for Truzov.

---

## Phase 1: Persistent Project Memory (Completed)
* **Goal:** Set up AGENTS.md, workflows placeholders, and Project Brain documentation files (`master-memory.md`, `architecture.md`, `patterns.md`, etc.).
* **Status:** Complete.

---

## Phase 2: Live API Integration & Database Migration
* **Goal:** Shift the application from local MSW browser mocking to a live backend database API service.
* **Tasks:**
  * Define configuration variables in `.env` for production database API endpoint.
  * Disable MSW in staging/production while keeping it available for local fallback testing.
  * Integrate backend schemas with `types/index.ts`.
  * Update `lib/api/client.ts` to automatically refresh tokens.

---

## Phase 3: Automated Lab Testing & PDF Report Parsing
* **Goal:** Automate report validation.
* **Tasks:**
  * Add automatic PDF parsing in the Lab Analyst Portal to read heavy metal/pesticide levels directly from file uploads, pre-filling forms.
  * Integrate third-party Laboratory APIs to automatically post test results directly to Truzov submissions.
  * Add notification workflows to alert vendors if a batch fails testing.

---

## Phase 4: Customer Trust Verification Features
* **Goal:** Improve customer engagement with transparency.
* **Tasks:**
  * Design an interactive visual breakdown of organic metrics directly on product pages (replacing static checklists with high-fidelity charts).
  * Introduce batch-level QR codes so customers can scan physical packaging to pull up the official PDF lab report instantly.

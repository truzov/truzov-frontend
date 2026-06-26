# Central Project Memory: Truzov

Truzov is a Next.js-based verified organic and lab-tested marketplace. The application connects customers with vendors, offering an end-to-end e-commerce flow coupled with a scientific verification process to ensure product quality and authenticity.

---

## Core Business Value

In traditional organic markets, customers have no way to verify if a product is truly organic or chemical-free. Truzov bridges this trust gap by requiring third-party laboratory verification for all listed products. No product is sellable on the marketplace until it passes lab testing for pesticides, heavy metals, and organic claims.

---

## Key Roles

The platform supports four primary user roles, each with its own layout, dashboard, and workflow:

1. **Customer (Consumer):**
   * Browses categories, searches for products.
   * Views verified lab metrics, certificates, and test results on the product page.
   * Adds products to cart/wishlist, checks out, tracks orders.
   * Rates and reviews products.

2. **Vendor (Seller):**
   * Lists products, specifies product claims, batches, and SKUs.
   * Submits products for verification (this initiates the lab testing flow).
   * Manages inventory, pricing, orders, and payouts.
   * Tracks verification status of their listings.

3. **Lab Analyst (Verifier):**
   * Receives verification requests when product samples are collected.
   * Runs tests (e.g., pesticides, heavy metal screens).
   * Uploads reports, logs metrics, and marks tests as `pass` or `fail`.

4. **Admin (Operations):**
   * Manages vendors (approves or rejects onboarding/documents).
   * Reviews lab reports and coordinates verification submissions.
   * Configures site settings (commission rates, shipping thresholds).
   * Manages banners and static homepage configurations.

---

## Key Features

* **Verification Lifecycle:** Seamless transition of submissions through states (`submitted` -> `samples_collected` -> `in_lab` -> `report_uploaded` -> `approved`/`rejected`).
* **Lab Report Transparency:** Embedded lab metrics (e.g., Pesticides, Heavy Metals status) directly accessible to customers on product detail pages.
* **Unified Workspace Shell:** An adaptive workspace layout (`DashboardShell` and screen sets) that styles itself dynamically based on whether the active user is a Vendor, Admin, or Lab Analyst.
* **API Mocking Integration:** MSW (Mock Service Worker) integration allowing local front-end developers to test complete complex role workflows without requiring a live backend database.

---

## Current State & Active Work

* **Current State:** Frontend architecture, mock data fixtures, local MSW client, state stores (Zustand), and visual screens are fully implemented.
* **Active Work:** Establishing Project Brain persistent layer to prepare for phase 2 (integrating live API endpoints and refactoring state hooks).

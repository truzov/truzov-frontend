# Project Glossary: Truzov

A collection of terms and abbreviations used in the Truzov marketplace platform.

---

## Roles

* **Customer (Consumer):** An end-user who browses products, reviews lab reports, adds items to their cart, and makes purchases.
* **Vendor (Seller):** A registered seller who lists organic products and requests lab testing to obtain a verification badge.
* **Lab Analyst (Verifier):** A third-party laboratory staff member who performs scientific tests on samples and uploads reports.
* **Admin (Operator):** A platform manager responsible for vendor onboarding approval, configuration tuning, and review moderation.

---

## Domain Terminology

* **Verification Submission:** An application record generated when a vendor requests lab testing for a product batch.
* **Lab Report:** A digital and PDF verification report created by a Lab Partner. It contains the testing outcome (`pass` | `fail`) and laboratory findings.
* **Lab Metric:** Individual testing parameters returned in a lab report (e.g., Pesticides status, Heavy Metals level). Each metric holds a label, value, and status (`pass`, `warning`, `fail`).
* **Verification Badge:** A visual UI indicator shown to customers on product listings representing a passed lab report.
* **Batch ID:** A unique batch identification code provided by the vendor. This links the exact physical batch of products to their specific lab analysis.
* **SKU (Stock Keeping Unit):** A unique alphanumeric code identifying specific products and packaging variants (e.g., `HON-500-TRV`).
* **MRP (Maximum Retail Price):** The manufacturer's suggested retail price, used to show customer discount percentages.
* **MSW (Mock Service Worker):** The API mocking layer running in the client browser during local development.

# Architectural Understanding: Truzov

This document outlines the architecture, technology stack, data flow, and core software patterns of the Truzov frontend.

---

## 1. Technology Stack

* **Core Framework:** Next.js (using TypeScript and App Router standard directories).
* **Styling:** Vanilla Tailwind CSS with `tailwind-merge` and `clsx` for dynamic CSS class generation, and `class-variance-authority` (CVA) for styling reusable components (e.g. `Badge.tsx`, `Button.tsx`).
* **State Management:** Zustand stores with JSON persistence to local storage.
* **API Integration:** Standard `fetch` API wrapped in a custom client helper (`lib/api/client.ts`) with request timeouts, content headers, and token injection.
* **Local Development & Mocking:** MSW (Mock Service Worker) intercepts browser-level network requests during local development to emulate backend responses.
* **Charts/Visualization:** Recharts is used for vendor dashboard revenue trends and admin metrics.
* **Forms & Validation:** React Hook Form coupled with Zod resolvers.
* **Testing:** Playwright (End-to-End browser verification) and Vitest (unit/integration testing).

---

## 2. Directory Structure

```
c:\Users\piyus\OneDrive\Desktop\zshivam/
├── app/                  # Next.js page routes, layouts, and providers
│   ├── (account)/        # Customer profile, orders, addresses
│   ├── (auth)/           # Login, registration, OTP verification
│   ├── (checkout)/       # Shopping cart checkout wizard
│   ├── (shop)/           # Homepage, category, search, product detail pages
│   ├── admin/            # Admin workspace routes
│   ├── lab/              # Lab analyst workspace routes
│   └── vendor/           # Vendor workspace routes
├── components/           # Reusable UI widgets and screens
│   ├── dashboard/        # Layout, tables, and Kanban boards for workspaces
│   ├── screens/          # Consolidated page render components
│   └── ui/               # Atomic design elements (Buttons, Modals, Inputs)
├── hooks/                # Custom React hooks (e.g., useProtectedRoute)
├── lib/                  # Services, helpers, validation, and mocks
│   ├── api/              # Custom API client (client.ts)
│   ├── data/             # Static fixture data (fixtures.ts)
│   ├── utils/            # Formatting and utility functions
│   └── validations/      # Zod validation schemas
├── store/                # Zustand stores (Auth, Cart, UI, Wishlist, Checkout)
├── mocks/                # MSW browser configuration and handler definitions
└── types/                # Unified TypeScript type definitions
```

---

## 3. Data Flow & Authentication Architecture

### Authentication State Persistence
* The authorization credentials (token, user roles, etc.) are managed by the Zustand `auth.store.ts`.
* Zustand writes this state to `localStorage` under the key `truzov-auth`.

### API Fetch Client (`apiFetch`)
* Defined in `lib/api/client.ts`.
* Safe client/server operation: Checks `typeof window === 'undefined'` to avoid server-side errors.
* Auto-token extraction: Parses the `truzov-auth` JSON object from `localStorage` and attaches the `Authorization: Bearer <token>` header dynamically if the user is authenticated.
* Request Timeout: Aborts any request taking longer than 10 seconds via `AbortController`.

```
[Component / Hook]
       │ (calls apiFetch)
       ▼
[apiFetch (lib/api/client.ts)]
       │ 1. Reads `truzov-auth` token from localStorage
       │ 2. Appends Bearer Auth header
       │ 3. Sets 10-second timeout signal
       ▼
[MSW Handler (Local Dev) / Live Endpoint]
```

---

## 4. Workspaces & Responsive Layout Architecture

Workspaces (`admin`, `vendor`, `lab`) use a centralized shell layout called `DashboardShell` (`components/dashboard/DashboardShell.tsx`). It provides:
1. **Dynamic Navigation:** Changes links, permissions, and navigation layout automatically depending on the active user role (`UserRole = 'customer' | 'vendor' | 'admin' | 'lab'`).
2. **Standard Panels:** Uses unified UI blocks like `StatCard` and `DataTable` to ensure consistent aesthetics.

---

## 5. Verification Workflow Architecture

The product validation flow ensures trust and organic integrity. It operates through the following states:

```
[Vendor Product Creation]
          │ (status: 'pending')
          ▼
[Verification Submission Created]
          │ (status: 'submitted')
          ▼
[Samples Collected]
          │ (status: 'samples_collected')
          ▼
[In Lab Testing]
          │ (status: 'in_lab')
          ▼
[Report Uploaded by Lab]
          │ (status: 'report_uploaded')
          ▼
   [Admin Approval]
     ├── Approved ──► [Product isLabVerified = true, status: 'approved']
     └── Rejected ──► [Product isLabVerified = false, status: 'rejected']
```
* **Fixture Syncing:** Changes are tracked in verification submissions and linked directly to the product's `isLabVerified` and `labMetrics` attributes.

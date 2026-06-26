# Feature Map: Truzov

A directory mapping Truzov's core business features to their source code locations.

---

## 1. Authentication & Route Security
* **Description:** User login, signup, OTP validation, session persistence, and page routing protection.
* **Core Files:**
  * Routes: [app/(auth)/layout.tsx](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/app/(auth)/layout.tsx) | [/login](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/app/(auth)/login) | [/signup](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/app/(auth)/signup)
  * Visual Screens: [AuthScreens.tsx](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/components/screens/AuthScreens.tsx)
  * State Store: [auth.store.ts](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/store/auth.store.ts)
  * Route Guards: [useProtectedRoute.ts](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/hooks/useProtectedRoute.ts)

---

## 2. Customer Commerce
* **Description:** Homepage catalog, product search, categories, cart/wishlist management, checkout flow, and order confirmation.
* **Core Files:**
  * Routes: [app/(shop)/page.tsx](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/app/(shop)/page.tsx) | [/category](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/app/(shop)/category) | [/products](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/app/(shop)/products) | [app/(checkout)/checkout](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/app/(checkout)/checkout)
  * Visual Screens: [CustomerScreens.tsx](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/components/screens/CustomerScreens.tsx)
  * State Store: [cart.store.ts](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/store/cart.store.ts) | [wishlist.store.ts](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/store/wishlist.store.ts) | [checkout.store.ts](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/store/checkout.store.ts)
  * API Mocks: [handlers.ts](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/mocks/handlers.ts#L18-L43)

---

## 3. Vendor Workspace & Product Listing Wizard
* **Description:** Vendor product management, stock monitoring, sales trend graphs, payouts tracking, and the wizard for submitting new items for testing.
* **Core Files:**
  * Routes: [app/vendor/page.tsx](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/app/vendor/page.tsx) | [/inventory](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/app/vendor/inventory) | [/products](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/app/vendor/products) | [/verification](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/app/vendor/verification)
  * Visual Screens: [WorkspaceScreens.tsx](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/components/screens/WorkspaceScreens.tsx#L103-L220)
  * API Mocks: [handlers.ts](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/mocks/handlers.ts#L49-L51)

---

## 4. Laboratory Verification Portal
* **Description:** Lab analyst queue displaying pending sample tests, input fields for uploading test parameters (pesticides, metals), and verification history.
* **Core Files:**
  * Routes: [app/lab/page.tsx](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/app/lab/page.tsx) | [/requests](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/app/lab/requests) | [/upload](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/app/lab/upload) | [/history](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/app/lab/history)
  * Visual Screens: [WorkspaceScreens.tsx](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/components/screens/WorkspaceScreens.tsx#L336-L394)
  * API Mocks: [handlers.ts](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/mocks/handlers.ts#L56-L58)

---

## 5. Admin Dashboard & Operations
* **Description:** Master metrics tracking, vendor approval list, verification Kanban board, CMS banner editing, commission configs, and operational roles view.
* **Core Files:**
  * Routes: [app/admin/page.tsx](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/app/admin/page.tsx) | [/vendors](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/app/admin/vendors) | [/verification](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/app/admin/verification) | [/config](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/app/admin/config) | [/roles](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/app/admin/roles)
  * Visual Screens: [WorkspaceScreens.tsx](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/components/screens/WorkspaceScreens.tsx#L221-L335)
  * Kanban Board Component: [VerificationKanban.tsx](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/components/dashboard/VerificationKanban.tsx)
  * API Mocks: [handlers.ts](file:///c:/Users/piyus/OneDrive/Desktop/zshivam/mocks/handlers.ts#L52-L55)

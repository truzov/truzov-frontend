# Approved Coding & Implementation Patterns: Truzov

To maintain consistency and code reuse across the application, developers should follow these established implementation patterns.

---

## 1. Page-Screen Consolidation Pattern
* **Rule:** Next.js route pages (`app/**/page.tsx`) must remain minimal. They should only handle static configuration (like titles, metadata, revalidate constants, or page metadata) and import their corresponding layout screens from `@/components/screens/`.
* **Rationale:** Keeps route logic isolated, allows screens to be highly reusable, and facilitates easier unit testing and layout modularity.
* **Example:**
  ```tsx
  // app/(shop)/page.tsx
  import type { Metadata } from 'next';
  import { HomeScreen } from '@/components/screens/CustomerScreens';

  export const revalidate = 60;
  export const metadata: Metadata = {
    title: 'Verified Organic Marketplace',
    description: 'Shop lab-verified organic products with transparent reports.',
  };

  export default function Page() {
    return <HomeScreen />;
  }
  ```

---

## 2. Client-Side Route Protection Pattern
* **Rule:** Secure pages must use the `useProtectedRoute` custom React hook within their component body to enforce user login status and handle automatic redirect query parameters.
* **Rationale:** Ensures unified client-side checking and carries the user's return location seamlessly.
* **Example:**
  ```tsx
  'use client';
  import { useProtectedRoute } from '@/hooks/useProtectedRoute';

  export function SecureDashboard() {
    const { isLoggedIn, isLoading } = useProtectedRoute('/login');

    if (isLoading || !isLoggedIn) {
      return <LoadingSpinner />;
    }

    return <div>Protected Content</div>;
  }
  ```

---

## 3. Zustand Persistent Store Pattern
* **Rule:** Stores that must survive page reloads (e.g. user authentication tokens, persistent cart/wishlist state) must implement Zustand's `persist` middleware. All custom properties must handle undefined states cleanly to prevent hydration errors during Next.js rendering.
* **Key Guidelines:**
  * Define explicit TS interfaces for the state and actions.
  * Access local storage safely (avoiding reference errors during server-side compilation).
* **Example:**
  ```typescript
  import { create } from 'zustand';
  import { persist } from 'zustand/middleware';

  interface AuthState {
    token: string | null;
    setToken: (token: string | null) => void;
  }

  export const useAuthStore = create<AuthState>()(
    persist(
      (set) => ({
        token: null,
        setToken: (token) => set({ token }),
      }),
      {
        name: 'truzov-auth',
      }
    )
  );
  ```

---

## 4. Mock API Endpoint Pattern (MSW)
* **Rule:** Any mock endpoints must be added to the centralized handlers array (`mocks/handlers.ts`). Mocked responses should wrap returning data objects in the standardized JSON structure: `{ data: T, message?: string }`.
* **Example:**
  ```typescript
  import { http, HttpResponse } from 'msw';

  export const handlers = [
    http.get('*/api/v1/resource', () => {
      return HttpResponse.json({
        data: { id: 1, name: 'Sample Item' },
        message: 'Loaded successfully'
      });
    })
  ];
  ```

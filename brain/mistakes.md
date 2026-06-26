# Lessons Learned & Mistakes to Avoid: Truzov

This document compiles resolved architectural bugs and configuration mistakes to ensure they do not happen again.

---

## Pitfall 1: SSR Reference Error (`window is not defined`)
* **Problem:** Accessing `localStorage` or `document` variables directly in file bodies or server components during Next.js rendering triggers a server-side crash: `ReferenceError: window is not defined`.
* **Root Cause:** Next.js compiles page structures on the server first, where the browser `window` scope is not present.
* **Verified Fix:** Always guard access to browser APIs or wrapping values. Check `typeof window !== 'undefined'` before accessing storage.
* **Example Code:**
  ```typescript
  function getToken(): string | null {
    if (typeof window === 'undefined') return null; // Safe guard
    return localStorage.getItem('truzov-auth');
  }
  ```

---

## Pitfall 2: Hydration Mismatch on Dynamic Charts (Recharts)
* **Problem:** Using SVG/Canvas chart engines (like Recharts) in Next.js pages can trigger a hydration warning: `Text content did not match` because the server cannot calculate dimensions and renders a different structure than the client.
* **Root Cause:** Recharts attempts to calculate active client browser width before mounting, causing HTML outputs to mismatch.
* **Verified Fix:** Use a local state check (`mounted`) inside the chart wrapper, rendering static loading markup on SSR and switching to the interactive chart element only after mounting is complete.
* **Example Code:**
  ```typescript
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? <ResponsiveContainer>...</ResponsiveContainer> : <StaticLoadingPlaceholder />;
  ```

---

## Pitfall 3: AbortError Misclassification during Network Timeout
* **Problem:** Aborted network connections would throw unhandled native errors, showing generic error modals or failing silently.
* **Root Cause:** The `AbortController` triggers `AbortError` when custom timeouts cancel a request, which normal error catch blocks don't filter.
* **Verified Fix:** Explicitly capture `AbortError` in the API service helper (`lib/api/client.ts`) and return a friendly "Request timed out" statement.
* **Example Code:**
  ```typescript
  try {
    const response = await fetch(url, { signal: controller.signal });
    // ...
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please refresh.');
    }
    throw error;
  }
  ```

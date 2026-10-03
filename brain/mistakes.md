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

---

## Pitfall 4: Incomplete Verification Evidence on Product Cards
* **Problem:** Combining `isLabVerified` with only the default first page of published reports can omit valid products and does not establish that a report matches the currently listed SKU/batch.
* **Avoid:** Do not treat an unpaginated/default report response or a product-level flag alone as complete per-SKU proof. Preserve a distinct report-loading error state; use a backend-supported product/SKU/batch lookup before stronger badge claims.
* **Current homepage limit (2026-09-30):** The collection may show all available products, but its badge still checks only the default report page. A missing badge is therefore not proof that a product has no older passing report.

## Pitfall 5: Misleading Navigation Fallbacks
* **Problem:** A category label can point to `/products` when category data is missing, making the destination appear more specific than it is.
* **Avoid:** Resolve live category slugs when present and label a general catalog fallback as `all products` or `browse all products`. Keep existing destinations reachable through the customer shell.

## Pitfall 6: Local Sign-In Appears Broken
* **Problem:** Password login on seeded accounts returns unauthorized, while OTP requests fail in the backend's default profile.
* **Cause:** Seeded passwords contain malformed placeholder hashes; the default profile has no OTP delivery provider.
* **Verified local path:** Use the backend `dev` profile with a running local database and mock OTP `123456`; send/verify worked through API and browser. Never rely on this mock code outside local development.

## Pitfall 7: Decorative Account Menu Pointer
* **Problem:** The dropdown's green diamond pointer overlapped the header and distracted from navigation.
* **Avoid:** Use a clean card edge below the account trigger; keep the menu's open state and Escape focus return accessible without decorative geometry.

## Pitfall 8: Computed Font Does Not Prove Rendered Font
* **Problem:** CSS declared Inter while the browser actually rendered Segoe UI because remote fonts were unavailable. Heading-only overrides also missed later heading levels and `.font-heading`.
* **Fix:** Self-host licensed fonts, cover all customer heading/control selectors, and inspect the rendered platform font in browser tooling. A computed family or successful `document.fonts.check` alone is insufficient proof.

## Pitfall 9: Tracing a Tiny Logo Preserves Pixel Artifacts
* **Problem:** A vector trace of the roughly 102px source retained stair-step contours and looked blurry/jagged when displayed larger.
* **Fix:** Rebuild lettering as actual Inter 700 outline paths and draw smooth leaf curves. Reuse the shared SVG asset; a `.svg` extension by itself does not guarantee smooth contours.

## Pitfall 10: Address Inputs Overflow Their Grid
* **Problem:** Native input minimum sizing made adjacent fields overlap, while a fully scrolling tall modal hid Save/Cancel.
* **Fix:** Apply `min-w-0` and full width to labels, wrappers and inputs; group fields and keep header/actions outside the inner scrolling field region. Check short phone viewports as well as desktop.

## Pitfall 11: Signup Loses the Login Identifier or Reuses OTP State
* **Problem:** Switching an unknown email/phone from login to signup made users retype it; stale OTP state could refer to a previous identifier.
* **Fix:** Carry a normalized in-memory draft, clear stale OTP state on the transition, and request fresh verification. A carried identifier must never be treated as verified or grant authentication.

Do not recreate or substitute a wordmark when the user supplies a final approved logo; reference that asset through shared Logo.
Do not mix Unicode symbols with SVG navigation icons or let input caret touch a search icon. Verify expanded disclosure SVG transforms in browser instead of assuming utility generation.

## Pitfall 12: Assignment Prefix in a Hosted URI Value
* **Problem:** Render startup failed in `MediaStore` with an illegal URI scheme character because the `CLOUDINARY_URL` value included `CLOUDINARY_URL=`.
* **Verified fix (2026-10-03):** Store only the Cloudinary URI in the Render value field; preserve unrelated variables with a merge update. The deployment reached live status without source changes.
* **Boundary:** Successful startup and read-only API checks do not prove uploads, authenticated flows, or production readiness. Default-profile mock OTP and an ephemeral JWT key still require separate production configuration.

## Pitfall 13: UI choices disconnected from persisted workflows
* **Problem:** Seller form showed success without a request; coupon subpages were template forms; partial-cart UI could not honestly work with whole-cart checkout. Immediate number coercion changed an empty draft back to zero. Quantity purchase controls followed long mobile details, and mobile navigation lacked logout.
* **Fix:** Persist seller intake and return a reference; use real admin CRUD and server coupon validation; send explicit selected server line IDs and retain other lines. Keep number drafts editable until validation, move purchase controls before descriptions, and reuse existing session logout.
* **Review prevention:** Lock prices and variant inventory as well as product stock; restore only recorded reservations on cancellation. Rotate checkout intent keys when user choices change. Test concurrent coupon limits, selected-line leftovers, failure rollback, and actual numeric editing; distinguish fixture screenshots from real database integration.

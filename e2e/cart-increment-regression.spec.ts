import { expect, test } from '@playwright/test';

/**
 * D7 REGRESSION — `POST /cart/items` must not return a stale quantity when it increments an
 * existing line.
 *
 * The bug this guards against
 * ---------------------------
 * `CartService.addItem` performs a native upsert
 * (`INSERT ... ON CONFLICT DO UPDATE SET quantity = ...` in `CartItemRepository`) and then builds its
 * response by re-reading through `getCart(userId)` in the SAME transaction. A native query bypasses
 * the JPA persistence context, so unless that context is cleared, the re-read is served from
 * Hibernate's first-level cache and returns the PRE-increment entity. The reported symptom was a POST
 * response showing quantity 2 while the database already held 3 — the database was always correct,
 * and the next request showed the right value.
 *
 * The guard is `@Modifying(clearAutomatically = true)` on both upsert methods, which evicts the
 * persistence context so the re-read goes to the database. As of 2026-08-25 that annotation is present
 * in the backend working tree but NOT in HEAD, so it is one `git checkout` away from regressing
 * silently. Hence this test.
 *
 * Why this asserts POST-response == immediate-GET
 * -----------------------------------------------
 * The defect was specifically that the POST RESPONSE disagreed with the database while a subsequent
 * GET agreed. `GET /cart` is a fresh read in a new transaction, so comparing the two is equivalent to
 * comparing the POST response against the database, and it is observable through the public API
 * without a database connection in the test.
 *
 * Deliberately exercises the auto-increment POST path, NOT `PATCH /cart/items/{itemId}`. PATCH sets a
 * quantity on a managed entity it just loaded, so it never had this problem — testing it would look
 * like coverage while checking nothing.
 *
 * Prerequisite: backend on the `dev` profile (mock OTP `123456`).
 */

const PRODUCT_ID = 'prd_honey';
const API = 'http://localhost:8080/api/v1';

interface CartLine {
  productId: string;
  quantity: number;
  lineTotal: number;
  unitPrice: number;
}

interface Cart {
  items: CartLine[];
  itemCount: number;
  subtotal: number;
}

test.describe('D7: cart auto-increment returns a fresh quantity', () => {
  test.describe.configure({ mode: 'serial' });

  test('POST /cart/items response quantity matches the database on every increment', async ({
    request,
  }) => {
    // A fresh account per run: the cart is per-user server state, so reusing one would carry
    // quantities between runs and make the expected numbers depend on history.
    const phone = `9${`${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9)}`;

    const signup = await request.post(`${API}/auth/signup`, {
      data: { fullName: 'D7 Regression', phone, password: 'secret123', otpChannel: 'phone' },
    });
    expect(signup.status(), `signup failed: ${await signup.text()}`).toBe(201);
    const otpSessionId = (await signup.json()).data.otpSessionId as string;

    const verify = await request.post(`${API}/auth/otp/verify`, {
      data: { otpSessionId, code: '123456' },
    });
    expect(verify.status(), `otp verify failed: ${await verify.text()}`).toBe(200);
    const accessToken = (await verify.json()).data.accessToken as string;

    const auth = { Authorization: `Bearer ${accessToken}` };
    const lineFor = (cart: Cart) =>
      cart.items.find((item) => item.productId === PRODUCT_ID);

    /**
     * Four consecutive adds of the SAME product. The first creates the line; every subsequent one
     * takes the ON CONFLICT DO UPDATE branch, which is where the staleness lived. Four rather than
     * two because the original report described a divergence that had accumulated (response 2 vs
     * database 3), so a single increment could miss an off-by-one that only shows once the cached
     * entity is a version behind.
     */
    for (let expected = 1; expected <= 4; expected += 1) {
      const post = await request.post(`${API}/cart/items`, {
        headers: auth,
        data: { productId: PRODUCT_ID, quantity: 1 },
      });
      expect(post.status(), `add #${expected} failed: ${await post.text()}`).toBe(201);

      const postCart: Cart = (await post.json()).data;
      const postLine = lineFor(postCart);
      expect(postLine, 'the POST response must contain the line it just upserted').toBeDefined();

      // Fresh read in a new transaction — the authoritative value.
      const get = await request.get(`${API}/cart`, { headers: auth });
      expect(get.status()).toBe(200);
      const getCart: Cart = (await get.json()).data;
      const getLine = lineFor(getCart);
      expect(getLine).toBeDefined();

      // THE REGRESSION ASSERTION. A stale persistence context makes the POST response lag the
      // database by one increment, so these diverge while the GET stays correct.
      expect(
        postLine?.quantity,
        `add #${expected}: POST response quantity (${postLine?.quantity}) disagrees with the ` +
          `authoritative GET (${getLine?.quantity}) — the persistence context is stale after the ` +
          `native upsert. Check @Modifying(clearAutomatically = true) on CartItemRepository's ` +
          `upsertWithoutVariant / upsertWithVariant.`
      ).toBe(getLine?.quantity);

      // And it must actually be the incremented value, not merely self-consistent: if both reads
      // were stale the assertion above would pass while the cart was wrong.
      expect(postLine?.quantity, `add #${expected} should have incremented to ${expected}`).toBe(
        expected
      );

      // Derived money must move with the quantity. lineTotal is the server's own arithmetic, so a
      // stale quantity would drag a stale total onto the cart and, from there, into checkout.
      expect(postLine?.lineTotal).toBe((postLine?.unitPrice ?? 0) * expected);
      expect(postCart.itemCount).toBe(getCart.itemCount);
      expect(postCart.subtotal).toBe(getCart.subtotal);
    }

    // Clean up the server-side state this test created.
    const clear = await request.delete(`${API}/cart`, { headers: auth });
    expect(clear.status()).toBe(204);
  });
});

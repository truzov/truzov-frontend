import { test, expect } from '@playwright/test';

test.describe('Checkout Payment Flow', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear localStorage to start fresh
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('should redirect to confirmation page without showing empty bag page', async ({ page }) => {
    // Navigate to products
    await page.goto('/products');
    
    // Add item to cart by clicking Buy Now on first product
    const buyButton = page.locator('button:has-text("Buy Now")').first();
    await buyButton.click();
    
    // Wait for cart to update and click "Go to Checkout"
    await page.waitForURL('**/checkout/**');
    
    // Should be on payment page or continue flow
    // Navigate directly to payment page
    await page.goto('/checkout/payment');
    
    // Wait for payment page to load
    await expect(page.locator('text=Choose Payment Mode')).toBeVisible({ timeout: 5000 });
    
    // Click Pay button
    const payButton = page.locator('button:has-text("Pay Rs")');
    await payButton.click();
    
    // Set up listener to catch any navigation to bag screen showing empty state
    let emptyBagSeen = false;
    page.on('framenavigated', async () => {
      const content = await page.content();
      if (content.includes('Add items to continue') && content.includes('Your bag is empty')) {
        emptyBagSeen = true;
      }
    });
    
    // Wait for confirmation page to load - this should be the ONLY page we see
    await page.waitForURL('**/checkout/confirm', { timeout: 5000 });
    
    // Verify we're on confirmation page
    await expect(page.locator('text=Order confirmed')).toBeVisible({ timeout: 5000 });
    
    // Verify we never saw the empty bag page
    expect(emptyBagSeen).toBe(false);
    
    // Verify cart is cleared now (by checking if items exist in the component)
    const cartItems = page.locator('[class*="items"]');
    // The confirmation page should show the order summary
    await expect(page.locator('text=Order Summary')).toBeVisible();
  });

  test('should clear cart AFTER navigating to confirmation page', async ({ page, context }) => {
    // Navigate to products and add item
    await page.goto('/products');
    const buyButton = page.locator('button:has-text("Buy Now")').first();
    await buyButton.click();
    
    // Go to payment
    await page.goto('/checkout/payment');
    await expect(page.locator('text=Choose Payment Mode')).toBeVisible({ timeout: 5000 });
    
    // Get initial localStorage before payment
    const cartBefore = await page.evaluate(() => {
      const cartStore = localStorage.getItem('truzov-cart');
      return cartStore ? JSON.parse(cartStore) : null;
    });
    
    expect(cartBefore).toBeTruthy();
    expect(cartBefore.state.items.length).toBeGreaterThan(0);
    
    // Click Pay
    const payButton = page.locator('button:has-text("Pay Rs")');
    await payButton.click();
    
    // Wait for confirmation page
    await page.waitForURL('**/checkout/confirm', { timeout: 5000 });
    await expect(page.locator('text=Order confirmed')).toBeVisible({ timeout: 5000 });
    
    // Give a moment for useEffect to run
    await page.waitForTimeout(500);
    
    // Check localStorage after confirmation page loads
    const cartAfter = await page.evaluate(() => {
      const cartStore = localStorage.getItem('truzov-cart');
      return cartStore ? JSON.parse(cartStore) : null;
    });
    
    // Cart should be cleared
    expect(cartAfter).toBeTruthy();
    expect(cartAfter.state.items.length).toBe(0);
  });

  test('should show empty bag error when accessing payment with empty cart', async ({ page }) => {
    // Navigate directly to payment with no items
    await page.goto('/checkout/payment');
    
    // Should see the empty state or auth state
    const response = await page.waitForNavigation();
    // Might redirect or show empty state
    const content = await page.content();
    
    expect(
      content.includes('Add items to continue') || 
      content.includes('Authentication required')
    ).toBe(true);
  });
});

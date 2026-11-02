/**
 * Automated Verification Harness for OmniCart Storefront UI Incident #8493.
 */

const assert = require('assert');
const { createCartStore } = require('../src/stores/cartStore');
const { CartDrawerController } = require('../src/components/CartDrawer');
const { applyCoupon, calculateSubtotal } = require('../src/utils/pricing');

console.log('Running OmniCart Storefront verification suite...\n');

// ── Check 1: State Immutability in cartStore ─────────────────────────────────
{
  console.log('Test 1: Verifying immutable cart updates...');
  const store = createCartStore([
    { id: 'P1', name: 'Item 1', price: 10.0, quantity: 1 }
  ]);

  const originalItemsRef = store.getState().items;
  let notified = false;
  store.subscribe(() => { notified = true; });

  store.addItem({ id: 'P2', name: 'Item 2', price: 25.0, quantity: 1 });
  const updatedItemsRef = store.getState().items;

  assert.strictEqual(notified, true, 'Subscribers must be notified upon item insertion');
  assert.notStrictEqual(
    originalItemsRef,
    updatedItemsRef,
    'FAIL: Items array reference must be cloned immutably, not mutated in-place'
  );
  assert.strictEqual(updatedItemsRef.length, 2, 'Cart must contain 2 items');
  console.log('  ✓ Check 1 passed: State immutability preserved.');
}

// ── Check 2: Monetary Discount Float Precision in pricing.js ──────────────────
{
  console.log('Test 2: Verifying monetary coupon calculation without float artifacts...');
  const subtotal = 29.99;
  const discountPercent = 15; // 29.99 * 0.85 = 25.491499999999997 without rounding
  const result = applyCoupon(subtotal, discountPercent);

  assert.strictEqual(
    typeof result,
    'number',
    'Discounted price must be a valid number'
  );
  assert.strictEqual(
    Number.isNaN(result),
    false,
    'Discounted price must not be NaN'
  );

  // Check exact 2 decimal precision
  const decimalPart = result.toString().split('.')[1] || '';
  assert(
    decimalPart.length <= 2,
    `FAIL: Float precision artifact detected (${result}). Must round to 2 decimals.`
  );
  assert.strictEqual(result, 25.49, 'Expected $29.99 with 15% discount to equal $25.49');
  console.log('  ✓ Check 2 passed: Accurate monetary float rounding verified.');
}

// ── Check 3: Render Loop Stability in CartDrawer ──────────────────────────────
{
  console.log('Test 3: Verifying CartDrawer render stability under coupon changes...');
  const store = createCartStore([
    { id: 'P1', name: 'Desk Pad', price: 20.0, quantity: 1 }
  ]);
  const drawer = new CartDrawerController(store);

  // Verify computeTotal does not trigger runaway recursive recalculations
  for (let i = 0; i < 5; i++) {
    const total = drawer.computeTotal();
    assert.strictEqual(total, 20.0);
  }

  assert.strictEqual(drawer.isCheckoutEnabled(), true, 'Checkout should be enabled');
  console.log('  ✓ Check 3 passed: CartDrawer render lifecycle stable.');
}

console.log('\n==================================================');
console.log('✓ ALL OMNICART STOREFRONT CHECKS PASSED SUCCESSFULLY!');
console.log('==================================================');
process.exit(0);

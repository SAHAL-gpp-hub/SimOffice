/**
 * Pricing and discount calculation utility.
 */

function calculateSubtotal(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((acc, item) => acc + (item.price || 0) * (item.quantity || 1), 0);
}

/**
 * Applies promo coupon code discount to subtotal.
 *
 * BUG REPORT:
 * JavaScript IEEE-754 binary floating-point representation causes calculation artifacts
 * like 29.99 * 0.85 = 25.491499999999997 instead of $25.49.
 * This triggers 422 Unprocessable Entity errors on the checkout payment gateway!
 */
function applyCoupon(subtotal, discountPercent) {
  if (typeof subtotal !== 'number' || isNaN(subtotal) || subtotal < 0) return 0;
  if (!discountPercent || discountPercent <= 0) return subtotal;

  const validPercent = Math.min(100, Math.max(0, discountPercent));
  
  // ⚠️ BUG: Raw float math without rounding to 2-decimal currency cents!
  return subtotal - (subtotal * (validPercent / 100));
}

module.exports = {
  calculateSubtotal,
  applyCoupon,
};

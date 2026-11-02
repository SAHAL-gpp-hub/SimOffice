/**
 * Pricing and discount calculation utility.
 */

/**
 * Calculates item subtotal.
 */
function calculateSubtotal(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((acc, item) => acc + (item.price || 0) * (item.quantity || 1), 0);
}

/**
 * Applies promo coupon code discount to subtotal with exact cents precision.
 */
function applyCoupon(subtotal, discountPercent) {
  if (typeof subtotal !== 'number' || isNaN(subtotal) || subtotal < 0) return 0;
  if (!discountPercent || discountPercent <= 0) return Math.round(subtotal * 100) / 100;

  const validPercent = Math.min(100, Math.max(0, discountPercent));
  const discounted = subtotal * (1 - validPercent / 100);
  // Round to exact 2-decimal currency precision without floating point artifact
  return Math.round((discounted + Number.EPSILON) * 100) / 100;
}

module.exports = {
  calculateSubtotal,
  applyCoupon,
};

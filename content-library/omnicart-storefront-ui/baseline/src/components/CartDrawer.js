/**
 * CartDrawer controller and render lifecycle logic.
 */

const { calculateSubtotal, applyCoupon } = require('../utils/pricing');

class CartDrawerController {
  constructor(cartStore) {
    this.cartStore = cartStore;
    this.cachedTotal = 0;
    this.renderCount = 0;
  }

  /**
   * Computes the current discounted cart total without triggering infinite render cascades.
   */
  computeTotal() {
    this.renderCount++;
    const state = this.cartStore.getState();
    const subtotal = calculateSubtotal(state.items);
    const discount = state.coupon ? (state.coupon.discountPercent || 0) : 0;
    this.cachedTotal = applyCoupon(subtotal, discount);
    return this.cachedTotal;
  }

  isCheckoutEnabled() {
    const total = this.computeTotal();
    return typeof total === 'number' && !isNaN(total) && total > 0;
  }
}

module.exports = {
  CartDrawerController,
};

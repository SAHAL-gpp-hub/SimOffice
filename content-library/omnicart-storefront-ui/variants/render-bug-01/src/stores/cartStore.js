/**
 * Zustand-style lightweight reactive cart store for OmniCart.
 *
 * NOTE FOR STUDENTS:
 * Customers report that item additions do not reflect in the UI immediately,
 * or React fails to trigger memoized cart item components.
 */

class CartStore {
  constructor(initialItems = []) {
    this.items = [...initialItems];
    this.coupon = null;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.getState());
    }
  }

  getState() {
    return {
      items: this.items,
      coupon: this.coupon,
    };
  }

  /**
   * Adds an item to cart.
   *
   * BUG REPORT:
   * Direct in-place mutation violates React state immutability principles.
   * Because `this.items` reference does not change, React selector hooks
   * (e.g. useSyncExternalStore or shallow compare) fail to detect changes!
   */
  addItem(newItem) {
    if (!newItem || !newItem.id) return;

    const existingIndex = this.items.findIndex(i => i.id === newItem.id);
    if (existingIndex >= 0) {
      this.items[existingIndex].quantity = (this.items[existingIndex].quantity || 1) + (newItem.quantity || 1);
    } else {
      // ⚠️ BUG: Direct array mutation! Must use immutable array spreading: [...this.items, newItem]
      this.items.push({ ...newItem, quantity: newItem.quantity || 1 });
    }

    this.notify();
  }

  setCoupon(coupon) {
    this.coupon = coupon;
    this.notify();
  }

  clear() {
    this.items = [];
    this.coupon = null;
    this.notify();
  }
}

function createCartStore(initialItems) {
  return new CartStore(initialItems);
}

module.exports = {
  CartStore,
  createCartStore,
};

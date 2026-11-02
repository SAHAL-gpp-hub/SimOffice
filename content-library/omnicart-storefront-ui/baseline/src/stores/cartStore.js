/**
 * Zustand-style lightweight reactive cart store for OmniCart.
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
   * Adds an item to cart immutably, respecting React reference equality.
   */
  addItem(newItem) {
    if (!newItem || !newItem.id) return;

    const existingIndex = this.items.findIndex(i => i.id === newItem.id);
    if (existingIndex >= 0) {
      // Immutably clone array and update item quantity
      this.items = this.items.map((item, idx) =>
        idx === existingIndex ? { ...item, quantity: (item.quantity || 1) + (newItem.quantity || 1) } : item
      );
    } else {
      // Immutably append item into new array reference
      this.items = [...this.items, { ...newItem, quantity: newItem.quantity || 1 }];
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

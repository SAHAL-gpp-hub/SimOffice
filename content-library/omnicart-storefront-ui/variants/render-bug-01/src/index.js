/**
 * OmniCart Storefront UI simulation server.
 */

const { createCartStore } = require('./stores/cartStore');
const { CartDrawerController } = require('./components/CartDrawer');
const { calculateSubtotal, applyCoupon } = require('./utils/pricing');

const store = createCartStore([
  { id: 'PROD-101', name: 'Ergonomic Mechanical Keyboard', price: 129.99, quantity: 1 },
  { id: 'PROD-102', name: 'USB-C Precision Mouse', price: 49.99, quantity: 2 },
]);

const drawer = new CartDrawerController(store);

console.log('[OmniCart Storefront] Cart initialized with items:');
console.log(store.getState().items);
console.log('[OmniCart Storefront] Initial Cart Total: $' + drawer.computeTotal());

module.exports = {
  store,
  drawer,
  calculateSubtotal,
  applyCoupon,
};

/**
 * Shopping Cart Store with localStorage persistence
 */
import { createStore } from '../../lib/framework.js';

const CART_KEY = 'vdx_shop_cart';

// Load cart from localStorage
function loadCart() {
    try {
        const saved = localStorage.getItem(CART_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

// Save cart to localStorage
function saveCart(items) {
    try {
        localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch (e) {
        console.warn('Failed to save cart:', e);
    }
}

// Create the store
const cartStore = createStore({
    items: loadCart(),

    // Get total items count
    get count() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    },

    // Get subtotal
    get subtotal() {
        return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },

    // Add item to cart
    addItem(product, quantity = 1) {
        const existing = this.items.find(item => item.id === product.id);

        if (existing) {
            existing.quantity += quantity;
        } else {
            this.items.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity
            });
        }

        saveCart(this.items);
        // Force reactivity
        this.items = [...this.items];
    },

    // Update item quantity
    updateQuantity(productId, quantity) {
        const item = this.items.find(i => i.id === productId);
        if (item) {
            if (quantity <= 0) {
                this.removeItem(productId);
            } else {
                item.quantity = quantity;
                saveCart(this.items);
                this.items = [...this.items];
            }
        }
    },

    // Remove item from cart
    removeItem(productId) {
        this.items = this.items.filter(i => i.id !== productId);
        saveCart(this.items);
    },

    // Clear cart
    clearCart() {
        this.items = [];
        saveCart(this.items);
    },

    // Check if product is in cart
    hasItem(productId) {
        return this.items.some(i => i.id === productId);
    },

    // Get item quantity
    getQuantity(productId) {
        const item = this.items.find(i => i.id === productId);
        return item ? item.quantity : 0;
    }
});

export default cartStore;

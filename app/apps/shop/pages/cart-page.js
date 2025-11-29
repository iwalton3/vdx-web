/**
 * Shopping Cart Page
 */
import { defineComponent, html, when, each } from '../../../lib/framework.js';
import cartStore from '../cart-store.js';

// Import UI components
import '../../../componentlib/button/button.js';
import '../../../componentlib/form/input-number.js';
import '../../../componentlib/data/datatable.js';

export default defineComponent('shop-cart-page', {
    stores: { cart: cartStore },

    methods: {
        updateQuantity(productId, e, val) {
            cartStore.state.updateQuantity(productId, val);
        },

        removeItem(productId) {
            cartStore.state.removeItem(productId);
        },

        clearCart() {
            if (confirm('Are you sure you want to clear your cart?')) {
                cartStore.state.clearCart();
            }
        },

        continueShopping() {
            window.location.hash = '/shop/products/';
        },

        proceedToCheckout() {
            window.location.hash = '/shop/checkout/';
        },

        getShipping() {
            const subtotal = this.stores.cart.subtotal;
            return subtotal >= 50 ? 0 : 5.99;
        },

        getTax() {
            return this.stores.cart.subtotal * 0.08; // 8% tax
        },

        getTotal() {
            return this.stores.cart.subtotal + this.getShipping() + this.getTax();
        }
    },

    template() {
        const items = this.stores.cart.items;
        const subtotal = this.stores.cart.subtotal;

        return html`
            <div class="cart-page">
                <h1>Shopping Cart</h1>

                ${when(items.length === 0, html`
                    <div class="empty-cart">
                        <div class="empty-icon">🛒</div>
                        <h2>Your cart is empty</h2>
                        <p>Looks like you haven't added any items to your cart yet.</p>
                        <cl-button
                            label="Start Shopping"
                            severity="primary"
                            icon="🛍️"
                            on-click="continueShopping">
                        </cl-button>
                    </div>
                `, html`
                    <div class="cart-layout">
                        <!-- Cart Items -->
                        <div class="cart-items">
                            <div class="cart-header">
                                <span class="header-product">Product</span>
                                <span class="header-price">Price</span>
                                <span class="header-quantity">Quantity</span>
                                <span class="header-total">Total</span>
                                <span class="header-actions"></span>
                            </div>

                            ${each(items, item => html`
                                <div class="cart-item">
                                    <div class="item-product">
                                        <img src="${item.image}" alt="${item.name}" class="item-image">
                                        <div class="item-details">
                                            <h3 class="item-name">${item.name}</h3>
                                            <a href="#/shop/product/${item.id}/" class="view-link">View product</a>
                                        </div>
                                    </div>
                                    <div class="item-price">$${item.price.toFixed(2)}</div>
                                    <div class="item-quantity">
                                        <cl-input-number
                                            value="${item.quantity}"
                                            min="1"
                                            max="99"
                                            on-change="${(e, val) => this.updateQuantity(item.id, e, val)}">
                                        </cl-input-number>
                                    </div>
                                    <div class="item-total">$${(item.price * item.quantity).toFixed(2)}</div>
                                    <div class="item-actions">
                                        <button class="remove-btn" on-click="${() => this.removeItem(item.id)}" title="Remove item">
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            `)}

                            <div class="cart-actions">
                                <cl-button
                                    label="Continue Shopping"
                                    severity="secondary"
                                    text="true"
                                    icon="←"
                                    on-click="continueShopping">
                                </cl-button>
                                <cl-button
                                    label="Clear Cart"
                                    severity="danger"
                                    text="true"
                                    on-click="clearCart">
                                </cl-button>
                            </div>
                        </div>

                        <!-- Order Summary -->
                        <div class="order-summary">
                            <h2>Order Summary</h2>

                            <div class="summary-row">
                                <span>Subtotal (${this.stores.cart.count} items)</span>
                                <span>$${subtotal.toFixed(2)}</span>
                            </div>

                            <div class="summary-row">
                                <span>Shipping</span>
                                <span>${this.getShipping() === 0 ? 'FREE' : '$' + this.getShipping().toFixed(2)}</span>
                            </div>

                            ${when(subtotal < 50 && subtotal > 0, html`
                                <div class="shipping-notice">
                                    Add $${(50 - subtotal).toFixed(2)} more for free shipping!
                                </div>
                            `)}

                            <div class="summary-row">
                                <span>Estimated Tax</span>
                                <span>$${this.getTax().toFixed(2)}</span>
                            </div>

                            <div class="summary-divider"></div>

                            <div class="summary-row total">
                                <span>Total</span>
                                <span>$${this.getTotal().toFixed(2)}</span>
                            </div>

                            <cl-button
                                label="Proceed to Checkout"
                                severity="primary"
                                icon="→"
                                iconPos="right"
                                class="checkout-btn"
                                on-click="proceedToCheckout">
                            </cl-button>

                            <div class="secure-notice">
                                <span class="lock-icon">🔒</span>
                                <span>Secure checkout</span>
                            </div>
                        </div>
                    </div>
                `)}
            </div>
        `;
    },

    styles: `
        .cart-page {
            max-width: 1200px;
            margin: 0 auto;
        }

        h1 {
            margin: 0 0 32px 0;
            font-size: 32px;
            color: #333;
        }

        /* Empty Cart */
        .empty-cart {
            text-align: center;
            padding: 80px 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .empty-icon {
            font-size: 80px;
            margin-bottom: 24px;
            opacity: 0.5;
        }

        .empty-cart h2 {
            margin: 0 0 12px 0;
            color: #333;
        }

        .empty-cart p {
            margin: 0 0 32px 0;
            color: #666;
        }

        /* Cart Layout */
        .cart-layout {
            display: flex;
            flex-direction: row;
            gap: 32px;
            align-items: flex-start;
            flex-wrap: wrap;
        }

        /* Cart Items */
        .cart-items {
            flex: 1 1 500px;
            min-width: 0;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            overflow: hidden;
        }

        .cart-header {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr 60px;
            gap: 16px;
            padding: 16px 24px;
            background: #f8f9fa;
            font-weight: 600;
            font-size: 14px;
            color: #666;
        }

        .cart-item {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr 60px;
            gap: 16px;
            padding: 24px;
            border-bottom: 1px solid #eee;
            align-items: center;
        }

        .cart-item:last-of-type {
            border-bottom: none;
        }

        .item-product {
            display: flex;
            gap: 16px;
            align-items: center;
        }

        .item-image {
            width: 80px;
            height: 80px;
            object-fit: cover;
            border-radius: 8px;
        }

        .item-details {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .item-name {
            margin: 0;
            font-size: 16px;
            color: #333;
        }

        .view-link {
            font-size: 13px;
            color: #1976d2;
            text-decoration: none;
        }

        .view-link:hover {
            text-decoration: underline;
        }

        .item-price, .item-total {
            font-size: 16px;
            color: #333;
        }

        .item-total {
            font-weight: 600;
        }

        .item-quantity {
            width: 160px;
        }

        .remove-btn {
            background: none;
            border: none;
            color: #999;
            font-size: 18px;
            cursor: pointer;
            padding: 8px;
            border-radius: 4px;
            transition: all 0.2s;
        }

        .remove-btn:hover {
            background: #fee;
            color: #e74c3c;
        }

        .cart-actions {
            display: flex;
            justify-content: space-between;
            padding: 16px 24px;
            border-top: 1px solid #eee;
        }

        /* Order Summary */
        .order-summary {
            flex: 0 0 320px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            padding: 24px;
        }

        .order-summary h2 {
            margin: 0 0 24px 0;
            font-size: 20px;
            color: #333;
        }

        .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            font-size: 15px;
            color: #555;
        }

        .summary-row.total {
            font-size: 20px;
            font-weight: 700;
            color: #333;
        }

        .summary-divider {
            height: 1px;
            background: #eee;
            margin: 12px 0;
        }

        .shipping-notice {
            background: #fff3cd;
            color: #856404;
            padding: 12px;
            border-radius: 8px;
            font-size: 14px;
            margin: 8px 0;
        }

        .checkout-btn {
            width: 100%;
            margin-top: 24px;
        }

        .secure-notice {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
            margin-top: 16px;
            font-size: 14px;
            color: #666;
        }

        /* Responsive - tablet and below */
        @media (max-width: 900px) {
            .cart-layout {
                flex-direction: column;
            }

            .cart-items {
                flex: 1 1 100%;
                order: 0;
            }

            .order-summary {
                flex: 1 1 100%;
                order: 1;
            }
        }

        @media (max-width: 768px) {
            h1 {
                font-size: 24px;
            }

            .cart-header {
                display: none;
            }

            .cart-items {
                border-radius: 8px;
            }

            .cart-item {
                display: flex;
                flex-direction: column;
                gap: 16px;
                padding: 16px;
                position: relative;
            }

            .item-product {
                flex-direction: row;
                align-items: flex-start;
                gap: 12px;
            }

            .item-image {
                width: 80px;
                height: 80px;
                flex-shrink: 0;
            }

            .item-details {
                flex: 1;
                min-width: 0;
            }

            .item-name {
                font-size: 14px;
            }

            .item-price, .item-total {
                font-size: 14px;
            }

            .item-price::before { content: 'Price: '; color: #666; font-weight: normal; }
            .item-total::before { content: 'Total: '; color: #666; font-weight: normal; }

            .item-quantity {
                width: auto;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .item-quantity::before {
                content: 'Qty:';
                color: #666;
                font-size: 14px;
            }

            .item-actions {
                position: absolute;
                top: 12px;
                right: 12px;
            }

            .cart-actions {
                flex-direction: column;
                gap: 12px;
            }

            .order-summary {
                padding: 16px;
            }
        }
    `
});

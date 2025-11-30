/**
 * Checkout Page
 */
import { defineComponent, html, when, each } from '../../../lib/framework.js';
import cartStore from '../cart-store.js';

// Import UI components
import '../../../componentlib/button/button.js';
import '../../../componentlib/form/input-text.js';
import '../../../componentlib/selection/dropdown.js';
import '../../../componentlib/form/checkbox.js';
import '../../../componentlib/overlay/dialog.js';

export default defineComponent('shop-checkout-page', {
    stores: { cart: cartStore },

    data() {
        return {
            step: 1, // 1: Shipping, 2: Payment, 3: Review
            shipping: {
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                address: '',
                city: '',
                state: '',
                zip: '',
                country: 'US'
            },
            payment: {
                cardNumber: '',
                cardName: '',
                expiry: '',
                cvv: ''
            },
            billingSameAsShipping: true,
            processing: false,
            orderComplete: false,
            orderId: null,
            errors: {}
        };
    },

    methods: {
        getShipping() {
            return this.stores.cart.subtotal >= 50 ? 0 : 5.99;
        },

        getTax() {
            return this.stores.cart.subtotal * 0.08;
        },

        getTotal() {
            return this.stores.cart.subtotal + this.getShipping() + this.getTax();
        },

        validateShipping() {
            const errors = {};
            const s = this.state.shipping;

            if (!s.firstName.trim()) errors.firstName = 'First name is required';
            if (!s.lastName.trim()) errors.lastName = 'Last name is required';
            if (!s.email.trim()) errors.email = 'Email is required';
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) errors.email = 'Invalid email';
            if (!s.address.trim()) errors.address = 'Address is required';
            if (!s.city.trim()) errors.city = 'City is required';
            if (!s.state.trim()) errors.state = 'State is required';
            if (!s.zip.trim()) errors.zip = 'ZIP code is required';

            this.state.errors = errors;
            return Object.keys(errors).length === 0;
        },

        validatePayment() {
            const errors = {};
            const p = this.state.payment;

            if (!p.cardNumber.replace(/\s/g, '').match(/^\d{16}$/)) {
                errors.cardNumber = 'Enter a valid 16-digit card number';
            }
            if (!p.cardName.trim()) errors.cardName = 'Name on card is required';
            if (!p.expiry.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) {
                errors.expiry = 'Enter expiry as MM/YY';
            }
            if (!p.cvv.match(/^\d{3,4}$/)) errors.cvv = 'Enter a valid CVV';

            this.state.errors = errors;
            return Object.keys(errors).length === 0;
        },

        nextStep() {
            if (this.state.step === 1 && this.validateShipping()) {
                this.state.step = 2;
            } else if (this.state.step === 2 && this.validatePayment()) {
                this.state.step = 3;
            }
        },

        prevStep() {
            if (this.state.step > 1) {
                this.state.step--;
                this.state.errors = {};
            }
        },

        async placeOrder() {
            this.state.processing = true;

            // Simulate order processing
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Generate order ID
            this.state.orderId = 'ORD-' + Date.now().toString(36).toUpperCase();
            this.state.orderComplete = true;
            this.state.processing = false;

            // Clear cart
            cartStore.state.clearCart();
        },

        goHome() {
            window.location.hash = '/shop/';
        },

        goToCart() {
            window.location.hash = '/shop/cart/';
        },

        formatCardNumber(e) {
            let value = (e.detail?.value || '').replace(/\s/g, '').replace(/\D/g, '');
            value = value.substring(0, 16);
            value = value.replace(/(.{4})/g, '$1 ').trim();
            this.state.payment.cardNumber = value;
        },

        formatExpiry(e) {
            let value = (e.detail?.value || '').replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            this.state.payment.expiry = value;
        }
    },

    template() {
        const items = this.stores.cart.items;

        // Order complete view
        if (this.state.orderComplete) {
            return html`
                <div class="checkout-page">
                    <div class="order-complete">
                        <div class="success-icon">✓</div>
                        <h1>Order Confirmed!</h1>
                        <p class="order-id">Order #${this.state.orderId}</p>
                        <p>Thank you for your purchase. A confirmation email has been sent to ${this.state.shipping.email}.</p>
                        <cl-button
                            label="Continue Shopping"
                            severity="primary"
                            on-click="goHome">
                        </cl-button>
                    </div>
                </div>
            `;
        }

        // Empty cart
        if (items.length === 0) {
            return html`
                <div class="checkout-page">
                    <div class="empty-cart">
                        <h2>Your cart is empty</h2>
                        <p>Add some items to your cart before checkout.</p>
                        <cl-button
                            label="Browse Products"
                            severity="primary"
                            on-click="goHome">
                        </cl-button>
                    </div>
                </div>
            `;
        }

        return html`
            <div class="checkout-page">
                <h1>Checkout</h1>

                <!-- Progress Steps -->
                <div class="progress-steps">
                    <div class="step ${this.state.step >= 1 ? 'active' : ''} ${this.state.step > 1 ? 'completed' : ''}">
                        <span class="step-number">1</span>
                        <span class="step-label">Shipping</span>
                    </div>
                    <div class="step-line ${this.state.step > 1 ? 'active' : ''}"></div>
                    <div class="step ${this.state.step >= 2 ? 'active' : ''} ${this.state.step > 2 ? 'completed' : ''}">
                        <span class="step-number">2</span>
                        <span class="step-label">Payment</span>
                    </div>
                    <div class="step-line ${this.state.step > 2 ? 'active' : ''}"></div>
                    <div class="step ${this.state.step >= 3 ? 'active' : ''}">
                        <span class="step-number">3</span>
                        <span class="step-label">Review</span>
                    </div>
                </div>

                <div class="checkout-layout">
                    <!-- Form Section -->
                    <div class="checkout-form">
                        ${when(this.state.step === 1, html`
                            <!-- Shipping Form -->
                            <div class="form-section">
                                <h2>Shipping Information</h2>

                                <div class="form-row">
                                    <div class="form-group">
                                        <label>First Name *</label>
                                        <cl-input-text
                                            value="${this.state.shipping.firstName}"
                                            on-input="${e => this.state.shipping.firstName = e.detail?.value || ''}"
                                            error="${this.state.errors.firstName || ''}">
                                        </cl-input-text>
                                    </div>
                                    <div class="form-group">
                                        <label>Last Name *</label>
                                        <cl-input-text
                                            value="${this.state.shipping.lastName}"
                                            on-input="${e => this.state.shipping.lastName = e.detail?.value || ''}"
                                            error="${this.state.errors.lastName || ''}">
                                        </cl-input-text>
                                    </div>
                                </div>

                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Email *</label>
                                        <cl-input-text
                                            value="${this.state.shipping.email}"
                                            on-input="${e => this.state.shipping.email = e.detail?.value || ''}"
                                            error="${this.state.errors.email || ''}">
                                        </cl-input-text>
                                    </div>
                                    <div class="form-group">
                                        <label>Phone</label>
                                        <cl-input-text
                                            value="${this.state.shipping.phone}"
                                            on-input="${e => this.state.shipping.phone = e.detail?.value || ''}">
                                        </cl-input-text>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label>Address *</label>
                                    <cl-input-text
                                        value="${this.state.shipping.address}"
                                        on-input="${e => this.state.shipping.address = e.detail?.value || ''}"
                                        error="${this.state.errors.address || ''}">
                                    </cl-input-text>
                                </div>

                                <div class="form-row form-row-3">
                                    <div class="form-group">
                                        <label>City *</label>
                                        <cl-input-text
                                            value="${this.state.shipping.city}"
                                            on-input="${e => this.state.shipping.city = e.detail?.value || ''}"
                                            error="${this.state.errors.city || ''}">
                                        </cl-input-text>
                                    </div>
                                    <div class="form-group">
                                        <label>State *</label>
                                        <cl-input-text
                                            value="${this.state.shipping.state}"
                                            on-input="${e => this.state.shipping.state = e.detail?.value || ''}"
                                            error="${this.state.errors.state || ''}">
                                        </cl-input-text>
                                    </div>
                                    <div class="form-group">
                                        <label>ZIP Code *</label>
                                        <cl-input-text
                                            value="${this.state.shipping.zip}"
                                            on-input="${e => this.state.shipping.zip = e.detail?.value || ''}"
                                            error="${this.state.errors.zip || ''}">
                                        </cl-input-text>
                                    </div>
                                </div>
                            </div>
                        `)}

                        ${when(this.state.step === 2, html`
                            <!-- Payment Form -->
                            <div class="form-section">
                                <h2>Payment Information</h2>

                                <div class="form-group">
                                    <label>Card Number *</label>
                                    <cl-input-text
                                        value="${this.state.payment.cardNumber}"
                                        placeholder="1234 5678 9012 3456"
                                        on-input="${this.formatCardNumber}"
                                        error="${this.state.errors.cardNumber || ''}">
                                    </cl-input-text>
                                </div>

                                <div class="form-group">
                                    <label>Name on Card *</label>
                                    <cl-input-text
                                        value="${this.state.payment.cardName}"
                                        on-input="${e => this.state.payment.cardName = e.detail?.value || ''}"
                                        error="${this.state.errors.cardName || ''}">
                                    </cl-input-text>
                                </div>

                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Expiry Date *</label>
                                        <cl-input-text
                                            value="${this.state.payment.expiry}"
                                            placeholder="MM/YY"
                                            on-input="${this.formatExpiry}"
                                            error="${this.state.errors.expiry || ''}">
                                        </cl-input-text>
                                    </div>
                                    <div class="form-group">
                                        <label>CVV *</label>
                                        <cl-input-text
                                            value="${this.state.payment.cvv}"
                                            placeholder="123"
                                            on-input="${e => this.state.payment.cvv = (e.detail?.value || '').replace(/\D/g, '')}"
                                            error="${this.state.errors.cvv || ''}">
                                        </cl-input-text>
                                    </div>
                                </div>

                                <div class="billing-checkbox">
                                    <cl-checkbox
                                        checked="${this.state.billingSameAsShipping}"
                                        on-change="${e => this.state.billingSameAsShipping = e.detail?.value}">
                                    </cl-checkbox>
                                    <span>Billing address same as shipping</span>
                                </div>
                            </div>
                        `)}

                        ${when(this.state.step === 3, html`
                            <!-- Review Order -->
                            <div class="form-section">
                                <h2>Review Your Order</h2>

                                <div class="review-section">
                                    <h3>Shipping Address</h3>
                                    <p>
                                        ${this.state.shipping.firstName} ${this.state.shipping.lastName}<br>
                                        ${this.state.shipping.address}<br>
                                        ${this.state.shipping.city}, ${this.state.shipping.state} ${this.state.shipping.zip}
                                    </p>
                                </div>

                                <div class="review-section">
                                    <h3>Payment Method</h3>
                                    <p>Card ending in ${this.state.payment.cardNumber.slice(-4)}</p>
                                </div>

                                <div class="review-section">
                                    <h3>Items (${this.stores.cart.count})</h3>
                                    ${each(items, item => html`
                                        <div class="review-item">
                                            <img src="${item.image}" alt="${item.name}">
                                            <div class="review-item-info">
                                                <span class="item-name">${item.name}</span>
                                                <span class="item-qty">Qty: ${item.quantity}</span>
                                            </div>
                                            <span class="item-price">$${(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    `)}
                                </div>
                            </div>
                        `)}

                        <!-- Navigation Buttons -->
                        <div class="form-actions">
                            ${when(this.state.step > 1, html`
                                <cl-button
                                    label="Back"
                                    severity="secondary"
                                    text="true"
                                    on-click="prevStep">
                                </cl-button>
                            `, html`
                                <cl-button
                                    label="Return to Cart"
                                    severity="secondary"
                                    text="true"
                                    on-click="goToCart">
                                </cl-button>
                            `)}

                            ${when(this.state.step < 3, html`
                                <cl-button
                                    label="Continue"
                                    severity="primary"
                                    icon="→"
                                    iconPos="right"
                                    on-click="nextStep">
                                </cl-button>
                            `, html`
                                <cl-button
                                    label="${this.state.processing ? 'Processing...' : 'Place Order'}"
                                    severity="primary"
                                    disabled="${this.state.processing}"
                                    on-click="placeOrder">
                                </cl-button>
                            `)}
                        </div>
                    </div>

                    <!-- Order Summary Sidebar -->
                    <div class="order-summary">
                        <h2>Order Summary</h2>

                        <div class="summary-items">
                            ${each(items, item => html`
                                <div class="summary-item">
                                    <img src="${item.image}" alt="${item.name}">
                                    <div class="summary-item-info">
                                        <span class="item-name">${item.name}</span>
                                        <span class="item-qty">Qty: ${item.quantity}</span>
                                    </div>
                                    <span class="item-price">$${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            `)}
                        </div>

                        <div class="summary-totals">
                            <div class="summary-row">
                                <span>Subtotal</span>
                                <span>$${this.stores.cart.subtotal.toFixed(2)}</span>
                            </div>
                            <div class="summary-row">
                                <span>Shipping</span>
                                <span>${this.getShipping() === 0 ? 'FREE' : '$' + this.getShipping().toFixed(2)}</span>
                            </div>
                            <div class="summary-row">
                                <span>Tax</span>
                                <span>$${this.getTax().toFixed(2)}</span>
                            </div>
                            <div class="summary-row total">
                                <span>Total</span>
                                <span>$${this.getTotal().toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    styles: /*css*/`
        .checkout-page {
            max-width: 1100px;
            margin: 0 auto;
        }

        h1 {
            margin: 0 0 32px 0;
            font-size: 32px;
            color: #333;
        }

        /* Progress Steps */
        .progress-steps {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 40px;
        }

        .step {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }

        .step-number {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #e0e0e0;
            color: #666;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            transition: all 0.3s;
        }

        .step.active .step-number {
            background: #1976d2;
            color: white;
        }

        .step.completed .step-number {
            background: #27ae60;
            color: white;
        }

        .step-label {
            font-size: 14px;
            color: #666;
        }

        .step.active .step-label {
            color: #1976d2;
            font-weight: 600;
        }

        .step-line {
            width: 100px;
            height: 3px;
            background: #e0e0e0;
            margin: 0 16px 24px;
            transition: background 0.3s;
        }

        .step-line.active {
            background: #27ae60;
        }

        /* Checkout Layout */
        .checkout-layout {
            display: flex;
            flex-direction: row;
            gap: 32px;
            align-items: flex-start;
            flex-wrap: wrap;
        }

        /* Form Section */
        .checkout-form {
            flex: 1 1 500px;
            min-width: 0;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            padding: 32px;
        }

        .form-section h2 {
            margin: 0 0 24px 0;
            font-size: 20px;
            color: #333;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #333;
            font-size: 14px;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        .form-row-3 {
            grid-template-columns: 1fr 1fr 1fr;
        }

        .error {
            display: block;
            margin-top: 4px;
            color: #e74c3c;
            font-size: 13px;
        }

        .billing-checkbox {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-top: 16px;
        }

        /* Review Section */
        .review-section {
            padding: 20px 0;
            border-bottom: 1px solid #eee;
        }

        .review-section:last-of-type {
            border-bottom: none;
        }

        .review-section h3 {
            margin: 0 0 12px 0;
            font-size: 16px;
            color: #666;
        }

        .review-section p {
            margin: 0;
            color: #333;
            line-height: 1.6;
        }

        .review-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 0;
        }

        .review-item img {
            width: 50px;
            height: 50px;
            object-fit: cover;
            border-radius: 6px;
        }

        .review-item-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .review-item .item-name {
            font-size: 14px;
            color: #333;
        }

        .review-item .item-qty {
            font-size: 13px;
            color: #666;
        }

        .review-item .item-price {
            font-weight: 600;
            color: #333;
        }

        /* Form Actions */
        .form-actions {
            display: flex;
            justify-content: space-between;
            margin-top: 32px;
            padding-top: 24px;
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
            margin: 0 0 20px 0;
            font-size: 18px;
            color: #333;
        }

        .summary-items {
            max-height: 300px;
            overflow-y: auto;
            border-bottom: 1px solid #eee;
            margin-bottom: 16px;
            padding-bottom: 16px;
        }

        .summary-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 0;
        }

        .summary-item img {
            width: 48px;
            height: 48px;
            object-fit: cover;
            border-radius: 6px;
        }

        .summary-item-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .summary-item .item-name {
            font-size: 13px;
            color: #333;
        }

        .summary-item .item-qty {
            font-size: 12px;
            color: #666;
        }

        .summary-item .item-price {
            font-size: 14px;
            font-weight: 600;
        }

        .summary-totals {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .summary-row {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            color: #555;
        }

        .summary-row.total {
            font-size: 18px;
            font-weight: 700;
            color: #333;
            padding-top: 12px;
            border-top: 1px solid #eee;
        }

        /* Order Complete */
        .order-complete {
            text-align: center;
            padding: 80px 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .success-icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #27ae60;
            color: white;
            font-size: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
        }

        .order-complete h1 {
            margin: 0 0 8px 0;
        }

        .order-id {
            color: #666;
            margin: 0 0 24px 0;
        }

        .order-complete > p:not(.order-id) {
            color: #555;
            margin: 0 0 32px 0;
        }

        /* Empty Cart */
        .empty-cart {
            text-align: center;
            padding: 80px 20px;
            background: white;
            border-radius: 12px;
        }

        .empty-cart h2 {
            margin: 0 0 12px 0;
        }

        .empty-cart p {
            margin: 0 0 24px 0;
            color: #666;
        }

        /* Responsive - tablet and below */
        @media (max-width: 900px) {
            .checkout-layout {
                flex-direction: column;
            }

            .checkout-form {
                flex: 1 1 100%;
                order: 1;
            }

            .order-summary {
                flex: 1 1 100%;
                order: -1;
            }
        }

        @media (max-width: 768px) {
            .checkout-page {
                padding: 0 8px;
            }

            h1 {
                font-size: 24px;
                margin-bottom: 24px;
            }

            .progress-steps {
                margin-bottom: 24px;
                flex-wrap: nowrap;
                overflow-x: auto;
                padding-bottom: 8px;
            }

            .step {
                min-width: auto;
            }

            .step-number {
                width: 32px;
                height: 32px;
                font-size: 14px;
            }

            .step-label {
                font-size: 12px;
            }

            .step-line {
                width: 30px;
                margin: 0 8px 16px;
            }

            .checkout-form {
                padding: 16px;
                border-radius: 8px;
            }

            .form-section h2 {
                font-size: 18px;
            }

            .form-row, .form-row-3 {
                grid-template-columns: 1fr;
                gap: 16px;
            }

            .form-group {
                margin-bottom: 16px;
            }

            .form-actions {
                flex-direction: column-reverse;
                gap: 12px;
            }

            .form-actions cl-button {
                width: 100%;
            }

            .order-summary {
                padding: 16px;
                border-radius: 8px;
            }

            .order-summary h2 {
                font-size: 16px;
            }

            .summary-items {
                max-height: 200px;
            }

            .review-item {
                padding: 8px 0;
            }

            .review-item img {
                width: 40px;
                height: 40px;
            }

            .billing-checkbox {
                flex-wrap: wrap;
            }
        }
    `
});

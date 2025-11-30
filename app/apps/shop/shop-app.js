/**
 * VDX Shop - E-commerce Demo Application
 * Showcases the VDX Web framework with routing, state management, and UI components
 */
import { defineComponent, html, when, each } from '../../lib/framework.js';
import { enableRouting } from '../../lib/router.js';
import cartStore from './cart-store.js';

// Import components
import '../../componentlib/layout/shell.js';
import '../../componentlib/button/button.js';
import '../../componentlib/overlay/toast.js';

// Import page components
import './pages/home-page.js';
import './pages/products-page.js';
import './pages/product-detail.js';
import './pages/cart-page.js';
import './pages/checkout-page.js';

// Setup router
const outlet = document.querySelector('router-outlet');
const router = enableRouting(outlet, {
    '/shop/': {
        component: 'shop-home-page'
    },
    '/shop/products/': {
        component: 'shop-products-page'
    },
    '/shop/products/:category/': {
        component: 'shop-products-page'
    },
    '/shop/product/:id/': {
        component: 'shop-product-detail'
    },
    '/shop/cart/': {
        component: 'shop-cart-page'
    },
    '/shop/checkout/': {
        component: 'shop-checkout-page'
    }
});

export default defineComponent('shop-app', {
    stores: { cart: cartStore },

    data() {
        return {
            routerConnected: false,
            menuItems: [
                { label: 'Home', key: 'home', icon: '🏠' },
                {
                    label: 'Products',
                    key: 'products',
                    icon: '🛍️',
                    items: [
                        { label: 'All Products', key: 'all' },
                        { label: 'Electronics', key: 'electronics' },
                        { label: 'Clothing', key: 'clothing' },
                        { label: 'Home & Garden', key: 'home-garden' },
                        { label: 'Sports', key: 'sports' },
                        { label: 'Books', key: 'books' }
                    ]
                },
                { label: 'Cart', key: 'cart', icon: '🛒' }
            ]
        };
    },

    mounted() {
        // Connect router to outlet after component renders
        const outlet = this.querySelector('router-outlet');
        if (outlet) {
            router.setOutlet(outlet);
        }
        // If no hash or empty hash, redirect to /shop/
        if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
            window.location.hash = '/shop/';
        }
        // Trigger initial route handling
        router.handleRoute();
    },

    methods: {
        handleMenuClick(e, key) {
            switch(key) {
                case 'home':
                    router.navigate('/shop/');
                    break;
                case 'all':
                    router.navigate('/shop/products/');
                    break;
                case 'electronics':
                    router.navigate('/shop/products/electronics/');
                    break;
                case 'clothing':
                    router.navigate('/shop/products/clothing/');
                    break;
                case 'home-garden':
                    router.navigate('/shop/products/home/');
                    break;
                case 'sports':
                    router.navigate('/shop/products/sports/');
                    break;
                case 'books':
                    router.navigate('/shop/products/books/');
                    break;
                case 'cart':
                    router.navigate('/shop/cart/');
                    break;
            }
        },

        goToCart() {
            router.navigate('/shop/cart/');
        }
    },

    template() {
        const cartCount = this.stores.cart.items.reduce((sum, item) => sum + item.quantity, 0);

        return html`
            <cl-shell
                title="VDX Shop"
                subtitle="E-commerce Demo"
                menuItems="${this.state.menuItems}"
                on-change="handleMenuClick">

                <div slot="topbar" class="topbar-actions">
                    <button class="cart-button" on-click="goToCart">
                        🛒
                        ${when(cartCount > 0, html`
                            <span class="cart-badge">${cartCount}</span>
                        `)}
                    </button>
                </div>

                <router-outlet></router-outlet>
                <cl-toast position="top-right"></cl-toast>
            </cl-shell>
        `;
    },

    styles: /*css*/`
        :host {
            display: block;
            height: 100vh;
        }

        .topbar-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .cart-button {
            position: relative;
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 18px;
            transition: background 0.2s;
        }

        .cart-button:hover {
            background: rgba(255,255,255,0.3);
        }

        .cart-badge {
            position: absolute;
            top: -6px;
            right: -6px;
            background: #e74c3c;
            color: white;
            font-size: 11px;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 10px;
            min-width: 18px;
            text-align: center;
        }
    `
});

// Export router for use in other components
export { router };

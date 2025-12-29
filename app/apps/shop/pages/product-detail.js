/**
 * Product Detail Page
 */
import { defineComponent, html, when, each } from '../../../lib/framework.js';
import cartStore from '../cart-store.js';

// Import UI components
import '../../../componentlib/button/button.js';
import '../../../componentlib/form/input-number.js';
import '../../../componentlib/button/breadcrumb.js';

export default defineComponent('shop-product-detail', {
    props: {
        params: {}  // URL params from router
    },

    stores: { cart: cartStore },

    data() {
        return {
            product: null,
            relatedProducts: [],
            quantity: 1,
            loading: true,
            selectedImage: 0
        };
    },

    async mounted() {
        await this.loadProduct();
    },

    methods: {
        async loadProduct() {
            try {
                const response = await fetch('./products.json');
                const data = await response.json();

                const productId = parseInt(this.props.params?.id);
                this.state.product = data.products.find(p => p.id === productId);

                if (this.state.product) {
                    // Get related products from same category
                    this.state.relatedProducts = data.products
                        .filter(p => p.category === this.state.product.category && p.id !== productId)
                        .slice(0, 4);
                }

                this.state.loading = false;
            } catch (e) {
                console.error('Failed to load product:', e);
                this.state.loading = false;
            }
        },

        handleQuantityChange(e, val) {
            this.state.quantity = Math.max(1, Math.min(10, val));
        },

        addToCart() {
            if (!this.state.product || !this.state.product.inStock) return;

            cartStore.state.addItem(this.state.product, this.state.quantity);

            // Show toast
            const toast = document.querySelector('cl-toast');
            if (toast) {
                toast.show({
                    severity: 'success',
                    summary: 'Added to Cart',
                    detail: `${this.state.quantity}x ${this.state.product.name} added to your cart`,
                    life: 3000
                });
            }
        },

        buyNow() {
            this.addToCart();
            window.location.hash = '/shop/cart/';
        },

        goBack() {
            window.history.back();
        },

        navigateToProduct(productId) {
            window.location.hash = `/shop/product/${productId}/`;
            // Reload the product
            this.state.loading = true;
            setTimeout(() => this.loadProduct(), 0);
        },

        navigateToCategory(categoryId) {
            window.location.hash = `/shop/products/${categoryId}/`;
        },

        getBreadcrumbs() {
            if (!this.state.product) return [];
            return [
                { label: 'Products', url: '#/shop/products/' },
                { label: this.getCategoryName(this.state.product.category), url: `#/shop/products/${this.state.product.category}/` },
                { label: this.state.product.name }
            ];
        },

        getCategoryName(categoryId) {
            const names = {
                electronics: 'Electronics',
                clothing: 'Clothing',
                home: 'Home & Garden',
                sports: 'Sports & Outdoors',
                books: 'Books'
            };
            return names[categoryId] || categoryId;
        },

        getDiscountPercent() {
            if (!this.state.product?.originalPrice) return 0;
            return Math.round((1 - this.state.product.price / this.state.product.originalPrice) * 100);
        }
    },

    template() {
        return html`
            <div class="product-detail-page">
                ${when(this.state.loading, html`
                    <div class="loading">Loading product...</div>
                `, () => html`
                    ${when(!this.state.product, html`
                        <div class="not-found">
                            <h2>Product Not Found</h2>
                            <p>The product you're looking for doesn't exist.</p>
                            <cl-button
                                label="Browse Products"
                                severity="primary"
                                on-click="${() => window.location.hash = '/shop/products/'}">
                            </cl-button>
                        </div>
                    `, html`
                        <!-- Breadcrumb -->
                        <cl-breadcrumb
                            model="${this.getBreadcrumbs()}"
                            home="${{icon: '🏠', url: '#/shop/'}}">
                        </cl-breadcrumb>

                        <div class="product-layout">
                            <!-- Product Image -->
                            <div class="product-gallery">
                                <div class="main-image">
                                    ${when(this.state.product?.badge, html`
                                        <span class="product-badge badge-${this.state.product?.badge?.toLowerCase() || ''}">${this.state.product?.badge || ''}</span>
                                    `)}
                                    <img src="${this.state.product?.image || ''}" alt="${this.state.product?.name || ''}">
                                </div>
                            </div>

                            <!-- Product Info -->
                            <div class="product-info">
                                <h1 class="product-name">${this.state.product.name}</h1>

                                <div class="product-rating">
                                    ${'⭐'.repeat(Math.floor(this.state.product.rating))}
                                    <span class="rating-value">${this.state.product.rating}</span>
                                    <span class="rating-count">${this.state.product.reviews} reviews</span>
                                </div>

                                <div class="product-price">
                                    ${when(this.state.product?.originalPrice, html`
                                        <span class="original-price">$${this.state.product?.originalPrice?.toFixed(2) || '0.00'}</span>
                                        <span class="discount-badge">-${this.getDiscountPercent()}%</span>
                                    `)}
                                    <span class="current-price">$${this.state.product?.price?.toFixed(2) || '0.00'}</span>
                                </div>

                                <div class="product-description">
                                    <p>${this.state.product.description}</p>
                                </div>

                                <!-- Features -->
                                <div class="product-features">
                                    <h3>Features</h3>
                                    <ul>
                                        ${each(this.state.product.features, feature => html`
                                            <li>✓ ${feature}</li>
                                        `)}
                                    </ul>
                                </div>

                                <!-- Stock Status -->
                                <div class="stock-status ${this.state.product.inStock ? 'in-stock' : 'out-of-stock'}">
                                    ${this.state.product.inStock ? '✓ In Stock' : '✗ Out of Stock'}
                                </div>

                                <!-- Quantity & Add to Cart -->
                                ${when(this.state.product.inStock, html`
                                    <div class="purchase-section">
                                        <div class="quantity-section">
                                            <label>Quantity:</label>
                                            <cl-input-number
                                                value="${this.state.quantity}"
                                                min="1"
                                                max="10"
                                                on-change="handleQuantityChange">
                                            </cl-input-number>
                                        </div>

                                        <div class="action-buttons">
                                            <cl-button
                                                label="Add to Cart"
                                                severity="secondary"
                                                icon="🛒"
                                                on-click="addToCart">
                                            </cl-button>
                                            <cl-button
                                                label="Buy Now"
                                                severity="primary"
                                                on-click="buyNow">
                                            </cl-button>
                                        </div>
                                    </div>
                                `)}

                                <!-- Shipping Info -->
                                <div class="shipping-info">
                                    <div class="info-item">
                                        <span class="icon">🚚</span>
                                        <span>Free shipping on orders over $50</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="icon">↩️</span>
                                        <span>30-day return policy</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="icon">🔒</span>
                                        <span>Secure checkout</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Related Products -->
                        ${when(this.state.relatedProducts.length > 0, html`
                            <section class="related-products">
                                <h2>Related Products</h2>
                                <div class="products-grid">
                                    ${each(this.state.relatedProducts, related => html`
                                        <div class="product-card" on-click="${() => this.navigateToProduct(related.id)}">
                                            <img src="${related.image}" alt="${related.name}" class="product-image">
                                            <div class="card-info">
                                                <h3>${related.name}</h3>
                                                <div class="price">$${related.price.toFixed(2)}</div>
                                            </div>
                                        </div>
                                    `)}
                                </div>
                            </section>
                        `)}
                    `)}
                `)}
            </div>
        `;
    },

    styles: /*css*/`
        .product-detail-page {
            max-width: 1200px;
            margin: 0 auto;
        }

        .loading, .not-found {
            text-align: center;
            padding: 60px 20px;
            color: #666;
        }

        .not-found h2 {
            margin-bottom: 12px;
        }

        .not-found p {
            margin-bottom: 24px;
        }

        /* Breadcrumb */
        cl-breadcrumb {
            margin-bottom: 24px;
        }

        /* Product Layout */
        .product-layout {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 48px;
            background: white;
            padding: 32px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        /* Gallery */
        .product-gallery {
            position: relative;
        }

        .main-image {
            position: relative;
            border-radius: 12px;
            overflow: hidden;
        }

        .main-image img {
            width: 100%;
            height: auto;
            display: block;
        }

        .product-badge {
            position: absolute;
            top: 16px;
            left: 16px;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }

        .badge-sale { background: #e74c3c; color: white; }
        .badge-new { background: #27ae60; color: white; }
        .badge-popular { background: #f39c12; color: white; }
        .badge-best { background: #9b59b6; color: white; }

        /* Product Info */
        .product-info {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .product-name {
            margin: 0;
            font-size: 32px;
            color: #333;
            line-height: 1.2;
        }

        .product-rating {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 16px;
        }

        .rating-value {
            font-weight: 600;
        }

        .rating-count {
            color: #666;
        }

        .product-price {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .original-price {
            text-decoration: line-through;
            color: #999;
            font-size: 20px;
        }

        .discount-badge {
            background: #e74c3c;
            color: white;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 600;
        }

        .current-price {
            font-size: 36px;
            font-weight: 700;
            color: #1976d2;
        }

        .product-description {
            color: #555;
            line-height: 1.6;
        }

        .product-description p {
            margin: 0;
        }

        .product-features h3 {
            margin: 0 0 12px 0;
            font-size: 16px;
            color: #333;
        }

        .product-features ul {
            margin: 0;
            padding: 0;
            list-style: none;
        }

        .product-features li {
            padding: 6px 0;
            color: #555;
        }

        .stock-status {
            padding: 12px 16px;
            border-radius: 8px;
            font-weight: 600;
        }

        .stock-status.in-stock {
            background: #e8f5e9;
            color: #2e7d32;
        }

        .stock-status.out-of-stock {
            background: #ffebee;
            color: #c62828;
        }

        .purchase-section {
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .quantity-section {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .quantity-section label {
            font-weight: 500;
            color: #333;
        }

        .action-buttons {
            display: flex;
            gap: 12px;
        }

        .action-buttons cl-button {
            flex: 1;
        }

        .shipping-info {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 16px;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .info-item {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 14px;
            color: #555;
        }

        .info-item .icon {
            font-size: 18px;
        }

        /* Related Products */
        .related-products {
            margin-top: 48px;
        }

        .related-products h2 {
            margin: 0 0 24px 0;
            font-size: 24px;
            color: #333;
        }

        .products-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 20px;
        }

        .product-card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .product-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }

        .product-card .product-image {
            width: 100%;
            height: 180px;
            object-fit: cover;
        }

        .product-card .card-info {
            padding: 16px;
        }

        .product-card h3 {
            margin: 0 0 8px 0;
            font-size: 14px;
            color: #333;
        }

        .product-card .price {
            font-size: 18px;
            font-weight: 700;
            color: #1976d2;
        }

        @media (max-width: 992px) {
            .product-layout {
                grid-template-columns: 1fr;
                gap: 32px;
            }

            .product-name {
                font-size: 24px;
            }

            .current-price {
                font-size: 28px;
            }
        }

        @media (max-width: 768px) {
            .product-layout {
                padding: 20px;
            }

            .action-buttons {
                flex-direction: column;
            }
        }
    `
});

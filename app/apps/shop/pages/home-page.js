/**
 * Shop Home Page
 */
import { defineComponent, html, when, each } from '../../../lib/framework.js';
import '../../../componentlib/button/button.js';
import '../../../componentlib/panel/card.js';

export default defineComponent('shop-home-page', {
    data() {
        return {
            categories: [],
            featuredProducts: [],
            loading: true
        };
    },

    async mounted() {
        try {
            const response = await fetch('./products.json');
            const data = await response.json();
            this.state.categories = data.categories;
            // Get first 4 products as featured
            this.state.featuredProducts = data.products
                .filter(p => p.badge)
                .slice(0, 4);
            this.state.loading = false;
        } catch (e) {
            console.error('Failed to load products:', e);
            this.state.loading = false;
        }
    },

    methods: {
        navigateToCategory(categoryId) {
            window.location.hash = `/shop/products/${categoryId}/`;
        },

        navigateToProducts() {
            window.location.hash = '/shop/products/';
        },

        navigateToProduct(productId) {
            window.location.hash = `/shop/product/${productId}/`;
        }
    },

    template() {
        return html`
            <div class="home-page">
                <!-- Hero Section -->
                <section class="hero">
                    <div class="hero-content">
                        <h1>Welcome to VDX Shop</h1>
                        <p>Discover amazing products at unbeatable prices</p>
                        <cl-button
                            label="Shop Now"
                            severity="primary"
                            icon="🛍️"
                            on-click="navigateToProducts">
                        </cl-button>
                    </div>
                </section>

                <!-- Categories Section -->
                <section class="section">
                    <h2>Shop by Category</h2>
                    <div class="categories-grid">
                        ${each(this.state.categories, category => html`
                            <div class="category-card" on-click="${() => this.navigateToCategory(category.id)}">
                                <span class="category-icon">${category.icon}</span>
                                <span class="category-name">${category.name}</span>
                            </div>
                        `)}
                    </div>
                </section>

                <!-- Featured Products -->
                <section class="section">
                    <div class="section-header">
                        <h2>Featured Products</h2>
                        <cl-button
                            label="View All"
                            severity="secondary"
                            text="true"
                            on-click="navigateToProducts">
                        </cl-button>
                    </div>

                    ${when(this.state.loading, html`
                        <div class="loading">Loading products...</div>
                    `, html`
                        <div class="products-grid">
                            ${each(this.state.featuredProducts, product => html`
                                <div class="product-card" on-click="${() => this.navigateToProduct(product.id)}">
                                    ${when(product.badge, html`
                                        <span class="product-badge badge-${product.badge.toLowerCase()}">${product.badge}</span>
                                    `)}
                                    <img src="${product.image}" alt="${product.name}" class="product-image">
                                    <div class="product-info">
                                        <h3 class="product-name">${product.name}</h3>
                                        <div class="product-rating">
                                            ${'⭐'.repeat(Math.floor(product.rating))}
                                            <span class="rating-count">(${product.reviews})</span>
                                        </div>
                                        <div class="product-price">
                                            ${when(product && product.originalPrice, html`
                                                <span class="original-price">$${product?.originalPrice?.toFixed(2) || '0.00'}</span>
                                            `)}
                                            <span class="current-price">$${product?.price?.toFixed(2) || '0.00'}</span>
                                        </div>
                                    </div>
                                </div>
                            `)}
                        </div>
                    `)}
                </section>

                <!-- Features Section -->
                <section class="section features">
                    <div class="feature">
                        <span class="feature-icon">🚚</span>
                        <h3>Free Shipping</h3>
                        <p>On orders over $50</p>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">↩️</span>
                        <h3>Easy Returns</h3>
                        <p>30-day return policy</p>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">🔒</span>
                        <h3>Secure Payment</h3>
                        <p>100% secure checkout</p>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">💬</span>
                        <h3>24/7 Support</h3>
                        <p>Always here to help</p>
                    </div>
                </section>
            </div>
        `;
    },

    styles: /*css*/`
        .home-page {
            max-width: 1400px;
            margin: 0 auto;
        }

        /* Hero Section */
        .hero {
            background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
            color: white;
            padding: 80px 40px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 48px;
        }

        .hero-content h1 {
            margin: 0 0 16px 0;
            font-size: 42px;
            font-weight: 700;
        }

        .hero-content p {
            margin: 0 0 32px 0;
            font-size: 20px;
            opacity: 0.9;
        }

        /* Sections */
        .section {
            margin-bottom: 48px;
        }

        .section h2 {
            margin: 0 0 24px 0;
            font-size: 28px;
            color: #333;
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
        }

        .section-header h2 {
            margin: 0;
        }

        /* Categories Grid */
        .categories-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 20px;
        }

        .category-card {
            background: white;
            border-radius: 12px;
            padding: 32px 24px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .category-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }

        .category-icon {
            font-size: 48px;
            display: block;
            margin-bottom: 12px;
        }

        .category-name {
            font-size: 16px;
            font-weight: 600;
            color: #333;
        }

        /* Products Grid */
        .products-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 24px;
        }

        .product-card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            position: relative;
        }

        .product-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }

        .product-badge {
            position: absolute;
            top: 12px;
            left: 12px;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            z-index: 1;
        }

        .badge-sale { background: #e74c3c; color: white; }
        .badge-new { background: #27ae60; color: white; }
        .badge-popular { background: #f39c12; color: white; }
        .badge-best { background: #9b59b6; color: white; }

        .product-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
        }

        .product-info {
            padding: 16px;
        }

        .product-name {
            margin: 0 0 8px 0;
            font-size: 16px;
            font-weight: 600;
            color: #333;
        }

        .product-rating {
            margin-bottom: 8px;
            font-size: 14px;
        }

        .rating-count {
            color: #666;
            margin-left: 4px;
        }

        .product-price {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .original-price {
            text-decoration: line-through;
            color: #999;
            font-size: 14px;
        }

        .current-price {
            font-size: 20px;
            font-weight: 700;
            color: #1976d2;
        }

        /* Features Section */
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 24px;
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .feature {
            text-align: center;
        }

        .feature-icon {
            font-size: 40px;
            display: block;
            margin-bottom: 12px;
        }

        .feature h3 {
            margin: 0 0 8px 0;
            font-size: 18px;
            color: #333;
        }

        .feature p {
            margin: 0;
            color: #666;
            font-size: 14px;
        }

        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }

        @media (max-width: 768px) {
            .hero {
                padding: 48px 24px;
            }

            .hero-content h1 {
                font-size: 28px;
            }

            .hero-content p {
                font-size: 16px;
            }

            .section h2 {
                font-size: 22px;
            }

            .categories-grid {
                grid-template-columns: repeat(2, 1fr);
            }

            .products-grid {
                grid-template-columns: 1fr;
            }
        }
    `
});

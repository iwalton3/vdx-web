/**
 * Shop Products Page with filtering, sorting, and pagination
 */
import { defineComponent, html, when, each } from '../../../lib/framework.js';
import cartStore from '../cart-store.js';

// Import UI components
import '../../../componentlib/button/button.js';
import '../../../componentlib/selection/dropdown.js';
import '../../../componentlib/form/slider.js';
import '../../../componentlib/form/checkbox.js';
import '../../../componentlib/data/paginator.js';

export default defineComponent('shop-products-page', {
    props: {
        params: {}  // URL params from router
    },

    stores: { cart: cartStore },

    data() {
        return {
            products: [],
            categories: [],
            loading: true,
            // Filters
            selectedCategory: null,
            priceRange: [0, 500],
            minRating: 0,
            inStockOnly: false,
            // Sorting
            sortBy: 'featured',
            sortOptions: [
                { label: 'Featured', value: 'featured' },
                { label: 'Price: Low to High', value: 'price-asc' },
                { label: 'Price: High to Low', value: 'price-desc' },
                { label: 'Rating: High to Low', value: 'rating-desc' },
                { label: 'Most Reviews', value: 'reviews-desc' },
                { label: 'Newest', value: 'newest' }
            ],
            // Pagination
            currentPage: 0,
            itemsPerPage: 8
        };
    },

    async mounted() {
        await this.loadProducts();
    },

    methods: {
        async loadProducts() {
            try {
                const response = await fetch('./products.json');
                const data = await response.json();
                this.state.products = data.products;
                this.state.categories = data.categories;

                // Set category from URL param if present, or clear it
                if (this.props.params?.category) {
                    this.state.selectedCategory = this.props.params.category;
                } else {
                    this.state.selectedCategory = null;
                }

                this.state.loading = false;
            } catch (e) {
                console.error('Failed to load products:', e);
                this.state.loading = false;
            }
        },

        getFilteredProducts() {
            let filtered = [...this.state.products];

            // Filter by category - use props directly for reactivity
            const category = this.props.params?.category || null;
            if (category) {
                filtered = filtered.filter(p => p.category === category);
            }

            // Filter by price range
            filtered = filtered.filter(p =>
                p.price >= this.state.priceRange[0] &&
                p.price <= this.state.priceRange[1]
            );

            // Filter by rating
            if (this.state.minRating > 0) {
                filtered = filtered.filter(p => p.rating >= this.state.minRating);
            }

            // Filter by stock
            if (this.state.inStockOnly) {
                filtered = filtered.filter(p => p.inStock);
            }

            // Sort
            switch (this.state.sortBy) {
                case 'price-asc':
                    filtered.sort((a, b) => a.price - b.price);
                    break;
                case 'price-desc':
                    filtered.sort((a, b) => b.price - a.price);
                    break;
                case 'rating-desc':
                    filtered.sort((a, b) => b.rating - a.rating);
                    break;
                case 'reviews-desc':
                    filtered.sort((a, b) => b.reviews - a.reviews);
                    break;
                case 'newest':
                    filtered.sort((a, b) => b.id - a.id);
                    break;
                default:
                    // Featured - badge products first
                    filtered.sort((a, b) => (b.badge ? 1 : 0) - (a.badge ? 1 : 0));
            }

            return filtered;
        },

        getPaginatedProducts() {
            const filtered = this.getFilteredProducts();
            const start = this.state.currentPage * this.state.itemsPerPage;
            return filtered.slice(start, start + this.state.itemsPerPage);
        },

        handlePageChange(e, val) {
            this.state.currentPage = Math.floor(val.first / this.state.itemsPerPage);
        },

        handleCategoryChange(categoryId) {
            this.state.selectedCategory = categoryId;
            this.state.currentPage = 0;
            // Update URL
            if (categoryId) {
                window.location.hash = `/shop/products/${categoryId}/`;
            } else {
                window.location.hash = '/shop/products/';
            }
        },

        handleSortChange(e, val) {
            this.state.sortBy = val;
            this.state.currentPage = 0;
        },

        handlePriceChange(e, val) {
            // Get value from either the handler arg or event detail
            const newValue = typeof val === 'number' ? val : (e?.detail ?? this.state.priceRange[1]);
            // Must reassign array (not mutate) for reactivity
            this.state.priceRange = [this.state.priceRange[0], newValue];
            this.state.currentPage = 0;
        },

        handleRatingChange(rating) {
            this.state.minRating = this.state.minRating === rating ? 0 : rating;
            this.state.currentPage = 0;
        },

        handleStockChange(e, val) {
            this.state.inStockOnly = val;
            this.state.currentPage = 0;
        },

        clearFilters() {
            this.state.selectedCategory = null;
            this.state.priceRange = [0, 500];
            this.state.minRating = 0;
            this.state.inStockOnly = false;
            this.state.sortBy = 'featured';
            this.state.currentPage = 0;
            window.location.hash = '/shop/products/';
        },

        navigateToProduct(productId) {
            window.location.hash = `/shop/product/${productId}/`;
        },

        addToCart(product, e) {
            e.stopPropagation();
            cartStore.state.addItem(product);

            // Show toast
            const toast = document.querySelector('cl-toast');
            if (toast) {
                toast.show({
                    severity: 'success',
                    summary: 'Added to Cart',
                    detail: `${product.name} added to your cart`,
                    life: 3000
                });
            }
        },

        getCurrentCategory() {
            // Use props directly for reactivity
            return this.props.params?.category || null;
        },

        getCategoryName(categoryId) {
            const category = this.state.categories.find(c => c.id === categoryId);
            return category ? category.name : 'All Products';
        }
    },

    template() {
        const filteredProducts = this.getFilteredProducts();
        const paginatedProducts = this.getPaginatedProducts();
        const totalProducts = filteredProducts.length;

        return html`
            <div class="products-page">
                <!-- Header -->
                <div class="page-header">
                    <div class="header-left">
                        <h1>${this.getCategoryName(this.getCurrentCategory())}</h1>
                        <span class="product-count">${totalProducts} products</span>
                    </div>
                    <div class="header-right">
                        <cl-dropdown
                            options="${this.state.sortOptions}"
                            value="${this.state.sortBy}"
                            on-change="handleSortChange"
                            placeholder="Sort by">
                        </cl-dropdown>
                    </div>
                </div>

                <div class="content-layout">
                    <!-- Filters Sidebar -->
                    <aside class="filters-sidebar">
                        <div class="filter-section">
                            <h3>Categories</h3>
                            <div class="category-filters">
                                <div
                                    class="category-option ${!this.getCurrentCategory() ? 'active' : ''}"
                                    on-click="${() => this.handleCategoryChange(null)}">
                                    All Products
                                </div>
                                ${each(this.state.categories, category => html`
                                    <div
                                        class="category-option ${this.getCurrentCategory() === category.id ? 'active' : ''}"
                                        on-click="${() => this.handleCategoryChange(category.id)}">
                                        ${category.icon} ${category.name}
                                    </div>
                                `)}
                            </div>
                        </div>

                        <div class="filter-section">
                            <h3>Price Range</h3>
                            <div class="price-display">
                                $0 - $${this.state.priceRange[1]}
                            </div>
                            <cl-slider
                                min="0"
                                max="500"
                                step="10"
                                value="${this.state.priceRange[1]}"
                                on-change="handlePriceChange">
                            </cl-slider>
                        </div>

                        <div class="filter-section">
                            <h3>Rating</h3>
                            <div class="rating-filters">
                                <div
                                    class="rating-option ${this.state.minRating === 4 ? 'active' : ''}"
                                    on-click="${() => this.handleRatingChange(4)}">
                                    ${'⭐⭐⭐⭐☆ & up'}
                                </div>
                                <div
                                    class="rating-option ${this.state.minRating === 3 ? 'active' : ''}"
                                    on-click="${() => this.handleRatingChange(3)}">
                                    ${'⭐⭐⭐☆☆ & up'}
                                </div>
                                <div
                                    class="rating-option ${this.state.minRating === 2 ? 'active' : ''}"
                                    on-click="${() => this.handleRatingChange(2)}">
                                    ${'⭐⭐☆☆☆ & up'}
                                </div>
                                <div
                                    class="rating-option ${this.state.minRating === 1 ? 'active' : ''}"
                                    on-click="${() => this.handleRatingChange(1)}">
                                    ${'⭐☆☆☆☆ & up'}
                                </div>
                            </div>
                        </div>

                        <div class="filter-section">
                            <cl-checkbox
                                label="In Stock Only"
                                checked="${this.state.inStockOnly}"
                                on-change="handleStockChange">
                            </cl-checkbox>
                        </div>

                        <cl-button
                            label="Clear Filters"
                            severity="secondary"
                            text="true"
                            on-click="clearFilters">
                        </cl-button>
                    </aside>

                    <!-- Products Grid -->
                    <main class="products-main">
                        ${when(this.state.loading, html`
                            <div class="loading">Loading products...</div>
                        `, html`
                            ${when(paginatedProducts.length === 0, html`
                                <div class="no-products">
                                    <p>No products found matching your filters.</p>
                                    <cl-button
                                        label="Clear Filters"
                                        severity="primary"
                                        on-click="clearFilters">
                                    </cl-button>
                                </div>
                            `, html`
                                <div class="products-grid">
                                    ${each(paginatedProducts, product => html`
                                        <div class="product-card" on-click="${() => this.navigateToProduct(product.id)}">
                                            ${when(product && product.badge, html`
                                                <span class="product-badge badge-${product?.badge?.toLowerCase() || ''}">${product?.badge || ''}</span>
                                            `)}
                                            ${when(!product.inStock, html`
                                                <span class="out-of-stock-badge">Out of Stock</span>
                                            `)}
                                            <img src="${product.image}" alt="${product.name}" class="product-image">
                                            <div class="product-info">
                                                <h3 class="product-name">${product.name}</h3>
                                                <div class="product-rating">
                                                    ${'⭐'.repeat(Math.floor(product.rating))}
                                                    <span class="rating-value">${product.rating}</span>
                                                    <span class="rating-count">(${product.reviews})</span>
                                                </div>
                                                <div class="product-price">
                                                    ${when(product && product.originalPrice, html`
                                                        <span class="original-price">$${product?.originalPrice?.toFixed(2) || '0.00'}</span>
                                                    `)}
                                                    <span class="current-price">$${product?.price?.toFixed(2) || '0.00'}</span>
                                                </div>
                                                <cl-button
                                                    label="${product.inStock ? 'Add to Cart' : 'Unavailable'}"
                                                    severity="${product.inStock ? 'primary' : 'secondary'}"
                                                    disabled="${!product.inStock}"
                                                    icon="🛒"
                                                    on-click="${(e) => this.addToCart(product, e)}">
                                                </cl-button>
                                            </div>
                                        </div>
                                    `)}
                                </div>

                                ${when(totalProducts > this.state.itemsPerPage, html`
                                    <div class="pagination-wrapper">
                                        <cl-paginator
                                            totalrecords="${totalProducts}"
                                            rows="${this.state.itemsPerPage}"
                                            first="${this.state.currentPage * this.state.itemsPerPage}"
                                            on-change="handlePageChange">
                                        </cl-paginator>
                                    </div>
                                `)}
                            `)}
                        `)}
                    </main>
                </div>
            </div>
        `;
    },

    styles: /*css*/`
        .products-page {
            max-width: 1400px;
            margin: 0 auto;
        }

        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 32px;
            flex-wrap: wrap;
            gap: 16px;
        }

        .header-left {
            display: flex;
            align-items: baseline;
            gap: 16px;
        }

        .page-header h1 {
            margin: 0;
            font-size: 28px;
            color: #333;
        }

        .product-count {
            color: #666;
            font-size: 14px;
        }

        .content-layout {
            display: grid;
            grid-template-columns: 280px 1fr;
            gap: 32px;
        }

        /* Filters Sidebar */
        .filters-sidebar {
            background: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            height: fit-content;
            position: sticky;
            top: 24px;
        }

        .filter-section {
            margin-bottom: 24px;
            padding-bottom: 24px;
            border-bottom: 1px solid #eee;
        }

        .filter-section:last-of-type {
            border-bottom: none;
            margin-bottom: 16px;
            padding-bottom: 0;
        }

        .filter-section h3 {
            margin: 0 0 16px 0;
            font-size: 14px;
            font-weight: 600;
            color: #333;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .category-filters {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .category-option {
            padding: 10px 12px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 14px;
            color: #555;
        }

        .category-option:hover {
            background: #f5f5f5;
        }

        .category-option.active {
            background: #e3f2fd;
            color: #1976d2;
            font-weight: 500;
        }

        .price-display {
            font-size: 14px;
            color: #666;
            margin-bottom: 12px;
        }

        .rating-filters {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .rating-option {
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 14px;
        }

        .rating-option:hover {
            background: #f5f5f5;
        }

        .rating-option.active {
            background: #fff3e0;
            color: #f57c00;
        }

        /* Products Main */
        .products-main {
            min-height: 400px;
        }

        .products-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
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

        .out-of-stock-badge {
            position: absolute;
            top: 12px;
            right: 12px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            z-index: 1;
        }

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
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .product-rating {
            margin-bottom: 8px;
            font-size: 14px;
        }

        .rating-value {
            font-weight: 600;
            margin-left: 4px;
        }

        .rating-count {
            color: #666;
            margin-left: 4px;
        }

        .product-price {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
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

        .pagination-wrapper {
            margin-top: 32px;
            display: flex;
            justify-content: center;
        }

        .loading, .no-products {
            text-align: center;
            padding: 60px 20px;
            color: #666;
        }

        .no-products p {
            margin-bottom: 16px;
        }

        @media (max-width: 992px) {
            .content-layout {
                grid-template-columns: 1fr;
            }

            .filters-sidebar {
                position: static;
            }
        }

        @media (max-width: 768px) {
            .page-header h1 {
                font-size: 22px;
            }

            .products-grid {
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            }
        }
    `
});

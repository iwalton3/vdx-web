/**
 * Computed Properties Demo - Demonstrates performance optimization with cached computations
 */
import { defineComponent } from '../lib/framework.js';
import { html, each, when } from '../lib/framework.js';
import { computed } from '../lib/utils.js';

export default defineComponent('computed-demo', {
    data() {
        // Generate a large dataset to demonstrate performance benefits
        const items = [];
        for (let i = 0; i < 1000; i++) {
            items.push({
                id: i,
                name: `Item ${i}`,
                price: Math.random() * 100,
                category: ['Electronics', 'Books', 'Clothing', 'Food'][Math.floor(Math.random() * 4)],
                rating: Math.floor(Math.random() * 5) + 1,
                inStock: Math.random() > 0.3
            });
        }

        return {
            items,
            sortBy: 'name',
            filterCategory: 'all',
            filterInStock: false,
            minRating: 1,
            searchQuery: '',

            // Computed properties with caching
            // These only recompute when their dependencies change
            sortedItems: computed((items, sortBy) => {
                console.log('[Computed] Sorting items by', sortBy);
                const sorted = [...items];

                if (sortBy === 'name') {
                    sorted.sort((a, b) => a.name.localeCompare(b.name));
                } else if (sortBy === 'price-low') {
                    sorted.sort((a, b) => a.price - b.price);
                } else if (sortBy === 'price-high') {
                    sorted.sort((a, b) => b.price - a.price);
                } else if (sortBy === 'rating') {
                    sorted.sort((a, b) => b.rating - a.rating);
                }

                return sorted;
            }),

            filteredItems: computed((items, category, inStock, minRating, searchQuery) => {
                console.log('[Computed] Filtering items');
                return items.filter(item => {
                    if (category !== 'all' && item.category !== category) return false;
                    if (inStock && !item.inStock) return false;
                    if (item.rating < minRating) return false;
                    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                    return true;
                });
            })
        };
    },

    methods: {
        addRandomItem() {
            const newItem = {
                id: this.state.items.length,
                name: `New Item ${this.state.items.length}`,
                price: Math.random() * 100,
                category: ['Electronics', 'Books', 'Clothing', 'Food'][Math.floor(Math.random() * 4)],
                rating: Math.floor(Math.random() * 5) + 1,
                inStock: Math.random() > 0.3
            };
            this.state.items = [...this.state.items, newItem];
        }
    },

    template() {
        // Get filtered and sorted items using computed properties
        // These will only recompute when their specific dependencies change
        const filtered = this.state.filteredItems(
            this.state.items,
            this.state.filterCategory,
            this.state.filterInStock,
            this.state.minRating,
            this.state.searchQuery
        );

        const sorted = this.state.sortedItems(filtered, this.state.sortBy);

        // Only show first 50 for performance
        const displayItems = sorted.slice(0, 50);

        return html`
            <h2>Computed Properties Demo</h2>
            <p>Demonstrates cached computations for expensive operations (sorting/filtering 1000 items)</p>
            <p style="font-size: 0.85em; color: var(--text-secondary, #666);">
                <strong>Performance:</strong> Check console to see when computations run.
                Computed properties only recompute when their dependencies change.
            </p>

            <div class="stats">
                <div>Total items: <strong>${this.state.items.length}</strong></div>
                <div>Filtered: <strong>${filtered.length}</strong></div>
                <div>Showing: <strong>${displayItems.length}</strong></div>
            </div>

            <div class="controls">
                <div class="control-group">
                    <label>
                        Search:
                        <input
                            type="text"
                            placeholder="Filter by name..."
                            x-model="searchQuery">
                    </label>
                </div>

                <div class="control-group">
                    <label>
                        Sort by:
                        <select x-model="sortBy">
                            <option value="name">Name</option>
                            <option value="price-low">Price (Low to High)</option>
                            <option value="price-high">Price (High to Low)</option>
                            <option value="rating">Rating</option>
                        </select>
                    </label>
                </div>

                <div class="control-group">
                    <label>
                        Category:
                        <select x-model="filterCategory">
                            <option value="all">All</option>
                            <option value="Electronics">Electronics</option>
                            <option value="Books">Books</option>
                            <option value="Clothing">Clothing</option>
                            <option value="Food">Food</option>
                        </select>
                    </label>
                </div>

                <div class="control-group">
                    <label>
                        Min Rating:
                        <select x-model="minRating">
                            <option value="1">1+ stars</option>
                            <option value="2">2+ stars</option>
                            <option value="3">3+ stars</option>
                            <option value="4">4+ stars</option>
                            <option value="5">5 stars</option>
                        </select>
                    </label>
                </div>

                <div class="control-group">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input
                            type="checkbox"
                            x-model="filterInStock">
                        In Stock Only
                    </label>
                </div>

                <button on-click="addRandomItem">Add Random Item</button>
            </div>

            ${when(displayItems.length > 0,
                html`
                    <div class="item-grid">
                        ${each(displayItems, item => html`
                            <div class="item-card">
                                <div class="item-name">${item.name}</div>
                                <div class="item-details">
                                    <span class="price">$${item.price.toFixed(2)}</span>
                                    <span class="category">${item.category}</span>
                                </div>
                                <div class="item-meta">
                                    <span class="rating">${'⭐'.repeat(item.rating)}</span>
                                    <span class="stock ${item.inStock ? 'in-stock' : 'out-of-stock'}">
                                        ${item.inStock ? 'In Stock' : 'Out of Stock'}
                                    </span>
                                </div>
                            </div>
                        `)}
                    </div>
                `,
                html`<p style="text-align: center; color: var(--text-secondary, #666); font-style: italic;">No items match your filters</p>`
            )}
        `;
    },

    styles: /*css*/`
        :host {
            display: block;
        }

        .stats {
            display: flex;
            gap: 20px;
            padding: 15px;
            background: var(--bg-secondary, #f5f5f5);
            border-radius: 8px;
            margin: 15px 0;
            font-size: 0.9em;
        }

        .controls {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            padding: 15px;
            background: var(--bg-secondary, #f5f5f5);
            border-radius: 8px;
            margin: 15px 0;
        }

        .control-group {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .control-group label {
            font-size: 0.9em;
            font-weight: 500;
        }

        .control-group input,
        .control-group select {
            padding: 6px 10px;
            border: 1px solid var(--border-color, #ddd);
            border-radius: 4px;
            font-size: 0.9em;
        }

        .item-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }

        .item-card {
            padding: 15px;
            background: var(--bg-secondary, #f9f9f9);
            border: 1px solid var(--border-color, #e0e0e0);
            border-radius: 8px;
            transition: box-shadow 0.2s;
        }

        .item-card:hover {
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .item-name {
            font-weight: 600;
            margin-bottom: 10px;
        }

        .item-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 0.9em;
        }

        .price {
            color: var(--primary-color, #007bff);
            font-weight: 600;
        }

        .category {
            color: var(--text-secondary, #666);
            font-size: 0.85em;
        }

        .item-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.85em;
        }

        .rating {
            color: #ffa500;
        }

        .stock {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: 500;
        }

        .in-stock {
            background: #d4edda;
            color: #155724;
        }

        .out-of-stock {
            background: #f8d7da;
            color: #721c24;
        }
    `
});

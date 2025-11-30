/**
 * Virtual Scrolling Demo - Demonstrates performance with large lists
 */
import { defineComponent } from '../lib/framework.js';
import { html, each, when } from '../lib/framework.js';
import '../components/virtual-list.js';

export default defineComponent('virtual-scroll-demo', {
    data() {
        // Start with 1000 items to demonstrate performance difference
        const items = [];
        for (let i = 0; i < 1000; i++) {
            items.push({
                id: i,
                title: `Item #${i}`,
                subtitle: `Description for item ${i}`,
                timestamp: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
            });
        }

        return {
            items,
            mode: 'virtual', // 'virtual' or 'regular'
            itemHeight: 80  // Increased to accommodate 3 lines of content + padding
        };
    },

    methods: {
        toggleMode() {
            this.state.mode = this.state.mode === 'virtual' ? 'regular' : 'virtual';
        },

        addItems() {
            const newItems = [];
            const startId = this.state.items.length;
            for (let i = 0; i < 1000; i++) {
                newItems.push({
                    id: startId + i,
                    title: `Item #${startId + i}`,
                    subtitle: `Description for item ${startId + i}`,
                    timestamp: new Date().toISOString()
                });
            }
            this.state.items = [...this.state.items, ...newItems];
        },

        renderItem(item, index) {
            return html`
                <div class="list-item" style="height: ${this.state.itemHeight}px;">
                    <div class="item-content">
                        <div class="item-title">${item.title}</div>
                        <div class="item-subtitle">${item.subtitle}</div>
                        <div class="item-meta">Index: ${index} | ${new Date(item.timestamp).toLocaleDateString()}</div>
                    </div>
                </div>
            `;
        }
    },

    template() {
        const itemHeight = this.state.itemHeight;
        const items = this.state.items;

        return html`
            <h2>Virtual Scrolling Demo</h2>
            <p>Efficiently renders large lists by only rendering visible items. Click "Add 1,000 Items" to see performance with thousands of items!</p>

            <div class="stats">
                <div>Total items: <strong>${items.length.toLocaleString()}</strong></div>
                <div>Mode: <strong>${this.state.mode === 'virtual' ? 'Virtual (Fast)' : 'Regular (Slow)'}</strong></div>
            </div>

            <div class="controls">
                <button on-click="toggleMode">
                    Switch to ${this.state.mode === 'virtual' ? 'Regular' : 'Virtual'} Mode
                </button>
                <button on-click="addItems" class="secondary">Add 1,000 Items</button>
            </div>

            ${when(this.state.mode === 'virtual',
                html`
                    <div class="demo-info">
                        <strong>Virtual Mode:</strong> Only renders ~20 visible items at a time. Smooth scrolling even with 100,000+ items!
                    </div>
                    <virtual-list
                        items="${items}"
                        itemHeight="${itemHeight}"
                        bufferSize="${5}"
                        renderItem="${this.renderItem}"
                        style="height: 400px; border: 1px solid var(--border-color, #ddd); border-radius: 8px;">
                    </virtual-list>
                `,
                html`
                    <div class="demo-info warning">
                        <strong>⚠️ Regular Mode:</strong> Renders ALL ${items.length.toLocaleString()} items at once. Notice the slower initial render and scrolling!
                    </div>
                    <div class="regular-list">
                        ${each(items, (item, index) => html`
                            <div class="list-item" style="height: ${itemHeight}px;">
                                <div class="item-content">
                                    <div class="item-title">${item.title}</div>
                                    <div class="item-subtitle">${item.subtitle}</div>
                                    <div class="item-meta">Index: ${index} | ${new Date(item.timestamp).toLocaleDateString()}</div>
                                </div>
                            </div>
                        `)}
                    </div>
                `
            )}

            <div class="performance-tips">
                <h3>Performance Comparison</h3>
                <ul>
                    <li><strong>Virtual Mode:</strong> Renders ~20-30 items (visible + buffer), O(1) complexity - smooth and fast!</li>
                    <li><strong>Regular Mode:</strong> Renders all ${items.length.toLocaleString()} items, O(n) complexity - slower initial render and scrolling</li>
                    <li><strong>Memory:</strong> Virtual uses ~100x less memory for large lists</li>
                    <li><strong>Scroll Performance:</strong> Virtual maintains 60fps even with 100,000+ items</li>
                    <li><strong>Try it:</strong> Add more items and switch between modes to see the difference!</li>
                </ul>
            </div>
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
            gap: 10px;
            margin: 15px 0;
        }

        .demo-info {
            padding: 12px 15px;
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            border-radius: 4px;
            margin: 15px 0;
            font-size: 0.9em;
        }

        .demo-info.warning {
            background: #fff3e0;
            border-left-color: #ff9800;
        }

        .regular-list {
            border: 1px solid var(--border-color, #ddd);
            border-radius: 8px;
            overflow-y: auto;
            height: 400px;
        }

        .list-item {
            display: flex;
            align-items: center;
            padding: 12px 15px;
            border-bottom: 1px solid var(--border-color, #eee);
            transition: background-color 0.15s;
            box-sizing: border-box;
        }

        .list-item:hover {
            background-color: var(--hover-bg, #f5f5f5);
        }

        .item-content {
            flex: 1;
            min-width: 0;  /* Allow text to shrink/wrap */
        }

        .item-title {
            font-weight: 600;
            font-size: 0.95em;
            margin-bottom: 4px;
            color: var(--text-color, #333);
        }

        .item-subtitle {
            font-size: 0.85em;
            color: var(--text-secondary, #666);
            margin-bottom: 4px;
        }

        .item-meta {
            font-size: 0.75em;
            color: var(--text-tertiary, #999);
        }

        .performance-tips {
            margin-top: 30px;
            padding: 20px;
            background: var(--bg-secondary, #f9f9f9);
            border-radius: 8px;
        }

        .performance-tips h3 {
            margin-top: 0;
            color: var(--heading-color, #333);
        }

        .performance-tips ul {
            margin: 10px 0;
            padding-left: 20px;
        }

        .performance-tips li {
            margin: 8px 0;
            font-size: 0.9em;
        }
    `
});

/**
 * Virtual List Component
 * Efficiently renders large lists by only rendering visible items
 */
import { defineComponent } from '../lib/framework.js';
import { html, each, when } from '../lib/framework.js';

export default defineComponent('virtual-list', {
    props: {
        items: [],
        itemHeight: 50,        // Height of each item in pixels
        bufferSize: 5,         // Number of extra items to render above/below viewport
        renderItem: null       // Function to render each item (receives item, index)
    },

    data() {
        return {
            scrollTop: 0,
            containerHeight: 0,
            visibleStart: 0,
            visibleEnd: 0
        };
    },

    mounted() {
        // Get initial container height
        this.updateDimensions();

        // Setup scroll listener
        this._scrollListener = this.handleScroll.bind(this);
        this.addEventListener('scroll', this._scrollListener);

        // Setup resize observer to handle container size changes
        this._resizeObserver = new ResizeObserver(() => {
            this.updateDimensions();
        });
        this._resizeObserver.observe(this);

        // Calculate initial visible range
        this.updateVisibleRange();
    },

    unmounted() {
        if (this._scrollListener) {
            this.removeEventListener('scroll', this._scrollListener);
        }
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
        }
    },

    methods: {
        updateDimensions() {
            const newHeight = this.clientHeight || 400;
            // Only update if height actually changed
            if (this.state.containerHeight !== newHeight) {
                this.state.containerHeight = newHeight;
                this.updateVisibleRange();
            }
        },

        handleScroll(e) {
            this.state.scrollTop = e.target.scrollTop || this.scrollTop;
            this.updateVisibleRange();
        },

        updateVisibleRange() {
            const itemHeight = this.props.itemHeight;
            const bufferSize = this.props.bufferSize;
            const totalItems = this.props.items.length;

            // Calculate which items are visible
            const visibleStart = Math.floor(this.state.scrollTop / itemHeight);
            const visibleCount = Math.ceil(this.state.containerHeight / itemHeight);
            const visibleEnd = visibleStart + visibleCount;

            // Add buffer
            const newStart = Math.max(0, visibleStart - bufferSize);
            const newEnd = Math.min(totalItems, visibleEnd + bufferSize);

            // Only update state if values actually changed (prevents unnecessary re-renders)
            if (this.state.visibleStart !== newStart || this.state.visibleEnd !== newEnd) {
                this.state.visibleStart = newStart;
                this.state.visibleEnd = newEnd;
            }
        },

        scrollToIndex(index) {
            const itemHeight = this.props.itemHeight;
            this.scrollTop = index * itemHeight;
        }
    },

    template() {
        const items = this.props.items || [];
        const itemHeight = this.props.itemHeight;
        const totalHeight = items.length * itemHeight;

        // Get visible items
        const visibleItems = items.slice(this.state.visibleStart, this.state.visibleEnd);

        // Calculate offset for absolute positioning
        const offsetY = this.state.visibleStart * itemHeight;

        return html`
            <div class="virtual-list-container">
                <!-- Spacer to maintain scroll height -->
                <div class="virtual-list-spacer" style="height: ${totalHeight}px;"></div>

                <!-- Visible items -->
                <div class="virtual-list-items" style="transform: translateY(${offsetY}px);">
                    ${each(visibleItems, (item, idx) => {
                        const actualIndex = this.state.visibleStart + idx;

                        // Use custom render function if provided
                        if (this.props.renderItem && typeof this.props.renderItem === 'function') {
                            return this.props.renderItem(item, actualIndex);
                        }

                        // Fallback: default rendering
                        const timestamp = item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '';
                        return html`
                            <div class="virtual-list-item" style="height: ${itemHeight}px;" data-index="${actualIndex}">
                                <div class="item-content">
                                    <div class="item-title">${item.title || item.name || `Item ${actualIndex}`}</div>
                                    <div class="item-subtitle">${item.subtitle || item.description || ''}</div>
                                    ${when(timestamp, html`<div class="item-meta">Index: ${actualIndex} | ${timestamp}</div>`, html``)}
                                </div>
                            </div>
                        `;
                    })}
                </div>
            </div>
        `;
    },

    styles: /*css*/`
        :host {
            display: block;
            overflow-y: auto;
            overflow-x: hidden;
            position: relative;
            height: 400px;
        }

        .virtual-list-container {
            position: relative;
            width: 100%;
        }

        .virtual-list-spacer {
            width: 100%;
            pointer-events: none;
        }

        .virtual-list-items {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            will-change: transform;
        }

        .virtual-list-item {
            display: flex;
            align-items: center;
            padding: 12px 15px;
            border-bottom: 1px solid var(--border-color, #eee);
            transition: background-color 0.15s;
            box-sizing: border-box;
            width: 100%;
        }

        .virtual-list-item:hover {
            background-color: var(--hover-bg, #f5f5f5);
        }

        .item-content {
            flex: 1;
            min-width: 0;  /* Allow text to shrink */
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
    `
});

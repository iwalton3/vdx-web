/**
 * VirtualList - Efficiently renders large lists by only rendering visible items
 * Part of the VDX-UI component library
 */
import { defineComponent, html, each, when } from '../../lib/framework.js';

export default defineComponent('cl-virtual-list', {
    props: {
        items: [],
        itemHeight: 50,         // Height of each item in pixels
        bufferSize: 5,          // Number of extra items to render above/below viewport
        renderItem: null,       // Function to render each item (receives item, index)
        height: '400px',        // Container height
        emptyMessage: 'No items to display',
        loading: false,
        selectable: false,
        selectedIndex: -1
    },

    data() {
        return {
            scrollTop: 0,
            containerHeight: 0,
            visibleStart: 0,
            visibleEnd: 0,
            internalSelectedIndex: -1
        };
    },

    mounted() {
        this.state.internalSelectedIndex = this.props.selectedIndex;
        this.updateDimensions();

        this._scrollListener = this.handleScroll.bind(this);
        this.addEventListener('scroll', this._scrollListener);

        this._resizeObserver = new ResizeObserver(() => {
            this.updateDimensions();
        });
        this._resizeObserver.observe(this);

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

    propsChanged(prop, newValue, oldValue) {
        if (prop === 'items') {
            this.updateVisibleRange();
        }
        if (prop === 'selectedIndex') {
            this.state.internalSelectedIndex = newValue;
        }
    },

    methods: {
        updateDimensions() {
            const newHeight = this.clientHeight || parseInt(this.props.height) || 400;
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

            const visibleStart = Math.floor(this.state.scrollTop / itemHeight);
            const visibleCount = Math.ceil(this.state.containerHeight / itemHeight);
            const visibleEnd = visibleStart + visibleCount;

            const newStart = Math.max(0, visibleStart - bufferSize);
            const newEnd = Math.min(totalItems, visibleEnd + bufferSize);

            if (this.state.visibleStart !== newStart || this.state.visibleEnd !== newEnd) {
                this.state.visibleStart = newStart;
                this.state.visibleEnd = newEnd;
            }
        },

        scrollToIndex(index) {
            const itemHeight = this.props.itemHeight;
            this.scrollTop = index * itemHeight;
        },

        scrollToTop() {
            this.scrollTop = 0;
        },

        scrollToBottom() {
            const itemHeight = this.props.itemHeight;
            const totalItems = this.props.items.length;
            this.scrollTop = (totalItems * itemHeight) - this.state.containerHeight;
        },

        handleItemClick(item, index) {
            if (this.props.selectable) {
                this.state.internalSelectedIndex = index;
                this.dispatchEvent(new CustomEvent('select', {
                    bubbles: true,
                    composed: true,
                    detail: { item, index }
                }));
            }

            this.dispatchEvent(new CustomEvent('item-click', {
                bubbles: true,
                composed: true,
                detail: { item, index }
            }));
        },

        handleKeyDown(e) {
            if (!this.props.selectable) return;

            const items = this.props.items;
            if (!items || items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const newIndex = Math.min(this.state.internalSelectedIndex + 1, items.length - 1);
                this.state.internalSelectedIndex = newIndex;
                this.scrollToIndex(newIndex);
                this.dispatchEvent(new CustomEvent('select', {
                    bubbles: true,
                    composed: true,
                    detail: { item: items[newIndex], index: newIndex }
                }));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const newIndex = Math.max(this.state.internalSelectedIndex - 1, 0);
                this.state.internalSelectedIndex = newIndex;
                this.scrollToIndex(newIndex);
                this.dispatchEvent(new CustomEvent('select', {
                    bubbles: true,
                    composed: true,
                    detail: { item: items[newIndex], index: newIndex }
                }));
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const index = this.state.internalSelectedIndex;
                if (index >= 0 && index < items.length) {
                    this.dispatchEvent(new CustomEvent('item-click', {
                        bubbles: true,
                        composed: true,
                        detail: { item: items[index], index }
                    }));
                }
            }
        }
    },

    template() {
        const items = this.props.items || [];
        const itemHeight = this.props.itemHeight;
        const totalHeight = items.length * itemHeight;

        const visibleItems = items.slice(this.state.visibleStart, this.state.visibleEnd);
        const offsetY = this.state.visibleStart * itemHeight;

        if (this.props.loading) {
            return html`
                <div class="virtual-list-loading">
                    <cl-spinner label="Loading..."></cl-spinner>
                </div>
            `;
        }

        if (items.length === 0) {
            return html`
                <div class="virtual-list-empty">
                    <span class="empty-icon">📭</span>
                    <span class="empty-message">${this.props.emptyMessage}</span>
                </div>
            `;
        }

        return html`
            <div
                class="virtual-list-container"
                tabindex="${this.props.selectable ? '0' : '-1'}"
                on-keydown="handleKeyDown">
                <div class="virtual-list-spacer" style="height: ${totalHeight}px;"></div>

                <div class="virtual-list-items" style="transform: translateY(${offsetY}px);">
                    ${each(visibleItems, (item, idx) => {
                        const actualIndex = this.state.visibleStart + idx;
                        const isSelected = this.props.selectable && actualIndex === this.state.internalSelectedIndex;

                        if (this.props.renderItem && typeof this.props.renderItem === 'function') {
                            return html`
                                <div
                                    class="virtual-list-item ${isSelected ? 'selected' : ''}"
                                    style="height: ${itemHeight}px;"
                                    data-index="${actualIndex}"
                                    on-click="${() => this.handleItemClick(item, actualIndex)}">
                                    ${this.props.renderItem(item, actualIndex)}
                                </div>
                            `;
                        }

                        const title = item.title || item.name || item.label || `Item ${actualIndex + 1}`;
                        const subtitle = item.subtitle || item.description || '';

                        return html`
                            <div
                                class="virtual-list-item ${isSelected ? 'selected' : ''}"
                                style="height: ${itemHeight}px;"
                                data-index="${actualIndex}"
                                on-click="${() => this.handleItemClick(item, actualIndex)}">
                                <div class="item-content">
                                    <div class="item-title">${title}</div>
                                    ${when(subtitle, html`
                                        <div class="item-subtitle">${subtitle}</div>
                                    `)}
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
            height: var(--virtual-list-height, 400px);
            border: 1px solid var(--input-border, #ddd);
            border-radius: 4px;
            background: var(--input-bg, #fff);
        }

        .virtual-list-container {
            position: relative;
            width: 100%;
            outline: none;
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
            padding: 0 16px;
            border-bottom: 1px solid var(--border-color, #eee);
            transition: background-color 0.15s;
            box-sizing: border-box;
            width: 100%;
            cursor: pointer;
        }

        .virtual-list-item:hover {
            background-color: var(--hover-bg, #f5f5f5);
        }

        .virtual-list-item.selected {
            background-color: var(--primary-color, #007bff);
            color: white;
        }

        .virtual-list-item.selected .item-subtitle {
            color: rgba(255, 255, 255, 0.8);
        }

        .item-content {
            flex: 1;
            min-width: 0;
        }

        .item-title {
            font-weight: 500;
            font-size: 14px;
            color: var(--text-color, #333);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .virtual-list-item.selected .item-title {
            color: white;
        }

        .item-subtitle {
            font-size: 12px;
            color: var(--text-muted, #666);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-top: 2px;
        }

        .virtual-list-loading,
        .virtual-list-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--text-muted, #666);
        }

        .empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.5;
        }

        .empty-message {
            font-size: 14px;
        }
    `
});

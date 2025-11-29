/**
 * Menu - Menu component
 */
import { defineComponent, html, when, each } from '../../lib/framework.js';

export default defineComponent('cl-menu', {
    props: {
        model: [] // Array of {label: string, icon: string, command: function, items: []}
    },

    data() {
        return {
            expandedItems: new Set()
        };
    },

    methods: {
        handleItemClick(item, event) {
            event.stopPropagation();

            if (item.items && item.items.length > 0) {
                this.toggleSubmenu(item);
            } else {
                if (item.command) {
                    item.command();
                }
                this.emitEvent('item-click', item);
            }
        },

        toggleSubmenu(item) {
            const newExpanded = new Set(this.state.expandedItems);
            const key = item.label;

            if (newExpanded.has(key)) {
                newExpanded.delete(key);
            } else {
                newExpanded.add(key);
            }

            this.state.expandedItems = newExpanded;
        },

        isExpanded(item) {
            return this.state.expandedItems.has(item.label);
        },

        renderMenuItem(item, level = 0) {
            const hasSubmenu = item.items && item.items.length > 0;
            const isExpanded = this.isExpanded(item);

            return html`
                <div class="menu-item-wrapper">
                    <div
                        class="menu-item ${hasSubmenu ? 'has-submenu' : ''}"
                        style="padding-left: ${12 + level * 16}px"
                        on-click="${(e) => this.handleItemClick(item, e)}">
                        ${when(item.icon, html`
                            <span class="item-icon">${item.icon}</span>
                        `)}
                        <span class="item-label">${item.label}</span>
                        ${when(hasSubmenu, html`
                            <span class="submenu-icon">${isExpanded ? '▼' : '▶'}</span>
                        `)}
                    </div>
                    ${when(hasSubmenu && isExpanded, html`
                        <div class="submenu">
                            ${each(item.items, subitem => this.renderMenuItem(subitem, level + 1))}
                        </div>
                    `)}
                </div>
            `;
        },

        emitEvent(name, detail) {
            this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
        }
    },

    template() {
        const model = this.props.model || [];

        return html`
            <div class="cl-menu">
                ${each(model, item => this.renderMenuItem(item))}
            </div>
        `;
    },

    styles: `
        :host {
            display: block;
        }

        .cl-menu {
            border: 1px solid var(--input-border, #dee2e6);
            border-radius: 4px;
            background: var(--card-bg, white);
            overflow: hidden;
        }

        .menu-item-wrapper {
            /* Container for item and submenu */
        }

        .menu-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px;
            font-size: 14px;
            cursor: pointer;
            transition: background 0.2s;
            border-bottom: 1px solid var(--input-border, #dee2e6);
        }

        .menu-item:hover {
            background: var(--hover-bg, #f8f9fa);
        }

        .menu-item-wrapper:last-child .menu-item {
            border-bottom: none;
        }

        .item-icon {
            width: 20px;
            text-align: center;
        }

        .item-label {
            flex: 1;
            color: var(--text-color, #333);
        }

        .submenu-icon {
            font-size: 10px;
            color: var(--text-muted, #6c757d);
        }

        .submenu {
            background: var(--table-header-bg, #f8f9fa);
        }

        .submenu .menu-item {
            background: var(--table-header-bg, #f8f9fa);
        }

        .submenu .menu-item:hover {
            background: var(--hover-bg, #e9ecef);
        }
    `
});

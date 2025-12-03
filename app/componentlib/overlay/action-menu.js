/**
 * Action Menu - Dropdown action menu with button trigger
 *
 * A button that opens a dropdown menu of actions. Useful for
 * "more options" buttons, context menus, etc.
 *
 * @example
 * <cl-action-menu
 *     label="Actions"
 *     items="${[
 *         { label: 'Edit', icon: '✏️', action: () => this.edit() },
 *         { label: 'Duplicate', icon: '📋', action: () => this.duplicate() },
 *         { separator: true },
 *         { label: 'Delete', icon: '🗑️', danger: true, action: () => this.delete() }
 *     ]}">
 * </cl-action-menu>
 */
import { defineComponent, html, when, each } from '../../lib/framework.js';

export default defineComponent('cl-action-menu', {
    props: {
        label: '...',           // Button label (default: ellipsis)
        icon: '',               // Optional icon for button
        items: [],              // Array of menu items
        position: 'bottom-end', // Menu position: bottom-start, bottom-end, top-start, top-end
        disabled: false         // Disable the menu
    },

    data() {
        return {
            isOpen: false,
            dropdownStyle: ''
        };
    },

    mounted() {
        // Close menu when clicking outside
        this._handleOutsideClick = (e) => {
            if (this.state.isOpen && !this.contains(e.target)) {
                this.state.isOpen = false;
            }
        };
        document.addEventListener('click', this._handleOutsideClick);

        // Close menu on escape key
        this._handleEscape = (e) => {
            if (e.key === 'Escape' && this.state.isOpen) {
                this.state.isOpen = false;
            }
        };
        document.addEventListener('keydown', this._handleEscape);

        // Close on scroll
        this._handleScroll = () => {
            if (this.state.isOpen) {
                this.state.isOpen = false;
            }
        };
        window.addEventListener('scroll', this._handleScroll, true);
    },

    unmounted() {
        document.removeEventListener('click', this._handleOutsideClick);
        document.removeEventListener('keydown', this._handleEscape);
        window.removeEventListener('scroll', this._handleScroll, true);
    },

    methods: {
        toggleMenu(e) {
            e.stopPropagation();
            if (!this.props.disabled) {
                if (!this.state.isOpen) {
                    this.updateDropdownPosition();
                }
                this.state.isOpen = !this.state.isOpen;
            }
        },

        updateDropdownPosition() {
            const btn = this.querySelector('.trigger-btn');
            if (!btn) return;

            const rect = btn.getBoundingClientRect();
            const position = this.props.position;

            let top, left;

            if (position.startsWith('bottom')) {
                top = rect.bottom + 4;
            } else {
                // Will be adjusted after we know dropdown height
                top = rect.top - 4;
            }

            if (position.endsWith('end')) {
                // Right-aligned - we'll set right instead
                left = rect.right;
            } else {
                left = rect.left;
            }

            // Store for use in template
            this._btnRect = rect;
            this._position = position;
        },

        getDropdownStyle() {
            if (!this._btnRect) return '';

            const rect = this._btnRect;
            const position = this._position || 'bottom-end';
            const menuWidth = 180; // min-width from CSS
            const padding = 8; // viewport padding

            let styles = [];

            // Vertical positioning
            if (position.startsWith('bottom')) {
                styles.push(`top: ${rect.bottom + 4}px`);
            } else {
                styles.push(`bottom: ${window.innerHeight - rect.top + 4}px`);
            }

            // Horizontal positioning with bounds checking
            if (position.endsWith('end')) {
                // Right-aligned: check if it would clip left edge
                const rightPos = window.innerWidth - rect.right;
                const leftEdge = rect.right - menuWidth;

                if (leftEdge < padding) {
                    // Would clip left, align to left edge instead
                    styles.push(`left: ${padding}px`);
                } else {
                    styles.push(`right: ${rightPos}px`);
                }
            } else {
                // Left-aligned: check if it would clip right edge
                const rightEdge = rect.left + menuWidth;

                if (rightEdge > window.innerWidth - padding) {
                    // Would clip right, align to right edge instead
                    styles.push(`right: ${padding}px`);
                } else {
                    styles.push(`left: ${rect.left}px`);
                }
            }

            return styles.join('; ');
        },

        handleItemClick(item, e) {
            e.stopPropagation();

            if (item.disabled) return;

            this.state.isOpen = false;

            if (item.action) {
                item.action();
            }

            this.dispatchEvent(new CustomEvent('item-click', {
                detail: item,
                bubbles: true
            }));
        }
    },

    template() {
        const { label, icon, items, disabled } = this.props;
        const { isOpen } = this.state;

        return html`
            <div class="cl-action-menu ${disabled ? 'disabled' : ''}">
                <button
                    class="trigger-btn"
                    on-click="${(e) => this.toggleMenu(e)}"
                    disabled="${disabled}">
                    ${when(icon, () => html`<span class="btn-icon">${icon}</span>`)}
                    <span class="btn-label">${label}</span>
                </button>

                ${when(isOpen, () => html`
                    <div class="menu-dropdown" style="${this.getDropdownStyle()}">
                        ${each(items, (item) =>
                            item.separator
                                ? html`<hr class="menu-separator">`
                                : html`
                                    <button
                                        class="menu-item ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''} ${item.active ? 'active' : ''}"
                                        on-click="${(e) => this.handleItemClick(item, e)}"
                                        disabled="${item.disabled}">
                                        ${when(item.icon, () => html`<span class="item-icon">${item.icon}</span>`)}
                                        <span class="item-label">${item.label}</span>
                                        ${when(item.shortcut, () => html`<span class="item-shortcut">${item.shortcut}</span>`)}
                                    </button>
                                `
                        )}
                    </div>
                `)}
            </div>
        `;
    },

    styles: /*css*/`
        :host {
            display: inline-block;
            position: relative;
        }

        .cl-action-menu {
            position: relative;
        }

        .cl-action-menu.disabled {
            opacity: 0.5;
            pointer-events: none;
        }

        .trigger-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            background: var(--card-bg, white);
            border: 1px solid var(--input-border, #dee2e6);
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            color: var(--text-color, #333);
            transition: all 0.2s;
        }

        .trigger-btn:hover:not(:disabled) {
            background: var(--hover-bg, #f8f9fa);
            border-color: var(--input-border-hover, #adb5bd);
        }

        .trigger-btn:disabled {
            cursor: not-allowed;
        }

        .btn-icon {
            font-size: 16px;
        }

        .menu-dropdown {
            position: fixed;
            z-index: 999999;
            min-width: 180px;
            background: var(--card-bg, white);
            border: 1px solid var(--input-border, #dee2e6);
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
            padding: 4px;
            overflow: hidden;
        }

        .menu-item {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            padding: 10px 12px;
            background: none;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            color: var(--text-color, #333);
            text-align: left;
            transition: background 0.15s;
        }

        .menu-item:hover:not(:disabled) {
            background: var(--hover-bg, #f1f3f4);
        }

        .menu-item.active {
            background: var(--primary-light, #e8f0fe);
            color: var(--primary-color, #1a73e8);
        }

        .menu-item.danger {
            color: var(--danger-color, #dc3545);
        }

        .menu-item.danger:hover:not(:disabled) {
            background: var(--danger-light, #fdecea);
        }

        .menu-item.disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .item-icon {
            width: 20px;
            text-align: center;
            flex-shrink: 0;
        }

        .item-label {
            flex: 1;
        }

        .item-shortcut {
            font-size: 12px;
            color: var(--text-muted, #6c757d);
        }

        .menu-separator {
            margin: 4px 8px;
            border: none;
            border-top: 1px solid var(--input-border, #dee2e6);
        }
    `
});

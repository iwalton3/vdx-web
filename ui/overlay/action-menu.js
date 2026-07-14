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
import { defineComponent, html, when, each, Component } from '../../lib/framework.js';
import { createAnchoredOverlay } from '../../lib/overlay.js';

/**
 * @fires item-click - detail: the activated item
 */
export class ClActionMenu extends Component {
    static props = {
        label: '...',           // Button label (default: ellipsis)
        icon: '',               // Optional icon for button
        items: [],              // Array of menu items
        position: 'bottom-end', // Menu position: bottom-start, bottom-end, top-start, top-end
        disabled: false         // Disable the menu
    }

    constructor(props) {
        super(props);

        this.state = { isOpen: false };

        // Top-layer anchored overlay - promotes the menu above transformed
        // ancestors and owns outside-click / Escape / close-on-scroll dismissal
        // (the old hand-rolled fixed-position + listener bundle).
        this._overlay = createAnchoredOverlay(this, {
            anchor: () => this.querySelector('.trigger-btn'),
            panel: () => this.querySelector('.menu-dropdown'),
            placement: () => this.props.position,
            offset: 4,
            closeOnScroll: true,
            onDismiss: () => this.closeMenu()
        });
    }

    unmounted() {
        this._overlay.destroy();
    }

    toggleMenu(e) {
        e.stopPropagation();
        if (this.props.disabled) return;
        if (this.state.isOpen) this.closeMenu();
        else this.openMenu();
    }

    async openMenu() {
        this.state.isOpen = true;
        await this.nextRender();
        if (this.state.isOpen) this._overlay.open();
    }

    closeMenu() {
        this._overlay.close();  // hidePopover before the branch unmounts
        this.state.isOpen = false;
    }

    handleItemClick(item, e) {
        e.stopPropagation();

        if (item.disabled) return;

        this.closeMenu();

        if (item.action) {
            item.action();
        }

        this.dispatchEvent(new CustomEvent('item-click', {
            detail: item,
            bubbles: true
        }));
    }

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
                    <div class="menu-dropdown" popover="manual">
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
    }

    static styles = /*css*/`
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
            /* Positioned by createAnchoredOverlay (top layer). inset/margin reset
               the UA popover defaults; placement is written inline. */
            inset: auto;
            margin: 0;
            color: inherit;   /* UA [popover] forces color:CanvasText; keep theme (dark mode) */
            box-sizing: border-box;
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
}

export default defineComponent('cl-action-menu', ClActionMenu);

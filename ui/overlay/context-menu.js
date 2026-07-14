/**
 * Context Menu - Generic, viewport-overflow-aware popup menu
 *
 * A reusable context menu that opens at arbitrary (x, y) coordinates and keeps
 * itself fully inside the viewport: it flips horizontally/vertically when it
 * would overflow an edge, clamps to the viewport with padding, and becomes
 * scrollable when it is taller than the viewport itself.
 *
 * It is NOT tied to lists - use it with anything. Wire it to native
 * `contextmenu` events, to long-press gestures (see lib/gestures.js
 * `onLongPress`), or drive it programmatically via `open(x, y, context)`.
 *
 * Only one cl-context-menu is ever open at a time: opening one closes any other.
 *
 * @example  Programmatic
 *   const menu = document.querySelector('cl-context-menu');
 *   menu.items = [
 *       { label: 'Edit', icon: '✏️', action: () => edit() },
 *       { separator: true },
 *       { label: 'Delete', icon: '🗑️', danger: true }
 *   ];
 *   menu.open(event.clientX, event.clientY, { row });   // context is echoed back
 *
 * @example  Wiring a contextmenu event
 *   <div on-contextmenu="${(e) => this.refs.menu.openAtEvent(e, item)}">…</div>
 *   <cl-context-menu ref="menu" items="${this.state.menuItems}" on-select="onPick">
 *   </cl-context-menu>
 *
 * @event select  { item, context } - fired when an items-prop entry is chosen.
 */
import { defineComponent, html, when, each, Component } from '../../lib/framework.js';
import { createAnchoredOverlay } from '../../lib/overlay.js';

// Module-level registry so opening one menu closes every other instance -
// there is never more than one context menu on screen at a time.
const openInstances = new Set();

function closeOthers(except) {
    for (const inst of openInstances) {
        if (inst !== except) inst.close();
    }
}

/**
 * @fires select - detail: { item, context }
 */
export class ClContextMenu extends Component {
    static props = {
        // Array of { label, icon?, disabled?, danger?, separator?, action?, command?, shortcut? }.
        // Primary content path (matches cl-menu / cl-action-menu). Slotted
        // children are also rendered (see the template) for fully custom menus.
        items: [],
        // Viewport padding (px) kept between the menu and every viewport edge.
        padding: 8,
        // Minimum width of the menu surface (px).
        minWidth: 200
    }

    constructor(props) {
        super(props);

        // The `open()` context payload is deliberately kept off reactive state
        // (it never drives rendering) - stored on this._openContext instead.
        this.state = {
            isVisible: false
        };

        // Top-layer anchored overlay, anchored to the pointer point. Promotes
        // the menu above transformed ancestors (plain fixed positioning got
        // re-clipped there) and owns outside-pointerdown / Escape / close-on-
        // scroll dismissal - replacing the bespoke fixed-position bundle and the
        // _adjustPosition flip/clamp/size math (now the shared helper's job).
        this._overlay = createAnchoredOverlay(this, {
            anchor: () => ({ x: this._anchorX, y: this._anchorY }),
            panel: () => this.querySelector('.cl-context-menu'),
            placement: 'bottom-start',
            offset: 0,
            viewportPadding: Number(this.props.padding) || 8,
            closeOnScroll: true,
            onDismiss: () => this.close()
        });
    }

    unmounted() {
        this._overlay.destroy();
        openInstances.delete(this);
    }

    /**
     * Open the menu anchored at (x, y) in viewport coordinates. The helper
     * flips/clamps it to stay inside the viewport after render. `context` is
     * stored and echoed back in `select`.
     */
    async open(x, y, context = null) {
        closeOthers(this);
        openInstances.add(this);

        this._anchorX = x;
        this._anchorY = y;
        this._openContext = context;
        this.state.isVisible = true;

        // Wait for the menu branch to mount, then promote + position it.
        await this.nextRender();
        if (this.state.isVisible) this._overlay.open();
    }

    /**
     * Convenience wiring for a `contextmenu` (or any pointer) event: reads
     * the pointer coordinates, suppresses the native menu, and opens here.
     */
    openAtEvent(e, context = null) {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        let x = 0, y = 0;
        if (e) {
            if (typeof e.clientX === 'number' && (e.clientX || e.clientY)) {
                x = e.clientX; y = e.clientY;
            } else if (e.touches && e.touches[0]) {
                x = e.touches[0].clientX; y = e.touches[0].clientY;
            } else if (e.changedTouches && e.changedTouches[0]) {
                x = e.changedTouches[0].clientX; y = e.changedTouches[0].clientY;
            }
        }
        this.open(x, y, context);
    }

    close() {
        if (!this.state.isVisible) return;
        this._overlay.close();  // hidePopover before the branch unmounts
        this.state.isVisible = false;
        this._openContext = null;
        openInstances.delete(this);
    }

    isOpen() {
        return this.state.isVisible;
    }

    _handleItemClick(item, e) {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        if (!item || item.disabled || item.separator) return;

        const context = this._openContext;
        this.close();

        // Support both cl-menu (command) and cl-action-menu (action) idioms.
        if (typeof item.action === 'function') item.action(context);
        if (typeof item.command === 'function') item.command(context);

        this.dispatchEvent(new CustomEvent('select', {
            bubbles: true,
            composed: true,
            detail: { item, context }
        }));
    }

    template() {
        if (!this.state.isVisible) {
            return html`<div class="cl-context-menu-root hidden"></div>`;
        }

        const items = this.props.items || [];
        const minWidth = Number(this.props.minWidth) || 200;

        return html`
            <div class="cl-context-menu" role="menu" popover="manual"
                 style="min-width:${minWidth}px; overflow-y:auto;">
                ${each(items, (item) =>
                    item.separator
                        ? html`<hr class="cl-context-menu-separator" role="separator">`
                        : html`
                            <button
                                class="cl-context-menu-item ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''}"
                                role="menuitem"
                                disabled="${item.disabled}"
                                on-click="${(e) => this._handleItemClick(item, e)}">
                                ${when(item.icon, () => html`<span class="cl-context-menu-icon">${item.icon}</span>`)}
                                <span class="cl-context-menu-label">${item.label}</span>
                                ${when(item.shortcut, () => html`<span class="cl-context-menu-shortcut">${item.shortcut}</span>`)}
                            </button>
                        `
                )}
                ${this.props.children}
            </div>
        `;
    }

    static styles = /*css*/`
        /* Full-viewport, click-through host so only the menu surface is
           interactive; outside clicks fall through to the page below. */
        :host {
            position: fixed;
            top: 0;
            left: 0;
            z-index: 999999;
            pointer-events: none;
        }

        .cl-context-menu-root.hidden {
            display: none;
        }

        .cl-context-menu {
            pointer-events: auto;
            /* Positioned by createAnchoredOverlay (top layer). inset/margin reset
               the UA popover defaults; placement is written inline. */
            inset: auto;
            margin: 0;
            color: inherit;   /* UA [popover] forces color:CanvasText; keep theme (dark mode) */
            background: var(--card-bg, #fff);
            border: 1px solid var(--input-border, #dee2e6);
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.18);
            padding: 4px;
            box-sizing: border-box;
        }

        .cl-context-menu-item {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            padding: 8px 12px;
            background: none;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.875rem;
            color: var(--text-color, #333);
            text-align: left;
            transition: background 0.15s;
        }

        .cl-context-menu-item:hover:not(:disabled) {
            background: var(--hover-bg, #f1f3f4);
        }

        .cl-context-menu-item.danger {
            color: var(--error-color, #dc3545);
        }

        .cl-context-menu-item.danger:hover:not(:disabled) {
            background: var(--error-bg, #fdecea);
        }

        .cl-context-menu-item:disabled,
        .cl-context-menu-item.disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .cl-context-menu-icon {
            width: 18px;
            text-align: center;
            flex-shrink: 0;
            opacity: 0.8;
        }

        .cl-context-menu-label {
            flex: 1;
            white-space: nowrap;
        }

        .cl-context-menu-shortcut {
            font-size: 0.75rem;
            color: var(--text-muted, #6c757d);
            padding-left: 12px;
        }

        .cl-context-menu-separator {
            margin: 4px 8px;
            border: none;
            border-top: 1px solid var(--input-border, #dee2e6);
        }
    `
}

export default defineComponent('cl-context-menu', ClContextMenu);

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
import { defineComponent, html, when, each } from '../../lib/framework.js';

// Module-level registry so opening one menu closes every other instance -
// there is never more than one context menu on screen at a time.
const openInstances = new Set();

function closeOthers(except) {
    for (const inst of openInstances) {
        if (inst !== except) inst.close();
    }
}

export default defineComponent('cl-context-menu', {
    props: {
        // Array of { label, icon?, disabled?, danger?, separator?, action?, command?, shortcut? }.
        // Primary content path (matches cl-menu / cl-action-menu). Slotted
        // children are also rendered (see the template) for fully custom menus.
        items: [],
        // Viewport padding (px) kept between the menu and every viewport edge.
        padding: 8,
        // Minimum width of the menu surface (px).
        minWidth: 200
    },

    data() {
        // The `open()` context payload is deliberately kept off reactive state
        // (it never drives rendering) - stored on this._openContext instead.
        return {
            isVisible: false,
            positioned: false,   // gates visibility so the pre-measure frame never flashes
            x: 0,
            y: 0,
            maxHeight: null      // set when the menu is taller than the viewport (scrollable)
        };
    },

    mounted() {
        // Close on any interaction outside the menu. Capture phase so we win the
        // race against handlers that might otherwise act on the click first.
        this._handleOutside = (e) => {
            if (this.state.isVisible && !this.contains(e.target)) {
                this.close();
            }
        };
        document.addEventListener('mousedown', this._handleOutside, true);
        document.addEventListener('touchstart', this._handleOutside, true);
        // A right-click elsewhere must dismiss us before the new menu opens.
        document.addEventListener('contextmenu', this._handleOutside, true);

        this._handleEscape = (e) => {
            if (e.key === 'Escape' && this.state.isVisible) {
                e.stopPropagation();
                this.close();
            }
        };
        document.addEventListener('keydown', this._handleEscape);

        // Scrolling the page (but not inside the menu) invalidates our anchor.
        this._handleScroll = (e) => {
            if (this.state.isVisible && !this.contains(e.target)) {
                this.close();
            }
        };
        window.addEventListener('scroll', this._handleScroll, true);

        // A resize changes what "inside the viewport" means; simplest correct
        // response is to dismiss.
        this._handleResize = () => {
            if (this.state.isVisible) this.close();
        };
        window.addEventListener('resize', this._handleResize);
    },

    unmounted() {
        document.removeEventListener('mousedown', this._handleOutside, true);
        document.removeEventListener('touchstart', this._handleOutside, true);
        document.removeEventListener('contextmenu', this._handleOutside, true);
        document.removeEventListener('keydown', this._handleEscape);
        window.removeEventListener('scroll', this._handleScroll, true);
        window.removeEventListener('resize', this._handleResize);
        openInstances.delete(this);
    },

    methods: {
        /**
         * Open the menu with its top-left anchored at (x, y) in viewport
         * coordinates. The final position is adjusted after render to stay
         * inside the viewport. `context` is stored and echoed back in `select`.
         */
        open(x, y, context = null) {
            closeOthers(this);
            openInstances.add(this);

            this._anchorX = x;
            this._anchorY = y;
            this._openContext = context;
            this.state.x = x;
            this.state.y = y;
            this.state.maxHeight = null;   // measure natural height first
            this.state.positioned = false; // keep hidden until placed
            this.state.isVisible = true;

            // Measure after the browser has laid the menu out, then flip/clamp.
            requestAnimationFrame(() => this._adjustPosition());
        },

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
        },

        close() {
            if (!this.state.isVisible) return;
            this.state.isVisible = false;
            this.state.positioned = false;
            this._openContext = null;
            openInstances.delete(this);
        },

        isOpen() {
            return this.state.isVisible;
        },

        /**
         * Viewport-overflow prevention. Measures the natural menu box, then:
         *   - Horizontal: opens to the right of the anchor; flips to the left
         *     (right edge at the anchor) when the right side overflows; clamps.
         *   - Vertical: opens below the anchor; flips above when the bottom
         *     overflows; clamps.
         *   - Taller than the viewport: pins to the top padding and caps
         *     max-height so the menu scrolls internally instead of overflowing.
         */
        _adjustPosition() {
            const menu = this.querySelector('.cl-context-menu');
            if (!menu) return;

            const pad = Number(this.props.padding) || 0;
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const rect = menu.getBoundingClientRect();
            const w = rect.width;
            const h = rect.height;
            const ax = this._anchorX;
            const ay = this._anchorY;

            // --- Horizontal: prefer opening right; flip left on overflow -----
            let left = ax;
            if (ax + w > vw - pad) left = ax - w;    // flip: right edge toward anchor
            left = Math.min(left, vw - w - pad);     // keep right edge inside the pad
            left = Math.max(left, pad);              // keep left edge inside (wins if w > vw)

            // --- Vertical: taller-than-viewport => scroll; else flip up ------
            const available = vh - pad * 2;
            let top;
            let maxHeight = null;
            if (h >= available) {
                top = pad;
                maxHeight = available;               // menu scrolls internally
            } else {
                top = ay;
                if (ay + h > vh - pad) top = ay - h; // flip: bottom edge toward anchor
                top = Math.min(top, vh - h - pad);   // keep bottom edge inside the pad
                top = Math.max(top, pad);            // keep top edge inside
            }

            this.state.maxHeight = maxHeight;
            this.state.x = left;
            this.state.y = top;
            this.state.positioned = true;            // reveal now that it is placed
        },

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
    },

    template() {
        const { isVisible, x, y, positioned, maxHeight } = this.state;

        if (!isVisible) {
            return html`<div class="cl-context-menu-root hidden"></div>`;
        }

        const items = this.props.items || [];
        const minWidth = Number(this.props.minWidth) || 200;
        const scroll = maxHeight != null ? `max-height:${maxHeight}px; overflow-y:auto;` : '';
        const style =
            `left:${x}px; top:${y}px; min-width:${minWidth}px; ` +
            `visibility:${positioned ? 'visible' : 'hidden'}; ${scroll}`;

        return html`
            <div class="cl-context-menu" role="menu" style="${style}">
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
    },

    styles: /*css*/`
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
            position: fixed;
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
});

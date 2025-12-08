/**
 * Sidebar - Slide-out sidebar panel
 *
 * Accessibility features:
 * - role="complementary" (or "dialog" when modal)
 * - aria-labelledby pointing to header
 * - aria-modal for modal sidebars
 * - Escape key to close
 * - Focus trap when modal
 * - Auto-focus first focusable element on open
 * - Returns focus to trigger element on close
 * - aria-label on close button
 */
import { defineComponent, html, when } from '../../lib/framework.js';

// Counter for unique IDs
let sidebarIdCounter = 0;

// Selector for focusable elements
const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default defineComponent('cl-sidebar', {
    props: {
        visible: false,
        position: 'left', // 'left', 'right', 'top', 'bottom'
        modal: true,
        dismissable: true,
        header: ''
    },

    data() {
        return {
            sidebarId: `cl-sidebar-${++sidebarIdCounter}`
        };
    },

    mounted() {
        // Global keydown for escape
        this._handleKeyDown = (e) => {
            if (e.key === 'Escape' && this.props.visible && this.props.dismissable) {
                this.close();
            }
        };
        document.addEventListener('keydown', this._handleKeyDown);
    },

    unmounted() {
        if (this._handleKeyDown) {
            document.removeEventListener('keydown', this._handleKeyDown);
        }
        // Restore body scroll
        document.body.style.overflow = '';
    },

    propsChanged(prop, newValue, oldValue) {
        if (prop === 'visible') {
            if (newValue && !oldValue) {
                // Sidebar opening - store the element that had focus
                this._previousFocus = document.activeElement;

                // Prevent body scroll when modal
                if (this.props.modal) {
                    document.body.style.overflow = 'hidden';
                }

                // Focus first focusable element after render
                requestAnimationFrame(() => {
                    this._focusFirstElement();
                });
            } else if (!newValue && oldValue) {
                // Sidebar closing - restore focus
                document.body.style.overflow = '';
                if (this._previousFocus && typeof this._previousFocus.focus === 'function') {
                    this._previousFocus.focus();
                }
            }
        }
    },

    methods: {
        close() {
            this.emitChange(null, false, 'visible');
        },

        handleMaskClick() {
            if (this.props.dismissable) {
                this.close();
            }
        },

        handleSidebarClick(e) {
            e.stopPropagation();
        },

        /**
         * Focus the first focusable element in the sidebar
         */
        _focusFirstElement() {
            const sidebar = this.querySelector('.cl-sidebar');
            if (!sidebar) return;

            const focusable = sidebar.querySelectorAll(FOCUSABLE_SELECTOR);
            if (focusable.length > 0) {
                focusable[0].focus();
            }
        },

        /**
         * Handle Tab key for focus trapping
         */
        handleFocusTrap(e) {
            if (e.key !== 'Tab' || !this.props.modal) return;

            const sidebar = this.querySelector('.cl-sidebar');
            if (!sidebar) return;

            const focusable = Array.from(sidebar.querySelectorAll(FOCUSABLE_SELECTOR))
                .filter(el => el.offsetParent !== null);

            if (focusable.length === 0) return;

            const firstFocusable = focusable[0];
            const lastFocusable = focusable[focusable.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        }
    },

    template() {
        const titleId = `${this.state.sidebarId}-title`;
        const ariaLabelledby = this.props.header ? titleId : undefined;
        // Use "dialog" role when modal, "complementary" otherwise
        const role = this.props.modal ? 'dialog' : 'complementary';

        return html`
            ${when(this.props.visible, html`
                <div class="cl-sidebar-mask ${this.props.modal ? 'modal' : ''}"
                     on-click="handleMaskClick"
                     aria-hidden="true">
                    <div class="cl-sidebar ${this.props.position}"
                         role="${role}"
                         aria-modal="${this.props.modal ? 'true' : undefined}"
                         aria-labelledby="${ariaLabelledby}"
                         on-click="handleSidebarClick"
                         on-keydown="handleFocusTrap">
                        ${when(this.props.header, html`
                            <div class="sidebar-header">
                                <span class="sidebar-title" id="${titleId}">${this.props.header}</span>
                                <button class="close-btn"
                                        on-click="close"
                                        aria-label="Close sidebar"
                                        type="button">×</button>
                            </div>
                        `)}
                        <div class="sidebar-content">
                            ${this.props.children}
                        </div>
                    </div>
                </div>
            `)}
        `;
    },

    styles: /*css*/`
        :host {
            display: contents;
        }

        .cl-sidebar-mask {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1100;
        }

        .cl-sidebar-mask.hidden {
            display: none;
        }

        .cl-sidebar-mask.modal {
            background: rgba(0, 0, 0, 0.5);
        }

        .cl-sidebar {
            position: fixed;
            background: var(--card-bg, white);
            box-shadow: 0 0 20px rgba(0,0,0,0.2);
            display: flex;
            flex-direction: column;
            z-index: 1101;
        }

        .cl-sidebar.left,
        .cl-sidebar.right {
            top: 0;
            bottom: 0;
            width: 350px;
            max-width: 80vw;
        }

        .cl-sidebar.left {
            left: 0;
            animation: slideInLeft 0.3s ease-out;
        }

        .cl-sidebar.right {
            right: 0;
            animation: slideInRight 0.3s ease-out;
        }

        .cl-sidebar.top,
        .cl-sidebar.bottom {
            left: 0;
            right: 0;
            height: 350px;
            max-height: 80vh;
        }

        .cl-sidebar.top {
            top: 0;
            animation: slideInTop 0.3s ease-out;
        }

        .cl-sidebar.bottom {
            bottom: 0;
            animation: slideInBottom 0.3s ease-out;
        }

        @keyframes slideInLeft {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
        }

        @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
        }

        @keyframes slideInTop {
            from { transform: translateY(-100%); }
            to { transform: translateY(0); }
        }

        @keyframes slideInBottom {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
        }

        .sidebar-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            border-bottom: 1px solid var(--input-border, #dee2e6);
        }

        .sidebar-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--text-color, #333);
        }

        .close-btn {
            background: none;
            border: none;
            font-size: 28px;
            line-height: 1;
            cursor: pointer;
            color: var(--text-muted, #6c757d);
            padding: 0;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: all 0.2s;
        }

        .close-btn:hover {
            background: var(--hover-bg, #f8f9fa);
            color: var(--text-color, #333);
        }

        .sidebar-content {
            padding: 20px;
            overflow: auto;
            flex: 1;
        }
    `
});

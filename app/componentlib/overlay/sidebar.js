/**
 * Sidebar - Slide-out sidebar panel
 */
import { defineComponent, html, when } from '../../lib/framework.js';

export default defineComponent('cl-sidebar', {
    props: {
        visible: false,
        position: 'left', // 'left', 'right', 'top', 'bottom'
        modal: true,
        dismissable: true,
        header: ''
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
        }
    },

    template() {
        return html`
            ${when(this.props.visible, html`
                <div class="cl-sidebar-mask ${this.props.modal ? 'modal' : ''}" on-click="handleMaskClick">
                    <div class="cl-sidebar ${this.props.position}" on-click="handleSidebarClick">
                        ${when(this.props.header, html`
                            <div class="sidebar-header">
                                <span class="sidebar-title">${this.props.header}</span>
                                <button class="close-btn" on-click="close">×</button>
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

    styles: `
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

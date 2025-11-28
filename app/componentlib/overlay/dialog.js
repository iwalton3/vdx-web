/**
 * Dialog - Modal dialog component
 */
import { defineComponent, html, when } from '../../lib/framework.js';

export default defineComponent('cl-dialog', {
    props: {
        visible: false,
        header: '',
        footer: '',
        modal: true,
        closable: true,
        dismissablemask: true,
        style: ''
    },

    methods: {
        close() {
            this.emitChange(null, false, 'visible');
        },

        handleMaskClick() {
            if (this.props.dismissablemask) {
                this.close();
            }
        },

        handleDialogClick(e) {
            e.stopPropagation();
        }
    },

    template() {
        // Extract default and named children
        const defaultChildren = Array.isArray(this.props.children) ? this.props.children : (this.props.children?.default || []);
        const footerChildren = this.props.children?.footer || [];
        const hasFooter = this.props.footer || footerChildren.length > 0;

        return html`
            ${when(this.props.visible, html`
                <div class="cl-dialog-mask ${this.props.modal ? 'modal' : ''}" on-click="handleMaskClick">
                    <div class="cl-dialog" style="${this.props.style}" on-click="handleDialogClick">
                        ${when(this.props.header || this.props.closable, html`
                            <div class="dialog-header">
                                <span class="dialog-title">${this.props.header}</span>
                                ${when(this.props.closable, html`
                                    <button class="close-btn" on-click="close">×</button>
                                `)}
                            </div>
                        `)}
                        <div class="dialog-content">
                            ${defaultChildren}
                        </div>
                        ${when(hasFooter, html`
                            <div class="dialog-footer">
                                ${footerChildren}
                            </div>
                        `)}
                    </div>
                </div>
            `)}
        `;
    },

    styles: `
        :host {
            display: contents;
        }

        .cl-dialog-mask {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1100;
        }

        .cl-dialog-mask.hidden {
            display: none;
        }

        .cl-dialog-mask.modal {
            background: rgba(0, 0, 0, 0.5);
        }

        .cl-dialog {
            background: white;
            border-radius: 6px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            max-width: 90vw;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            animation: dialogShow 0.2s ease-out;
        }

        @keyframes dialogShow {
            from {
                opacity: 0;
                transform: scale(0.9);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }

        .dialog-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            border-bottom: 1px solid var(--input-border, #dee2e6);
        }

        .dialog-title {
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

        .dialog-content {
            padding: 20px;
            overflow: auto;
            flex: 1;
        }

        .dialog-footer {
            padding: 12px 20px;
            border-top: 1px solid var(--input-border, #dee2e6);
            display: flex;
            justify-content: flex-end;
            gap: 8px;
        }
    `
});

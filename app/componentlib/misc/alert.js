/**
 * Alert - Alert/banner component for messages and notifications
 */
import { defineComponent, html, when } from '../../lib/framework.js';

export default defineComponent('cl-alert', {
    props: {
        severity: 'info',       // 'info', 'success', 'warning', 'error'
        title: '',
        closable: false,
        icon: '',               // Custom icon (auto-selected if not provided)
        outline: false          // Outlined style instead of filled
    },

    data() {
        return {
            visible: true
        };
    },

    methods: {
        close() {
            this.state.visible = false;
            this.dispatchEvent(new CustomEvent('close', {
                bubbles: true,
                composed: true
            }));
        },

        getDefaultIcon() {
            if (this.props.icon) return this.props.icon;

            const icons = {
                info: 'ℹ️',
                success: '✅',
                warning: '⚠️',
                error: '❌'
            };
            return icons[this.props.severity] || icons.info;
        }
    },

    template() {
        if (!this.state.visible) {
            return html``;
        }

        const classes = [
            'cl-alert',
            `severity-${this.props.severity}`,
            this.props.outline ? 'outline' : ''
        ].filter(Boolean).join(' ');

        return html`
            <div class="${classes}" role="alert">
                <span class="alert-icon">${this.getDefaultIcon()}</span>
                <div class="alert-content">
                    ${when(this.props.title, html`
                        <div class="alert-title">${this.props.title}</div>
                    `)}
                    <div class="alert-message">
                        <slot>${this.props.children}</slot>
                    </div>
                </div>
                ${when(this.props.closable, html`
                    <button class="alert-close" on-click="close" title="Close">×</button>
                `)}
            </div>
        `;
    },

    styles: `
        :host {
            display: block;
        }

        .cl-alert {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 16px;
            border-radius: 8px;
            font-size: 14px;
        }

        /* Filled styles */
        .cl-alert.severity-info {
            background: var(--info-bg, #e7f3ff);
            color: var(--info-text, #0066cc);
            border: 1px solid var(--info-color, #b6d4fe);
        }

        .cl-alert.severity-success {
            background: var(--success-bg, #d4edda);
            color: var(--success-text, #155724);
            border: 1px solid var(--success-border, #c3e6cb);
        }

        .cl-alert.severity-warning {
            background: var(--warning-bg, #fff3cd);
            color: var(--warning-text, #856404);
            border: 1px solid var(--warning-border, #ffc107);
        }

        .cl-alert.severity-error {
            background: var(--error-bg, #f8d7da);
            color: var(--error-text, #721c24);
            border: 1px solid #f5c6cb;
        }

        /* Outline styles */
        .cl-alert.outline {
            background: transparent;
        }

        .cl-alert.outline.severity-info {
            border: 2px solid var(--info-color, #007bff);
            color: var(--info-color, #007bff);
        }

        .cl-alert.outline.severity-success {
            border: 2px solid var(--success-color, #28a745);
            color: var(--success-color, #28a745);
        }

        .cl-alert.outline.severity-warning {
            border: 2px solid var(--warning-color, #ffc107);
            color: var(--warning-text, #856404);
        }

        .cl-alert.outline.severity-error {
            border: 2px solid var(--error-color, #dc3545);
            color: var(--error-color, #dc3545);
        }

        .alert-icon {
            font-size: 18px;
            flex-shrink: 0;
            line-height: 1;
        }

        .alert-content {
            flex: 1;
            min-width: 0;
        }

        .alert-title {
            font-weight: 600;
            margin-bottom: 4px;
        }

        .alert-message {
            line-height: 1.5;
        }

        .alert-close {
            background: none;
            border: none;
            font-size: 20px;
            line-height: 1;
            cursor: pointer;
            opacity: 0.5;
            transition: opacity 0.2s;
            color: inherit;
            padding: 0;
            flex-shrink: 0;
        }

        .alert-close:hover {
            opacity: 1;
        }
    `
});

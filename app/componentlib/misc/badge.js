/**
 * Badge - Badge/pill component for labels, counts, and status indicators
 */
import { defineComponent, html, when } from '../../lib/framework.js';

export default defineComponent('cl-badge', {
    props: {
        value: '',
        severity: 'primary',    // 'primary', 'secondary', 'success', 'danger', 'warning', 'info'
        size: 'medium',         // 'small', 'medium', 'large'
        rounded: false,         // Pill style
        dot: false,             // Show as dot (no value)
        icon: '',               // Optional icon
        removable: false        // Show remove button
    },

    methods: {
        handleRemove(e) {
            e.stopPropagation();
            this.dispatchEvent(new CustomEvent('remove', {
                bubbles: true,
                composed: true,
                detail: { value: this.props.value }
            }));
        }
    },

    template() {
        const classes = [
            'cl-badge',
            `severity-${this.props.severity}`,
            `size-${this.props.size}`,
            this.props.rounded ? 'rounded' : '',
            this.props.dot ? 'dot' : ''
        ].filter(Boolean).join(' ');

        if (this.props.dot) {
            return html`<span class="${classes}"></span>`;
        }

        return html`
            <span class="${classes}">
                ${when(this.props.icon, html`
                    <span class="badge-icon">${this.props.icon}</span>
                `)}
                <span class="badge-value">${this.props.value}</span>
                ${when(this.props.removable, html`
                    <button class="badge-remove" on-click="handleRemove" title="Remove">×</button>
                `)}
            </span>
        `;
    },

    styles: /*css*/`
        :host {
            display: inline-block;
        }

        .cl-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-weight: 600;
            border-radius: 4px;
            white-space: nowrap;
        }

        /* Sizes */
        .cl-badge.size-small {
            font-size: 10px;
            padding: 2px 6px;
        }

        .cl-badge.size-medium {
            font-size: 12px;
            padding: 4px 8px;
        }

        .cl-badge.size-large {
            font-size: 14px;
            padding: 6px 12px;
        }

        /* Rounded/Pill style */
        .cl-badge.rounded {
            border-radius: 100px;
        }

        /* Dot style */
        .cl-badge.dot {
            padding: 0;
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }

        .cl-badge.dot.size-small {
            width: 6px;
            height: 6px;
        }

        .cl-badge.dot.size-large {
            width: 12px;
            height: 12px;
        }

        /* Severities */
        .cl-badge.severity-primary {
            background: var(--primary-color, #007bff);
            color: white;
        }

        .cl-badge.severity-secondary {
            background: var(--text-muted, #6c757d);
            color: white;
        }

        .cl-badge.severity-success {
            background: var(--success-color, #28a745);
            color: white;
        }

        .cl-badge.severity-danger {
            background: var(--error-color, #dc3545);
            color: white;
        }

        .cl-badge.severity-warning {
            background: var(--warning-color, #ffc107);
            color: #856404;
        }

        .cl-badge.severity-info {
            background: var(--info-color, #17a2b8);
            color: white;
        }

        .badge-icon {
            font-size: 0.9em;
        }

        .badge-value {
            line-height: 1;
        }

        .badge-remove {
            background: none;
            border: none;
            color: inherit;
            cursor: pointer;
            font-size: 1.2em;
            line-height: 1;
            padding: 0;
            margin-left: 2px;
            opacity: 0.7;
            transition: opacity 0.2s;
        }

        .badge-remove:hover {
            opacity: 1;
        }
    `
});

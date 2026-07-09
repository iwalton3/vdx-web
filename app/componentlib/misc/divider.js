/**
 * Divider - Horizontal or vertical separating line, with an optional label.
 */
import { defineComponent, html, when } from '../../lib/framework.js';

export default defineComponent('cl-divider', {
    props: {
        orientation: 'horizontal', // 'horizontal' | 'vertical'
        label: '',
        align: 'center',           // horizontal label position: 'left' | 'center' | 'right'
        variant: 'solid'           // 'solid' | 'dashed' | 'dotted'
    },

    template() {
        const vertical = this.props.orientation === 'vertical';
        const classes = [
            'cl-divider',
            vertical ? 'vertical' : 'horizontal',
            `variant-${this.props.variant}`,
            (!vertical && this.props.label) ? `has-label align-${this.props.align}` : ''
        ].filter(Boolean).join(' ');

        if (vertical || !this.props.label) {
            return html`<div class="${classes}" role="separator"></div>`;
        }

        return html`
            <div class="${classes}" role="separator">
                <span class="divider-label">${this.props.label}</span>
            </div>
        `;
    },

    styles: /*css*/`
        :host {
            display: block;
        }

        :host([orientation="vertical"]) {
            display: inline-block;
            height: 100%;
        }

        .cl-divider.horizontal {
            width: 100%;
            border-top: 1px solid var(--input-border, #dee2e6);
            margin: 16px 0;
        }

        .cl-divider.vertical {
            display: inline-block;
            height: 100%;
            min-height: 1em;
            border-left: 1px solid var(--input-border, #dee2e6);
            margin: 0 12px;
        }

        .cl-divider.variant-dashed.horizontal { border-top-style: dashed; }
        .cl-divider.variant-dotted.horizontal { border-top-style: dotted; }
        .cl-divider.variant-dashed.vertical { border-left-style: dashed; }
        .cl-divider.variant-dotted.vertical { border-left-style: dotted; }

        /* Labelled divider: line - label - line */
        .cl-divider.has-label {
            border-top: none;
            display: flex;
            align-items: center;
            gap: 12px;
            color: var(--text-muted, #6c757d);
            font-size: 13px;
        }

        .cl-divider.has-label::before,
        .cl-divider.has-label::after {
            content: "";
            flex: 1;
            border-top: 1px solid var(--input-border, #dee2e6);
        }

        .cl-divider.has-label.variant-dashed::before,
        .cl-divider.has-label.variant-dashed::after { border-top-style: dashed; }
        .cl-divider.has-label.variant-dotted::before,
        .cl-divider.has-label.variant-dotted::after { border-top-style: dotted; }

        .cl-divider.align-left::before { flex: 0 0 24px; }
        .cl-divider.align-right::after { flex: 0 0 24px; }

        .divider-label {
            white-space: nowrap;
        }
    `
});

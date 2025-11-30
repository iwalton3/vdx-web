/**
 * Card - Content card container
 */
import { defineComponent, html, when, raw } from '../../lib/framework.js';

export default defineComponent('cl-card', {
    props: {
        header: '',
        subheader: '',
        footer: ''
    },

    template() {
        // children is always an array, slots has named slots
        const footerSlot = this.props.slots.footer || [];
        const hasFooter = this.props.footer || footerSlot.length > 0;

        return html`
            <div class="cl-card">
                ${when(this.props.header || this.props.subheader, html`
                    <div class="card-header">
                        ${when(this.props.header, html`
                            <div class="card-title">${this.props.header}</div>
                        `)}
                        ${when(this.props.subheader, html`
                            <div class="card-subtitle">${this.props.subheader}</div>
                        `)}
                    </div>
                `)}
                <div class="card-body">
                    ${this.props.children}
                </div>
                ${when(hasFooter, html`
                    <div class="card-footer">
                        ${when(this.props.footer, raw(this.props.footer))}
                        ${footerSlot}
                    </div>
                `)}
            </div>
        `;
    },

    styles: /*css*/`
        :host {
            display: block;
        }

        .cl-card {
            border: 1px solid var(--input-border, #dee2e6);
            border-radius: 4px;
            background: var(--card-bg, white);
            overflow: hidden;
        }

        .card-header {
            padding: 16px 20px;
            background: var(--table-header-bg, #f8f9fa);
            border-bottom: 1px solid var(--input-border, #dee2e6);
        }

        .card-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--text-color, #333);
            margin-bottom: 4px;
        }

        .card-subtitle {
            font-size: 14px;
            color: var(--text-muted, #6c757d);
        }

        .card-body {
            padding: 20px;
            font-size: 14px;
            color: var(--text-color, #333);
            line-height: 1.6;
        }

        .card-footer {
            padding: 12px 20px;
            background: var(--table-header-bg, #f8f9fa);
            border-top: 1px solid var(--input-border, #dee2e6);
            font-size: 14px;
        }
    `
});

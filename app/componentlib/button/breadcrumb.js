/**
 * Breadcrumb - Breadcrumb navigation
 */
import { defineComponent, html, when, each } from '../../lib/framework.js';

export default defineComponent('cl-breadcrumb', {
    props: {
        model: [], // Array of {label: string, url: string, command: function}
        home: null, // Home item {icon: string, url: string, command: function}
        separator: '/'
    },

    methods: {
        handleItemClick(item, event) {
            event.preventDefault();

            if (item.command) {
                item.command();
            }

            if (item.url) {
                this.emitEvent('item-click', { item, originalEvent: event });
            }
        },

        emitEvent(name, detail) {
            this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
        }
    },

    template() {
        const items = this.props.model || [];
        const home = this.props.home;

        const homeIcon = home && home.icon ? html`<span class="item-icon">${home.icon}</span>` : '';
        const homeLabel = home && home.label ? html`<span>${home.label}</span>` : '';

        return html`
            <nav class="cl-breadcrumb">
                <ol class="breadcrumb-list">
                    ${when(home, html`
                        <li class="breadcrumb-item">
                            <a
                                href="${home && home.url ? home.url : '#'}"
                                class="breadcrumb-link"
                                on-click="${(e) => this.handleItemClick(home, e)}">
                                ${homeIcon}
                                ${homeLabel}
                            </a>
                            ${when(items.length > 0, html`
                                <span class="separator">${this.props.separator}</span>
                            `)}
                        </li>
                    `)}
                    ${each(items, (item, index) => html`
                        <li class="breadcrumb-item ${index === items.length - 1 ? 'active' : ''}">
                            ${when(index === items.length - 1, html`
                                <span class="breadcrumb-text">${item ? item.label : ''}</span>
                            `, html`
                                <a
                                    href="${item && item.url ? item.url : '#'}"
                                    class="breadcrumb-link"
                                    on-click="${(e) => this.handleItemClick(item, e)}">
                                    ${item ? item.label : ''}
                                </a>
                                <span class="separator">${this.props.separator}</span>
                            `)}
                        </li>
                    `)}
                </ol>
            </nav>
        `;
    },

    styles: `
        :host {
            display: block;
        }

        .cl-breadcrumb {
            padding: 12px 16px;
            background: var(--table-header-bg, #f8f9fa);
            border: 1px solid var(--input-border, #dee2e6);
            border-radius: 4px;
        }

        .breadcrumb-list {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
            list-style: none;
            margin: 0;
            padding: 0;
        }

        .breadcrumb-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
        }

        .breadcrumb-link {
            color: var(--primary-color, #007bff);
            text-decoration: none;
            transition: color 0.2s;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .breadcrumb-link:hover {
            color: #0056b3;
            text-decoration: underline;
        }

        .breadcrumb-text {
            color: var(--text-muted, #6c757d);
        }

        .separator {
            color: var(--text-muted, #6c757d);
            user-select: none;
        }

        .item-icon {
            font-size: 16px;
        }
    `
});

/**
 * Accordion - Collapsible accordion panels
 */
import { defineComponent, html, when, each, raw } from '../../lib/framework.js';

export default defineComponent('cl-accordion', {
    props: {
        tabs: [], // Array of {header: string, content: string}
        activeindex: 0,
        multiple: false
    },

    data() {
        return {
            activeTabs: new Set()
        };
    },

    mounted() {
        if (this.props.multiple) {
            this.state.activeTabs = new Set();
        } else {
            this.state.activeTabs = new Set([this.props.activeindex]);
        }
    },

    methods: {
        toggleTab(index) {
            const newActive = new Set(this.state.activeTabs);

            if (this.props.multiple) {
                if (newActive.has(index)) {
                    newActive.delete(index);
                } else {
                    newActive.add(index);
                }
            } else {
                if (newActive.has(index)) {
                    newActive.clear();
                } else {
                    newActive.clear();
                    newActive.add(index);
                }
            }

            this.state.activeTabs = newActive;
            this.emitChange(null, this.props.multiple ? Array.from(newActive) : Array.from(newActive)[0]);
        },

        isActive(index) {
            return this.state.activeTabs.has(index);
        }
    },

    template() {
        const tabs = this.props.tabs || [];

        return html`
            <div class="cl-accordion">
                ${each(tabs, (tab, index) => {
                    const isActive = this.isActive(index);
                    return html`
                        <div class="accordion-tab ${isActive ? 'active' : ''}">
                            <div
                                class="accordion-header"
                                on-click="${() => this.toggleTab(index)}">
                                <span class="header-text">${tab.header}</span>
                                <span class="toggle-icon">${isActive ? '▲' : '▼'}</span>
                            </div>
                            ${when(isActive, html`
                                <div class="accordion-content">
                                    ${raw(tab.content)}
                                </div>
                            `)}
                        </div>
                    `;
                })}
            </div>
        `;
    },

    styles: `
        :host {
            display: block;
        }

        .cl-accordion {
            border: 1px solid var(--input-border, #dee2e6);
            border-radius: 4px;
            overflow: hidden;
        }

        .accordion-tab {
            border-bottom: 1px solid var(--input-border, #dee2e6);
        }

        .accordion-tab:last-child {
            border-bottom: none;
        }

        .accordion-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 16px;
            background: var(--table-header-bg, #f8f9fa);
            cursor: pointer;
            user-select: none;
            transition: background 0.2s;
        }

        .accordion-header:hover {
            background: var(--hover-bg, #e9ecef);
        }

        .accordion-tab.active .accordion-header {
            background: var(--card-bg, white);
            border-bottom: 1px solid var(--input-border, #dee2e6);
        }

        .header-text {
            font-weight: 600;
            font-size: 14px;
            color: var(--text-color, #333);
        }

        .toggle-icon {
            font-size: 10px;
            color: var(--text-muted, #6c757d);
        }

        .accordion-content {
            padding: 16px;
            background: var(--card-bg, white);
            font-size: 14px;
            color: var(--text-color, #333);
            line-height: 1.6;
        }
    `
});

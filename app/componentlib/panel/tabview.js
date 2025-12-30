/**
 * TabView - Tabbed interface component
 */
import { defineComponent, html, when, each, raw } from '../../lib/framework.js';

export default defineComponent('cl-tabview', {
    props: {
        tabs: [], // Array of {header: string, content: string}
        activeindex: 0
    },

    data() {
        return {
            activeTab: 0
        };
    },

    mounted() {
        // Convert to number since props from HTML attributes are strings
        this.state.activeTab = parseInt(this.props.activeindex, 10) || 0;
    },

    methods: {
        selectTab(index) {
            this.state.activeTab = index;
            this.emitChange(null, index);
        }
    },

    template() {
        const tabs = this.props.tabs || [];

        return html`
            <div class="cl-tabview">
                <div class="tab-headers">
                    ${each(tabs, (tab, index) => html`
                        <div
                            class="tab-header ${index === this.state.activeTab ? 'active' : ''}"
                            on-click="${() => this.selectTab(index)}">
                            ${tab.header}
                        </div>
                    `)}
                </div>
                <div class="tab-content">
                    ${when(tabs[this.state.activeTab], () => raw(tabs[this.state.activeTab].content))}
                </div>
            </div>
        `;
    },

    styles: /*css*/`
        :host {
            display: block;
        }

        .cl-tabview {
            border: 1px solid var(--input-border, #dee2e6);
            border-radius: 4px;
            overflow: hidden;
        }

        .tab-headers {
            display: flex;
            background: var(--table-header-bg, #f8f9fa);
            border-bottom: 2px solid var(--input-border, #dee2e6);
        }

        .tab-header {
            padding: 12px 20px;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-muted, #6c757d);
            cursor: pointer;
            user-select: none;
            border-bottom: 3px solid transparent;
            transition: all 0.2s;
            position: relative;
            top: 2px;
        }

        .tab-header:hover {
            color: var(--text-color, #333);
            background: var(--hover-bg, #e9ecef);
        }

        .tab-header.active {
            color: var(--primary-color, #007bff);
            border-bottom-color: var(--primary-color, #007bff);
            background: var(--card-bg, white);
        }

        .tab-content {
            padding: 20px;
            background: var(--card-bg, white);
            font-size: 14px;
            color: var(--text-color, #333);
            line-height: 1.6;
        }
    `
});

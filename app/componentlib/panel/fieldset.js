/**
 * Fieldset - Fieldset with legend and toggle
 */
import { defineComponent, html, when } from '../../lib/framework.js';

export default defineComponent('cl-fieldset', {
    props: {
        legend: '',
        toggleable: false,
        collapsed: false
    },

    data() {
        return {
            isCollapsed: false
        };
    },

    mounted() {
        this.state.isCollapsed = this.props.collapsed;
    },

    methods: {
        toggle() {
            if (this.props.toggleable) {
                this.state.isCollapsed = !this.state.isCollapsed;
                this.emitChange(null, this.state.isCollapsed);
            }
        }
    },

    template() {
        return html`
            <fieldset class="cl-fieldset">
                <legend
                    class="${this.props.toggleable ? 'toggleable' : ''}"
                    on-click="toggle">
                    ${when(this.props.toggleable, html`
                        <span class="toggle-icon">${this.state.isCollapsed ? '▶' : '▼'}</span>
                    `)}
                    <span class="legend-text">${this.props.legend}</span>
                </legend>
                <div class="fieldset-content ${this.state.isCollapsed ? 'collapsed' : ''}">
                    ${this.props.children}
                </div>
            </fieldset>
        `;
    },

    styles: /*css*/`
        :host {
            display: block;
        }

        .cl-fieldset {
            border: 1px solid var(--input-border, #dee2e6);
            border-radius: 4px;
            padding: 16px;
        }

        legend {
            padding: 0 8px;
            font-weight: 600;
            font-size: 16px;
            color: var(--text-color, #333);
        }

        legend.toggleable {
            cursor: pointer;
            user-select: none;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        legend.toggleable:hover {
            color: var(--primary-color, #007bff);
        }

        .toggle-icon {
            font-size: 10px;
        }

        .fieldset-content {
            margin-top: 12px;
        }

        .fieldset-content.collapsed {
            display: none;
        }
    `
});

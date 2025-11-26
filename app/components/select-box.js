/**
 * SelectBox Component - Simple select dropdown
 */
import { defineComponent } from '../core/component.js';
import { html, each } from '../core/template.js';

export default defineComponent('x-select-box', {
    props: {
        options: [],
        value: ''
    },

    methods: {
        handleChange(e) {
            this.emitChange(e, this.props.options[Number(e.target.value)]);
        }
    },

    template() {
        const optionsList = this.props.options || [];
        const valueIndex = optionsList.indexOf(this.props.value);

        return html`
            <select on-change="handleChange" value="${valueIndex !== -1 ? valueIndex : ''}">
                ${each(optionsList, (option, index) => {
                    return html`<option value="${index}">${option}</option>`;
                })}
            </select>
        `;
    },

    styles: `
        select {
            font-family: inherit;
            font-size: 14px;
            padding: 8px;
            border-radius: 4px;

            /* Use CSS variables for theming */
            background-color: var(--input-bg, white);
            border: 1px solid var(--input-border, #ddd);
            color: var(--input-text, #000);
        }

        select:focus {
            outline: none;
            border-color: var(--input-focus-border, #0066cc);
            box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
        }

        select:hover:not(:disabled) {
            background-color: var(--input-hover-bg, #f5f5f5);
        }
    `
});

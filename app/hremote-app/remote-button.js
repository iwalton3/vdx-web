/**
 * Remote Button Component
 * Individual button that calls an action and disables temporarily
 */

import { defineComponent } from '../core/component.js';
import { sleep } from '../core/utils.js';
import { call_action } from '../api.js';
import { html } from '../core/template.js';

export default defineComponent('remote-button', {
    props: {
        sectionNo: 0,
        actionNo: 0,
        action: ''
    },

    data() {
        return {
            disabled: false
        };
    },

    methods: {
        async handleClick() {
            this.state.disabled = true;
            try {
                await call_action(this.props.sectionNo, this.props.actionNo);
                await sleep(100);
            } catch (error) {
                console.error('Failed to call action:', error);
            }
            this.state.disabled = false;
        }
    },

    styles: `
        :host {
            display: inline-block;
        }

        button {
            margin: 0;
            font-size: 25px;
            padding: 5px 10px;
            line-height: 1.2;

            /* Use CSS variables for dark theme support */
            background-color: var(--input-bg, white);
            border: 1px solid var(--input-border, #ddd);
            color: var(--input-text, #000);
            border-radius: 4px;
            cursor: pointer;
        }

        button:hover:not(:disabled) {
            background-color: var(--input-hover-bg, #f5f5f5);
        }

        button:disabled {
            opacity: 0.3 !important;
            cursor: not-allowed;
        }
    `,

    template() {
        return html`
            <button on-click="handleClick" disabled="${this.state.disabled}">
                ${this.props.action}
            </button>
        `;
    }
});

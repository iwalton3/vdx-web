/**
 * Remote Button Component
 * Individual button that calls an action and disables temporarily
 */

import { defineComponent, Component } from '../../../lib/framework.js';
import { sleep } from '../../../lib/utils.js';
import { call_action } from '../api.js';
import { html } from '../../../lib/framework.js';

export class RemoteButton extends Component {
    static props = {
        sectionNo: 0,
        actionNo: 0,
        action: ''
    }

    constructor(props) {
        super(props);

        this.state = {
            disabled: false
        };
    }

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

    static styles = /*css*/`
        :host {
            display: inline-block;
        }

        button {
            margin: 0;
            font-size: 20px;
            padding: 4px 8px;
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
            opacity: 0.3;
            cursor: not-allowed;
        }
    `

    template() {
        return html`
            <button on-click="handleClick" disabled="${this.state.disabled}">
                ${this.props.action}
            </button>
        `;
    }
}

export default defineComponent('remote-button', RemoteButton);

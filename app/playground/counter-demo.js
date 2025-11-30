/**
 * Counter Demo - Demonstrates basic reactive state
 */
import { defineComponent } from '../lib/framework.js';
import { html } from '../lib/framework.js';

export default defineComponent('counter-demo', {
    data() {
        return {
            count: 0,
            step: 1
        };
    },

    methods: {
        increment() {
            this.state.count += this.state.step;
        },

        decrement() {
            this.state.count -= this.state.step;
        },

        reset() {
            this.state.count = 0;
        }
    },

    template() {
        return html`
            <h2>Counter Demo</h2>
            <p>Demonstrates reactive state updates with x-model two-way binding</p>

            <div class="counter-display">${this.state.count}</div>

            <div class="controls">
                <button on-click="decrement">- ${this.state.step}</button>
                <button on-click="increment">+ ${this.state.step}</button>
                <button class="secondary" on-click="reset">Reset</button>
            </div>

            <div style="margin-top: 15px;">
                <label>
                    Step:
                    <input
                        type="number"
                        x-model="step"
                        min="1"
                        style="width: 80px; margin-left: 5px;">
                </label>
            </div>
        `;
    },

    styles: /*css*/`
        :host {
            display: block;
        }
    `
});

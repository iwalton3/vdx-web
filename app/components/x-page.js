/**
 * Simple page wrapper component
 * Provides consistent page styling without the full header
 */
import { defineComponent, html } from '../lib/framework.js';

export default defineComponent('x-page', {
    template() {
        return html`${this.props.children}`;
    },

    styles: /*css*/`
        :host {
            display: block;
            margin: 0 auto;
            max-width: 700px;
            padding: 20px 0;
        }
    `
});

/**
 * Simple page wrapper component
 * Provides consistent page styling without the full header
 */
import { defineComponent, html, Component } from '../../../lib/framework.js';

export class XPage extends Component {
    template() {
        return html`${this.props.children}`;
    }

    static styles = /*css*/`
        :host {
            display: block;
            margin: 0 auto;
            max-width: 700px;
            padding: 20px 0;
        }
    `
}

export default defineComponent('x-page', XPage);

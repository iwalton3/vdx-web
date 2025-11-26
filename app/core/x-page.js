/**
 * Simple page wrapper component
 * Provides consistent page styling without the full header
 *
 * This component only provides CSS styling - no template needed.
 */
import { defineComponent } from './component.js';

export default defineComponent('x-page', {
    styles: `
        :host {
            display: block;
            margin: 0 auto;
            max-width: 700px;
            padding: 20px 0;
        }
    `
});

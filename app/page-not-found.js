/**
 * 404 Page Not Found Component
 */
import { defineComponent } from './core/component.js';
import { html } from './core/template.js';

export default defineComponent('page-not-found', {
    template() {
        return html`
            <div class="container">
                <h1>404 - Page Not Found</h1>
                <p>The page you're looking for doesn't exist.</p>
                <p><router-link to="/">Return to Home</router-link></p>
            </div>
        `;
    },

    styles: `
        .container {
            text-align: center;
            padding: 60px 20px;
        }

        h1 {
            font-size: 48px;
            color: #666;
            margin-bottom: 20px;
        }

        p {
            font-size: 18px;
            color: #888;
            margin: 15px 0;
        }

        router-link {
            color: #007bff;
            text-decoration: none;
        }

        router-link:hover {
            text-decoration: underline;
        }
    `
});

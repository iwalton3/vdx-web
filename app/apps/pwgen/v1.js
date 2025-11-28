/**
 * V1 - Legacy Password Generator
 * DEPRECATED: Simple password generator for backwards compatibility
 */
import { defineComponent } from '../../lib/framework.js';
import { html } from '../../lib/framework.js';
import { pwgen } from './spwg_api.js';
import '../../components/x-page.js';

export default defineComponent('v1-page', {
    data() {
        return {
            password: ''
        };
    },

    async mounted() {
        await this.generatePassword();
    },

    methods: {
        async generatePassword(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }

            try {
                this.state.password = await pwgen();
            } catch (error) {
                console.error('Failed to generate password:', error);
                this.state.password = 'Error generating password';
            }
        }
    },

    template() {
        return html`
            <x-page>
                <h1>Password Generator v1</h1>
                <div class="section">
                    <label>
                        Your password is:
                        <input type="text" id="password-display" value="${this.state.password}" readonly>
                    </label>
                    <button type="button" on-click="generatePassword">Generate another password</button>
                    <p>
                        This password generator is deprecated. Use <router-link to="/pwgen/">spwg</router-link>.
                    </p>
                </div>
            </x-page>
        `;
    }
});

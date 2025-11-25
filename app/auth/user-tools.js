/**
 * UserTools - Account widget showing login/logout options
 */
import { defineComponent } from '../core/component.js';
import { html } from '../core/template.js';
import login from './auth.js';
import { darkTheme } from '../core/utils.js';
import '../components/icon.js';

export default defineComponent('user-tools', {
    data() {
        return {
            loginState: null,
            darkThemeEnabled: false
        };
    },

    mounted() {
        // Subscribe to login store
        this.loginUnsubscribe = login.subscribe(state => {
            this.state.loginState = state;
        });

        // Subscribe to darkTheme store
        this.themeUnsubscribe = darkTheme.subscribe(state => {
            this.state.darkThemeEnabled = state.enabled;

            // Apply dark theme class to body
            if (state.enabled) {
                document.body.classList.add('dark');
            } else {
                document.body.classList.remove('dark');
            }
        });
    },

    unmounted() {
        if (this.loginUnsubscribe) this.loginUnsubscribe();
        if (this.themeUnsubscribe) this.themeUnsubscribe();
    },

    methods: {
        async logoff() {
            await login.state.logoff();
        },

        toggleDarkTheme() {
            darkTheme.update(state => ({ enabled: !state.enabled }));
        }
    },

    template() {
        const state = this.state.loginState || login.state;

        return html`
            <div class="section">
                <h3>Account</h3>
                ${state.user ? html`
                    <p>Welcome, ${state.user}!</p>
                    <p>
                        <x-icon icon="leave" alt="logoff"></x-icon>
                        <button class="link" on-click="logoff">Log Off</button>
                    </p>
                    <p>
                        <x-icon icon="leave" alt="logoff all"></x-icon>
                        <router-link to="/auth/logoff-all/">Log Off All Browsers</router-link>
                    </p>
                ` : html`
                    <p>You are not logged in.</p>
                    <p>
                        <x-icon icon="user" alt="login"></x-icon>
                        <router-link to="/auth/login/">Log in</router-link>
                    </p>
                `}
                <p>
                    <label>
                        <input type="checkbox" id="dark-theme-toggle" on-change="toggleDarkTheme" checked="${this.state.darkThemeEnabled}"> Use Dark Theme?
                    </label>
                </p>
            </div>
        `;
    }
});

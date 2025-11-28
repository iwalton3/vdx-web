/**
 * UserTools - Account widget showing login/logout options
 */
import { defineComponent } from '../lib/framework.js';
import { html, when } from '../lib/framework.js';
import login from './auth.js';
import { darkTheme } from '../lib/utils.js';
import '../components/icon.js';

export default defineComponent('user-tools', {
    stores: { login },

    data() {
        return {
            darkThemeEnabled: false
        };
    },

    mounted() {
        // Subscribe to darkTheme store (needs custom callback for DOM side effects)
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
        if (this.themeUnsubscribe) this.themeUnsubscribe();
    },

    methods: {
        async logoff() {
            await login.state.logoff();
        },

        handleDarkThemeChange() {
            // Update store with current checkbox state
            darkTheme.update(() => ({ enabled: this.state.darkThemeEnabled }));
        }
    },

    template() {
        return html`
            <div class="section">
                <h3>Account</h3>
                ${when(this.stores.login.user, html`
                    <p>Welcome, ${this.stores.login.user}!</p>
                    <p>
                        <x-icon icon="leave" alt="logoff"></x-icon>
                        <button class="link" on-click="logoff">Log Off</button>
                    </p>
                    <p>
                        <x-icon icon="leave" alt="logoff all"></x-icon>
                        <router-link to="/auth/logoff-all/">Log Off All Browsers</router-link>
                    </p>
                `, html`
                    <p>You are not logged in.</p>
                    <p>
                        <x-icon icon="user" alt="login"></x-icon>
                        <router-link to="/auth/login/">Log in</router-link>
                    </p>
                `)}
                <p>
                    <label>
                        <input type="checkbox" id="dark-theme-toggle" x-model="darkThemeEnabled" on-change="handleDarkThemeChange"> Use Dark Theme?
                    </label>
                </p>
            </div>
        `;
    }
});

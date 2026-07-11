/**
 * UserTools - Account widget showing login/logout options
 */
import { defineComponent, Component } from '../../../lib/framework.js';
import { html, when } from '../../../lib/framework.js';
import login from './auth.js';
import { darkTheme, setThemeMode, startThemeSync } from '../../../lib/utils.js';
import '../components/icon.js';

export class UserTools extends Component {
    static stores = { login }

    constructor(props) {
        super(props);

        this.state = {
            themeMode: darkTheme.state.mode
        };
    }

    mounted() {
        // Keep <body> in sync with the store (and, in 'auto', with the OS).
        this._stopThemeSync = startThemeSync();
        // Mirror the stored mode into local state so the <select> reflects it.
        this._themeUnsubscribe = darkTheme.subscribe(state => {
            this.state.themeMode = state.mode;
        });
    }

    unmounted() {
        if (this._stopThemeSync) this._stopThemeSync();
        if (this._themeUnsubscribe) this._themeUnsubscribe();
    }

    async logoff() {
        await login.state.logoff();
    }

    handleThemeModeChange() {
        // x-model already wrote the picked value into state.themeMode.
        setThemeMode(this.state.themeMode);
    }

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
                        Theme
                        <select id="theme-mode" x-model="themeMode" on-change="handleThemeModeChange">
                            <option value="auto">Auto (system)</option>
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </select>
                    </label>
                </p>
            </div>
        `;
    }
}

export default defineComponent('user-tools', UserTools);

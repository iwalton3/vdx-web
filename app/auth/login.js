/**
 * Login Page
 */
import { defineComponent, Component } from '../lib/framework.js';
import { html } from '../lib/framework.js';
import './login-component.js';

export class AuthLogin extends Component {
    template() {
        return html`
            <div>
                <h1>Login</h1>
                <login-component after="/"></login-component>
            </div>
        `;
    }
}

export default defineComponent('auth-login', AuthLogin);
